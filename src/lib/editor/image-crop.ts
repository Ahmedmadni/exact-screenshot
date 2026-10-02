import type { ImageProps } from "./model";

/** Normalized editable viewport. No pixels or destructive mutation of source media. */
export type ImageCrop = NonNullable<ImageProps["crop"]>;

const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeImageCrop(crop?: ImageCrop): ImageCrop {
  if (!crop) return { x: 0, y: 0, width: 1, height: 1 };
  const width = clamp(finite(crop.width, 1), 1 / 4, 1);
  const height = clamp(finite(crop.height, 1), 1 / 4, 1);
  return {
    x: clamp(finite(crop.x, 0), 0, 1 - width),
    y: clamp(finite(crop.y, 0), 0, 1 - height),
    width,
    height,
  };
}

/** Zoom and pan share the same non-destructive crop representation in web and PPTX. */
export function imageCropFromControls(zoom: number, horizontal: number, vertical: number): ImageCrop {
  const width = 1 / clamp(finite(zoom, 1), 1, 4);
  const x = (1 - width) * clamp(finite(horizontal, 50), 0, 100) / 100;
  const y = (1 - width) * clamp(finite(vertical, 50), 0, 100) / 100;
  return { x, y, width, height: width };
}

export function imageCropControls(crop?: ImageCrop) {
  const c = normalizeImageCrop(crop);
  return {
    zoom: +(1 / Math.min(c.width, c.height)).toFixed(2),
    horizontal: c.width === 1 ? 50 : +(c.x / (1 - c.width) * 100).toFixed(1),
    vertical: c.height === 1 ? 50 : +(c.y / (1 - c.height) * 100).toFixed(1),
  };
}

/** Internal percentages relative to the slide image frame, not the screen or original asset. */
export function imageCropCss(crop?: ImageCrop) {
  const c = normalizeImageCrop(crop);
  return {
    position: "absolute" as const,
    display: "block" as const,
    width: `${100 / c.width}%`,
    height: `${100 / c.height}%`,
    left: `${-100 * c.x / c.width}%`,
    top: `${-100 * c.y / c.height}%`,
  };
}

/** Native PowerPoint crop sizing preserves the underlying image as a replaceable picture. */
export function imageCropPptx(crop: ImageCrop | undefined, width: number, height: number) {
  const c = normalizeImageCrop(crop);
  return {
    type: "crop" as const,
    w: width / c.width,
    h: height / c.height,
    x: width * c.x / c.width,
    y: height * c.y / c.height,
  };
}
