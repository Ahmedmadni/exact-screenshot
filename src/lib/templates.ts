import type { LengthPreset, PresentationType, Slide, SlideIntent, Tone } from "@/lib/types";
import { applyLayout, buildLayout, getLayout } from "@/lib/editor/layouts";
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

export function applyTemplateFamilyToSlides(slides: Slide[], template: TemplateFamily): Slide[] {
  return slides.map((slide) => {
    const layoutId = template.layoutMap[slide.slideIntent];
    return layoutId ? applyLayout(slide, layoutId) : slide;
  });
}

const PREVIEW_TITLES = [
  "A clear point of view",
  "The evidence behind the decision",
  "What happens next",
] as const;

function previewMedia(template: TemplateFamily) {
  const theme = getTheme(template.themeId);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">' +
    '<rect width="1200" height="900" fill="' + theme.colors.surface + '"/>' +
    '<circle cx="960" cy="170" r="330" fill="' + theme.colors.accentSoft + '"/>' +
    '<circle cx="180" cy="760" r="250" fill="' + theme.colors.accent + '" opacity=".52"/>' +
    '<path d="M0 640 C260 510 420 760 680 610 S1010 420 1200 540 V900 H0Z" fill="' + theme.colors.primary + '" opacity=".18"/>' +
    '<rect x="120" y="125" width="380" height="22" rx="11" fill="' + theme.colors.accent + '" opacity=".8"/>' +
    '<rect x="120" y="175" width="560" height="12" rx="6" fill="' + theme.colors.primary + '" opacity=".24"/>' +
    '</svg>';
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

export function templatePreviewSlides(template: TemplateFamily): Slide[] {
  const media = previewMedia(template);
  const arabic = template.id === "arabic-executive";
  const arabicTitles = ["رؤية تنفيذية واضحة", "الأرقام التي تقود القرار", "الخطوات القادمة"] as const;
  return template.previewLayouts.slice(0, 3).map((layoutId, index) => {
    const layout = getLayout(layoutId);
    const intent = layout?.intents[0] ?? "Executive Summary";
    const id = "preview-" + template.id + "-" + index;
    const content = arabic
      ? {
          title: arabicTitles[index] ?? arabicTitles[0],
          subtitle:
            index === 0
              ? "عرض تنفيذي عربي متوازن يضع الرسالة والقرار في مقدمة المشهد."
              : index === 1
                ? "الأداء يتحسن، لكن القرار يعتمد على ثلاثة محركات رئيسية يجب متابعتها."
                : "تحويل التوصيات إلى أولويات واضحة ومسؤوليات ومواعيد تنفيذ.",
          body:
            index === 0
              ? "تصميم عربي احترافي بمساحات هادئة وهوية بصرية مناسبة للعروض التنفيذية ومجالس الإدارة."
              : index === 1
                ? "تتضح الصورة عند ربط النمو بجودة التنفيذ والانضباط في تخصيص الموارد."
                : "التركيز على القرار المطلوب ثم ترجمة الخطة إلى إجراءات قابلة للقياس والمتابعة.",
          items: [
            { title: "الأولوية الأولى", text: "تركيز الموارد على المبادرات الأعلى أثراً وثقة." },
            { title: "الأولوية الثانية", text: "توضيح المفاضلات والخيارات أمام أصحاب القرار." },
            { title: "الأولوية الثالثة", text: "ربط كل توصية بمؤشر ومالك واضح." },
            { title: "الأولوية الرابعة", text: "حماية الزخم بإيقاع متابعة بسيط ومنتظم." },
          ],
          kpis: ["24%", "1.8×", "42م ر.س", "90 يوم"],
          media,
        }
      : {
          title: PREVIEW_TITLES[index] ?? PREVIEW_TITLES[0],
          subtitle:
            index === 0
              ? template.signature
              : index === 1
                ? "Performance is moving in the right direction, but the decision depends on three critical drivers."
                : "Align the team around the priority actions, owners and timing.",
          body:
            index === 0
              ? template.description
              : index === 1
                ? "The strongest signal comes from the combination of growth, execution quality and disciplined resource allocation."
                : "Move from recommendation to execution with a clear decision, sequenced work and visible accountability.",
          items: [
            { title: "Priority one", text: "Concentrate effort where impact and confidence are highest." },
            { title: "Priority two", text: "Make the trade-offs explicit and easy to discuss." },
            { title: "Priority three", text: "Translate the narrative into measurable action." },
            { title: "Priority four", text: "Protect momentum with a simple governance rhythm." },
          ],
          kpis: ["24%", "1.8×", "SAR 42m", "90d"],
          media,
        };
    const stamp = "2026-01-01T00:00:00.000Z";
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
      visualType: layoutId.includes("chart") ? "Chart" : layoutId.includes("table") ? "Table" : layoutId.includes("image") || layoutId.includes("bleed") || layoutId.includes("hero") ? "Image + Text" : "Cards",
      isOptional: false,
      elements: buildLayout(layoutId, content, id, arabic),
      layoutId,
      bullets: content.items.map((entry) => entry.title + ": " + entry.text),
      kpis: content.kpis,
      createdAt: stamp,
      updatedAt: stamp,
    };
  });
}
