import { createFileRoute } from "@tanstack/react-router";
import { LayoutTemplate } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { useDatabase } from "@/lib/data/store";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Meridian Studio" },
      { name: "description", content: "Deck templates that pair a story structure with a visual system." },
      { property: "og:title", content: "Templates — Meridian Studio" },
      {
        property: "og:description",
        content: "Deck templates that pair a story structure with a visual system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { themes } = useDatabase();

  return (
    <AppShell>
      <header className="mb-8 space-y-2">
        <span className="eyebrow">Templates</span>
        <h1 className="text-3xl text-foreground">Story structures, dressed</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          A template pairs a narrative structure with a visual system. Applying one to a blueprint
          arrives with the design phase.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => (
          <article key={theme.id} className="panel flex flex-col gap-4 p-5">
            <span className="h-24 rounded-lg border border-border bg-surface" />
            <div className="space-y-1">
              <h2 className="text-base text-foreground">{theme.name}</h2>
              <p className="text-sm text-muted-foreground">{theme.description}</p>
            </div>
            <span className="eyebrow">Available in the design phase</span>
          </article>
        ))}
      </div>

      <div className="mt-6">
        <EmptyState
          icon={LayoutTemplate}
          title="Your own templates land here"
          description="Once the design phase ships you can save any finished deck as a reusable template, with its layouts and type scale intact."
          hint="Coming in the next phase"
        />
      </div>
    </AppShell>
  );
}
