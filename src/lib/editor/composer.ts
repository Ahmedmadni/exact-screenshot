import type { Slide } from "@/lib/types";
import { applyLayout, buildLayout, contentFromSlide } from "./layouts";
import type { SlideElement } from "./model";

const BY_INTENT: Record<string, string[]> = {
  Cover: ["hero-editorial", "cover-split", "cover-minimal", "full-bleed-story", "cover-bold"],
  Agenda: ["four-cards", "title-content", "section-divider"],
  "Executive Summary": ["executive-metrics-band", "four-cards", "title-content", "three-cards"],
  "Section Divider": ["hero-editorial", "section-divider", "full-bleed-story", "cover-bold"],
  "Big Number": ["image-stat-overlay", "big-number", "executive-metrics-band"],
  Problem: ["title-content", "three-cards", "hero-editorial", "image-text"],
  Solution: ["diagram-focus", "image-text", "three-cards", "title-content"],
  Opportunity: ["image-stat-overlay", "hero-editorial", "strategy-matrix", "big-number"],
  Comparison: ["strategy-matrix", "comparison", "finance-table", "title-content"],
  Timeline: ["roadmap-staircase", "timeline", "process-ribbon"],
  Process: ["process-ribbon", "diagram-focus", "timeline", "four-cards"],
  Roadmap: ["roadmap-staircase", "process-ribbon", "timeline", "four-cards"],
  Portfolio: ["strategy-matrix", "four-cards", "three-cards"],
  Dashboard: ["chart-story", "executive-metrics-band", "kpi-metrics", "finance-table"],
  "Data Story": ["chart-story", "image-stat-overlay", "executive-metrics-band", "big-number"],
  Financial: ["finance-table", "chart-story", "executive-metrics-band", "comparison"],
  Quote: ["quote-editorial", "full-bleed-story", "section-divider", "big-number"],
  "Case Study": ["image-stat-overlay", "hero-editorial", "image-text", "full-bleed-story"],
  "Before / After": ["comparison", "strategy-matrix", "image-text"],
  Team: ["three-cards", "image-text", "four-cards"],
  "Call to Action": ["decision-focus", "closing-cta", "full-bleed-story"],
  Closing: ["quote-editorial", "decision-focus", "closing-cta", "full-bleed-story"],
};

function candidateLayouts(slide: Slide) {
  const preferred = [...(BY_INTENT[slide.slideIntent] ?? ["title-content"])];
  const bulletCount = slide.bullets?.length ?? 0;
  const kpiCount = slide.kpis?.length ?? 0;
  const messageLength = slide.keyMessage.trim().length;
  const summaryLength = slide.contentSummary.trim().length;

  const promote = (id: string) => {
    const current = preferred.indexOf(id);
    if (current >= 0) preferred.splice(current, 1);
    preferred.unshift(id);
  };

  if (slide.visualType === "Chart") promote("chart-story");
  if (slide.visualType === "Table") promote("finance-table");
  if (slide.visualType === "Matrix") promote("strategy-matrix");
  if (slide.visualType === "Diagram" || slide.visualType === "Process") promote("diagram-focus");
  if (slide.visualType === "Timeline") promote("roadmap-staircase");
  if (slide.visualType === "Full Bleed Image") promote("full-bleed-story");
  if (slide.visualType === "Hero Image") promote("hero-editorial");
  if (slide.visualType === "Image + Text") promote(kpiCount ? "image-stat-overlay" : "image-text");

  if (kpiCount >= 4) promote("executive-metrics-band");
  else if (kpiCount >= 2 && ["Dashboard", "Financial", "Data Story"].includes(slide.slideIntent)) promote("chart-story");
  else if (kpiCount === 1 && ["Opportunity", "Big Number", "Case Study"].includes(slide.slideIntent)) promote("image-stat-overlay");

  if (bulletCount >= 4 && ["Process", "Roadmap", "Timeline"].includes(slide.slideIntent)) promote("process-ribbon");
  else if (bulletCount >= 4 && ["Portfolio", "Comparison", "Opportunity"].includes(slide.slideIntent)) promote("strategy-matrix");
  else if (bulletCount >= 4) promote("four-cards");
  else if (bulletCount === 3 && ["Problem", "Solution", "Team"].includes(slide.slideIntent)) promote("three-cards");

  if (messageLength > 110 && bulletCount <= 2) promote("hero-editorial");
  if (summaryLength > 320 && !["Financial", "Dashboard"].includes(slide.slideIntent)) {
    const i = preferred.indexOf("title-content");
    if (i >= 0) preferred.splice(i, 1);
    preferred.push("title-content");
  }

  return [...new Set(preferred)];
}

