import type { LengthPreset, PresentationType, Slide, SlideIntent, Tone } from "@/lib/types";
import { applyLayout, buildLayout, getLayout, layoutsForIntent } from "@/lib/editor/layouts";
import { getTheme } from "@/lib/editor/themes";

export interface TemplateFamily {
  id: string;
  name: string;
  category: "Executive" | "Finance" | "Strategy" | "Technology" | "Proposal" | "Government";
  description: string;
  themeId: string;
  presentationType: PresentationType;
  tone: Tone;
  lengthPreset: LengthPreset;
  badge: string;
  signature: string;
  featured?: boolean;
  previewLayouts: string[];
  keywords: string[];
  layoutMap: Partial<Record<SlideIntent, string>>;
}

export const TEMPLATE_FAMILIES: TemplateFamily[] = [
  {
    id: "boardroom-strategy",
    name: "Boardroom Strategy",
    category: "Executive",
    description: "A restrained executive deck for strategy, board decisions and transformation programmes.",
    themeId: "executive-light",
    presentationType: "Board Presentation",
    tone: "Executive",
    lengthPreset: "Standard",
    badge: "Board-ready",
    signature: "Editorial restraint · decisive hierarchy · management-grade storytelling",
    featured: true,
    previewLayouts: ["hero-editorial", "executive-metrics-band", "strategy-matrix"],
    keywords: ["board", "strategy", "executive", "transformation", "decision"],
    layoutMap: {
      Cover: "hero-editorial",
      "Executive Summary": "executive-metrics-band",
      Problem: "title-content",
      Opportunity: "image-stat-overlay",
      Solution: "diagram-focus",
      Portfolio: "strategy-matrix",
      Roadmap: "roadmap-staircase",
      Financial: "chart-story",
      "Data Story": "chart-story",
      "Call to Action": "decision-focus",
      Closing: "decision-focus",
    },
  },
  {
    id: "financial-review",
    name: "Financial Review",
    category: "Finance",
    description: "Data-forward management reporting with KPIs, comparisons, timelines and clean financial hierarchy.",
    themeId: "modern-corporate",
    presentationType: "Financial Review",
    tone: "Data-driven",
    lengthPreset: "Standard",
    badge: "Data-led",
    signature: "CFO clarity · tables and charts · restrained financial commentary",
    featured: true,
    previewLayouts: ["executive-metrics-band", "chart-story", "finance-table"],
    keywords: ["finance", "cfo", "performance", "budget", "board", "kpi"],
    layoutMap: {
      Cover: "cover-minimal",
      "Executive Summary": "executive-metrics-band",
      "Big Number": "image-stat-overlay",
      Dashboard: "chart-story",
      "Data Story": "chart-story",
      Financial: "finance-table",
      Comparison: "finance-table",
      Timeline: "roadmap-staircase",
      Roadmap: "roadmap-staircase",
      "Call to Action": "decision-focus",
    },
  },
  {
    id: "technology-vision",
    name: "Technology Vision",
    category: "Technology",
    description: "Dark, modern storytelling for digital transformation, AI, platforms and technology roadmaps.",
    themeId: "technology",
    presentationType: "Strategy Deck",
    tone: "Professional",
    lengthPreset: "Standard",
    badge: "Dark mode",
    signature: "Immersive dark canvas · bold hero moments · product-system diagrams",
    featured: true,
    previewLayouts: ["full-bleed-story", "diagram-focus", "chart-story"],
    keywords: ["technology", "ai", "digital", "innovation", "platform", "roadmap"],
    layoutMap: {
      Cover: "full-bleed-story",
      "Section Divider": "full-bleed-story",
      "Executive Summary": "executive-metrics-band",
      Problem: "hero-editorial",
      Opportunity: "image-stat-overlay",
      Solution: "diagram-focus",
      Process: "process-ribbon",
      Roadmap: "roadmap-staircase",
      "Data Story": "chart-story",
      "Call to Action": "decision-focus",
    },
  },
  {
    id: "minimal-proposal",
    name: "Minimal Proposal",
    category: "Proposal",
    description: "Quiet, spacious proposal design for client work, services, recommendations and concise business cases.",
    themeId: "minimal",
    presentationType: "Business Proposal",
    tone: "Professional",
    lengthPreset: "Short",
    badge: "Minimal",
    signature: "Warm whitespace · image-led proposals · low-noise professional hierarchy",
    previewLayouts: ["hero-editorial", "image-text", "decision-focus"],
    keywords: ["proposal", "client", "services", "consulting", "minimal"],
    layoutMap: {
      Cover: "hero-editorial",
      Agenda: "four-cards",
      "Executive Summary": "title-content",
      Problem: "title-content",
      Solution: "image-text",
      Comparison: "comparison",
      "Case Study": "image-stat-overlay",
      "Call to Action": "decision-focus",
    },
  },
  {
    id: "investor-pitch",
    name: "Investor Pitch",
    category: "Proposal",
    description: "High-contrast narrative for opportunity, proof, economics, roadmap and the funding ask.",
    themeId: "executive-dark",
    presentationType: "Pitch Deck",
    tone: "Persuasive",
    lengthPreset: "Standard",
    badge: "Persuasive",
    signature: "High contrast · evidence-first narrative · investment-grade momentum",
    featured: true,
    previewLayouts: ["full-bleed-story", "image-stat-overlay", "executive-metrics-band"],
    keywords: ["investor", "pitch", "funding", "startup", "growth", "market"],
    layoutMap: {
      Cover: "full-bleed-story",
      Opportunity: "image-stat-overlay",
      Problem: "three-cards",
      Solution: "diagram-focus",
      "Data Story": "chart-story",
      Financial: "executive-metrics-band",
      Roadmap: "roadmap-staircase",
      Team: "three-cards",
      "Call to Action": "decision-focus",
    },
  },
  {
    id: "government-brief",
    name: "Government Brief",
    category: "Government",
    description: "Formal, structured briefing style for programmes, initiatives, decisions, status and public-sector communication.",
    themeId: "sovereign-green",
    presentationType: "Executive Presentation",
    tone: "Formal",
    lengthPreset: "Standard",
    badge: "Formal",
    signature: "Institutional structure · public-sector clarity · formal decision architecture",
    featured: true,
    previewLayouts: ["hero-editorial", "executive-metrics-band", "roadmap-staircase"],
    keywords: ["government", "public sector", "programme", "initiative", "vision", "formal"],
    layoutMap: {
      Cover: "hero-editorial",
      Agenda: "four-cards",
      "Executive Summary": "executive-metrics-band",
      Problem: "title-content",
      Solution: "diagram-focus",
      Process: "process-ribbon",
      Roadmap: "roadmap-staircase",
      Dashboard: "chart-story",
      "Call to Action": "decision-focus",
    },
  },
  {
    id: "strategy-consulting",
    name: "Strategy Consulting",
    category: "Strategy",
    description: "Consulting-style problem solving with crisp issue framing, matrices, workstreams, evidence and a decision-led close.",
    themeId: "consulting-navy",
    presentationType: "Strategy Deck",
    tone: "Executive",
    lengthPreset: "Standard",
    badge: "Consulting-grade",
    signature: "Sharp issue trees · matrix thinking · red accent discipline",
    featured: true,
    previewLayouts: ["title-content", "strategy-matrix", "decision-focus"],
    keywords: ["consulting", "strategy", "matrix", "recommendation", "workstream", "executive"],
    layoutMap: {
      Cover: "cover-minimal",
      Agenda: "four-cards",
      "Executive Summary": "executive-metrics-band",
      Problem: "title-content",
      Opportunity: "strategy-matrix",
      Solution: "diagram-focus",
      Comparison: "strategy-matrix",
      Process: "process-ribbon",
      Roadmap: "roadmap-staircase",
      "Data Story": "chart-story",
      Financial: "finance-table",
      "Call to Action": "decision-focus",
      Closing: "decision-focus",
    },
  },
  {
    id: "sovereign-vision",
    name: "Sovereign Vision",
    category: "Government",
    description: "Premium institutional storytelling for national programmes, authorities, transformation portfolios and executive committees.",
    themeId: "sovereign-green",
    presentationType: "Executive Presentation",
    tone: "Formal",
    lengthPreset: "Detailed",
    badge: "Institutional",
    signature: "Saudi-ready green and gold · calm authority · programme governance",
    featured: true,
    previewLayouts: ["hero-editorial", "roadmap-staircase", "strategy-matrix"],
    keywords: ["saudi", "government", "vision", "authority", "programme", "transformation"],
    layoutMap: {
      Cover: "hero-editorial",
      Agenda: "four-cards",
      "Executive Summary": "executive-metrics-band",
      "Section Divider": "section-divider",
      Problem: "title-content",
      Opportunity: "image-stat-overlay",
      Solution: "diagram-focus",
      Portfolio: "strategy-matrix",
      Process: "process-ribbon",
      Roadmap: "roadmap-staircase",
      Dashboard: "chart-story",
      "Call to Action": "decision-focus",
    },
  },
  {
    id: "luxury-investment",
    name: "Luxury Investment",
    category: "Executive",
    description: "A cinematic black-and-gold investment memorandum style for premium assets, hospitality, real estate and strategic transactions.",
    themeId: "luxury-black",
    presentationType: "Business Proposal",
    tone: "Persuasive",
    lengthPreset: "Standard",
    badge: "Premium",
    signature: "Black canvas · gold restraint · cinematic asset storytelling",
    featured: true,
    previewLayouts: ["full-bleed-story", "image-stat-overlay", "quote-editorial"],
    keywords: ["investment", "luxury", "real estate", "asset sale", "hospitality", "transaction"],
    layoutMap: {
      Cover: "full-bleed-story",
      "Executive Summary": "executive-metrics-band",
      Opportunity: "image-stat-overlay",
      Problem: "hero-editorial",
      Solution: "image-text",
      Financial: "finance-table",
      "Data Story": "chart-story",
      "Case Study": "full-bleed-story",
      Quote: "quote-editorial",
      "Call to Action": "decision-focus",
      Closing: "full-bleed-story",
    },
  },
  {
    id: "editorial-report",
    name: "Editorial Annual Report",
    category: "Executive",
    description: "Magazine-inspired annual reporting with strong typography, generous photography and sophisticated editorial pacing.",
    themeId: "editorial-cream",
    presentationType: "Annual Report",
    tone: "Professional",
    lengthPreset: "Detailed",
    badge: "Editorial",
    signature: "Magazine rhythm · serif headlines · photography-led storytelling",
    featured: true,
    previewLayouts: ["hero-editorial", "quote-editorial", "image-stat-overlay"],
    keywords: ["annual report", "editorial", "company profile", "storytelling", "leadership"],
    layoutMap: {
      Cover: "hero-editorial",
      "Section Divider": "full-bleed-story",
      "Executive Summary": "title-content",
      "Big Number": "image-stat-overlay",
      Opportunity: "hero-editorial",
      "Data Story": "chart-story",
      Financial: "finance-table",
      Quote: "quote-editorial",
      "Case Study": "image-stat-overlay",
      Team: "three-cards",
      Closing: "quote-editorial",
    },
  },
  {
    id: "cfo-performance",
    name: "CFO Performance Book",
    category: "Finance",
    description: "A disciplined performance book for CFO reviews, board packs, budget variance, cash and operating KPIs.",
    themeId: "finance-ink",
    presentationType: "Financial Review",
    tone: "Data-driven",
    lengthPreset: "Detailed",
    badge: "CFO pack",
    signature: "Ink-blue hierarchy · dense-but-clean data · commentary beside evidence",
    featured: true,
    previewLayouts: ["executive-metrics-band", "finance-table", "chart-story"],
    keywords: ["cfo", "finance", "board pack", "budget", "variance", "cash flow", "kpi"],
    layoutMap: {
      Cover: "cover-minimal",
      "Executive Summary": "executive-metrics-band",
      "Big Number": "big-number",
      Dashboard: "chart-story",
      "Data Story": "chart-story",
      Financial: "finance-table",
      Comparison: "finance-table",
      Timeline: "roadmap-staircase",
      "Call to Action": "decision-focus",
    },
  },
  {
    id: "ai-innovation",
    name: "AI Innovation",
    category: "Technology",
    description: "A deep-dark, neon-accented narrative for artificial intelligence, product vision, platform architecture and innovation strategy.",
    themeId: "ai-neon",
    presentationType: "Strategy Deck",
    tone: "Creative",
    lengthPreset: "Standard",
    badge: "AI-native",
    signature: "Deep-space dark · violet signal · system diagrams and data moments",
    featured: true,
    previewLayouts: ["full-bleed-story", "diagram-focus", "chart-story"],
    keywords: ["ai", "innovation", "technology", "product", "platform", "future"],
    layoutMap: {
      Cover: "full-bleed-story",
      "Section Divider": "full-bleed-story",
      "Executive Summary": "executive-metrics-band",
      Problem: "hero-editorial",
      Opportunity: "image-stat-overlay",
      Solution: "diagram-focus",
      Process: "process-ribbon",
      Roadmap: "roadmap-staircase",
      Dashboard: "chart-story",
      "Data Story": "chart-story",
      "Call to Action": "decision-focus",
    },
  },
  {
    id: "arabic-executive",
    name: "Arabic Executive",
    category: "Executive",
    description: "A premium Arabic-first executive family with balanced typography, warm neutrals and layouts that remain elegant in RTL.",
    themeId: "desert-sand",
    presentationType: "Executive Presentation",
    tone: "Executive",
    lengthPreset: "Standard",
    badge: "Arabic-first",
    signature: "Warm Saudi palette · Arabic typography · spacious RTL executive composition",
    featured: true,
    previewLayouts: ["hero-editorial", "executive-metrics-band", "decision-focus"],
    keywords: ["arabic", "rtl", "executive", "saudi", "board", "proposal"],
    layoutMap: {
      Cover: "hero-editorial",
      Agenda: "four-cards",
      "Executive Summary": "executive-metrics-band",
      Problem: "title-content",
      Opportunity: "image-stat-overlay",
      Solution: "diagram-focus",
      Process: "process-ribbon",
      Roadmap: "roadmap-staircase",
      Financial: "finance-table",
      "Call to Action": "decision-focus",
      Closing: "quote-editorial",
    },
  },
  {
    id: "capital-markets",
    name: "Capital Markets",
    category: "Finance",
    description: "Dark-blue investor relations and transaction storytelling for capital raises, valuations, market updates and deal committees.",
    themeId: "royal-blue",
    presentationType: "Pitch Deck",
    tone: "Persuasive",
    lengthPreset: "Standard",
    badge: "Markets",
    signature: "Royal blue depth · crisp numbers · transaction-grade hierarchy",
    previewLayouts: ["executive-metrics-band", "chart-story", "decision-focus"],
    keywords: ["capital markets", "investor relations", "valuation", "deal", "transaction", "funding"],
    layoutMap: {
      Cover: "cover-bold",
      "Executive Summary": "executive-metrics-band",
      Opportunity: "image-stat-overlay",
      Dashboard: "chart-story",
      "Data Story": "chart-story",
      Financial: "finance-table",
      Comparison: "strategy-matrix",
      Roadmap: "roadmap-staircase",
      "Call to Action": "decision-focus",
    },
  },
  {
    id: "esg-impact",
    name: "ESG & Impact",
    category: "Strategy",
    description: "A modern green system for sustainability, impact reporting, ESG roadmaps and strategic performance narratives.",
    themeId: "emerald-dark",
    presentationType: "Annual Report",
    tone: "Professional",
    lengthPreset: "Standard",
    badge: "Impact",
    signature: "Emerald dark · impact metrics · roadmap and evidence balance",
    previewLayouts: ["image-stat-overlay", "executive-metrics-band", "roadmap-staircase"],
    keywords: ["esg", "sustainability", "impact", "environment", "governance", "report"],
    layoutMap: {
      Cover: "full-bleed-story",
      "Executive Summary": "executive-metrics-band",
      "Big Number": "image-stat-overlay",
      Dashboard: "chart-story",
      Process: "process-ribbon",
      Roadmap: "roadmap-staircase",
      "Data Story": "chart-story",
      Portfolio: "strategy-matrix",
      "Call to Action": "decision-focus",
    },
  },
];

