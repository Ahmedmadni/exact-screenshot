import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2, FileText, FolderOpen, Grid2X2, Image as ImageIcon, Loader2, Search, Sparkles, Star, Trash2, Upload,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { assetRepository, useDatabase } from "@/lib/data/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ingestSourceFiles } from "@/lib/documents/ingest";
import {
  ASSET_CATEGORIES,
  assetProvenanceLabel,
  filterAssetCatalog,
  inferAssetClass,
} from "@/lib/assets/catalog";
import type { AssetCategory, AssetClass, AssetRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  importLicensedAsset,
  licensedProviderLabel,
  searchLicensedAssets,
  type LicensedAssetSearchResult,
} from "@/lib/assets/licensed-provider";

export const Route = createFileRoute("/assets")({
  head: () => ({
    meta: [
      { title: "Asset Vault — Meridian Studio" },
      { name: "description", content: "Reusable licensed media, source documents and presentation assets in one internal library." },
      { property: "og:title", content: "Asset Vault — Meridian Studio" },
      { property: "og:description", content: "Reusable licensed media, source documents and presentation assets in one internal library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssetsPage,
});

const CLASS_FILTERS: Array<{ id: AssetClass | "all"; label: string }> = [
  { id: "all", label: "All visuals" },
  { id: "photo", label: "Photos" },
  { id: "illustration", label: "Illustrations" },
  { id: "background", label: "Backgrounds" },
  { id: "logo", label: "Logos" },
  { id: "icon", label: "Icons" },
];

function AssetsPage() {
  const { assets } = useDatabase();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<"visuals" | "sources">("visuals");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AssetCategory | "all">("all");
  const [assetClass, setAssetClass] = useState<AssetClass | "all">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [licensedQuery, setLicensedQuery] = useState("");
  const [licensedResults, setLicensedResults] = useState<LicensedAssetSearchResult[]>([]);
  const [licensedBusy, setLicensedBusy] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

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

  const importResult = async (result: LicensedAssetSearchResult) => {
    if (importingId) return;
    setImportingId(result.id);
    try {
      await importLicensedAsset(result);
      toast.success("Imported into Asset Vault.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not import the selected media.");
    } finally {
      setImportingId(null);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      await ingestSourceFiles(files, null);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  const visualAssets = useMemo(
    () =>
      filterAssetCatalog(assets, {
        query,
        category,
        assetClass,
        favoritesOnly,
        visualsOnly: true,
      }),
    [assets, query, category, assetClass, favoritesOnly],
  );

  const sourceAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets
      .filter((asset) => asset.kind !== "image")
      .filter((asset) => !favoritesOnly || asset.favorite)
      .filter((asset) => !q || [asset.name, asset.extractedText, asset.extractionSummary, ...(asset.tags ?? [])].filter(Boolean).join(" ").toLowerCase().includes(q))
      .sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || b.createdAt.localeCompare(a.createdAt));
  }, [assets, query, favoritesOnly]);

  const visualsCount = assets.filter((asset) => asset.kind === "image").length;
  const sourcesCount = assets.length - visualsCount;

  return (
    <AppShell>
      <section className="mb-7 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid gap-0 lg:grid-cols-[1fr_.42fr]">
          <div className="p-7 sm:p-9">
            <span className="eyebrow">Internal content library</span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Asset Vault</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Keep licensed media, brand assets and source documents inside Meridian Studio. Search once, reuse everywhere, and retain source metadata for internal provenance.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <input
                ref={input}
                type="file"
                hidden
                multiple
                accept=".pdf,.docx,.xls,.xlsx,.csv,.pptx,.png,.jpg,.jpeg,.webp,.gif,.svg"
                onChange={(event) => void upload(event.target.files)}
              />
              <Button onClick={() => input.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Add to Asset Vault
              </Button>
              <div className="flex items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground">
                <ImageIcon className="size-3.5" /> {visualsCount} visuals
                <span className="text-border">•</span>
                <FileText className="size-3.5" /> {sourcesCount} sources
              </div>
            </div>
          </div>
          <div className="relative min-h-48 border-t border-border bg-muted/30 lg:border-s lg:border-t-0">
            <div className="absolute inset-0 [background-image:radial-gradient(circle_at_78%_18%,hsl(var(--accent)/.18),transparent_24%),linear-gradient(135deg,transparent_35%,hsl(var(--muted))_100%)]" />
            <div className="relative grid h-full place-items-center p-6">
              <div className="grid grid-cols-2 gap-3">
                <VaultStat value={String(assets.filter((asset) => asset.favorite).length)} label="favorites" />
                <VaultStat value={String(new Set(assets.map((asset) => asset.category).filter(Boolean)).size)} label="categories" />
                <VaultStat value={String(assets.filter((asset) => asset.sourceProvider).length)} label="sourced" />
                <VaultStat value={String(assets.filter((asset) => asset.presentationId === null).length)} label="reusable" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-7 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent" />
              <span className="eyebrow">Licensed sources</span>
            </div>
            <h2 className="mt-1 text-lg font-medium text-foreground">Search external licensed media without leaving Meridian</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Results stay inside the studio. Importing a visual copies it into your reusable Asset Vault and retains its provenance metadata.
            </p>
          </div>
          <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[10px] text-muted-foreground">Provider adapters</span>
        </div>

        <div className="p-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={licensedQuery}
                onChange={(event) => setLicensedQuery(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void runLicensedSearch(); }}
                placeholder="Search: Saudi city skyline, boardroom, logistics, technology, finance…"
                className="ps-9"
              />
            </div>
            <Button onClick={() => void runLicensedSearch()} disabled={licensedBusy || licensedQuery.trim().length < 2}>
              {licensedBusy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Search library
            </Button>
          </div>

          {licensedResults.length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {licensedResults.map((result) => (
                <article key={result.provider + "-" + result.id} className="overflow-hidden rounded-lg border border-border bg-background">
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img src={result.previewUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3">
                    <div className="line-clamp-2 text-xs font-medium text-foreground">{result.title}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {result.creator ? `${licensedProviderLabel(result.provider)} · ${result.creator}` : licensedProviderLabel(result.provider)}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[9px] text-muted-foreground">Imported media stays in your Vault</span>
                      <Button size="sm" className="h-7 text-[10px]" disabled={Boolean(importingId)} onClick={() => void importResult(result)}>
                        {importingId === result.id ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                        Import
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setView("visuals")}
            className={cn("inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs", view === "visuals" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Grid2X2 className="size-3.5" /> Visuals <span className="opacity-70">{visualsCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setView("sources")}
            className={cn("inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs", view === "sources" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <FileText className="size-3.5" /> Sources <span className="opacity-70">{sourcesCount}</span>
          </button>
        </div>
        <Button
          size="sm"
          variant={favoritesOnly ? "secondary" : "outline"}
          onClick={() => setFavoritesOnly((value) => !value)}
        >
          <Star className={cn("size-3.5", favoritesOnly && "fill-current")} /> Favorites
        </Button>
      </div>

      <div className="mb-5 space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={view === "visuals" ? "Search people, finance, Riyadh, technology, background, source…" : "Search inside uploaded source material…"}
            className="ps-9"
          />
        </div>

        {view === "visuals" && (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {CLASS_FILTERS.map((item) => (
                <FilterPill key={item.id} active={assetClass === item.id} onClick={() => setAssetClass(item.id)}>
                  {item.label}
                </FilterPill>
              ))}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {ASSET_CATEGORIES.map((item) => (
                <FilterPill key={item.id} active={category === item.id} onClick={() => setCategory(item.id)}>
                  {item.label}
                </FilterPill>
              ))}
            </div>
          </>
        )}
      </div>

      {view === "visuals" ? (
        visualAssets.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No visual assets yet"
            description="Add licensed photos, illustrations, backgrounds or logos once. They will then be searchable from every presentation editor."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visualAssets.map((asset) => <VisualAssetCard key={asset.id} asset={asset} />)}
          </div>
        )
      ) : sourceAssets.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No source documents"
          description="Upload PDF, Word, Excel or PowerPoint files and Meridian Studio will extract their content for in-app research and presentation planning."
        />
      ) : (
        <div className="space-y-3">
          {sourceAssets.map((asset) => <SourceAssetRow key={asset.id} asset={asset} />)}
        </div>
      )}
    </AppShell>
  );
}

function VisualAssetCard({ asset }: { asset: AssetRecord }) {
  const aspect = asset.width && asset.height ? asset.width / asset.height : undefined;
  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {asset.imageDataUrl ? (
          <img src={asset.imageDataUrl} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" />
        ) : (
          <div className="grid h-full place-items-center"><ImageIcon className="size-7 text-muted-foreground" /></div>
        )}
        <button
          type="button"
          aria-label={asset.favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => assetRepository.update(asset.id, { favorite: !asset.favorite })}
          className="absolute end-2 top-2 grid size-8 place-items-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur hover:bg-black/40"
        >
          <Star className={cn("size-4", asset.favorite && "fill-current")} />
        </button>
        <span className="absolute start-2 top-2 rounded-full border border-white/20 bg-black/25 px-2 py-1 text-[9px] font-semibold capitalize text-white backdrop-blur">
          {inferAssetClass(asset)}
        </span>
      </div>

      <div className="p-3.5">
        <div className="truncate text-sm font-medium text-foreground">{asset.name}</div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{assetProvenanceLabel(asset)}</span>
          {asset.category && <><span>•</span><span className="capitalize">{asset.category}</span></>}
          {aspect && <><span>•</span><span>{aspect > 1.25 ? "Landscape" : aspect < 0.8 ? "Portrait" : "Square"}</span></>}
        </div>

        {asset.tags?.length ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {asset.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{tag}</span>)}
          </div>
        ) : null}

        {(asset.sourceProvider || asset.licenseLabel || asset.attribution) && (
          <details className="mt-3 rounded-md border border-border bg-muted/20 p-2">
            <summary className="cursor-pointer text-[10px] font-medium text-foreground">Source metadata</summary>
            <div className="mt-2 space-y-1 text-[10px] leading-relaxed text-muted-foreground">
              {asset.sourceProvider && <div>Provider: {asset.sourceProvider}</div>}
              {asset.licenseLabel && <div>License: {asset.licenseLabel}</div>}
              {asset.attribution && <div>Attribution: {asset.attribution}</div>}
              {asset.sourceItemId && <div>Source ID: {asset.sourceItemId}</div>}
            </div>
          </details>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <div className="text-[10px] text-muted-foreground">
            {asset.width && asset.height ? `${asset.width}×${asset.height}` : asset.extractionSummary ?? "Ready"}
          </div>
          <Button variant="ghost" size="icon" className="size-7" aria-label="Remove asset" onClick={() => assetRepository.remove(asset.id)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function SourceAssetRow({ asset }: { asset: AssetRecord }) {
  return (
    <article className="panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{asset.kind}</span>
            {asset.extractionStatus === "ready" && <CheckCircle2 className="size-4 text-emerald-600" />}
            {asset.extractionStatus === "pending" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            {asset.favorite && <Star className="size-3.5 fill-current text-accent" />}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{asset.extractionSummary ?? `${Math.max(1, Math.round(asset.size / 1024))} KB`}</p>
          {asset.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {asset.tags.slice(0, 6).map((tag) => <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{tag}</span>)}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Favorite source" onClick={() => assetRepository.update(asset.id, { favorite: !asset.favorite })}>
            <Star className={cn("size-4", asset.favorite && "fill-current text-accent")} />
          </Button>
          {asset.extractionStatus === "ready" && (
            <Button asChild size="sm" variant="outline">
              <Link to="/new" search={{ source: asset.id }}>Create deck</Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => assetRepository.remove(asset.id)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {asset.warnings?.length ? (
        <div className="mt-3 space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
          {asset.warnings.map((warning) => <div key={warning}>• {warning}</div>)}
        </div>
      ) : null}

      {asset.extractedText && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-foreground">Preview extracted content</summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">{asset.extractedText.slice(0, 7000)}</pre>
        </details>
      )}
    </article>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-[10px] transition",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function VaultStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-28 rounded-xl border border-border bg-background/70 p-4 backdrop-blur">
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
