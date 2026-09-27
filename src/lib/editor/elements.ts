import { uid } from "@/lib/data/store";
import type {
  ContentRole,
  DraftElement,
  IconProps,
  ImageProps,
  ShapeKind,
  ShapeProps,
  SlideElement,
  TextProps,
} from "./model";

const base = (name: string, x: number, y: number, width: number, height: number, role?: ContentRole) => ({
  name,
  x,
  y,
  width,
  height,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  ...(role ? { role } : {}),
});

export const TEXT_DEFAULTS: TextProps = {
  text: "",
  fontFamily: "theme:body",
  fontSize: 24,
  fontWeight: 400,
  color: "theme:primary",
  lineHeight: 1.3,
  letterSpacing: 0,
  align: "start",
  vAlign: "top",
  italic: false,
  underline: false,
  dir: "auto",
};

export function textEl(
  name: string,
  text: string,
  box: [number, number, number, number],
  props: Partial<TextProps> = {},
  role?: ContentRole,
): DraftElement {
  return { type: "text", ...base(name, ...box, role), properties: { ...TEXT_DEFAULTS, ...props, text } };
}

export function shapeEl(
  name: string,
  shape: ShapeKind,
  box: [number, number, number, number],
  props: Partial<ShapeProps> = {},
  role: ContentRole = "decor",
): DraftElement {
  return {
    type: "shape",
    ...base(name, ...box, role),
    properties: { shape, fill: "theme:accent", stroke: "transparent", strokeWidth: 0, radius: 0, ...props },
  };
}

export function iconEl(
  name: string,
  icon: string,
  box: [number, number, number, number],
  props: Partial<IconProps> = {},
  role: ContentRole = "decor",
): DraftElement {
  return { type: "icon", ...base(name, ...box, role), properties: { name: icon, color: "theme:accent", strokeWidth: 1.75, ...props } };
}

export function imageEl(
  name: string,
  box: [number, number, number, number],
  props: Partial<ImageProps> = {},
  role: ContentRole = "media",
): DraftElement {
  return { type: "image", ...base(name, ...box, role), properties: { src: "", fit: "cover", radius: 0, ...props } };
}

/** Assign ids and z-order to drafts for a concrete slide. */
export function instantiate(drafts: DraftElement[], slideId: string, startZ = 0): SlideElement[] {
  return drafts.map((d, i) => ({ ...d, id: uid(), slideId, zIndex: startZ + i }) as SlideElement);
}

export function cloneElement(el: SlideElement, slideId: string, offset = 0): SlideElement {
  return {
    ...structuredClone(el),
    id: uid(),
    slideId,
    x: el.x + offset,
    y: el.y + offset,
    role: el.role === "decor" ? "decor" : undefined,
  } as SlideElement;
}

export const TEXT_PRESETS: Record<"Heading" | "Subheading" | "Body" | "Caption", Partial<TextProps> & { h: number }> = {
  Heading: { fontFamily: "theme:heading", fontSize: 48, fontWeight: 700, h: 80 },
  Subheading: { fontSize: 28, fontWeight: 500, color: "theme:secondary", h: 50 },
  Body: { fontSize: 20, fontWeight: 400, h: 90 },
  Caption: { fontSize: 14, fontWeight: 400, color: "theme:secondary", h: 30 },
};

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  rect: "Rectangle",
  roundRect: "Rounded rectangle",
  ellipse: "Circle",
  line: "Line",
  arrow: "Arrow",
  triangle: "Triangle",
};
