import { createFileRoute } from "@tanstack/react-router";
import { Clock3, Loader2, MessageSquare, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SlideStage, SlideThumb, useFitScale } from "@/components/editor/slide-renderer";
import { materializeSlide } from "@/lib/editor/layouts";
import { getTheme } from "@/lib/editor/themes";
import { cloudConfigured } from "@/lib/cloud/supabase";
import { addSharedReviewComment, loadSharedReview, type SharedReviewPayload } from "@/lib/review-share";
import { SLIDE_H, SLIDE_W } from "@/lib/editor/model";

export const Route = createFileRoute("/review/$token")({
  head: () => ({
    meta: [
      { title: "Presentation Review — Meridian Studio" },
      { name: "description", content: "Secure view-only presentation review." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SharedReviewPage,
});

function SharedReviewPage() {
  const { token } = Route.useParams();
  const [payload, setPayload] = useState<SharedReviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const refresh = async () => {
    if (!cloudConfigured) {
      setError("Cloud review is not configured on this deployment.");
      setLoading(false);
      return;
    }
    try {
      const data = await loadSharedReview(token);
      if (!data) setError("This review link is invalid, expired, or has been revoked.");
      else setPayload(data);
    } catch (err) {
      console.error(err);
      setError("Could not load this review link.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [token]);

  if (loading) return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (error || !payload) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="panel max-w-md p-8 text-center">
          <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 text-xl text-foreground">Review unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || "This review link is unavailable."}</p>
        </div>
      </div>
    );
  }

  const p = payload.presentation;
  const slides = p.slides.map(materializeSlide);
  const safeIndex = Math.max(0, Math.min(index, slides.length - 1));
  const slide = slides[safeIndex];
  const comments = payload.comments.filter((comment) => !comment.slideId || comment.slideId === slide?.id);

  const send = async () => {
    if (!body.trim() || !slide) return;
    setSending(true);
    try {
      const comment = await addSharedReviewComment(token, author.trim() || "External reviewer", body.trim(), slide.id);
      setPayload((current) => current ? { ...current, comments: [...current.comments, comment] } : current);
      setBody("");
    } catch (err) {
      console.error(err);
      setError("Could not submit the comment. The link may have expired.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span className="eyebrow">Secure review</span>
            </div>
            <h1 className="mt-1 text-xl text-foreground">{p.title}</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>View only</span>
            {payload.expiresAt && <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" /> Expires {new Date(payload.expiresAt).toLocaleDateString()}</span>}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[210px_minmax(0,1fr)_360px]">
        <aside className="space-y-2 lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto">
          {slides.map((item, i) => (
            <button key={item.id} onClick={() => setIndex(i)} className={"w-full overflow-hidden rounded-md border text-start transition " + (i === safeIndex ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/30")}>
              <SlideThumb slide={item} themeId={p.themeId} themeOverrides={p.themeOverrides} />
              <div className="truncate border-t border-border bg-card px-2 py-1.5 text-[11px] text-muted-foreground">{i + 1}. {item.title}</div>
            </button>
          ))}
        </aside>

        <section className="min-w-0">
          <ReviewStage slide={slide} themeId={p.themeId} themeOverrides={p.themeOverrides} />
          <div className="mt-3">
            <div className="text-sm font-medium text-foreground">{slide?.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{slide?.keyMessage}</div>
          </div>
        </section>

        <aside className="panel h-fit p-4 lg:sticky lg:top-5">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-accent" />
            <h2 className="text-sm font-medium text-foreground">Review comments</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Your comment will be attached to slide {safeIndex + 1}.</p>

          <Input className="mt-4" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" />
          <Textarea className="mt-3" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What should be changed, clarified, or approved?" />
          <Button className="mt-3 w-full" onClick={() => void send()} disabled={sending || !body.trim()}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />} Submit comment
          </Button>

          <div className="mt-5 space-y-2 border-t border-border pt-4">
            {comments.length === 0 ? (
              <div className="text-xs text-muted-foreground">No comments visible for this slide yet.</div>
            ) : comments.map((comment) => (
              <div key={comment.id} className="rounded-md border border-border p-3">
                <div className="text-xs font-medium text-foreground">{comment.authorName}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{comment.body}</p>
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

function ReviewStage({ slide, themeId, themeOverrides }: { slide?: ReturnType<typeof materializeSlide>; themeId?: string; themeOverrides?: any }) {
  const { ref, scale } = useFitScale();
  const theme = getTheme(themeId, themeOverrides);
  return (
    <div ref={ref} className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted shadow-sm" dir="ltr">
      {slide && (
        <div style={{ position:"absolute", left:"50%", top:"50%", width:SLIDE_W, height:SLIDE_H, marginLeft:-SLIDE_W/2, marginTop:-SLIDE_H/2, transform:"scale("+scale+")" }}>
          <SlideStage slide={slide} theme={theme} />
        </div>
      )}
    </div>
  );
}
