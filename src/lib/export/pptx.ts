import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Presentation } from "@/lib/types";
import type { SlideElement } from "@/lib/editor/model";
import { SLIDE_H, SLIDE_W } from "@/lib/editor/model";
import { getTheme, resolveColor, type SlideTheme } from "@/lib/editor/themes";
import { getIcon } from "@/lib/editor/icons";
import { safeExportFilename } from "./validate";
import { resolveImageSource } from "@/lib/assets/resolve";
import { imageTreatmentOverlay } from "@/lib/editor/image-treatment";
import { imageCropPptx } from "@/lib/editor/image-crop";
import { renderedFinancialElements } from "@/lib/editor/variance";
import { buildWaterfall, waterfallColor } from "@/lib/editor/waterfall";

const PPT_W = 13.333333;
const PPT_H = 7.5;
const X_SCALE = PPT_W / SLIDE_W;
const Y_SCALE = PPT_H / SLIDE_H;
const FONT_SCALE = 72 / 120;

const pos = (el: SlideElement) => ({
  x: el.x * X_SCALE,
  y: el.y * Y_SCALE,
  w: el.width * X_SCALE,
  h: el.height * Y_SCALE,
});

function cleanHex(value: string) {
  return value.replace("#", "").slice(0, 6).toUpperCase();
}

function resolved(value: string | undefined, theme: SlideTheme) {
  const color = resolveColor(value, theme);
  return color === "transparent" ? null : cleanHex(color);
}

function transparency(opacity: number) {
  return Math.round((1 - Math.min(1, Math.max(0, opacity))) * 100);
}

function isRtlText(text: string, dir: "auto" | "ltr" | "rtl") {
  if (dir === "rtl") return true;
  if (dir === "ltr") return false;
  return /[\u0590-\u08FF]/.test(text);
}

function fontFace(value: string, theme: SlideTheme, rtl: boolean) {
  const family =
    value === "theme:heading" ? theme.fonts.heading :
    value === "theme:body" ? theme.fonts.body :
    value;
  // Preserve the selected Arabic display font in editable PowerPoint text.
  return family;
}

function alignFor(align: "start" | "center" | "end" | "justify", rtl: boolean) {
  if (align === "center") return "center";
  if (align === "justify") return "justify";
  if (align === "start") return rtl ? "right" : "left";
  return rtl ? "left" : "right";
}

function base64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + 0x8000)));
  }
  return btoa(binary);
}

function iconData(name: string, color: string, strokeWidth: number) {
  const Icon = getIcon(name);
  const markup = renderToStaticMarkup(
    createElement(Icon, {
      width: 256,
      height: 256,
      color,
      strokeWidth,
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
    }),
  );
  return `image/svg+xml;base64,${base64Utf8(markup)}`;
}

function normalizeImageData(src: string) {
  return src.startsWith("data:") ? src.slice(5) : src;
}

function addText(pptxSlide: any, el: Extract<SlideElement, { type: "text" }>, theme: SlideTheme) {
  const p = el.properties;
  const rtl = isRtlText(p.text, p.dir);
  const color = resolved(p.color, theme) ?? "000000";
  const bg = p.background ? resolved(p.background, theme) : null;
  const options: Record<string, unknown> = {
    ...pos(el),
    fontFace: fontFace(p.fontFamily, theme, rtl),
    fontSize: Math.max(1, p.fontSize * FONT_SCALE),
    bold: p.fontWeight >= 600,
    italic: p.italic,
    underline: p.underline ? { style: "sng" } : undefined,
    color,
    align: alignFor(p.align, rtl),
    valign: p.vAlign,
    margin: 0,
    rotate: Math.round(el.rotation),
    transparency: transparency(el.opacity),
    rtlMode: rtl,
    lang: rtl ? "ar-SA" : "en-US",
    fit: "shrink",
    breakLine: false,
    lineSpacingMultiple: p.lineHeight,
    charSpacing: Math.max(0, p.letterSpacing * FONT_SCALE),
    isTextBox: true,
    fill: bg ? { color: bg } : undefined,
  };
  pptxSlide.addText(p.uppercase ? p.text.toUpperCase() : p.text, options);
}

