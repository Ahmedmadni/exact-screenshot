import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Presentation, Slide } from "@/lib/types";
import type { SlideElement } from "@/lib/editor/model";
import { presentationRepository, versionRepository } from "@/lib/data/store";
import { applyLiveElementChanges, recordCollaborationActivity, saveLivePresentation } from "@/lib/collaboration";
import { elementOnlyChanges } from "@/lib/editor/element-diff";
import { supabase } from "@/lib/cloud/supabase";
import { materializeSlide } from "@/lib/editor/layouts";
import { DEFAULT_THEME_ID } from "@/lib/editor/themes";
import type { SaveState } from "@/components/save-indicator";

const HISTORY_LIMIT = 100;

interface Doc {
  slides: Slide[];
  themeId: string;
}

interface PendingSave {
  next: Doc;
  base: Doc;
}

/**
 * Editor state: a local working copy of the deck (slides + theme) with
 * snapshot undo/redo. `setLive` updates without history (mid-gesture);
 * `commit` records a history step and schedules an autosave. Pending saves
 * are flushed on unmount and before the page unloads so nothing is lost.
 */
export function useEditor(p: Presentation, initialSlideId?: string) {
  const [doc, setDoc] = useState<Doc>(() => ({ slides: p.slides.map(materializeSlide), themeId: p.themeId ?? DEFAULT_THEME_ID }));
  const [activeId, setActiveIdState] = useState<string>(() =>
    initialSlideId && p.slides.some((s) => s.id === initialSlideId) ? initialSlideId : (p.slides[0]?.id ?? ""),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [save, setSave] = useState<SaveState>("idle");
  const [history, setHistory] = useState({ past: 0, future: 0 });
  const [conflict, setConflict] = useState<{ presentation: Presentation; revision: number; updatedAt?: string } | null>(null);
  const collaborationRef = useRef(p.collaboration);
  collaborationRef.current = p.collaboration ?? collaborationRef.current;
  const revisionRef = useRef(p.collaboration?.revision ?? 0);
  if ((p.collaboration?.revision ?? 0) > revisionRef.current) revisionRef.current = p.collaboration!.revision;
  const liveSaving = useRef(false);
  const past = useRef<Doc[]>([]);
  const future = useRef<Doc[]>([]);
  const current = useRef(doc);
  current.current = doc;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<PendingSave | null>(null);

  const storeLocal = useCallback((d: Doc) =>
    presentationRepository.update(p.id, {
      slides: d.slides.map((s, i) => ({ ...s, slideNumber: i + 1, sortOrder: i })),
      recommendedSlideCount: d.slides.length,
      themeId: d.themeId,
    }), [p.id]);

  const write = useCallback(
    async (d: Doc, base?: Doc) => {
      const stored = storeLocal(d);
      if (!stored) {
        setSave("error");
        return;
      }

      const collaboration = collaborationRef.current;
      if (!collaboration?.enabled || !["owner", "editor"].includes(collaboration.role)) {
        setSave("saved");
        return;
      }

      const local = presentationRepository.get(p.id);
      if (!local) {
        setSave("saved");
        return;
      }

      const payload = structuredClone(local);
      delete payload.collaboration;
      const granular = base ? elementOnlyChanges(base, d) : null;
      const baseRevision = revisionRef.current;
      liveSaving.current = true;
      try {
        const result = granular
          ? await applyLiveElementChanges(p.id, baseRevision, granular.slideId, granular.changes)
          : await saveLivePresentation(p.id, baseRevision, payload);

        if (result.conflict && result.presentation) {
          setConflict({ presentation: result.presentation, revision: result.revision, updatedAt: result.updatedAt });
          setSave("conflict");
          void recordCollaborationActivity(p.id, "conflict_detected", {
            localRevision: baseRevision,
            remoteRevision: result.revision,
            reason: result.reason ?? "document_changed",
            elementId: result.elementId,
          }).catch(console.error);
          return;
        }

        revisionRef.current = result.revision;
        const nextCollaboration = {
          ...collaboration,
          revision: result.revision,
          liveUpdatedAt: result.updatedAt,
        };
        collaborationRef.current = nextCollaboration;

        if (granular && result.merged && result.presentation) {
          if (pending.current) {
            setConflict({ presentation: result.presentation, revision: result.revision, updatedAt: result.updatedAt });
            setSave("conflict");
            void recordCollaborationActivity(p.id, "conflict_detected", {
              localRevision: baseRevision,
              remoteRevision: result.revision,
              reason: "remote_merge_with_new_local_edits",
            }).catch(console.error);
            return;
          }

          const hydrated: Presentation = { ...result.presentation, collaboration: nextCollaboration };
          presentationRepository.upsertCollaborative(hydrated);
          const mergedDoc: Doc = {
            slides: hydrated.slides.map(materializeSlide),
            themeId: hydrated.themeId ?? DEFAULT_THEME_ID,
          };
          current.current = mergedDoc;
          setDoc(mergedDoc);
          past.current = [];
          future.current = [];
          setHistory({ past: 0, future: 0 });
          setSelected((selection) => selection.filter((id) => mergedDoc.slides.some((slide) => slide.elements.some((element) => element.id === id))));
        } else {
          presentationRepository.update(p.id, { collaboration: nextCollaboration });
        }

        setConflict(null);
        setSave("saved");
      } catch (error) {
        console.error("Live collaboration save failed", error);
        setSave("error");
      } finally {
        liveSaving.current = false;
      }
    },
    [p.id, storeLocal],
  );

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    // A live cloud save owns the current revision until its response arrives.
    // Keep the newest local edit pending instead of launching a second request
    // with the same base revision and creating a self-conflict.
    if (liveSaving.current) {
      timer.current = setTimeout(flush, 120);
      return;
    }
    if (pending.current) {
      const saveJob = pending.current;
      pending.current = null;
      void write(saveJob.next, saveJob.base);
    }
  }, [write]);

  const persist = useCallback(
    (next: Doc, base: Doc) => {
      setSave("saving");
      pending.current = pending.current
        ? { base: pending.current.base, next }
        : { base, next };
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 500);
    },
    [flush],
  );

  useEffect(() => {
    // Persist migrated/repaired slides once so legacy decks gain elements.
    if (p.slides.some((s, i) => s !== doc.slides[i])) void write(doc);
    const onUnload = () => flush();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      clearTimeout(timer.current);
      // Never leave a post-unmount retry timer behind. If a cloud request is
      // still running, keep the newest queued edit durable in local storage;
      // it can sync on the next editor session.
      if (pending.current) {
        const latest = pending.current.next;
        pending.current = null;
        storeLocal(latest);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const collaboration = collaborationRef.current;
    if (!collaboration?.enabled || !supabase) return;
    void recordCollaborationActivity(p.id, "opened_editor", { role: collaboration.role }).catch(console.error);

    const channel = supabase
      .channel("live-document-" + p.id)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "presentation_live_documents", filter: "presentation_id=eq." + p.id },
        (event) => {
          const row = event.new as Record<string, unknown>;
          const revision = Number(row.revision ?? 0);
          const remote = row.payload as Presentation | undefined;
          if (!remote || !Number.isFinite(revision) || revision <= revisionRef.current) return;
          if (liveSaving.current) return;
          if (pending.current) {
            setConflict({
              presentation: remote,
              revision,
              updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
            });
            setSave("conflict");
            void recordCollaborationActivity(p.id, "conflict_detected", { localRevision: revisionRef.current, remoteRevision: revision }).catch(console.error);
            return;
          }

          const meta = {
            ...collaborationRef.current!,
            revision,
            liveUpdatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
          };
          collaborationRef.current = meta;
          revisionRef.current = revision;
          const hydrated = { ...remote, collaboration: meta };
          presentationRepository.upsertCollaborative(hydrated);
          const nextDoc: Doc = {
            slides: hydrated.slides.map(materializeSlide),
            themeId: hydrated.themeId ?? DEFAULT_THEME_ID,
          };
          current.current = nextDoc;
          setDoc(nextDoc);
          past.current = [];
          future.current = [];
          setHistory({ past: 0, future: 0 });
          setSelected([]);
          setActiveIdState((id) => nextDoc.slides.some((slide) => slide.id === id) ? id : (nextDoc.slides[0]?.id ?? ""));
          setSave("saved");
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [p.id]);

  const resolveConflict = useCallback(() => {
    if (!conflict) return;
    const local = presentationRepository.get(p.id);
    if (local) versionRepository.create(local, "Conflict recovery — local edits");
    const collaboration = collaborationRef.current;
    if (!collaboration) return;

    const meta = {
      ...collaboration,
      revision: conflict.revision,
      liveUpdatedAt: conflict.updatedAt,
    };
    collaborationRef.current = meta;
    revisionRef.current = conflict.revision;
    const hydrated: Presentation = { ...conflict.presentation, collaboration: meta };
    presentationRepository.upsertCollaborative(hydrated);
    const nextDoc: Doc = {
      slides: hydrated.slides.map(materializeSlide),
      themeId: hydrated.themeId ?? DEFAULT_THEME_ID,
    };
    current.current = nextDoc;
    setDoc(nextDoc);
    past.current = [];
    future.current = [];
    pending.current = null;
    setHistory({ past: 0, future: 0 });
    setSelected([]);
    setActiveIdState((id) => nextDoc.slides.some((slide) => slide.id === id) ? id : (nextDoc.slides[0]?.id ?? ""));
    setConflict(null);
    setSave("saved");
    void recordCollaborationActivity(p.id, "conflict_resolved", { revision: conflict.revision }).catch(console.error);
  }, [conflict, p.id]);

  const syncHistory = () => setHistory({ past: past.current.length, future: future.current.length });

  const apply = useCallback(
    (next: Doc, base?: Doc) => {
      const historyBase = base ?? current.current;
      past.current.push(historyBase);
      if (past.current.length > HISTORY_LIMIT) past.current.shift();
      future.current = [];
      current.current = next;
      setDoc(next);
      persist(next, historyBase);
      syncHistory();
    },
    [persist],
  );

  const setLive = useCallback((slides: Slide[]) => {
    const next = { ...current.current, slides };
    current.current = next;
    setDoc(next);
  }, []);

  const commit = useCallback(
    (slides: Slide[], base?: Slide[]) => apply({ ...current.current, slides }, base ? { ...current.current, slides: base } : undefined),
    [apply],
  );

  /** Automatic corrections (e.g. text auto-grow): saved, but not an undo step. */
  const silentUpdate = useCallback(
    (slides: Slide[]) => {
      const base = current.current;
      const next = { ...base, slides };
      current.current = next;
      setDoc(next);
      persist(next, base);
    },
    [persist],
  );

  const setTheme = useCallback((themeId: string) => apply({ ...current.current, themeId }), [apply]);

  const restore = useCallback(
    (from: React.MutableRefObject<Doc[]>, to: React.MutableRefObject<Doc[]>) => {
      const d = from.current.pop();
      if (!d) return;
      const base = current.current;
      to.current.push(base);
      current.current = d;
      setDoc(d);
      persist(d, base);
      setActiveIdState((id) => (d.slides.some((s) => s.id === id) ? id : (d.slides[0]?.id ?? "")));
      setSelected((sel) => sel.filter((id) => d.slides.some((s) => s.elements.some((e) => e.id === id))));
      syncHistory();
    },
    [persist],
  );
  const undo = useCallback(() => restore(past, future), [restore]);
  const redo = useCallback(() => restore(future, past), [restore]);

  const slides = doc.slides;
  const active = useMemo(() => slides.find((s) => s.id === activeId) ?? slides[0], [slides, activeId]);
  const activeRef = useRef(active?.id);
  activeRef.current = active?.id;

  /** Map elements of the active slide. */
  const mapElements = useCallback(
    (fn: (els: SlideElement[]) => SlideElement[], source?: Slide[]) =>
      (source ?? current.current.slides).map((s) =>
        s.id === activeRef.current ? { ...s, elements: fn(s.elements), updatedAt: new Date().toISOString() } : s,
      ),
    [],
  );

  const updateElements = useCallback(
    (ids: string[], patch: (el: SlideElement) => SlideElement, live = false) => {
      const next = mapElements((els) => els.map((e) => (ids.includes(e.id) ? patch(e) : e)));
      if (live) setLive(next);
      else commit(next);
    },
    [mapElements, setLive, commit],
  );

  const updateActiveSlide = useCallback(
    (patch: Partial<Slide>) => commit(current.current.slides.map((s) => (s.id === activeRef.current ? { ...s, ...patch } : s))),
    [commit],
  );

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    setSelected([]);
  }, []);

  return {
    slides,
    themeId: doc.themeId,
    setTheme,
    active,
    activeId: active?.id ?? "",
    setActiveId,
    selected,
    setSelected,
    save,
    conflict,
    resolveConflict,
    collaborationRevision: revisionRef.current,
    setLive,
    silentUpdate,
    commit,
    undo,
    redo,
    canUndo: history.past > 0,
    canRedo: history.future > 0,
    mapElements,
    updateElements,
    updateActiveSlide,
    snapshot: () => current.current.slides,
  };
}

export type EditorApi = ReturnType<typeof useEditor>;
