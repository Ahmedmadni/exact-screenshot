  const generated = buildLayout(layoutId, content, slide.id);
  const free = slide.elements.filter((e) => !e.role);
  const placedText = new Set(generated.flatMap((e) => (e.type === "text" ? [e.properties.text.trim()] : [])));
  const placedImages = new Set(generated.flatMap((e) => (e.type === "image" ? [e.properties.src] : [])));
  const orphans = slide.elements
    .filter((e) => e.role && e.role !== "decor")
    .filter((e) =>
      e.type === "text" ? e.properties.text.trim() !== "" && !placedText.has(e.properties.text.trim())
      : e.type === "image" ? !!e.properties.src && !placedImages.has(e.properties.src)
      : false,
    )
    .map((e) => ({ ...e, role: undefined, name: `${e.name} (kept)` }) as SlideElement);
  const elements = [...generated, ...orphans, ...free].map((e, i) => ({ ...e, zIndex: i }));
  return { ...slide, layoutId, elements };
}

/** Key-order-independent serialization for equality checks. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${k}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v) ?? "u";
}

const KNOWN_TYPES = new Set(["text", "image", "shape", "icon", "chart", "table", "diagram"]);
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** Repair a stored element so one malformed record never crashes the editor. Returns null if unusable. */
export function sanitizeElement(raw: unknown, slideId: string, index: number): SlideElement | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as {
    type?: unknown; properties?: unknown; id?: unknown; name?: unknown; x?: unknown; y?: unknown; width?: unknown;
    height?: unknown; rotation?: unknown; opacity?: unknown; zIndex?: unknown; locked?: unknown; visible?: unknown;
  };
  if (typeof e.type !== "string" || !KNOWN_TYPES.has(e.type)) return null;
  const props = (e.properties && typeof e.properties === "object" ? e.properties : {}) as Record<string, unknown>;
  const defaults: Record<string, Record<string, unknown>> = {
    text: { ...TEXT_DEFAULTS },
    image: { src: "", fit: "cover", radius: 0 },
    shape: { shape: "rect", fill: "theme:accent", stroke: "transparent", strokeWidth: 0, radius: 0 },
    icon: { name: "Circle", color: "theme:accent", strokeWidth: 1.75 },
    chart: {
      label: "Performance",
      chartType: "column",
      categories: ["Q1", "Q2", "Q3", "Q4"],
      series: [{ name: "Actual", values: [24, 36, 42, 58] }],
      showLegend: true,
      showValues: false,
      showGrid: true,
      accent: "theme:accent",
    },
    table: {
      label: "Table",
      rows: [["Metric", "Current", "Target"], ["Revenue", "120", "150"], ["Margin", "24%", "30%"]],
      headerRow: true,
      bandedRows: true,
      headerFill: "theme:accent",
    },
    diagram: {
      label: "Process",
      diagramType: "process",
      nodes: [
        { title: "Discover", text: "Understand the current state" },
        { title: "Design", text: "Define the target model" },
        { title: "Deliver", text: "Execute priority changes" },
      ],
      accent: "theme:accent",
    },
  };
  return {
    ...e,
    id: typeof e.id === "string" ? e.id : `${slideId}-el-${index}`,
    slideId,
    name: typeof e.name === "string" ? e.name : String(e.type),
    x: num(e.x, 100),
    y: num(e.y, 100),
    width: Math.max(1, num(e.width, 300)),
    height: Math.max(1, num(e.height, 100)),
    rotation: num(e.rotation, 0),
    opacity: Math.min(1, Math.max(0, num(e.opacity, 1))),
    zIndex: num(e.zIndex, index),
    locked: e.locked === true,
    visible: e.visible !== false,
    type: e.type,
    properties: { ...defaults[e.type], ...props },
  } as unknown as SlideElement;
}

/** Phase 1 slides carry planning data only; give them real elements. */
export function materializeSlide(slide: Slide): Slide {
  const list = Array.isArray(slide.elements) ? slide.elements : [];
  const modern = list.length > 0 && list.some((e) => e && typeof (e as { x?: number }).x === "number");
  if (modern) {
    const clean = list.map((e, i) => sanitizeElement(e, slide.id, i)).filter((e): e is SlideElement => !!e);
    const same = clean.length === list.length && clean.every((c, i) => stable(c) === stable(list[i]));
    return same ? slide : { ...slide, elements: clean };
  }
  const layoutId = slide.layoutId && getLayout(slide.layoutId) ? slide.layoutId : layoutsForIntent(slide.slideIntent)[0]!.id;
  return { ...slide, layoutId, elements: buildLayout(layoutId, contentFromSlide(slide), slide.id) };
}