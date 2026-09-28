/**
 * Editor element model. Storage- and renderer-agnostic: coordinates live in a
 * fixed logical slide space (1600x900) that never depends on editor zoom, so
 * the same data can drive the web canvas, preview, and future PPTX/PDF export.
 *
 * Style values may be theme-bound ("theme:accent", "theme:heading") or
 * explicit overrides ("#1a1a1a", "Manrope"). Theme-bound values re-resolve
 * whenever the presentation theme changes.
 */

export const SLIDE_W = 1600;
export const SLIDE_H = 900;

export type SlideElementType = "text" | "image" | "shape" | "icon" | "chart" | "table" | "diagram";

/** Semantic slot an element fills, used to preserve content across layouts. */
export type ContentRole =
  | "title"
  | "subtitle"
  | "body"
  | "itemTitle"
  | "item"
  | "kpiValue"
  | "kpiLabel"
  | "media"
  | "decor";

interface BaseElement {
  id: string;
  slideId: string;
  type: SlideElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  role?: ContentRole | undefined;
}

export type TextAlign = "start" | "center" | "end" | "justify";

export interface TextProps {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  lineHeight: number;
  letterSpacing: number;
  align: TextAlign;
  vAlign: "top" | "middle" | "bottom";
  italic: boolean;
  underline: boolean;
  dir: "auto" | "ltr" | "rtl";
  background?: string;
  uppercase?: boolean;
}

export interface ImageProps {
  src: string;
  fit: "cover" | "contain";
  radius: number;
  /** Reserved for crop tooling: fractional source window. */
  crop?: { x: number; y: number; width: number; height: number };
}

export type ShapeKind = "rect" | "roundRect" | "ellipse" | "line" | "arrow" | "triangle";

export interface ShapeProps {
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
}

export interface IconProps {
  name: string;
  color: string;
  strokeWidth: number;
}

export type ChartKind = "bar" | "column" | "line" | "area" | "pie" | "doughnut";

export interface ChartSeries {
  name: string;
  values: number[];
}

export interface ChartProps {
  label: string;
  chartType: ChartKind;
  categories: string[];
  series: ChartSeries[];
  showLegend: boolean;
  showValues: boolean;
  showGrid: boolean;
  accent: string;
}

export interface TableProps {
  label: string;
  rows: string[][];
  headerRow: boolean;
  bandedRows: boolean;
  headerFill: string;
}

export type DiagramKind = "process" | "timeline" | "matrix";

export interface DiagramNode {
  title: string;
  text: string;
}

export interface DiagramProps {
  label: string;
  diagramType: DiagramKind;
  nodes: DiagramNode[];
  accent: string;
}

export interface TextElement extends BaseElement { type: "text"; properties: TextProps }
export interface ImageElement extends BaseElement { type: "image"; properties: ImageProps }
export interface ShapeElement extends BaseElement { type: "shape"; properties: ShapeProps }
export interface IconElement extends BaseElement { type: "icon"; properties: IconProps }
export interface ChartElement extends BaseElement { type: "chart"; properties: ChartProps }
export interface TableElement extends BaseElement { type: "table"; properties: TableProps }
export interface DiagramElement extends BaseElement { type: "diagram"; properties: DiagramProps }

export type SlideElement = TextElement | ImageElement | ShapeElement | IconElement | ChartElement | TableElement | DiagramElement;

export type DraftElement = SlideElement extends infer E
  ? E extends SlideElement
    ? Omit<E, "id" | "slideId" | "zIndex">
    : never
  : never;
