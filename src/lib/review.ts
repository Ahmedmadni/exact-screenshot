import type { Presentation, PresentationVersion, Slide } from "@/lib/types";

export interface VersionDiff {
  titleChanged: boolean;
  coreMessageChanged: boolean;
  statusChanged: boolean;
  addedSlides: Slide[];
  removedSlides: Slide[];
  changedSlides: Array<{ before: Slide; after: Slide; fields: string[] }>;
  changedElementCount: number;
}

function elementSignature(slide: Slide) {
  return JSON.stringify(slide.elements.map((el) => ({
    type: el.type, name: el.name, x: el.x, y: el.y, width: el.width, height: el.height,
    rotation: el.rotation, visible: el.visible, locked: el.locked, properties: el.properties,
  })));
}

export function compareVersionToPresentation(version: PresentationVersion, current: Presentation): VersionDiff {
  const beforeSlides = version.snapshot.slides;
  const before = new Map(beforeSlides.map((slide) => [slide.id, slide]));
  const after = new Map(current.slides.map((slide) => [slide.id, slide]));
  const addedSlides = current.slides.filter((slide) => !before.has(slide.id));
  const removedSlides = beforeSlides.filter((slide) => !after.has(slide.id));
  const changedSlides: VersionDiff["changedSlides"] = [];
  let changedElementCount = 0;

  for (const prior of beforeSlides) {
    const next = after.get(prior.id);
    if (!next) continue;
    const fields: string[] = [];
    if (prior.title !== next.title) fields.push("title");
    if (prior.keyMessage !== next.keyMessage) fields.push("key message");
    if (prior.contentSummary !== next.contentSummary) fields.push("content");
    if (prior.layoutId !== next.layoutId) fields.push("layout");
    if (prior.visualType !== next.visualType) fields.push("visual type");
    if (elementSignature(prior) !== elementSignature(next)) {
      fields.push("elements");
      changedElementCount += Math.abs(next.elements.length - prior.elements.length) || 1;
    }
    if (fields.length) changedSlides.push({ before: prior, after: next, fields });
  }

  return {
    titleChanged: version.snapshot.title !== current.title,
    coreMessageChanged: version.snapshot.coreMessage !== current.coreMessage,
    statusChanged: version.snapshot.status !== current.status,
    addedSlides,
    removedSlides,
    changedSlides,
    changedElementCount,
  };
}

export function versionDiffSummary(diff: VersionDiff) {
  const parts: string[] = [];
  if (diff.titleChanged) parts.push("title");
  if (diff.coreMessageChanged) parts.push("core message");
  if (diff.statusChanged) parts.push("status");
  if (diff.addedSlides.length) parts.push(diff.addedSlides.length + " slide(s) added");
  if (diff.removedSlides.length) parts.push(diff.removedSlides.length + " slide(s) removed");
  if (diff.changedSlides.length) parts.push(diff.changedSlides.length + " slide(s) changed");
  return parts.length ? parts.join(" · ") : "No changes from this version";
}
