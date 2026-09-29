import { Check, CheckCircle2, Copy, GitCompare, History, Link2, Loader2, MessageSquare, RefreshCw, RotateCcw, Send, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Presentation, PresentationVersion } from "@/lib/types";
import {
  reviewCommentRepository,
  reviewDecisionRepository,
  useDatabase,
  databaseSnapshot,
  replaceDatabase,
  versionRepository,
} from "@/lib/data/store";
import { cloudConfigured } from "@/lib/cloud/supabase";
import { syncDatabaseWithCloud } from "@/lib/cloud/sync";
import { createReviewShare, listReviewShares, revokeReviewShare, type ReviewShareMeta } from "@/lib/review-share";
import { compareVersionToPresentation, versionDiffSummary } from "@/lib/review";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

export function ReviewWorkspace({ presentation: p }: { presentation: Presentation }) {
  useDatabase();
  const comments = reviewCommentRepository.list(p.id);
  const decisions = reviewDecisionRepository.list(p.id);
  const versions = versionRepository.list(p.id);
  const unresolved = comments.filter((comment) => !comment.resolved);
  const [body, setBody] = useState("");
  const [slideId, setSlideId] = useState("__deck");
  const [author, setAuthor] = useState("Reviewer");
  const [decisionNote, setDecisionNote] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState(versions[0]?.id ?? "");

  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? versions[0];
  const diff = selectedVersion ? compareVersionToPresentation(selectedVersion, p) : undefined;

  const addComment = () => {
    if (!body.trim()) return;
    reviewCommentRepository.add({
      presentationId: p.id,
      slideId: slideId === "__deck" ? undefined : slideId,
      authorName: author.trim() || "Reviewer",
      body: body.trim(),
    });
    setBody("");
    toast.success("Review comment added.");
  };

  const decision = (action: "submitted" | "changes_requested" | "approved" | "reopened") => {
    reviewDecisionRepository.apply(p, action, decisionNote.trim(), author.trim() || "Reviewer");
    setDecisionNote("");
    toast.success(action === "submitted" ? "Submitted for review." : action === "approved" ? "Presentation approved." : action === "reopened" ? "Presentation reopened for editing." : "Changes requested.");
  };

  const snapshot = () => {
    const version = versionRepository.create(p, "Manual snapshot");
    setSelectedVersionId(version.id);
    toast.success("Version snapshot created.");
  };

  const restore = (version: PresentationVersion) => {
    if (!window.confirm("Restore this version? The current presentation will be replaced, but you can create a snapshot first.")) return;
    versionRepository.create(p, "Before restore");
    versionRepository.restore(version.id);
    toast.success("Version restored.");
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Open comments" value={String(unresolved.length)} detail={comments.length + " total"} />
        <Metric label="Versions" value={String(versions.length)} detail={versions[0] ? new Date(versions[0].createdAt).toLocaleString() : "No snapshots yet"} />
        <Metric label="Review status" value={p.status} detail={decisions[0] ? "Last action by " + decisions[0].actorName : "No review decision yet"} />
      </section>

      <section className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow">Review workflow</span>
            <h2 className="mt-1 text-xl text-foreground">Move the deck through a controlled review</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Every submission, request for changes and approval creates a version snapshot automatically.
            </p>
          </div>
          <Button variant="outline" onClick={snapshot}><History className="size-4" /> Create snapshot</Button>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <Textarea rows={3} placeholder="Optional review note…" value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} />
          <div className="flex flex-wrap items-start gap-2 lg:flex-col">
            {p.status === "Approved" ? (
              <Button variant="outline" onClick={() => decision("reopened")}><RotateCcw className="size-4" /> Reopen for editing</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => decision("submitted")}><Send className="size-4" /> Submit for review</Button>
                <Button variant="outline" onClick={() => decision("changes_requested")}><XCircle className="size-4" /> Request changes</Button>
                <Button onClick={() => decision("approved")}><CheckCircle2 className="size-4" /> Approve</Button>
              </>
            )}
          </div>
        </div>
      </section>

      <ReviewShareControls presentationId={p.id} />

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="panel p-5">
          <h3 className="text-sm font-medium text-foreground">Add review comment</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Reviewer name" />
            <Select value={slideId} onValueChange={setSlideId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__deck">Whole presentation</SelectItem>
                {p.slides.map((slide) => <SelectItem key={slide.id} value={slide.id}>Slide {slide.slideNumber} · {slide.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Textarea className="mt-3" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What should be changed or clarified?" />
          <Button className="mt-3" onClick={addComment} disabled={!body.trim()}><MessageSquare className="size-4" /> Add comment</Button>

          <div className="mt-5 space-y-2">
            {comments.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No review comments yet.</div>
            ) : comments.map((comment) => {
              const slide = comment.slideId ? p.slides.find((item) => item.id === comment.slideId) : undefined;
              return (
                <div key={comment.id} className={"rounded-md border p-3 " + (comment.resolved ? "border-border bg-muted/20 opacity-70" : "border-border")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-foreground">{comment.authorName}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {slide ? "Slide " + slide.slideNumber + " · " + slide.title : "Whole presentation"}
                        {comment.elementId ? " · element comment" : ""}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => reviewCommentRepository.update(comment.id, { resolved: !comment.resolved })}>
                      {comment.resolved ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
                      {comment.resolved ? "Reopen" : "Resolve"}
                    </Button>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{comment.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">Version comparison</h3>
                <p className="mt-1 text-xs text-muted-foreground">Compare a saved snapshot with the current working deck.</p>
              </div>
              <GitCompare className="size-5 text-muted-foreground" />
            </div>
            {versions.length ? (
              <>
                <Select value={selectedVersion?.id ?? ""} onValueChange={setSelectedVersionId}>
                  <SelectTrigger className="mt-4"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {versions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>{version.label} · {new Date(version.createdAt).toLocaleString()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {diff && selectedVersion && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-md bg-muted/40 p-3 text-sm text-foreground">{versionDiffSummary(diff)}</div>
                    {diff.changedSlides.slice(0, 8).map(({ after, fields }) => (
                      <div key={after.id} className="flex items-start justify-between gap-3 border-b border-border pb-2 text-xs">
                        <span className="min-w-0 truncate text-foreground">Slide {after.slideNumber} · {after.title}</span>
                        <span className="shrink-0 text-muted-foreground">{fields.join(", ")}</span>
                      </div>
                    ))}
                    <Button variant="outline" onClick={() => restore(selectedVersion)}><RotateCcw className="size-4" /> Restore this version</Button>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Create a snapshot or submit the presentation for review to start version history.</div>
            )}
          </div>

          <div className="panel p-5">
            <h3 className="text-sm font-medium text-foreground">Decision history</h3>
            <div className="mt-3 space-y-3">
              {decisions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No review decisions yet.</div>
              ) : decisions.map((item) => (
                <div key={item.id} className="border-s border-border ps-3">
                  <div className="text-xs font-medium capitalize text-foreground">{item.action.replaceAll("_", " ")}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{item.actorName} · {new Date(item.createdAt).toLocaleString()}</div>
                  {item.note && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function EditorReviewPanel({
  presentation,
  activeSlideId,
  selectedElementId,
}: {
  presentation: Presentation;
  activeSlideId?: string;
  selectedElementId?: string;
}) {
  useDatabase();
  const [body, setBody] = useState("");
  const comments = reviewCommentRepository.list(presentation.id).filter((comment) => comment.slideId === activeSlideId);
  const open = comments.filter((comment) => !comment.resolved);

  const add = () => {
    if (!body.trim() || !activeSlideId) return;
    reviewCommentRepository.add({
      presentationId: presentation.id,
      slideId: activeSlideId,
      elementId: selectedElementId,
      authorName: "Reviewer",
      body: body.trim(),
    });
    setBody("");
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageSquare className="size-4" /> Review
          {open.length > 0 && <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">{open.length}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[460px] max-w-[92vw] p-0 sm:max-w-[460px]">
        <SheetHeader className="border-b border-border p-5 pe-12">
          <SheetTitle>Slide review</SheetTitle>
          <SheetDescription>
            {selectedElementId ? "New comments will be attached to the selected element." : "Comments are attached to the active slide."}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-4">
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a review comment…" />
          <Button onClick={add} disabled={!body.trim() || !activeSlideId}><MessageSquare className="size-4" /> Add comment</Button>
          <div className="space-y-2">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">{comment.elementId ? "Element comment" : "Slide comment"}</span>
                  <Button size="sm" variant="ghost" onClick={() => reviewCommentRepository.update(comment.id, { resolved: !comment.resolved })}>
                    {comment.resolved ? "Reopen" : "Resolve"}
                  </Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{comment.body}</p>
              </div>
            ))}
            {!comments.length && <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No comments on this slide.</div>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReviewShareControls({ presentationId }: { presentationId: string }) {
  const [shares, setShares] = useState<ReviewShareMeta[]>([]);
  const [busy, setBusy] = useState<"create" | "sync" | string | null>(null);
  const [latestUrl, setLatestUrl] = useState("");

  const load = async () => {
    if (!cloudConfigured) return;
    try {
      setShares(await listReviewShares(presentationId));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { void load(); }, [presentationId]);

  if (!cloudConfigured) {
    return (
      <section className="panel border-dashed p-5">
        <div className="flex items-center gap-2">
          <Link2 className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">External review links</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Configure Supabase in Settings to create secure cross-browser review links. Local comments and version history continue to work without cloud setup.</p>
      </section>
    );
  }

  const create = async () => {
    setBusy("create");
    try {
      const synced = await syncDatabaseWithCloud(databaseSnapshot());
      replaceDatabase(synced.database);
      const share = await createReviewShare(presentationId, 7);
      setLatestUrl(share.url);
      await navigator.clipboard?.writeText(share.url);
      toast.success("Secure 7-day review link created and copied.");
      await load();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not create review link.");
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy("sync");
    try {
      const result = await syncDatabaseWithCloud(databaseSnapshot());
      replaceDatabase(result.database);
      toast.success("Review feedback synced.");
      await load();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not sync review feedback.");
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (id: string) => {
    setBusy(id);
    try {
      await revokeReviewShare(id);
      toast.success("Review link revoked.");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Could not revoke review link.");
    } finally {
      setBusy(null);
    }
  };

  const active = shares.filter((share) => !share.revoked_at && (!share.expires_at || new Date(share.expires_at).getTime() > Date.now()));

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="eyebrow">External collaboration</span>
          <h3 className="mt-1 text-base text-foreground">Secure review links</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">Reviewers see slides only—never speaker notes or rehearsal data—and can leave slide-level comments without an account.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void sync()} disabled={!!busy}>
            {busy === "sync" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Sync feedback
          </Button>
          <Button onClick={() => void create()} disabled={!!busy}>
            {busy === "create" ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Create 7-day link
          </Button>
        </div>
      </div>

      {latestUrl && (
        <div className="mt-4 flex gap-2">
          <Input value={latestUrl} readOnly className="font-mono text-xs" />
          <Button size="icon" variant="outline" aria-label="Copy review link" onClick={() => { void navigator.clipboard?.writeText(latestUrl); toast.success("Review link copied."); }}>
            <Copy className="size-4" />
          </Button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {active.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No active review links.</div>
        ) : active.map((share) => (
          <div key={share.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
            <div>
              <div className="text-xs font-medium text-foreground">Active review link</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                Created {new Date(share.created_at).toLocaleString()}
                {share.expires_at ? " · expires " + new Date(share.expires_at).toLocaleString() : ""}
              </div>
            </div>
            <Button size="sm" variant="ghost" disabled={busy === share.id} onClick={() => void revoke(share.id)}>
              {busy === share.id ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />} Revoke
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="panel p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 truncate text-xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}
