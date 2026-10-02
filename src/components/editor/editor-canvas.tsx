import { useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { SLIDE_H, SLIDE_W, type SlideElement } from "@/lib/editor/model";
import type { SlideTheme } from "@/lib/editor/themes";
import { resolveColor, resolveFont } from "@/lib/editor/themes";
import type { Slide } from "@/lib/types";
import { ElementBody, elementBoxStyle, slideBackground, useFitScale } from "./slide-renderer";
import { renderedFinancialElements } from "@/lib/editor/variance";
import type { EditorApi } from "./use-editor";
import type { PresenceParticipant } from "@/lib/collaboration-presence";
import { canStartEditorGesture, isActiveEditorPointer } from "@/lib/editor/pointer-gesture";

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const HANDLE_POS: Record<Handle, [number, number]> = {
  nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5],
};
const CURSOR: Record<Handle, string> = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize" };

interface Guide { axis: "x" | "y"; pos: number }

export type Zoom = number | "fill";

export function EditorCanvas({
  api,
  theme,
  zoom,
  collaborators = [],
  onCursorMove,
  onTextEditingChange,
}: {
  api: EditorApi;
  theme: SlideTheme;
  zoom: Zoom;
  collaborators?: PresenceParticipant[];
  onCursorMove?: (cursor?: { x: number; y: number }) => void;
  onTextEditingChange?: (state?: { elementId: string; draft: string; caretStart?: number; caretEnd?: number }) => void;
}) {
  const { ref, scale: fit, fillScale } = useFitScale(40);
  const scale = zoom === "fill" ? fillScale : fit * zoom;
  const stageRef = useRef<HTMLDivElement>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const lastCursorAt = useRef(0);
  const slide = api.active;
  const remoteOnSlide = collaborators.filter((participant) => !participant.isSelf && participant.activeSlideId === slide?.id);
  const remoteLock = (elementId: string) => remoteOnSlide.find((participant) => participant.editingElementId === elementId);
  const remoteDraft = (elementId: string) =>
    remoteOnSlide.find((participant) => participant.editingElementId === elementId && participant.editingKind === "text" && typeof participant.textDraft === "string");

  // Text never silently disappears: boxes grow to fit their content.
  useLayoutEffect(() => {
    if (!slide || !stageRef.current) return;
    const grow: Record<string, number> = {};
    for (const el of slide.elements) {
      if (el.type !== "text" || !el.visible || el.id === editingId) continue;
      const node = stageRef.current.querySelector<HTMLElement>(`[data-text-content="${el.id}"]`);
      if (!node) continue;
      const needed = Math.ceil(node.offsetHeight);
      if (needed > el.height + 1) grow[el.id] = needed;
    }
    if (Object.keys(grow).length) {
      api.silentUpdate(api.mapElements((els) => els.map((e) => (grow[e.id] ? { ...e, height: grow[e.id]! } : e))));
    }
  });

  if (!slide) return <div ref={ref} className="flex-1" />;

  const toLogical = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  const track = (
    pointerId: number,
    onMove: (e: PointerEvent) => void,
    onUp: (e: PointerEvent) => void,
    onCancel: (e: PointerEvent) => void = onUp,
  ) => {
    const move = (event: PointerEvent) => {
      if (isActiveEditorPointer(pointerId, event)) onMove(event);
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
    };
    const finish = (event: PointerEvent) => {
      if (!isActiveEditorPointer(pointerId, event)) return;
      cleanup();
      onUp(event);
    };
    const cancel = (event: PointerEvent) => {
      if (!isActiveEditorPointer(pointerId, event)) return;
      cleanup();
      onCancel(event);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
  };

  const startMove = (e: RPointerEvent, el: SlideElement) => {
    if (!canStartEditorGesture(e)) return;
    e.stopPropagation();
    if (editingId === el.id || remoteLock(el.id)) return;
    let ids = api.selected;
    if (e.shiftKey) {
      ids = ids.includes(el.id) ? ids.filter((i) => i !== el.id) : [...ids, el.id];
      api.setSelected(ids);
      return;
    }
    if (!ids.includes(el.id)) {
      ids = [el.id];
      api.setSelected(ids);
    }
    const base = api.snapshot();
    const movers = slide.elements.filter((x) => ids.includes(x.id) && !x.locked);
    if (!movers.length) return;
    const starts = new Map(movers.map((m) => [m.id, { x: m.x, y: m.y }]));
    const bx = Math.min(...movers.map((m) => m.x));
    const by = Math.min(...movers.map((m) => m.y));
    const bw = Math.max(...movers.map((m) => m.x + m.width)) - bx;
    const bh = Math.max(...movers.map((m) => m.y + m.height)) - by;
    const others = slide.elements.filter((x) => !starts.has(x.id) && x.visible);
    const tx = [0, SLIDE_W / 2, SLIDE_W, ...others.flatMap((o) => [o.x, o.x + o.width / 2, o.x + o.width])];
    const ty = [0, SLIDE_H / 2, SLIDE_H, ...others.flatMap((o) => [o.y, o.y + o.height / 2, o.y + o.height])];
    const origin = toLogical(e);
    let moved = false;
    track(
      e.pointerId,
      (ev) => {
        const p = toLogical(ev);
        let dx = p.x - origin.x;
        let dy = p.y - origin.y;
        if (!moved && Math.hypot(dx, dy) * scale < 3) return;
        moved = true;
        const g: Guide[] = [];
        if (!ev.altKey) {
          const th = 6 / scale;
          const snap = (targets: number[], sources: number[]) => {
            let best: { d: number; t: number } | null = null;
            for (const t of targets) for (const s of sources) {
              const d = t - s;
              if (Math.abs(d) < th && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t };
            }
            return best;
          };
          const sx = snap(tx, [bx + dx, bx + dx + bw / 2, bx + dx + bw]);
          if (sx) { dx += sx.d; g.push({ axis: "x", pos: sx.t }); }
          const sy = snap(ty, [by + dy, by + dy + bh / 2, by + dy + bh]);
          if (sy) { dy += sy.d; g.push({ axis: "y", pos: sy.t }); }
        }
        // Keep the moving group inside the logical slide.
        dx = Math.min(Math.max(dx, -bx), SLIDE_W - bw - bx);
        dy = Math.min(Math.max(dy, -by), SLIDE_H - bh - by);
        setGuides(g);
        api.setLive(api.mapElements((els) => els.map((x) => {
          const s = starts.get(x.id);
          return s ? { ...x, x: Math.round(s.x + dx), y: Math.round(s.y + dy) } : x;
        }), base));
      },
      () => {
        setGuides([]);
        if (moved) api.commit(api.snapshot(), base);
      },
      () => { setGuides([]); api.setLive(base); },
    );
  };

  const startResize = (e: RPointerEvent, el: SlideElement, h: Handle) => {
    if (!canStartEditorGesture(e)) return;
    e.stopPropagation();
    if (remoteLock(el.id)) return;
    const base = api.snapshot();
    const origin = toLogical(e);
    const s0 = { x: el.x, y: el.y, w: el.width, h: el.height };
    const ratio = s0.w / s0.h;
    const keepRatio = el.type === "image" || el.type === "icon";
    const rad = (el.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const MIN_W = 8;
    const MIN_H = 4;
    track(
      e.pointerId,
      (ev) => {
        const p = toLogical(ev);
        const wx = p.x - origin.x;
        const wy = p.y - origin.y;
        // Pointer delta in the element's own (unrotated) frame.
        const dx = wx * cos + wy * sin;
        const dy = -wx * sin + wy * cos;
        let left = -s0.w / 2;
        let right = s0.w / 2;
        let top = -s0.h / 2;
        let bottom = s0.h / 2;
        if (h.includes("e")) right = Math.max(left + MIN_W, right + dx);
        if (h.includes("w")) left = Math.min(right - MIN_W, left + dx);
        if (h.includes("s")) bottom = Math.max(top + MIN_H, bottom + dy);
        if (h.includes("n")) top = Math.min(bottom - MIN_H, top + dy);
        if (keepRatio !== ev.shiftKey && h.length === 2) {
          const nh = (right - left) / ratio;
          if (h.includes("n")) top = bottom - nh;
          else bottom = top + nh;
        }
        const w = right - left;
        const hh = bottom - top;
        const lcx = (left + right) / 2;
        const lcy = (top + bottom) / 2;
        const cx = s0.x + s0.w / 2 + lcx * cos - lcy * sin;
        const cy = s0.y + s0.h / 2 + lcx * sin + lcy * cos;
        api.setLive(api.mapElements((els) => els.map((x2) => (x2.id === el.id ? { ...x2, x: Math.round(cx - w / 2), y: Math.round(cy - hh / 2), width: Math.round(w), height: Math.round(hh) } : x2)), base));
      },
      () => api.commit(api.snapshot(), base),
      () => api.setLive(base),
    );
  };

  const startRotate = (e: RPointerEvent, el: SlideElement) => {
    if (!canStartEditorGesture(e)) return;
    e.stopPropagation();
    if (remoteLock(el.id)) return;
    const base = api.snapshot();
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    track(
      e.pointerId,
      (ev) => {
        const p = toLogical(ev);
        let deg = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90;
        deg = ev.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
        deg = ((deg % 360) + 360) % 360;
        api.setLive(api.mapElements((els) => els.map((x) => (x.id === el.id ? { ...x, rotation: deg } : x)), base));
      },
      () => api.commit(api.snapshot(), base),
      () => api.setLive(base),
    );
  };

  const startMarquee = (e: RPointerEvent) => {
    if (!canStartEditorGesture(e)) return;
    setEditingId(null);
    onTextEditingChange?.(undefined);
    const o = toLogical(e);
    const additive = e.shiftKey;
    const prior = api.selected;
    if (!additive) api.setSelected([]);
    track(
      e.pointerId,
      (ev) => {
        const p = toLogical(ev);
        const box = { x: Math.min(o.x, p.x), y: Math.min(o.y, p.y), w: Math.abs(p.x - o.x), h: Math.abs(p.y - o.y) };
        setMarquee(box);
        const hit = slide.elements
          .filter((x) => x.visible && !x.locked && !remoteLock(x.id) && x.x < box.x + box.w && x.x + x.width > box.x && x.y < box.y + box.h && x.y + x.height > box.y)
          .map((x) => x.id);
        api.setSelected(additive ? Array.from(new Set([...prior, ...hit])) : hit);
      },
      () => setMarquee(null),
    );
  };

  const single = api.selected.length === 1 ? slide.elements.find((x) => x.id === api.selected[0]) : undefined;

  return (
    <div ref={ref} className="relative flex-1 overflow-auto bg-muted/60" onPointerDown={startMarquee}>
      <div className="flex min-h-full min-w-full items-center justify-center p-10">
        <div
          ref={stageRef}
          dir="ltr"
          className="relative shrink-0 shadow-xl touch-none"
          style={{ width: SLIDE_W * scale, height: SLIDE_H * scale }}
          onPointerDown={(e) => { e.stopPropagation(); startMarquee(e); }}
          onPointerMove={(e) => {
            if (!onCursorMove || !stageRef.current) return;
            const now = performance.now();
            if (now - lastCursorAt.current < 70) return;
            lastCursorAt.current = now;
            const point = toLogical(e);
            onCursorMove({
              x: Math.max(0, Math.min(SLIDE_W, Math.round(point.x))),
              y: Math.max(0, Math.min(SLIDE_H, Math.round(point.y))),
            });
          }}
          onPointerLeave={() => onCursorMove?.(undefined)}
        >
          <div style={{ position: "absolute", top: 0, left: 0, width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: "top left", background: slideBackground(slide, theme), overflow: "hidden" }}>
            {[...renderedFinancialElements(slide)].sort((a, b) => a.zIndex - b.zIndex).filter((x) => x.visible).map((el) => {
              const teammateDraft = remoteDraft(el.id);
              const displayEl = teammateDraft && el.type === "text"
                ? { ...el, properties: { ...el.properties, text: teammateDraft.textDraft ?? el.properties.text } }
                : el;
              return (
                <div
                  key={el.id}
                  style={{ ...elementBoxStyle(el), cursor: remoteLock(el.id) ? "not-allowed" : el.locked ? "default" : "move" }}
                  onPointerDown={(e) => startMove(e, el)}
                  onDoubleClick={() => {
                    if (el.type !== "text" || el.locked || remoteLock(el.id)) return;
                    setEditingId(el.id);
                    onTextEditingChange?.({ elementId: el.id, draft: el.properties.text });
                  }}
                >
                  {editingId === el.id && el.type === "text" ? (
                    <TextEditor
                      el={el}
                      theme={theme}
                      onLive={(draft, caretStart, caretEnd) => onTextEditingChange?.({ elementId: el.id, draft, caretStart, caretEnd })}
                      onDone={(text) => {
                        setEditingId(null);
                        onTextEditingChange?.(undefined);
                        if (text !== el.properties.text) api.updateElements([el.id], (x) => (x.type === "text" ? { ...x, properties: { ...x.properties, text } } : x));
                      }}
                    />
                  ) : (
                    <ElementBody el={displayEl} theme={theme} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Overlay in screen space so handles stay a constant size. */}
          <div className="pointer-events-none absolute inset-0">
            {slide.elements.filter((x) => api.selected.includes(x.id) && x.visible).map((el) => (
              <div
                key={el.id}
                className="absolute outline outline-2 outline-primary"
                style={{ left: el.x * scale, top: el.y * scale, width: el.width * scale, height: el.height * scale, transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined }}
              >
                {single?.id === el.id && !el.locked && editingId !== el.id && (
                  <>
                    {HANDLES.map((h) => (
                      <span
                        key={h}
                        className="pointer-events-auto absolute size-2.5 rounded-sm border border-primary bg-background"
                        style={{ left: `calc(${HANDLE_POS[h][0] * 100}% - 5px)`, top: `calc(${HANDLE_POS[h][1] * 100}% - 5px)`, cursor: CURSOR[h] }}
                        onPointerDown={(e) => startResize(e, el, h)}
                      />
                    ))}
                    <span className="absolute left-1/2 top-[-28px] h-5 w-px bg-primary" />
                    <span
                      className="pointer-events-auto absolute left-1/2 top-[-34px] size-3 -translate-x-1/2 cursor-grab rounded-full border border-primary bg-background"
                      onPointerDown={(e) => startRotate(e, el)}
                      title="Rotate (Shift snaps 15°)"
                    />
                  </>
                )}
              </div>
            ))}
            {remoteOnSlide.flatMap((participant) =>
              (participant.selectedElementIds ?? [])
                .filter((elementId) => elementId !== participant.editingElementId)
                .map((elementId) => ({ participant, elementId }))
            ).map(({ participant, elementId }) => {
              const el = slide.elements.find((element) => element.id === elementId);
              if (!el) return null;
              return (
                <div
                  key={"remote-selection-" + participant.userId + "-" + elementId}
                  className="absolute border border-dashed border-sky-400/80"
                  style={{ left: el.x * scale, top: el.y * scale, width: el.width * scale, height: el.height * scale, transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined }}
                />
              );
            })}
            {remoteOnSlide.filter((participant) => participant.editingElementId).map((participant) => {
              const el = slide.elements.find((element) => element.id === participant.editingElementId);
              if (!el) return null;
              return (
                <div
                  key={"remote-lock-" + participant.userId}
                  className="absolute outline outline-2 outline-amber-500"
                  style={{ left: el.x * scale, top: el.y * scale, width: el.width * scale, height: el.height * scale, transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined }}
                >
                  <span className="absolute -top-6 start-0 max-w-56 truncate rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
                    {participant.email} · {participant.editingKind === "text"
                      ? "typing" + (
                          typeof participant.textCaretStart === "number" &&
                          typeof participant.textCaretEnd === "number" &&
                          participant.textCaretEnd > participant.textCaretStart
                            ? " · " + (participant.textCaretEnd - participant.textCaretStart) + " chars selected"
                            : ""
                        )
                      : "editing"}
                  </span>
                </div>
              );
            })}
            {remoteOnSlide.filter((participant) => typeof participant.cursorX === "number" && typeof participant.cursorY === "number").map((participant) => (
              <div
                key={"cursor-" + participant.userId}
                className="absolute"
                style={{ left: participant.cursorX! * scale, top: participant.cursorY! * scale }}
              >
                <span className="block size-3 -translate-x-1 -translate-y-1 rotate-45 rounded-sm bg-accent shadow-sm" />
                <span className="absolute start-2 top-2 max-w-36 truncate rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background shadow">
                  {participant.email}
                </span>
              </div>
            ))}
            {guides.map((g, i) => (
              <span key={i} className="absolute bg-accent" style={g.axis === "x" ? { left: g.pos * scale, top: 0, bottom: 0, width: 1 } : { top: g.pos * scale, left: 0, right: 0, height: 1 }} />
            ))}
            {marquee && (
              <span className="absolute border border-primary bg-primary/10" style={{ left: marquee.x * scale, top: marquee.y * scale, width: marquee.w * scale, height: marquee.h * scale }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TextEditor({
  el,
  theme,
  onDone,
  onLive,
}: {
  el: Extract<SlideElement, { type: "text" }>;
  theme: SlideTheme;
  onDone: (t: string) => void;
  onLive?: (text: string, caretStart?: number, caretEnd?: number) => void;
}) {
  const p = el.properties;
  const lastLiveAt = useRef(0);
  const selectionOffsets = (root: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return {};
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return {};
    const startRange = range.cloneRange();
    startRange.selectNodeContents(root);
    startRange.setEnd(range.startContainer, range.startOffset);
    const endRange = range.cloneRange();
    endRange.selectNodeContents(root);
    endRange.setEnd(range.endContainer, range.endOffset);
    return { caretStart: startRange.toString().length, caretEnd: endRange.toString().length };
  };
  const emitLive = (root: HTMLElement, force = false) => {
    const now = performance.now();
    if (!force && now - lastLiveAt.current < 90) return;
    lastLiveAt.current = now;
    const text = root.innerText.replace(/\n$/, "");
    const { caretStart, caretEnd } = selectionOffsets(root);
    onLive?.(text, caretStart, caretEnd);
  };
  return (
    <div
      dir={p.dir}
      contentEditable
      suppressContentEditableWarning
      ref={(n) => {
        if (n && document.activeElement !== n) {
          n.focus();
          const r = document.createRange();
          r.selectNodeContents(n);
          window.getSelection()?.removeAllRanges();
          window.getSelection()?.addRange(r);
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onInput={(e) => emitLive(e.currentTarget)}
      onKeyUp={(e) => emitLive(e.currentTarget)}
      onClick={(e) => emitLive(e.currentTarget, true)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") (e.target as HTMLElement).blur();
      }}
      onBlur={(e) => {
        emitLive(e.currentTarget, true);
        onDone(e.currentTarget.innerText.replace(/\n$/, ""));
      }}
      style={{
        width: "100%",
        minHeight: "100%",
        outline: "none",
        cursor: "text",
        fontFamily: resolveFont(p.fontFamily, theme),
        fontSize: p.fontSize,
        fontWeight: p.fontWeight,
        color: resolveColor(p.color, theme),
        lineHeight: p.lineHeight,
        letterSpacing: p.letterSpacing,
        textAlign: p.align,
        fontStyle: p.italic ? "italic" : undefined,
        textDecoration: p.underline ? "underline" : undefined,
        textTransform: p.uppercase ? "uppercase" : undefined,
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
      }}
    >
      {p.text}
    </div>
  );
}

export type { Slide };
