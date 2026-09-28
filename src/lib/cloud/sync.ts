import type { Database } from "@/lib/data/store";
import type { AssetRecord, BrandKit, Presentation, SavedTemplate } from "@/lib/types";
import { getCloudSession, supabase } from "./supabase";
import { clearCloudDeletes, queuedCloudDeletes, type CloudDeleteKind } from "./delete-queue";

type CloudRow<T> = { id: string; payload: T; updated_at: string };

function time(value?: string) {
  const n = value ? new Date(value).getTime() : 0;
  return Number.isFinite(n) ? n : 0;
}

function mergeById<T extends { id: string }>(
  local: T[],
  remote: T[],
  updated: (item: T) => string | undefined,
): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) {
    const current = map.get(item.id);
    if (!current || time(updated(item)) > time(updated(current))) map.set(item.id, item);
  }
  return [...map.values()];
}

async function rows<T>(table: string): Promise<T[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select("id,payload,updated_at");
  if (error) throw error;
  return ((data ?? []) as CloudRow<T>[]).map((row) => row.payload);
}

async function upsert<T extends { id: string }>(
  table: string,
  userId: string,
  items: T[],
  updated: (item: T) => string | undefined,
) {
  if (!supabase || !items.length) return;
  const payload = items.map((item) => ({
    id: item.id,
    user_id: userId,
    payload: item,
    updated_at: updated(item) ?? new Date().toISOString(),
  }));
  const { error } = await supabase.from(table).upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export interface SyncResult {
  database: Database;
  pulled: number;
  pushed: number;
  userEmail?: string;
}

const DELETE_TABLES: Record<CloudDeleteKind, string> = {
  presentation: "presentation_snapshots",
  brandKit: "brand_kit_snapshots",
  savedTemplate: "saved_template_snapshots",
  asset: "asset_records",
};

async function flushDeleteQueue(userId: string) {
  if (!supabase) return;
  const queued = queuedCloudDeletes();
  const completed = [];
  for (const kind of Object.keys(DELETE_TABLES) as CloudDeleteKind[]) {
    const records = queued.filter((r) => r.kind === kind);
    if (!records.length) continue;
    const ids = records.map((r) => r.id);
    const { error } = await supabase.from(DELETE_TABLES[kind]).delete().eq("user_id", userId).in("id", ids);
    if (error) throw error;
    completed.push(...records);
  }
  if (completed.length) clearCloudDeletes(completed);
}

export async function syncDatabaseWithCloud(local: Database): Promise<SyncResult> {
  if (!supabase) throw new Error("Cloud sync is not configured.");
  const session = await getCloudSession();
  if (!session?.user) throw new Error("Sign in before syncing.");

  await flushDeleteQueue(session.user.id);

  const [remotePresentations, remoteBrandKits, remoteTemplates, remoteAssets] = await Promise.all([
    rows<Presentation>("presentation_snapshots"),
    rows<BrandKit>("brand_kit_snapshots"),
    rows<SavedTemplate>("saved_template_snapshots"),
    rows<AssetRecord>("asset_records"),
  ]);

  const presentations = mergeById(local.presentations, remotePresentations, (p) => p.updatedAt);
  const brandKits = mergeById(local.brandKits, remoteBrandKits, (k) => k.updatedAt ?? k.createdAt);
  const savedTemplates = mergeById(local.savedTemplates, remoteTemplates, (t) => t.updatedAt);
  const assets = mergeById(local.assets, remoteAssets, (a) => a.updatedAt ?? a.createdAt);

  await Promise.all([
    upsert("presentation_snapshots", session.user.id, presentations, (p: Presentation) => p.updatedAt),
    upsert("brand_kit_snapshots", session.user.id, brandKits, (k: BrandKit) => k.updatedAt ?? k.createdAt),
    upsert("saved_template_snapshots", session.user.id, savedTemplates, (t: SavedTemplate) => t.updatedAt),
    upsert("asset_records", session.user.id, assets, (a: AssetRecord) => a.updatedAt ?? a.createdAt),
  ]);

  const pulled =
    remotePresentations.filter((r) => !local.presentations.some((l) => l.id === r.id)).length +
    remoteBrandKits.filter((r) => !local.brandKits.some((l) => l.id === r.id)).length +
    remoteTemplates.filter((r) => !local.savedTemplates.some((l) => l.id === r.id)).length +
    remoteAssets.filter((r) => !local.assets.some((l) => l.id === r.id)).length;

  const pushed =
    presentations.filter((r) => !remotePresentations.some((l) => l.id === r.id)).length +
    brandKits.filter((r) => !remoteBrandKits.some((l) => l.id === r.id)).length +
    savedTemplates.filter((r) => !remoteTemplates.some((l) => l.id === r.id)).length +
    assets.filter((r) => !remoteAssets.some((l) => l.id === r.id)).length;

  return {
    database: { ...local, presentations, brandKits, savedTemplates, assets },
    pulled,
    pushed,
    userEmail: session.user.email,
  };
}
