import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, Maximize2, Pause, Play, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { SlideStage, SlideThumb, useFitScale } from "@/components/editor/slide-renderer";
import { aiProvider, type PlanRequest } from "@/lib/ai";
import { assetRepository, presentationRepository, usePresentation } from "@/lib/data/store";
import { sourceContextFromAssets } from "@/lib/documents/analyze";
import { materializeSlide } from "@/lib/editor/layouts";
import { getTheme } from "@/lib/editor/themes";
import { generateSmartSpeakerNotes, presentationTiming } from "@/lib/presenter/coach";
import type { AssetRecord, Presentation, Slide } from "@/lib/types";
import { SLIDE_H, SLIDE_W } from "@/lib/editor/model";
import { toast } from "sonner";

export const Route = createFileRoute("/presentations_/$presentationId/presenter")({
  head: () => ({
    meta: [
      { title: "Presenter View — Meridian Studio" },
      { name: "description", content: "Presenter view with speaker notes, next slide, timing and coaching." },
    ],
  }),
  component: PresenterPage,
});

function PresenterPage() {
  const { presentationId } = Route.useParams();
  const raw = usePresentation(presentationId);
  if (!raw) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <EmptyState
          icon={Play}
          title="Presentation not found"
          description="It may have been deleted."
          action={<Button asChild><Link to="/presentations">Back to library</Link></Button>}
        />
      </div>
    );
  }
  const p: Presentation = { ...raw, slides: raw.slides.map(materializeSlide) };
  return <Presenter p={p} />;
}

