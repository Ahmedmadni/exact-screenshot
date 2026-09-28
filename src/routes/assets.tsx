import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { CheckCircle2, FolderOpen, Loader2, Upload, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { assetRepository, useDatabase } from "@/lib/data/store";
import { Button } from "@/components/ui/button";
import { ingestSourceFiles } from "@/lib/documents/ingest";

export const Route = createFileRoute("/assets")({
  head: () => ({
    meta: [
      { title: "Assets — Meridian Studio" },
      { name: "description", content: "Source files and imagery attached to your presentations." },
      { property: "og:title", content: "Assets — Meridian Studio" },
      {
        property: "og:description",
        content: "Source files and imagery attached to your presentations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssetsPage,
});

function AssetsPage() {
  const { assets } = useDatabase();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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

  return (
    <AppShell>
      <header className="mb-8 space-y-2">
        <span className="eyebrow">Assets</span>
        <h1 className="text-3xl text-foreground">Source material</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Upload source material once, extract its content locally, and reuse it across presentation planning.
        </p>
        <input ref={input} type="file" hidden multiple accept=".pdf,.docx,.xls,.xlsx,.csv,.pptx,.png,.jpg,.jpeg,.webp" onChange={(e) => void upload(e.target.files)} />
        <Button className="mt-3" onClick={() => input.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Analyze source files
        </Button>
      </header>

      {assets.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nothing attached yet"
          description="Attach a report, spreadsheet or deck while describing an idea on the home screen and it will be listed here alongside the presentation it belongs to."
        />
      ) : (
        <div className="space-y-3">
          {assets.map((asset) => (
            <article key={asset.id} className="panel p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{asset.kind}</span>
                    {asset.extractionStatus === "ready" && <CheckCircle2 className="size-4 text-emerald-600" />}
                    {asset.extractionStatus === "pending" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{asset.extractionSummary ?? `${Math.max(1, Math.round(asset.size / 1024))} KB`}</p>
                </div>
                <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => assetRepository.remove(asset.id)}>
                  <Trash2 className="size-4" />
                </Button>
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
          ))}
        </div>
      )}
    </AppShell>
  );
}
