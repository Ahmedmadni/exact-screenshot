import type { Database } from "./store";
import { decodeBrowserDatabase, encodeBrowserDatabase } from "./storage-codec";

/** Portable file only: it does not contain passwords, auth sessions or tokens. */
export const BACKUP_FORMAT = "meridian-workspace-backup";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;

export function assertWorkspaceBackupSize(raw: string, maxBytes = MAX_BACKUP_BYTES): number {
  const bytes = new TextEncoder().encode(raw).length;
  if (bytes > maxBytes) throw new Error("Backup exceeds the " + Math.round(maxBytes / 1024 / 1024) + " MB limit.");
  return bytes;
}

const COLLECTIONS = ["presentations", "themes", "brandKits", "savedTemplates", "versions", "reviewComments", "reviewDecisions", "assets"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function checksumDatabase(value: string): string {
  // Fast non-cryptographic integrity check for accidental backup corruption.
  // This is not an authentication or secrecy mechanism.
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    hash ^= code & 0xff;
    hash = Math.imul(hash, 0x01000193);
    hash ^= code >>> 8;
    hash = Math.imul(hash, 0x01000193);
  }
  return "fnv1a32:" + (hash >>> 0).toString(16).padStart(8, "0");
}


/**
 * Validate before replacing the active workspace. Requiring all collections
 * stops partial or malformed imports from wiping intact data.
 */
export function validateBackupDatabase(value: unknown): Database {
  if (!isRecord(value)) throw new Error("Backup does not contain a workspace.");
  for (const collection of COLLECTIONS) {
    const items = value[collection];
    if (!Array.isArray(items) || items.some(item => !isRecord(item) || typeof item.id !== "string" || !item.id)) {
      throw new Error("Invalid backup collection: " + collection);
    }
    const ids = items.map(item => item.id);
    if (new Set(ids).size !== ids.length) throw new Error("Duplicate identifiers in " + collection);
  }
  const validateSlides = (owner: Record<string, unknown>, expectedPresentationId?: string) => {
    if (!Array.isArray(owner.slides) || owner.slides.some(slide =>
      !isRecord(slide) || typeof slide.id !== "string" ||
      !Array.isArray(slide.elements) || slide.elements.some(element => !isRecord(element) || typeof element.id !== "string"))) {
      throw new Error("Invalid presentation slides");
    }
    const slides = owner.slides as Record<string, unknown>[];
    if (new Set(slides.map(slide => slide.id)).size !== slides.length) throw new Error("Duplicate slide identifiers");
    const elementIds = new Set<string>();
    for (const slide of slides) {
      if (expectedPresentationId !== undefined && slide.presentationId !== undefined && slide.presentationId !== expectedPresentationId) {
        throw new Error("Slide points to another presentation");
      }
      const elements = slide.elements as Record<string, unknown>[];
      for (const element of elements) {
        const id = element.id as string;
        if (elementIds.has(id)) throw new Error("Duplicate element identifiers");
        elementIds.add(id);
        if (element.slideId !== undefined && element.slideId !== slide.id) {
          throw new Error("Element points to another slide");
        }
      }
    }
  };

  for (const deck of value.presentations as Record<string, unknown>[]) {
    validateSlides(deck, deck.id as string);
  }
  for (const template of value.savedTemplates as Record<string, unknown>[]) {
    if (!isRecord(template.snapshot)) throw new Error("Invalid saved template snapshot");
    validateSlides(template.snapshot);
  }
  for (const version of value.versions as Record<string, unknown>[]) {
    if (!isRecord(version.snapshot)) throw new Error("Invalid presentation version snapshot");
    validateSlides(version.snapshot);
  }
  return value as unknown as Database;
}

export function withRecoveryPresentation(database: Database, presentation: Database["presentations"][number]): Database {
  const copy = structuredClone(database);
  const deck = structuredClone(presentation);
  copy.presentations = copy.presentations.some(item => item.id === deck.id)
    ? copy.presentations.map(item => item.id === deck.id ? deck : item)
    : [deck, ...copy.presentations];
  return copy;
}

export function createWorkspaceBackup(database: Database, exportedAt = new Date().toISOString()): string {
  const encoded = encodeBrowserDatabase(validateBackupDatabase(database));
  const raw = JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    checksum: checksumDatabase(encoded),
    database: encoded,
  });
  assertWorkspaceBackupSize(raw);
  return raw;
}

export function parseWorkspaceBackup(raw: string): Database {
  assertWorkspaceBackupSize(raw);
  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    throw new Error("This is not a valid JSON backup.");
  }
  if (!isRecord(envelope) || envelope.format !== BACKUP_FORMAT || envelope.version !== BACKUP_VERSION ||
      typeof envelope.database !== "string" || typeof envelope.exportedAt !== "string" ||
      !Number.isFinite(Date.parse(envelope.exportedAt))) {
    throw new Error("Unsupported or invalid Meridian backup.");
  }
  if (envelope.checksum !== undefined) {
    if (typeof envelope.checksum !== "string" || envelope.checksum !== checksumDatabase(envelope.database)) {
      throw new Error("Backup integrity check failed. The file may be damaged or incomplete.");
    }
  }
  try {
    return validateBackupDatabase(decodeBrowserDatabase(envelope.database));
  } catch (error) {
    if (error instanceof Error) throw new Error("Backup validation failed: " + error.message);
    throw new Error("Backup validation failed.");
  }
}
