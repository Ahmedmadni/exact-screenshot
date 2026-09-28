import type { Slide } from "@/lib/types";
import { applyLayout, buildLayout, contentFromSlide } from "./layouts";
import type { SlideElement } from "./model";

const BY_INTENT: Record<string, string[]> = {
  Cover: ["cover-minimal", "cover-split", "cover-bold"],
  Agenda: ["four-cards", "title-content", "section-divider"],
  "Executive Summary": ["four-cards", "title-content", "three-cards"],
  "Section Divider": ["section-divider", "cover-bold"],
  "Big Number": ["big-number", "kpi-metrics", "title-content"],
  Problem: ["three-cards", "title-content", "image-text"],
  Solution: ["three-cards", "image-text", "title-content"],
  Opportunity: ["image-text", "three-cards", "big-number"],
  Comparison: ["comparison", "title-content"],
  Timeline: ["timeline", "four-cards", "title-content"],
  Process: ["timeline", "four-cards", "title-content"],
  Roadmap: ["timeline", "four-cards", "title-content"],
  Portfolio: ["four-cards", "three-cards", "title-content"],
  Dashboard: ["kpi-metrics", "big-number", "comparison"],
  "Data Story": ["kpi-metrics", "big-number", "comparison"],
  Financial: ["kpi-metrics", "comparison", "title-content"],
  Quote: ["section-divider", "big-number"],
  "Case Study": ["image-text", "title-content", "three-cards"],
  "Before / After": ["comparison", "title-content"],
  Team: ["three-cards", "image-text", "four-cards"],
  "Call to Action": ["closing-cta", "cover-bold", "section-divider"],
  Closing: ["closing-cta", "cover-bold", "section-divider"],
};

function candidateLayouts(slide: Slide) {
  const preferred = BY_INTENT[slide.slideIntent] ?? ["title-content"];
  const bulletCount = slide.bullets?.length ?? 0;
  const kpiCount = slide.kpis?.length ?? 0;

  if (kpiCount >= 3 && !preferred.includes("kpi-metrics")) preferred.unshift("kpi-metrics");
  if (bulletCount >= 4 && !preferred.includes("four-cards")) preferred.unshift("four-cards");
  if (bulletCount === 3 && !preferred.includes("three-cards")) preferred.unshift("three-cards");
  if (bulletCount <= 1 && slide.keyMessage.length > 90 && !preferred.includes("title-content")) preferred.push("title-content");

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
  const next: Slide = { ...slide, ...patch };
  const layoutId = recommendedLayoutId(next);
  const generated = buildLayout(layoutId, contentFromSlide(next), next.id);
  const manual = slide.elements.filter((e) => !e.role).map((e) => ({ ...e }));
  const merged: SlideElement[] = [...generated, ...manual].map((e, i) => ({ ...e, zIndex: i }));
  return { ...next, layoutId, elements: merged, updatedAt: new Date().toISOString() };
}
