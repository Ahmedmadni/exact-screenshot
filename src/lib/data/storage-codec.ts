/**
 * Local-only, backwards-compatible JSON codec. Repeated inline images occur when a
 * deck is duplicated, versioned, or saved as a template. Pool only duplicate data
 * URLs: distinct pictures and the shape of the editor model remain unchanged.
 */
const MARKER = "__meridian_media_pool_v1__";
const TOKEN = "__meridian_image_ref__:";
const MEDIA_KEY = new Set(["src", "imageDataUrl"]);
const isInlineImage = (key: string, value: unknown): value is string =>
  MEDIA_KEY.has(key) && typeof value === "string" && value.length >= 512 &&
  /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i.test(value);

export function encodeBrowserDatabase(value: unknown): string {
  const counts = new Map<string, number>();
  const plain = JSON.stringify(value, (key, item: unknown) => {
    if (isInlineImage(key, item)) counts.set(item, (counts.get(item) ?? 0) + 1);
    return item;
  });
  const repeated = [...counts].filter(([, count]) => count > 1).map(([data]) => data);
  if (!repeated.length) return plain;

  const lookup = new Map(repeated.map((image, index) => [image, TOKEN + index]));
  const compact = JSON.stringify(value, (key, item: unknown) =>
    isInlineImage(key, item) ? lookup.get(item) ?? item : item);
  const packed = `{"${MARKER}":true,"media":${JSON.stringify(repeated)},"data":${compact}}`;
  // Versioned container has overhead: use the original format if pooling saves nothing.
  return packed.length < plain.length ? packed : plain;
}

/** Decode old unpooled localStorage data and the new pooled representation. */
export function decodeBrowserDatabase(raw: string): unknown {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return parsed;
  const object = parsed as Record<string, unknown>;
  if (object[MARKER] !== true) return parsed;
  if (!Array.isArray(object.media) || !object.data || typeof object.data !== "object") {
    throw new Error("Invalid pooled browser database");
  }
  const media = object.media;
  const restore = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    for (const [key, item] of Object.entries(node)) {
      if (MEDIA_KEY.has(key) && typeof item === "string" && item.startsWith(TOKEN)) {
        const suffix = item.slice(TOKEN.length);
        const index = Number(suffix);
        if (!/^\d+$/.test(suffix) || !Number.isSafeInteger(index) || typeof media[index] !== "string") {
          throw new Error("Invalid pooled image reference");
        }
        (node as Record<string, unknown>)[key] = media[index];
      } else {
        restore(item);
      }
    }
  };
  restore(object.data);
  return object.data;
}
