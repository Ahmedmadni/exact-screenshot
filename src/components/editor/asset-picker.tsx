import { ExternalLink, FolderOpen, Loader2, Search, Sparkles, Upload } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { ASSET_CATEGORIES, assetProvenanceLabel, filterAssetCatalog, inferAssetClass } from "@/lib/assets/catalog";
import {
  importLicensedAsset,
  searchLicensedAssets,
  type LicensedAssetSearchResult,
} from "@/lib/assets/licensed-provider";
import { useDatabase } from "@/lib/data/store";
import type { AssetCategory, AssetClass, AssetRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

const CLASS_FILTERS: Array<{ id: AssetClass | "all"; label: string }> = [
  { id: "all", label: "All visuals" },
  { id: "photo", label: "Photos" },
  { id: "illustration", label: "Illustrations" },
  { id: "background", label: "Backgrounds" },
  { id: "logo", label: "Logos" },
  { id: "icon", label: "Icons" },
];

export function AssetPicker({
  children,
  onPick,
  title = "Asset Vault",
}: {
  children: ReactNode;
  onPick: (asset: AssetRecord) => void;
  title?: string;
}) {
  const { assets } = useDatabase();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AssetCategory | "all">("all");
  const [assetClass, setAssetClass] = useState<AssetClass | "all">("all");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"vault" | "licensed">("vault");
  const [licensedQuery, setLicensedQuery] = useState("");
  const [licensedResults, setLicensedResults] = useState<LicensedAssetSearchResult[]>([]);
  const [licensedBusy, setLicensedBusy] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const visuals = useMemo(
    () =>
      filterAssetCatalog(assets, {
        query,
        category,
        assetClass,
        visualsOnly: true,
      }).filter((asset) => asset.extractionStatus === "ready" && Boolean(asset.imageDataUrl)),
    [assets, query, category, assetClass],
  );

  const pick = (asset: AssetRecord) => {
    onPick(asset);
    setOpen(false);
  };

  const runLicensedSearch = async () => {
    const q = licensedQuery.trim();
    if (q.length < 2 || licensedBusy) return;
    setLicensedBusy(true);
    try {
      const result = await searchLicensedAssets(q, { orientation: "landscape" });
      setLicensedResults(result.results);
      if (!result.results.length) toast.info("No licensed media matched that search.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Licensed media search failed.");
    } finally {
      setLicensedBusy(false);
    }
  };

  const importAndPick = async (result: LicensedAssetSearchResult) => {
    if (importingId) return;
    setImportingId(result.id);
    try {
      const asset = await importLicensedAsset(result);
      onPick(asset);
      setOpen(false);
      toast.success("Imported to Asset Vault and added to the slide.");
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
      <SheetContent side="right" className="flex w-[760px] max-w-[96vw] flex-col gap-0 p-0 sm:max-w-[760px]">
        <SheetHeader className="border-b border-border p-5 pe-12">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Reuse internal assets or search configured licensed sources without leaving the presentation studio.
          </SheetDescription>
        </SheetHeader>

        <div className="border-b border-border p-4">
          <div className="inline-flex rounded-lg border border-border bg-muted/20 p-1">
            <button
              type="button"
              onClick={() => setMode("vault")}
              className={cn("rounded-md px-3 py-1.5 text-xs", mode === "vault" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground")}
            >
              My Vault
            </button>
            <button
              type="button"
              onClick={() => setMode("licensed")}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs", mode === "licensed" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground")}
            >
              <Sparkles className="size-3.5" /> Licensed Search
            </button>
          </div>
        </div>

        {mode === "vault" ? (
          <>
            <div className="space-y-3 border-b border-border p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search business, Riyadh, finance, technology, background…"
                  className="ps-9"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {CLASS_FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAssetClass(item.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-[10px] transition",
                      assetClass === item.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {ASSET_CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={cn(
                      "shrink-0 rounded-md px-2 py-1 text-[10px] transition",
                      category === item.id ? "bg-accent/15 font-semibold text-accent" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {visuals.length === 0 ? (
                <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border text-center">
                  <div>
                    <FolderOpen className="mx-auto size-8 text-muted-foreground" />
                    <div className="mt-3 text-sm font-medium text-foreground">No matching media in the vault</div>
                    <div className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                      Switch to Licensed Search to find media, or add your licensed files once from Assets.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {visuals.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => pick(asset)}
                      className="group overflow-hidden rounded-lg border border-border bg-card text-start transition hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-md"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        <img src={asset.imageDataUrl} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" />
                      </div>
                      <div className="p-2.5">
                        <div className="truncate text-[11px] font-medium text-foreground">{asset.name}</div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
                          <span className="truncate">{assetProvenanceLabel(asset)}</span>
                          <span className="shrink-0 capitalize">{inferAssetClass(asset)}</span>
                        </div>
                        {(asset.tags?.length ?? 0) > 0 && (
                          <div className="mt-2 flex gap-1 overflow-hidden">
                            {asset.tags!.slice(0, 2).map((tag) => (
                              <span key={tag} className="truncate rounded bg-muted px-1.5 py-0.5 text-[8px] text-muted-foreground">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <div className="text-[10px] text-muted-foreground">{visuals.length} reusable visual asset{visuals.length === 1 ? "" : "s"}</div>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-border p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={licensedQuery}
                    onChange={(event) => setLicensedQuery(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") void runLicensedSearch(); }}
                    placeholder="Search: boardroom, Riyadh skyline, logistics, finance, technology…"
                    className="ps-9"
                  />
                </div>
                <Button onClick={() => void runLicensedSearch()} disabled={licensedBusy || licensedQuery.trim().length < 2}>
                  {licensedBusy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Search
                </Button>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                Selecting a result imports it into My Vault first, preserving source and attribution metadata for later reuse.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {licensedResults.length === 0 ? (
                <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border text-center">
                  <div>
                    <Sparkles className="mx-auto size-8 text-muted-foreground" />
                    <div className="mt-3 text-sm font-medium text-foreground">Search the licensed media library</div>
                    <div className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                      Search and import without leaving the editor. Imported assets remain available in My Vault.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {licensedResults.map((result) => (
                    <article key={result.provider + "-" + result.id} className="overflow-hidden rounded-lg border border-border bg-card">
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        <img src={result.previewUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="p-2.5">
                        <div className="line-clamp-2 text-[11px] font-medium text-foreground">{result.title}</div>
                        <div className="mt-1 text-[9px] text-muted-foreground">{result.creator ? `Pexels · ${result.creator}` : "Pexels"}</div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[8px] text-muted-foreground hover:text-foreground">
                            Source <ExternalLink className="size-2.5" />
                          </a>
                          <Button
                            size="sm"
                            className="h-7 text-[9px]"
                            disabled={Boolean(importingId)}
                            onClick={() => void importAndPick(result)}
                          >
                            {importingId === result.id ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />} Use
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
