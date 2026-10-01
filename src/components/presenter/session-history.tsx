import { ClipboardCopy, HelpCircle, ListTodo, Loader2, Play, Plus, Radio, RefreshCw, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { presentationRepository } from "@/lib/data/store";
import { addTeamReviewComment, saveLivePresentation } from "@/lib/collaboration";
import { buildSessionOutcomesSlide } from "@/lib/session-outcomes";
import { Button } from "@/components/ui/button";
import {
  getActivePresentationSession,
  listPresentationSessionItems,
  listPresentationSessions,
} from "@/lib/presentation-session";
import type { Presentation, PresentationSession, PresentationSessionItem } from "@/lib/types";

export function PresentationSessionsOverview({ presentation: p }: { presentation: Presentation }) {
  const [sessions, setSessions] = useState<PresentationSession[]>([]);
  const [active, setActive] = useState<PresentationSession | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState<PresentationSessionItem[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!p.collaboration?.enabled) return;
    setBusy(true);
    try {
      const [live, history] = await Promise.all([
        getActivePresentationSession(p.id),
        listPresentationSessions(p.id, 20),
      ]);
      setActive(live);
      setSessions(history);
      const nextSelected = selectedId || live?.id || history[0]?.id || "";
      setSelectedId(nextSelected);
      if (nextSelected) setItems(await listPresentationSessionItems(nextSelected));
      else setItems([]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not load presentation sessions.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [p.id, p.collaboration?.enabled]);

  const selectSession = async (id: string) => {
    setSelectedId(id);
    setBusy(true);
    try {
      setItems(await listPresentationSessionItems(id));
    } catch (error) {
      console.error(error);
      toast.error("Could not load this session summary.");
    } finally {
      setBusy(false);
    }
  };

  if (!p.collaboration?.enabled) {
    return (
      <section className="panel border-dashed p-6">
        <div className="flex items-center gap-2"><Users className="size-5 text-muted-foreground" /><h2 className="text-base text-foreground">Live Presentation Sessions</h2></div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Enable Team Collaboration first. Sessions are restricted to presentation team members so questions, decisions and action items stay private.</p>
      </section>
    );
  }

  const selected = sessions.find((session) => session.id === selectedId) ?? (active?.id === selectedId ? active : undefined);
  const questions = items.filter((item) => item.kind === "question");
  const decisions = items.filter((item) => item.kind === "decision");
  const actions = items.filter((item) => item.kind === "action");

  const summary = useMemo(() => {
    if (!selected) return "";
    return [
      selected.title,
      selected.status === "ended" && selected.endedAt
        ? "Ended: " + new Date(selected.endedAt).toLocaleString()
        : "Status: LIVE",
      "",
      "DECISIONS",
      ...(decisions.length ? decisions.map((item) => "- " + item.body) : ["- None"]),
      "",
      "ACTION ITEMS",
      ...(actions.length ? actions.map((item) => "- " + item.body + (item.assignee ? " — " + item.assignee : "") + (item.dueDate ? " — due " + item.dueDate : "")) : ["- None"]),
      "",
      "QUESTIONS",
      ...(questions.length ? questions.map((item) => "- [" + item.status + "] " + item.body) : ["- None"]),
    ].join("\n");
  }, [selected, questions, decisions, actions]);

  return (
    <div className="space-y-5">
      <section className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <span className="eyebrow">Live room</span>
          <h2 className="mt-1 text-xl text-foreground">{active ? active.title : "No active session"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {active ? "The team can join now and will follow the presenter automatically." : p.collaboration.role === "owner" ? "Start a session from Presenter View or open the Live Room." : "The owner has not started a live session."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Refresh
          </Button>
          <Button asChild>
            <Link to="/presentations/$presentationId/session" params={{ presentationId: p.id }}>
              {active ? <Radio className="size-4" /> : <Play className="size-4" />} {active ? "Join Live Room" : p.collaboration.role === "owner" ? "Open Live Room" : "Check Live Room"}
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="panel p-4">
          <div className="mb-3 text-sm font-medium text-foreground">Session history</div>
          <div className="space-y-2">
            {sessions.length ? sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => void selectSession(session.id)}
                className={"w-full rounded-md border p-3 text-start transition " + (session.id === selectedId ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">{session.title}</span>
                  {session.status === "live" && <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE</span>}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{new Date(session.startedAt).toLocaleString()}</div>
              </button>
            )) : <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">No presentation sessions yet.</div>}
          </div>
        </div>

        <div className="space-y-4">
          {selected ? (
            <>
              <section className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="eyebrow">Session record</span>
                    <h3 className="mt-1 text-lg text-foreground">{selected.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Started {new Date(selected.startedAt).toLocaleString()}
                      {selected.endedAt ? " · ended " + new Date(selected.endedAt).toLocaleString() : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(p.collaboration?.role === "owner" || p.collaboration?.role === "editor") && p.status !== "Approved" && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          const slide = buildSessionOutcomesSlide(p, selected, items);
                          const stamp = new Date().toISOString();
                          const nextPresentation: Presentation = {
                            ...p,
                            slides: [...p.slides, slide],
                            recommendedSlideCount: p.slides.length + 1,
                            updatedAt: stamp,
                          };

                          if (p.collaboration?.enabled) {
                            try {
                              const payload = structuredClone(nextPresentation);
                              delete payload.collaboration;
                              const result = await saveLivePresentation(p.id, p.collaboration.revision, payload);
                              if (result.conflict) {
                                toast.error("The presentation changed in another session. Refresh before creating the outcomes slide.");
                                return;
                              }
                              presentationRepository.upsertCollaborative({
                                ...nextPresentation,
                                collaboration: {
                                  ...p.collaboration,
                                  revision: result.revision,
                                  liveUpdatedAt: result.updatedAt,
                                },
                              });
                            } catch (error) {
                              console.error(error);
                              toast.error(error instanceof Error ? error.message : "Could not save the outcomes slide.");
                              return;
                            }
                          } else {
                            presentationRepository.update(p.id, {
                              slides: nextPresentation.slides,
                              recommendedSlideCount: nextPresentation.recommendedSlideCount,
                            });
                          }

                          toast.success("Meeting outcomes slide created.");
                        }}
                      >
                        <Plus className="size-4" /> Create outcomes slide
                      </Button>
                    )}
                    {questions.some((item) => item.status === "open") && p.collaboration?.role !== "viewer" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const open = questions.filter((item) => item.status === "open");
                          try {
                            for (const item of open) {
                              await addTeamReviewComment(
                                p.id,
                                "[Session follow-up] " + item.body,
                                item.slideId ?? undefined,
                              );
                            }
                            toast.success(open.length + " open question" + (open.length === 1 ? "" : "s") + " sent to Team Review.");
                          } catch (error) {
                            console.error(error);
                            toast.error(error instanceof Error ? error.message : "Could not promote open questions.");
                          }
                        }}
                      >
                        <HelpCircle className="size-4" /> Send open questions to Review
                      </Button>
                    )}
                    <Button variant="outline" size="sm" disabled={!summary} onClick={() => { void navigator.clipboard?.writeText(summary); toast.success("Session summary copied."); }}>
                      <ClipboardCopy className="size-4" /> Copy summary
                    </Button>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Metric icon={HelpCircle} label="Questions" value={questions.length} detail={questions.filter((item) => item.status === "open").length + " open"} />
                  <Metric icon={ClipboardCopy} label="Decisions" value={decisions.length} detail="recorded" />
                  <Metric icon={ListTodo} label="Actions" value={actions.length} detail={actions.filter((item) => item.status !== "completed").length + " remaining"} />
                </div>
              </section>

              <div className="grid gap-4 lg:grid-cols-2">
                <ItemGroup title="Decisions" items={decisions} p={p} />
                <ItemGroup title="Action items" items={actions} p={p} />
              </div>
              <ItemGroup title="Questions" items={questions} p={p} />
            </>
          ) : (
            <section className="panel p-8 text-center text-sm text-muted-foreground">Select a session to view its meeting record.</section>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof HelpCircle; label: string; value: number; detail: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5" /> {label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function ItemGroup({ title, items, p }: { title: string; items: PresentationSessionItem[]; p: Presentation }) {
  return (
    <section className="panel p-5">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length ? items.map((item) => {
          const slide = item.slideId ? p.slides.find((candidate) => candidate.id === item.slideId) : undefined;
          return (
            <div key={item.id} className="rounded-md border border-border p-3">
              <div className="text-sm leading-relaxed text-foreground">{item.body}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {slide ? "Slide " + slide.slideNumber : "Presentation"} · {item.status}
                {item.assignee ? " · " + item.assignee : ""}
                {item.dueDate ? " · due " + item.dueDate : ""}
              </div>
            </div>
          );
        }) : <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">None recorded.</div>}
      </div>
    </section>
  );
}
