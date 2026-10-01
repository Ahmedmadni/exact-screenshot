import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Copy, Eye, LayoutTemplate, Search, Sparkles, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { SlideThumb } from "@/components/editor/slide-renderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LAYOUTS, materializeSlide } from "@/lib/editor/layouts";
import { SLIDE_THEMES, getTheme } from "@/lib/editor/themes";
import {
  TEMPLATE_FAMILIES,
  templatePreviewSlides,
  type TemplateFamily,
} from "@/lib/templates";
import { savedTemplateRepository, useDatabase } from "@/lib/data/store";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Meridian Studio" },
      { name: "description", content: "Premium presentation systems with real slide previews, narrative intent and adaptive layouts." },
      { property: "og:title", content: "Templates — Meridian Studio" },
      { property: "og:description", content: "Premium presentation systems with real slide previews, narrative intent and adaptive layouts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const navigate = useNavigate();
  const { savedTemplates } = useDatabase();
  const categories = ["All", ...Array.from(new Set(TEMPLATE_FAMILIES.map((template) => template.category)))] as const;
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATE_FAMILIES.filter((template) => {
      const categoryMatch = category === "All" || template.category === category;
      if (!categoryMatch) return false;
      if (!q) return true;
      return [
        template.name,
        template.category,
        template.description,
        template.signature,
        template.badge,
        template.presentationType,
        ...template.keywords,
      ].some((value) => value.toLowerCase().includes(q));
    });
  }, [category, query]);

  const featuredIds = [
    "luxury-investment",
    "arabic-executive",
    "strategy-consulting",
    "feasibility-study",
    "ai-innovation",
    "company-profile",
  ];
  const featured = featuredIds
    .map((id) => TEMPLATE_FAMILIES.find((template) => template.id === id))
    .filter((template): template is TemplateFamily => Boolean(template));

  return (
    <AppShell>
      <section className="mb-9 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_.85fr]">
          <div className="p-7 sm:p-9">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent" />
              <span className="eyebrow">Design systems</span>
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Start with a presentation that already looks boardroom-ready.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              These are not rigid PowerPoint themes. Each family combines typography, palette, visual rhythm and intent-aware layouts that adapt across the story.
            </p>

            <div className="mt-6 grid max-w-xl grid-cols-3 gap-3">
              <Stat value={String(TEMPLATE_FAMILIES.length)} label="template families" />
              <Stat value={String(LAYOUTS.length)} label="smart layouts" />
              <Stat value={String(SLIDE_THEMES.length)} label="visual systems" />
            </div>

            <div className="relative mt-6 max-w-xl">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 ps-10"
                placeholder="Search: board, Arabic, investor, finance, AI, government…"
              />
            </div>
          </div>

          <div className="relative min-h-64 border-t border-border bg-muted/35 p-6 lg:border-s lg:border-t-0">
            <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_10%,hsl(var(--accent)/.18),transparent_30%),radial-gradient(circle_at_80%_80%,hsl(var(--primary)/.1),transparent_28%)]" />
            <div className="relative mx-auto max-w-md pt-3">
              <ShowcaseStack templates={featured.slice(0, 3)} />
            </div>
          </div>
        </div>
      </section>

      {savedTemplates.length > 0 && (
        <section className="mb-10 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow">My Templates</span>
              <h2 className="mt-1 text-xl text-foreground">Your reusable presentation systems</h2>
            </div>
            <div className="text-xs text-muted-foreground">{savedTemplates.length} saved</div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {savedTemplates.map((template) => {
              const firstSlide = template.snapshot.slides[0]
                ? materializeSlide(template.snapshot.slides[0])
                : undefined;
              const theme = getTheme(template.snapshot.themeId, template.snapshot.themeOverrides);
              return (
                <article key={template.id} className="panel overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="relative aspect-video overflow-hidden" style={{ background: theme.colors.background }}>
                    {firstSlide ? (
                      <SlideThumb
                        slide={firstSlide}
                        themeId={template.snapshot.themeId}
                        themeOverrides={template.snapshot.themeOverrides}
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-muted-foreground">No slide preview</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">{template.name}</div>
                        <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{template.description}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                        {template.snapshot.slides.length} slides
                      </span>
                    </div>
                    <div className="mt-4 flex justify-end gap-1">
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

      {!query && category === "All" && (
        <section className="mb-10 space-y-4">
          <div className="flex items-center gap-2">
            <Star className="size-4 text-accent" />
            <div>
              <span className="eyebrow">Featured</span>
              <h2 className="mt-1 text-xl text-foreground">Signature presentation systems</h2>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {featured.map((template) => <TemplateCard key={template.id} template={template} featured />)}
          </div>
        </section>
      )}

      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="eyebrow">Library</span>
            <h2 className="mt-1 text-xl text-foreground">
              {query ? `Results for “${query}”` : category === "All" ? "All template families" : category}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  category === item
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {filtered.length ? (
          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((template) => <TemplateCard key={template.id} template={template} />)}
          </div>
        ) : (
          <div className="panel grid min-h-52 place-items-center border-dashed p-8 text-center">
            <div>
              <LayoutTemplate className="mx-auto size-7 text-muted-foreground" />
              <div className="mt-3 text-sm font-medium text-foreground">No template matches that search</div>
              <div className="mt-1 text-xs text-muted-foreground">Try a use case such as finance, Arabic, board, AI or investor.</div>
            </div>
          </div>
        )}
      </section>

      <div className="panel mt-8 flex flex-wrap items-center justify-between gap-4 border-dashed p-5">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="size-5 text-accent" />
          <div>
            <div className="text-sm font-medium text-foreground">A template is a system, not a fixed deck</div>
            <div className="text-xs text-muted-foreground">Switch layouts slide-by-slide without losing content, then apply brand colors and fonts on top.</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TemplateCard({ template, featured = false }: { template: TemplateFamily; featured?: boolean }) {
  const previews = useMemo(() => templatePreviewSlides(template), [template.id]);
  const theme = getTheme(template.themeId);
  return (
    <article className={`group overflow-hidden rounded-xl border bg-card transition duration-200 hover:-translate-y-1 hover:shadow-xl ${featured ? "border-accent/30" : "border-border"}`}>
      <div className="relative h-64 overflow-hidden" style={{ background: theme.colors.background }}>
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              `radial-gradient(circle at 86% 10%, ${theme.colors.accentSoft}, transparent 28%), linear-gradient(145deg, transparent 35%, ${theme.colors.surface} 100%)`,
          }}
        />
        <MiniDeckPreview slides={previews} themeId={template.themeId} />
        <div className="absolute start-4 top-4 z-20 flex items-center gap-2">
          <span
            className="rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur"
            style={{ background: theme.colors.accentSoft, borderColor: theme.colors.line, color: theme.colors.accent }}
          >
            {template.badge}
          </span>
          {template.featured && (
            <span className="rounded-full border border-white/20 bg-black/20 px-2 py-1 text-[9px] font-semibold text-white backdrop-blur">Signature</span>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="eyebrow">{template.category}</span>
            <h3 className="mt-1 text-lg font-semibold text-foreground">{template.name}</h3>
          </div>
          <div className="shrink-0 text-[10px] text-muted-foreground">{template.presentationType}</div>
        </div>

        <p className="mt-2 min-h-10 text-sm leading-relaxed text-muted-foreground">{template.description}</p>
        <p className="mt-3 border-s-2 border-accent/50 ps-3 text-xs leading-relaxed text-foreground/75">{template.signature}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {template.previewLayouts.map((layout) => (
            <span key={layout} className="rounded-md bg-muted px-2 py-1 text-[9px] text-muted-foreground">
              {layout.replaceAll("-", " ")}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="text-xs text-muted-foreground">{template.tone} · {template.lengthPreset}</div>
          <div className="flex gap-2">
            <TemplatePreviewDialog template={template} previews={previews} />
            <Button asChild size="sm">
              <Link to="/new" search={{ template: template.id }}>Use template</Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function TemplatePreviewDialog({
  template,
  previews,
}: {
  template: TemplateFamily;
  previews: ReturnType<typeof templatePreviewSlides>;
}) {
  const sceneLabels = ["Opening statement", "Evidence / proof", "Decision / next step"];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Eye className="size-4" /> Preview deck
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border p-6 pe-14">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="eyebrow">{template.category} · {template.badge}</div>
              <DialogTitle className="mt-1 text-2xl">{template.name}</DialogTitle>
              <DialogDescription className="mt-2 max-w-3xl leading-relaxed">
                {template.signature}
              </DialogDescription>
            </div>
            <div className="flex gap-1.5">
              {Object.values(getTheme(template.themeId).colors)
                .filter((value) => typeof value === "string" && value.startsWith("#"))
                .slice(0, 5)
                .map((color) => (
                  <span key={color} className="size-5 rounded-full border border-border" style={{ background: color }} />
                ))}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 p-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {previews.map((slide, index) => (
              <article key={slide.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="aspect-video overflow-hidden bg-muted">
                  <SlideThumb slide={slide} themeId={template.themeId} />
                </div>
                <div className="border-t border-border p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                    {sceneLabels[index] ?? `Scene ${index + 1}`}
                  </div>
                  <div className="mt-1 text-sm font-medium text-foreground">{slide.title}</div>
                  <div className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{slide.keyMessage}</div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{slide.slideIntent}</span>
                    <span>{slide.layoutId?.replaceAll("-", " ")}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-5 sm:grid-cols-3">
            <div>
              <div className="eyebrow">Best for</div>
              <div className="mt-1 text-sm text-foreground">{template.presentationType}</div>
            </div>
            <div>
              <div className="eyebrow">Visual character</div>
              <div className="mt-1 text-sm text-foreground">{template.signature}</div>
            </div>
            <div>
              <div className="eyebrow">Design vocabulary</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {template.previewLayouts.map((layout) => (
                  <span key={layout} className="rounded bg-background px-2 py-1 text-[10px] text-muted-foreground">
                    {layout.replaceAll("-", " ")}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button asChild>
              <Link to="/new" search={{ template: template.id }}>Use {template.name}</Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MiniDeckPreview({ slides, themeId }: { slides: ReturnType<typeof templatePreviewSlides>; themeId: string }) {
  if (!slides.length) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      {slides.slice(0, 3).map((slide, index) => {
        const transforms = [
          "translate(-5%, -2%) rotate(-2.2deg)",
          "translate(7%, 6%) rotate(2.5deg)",
          "translate(0%, 1%) rotate(0deg)",
        ];
        const z = [1, 2, 3][index] ?? index + 1;
        const order = slides.length === 3 ? [1, 2, 0][index] ?? index : index;
        const shown = slides[order] ?? slide;
        return (
          <div
            key={shown.id + "-" + index}
            className="absolute w-[72%] overflow-hidden rounded-md border shadow-2xl"
            style={{
              zIndex: z,
              transform: transforms[index],
              borderColor: "rgba(255,255,255,.22)",
              boxShadow: index === 2 ? "0 24px 55px rgba(0,0,0,.25)" : "0 12px 35px rgba(0,0,0,.16)",
            }}
          >
            <div className="bg-white">
              <SlideThumb slide={shown} themeId={themeId} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ShowcaseStack({ templates }: { templates: TemplateFamily[] }) {
  return (
    <div className="relative h-52">
      {templates.map((template, index) => {
        const preview = templatePreviewSlides(template)[0];
        const theme = getTheme(template.themeId);
        return (
          <div
            key={template.id}
            className="absolute start-1/2 top-1/2 w-[78%] overflow-hidden rounded-lg border shadow-xl"
            style={{
              transform:
                index === 0
                  ? "translate(-61%, -51%) rotate(-5deg)"
                  : index === 1
                    ? "translate(-39%, -45%) rotate(6deg)"
                    : "translate(-50%, -47%) rotate(0deg)",
              zIndex: index === 2 ? 3 : index + 1,
              borderColor: theme.colors.line,
            }}
          >
            {preview && <SlideThumb slide={preview} themeId={template.themeId} />}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <div className="text-xl font-semibold text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
