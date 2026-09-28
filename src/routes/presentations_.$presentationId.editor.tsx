import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Circle, ImagePlus, Loader2, Minus, MoveRight, Network, Play, Redo2, Shapes, Smile, Sparkles, Square, Table2, Triangle, Type, Undo2, WandSparkles, X, ZoomIn, ZoomOut, RectangleHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiProvider, type PlanRequest, type SlideRewriteAction } from "@/lib/ai";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import { SaveIndicator } from "@/components/save-indicator";
import { EditorCanvas, type Zoom } from "@/components/editor/editor-canvas";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import { SlideRail } from "@/components/editor/slide-rail";
import { IconPicker } from "@/components/editor/icon-picker";
import { readImage } from "@/components/editor/image-upload";
import { SlideStage, SlideThumb, useFitScale } from "@/components/editor/slide-renderer";
import { useEditor, type EditorApi } from "@/components/editor/use-editor";
import { usePresentation } from "@/lib/data/store";
import { SHAPE_LABELS, TEXT_PRESETS, cloneElement, iconEl, imageEl, instantiate, shapeEl, textEl } from "@/lib/editor/elements";
import { SLIDE_H, SLIDE_W, type DraftElement, type ShapeKind, type SlideElement } from "@/lib/editor/model";
import { getTheme } from "@/lib/editor/themes";
import { rebuildGeneratedContent, smartComposeSlide, tryAnotherDesign } from "@/lib/editor/composer";
import type { Presentation } from "@/lib/types";

