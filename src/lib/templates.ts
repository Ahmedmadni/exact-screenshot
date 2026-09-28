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
    layoutMap: {
      Cover: "cover-minimal",
      "Executive Summary": "four-cards",
      Problem: "three-cards",
      Opportunity: "image-text",
      Solution: "three-cards",
      Portfolio: "four-cards",
      Roadmap: "timeline",
      Financial: "kpi-metrics",
      "Data Story": "kpi-metrics",
      "Call to Action": "closing-cta",
      Closing: "closing-cta",
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
    layoutMap: {
      Cover: "cover-minimal",
      "Executive Summary": "kpi-metrics",
      "Big Number": "big-number",
      Dashboard: "kpi-metrics",
      "Data Story": "kpi-metrics",
      Financial: "comparison",
      Comparison: "comparison",
      Timeline: "timeline",
      Roadmap: "timeline",
      "Call to Action": "closing-cta",
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
    layoutMap: {
      Cover: "cover-bold",
      "Section Divider": "cover-bold",
      "Executive Summary": "four-cards",
      Problem: "title-content",
      Opportunity: "image-text",
      Solution: "three-cards",
      Process: "timeline",
      Roadmap: "timeline",
      "Data Story": "kpi-metrics",
      "Call to Action": "cover-bold",
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
    layoutMap: {
      Cover: "cover-minimal",
      Agenda: "title-content",
      "Executive Summary": "title-content",
      Problem: "title-content",
      Solution: "image-text",
      Comparison: "comparison",
      "Case Study": "image-text",
      "Call to Action": "closing-cta",
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
    layoutMap: {
      Cover: "cover-bold",
      Opportunity: "big-number",
      Problem: "three-cards",
      Solution: "image-text",
      "Data Story": "kpi-metrics",
      Financial: "kpi-metrics",
      Roadmap: "timeline",
      Team: "three-cards",
      "Call to Action": "cover-bold",
    },
  },
  {
    id: "government-brief",
    name: "Government Brief",
    category: "Government",
    description: "Formal, structured briefing style for programmes, initiatives, decisions, status and public-sector communication.",
    themeId: "modern-corporate",
    presentationType: "Executive Presentation",
    tone: "Formal",
    lengthPreset: "Standard",
    badge: "Formal",
    layoutMap: {
      Cover: "cover-minimal",
      Agenda: "four-cards",
      "Executive Summary": "four-cards",
      Problem: "title-content",
      Solution: "three-cards",
      Process: "timeline",
      Roadmap: "timeline",
      Dashboard: "kpi-metrics",
      "Call to Action": "closing-cta",
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