function addShape(pptx: any, pptxSlide: any, el: Extract<SlideElement, { type: "shape" }>, theme: SlideTheme) {
  const p = el.properties;
  const fillColor = resolved(p.fill, theme);
  const strokeColor = resolved(p.stroke, theme);
  const alpha = transparency(el.opacity);
  const lineWidth = Math.max(p.strokeWidth * FONT_SCALE, p.shape === "line" || p.shape === "arrow" ? 1.5 : 0);
  const lineColor = strokeColor ?? fillColor ?? "000000";

  const common: Record<string, unknown> = {
    ...pos(el),
    rotate: Math.round(el.rotation),
    shapeName: el.name,
    fill: fillColor ? { color: fillColor, transparency: alpha } : { color: "FFFFFF", transparency: 100 },
    line: {
      color: lineColor,
      width: lineWidth,
      transparency: alpha,
      ...(p.shape === "arrow" ? { endArrowType: "triangle" } : {}),
    },
  };

  const type =
    p.shape === "ellipse" ? pptx.ShapeType.ellipse :
    p.shape === "roundRect" ? pptx.ShapeType.roundRect :
    p.shape === "triangle" ? pptx.ShapeType.triangle :
    p.shape === "line" || p.shape === "arrow" ? pptx.ShapeType.line :
    pptx.ShapeType.rect;

  pptxSlide.addShape(type, common);
}

function addImage(pptx: any, pptxSlide: any, el: Extract<SlideElement, { type: "image" }>, theme: SlideTheme) {
  const src = resolveImageSource(el.properties);
  if (!src) return;
  const box = pos(el);
  pptxSlide.addImage({
    data: normalizeImageData(src),
    ...box,
    sizing: el.properties.fit === "cover" && el.properties.crop
      ? imageCropPptx(el.properties.crop, box.w, box.h)
      : { type: el.properties.fit, w: box.w, h: box.h },
    rotate: Math.round(el.rotation),
    transparency: transparency(el.opacity),
    altText: el.name,
  });
  const treatment = imageTreatmentOverlay(el.properties.treatment);
  if (treatment) {
    const color = resolved(treatment.color, theme);
    if (color) pptxSlide.addShape(pptx.ShapeType.rect, {
      ...box,
      rotate: Math.round(el.rotation),
      line: { color, transparency: 100 },
      fill: { color, transparency: transparency(treatment.opacity * el.opacity) },
    });
  }
}

function addIcon(pptxSlide: any, el: Extract<SlideElement, { type: "icon" }>, theme: SlideTheme) {
  const color = resolved(el.properties.color, theme) ?? "000000";
  pptxSlide.addImage({
    data: iconData(el.properties.name, `#${color}`, el.properties.strokeWidth),
    ...pos(el),
    rotate: Math.round(el.rotation),
    transparency: transparency(el.opacity),
    altText: el.name,
  });
}

