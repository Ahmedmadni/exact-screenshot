import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { queueCloudDelete } from "@/lib/cloud/delete-queue";
import type { AssetRecord, BrandKit, Presentation, PresentationVersion, ReviewComment, ReviewDecision, SavedTemplate, Slide, ThemeRecord } from "@/lib/types";
import { SEED_ASSETS, SEED_BRAND_KITS, SEED_PRESENTATIONS, SEED_THEMES } from "./seed";
import { encodeBrowserDatabase, decodeBrowserDatabase } from "./storage-codec";
import { cloneSlidesForPresentation } from "./presentation-clone";

const STORAGE_KEY = "aps.db.v1";

export interface Database {
  presentations: Presentation[];
  themes: ThemeRecord[];
  brandKits: BrandKit[];
  savedTemplates: SavedTemplate[];
  versions: PresentationVersion[];
  reviewComments: ReviewComment[];
  reviewDecisions: ReviewDecision[];
  assets: AssetRecord[];
}

const initial = (): Database => ({
  presentations: SEED_PRESENTATIONS,
  themes: SEED_THEMES,
  brandKits: SEED_BRAND_KITS,
  savedTemplates: [],
  versions: [],
  reviewComments: [],
  reviewDecisions: [],
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
  const payload = encodeBrowserDatabase(db);
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
      const parsed = decodeBrowserDatabase(raw) as Partial<Database>;
      db = {
        ...initial(),
        ...parsed,
        presentations: Array.isArray(parsed.presentations)
          ? parsed.presentations.filter((p) => p && typeof p.id === "string").map((p) => ({ ...p, slides: Array.isArray(p.slides) ? p.slides.filter((s) => s && typeof s.id === "string").map((s) => ({ ...s, elements: Array.isArray(s.elements) ? s.elements : [] })) : [] }))
          : initial().presentations,
        brandKits: Array.isArray(parsed.brandKits)
          ? parsed.brandKits.filter((k) => k && typeof k.id === "string" && typeof k.name === "string").map((k) => ({
              ...k,
              colors: Array.isArray(k.colors) ? k.colors : [],
              headingFont: typeof k.headingFont === "string" ? k.headingFont : "Manrope",
              bodyFont: typeof k.bodyFont === "string" ? k.bodyFont : "Manrope",
            }))
          : initial().brandKits,
        savedTemplates: Array.isArray(parsed.savedTemplates)
          ? parsed.savedTemplates.filter((t) => t && typeof t.id === "string" && typeof t.name === "string" && t.snapshot)
          : [],
        versions: Array.isArray(parsed.versions) ? parsed.versions.filter((v) => v && typeof v.id === "string" && v.snapshot) : [],
        reviewComments: Array.isArray(parsed.reviewComments) ? parsed.reviewComments.filter((c) => c && typeof c.id === "string") : [],
        reviewDecisions: Array.isArray(parsed.reviewDecisions) ? parsed.reviewDecisions.filter((d) => d && typeof d.id === "string") : [],
        assets: Array.isArray(parsed.assets)
          ? parsed.assets.filter((a) => a && typeof a.id === "string" && typeof a.name === "string")
          : initial().assets,
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
  upsertCollaborative(presentation: Presentation): void;
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
    queueCloudDelete("presentation", id);
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
      slides: cloneSlidesForPresentation(source.slides, newId, uid, stamp),
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
  upsertCollaborative(presentation) {
    mutate((d) => {
      const exists = d.presentations.some((p) => p.id === presentation.id);
      return {
        ...d,
        presentations: exists
          ? d.presentations.map((p) => p.id === presentation.id ? structuredClone(presentation) : p)
          : [structuredClone(presentation), ...d.presentations],
      };
    });
  },
};

export const versionRepository = {
  list: (presentationId: string) => db.versions.filter((v) => v.presentationId === presentationId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)),
  create(presentation: Presentation, label = "Snapshot") {
    const stamp = new Date().toISOString();
    const { id: _id, userId: _userId, createdAt: _createdAt, updatedAt: _updatedAt, rehearsals: _rehearsals, ...versionState } = structuredClone(presentation);
    const snapshot = versionState;
    const version: PresentationVersion = { id: uid(), presentationId: presentation.id, label, createdAt: stamp, updatedAt: stamp, snapshot };
    mutate((d) => ({ ...d, versions: [version, ...d.versions] }));
    return version;
  },
  restore(id: string) {
    const version = db.versions.find((v) => v.id === id);
    if (!version) return;
    presentationRepository.update(version.presentationId, structuredClone(version.snapshot));
  },
};

export const reviewCommentRepository = {
  list: (presentationId: string) => db.reviewComments.filter((c) => c.presentationId === presentationId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)),
  add(input: Omit<ReviewComment,"id"|"createdAt"|"updatedAt"|"resolved">) {
    const stamp = new Date().toISOString();
    const record: ReviewComment = { ...input, id: uid(), resolved: false, createdAt: stamp, updatedAt: stamp };
    mutate((d) => ({ ...d, reviewComments: [record, ...d.reviewComments] }));
    return record;
  },
  update(id: string, patch: Partial<ReviewComment>) {
    mutate((d) => ({ ...d, reviewComments: d.reviewComments.map((c) => c.id===id ? { ...c, ...patch, updatedAt:new Date().toISOString() } : c) }));
  },
};

