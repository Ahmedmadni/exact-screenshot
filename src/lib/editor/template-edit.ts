import type { SlideElement } from "./model";

/** Immutable element edits: template instances do not share nested content objects. */
export function withTemplateText(element: SlideElement, text: string): SlideElement {
  if (element.type !== "text") return element;
  if (element.properties.text === text) return element;
  return { ...element, properties: { ...element.properties, text } };
}

export function withTemplateImage(element: SlideElement, src: string): SlideElement {
  if (element.type !== "image" || !src.trim()) return element;
  return {
    ...element,
    properties: {
      ...element.properties,
      src,
      assetId: undefined,
    },
  };
}

/** Explicitly remove a placed image without deleting or moving its editable frame. */
export function clearTemplateImage(element: SlideElement): SlideElement {
  if (element.type !== "image") return element;
  return {
    ...element,
    properties: { ...element.properties, src: "", assetId: undefined },
  };
}

/** Apply an edit to the original slide even if a user navigated away during typing or image decoding. */
export function updateTemplateElementInSlides<T extends { id: string; elements: SlideElement[] }>(
  slides: T[],
  slideId: string,
  elementId: string,
  edit: (element: SlideElement) => SlideElement,
): T[] {
  let changed = false;
  const next = slides.map(slide => {
    if (slide.id !== slideId) return slide;
    let slideChanged = false;
    const elements = slide.elements.map(element => {
      if (element.id !== elementId) return element;
      const edited = edit(element);
      if (edited !== element) slideChanged = true;
      return edited;
    });
    if (!slideChanged) return slide;
    changed = true;
    return { ...slide, elements };
  });
  return changed ? next : slides;
}
