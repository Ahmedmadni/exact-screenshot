import type {
  Audience,
  LengthPreset,
  PresentationLanguage,
  PresentationType,
  Purpose,
  Slide,
  StoryBeat,
  Tone,
} from "@/lib/types";

/**
 * Provider-agnostic contract for the planning intelligence. Swapping the mock
 * planner for a real model means implementing this interface only — no UI or
 * storage code changes.
 */
export interface PlanRequest {
  topic: string;
  objective?: string;
  purpose: Purpose;
  audience: Audience;
  presentationType: PresentationType;
  language: PresentationLanguage;
  tone: Tone;
  lengthPreset: LengthPreset;
  slideCount: number;
}

export interface PresentationBrief {
  title: string;
  objective: string;
  coreMessage: string;
  recommendedSlideCount: number;
  estimatedDuration: number;
  visualDirection: string;
}

export type PlannedSlide = Omit<
  Slide,
  "id" | "presentationId" | "createdAt" | "updatedAt" | "elements"
>;

export interface PresentationPlan {
  brief: PresentationBrief;
  storyArc: StoryBeat[];
  slides: PlannedSlide[];
}

export type SlideRewriteAction = "regenerate" | "shorten" | "executive";

export interface AIProvider {
  readonly name: string;
  createPlan(request: PlanRequest): Promise<PresentationPlan>;
  reflowOutline(
    request: PlanRequest,
    current: PlannedSlide[],
    action: "regenerate" | "shorten" | "expand",
  ): Promise<PlannedSlide[]>;
  rewriteSlide(
    request: PlanRequest,
    slide: PlannedSlide,
    action: SlideRewriteAction,
  ): Promise<PlannedSlide>;
}
