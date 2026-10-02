import type { Slide } from "@/lib/types";
import { applyLayout, buildLayout, contentFromSlide, layoutsForIntent, slideIsRtl } from "./layouts";
import type { SlideElement } from "./model";

const BY_INTENT: Record<string, string[]> = {
  Cover: ["cover-architectural", "hero-editorial", "cover-index", "cover-split", "cover-minimal", "full-bleed-story", "cover-bold"],
  Agenda: ["four-cards", "title-content", "section-divider"],
  "Executive Summary": ["executive-metrics-band", "executive-two-column", "financial-scorecard", "four-cards", "title-content", "three-cards"],
  "Section Divider": ["hero-editorial", "section-divider", "full-bleed-story", "cover-bold"],
  "Big Number": ["image-stat-overlay", "big-number", "executive-metrics-band"],
  Problem: ["executive-two-column", "title-content", "three-cards", "hero-editorial", "image-caption", "image-text"],
  Solution: ["diagram-focus", "image-caption", "image-text", "executive-two-column", "three-cards", "title-content"],
  Opportunity: ["image-stat-overlay", "image-caption", "hero-editorial", "strategy-matrix", "big-number"],
  Comparison: ["strategy-matrix", "comparison", "finance-table", "title-content"],
  Timeline: ["roadmap-staircase", "timeline", "process-ribbon"],
  Process: ["process-ribbon", "diagram-focus", "timeline", "four-cards"],
  Roadmap: ["roadmap-staircase", "process-ribbon", "timeline", "four-cards"],
  Portfolio: ["strategy-matrix", "four-cards", "three-cards"],
  Dashboard: ["data-pulse", "executive-metrics-band", "chart-story", "financial-scorecard", "kpi-metrics", "finance-table"],
  "Data Story": ["data-pulse", "chart-story", "image-stat-overlay", "executive-metrics-band", "big-number"],
  Financial: ["financial-scorecard", "finance-table", "data-pulse", "chart-story", "executive-metrics-band", "comparison"],
  Quote: ["quote-editorial", "full-bleed-story", "section-divider", "big-number"],
  "Case Study": ["image-caption", "image-stat-overlay", "hero-editorial", "image-text", "full-bleed-story"],
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

  if (slide.visualType === "Chart") promote(slide.slideIntent === "Financial" ? "data-pulse" : "chart-story");
  if (slide.visualType === "Table") promote(slide.slideIntent === "Financial" ? "financial-scorecard" : "finance-table");
  if (slide.visualType === "Matrix") promote("strategy-matrix");
  if (slide.visualType === "Diagram" || slide.visualType === "Process") promote("diagram-focus");
  if (slide.visualType === "Timeline") promote("roadmap-staircase");
  if (slide.visualType === "Full Bleed Image") promote("full-bleed-story");
  if (slide.visualType === "Hero Image") promote("hero-editorial");
  if (slide.visualType === "Image + Text") promote(kpiCount ? "image-stat-overlay" : (messageLength > 70 ? "image-caption" : "image-text"));

  if (kpiCount >= 4) promote(slide.slideIntent === "Financial" ? "financial-scorecard" : "executive-metrics-band");
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

export type MagicDesignFamily = "editorial" | "data" | "structured" | "flow" | "statement" | "minimal";

export interface MagicDesignVariant {
  id: string;
  label: string;
  description: string;
  family: MagicDesignFamily;
  layoutId: string;
  slide: Slide;
}

function magicFamily(layoutId: string): MagicDesignFamily {
  if (layoutId.includes("chart") || layoutId.includes("metric") || layoutId.includes("table") || layoutId === "big-number") return "data";
  if (layoutId.includes("image") || layoutId.includes("hero") || layoutId.includes("bleed") || layoutId.includes("editorial") || layoutId.includes("magazine")) return "editorial";
  if (layoutId.includes("roadmap") || layoutId.includes("ribbon") || layoutId.includes("timeline") || layoutId.includes("diagram")) return "flow";
  if (layoutId.includes("decision") || layoutId.includes("closing") || layoutId.includes("quote")) return "statement";
  if (layoutId.includes("matrix") || layoutId.includes("card") || layoutId.includes("comparison")) return "structured";
  return "minimal";
}

const MAGIC_COPY: Record<MagicDesignFamily, { label: string; description: string }> = {
  editorial: { label: "Editorial", description: "Image-led hierarchy with a stronger visual point of view." },
  data: { label: "Data-led", description: "Makes metrics, evidence and management commentary dominant." },
  structured: { label: "Structured", description: "Consulting-style grouping for clear comparison and logic." },
  flow: { label: "Flow", description: "Turns the story into a process, roadmap or connected system." },
  statement: { label: "Statement", description: "Creates a decisive, high-impact message or closing moment." },
  minimal: { label: "Minimal", description: "Quiet hierarchy with generous whitespace and low visual noise." },
};

export function magicDesignVariants(slide: Slide, limit = 4): MagicDesignVariant[] {
  const candidates = [
    ...candidateLayouts(slide),
    ...layoutsForIntent(slide.slideIntent).map((layout) => layout.id),
  ].filter((id, index, all) => all.indexOf(id) === index);

  const selected: string[] = [];
  const usedFamilies = new Set<MagicDesignFamily>();

  for (const id of candidates) {
    const family = magicFamily(id);
    if (usedFamilies.has(family)) continue;
    selected.push(id);
    usedFamilies.add(family);
    if (selected.length >= limit) break;
  }

  for (const id of candidates) {
    if (selected.length >= limit) break;
    if (!selected.includes(id)) selected.push(id);
  }

  return selected.slice(0, limit).map((layoutId, index) => {
    const family = magicFamily(layoutId);
    const copy = MAGIC_COPY[family];
    return {
      id: slide.id + "-magic-" + layoutId,
      label: index === 0 ? "Best fit" : copy.label,
      description: index === 0 ? "Recommended from this slide’s content, intent and visual density." : copy.description,
      family,
      layoutId,
      slide: applyLayout(slide, layoutId),
    };
  });
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
  let generated = buildLayout(layoutId, contentFromSlide(next), next.id, slideIsRtl(next));
  const existingMedia = slide.elements.find(
    (e) => e.type === "image" && e.role === "media" && (e.properties.src || e.properties.assetId),
  );
  if (existingMedia?.type === "image") {
    generated = generated.map((e) =>
      e.type === "image" && e.role === "media"
        ? {
            ...e,
            properties: {
              ...e.properties,
              src: existingMedia.properties.src,
              assetId: existingMedia.properties.assetId,
              treatment: existingMedia.properties.treatment,
              crop: existingMedia.properties.crop,
            },
          }
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
