import type { AIProvider, PlanRequest, PlannedSlide, PresentationPlan } from "./types";
import type { SlideIntent, VisualType } from "@/lib/types";
import { briefCopy, designPlannedSlides, rewritePlannedSlide, storyArcFor } from "./slide-designer";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Blueprint {
  intent: SlideIntent;
  title: string;
  purpose: string;
  keyMessage: string;
  contentSummary: string;
  visualType: VisualType;
  /** Lower priority slides are dropped first when shortening. */
  priority: number;
}

function titleCase(topic: string) {
  const trimmed = topic.trim().replace(/^(create|build|make|generate)\s+(an?|the)?\s*/i, "");
  const clipped = trimmed.split(/[.\n]/)[0] ?? trimmed;
  const words = clipped.split(/\s+/).slice(0, 8).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function blueprints(subject: string): Blueprint[] {
  return [
    {
      intent: "Cover",
      title: subject,
      purpose: "Opening",
      keyMessage: "Set the frame and the stakes in one line.",
      contentSummary: "Title with a strategic subtitle and presenting context.",
      visualType: "Hero Image",
      priority: 10,
    },
    {
      intent: "Executive Summary",
      title: "Executive Summary",
      purpose: "Summary",
      keyMessage: "The four decisions this deck asks for.",
      contentSummary: "Four concise strategic messages the audience must retain.",
      visualType: "Cards",
      priority: 10,
    },
    {
      intent: "Agenda",
      title: "What We Will Cover",
      purpose: "Orientation",
      keyMessage: "A short map of the conversation ahead.",
      contentSummary: "Sequence of sections with expected time per section.",
      visualType: "Minimal Text",
      priority: 2,
    },
    {
      intent: "Problem",
      title: "Where We Are Today",
      purpose: "Context",
      keyMessage: "An honest read of the current operating position.",
      contentSummary: "Current situation with the handful of signals that matter.",
      visualType: "Illustration",
      priority: 9,
    },
    {
      intent: "Problem",
      title: "Key Challenges",
      purpose: "Problem",
      keyMessage: "The constraints blocking progress.",
      contentSummary: "The main operational and structural challenges.",
      visualType: "Icon Grid",
      priority: 8,
    },
    {
      intent: "Big Number",
      title: "The Cost of Doing Nothing",
      purpose: "Impact",
      keyMessage: "Inaction has a measurable price.",
      contentSummary: "Financial and operational exposure if nothing changes.",
      visualType: "Big Number",
      priority: 6,
    },
    {
      intent: "Opportunity",
      title: "The Opportunity",
      purpose: "Vision",
      keyMessage: "What becomes possible once the constraint is removed.",
      contentSummary: "Future operating model described in plain terms.",
      visualType: "Illustration",
      priority: 7,
    },
    {
      intent: "Solution",
      title: "Strategic Pillars",
      purpose: "Strategy",
      keyMessage: "The few pillars everything else hangs from.",
      contentSummary: "Core pillars with a one-line rationale each.",
      visualType: "Diagram",
      priority: 9,
    },
    {
      intent: "Portfolio",
      title: "Key Initiatives",
      purpose: "Execution",
      keyMessage: "The initiatives that deliver the pillars.",
      contentSummary: "Initiative portfolio with owner and horizon.",
      visualType: "Matrix",
      priority: 6,
    },
    {
      intent: "Roadmap",
      title: "Roadmap",
      purpose: "Timeline",
      keyMessage: "Sequenced delivery, not a wish list.",
      contentSummary: "Phased roadmap with milestones and dependencies.",
      visualType: "Timeline",
      priority: 8,
    },
    {
      intent: "Process",
      title: "How We Will Operate",
      purpose: "Governance",
      keyMessage: "Delivery model and decision rights.",
      contentSummary: "Operating cadence, governance and escalation path.",
      visualType: "Process",
      priority: 2,
    },
    {
      intent: "Financial",
      title: "Investment",
      purpose: "Financial",
      keyMessage: "What it costs, phased against value.",
      contentSummary: "Estimated capital and operating investment by phase.",
      visualType: "Chart",
      priority: 7,
    },
    {
      intent: "Data Story",
      title: "Expected Benefits",
      purpose: "ROI",
      keyMessage: "Value created, quantified where possible.",
      contentSummary: "Financial and operational benefits with time to value.",
      visualType: "KPI Cards",
      priority: 7,
    },
    {
      intent: "Comparison",
      title: "Options Considered",
      purpose: "Rationale",
      keyMessage: "Why this path over the alternatives.",
      contentSummary: "Side-by-side comparison of the routes evaluated.",
      visualType: "Comparison",
      priority: 3,
    },
    {
      intent: "Case Study",
      title: "Proof Point",
      purpose: "Evidence",
      keyMessage: "It has worked before, under similar conditions.",
      contentSummary: "Comparable case with outcome and lesson.",
      visualType: "Image + Text",
      priority: 3,
    },
    {
      intent: "Problem",
      title: "Risks and Mitigations",
      purpose: "Risk",
      keyMessage: "The risks are known and owned.",
      contentSummary: "Principal risks with mitigation and owner.",
      visualType: "Table",
      priority: 4,
    },
    {
      intent: "Call to Action",
      title: "Decision Required",
      purpose: "Call to Action",
      keyMessage: "The specific approval being requested today.",
      contentSummary: "Approvals required, with next steps and dates.",
      visualType: "Cards",
      priority: 10,
    },
    {
      intent: "Closing",
      title: "Thank You",
      purpose: "Closing",
      keyMessage: "Close with the single message to remember.",
      contentSummary: "Closing statement and contact for follow-up.",
      visualType: "Minimal Text",
      priority: 1,
    },
  ];
}

function selectSlides(request: PlanRequest, count: number): PlannedSlide[] {
  const subject = titleCase(request.topic) || "Untitled Presentation";
  const pool = blueprints(subject);
  const ordered = [...pool].sort((a, b) => b.priority - a.priority).slice(0, count);
  const chosen = pool.filter((b) => ordered.includes(b));
  return designPlannedSlides(
    chosen.map((b, index) => ({
      slideNumber: index + 1,
      sortOrder: index,
      title: b.title,
      purpose: b.purpose,
      slideIntent: b.intent,
      keyMessage: b.keyMessage,
      contentSummary: b.contentSummary,
      visualType: b.visualType,
      isOptional: b.priority <= 3,
    })),
    request,
  );
}

function sourceEvidence(request: PlanRequest) {
  const context = request.sourceContext?.trim();
  if (!context) return [] as string[];
  return context
    .split(/\r?\n/)
    .map((line) => line.replace(/^\[[^\]]+\]\s*/, "").trim())
    .filter((line) => line.length >= 18 && line.length <= 180 && !/^SOURCE:/i.test(line))
    .filter((line, index, all) => all.indexOf(line) === index)
    .slice(0, 8);
}