export const Route = createFileRoute("/presentations_/$presentationId/editor")({
  validateSearch: (s: Record<string, unknown>): { slide?: string } => (typeof s["slide"] === "string" ? { slide: s["slide"] } : {}),
  head: () => ({
    meta: [
      { title: "Slide Editor — Presentation Studio" },
      { name: "description", content: "Edit slides visually: text, images, shapes and icons on a precise canvas." },
      { property: "og:title", content: "Slide Editor — Presentation Studio" },
      { property: "og:description", content: "Edit slides visually: text, images, shapes and icons on a precise canvas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditorPage,
});

function EditorPage() {
  const { presentationId } = Route.useParams();
  const { slide } = Route.useSearch();
  const p = usePresentation(presentationId);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-screen bg-background" />;
  if (!p) {
    return (
      <div className="grid h-screen place-items-center p-6">
        <EmptyState icon={Shapes} title="Presentation not found" description="It may have been deleted." action={<Button asChild><Link to="/presentations">Back to library</Link></Button>} />
      </div>
    );
  }
  return <Editor key={p.id} p={p} initialSlide={slide} />;
}

const SHAPE_ICONS: Record<ShapeKind, typeof Square> = { rect: Square, roundRect: RectangleHorizontal, ellipse: Circle, line: Minus, arrow: MoveRight, triangle: Triangle };

function Editor({ p, initialSlide }: { p: Presentation; initialSlide?: string | undefined }) {
  const api = useEditor(p, initialSlide);
  const theme = getTheme(api.themeId);
  const [zoom, setZoom] = useState<Zoom>(1);
  const zoomNum = zoom === "fill" ? 1 : zoom;
  const [previewing, setPreviewing] = useState(false);
  const [aiBusy, setAiBusy] = useState<SlideRewriteAction | null>(null);
  const smartLabel = aiProvider().name === "mock-planner" ? "Smart" : "AI";
  const clipboard = useRef<SlideElement[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const add = useCallback((drafts: DraftElement[]) => {
    const s = api.active;
    if (!s) return;
    const maxZ = Math.max(-1, ...s.elements.map((e) => e.zIndex));
    const els = instantiate(drafts, s.id, maxZ + 1);
    api.commit(api.mapElements((all) => [...all, ...els]));
    api.setSelected(els.map((e) => e.id));
  }, [api]);

  const center = (w: number, h: number): [number, number, number, number] => [Math.round((SLIDE_W - w) / 2), Math.round((SLIDE_H - h) / 2), w, h];

  const planRequest: PlanRequest = {
    topic: p.topic,
    objective: p.objective,
    purpose: p.purpose,
    audience: p.audience,
    presentationType: p.presentationType,
    language: p.language,
    tone: p.tone,
    lengthPreset: p.lengthPreset,
    slideCount: p.slides.length,
  };

  const replaceActive = useCallback((nextSlide: typeof api.active) => {
    if (!nextSlide) return;
    api.commit(api.snapshot().map((slide) => (slide.id === nextSlide.id ? nextSlide : slide)));
    api.setSelected([]);
  }, [api]);

  const rewriteActive = useCallback(async (action: SlideRewriteAction) => {
    const slide = api.active;
    if (!slide || aiBusy) return;
    setAiBusy(action);
    try {
      const rewritten = await aiProvider().rewriteSlide(planRequest, slide, action);
      replaceActive(rebuildGeneratedContent(slide, rewritten));
    } finally {
      setAiBusy(null);
    }
  }, [api.active, aiBusy, planRequest, replaceActive]);

  // Keep the URL pointing at the active slide without adding history entries.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("slide", api.activeId);
    window.history.replaceState(window.history.state, "", url);
    const i = api.slides.findIndex((s) => s.id === api.activeId);
    document.title = `${i + 1}/${api.slides.length} — ${p.title}`;
  }, [api.activeId, api.slides, p.title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (previewing || t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.closest("[role=dialog],[role=listbox],[role=menu]")) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z") { e.preventDefault(); if (e.shiftKey) api.redo(); else api.undo(); return; }
      if (mod && k === "y") { e.preventDefault(); api.redo(); return; }
      const s = api.active;
      if (!s) return;
      const sel = s.elements.filter((x) => api.selected.includes(x.id));
      if (mod && k === "a") { e.preventDefault(); api.setSelected(s.elements.filter((x) => x.visible && !x.locked).map((x) => x.id)); return; }
      if (mod && k === "c" && sel.length) { clipboard.current = sel.map((x) => structuredClone(x)); return; }
      if (mod && (k === "v" || k === "d")) {
        const src = k === "d" ? sel : clipboard.current;
        if (!src.length) return;
        e.preventDefault();
        const maxZ = Math.max(-1, ...s.elements.map((x) => x.zIndex));
        const copies = src.map((x, i) => ({ ...cloneElement(x, s.id, 24), zIndex: maxZ + 1 + i }));
        api.commit(api.mapElements((all) => [...all, ...copies]));
        api.setSelected(copies.map((c) => c.id));
        if (k === "v") clipboard.current = copies;
        return;
      }
      if ((k === "delete" || k === "backspace") && sel.length) {
        e.preventDefault();
        api.commit(api.mapElements((all) => all.filter((x) => !api.selected.includes(x.id) || x.locked)));
        api.setSelected([]);
        return;
      }
      if (k === "escape") { api.setSelected([]); return; }
      const arrows: Record<string, [number, number]> = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
      if (arrows[k] && sel.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const [dx, dy] = arrows[k]!;
        api.updateElements(sel.filter((x) => !x.locked).map((x) => x.id), (x) => ({ ...x, x: x.x + dx * step, y: x.y + dy * step }));
        return;
      }
      if (!sel.length && (k === "pagedown" || k === "pageup")) {
        const i = api.slides.findIndex((x) => x.id === api.activeId);
        const n = api.slides[i + (k === "pagedown" ? 1 : -1)];
        if (n) api.setActiveId(n.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, previewing]);

  const onUpload = async (f: File) => {
    const src = await readImage(f);
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const w = Math.min(640, img.width);
      const h = Math.round((w * img.height) / img.width);
      add([imageEl("Image", center(w, Math.min(h, 700)), { src }, undefined as never)].map((d) => ({ ...d, role: undefined })));
    };
    img.src = src;
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Mobile / small screens: preview-only. */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:hidden">
        <div className="flex items-center justify-between">
          <Link to="/presentations/$presentationId" params={{ presentationId: p.id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Back</Link>
          <Button size="sm" onClick={() => setPreviewing(true)}><Play className="size-4" /> Present</Button>
        </div>
        <p className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">The visual editor works best on a larger screen. You can review and present your slides here.</p>
        {api.slides.map((s) => <div key={s.id} className="overflow-hidden rounded-md border border-border"><SlideThumb slide={s} themeId={api.themeId} /></div>)}
      </div>

      <header className="hidden h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 lg:flex">
        <Button asChild size="icon" variant="ghost" aria-label="Back to presentation"><Link to="/presentations/$presentationId" params={{ presentationId: p.id }}><ArrowLeft className="size-4 rtl:rotate-180" /></Link></Button>
        <div className="min-w-0 max-w-64">
          <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
          <SaveIndicator state={api.save} />
        </div>
        <span className="mx-2 h-6 w-px bg-border" />
        <Button size="icon" variant="ghost" aria-label="Undo" disabled={!api.canUndo} onClick={api.undo}><Undo2 className="size-4" /></Button>
        <Button size="icon" variant="ghost" aria-label="Redo" disabled={!api.canRedo} onClick={api.redo}><Redo2 className="size-4" /></Button>
        <span className="mx-2 h-6 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!api.active || !!aiBusy}>
              {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {smartLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={() => void rewriteActive("regenerate")}>
              <Sparkles className="size-4" /> Regenerate slide content
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void rewriteActive("shorten")}>
              <Type className="size-4" /> Make content concise
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void rewriteActive("executive")}>
              <WandSparkles className="size-4" /> Executive rewrite
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => api.active && replaceActive(smartComposeSlide(api.active))}>
              <WandSparkles className="size-4" /> Smart compose
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => api.active && replaceActive(tryAnotherDesign(api.active))}>
              <Shapes className="size-4" /> Try another design
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex flex-1 items-center justify-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><Type className="size-4" /> Text</Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              {(Object.keys(TEXT_PRESETS) as (keyof typeof TEXT_PRESETS)[]).map((k) => {
                const { h, ...props } = TEXT_PRESETS[k];
                return <DropdownMenuItem key={k} onClick={() => add([textEl(k, k === "Body" ? "Add body text" : k, center(k === "Heading" ? 900 : 700, h), props)])}>{k}</DropdownMenuItem>;
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><Shapes className="size-4" /> Shape</Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              {(Object.keys(SHAPE_LABELS) as ShapeKind[]).map((k) => {
                const I = SHAPE_ICONS[k];
                const line = k === "line" || k === "arrow";
                return <DropdownMenuItem key={k} onClick={() => add([{ ...shapeEl(SHAPE_LABELS[k], k, center(line ? 320 : 240, line ? 40 : 240)), role: undefined }])}><I className="size-4" /> {SHAPE_LABELS[k]}</DropdownMenuItem>;
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <IconPicker onPick={(n) => add([{ ...iconEl(n, n, center(120, 120)), role: undefined }])}>
            <Button variant="ghost" size="sm"><Smile className="size-4" /> Icon</Button>
          </IconPicker>
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}><ImagePlus className="size-4" /> Image</Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f); e.target.value = ""; }} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><BarChart3 className="size-4" /> Data</Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              {([["chart", BarChart3, "Chart"], ["table", Table2, "Table"], ["diagram", Network, "Diagram"]] as const).map(([type, I, label]) => (
                <DropdownMenuItem key={type} onClick={() => add([{ type, name: label, ...{ x: 0, y: 0, width: 0, height: 0 }, ...box(center(720, 420)), rotation: 0, opacity: 1, locked: false, visible: true, properties: { label: `${label} placeholder` } }])}>
                  <I className="size-4" /> {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Zoom out" onClick={() => setZoom(Math.max(0.25, +(zoomNum - 0.25).toFixed(2)))}><ZoomOut className="size-4" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button className="w-14 rounded px-1 py-1 text-center text-xs text-muted-foreground hover:bg-muted" title="Zoom">{zoom === "fill" ? "Fill" : zoom === 1 ? "Fit" : `${Math.round(zoom * 100)}%`}</button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setZoom(1)}>Fit — whole slide</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setZoom("fill")}>Fill — use all space</DropdownMenuItem>
              {[0.25, 0.5, 0.75, 1.25, 1.5, 2].map((z) => <DropdownMenuItem key={z} onClick={() => setZoom(z)}>{z * 100}% of fit</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="icon" variant="ghost" aria-label="Zoom in" onClick={() => setZoom(Math.min(3, +(zoomNum + 0.25).toFixed(2)))}><ZoomIn className="size-4" /></Button>
          <Button size="sm" className="ms-2" onClick={() => setPreviewing(true)}><Play className="size-4" /> Preview</Button>
        </div>
      </header>

      <div className="hidden min-h-0 flex-1 lg:flex">
        <SlideRail api={api} themeId={api.themeId} presentationId={p.id} />
        <EditorCanvas api={api} theme={theme} zoom={zoom} />
        <PropertiesPanel api={api} theme={theme} onTheme={api.setTheme} />
      </div>

      {previewing && <Preview api={api} themeId={api.themeId} onClose={() => setPreviewing(false)} />}
    </div>
  );
}

function box([x, y, width, height]: [number, number, number, number]) {
  return { x, y, width, height };
}

function Preview({ api, themeId, onClose }: { api: EditorApi; themeId?: string | undefined; onClose: () => void }) {
  const [index, setIndex] = useState(() => Math.max(0, api.slides.findIndex((s) => s.id === api.activeId)));
  const { ref, scale } = useFitScale();
  const theme = getTheme(themeId);
  const slide = api.slides[index];

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (["ArrowRight", " ", "PageDown"].includes(e.key)) setIndex((i) => Math.min(api.slides.length - 1, i + 1));
      if (["ArrowLeft", "PageUp"].includes(e.key)) setIndex((i) => Math.max(0, i - 1));
    };
    const onFs = () => { if (!document.fullscreenElement) onClose(); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [api.slides.length, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-foreground">
      <div ref={ref} className="relative flex-1" dir="ltr">
        {slide && (
          <div style={{ position: "absolute", left: "50%", top: "50%", width: SLIDE_W, height: SLIDE_H, marginLeft: -SLIDE_W / 2, marginTop: -SLIDE_H / 2, transform: `scale(${scale})` }}>
            <SlideStage slide={slide} theme={theme} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-3 py-3 text-background">
        <Button size="icon" variant="ghost" className="text-background hover:bg-background/10 hover:text-background" onClick={() => setIndex((i) => Math.max(0, i - 1))} aria-label="Previous"><ChevronLeft className="size-5" /></Button>
        <span className="text-sm tabular-nums">{index + 1} / {api.slides.length}</span>
        <Button size="icon" variant="ghost" className="text-background hover:bg-background/10 hover:text-background" onClick={() => setIndex((i) => Math.min(api.slides.length - 1, i + 1))} aria-label="Next"><ChevronRight className="size-5" /></Button>
        <Button size="icon" variant="ghost" className="absolute end-4 text-background hover:bg-background/10 hover:text-background" onClick={onClose} aria-label="Close preview"><X className="size-5" /></Button>
      </div>
    </div>
  );
}
