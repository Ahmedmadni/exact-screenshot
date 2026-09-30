import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Circle, Download, Eye, ImagePlus, Loader2, LocateFixed, LockKeyhole, Minus, MoveRight, Network, Play, Redo2, Shapes, Smile, Sparkles, Square, Table2, Triangle, Type, Undo2, Users, WandSparkles, X, ZoomIn, ZoomOut, RectangleHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { aiProvider, type PlanRequest, type SlideRewriteAction } from "@/lib/ai";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import { SaveIndicator } from "@/components/save-indicator";
import { QualityChecker } from "@/components/quality-checker";
import { EditorCanvas, type Zoom } from "@/components/editor/editor-canvas";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import { SourcePanel } from "@/components/editor/source-panel";
import { SpeakerNotesPanel } from "@/components/editor/speaker-notes-panel";
import { EditorReviewPanel } from "@/components/review-workspace";
import { TeamReviewPanel } from "@/components/collaboration/team-review-panel";
import { SlideRail } from "@/components/editor/slide-rail";
import { IconPicker } from "@/components/editor/icon-picker";
import { readImage } from "@/components/editor/image-upload";
import { SlideStage, SlideThumb, useFitScale } from "@/components/editor/slide-renderer";
import { useEditor, type EditorApi } from "@/components/editor/use-editor";
import { assetRepository, reviewDecisionRepository, usePresentation } from "@/lib/data/store";
import { SHAPE_LABELS, TEXT_PRESETS, chartEl, cloneElement, diagramEl, iconEl, imageEl, instantiate, shapeEl, tableEl, textEl } from "@/lib/editor/elements";
import { SLIDE_H, SLIDE_W, type DraftElement, type ShapeKind, type SlideElement } from "@/lib/editor/model";
import { getTheme } from "@/lib/editor/themes";
import { rebuildGeneratedContent, smartComposeSlide, tryAnotherDesign } from "@/lib/editor/composer";
import { exportPresentationToPdf, exportPresentationToPptx, validatePresentationForExport } from "@/lib/export";
import type { AssetRecord, Presentation } from "@/lib/types";
import { sourceContextFromAssets } from "@/lib/documents/analyze";
import { useCollaborationPresence, type PresenceParticipant } from "@/lib/collaboration-presence";
import { useReadOnlyLivePresentation } from "@/lib/collaboration-live";
import {
  addEvidenceToSlide,
  createKpiSlideFromEvidence,
  createSlideFromEvidence,
  createSourcesAppendixSlides,
  evidenceFromSegment,
  removeEvidenceFromSlide,
  type NumericEvidenceFact,
  type SourceSegment,
} from "@/lib/evidence";

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
  if (p.collaboration?.enabled && (p.collaboration.role === "reviewer" || p.collaboration.role === "viewer")) {
    return <CollaborativeReadOnlyEditor p={p} />;
  }
  if (p.status === "Approved") return <ApprovedEditorLock p={p} />;
  return <Editor key={p.id} p={p} initialSlide={slide} />;
}

