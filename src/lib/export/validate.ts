import type { Presentation } from "@/lib/types";

export interface ExportIssue {
  level: "warning" | "error";
  slideNumber: number;
  message: string;
}

export function validatePresentationForExport(presentation: Presentation): ExportIssue[] {
  const issues: ExportIssue[] = [];

  presentation.slides.forEach((slide, index) => {
    if (!slide.elements.some((e) => e.visible)) {
      issues.push({ level: "warning", slideNumber: index + 1, message: "Slide has no visible elements." });
    }

    slide.elements.forEach((el) => {
      if (!el.visible) return;
      if (el.type === "image" && !el.properties.src) {
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
