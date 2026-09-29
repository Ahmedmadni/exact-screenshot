/**
 * Domain model for the AI Presentation Studio.
 *
 * The model is intentionally storage-agnostic: it is the same shape we will
 * persist in the cloud database later, and the same shape the future visual
 * editor / PPTX + PDF renderers will consume. Slide content is described as
 * structured data (never HTML markup) so it can be rendered to web, PPTX,
 * PDF and images without screenshotting.
 */

export const SLIDE_INTENTS = [
  "Cover",
  "Agenda",
  "Executive Summary",
  "Section Divider",
  "Big Number",
  "Problem",
  "Solution",
  "Opportunity",
  "Comparison",
  "Timeline",
  "Process",
  "Roadmap",
  "Portfolio",
  "Dashboard",
  "Data Story",
  "Financial",
  "Quote",
  "Case Study",
  "Before / After",
  "Team",
  "Call to Action",
  "Closing",
] as const;
export type SlideIntent = (typeof SLIDE_INTENTS)[number];

export const VISUAL_TYPES = [
  "Hero Image",
  "Cards",
  "Icon Grid",
  "Timeline",
  "Process",
  "Diagram",
  "Matrix",
  "Chart",
  "KPI Cards",
  "Comparison",
  "Illustration",
  "Table",
  "Before / After",
  "Big Number",
  "Minimal Text",
  "Image + Text",
  "Full Bleed Image",
] as const;
export type VisualType = (typeof VISUAL_TYPES)[number];

export const AUDIENCES = [
  "Board of Directors",
  "Executive Management",
  "Investors",
  "Customers",
  "Employees",
  "Government",
  "Academic",
  "General",
] as const;
export type Audience = (typeof AUDIENCES)[number];

export const PURPOSES = [
  "Inform",
  "Persuade",
  "Pitch",
  "Report",
  "Proposal",
  "Strategy",
  "Training",
  "Business Review",
] as const;
export type Purpose = (typeof PURPOSES)[number];

export const PRESENTATION_TYPES = [
  "Executive Presentation",
  "Business Proposal",
  "Pitch Deck",
  "Financial Review",
  "Project Update",
  "Strategy Deck",
  "Training",
  "Sales Presentation",
  "Company Profile",
  "Feasibility Study",
  "Board Presentation",
  "Annual Report",
  "Marketing Plan",
] as const;
export type PresentationType = (typeof PRESENTATION_TYPES)[number];

export const TONES = [
  "Executive",
  "Professional",
  "Persuasive",
  "Minimal",
  "Data-driven",
  "Creative",
  "Formal",
] as const;
export type Tone = (typeof TONES)[number];

export const LANGUAGES = ["Arabic", "English", "Arabic + English"] as const;
export type PresentationLanguage = (typeof LANGUAGES)[number];

export const LENGTHS = ["Short", "Standard", "Detailed", "Custom"] as const;
export type LengthPreset = (typeof LENGTHS)[number];

export const LENGTH_RANGES: Record<Exclude<LengthPreset, "Custom">, [number, number]> = {
  Short: [5, 7],
  Standard: [8, 12],
  Detailed: [15, 20],
};

export const STATUSES = ["Draft", "Planning", "Generated", "Under Review", "Completed"] as const;
export type PresentationStatus = (typeof STATUSES)[number];

/** A single beat in the narrative arc of the deck. */
export interface StoryBeat {
  id: string;
  label: string;
  question: string;
}

import type { SlideElement, SlideElementType } from "@/lib/editor/model";
export type { SlideElement, SlideElementType };

export interface EvidenceRef {
  id: string;
  assetId: string;
  assetName: string;
  locator?: string;
  quote: string;
  createdAt: string;
}

export interface SpeakerNotes {
  talkTrack: string;
  keyPoints: string[];
  transition?: string;
  anticipatedQuestions: string[];
  coachTips: string[];
  sourceReminders: string[];
  estimatedSeconds: number;
  generatedBy: "smart" | "cloud" | "manual";
  updatedAt: string;
}

