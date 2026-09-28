export type CloudDeleteKind = "presentation" | "brandKit" | "savedTemplate" | "asset";

export interface CloudDeleteRecord {
  kind: CloudDeleteKind;
  id: string;
  queuedAt: string;
}

const KEY = "aps.cloud.deletes.v1";

function read(): CloudDeleteRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((r) => r && typeof r.id === "string" && typeof r.kind === "string") : [];
  } catch {
    return [];
  }
}

function write(records: CloudDeleteRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(records));
}

export function queueCloudDelete(kind: CloudDeleteKind, id: string) {
  const next = read().filter((r) => !(r.kind === kind && r.id === id));
  next.push({ kind, id, queuedAt: new Date().toISOString() });
  write(next);
}

export function queuedCloudDeletes(): CloudDeleteRecord[] {
  return read();
}

export function clearCloudDeletes(records: CloudDeleteRecord[]) {
  const keys = new Set(records.map((r) => `${r.kind}:${r.id}`));
  write(read().filter((r) => !keys.has(`${r.kind}:${r.id}`)));
}
