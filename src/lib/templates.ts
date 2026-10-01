import type { LengthPreset, PresentationType, Slide, SlideIntent, Tone } from "@/lib/types";
import { applyLayout } from "@/lib/editor/layouts";

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
];

export function getTemplateFamily(id?: string | null): TemplateFamily | undefined {
  return id ? TEMPLATE_FAMILIES.find((template) => template.id === id) : undefined;
}

export function applyTemplateFamilyToSlides(slides: Slide[], template: TemplateFamily): Slide[] {
  return slides.map((slide) => {
    const layoutId = template.layoutMap[slide.slideIntent];
    return layoutId ? applyLayout(slide, layoutId) : slide;
  });
}
