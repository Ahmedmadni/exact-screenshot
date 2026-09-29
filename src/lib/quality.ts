import type { Presentation, Slide } from "@/lib/types";
import type { SlideElement } from "@/lib/editor/model";
import { getTheme, resolveColor } from "@/lib/editor/themes";
import { slideBackground } from "@/components/editor/slide-renderer";

export type QualitySeverity = "error" | "warning" | "info";

export interface QualityIssue {
  id: string;
  severity: QualitySeverity;
  code: string;
  message: string;
  slideId?: string;
  slideNumber?: number;
}

function hexRgb(hex: string) {
  const h = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminance(hex: string) {
  const rgb = hexRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function textCharacters(slide: Slide) {
  return slide.elements
    .filter((e): e is Extract<SlideElement, { type: "text" }> => e.type === "text" && e.visible)
    .reduce((sum, el) => sum + el.properties.text.trim().length, 0);
}

function issue(
  severity: QualitySeverity,
  code: string,
  message: string,
  slide?: Slide,
): QualityIssue {
  return {
    id: `${code}:${slide?.id ?? "deck"}:${message}`,
    severity,
    code,
    message,
    slideId: slide?.id,
    slideNumber: slide?.slideNumber,
  };
}

export function reviewPresentation(presentation: Presentation): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const theme = getTheme(presentation.themeId, presentation.themeOverrides);

  const seenTitles = new Map<string, Slide>();
  presentation.slides.forEach((slide) => {
    const titleKey = slide.title.trim().toLocaleLowerCase();
    if (titleKey) {
      const prior = seenTitles.get(titleKey);
      if (prior) issues.push(issue("warning", "duplicate-title", `Title duplicates slide ${prior.slideNumber}: “${slide.title}”.`, slide));
      else seenTitles.set(titleKey, slide);
    }

    if ((slide.sourceAssetIds?.length ?? 0) > 0 && !(slide.evidenceRefs?.length)) {
      issues.push(issue("warning", "missing-citation", "This slide uses source material but has no pinned evidence citation.", slide));
    }
    if ((slide.evidenceRefs?.length ?? 0) > 0 && !slide.elements.some((el) => el.name === "Evidence Citation")) {
      issues.push(issue("info", "citation-footer-missing", "Evidence is pinned, but the visible citation footer is missing.", slide));
    }
    if (slide.speakerNotes) {
      if (new Date(slide.speakerNotes.updatedAt).getTime() < new Date(slide.updatedAt).getTime()) {
        issues.push(issue("info", "speaker-notes-stale", "Speaker notes were generated before the latest slide edit. Refresh them before presenting.", slide));
      }
      if (slide.speakerNotes.estimatedSeconds > 120) {
        issues.push(issue("info", "speaker-time-long", "This slide is expected to take more than two minutes to present.", slide));
      }
    }

    const visible = slide.elements.filter((el) => el.visible);
    if (!visible.length) issues.push(issue("error", "empty-slide", "Slide has no visible elements.", slide));

    const chars = textCharacters(slide);
    if (chars > 1200) issues.push(issue("warning", "text-density-high", `Text density is high (${chars} characters). Consider splitting the slide.`, slide));
    else if (chars > 850) issues.push(issue("info", "text-density-medium", `This slide is text-heavy (${chars} characters). Consider simplifying it.`, slide));

    if (slide.title.length > 90) issues.push(issue("warning", "title-long", "Slide title is longer than 90 characters.", slide));

    const bg = slideBackground(slide, theme);
    for (const el of visible) {
      if (el.type === "text") {
        const p = el.properties;
        if (p.fontSize < 14) issues.push(issue("warning", "font-too-small", `${el.name} uses ${p.fontSize}px text, which may be hard to read when presented.`, slide));
        if (el.role === "title" && p.fontSize < 28) issues.push(issue("info", "title-small", "Slide title is visually small for presentation distance.", slide));
        if (/\[(value|number|metric|point|title)\]/i.test(p.text)) issues.push(issue("warning", "placeholder-text", `${el.name} still contains placeholder text.`, slide));
        const fg = resolveColor(p.color, theme);
        const effectiveBg = p.background ? resolveColor(p.background, theme) : bg;
        const ratio = contrast(fg, effectiveBg);
        const min = p.fontSize >= 28 || p.fontWeight >= 600 ? 3 : 4.5;
        if (ratio !== null && ratio < min) {
          issues.push(issue("warning", "contrast", `${el.name} has low text contrast (${ratio.toFixed(1)}:1).`, slide));
        }
      } else if (el.type === "image" && !el.properties.src) {
        issues.push(issue("warning", "missing-image", `${el.name} has no image assigned.`, slide));
      } else if (el.type === "chart") {
        if (!el.properties.categories.length || !el.properties.series.length) issues.push(issue("warning", "chart-empty", `${el.name} has no usable chart data.`, slide));
      } else if (el.type === "table" && !el.properties.rows.length) {
        issues.push(issue("warning", "table-empty", `${el.name} has no rows.`, slide));
      } else if (el.type === "diagram" && !el.properties.nodes.length) {
        issues.push(issue("warning", "diagram-empty", `${el.name} has no nodes.`, slide));
      }
    }
  });

  for (let i = 2; i < presentation.slides.length; i++) {
    const a = presentation.slides[i - 2]?.layoutId;
    const b = presentation.slides[i - 1]?.layoutId;
    const c = presentation.slides[i]?.layoutId;
    if (a && a === b && b === c) {
      issues.push(issue("info", "layout-repetition", `Three consecutive slides use the “${c}” layout. Consider more visual rhythm.`, presentation.slides[i]));
    }
  }

  if (presentation.slides.length >= 5 && !presentation.slides.some((s) => s.slideIntent === "Call to Action")) {
    issues.push(issue("info", "missing-cta", "The deck has no Call to Action slide. Add one if a decision or action is expected."));
  }
  const notesSlides = presentation.slides.filter((slide) => slide.speakerNotes?.talkTrack.trim());
  if (notesSlides.length > 0) {
    const totalSeconds = presentation.slides.reduce((sum, slide) => sum + (slide.speakerNotes?.estimatedSeconds ?? 60), 0);
    const targetSeconds = Math.max(60, presentation.estimatedDuration * 60);
    if (totalSeconds > targetSeconds * 1.2) {
      issues.push(issue("warning", "presentation-time-overrun", `Speaker notes imply about ${Math.round(totalSeconds / 60)} minutes versus a target of ${presentation.estimatedDuration} minutes.`));
    }
    const missingNotes = presentation.slides.length - notesSlides.length;
    if (missingNotes > 0) {
      issues.push(issue("info", "speaker-notes-incomplete", `${missingNotes} slide${missingNotes === 1 ? "" : "s"} still lack speaker notes.`));
    }
  }

  if (!presentation.coreMessage.trim()) issues.push(issue("warning", "core-message", "Presentation core message is empty."));
  if (presentation.brandKitId && !presentation.themeOverrides) issues.push(issue("warning", "brand-snapshot", "A brand kit is linked but its visual snapshot is missing. Reapply the brand kit."));

  return issues.sort((a, b) => {
    const rank = { error: 0, warning: 1, info: 2 };
    return rank[a.severity] - rank[b.severity] || (a.slideNumber ?? 999) - (b.slideNumber ?? 999);
  });
}