function Presenter({ p }: { p: Presentation }) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const { ref, scale } = useFitScale(24);
  const theme = getTheme(p.themeId, p.themeOverrides);
  const slide = p.slides[index];
  const next = p.slides[index + 1];

  const sourceAssets = (p.sourceAssetIds ?? [])
    .map((id) => assetRepository.get(id))
    .filter((asset): asset is AssetRecord => !!asset);

  const planRequest: PlanRequest = useMemo(() => ({
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
  }), [p, sourceAssets]);

  const notes = slide
    ? slide.speakerNotes ?? generateSmartSpeakerNotes(slide, planRequest, next)
    : undefined;
  const timing = presentationTiming(p.slides);
  const targetSeconds = Math.max(60, p.estimatedDuration * 60);
  const progress = p.slides.length ? ((index + 1) / p.slides.length) * 100 : 0;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const move = useCallback((delta: number) => {
    setIndex((value) => Math.max(0, Math.min(p.slides.length - 1, value + delta)));
  }, [p.slides.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      if (["ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        move(1);
      } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        move(-1);
      } else if (event.key.toLowerCase() === "p") {
        setRunning((value) => !value);
      } else if (event.key.toLowerCase() === "r") {
        setElapsed(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const prepareMissing = async () => {
    const missing = p.slides.filter((item) => !item.speakerNotes?.talkTrack.trim());
    if (!missing.length) {
      toast.info("All slides already have speaker notes.");
      return;
    }
    setPreparing(true);
    try {
      const slides: Slide[] = [];
      for (let i = 0; i < p.slides.length; i++) {
        const current = p.slides[i]!;
        if (current.speakerNotes?.talkTrack.trim()) {
          slides.push(current);
          continue;
        }
        const generated = await aiProvider().generateSpeakerNotes(planRequest, current, p.slides[i + 1]);
        const stamp = new Date().toISOString();
        slides.push({ ...current, speakerNotes: { ...generated, updatedAt: stamp }, updatedAt: stamp });
      }
      presentationRepository.update(p.id, { slides });
      toast.success("Speaker notes prepared for the full presentation.");
    } catch (error) {
      console.error(error);
      toast.error("Could not prepare all speaker notes.");
    } finally {
      setPreparing(false);
    }
  };

  const fullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  if (!slide) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-white">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <Button asChild size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
          <Link to="/presentations/$presentationId" params={{ presentationId: p.id }} aria-label="Back to presentation">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{p.title}</div>
          <div className="text-[10px] text-white/50">Presenter View · Slide {index + 1} of {p.slides.length}</div>
        </div>

        <div className="ms-auto flex items-center gap-2">
          <div className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs tabular-nums">
            <span className={elapsed > targetSeconds ? "text-amber-300" : "text-white"}>
              {formatTime(elapsed)}
            </span>
            <span className="text-white/40"> / {formatTime(targetSeconds)}</span>
          </div>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setRunning((value) => !value)}>
            {running ? <Pause className="size-4" /> : <Play className="size-4" />} {running ? "Pause" : "Start"}
          </Button>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setElapsed(0)} aria-label="Reset timer">
            <RefreshCw className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={fullscreen} aria-label="Fullscreen">
            <Maximize2 className="size-4" />
          </Button>
        </div>
      </header>

      <div className="h-1 shrink-0 bg-white/10">
        <div className="h-full bg-white/70 transition-all" style={{ width: progress + "%" }} />
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.7fr)_420px]">
        <section className="flex min-h-0 flex-col border-e border-white/10">
          <div ref={ref} className="relative min-h-0 flex-1 overflow-hidden p-6">
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: SLIDE_W,
                height: SLIDE_H,
                marginLeft: -SLIDE_W / 2,
                marginTop: -SLIDE_H / 2,
                transform: "scale(" + scale + ")",
              }}
              dir="ltr"
            >
              <SlideStage slide={slide} theme={theme} />
            </div>
          </div>

          <div className="flex h-16 shrink-0 items-center justify-center gap-5 border-t border-white/10">
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" disabled={index === 0} onClick={() => move(-1)}>
              <ChevronLeft className="size-5" />
            </Button>
            <div className="text-xs tabular-nums text-white/60">{index + 1} / {p.slides.length}</div>
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" disabled={index === p.slides.length - 1} onClick={() => move(1)}>
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto bg-slate-900/70">
          <div className="space-y-5 p-5">
            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Current notes</div>
                <div className="flex items-center gap-1 text-[10px] text-white/45">
                  <Clock3 className="size-3" /> {formatTime(notes?.estimatedSeconds ?? 60)}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-white/90">{notes?.talkTrack || "No speaker notes yet."}</p>
            </section>

            {notes?.transition && (
              <section className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/40">Transition</div>
                <p className="text-xs leading-5 text-white/70">{notes.transition}</p>
              </section>
            )}

            {notes?.anticipatedQuestions?.length ? (
              <section>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Likely questions</div>
                <div className="space-y-2">
                  {notes.anticipatedQuestions.map((question) => (
                    <div key={question} className="rounded-md border border-white/10 p-3 text-xs leading-5 text-white/75">{question}</div>
                  ))}
                </div>
              </section>
            ) : null}

            {notes?.coachTips?.length ? (
              <section>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Coach</div>
                <ul className="space-y-2">
                  {notes.coachTips.map((tip) => (
                    <li key={tip} className="flex gap-2 text-xs leading-5 text-amber-100/80">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-300" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {notes?.sourceReminders?.length ? (
              <section>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Sources</div>
                <div className="space-y-1.5">
                  {notes.sourceReminders.map((source) => (
                    <div key={source} className="rounded bg-cyan-300/10 px-2.5 py-2 text-[11px] text-cyan-100/80">{source}</div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="border-t border-white/10 pt-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Next slide</div>
                <span className="text-[10px] text-white/40">Deck estimate {timing.minutes}m</span>
              </div>
              {next ? (
                <div className="overflow-hidden rounded-md border border-white/10 bg-white">
                  <SlideThumb slide={next} themeId={p.themeId} themeOverrides={p.themeOverrides} />
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-white/15 p-6 text-center text-xs text-white/40">End of presentation</div>
              )}
            </section>

            {p.slides.some((item) => !item.speakerNotes?.talkTrack.trim()) && (
              <Button variant="outline" className="w-full border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => void prepareMissing()} disabled={preparing}>
                {preparing ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Prepare all missing notes
              </Button>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return String(minutes).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
}
