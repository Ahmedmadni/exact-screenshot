import type { Slide, SlideIntent } from "@/lib/types";
import type { DraftElement, SlideElement } from "./model";
import { SLIDE_W } from "./model";
import { TEXT_DEFAULTS, chartEl, diagramEl, iconEl, imageEl, instantiate, shapeEl, tableEl, textEl } from "./elements";

export interface LayoutContent {
  title: string;
  subtitle: string;
  body: string;
  items: { title: string; text: string }[];
  kpis: string[];
  media: string;
  mediaAssetId?: string;
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

function adaptiveType(text: string, base: number, min: number, comfortableChars: number) {
  const clean = text.trim();
  if (!clean) return base;
  const arabicChars = (clean.match(/[\u0600-\u06FF]/g) ?? []).length;
  const effectiveLength = clean.length * (arabicChars > clean.length * 0.35 ? 1.12 : 1);
  if (effectiveLength <= comfortableChars) return base;
  const scale = Math.sqrt(comfortableChars / effectiveLength);
  return Math.max(min, Math.round(base * scale));
}

const titleBlock = (c: LayoutContent): DraftElement[] => [
  textEl("Title", c.title, [100, 80, 1400, 90], { ...H, fontSize: adaptiveType(c.title, 52, 38, 52) }, "title"),
  shapeEl("Accent line", "rect", [100, 190, 64, 5]),
];

export const LAYOUTS: LayoutDefinition[] = [
  {
    id: "cover-minimal",
    name: "Cover Minimal",
    intents: ["Cover"],
    build: (c) => [
      shapeEl("Accent bar", "rect", [100, 250, 80, 6]),
      textEl("Title", c.title, [100, 290, 1200, 240], { ...H, fontSize: adaptiveType(c.title, 92, 56, 34), vAlign: "bottom" }, "title"),
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
      imageEl("Hero image", [880, 0, 720, 900], { src: c.media, assetId: c.mediaAssetId }),
      shapeEl("Accent bar", "rect", [100, 250, 64, 6]),
      textEl("Title", c.title, [100, 280, 720, 270], { ...H, fontSize: adaptiveType(c.title, 72, 48, 34), vAlign: "bottom" }, "title"),
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
      textEl("Title", c.title, [120, 300, 1200, 260], { ...H, fontSize: adaptiveType(c.title, 96, 58, 34), color: "theme:onAccent", vAlign: "bottom" }, "title"),
      textEl("Subtitle", c.subtitle, [120, 590, 1000, 110], { fontSize: 30, color: "theme:onAccent" }, "subtitle"),
    ],
  },
  {
    id: "cover-board-report",
    name: "Board Report · Executive Ledger",
    intents: ["Cover"],
    build: (c) => [
      shapeEl("Executive spine", "rect", [0, 0, 22, 900], { fill: "theme:accent" }),
      textEl("Report classification", "BOARD REPORT / EXECUTIVE BRIEF", [115, 110, 960, 35], { fontSize: 15, fontWeight: 700, color: "theme:accent", letterSpacing: 2 }, "decor"),
      shapeEl("Header rule", "rect", [115, 170, 1370, 2], { fill: "theme:line" }),
      textEl("Title", c.title, [115, 265, 1140, 235], { ...H, fontSize: adaptiveType(c.title, 84, 48, 38), lineHeight: 1.02 }, "title"),
      shapeEl("Decision accent", "rect", [115, 545, 112, 6], { fill: "theme:accent" }),
      textEl("Subtitle", c.subtitle, [115, 580, 1050, 125], { ...SEC, fontSize: 27, lineHeight: 1.28 }, "subtitle"),
      shapeEl("Footer rule", "rect", [115, 786, 1370, 2], { fill: "theme:line" }),
      textEl("Report context", c.body, [115, 812, 1310, 48], { ...SEC, fontSize: 16 }, "body"),
      textEl("Edition", "01", [1335, 202, 145, 130], { ...H, fontSize: 90, color: "theme:accentSoft", align: "end" }, "decor"),
    ],
  },
  {
    id: "cover-financial-ledger",
    name: "Financial Report · Ledger Rules",
    intents: ["Cover"],
    build: (c) => [
      shapeEl("Financial rule top", "rect", [100, 96, 1400, 7], { fill: "theme:primary" }),
      textEl("Report label", "FINANCIAL PERFORMANCE", [105, 135, 850, 42], { color: "theme:accent", fontSize: 16, fontWeight: 800, letterSpacing: 2 }, "decor"),
      textEl("Title", c.title, [105, 260, 1230, 225], { ...H, fontSize: adaptiveType(c.title, 86, 46, 40), lineHeight: 1.0 }, "title"),
      textEl("Subtitle", c.subtitle, [105, 520, 1150, 116], { ...SEC, fontSize: 28 }, "subtitle"),
      ...[0, 1, 2].flatMap((i) => [
        shapeEl(`Ledger header ${i + 1}`, "rect", [105 + i * 475, 690, 428, 2], { fill: i === 0 ? "theme:accent" : "theme:line" }),
        textEl(`Ledger label ${i + 1}`, ["PERFORMANCE", "VARIANCE", "OUTLOOK"][i]!, [105 + i * 475, 712, 428, 32], { color: "theme:secondary", fontSize: 16, fontWeight: 600, letterSpacing: 1.2 }, "decor"),
        textEl(`Ledger metric ${i + 1}`, c.kpis[i] ?? "—", [105 + i * 475, 748, 428, 70], { ...H, fontSize: 43, color: i === 0 ? "theme:accent" : "theme:primary" }, "decor"),
      ]),
    ],
  },
  {
    id: "cover-investment-memorandum",
    name: "Investment Memorandum · Cinematic Asset",
    intents: ["Cover"],
    build: (c) => [
      shapeEl("Document backdrop", "rect", [0, 0, 1600, 900], { fill: "theme:background" }),
      imageEl("Investment asset", [780, 0, 820, 900], { src: c.media, assetId: c.mediaAssetId, fit: "cover", radius: 0, treatment: "cinematic" }),
      shapeEl("Investment divider", "rect", [774, 0, 6, 900], { fill: "theme:accent" }),
      shapeEl("Investment outline top", "rect", [93, 95, 595, 2], { fill: "theme:accent" }),
      textEl("Classification", "INVESTMENT MEMORANDUM", [95, 133, 650, 37], { color: "theme:accent", fontSize: 16, fontWeight: 700, letterSpacing: 2 }, "decor"),
      textEl("Title", c.title, [95, 275, 615, 260], { ...H, fontSize: adaptiveType(c.title, 69, 42, 30), lineHeight: 1.06 }, "title"),
      textEl("Subtitle", c.subtitle, [95, 565, 610, 130], { ...SEC, fontSize: 25 }, "subtitle"),
      shapeEl("Investment outline bottom", "rect", [95, 777, 595, 2], { fill: "theme:line" }),
      textEl("Document detail", c.body, [95, 798, 595, 66], { ...SEC, fontSize: 15 }, "body"),
    ],
  },
  {
    id: "cover-company-panorama",
    name: "Company Profile · Panorama",
    intents: ["Cover"],
    build: (c) => [
      imageEl("Corporate panorama", [0, 0, 1600, 900], { src: c.media, assetId: c.mediaAssetId, fit: "cover", radius: 0, treatment: "cinematic" }),
      shapeEl("Editorial title plate", "rect", [0, 0, 985, 900], { fill: "theme:background" }),
      shapeEl("Corporate signature rail", "rect", [0, 0, 16, 900], { fill: "theme:accent" }),
      textEl("Classification", "COMPANY PROFILE / CAPABILITIES", [105, 137, 790, 35], { color: "theme:accent", fontSize: 16, fontWeight: 700, letterSpacing: 1.6 }, "decor"),
      shapeEl("Identity rule", "rect", [105, 210, 108, 6], { fill: "theme:accent" }),
      textEl("Title", c.title, [105, 290, 780, 225], { ...H, fontSize: adaptiveType(c.title, 79, 43, 35) }, "title"),
      textEl("Subtitle", c.subtitle, [105, 552, 755, 160], { ...SEC, fontSize: 26, lineHeight: 1.32 }, "subtitle"),
      shapeEl("Profile footer line", "rect", [105, 786, 770, 2], { fill: "theme:line" }),
      textEl("Details", c.body, [105, 801, 760, 64], { ...SEC, fontSize: 15 }, "body"),
    ],
  },
  {
    id: "cover-arabic-institutional",
    name: "Arabic Executive · Institutional",
    intents: ["Cover"],
    build: (c) => [
      shapeEl("Institutional left rail", "rect", [0, 0, 22, 900], { fill: "theme:accent" }),
      shapeEl("Institutional header", "rect", [115, 100, 1320, 2], { fill: "theme:line" }),
      textEl("Institutional heading", "EXECUTIVE / 01", [115, 130, 800, 45], { fontSize: 17, fontWeight: 700, color: "theme:accent", letterSpacing: 1.2 }, "decor"),
      shapeEl("Architectural block", "rect", [1020, 240, 435, 420], { fill: "theme:accentSoft" }),
      shapeEl("Architectural accent", "rect", [1120, 240, 75, 420], { fill: "theme:accent" }),
      shapeEl("Architectural line", "rect", [1222, 240, 7, 420], { fill: "theme:background" }),
      textEl("Title", c.title, [115, 286, 850, 255], { ...H, fontSize: adaptiveType(c.title, 76, 44, 33), lineHeight: 1.13 }, "title"),
      textEl("Subtitle", c.subtitle, [115, 578, 840, 135], { ...SEC, fontSize: 27, lineHeight: 1.38 }, "subtitle"),
      shapeEl("Institutional footer", "rect", [115, 786, 1320, 2], { fill: "theme:line" }),
      textEl("Context", c.body, [115, 804, 1220, 50], { ...SEC, fontSize: 15 }, "body"),
    ],
  },
  {
    id: "cover-consulting-brief",
    name: "Consulting · Framed Hypothesis",
    intents: ["Cover"],
    build: (c) => [
      shapeEl("Consulting vertical rail", "rect", [104, 110, 8, 635], { fill: "theme:accent" }),
      textEl("Confidentiality", "STRATEGY / EXECUTIVE PERSPECTIVE", [150, 112, 1150, 48], { fontSize: 16, fontWeight: 750, color: "theme:accent", letterSpacing: 1.5 }, "decor"),
      textEl("Title", c.title, [150, 260, 1260, 242], { ...H, fontSize: adaptiveType(c.title, 82, 48, 38), lineHeight: 1.05 }, "title"),
      textEl("Subtitle", c.subtitle, [150, 545, 1180, 125], { ...SEC, fontSize: 27 }, "subtitle"),
      shapeEl("Hypothesis index rule", "rect", [148, 754, 1260, 2], { fill: "theme:line" }),
      textEl("Supporting context", c.body, [150, 777, 1150, 65], { ...SEC, fontSize: 16 }, "body"),
      shapeEl("Consulting lower mark", "rect", [1370, 752, 38, 9], { fill: "theme:accent" }),
    ],
  },
  {
    id: "section-divider",
    name: "Section Divider",
    intents: ["Section Divider", "Agenda", "Quote"],
    build: (c) => [
      shapeEl("Accent line", "rect", [SLIDE_W / 2 - 40, 290, 80, 5]),
      textEl("Title", c.title, [200, 320, 1200, 170], { ...H, fontSize: adaptiveType(c.title, 76, 48, 42), align: "center", vAlign: "middle" }, "title"),
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
      imageEl("Image", [100, 100, 660, 700], { src: c.media, assetId: c.mediaAssetId, radius: 20 }),
      shapeEl("Accent line", "rect", [840, 200, 64, 5]),
      textEl("Title", c.title, [840, 230, 660, 180], { ...H, fontSize: adaptiveType(c.title, 56, 40, 40), vAlign: "bottom" }, "title"),
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
      textEl("Title", c.title, [100, 510, 1100, 110], { ...H, fontSize: adaptiveType(c.title, 48, 36, 52) }, "title"),
      textEl("Key message", c.subtitle, [100, 640, 1000, 110], { ...SEC, fontSize: 26 }, "subtitle"),
    ],
  },
  {
    id: "closing-cta",
    name: "Closing / CTA",
    intents: ["Call to Action", "Closing"],
    build: (c) => [
      shapeEl("Panel", "rect", [0, 0, 1600, 900], { fill: "theme:surface" }),
      textEl("Title", c.title, [200, 250, 1200, 200], { ...H, fontSize: adaptiveType(c.title, 76, 48, 40), align: "center", vAlign: "bottom" }, "title"),
      textEl("Key message", c.subtitle, [300, 480, 1000, 110], { ...SEC, fontSize: 28, align: "center" }, "subtitle"),
      shapeEl("Button", "roundRect", [600, 640, 400, 76], { radius: 38 }),
      textEl("Call to action", c.body || "Decision required today", [600, 640, 400, 76], { fontSize: 22, fontWeight: 600, color: "theme:onAccent", align: "center", vAlign: "middle" }, "body"),
    ],
  },
  {
    id: "hero-editorial",
    name: "Editorial Hero",
    intents: ["Cover", "Section Divider", "Opportunity", "Case Study"],
    build: (c) => [
      imageEl("Hero image", [900, 0, 700, 900], { src: c.media, assetId: c.mediaAssetId, radius: 0 }),
      shapeEl("Editorial rule", "rect", [100, 110, 110, 4]),
      textEl("Eyebrow", item(c, 0).title || "Perspective", [100, 145, 660, 36], { ...SEC, fontSize: 17, uppercase: true, letterSpacing: 2 }, "decor"),
      textEl("Title", c.title, [100, 225, 700, 300], { ...H, fontSize: adaptiveType(c.title, 78, 50, 36), lineHeight: 0.98, vAlign: "bottom" }, "title"),
      textEl("Key message", c.subtitle, [100, 570, 690, 150], { fontSize: 29, fontWeight: 500, lineHeight: 1.25 }, "subtitle"),
      textEl("Footer", c.body, [100, 790, 690, 56], { ...SEC, fontSize: 16 }, "body"),
    ],
  },
  {
    id: "full-bleed-story",
    name: "Full Bleed Story",
    intents: ["Cover", "Section Divider", "Quote", "Case Study", "Closing"],
    build: (c) => [
      imageEl("Background image", [0, 0, 1600, 900], { src: c.media, assetId: c.mediaAssetId, radius: 0 }),
      { ...shapeEl("Dark overlay", "rect", [0, 0, 1600, 900], { fill: "#111111" }), opacity: 0.62 },
      shapeEl("Accent tag", "roundRect", [110, 120, 230, 52], { fill: "theme:accent", radius: 26 }),
      textEl("Tag", item(c, 0).title || "Key perspective", [110, 120, 230, 52], { fontSize: 17, fontWeight: 700, color: "theme:onAccent", align: "center", vAlign: "middle" }, "decor"),
      textEl("Title", c.title, [110, 300, 1180, 270], { ...H, fontSize: adaptiveType(c.title, 86, 54, 40), color: "#FFFFFF", lineHeight: 1.02, vAlign: "bottom" }, "title"),
      textEl("Key message", c.subtitle, [110, 610, 1040, 120], { fontSize: 28, fontWeight: 500, color: "#FFFFFF" }, "subtitle"),
      textEl("Footer", c.body, [110, 795, 1180, 42], { fontSize: 15, color: "#D5D5D5" }, "body"),
    ],
  },
  {
    id: "executive-metrics-band",
    name: "Executive Metrics Band",
    intents: ["Executive Summary", "Dashboard", "Financial", "Data Story"],
    build: (c) => [
      ...titleBlock(c),
      textEl("Key message", c.subtitle, [100, 210, 1100, 64], { fontSize: 26, fontWeight: 500 }, "subtitle"),
      shapeEl("Metrics band", "roundRect", [100, 315, 1400, 230], { fill: "theme:surface", stroke: "theme:line", strokeWidth: 1, radius: 18 }),
      ...[0, 1, 2, 3].flatMap((i) => {
        const x = 145 + i * 335;
        return [
          textEl(`KPI value ${i + 1}`, c.kpis[i] ?? "[Value]", [x, 350, 280, 92], { ...H, fontSize: 62, color: i === 0 ? "theme:accent" : "theme:primary" }, "kpiValue"),
          textEl(`KPI label ${i + 1}`, item(c, i).title, [x, 452, 280, 55], { ...SEC, fontSize: 17, fontWeight: 600 }, "itemTitle"),
        ];
      }),
      textEl("Narrative", c.body, [100, 620, 930, 155], { ...SEC, fontSize: 21, lineHeight: 1.4 }, "body"),
      shapeEl("Insight panel", "roundRect", [1090, 610, 410, 180], { fill: "theme:accentSoft", radius: 14 }),
      iconEl("Insight icon", "TrendingUp", [1130, 646, 42, 42]),
      textEl("Insight title", item(c, 0).title || "Management view", [1190, 642, 260, 42], { fontSize: 20, fontWeight: 700 }, "itemTitle"),
      textEl("Insight", item(c, 0).text || c.subtitle, [1130, 700, 320, 64], { ...SEC, fontSize: 16 }, "item"),
    ],
  },
  {
    id: "chart-story",
    name: "Chart + Insight Story",
    intents: ["Dashboard", "Data Story", "Financial", "Comparison"],
    build: (c) => [
      ...titleBlock(c),
      textEl("Key message", c.subtitle, [100, 205, 980, 60], { fontSize: 25, fontWeight: 500 }, "subtitle"),
      chartEl("Primary chart", [100, 300, 930, 470], {
        label: c.title,
        chartType: "column",
        showLegend: true,
        showValues: true,
        showGrid: true,
      }, "media"),
      shapeEl("Insight panel", "roundRect", [1085, 300, 415, 470], { fill: "theme:surface", stroke: "theme:line", strokeWidth: 1, radius: 18 }),
      textEl("Insight eyebrow", "KEY TAKEAWAYS", [1125, 340, 330, 32], { color: "theme:accent", fontSize: 15, fontWeight: 700, letterSpacing: 1.5 }, "decor"),
      ...[0, 1, 2].flatMap((i) => [
        textEl(`Takeaway ${i + 1} title`, item(c, i).title, [1125, 400 + i * 112, 325, 38], { fontSize: 21, fontWeight: 700 }, "itemTitle"),
        textEl(`Takeaway ${i + 1}`, item(c, i).text, [1125, 440 + i * 112, 325, 58], { ...SEC, fontSize: 15 }, "item"),
      ]),
    ],
  },
  {
    id: "finance-table",
    name: "Financial Table + Insight",
    intents: ["Financial", "Dashboard", "Comparison", "Data Story"],
    build: (c) => [
      ...titleBlock(c),
      textEl("Key message", c.subtitle, [100, 205, 1400, 55], { ...SEC, fontSize: 23 }, "subtitle"),
      tableEl("Financial table", [100, 300, 980, 500], {
        label: c.title,
        rows: [
          ["Metric", "Current", "Plan", "Δ"],
          [item(c, 0).title || "Revenue", c.kpis[0] ?? "120", c.kpis[1] ?? "135", "+12%"],
          [item(c, 1).title || "Margin", c.kpis[2] ?? "24%", c.kpis[3] ?? "28%", "+4pp"],
          [item(c, 2).title || "Cash", "86", "92", "+7%"],
          [item(c, 3).title || "Runway", "14m", "16m", "+2m"],
        ],
        headerRow: true,
        bandedRows: true,
        headerFill: "theme:accent",
      }, "media"),
      shapeEl("Commentary panel", "roundRect", [1130, 300, 370, 500], { fill: "theme:accentSoft", radius: 18 }),
      textEl("Commentary label", "MANAGEMENT COMMENTARY", [1170, 345, 290, 34], { color: "theme:accent", fontSize: 14, fontWeight: 700, letterSpacing: 1.2 }, "decor"),
      textEl("Commentary headline", item(c, 0).title || c.subtitle, [1170, 410, 290, 120], { ...H, fontSize: 31 }, "itemTitle"),
      textEl("Commentary", c.body || item(c, 0).text, [1170, 560, 290, 190], { ...SEC, fontSize: 18, lineHeight: 1.45 }, "body"),
    ],
  },
  {
    id: "strategy-matrix",
    name: "Strategy 2×2 Matrix",
    intents: ["Portfolio", "Comparison", "Opportunity", "Executive Summary"],
    build: (c) => [
      ...titleBlock(c),
      textEl("Key message", c.subtitle, [100, 210, 1400, 55], { ...SEC, fontSize: 23 }, "subtitle"),
      textEl("High value", "HIGH VALUE", [100, 320, 90, 28], { ...SEC, fontSize: 12, fontWeight: 700, letterSpacing: 1.4 }, "decor"),
      textEl("Low value", "LOW VALUE", [100, 760, 90, 28], { ...SEC, fontSize: 12, fontWeight: 700, letterSpacing: 1.4 }, "decor"),
      textEl("Low effort", "LOW EFFORT", [250, 800, 120, 28], { ...SEC, fontSize: 12, fontWeight: 700, letterSpacing: 1.4 }, "decor"),
      textEl("High effort", "HIGH EFFORT", [1280, 800, 120, 28], { ...SEC, fontSize: 12, fontWeight: 700, letterSpacing: 1.4 }, "decor"),
      shapeEl("Matrix", "roundRect", [220, 300, 1180, 470], { fill: "theme:surface", stroke: "theme:line", strokeWidth: 1, radius: 14 }),
      shapeEl("Vertical axis", "rect", [808, 300, 1, 470], { fill: "theme:line" }),
      shapeEl("Horizontal axis", "rect", [220, 534, 1180, 1], { fill: "theme:line" }),
      ...[0, 1, 2, 3].flatMap((i) => {
        const positions = [[300, 355], [900, 355], [300, 590], [900, 590]] as const;
        const [x, y] = positions[i]!;
        return [
          shapeEl(`Matrix dot ${i + 1}`, "ellipse", [x, y, 22, 22]),
          textEl(`Matrix item ${i + 1}`, item(c, i).title, [x + 40, y - 4, 380, 38], { fontSize: 22, fontWeight: 700 }, "itemTitle"),
          textEl(`Matrix detail ${i + 1}`, item(c, i).text, [x + 40, y + 38, 380, 70], { ...SEC, fontSize: 15 }, "item"),
        ];
      }),
    ],
  },
  {
    id: "roadmap-staircase",
    name: "Roadmap Staircase",
    intents: ["Roadmap", "Timeline", "Process"],
    build: (c) => [
      ...titleBlock(c),
      textEl("Key message", c.subtitle, [100, 205, 1400, 55], { ...SEC, fontSize: 23 }, "subtitle"),
      ...[0, 1, 2, 3].flatMap((i) => {
        const x = 100 + i * 355;
        const y = 560 - i * 85;
        return [
          shapeEl(`Stage ${i + 1}`, "roundRect", [x, y, 315, 230], { fill: i === 3 ? "theme:accent" : "theme:surface", stroke: i === 3 ? "transparent" : "theme:line", strokeWidth: 1, radius: 16 }),
          textEl(`Stage number ${i + 1}`, String(i + 1).padStart(2, "0"), [x + 28, y + 28, 60, 40], { ...H, fontSize: 30, color: i === 3 ? "theme:onAccent" : "theme:accent" }, "decor"),
          textEl(`Stage title ${i + 1}`, item(c, i).title, [x + 28, y + 88, 250, 62], { fontSize: 24, fontWeight: 700, color: i === 3 ? "theme:onAccent" : "theme:primary" }, "itemTitle"),
          textEl(`Stage detail ${i + 1}`, item(c, i).text, [x + 28, y + 154, 250, 50], { fontSize: 15, color: i === 3 ? "theme:onAccent" : "theme:secondary" }, "item"),
        ];
      }),
    ],
  },
  {
    id: "process-ribbon",
    name: "Process Ribbon",
    intents: ["Process", "Roadmap", "Timeline"],
    build: (c) => [
      ...titleBlock(c),
      textEl("Key message", c.subtitle, [100, 205, 1400, 55], { ...SEC, fontSize: 23 }, "subtitle"),
      ...[0, 1, 2, 3].flatMap((i) => {
        const y = 300 + i * 125;
        return [
          shapeEl(`Ribbon ${i + 1}`, "roundRect", [100 + i * 55, y, 1260 - i * 70, 92], { fill: i === 0 ? "theme:accent" : "theme:surface", stroke: i === 0 ? "transparent" : "theme:line", strokeWidth: 1, radius: 46 }),
          textEl(`Ribbon number ${i + 1}`, String(i + 1).padStart(2, "0"), [135 + i * 55, y + 22, 60, 45], { ...H, fontSize: 29, color: i === 0 ? "theme:onAccent" : "theme:accent" }, "decor"),
          textEl(`Ribbon title ${i + 1}`, item(c, i).title, [220 + i * 55, y + 18, 330, 48], { fontSize: 22, fontWeight: 700, color: i === 0 ? "theme:onAccent" : "theme:primary" }, "itemTitle"),
          textEl(`Ribbon text ${i + 1}`, item(c, i).text, [570 + i * 55, y + 22, 650 - i * 70, 42], { fontSize: 15, color: i === 0 ? "theme:onAccent" : "theme:secondary" }, "item"),
        ];
      }),
    ],
  },
  {
    id: "diagram-focus",
    name: "Diagram Focus",
    intents: ["Process", "Solution", "Portfolio", "Roadmap"],
    build: (c) => [
      ...titleBlock(c),
      textEl("Key message", c.subtitle, [100, 205, 1400, 55], { ...SEC, fontSize: 23 }, "subtitle"),
      diagramEl("Strategic diagram", [100, 315, 980, 470], {
        label: c.title,
        diagramType: "process",
        nodes: [0, 1, 2, 3].map((i) => ({ title: item(c, i).title, text: item(c, i).text })),
        accent: "theme:accent",
      }, "media"),
      shapeEl("Narrative panel", "roundRect", [1130, 315, 370, 470], { fill: "theme:surface", stroke: "theme:line", strokeWidth: 1, radius: 18 }),
      textEl("Narrative title", "WHY THIS MATTERS", [1170, 360, 290, 30], { color: "theme:accent", fontSize: 14, fontWeight: 700, letterSpacing: 1.2 }, "decor"),
      textEl("Narrative", c.body, [1170, 420, 290, 270], { ...SEC, fontSize: 19, lineHeight: 1.45 }, "body"),
    ],
  },
  {
    id: "image-stat-overlay",
    name: "Image + Stat Overlay",
    intents: ["Opportunity", "Case Study", "Big Number", "Data Story"],
    build: (c) => [
      imageEl("Story image", [0, 0, 900, 900], { src: c.media, assetId: c.mediaAssetId, radius: 0 }),
      shapeEl("Stat card", "roundRect", [650, 540, 360, 220], { fill: "theme:accent", radius: 18 }),
      textEl("Stat", c.kpis[0] ?? "[Value]", [690, 575, 280, 95], { ...H, fontSize: 72, color: "theme:onAccent" }, "kpiValue"),
      textEl("Stat label", item(c, 0).title, [690, 675, 280, 50], { fontSize: 17, fontWeight: 600, color: "theme:onAccent" }, "itemTitle"),
      textEl("Title", c.title, [1030, 170, 470, 220], { ...H, fontSize: adaptiveType(c.title, 56, 40, 38), lineHeight: 1.05 }, "title"),
      textEl("Key message", c.subtitle, [1030, 420, 470, 140], { fontSize: 25, fontWeight: 500 }, "subtitle"),
      textEl("Body", c.body, [1030, 610, 470, 150], { ...SEC, fontSize: 18 }, "body"),
    ],
  },
  {
    id: "quote-editorial",
    name: "Editorial Quote",
    intents: ["Quote", "Section Divider", "Closing"],
    build: (c) => [
      textEl("Quote mark", "“", [100, 115, 260, 180], { ...H, fontSize: 180, color: "theme:accent" }, "decor"),
      textEl("Quote", c.subtitle || c.title, [250, 245, 1100, 330], { ...H, fontSize: adaptiveType(c.subtitle || c.title, 62, 42, 72), lineHeight: 1.12, align: "center", vAlign: "middle" }, "subtitle"),
      shapeEl("Rule", "rect", [690, 635, 220, 2], { fill: "theme:line" }),
      textEl("Attribution", c.body || c.title, [400, 675, 800, 70], { ...SEC, fontSize: 20, align: "center" }, "body"),
    ],
  },
  {
    id: "decision-focus",
    name: "Decision Focus",
    intents: ["Call to Action", "Closing", "Executive Summary"],
    build: (c) => [
      shapeEl("Decision rail", "rect", [0, 0, 26, 900], { fill: "theme:accent" }),
      textEl("Decision label", "DECISION REQUIRED", [110, 120, 400, 36], { color: "theme:accent", fontSize: 16, fontWeight: 800, letterSpacing: 1.5 }, "decor"),
      textEl("Title", c.title, [110, 220, 1180, 210], { ...H, fontSize: adaptiveType(c.title, 72, 48, 42), lineHeight: 1.02 }, "title"),
      textEl("Key message", c.subtitle, [110, 475, 1050, 115], { fontSize: 29, fontWeight: 500 }, "subtitle"),
      shapeEl("Decision panel", "roundRect", [110, 650, 1380, 145], { fill: "theme:accentSoft", radius: 18 }),
      iconEl("Decision icon", "CheckCircle2", [155, 695, 48, 48]),
      textEl("Decision", c.body || item(c, 0).text || "Approve the recommended path and authorize next steps.", [235, 678, 1185, 85], { fontSize: 22, fontWeight: 600, vAlign: "middle" }, "body"),
    ],
  },
  {
    id: "cover-architectural",
    name: "Architectural Cover",
    intents: ["Cover", "Section Divider"],
    build: (c) => [
      imageEl("Architectural image", [610, 0, 990, 900], { src: c.media, assetId: c.mediaAssetId, radius: 0 }),
      { ...shapeEl("Image wash", "rect", [610, 0, 990, 900], { fill: "theme:primary" }), opacity: 0.14 },
      shapeEl("Vertical rail", "rect", [0, 0, 24, 900], { fill: "theme:accent" }),
      textEl("Index", "01", [105, 105, 160, 100], { ...H, fontSize: 78, color: "theme:accent" }, "decor"),
      textEl("Title", c.title, [105, 290, 430, 300], { ...H, fontSize: adaptiveType(c.title, 70, 46, 30), lineHeight: 0.98, vAlign: "bottom" }, "title"),
      textEl("Subtitle", c.subtitle, [105, 625, 420, 135], { ...SEC, fontSize: 23, lineHeight: 1.35 }, "subtitle"),
      shapeEl("Footer rule", "rect", [105, 805, 350, 2], { fill: "theme:line" }),
      textEl("Footer", c.body, [105, 820, 420, 40], { ...SEC, fontSize: 13 }, "body"),
    ],
  },
  {
    id: "cover-index",
    name: "Indexed Statement Cover",
    intents: ["Cover", "Section Divider"],
    build: (c) => [
      textEl("Large index", "01", [1020, 80, 460, 370], { ...H, fontSize: 290, color: "theme:accentSoft", align: "end", vAlign: "top" }, "decor"),
      shapeEl("Accent rule", "rect", [105, 155, 120, 5], { fill: "theme:accent" }),
      textEl("Eyebrow", item(c, 0).title || "Executive perspective", [105, 185, 620, 36], { fontSize: 14, fontWeight: 800, color: "theme:accent", letterSpacing: 1.6, uppercase: true }, "decor"),
      textEl("Title", c.title, [105, 290, 1080, 250], { ...H, fontSize: adaptiveType(c.title, 82, 50, 38), lineHeight: 1 }, "title"),
      textEl("Subtitle", c.subtitle, [105, 585, 980, 125], { fontSize: 28, fontWeight: 500, lineHeight: 1.28 }, "subtitle"),
      textEl("Footer", c.body, [105, 805, 1180, 42], { ...SEC, fontSize: 15 }, "body"),
    ],
  },
  {
    id: "image-caption",
    name: "Image + Editorial Caption",
    intents: ["Opportunity", "Case Study", "Problem", "Solution", "Team"],
    build: (c) => [
      imageEl("Editorial image", [100, 90, 1400, 530], { src: c.media, assetId: c.mediaAssetId, radius: 12 }),
      shapeEl("Caption rail", "rect", [100, 665, 6, 150], { fill: "theme:accent" }),
      textEl("Title", c.title, [145, 655, 620, 90], { ...H, fontSize: adaptiveType(c.title, 42, 32, 48) }, "title"),
      textEl("Key message", c.subtitle, [145, 752, 620, 70], { fontSize: 20, fontWeight: 500 }, "subtitle"),
      textEl("Body", c.body, [830, 665, 670, 155], { ...SEC, fontSize: 18, lineHeight: 1.4 }, "body"),
    ],
  },
  {
    id: "data-pulse",
    name: "Data Pulse",
    intents: ["Dashboard", "Data Story", "Financial"],
    build: (c) => [
      ...titleBlock(c),
      textEl("Key message", c.subtitle, [100, 210, 1400, 55], { fontSize: 24, fontWeight: 500 }, "subtitle"),
      chartEl("Trend chart", [100, 315, 980, 440], {
        label: "",
        chartType: "line",
        showLegend: true,
        showValues: false,
        showGrid: true,
      }, "media"),
      ...[0, 1, 2].flatMap((i) => [
        shapeEl(`Metric panel ${i + 1}`, "roundRect", [1135, 315 + i * 145, 365, 120], { fill: i === 0 ? "theme:accentSoft" : "theme:surface", stroke: "theme:line", strokeWidth: i === 0 ? 0 : 1, radius: 14 }),
        textEl(`Metric value ${i + 1}`, c.kpis[i] ?? "[Value]", [1170, 340 + i * 145, 130, 58], { ...H, fontSize: 40, color: i === 0 ? "theme:accent" : "theme:primary" }, "kpiValue"),
        textEl(`Metric label ${i + 1}`, item(c, i).title, [1320, 344 + i * 145, 140, 50], { ...SEC, fontSize: 15, fontWeight: 600 }, "itemTitle"),
      ]),
      textEl("Source note", c.body, [100, 792, 1400, 35], { ...SEC, fontSize: 14 }, "body"),
    ],
  },
  {
    id: "financial-scorecard",
    name: "Financial Scorecard",
    intents: ["Financial", "Dashboard", "Executive Summary"],
    build: (c) => [
      ...titleBlock(c),
      ...[0, 1, 2, 3].flatMap((i) => {
        const x = 100 + i * 350;
        return [
          textEl(`Score value ${i + 1}`, c.kpis[i] ?? "[Value]", [x, 245, 300, 80], { ...H, fontSize: 54, color: i === 0 ? "theme:accent" : "theme:primary" }, "kpiValue"),
          textEl(`Score label ${i + 1}`, item(c, i).title, [x, 330, 300, 42], { ...SEC, fontSize: 15, fontWeight: 600 }, "itemTitle"),
          shapeEl(`Score rule ${i + 1}`, "rect", [x, 390, 300, 1], { fill: "theme:line" }),
        ];
      }),
      tableEl("Scorecard table", [100, 455, 1400, 330], {
        rows: [
          ["Performance", "Actual", "Plan", "Variance"],
          [item(c, 0).title || "Revenue", c.kpis[0] ?? "120", c.kpis[1] ?? "128", "+6%"],
          [item(c, 1).title || "Margin", c.kpis[2] ?? "31%", c.kpis[3] ?? "30%", "+1pp"],
          [item(c, 2).title || "Cash", "86", "92", "-7%"],
        ],
        headerRow: true,
        bandedRows: false,
        headerFill: "theme:primary",
      }, "media"),
      textEl("Commentary", c.body, [100, 810, 1400, 34], { ...SEC, fontSize: 14 }, "body"),
    ],
  },
  {
    id: "executive-two-column",
    name: "Executive Two-column",
    intents: ["Executive Summary", "Problem", "Solution", "Opportunity", "Comparison"],
    build: (c) => [
      ...titleBlock(c),
      textEl("Governing thought", c.subtitle, [100, 230, 1400, 120], { ...H, fontSize: 34, lineHeight: 1.18 }, "subtitle"),
      shapeEl("Left panel", "roundRect", [100, 405, 670, 340], { fill: "theme:surface", stroke: "theme:line", strokeWidth: 1, radius: 14 }),
      shapeEl("Right panel", "roundRect", [830, 405, 670, 340], { fill: "theme:accentSoft", radius: 14 }),
      textEl("Left heading", item(c, 0).title, [145, 455, 570, 54], { fontSize: 24, fontWeight: 700 }, "itemTitle"),
      textEl("Left body", item(c, 0).text || c.body, [145, 530, 570, 165], { ...SEC, fontSize: 19, lineHeight: 1.4 }, "item"),
      textEl("Right heading", item(c, 1).title, [875, 455, 570, 54], { fontSize: 24, fontWeight: 700 }, "itemTitle"),
      textEl("Right body", item(c, 1).text || c.body, [875, 530, 570, 165], { ...SEC, fontSize: 19, lineHeight: 1.4 }, "item"),
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
    mediaAssetId: undefined,
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
    mediaAssetId: media && media.type === "image" ? media.properties.assetId : fallback.mediaAssetId,
  };
}

const RTL_MIRRORABLE_LAYOUTS = new Set([
  "cover-split",
  "cover-architectural",
  "cover-investment-memorandum",
  "cover-company-panorama",
  "cover-arabic-institutional",
  "hero-editorial",
  "title-content",
  "image-text",
  "image-caption",
  "image-stat-overlay",
  "chart-story",
  "data-pulse",
  "finance-table",
  "financial-scorecard",
  "diagram-focus",
  "decision-focus",
]);

export function slideIsRtl(slide: Pick<Slide, "title" | "keyMessage" | "contentSummary" | "bullets">) {
  const text = [slide.title, slide.keyMessage, slide.contentSummary, ...(slide.bullets ?? [])].join(" ");
  const rtl = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return rtl > 8 && rtl >= latin * 0.55;
}

function mirrorForRtl(elements: SlideElement[], layoutId: string): SlideElement[] {
  if (!RTL_MIRRORABLE_LAYOUTS.has(layoutId)) return elements;
  return elements.map((element) => {
    const next = {
      ...element,
      x: SLIDE_W - element.x - element.width,
    } as SlideElement;
    if (next.type === "shape" && next.properties.shape === "arrow") {
      next.rotation = (next.rotation + 180) % 360;
    }
    return next;
  });
}

export function buildLayout(layoutId: string, content: LayoutContent, slideId: string, rtl = false): SlideElement[] {
  const layout = getLayout(layoutId) ?? LAYOUTS[0]!;
  const elements = instantiate(layout.build(content), slideId);
  return rtl ? mirrorForRtl(elements, layout.id) : elements;
}

/**
 * Swap layout keeping content and any free (user-added) elements. Generated
 * content the new layout has no slot for is kept as free elements rather than
 * silently dropped.
 */
export function applyLayout(slide: Slide, layoutId: string): Slide {
  const content = contentFromElements(slide.elements, contentFromSlide(slide));
  // Carry edited structured data into the destination slot. A layout change must
  // never silently reset a user's chart series, table rows or diagram nodes.
  const originalData = slide.elements.filter(
    (e) => e.role && (e.type === "chart" || e.type === "table" || e.type === "diagram"),
  );
  const matchedData = new Set<string>();
  const previousImage = slide.elements.find((item) => item.type === "image" && item.role === "media");
  const generated = buildLayout(layoutId, content, slide.id, slideIsRtl(slide)).map((element) => {
    if (element.type === "image" && element.role === "media" && previousImage?.type === "image") {
      return {
        ...element,
        properties: { ...element.properties, treatment: previousImage.properties.treatment, crop: previousImage.properties.crop },
      } as SlideElement;
    }
    if (element.type !== "chart" && element.type !== "table" && element.type !== "diagram") return element;
    const existing = originalData.find((item) => item.type === element.type && !matchedData.has(item.id));
    if (!existing || existing.type !== element.type) return element;
    matchedData.add(existing.id);
    return { ...element, properties: { ...existing.properties } } as SlideElement;
  });
  const free = slide.elements.filter((e) => !e.role || e.name === "Evidence Citation");
  const retainedData = originalData
    .filter((element) => !matchedData.has(element.id))
    .map((element) => ({ ...element, role: "media" as const, name: `${element.name} (kept)` }) as SlideElement);
  const placedText = new Set(generated.flatMap((e) => (e.type === "text" ? [e.properties.text.trim()] : [])));
  const placedImages = new Set(generated.flatMap((e) => (e.type === "image" ? [e.properties.assetId ?? e.properties.src] : [])));
  const orphans = slide.elements
    .filter((e) => e.role && e.role !== "decor" && e.name !== "Evidence Citation")
    .filter((e) =>
      e.type === "text" ? e.properties.text.trim() !== "" && !placedText.has(e.properties.text.trim())
      : e.type === "image" ? !!(e.properties.src || e.properties.assetId) && !placedImages.has(e.properties.assetId ?? e.properties.src)
      : false,
    )
    .map((e) => ({ ...e, role: undefined, name: `${e.name} (kept)` }) as SlideElement);
  const elements = [...generated, ...orphans, ...retainedData, ...free].map((e, i) => ({ ...e, zIndex: i }));
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
    image: { src: "", assetId: undefined, fit: "cover", radius: 0 },
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
  return { ...slide, layoutId, elements: buildLayout(layoutId, contentFromSlide(slide), slide.id, slideIsRtl(slide)) };
}
