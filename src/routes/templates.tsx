import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Copy, LayoutTemplate, Trash2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { TEMPLATE_FAMILIES } from "@/lib/templates";
import { savedTemplateRepository, useDatabase } from "@/lib/data/store";
import { getTheme } from "@/lib/editor/themes";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Meridian Studio" },
      { name: "description", content: "Presentation families that pair narrative intent, layouts and visual systems." },
      { property: "og:title", content: "Templates — Meridian Studio" },
      { property: "og:description", content: "Presentation families that pair narrative intent, layouts and visual systems." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const navigate = useNavigate();
  const { savedTemplates } = useDatabase();
  const categories = ["All", ...Array.from(new Set(TEMPLATE_FAMILIES.map((t) => t.category)))] as const;
  const [category, setCategory] = useState<string>("All");
  const visible = category === "All" ? TEMPLATE_FAMILIES : TEMPLATE_FAMILIES.filter((t) => t.category === category);

  return (
    <AppShell>
      <header className="mb-8 space-y-2">
        <span className="eyebrow">Templates</span>
        <h1 className="text-3xl text-foreground">Story structure meets design system</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Each family combines presentation purpose, default tone, visual theme and intent-aware layout choices. Content remains fully editable.
        </p>
      </header>

      {savedTemplates.length > 0 && (
        <section className="mb-8 space-y-3">
          <div>
            <span className="eyebrow">My Templates</span>
            <h2 className="mt-1 text-xl text-foreground">Reusable decks</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create a clean copy with the same slides, identity, layouts and editable elements.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {savedTemplates.map((template) => {
              const theme = getTheme(template.snapshot.themeId, template.snapshot.themeOverrides);
              return (
                <article key={template.id} className="panel overflow-hidden">
                  <div className="h-32 p-4" style={{ background: theme.colors.background }}>
                    <div className="h-1 w-12 rounded" style={{ background: theme.colors.accent }} />
                    <div className="mt-3 text-lg font-semibold" style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}>{template.name}</div>
                    <div className="mt-2 line-clamp-2 text-xs" style={{ color: theme.colors.secondary, fontFamily: theme.fonts.body }}>{template.description}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="text-xs text-muted-foreground">{template.snapshot.slides.length} slides</div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          const deck = savedTemplateRepository.createPresentation(template.id);
                          if (deck) navigate({ to: "/presentations/$presentationId", params: { presentationId: deck.id } });
                        }}
                      >
                        <Copy className="size-4" /> Create deck
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Delete template" onClick={() => savedTemplateRepository.remove(template.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${category === item ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((template) => {
          const theme = getTheme(template.themeId);
          const layouts = Array.from(new Set(Object.values(template.layoutMap))).slice(0, 5);
          return (
            <article key={template.id} className="panel overflow-hidden">
              <div className="relative h-48 p-5" style={{ background: theme.colors.background }}>
                <div className="absolute inset-y-0 end-0 w-1/3 opacity-80" style={{ background: theme.colors.surface }} />
                <div className="relative z-10 max-w-[75%]">
                  <span className="rounded-full px-2 py-1 text-[10px] font-medium" style={{ background: theme.colors.accentSoft, color: theme.colors.accent }}>{template.badge}</span>
                  <div className="mt-5 h-1 w-12 rounded" style={{ background: theme.colors.accent }} />
                  <div className="mt-3 text-2xl font-semibold" style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}>{template.name}</div>
                  <div className="mt-2 text-xs leading-relaxed" style={{ color: theme.colors.secondary, fontFamily: theme.fonts.body }}>Presentation title and executive message</div>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="eyebrow">{template.category}</span>
                    <span className="text-[11px] text-muted-foreground">{template.presentationType}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{template.description}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {layouts.map((layout) => <span key={layout} className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground">{layout}</span>)}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="text-xs text-muted-foreground">{template.tone} · {template.lengthPreset}</div>
                  <Button asChild size="sm">
                    <Link to="/new" search={{ template: template.id }}>Use template</Link>
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="panel mt-6 flex flex-wrap items-center justify-between gap-4 border-dashed p-5">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="size-5 text-accent" />
          <div>
            <div className="text-sm font-medium text-foreground">Reusable families, not rigid slides</div>
            <div className="text-xs text-muted-foreground">The same template adapts its layout choices to each slide intent instead of forcing every deck into fixed pages.</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
