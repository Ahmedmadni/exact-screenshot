import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, Flag, Maximize2, MonitorUp, Pause, Play, Radio, RefreshCw, Sparkles, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { SlideStage, SlideThumb, useFitScale } from "@/components/editor/slide-renderer";
import { aiProvider, type PlanRequest } from "@/lib/ai";
import { assetRepository, presentationRepository, uid, usePresentation } from "@/lib/data/store";
import { sourceContextFromAssets } from "@/lib/documents/analyze";
import { materializeSlide } from "@/lib/editor/layouts";
import { getTheme } from "@/lib/editor/themes";
import { generateSmartSpeakerNotes, presentationTiming } from "@/lib/presenter/coach";
import type { AssetRecord, Presentation, PresentationRehearsal, PresentationSession, Slide } from "@/lib/types";
import { SLIDE_H, SLIDE_W } from "@/lib/editor/model";
import { toast } from "sonner";
import { getActivePresentationSession, listPresentationSessionItems, startPresentationSession, updatePresentationSessionSlide } from "@/lib/presentation-session";
import { usePresentationSessionPresence } from "@/lib/presentation-session-presence";
import { supabase } from "@/lib/cloud/supabase";
import type { PresentationSessionItem } from "@/lib/types";

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
  const [rehearsalStartedAt, setRehearsalStartedAt] = useState<string | null>(null);
  const [slideSeconds, setSlideSeconds] = useState<Record<string, number>>({});
  const [report, setReport] = useState<PresentationRehearsal | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [audienceConnected, setAudienceConnected] = useState(false);
  const [liveSession, setLiveSession] = useState<PresentationSession | null>(null);
  const [liveItems, setLiveItems] = useState<PresentationSessionItem[]>([]);
  const [sessionBusy, setSessionBusy] = useState(false);
  const audienceChannel = useRef<BroadcastChannel | null>(null);
  const currentIndex = useRef(index);
  currentIndex.current = index;
  const { ref, scale } = useFitScale(24);
  const theme = getTheme(p.themeId, p.themeOverrides);
  const slide = p.slides[index];
  const next = p.slides[index + 1];
  const sessionParticipants = usePresentationSessionPresence({
    sessionId: liveSession?.status === "live" ? liveSession.id : undefined,
    role: "owner",
    activeSlideId: slide?.id,
    raisedHand: false,
  });
  const raisedHands = sessionParticipants.filter((participant) => participant.raisedHand);
  const openQuestions = liveItems.filter((item) => item.kind === "question" && item.status === "open");

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
    if (!p.collaboration?.enabled || p.collaboration.role !== "owner") return;
    void getActivePresentationSession(p.id)
      .then(async (active) => {
        setLiveSession(active);
        if (active) setLiveItems(await listPresentationSessionItems(active.id));
      })
      .catch((error) => console.error("Could not load active session", error));
  }, [p.id, p.collaboration?.enabled, p.collaboration?.role]);

  useEffect(() => {
    if (!liveSession?.id || !supabase) return;
    const refresh = () => {
      void listPresentationSessionItems(liveSession.id)
        .then(setLiveItems)
        .catch((error) => console.error("Could not refresh live session items", error));
    };
    const channel = supabase
      .channel("presenter-session-items-" + liveSession.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "presentation_session_items", filter: "session_id=eq." + liveSession.id },
        refresh,
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [liveSession?.id]);

  useEffect(() => {
    if (!running) return;
    const activeSlideId = slide?.id;
    const id = window.setInterval(() => {
      setElapsed((value) => value + 1);
      if (activeSlideId) {
        setSlideSeconds((current) => ({ ...current, [activeSlideId]: (current[activeSlideId] ?? 0) + 1 }));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, slide?.id]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("meridian-presenter-" + p.id);
    audienceChannel.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.type === "ready") {
        setAudienceConnected(true);
        channel.postMessage({ type: "slide", index: currentIndex.current });
      }
    };
    channel.postMessage({ type: "ping" });
    return () => {
      channel.close();
      audienceChannel.current = null;
    };
  }, [p.id]);

  useEffect(() => {
    audienceChannel.current?.postMessage({ type: "slide", index });
  }, [index]);

  const move = useCallback((delta: number) => {
    setIndex((value) => Math.max(0, Math.min(p.slides.length - 1, value + delta)));
  }, [p.slides.length]);

  useEffect(() => {
    if (!liveSession || liveSession.status !== "live" || p.collaboration?.role !== "owner") return;
    const current = p.slides[index];
    if (!current) return;
    if (liveSession.currentSlideId === current.id && liveSession.currentSlideIndex === index) return;

    const timeout = window.setTimeout(() => {
      void updatePresentationSessionSlide(liveSession.id, current.id, index)
        .then((updated) => setLiveSession((existing) => existing ? { ...updated, role: existing.role } : existing))
        .catch((error) => {
          console.error(error);
          toast.error("Live Room could not follow this slide.");
        });
    }, 80);
    return () => window.clearTimeout(timeout);
  }, [index, liveSession?.id, liveSession?.status, p.collaboration?.role]);

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
        if (!running && !rehearsalStartedAt) setRehearsalStartedAt(new Date().toISOString());
        setRunning((value) => !value);
      } else if (event.key.toLowerCase() === "r") {
        setRunning(false);
        setElapsed(0);
        setSlideSeconds({});
        setRehearsalStartedAt(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, running, rehearsalStartedAt]);

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

  const toggleRunning = () => {
    if (!running && !rehearsalStartedAt) setRehearsalStartedAt(new Date().toISOString());
    setRunning((value) => !value);
  };

  const resetRehearsal = () => {
    setRunning(false);
    setElapsed(0);
    setSlideSeconds({});
    setRehearsalStartedAt(null);
  };

  const finishRehearsal = () => {
    if (!elapsed) {
      toast.info("Start the timer before finishing a rehearsal.");
      return;
    }
    setRunning(false);
    const session: PresentationRehearsal = {
      id: uid(),
      startedAt: rehearsalStartedAt ?? new Date(Date.now() - elapsed * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      totalSeconds: elapsed,
      targetSeconds,
      slideSeconds,
      completed: index === p.slides.length - 1,
    };
    presentationRepository.update(p.id, {
      rehearsals: [session, ...(p.rehearsals ?? [])].slice(0, 20),
    });
    setReport(session);
  };

  const startLiveRoom = async () => {
    if (!p.collaboration?.enabled || p.collaboration.role !== "owner") {
      toast.error("Enable Team Collaboration before starting a Live Room.");
      return;
    }
    const current = p.slides[index];
    setSessionBusy(true);
    try {
      const active = await startPresentationSession(
        p.id,
        p.title + " — Live session",
        current?.id,
        index,
      );
      setLiveSession({ ...active, role: "owner" });
      setLiveItems([]);
      toast.success("Live Room started. Team members can join now.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not start Live Room.");
    } finally {
      setSessionBusy(false);
    }
  };

    const fullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const openAudience = () => {
    const url = window.location.origin + "/presentations/" + encodeURIComponent(p.id) + "/audience";
    const win = window.open(url, "meridian-audience-" + p.id, "popup=yes,width=1440,height=900");
    if (!win) {
      toast.error("The audience window was blocked by the browser. Allow pop-ups for this site and try again.");
      return;
    }
    window.setTimeout(() => audienceChannel.current?.postMessage({ type: "slide", index }), 500);
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
          {p.collaboration?.enabled && p.collaboration.role === "owner" && (
            liveSession?.status === "live" ? (
              <Button asChild size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                <Link to="/presentations/$presentationId/session" params={{ presentationId: p.id }}>
                  <Radio className="size-4" /> Live Room
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => void startLiveRoom()} disabled={sessionBusy}>
                {sessionBusy ? <RefreshCw className="size-4 animate-spin" /> : <Users className="size-4" />} Start Live
              </Button>
            )
          )}
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={openAudience}>
            <MonitorUp className="size-4" /> Audience
            <span className={"size-1.5 rounded-full " + (audienceConnected ? "bg-emerald-400" : "bg-white/30")} />
          </Button>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={toggleRunning}>
            {running ? <Pause className="size-4" /> : <Play className="size-4" />} {running ? "Pause" : "Start"}
          </Button>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={finishRehearsal}>
            <Flag className="size-4" /> Finish
          </Button>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={resetRehearsal} aria-label="Reset timer">
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
            {liveSession?.status === "live" && (
              <section className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
                    <span className="text-xs font-medium text-emerald-100">Live Room</span>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="h-7 text-white/70 hover:bg-white/10 hover:text-white">
                    <Link to="/presentations/$presentationId/session" params={{ presentationId: p.id }}>Open room</Link>
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded bg-white/5 p-2 text-center"><div className="text-lg font-semibold text-white">{sessionParticipants.length}</div><div className="text-[9px] text-white/40">people</div></div>
                  <div className="rounded bg-white/5 p-2 text-center"><div className="text-lg font-semibold text-amber-200">{raisedHands.length}</div><div className="text-[9px] text-white/40">hands</div></div>
                  <div className="rounded bg-white/5 p-2 text-center"><div className="text-lg font-semibold text-cyan-100">{openQuestions.length}</div><div className="text-[9px] text-white/40">open Qs</div></div>
                </div>
                {raisedHands.length > 0 && (
                  <div className="mt-2 text-[10px] text-amber-100/75">
                    Raised: {raisedHands.slice(0, 3).map((participant) => participant.email.split("@")[0]).join(", ")}
                    {raisedHands.length > 3 ? " +" + (raisedHands.length - 3) : ""}
                  </div>
                )}
                {openQuestions[0] && (
                  <div className="mt-2 rounded bg-black/20 p-2 text-[11px] leading-4 text-white/65">
                    Latest question: {openQuestions[openQuestions.length - 1]?.body}
                  </div>
                )}
              </section>
            )}
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

      <Dialog open={!!report} onOpenChange={(open) => !open && setReport(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Rehearsal report</DialogTitle>
            <DialogDescription>Timing summary for this run, saved with the presentation.</DialogDescription>
          </DialogHeader>
          {report && <RehearsalReport report={report} slides={p.slides} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RehearsalReport({ report, slides }: { report: PresentationRehearsal; slides: Slide[] }) {
  const delta = report.totalSeconds - report.targetSeconds;
  const pace = Math.abs(delta) <= report.targetSeconds * 0.1 ? "On pace" : delta > 0 ? "Over target" : "Under target";
  const ranked = Object.entries(report.slideSeconds)
    .map(([id, seconds]) => ({ slide: slides.find((item) => item.id === id), seconds }))
    .filter((item): item is { slide: Slide; seconds: number } => !!item.slide)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Actual" value={formatTime(report.totalSeconds)} />
        <Metric label="Target" value={formatTime(report.targetSeconds)} />
        <Metric label="Pace" value={pace} />
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-foreground">Slides taking the most time</div>
        <div className="space-y-2">
          {ranked.map(({ slide, seconds }) => (
            <div key={slide.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <div className="min-w-0">
                <div className="truncate text-sm text-foreground">{slide.slideNumber}. {slide.title}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{slide.slideIntent}</div>
              </div>
              <div className="shrink-0 text-sm font-medium tabular-nums text-foreground">{formatTime(seconds)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        {report.completed
          ? "You reached the final slide in this rehearsal."
          : "This run ended before the final slide. It is still saved so you can compare pacing across practice sessions."}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-lg font-semibold tabular-nums text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return String(minutes).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
}
