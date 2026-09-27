import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Presentation, Slide } from "@/lib/types";
import type { SlideElement } from "@/lib/editor/model";
import { presentationRepository } from "@/lib/data/store";
import { materializeSlide } from "@/lib/editor/layouts";
import { DEFAULT_THEME_ID } from "@/lib/editor/themes";
import type { SaveState } from "@/components/save-indicator";

const HISTORY_LIMIT = 100;

interface Doc {
  slides: Slide[];
  themeId: string;
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
  const past = useRef<Doc[]>([]);
  const future = useRef<Doc[]>([]);
  const current = useRef(doc);
  current.current = doc;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<Doc | null>(null);

  const write = useCallback(
    (d: Doc) => {
      presentationRepository.update(p.id, {
        slides: d.slides.map((s, i) => ({ ...s, slideNumber: i + 1, sortOrder: i })),
        recommendedSlideCount: d.slides.length,
        themeId: d.themeId,
      });
    },
    [p.id],
  );

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current) {
      write(pending.current);
      pending.current = null;
      setSave("saved");
    }
  }, [write]);

  const persist = useCallback(
    (next: Doc) => {
      setSave("saving");
      pending.current = next;
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 500);
    },
    [flush],
  );

  useEffect(() => {
    // Persist migrated/repaired slides once so legacy decks gain elements.
    if (p.slides.some((s, i) => s !== doc.slides[i])) write(doc);
    const onUnload = () => flush();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncHistory = () => setHistory({ past: past.current.length, future: future.current.length });

  const apply = useCallback(
    (next: Doc, base?: Doc) => {
      past.current.push(base ?? current.current);
      if (past.current.length > HISTORY_LIMIT) past.current.shift();
      future.current = [];
      current.current = next;
      setDoc(next);
      persist(next);
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

  const setTheme = useCallback((themeId: string) => apply({ ...current.current, themeId }), [apply]);

  const restore = useCallback(
    (from: React.MutableRefObject<Doc[]>, to: React.MutableRefObject<Doc[]>) => {
      const d = from.current.pop();
      if (!d) return;
      to.current.push(current.current);
      current.current = d;
      setDoc(d);
      persist(d);
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
    setLive,
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
