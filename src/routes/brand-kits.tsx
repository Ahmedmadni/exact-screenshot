import { createFileRoute } from "@tanstack/react-router";
import { Palette } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { useDatabase } from "@/lib/data/store";

export const Route = createFileRoute("/brand-kits")({
  head: () => ({
    meta: [
      { title: "Brand Kits — Meridian Studio" },
      { name: "description", content: "Colours, typefaces and logos applied across every deck." },
      { property: "og:title", content: "Brand Kits — Meridian Studio" },
      {
        property: "og:description",
        content: "Colours, typefaces and logos applied across every deck.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrandKitsPage,
});

function BrandKitsPage() {
  const { brandKits } = useDatabase();

  return (
    <AppShell>
      <header className="mb-8 space-y-2">
        <span className="eyebrow">Brand Kits</span>
        <h1 className="text-3xl text-foreground">One identity, every deck</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Colours, typefaces and logos that every generated presentation inherits automatically.
        </p>
      </header>

      {brandKits.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="No brand kit yet"
          description="Add your palette, typefaces and logo once and every deck you plan here will inherit them the moment the design phase opens."
          hint="Coming in the next phase"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {brandKits.map((kit) => (
            <article key={kit.id} className="panel space-y-3 p-5">
              <h2 className="text-base text-foreground">{kit.name}</h2>
              <div className="flex gap-2">
                {kit.colors.map((c) => (
                  <span
                    key={c}
                    className="size-7 rounded-md border border-border"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {kit.headingFont} · {kit.bodyFont}
              </p>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