export const reviewDecisionRepository = {
  list: (presentationId: string) => db.reviewDecisions.filter((d) => d.presentationId === presentationId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)),
  apply(presentation: Presentation, action: ReviewDecision["action"], note = "", actorName = "Reviewer") {
    const stamp = new Date().toISOString();
    const status = action === "submitted" ? "Under Review" : action === "changes_requested" ? "Changes Requested" : action === "approved" ? "Approved" : "Draft";
    versionRepository.create(
      presentation,
      action === "submitted" ? "Submitted for review" :
      action === "approved" ? "Approved version" :
      action === "reopened" ? "Approved version before reopening" :
      "Changes requested",
    );
    const decision: ReviewDecision = { id:uid(), presentationId:presentation.id, action, note, actorName, createdAt:stamp, updatedAt:stamp };
    mutate((d) => ({ ...d, reviewDecisions:[decision,...d.reviewDecisions], presentations:d.presentations.map((p)=>p.id===presentation.id?{...p,status,updatedAt:stamp}:p) }));
    return decision;
  },
};

export const assetRepository = {
  list: (presentationId?: string) =>
    presentationId ? db.assets.filter((a) => a.presentationId === presentationId) : db.assets,
  get: (id: string) => db.assets.find((a) => a.id === id),
  usageCount(id: string) {
    return db.presentations.reduce((total, presentation) => {
      const presentationRefs = (presentation.sourceAssetIds ?? []).filter((assetId) => assetId === id).length;
      const slideRefs = presentation.slides.reduce((sum, slide) => {
        const sourceRefs = (slide.sourceAssetIds ?? []).filter((assetId) => assetId === id).length;
        const imageRefs = slide.elements.filter((element) => element.type === "image" && element.properties.assetId === id).length;
        const evidenceRefs = (slide.evidenceRefs ?? []).filter((ref) => ref.assetId === id).length;
        return sum + sourceRefs + imageRefs + evidenceRefs;
      }, 0);
      return total + presentationRefs + slideRefs;
    }, 0);
  },
  add(record: Omit<AssetRecord, "id" | "createdAt">) {
    const stamp = new Date().toISOString();
    const asset: AssetRecord = { ...record, id: uid(), createdAt: stamp, updatedAt: stamp };
    mutate((d) => ({ ...d, assets: [asset, ...d.assets] }));
    return asset;
  },
  update(id: string, patch: Partial<AssetRecord>) {
    mutate((d) => ({
      ...d,
      assets: d.assets.map((a) => a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a),
    }));
  },
  remove(id: string) {
    const usage = this.usageCount(id);
    if (usage > 0) {
      toast.warning(`This asset is still used in ${usage} presentation reference${usage === 1 ? "" : "s"}. Replace or detach it before deleting.`);
      return false;
    }
    queueCloudDelete("asset", id);
    mutate((d) => ({ ...d, assets: d.assets.filter((a) => a.id !== id) }));
    return true;
  },
};

export const savedTemplateRepository = {
  list: () => db.savedTemplates,
  get: (id: string) => db.savedTemplates.find((t) => t.id === id),
  saveFromPresentation(presentation: Presentation, name = presentation.title) {
    const stamp = new Date().toISOString();
    const { id: _id, userId: _userId, createdAt: _createdAt, updatedAt: _updatedAt, rehearsals: _rehearsals, ...snapshot } = structuredClone(presentation);
    const template: SavedTemplate = {
      id: uid(),
      name,
      description: presentation.description,
      sourcePresentationId: presentation.id,
      snapshot,
      createdAt: stamp,
      updatedAt: stamp,
    };
    mutate((d) => ({ ...d, savedTemplates: [template, ...d.savedTemplates] }));
    return template;
  },
  remove(id: string) {
    queueCloudDelete("savedTemplate", id);
    mutate((d) => ({ ...d, savedTemplates: d.savedTemplates.filter((t) => t.id !== id) }));
  },
  createPresentation(id: string) {
    const template = db.savedTemplates.find((t) => t.id === id);
    if (!template) return undefined;
    const stamp = new Date().toISOString();
    const presentationId = uid();
    const snapshot = structuredClone(template.snapshot);
    const slides = snapshot.slides.map((slide, index) => {
      const slideId = uid();
      return {
        ...slide,
        id: slideId,
        presentationId,
        slideNumber: index + 1,
        sortOrder: index,
        elements: slide.elements.map((el) => ({ ...el, id: uid(), slideId })),
        createdAt: stamp,
        updatedAt: stamp,
      };
    });
    const presentation: Presentation = {
      ...snapshot,
      id: presentationId,
      userId: "local-user",
      title: template.name,
      status: "Draft",
      slides,
      createdAt: stamp,
      updatedAt: stamp,
    };
    mutate((d) => ({ ...d, presentations: [presentation, ...d.presentations] }));
    return presentation;
  },
};

export const brandKitRepository = {
  list: () => db.brandKits,
  get: (id: string) => db.brandKits.find((k) => k.id === id),
  add(kit: Omit<BrandKit, "id">) {
    const stamp = new Date().toISOString();
    const record: BrandKit = { ...kit, id: uid(), createdAt: kit.createdAt ?? stamp, updatedAt: stamp };
    mutate((d) => ({ ...d, brandKits: [record, ...d.brandKits] }));
    return record;
  },
  update(id: string, patch: Partial<BrandKit>) {
    mutate((d) => ({
      ...d,
      brandKits: d.brandKits.map((k) => k.id === id ? { ...k, ...patch, updatedAt: new Date().toISOString() } : k),
    }));
  },
  remove(id: string) {
    queueCloudDelete("brandKit", id);
    mutate((d) => ({ ...d, brandKits: d.brandKits.filter((k) => k.id !== id) }));
  },
};

export function databaseSnapshot(): Database {
  hydrate();
  return structuredClone(db);
}

export function replaceDatabase(next: Database) {
  db = structuredClone(next);
  persist();
  emit();
}

export function useDatabase(): Database {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function usePresentations(): Presentation[] {
  return useDatabase().presentations;
}

export function usePresentation(id: string): Presentation | undefined {
  return useDatabase().presentations.find((p) => p.id === id);
}
