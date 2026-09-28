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
      if (el.type === "chart" || el.type === "table" || el.type === "diagram") {
        issues.push({
          level: "warning",
          slideNumber: index + 1,
          message: `${el.name} is still a placeholder and will export as a placeholder.`,
        });
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
