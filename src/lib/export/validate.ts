import type { Presentation } from "@/lib/types";
import { SLIDE_H, SLIDE_W, type SlideElement } from "@/lib/editor/model";
import { renderedFinancialElements } from "@/lib/editor/variance";

export interface ExportIssue {
  level: "warning" | "error";
  slideNumber: number;
  message: string;
}

const CORE_ROLES = new Set(["title", "subtitle", "body", "item", "itemTitle", "kpiValue", "kpiLabel"]);
const EPS = 2;

/** Backgrounds, full-bleed photography and decorative geometry intentionally spill past the canvas. */
export function needsContentBoundsCheck(el: SlideElement): boolean {
  return el.visible && (
    (el.type === "text" && el.role !== "decor") ||
    (el.type === "chart" || el.type === "table" || el.type === "diagram") && el.role !== "decor"
  );
}

export function contentBeyondSlide(el: SlideElement): boolean {
  return needsContentBoundsCheck(el) && (
    ![el.x, el.y, el.width, el.height].every(Number.isFinite) ||
    el.width <= 0 || el.height <= 0 ||
    el.x < -EPS || el.y < -EPS ||
    el.x + el.width > SLIDE_W + EPS ||
    el.y + el.height > SLIDE_H + EPS
  );
}

/** Only warn on substantial overlap between independent primary text blocks.
 * Exact glyph and paragraph measurement still requires a visual browser check.
 */
export function substantialTextOverlap(a: SlideElement, b: SlideElement): boolean {
  if (a.type !== "text" || b.type !== "text" ||
      !a.visible || !b.visible || !CORE_ROLES.has(a.role ?? "") || !CORE_ROLES.has(b.role ?? "")) return false;
  if (!a.properties.text.trim() || !b.properties.text.trim()) return false;
  if (a.opacity < 0.1 || b.opacity < 0.1) return false;
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const minArea = Math.min(a.width * a.height, b.width * b.height);
  return minArea > 0 && (x * y) / minArea > 0.35;
}

export function validatePresentationForExport(presentation: Presentation): ExportIssue[] {
  const issues: ExportIssue[] = [];
  presentation.slides.forEach((slide, index) => {
    const elements = renderedFinancialElements(slide);
    if (!elements.some(e => e.visible)) {
      issues.push({ level: "warning", slideNumber: index + 1, message: "Slide has no visible elements." });
    }
    elements.forEach((el, i) => {
      if (!el.visible) return;
      if (contentBeyondSlide(el)) {
        issues.push({ level: "warning", slideNumber: index + 1, message: `${el.name} exceeds the slide boundary; check placement and clipping.` });
      }
      if (el.type === "image" && !el.properties.src && !el.properties.assetId) {
        issues.push({ level: "warning", slideNumber: index + 1, message: `${el.name} has no image assigned.` });
      }
      if (el.type === "chart" && (!el.properties.categories.length || !el.properties.series.length)) {
        issues.push({ level: "warning", slideNumber: index + 1, message: `${el.name} has no chart data.` });
      }
      if (el.type === "table" && !el.properties.rows.length) {
        issues.push({ level: "warning", slideNumber: index + 1, message: `${el.name} has no table rows.` });
      }
      if (el.type === "diagram" && !el.properties.nodes.length) {
        issues.push({ level: "warning", slideNumber: index + 1, message: `${el.name} has no diagram items.` });
      }
      if (el.type === "text" && el.role !== "decor") {
        for (const next of elements.slice(i + 1)) {
          if (substantialTextOverlap(el, next)) {
            issues.push({
              level: "warning",
              slideNumber: index + 1,
              message: `${el.name} overlaps ${next.name}; inspect readability before export.`,
            });
          }
        }
      }
    });
  });
  return issues;
}

export function safeExportFilename(title: string, extension: "pptx" | "pdf") {
  const stem = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 100) || "presentation";
  return `${stem}.${extension}`;
}
