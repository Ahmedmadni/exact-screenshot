import { createFileRoute } from "@tanstack/react-router";
import { FolderOpen, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { assetRepository, useDatabase } from "@/lib/data/store";
import { Button } from "@/components/ui/button";

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

  return (
    <AppShell>
      <header className="mb-8 space-y-2">
        <span className="eyebrow">Assets</span>
        <h1 className="text-3xl text-foreground">Source material</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Documents and images attached while planning. Reading their contents arrives with document
          intelligence.
        </p>
      </header>

      {assets.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nothing attached yet"
          description="Attach a report, spreadsheet or deck while describing an idea on the home screen and it will be listed here alongside the presentation it belongs to."
        />
      ) : (
        <ul className="panel divide-y divide-border">
          {assets.map((asset) => (
            <li key={asset.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">{asset.name}</p>
                <p className="eyebrow">{asset.kind}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove"
                onClick={() => assetRepository.remove(asset.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