export function getTemplateFamily(id?: string | null): TemplateFamily | undefined {
  return id ? TEMPLATE_FAMILIES.find((template) => template.id === id) : undefined;
}

const PREMIUM_LAYOUT_VARIANTS: Record<string, string[]> = {
  "hero-editorial": ["hero-editorial", "image-text", "full-bleed-story"],
  "full-bleed-story": ["full-bleed-story", "hero-editorial", "quote-editorial"],
  "executive-metrics-band": ["executive-metrics-band", "chart-story", "four-cards", "kpi-metrics"],
  "chart-story": ["chart-story", "executive-metrics-band", "finance-table", "image-stat-overlay"],
  "finance-table": ["finance-table", "chart-story", "executive-metrics-band", "comparison"],
  "strategy-matrix": ["strategy-matrix", "comparison", "four-cards"],
  "roadmap-staircase": ["roadmap-staircase", "process-ribbon", "timeline"],
  "process-ribbon": ["process-ribbon", "diagram-focus", "roadmap-staircase", "timeline"],
  "diagram-focus": ["diagram-focus", "process-ribbon", "image-text"],
  "image-stat-overlay": ["image-stat-overlay", "big-number", "hero-editorial", "chart-story"],
  "decision-focus": ["decision-focus", "closing-cta", "quote-editorial"],
  "title-content": ["title-content", "three-cards", "image-text"],
  "four-cards": ["four-cards", "title-content", "three-cards"],
  "three-cards": ["three-cards", "four-cards", "title-content"],
};