export function recommendedLayoutId(slide: Slide): string {
  return candidateLayouts(slide)[0] ?? "title-content";
}

export function nextDesignLayoutId(slide: Slide): string {
  const candidates = candidateLayouts(slide);
  const current = slide.layoutId ?? recommendedLayoutId(slide);
  const i = candidates.indexOf(current);
  return candidates[(i + 1 + candidates.length) % candidates.length] ?? recommendedLayoutId(slide);
}

export function smartComposeSlide(slide: Slide): Slide {
  return applyLayout(slide, recommendedLayoutId(slide));
}

export function tryAnotherDesign(slide: Slide): Slide {
  return applyLayout(slide, nextDesignLayoutId(slide));
}

/**
 * Replace only system-generated semantic content. Elements the user added
 * manually have no semantic role and are preserved untouched.
 */
export function rebuildGeneratedContent(
  slide: Slide,
  patch: Pick<Slide, "title" | "keyMessage" | "contentSummary" | "bullets" | "kpis" | "visualType" | "slideIntent" | "purpose">,
): Slide {
  const next: Slide = { ...slide, ...patch, speakerNotes: undefined };
  const layoutId = recommendedLayoutId(next);
  let generated = buildLayout(layoutId, contentFromSlide(next), next.id);
  const existingMedia = slide.elements.find((e) => e.type === "image" && e.role === "media" && e.properties.src);
  if (existingMedia?.type === "image") {
    generated = generated.map((e) =>
      e.type === "image" && e.role === "media"
        ? { ...e, properties: { ...e.properties, src: existingMedia.properties.src } }
        : e,
    );
  }
  const manual = slide.elements.filter((e) => !e.role || e.name === "Evidence Citation").map((e) => ({ ...e }));
  const merged: SlideElement[] = [...generated, ...manual].map((e, i) => ({ ...e, zIndex: i }));
  return { ...next, layoutId, elements: merged, updatedAt: new Date().toISOString() };
}


/**
 * Compose a full deck with visual rhythm: keep the best layout for each slide
 * while avoiding unnecessary repetition across adjacent slides.
 */
export function composeDeck(slides: Slide[]): Slide[] {
  let previous = "";
  let previousFamily = "";
  const family = (id: string) => {
    if (id.includes("chart") || id.includes("metric") || id.includes("table") || id === "big-number") return "data";
    if (id.includes("image") || id.includes("hero") || id.includes("bleed") || id.includes("editorial")) return "image";
    if (id.includes("card") || id.includes("matrix")) return "cards";
    if (id.includes("timeline") || id.includes("roadmap") || id.includes("ribbon") || id.includes("diagram")) return "flow";
    if (id.includes("decision") || id.includes("closing")) return "close";
    return "text";
  };

  return slides.map((slide, index) => {
    const candidates = candidateLayouts(slide);
    const chosen =
      candidates.find((id) => id !== previous && (index < 2 || family(id) !== previousFamily)) ??
      candidates.find((id) => id !== previous) ??
      candidates[0] ??
      "title-content";
    const composed = applyLayout(slide, chosen);
    previous = chosen;
    previousFamily = family(chosen);
    return composed;
  });
}
