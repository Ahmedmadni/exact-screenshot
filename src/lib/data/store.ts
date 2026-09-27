import { useSyncExternalStore } from "react";
import type { AssetRecord, BrandKit, Presentation, Slide, ThemeRecord } from "@/lib/types";
import { SEED_ASSETS, SEED_BRAND_KITS, SEED_PRESENTATIONS, SEED_THEMES } from "./seed";

const STORAGE_KEY = "aps.db.v1";

export interface Database {
  presentations: Presentation[];
  themes: ThemeRecord[];
  brandKits: BrandKit[];
  assets: AssetRecord[];
}

const initial = (): Database => ({
  presentations: SEED_PRESENTATIONS,
  themes: SEED_THEMES,
  brandKits: SEED_BRAND_KITS,
  assets: SEED_ASSETS,
});

let db: Database = initial();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* storage unavailable — the session stays in memory */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) db = { ...initial(), ...(JSON.parse(raw) as Database) };
  } catch {
    /* corrupt payload — fall back to seed data */
  }
  emit();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => db;
const serverSnapshot = initial();
const getServerSnapshot = () => serverSnapshot;

function mutate(next: (current: Database) => Database) {
  db = next(db);
  persist();
  emit();
}

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Repository boundary. Every screen talks to this interface only, so the
 * browser-backed implementation can be replaced by a cloud-backed one without
 * touching any component.
 */
export interface PresentationRepository {
  list(): Presentation[];
  get(id: string): Presentation | undefined;
  create(input: Omit<Presentation, "id" | "userId" | "createdAt" | "updatedAt">): Presentation;
  update(id: string, patch: Partial<Presentation>): void;
  remove(id: string): void;
  duplicate(id: string): Presentation | undefined;
  replaceSlides(id: string, slides: Slide[]): void;
}

export const presentationRepository: PresentationRepository = {
  list: () => db.presentations,
  get: (id) => db.presentations.find((p) => p.id === id),
  create(input) {
    const stamp = new Date().toISOString();
    const presentation: Presentation = {
      ...input,
      id: uid(),
      userId: "local-user",
      createdAt: stamp,
      updatedAt: stamp,
    };
    mutate((d) => ({ ...d, presentations: [presentation, ...d.presentations] }));
    return presentation;
  },
  update(id, patch) {
    mutate((d) => ({
      ...d,
      presentations: d.presentations.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
      ),
    }));
  },
  remove(id) {
    mutate((d) => ({ ...d, presentations: d.presentations.filter((p) => p.id !== id) }));
  },
  duplicate(id) {
    const source = db.presentations.find((p) => p.id === id);
    if (!source) return undefined;
    const stamp = new Date().toISOString();
    const newId = uid();
    const copy: Presentation = {
      ...source,
      id: newId,
      title: `${source.title} (copy)`,
      status: "Draft",
      createdAt: stamp,
      updatedAt: stamp,
      slides: source.slides.map((s) => ({ ...s, id: uid(), presentationId: newId })),
    };
    mutate((d) => ({ ...d, presentations: [copy, ...d.presentations] }));
    return copy;
  },
  replaceSlides(id, slides) {
    const normalised = slides.map((s, index) => ({
      ...s,
      slideNumber: index + 1,
      sortOrder: index,
    }));
    this.update(id, { slides: normalised, recommendedSlideCount: normalised.length });
  },
};

export const assetRepository = {
  list: (presentationId?: string) =>
    presentationId ? db.assets.filter((a) => a.presentationId === presentationId) : db.assets,
  add(record: Omit<AssetRecord, "id" | "createdAt">) {
    const asset: AssetRecord = { ...record, id: uid(), createdAt: new Date().toISOString() };
    mutate((d) => ({ ...d, assets: [asset, ...d.assets] }));
    return asset;
  },
  remove(id: string) {
    mutate((d) => ({ ...d, assets: d.assets.filter((a) => a.id !== id) }));
  },
};

export const brandKitRepository = {
  list: () => db.brandKits,
  add(kit: Omit<BrandKit, "id">) {
    const record: BrandKit = { ...kit, id: uid() };
    mutate((d) => ({ ...d, brandKits: [record, ...d.brandKits] }));
    return record;
  },
  remove(id: string) {
    mutate((d) => ({ ...d, brandKits: d.brandKits.filter((k) => k.id !== id) }));
  },
};

export function useDatabase(): Database {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function usePresentations(): Presentation[] {
  return useDatabase().presentations;
}

export function usePresentation(id: string): Presentation | undefined {
  return useDatabase().presentations.find((p) => p.id === id);
}