function layoutVisualFamily(id: string) {
  if (id.includes("chart") || id.includes("metric") || id.includes("table") || id === "big-number") return "data";
  if (id.includes("image") || id.includes("hero") || id.includes("bleed") || id.includes("editorial")) return "image";
  if (id.includes("matrix") || id.includes("card")) return "cards";
  if (id.includes("roadmap") || id.includes("ribbon") || id.includes("timeline") || id.includes("diagram")) return "flow";
  if (id.includes("decision") || id.includes("closing") || id.includes("quote")) return "statement";
  return "text";
}

export function applyTemplateFamilyToSlides(slides: Slide[], template: TemplateFamily): Slide[] {
  let previous = "";
  let previousFamily = "";
  let familyStreak = 0;

  return slides.map((slide, index) => {
    const preferred = template.layoutMap[slide.slideIntent];
    if (!preferred) return slide;

    const compatible = (id: string) => getLayout(id)?.intents.includes(slide.slideIntent) ?? false;
    const candidates = [
      preferred,
      ...(PREMIUM_LAYOUT_VARIANTS[preferred] ?? []),
      ...layoutsForIntent(slide.slideIntent).map((layout) => layout.id),
    ].filter((id, candidateIndex, all) => all.indexOf(id) === candidateIndex && compatible(id));

    let chosen = candidates[0] ?? preferred;
    if (index > 0) {
      const varied = candidates.find((id) => {
        if (id === previous) return false;
        const family = layoutVisualFamily(id);
        return familyStreak < 2 || family !== previousFamily;
      });
      if (varied) chosen = varied;
    }

    const family = layoutVisualFamily(chosen);
    familyStreak = family === previousFamily ? familyStreak + 1 : 1;
    previousFamily = family;
    previous = chosen;
    return applyLayout(slide, chosen);
  });
}


type PreviewMediaKind =
  | "boardroom"
  | "finance"
  | "technology"
  | "minimal"
  | "growth"
  | "government"
  | "consulting"
  | "sovereign"
  | "luxury"
  | "editorial"
  | "arabic"
  | "markets"
  | "impact";

