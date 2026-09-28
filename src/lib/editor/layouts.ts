import type { Slide, SlideIntent } from "@/lib/types";
import type { DraftElement, SlideElement } from "./model";
import { SLIDE_W } from "./model";
import { TEXT_DEFAULTS, iconEl, imageEl, instantiate, shapeEl, textEl } from "./elements";

export interface LayoutContent {
  title: string;
  subtitle: string;
  body: string;
  items: { title: string; text: string }[];
  kpis: string[];
  media: string;
}

export interface LayoutDefinition {
  id: string;
  name: string;
  intents: SlideIntent[];
  build(c: LayoutContent): DraftElement[];
}

const H = { fontFamily: "theme:heading", fontWeight: 500, lineHeight: 1.08, letterSpacing: -0.5 } as const;
const SEC = { color: "theme:secondary" } as const;
const ICONS = ["Target", "Lightbulb", "Rocket", "ShieldCheck", "Users", "TrendingUp"];

function item(c: LayoutContent, i: number) {
  return c.items[i] ?? { title: `[Point ${i + 1}]`, text: "Add a short supporting detail." };
}

const titleBlock = (c: LayoutContent): DraftElement[] => [
  textEl("Title", c.title, [100, 80, 1400, 90], { ...H, fontSize: 52 }, "title"),
  shapeEl("Accent line", "rect", [100, 190, 64, 5]),
];

