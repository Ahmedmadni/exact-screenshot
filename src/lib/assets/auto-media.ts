import type { AssetRecord, Slide } from "@/lib/types";
import { assetSearchText } from "@/lib/assets/catalog";

function tokens(value: string) {
  return [...new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3),
  )];
}

function aspect(asset: AssetRecord) {
  if (!asset.width || !asset.height) return 1.4;
  return asset.width / Math.max(1, asset.height);
}

function scoreAsset(asset: AssetRecord, slide: Slide, context: string[]) {
  const haystack = assetSearchText(asset);
  const wanted = tokens([slide.title, slide.keyMessage, slide.purpose, ...context].join(" "));
  let score = 0;

  for (const token of wanted) {
    if (haystack.includes(token)) score += token.length >= 7 ? 4 : 2;
  }

  if (asset.favorite) score += 4;
  if (asset.origin === "licensed-import") score += 1;
  if (slide.slideIntent === "Cover" && aspect(asset) >= 1.25) score += 4;
  if (["Case Study", "Opportunity", "Problem", "Solution"].includes(slide.slideIntent) && asset.assetClass === "photo") score += 2;
  if (slide.slideIntent === "Team" && asset.category === "people") score += 5;
  if (slide.slideIntent === "Financial" && asset.category === "finance") score += 5;
  if (["Solution", "Process"].includes(slide.slideIntent) && asset.category === "technology") score += 2;
  return score;
}

/**
 * Fill blank semantic image slots from the user's reusable Asset Vault.
 * Selected source-file visuals run before this function and always win.
 */
export function applyVaultMedia(
  slides: Slide[],
  assets: AssetRecord[],
  context: string[] = [],
  maxImages = 6,
): Slide[] {
  const library = assets.filter(
    (asset) =>
      asset.presentationId === null &&
      asset.kind === "image" &&
      asset.extractionStatus === "ready" &&
      Boolean(asset.imageDataUrl),
  );
  if (!library.length) return slides;

  const used = new Set<string>();
  let inserted = 0;

  return slides.map((slide) => {
    if (inserted >= maxImages) return slide;
    const media = slide.elements.find((element) => element.type === "image" && element.role === "media" && !element.properties.src);
    if (!media || media.type !== "image") return slide;

    const ranked = library
      .filter((asset) => !used.has(asset.id))
      .map((asset) => ({ asset, score: scoreAsset(asset, slide, context) }))
      .sort((a, b) => b.score - a.score || Number(Boolean(b.asset.favorite)) - Number(Boolean(a.asset.favorite)));

    const selected = ranked[0]?.asset;
    if (!selected?.imageDataUrl) return slide;

    used.add(selected.id);
    inserted += 1;
    return {
      ...slide,
      sourceAssetIds: [...new Set([...(slide.sourceAssetIds ?? []), selected.id])],
      elements: slide.elements.map((element) =>
        element.id === media.id && element.type === "image"
          ? { ...element, properties: { ...element.properties, src: selected.imageDataUrl! } }
          : element,
      ),
      updatedAt: new Date().toISOString(),
    };
  });
}