interface TemplatePreviewProfile {
  titles: [string, string, string];
  subtitles: [string, string, string];
  bodies: [string, string, string];
  items: { title: string; text: string }[];
  kpis: string[];
  media: PreviewMediaKind;
  chartCategories?: string[];
  chartSeries?: { name: string; values: number[] }[];
  tableRows?: string[][];
  diagramNodes?: { title: string; text: string }[];
  rtl?: boolean;
}

const TEMPLATE_PREVIEW_PROFILES: Record<string, TemplatePreviewProfile> = {
  "boardroom-strategy": {
    titles: ["Transformation agenda 2027", "The value at stake", "Where to place the bets"],
    subtitles: [
      "A board-level view of the choices that matter most over the next 18 months.",
      "Three value pools explain most of the upside — and two execution risks explain most of the downside.",
      "Prioritize initiatives by strategic value and delivery confidence.",
    ],
    bodies: [
      "A restrained board narrative built around choices, evidence and decisions.",
      "Management should protect the core while selectively accelerating the highest-return growth moves.",
      "The portfolio view separates quick wins from strategic bets and low-return distractions.",
    ],
    items: [
      { title: "Core performance", text: "Protect margin and service quality in the base business." },
      { title: "Growth engine", text: "Scale the two channels with the strongest unit economics." },
      { title: "Operating model", text: "Simplify decision rights and execution cadence." },
      { title: "Capability", text: "Build the critical data and leadership capabilities early." },
    ],
    kpis: ["+18%", "2.4×", "SAR 86m", "12 mo"],
    media: "boardroom",
  },
  "financial-review": {
    titles: ["Q3 management review", "Revenue and margin trajectory", "Variance requiring action"],
    subtitles: [
      "Growth remains healthy, while mix and operating leverage are the key management questions.",
      "Revenue is ahead of plan; gross margin improvement is concentrated in two business lines.",
      "The remaining gap is manageable if procurement and pricing actions land this quarter.",
    ],
    bodies: [
      "A data-led management pack designed around performance, variance and actions.",
      "Quarterly performance shows improving scale efficiency with a temporary working-capital drag.",
      "Focus management commentary on the few deviations that materially change the outlook.",
    ],
    items: [
      { title: "Revenue", text: "Ahead of plan on enterprise demand." },
      { title: "Gross margin", text: "Improving as product mix normalizes." },
      { title: "Opex", text: "Hiring pace remains below budget." },
      { title: "Cash", text: "Collections timing creates a temporary gap." },
    ],
    kpis: ["SAR 128m", "31.6%", "+7.4%", "SAR 22m"],
    media: "finance",
    chartCategories: ["Q1", "Q2", "Q3", "Q4E"],
    chartSeries: [
      { name: "Actual", values: [82, 96, 112, 128] },
      { name: "Plan", values: [86, 94, 104, 121] },
    ],
    tableRows: [
      ["Metric", "Actual", "Plan", "Variance"],
      ["Revenue", "128.0", "121.0", "+5.8%"],
      ["Gross margin", "31.6%", "29.8%", "+1.8pp"],
      ["EBITDA", "22.4", "20.1", "+11.4%"],
      ["Cash conversion", "78%", "84%", "-6pp"],
    ],
  },
  "technology-vision": {
    titles: ["Digital core, reimagined", "One platform. Four capabilities.", "Scale adoption with evidence"],
    subtitles: [
      "A modular technology strategy that turns fragmented systems into a connected digital operating platform.",
      "Experience, intelligence, integration and trust form the core architecture.",
      "Adoption accelerates once the platform solves real workflow friction rather than adding another layer.",
    ],
    bodies: [
      "Designed for transformation, platform and digital strategy narratives.",
      "The architecture separates reusable capabilities from channel-specific experiences.",
      "Measure success through adoption, automation rate, cycle time and digital revenue contribution.",
    ],
    items: [
      { title: "Experience", text: "Unified journeys across customer and employee touchpoints." },
      { title: "Intelligence", text: "Decision support and automation embedded in workflows." },
      { title: "Integration", text: "Composable APIs connecting the enterprise core." },
      { title: "Trust", text: "Security, identity and governance by design." },
    ],
    kpis: ["68%", "42%", "3.1×", "11 wk"],
    media: "technology",
    chartCategories: ["Pilot", "Wave 1", "Wave 2", "Scale"],
    chartSeries: [{ name: "Adoption", values: [12, 31, 56, 78] }],
    diagramNodes: [
      { title: "Experience", text: "Channels and journeys" },
      { title: "Intelligence", text: "AI and analytics" },
      { title: "Integration", text: "APIs and events" },
      { title: "Trust", text: "Identity and controls" },
    ],
  },
  "minimal-proposal": {
    titles: ["A simpler way forward", "Designed around your customer", "A focused engagement"],
    subtitles: [
      "A concise proposal that makes the recommendation feel clear, calm and easy to act on.",
      "The solution removes friction without introducing unnecessary process.",
      "Three workstreams, one accountable team and a short path to measurable value.",
    ],
    bodies: [
      "Quiet whitespace, precise language and a restrained visual system.",
      "We start from the moments that matter most to customers and frontline teams.",
      "The engagement is intentionally lightweight: diagnose, design and deliver.",
    ],
    items: [
      { title: "Discover", text: "Understand the real friction and decision constraints." },
      { title: "Design", text: "Shape a practical future-state experience." },
      { title: "Deliver", text: "Launch the highest-value changes first." },
      { title: "Embed", text: "Leave the team with a repeatable operating rhythm." },
    ],
    kpis: ["3 wk", "12", "4", "1 team"],
    media: "minimal",
  },
  "investor-pitch": {
    titles: ["The category is inflecting now", "Proof that the model scales", "A capital-efficient growth engine"],
    subtitles: [
      "A large market is moving from fragmented offline demand to a software-led operating model.",
      "Growth, retention and payback are improving together — the strongest signal of scalable economics.",
      "The next raise accelerates distribution and product depth, not basic product-market fit.",
    ],
    bodies: [
      "A high-contrast investor story built around timing, proof and economics.",
      "Strong cohort behavior and improving sales efficiency reduce the risk of the next stage.",
      "Capital is concentrated on the channels and products with the clearest path to durable returns.",
    ],
    items: [
      { title: "Market", text: "Large, fragmented and structurally underserved." },
      { title: "Product", text: "Workflow-native and increasingly embedded." },
      { title: "Economics", text: "Payback improves as expansion revenue grows." },
      { title: "Moat", text: "Data and distribution deepen with scale." },
    ],
    kpis: ["3.4×", "124%", "7 mo", "$42m"],
    media: "growth",
    chartCategories: ["2024", "2025", "2026", "2027E"],
    chartSeries: [{ name: "ARR", values: [8, 18, 36, 64] }],
  },
  "government-brief": {
    titles: ["Executive programme brief", "Delivery performance at a glance", "Critical milestones to decision"],
    subtitles: [
      "A formal briefing structure for programme status, governance and executive decisions.",
      "Most initiatives are on track; two dependencies require cross-agency intervention.",
      "The next 90 days concentrate on approvals, procurement and operational readiness.",
    ],
    bodies: [
      "Institutional clarity with formal hierarchy and restrained government styling.",
      "Progress is measured against outcomes, milestones and dependency resolution.",
      "Escalate only the issues that require executive sponsorship or policy direction.",
    ],
    items: [
      { title: "Policy", text: "Confirm the enabling decision and ownership." },
      { title: "Delivery", text: "Protect critical-path milestones." },
      { title: "Readiness", text: "Complete operating and capability preparation." },
      { title: "Governance", text: "Maintain weekly dependency resolution." },
    ],
    kpis: ["82%", "14/17", "2 risks", "90 days"],
    media: "government",
  },
  "strategy-consulting": {
    titles: ["The answer is concentration", "Where value exceeds complexity", "Decision required"],
    subtitles: [
      "The business can unlock disproportionate value by concentrating resources on three priority moves.",
      "The portfolio separates high-value executable moves from initiatives that dilute management attention.",
      "Approve the priority portfolio and stop the low-return work that competes for the same capacity.",
    ],
    bodies: [
      "A consulting-grade storyline built around a governing thought, evidence and recommendation.",
      "Value and feasibility should drive sequencing — not historical ownership or sunk cost.",
      "The decision creates a single management agenda and releases resources for execution.",
    ],
    items: [
      { title: "Pricing reset", text: "High value, low implementation complexity." },
      { title: "Channel shift", text: "High value with moderate capability needs." },
      { title: "Portfolio simplification", text: "Immediate capacity release." },
      { title: "New adjacency", text: "Strategic upside, but sequence after the core." },
    ],
    kpis: ["SAR 64m", "11%", "6 mo", "3 moves"],
    media: "consulting",
  },
  "sovereign-vision": {
    titles: ["From ambition to national impact", "A sequenced transformation portfolio", "Focus the next wave"],
    subtitles: [
      "Translate strategic ambition into visible outcomes through a small number of integrated national programmes.",
      "The portfolio balances citizen impact, economic value, institutional readiness and execution complexity.",
      "Wave two should scale the capabilities that unlock multiple programmes at once.",
    ],
    bodies: [
      "A premium institutional narrative for national programmes and executive committees.",
      "Shared digital, policy and capability enablers reduce duplication across the transformation portfolio.",
      "The next wave prioritizes common infrastructure, service redesign and measurable outcomes.",
    ],
    items: [
      { title: "Citizen services", text: "Simplify the highest-volume journeys end to end." },
      { title: "Economic enablement", text: "Remove friction from priority sectors and investors." },
      { title: "Shared platforms", text: "Create reusable data, identity and payment capabilities." },
      { title: "Institutional capability", text: "Build the operating model required to sustain change." },
    ],
    kpis: ["18m", "27 services", "SAR 3.2b", "2027"],
    media: "sovereign",
  },
  "luxury-investment": {
    titles: ["An irreplaceable asset", "Scarcity supports premium value", "The investment case"],
    subtitles: [
      "A landmark asset combining strategic location, operating potential and long-term scarcity value.",
      "Comparable supply is limited while demand for premium experiential assets continues to deepen.",
      "Value creation comes from repositioning, operating uplift and disciplined capital deployment.",
    ],
    bodies: [
      "Cinematic black-and-gold storytelling for premium transactions and investment memoranda.",
      "The asset benefits from a rare combination of physical scale, access and repositioning potential.",
      "The case balances downside protection with identifiable operating and development upside.",
    ],
    items: [
      { title: "Location", text: "Strategic access with limited comparable supply." },
      { title: "Scale", text: "Physical footprint supports multiple value-creation paths." },
      { title: "Operations", text: "Clear margin and utilization upside." },
      { title: "Exit", text: "Scarcity strengthens long-term optionality." },
    ],
    kpis: ["SAR 420m", "18.6%", "7.2×", "36 mo"],
    media: "luxury",
    tableRows: [
      ["Metric", "Base", "Upside", "Exit"],
      ["Revenue", "52", "71", "84"],
      ["EBITDA margin", "24%", "31%", "34%"],
      ["Occupancy", "68%", "81%", "86%"],
      ["Value", "420", "515", "610"],
    ],
  },
  "editorial-report": {
    titles: ["A year of deliberate growth", "Momentum with discipline", "The story behind the numbers"],
    subtitles: [
      "Growth became more focused, more resilient and more closely tied to customer value.",
      "The company expanded while improving operating quality across the portfolio.",
      "The strongest progress came from fewer priorities executed with greater consistency.",
    ],
    bodies: [
      "Magazine-inspired annual reporting with editorial pacing and strong visual storytelling.",
      "Performance improved across customer growth, margin, service quality and employee engagement.",
      "Leadership commentary connects the financial result to the choices that produced it.",
    ],
    items: [
      { title: "Customers", text: "Deeper relationships in priority segments." },
      { title: "Operations", text: "Higher service reliability and lower friction." },
      { title: "People", text: "Stronger leadership bench and internal mobility." },
      { title: "Impact", text: "More disciplined investment in long-term capabilities." },
    ],
    kpis: ["+21%", "92%", "31%", "4.6/5"],
    media: "editorial",
  },
  "cfo-performance": {
    titles: ["CFO performance book", "What changed vs plan", "Cash and margin outlook"],
    subtitles: [
      "A decision-focused view of earnings quality, variance, liquidity and forward risk.",
      "Most variance is concentrated in mix, procurement and collections timing.",
      "The outlook remains intact if margin actions and receivables recovery land on schedule.",
    ],
    bodies: [
      "Dense-but-clean financial reporting with commentary positioned beside the evidence.",
      "Separate structural performance changes from timing effects to protect decision quality.",
      "Cash conversion and margin recovery are the two metrics management should watch weekly.",
    ],
    items: [
      { title: "Revenue", text: "Volume positive; mix slightly dilutive." },
      { title: "Margin", text: "Procurement savings partially offset inflation." },
      { title: "Working capital", text: "Receivables timing remains the main drag." },
      { title: "Liquidity", text: "Headroom remains comfortable under the base case." },
    ],
    kpis: ["SAR 312m", "28.4%", "SAR 46m", "1.7×"],
    media: "finance",
    chartCategories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    chartSeries: [
      { name: "Actual", values: [24, 28, 31, 33, 36, 39] },
      { name: "Plan", values: [25, 27, 30, 34, 37, 40] },
    ],
    tableRows: [
      ["Metric", "Actual", "Budget", "Variance"],
      ["Revenue", "312", "298", "+14"],
      ["EBITDA", "46", "43", "+3"],
      ["Free cash flow", "29", "35", "-6"],
      ["Net debt / EBITDA", "1.7×", "1.9×", "-0.2×"],
    ],
  },
  "ai-innovation": {
    titles: ["AI becomes the operating layer", "A reusable intelligence stack", "Scale from copilots to workflows"],
    subtitles: [
      "The opportunity is not another chatbot — it is redesigning work around intelligence that is embedded, governed and reusable.",
      "A common model, data and orchestration layer lets teams build faster without recreating controls.",
      "Value compounds as isolated copilots become connected end-to-end workflows.",
    ],
    bodies: [
      "Deep-space visual language for AI strategy, product architecture and innovation portfolios.",
      "The platform separates models from orchestration, knowledge, tools, identity and observability.",
      "Prioritize workflows with high repetition, clear quality signals and measurable business outcomes.",
    ],
    items: [
      { title: "Models", text: "Best-fit models selected by task and risk." },
      { title: "Knowledge", text: "Grounded enterprise context with permissions." },
      { title: "Orchestration", text: "Agents, tools and business rules connected safely." },
      { title: "Observability", text: "Quality, cost and risk measured continuously." },
    ],
    kpis: ["42%", "3.8×", "67%", "8 wk"],
    media: "technology",
    chartCategories: ["Assist", "Copilot", "Workflow", "Agent"],
    chartSeries: [{ name: "Value capture", values: [14, 31, 58, 82] }],
    diagramNodes: [
      { title: "Models", text: "Reasoning and generation" },
      { title: "Knowledge", text: "Grounded enterprise context" },
      { title: "Orchestration", text: "Tools, agents and policies" },
      { title: "Observe", text: "Quality, cost and risk" },
    ],
  },
  "arabic-executive": {
    titles: ["رؤية تنفيذية واضحة", "مؤشرات تقود القرار", "القرار والخطوات القادمة"],
    subtitles: [
      "عرض عربي تنفيذي يضع الرسالة الرئيسية والقرار المطلوب في مقدمة المشهد.",
      "تحسن الأداء واضح، لكن القيمة الحقيقية تعتمد على ثلاثة محركات يجب متابعتها بدقة.",
      "توحيد الأولويات وتحويل التوصيات إلى مسؤوليات ومواعيد تنفيذ قابلة للمتابعة.",
    ],
    bodies: [
      "تصميم عربي احترافي بمساحات هادئة وهوية دافئة مناسبة لمجالس الإدارة واللجان التنفيذية.",
      "يتم تقديم الأرقام ضمن سياق واضح يشرح ما تغير، ولماذا يهم، وما المطلوب من الإدارة.",
      "تنتهي القصة بقرار محدد وخطة تنفيذ مختصرة بدل الاكتفاء بعرض المعلومات.",
    ],
    items: [
      { title: "الأداء", text: "تحسن مستمر في المؤشرات ذات الأولوية." },
      { title: "الفرصة", text: "تركيز الموارد على المبادرات الأعلى أثراً." },
      { title: "المخاطر", text: "معالجة الاعتماديات قبل أن تؤثر على التنفيذ." },
      { title: "القرار", text: "اعتماد المسار وتسريع التنفيذ خلال الربع القادم." },
    ],
    kpis: ["24%", "1.8×", "42م ر.س", "90 يوم"],
    media: "arabic",
    rtl: true,
  },
  "capital-markets": {
    titles: ["Capital markets update", "Valuation supported by execution", "The transaction path"],
    subtitles: [
      "The market is rewarding durable growth, cash visibility and credible execution more than headline expansion.",
      "Multiple support comes from improving margins, resilient demand and a clearer medium-term cash profile.",
      "Sequence the transaction around proof points that maximize confidence and reduce execution risk.",
    ],
    bodies: [
      "A transaction-grade visual system for investor relations, valuation and deal committees.",
      "The valuation bridge is strongest when operating delivery and capital structure tell the same story.",
      "The recommended path protects optionality while building evidence ahead of the key market window.",
    ],
    items: [
      { title: "Growth", text: "Top-line visibility remains above peer median." },
      { title: "Margin", text: "Expansion supports quality of earnings." },
      { title: "Leverage", text: "Balance-sheet headroom preserves flexibility." },
      { title: "Timing", text: "Key proof points cluster before the market window." },
    ],
    kpis: ["8.4×", "+14%", "2.1×", "Q2 2027"],
    media: "markets",
    chartCategories: ["Jan", "Mar", "May", "Jul", "Sep"],
    chartSeries: [
      { name: "Company", values: [100, 108, 119, 126, 139] },
      { name: "Index", values: [100, 103, 105, 108, 111] },
    ],
    tableRows: [
      ["Valuation", "Low", "Base", "High"],
      ["EV / EBITDA", "7.2×", "8.4×", "9.6×"],
      ["Equity value", "610", "735", "860"],
      ["Net debt", "140", "125", "110"],
      ["Implied price", "18.4", "22.7", "27.1"],
    ],
  },
  "esg-impact": {
    titles: ["Impact that compounds", "Progress across the material priorities", "From commitments to outcomes"],
    subtitles: [
      "Sustainability creates the most value when environmental, social and governance priorities reinforce operating performance.",
      "The strongest gains are concentrated in energy intensity, safety and supplier standards.",
      "The next roadmap moves from target setting to embedded operating accountability.",
    ],
    bodies: [
      "A modern impact narrative balancing evidence, ambition and operational relevance.",
      "Materiality keeps the report focused on the topics that matter to stakeholders and enterprise value.",
      "Clear owners, baselines and milestones turn ESG from reporting into management practice.",
    ],
    items: [
      { title: "Climate", text: "Reduce energy and emissions intensity." },
      { title: "People", text: "Improve safety, capability and inclusion." },
      { title: "Supply chain", text: "Raise standards across critical suppliers." },
      { title: "Governance", text: "Embed ownership and transparent reporting." },
    ],
    kpis: ["-18%", "0.42", "91%", "100%"],
    media: "impact",
    chartCategories: ["2024", "2025", "2026", "2027E"],
    chartSeries: [{ name: "Intensity index", values: [100, 91, 82, 74] }],
  },
};

