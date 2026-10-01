import { uid } from "@/lib/data/store";
import { buildLayout, contentFromSlide } from "@/lib/editor/layouts";
import type { Presentation, PresentationSession, PresentationSessionItem, Slide } from "@/lib/types";

export function buildSessionOutcomesSlide(
  presentation: Presentation,
  session: PresentationSession,
  items: PresentationSessionItem[],
): Slide {
  const decisions = items.filter((item) => item.kind === "decision");
  const actions = items.filter((item) => item.kind === "action");
  const openQuestions = items.filter((item) => item.kind === "question" && item.status === "open");

  const bullets = [
    ...decisions.slice(0, 3).map((item) => "Decision — " + item.body),
    ...actions.slice(0, 4).map((item) =>
      "Action — " + item.body +
      (item.assignee ? " · " + item.assignee : "") +
      (item.dueDate ? " · due " + item.dueDate : "")
    ),
    ...openQuestions.slice(0, 2).map((item) => "Open question — " + item.body),
  ].slice(0, 8);

  const stamp = new Date().toISOString();
  const id = uid();
  const title = "Meeting outcomes";
  const keyMessage =
    decisions[0]?.body ??
    actions[0]?.body ??
    "The session concluded with clear decisions, actions and follow-up questions.";

  const slide: Slide = {
    id,
    presentationId: presentation.id,
    slideNumber: presentation.slides.length + 1,
    sortOrder: presentation.slides.length,
    title,
    purpose: "Capture live-session decisions and next actions",
    slideIntent: actions.length ? "Call to Action" : "Executive Summary",
    keyMessage,
    contentSummary:
      session.title +
      " produced " +
      decisions.length +
      " decision(s), " +
      actions.length +
      " action item(s), and " +
      openQuestions.length +
      " open question(s).",
    bullets,
    visualType: "Cards",
    isOptional: false,
    elements: [],
    layoutId: "title-content",
    createdAt: stamp,
    updatedAt: stamp,
  };

  slide.elements = buildLayout("title-content", contentFromSlide(slide), id);
  return slide;
}
