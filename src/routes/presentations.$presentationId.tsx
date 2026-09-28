import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, FileText, Loader2, Minimize2, Plus, RefreshCw, Trash2, Maximize2, Upload, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { SaveIndicator, type SaveState } from "@/components/save-indicator";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiProvider, type PlanRequest } from "@/lib/ai";
import { assetRepository, brandKitRepository, presentationRepository, uid, useDatabase, usePresentation } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { SlideThumb } from "@/components/editor/slide-renderer";
import { materializeSlide } from "@/lib/editor/layouts";
import { composeDeck } from "@/lib/editor/composer";
import { SLIDE_THEMES, getTheme } from "@/lib/editor/themes";
import { applyBrandKit, clearBrandKit } from "@/lib/brand";
import { TEMPLATE_FAMILIES, applyTemplateFamilyToSlides } from "@/lib/templates";
import { exportPresentationToPdf, exportPresentationToPptx, validatePresentationForExport } from "@/lib/export";
import { VISUAL_TYPES, type AssetRecord, type Presentation, type Slide, type VisualType } from "@/lib/types";

export const Route = createFileRoute("/presentations/$presentationId")({
  head: () => ({
    meta: [
      { title: "Presentation blueprint — Meridian Studio" },
      { name: "description", content: "Brief, story arc and slide map for your presentation." },
      { property: "og:title", content: "Presentation blueprint — Meridian Studio" },
      { property: "og:description", content: "Brief, story arc and slide map for your presentation." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Detail,
});

function useAutosave() {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const save = (fn: () => void) => {
    setState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fn();
      setState("saved");
    }, 500);
  };
  return { state, save };
}

/** Text field that keeps local state and autosaves after typing pauses. */
function AutoField({ value, onSave, multiline, className }: { value: string; onSave: (v: string) => void; multiline?: boolean; className?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const Comp = multiline ? Textarea : Input;
  return (
    <Comp
      value={v}
      rows={multiline ? 2 : undefined}
      className={className}
      onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => {
        setV(e.target.value);
        onSave(e.target.value);
      }}
    />
  );
}

function Detail() {
  const { presentationId } = Route.useParams();
  const p = usePresentation(presentationId);
  const { t } = useI18n();
  const { state, save } = useAutosave();
  const [exporting, setExporting] = useState<"pptx" | "pdf" | null>(null);

  if (!p) {
    return (
      <AppShell>
        <EmptyState
          icon={FileText}
          title="Presentation not found"
          description="It may have been deleted, or it lives in another browser."
          action={<Button asChild><Link to="/presentations">Back to library</Link></Button>}
        />
      </AppShell>
    );
  }

  const update = (patch: Partial<Presentation>) => save(() => presentationRepository.update(p.id, patch));

  const runExport = async (format: "pptx" | "pdf") => {
    if (exporting) return;
    const deck = { ...p, slides: p.slides.map(materializeSlide) };
    const issues = validatePresentationForExport(deck);
    const error = issues.find((issue) => issue.level === "error");
    if (error) {
      toast.error(error.message);
      return;
    }
    const warnings = issues.filter((issue) => issue.level === "warning");
    if (warnings.length) {
      toast.warning(`${warnings.length} export note${warnings.length === 1 ? "" : "s"} — placeholders or missing media will remain visible.`);
    }
    setExporting(format);
    try {
      if (format === "pptx") await exportPresentationToPptx(deck);
      else await exportPresentationToPdf(deck);
      toast.success(format === "pptx" ? "PowerPoint exported." : "PDF exported.");
    } catch (error) {
      console.error(error);
      toast.error(`Could not export ${format.toUpperCase()}.`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <AppShell>
      <Link to="/presentations" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" /> Presentations
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="eyebrow">{p.presentationType}</span>
            <StatusBadge status={p.status} />
          </div>
          <h1 className="text-3xl text-foreground">{p.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <SaveIndicator state={state} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!!exporting}>
                {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void runExport("pptx")}>
                <Download className="size-4" /> PowerPoint (.pptx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void runExport("pdf")}>
                <Download className="size-4" /> PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Tabs defaultValue="blueprint">
        <TabsList>
          <TabsTrigger value="blueprint">{t("tab.blueprint")}</TabsTrigger>
          <TabsTrigger value="slides">{t("tab.slides")}</TabsTrigger>
          <TabsTrigger value="design">{t("tab.design")}</TabsTrigger>
          <TabsTrigger value="files">{t("tab.files")}</TabsTrigger>
        </TabsList>
        <TabsContent value="blueprint" className="mt-6">
          <Blueprint p={p} update={update} save={save} />
        </TabsContent>
        <TabsContent value="slides" className="mt-6">
          <div className="mb-4 flex justify-end">
            <Button asChild><Link to="/presentations/$presentationId/editor" params={{ presentationId: p.id }}>{t("editor.open")}</Link></Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {p.slides.map((s) => (
              <Link key={s.id} to="/presentations/$presentationId/editor" params={{ presentationId: p.id }} search={{ slide: s.id }} className="group block">
                <div className="overflow-hidden rounded-md border border-border transition-shadow group-hover:shadow-md">
                  <SlideThumb slide={materializeSlide(s)} themeId={p.themeId} themeOverrides={p.themeOverrides} />
                </div>
                <p className="mt-2 truncate text-xs text-muted-foreground">{String(s.slideNumber).padStart(2, "0")} · {s.title}</p>
              </Link>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="design" className="mt-6">
          <DesignOverview p={p} />
        </TabsContent>
        <TabsContent value="files" className="mt-6">
          <Files presentationId={p.id} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Blueprint({ p, update, save }: { p: Presentation; update: (patch: Partial<Presentation>) => void; save: (fn: () => void) => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);

  const setSlides = (slides: Slide[]) => save(() => presentationRepository.replaceSlides(p.id, slides));
  const editSlide = (id: string, patch: Partial<Slide>) =>
    setSlides(p.slides.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s)));
  const move = (i: number, d: number) => {
    const next = [...p.slides];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
    presentationRepository.replaceSlides(p.id, next);
  };
  const add = () => {
    const stamp = new Date().toISOString();
    presentationRepository.replaceSlides(p.id, [
      ...p.slides,
      { id: uid(), presentationId: p.id, slideNumber: 0, sortOrder: 0, title: "New slide", purpose: "Supporting point", slideIntent: "Solution", keyMessage: "", contentSummary: "", visualType: "Cards", isOptional: true, elements: [], createdAt: stamp, updatedAt: stamp },
    ]);
  };
  const reflow = async (action: "regenerate" | "shorten" | "expand") => {
    setBusy(action);
    const req: PlanRequest = { topic: p.topic, objective: p.objective, purpose: p.purpose, audience: p.audience, presentationType: p.presentationType, language: p.language, tone: p.tone, lengthPreset: p.lengthPreset, slideCount: p.recommendedSlideCount };
    const planned = await aiProvider().reflowOutline(req, p.slides, action);
    const stamp = new Date().toISOString();
    const generated = planned.map((s) =>
      materializeSlide({ ...s, id: uid(), presentationId: p.id, elements: [], createdAt: stamp, updatedAt: stamp }),
    );
    presentationRepository.replaceSlides(p.id, composeDeck(generated));
    setBusy(null);
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-lg text-foreground">{t("blueprint.brief")}</h2>
        <div className="panel grid gap-5 p-5 sm:grid-cols-2">
          <BriefField label="Title"><AutoField value={p.title} onSave={(v) => update({ title: v })} /></BriefField>
          <BriefField label="Audience"><div className="pt-2 text-sm text-foreground">{p.audience}</div></BriefField>
          <BriefField label="Objective" wide><AutoField multiline value={p.objective} onSave={(v) => update({ objective: v, description: v })} /></BriefField>
          <BriefField label="Core message" wide><AutoField multiline value={p.coreMessage} onSave={(v) => update({ coreMessage: v })} /></BriefField>
          <BriefField label="Length"><div className="pt-2 text-sm text-foreground">{p.slides.length} {t("common.slides")} · ~{Math.max(5, Math.round(p.slides.length * 1.5))} {t("common.minutes")}</div></BriefField>
          <BriefField label="Tone"><div className="pt-2 text-sm text-foreground">{p.tone} · {p.language}</div></BriefField>
          <BriefField label="Visual direction" wide><AutoField multiline value={p.visualDirection} onSave={(v) => update({ visualDirection: v })} /></BriefField>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg text-foreground">{t("blueprint.storyArc")}</h2>
        <ol className="flex gap-3 overflow-x-auto pb-2">
          {p.storyArc.map((b, i) => (
            <li key={b.id} className="panel min-w-[160px] flex-1 p-4">
              <span className="eyebrow text-accent">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-1 text-sm text-foreground">{b.label}</p>
              <p className="text-xs text-muted-foreground">{b.question}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg text-foreground">{t("blueprint.slideMap")}</h2>
          <div className="flex flex-wrap gap-2">
            {([["regenerate", RefreshCw, "blueprint.regenerate"], ["shorten", Minimize2, "blueprint.shorten"], ["expand", Maximize2, "blueprint.expand"]] as const).map(([a, Icon, key]) => (
              <Button key={a} variant="outline" size="sm" disabled={!!busy} onClick={() => reflow(a)}>
                {busy === a ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />} {t(key)}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {p.slides.map((s, i) => (
            <div key={s.id} className="panel grid gap-3 p-4 md:grid-cols-[48px_1fr_180px_auto]">
              <span className="text-2xl font-light text-accent">{String(s.slideNumber).padStart(2, "0")}</span>
              <div className="space-y-2">
                <AutoField value={s.title} onSave={(v) => editSlide(s.id, { title: v })} className="font-medium" />
                <p className="text-xs text-muted-foreground">
                  {s.purpose}{s.isOptional && ` · ${t("common.optional")}`}
                </p>
                <AutoField multiline value={s.keyMessage || s.contentSummary} onSave={(v) => editSlide(s.id, { keyMessage: v })} />
              </div>
              <Select value={s.visualType} onValueChange={(v) => editSlide(s.id, { visualType: v as VisualType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VISUAL_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex gap-1 md:flex-col">
                <Button variant="ghost" size="icon" aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => presentationRepository.replaceSlides(p.id, p.slides.filter((x) => x.id !== s.id))}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="outline" onClick={add}><Plus className="size-4" /> {t("blueprint.addSlide")}</Button>
          <Button asChild><Link to="/presentations/$presentationId/editor" params={{ presentationId: p.id }}>{t("blueprint.continue")}</Link></Button>
        </div>
      </section>
    </div>
  );
}

function DesignOverview({ p }: { p: Presentation }) {
  const { brandKits } = useDatabase();
  const active = getTheme(p.themeId, p.themeOverrides);
  const activeKit = p.brandKitId ? brandKitRepository.get(p.brandKitId) : undefined;

  const applyKit = (kitId: string) => {
    const kit = brandKitRepository.get(kitId);
    if (!kit) return;
    presentationRepository.update(p.id, applyBrandKit(p, kit));
    toast.success(`${kit.name} applied to the presentation.`);
  };

  const removeKit = () => {
    presentationRepository.update(p.id, clearBrandKit(p));
    toast.success("Brand kit removed.");
  };

  return (
    <div className="space-y-6">
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <span className="eyebrow">Active design system</span>
          <h2 className="mt-1 text-xl text-foreground">{active.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeKit ? `${activeKit.name} is overriding the selected theme with your brand colours and typography.` : "Theme changes apply across the presentation while explicit element overrides remain intact."}
          </p>
        </div>
        <Button asChild>
          <Link to="/presentations/$presentationId/editor" params={{ presentationId: p.id }}>Open visual editor</Link>
        </Button>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base text-foreground">Brand kit</h3>
            <p className="text-sm text-muted-foreground">Apply a stable snapshot of logo, palette and typography to this deck.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/brand-kits">Manage brand kits</Link></Button>
        </div>

        {brandKits.length === 0 ? (
          <div className="panel flex flex-wrap items-center justify-between gap-3 border-dashed p-4">
            <p className="text-sm text-muted-foreground">No brand kits yet. Create one to apply your company identity.</p>
            <Button asChild size="sm"><Link to="/brand-kits">Create brand kit</Link></Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {brandKits.map((kit) => {
              const selected = p.brandKitId === kit.id;
              const preview = getTheme(p.themeId, selected ? p.themeOverrides : undefined);
              return (
                <div key={kit.id} className={`panel p-4 ${selected ? "ring-2 ring-primary" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{kit.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{kit.headingFont} · {kit.bodyFont}</div>
                    </div>
                    {kit.logoDataUrl ? <img src={kit.logoDataUrl} alt="" className="max-h-9 max-w-20 object-contain" /> : null}
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    {(kit.colors ?? []).slice(0, 4).map((color) => <span key={color} className="size-6 rounded border border-border" style={{ background: color }} />)}
                    {selected && <span className="ms-auto rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">Applied</span>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1" variant={selected ? "secondary" : "outline"} onClick={() => applyKit(kit.id)}>
                      {selected ? "Reapply" : "Apply"}
                    </Button>
                    {selected && <Button size="sm" variant="ghost" onClick={removeKit}>Remove</Button>}
                  </div>
                  {selected && <div className="mt-3 h-1 rounded" style={{ background: preview.colors.accent }} />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base text-foreground">Template family</h3>
            <p className="text-sm text-muted-foreground">Recompose slide layouts as a coordinated deck while preserving slide content and free elements.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/templates">Browse templates</Link></Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TEMPLATE_FAMILIES.map((template) => (
            <div key={template.id} className="panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{template.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{template.category} · {template.tone}</div>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">{template.badge}</span>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                onClick={() => {
                  presentationRepository.update(p.id, {
                    themeId: template.themeId,
                    slides: applyTemplateFamilyToSlides(p.slides.map(materializeSlide), template),
                  });
                  toast.success(`${template.name} applied.`);
                }}
              >
                Apply template
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-base text-foreground">Base theme</h3>
          <p className="text-sm text-muted-foreground">The brand kit sits above this visual system, so you can change layout mood without losing company identity.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SLIDE_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => presentationRepository.update(p.id, { themeId: theme.id })}
              className={`panel p-4 text-start transition-all hover:-translate-y-0.5 hover:shadow-sm ${(p.themeId ?? "executive-light") === theme.id ? "ring-2 ring-primary" : ""}`}
            >
              <div className="mb-4 flex h-20 overflow-hidden rounded-md border border-border">
                <div className="flex-1" style={{ background: theme.colors.background }} />
                <div className="w-1/4" style={{ background: theme.colors.surface }} />
                <div className="w-1/5" style={{ background: theme.colors.accent }} />
              </div>
              <div className="text-sm font-medium text-foreground">{theme.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{theme.fonts.heading} · {theme.fonts.body}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function BriefField({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
      <span className="eyebrow">{label}</span>
      {children}
    </div>
  );
}

function kindOf(name: string): AssetRecord["kind"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  if (["ppt", "pptx"].includes(ext)) return "powerpoint";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  return "other";
}

function Files({ presentationId }: { presentationId: string }) {
  useDatabase();
  const assets = assetRepository.list(presentationId);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-4">
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          Array.from(e.target.files ?? []).forEach((f) => assetRepository.add({ presentationId, name: f.name, kind: kindOf(f.name), size: f.size }));
          e.target.value = "";
        }}
      />
      <Button variant="outline" onClick={() => input.current?.click()}><Upload className="size-4" /> Upload files</Button>
      {assets.length === 0 ? (
        <EmptyState icon={FileText} title="No reference files yet" description="Attach reports, spreadsheets or decks — they will inform generation in the next phase." />
      ) : (
        <ul className="panel divide-y divide-border">
          {assets.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className="truncate text-foreground">{a.name}</span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                {a.kind} · {Math.max(1, Math.round(a.size / 1024))} KB
                <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => assetRepository.remove(a.id)}><Trash2 className="size-4" /></Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
