import { supabase } from "@/lib/cloud/supabase";
import { assetRepository } from "@/lib/data/store";
import { enrichAssetMetadata, inferAssetTags } from "@/lib/assets/catalog";
import type { AssetRecord } from "@/lib/types";

export type LicensedAssetProvider = "pexels" | "pixabay";

export function licensedProviderLabel(provider: LicensedAssetProvider) {
  return provider === "pixabay" ? "Pixabay" : "Pexels";
}

export interface LicensedAssetSearchResult {
  id: string;
  provider: LicensedAssetProvider;
  title: string;
  creator: string;
  width: number;
  height: number;
  previewUrl: string;
  sourceUrl: string;
}

interface SearchResponse {
  provider: "all" | LicensedAssetProvider;
  providers?: LicensedAssetProvider[];
  page: number;
  perPage: number;
  totalResults: number;
  results: LicensedAssetSearchResult[];
}

interface ImportResponse {
  provider: LicensedAssetProvider;
  id: string;
  title: string;
  creator: string;
  width: number;
  height: number;
  sourceUrl: string;
  mimeType: string;
  dataUrl: string;
  licenseLabel?: string;
}

function requireCloud() {
  if (!supabase) throw new Error("Cloud connection is required for licensed source search.");
  return supabase;
}

export async function searchLicensedAssets(query: string, options?: { orientation?: "landscape" | "portrait" | "square"; page?: number }) {
  const client = requireCloud();
  const { data, error } = await client.functions.invoke("licensed-assets", {
    body: {
      operation: "search",
      provider: "all",
      query,
      orientation: options?.orientation,
      page: options?.page ?? 1,
      perPage: 24,
    },
  });
  if (error) throw new Error(error.message || "Licensed media search failed.");
  if (data?.error) throw new Error(String(data.error));
  return data?.result as SearchResponse;
}

export async function importLicensedAsset(result: LicensedAssetSearchResult): Promise<AssetRecord> {
  const client = requireCloud();
  const { data, error } = await client.functions.invoke("licensed-assets", {
    body: { operation: "import", provider: result.provider, id: result.id },
  });
  if (error) throw new Error(error.message || "Licensed media import failed.");
  if (data?.error) throw new Error(String(data.error));

  const imported = data?.result as ImportResponse;
  const tags = inferAssetTags(imported.title, ["licensed", imported.provider, imported.creator]);
  const metadata = enrichAssetMetadata({
    name: imported.title,
    kind: "image",
    origin: "licensed-import",
    assetClass: "photo",
    tags,
  });

  return assetRepository.add({
    presentationId: null,
    name: imported.title,
    kind: "image",
    size: Math.round((imported.dataUrl.length * 3) / 4),
    extractionStatus: "ready",
    extractionSummary: `Licensed visual · ${imported.width}×${imported.height}px · stored in Asset Vault`,
    imageDataUrl: imported.dataUrl,
    description: imported.title,
    sourceProvider: licensedProviderLabel(imported.provider),
    sourceItemId: imported.id,
    sourceUrl: imported.sourceUrl,
    licenseLabel: imported.licenseLabel,
    attribution: imported.creator ? `Photo by ${imported.creator}` : undefined,
    mimeType: imported.mimeType,
    width: imported.width,
    height: imported.height,
    ...metadata,
  });
}