export const LAYOUTS: LayoutDefinition[] = [
  {
    id: "cover-minimal",
    name: "Cover Minimal",
    intents: ["Cover"],
    build: (c) => [
      shapeEl("Accent bar", "rect", [100, 250, 80, 6]),
      textEl("Title", c.title, [100, 290, 1200, 240], { ...H, fontSize: 92, vAlign: "bottom" }, "title"),
      textEl("Subtitle", c.subtitle, [100, 560, 1000, 110], { ...SEC, fontSize: 30 }, "subtitle"),
      shapeEl("Footer rule", "rect", [100, 800, 1400, 1], { fill: "theme:line" }),
      textEl("Footer", c.body, [100, 815, 1400, 40], { ...SEC, fontSize: 16 }, "body"),
    ],
  },
  {
    id: "cover-split",
    name: "Cover Split",
    intents: ["Cover", "Section Divider"],
    build: (c) => [
      imageEl("Hero image", [880, 0, 720, 900], { src: c.media }),
      shapeEl("Accent bar", "rect", [100, 250, 64, 6]),
      textEl("Title", c.title, [100, 280, 720, 270], { ...H, fontSize: 72, vAlign: "bottom" }, "title"),
      textEl("Subtitle", c.subtitle, [100, 580, 700, 130], { ...SEC, fontSize: 26 }, "subtitle"),
    ],
  },
  {
    id: "cover-bold",
    name: "Cover Bold",
    intents: ["Cover", "Section Divider", "Call to Action", "Closing"],
    build: (c) => [
      shapeEl("Background", "rect", [0, 0, 1600, 900]),
      shapeEl("Circle", "ellipse", [1180, -140, 560, 560], { fill: "theme:onAccent" }),
      textEl("Title", c.title, [120, 300, 1200, 260], { ...H, fontSize: 96, color: "theme:onAccent", vAlign: "bottom" }, "title"),
      textEl("Subtitle", c.subtitle, [120, 590, 1000, 110], { fontSize: 30, color: "theme:onAccent" }, "subtitle"),
    ],
  },
  {
    id: "section-divider",
    name: "Section Divider",
    intents: ["Section Divider", "Agenda", "Quote"],
    build: (c) => [
      shapeEl("Accent line", "rect", [SLIDE_W / 2 - 40, 290, 80, 5]),
      textEl("Title", c.title, [200, 320, 1200, 170], { ...H, fontSize: 76, align: "center", vAlign: "middle" }, "title"),
      textEl("Subtitle", c.subtitle, [300, 510, 1000, 100], { ...SEC, fontSize: 28, align: "center" }, "subtitle"),
    ],
  },
  {
    id: "title-content",
    name: "Title + Content",
    intents: ["Agenda", "Executive Summary", "Problem", "Solution", "Opportunity", "Case Study"],
    build: (c) => [
      ...titleBlock(c),
      textEl("Key message", c.subtitle, [100, 240, 640, 300], { ...H, fontSize: 36, lineHeight: 1.2 }, "subtitle"),
      textEl("Body", c.body, [100, 560, 640, 200], { ...SEC, fontSize: 22 }, "body"),
      ...[0, 1, 2, 3].flatMap((i) => [
        shapeEl(`Bullet ${i + 1}`, "ellipse", [840, 262 + i * 140, 14, 14]),
        textEl(`Point ${i + 1} title`, item(c, i).title, [880, 248 + i * 140, 620, 44], { fontSize: 26, fontWeight: 600 }, "itemTitle"),
        textEl(`Point ${i + 1}`, item(c, i).text, [880, 294 + i * 140, 620, 70], { ...SEC, fontSize: 19 }, "item"),
      ]),
    ],
  },
  {
    id: "image-text",
    name: "Image + Text",
    intents: ["Opportunity", "Solution", "Case Study", "Problem", "Team"],
    build: (c) => [
      imageEl("Image", [100, 100, 660, 700], { src: c.media, radius: 20 }),
      shapeEl("Accent line", "rect", [840, 200, 64, 5]),
      textEl("Title", c.title, [840, 230, 660, 180], { ...H, fontSize: 56, vAlign: "bottom" }, "title"),
      textEl("Key message", c.subtitle, [840, 440, 660, 120], { fontSize: 28, fontWeight: 500 }, "subtitle"),
      textEl("Body", c.body, [840, 580, 660, 200], { ...SEC, fontSize: 21 }, "body"),
    ],
  },
  {
    id: "three-cards",
    name: "Three Cards",
    intents: ["Problem", "Solution", "Portfolio", "Team", "Opportunity"],
    build: (c) => [
      ...titleBlock(c),
      textEl("Key message", c.subtitle, [100, 210, 1400, 50], { ...SEC, fontSize: 24 }, "subtitle"),
      ...[0, 1, 2].flatMap((i) => {
        const x = 100 + i * 480;
        return [
          shapeEl(`Card ${i + 1}`, "roundRect", [x, 300, 440, 500], { fill: "theme:surface", stroke: "theme:line", strokeWidth: 1, radius: 20 }),
          iconEl(`Icon ${i + 1}`, ICONS[i]!, [x + 44, 344, 56, 56]),
          textEl(`Card ${i + 1} title`, item(c, i).title, [x + 44, 440, 352, 100], { ...H, fontSize: 32 }, "itemTitle"),
          textEl(`Card ${i + 1} text`, item(c, i).text, [x + 44, 560, 352, 200], { ...SEC, fontSize: 20 }, "item"),
        ];
      }),
    ],
  },
  {
    id: "four-cards",
    name: "Four Cards",
    intents: ["Executive Summary", "Portfolio", "Agenda", "Process", "Roadmap"],
    build: (c) => [
      ...titleBlock(c),
      ...[0, 1, 2, 3].flatMap((i) => {
        const x = 100 + (i % 2) * 720;
        const y = 240 + Math.floor(i / 2) * 300;
        return [
          shapeEl(`Card ${i + 1}`, "roundRect", [x, y, 680, 270], { fill: "theme:surface", stroke: "theme:line", strokeWidth: 1, radius: 20 }),
          textEl(`Number ${i + 1}`, String(i + 1).padStart(2, "0"), [x + 40, y + 36, 80, 56], { ...H, fontSize: 40, color: "theme:accent" }, "decor"),
          textEl(`Card ${i + 1} title`, item(c, i).title, [x + 140, y + 40, 500, 60], { fontSize: 28, fontWeight: 600 }, "itemTitle"),
          textEl(`Card ${i + 1} text`, item(c, i).text, [x + 140, y + 108, 500, 130], { ...SEC, fontSize: 20 }, "item"),
        ];
      }),
    ],
  },
  {
    id: "kpi-metrics",
    name: "KPI Metrics",
    intents: ["Dashboard", "Data Story", "Financial", "Big Number"],
    build: (c) => [
      ...titleBlock(c),
      textEl("Key message", c.subtitle, [100, 215, 1400, 50], { ...SEC, fontSize: 24 }, "subtitle"),
      ...[0, 1, 2].flatMap((i) => {
        const x = 100 + i * 480;
        return [
          shapeEl(`KPI card ${i + 1}`, "roundRect", [x, 320, 440, 380], { fill: "theme:surface", stroke: "theme:line", strokeWidth: 1, radius: 20 }),
          shapeEl(`KPI accent ${i + 1}`, "rect", [x + 44, 364, 40, 5]),
          textEl(`KPI value ${i + 1}`, c.kpis[i] ?? "[Value]", [x + 44, 400, 360, 130], { ...H, fontSize: 84, color: "theme:accent" }, "kpiValue"),
          textEl(`KPI label ${i + 1}`, item(c, i).title, [x + 44, 550, 360, 110], { ...SEC, fontSize: 22 }, "itemTitle"),
        ];
      }),
      textEl("Source note", c.body, [100, 760, 1400, 40], { ...SEC, fontSize: 16 }, "body"),
    ],
  },
  {
    id: "timeline",
    name: "Horizontal Timeline",
    intents: ["Timeline", "Roadmap", "Process"],
    build: (c) => [
      ...titleBlock(c),
      textEl("Key message", c.subtitle, [100, 215, 1400, 50], { ...SEC, fontSize: 24 }, "subtitle"),
      shapeEl("Timeline", "rect", [120, 470, 1360, 3], { fill: "theme:line" }),
      ...[0, 1, 2, 3].flatMap((i) => {
        const x = 100 + i * 350;
        return [
          shapeEl(`Milestone ${i + 1}`, "ellipse", [x + 10, 452, 40, 40], { stroke: "theme:background", strokeWidth: 6 }),
          textEl(`Milestone ${i + 1} title`, item(c, i).title, [x, 530, 310, 70], { fontSize: 26, fontWeight: 600 }, "itemTitle"),
          textEl(`Milestone ${i + 1} text`, item(c, i).text, [x, 610, 310, 160], { ...SEC, fontSize: 19 }, "item"),
        ];
      }),
    ],
  },
  {
    id: "comparison",
    name: "Comparison",
    intents: ["Comparison", "Before / After", "Financial", "Data Story"],
    build: (c) => [
      ...titleBlock(c),
      ...[0, 1].flatMap((i) => {
        const x = 100 + i * 720;
        return [
          shapeEl(`Panel ${i + 1}`, "roundRect", [x, 250, 680, 560], { fill: i ? "theme:accentSoft" : "theme:surface", stroke: "theme:line", strokeWidth: i ? 0 : 1, radius: 20 }),
          textEl(`Panel ${i + 1} title`, item(c, i).title, [x + 50, 300, 580, 70], { ...H, fontSize: 36 }, "itemTitle"),
          textEl(`Panel ${i + 1} text`, item(c, i).text, [x + 50, 390, 580, 380], { ...SEC, fontSize: 22, lineHeight: 1.45 }, "item"),
        ];
      }),
    ],
  },
  {
    id: "big-number",
    name: "Big Number",
    intents: ["Big Number", "Opportunity", "Quote", "Data Story"],
    build: (c) => [
      textEl("Big value", c.kpis[0] ?? "[Value]", [100, 180, 1400, 300], { ...H, fontSize: 220, color: "theme:accent", vAlign: "bottom" }, "kpiValue"),
      textEl("Title", c.title, [100, 510, 1100, 110], { ...H, fontSize: 48 }, "title"),
      textEl("Key message", c.subtitle, [100, 640, 1000, 110], { ...SEC, fontSize: 26 }, "subtitle"),
    ],
  },
  {
    id: "closing-cta",
    name: "Closing / CTA",
    intents: ["Call to Action", "Closing"],
    build: (c) => [
      shapeEl("Panel", "rect", [0, 0, 1600, 900], { fill: "theme:surface" }),
      textEl("Title", c.title, [200, 250, 1200, 200], { ...H, fontSize: 76, align: "center", vAlign: "bottom" }, "title"),
      textEl("Key message", c.subtitle, [300, 480, 1000, 110], { ...SEC, fontSize: 28, align: "center" }, "subtitle"),
      shapeEl("Button", "roundRect", [600, 640, 400, 76], { radius: 38 }),
      textEl("Call to action", c.body || "Decision required today", [600, 640, 400, 76], { fontSize: 22, fontWeight: 600, color: "theme:onAccent", align: "center", vAlign: "middle" }, "body"),
    ],
  },
];

