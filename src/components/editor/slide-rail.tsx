import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uid } from "@/lib/data/store";
import { buildLayout, contentFromSlide } from "@/lib/editor/layouts";
import type { PresentationThemeOverrides, Slide } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SlideThumb } from "./slide-renderer";
import type { EditorApi } from "./use-editor";
import type { PresenceParticipant } from "@/lib/collaboration-presence";

export function duplicateSlide(s: Slide): Slide {
  const id = uid();
  return { ...structuredClone(s), id, title: `${s.title}`, elements: s.elements.map((e) => ({ ...structuredClone(e), id: uid(), slideId: id })) };
}

export function SlideRail({
  api,
  themeId,
  themeOverrides,
  presentationId,
  collaborators = [],
}: {
  api: EditorApi;
  themeId?: string | undefined;
  themeOverrides?: PresentationThemeOverrides | undefined;
  presentationId: string;
  collaborators?: PresenceParticipant[];
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const slides = api.slides;

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...slides];
    const [m] = next.splice(from, 1);
    next.splice(to > from ? to - 1 : to, 0, m!);
    api.commit(next);
  };

  const addSlide = () => {
    const stamp = new Date().toISOString();
    const id = uid();
    const draft: Slide = {
      id, presentationId, slideNumber: 0, sortOrder: 0, title: "New slide", purpose: "Supporting point", slideIntent: "Solution",
      keyMessage: "Add a supporting message", contentSummary: "", visualType: "Cards", isOptional: true, elements: [], layoutId: "title-content", createdAt: stamp, updatedAt: stamp,
    };
    draft.elements = buildLayout("title-content", contentFromSlide(draft), id);
    const at = slides.findIndex((s) => s.id === api.activeId) + 1;
    const next = [...slides];
    next.splice(at, 0, draft);
    api.commit(next);
    api.setActiveId(id);
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-e border-border bg-card">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="eyebrow">{slides.length} slides</span>
        <Button size="icon" variant="ghost" className="size-7" aria-label="Add slide" onClick={addSlide}><Plus className="size-4" /></Button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-4" onDragOver={(e) => e.preventDefault()}>
        {slides.map((s, i) => (
          <div key={s.id}>
            {overIndex === i && dragIndex !== null && <div className="mb-1 h-0.5 rounded bg-primary" />}
            <div
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setOverIndex(e.clientY > r.top + r.height / 2 ? i + 1 : i); }}
              onDragEnd={() => { if (dragIndex !== null && overIndex !== null) reorder(dragIndex, overIndex); setDragIndex(null); setOverIndex(null); }}
              onClick={() => api.setActiveId(s.id)}
              className={cn("group relative flex cursor-pointer gap-2 rounded-md p-1.5", s.id === api.activeId ? "bg-accent/15" : "hover:bg-muted", dragIndex === i && "opacity-40")}
            >
              <span className="w-4 pt-1 text-end text-[11px] text-muted-foreground">{i + 1}</span>
              <div className={cn("relative flex-1 overflow-hidden rounded border", s.id === api.activeId ? "border-primary ring-1 ring-primary" : "border-border")}>
                <SlideThumb slide={s} themeId={themeId} themeOverrides={themeOverrides} />
                {collaborators.some((participant) => !participant.isSelf && participant.activeSlideId === s.id) && (
                  <div className="absolute bottom-1 end-1 flex -space-x-1.5">
                    {collaborators
                      .filter((participant) => !participant.isSelf && participant.activeSlideId === s.id)
                      .slice(0, 3)
                      .map((participant) => (
                        <span
                          key={participant.userId}
                          className="grid size-5 place-items-center rounded-full border border-background bg-foreground text-[8px] font-semibold text-background shadow"
                          title={participant.email + " · " + participant.role}
                        >
                          {participant.email.slice(0, 1).toUpperCase()}
                        </span>
                      ))}
                  </div>
                )}
              </div>
              <div className="absolute end-2 top-2 hidden gap-0.5 group-hover:flex">
                <button className="rounded bg-background/90 p-1 text-muted-foreground shadow hover:text-foreground" aria-label="Duplicate slide" onClick={(e) => { e.stopPropagation(); const copy = duplicateSlide(s); const next = [...slides]; next.splice(i + 1, 0, copy); api.commit(next); api.setActiveId(copy.id); }}>
                  <Copy className="size-3" />
                </button>
                {slides.length > 1 && (
                  <button className="rounded bg-background/90 p-1 text-muted-foreground shadow hover:text-destructive" aria-label="Delete slide" onClick={(e) => { e.stopPropagation(); const before = slides; const wasActive = api.activeId; const next = slides.filter((x) => x.id !== s.id); api.commit(next); if (s.id === api.activeId) api.setActiveId(next[Math.max(0, i - 1)]!.id); toast("Slide deleted", { action: { label: "Undo", onClick: () => { api.commit(before); api.setActiveId(s.id === wasActive ? s.id : wasActive); } } }); }}>
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {overIndex === slides.length && dragIndex !== null && <div className="h-0.5 rounded bg-primary" />}
      </div>
    </aside>
  );
}
