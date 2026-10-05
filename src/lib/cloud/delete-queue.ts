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

function write(records: CloudDeleteRecord[]): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export function queueCloudDelete(kind: CloudDeleteKind, id: string): boolean {
  const next = read().filter((r) => !(r.kind === kind && r.id === id));
  next.push({ kind, id, queuedAt: new Date().toISOString() });
  return write(next);
}

export function removeQueuedCloudDelete(kind: CloudDeleteKind, id: string): boolean {
  return write(read().filter((record) => !(record.kind === kind && record.id === id)));
}

export function queuedCloudDeletes(): CloudDeleteRecord[] {
  return read();
}

export function clearCloudDeletes(records: CloudDeleteRecord[]): boolean {
  const keys = new Set(records.map((r) => `${r.kind}:${r.id}`));
  return write(read().filter((r) => !keys.has(`${r.kind}:${r.id}`)));
}