export function getLayout(id?: string): LayoutDefinition | undefined {
  return LAYOUTS.find((l) => l.id === id);
}

export function layoutsForIntent(intent: SlideIntent): LayoutDefinition[] {
  const matches = LAYOUTS.filter((l) => l.intents.includes(intent));
  return matches.length ? matches : [LAYOUTS.find((l) => l.id === "title-content")!];
}

export function contentFromSlide(slide: Slide): LayoutContent {
  return {
    title: slide.title,
    subtitle: slide.keyMessage,
    body: slide.contentSummary,
    items: (slide.bullets ?? []).map((b) => {
      const [title = "", ...rest] = b.split(": ");
      return { title, text: rest.join(": ") };
    }),
    kpis: slide.kpis ?? [],
    media: "",
  };
}

/** Read content back from elements by semantic role so layouts can swap safely. */
export function contentFromElements(elements: SlideElement[], fallback: LayoutContent): LayoutContent {
  const texts = (role: string) =>
    elements.filter((e) => e.role === role && e.type === "text").map((e) => (e.type === "text" ? e.properties.text : ""));
  const itemTitles = texts("itemTitle");
  const itemTexts = texts("item");
  const count = Math.max(itemTitles.length, itemTexts.length);
  const media = elements.find((e) => e.type === "image" && e.role === "media");
  return {
    title: texts("title")[0] ?? fallback.title,
    subtitle: texts("subtitle")[0] ?? fallback.subtitle,
    body: texts("body")[0] ?? fallback.body,
    items: count
      ? Array.from({ length: count }, (_, i) => ({ title: itemTitles[i] ?? "", text: itemTexts[i] ?? "" }))
      : fallback.items,
    kpis: texts("kpiValue").length ? texts("kpiValue") : fallback.kpis,
    media: media && media.type === "image" ? media.properties.src : fallback.media,
  };
}

export function buildLayout(layoutId: string, content: LayoutContent, slideId: string): SlideElement[] {
  const layout = getLayout(layoutId) ?? LAYOUTS[0]!;
  return instantiate(layout.build(content), slideId);
}

/**
 * Swap layout keeping content and any free (user-added) elements. Generated
 * content the new layout has no slot for is kept as free elements rather than
 * silently dropped.
 */
export function applyLayout(slide: Slide, layoutId: string): Slide {
  const content = contentFromElements(slide.elements, contentFromSlide(slide));
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
