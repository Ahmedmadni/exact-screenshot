import type { Slide } from "../types";
import type { LiveElementChange } from "../collaboration";

export interface ElementDiffDocument {
  slides: Slide[];
  themeId: string;
}

/**
 * Compute one-slide element patches for collaborative saving.
 * Unmodified editor slides/elements retain identity, so skip expensive JSON
 * serialization for those references. Immutable updates remain a requirement.
 * Structural edits and updates across multiple slides use the full-deck save.
 */
export function elementOnlyChanges(
  base: ElementDiffDocument,
  next: ElementDiffDocument,
): { slideId: string; changes: LiveElementChange[] } | null {
  if (base.themeId !== next.themeId || base.slides.length !== next.slides.length) return null;

  let changedSlideId = "";
  const changes: LiveElementChange[] = [];

  for (let index = 0; index < base.slides.length; index++) {
    const beforeSlide = base.slides[index]!;
    const afterSlide = next.slides[index]!;
    if (beforeSlide === afterSlide) continue;
    if (beforeSlide.id !== afterSlide.id) return null;

    const { elements: beforeElements, updatedAt: _beforeUpdated, ...beforeMeta } = beforeSlide;
    const { elements: afterElements, updatedAt: _afterUpdated, ...afterMeta } = afterSlide;
    if (JSON.stringify(beforeMeta) !== JSON.stringify(afterMeta)) return null;
    if (beforeElements === afterElements) continue;

    const previous = new Map(beforeElements.map(element => [element.id, element]));
    const following = new Map(afterElements.map(element => [element.id, element]));
    const ids = new Set([...previous.keys(), ...following.keys()]);

    for (const id of ids) {
      const before = previous.get(id);
      const after = following.get(id);
      if (before === after) continue;
      if (JSON.stringify(before ?? null) === JSON.stringify(after ?? null)) continue;
      if (changedSlideId && changedSlideId !== beforeSlide.id) return null;
      changedSlideId = beforeSlide.id;
      changes.push({ id, before: before ?? null, after: after ?? null });
    }
  }

  return changedSlideId ? { slideId: changedSlideId, changes } : null;
}
