import { useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { SLIDE_H, SLIDE_W, type SlideElement } from "@/lib/editor/model";
import type { SlideTheme } from "@/lib/editor/themes";
import { resolveColor, resolveFont } from "@/lib/editor/themes";
import type { Slide } from "@/lib/types";
import { ElementBody, elementBoxStyle, useFitScale } from "./slide-renderer";
import type { EditorApi } from "./use-editor";

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const HANDLE_POS: Record<Handle, [number, number]> = {
  nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5],
};
const CURSOR: Record<Handle, string> = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize" };

interface Guide { axis: "x" | "y"; pos: number }

export function EditorCanvas({ api, theme, zoom }: { api: EditorApi; theme: SlideTheme; zoom: number }) {
  const { ref, scale: fit } = useFitScale(40);
  const scale = fit * zoom;
  const stageRef = useRef<HTMLDivElement>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const slide = api.active;
  if (!slide) return <div ref={ref} className="flex-1" />;

  const toLogical = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  const track = (onMove: (e: PointerEvent) => void, onUp: (e: PointerEvent) => void) => {
    const move = (e: PointerEvent) => onMove(e);
    const up = (e: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onUp(e);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startMove = (e: RPointerEvent, el: SlideElement) => {
    e.stopPropagation();
    if (editingId === el.id) return;
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
    );
  };

  const startResize = (e: RPointerEvent, el: SlideElement, h: Handle) => {
    e.stopPropagation();
    const base = api.snapshot();
    const origin = toLogical(e);
    const s = { x: el.x, y: el.y, w: el.width, h: el.height };
    const ratio = s.w / s.h;
    const keepRatio = el.type === "image" || el.type === "icon";
    track(
      (ev) => {
        const p = toLogical(ev);
        const dx = p.x - origin.x;
        const dy = p.y - origin.y;
        let { x, y, w, h: hh } = s;
        if (h.includes("e")) w = s.w + dx;
        if (h.includes("w")) { w = s.w - dx; x = s.x + dx; }
        if (h.includes("s")) hh = s.h + dy;
        if (h.includes("n")) { hh = s.h - dy; y = s.y + dy; }
        if ((keepRatio !== ev.shiftKey) && h.length === 2) {
          hh = w / ratio;
          if (h.includes("n")) y = s.y + s.h - hh;
        }
        w = Math.max(8, w);
        hh = Math.max(4, hh);
        api.setLive(api.mapElements((els) => els.map((x2) => (x2.id === el.id ? { ...x2, x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(hh) } : x2)), base));
      },
      () => api.commit(api.snapshot(), base),
    );
  };

  const startRotate = (e: RPointerEvent, el: SlideElement) => {
    e.stopPropagation();
    const base = api.snapshot();
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    track(
      (ev) => {
        const p = toLogical(ev);
        let deg = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90;
        deg = ev.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
        deg = ((deg % 360) + 360) % 360;
        api.setLive(api.mapElements((els) => els.map((x) => (x.id === el.id ? { ...x, rotation: deg } : x)), base));
      },
      () => api.commit(api.snapshot(), base),
    );
  };

  const startMarquee = (e: RPointerEvent) => {
    if (e.button !== 0) return;
    setEditingId(null);
    const o = toLogical(e);
    const additive = e.shiftKey;
    const prior = api.selected;
    if (!additive) api.setSelected([]);
    track(
      (ev) => {
        const p = toLogical(ev);
        const box = { x: Math.min(o.x, p.x), y: Math.min(o.y, p.y), w: Math.abs(p.x - o.x), h: Math.abs(p.y - o.y) };
        setMarquee(box);
        const hit = slide.elements
          .filter((x) => x.visible && !x.locked && x.x < box.x + box.w && x.x + x.width > box.x && x.y < box.y + box.h && x.y + x.height > box.y)
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
          className="relative shrink-0 shadow-xl"
          style={{ width: SLIDE_W * scale, height: SLIDE_H * scale }}
          onPointerDown={startMarquee}
        >
          <div style={{ position: "absolute", top: 0, left: 0, width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: "top left", background: theme.colors.background, overflow: "hidden" }}>
            {[...slide.elements].sort((a, b) => a.zIndex - b.zIndex).filter((x) => x.visible).map((el) => (
              <div
                key={el.id}
                style={{ ...elementBoxStyle(el), cursor: el.locked ? "default" : "move" }}
                onPointerDown={(e) => startMove(e, el)}
                onDoubleClick={() => el.type === "text" && !el.locked && setEditingId(el.id)}
              >
                {editingId === el.id && el.type === "text" ? (
                  <TextEditor el={el} theme={theme} onDone={(text) => {
                    setEditingId(null);
                    if (text !== el.properties.text) api.updateElements([el.id], (x) => (x.type === "text" ? { ...x, properties: { ...x.properties, text } } : x));
                  }} />
                ) : (
                  <ElementBody el={el} theme={theme} />
                )}
              </div>
            ))}
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

function TextEditor({ el, theme, onDone }: { el: Extract<SlideElement, { type: "text" }>; theme: SlideTheme; onDone: (t: string) => void }) {
  const p = el.properties;
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
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") (e.target as HTMLElement).blur();
      }}
      onBlur={(e) => onDone(e.currentTarget.innerText.replace(/\n$/, ""))}
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
