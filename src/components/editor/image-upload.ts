import { toast } from "sonner";

const MAX_DIM = 1600;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_SOURCE_PIXELS = 60_000_000;

/** Read an image file into a compressed data URL (browser-local storage has tight limits). */
export async function readImage(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) {
    toast.error("Please choose an image file.");
    return null;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    toast.error("Choose an image smaller than 25 MB.");
    return null;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > MAX_SOURCE_PIXELS) {
      toast.error("Image dimensions exceed the supported limit.");
      return null;
    }
    const k = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    const context = c.getContext("2d");
    if (!context) throw new Error("Image processing unavailable");
    context.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.85);
  } catch {
    toast.error("That image could not be read.");
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
