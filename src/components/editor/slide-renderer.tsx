import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { ImageIcon } from "lucide-react";
import type { PresentationThemeOverrides, Slide } from "@/lib/types";
import { SLIDE_H, SLIDE_W, type SlideElement } from "@/lib/editor/model";
import { getTheme, resolveColor, resolveFont, type SlideTheme } from "@/lib/editor/themes";
import { getIcon } from "@/lib/editor/icons";
import { ChartBody, DiagramBody, TableBody } from "./data-elements";

/** Visual body of an element, positioned by the caller. Pure: same output for canvas, preview and thumbnails. */
export function ElementBody({ el, theme }: { el: SlideElement; theme: SlideTheme }) {
  switch (el.type) {
    case "text": {
      const p = el.properties;
      return (
        <div
          dir={p.dir}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: p.vAlign === "middle" ? "center" : p.vAlign === "bottom" ? "flex-end" : "flex-start",
            background: p.background ? resolveColor(p.background, theme) : undefined,
          }}
        >
          <div
            data-text-content={el.id}
            style={{
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
        </div>
      );
    }
    case "shape":
      return <ShapeBody el={el} theme={theme} />;
    case "icon": {
      const Icon = getIcon(el.properties.name);
      return <Icon width="100%" height="100%" color={resolveColor(el.properties.color, theme)} strokeWidth={el.properties.strokeWidth} />;
    }
    case "image": {
      const p = el.properties;
      if (!p.src)
        return (
          <div style={{ width: "100%", height: "100%", borderRadius: p.radius, background: theme.colors.accentSoft, display: "grid", placeItems: "center", color: theme.colors.secondary }}>
            <ImageIcon style={{ width: 56, height: 56, opacity: 0.6 }} />
          </div>
        );
      return <img src={p.src} alt={el.name} draggable={false} style={{ width: "100%", height: "100%", objectFit: p.fit, borderRadius: p.radius, display: "block" }} />;
    }
    case "chart":
      return <ChartBody el={el} theme={theme} />;
    case "table":
      return <TableBody el={el} theme={theme} />;
    case "diagram":
      return <DiagramBody el={el} theme={theme} />;
  }
}

function ShapeBody({ el, theme }: { el: Extract<SlideElement, { type: "shape" }>; theme: SlideTheme }) {
  const p = el.properties;
  const fill = resolveColor(p.fill, theme);
  const stroke = resolveColor(p.stroke, theme);
  const w = el.width;
  const h = el.height;
  const sw = p.strokeWidth;
  if (p.shape === "rect" || p.shape === "roundRect" || p.shape === "ellipse") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: fill,
          border: sw ? `${sw}px solid ${stroke}` : undefined,
          borderRadius: p.shape === "ellipse" ? "50%" : p.shape === "roundRect" ? p.radius || theme.shape.radius : p.radius,
          boxSizing: "border-box",
        }}
      />
    );
  }
  const lineColor = sw ? stroke : fill;
  const lw = Math.max(sw, 3);
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
      {p.shape === "triangle" && <polygon points={`${w / 2},0 ${w},${h} 0,${h}`} fill={fill} stroke={stroke} strokeWidth={sw} />}
      {p.shape === "line" && <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={lineColor} strokeWidth={lw} strokeLinecap="round" />}
      {p.shape === "arrow" && (
        <g stroke={lineColor} strokeWidth={lw} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1={0} y1={h / 2} x2={w - 2} y2={h / 2} />
          <polyline points={`${w - Math.min(28, w / 3)},${h / 2 - Math.min(18, h)} ${w - 2},${h / 2} ${w - Math.min(28, w / 3)},${h / 2 + Math.min(18, h)}`} />
        </g>
      )}
    </svg>
  );
}

export function elementBoxStyle(el: SlideElement): CSSProperties {
  return {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el.opacity,
    zIndex: el.zIndex,
  };
}

export function slideBackground(slide: Slide, theme: SlideTheme) {
  return resolveColor(slide.background ?? "theme:background", theme);
}

/** Static full-slide render at logical 1600x900. */
export function SlideStage({ slide, theme, hideIds }: { slide: Slide; theme: SlideTheme; hideIds?: Set<string> }) {
  return (
    <div style={{ position: "absolute", inset: 0, width: SLIDE_W, height: SLIDE_H, background: slideBackground(slide, theme), overflow: "hidden" }}>
      {[...slide.elements]
        .sort((a, b) => a.zIndex - b.zIndex)
        .filter((e) => e.visible && !hideIds?.has(e.id))
        .map((el) => (
          <div key={el.id} style={elementBoxStyle(el)}>
            <ElementBody el={el} theme={theme} />
          </div>
        ))}
    </div>
  );
}

/** Measures its container and returns a scale fitting 1600x900. */
export function useFitScale(padding = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.1);
  const [fillScale, setFillScale] = useState(0.1);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const w = node.clientWidth - padding * 2;
      const h = node.clientHeight - padding * 2;
      setScale(Math.max(0.05, h > 0 ? Math.min(w / SLIDE_W, h / SLIDE_H) : w / SLIDE_W));
      setFillScale(Math.max(0.05, h > 0 ? Math.max(w / SLIDE_W, h / SLIDE_H) : w / SLIDE_W));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [padding]);
  return { ref, scale, fillScale };
}

export const SlideThumb = memo(function SlideThumb({ slide, themeId, themeOverrides }: { slide: Slide; themeId?: string | undefined; themeOverrides?: PresentationThemeOverrides | undefined }) {
  const { ref, scale } = useFitScale();
  const theme = getTheme(themeId, themeOverrides);
  return (
    <div ref={ref} className="relative aspect-video w-full overflow-hidden">
      <div style={{ position: "absolute", top: 0, left: 0, width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: "top left" }} dir="ltr">
        <SlideStage slide={slide} theme={theme} />
      </div>
    </div>
  );
});
