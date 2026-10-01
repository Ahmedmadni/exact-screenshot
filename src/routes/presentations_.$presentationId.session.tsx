import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Hand,
  HelpCircle,
  ListTodo,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  Square,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { SlideStage, SlideThumb, useFitScale } from "@/components/editor/slide-renderer";
import { cloudConfigured, supabase } from "@/lib/cloud/supabase";
import { usePresentation } from "@/lib/data/store";
import { materializeSlide } from "@/lib/editor/layouts";
import { getTheme } from "@/lib/editor/themes";
import { SLIDE_H, SLIDE_W } from "@/lib/editor/model";
import {
  addPresentationSessionItem,
  endPresentationSession,
  getActivePresentationSession,
  listPresentationSessionItems,
  startPresentationSession,
  updatePresentationSessionItem,
  updatePresentationSessionSlide,
} from "@/lib/presentation-session";
import { usePresentationSessionPresence } from "@/lib/presentation-session-presence";
import type {
  CollaborationRole,
  Presentation,
  PresentationSession,
  PresentationSessionItem,
  PresentationSessionItemKind,
  Slide,
} from "@/lib/types";

export const Route = createFileRoute("/presentations_/$presentationId/session")({
  head: () => ({
    meta: [
      { title: "Live Session — Meridian Studio" },
      { name: "description", content: "Live presentation room with audience questions, decisions and action items." },
    ],
  }),
  component: PresentationSessionPage,
});

function PresentationSessionPage() {
  const { presentationId } = Route.useParams();
  const raw = usePresentation(presentationId);
  if (!raw) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <EmptyState
          icon={Users}
          title="Presentation not found"
          description="Open the invitation first if this presentation was shared with you."
          action={<Button asChild><Link to="/presentations">Back to library</Link></Button>}
        />
      </div>
    );
  }
  const p: Presentation = { ...raw, slides: raw.slides.map(materializeSlide) };
  return <SessionRoom p={p} />;
}