function ApprovedEditorLock({ p }: { p: Presentation }) {
  const reopen = () => {
    reviewDecisionRepository.apply(p, "reopened", "Reopened from the editor.", "Editor");
    toast.success("Approved version snapshotted. Editing is unlocked.");
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-4">
        <Button asChild size="icon" variant="ghost"><Link to="/presentations/$presentationId" params={{ presentationId: p.id }}><ArrowLeft className="size-4" /></Link></Button>
        <div>
          <div className="flex items-center gap-2"><LockKeyhole className="size-4 text-emerald-600" /><span className="eyebrow">Approved · read only</span></div>
          <h1 className="mt-1 text-lg text-foreground">{p.title}</h1>
        </div>
        <div className="ms-auto flex gap-2">
          <Button asChild variant="outline"><Link to="/presentations/$presentationId/presenter" params={{ presentationId: p.id }}><Play className="size-4" /> Presenter</Link></Button>
          {(!p.collaboration?.enabled || p.collaboration.role === "owner") && (
            <Button variant="outline" onClick={reopen}><LockKeyhole className="size-4" /> Reopen for editing</Button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4 text-sm text-muted-foreground">
          This approved version is locked against accidental edits. Reopening creates a snapshot of the approved state before editing resumes.
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {p.slides.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-md border border-border">
              <SlideThumb slide={item} themeId={p.themeId} themeOverrides={p.themeOverrides} />
              <div className="border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground">{item.slideNumber}. {item.title}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function CollaborativeReadOnlyEditor({ p }: { p: Presentation }) {
  useReadOnlyLivePresentation(p.id, p.collaboration);
  const [activeId, setActiveId] = useState(p.slides[0]?.id ?? "");
  const [followUserId, setFollowUserId] = useState<string | null>(null);
  const active = p.slides.find((slide) => slide.id === activeId) ?? p.slides[0];
  const participants = useCollaborationPresence({
    presentationId: p.id,
    enabled: true,
    role: p.collaboration?.role ?? "viewer",
    activeSlideId: active?.id,
  });
  const followed = participants.find((participant) => participant.userId === followUserId);

  useEffect(() => {
    if (!followed?.activeSlideId || followed.activeSlideId === activeId) return;
    if (p.slides.some((slide) => slide.id === followed.activeSlideId)) setActiveId(followed.activeSlideId);
  }, [followed?.activeSlideId, followUserId, p.slides]);

  const liveActive = active ? applyPresenceTextDrafts(active, participants) : active;
  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-4">
        <Button asChild size="icon" variant="ghost"><Link to="/presentations/$presentationId" params={{ presentationId: p.id }}><ArrowLeft className="size-4" /></Link></Button>
        <div>
          <div className="flex items-center gap-2"><Eye className="size-4 text-accent" /><span className="eyebrow capitalize">{p.collaboration?.role} · read only</span></div>
          <h1 className="mt-1 text-lg text-foreground">{p.title}</h1>
        </div>
        <div className="ms-auto flex items-center gap-3">
          <FollowMenu participants={participants} followUserId={followUserId} onFollow={setFollowUserId} />
          <PresenceStack participants={participants} />
          <TeamReviewPanel
            presentationId={p.id}
            activeSlideId={active?.id}
            role={p.collaboration?.role ?? "viewer"}
          />
          <Button asChild variant="outline"><Link to="/presentations/$presentationId" params={{ presentationId: p.id }}>Open review workspace</Link></Button>
          <Button asChild><Link to="/presentations/$presentationId/presenter" params={{ presentationId: p.id }}><Play className="size-4" /> Presenter</Link></Button>
        </div>
      </header>
      <div className="grid min-h-[calc(100vh-73px)] grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-e border-border bg-card p-3">
          <div className="space-y-2">
            {p.slides.map((slide) => (
              <button key={slide.id} onClick={() => { setFollowUserId(null); setActiveId(slide.id); }} className={"w-full overflow-hidden rounded-md border text-start " + (slide.id === active?.id ? "border-primary ring-1 ring-primary" : "border-border")}>
                <SlideThumb slide={slide} themeId={p.themeId} themeOverrides={p.themeOverrides} />
                <div className="truncate border-t border-border px-2 py-1.5 text-[11px] text-muted-foreground">{slide.slideNumber}. {slide.title}</div>
              </button>
            ))}
          </div>
        </aside>
        <main className="grid place-items-center overflow-hidden p-6">
          {liveActive && <div className="w-full max-w-5xl overflow-hidden rounded-lg border border-border shadow-sm"><SlideThumb slide={liveActive} themeId={p.themeId} themeOverrides={p.themeOverrides} /></div>}
        </main>
      </div>
    </div>
  );
}

const SHAPE_ICONS: Record<ShapeKind, typeof Square> = { rect: Square, roundRect: RectangleHorizontal, ellipse: Circle, line: Minus, arrow: MoveRight, triangle: Triangle };

function Editor({ p, initialSlide }: { p: Presentation; initialSlide?: string | undefined }) {
  const api = useEditor(p, initialSlide);
  const theme = getTheme(api.themeId, p.themeOverrides);
  const [zoom, setZoom] = useState<Zoom>(1);
  const zoomNum = zoom === "fill" ? 1 : zoom;
  const [previewing, setPreviewing] = useState(false);
  const [aiBusy, setAiBusy] = useState<SlideRewriteAction | null>(null);
  const [notesBusy, setNotesBusy] = useState(false);
  const [exporting, setExporting] = useState<"pptx" | "pdf" | null>(null);
  const [liveCursor, setLiveCursor] = useState<{ x: number; y: number } | undefined>(undefined);
  const [liveTextEdit, setLiveTextEdit] = useState<{ elementId: string; draft: string; caretStart?: number; caretEnd?: number } | undefined>(undefined);
  const [followUserId, setFollowUserId] = useState<string | null>(null);
  const smartLabel = aiProvider().name === "mock-planner" ? "Smart" : "AI";
  const clipboard = useRef<SlideElement[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const participants = useCollaborationPresence({
    presentationId: p.id,
    enabled: Boolean(p.collaboration?.enabled),
    role: p.collaboration?.role ?? "owner",
    activeSlideId: api.activeId,
    editingElementId: liveTextEdit?.elementId ?? (api.selected.length === 1 ? api.selected[0] : undefined),
    selectedElementIds: api.selected,
    editingKind: liveTextEdit ? "text" : api.selected.length === 1 ? "element" : undefined,
    textDraft: liveTextEdit?.draft,
    textCaretStart: liveTextEdit?.caretStart,
    textCaretEnd: liveTextEdit?.caretEnd,
    cursor: liveCursor,
  });
  const remoteLockedIds = participants
    .filter((participant) => !participant.isSelf && participant.activeSlideId === api.activeId && participant.editingElementId)
    .map((participant) => participant.editingElementId!);
  const followed = participants.find((participant) => participant.userId === followUserId);

  useEffect(() => {
    if (!followed?.activeSlideId || followed.activeSlideId === api.activeId) return;
    if (api.slides.some((slide) => slide.id === followed.activeSlideId)) api.setActiveId(followed.activeSlideId);
  }, [followed?.activeSlideId, followUserId, api.activeId, api.slides]);

  useEffect(() => {
    setLiveTextEdit(undefined);
  }, [api.activeId]);

  useEffect(() => {
    if (!remoteLockedIds.length || !api.selected.some((id) => remoteLockedIds.includes(id))) return;
    api.setSelected(api.selected.filter((id) => !remoteLockedIds.includes(id)));
    toast.info("A teammate is editing that element, so it has been soft-locked.");
  }, [remoteLockedIds.join("|")]);

  const add = useCallback((drafts: DraftElement[]) => {
    const s = api.active;
    if (!s) return;
    const maxZ = Math.max(-1, ...s.elements.map((e) => e.zIndex));
    const els = instantiate(drafts, s.id, maxZ + 1);
    api.commit(api.mapElements((all) => [...all, ...els]));
    api.setSelected(els.map((e) => e.id));
  }, [api]);

  const center = (w: number, h: number): [number, number, number, number] => [Math.round((SLIDE_W - w) / 2), Math.round((SLIDE_H - h) / 2), w, h];

  const sourceAssets = (p.sourceAssetIds ?? [])
    .map((id) => assetRepository.get(id))
    .filter((asset): asset is AssetRecord => !!asset);
  const activeSourceNames = (api.active?.sourceAssetIds ?? [])
    .map((id) => assetRepository.get(id)?.name)
    .filter((name): name is string => !!name);

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
    sourceContext: sourceContextFromAssets(sourceAssets) || undefined,
    sourceNames: sourceAssets.filter((asset) => asset.extractionStatus === "ready").map((asset) => asset.name),
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

  const generateActiveSpeakerNotes = useCallback(async () => {
    const slide = api.active;
    if (!slide || notesBusy) return;
    const index = api.slides.findIndex((item) => item.id === slide.id);
    setNotesBusy(true);
    try {
      const notes = await aiProvider().generateSpeakerNotes(planRequest, slide, api.slides[index + 1]);
      const stamp = new Date().toISOString();
      api.updateActiveSlide({ speakerNotes: { ...notes, updatedAt: stamp }, updatedAt: stamp });
      toast.success("Speaker notes updated.");
    } catch (error) {
      console.error(error);
      toast.error("Could not generate speaker notes.");
    } finally {
      setNotesBusy(false);
    }
  }, [api, notesBusy, planRequest]);

  const pinEvidence = useCallback((segment: SourceSegment, quote?: string) => {
    const slide = api.active;
    if (!slide) return;
    replaceActive(addEvidenceToSlide(slide, evidenceFromSegment(segment, quote ?? segment.text), true));
    toast.success(`Evidence pinned from ${segment.assetName} · ${segment.locator}`);
  }, [api.active, replaceActive]);

  const removeEvidence = useCallback((evidenceId: string) => {
    const slide = api.active;
    if (!slide) return;
    replaceActive(removeEvidenceFromSlide(slide, evidenceId));
  }, [api.active, replaceActive]);

  const createEvidenceSlide = useCallback((segment: SourceSegment) => {
    const snapshot = api.snapshot();
    const created = createSlideFromEvidence({ ...p, slides: snapshot }, segment);
    const index = snapshot.findIndex((slide) => slide.id === api.activeId);
    const insertAt = index < 0 ? snapshot.length : index + 1;
    api.commit([...snapshot.slice(0, insertAt), created, ...snapshot.slice(insertAt)]);
    api.setActiveId(created.id);
    toast.success(`Created a sourced slide from ${segment.locator}.`);
  }, [api, p]);

  const createKpiEvidenceSlide = useCallback((fact: NumericEvidenceFact) => {
    const snapshot = api.snapshot();
    const created = createKpiSlideFromEvidence({ ...p, slides: snapshot }, fact.segment, fact.value, fact.context);
    const index = snapshot.findIndex((slide) => slide.id === api.activeId);
    const insertAt = index < 0 ? snapshot.length : index + 1;
    api.commit([...snapshot.slice(0, insertAt), created, ...snapshot.slice(insertAt)]);
    api.setActiveId(created.id);
    toast.success(`Created KPI slide from ${fact.segment.locator}.`);
  }, [api, p]);

  const addSourcesAppendix = useCallback(() => {
    const snapshot = api.snapshot();
    const base = snapshot.filter((slide) => slide.purpose !== "References");
    const appendix = createSourcesAppendixSlides({ ...p, slides: base });
    if (!appendix.length) {
      toast.info("Pin at least one evidence source before creating an appendix.");
      return;
    }
    api.commit([...base, ...appendix]);
    api.setActiveId(appendix[0]!.id);
    toast.success(`Added ${appendix.length} sources appendix slide${appendix.length === 1 ? "" : "s"}.`);
  }, [api, p]);

  const exportDeck = useCallback(async (format: "pptx" | "pdf") => {
    if (exporting) return;
    const deck: Presentation = { ...p, slides: api.snapshot(), themeId: api.themeId };
    const issues = validatePresentationForExport(deck);
    const errors = issues.filter((issue) => issue.level === "error");
    if (errors.length) {
      toast.error(errors[0]!.message);
      return;
    }
    const warnings = issues.filter((issue) => issue.level === "warning");
    if (warnings.length) {
      toast.warning(`${warnings.length} export note${warnings.length === 1 ? "" : "s"} — placeholders or missing media will be kept visibly.`);
    }

    setExporting(format);
    try {
      if (format === "pptx") await exportPresentationToPptx(deck);
      else await exportPresentationToPdf(deck);
      toast.success(format === "pptx" ? "PowerPoint exported." : "PDF exported.");
    } catch (error) {
      console.error(error);
      toast.error(`Could not export ${format.toUpperCase()}. Please try again.`);
    } finally {
      setExporting(null);
    }
  }, [api, exporting, p]);

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
        {api.slides.map((s) => <div key={s.id} className="overflow-hidden rounded-md border border-border"><SlideThumb slide={s} themeId={api.themeId} themeOverrides={p.themeOverrides} /></div>)}
      </div>

      <header className="hidden h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 lg:flex">
        <Button asChild size="icon" variant="ghost" aria-label="Back to presentation"><Link to="/presentations/$presentationId" params={{ presentationId: p.id }}><ArrowLeft className="size-4 rtl:rotate-180" /></Link></Button>
        <div className="min-w-0 max-w-72">
          <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
          <div className="flex items-center gap-2">
            <SaveIndicator state={api.save} />
            {p.collaboration?.enabled && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">Live · r{api.collaborationRevision}</span>}
            {activeSourceNames.length > 0 && (
              <span className="max-w-40 truncate rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent" title={activeSourceNames.join(", ")}>
                Source · {activeSourceNames.join(", ")}
              </span>
            )}
          </div>
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
              {([
                ["chart", BarChart3, "Chart", () => chartEl("Chart", center(760, 430))],
                ["table", Table2, "Table", () => tableEl("Table", center(760, 430))],
                ["diagram", Network, "Diagram", () => diagramEl("Diagram", center(880, 360))],
              ] as const).map(([type, I, label, make]) => (
                <DropdownMenuItem key={type} onClick={() => add([make()])}>
                  <I className="size-4" /> {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1">
          {p.collaboration?.enabled && <FollowMenu participants={participants} followUserId={followUserId} onFollow={setFollowUserId} />}
          {p.collaboration?.enabled && <PresenceStack participants={participants} />}
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
          <SpeakerNotesPanel
            slide={api.active}
            busy={notesBusy}
            onGenerate={generateActiveSpeakerNotes}
            onSave={(speakerNotes) => api.updateActiveSlide({ speakerNotes, updatedAt: speakerNotes.updatedAt })}
          />
          <SourcePanel
            assets={sourceAssets}
            activeSlide={api.active}
            onPin={pinEvidence}
            onRemove={removeEvidence}
            onCreateSlide={createEvidenceSlide}
            onCreateKpi={createKpiEvidenceSlide}
            onAddSourcesAppendix={addSourcesAppendix}
            totalEvidenceCount={api.snapshot().reduce((sum, slide) => sum + (slide.evidenceRefs?.length ?? 0), 0)}
          />
          {p.collaboration?.enabled ? (
            <TeamReviewPanel
              presentationId={p.id}
              activeSlideId={api.activeId}
              selectedElementId={api.selected.length === 1 ? api.selected[0] : undefined}
              role={p.collaboration.role}
            />
          ) : (
            <EditorReviewPanel
              presentation={{ ...p, slides: api.snapshot(), themeId: api.themeId }}
              activeSlideId={api.activeId}
              selectedElementId={api.selected.length === 1 ? api.selected[0] : undefined}
            />
          )}
          <QualityChecker presentation={{ ...p, slides: api.snapshot(), themeId: api.themeId }} onSelectSlide={api.setActiveId} />
          <Button asChild size="sm" variant="outline">
            <Link to="/presentations/$presentationId/presenter" params={{ presentationId: p.id }}><Play className="size-4" /> Presenter</Link>
          </Button>
          <Button size="sm" className="ms-2" onClick={() => setPreviewing(true)}><Play className="size-4" /> Preview</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={!!exporting}>
                {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => void exportDeck("pptx")}>
                <Download className="size-4" /> PowerPoint (.pptx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportDeck("pdf")}>
                <Download className="size-4" /> PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {api.conflict && (
        <div className="hidden items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm lg:flex">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <span className="font-medium text-foreground">A teammate saved a newer revision.</span>
            <span className="ms-2 text-muted-foreground">Your local edits will be stored as a recovery snapshot before loading the latest team version.</span>
          </div>
          <Button size="sm" variant="outline" onClick={api.resolveConflict}>Load latest team version</Button>
        </div>
      )}

      <div className="hidden min-h-0 flex-1 lg:flex">
        <SlideRail
          api={api}
          themeId={api.themeId}
          themeOverrides={p.themeOverrides}
          presentationId={p.id}
          collaborators={participants}
        />
        <EditorCanvas
          api={api}
          theme={theme}
          zoom={zoom}
          collaborators={participants}
          onCursorMove={setLiveCursor}
          onTextEditingChange={setLiveTextEdit}
        />
        <PropertiesPanel api={api} theme={theme} onTheme={api.setTheme} />
      </div>

      {previewing && <Preview api={api} themeId={api.themeId} themeOverrides={p.themeOverrides} onClose={() => setPreviewing(false)} />}
    </div>
  );
}

function applyPresenceTextDrafts(slide: Presentation["slides"][number], participants: PresenceParticipant[]) {
  const drafts = participants.filter(
    (participant) =>
      !participant.isSelf &&
      participant.activeSlideId === slide.id &&
      participant.editingKind === "text" &&
      participant.editingElementId &&
      typeof participant.textDraft === "string",
  );
  if (!drafts.length) return slide;
  return {
    ...slide,
    elements: slide.elements.map((element) => {
      const editor = drafts.find((participant) => participant.editingElementId === element.id);
      if (!editor || element.type !== "text") return element;
      return { ...element, properties: { ...element.properties, text: editor.textDraft ?? element.properties.text } };
    }),
  };
}

function FollowMenu({
  participants,
  followUserId,
  onFollow,
}: {
  participants: PresenceParticipant[];
  followUserId: string | null;
  onFollow: (userId: string | null) => void;
}) {
  const others = participants
    .filter((participant) => !participant.isSelf)
    .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.email.localeCompare(b.email)));
  if (!others.length) return null;
  const followed = others.find((participant) => participant.userId === followUserId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant={followed ? "secondary" : "ghost"}>
          <LocateFixed className="size-4" />
          {followed ? "Following " + (followed.role === "owner" ? "owner" : followed.email.split("@")[0]) : "Follow"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {followed && (
          <DropdownMenuItem onClick={() => onFollow(null)}>
            <X className="size-4" /> Stop following
          </DropdownMenuItem>
        )}
        {others.map((participant) => (
          <DropdownMenuItem key={participant.userId} onClick={() => onFollow(participant.userId)}>
            <LocateFixed className="size-4" />
            <span className="min-w-0 flex-1 truncate">{participant.email}</span>
            <span className="text-[10px] capitalize text-muted-foreground">{participant.role}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PresenceStack({ participants }: { participants: ReturnType<typeof useCollaborationPresence> }) {
  if (!participants.length) return null;
  return (
    <div className="flex items-center -space-x-2 rtl:space-x-reverse" title={participants.map((item) => item.email + " · " + item.role).join("\n")}>
      {participants.slice(0, 4).map((item) => (
        <span key={item.userId} className="grid size-7 place-items-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-foreground">
          {item.email.slice(0, 1).toUpperCase()}
        </span>
      ))}
      {participants.length > 4 && <span className="grid size-7 place-items-center rounded-full border-2 border-card bg-muted text-[9px] text-muted-foreground">+{participants.length - 4}</span>}
    </div>
  );
}

function box([x, y, width, height]: [number, number, number, number]) {
  return { x, y, width, height };
}

function Preview({ api, themeId, themeOverrides, onClose }: { api: EditorApi; themeId?: string | undefined; themeOverrides?: Presentation["themeOverrides"]; onClose: () => void }) {
  const [index, setIndex] = useState(() => Math.max(0, api.slides.findIndex((s) => s.id === api.activeId)));
  const { ref, scale } = useFitScale();
  const theme = getTheme(themeId, themeOverrides);
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