function enrichWithSources(slides: PlannedSlide[], request: PlanRequest): PlannedSlide[] {
  const evidence = sourceEvidence(request);
  if (!evidence.length) return slides;
  let cursor = 0;
  return slides.map((slide) => {
    if (slide.slideIntent === "Executive Summary") {
      return {
        ...slide,
        contentSummary: "Key messages grounded in the attached source material.",
        bullets: evidence.slice(0, 4),
      };
    }
    if (["Data Story", "Financial", "Problem", "Opportunity"].includes(slide.slideIntent) && cursor < evidence.length) {
      const items = evidence.slice(cursor, cursor + 3);
      cursor += items.length;
      return {
        ...slide,
        contentSummary: items.join(" "),
        bullets: items,
      };
    }
    return slide;
  });
}

export function renumber(slides: PlannedSlide[]): PlannedSlide[] {
  return slides.map((slide, index) => ({ ...slide, slideNumber: index + 1, sortOrder: index }));
}

/**
 * Deterministic planner used while no model provider is configured. It follows
 * the same contract a real provider will, including latency, so the UI does
 * not have to change when the real one is wired in.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock-planner";

  async createPlan(request: PlanRequest): Promise<PresentationPlan> {
    await delay(1400);
    const count = Math.min(Math.max(request.slideCount, 4), 18);
    const slides = enrichWithSources(selectSlides(request, count), request);
    const subject = request.language === "Arabic"
      ? request.topic.trim().split(/[.\n]/)[0]?.trim() || "عرض تقديمي"
      : titleCase(request.topic) || "Untitled Presentation";
    const copy = briefCopy(request, subject);

    return {
      brief: {
        title: subject,
        objective: copy.objective,
        coreMessage: copy.coreMessage,
        recommendedSlideCount: slides.length,
        estimatedDuration: Math.max(5, Math.round(slides.length * 1.5)),
        visualDirection: copy.visualDirection,
      },
      storyArc: storyArcFor(request),
      slides,
    };
  }

  async rewriteSlide(
    request: PlanRequest,
    slide: PlannedSlide,
    action: "regenerate" | "shorten" | "executive",
  ): Promise<PlannedSlide> {
    await delay(550);
    return rewritePlannedSlide(slide, request, action);
  }

  async reflowOutline(
    request: PlanRequest,
    current: PlannedSlide[],
    action: "regenerate" | "shorten" | "expand",
  ): Promise<PlannedSlide[]> {
    await delay(900);
    if (action === "regenerate") {
      return enrichWithSources(selectSlides(request, current.length || request.slideCount), request);
    }
    if (action === "shorten") {
      const target = Math.max(4, Math.round(current.length * 0.7));
      const optionalsRemoved = current.filter((s) => !s.isOptional);
      const kept =
        optionalsRemoved.length >= target ? optionalsRemoved.slice(0, target) : current.slice(0, target);
      return renumber(kept);
    }
    const target = Math.min(18, current.length + 3);
    const expanded = enrichWithSources(selectSlides(request, target), request);
    const existingTitles = new Set(current.map((s) => s.title));
    const additions = expanded.filter((s) => !existingTitles.has(s.title));
    return renumber([...current, ...additions].slice(0, target));
  }
}
