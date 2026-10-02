import type { LengthPreset, PresentationType, Slide, SlideIntent, Tone } from "@/lib/types";
import { applyLayout, buildLayout, getLayout, layoutsForIntent } from "@/lib/editor/layouts";
import { getTheme } from "@/lib/editor/themes";
import { instantiate, shapeEl, textEl } from "@/lib/editor/elements";

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
    previewLayouts: ["cover-board-report", "executive-metrics-band", "strategy-matrix"],
    keywords: ["board", "strategy", "executive", "transformation", "decision"],
    layoutMap: {
      Cover: "cover-board-report",
      "Executive Summary": "executive-metrics-band",
      Problem: "title-content",
      Opportunity: "image-stat-overlay",
      Solution: "diagram-focus",
      Portfolio: "strategy-matrix",
      Roadmap: "roadmap-staircase",
      Financial: "chart-story",
      "Data Story": "data-pulse",
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
    previewLayouts: ["cover-financial-ledger", "financial-actual-budget", "financial-cash-flow"],
    keywords: ["finance", "cfo", "performance", "budget", "board", "kpi"],
    layoutMap: {
      Cover: "cover-financial-ledger",
      "Executive Summary": "executive-metrics-band",
      "Big Number": "image-stat-overlay",
      Dashboard: "financial-actual-budget",
      "Data Story": "data-pulse",
      Financial: "financial-actual-budget",
      Comparison: "financial-variance-bridge",
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
    previewLayouts: ["full-bleed-story", "diagram-focus", "data-pulse"],
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
      "Data Story": "data-pulse",
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
    previewLayouts: ["cover-split", "image-caption", "decision-focus"],
    keywords: ["proposal", "client", "services", "consulting", "minimal"],
    layoutMap: {
      Cover: "cover-split",
      Agenda: "four-cards",
      "Executive Summary": "title-content",
      Problem: "title-content",
      Solution: "image-caption",
      Comparison: "comparison",
      "Case Study": "image-caption",
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
    previewLayouts: ["cover-bold", "image-stat-overlay", "data-pulse"],
    keywords: ["investor", "pitch", "funding", "startup", "growth", "market"],
    layoutMap: {
      Cover: "cover-bold",
      Opportunity: "image-stat-overlay",
      Problem: "three-cards",
      Solution: "diagram-focus",
      "Data Story": "data-pulse",
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
    previewLayouts: ["cover-arabic-institutional", "executive-metrics-band", "roadmap-staircase"],
    keywords: ["government", "public sector", "programme", "initiative", "vision", "formal"],
    layoutMap: {
      Cover: "cover-arabic-institutional",
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
    previewLayouts: ["cover-consulting-brief", "strategy-matrix", "decision-focus"],
    keywords: ["consulting", "strategy", "matrix", "recommendation", "workstream", "executive"],
    layoutMap: {
      Cover: "cover-consulting-brief",
      Agenda: "four-cards",
      "Executive Summary": "executive-metrics-band",
      Problem: "title-content",
      Opportunity: "strategy-matrix",
      Solution: "diagram-focus",
      Comparison: "strategy-matrix",
      Process: "process-ribbon",
      Roadmap: "roadmap-staircase",
      "Data Story": "chart-story",
      Financial: "financial-scorecard",
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
    previewLayouts: ["cover-architectural", "roadmap-staircase", "strategy-matrix"],
    keywords: ["saudi", "government", "vision", "authority", "programme", "transformation"],
    layoutMap: {
      Cover: "cover-architectural",
      Agenda: "four-cards",
      "Executive Summary": "executive-metrics-band",
      "Section Divider": "section-divider",
      Problem: "title-content",
      Opportunity: "image-stat-overlay",
      Solution: "diagram-focus",
      Portfolio: "strategy-matrix",
      Process: "process-ribbon",
      Roadmap: "roadmap-staircase",
      Dashboard: "data-pulse",
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
    previewLayouts: ["cover-investment-memorandum", "image-stat-overlay", "financial-scorecard"],
    keywords: ["investment", "luxury", "real estate", "asset sale", "hospitality", "transaction"],
    layoutMap: {
      Cover: "cover-investment-memorandum",
      "Executive Summary": "executive-metrics-band",
      Opportunity: "image-stat-overlay",
      Problem: "hero-editorial",
      Solution: "image-text",
      Financial: "financial-scorecard",
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
    previewLayouts: ["hero-editorial", "image-caption", "quote-editorial"],
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
    previewLayouts: ["cover-financial-ledger", "financial-actual-budget", "financial-cash-flow"],
    keywords: ["cfo", "finance", "board pack", "budget", "variance", "cash flow", "kpi"],
    layoutMap: {
      Cover: "cover-financial-ledger",
      "Executive Summary": "executive-metrics-band",
      "Big Number": "big-number",
      Dashboard: "financial-cash-flow",
      "Data Story": "data-pulse",
      Financial: "financial-actual-budget",
      Comparison: "financial-variance-bridge",
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
    previewLayouts: ["cover-bold", "diagram-focus", "data-pulse"],
    keywords: ["ai", "innovation", "technology", "product", "platform", "future"],
    layoutMap: {
      Cover: "cover-bold",
      "Section Divider": "full-bleed-story",
      "Executive Summary": "executive-metrics-band",
      Problem: "hero-editorial",
      Opportunity: "image-stat-overlay",
      Solution: "diagram-focus",
      Process: "process-ribbon",
      Roadmap: "roadmap-staircase",
      Dashboard: "data-pulse",
      "Data Story": "data-pulse",
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
    previewLayouts: ["cover-arabic-institutional", "executive-metrics-band", "decision-focus"],
    keywords: ["arabic", "rtl", "executive", "saudi", "board", "proposal"],
    layoutMap: {
      Cover: "cover-arabic-institutional",
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
    previewLayouts: ["cover-financial-ledger", "financial-actual-budget", "financial-variance-bridge"],
    keywords: ["capital markets", "investor relations", "valuation", "deal", "transaction", "funding"],
    layoutMap: {
      Cover: "cover-financial-ledger",
      "Executive Summary": "executive-metrics-band",
      Opportunity: "image-stat-overlay",
      Dashboard: "financial-cash-flow",
      "Data Story": "data-pulse",
      Financial: "financial-actual-budget",
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
    previewLayouts: ["cover-split", "image-stat-overlay", "roadmap-staircase"],
    keywords: ["esg", "sustainability", "impact", "environment", "governance", "report"],
    layoutMap: {
      Cover: "cover-split",
      "Executive Summary": "executive-metrics-band",
      "Big Number": "image-stat-overlay",
      Dashboard: "data-pulse",
      Process: "process-ribbon",
      Roadmap: "roadmap-staircase",
      "Data Story": "data-pulse",
      Portfolio: "strategy-matrix",
      "Call to Action": "decision-focus",
    },
  },
  {
    id: "company-profile",
    name: "Company Profile",
    category: "Executive",
    description: "A polished corporate profile for capabilities, footprint, sectors, leadership and proof of delivery.",
    themeId: "warm-minimal",
    presentationType: "Company Profile",
    tone: "Professional",
    lengthPreset: "Standard",
    badge: "Corporate",
    signature: "Warm minimalism · capability storytelling · confident proof without visual clutter",
    featured: true,
    previewLayouts: ["cover-company-panorama", "three-cards", "image-caption"],
    keywords: ["company profile", "corporate", "capabilities", "services", "leadership", "credentials"],
    layoutMap: {
      Cover: "cover-company-panorama",
      Agenda: "four-cards",
      "Executive Summary": "executive-two-column",
      Portfolio: "three-cards",
      "Case Study": "image-caption",
      Team: "image-text",
      Opportunity: "image-stat-overlay",
      "Data Story": "data-pulse",
      Closing: "quote-editorial",
      "Call to Action": "decision-focus",
    },
  },
  {
    id: "feasibility-study",
    name: "Feasibility Study",
    category: "Finance",
    description: "Investment feasibility storytelling for market demand, economics, scenarios, risks and the final go/no-go decision.",
    themeId: "finance-ink",
    presentationType: "Feasibility Study",
    tone: "Data-driven",
    lengthPreset: "Detailed",
    badge: "Feasibility",
    signature: "Evidence-heavy economics · scenario clarity · investment decision architecture",
    featured: true,
    previewLayouts: ["cover-investment-memorandum", "financial-cash-flow", "financial-variance-bridge"],
    keywords: ["feasibility", "study", "investment", "npv", "irr", "market", "scenario", "risk"],
    layoutMap: {
      Cover: "cover-investment-memorandum",
      "Executive Summary": "executive-metrics-band",
      Opportunity: "image-stat-overlay",
      "Data Story": "data-pulse",
      Financial: "financial-cash-flow",
      Comparison: "financial-variance-bridge",
      Portfolio: "strategy-matrix",
      Roadmap: "roadmap-staircase",
      "Call to Action": "decision-focus",
      Closing: "decision-focus",
    },
  },
  {
    id: "steering-committee",
    name: "Steering Committee",
    category: "Executive",
    description: "A concise governance pack for programme status, key issues, decisions, dependencies and next milestones.",
    themeId: "consulting-navy",
    presentationType: "Project Update",
    tone: "Executive",
    lengthPreset: "Short",
    badge: "SteerCo",
    signature: "Status discipline · issue escalation · decision-first governance",
    featured: true,
    previewLayouts: ["cover-board-report", "data-pulse", "decision-focus"],
    keywords: ["steering committee", "steerco", "project update", "status", "risks", "decisions", "governance"],
    layoutMap: {
      Cover: "cover-board-report",
      "Executive Summary": "executive-metrics-band",
      Dashboard: "data-pulse",
      Problem: "executive-two-column",
      Roadmap: "roadmap-staircase",
      Process: "process-ribbon",
      "Call to Action": "decision-focus",
      Closing: "decision-focus",
    },
  },
  {
    id: "sales-proposal",
    name: "Sales Proposal",
    category: "Proposal",
    description: "A persuasive client proposal for context, value proposition, solution, proof, commercial logic and next steps.",
    themeId: "warm-minimal",
    presentationType: "Sales Presentation",
    tone: "Persuasive",
    lengthPreset: "Standard",
    badge: "Client-ready",
    signature: "Client-centered narrative · strong proof · elegant commercial close",
    featured: true,
    previewLayouts: ["cover-company-panorama", "image-caption", "decision-focus"],
    keywords: ["sales", "proposal", "client", "solution", "services", "commercial", "pitch"],
    layoutMap: {
      Cover: "cover-company-panorama",
      Problem: "executive-two-column",
      Opportunity: "image-stat-overlay",
      Solution: "image-caption",
      "Case Study": "image-caption",
      Comparison: "comparison",
      Financial: "finance-table",
      Roadmap: "process-ribbon",
      "Call to Action": "decision-focus",
      Closing: "quote-editorial",
    },
  },
  {
    id: "transformation-pmo",
    name: "Transformation PMO",
    category: "Government",
    description: "A delivery-focused transformation office pack for portfolio health, milestones, dependencies, risks and executive intervention.",
    themeId: "royal-blue",
    presentationType: "Project Update",
    tone: "Formal",
    lengthPreset: "Detailed",
    badge: "PMO",
    signature: "Portfolio control · delivery pulse · milestone and dependency visibility",
    featured: true,
    previewLayouts: ["cover-architectural", "data-pulse", "roadmap-staircase"],
    keywords: ["pmo", "transformation", "portfolio", "milestones", "dependencies", "programme", "delivery"],
    layoutMap: {
      Cover: "cover-architectural",
      "Executive Summary": "executive-metrics-band",
      Dashboard: "data-pulse",
      Portfolio: "strategy-matrix",
      Process: "process-ribbon",
      Roadmap: "roadmap-staircase",
      Comparison: "executive-two-column",
      "Call to Action": "decision-focus",
      Closing: "decision-focus",
    },
  },
  {
    id: "annual-report-premium",
    name: "Annual Report · Signature",
    category: "Finance",
    description: "A modern annual report for results, board statements, financial KPIs and outlook.",
    themeId: "executive-light",
    presentationType: "Financial Review",
    tone: "Formal",
    lengthPreset: "Detailed",
    badge: "Annual report",
    signature: "Monumental typography · editorial financial pages · board-level KPI hierarchy",
    featured: true,
    previewLayouts: ["cover-annual-insights", "board-dashboard-tiles", "financial-actual-budget"],
    keywords: ["annual", "report", "results", "finance", "statement", "board", "arabic"],
    layoutMap: {
      Cover: "cover-annual-insights",
      "Executive Summary": "board-dashboard-tiles",
      Dashboard: "board-dashboard-tiles",
      Financial: "financial-actual-budget",
      Comparison: "finance-table",
      "Data Story": "chart-story",
      Roadmap: "roadmap-staircase",
      Closing: "decision-focus",
    },
  },
  {
    id: "product-launch-premium",
    name: "Product Launch · Flagship",
    category: "Technology",
    description: "High-impact product storytelling with an editable hero image, proof points and launch roadmap.",
    themeId: "technology",
    presentationType: "Pitch Deck",
    tone: "Creative",
    lengthPreset: "Standard",
    badge: "Product launch",
    signature: "Product imagery · powerful asymmetry · sharp proof and delivery milestones",
    featured: true,
    previewLayouts: ["cover-product-launch", "case-study-editorial", "process-ribbon"],
    keywords: ["product", "launch", "saas", "innovation", "app", "digital", "technology"],
    layoutMap: {
      Cover: "cover-product-launch",
      Opportunity: "case-study-editorial",
      Solution: "case-study-editorial",
      "Case Study": "case-study-editorial",
      Portfolio: "case-study-editorial",
      Process: "process-ribbon",
      Dashboard: "board-dashboard-tiles",
      Roadmap: "roadmap-staircase",
      "Call to Action": "decision-focus",
    },
  },
  {
    id: "creative-portfolio-premium",
    name: "Creative Portfolio · Edition",
    category: "Proposal",
    description: "A spacious studio portfolio for architecture, branding, design and selected client work.",
    themeId: "executive-light",
    presentationType: "Executive Presentation",
    tone: "Creative",
    lengthPreset: "Standard",
    badge: "Portfolio",
    signature: "Editorial gallery · immersive photography · concise case-study storytelling",
    featured: true,
    previewLayouts: ["cover-editorial-gallery", "case-study-editorial", "image-caption"],
    keywords: ["creative", "portfolio", "design", "architecture", "brand", "agency", "photography"],
    layoutMap: {
      Cover: "cover-editorial-gallery",
      Portfolio: "case-study-editorial",
      "Case Study": "case-study-editorial",
      Opportunity: "case-study-editorial",
      Solution: "image-caption",
      Team: "image-text",
      Closing: "quote-editorial",
    },
  },
  {
    id: "healthcare-executive",
    name: "Healthcare · Executive Brief",
    category: "Executive",
    description: "Clinical and healthcare management reporting with clean KPIs, service outcomes and evidence.",
    themeId: "modern-corporate",
    presentationType: "Executive Presentation",
    tone: "Professional",
    lengthPreset: "Standard",
    badge: "Healthcare",
    signature: "Calm white-space · service metrics · accessible leadership narrative",
    featured: true,
    previewLayouts: ["cover-product-launch", "board-dashboard-tiles", "case-study-editorial"],
    keywords: ["health", "healthcare", "hospital", "clinical", "medical", "laboratory", "patient", "quality"],
    layoutMap: {
      Cover: "cover-product-launch",
      "Executive Summary": "board-dashboard-tiles",
      Dashboard: "board-dashboard-tiles",
      "Case Study": "case-study-editorial",
      Solution: "case-study-editorial",
      "Data Story": "data-pulse",
      Process: "process-ribbon",
      Closing: "decision-focus",
    },
  },
  {
    id: "operations-command",
    name: "Operations · Command Center",
    category: "Strategy",
    description: "An editable operating-review pack for delivery KPIs, strategic initiatives and corrective action.",
    themeId: "royal-blue",
    presentationType: "Project Update",
    tone: "Data-driven",
    lengthPreset: "Standard",
    badge: "Operations",
    signature: "Command dashboard · risk and momentum signals · clear action ownership",
    featured: true,
    previewLayouts: ["cover-annual-insights", "board-dashboard-tiles", "roadmap-staircase"],
    keywords: ["operations", "project", "delivery", "kpi", "risk", "execution", "pmo"],
    layoutMap: {
      Cover: "cover-annual-insights",
      Dashboard: "board-dashboard-tiles",
      "Executive Summary": "board-dashboard-tiles",
      Portfolio: "strategy-matrix",
      Roadmap: "roadmap-staircase",
      Financial: "financial-cash-flow",
      "Call to Action": "decision-focus",
      Closing: "decision-focus",
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

function applyTemplateSignature(slide: Slide, template: TemplateFamily, index: number): Slide {
  const drafts = (() => {
    const page = String(index + 1).padStart(2, "0");
    switch (template.id) {
      case "boardroom-strategy":
        return [
          shapeEl("Boardroom top rule", "rect", [100, 42, 1400, 2], { fill: "theme:line" }),
          textEl("Boardroom folio", page, [1430, 815, 70, 28], { fontSize: 13, color: "theme:secondary", align: "end" }, "decor"),
        ];
      case "financial-review":
        return [
          shapeEl("Finance top accent", "rect", [0, 0, 1600, 8], { fill: "theme:accent" }),
          textEl("Finance folio", "FINANCE  ·  " + page, [1230, 824, 270, 24], { fontSize: 12, fontWeight: 700, color: "theme:secondary", align: "end", letterSpacing: 1 }, "decor"),
        ];
      case "technology-vision":
        return [
          { ...shapeEl("Technology orbit", "ellipse", [1360, -100, 330, 330], { fill: "transparent", stroke: "theme:accent", strokeWidth: 2 }), opacity: 0.34 },
          { ...shapeEl("Technology node", "ellipse", [1490, 72, 22, 22], { fill: "theme:accent" }), opacity: 0.9 },
          textEl("Technology folio", page, [1450, 824, 50, 24], { fontSize: 12, color: "theme:secondary", align: "end" }, "decor"),
        ];
      case "minimal-proposal":
        return [
          shapeEl("Minimal footer rule", "rect", [100, 842, 1400, 1], { fill: "theme:line" }),
          textEl("Minimal folio", page, [100, 808, 60, 24], { fontSize: 11, color: "theme:secondary" }, "decor"),
        ];
      case "investor-pitch":
        return [
          shapeEl("Investor signal", "rect", [0, 0, 18, 900], { fill: "theme:accent" }),
          textEl("Investor folio", "INVESTOR  ·  " + page, [1260, 824, 240, 24], { fontSize: 11, fontWeight: 700, color: "theme:secondary", align: "end", letterSpacing: 1.1 }, "decor"),
        ];
      case "government-brief":
        return [
          shapeEl("Government header", "rect", [100, 38, 1400, 3], { fill: "theme:accent" }),
          shapeEl("Government footer", "rect", [100, 844, 1400, 1], { fill: "theme:line" }),
          textEl("Government folio", "EXECUTIVE BRIEF  ·  " + page, [1180, 812, 320, 25], { fontSize: 11, fontWeight: 600, color: "theme:secondary", align: "end", letterSpacing: 0.8 }, "decor"),
        ];
      case "strategy-consulting":
        return [
          shapeEl("Consulting red rail", "rect", [0, 0, 1600, 10], { fill: "theme:accent" }),
          textEl("Consulting section mark", "STRATEGY", [100, 45, 180, 28], { fontSize: 11, fontWeight: 800, color: "theme:accent", letterSpacing: 1.8 }, "decor"),
          textEl("Consulting folio", page, [1440, 45, 60, 28], { fontSize: 11, fontWeight: 700, color: "theme:secondary", align: "end" }, "decor"),
        ];
      case "sovereign-vision":
        return [
          shapeEl("Sovereign gold rail", "rect", [0, 0, 12, 900], { fill: "theme:accent" }),
          shapeEl("Sovereign top rule", "rect", [100, 42, 1400, 2], { fill: "theme:line" }),
          textEl("Sovereign folio", "VISION  ·  " + page, [1260, 812, 240, 24], { fontSize: 11, fontWeight: 700, color: "theme:accent", align: "end", letterSpacing: 1.2 }, "decor"),
        ];
      case "luxury-investment":
        return [
          shapeEl("Luxury frame", "roundRect", [42, 42, 1516, 816], { fill: "transparent", stroke: "theme:accent", strokeWidth: 1, radius: 2 }),
          textEl("Luxury folio", page, [1458, 802, 54, 26], { fontFamily: "theme:heading", fontSize: 14, color: "theme:accent", align: "end" }, "decor"),
        ];
      case "editorial-report":
        return [
          shapeEl("Editorial spine", "rect", [68, 100, 2, 700], { fill: "theme:accent" }),
          textEl("Editorial folio", page, [30, 812, 78, 26], { fontFamily: "theme:heading", fontSize: 14, color: "theme:accent", align: "center" }, "decor"),
        ];
      case "cfo-performance":
        return [
          shapeEl("CFO top line", "rect", [100, 42, 1400, 2], { fill: "theme:line" }),
          shapeEl("CFO metric tick", "rect", [100, 42, 170, 5], { fill: "theme:accent" }),
          textEl("CFO folio", "CFO BOOK  ·  " + page, [1250, 812, 250, 25], { fontSize: 11, fontWeight: 700, color: "theme:secondary", align: "end", letterSpacing: 1 }, "decor"),
        ];
      case "ai-innovation":
        return [
          { ...shapeEl("AI orbit one", "ellipse", [1320, -150, 420, 420], { fill: "transparent", stroke: "theme:accent", strokeWidth: 2 }), opacity: 0.36 },
          { ...shapeEl("AI orbit two", "ellipse", [1390, -80, 280, 280], { fill: "transparent", stroke: "theme:accentSoft", strokeWidth: 5 }), opacity: 0.6 },
          shapeEl("AI node", "ellipse", [1500, 88, 20, 20], { fill: "theme:accent" }),
          textEl("AI folio", "AI / " + page, [1400, 818, 100, 24], { fontSize: 11, fontWeight: 700, color: "theme:secondary", align: "end", letterSpacing: 1.1 }, "decor"),
        ];
      case "arabic-executive":
        return [
          shapeEl("Arabic executive rail", "rect", [1588, 0, 12, 900], { fill: "theme:accent" }),
          shapeEl("Arabic top rule", "rect", [100, 42, 1400, 2], { fill: "theme:line" }),
          textEl("Arabic folio", page + "  ·  تنفيذي", [100, 812, 220, 26], { fontFamily: "theme:body", fontSize: 12, fontWeight: 600, color: "theme:secondary", dir: "rtl" }, "decor"),
        ];
      case "capital-markets":
        return [
          shapeEl("Markets top signal", "rect", [0, 0, 1600, 7], { fill: "theme:accent" }),
          shapeEl("Markets bottom rail", "rect", [100, 838, 1400, 1], { fill: "theme:line" }),
          textEl("Markets folio", "MARKETS  ·  " + page, [1250, 808, 250, 24], { fontSize: 11, fontWeight: 700, color: "theme:secondary", align: "end", letterSpacing: 1.2 }, "decor"),
        ];
      case "esg-impact":
        return [
          { ...shapeEl("Impact halo", "ellipse", [1390, -80, 280, 280], { fill: "theme:accentSoft" }), opacity: 0.55 },
          { ...shapeEl("Impact seed", "ellipse", [1495, 35, 48, 48], { fill: "theme:accent" }), opacity: 0.85 },
          textEl("Impact folio", "IMPACT  ·  " + page, [1250, 814, 250, 24], { fontSize: 11, fontWeight: 700, color: "theme:secondary", align: "end", letterSpacing: 1.1 }, "decor"),
        ];
      case "company-profile":
        return [
          shapeEl("Company corner mark", "roundRect", [1420, 42, 80, 80], { fill: "theme:accentSoft", radius: 18 }),
          shapeEl("Company corner accent", "roundRect", [1454, 76, 46, 46], { fill: "theme:accent", radius: 12 }),
          shapeEl("Company footer rule", "rect", [100, 842, 1400, 1], { fill: "theme:line" }),
          textEl("Company folio", "PROFILE  ·  " + page, [100, 810, 220, 24], { fontSize: 11, fontWeight: 700, color: "theme:secondary", letterSpacing: 1.1 }, "decor"),
        ];
      case "feasibility-study":
        return [
          shapeEl("Feasibility rail", "rect", [0, 0, 10, 900], { fill: "theme:accent" }),
          textEl("Feasibility label", "FEASIBILITY", [105, 44, 220, 28], { fontSize: 11, fontWeight: 800, color: "theme:accent", letterSpacing: 1.6 }, "decor"),
          textEl("Feasibility folio", "INVESTMENT CASE  ·  " + page, [1190, 812, 310, 24], { fontSize: 11, fontWeight: 700, color: "theme:secondary", align: "end", letterSpacing: 1 }, "decor"),
        ];
      case "steering-committee":
        return [
          shapeEl("SteerCo status one", "ellipse", [100, 48, 12, 12], { fill: "theme:accent" }),
          shapeEl("SteerCo status two", "ellipse", [122, 48, 12, 12], { fill: "theme:accentSoft" }),
          shapeEl("SteerCo status three", "ellipse", [144, 48, 12, 12], { fill: "theme:line" }),
          textEl("SteerCo label", "STEERING COMMITTEE", [180, 39, 300, 28], { fontSize: 11, fontWeight: 800, color: "theme:secondary", letterSpacing: 1.3 }, "decor"),
          textEl("SteerCo folio", page, [1450, 812, 50, 24], { fontSize: 11, color: "theme:secondary", align: "end" }, "decor"),
        ];
      case "sales-proposal":
        return [
          { ...shapeEl("Sales corner wash", "ellipse", [1370, -120, 360, 360], { fill: "theme:accentSoft" }), opacity: 0.7 },
          shapeEl("Sales signal", "rect", [100, 44, 90, 4], { fill: "theme:accent" }),
          textEl("Sales label", "CLIENT PROPOSAL", [215, 34, 240, 26], { fontSize: 11, fontWeight: 800, color: "theme:accent", letterSpacing: 1.3 }, "decor"),
          textEl("Sales folio", page, [1450, 812, 50, 24], { fontSize: 11, color: "theme:secondary", align: "end" }, "decor"),
        ];
      case "transformation-pmo":
        return [
          shapeEl("PMO top rail", "rect", [0, 0, 1600, 7], { fill: "theme:accent" }),
          ...[0, 1, 2, 3].map((i) => shapeEl("PMO pulse " + (i + 1), "ellipse", [1180 + i * 70, 42, 16, 16], { fill: i === 3 ? "theme:accent" : "theme:line" })),
          textEl("PMO label", "TRANSFORMATION PMO", [100, 34, 300, 28], { fontSize: 11, fontWeight: 800, color: "theme:secondary", letterSpacing: 1.2 }, "decor"),
          textEl("PMO folio", page, [1450, 812, 50, 24], { fontSize: 11, color: "theme:secondary", align: "end" }, "decor"),
        ];
      default:
        return [];
    }
  })();

  if (!drafts.length) return slide;
  const signature = instantiate(drafts, slide.id, slide.elements.length).map((element, offset) => ({
    ...element,
    zIndex: slide.elements.length + offset,
  }));
  return { ...slide, elements: [...slide.elements, ...signature] };
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
    return applyTemplateSignature(applyLayout(slide, chosen), template, index);
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
  | "impact"
  | "company"
  | "feasibility"
  | "project"
  | "sales"
  | "pmo";

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
  "annual-report-premium": {
    titles: ["Annual performance report", "A year in four signals", "Actual versus budget"],
    subtitles: ["Our performance, priorities and outlook in one board-ready report.", "Four indicators show the operating and financial direction.", "Compare the delivery against the approved annual plan."],
    bodies: ["Replace all sample content with verified annual results.", "Amounts and labels are illustrative — replace them with audited results.", "Use the chart data editor to supply actuals and budgets."],
    items: [{ title: "Revenue", text: "Annual revenue trend" }, { title: "Profitability", text: "Margin progression" }, { title: "Cash", text: "Cash availability" }, { title: "Outlook", text: "Forward priorities" }],
    kpis: ["—", "—", "—", "—"],
    media: "finance",
    chartCategories: ["Q1", "Q2", "Q3", "Q4"],
    chartSeries: [{ name: "Actual", values: [0, 0, 0, 0] }, { name: "Budget", values: [0, 0, 0, 0] }],
  },
  "product-launch-premium": {
    titles: ["The next platform experience", "One product, real value", "Launch with purpose"],
    subtitles: ["Designed to make complex workflows feel effortless.", "A new experience grounded in measurable customer problems.", "A phased go-to-market plan with clear ownership."],
    bodies: ["Edit the product imagery, launch narrative and key statements.", "Replace the sample insight with demonstrated customer evidence.", "Align team, launch readiness and measurement."],
    items: [{ title: "Customer problem", text: "Define the friction your product removes." }, { title: "Proof", text: "Add validated user feedback or pilot outcomes." }, { title: "Adoption", text: "Design measurable engagement goals." }, { title: "Rollout", text: "Set an actionable release plan." }],
    kpis: ["—", "—", "—", "—"],
    media: "technology",
    diagramNodes: [{ title: "Research", text: "Listen and learn" }, { title: "Pilot", text: "Validate in market" }, { title: "Launch", text: "Release with quality" }],
  },
  "creative-portfolio-premium": {
    titles: ["Selected creative work", "Craft meets purpose", "The story behind the work"],
    subtitles: ["A visual collection of work with intent and character.", "Each project begins with a clear brief and a distinctive response.", "Document the craft, collaboration and results."],
    bodies: ["Change the visuals to your own portfolio photography.", "Explain the client challenge and showcase the creative response.", "Make each case study your own."],
    items: [{ title: "The brief", text: "Describe the objective and constraints." }, { title: "The idea", text: "Showcase the central design decision." }, { title: "The work", text: "Provide real project visuals." }, { title: "Outcome", text: "Use verified customer or project results." }],
    kpis: ["—", "—", "—", "—"],
    media: "editorial",
  },
  "healthcare-executive": {
    titles: ["Healthcare service overview", "Operational quality signals", "Patient journey improvement"],
    subtitles: ["A clear management perspective on care quality and services.", "Review capacity, access, experience and operating performance.", "Identify improvements supported by trusted clinical evidence."],
    bodies: ["Illustrative healthcare template, not clinical advice or real results.", "Populate the metrics from approved internal quality reporting.", "Protect patient privacy when using images and case examples."],
    items: [{ title: "Access", text: "Appointment and patient access performance." }, { title: "Quality", text: "Validated service quality indicators." }, { title: "Experience", text: "Reported patient experience measures." }, { title: "Efficiency", text: "Resource utilization and throughput." }],
    kpis: ["—", "—", "—", "—"],
    media: "minimal",
  },
  "operations-command": {
    titles: ["Operations performance", "Four delivery priorities", "Milestone control"],
    subtitles: ["One executive view of performance, risk and execution.", "Track the signals that shape delivery confidence.", "Turn insights into accountable next steps."],
    bodies: ["All displayed indicators are placeholders; add verified operational results.", "Use source-backed KPIs, owners and dates.", "Make decision responsibilities explicit."],
    items: [{ title: "Schedule", text: "Progress toward milestones." }, { title: "Cost", text: "Financial discipline and forecast." }, { title: "Risk", text: "Mitigation status and exposure." }, { title: "Capacity", text: "Teams and resources." }],
    kpis: ["—", "—", "—", "—"],
    media: "pmo",
  },

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

  "company-profile": {
    titles: ["Built to deliver at scale", "Capabilities that connect end to end", "Proof across the portfolio"],
    subtitles: [
      "A corporate profile that explains who we are through capability, reach and demonstrated delivery.",
      "Strategy, execution and specialist expertise work as one integrated client proposition.",
      "Credibility comes from repeatable outcomes across sectors, geographies and complex delivery environments.",
    ],
    bodies: [
      "A warm, confident profile designed for introductions, credentials and strategic client conversations.",
      "The capability story is organized around the client problem rather than internal organization charts.",
      "Case studies and operational proof turn company claims into evidence.",
    ],
    items: [
      { title: "Advisory", text: "Translate ambition into practical strategic choices." },
      { title: "Delivery", text: "Mobilize teams and execute complex programmes." },
      { title: "Digital", text: "Build platforms, data and automation capabilities." },
      { title: "Operations", text: "Embed performance disciplines that last." },
    ],
    kpis: ["18 yrs", "12 markets", "140+", "92%"],
    media: "company",
  },
  "feasibility-study": {
    titles: ["Investment feasibility at a glance", "Economics remain attractive in the base case", "Risk-adjusted decision"],
    subtitles: [
      "Market demand, project economics and execution readiness support a positive investment case.",
      "Returns remain above the hurdle rate under the base case, with downside concentrated in ramp-up timing.",
      "Proceed subject to three conditions that protect capital and execution quality.",
    ],
    bodies: [
      "A rigorous feasibility pack balancing commercial evidence, financial returns, scenarios and risk.",
      "The base case is supported by demand visibility, operating assumptions and conservative exit economics.",
      "The recommendation is conditional, transparent and directly linked to the material sensitivities.",
    ],
    items: [
      { title: "Demand", text: "Addressable demand supports targeted utilization." },
      { title: "Economics", text: "Returns clear the investment hurdle." },
      { title: "Execution", text: "Critical capabilities are obtainable within the plan." },
      { title: "Risk", text: "Downside is concentrated in timing and ramp-up." },
    ],
    kpis: ["18.9% IRR", "SAR 74m NPV", "4.8 yrs", "1.6× DSCR"],
    media: "feasibility",
    chartCategories: ["Base", "Upside", "Delay", "Downside"],
    chartSeries: [{ name: "Project IRR", values: [19, 24, 15, 11] }],
    tableRows: [
      ["Scenario", "NPV", "IRR", "Payback"],
      ["Base", "74", "18.9%", "4.8y"],
      ["Upside", "118", "24.1%", "3.9y"],
      ["Delay", "42", "15.2%", "5.7y"],
      ["Downside", "8", "11.3%", "7.1y"],
    ],
  },
  "steering-committee": {
    titles: ["Programme steering committee", "Delivery pulse and exceptions", "Decisions required today"],
    subtitles: [
      "The programme remains on track overall, with two issues requiring executive intervention.",
      "Most workstreams are progressing to plan; schedule pressure is concentrated in integration and readiness.",
      "Resolve ownership on the critical dependency and approve the proposed recovery path.",
    ],
    bodies: [
      "A short, disciplined pack designed for governance meetings rather than broad status reporting.",
      "The view focuses attention on deviations, risks and cross-functional dependencies.",
      "Each meeting ends with explicit decisions, owners and dates.",
    ],
    items: [
      { title: "Scope", text: "Stable with two controlled changes." },
      { title: "Schedule", text: "One critical-path integration issue." },
      { title: "Budget", text: "Within approved tolerance." },
      { title: "Readiness", text: "Operational preparation needs acceleration." },
    ],
    kpis: ["76%", "2 red", "+3 wk", "96%"],
    media: "project",
    chartCategories: ["Plan", "Done", "At risk", "Blocked"],
    chartSeries: [{ name: "Work packages", values: [42, 31, 8, 3] }],
  },
  "sales-proposal": {
    titles: ["A better client experience, by design", "The solution around your priorities", "A low-risk path to value"],
    subtitles: [
      "Redesign the moments that matter most while simplifying the operating model behind them.",
      "The proposed solution combines process, digital enablement and frontline adoption as one programme.",
      "Start with a focused first wave, prove the value quickly and scale only what works.",
    ],
    bodies: [
      "A persuasive client narrative that feels tailored rather than templated.",
      "The solution is framed around outcomes, not a catalogue of services.",
      "Commercial logic and delivery sequencing are kept transparent and easy to discuss.",
    ],
    items: [
      { title: "Experience", text: "Simplify the priority journeys." },
      { title: "Process", text: "Remove handoffs and avoidable delays." },
      { title: "Digital", text: "Enable faster, clearer interactions." },
      { title: "Adoption", text: "Embed change with frontline teams." },
    ],
    kpis: ["-32%", "+18 pts", "12 wk", "3 waves"],
    media: "sales",
  },
  "transformation-pmo": {
    titles: ["Transformation delivery pulse", "Portfolio health by intervention need", "Next 90-day milestone path"],
    subtitles: [
      "The portfolio is moving, but a small number of dependencies now determine whether benefits land on time.",
      "Focus executive attention on programmes where intervention can materially improve outcome confidence.",
      "The next 90 days are dominated by approvals, platform readiness and operational mobilization.",
    ],
    bodies: [
      "A PMO system designed for executive control rather than activity reporting.",
      "Portfolio health combines milestone status, dependency exposure and benefit confidence.",
      "The roadmap makes sequencing and escalation points visible at a glance.",
    ],
    items: [
      { title: "On track", text: "Programmes progressing within tolerance." },
      { title: "Watch", text: "Manageable issues requiring active oversight." },
      { title: "Intervene", text: "Executive decision or dependency resolution required." },
      { title: "Benefits", text: "Outcome confidence tracked independently from activity." },
    ],
    kpis: ["27 programmes", "71% green", "5 watch", "2 intervene"],
    media: "pmo",
    chartCategories: ["Jan", "Mar", "May", "Jul", "Sep"],
    chartSeries: [{ name: "Milestones on time", values: [62, 67, 72, 76, 81] }],
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
    company:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<rect x="120" y="120" width="430" height="610" rx="26" fill="' + soft + '"/>' +
      '<rect x="650" y="160" width="390" height="170" rx="20" fill="' + accent + '" opacity=".28"/>' +
      '<rect x="650" y="380" width="180" height="180" rx="20" fill="' + ink + '" opacity=".14"/>' +
      '<rect x="860" y="380" width="180" height="180" rx="20" fill="' + accent + '" opacity=".16"/>' +
      '<rect x="650" y="610" width="390" height="90" rx="20" fill="' + ink + '" opacity=".09"/>',
    feasibility:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<circle cx="360" cy="450" r="235" fill="none" stroke="' + line + '" stroke-width="52"/>' +
      '<path d="M360 215 A235 235 0 0 1 558 575" fill="none" stroke="' + accent + '" stroke-width="52" stroke-linecap="round"/>' +
      '<rect x="700" y="260" width="320" height="42" rx="12" fill="' + ink + '" opacity=".88"/>' +
      '<rect x="700" y="340" width="250" height="25" rx="10" fill="' + accent + '" opacity=".72"/>' +
      '<rect x="700" y="405" width="290" height="25" rx="10" fill="' + ink + '" opacity=".26"/>' +
      '<rect x="700" y="470" width="210" height="25" rx="10" fill="' + ink + '" opacity=".18"/>',
    project:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<rect x="130" y="180" width="940" height="540" rx="28" fill="' + soft + '"/>' +
      '<g fill="' + accent + '"><rect x="195" y="535" width="100" height="120" rx="12"/><rect x="345" y="465" width="100" height="190" rx="12"/><rect x="495" y="390" width="100" height="265" rx="12"/></g>' +
      '<g fill="' + ink + '" opacity=".2"><rect x="645" y="320" width="100" height="335" rx="12"/><rect x="795" y="250" width="100" height="405" rx="12"/></g>' +
      '<circle cx="975" cy="240" r="44" fill="' + accent + '"/>',
    sales:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<path d="M170 630 C315 470 450 530 585 390 S815 260 1030 320" fill="none" stroke="' + accent + '" stroke-width="28" stroke-linecap="round"/>' +
      '<circle cx="170" cy="630" r="45" fill="' + soft + '" stroke="' + accent + '" stroke-width="8"/><circle cx="585" cy="390" r="58" fill="' + soft + '" stroke="' + accent + '" stroke-width="8"/><circle cx="1030" cy="320" r="70" fill="' + accent + '"/>' +
      '<rect x="170" y="735" width="860" height="16" rx="8" fill="' + ink + '" opacity=".14"/>',
    pmo:
      '<rect width="1200" height="900" fill="' + bg + '"/>' +
      '<g stroke="' + line + '" stroke-width="3"><line x1="180" y1="220" x2="1040" y2="220"/><line x1="180" y1="420" x2="1040" y2="420"/><line x1="180" y1="620" x2="1040" y2="620"/></g>' +
      '<g fill="' + accent + '"><circle cx="300" cy="220" r="28"/><circle cx="510" cy="420" r="28"/><circle cx="735" cy="220" r="28"/><circle cx="930" cy="620" r="28"/></g>' +
      '<g fill="' + soft + '"><rect x="245" y="270" width="230" height="80" rx="18"/><rect x="590" y="470" width="280" height="80" rx="18"/><rect x="760" y="270" width="250" height="80" rx="18"/></g>',
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

    const previewSlide: Slide = {
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
    return applyTemplateSignature(previewSlide, template, index);
  });
}