export interface Slide {
  id: string;
  presentationId: string;
  slideNumber: number;
  title: string;
  purpose: string;
  slideIntent: SlideIntent;
  keyMessage: string;
  contentSummary: string;
  visualType: VisualType;
  isOptional: boolean;
  sortOrder: number;
  elements: SlideElement[];
  /** Editor layout this slide was generated from. */
  layoutId?: string;
  /** Slide background override (theme token or color). Defaults to theme background. */
  background?: string | undefined;
  bullets?: string[];
  kpis?: string[];
  /** Source assets directly materialized into this slide (chart/table/image). */
  sourceAssetIds?: string[];
  /** Exact evidence used to support the slide, with file/page/sheet provenance. */
  evidenceRefs?: EvidenceRef[];
  /** Presenter-only talk track, anticipated questions, timing and coaching guidance. */
  speakerNotes?: SpeakerNotes;
  createdAt: string;
  updatedAt: string;
}

export interface PresentationRehearsal {
  id: string;
  startedAt: string;
  endedAt: string;
  totalSeconds: number;
  targetSeconds: number;
  slideSeconds: Record<string, number>;
  completed: boolean;
}

export interface PresentationThemeOverrides {
  colors?: Partial<{
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    accent: string;
    accentSoft: string;
    onAccent: string;
    line: string;
  }>;
  fonts?: Partial<{ heading: string; body: string }>;
  shape?: Partial<{ radius: number }>;
}

export interface Presentation {
  id: string;
  userId: string;
  title: string;
  description: string;
  topic: string;
  objective: string;
  purpose: Purpose;
  audience: Audience;
  presentationType: PresentationType;
  language: PresentationLanguage;
  tone: Tone;
  status: PresentationStatus;
  lengthPreset: LengthPreset;
  recommendedSlideCount: number;
  estimatedDuration: number;
  coreMessage: string;
  visualDirection: string;
  storyArc: StoryBeat[];
  /** Slide visual theme id (see editor/themes). */
  themeId?: string;
  /** Brand kit applied to this deck, plus a snapshot so old decks stay visually stable. */
  brandKitId?: string;
  themeOverrides?: PresentationThemeOverrides;
  /** Source assets that informed planning or later regeneration. */
  sourceAssetIds?: string[];
  /** Recent rehearsal sessions with per-slide timing. */
  rehearsals?: PresentationRehearsal[];
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
}

export interface PresentationVersion {
  id: string;
  presentationId: string;
  label: string;
  createdAt: string;
  snapshot: Pick<Presentation, "title" | "coreMessage" | "storyArc" | "slides">;
}

export type AssetExtractionStatus = "pending" | "ready" | "failed" | "unsupported";

export interface AssetDataTable {
  name: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}

export interface AssetRecord {
  id: string;
  presentationId: string | null;
  name: string;
  kind: "pdf" | "word" | "excel" | "powerpoint" | "image" | "other";
  size: number;
  createdAt: string;
  updatedAt?: string;
  extractionStatus?: AssetExtractionStatus;
  extractedText?: string;
  extractionSummary?: string;
  pageCount?: number;
  sheetNames?: string[];
  slideCount?: number;
  dataTables?: AssetDataTable[];
  imageDataUrl?: string;
  warnings?: string[];
}

export interface BrandKit {
  id: string;
  name: string;
  /** Legacy/general palette retained for backwards compatibility and quick previews. */
  colors: string[];
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  secondaryTextColor?: string;
  accentColor?: string;
  headingFont: string;
  bodyFont: string;
  logoDataUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavedTemplate {
  id: string;
  name: string;
  description: string;
  sourcePresentationId?: string;
  snapshot: Omit<Presentation, "id" | "userId" | "createdAt" | "updatedAt">;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeRecord {
  id: string;
  name: string;
  description: string;
  accent: string;
}
