import { useSyncExternalStore } from "react";
import { toast } from "sonner";
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

/** Soft ceiling for browser storage (most browsers allow ~5 MB per site). */
const STORAGE_BUDGET = 5 * 1024 * 1024;
let warnedNearFull = false;
let warnedFull = false;

function persist() {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(db);
  try {
    window.localStorage.setItem(STORAGE_KEY, payload);
    warnedFull = false;
    // UTF-16 storage: ~2 bytes per char.
    if (payload.length * 2 > STORAGE_BUDGET * 0.85 && !warnedNearFull) {
      warnedNearFull = true;
      toast.warning("Browser storage is nearly full. Large images may not be saved.");
    }
  } catch {
    if (!warnedFull) {
      warnedFull = true;
      toast.error("Your latest changes could not be saved — browser storage is full. Remove large images or unused presentations.", { duration: 8000 });
    }
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Database>;
      db = {
        ...initial(),
        ...parsed,
        presentations: Array.isArray(parsed.presentations)
          ? parsed.presentations.filter((p) => p && typeof p.id === "string").map((p) => ({ ...p, slides: Array.isArray(p.slides) ? p.slides.filter((s) => s && typeof s.id === "string").map((s) => ({ ...s, elements: Array.isArray(s.elements) ? s.elements : [] })) : [] }))
          : initial().presentations,
      };
    }
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
    const slides = source.slides.map((slide, index) => {
      const slideId = uid();
      return {
        ...structuredClone(slide),
        id: slideId,
        presentationId: newId,
        slideNumber: index + 1,
        sortOrder: index,
        createdAt: stamp,
        updatedAt: stamp,
        elements: slide.elements.map((element, zIndex) => ({
          ...structuredClone(element),
          id: uid(),
          slideId,
          zIndex,
        })),
      };
    });
    const copy: Presentation = {
      ...source,
      id: newId,
      title: `${source.title} (copy)`,
      status: "Draft",
      createdAt: stamp,
      updatedAt: stamp,
      slides,
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
