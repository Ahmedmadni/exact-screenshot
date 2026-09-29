import type { PlanRequest } from "@/lib/ai/types";
import type { Presentation, Slide, SpeakerNotes } from "@/lib/types";

function clean(value: string) {
  return value.replace(/\\s+/g, " ").trim();
}

function compact(items: Array<string | undefined>, limit = 5) {
  return items.map((item) => clean(item ?? "")).filter(Boolean).slice(0, limit);
}

function arabic(request: PlanRequest | Presentation) {
  return request.language === "Arabic" || request.language === "Arabic + English";
}

function sourceReminders(slide: Slide) {
  return (slide.evidenceRefs ?? []).slice(0, 4).map((ref) =>
    ref.assetName + (ref.locator ? " · " + ref.locator : "")
  );
}

function questionsFor(slide: Slide, request: PlanRequest): string[] {
  const ar = arabic(request);
  const audience = request.audience;
  const questions: string[] = [];

  if (slide.slideIntent === "Financial" || slide.slideIntent === "Data Story" || slide.slideIntent === "Big Number") {
    questions.push(ar ? "ما مصدر الرقم، وما الفترة التي يغطيها؟" : "What is the source of this figure, and what period does it cover?");
    questions.push(ar ? "ما الذي يفسّر التغير، وهل هو مستدام؟" : "What explains the change, and is it sustainable?");
  }
  if (slide.slideIntent === "Roadmap" || slide.slideIntent === "Timeline" || slide.slideIntent === "Process") {
    questions.push(ar ? "ما أهم الاعتماديات التي قد تؤخر التنفيذ؟" : "Which dependencies are most likely to delay execution?");
    questions.push(ar ? "من يملك كل مرحلة، وكيف سنقيس التقدم؟" : "Who owns each phase, and how will progress be measured?");
  }
  if (slide.slideIntent === "Problem" || slide.slideIntent === "Opportunity") {
    questions.push(ar ? "ما حجم المشكلة أو الفرصة فعليًا؟" : "How large is the problem or opportunity in practical terms?");
  }
  if (slide.slideIntent === "Solution" || slide.slideIntent === "Call to Action") {
    questions.push(ar ? "ما القرار المطلوب الآن تحديدًا؟" : "What exact decision is required now?");
    questions.push(ar ? "ما البدائل، ولماذا هذا المسار؟" : "What are the alternatives, and why this path?");
  }
  if (audience === "Board of Directors" || audience === "Executive Management") {
    questions.push(ar ? "ما المخاطر الرئيسية، وما خطة التخفيف؟" : "What are the principal risks and mitigations?");
    questions.push(ar ? "ما الأثر المالي أو التشغيلي على مستوى المؤسسة؟" : "What is the enterprise-level financial or operational impact?");
  } else if (audience === "Investors") {
    questions.push(ar ? "ما الافتراضات الحساسة التي قد تغيّر النتيجة؟" : "Which assumptions are most sensitive to the outcome?");
  } else if (audience === "Government") {
    questions.push(ar ? "ما الأثر على المستفيد، وما آلية القياس والمساءلة؟" : "What is the beneficiary impact, and how will it be measured and governed?");
  }

  return [...new Set(questions)].slice(0, 4);
}

function coachTipsFor(slide: Slide, talkTrack: string, request: PlanRequest): string[] {
  const ar = arabic(request);
  const tips: string[] = [];
  const chars = clean([
    slide.title,
    slide.keyMessage,
    slide.contentSummary,
    ...(slide.bullets ?? []),
  ].join(" ")).length;

  if (chars > 900) tips.push(ar ? "لا تقرأ الشريحة حرفيًا؛ لخّص الرسالة ثم استخدم نقطتين فقط كدليل." : "Do not read the slide verbatim; state the takeaway and use only two supporting points.");
  if ((slide.evidenceRefs?.length ?? 0) > 0) tips.push(ar ? "اذكر المصدر شفهيًا إذا كان الرقم أو الادعاء محوريًا." : "Name the source aloud when the figure or claim is decision-critical.");
  if (slide.slideIntent === "Cover") tips.push(ar ? "ابدأ بالنتيجة أو سبب أهمية الموضوع، وليس بتاريخ إعداد العرض." : "Open with why the topic matters, not with presentation housekeeping.");
  if (slide.slideIntent === "Executive Summary") tips.push(ar ? "قدّم الخلاصة أولًا؛ افترض أن بعض الحضور قد لا يرون باقي الشرائح." : "Lead with the conclusion; assume some executives may not see the rest of the deck.");
  if (slide.slideIntent === "Call to Action") tips.push(ar ? "اختم بطلب محدد: قرار، موافقة، تمويل، أو خطوة تالية بمالك وتاريخ." : "End with a specific ask: decision, approval, funding, or a next step with owner and date.");
  if (talkTrack.length > 1000) tips.push(ar ? "قسّم الحديث إلى مقطعين، واترك وقفة قصيرة بينهما." : "Break the talk track into two beats and pause briefly between them.");
  return tips.slice(0, 4);
}