function SessionRoom({ p }: { p: Presentation }) {
  const initialRole: CollaborationRole = p.collaboration?.role ?? "owner";
  const [session, setSession] = useState<PresentationSession | null>(null);
  const [items, setItems] = useState<PresentationSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const [sessionTitle, setSessionTitle] = useState(p.title + " — Live session");
  const role = session?.role ?? initialRole;
  const isOwner = role === "owner";
  const canManageItems = role === "owner" || role === "editor";

  const refreshItems = useCallback(async (sessionId: string) => {
    try {
      setItems(await listPresentationSessionItems(sessionId));
    } catch (error) {
      console.error(error);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!cloudConfigured || !p.collaboration?.enabled) {
      setLoading(false);
      return;
    }
    try {
      const active = await getActivePresentationSession(p.id);
      setSession(active);
      if (active) await refreshItems(active.id);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not load live session.");
    } finally {
      setLoading(false);
    }
  }, [p.id, p.collaboration?.enabled, refreshItems]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!session?.id || !supabase) return;

    const sessionChannel = supabase
      .channel("presentation-session-row-" + session.id)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "presentation_sessions", filter: "id=eq." + session.id },
        (event) => {
          const row = event.new as Record<string, unknown>;
          setSession((current) => current ? {
            ...current,
            status: row.status === "ended" ? "ended" : "live",
            currentSlideId: typeof row.current_slide_id === "string" ? row.current_slide_id : current.currentSlideId,
            currentSlideIndex: typeof row.current_slide_index === "number" ? row.current_slide_index : current.currentSlideIndex,
            endedAt: typeof row.ended_at === "string" ? row.ended_at : current.endedAt,
            updatedAt: typeof row.updated_at === "string" ? row.updated_at : current.updatedAt,
          } : current);
        },
      )
      .subscribe();

    const itemChannel = supabase
      .channel("presentation-session-items-" + session.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "presentation_session_items", filter: "session_id=eq." + session.id },
        () => void refreshItems(session.id),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(sessionChannel);
      void supabase.removeChannel(itemChannel);
    };
  }, [session?.id, refreshItems]);

  const slides = p.slides;
  const currentIndex = session
    ? Math.max(0, Math.min(slides.length - 1, session.currentSlideIndex))
    : 0;
  const currentSlide = session?.currentSlideId
    ? slides.find((slide) => slide.id === session.currentSlideId) ?? slides[currentIndex]
    : slides[currentIndex];

  const participants = usePresentationSessionPresence({
    sessionId: session?.status === "live" ? session.id : undefined,
    role,
    activeSlideId: currentSlide?.id,
    raisedHand,
  });

  const start = async () => {
    if (!p.collaboration?.enabled) {
      toast.error("Enable Team Collaboration first so participants can join securely.");
      return;
    }
    setStarting(true);
    try {
      const created = await startPresentationSession(
        p.id,
        sessionTitle.trim() || p.title + " — Live session",
        slides[0]?.id,
        0,
      );
      setSession({ ...created, role: "owner" });
      setItems([]);
      toast.success("Live presentation session started.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not start session.");
    } finally {
      setStarting(false);
    }
  };

  const move = async (delta: number) => {
    if (!session || !isOwner) return;
    const nextIndex = Math.max(0, Math.min(slides.length - 1, currentIndex + delta));
    if (nextIndex === currentIndex) return;
    const nextSlide = slides[nextIndex];
    if (!nextSlide) return;
    try {
      const updated = await updatePresentationSessionSlide(session.id, nextSlide.id, nextIndex);
      setSession((current) => current ? { ...updated, role: current.role } : current);
    } catch (error) {
      console.error(error);
      toast.error("Could not move the live session.");
    }
  };

  const end = async () => {
    if (!session || !isOwner) return;
    setEnding(true);
    try {
      const ended = await endPresentationSession(session.id);
      setSession((current) => current ? { ...ended, role: current.role } : current);
      setRaisedHand(false);
      await refreshItems(session.id);
      toast.success("Session ended. Summary is ready.");
    } catch (error) {
      console.error(error);
      toast.error("Could not end the session.");
    } finally {
      setEnding(false);
    }
  };

  if (!cloudConfigured) {
    return (
      <SessionShell p={p}>
        <EmptyState icon={Users} title="Cloud sessions are unavailable" description="Configure Supabase before using Live Presentation Sessions." />
      </SessionShell>
    );
  }

  if (!p.collaboration?.enabled) {
    return (
      <SessionShell p={p}>
        <div className="panel mx-auto max-w-2xl p-8 text-center">
          <Users className="mx-auto size-9 text-muted-foreground" />
          <h1 className="mt-4 text-xl text-foreground">Team Collaboration is required</h1>
          <p className="mt-2 text-sm text-muted-foreground">Live Sessions are restricted to the presentation team. Enable collaboration in the Team tab first.</p>
          <Button asChild className="mt-5"><Link to="/presentations/$presentationId" params={{ presentationId: p.id }}>Open presentation settings</Link></Button>
        </div>
      </SessionShell>
    );
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!session) {
    return (
      <SessionShell p={p}>
        <div className="panel mx-auto max-w-2xl p-8 text-center">
          <Play className="mx-auto size-9 text-accent" />
          {isOwner ? (
            <>
              <h1 className="mt-4 text-2xl text-foreground">Start a live presentation session</h1>
              <p className="mt-2 text-sm text-muted-foreground">Team members will follow the current slide and can raise questions, decisions and action items in real time.</p>
              <Input className="mx-auto mt-5 max-w-md text-start" value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} />
              <Button className="mt-4" onClick={() => void start()} disabled={starting}>
                {starting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Start live session
              </Button>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-2xl text-foreground">No live session right now</h1>
              <p className="mt-2 text-sm text-muted-foreground">The presentation owner has not started a session yet.</p>
              <Button className="mt-4" variant="outline" onClick={() => void refreshSession()}><RefreshCw className="size-4" /> Check again</Button>
            </>
          )}
        </div>
      </SessionShell>
    );
  }

  if (session.status === "ended") {
    return <SessionSummary p={p} session={session} items={items} participants={participants.length} />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-white">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <Button asChild size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
          <Link to="/presentations/$presentationId" params={{ presentationId: p.id }}><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{session.title}</div>
          <div className="text-[10px] text-white/45">Live Room · {isOwner ? "Presenter" : "Following presenter"} · Slide {currentIndex + 1}/{slides.length}</div>
        </div>

        <div className="ms-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> LIVE
          </div>
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60">
            <Users className="size-3.5" /> {participants.length}
          </div>
          {!isOwner && (
            <Button
              size="sm"
              variant={raisedHand ? "default" : "ghost"}
              className={raisedHand ? "" : "text-white hover:bg-white/10 hover:text-white"}
              onClick={() => setRaisedHand((value) => !value)}
            >
              <Hand className="size-4" /> {raisedHand ? "Hand raised" : "Raise hand"}
            </Button>
          )}
          {isOwner && (
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => void end()} disabled={ending}>
              {ending ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />} End session
            </Button>
          )}
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.65fr)_430px]">
        <section className="flex min-h-0 flex-col border-e border-white/10">
          <SessionSlide slide={currentSlide} p={p} />

          <div className="flex h-16 shrink-0 items-center justify-center gap-5 border-t border-white/10">
            {isOwner ? (
              <>
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" disabled={currentIndex === 0} onClick={() => void move(-1)}>
                  <ChevronLeft className="size-5" />
                </Button>
                <div className="text-xs tabular-nums text-white/60">{currentIndex + 1} / {slides.length}</div>
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" disabled={currentIndex === slides.length - 1} onClick={() => void move(1)}>
                  <ChevronRight className="size-5" />
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-white/55"><Play className="size-3.5" /> Following presenter automatically</div>
            )}
          </div>
        </section>

        <aside className="min-h-0 overflow-hidden bg-slate-900/70">
          <SessionSidebar
            p={p}
            session={session}
            slide={currentSlide}
            role={role}
            items={items}
            participants={participants}
            canManageItems={canManageItems}
            onRefresh={() => void refreshItems(session.id)}
          />
        </aside>
      </main>
    </div>
  );
}