function addWaterfall(pptx: any, pptxSlide: any, el: Extract<SlideElement, { type: "chart" }>, theme: SlideTheme) {
  const p = el.properties;
  const model = buildWaterfall(p.categories, p.series[0]?.values ?? []);
  const box = pos(el);
  const left = 80;
  const right = el.width - 26;
  const top = p.label ? 78 : 45;
  const bottom = el.height - 70;
  const yFor = (value: number) =>
    bottom - ((value - model.min) / Math.max(1, model.max - model.min)) * Math.max(20, bottom - top);
  const tx = (x: number) => box.x + x * X_SCALE;
  const ty = (y: number) => box.y + y * Y_SCALE;
  const formatValue = (value: number) => Number(value.toFixed(2)).toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (!model.valid) {
    pptxSlide.addText("Enter an opening balance and finite signed movements", {
      ...box, fontFace: theme.fonts.body, fontSize: 13, color: cleanHex(theme.colors.secondary),
      align: "center", valign: "mid", margin: 0,
    });
    return;
  }
  if (p.label) pptxSlide.addText(p.label, {
    x: tx(left), y: ty(4), w: (right - left) * X_SCALE, h: 40 * Y_SCALE,
    fontFace: theme.fonts.heading, fontSize: 13, color: cleanHex(theme.colors.primary), margin: 0,
  });
  const axis = cleanHex(theme.colors.line);
  if (p.showGrid) for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
    const y = top + (bottom - top) * fraction;
    pptxSlide.addShape(pptx.ShapeType.line, {
      x: tx(left), y: ty(y), w: (right - left) * X_SCALE, h: 0,
      line: { color: axis, width: 0.6 },
    });
  }
  pptxSlide.addShape(pptx.ShapeType.line, {
    x: tx(left), y: ty(yFor(0)), w: (right - left) * X_SCALE, h: 0,
    line: { color: cleanHex(theme.colors.secondary), width: 1 },
  });
  const band = (right - left) / Math.max(1, model.steps.length);
  const barWidth = Math.max(7, band * 0.54);
  model.steps.forEach((step, index) => {
    const cx = left + band * (index + 0.5);
    const yTop = yFor(Math.max(step.start, step.end));
    const yBottom = yFor(Math.min(step.start, step.end));
    const color = cleanHex(theme.colors[waterfallColor(step.kind)]);
    const prev = model.steps[index - 1];
    if (index > 0 && step.kind !== "closing" && prev) {
      pptxSlide.addShape(pptx.ShapeType.line, {
        x: tx(cx - band * 0.5), y: ty(yFor(prev.end)),
        w: Math.max(0.001, (band * 0.5 - barWidth * 0.5) * X_SCALE), h: 0,
        line: { color: axis, width: 0.7, dash: "dash" },
      });
    }
    pptxSlide.addShape(pptx.ShapeType.rect, {
      x: tx(cx - barWidth / 2), y: ty(yTop),
      w: barWidth * X_SCALE, h: Math.max(2, yBottom - yTop) * Y_SCALE,
      line: { color, transparency: 100 }, fill: { color },
    });
    if (p.showValues) pptxSlide.addText(formatValue(step.value), {
      x: tx(cx - band * 0.48), y: ty(Math.max(top + 3, yTop - 27)),
      w: band * 0.96 * X_SCALE, h: 23 * Y_SCALE,
      fontFace: theme.fonts.body, fontSize: 9, align: "center",
      color: cleanHex(theme.colors.primary), margin: 0,
    });
    pptxSlide.addText(step.label, {
      x: tx(cx - band * 0.49), y: ty(el.height - 61),
      w: band * 0.98 * X_SCALE, h: 45 * Y_SCALE,
      fontFace: theme.fonts.body, fontSize: 9, align: "center",
      color: cleanHex(theme.colors.secondary), margin: 0, breakLine: false, fit: "shrink",
    });
  });
}

function addChart(pptx: any, pptxSlide: any, el: Extract<SlideElement, { type: "chart" }>, theme: SlideTheme) {
  if (el.properties.chartType === "waterfall") return addWaterfall(pptx, pptxSlide, el, theme);
  const p = el.properties;
  const box = pos(el);
  const chartType =
    p.chartType === "line" ? pptx.ChartType.line :
    p.chartType === "area" ? pptx.ChartType.area :
    p.chartType === "pie" ? pptx.ChartType.pie :
    p.chartType === "doughnut" ? pptx.ChartType.doughnut :
    pptx.ChartType.bar;
  const data = p.series.map((series) => ({
    name: series.name,
    labels: p.categories,
    values: p.categories.map((_, i) => Number(series.values[i] ?? 0)),
  }));
  if (!data.length || !p.categories.length) return;

  const first = resolved(p.accent, theme) ?? cleanHex(theme.colors.accent);
  const chartColors = [
    first,
    cleanHex(theme.colors.primary),
    cleanHex(theme.colors.secondary),
    cleanHex(theme.colors.accentSoft),
  ];

  pptxSlide.addChart(chartType, data, {
    ...box,
    showTitle: !!p.label,
    title: p.label,
    titleFontFace: theme.fonts.heading,
    titleFontSize: 13,
    titleColor: cleanHex(theme.colors.primary),
    showLegend: p.showLegend,
    legendPos: "b",
    legendFontFace: theme.fonts.body,
    legendFontSize: 9,
    legendColor: cleanHex(theme.colors.secondary),
    showValue: p.showValues,
    showCatName: p.chartType === "pie" || p.chartType === "doughnut",
    showPercent: false,
    chartColors,
    showBorder: false,
    showSerName: false,
    catAxisLabelFontFace: theme.fonts.body,
    catAxisLabelFontSize: 9,
    catAxisLabelColor: cleanHex(theme.colors.secondary),
    valAxisLabelFontFace: theme.fonts.body,
    valAxisLabelFontSize: 9,
    valAxisLabelColor: cleanHex(theme.colors.secondary),
    valGridLine: p.showGrid ? { color: cleanHex(theme.colors.line), width: 1 } : { color: cleanHex(theme.colors.background), transparency: 100 },
    showCatAxisTitle: false,
    showValAxisTitle: false,
    showCategoryName: false,
    dataLabelColor: cleanHex(theme.colors.secondary),
    dataLabelFontFace: theme.fonts.body,
    dataLabelFontSize: 9,
    showLeaderLines: true,
    holeSize: p.chartType === "doughnut" ? 55 : undefined,
    barDir: p.chartType === "bar" ? "bar" : "col",
    barGrouping: "clustered",
  });
}

