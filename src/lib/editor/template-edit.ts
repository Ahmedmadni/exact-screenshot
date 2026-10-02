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
