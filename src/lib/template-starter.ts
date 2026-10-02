import type { Presentation, Slide } from "./types";
import { templatePreviewSlides, type TemplateFamily } from "./templates";
import { uid } from "./data/store";

/** Make independent editable instances rather than reusing demo preview ids.
 * All text, images, shapes, charts and tables remain actual editor elements.
 */
export function editableTemplateSlides(template: TemplateFamily, presentationId: string): Slide[] {
  const stamp = new Date().toISOString();
  return templatePreviewSlides(template).map((preview, index) => {
    const slideId = uid();
    return {
      ...preview,
      id: slideId,
      presentationId,
      purpose: "Edit this ready-made example",
      slideNumber: index + 1,
      sortOrder: index,
      elements: preview.elements.map((element, order) => ({
        ...structuredClone(element),
        id: uid(),
        slideId,
        zIndex: order,
        locked: false,
      })),
      createdAt: stamp,
      updatedAt: stamp,
    };
  });
}

export function editableTemplateDeckInput(template: TemplateFamily):
  Omit<Presentation, "id" | "userId" | "createdAt" | "updatedAt"> {
  const slides = editableTemplateSlides(template, "pending-template-id");
  return {
    title: template.name + " · Editable Copy",
    description: template.description,
    topic: template.name,
    objective: "Customize the template content, images and layout",
    purpose: "Inform",
    audience: "Executive Management",
    presentationType: template.presentationType,
    language: template.id === "arabic-executive" ? "Arabic" : "English",
    tone: template.tone,
    status: "Draft",
    lengthPreset: template.lengthPreset,
    recommendedSlideCount: slides.length,
    estimatedDuration: slides.length * 2,
    coreMessage: template.description,
    visualDirection: template.signature,
    storyArc: [],
    themeId: template.themeId,
    slides,
  };
}