function addTable(pptxSlide: any, el: Extract<SlideElement, { type: "table" }>, theme: SlideTheme) {
  const p = el.properties;
  if (!p.rows.length) return;
  const box = pos(el);
  const headerFill = resolved(p.headerFill, theme) ?? cleanHex(theme.colors.accent);
  const border = { type: "solid", pt: 0.6, color: cleanHex(theme.colors.line) };
  const rows = p.rows.map((row, ri) =>
    row.map((text) => ({
      text: String(text ?? ""),
      options: ri === 0 && p.headerRow
        ? {
            bold: true,
            color: cleanHex(theme.colors.onAccent),
            fill: headerFill,
            align: "left",
            valign: "middle",
          }
        : {
            color: cleanHex(theme.colors.primary),
            fill: p.bandedRows && ri % 2 === 0 ? cleanHex(theme.colors.surface) : cleanHex(theme.colors.background),
            align: "left",
            valign: "middle",
          },
    })),
  );

  pptxSlide.addTable(rows, {
    ...box,
    border,
    fontFace: theme.fonts.body,
    fontSize: 11,
    color: cleanHex(theme.colors.primary),
    margin: 4,
    valign: "middle",
    autoFit: false,
  });
}

function addDiagram(pptx: any, pptxSlide: any, el: Extract<SlideElement, { type: "diagram" }>, theme: SlideTheme) {
  const p = el.properties;
  const box = pos(el);
  const nodes = p.nodes.slice(0, p.diagramType === "matrix" ? 4 : 6);
  if (!nodes.length) return;
  const accent = resolved(p.accent, theme) ?? cleanHex(theme.colors.accent);
  const surface = cleanHex(theme.colors.surface);
  const line = cleanHex(theme.colors.line);
  const primary = cleanHex(theme.colors.primary);
  const secondary = cleanHex(theme.colors.secondary);

  if (p.diagramType === "matrix") {
    const gap = 0.08;
    const cellW = (box.w - gap) / 2;
    const cellH = (box.h - gap) / 2;
    for (let i = 0; i < 4; i++) {
      const node = nodes[i] ?? { title: `Quadrant ${i + 1}`, text: "" };
      const x = box.x + (i % 2) * (cellW + gap);
      const y = box.y + Math.floor(i / 2) * (cellH + gap);
      pptxSlide.addShape(pptx.ShapeType.roundRect, {
        x, y, w: cellW, h: cellH,
        rectRadius: 0.08,
        fill: { color: i === 0 ? cleanHex(theme.colors.accentSoft) : surface },
        line: { color: line, width: 0.8 },
      });
      pptxSlide.addText(node.title, {
        x: x + 0.14, y: y + 0.12, w: cellW - 0.28, h: 0.28,
        fontFace: theme.fonts.heading, fontSize: 15, bold: true, color: primary, margin: 0,
      });
      pptxSlide.addText(node.text, {
        x: x + 0.14, y: y + 0.45, w: cellW - 0.28, h: Math.max(0.25, cellH - 0.58),
        fontFace: theme.fonts.body, fontSize: 10, color: secondary, margin: 0, valign: "top",
      });
    }
    return;
  }

  const gap = 0.12;
  const count = nodes.length;
  const arrowW = count > 1 ? 0.22 : 0;
  const nodeW = (box.w - gap * (count - 1) - arrowW * (count - 1)) / count;
  nodes.forEach((node, i) => {
    const x = box.x + i * (nodeW + gap + arrowW);
    pptxSlide.addShape(pptx.ShapeType.roundRect, {
      x, y: box.y, w: nodeW, h: box.h,
      fill: { color: surface },
      line: { color: line, width: 0.8 },
    });
    pptxSlide.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.12, y: box.y + 0.12, w: 0.3, h: 0.3,
      fill: { color: accent },
      line: { color: accent, transparency: 100 },
    });
    pptxSlide.addText(String(i + 1), {
      x: x + 0.12, y: box.y + 0.13, w: 0.3, h: 0.25,
      fontFace: theme.fonts.body, fontSize: 10, bold: true,
      color: cleanHex(theme.colors.onAccent), align: "center", margin: 0,
    });
    pptxSlide.addText(node.title, {
      x: x + 0.12, y: box.y + 0.55, w: nodeW - 0.24, h: 0.35,
      fontFace: theme.fonts.heading, fontSize: 13, bold: true, color: primary, margin: 0,
    });
    pptxSlide.addText(node.text, {
      x: x + 0.12, y: box.y + 0.95, w: nodeW - 0.24, h: Math.max(0.25, box.h - 1.08),
      fontFace: theme.fonts.body, fontSize: 9.5, color: secondary, margin: 0, valign: "top",
    });
    if (i < count - 1) {
      pptxSlide.addShape(pptx.ShapeType.line, {
        x: x + nodeW + 0.02,
        y: box.y + box.h / 2,
        w: gap + arrowW - 0.04,
        h: 0,
        line: {
          color: p.diagramType === "timeline" ? line : accent,
          width: 1.4,
          endArrowType: "triangle",
        },
      });
    }
  });
}