function SessionSidebar({
  p,
  session,
  slide,
  role,
  items,
  participants,
  canManageItems,
  onRefresh,
}: {
  p: Presentation;
  session: PresentationSession;
  slide?: Slide;
  role: CollaborationRole;
  items: PresentationSessionItem[];
  participants: ReturnType<typeof usePresentationSessionPresence>;
  canManageItems: boolean;
  onRefresh: () => void;
}) {
  const [kind, setKind] = useState<PresentationSessionItemKind>("question");
  const [body, setBody] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const canAddStructured = role === "owner" || role === "editor" || role === "reviewer";
  const visibleKinds: PresentationSessionItemKind[] = canAddStructured ? ["question", "decision", "action"] : ["question"];

  useEffect(() => {
    if (!visibleKinds.includes(kind)) setKind("question");
  }, [role]);

  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await addPresentationSessionItem({
        sessionId: session.id,
        kind,
        body: body.trim(),
        slideId: slide?.id,
        assignee: kind === "action" ? assignee.trim() || undefined : undefined,
        dueDate: kind === "action" ? dueDate || undefined : undefined,
      });
      setBody("");
      setAssignee("");
      setDueDate("");
      onRefresh();
      toast.success(kind === "question" ? "Question added." : kind === "decision" ? "Decision recorded." : "Action item added.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not add session item.");
    } finally {
      setBusy(false);
    }
  };

  const questions = items.filter((item) => item.kind === "question");
  const decisions = items.filter((item) => item.kind === "decision");
  const actions = items.filter((item) => item.kind === "action");

  return (
    <Tabs defaultValue="questions" className="flex h-full min-h-0 flex-col">
      <TabsList className="mx-4 mt-4 grid grid-cols-4 bg-white/5">
        <TabsTrigger value="questions">Q&A</TabsTrigger>
        <TabsTrigger value="decisions">Decisions</TabsTrigger>
        <TabsTrigger value="actions">Actions</TabsTrigger>
        <TabsTrigger value="people">People</TabsTrigger>
      </TabsList>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 text-white">
        <TabsContent value="questions" className="mt-0 space-y-4">
          <SessionComposer
            kind={kind}
            setKind={setKind}
            visibleKinds={visibleKinds}
            body={body}
            setBody={setBody}
            assignee={assignee}
            setAssignee={setAssignee}
            dueDate={dueDate}
            setDueDate={setDueDate}
            busy={busy}
            onSubmit={submit}
          />
          <SessionItemList items={questions} slides={p.slides} canManage={canManageItems} onRefresh={onRefresh} />
        </TabsContent>

        <TabsContent value="decisions" className="mt-0 space-y-3">
          {decisions.length ? <SessionItemList items={decisions} slides={p.slides} canManage={canManageItems} onRefresh={onRefresh} /> : <SessionEmpty icon={ClipboardCheck} text="No decisions recorded yet." />}
        </TabsContent>

        <TabsContent value="actions" className="mt-0 space-y-3">
          {actions.length ? <SessionItemList items={actions} slides={p.slides} canManage={canManageItems} onRefresh={onRefresh} /> : <SessionEmpty icon={ListTodo} text="No action items yet." />}
        </TabsContent>

        <TabsContent value="people" className="mt-0 space-y-2">
          {participants.map((participant) => (
            <div key={participant.userId} className="flex items-center gap-3 rounded-md border border-white/10 p-3">
              <span className="grid size-8 place-items-center rounded-full bg-white/10 text-xs font-semibold">{participant.email.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-white/90">{participant.email}</div>
                <div className="text-[10px] capitalize text-white/45">{participant.role}</div>
              </div>
              {participant.raisedHand && <span className="flex items-center gap-1 rounded-full bg-amber-300/15 px-2 py-1 text-[10px] text-amber-200"><Hand className="size-3" /> Raised hand</span>}
            </div>
          ))}
        </TabsContent>
      </div>
    </Tabs>
  );
}

