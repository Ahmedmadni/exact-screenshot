import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Presentation } from "@/lib/types";
import type { SlideElement } from "@/lib/editor/model";
import { SLIDE_H, SLIDE_W } from "@/lib/editor/model";
import { getTheme, resolveColor, type SlideTheme } from "@/lib/editor/themes";
import { getIcon } from "@/lib/editor/icons";
import { safeExportFilename } from "./validate";

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
  return rtl ? (family === "IBM Plex Sans Arabic" ? family : "Arial") : family;
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

function addImage(pptxSlide: any, el: Extract<SlideElement, { type: "image" }>) {
  if (!el.properties.src) return;
  const box = pos(el);
  pptxSlide.addImage({
    data: normalizeImageData(el.properties.src),
    ...box,
    sizing: { type: el.properties.fit, w: box.w, h: box.h },
    rotate: Math.round(el.rotation),
    transparency: transparency(el.opacity),
    altText: el.name,
  });
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

function addPlaceholder(pptx: any, pptxSlide: any, el: Extract<SlideElement, { type: "chart" | "table" | "diagram" }>, theme: SlideTheme) {
  const box = pos(el);
  pptxSlide.addShape(pptx.ShapeType.roundRect, {
    ...box,
    fill: { color: cleanHex(theme.colors.surface), transparency: 5 },
    line: { color: cleanHex(theme.colors.line), width: 1, dash: "dash" },
    rotate: Math.round(el.rotation),
  });
  pptxSlide.addText(el.properties.label, {
    ...box,
    fontFace: theme.fonts.body,
    fontSize: 16,
    color: cleanHex(theme.colors.secondary),
    align: "center",
    valign: "middle",
    margin: 0,
    rotate: Math.round(el.rotation),
  });
}

function addElement(pptx: any, pptxSlide: any, el: SlideElement, theme: SlideTheme) {
  if (!el.visible) return;
  if (el.type === "text") addText(pptxSlide, el, theme);
  else if (el.type === "shape") addShape(pptx, pptxSlide, el, theme);
  else if (el.type === "image") addImage(pptxSlide, el);
  else if (el.type === "icon") addIcon(pptxSlide, el, theme);
  else addPlaceholder(pptx, pptxSlide, el, theme);
}

export async function exportPresentationToPptx(presentation: Presentation) {
  const module = await import("pptxgenjs");
  const PptxGenJS = module.default;
  const pptx: any = new PptxGenJS();

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Presentation Studio";
  pptx.company = "";
  pptx.subject = presentation.description || presentation.objective;
  pptx.title = presentation.title;
  pptx.lang = presentation.language === "Arabic" ? "ar-SA" : "en-US";

  const theme = getTheme(presentation.themeId);

  presentation.slides.forEach((slide) => {
    const out = pptx.addSlide();
    const background = resolved(slide.background ?? "theme:background", theme) ?? "FFFFFF";
    out.background = { color: background };

    [...slide.elements]
      .filter((el) => el.visible)
      .sort((a, b) => a.zIndex - b.zIndex)
      .forEach((el) => addElement(pptx, out, el, theme));
  });

  await pptx.writeFile({ fileName: safeExportFilename(presentation.title, "pptx") });
}
