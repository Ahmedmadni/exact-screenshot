import { ImagePlus, Loader2, Search, Sparkles, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  applyVaultAssetToSlide,
  externalVisualSearchQuery,
  recommendedMediaOrientation,
  suggestVaultMedia,
} from "@/lib/assets/auto-media";
import {
  importLicensedAsset,
  licensedProviderLabel,
  searchLicensedAssets,
  type LicensedAssetSearchResult,
} from "@/lib/assets/licensed-provider";
import { assetProvenanceLabel } from "@/lib/assets/catalog";
import { useDatabase } from "@/lib/data/store";
import type { AssetRecord, Slide } from "@/lib/types";

export function SmartMediaPanel({
  children,
  slide,
  context,
  onUse,
  onAutoFillDeck,
}: {
  children: ReactNode;
  slide?: Slide;
  context: string[];
  onUse: (slide: Slide) => void;
  onAutoFillDeck: () => void;
}) {
  const { assets } = useDatabase();
  const [open, setOpen] = useState(false);
  const automaticQuery = slide ? externalVisualSearchQuery(slide, context) : "";
  const [query, setQuery] = useState(automaticQuery);
  const [licensed, setLicensed] = useState<LicensedAssetSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !slide) return;
    setQuery(externalVisualSearchQuery(slide, context));
    setLicensed([]);
  }, [open, slide?.id]);

  const suggestions = useMemo(
    () => (slide ? suggestVaultMedia(slide, assets, context, 8) : []),
    [slide, assets, context.join("|")],
  );

  const hasMediaSlot = Boolean(slide?.elements.some((element) => element.type === "image" && element.role === "media"));

  const useAsset = (asset: AssetRecord) => {
    if (!slide) return;
    const next = applyVaultAssetToSlide(slide, asset);
    if (next === slide) {
      toast.info("This slide has no semantic image slot. Switch to an image-led Magic Design first.");
      return;
    }
    onUse(next);
    toast.success("Smart Media applied.");
  };

  const searchLicensed = async () => {
    const q = query.trim();
    if (q.length < 2 || searching) return;
    setSearching(true);
    try {
      const result = await searchLicensedAssets(q, { orientation: slide ? recommendedMediaOrientation(slide) : "landscape" });
      setLicensed(result.results);
      if (!result.results.length) toast.info("No licensed visuals matched this query.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Licensed media search failed.");
    } finally {
      setSearching(false);
    }
  };

  const importAndUse = async (result: LicensedAssetSearchResult) => {
    if (!slide || importingId) return;
    setImportingId(result.id);
    try {
      const asset = await importLicensedAsset(result);
      const next = applyVaultAssetToSlide(slide, asset);
      if (next === slide) {
        toast.info("Imported to the Asset Vault. Choose an image-led Magic Design to place it automatically.");
        return;
      }
      onUse(next);
      toast.success("Imported, saved to Asset Vault and applied to the slide.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not import the selected media.");
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="flex w-[820px] max-w-[97vw] flex-col gap-0 p-0 sm:max-w-[820px]">
        <SheetHeader className="border-b border-border p-5 pe-12">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            <SheetTitle>Smart Media</SheetTitle>
          </div>
          <SheetDescription>
            Match the active slide with your internal Asset Vault first, then search configured licensed sources only when needed.
          </SheetDescription>
        </SheetHeader>

        {!slide ? (
          <div className="grid flex-1 place-items-center p-8 text-sm text-muted-foreground">Select a slide first.</div>
        ) : (
          <>
            <div className="space-y-3 border-b border-border p-4">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-accent">{slide.slideIntent}</div>
                <div className="mt-1 text-sm font-medium text-foreground">{slide.title}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{slide.keyMessage}</div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") void searchLicensed(); }}
                    placeholder="Visual search query"
                    className="ps-9"
                  />
                </div>
                <Button variant="outline" onClick={() => setQuery(automaticQuery)}>
                  <WandSparkles className="size-4" /> Reset smart query
                </Button>
                <Button onClick={() => void searchLicensed()} disabled={searching || query.trim().length < 2}>
                  {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Search licensed
                </Button>
              </div>

              {!hasMediaSlot && (
                <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-muted-foreground">
                  This layout has no semantic image slot. Smart Media can still search and import assets, but use an image-led Magic Design to place one automatically.
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <section className="border-b border-border p-4">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <div className="eyebrow">Best from your Vault</div>
                    <div className="mt-1 text-xs text-muted-foreground">Ranked by slide meaning, template context, category, orientation and favorites.</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={onAutoFillDeck}>
                    <WandSparkles className="size-3.5" /> Auto-fill remaining media
                  </Button>
                </div>

                {suggestions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                    No reusable visuals in the Asset Vault yet. Search licensed sources below to start building the library.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {suggestions.map(({ asset, score, reasons }) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => useAsset(asset)}
                        className="group overflow-hidden rounded-lg border border-border bg-card text-start transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-muted">
                          <img src={asset.imageDataUrl} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" />
                        </div>
                        <div className="p-2.5">
                          <div className="truncate text-[10px] font-semibold text-foreground">{asset.name}</div>
                          <div className="mt-1 flex items-center justify-between gap-2 text-[8px] text-muted-foreground">
                            <span className="truncate">{assetProvenanceLabel(asset)}</span>
                            <span className="shrink-0">Fit {Math.max(0, score)}</span>
                          </div>
                          {reasons.length > 0 && (
                            <div className="mt-2 line-clamp-2 text-[8px] leading-relaxed text-accent">{reasons.join(" · ")}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="p-4">
                <div className="mb-3">
                  <div className="eyebrow">Licensed search results</div>
                  <div className="mt-1 text-xs text-muted-foreground">Results import into the Vault before being placed, so the same media remains reusable later.</div>
                </div>

                {licensed.length === 0 ? (
                  <div className="grid min-h-44 place-items-center rounded-lg border border-dashed border-border text-center">
                    <div>
                      <ImagePlus className="mx-auto size-6 text-muted-foreground" />
                      <div className="mt-2 text-xs text-foreground">Search when the Vault does not have the right visual</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">The query above is already derived from this slide.</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {licensed.map((result) => (
                      <article key={result.provider + "-" + result.id} className="overflow-hidden rounded-lg border border-border bg-card">
                        <div className="aspect-[4/3] overflow-hidden bg-muted">
                          <img src={result.previewUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="p-2.5">
                          <div className="line-clamp-2 text-[10px] font-semibold text-foreground">{result.title}</div>
                          <div className="mt-1 truncate text-[8px] text-muted-foreground">{result.creator ? `${licensedProviderLabel(result.provider)} · ${result.creator}` : licensedProviderLabel(result.provider)}</div>
                          <Button
                            size="sm"
                            className="mt-2 h-7 w-full text-[9px]"
                            disabled={Boolean(importingId)}
                            onClick={() => void importAndUse(result)}
                          >
                            {importingId === result.id ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />} Import & use
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
