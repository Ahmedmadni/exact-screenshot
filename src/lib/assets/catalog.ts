import type { AssetCategory, AssetClass, AssetRecord } from "@/lib/types";

export const ASSET_CATEGORIES: Array<{ id: AssetCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "business", label: "Business" },
  { id: "finance", label: "Finance" },
  { id: "technology", label: "Technology" },
  { id: "government", label: "Government" },
  { id: "saudi", label: "Saudi" },
  { id: "people", label: "People" },
  { id: "places", label: "Places" },
  { id: "industry", label: "Industry" },
  { id: "data", label: "Data" },
  { id: "abstract", label: "Abstract" },
  { id: "brand", label: "Brand" },
  { id: "general", label: "General" },
];

const CATEGORY_TERMS: Array<{ category: AssetCategory; terms: string[] }> = [
  { category: "finance", terms: ["finance", "financial", "money", "bank", "banking", "investment", "investor", "market", "revenue", "profit", "cash", "budget", "cfo", "اقتصاد", "مالي", "استثمار", "سوق", "بنك"] },
  { category: "technology", terms: ["technology", "tech", "digital", "software", "cloud", "ai", "data", "cyber", "platform", "app", "تقنية", "رقمي", "ذكاء", "بيانات"] },
  { category: "government", terms: ["government", "ministry", "authority", "public", "municipal", "governmental", "حكومي", "وزارة", "هيئة", "بلدية"] },
  { category: "saudi", terms: ["saudi", "riyadh", "jeddah", "ksa", "kingdom", "vision 2030", "السعودية", "الرياض", "جدة", "المملكة", "رؤية 2030"] },
  { category: "people", terms: ["people", "team", "employee", "leader", "executive", "customer", "person", "portrait", "فريق", "موظف", "قيادة", "عميل"] },
  { category: "places", terms: ["city", "building", "office", "landscape", "site", "location", "architecture", "مدينة", "مبنى", "موقع", "عمارة"] },
  { category: "industry", terms: ["factory", "industrial", "manufacturing", "construction", "energy", "logistics", "mine", "quarry", "مصنع", "صناعة", "إنشاء", "طاقة", "لوجستيات", "محجر"] },
  { category: "health", terms: ["health", "medical", "hospital", "care", "wellness", "صحة", "طبي", "مستشفى"] },
  { category: "education", terms: ["education", "school", "university", "training", "learning", "تعليم", "جامعة", "تدريب"] },
  { category: "abstract", terms: ["abstract", "gradient", "texture", "pattern", "background", "geometric", "مجرد", "خلفية", "نمط"] },
  { category: "data", terms: ["chart", "graph", "dashboard", "analytics", "kpi", "statistics", "بياني", "مؤشر", "تحليل"] },
  { category: "brand", terms: ["logo", "brand", "identity", "mark", "شعار", "هوية"] },
];

function cleanToken(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

export function inferAssetClass(asset: Pick<AssetRecord, "kind" | "name" | "assetClass">): AssetClass {
  if (asset.assetClass) return asset.assetClass;
  if (asset.kind !== "image") return "source";
  const name = cleanToken(asset.name);
  if (/\blogo\b|شعار/.test(name)) return "logo";
  if (/\bicon\b|أيقون/.test(name)) return "icon";
  if (/\billustration\b|\bvector\b|رسم|illustr/.test(name)) return "illustration";
  if (/\bbackground\b|\bbg\b|خلفية/.test(name)) return "background";
  return "photo";
}

export function inferAssetCategory(name: string, tags: string[] = []): AssetCategory {
  const haystack = cleanToken([name, ...tags].join(" "));
  let best: { category: AssetCategory; score: number } | null = null;
  for (const entry of CATEGORY_TERMS) {
    const score = entry.terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    if (!best || score > best.score) best = { category: entry.category, score };
  }
  return best && best.score > 0 ? best.category : "general";
}

export function inferAssetTags(name: string, extra: string[] = []) {
  const normalized = cleanToken(name.replace(/\.[a-z0-9]+$/i, ""));
  const tokens = normalized
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
  return [...new Set([...extra.map(cleanToken), ...tokens])].slice(0, 16);
}

export function enrichAssetMetadata(
  asset: Pick<AssetRecord, "name" | "kind"> & Partial<AssetRecord>,
): Pick<AssetRecord, "origin" | "assetClass" | "category" | "tags"> {
  const tags = asset.tags?.length ? asset.tags : inferAssetTags(asset.name);
  const assetClass = inferAssetClass(asset as Pick<AssetRecord, "kind" | "name" | "assetClass">);
  return {
    origin: asset.origin ?? (asset.kind === "image" ? "upload" : "source-document"),
    assetClass,
    category: asset.category ?? inferAssetCategory(asset.name, tags),
    tags,
  };
}

export function assetSearchText(asset: AssetRecord) {
  return [
    asset.name,
    asset.description,
    asset.category,
    asset.assetClass,
    asset.sourceProvider,
    asset.attribution,
    ...(asset.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterAssetCatalog(
  assets: AssetRecord[],
  options: {
    query?: string;
    category?: AssetCategory | "all";
    assetClass?: AssetClass | "all";
    favoritesOnly?: boolean;
    visualsOnly?: boolean;
  },
) {
  const query = options.query?.trim().toLowerCase() ?? "";
  return assets
    .filter((asset) => !options.visualsOnly || asset.kind === "image")
    .filter((asset) => !options.favoritesOnly || asset.favorite)
    .filter((asset) => options.category === "all" || !options.category || asset.category === options.category)
    .filter((asset) => options.assetClass === "all" || !options.assetClass || inferAssetClass(asset) === options.assetClass)
    .filter((asset) => !query || assetSearchText(asset).includes(query))
    .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || b.createdAt.localeCompare(a.createdAt));
}

export function assetProvenanceLabel(asset: AssetRecord) {
  if (asset.sourceProvider) return asset.sourceProvider;
  if (asset.origin === "licensed-import") return "Licensed source";
  if (asset.origin === "generated") return "Generated";
  return asset.kind === "image" ? "Asset Vault" : "Uploaded source";
}
