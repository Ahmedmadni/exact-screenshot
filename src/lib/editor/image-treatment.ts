import type { ImageProps } from "./model";

export interface ImageTreatmentOverlay {
  color: string;
  opacity: number;
}

/**
 * Restrained editorial washes applied over the original bitmap.
 * Exporters render the wash as an editable shape: no flattening of the image.
 */
export function imageTreatmentOverlay(treatment: ImageProps["treatment"]): ImageTreatmentOverlay | null {
  switch (treatment) {
    case "cinematic":
      return { color: "#101820", opacity: 0.32 };
    case "soft":
      return { color: "#FFFFFF", opacity: 0.16 };
    case "brand":
      return { color: "theme:accent", opacity: 0.24 };
    case "natural":
    default:
      return null;
  }
}
