import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Presentation, Slide } from "@/lib/types";
import type { SlideElement } from "@/lib/editor/model";
import { presentationRepository } from "@/lib/data/store";
import { materializeSlide } from "@/lib/editor/layouts";
import type { SaveState } from "@/components/save-indicator";

const HISTORY_LIMIT = 80;

/**
 * Editor state: a local working copy of the slides with snapshot undo/redo.
 * `setLive` updates without history (used mid-gesture); `commit` records a
 * history step and schedules an autosave through the repository.
 */
export function useEditor(p: Presentation, initialSlideId?: string) {
  const [slides, setSlides] = useState<Slide[]>(() => p.slides.map(materializeSlide));
  const [activeId, setActiveId] = useState<string>(() => initialSlideId && p.slides.some((s) => s.id === initialSlideId) ? initialSlideId : p.slides[0]?.id ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [save, setSave] = useState<SaveState>("idle");
  const past = useRef<Slide[][]>([]);
  const future = useRef<Slide[][]>([]);
  const current = useRef(slides);
  current.current = slides;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [, force] = useState(0);

  const persist = useCallback(
    (next: Slide[]) => {
      setSave("saving");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        presentationRepository.replaceSlides(p.id, next);
        setSave("saved");
      }, 400);
    },
    [p.id],
  );

  // Persist migrated (materialized) slides once so legacy decks gain elements.
  useEffect(() => {
    if (p.slides.some((s, i) => s.elements !== slides[i]?.elements)) presentationRepository.replaceSlides(p.id, slides);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLive = useCallback((next: Slide[]) => setSlides(next), []);

  const commit = useCallback(
    (next: Slide[], base?: Slide[]) => {
      past.current.push(base ?? current.current);
      if (past.current.length > HISTORY_LIMIT) past.current.shift();
      future.current = [];
      setSlides(next);
      persist(next);
    },
    [persist],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(current.current);
    setSlides(prev);
    persist(prev);
    if (!prev.some((s) => s.id === activeId)) setActiveId(prev[0]?.id ?? "");
    setSelected([]);
    force((n) => n + 1);
  }, [persist, activeId]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(current.current);
    setSlides(next);
    persist(next);
    if (!next.some((s) => s.id === activeId)) setActiveId(next[0]?.id ?? "");
    setSelected([]);
    force((n) => n + 1);
  }, [persist, activeId]);

  const active = useMemo(() => slides.find((s) => s.id === activeId) ?? slides[0], [slides, activeId]);

  /** Map elements of the active slide. */
  const mapElements = useCallback(
    (fn: (els: SlideElement[]) => SlideElement[], source = current.current) =>
      source.map((s) => (s.id === active?.id ? { ...s, elements: fn(s.elements), updatedAt: new Date().toISOString() } : s)),
    [active?.id],
  );

  const updateElements = useCallback(
    (ids: string[], patch: (el: SlideElement) => SlideElement, live = false) => {
      const next = mapElements((els) => els.map((e) => (ids.includes(e.id) ? patch(e) : e)));
      if (live) setLive(next);
      else commit(next);
    },
    [mapElements, setLive, commit],
  );

  return {
    slides,
    active,
    activeId: active?.id ?? "",
    setActiveId: (id: string) => {
      setActiveId(id);
      setSelected([]);
    },
    selected,
    setSelected,
    save,
    setLive,
    commit,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    mapElements,
    updateElements,
    snapshot: () => current.current,
  };
}

export type EditorApi = ReturnType<typeof useEditor>;
