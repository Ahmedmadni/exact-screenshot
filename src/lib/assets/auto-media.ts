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

function mediaSlotAspect(slide: Slide) {
  const media = slide.elements.find((element) => element.type === "image" && element.role === "media");
  if (!media) return slide.slideIntent === "Cover" ? 1.65 : 1.35;
  return media.width / Math.max(1, media.height);
}

export function recommendedMediaOrientation(slide: Slide): "landscape" | "portrait" | "square" {
  const ratio = mediaSlotAspect(slide);
  if (ratio >= 1.2) return "landscape";
  if (ratio <= 0.82) return "portrait";
  return "square";
}

export function scoreAsset(asset: AssetRecord, slide: Slide, context: string[]) {
  const haystack = assetSearchText(asset);
  const wanted = tokens([slide.title, slide.keyMessage, slide.purpose, ...context].join(" "));
  let score = 0;

  for (const token of wanted) {
    if (haystack.includes(token)) score += token.length >= 7 ? 4 : 2;
  }

  if (asset.favorite) score += 4;
  if (asset.origin === "licensed-import") score += 1;

  const slotRatio = mediaSlotAspect(slide);
  const assetRatio = aspect(asset);
  const ratioDistance = Math.abs(Math.log(Math.max(0.1, assetRatio) / Math.max(0.1, slotRatio)));
  score += Math.max(-4, Math.round(7 - ratioDistance * 10));

  if (slide.slideIntent === "Cover" && assetRatio >= 1.25) score += 4;
  if (["Case Study", "Opportunity", "Problem", "Solution"].includes(slide.slideIntent) && asset.assetClass === "photo") score += 2;
  if (slide.slideIntent === "Team" && asset.category === "people") score += 5;
  if (slide.slideIntent === "Financial" && asset.category === "finance") score += 5;
  if (["Solution", "Process"].includes(slide.slideIntent) && asset.category === "technology") score += 2;
  return score;
}


const INTENT_SEARCH_TERMS: Partial<Record<Slide["slideIntent"], string[]>> = {
  Cover: ["executive", "hero", "premium"],
  "Executive Summary": ["business", "leadership"],
  Problem: ["challenge", "business problem"],
  Solution: ["solution", "innovation"],
  Opportunity: ["growth", "opportunity"],
  Financial: ["finance", "investment", "market"],
  Dashboard: ["business", "analytics"],
  "Data Story": ["data", "analytics"],
  "Case Study": ["business", "team", "project"],
  Team: ["people", "leadership", "team"],
  Process: ["workflow", "operations"],
  Roadmap: ["strategy", "transformation"],
  Portfolio: ["business", "portfolio"],
  Closing: ["vision", "future"],
};

const STOPWORDS = new Set([
  "this","that","with","from","into","over","under","your","their","about","will","have","has","the","and","for","are",
  "على","من","في","إلى","الى","عن","مع","هذا","هذه","التي","الذي","أو","او","هو","هي","تم","يتم","خلال",
]);

export function visualSearchQuery(slide: Slide, context: string[] = []) {
  const raw = tokens([slide.title, slide.keyMessage, ...context].join(" "))
    .filter((token) => !STOPWORDS.has(token))
    .slice(0, 6);
  const intentTerms = INTENT_SEARCH_TERMS[slide.slideIntent] ?? [];
  return [...new Set([...raw, ...intentTerms])].slice(0, 8).join(" ");
}

export interface VaultMediaSuggestion {
  asset: AssetRecord;
  score: number;
  reasons: string[];
}

function suggestionReasons(asset: AssetRecord, slide: Slide, context: string[]) {
  const reasons: string[] = [];
  const wanted = tokens([slide.title, slide.keyMessage, ...context].join(" "));
  const haystack = assetSearchText(asset);
  const matched = wanted.filter((token) => haystack.includes(token)).slice(0, 3);
  if (matched.length) reasons.push("Matches " + matched.join(", "));
  if (asset.favorite) reasons.push("Favorite");
  const slotRatio = mediaSlotAspect(slide);
  const assetRatio = aspect(asset);
  const ratioDistance = Math.abs(Math.log(Math.max(0.1, assetRatio) / Math.max(0.1, slotRatio)));
  if (ratioDistance < 0.18) reasons.push("Strong crop fit");
  else if (ratioDistance < 0.38) reasons.push("Good crop fit");
  if (slide.slideIntent === "Cover" && assetRatio >= 1.25) reasons.push("Landscape cover fit");
  if (slide.slideIntent === "Team" && asset.category === "people") reasons.push("People-focused");
  if (slide.slideIntent === "Financial" && asset.category === "finance") reasons.push("Finance category");
  if (["Solution", "Process"].includes(slide.slideIntent) && asset.category === "technology") reasons.push("Technology fit");
  if (asset.origin === "licensed-import") reasons.push("Licensed vault asset");
  return reasons.slice(0, 3);
}

export function suggestVaultMedia(
  slide: Slide,
  assets: AssetRecord[],
  context: string[] = [],
  limit = 8,
): VaultMediaSuggestion[] {
  return assets
    .filter(
      (asset) =>
        asset.presentationId === null &&
        asset.kind === "image" &&
        asset.extractionStatus === "ready" &&
        Boolean(asset.imageDataUrl),
    )
    .map((asset) => ({
      asset,
      score: scoreAsset(asset, slide, context),
      reasons: suggestionReasons(asset, slide, context),
    }))
    .sort((a, b) => b.score - a.score || Number(Boolean(b.asset.favorite)) - Number(Boolean(a.asset.favorite)))
    .slice(0, limit);
}

export function applyVaultAssetToSlide(slide: Slide, asset: AssetRecord): Slide {
  if (!asset.imageDataUrl) return slide;
  const media = slide.elements.find((element) => element.type === "image" && element.role === "media");
  if (!media || media.type !== "image") return slide;
  return {
    ...slide,
    sourceAssetIds: [...new Set([...(slide.sourceAssetIds ?? []), asset.id])],
    elements: slide.elements.map((element) =>
      element.id === media.id && element.type === "image"
        ? { ...element, properties: { ...element.properties, src: "", assetId: asset.id } }
        : element,
    ),
    updatedAt: new Date().toISOString(),
  };
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
          ? { ...element, properties: { ...element.properties, src: "", assetId: selected.id } }
          : element,
      ),
      updatedAt: new Date().toISOString(),
    };
  });
}