const DEFAULT_PREVIEW_PROFILE: TemplatePreviewProfile = {
  titles: ["A clear point of view", "The evidence behind the decision", "What happens next"],
  subtitles: [
    "A focused narrative built around the decision that matters most.",
    "Performance is moving in the right direction, but three drivers determine the outcome.",
    "Align the team around priority actions, owners and timing.",
  ],
  bodies: [
    "A premium presentation system with coordinated typography, visual rhythm and intent-aware layouts.",
    "Evidence is organized so the audience can move from signal to implication quickly.",
    "Close with a clear decision and a practical next step.",
  ],
  items: [
    { title: "Priority one", text: "Concentrate effort where impact and confidence are highest." },
    { title: "Priority two", text: "Make the trade-offs explicit and easy to discuss." },
    { title: "Priority three", text: "Translate the narrative into measurable action." },
    { title: "Priority four", text: "Protect momentum with a simple governance rhythm." },
  ],
  kpis: ["24%", "1.8×", "SAR 42m", "90d"],
  media: "minimal",
};

function previewMedia(template: TemplateFamily, kind: PreviewMediaKind) {
  const t = getTheme(template.themeId);
  const bg = t.colors.surface;
  const ink = t.colors.primary;
  const accent = t.colors.accent;
  const soft = t.colors.accentSoft;
  const line = t.colors.line;

  const visuals: Record<PreviewMediaKind, string> = {
    boardroom:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<rect x="90" y="115" width="1020" height="560" rx="28" fill="' + soft + '"/>' +
      '<path d="M145 610V390h90v220m45 0V305h110v305m52 0V425h88v185m52 0V250h125v360m55 0V345h100v265m55 0V205h125v405" stroke="' + ink + '" stroke-width="18" opacity=".86"/>' +
      '<rect x="120" y="720" width="960" height="16" rx="8" fill="' + accent + '"/>' +
      '<circle cx="1030" cy="145" r="46" fill="' + accent + '"/>',
    finance:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<g stroke="' + line + '" stroke-width="2" opacity=".85">' +
      Array.from({length:7},(_,i)=>'<line x1="120" y1="'+(180+i*82)+'" x2="1080" y2="'+(180+i*82)+'"/>').join("") +
      '</g>' +
      '<g fill="' + accent + '">' +
      '<rect x="170" y="540" width="105" height="210" rx="10"/><rect x="340" y="450" width="105" height="300" rx="10"/><rect x="510" y="355" width="105" height="395" rx="10"/><rect x="680" y="290" width="105" height="460" rx="10"/><rect x="850" y="210" width="105" height="540" rx="10"/>' +
      '</g><path d="M160 500 C320 470 400 390 535 410 S780 260 1010 190" fill="none" stroke="' + ink + '" stroke-width="14" stroke-linecap="round"/>',
    technology:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<g stroke="' + accent + '" stroke-width="5" opacity=".42">' +
      '<path d="M190 620L390 330L600 500L805 245L1030 520M390 330L805 245M600 500L1030 520M190 620L600 500"/>' +
      '</g>' +
      '<g fill="' + soft + '" stroke="' + accent + '" stroke-width="6">' +
      '<circle cx="190" cy="620" r="62"/><circle cx="390" cy="330" r="78"/><circle cx="600" cy="500" r="92"/><circle cx="805" cy="245" r="66"/><circle cx="1030" cy="520" r="82"/>' +
      '</g><circle cx="600" cy="500" r="28" fill="' + accent + '"/>',
    minimal:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<rect x="120" y="135" width="390" height="540" fill="' + soft + '"/>' +
      '<circle cx="830" cy="340" r="210" fill="' + accent + '" opacity=".13"/>' +
      '<rect x="620" y="250" width="430" height="18" rx="9" fill="' + ink + '" opacity=".9"/>' +
      '<rect x="620" y="300" width="300" height="9" rx="4.5" fill="' + ink + '" opacity=".25"/>' +
      '<rect x="620" y="330" width="355" height="9" rx="4.5" fill="' + ink + '" opacity=".18"/>' +
      '<rect x="620" y="650" width="210" height="8" rx="4" fill="' + accent + '"/>',
    growth:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<path d="M110 745 C260 700 330 650 430 570 S610 520 700 390 S900 300 1080 145" fill="none" stroke="' + accent + '" stroke-width="24" stroke-linecap="round"/>' +
      '<path d="M110 745 C260 700 330 650 430 570 S610 520 700 390 S900 300 1080 145 L1080 800 L110 800Z" fill="' + soft + '" opacity=".55"/>' +
      '<circle cx="430" cy="570" r="20" fill="' + ink + '"/><circle cx="700" cy="390" r="20" fill="' + ink + '"/><circle cx="1080" cy="145" r="28" fill="' + accent + '"/>',
    government:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<rect x="170" y="630" width="860" height="70" fill="' + ink + '" opacity=".92"/>' +
      '<path d="M250 630V330M430 630V330M610 630V330M790 630V330M970 630V330" stroke="' + ink + '" stroke-width="34"/>' +
      '<path d="M190 330L600 145L1010 330Z" fill="' + soft + '" stroke="' + accent + '" stroke-width="10"/>' +
      '<rect x="155" y="700" width="890" height="18" rx="9" fill="' + accent + '"/>',
    consulting:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<rect x="155" y="150" width="890" height="600" fill="none" stroke="' + ink + '" stroke-width="8"/>' +
      '<line x1="600" y1="150" x2="600" y2="750" stroke="' + line + '" stroke-width="6"/><line x1="155" y1="450" x2="1045" y2="450" stroke="' + line + '" stroke-width="6"/>' +
      '<circle cx="385" cy="315" r="34" fill="' + accent + '"/><circle cx="785" cy="300" r="56" fill="' + ink + '"/><circle cx="420" cy="610" r="46" fill="' + soft + '" stroke="' + accent + '" stroke-width="8"/><circle cx="865" cy="585" r="28" fill="' + accent + '"/>' +
      '<rect x="155" y="105" width="245" height="16" rx="8" fill="' + accent + '"/>',
    sovereign:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<circle cx="920" cy="205" r="130" fill="' + soft + '"/>' +
      '<path d="M0 640 C190 540 320 590 455 520 S710 420 860 500 S1050 600 1200 480 V900 H0Z" fill="' + accent + '" opacity=".28"/>' +
      '<path d="M0 690 C230 600 390 720 600 600 S920 510 1200 620 V900 H0Z" fill="' + ink + '" opacity=".16"/>' +
      '<g fill="' + ink + '" opacity=".82"><rect x="210" y="420" width="54" height="250"/><rect x="285" y="350" width="74" height="320"/><rect x="380" y="455" width="50" height="215"/><rect x="450" y="295" width="88" height="375"/></g>',
    luxury:
      '<rect width="1200" height="900" fill="#080808"/>' +
      '<rect x="160" y="100" width="880" height="690" rx="4" fill="' + soft + '" opacity=".18" stroke="' + accent + '" stroke-width="4"/>' +
      '<g stroke="' + accent + '" stroke-width="3" opacity=".72">' +
      Array.from({length:8},(_,i)=>'<line x1="'+(230+i*95)+'" y1="155" x2="'+(230+i*95)+'" y2="735"/>').join("") +
      Array.from({length:7},(_,i)=>'<line x1="205" y1="'+(190+i*82)+'" x2="995" y2="'+(190+i*82)+'"/>').join("") +
      '</g><rect x="500" y="420" width="200" height="370" fill="#090909" stroke="' + accent + '" stroke-width="5"/><circle cx="600" cy="118" r="18" fill="' + accent + '"/>',
    editorial:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<rect x="110" y="105" width="500" height="650" fill="' + soft + '"/>' +
      '<ellipse cx="360" cy="360" rx="160" ry="205" fill="' + accent + '" opacity=".22"/>' +
      '<rect x="685" y="155" width="350" height="28" rx="4" fill="' + ink + '"/>' +
      '<rect x="685" y="215" width="245" height="11" rx="4" fill="' + ink + '" opacity=".32"/>' +
      '<rect x="685" y="250" width="310" height="11" rx="4" fill="' + ink + '" opacity=".22"/>' +
      '<rect x="685" y="530" width="285" height="6" rx="3" fill="' + accent + '"/>' +
      '<rect x="685" y="575" width="300" height="9" rx="4" fill="' + ink + '" opacity=".2"/><rect x="685" y="610" width="230" height="9" rx="4" fill="' + ink + '" opacity=".16"/>',
    arabic:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<circle cx="930" cy="190" r="115" fill="' + soft + '"/>' +
      '<path d="M0 585 C180 500 310 560 470 500 S800 410 1200 530 V900 H0Z" fill="' + accent + '" opacity=".34"/>' +
      '<path d="M0 670 C250 560 470 720 710 610 S980 570 1200 640 V900 H0Z" fill="' + ink + '" opacity=".14"/>' +
      '<path d="M320 350 C420 280 505 420 610 335 S790 245 900 340" fill="none" stroke="' + accent + '" stroke-width="18" stroke-linecap="round"/>' +
      '<circle cx="320" cy="350" r="11" fill="' + ink + '"/><circle cx="900" cy="340" r="11" fill="' + ink + '"/>',
    markets:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<g stroke="' + line + '" stroke-width="2" opacity=".5">' + Array.from({length:6},(_,i)=>'<line x1="120" y1="'+(180+i*95)+'" x2="1080" y2="'+(180+i*95)+'"/>').join("") + '</g>' +
      '<g stroke="' + accent + '" stroke-width="7">' +
      '<line x1="210" y1="570" x2="210" y2="400"/><rect x="185" y="445" width="50" height="80" fill="' + accent + '"/>' +
      '<line x1="360" y1="510" x2="360" y2="320"/><rect x="335" y="360" width="50" height="105" fill="' + soft + '"/>' +
      '<line x1="510" y1="470" x2="510" y2="250"/><rect x="485" y="300" width="50" height="105" fill="' + accent + '"/>' +
      '<line x1="660" y1="400" x2="660" y2="210"/><rect x="635" y="245" width="50" height="100" fill="' + soft + '"/>' +
      '<line x1="810" y1="360" x2="810" y2="160"/><rect x="785" y="205" width="50" height="95" fill="' + accent + '"/>' +
      '</g><path d="M160 650 C310 590 420 600 540 500 S770 420 980 220" fill="none" stroke="' + ink + '" stroke-width="12" stroke-linecap="round"/>',
    impact:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<path d="M600 690 C570 560 590 430 650 300" fill="none" stroke="' + ink + '" stroke-width="18" stroke-linecap="round"/>' +
      '<path d="M630 450 C470 380 350 405 285 520 C430 555 555 535 630 450Z" fill="' + accent + '" opacity=".75"/>' +
      '<path d="M625 355 C760 260 890 270 985 375 C850 430 730 420 625 355Z" fill="' + soft + '" stroke="' + accent + '" stroke-width="6"/>' +
      '<circle cx="600" cy="690" r="90" fill="' + soft + '"/><circle cx="600" cy="690" r="42" fill="' + accent + '"/>',
  };

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">' +
    visuals[kind] +
    '</svg>';
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function decoratePreviewElements(
  elements: ReturnType<typeof buildLayout>,
  profile: TemplatePreviewProfile,
) {
  return elements.map((element) => {
    if (element.type === "chart" && profile.chartCategories && profile.chartSeries) {
      return {
        ...element,
        properties: {
          ...element.properties,
          categories: profile.chartCategories,
          series: profile.chartSeries,
          showValues: true,
          showLegend: profile.chartSeries.length > 1,
        },
      };
    }
    if (element.type === "table" && profile.tableRows) {
      return { ...element, properties: { ...element.properties, rows: profile.tableRows } };
    }
    if (element.type === "diagram" && profile.diagramNodes) {
      return { ...element, properties: { ...element.properties, nodes: profile.diagramNodes } };
    }
    return element;
  });
}

export function templatePreviewSlides(template: TemplateFamily): Slide[] {
  const profile = TEMPLATE_PREVIEW_PROFILES[template.id] ?? DEFAULT_PREVIEW_PROFILE;
  const media = previewMedia(template, profile.media);
  const rtl = profile.rtl === true;

  return template.previewLayouts.slice(0, 3).map((layoutId, index) => {
    const layout = getLayout(layoutId);
    const intent = layout?.intents[0] ?? "Executive Summary";
    const id = "preview-" + template.id + "-" + index;
    const content = {
      title: profile.titles[index] ?? profile.titles[0],
      subtitle: profile.subtitles[index] ?? profile.subtitles[0],
      body: profile.bodies[index] ?? profile.bodies[0],
      items: profile.items,
      kpis: profile.kpis,
      media,
    };
    const stamp = "2026-01-01T00:00:00.000Z";
    const elements = decoratePreviewElements(buildLayout(layoutId, content, id, rtl), profile);

    return {
      id,
      presentationId: "template-preview",
      slideNumber: index + 1,
      sortOrder: index,
      title: content.title,
      purpose: "Template preview",
      slideIntent: intent,
      keyMessage: content.subtitle,
      contentSummary: content.body,
      visualType:
        layoutId.includes("chart")
          ? "Chart"
          : layoutId.includes("table")
            ? "Table"
            : layoutId.includes("diagram")
              ? "Diagram"
              : layoutId.includes("matrix")
                ? "Matrix"
                : layoutId.includes("image") || layoutId.includes("bleed") || layoutId.includes("hero")
                  ? "Image + Text"
                  : "Cards",
      isOptional: false,
      elements,
      layoutId,
      bullets: content.items.map((entry) => entry.title + ": " + entry.text),
      kpis: content.kpis,
      createdAt: stamp,
      updatedAt: stamp,
    };
  });
}