function SessionComposer({
  kind,
  setKind,
  visibleKinds,
  body,
  setBody,
  assignee,
  setAssignee,
  dueDate,
  setDueDate,
  busy,
  onSubmit,
}: {
  kind: PresentationSessionItemKind;
  setKind: (kind: PresentationSessionItemKind) => void;
  visibleKinds: PresentationSessionItemKind[];
  body: string;
  setBody: (value: string) => void;
  assignee: string;
  setAssignee: (value: string) => void;
  dueDate: string;
  setDueDate: (value: string) => void;
  busy: boolean;
  onSubmit: () => Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {visibleKinds.map((option) => (
          <Button
            key={option}
            size="sm"
            variant={kind === option ? "secondary" : "ghost"}
            className={kind === option ? "" : "text-white/60 hover:bg-white/10 hover:text-white"}
            onClick={() => setKind(option)}
          >
            {option === "question" ? <HelpCircle className="size-3.5" /> : option === "decision" ? <ClipboardCheck className="size-3.5" /> : <ListTodo className="size-3.5" />}
            <span className="capitalize">{option}</span>
          </Button>
        ))}
      </div>
      <Textarea
        rows={3}
        className="border-white/10 bg-black/20 text-white placeholder:text-white/30"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={kind === "question" ? "Ask a question about this slide…" : kind === "decision" ? "Record the decision…" : "Add the agreed action item…"}
      />
      {kind === "action" && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input className="border-white/10 bg-black/20 text-white placeholder:text-white/30" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Assignee" />
          <Input className="border-white/10 bg-black/20 text-white" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      )}
      <Button className="mt-3 w-full" size="sm" disabled={!body.trim() || busy} onClick={() => void onSubmit()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />} Add to session
      </Button>
    </div>
  );
}

function SessionItemList({
  items,
  slides,
  canManage,
  onRefresh,
}: {
  items: PresentationSessionItem[];
  slides: Slide[];
  canManage: boolean;
  onRefresh: () => void;
}) {
  if (!items.length) return <SessionEmpty icon={MessageSquare} text="Nothing recorded yet." />;
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const slide = item.slideId ? slides.find((candidate) => candidate.id === item.slideId) : undefined;
        return (
          <article key={item.id} className="rounded-md border border-white/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-medium text-white/90">{item.actorEmail || "Team member"}</div>
                <div className="mt-0.5 text-[10px] text-white/40">
                  {slide ? "Slide " + slide.slideNumber : "Presentation"} · {new Date(item.createdAt).toLocaleTimeString()}
                </div>
              </div>
              <span className={"rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wide " + (item.status === "open" ? "bg-amber-300/10 text-amber-200" : "bg-emerald-300/10 text-emerald-200")}>{item.status}</span>
            </div>
            <p className="mt-2 text-sm leading-5 text-white/75">{item.body}</p>
            {item.assignee && <div className="mt-2 text-[11px] text-white/45">Owner: {item.assignee}{item.dueDate ? " · Due " + item.dueDate : ""}</div>}
            {item.resolution && <div className="mt-2 rounded bg-white/5 p-2 text-xs text-white/60">{item.resolution}</div>}
            {canManage && item.status === "open" && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 text-white/60 hover:bg-white/10 hover:text-white"
                onClick={async () => {
                  try {
                    await updatePresentationSessionItem({
                      itemId: item.id,
                      status: item.kind === "question" ? "answered" : "completed",
                    });
                    onRefresh();
                  } catch (error) {
                    console.error(error);
                    toast.error("Could not update this session item.");
                  }
                }}
              >
                <CheckCircle2 className="size-3.5" /> {item.kind === "question" ? "Mark answered" : "Mark complete"}
              </Button>
            )}
          </article>
        );
      })}
    </div>
  );
}