function transitionFor(slide: Slide, next: Slide | undefined, request: PlanRequest) {
  if (!next) return arabic(request) ? "اختم بإعادة ربط القرار المطلوب بالرسالة الرئيسية للعرض." : "Close by reconnecting the requested decision to the presentation's core message.";
  return arabic(request)
    ? "بعد تثبيت هذه النقطة، انتقل إلى «" + next.title + "» لشرح الخطوة التالية في القصة."
    : "With that established, move to “" + next.title + "” to advance the narrative.";
}

export function generateSmartSpeakerNotes(slide: Slide, request: PlanRequest, next?: Slide): SpeakerNotes {
  const ar = arabic(request);
  const bullets = compact(slide.bullets ?? [], 4);
  const evidence = sourceReminders(slide);

  const opening = ar
    ? "الرسالة الأساسية في هذه الشريحة: " + (slide.keyMessage || slide.title) + "."
    : "The core message on this slide is: " + (slide.keyMessage || slide.title) + ".";

  const body = bullets.length
    ? (ar
        ? "ركّز على " + bullets.map((item, i) => String(i + 1) + ") " + item).join("، ") + "."
        : "Focus on " + bullets.map((item, i) => String(i + 1) + ") " + item).join("; ") + ".")
    : (slide.contentSummary
        ? (ar ? "وضّح باختصار: " + slide.contentSummary + "." : "Briefly explain: " + slide.contentSummary + ".")
        : "");

  const evidenceLine = evidence.length
    ? (ar ? "عند الحاجة للاستناد إلى دليل، استخدم: " + evidence.join("؛ ") + "." : "If challenged, anchor the point in: " + evidence.join("; ") + ".")
    : "";

  const talkTrack = clean([opening, body, evidenceLine].filter(Boolean).join(" "));
  const wordCount = talkTrack.split(/\\s+/).filter(Boolean).length;
  const complexity = (slide.elements.some((el) => el.type === "chart" || el.type === "table") ? 18 : 0)
    + ((slide.evidenceRefs?.length ?? 0) > 0 ? 10 : 0)
    + (slide.slideIntent === "Financial" || slide.slideIntent === "Data Story" ? 12 : 0);
  const estimatedSeconds = Math.max(30, Math.min(180, Math.round((wordCount / 125) * 60 + complexity)));

  const notes: SpeakerNotes = {
    talkTrack,
    keyPoints: compact([slide.keyMessage, ...(slide.bullets ?? [])], 5),
    transition: transitionFor(slide, next, request),
    anticipatedQuestions: questionsFor(slide, request),
    coachTips: [],
    sourceReminders: evidence,
    estimatedSeconds,
    generatedBy: "smart",
    updatedAt: new Date().toISOString(),
  };
  notes.coachTips = coachTipsFor(slide, talkTrack, request);
  return notes;
}

export function generateSmartNotesForDeck(presentation: Presentation): Slide[] {
  const request: PlanRequest = {
    topic: presentation.topic,
    objective: presentation.objective,
    purpose: presentation.purpose,
    audience: presentation.audience,
    presentationType: presentation.presentationType,
    language: presentation.language,
    tone: presentation.tone,
    lengthPreset: presentation.lengthPreset,
    slideCount: presentation.slides.length,
  };
  return presentation.slides.map((slide, index) => ({
    ...slide,
    speakerNotes: generateSmartSpeakerNotes(slide, request, presentation.slides[index + 1]),
    updatedAt: new Date().toISOString(),
  }));
}

export function presentationTiming(slides: Slide[]) {
  const seconds = slides.reduce((sum, slide) => sum + (slide.speakerNotes?.estimatedSeconds ?? 60), 0);
  return {
    seconds,
    minutes: Math.max(1, Math.round(seconds / 60)),
  };
}

export function coachDeckWarnings(presentation: Presentation): string[] {
  const warnings: string[] = [];
  const ar = arabic(presentation);
  const timing = presentationTiming(presentation.slides);

  if (presentation.estimatedDuration > 0 && timing.minutes > presentation.estimatedDuration * 1.2) {
    warnings.push(ar
      ? "ملاحظات المتحدث تشير إلى نحو " + timing.minutes + " دقيقة، بينما الزمن المستهدف " + presentation.estimatedDuration + " دقيقة."
      : "Speaker notes imply about " + timing.minutes + " minutes versus a target of " + presentation.estimatedDuration + " minutes.");
  }

  const noNotes = presentation.slides.filter((slide) => !slide.speakerNotes?.talkTrack.trim()).length;
  if (noNotes) warnings.push(ar ? String(noNotes) + " شرائح لا تحتوي ملاحظات تقديم." : String(noNotes) + " slides do not have speaker notes.");

  const longSlides = presentation.slides.filter((slide) => (slide.speakerNotes?.estimatedSeconds ?? 0) > 120).length;
  if (longSlides) warnings.push(ar ? String(longSlides) + " شرائح تتجاوز دقيقتين من الحديث المتوقع." : String(longSlides) + " slides are expected to take more than two minutes.");

  return warnings;
}
