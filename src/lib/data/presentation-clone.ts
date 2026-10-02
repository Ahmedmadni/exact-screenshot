import type { Slide } from "../types";

/**
 * A copied presentation must own its slides AND element IDs. Reusing nested
 * element IDs creates selection and collaboration cross-deck collisions.
 */
export function cloneSlidesForPresentation(
  source: readonly Slide[],
  presentationId: string,
  newId: () => string,
  stamp: string,
): Slide[] {
  return source.map((original, index) => {
    const slideId = newId();
    const slide = structuredClone(original);
    return {
      ...slide,
      id: slideId,
      presentationId,
      slideNumber: index + 1,
      sortOrder: index,
      createdAt: stamp,
      updatedAt: stamp,
      elements: slide.elements.map((element) => ({
        ...element,
        id: newId(),
        slideId,
      })),
    };
  });
}
