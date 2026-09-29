import { Clock3, MessageSquareText, Mic2, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { Slide, SpeakerNotes } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function mmss(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, seconds % 60);
  return m + ":" + String(s).padStart(2, "0");
}

export function SpeakerNotesPanel({
  slide,
  onSave,
  onGenerate,
  busy,
}: {
  slide?: Slide;
  onSave: (notes: SpeakerNotes) => void;
  onGenerate: () => Promise<void>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState<SpeakerNotes | undefined>(slide?.speakerNotes);
  useEffect(() => setDraft(slide?.speakerNotes), [slide?.id, slide?.speakerNotes]);

  const saveManual = (patch: Partial<SpeakerNotes>) => {
    if (!slide) return;
    const base: SpeakerNotes = draft ?? {
      talkTrack: "",
      keyPoints: [],
      anticipatedQuestions: [],
      coachTips: [],
      sourceReminders: [],
      estimatedSeconds: 60,
      generatedBy: "manual",
      updatedAt: new Date().toISOString(),
    };
    const next: SpeakerNotes = {
      ...base,
      ...patch,
      generatedBy: "manual",
      updatedAt: new Date().toISOString(),
    };
    setDraft(next);
    onSave(next);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Mic2 className="size-4" /> Notes
          {slide?.speakerNotes?.talkTrack && (
            <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
              {Math.max(1, Math.round(slide.speakerNotes.estimatedSeconds / 60))}m
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[520px] max-w-[92vw] flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-border p-5 pe-12">
          <SheetTitle>Speaker notes & coach</SheetTitle>
          <SheetDescription>
            Prepare what to say, likely audience questions and delivery guidance for the active slide.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{slide?.title ?? "No slide selected"}</div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Clock3 className="size-3.5" />
              {draft ? mmss(draft.estimatedSeconds) : "Not generated"}
              {draft?.generatedBy && <span>· {draft.generatedBy}</span>}
            </div>
          </div>
          <Button size="sm" onClick={() => void onGenerate()} disabled={!slide || busy}>
            {busy ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {draft ? "Refresh" : "Generate"}
          </Button>
        </div>

        <Tabs defaultValue="talk" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-4 mt-4 grid grid-cols-3">
            <TabsTrigger value="talk">Talk track</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="coach">Coach</TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <TabsContent value="talk" className="mt-0 space-y-4">
              <div>
                <div className="mb-1.5 text-xs font-medium text-foreground">What to say</div>
                <Textarea
                  rows={12}
                  placeholder="Generate notes or write your own presenter talk track…"
                  value={draft?.talkTrack ?? ""}
                  onChange={(e) => setDraft((current) => ({
                    ...(current ?? {
                      talkTrack: "",
                      keyPoints: [],
                      anticipatedQuestions: [],
                      coachTips: [],
                      sourceReminders: [],
                      estimatedSeconds: 60,
                      generatedBy: "manual",
                      updatedAt: new Date().toISOString(),
                    }),
                    talkTrack: e.target.value,
                  }))}
                  onBlur={() => draft && saveManual({ talkTrack: draft.talkTrack })}
                />
              </div>

              <div>
                <div className="mb-1.5 text-xs font-medium text-foreground">Transition to next slide</div>
                <Textarea
                  rows={3}
                  value={draft?.transition ?? ""}
                  placeholder="How to move naturally into the next slide…"
                  onChange={(e) => setDraft((current) => current ? { ...current, transition: e.target.value } : current)}
                  onBlur={() => draft && saveManual({ transition: draft.transition })}
                />
              </div>

              {draft?.keyPoints?.length ? (
                <div>
                  <div className="mb-2 text-xs font-medium text-foreground">Key points</div>
                  <ul className="space-y-2">
                    {draft.keyPoints.map((point) => (
                      <li key={point} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="questions" className="mt-0 space-y-4">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                Prepare answers before presenting. Questions reflect the audience and slide intent.
              </div>
              {draft?.anticipatedQuestions?.length ? (
                <div className="space-y-2">
                  {draft.anticipatedQuestions.map((question, i) => (
                    <div key={question} className="rounded-md border border-border p-3">
                      <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <MessageSquareText className="size-3.5" /> Question {i + 1}
                      </div>
                      <p className="text-sm text-foreground">{question}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">Generate speaker notes to prepare audience questions.</div>
              )}
            </TabsContent>

            <TabsContent value="coach" className="mt-0 space-y-4">
              {draft?.coachTips?.length ? (
                <section>
                  <div className="mb-2 text-xs font-medium text-foreground">Delivery guidance</div>
                  <div className="space-y-2">
                    {draft.coachTips.map((tip) => (
                      <div key={tip} className="rounded-md border border-border p-3 text-xs leading-relaxed text-muted-foreground">{tip}</div>
                    ))}
                  </div>
                </section>
              ) : null}

              {draft?.sourceReminders?.length ? (
                <section>
                  <div className="mb-2 text-xs font-medium text-foreground">Sources to remember</div>
                  <div className="space-y-2">
                    {draft.sourceReminders.map((source) => (
                      <div key={source} className="rounded-md bg-accent/10 px-3 py-2 text-xs text-accent">{source}</div>
                    ))}
                  </div>
                </section>
              ) : null}

              {!draft?.coachTips?.length && !draft?.sourceReminders?.length ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Generate notes to see delivery coaching and source reminders.</div>
              ) : null}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
