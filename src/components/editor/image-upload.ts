import { toast } from "sonner";

const MAX_DIM = 1600;

/** Read an image file into a compressed data URL (browser-local storage has tight limits). */
export async function readImage(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) {
    toast.error("Please choose an image file.");
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
    const k = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.85);
  } catch {
    toast.error("That image could not be read.");
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
