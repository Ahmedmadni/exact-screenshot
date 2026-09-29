import { SLIDE_INTENTS, VISUAL_TYPES, type Slide, type SlideIntent, type SpeakerNotes, type VisualType } from "@/lib/types";
import { supabase } from "@/lib/cloud/supabase";
import { MockAIProvider, renumber } from "./mock-provider";
import type {
  AIProvider,
  PlanRequest,
  PlannedSlide,
  PresentationPlan,
  SlideRewriteAction,
} from "./types";

const intents = new Set<string>(SLIDE_INTENTS);
const visuals = new Set<string>(VISUAL_TYPES);
const layoutIds = new Set([
  "cover-minimal","cover-split","cover-bold","section-divider","title-content","image-text",
  "three-cards","four-cards","kpi-metrics","timeline","comparison","big-number","closing-cta",
]);

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [];
}

function normalizeSlide(raw: any, index: number, fallback?: PlannedSlide): PlannedSlide {
  const slideIntent = intents.has(raw?.slideIntent) ? raw.slideIntent as SlideIntent : fallback?.slideIntent ?? "Solution";
  const visualType = visuals.has(raw?.visualType) ? raw.visualType as VisualType : fallback?.visualType ?? "Cards";
  const layoutId = layoutIds.has(raw?.layoutId) ? raw.layoutId : fallback?.layoutId;
  return {
    slideNumber: index + 1,
    sortOrder: index,
    title: text(raw?.title, fallback?.title ?? `Slide ${index + 1}`),
    purpose: text(raw?.purpose, fallback?.purpose ?? "Supporting point"),
    slideIntent,
    keyMessage: text(raw?.keyMessage, fallback?.keyMessage ?? ""),
    contentSummary: text(raw?.contentSummary, fallback?.contentSummary ?? ""),
    visualType,
    isOptional: typeof raw?.isOptional === "boolean" ? raw.isOptional : fallback?.isOptional ?? false,
    bullets: strings(raw?.bullets).length ? strings(raw?.bullets) : fallback?.bullets,
    kpis: strings(raw?.kpis).length ? strings(raw?.kpis) : fallback?.kpis,
    ...(layoutId ? { layoutId } : {}),
  };
}

function normalizeSpeakerNotes(raw: any, fallback: SpeakerNotes): SpeakerNotes {
  const estimated = Number(raw?.estimatedSeconds);
  return {
    talkTrack: text(raw?.talkTrack, fallback.talkTrack),
    keyPoints: strings(raw?.keyPoints).length ? strings(raw?.keyPoints) : fallback.keyPoints,
    transition: text(raw?.transition, fallback.transition ?? "") || undefined,
    anticipatedQuestions: strings(raw?.anticipatedQuestions).length ? strings(raw?.anticipatedQuestions) : fallback.anticipatedQuestions,
    coachTips: strings(raw?.coachTips).length ? strings(raw?.coachTips) : fallback.coachTips,
    sourceReminders: strings(raw?.sourceReminders).length ? strings(raw?.sourceReminders) : fallback.sourceReminders,
    estimatedSeconds: Number.isFinite(estimated) ? Math.max(20, Math.min(300, Math.round(estimated))) : fallback.estimatedSeconds,
    generatedBy: "cloud",
    updatedAt: new Date().toISOString(),
  };
}

function normalizePlan(raw: any, request: PlanRequest): PresentationPlan {
  if (!raw || !Array.isArray(raw.slides) || raw.slides.length < 3) throw new Error("AI plan was incomplete.");
  const slides = raw.slides.slice(0, 30).map((slide: any, index: number) => normalizeSlide(slide, index));
  const storyArc = Array.isArray(raw.storyArc)
    ? raw.storyArc.slice(0, 12).map((beat: any, index: number) => ({
        id: text(beat?.id, `beat-${index + 1}`),
        label: text(beat?.label, `Section ${index + 1}`),
        question: text(beat?.question, ""),
      }))
    : [];

  return {
    brief: {
      title: text(raw.brief?.title, request.topic),
      objective: text(raw.brief?.objective, request.objective ?? ""),
      coreMessage: text(raw.brief?.coreMessage, ""),
      recommendedSlideCount: slides.length,
      estimatedDuration: Math.max(5, Number(raw.brief?.estimatedDuration) || Math.round(slides.length * 1.5)),
      visualDirection: text(raw.brief?.visualDirection, ""),
    },
    storyArc,
    slides,
  };
}

export class HybridAIProvider implements AIProvider {
  readonly name = "cloud-ai";
  private readonly fallback = new MockAIProvider();

  private async invoke<T>(body: Record<string, unknown>): Promise<T> {
    if (!supabase) throw new Error("Cloud AI is not configured.");
    const { data, error } = await supabase.functions.invoke("presentation-ai", { body });
    if (error) throw error;
    if (!data?.result) throw new Error(data?.error ?? "AI function returned no result.");
    return data.result as T;
  }

  async createPlan(request: PlanRequest): Promise<PresentationPlan> {
    try {
      const raw = await this.invoke<any>({ operation: "createPlan", request });
      return normalizePlan(raw, request);
    } catch (error) {
      console.warn("Cloud AI createPlan fell back to local planner.", error);
      return this.fallback.createPlan(request);
    }
  }

  async rewriteSlide(request: PlanRequest, slide: PlannedSlide, action: SlideRewriteAction): Promise<PlannedSlide> {
    try {
      const raw = await this.invoke<any>({ operation: "rewriteSlide", request, slide, action });
      return normalizeSlide(raw, slide.sortOrder, slide);
    } catch (error) {
      console.warn("Cloud AI rewriteSlide fell back to local planner.", error);
      return this.fallback.rewriteSlide(request, slide, action);
    }
  }

  async reflowOutline(
    request: PlanRequest,
    current: PlannedSlide[],
    action: "regenerate" | "shorten" | "expand",
  ): Promise<PlannedSlide[]> {
    try {
      const raw = await this.invoke<any[]>({ operation: "reflowOutline", request, current, action });
      if (!Array.isArray(raw) || !raw.length) throw new Error("AI outline was empty.");
      return renumber(raw.slice(0, 30).map((slide, index) => normalizeSlide(slide, index, current[index])));
    } catch (error) {
      console.warn("Cloud AI reflowOutline fell back to local planner.", error);
      return this.fallback.reflowOutline(request, current, action);
    }
  }

  async generateSpeakerNotes(request: PlanRequest, slide: Slide, next?: Slide): Promise<SpeakerNotes> {
    const fallback = await this.fallback.generateSpeakerNotes(request, slide, next);
    try {
      const raw = await this.invoke<any>({ operation: "coachSlide", request, slide, next });
      return normalizeSpeakerNotes(raw, fallback);
    } catch (error) {
      console.warn("Cloud AI speaker notes fell back to local coach.", error);
      return fallback;
    }
  }
}
