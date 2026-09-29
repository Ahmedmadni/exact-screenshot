import { Clock3, Gauge, Loader2, Mic2, Play, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { aiProvider, type PlanRequest } from "@/lib/ai";
import { assetRepository, presentationRepository } from "@/lib/data/store";
import { sourceContextFromAssets } from "@/lib/documents/analyze";
import { materializeSlide } from "@/lib/editor/layouts";
import { coachDeckWarnings, presentationTiming } from "@/lib/presenter/coach";
import type { AssetRecord, Presentation, Slide } from "@/lib/types";

export function PresentationCoachOverview({ presentation: p }: { presentation: Presentation }) {
  const [busy, setBusy] = useState(false);
  const slides = p.slides.map(materializeSlide);
  const timing = presentationTiming(slides);
  const notesCount = slides.filter((slide) => slide.speakerNotes?.talkTrack.trim()).length;
  const warnings = coachDeckWarnings({ ...p, slides });
  const last = p.rehearsals?.[0];

  const sourceAssets = (p.sourceAssetIds ?? [])
    .map((id) => assetRepository.get(id))
    .filter((asset): asset is AssetRecord => !!asset);

  const request: PlanRequest = {
    topic: p.topic,
    objective: p.objective,
    purpose: p.purpose,
    audience: p.audience,
    presentationType: p.presentationType,
    language: p.language,
    tone: p.tone,
    lengthPreset: p.lengthPreset,
    slideCount: slides.length,
    sourceContext: sourceContextFromAssets(sourceAssets) || undefined,
    sourceNames: sourceAssets.filter((asset) => asset.extractionStatus === "ready").map((asset) => asset.name),
  };

  const prepareMissing = async () => {
    const missing = slides.filter((slide) => !slide.speakerNotes?.talkTrack.trim());
    if (!missing.length) {
      toast.info("All slides already have speaker notes.");
      return;
    }
    setBusy(true);
    try {
      const next: Slide[] = [];
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i]!;
        if (slide.speakerNotes?.talkTrack.trim()) {
          next.push(slide);
          continue;
        }
        const notes = await aiProvider().generateSpeakerNotes(request, slide, slides[i + 1]);
        const stamp = new Date().toISOString();
        next.push({ ...slide, speakerNotes: { ...notes, updatedAt: stamp }, updatedAt: stamp });
      }
      presentationRepository.update(p.id, { slides: next });
      toast.success("Speaker notes prepared for all missing slides.");
    } catch (error) {
      console.error(error);
      toast.error("Could not prepare speaker notes.");
    } finally {
      setBusy(false);
    }
  };

  const slowest = last
    ? Object.entries(last.slideSeconds)
        .map(([id, seconds]) => ({ slide: slides.find((slide) => slide.id === id), seconds }))
        .filter((item): item is { slide: Slide; seconds: number } => !!item.slide)
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 4)
    : [];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Mic2} label="Notes coverage" value={notesCount + "/" + slides.length} detail={notesCount === slides.length ? "Ready to rehearse" : (slides.length - notesCount) + " missing"} />
        <Metric icon={Clock3} label="Estimated delivery" value={timing.minutes + " min"} detail={"Target " + p.estimatedDuration + " min"} />
        <Metric icon={Gauge} label="Rehearsals" value={String(p.rehearsals?.length ?? 0)} detail={last ? "Last " + formatTime(last.totalSeconds) : "No practice run yet"} />
        <Metric icon={Sparkles} label="Intelligence" value={aiProvider().name === "mock-planner" ? "Smart" : "Hybrid"} detail="Audience-aware coaching" />
      </section>

      <section className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <span className="eyebrow">Presentation coach</span>
          <h2 className="mt-1 text-xl text-foreground">Prepare the delivery, not just the slides</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Speaker notes, likely questions, evidence reminders and timing stay attached to each slide and export into PowerPoint notes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {notesCount < slides.length && (
            <Button variant="outline" onClick={() => void prepareMissing()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Prepare missing notes
            </Button>
          )}
          <Button asChild>
            <Link to="/presentations/$presentationId/presenter" params={{ presentationId: p.id }}>
              <Play className="size-4" /> Start Presenter View
            </Link>
          </Button>
        </div>
      </section>

      {warnings.length > 0 && (
        <section className="panel p-5">
          <div className="mb-3 flex items-center gap-2">
            <TriangleAlert className="size-4 text-amber-600" />
            <h3 className="text-sm font-medium text-foreground">Coach observations</h3>
          </div>
          <div className="space-y-2">
            {warnings.map((warning) => (
              <div key={warning} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-muted-foreground">{warning}</div>
            ))}
          </div>
        </section>
      )}

      {last && (
        <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="panel p-5">
            <span className="eyebrow">Latest rehearsal</span>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MiniMetric label="Actual" value={formatTime(last.totalSeconds)} />
              <MiniMetric label="Target" value={formatTime(last.targetSeconds)} />
              <MiniMetric label="Slides reached" value={String(Object.keys(last.slideSeconds).length)} />
              <MiniMetric label="Completed" value={last.completed ? "Yes" : "No"} />
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="text-sm font-medium text-foreground">Slides taking the most time</h3>
            <div className="mt-3 space-y-2">
              {slowest.map(({ slide, seconds }) => (
                <div key={slide.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-foreground">{slide.slideNumber}. {slide.title}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{slide.slideIntent}</div>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">{formatTime(seconds)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {(p.rehearsals?.length ?? 0) > 1 && (
        <section className="panel p-5">
          <h3 className="text-sm font-medium text-foreground">Recent rehearsal history</h3>
          <div className="mt-3 divide-y divide-border">
            {p.rehearsals!.slice(0, 8).map((session) => {
              const delta = session.totalSeconds - session.targetSeconds;
              return (
                <div key={session.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="text-sm text-foreground">{new Date(session.endedAt).toLocaleString()}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{session.completed ? "Reached final slide" : "Partial rehearsal"}</div>
                  </div>
                  <div className="text-end">
                    <div className="text-sm font-medium tabular-nums text-foreground">{formatTime(session.totalSeconds)}</div>
                    <div className={"text-[11px] " + (Math.abs(delta) <= session.targetSeconds * 0.1 ? "text-emerald-600" : delta > 0 ? "text-amber-600" : "text-muted-foreground")}>
                      {delta === 0 ? "On target" : (delta > 0 ? "+" : "") + Math.round(delta / 60) + " min"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Mic2; label: string; value: string; detail: string }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4" /><span className="text-xs">{label}</span></div>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-lg font-semibold tabular-nums text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function formatTime(seconds: number) {
  const value = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(value / 60);
  return String(minutes).padStart(2, "0") + ":" + String(value % 60).padStart(2, "0");
}