function SessionSummary({
  p,
  session,
  items,
}: {
  p: Presentation;
  session: PresentationSession;
  items: PresentationSessionItem[];
  participants: number;
}) {
  const questions = items.filter((item) => item.kind === "question");
  const decisions = items.filter((item) => item.kind === "decision");
  const actions = items.filter((item) => item.kind === "action");
  const durationMinutes = Math.max(1, Math.round((new Date(session.endedAt ?? session.updatedAt).getTime() - new Date(session.startedAt).getTime()) / 60000));

  const summaryText = useMemo(() => {
    const lines = [
      session.title,
      "Duration: " + durationMinutes + " minutes",
      "",
      "DECISIONS",
      ...(decisions.length ? decisions.map((item) => "- " + item.body) : ["- None"]),
      "",
      "ACTION ITEMS",
      ...(actions.length ? actions.map((item) => "- " + item.body + (item.assignee ? " — " + item.assignee : "") + (item.dueDate ? " — due " + item.dueDate : "")) : ["- None"]),
      "",
      "QUESTIONS",
      ...(questions.length ? questions.map((item) => "- [" + item.status + "] " + item.body) : ["- None"]),
    ];
    return lines.join("\n");
  }, [session.title, durationMinutes, decisions, actions, questions]);

  return (
    <SessionShell p={p}>
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="eyebrow">Session summary</span>
              <h1 className="mt-1 text-2xl text-foreground">{session.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Ended {session.endedAt ? new Date(session.endedAt).toLocaleString() : "recently"} · {durationMinutes} min</p>
            </div>
            <Button variant="outline" onClick={() => { void navigator.clipboard?.writeText(summaryText); toast.success("Session summary copied."); }}>
              <ClipboardCheck className="size-4" /> Copy summary
            </Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryMetric label="Questions" value={String(questions.length)} detail={questions.filter((item) => item.status === "open").length + " open"} />
            <SummaryMetric label="Decisions" value={String(decisions.length)} detail="Captured in meeting" />
            <SummaryMetric label="Action items" value={String(actions.length)} detail={actions.filter((item) => item.status !== "completed").length + " remaining"} />
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <SummarySection title="Decisions" icon={ClipboardCheck} items={decisions} slides={p.slides} />
          <SummarySection title="Action items" icon={ListTodo} items={actions} slides={p.slides} />
        </div>
        <SummarySection title="Questions" icon={HelpCircle} items={questions} slides={p.slides} />
      </div>
    </SessionShell>
  );
}

function SummarySection({
  title,
  icon: Icon,
  items,
  slides,
}: {
  title: string;
  icon: typeof HelpCircle;
  items: PresentationSessionItem[];
  slides: Slide[];
}) {
  return (
    <section className="panel p-5">
      <div className="flex items-center gap-2"><Icon className="size-4 text-accent" /><h2 className="text-base text-foreground">{title}</h2></div>
      <div className="mt-4 space-y-2">
        {items.length ? items.map((item) => {
          const slide = item.slideId ? slides.find((candidate) => candidate.id === item.slideId) : undefined;
          return (
            <div key={item.id} className="rounded-md border border-border p-3">
              <div className="text-sm text-foreground">{item.body}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {slide ? "Slide " + slide.slideNumber : "Presentation"}
                {item.assignee ? " · " + item.assignee : ""}
                {item.dueDate ? " · due " + item.dueDate : ""}
                {" · " + item.status}
              </div>
            </div>
          );
        }) : <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">None recorded.</div>}
      </div>
    </section>
  );
}

function SummaryMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-md border border-border p-4"><div className="text-2xl font-semibold text-foreground">{value}</div><div className="mt-1 text-xs text-muted-foreground">{label} · {detail}</div></div>;
}

function SessionEmpty({ icon: Icon, text }: { icon: typeof MessageSquare; text: string }) {
  return <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-xs text-white/40"><Icon className="mx-auto mb-2 size-5" />{text}</div>;
}

function SessionSlide({ slide, p }: { slide?: Slide; p: Presentation }) {
  const { ref, scale } = useFitScale(24);
  const theme = getTheme(p.themeId, p.themeOverrides);
  return (
    <div ref={ref} className="relative min-h-0 flex-1 overflow-hidden p-6">
      {slide && (
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
      )}
    </div>
  );
}

function SessionShell({ p, children }: { p: Presentation; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card px-5 py-4">
        <Button asChild size="icon" variant="ghost"><Link to="/presentations/$presentationId" params={{ presentationId: p.id }}><ArrowLeft className="size-4" /></Link></Button>
        <div><span className="eyebrow">Live session</span><div className="text-sm font-medium text-foreground">{p.title}</div></div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
