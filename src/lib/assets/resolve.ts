import { assetRepository } from "@/lib/data/store";
import type { ImageProps } from "@/lib/editor/model";

export function resolveImageSource(properties: Pick<ImageProps, "src" | "assetId">) {
  if (properties.assetId) {
    const asset = assetRepository.get(properties.assetId);
    if (asset?.imageDataUrl) return asset.imageDataUrl;
  }
  return properties.src;
}
