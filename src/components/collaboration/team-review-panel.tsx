import { Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CollaborationRole, ReviewComment } from "@/lib/types";
import { addTeamReviewComment, listTeamReviewComments } from "@/lib/collaboration";
import { supabase } from "@/lib/cloud/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

export function TeamReviewPanel({
  presentationId,
  activeSlideId,
  selectedElementId,
  role,
}: {
  presentationId: string;
  activeSlideId?: string;
  selectedElementId?: string;
  role: CollaborationRole;
}) {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const canComment = role === "owner" || role === "editor" || role === "reviewer";

  const refresh = async () => {
    if (!canComment) return;
    try {
      setComments(await listTeamReviewComments(presentationId));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!canComment) return;
    void refresh();
    if (!supabase) return;
    const channel = supabase
      .channel("team-review-" + presentationId)
      .on("broadcast", { event: "comment" }, () => void refresh())
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [presentationId, canComment]);

  const visible = comments.filter((comment) => !comment.resolved && (!activeSlideId || comment.slideId === activeSlideId));

  const add = async () => {
    if (!body.trim() || !activeSlideId || !canComment) return;
    setBusy(true);
    try {
      await addTeamReviewComment(presentationId, body.trim(), activeSlideId, selectedElementId);
      setBody("");
      await refresh();
      await channelRef.current?.send({ type: "broadcast", event: "comment", payload: { slideId: activeSlideId } });
      toast.success("Team review comment added.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not add team comment.");
    } finally {
      setBusy(false);
    }
  };

  if (!canComment) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageSquare className="size-4" /> Team review
          {visible.length > 0 && <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">{visible.length}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[460px] max-w-[92vw] p-0 sm:max-w-[460px]">
        <SheetHeader className="border-b border-border p-5 pe-12">
          <SheetTitle>Live team review</SheetTitle>
          <SheetDescription>
            {selectedElementId ? "Your comment will reference the selected element." : "Comments are attached to the active slide."}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-4">
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a team review comment…" />
          <div className="flex gap-2">
            <Button onClick={() => void add()} disabled={busy || !body.trim() || !activeSlideId}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />} Comment
            </Button>
            <Button size="icon" variant="ghost" aria-label="Refresh comments" onClick={() => void refresh()}>
              <RefreshCw className="size-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {visible.map((comment) => (
              <article key={comment.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-medium text-foreground">{comment.authorName}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{comment.elementId ? "Element comment" : "Slide comment"}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{comment.body}</p>
              </article>
            ))}
            {!visible.length && <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No open team comments on this slide.</div>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