function speakerNotesText(slide: Presentation["slides"][number]) {
  const notes = slide.speakerNotes;
  if (!notes?.talkTrack.trim()) return "";
  const sections = [
    "WHAT TO SAY\n" + notes.talkTrack.trim(),
    notes.keyPoints.length ? "KEY POINTS\n" + notes.keyPoints.map((point) => "- " + point).join("\n") : "",
    notes.transition?.trim() ? "TRANSITION\n" + notes.transition.trim() : "",
    notes.anticipatedQuestions.length ? "LIKELY QUESTIONS\n" + notes.anticipatedQuestions.map((question) => "- " + question).join("\n") : "",
    notes.coachTips.length ? "COACH\n" + notes.coachTips.map((tip) => "- " + tip).join("\n") : "",
    notes.sourceReminders.length ? "SOURCES\n" + notes.sourceReminders.map((source) => "- " + source).join("\n") : "",
    "ESTIMATED TIME\n" + Math.max(1, Math.round(notes.estimatedSeconds / 60)) + " minute(s)",
  ].filter(Boolean);
  return sections.join("\n\n");
}

function addElement(pptx: any, pptxSlide: any, el: SlideElement, theme: SlideTheme) {
  if (!el.visible) return;
  if (el.type === "text") addText(pptxSlide, el, theme);
  else if (el.type === "shape") addShape(pptx, pptxSlide, el, theme);
  else if (el.type === "image") addImage(pptx, pptxSlide, el, theme);
  else if (el.type === "icon") addIcon(pptxSlide, el, theme);
  else if (el.type === "chart") addChart(pptx, pptxSlide, el, theme);
  else if (el.type === "table") addTable(pptxSlide, el, theme);
  else addDiagram(pptx, pptxSlide, el, theme);
}

/** Build the editable deck in memory so export can be smoke-tested without downloading a file. */
export async function createPresentationPptx(presentation: Presentation) {
  const module = await import("pptxgenjs");
  const PptxGenJS = module.default;
  const pptx: any = new PptxGenJS();

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Presentation Studio";
  pptx.company = "";
  pptx.subject = presentation.description || presentation.objective;
  pptx.title = presentation.title;
  pptx.lang = presentation.language === "Arabic" ? "ar-SA" : "en-US";

  const theme = getTheme(presentation.themeId, presentation.themeOverrides);

  // Let pointer, progress and accessibility updates run between export batches.
  // Heavy decks otherwise block the browser main thread for the entire build.
  for (const [index, slide] of presentation.slides.entries()) {
    if (index > 0 && index % 8 === 0) {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    const out = pptx.addSlide();
    const background = resolved(slide.background ?? "theme:background", theme) ?? "FFFFFF";
    out.background = { color: background };

    [...renderedFinancialElements(slide)]
      .filter((el) => el.visible)
      .sort((a, b) => a.zIndex - b.zIndex)
      .forEach((el) => addElement(pptx, out, el, theme));

    const notes = speakerNotesText(slide);
    if (notes) out.addNotes(notes);
  }

  return pptx;
}

export async function exportPresentationToPptx(presentation: Presentation) {
  const pptx = await createPresentationPptx(presentation);
  await pptx.writeFile({ fileName: safeExportFilename(presentation.title, "pptx") });
}
