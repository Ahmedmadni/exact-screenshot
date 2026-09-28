import type { PlanRequest, PlannedSlide } from "./types";
import type { SlideIntent, StoryBeat } from "@/lib/types";

const isArabic = (request: PlanRequest) => request.language === "Arabic";
const isBilingual = (request: PlanRequest) => request.language === "Arabic + English";

function subjectFromTopic(topic: string) {
  const trimmed = topic.trim().replace(/^(create|build|make|generate)\s+(an?|the)?\s*/i, "");
  const first = trimmed.split(/[.\n]/)[0]?.trim() || trimmed;
  return first.split(/\s+/).slice(0, 10).join(" ");
}

const AR_TITLES: Partial<Record<SlideIntent, string>> = {
  Agenda: "محاور العرض",
  "Executive Summary": "الملخص التنفيذي",
  "Big Number": "لماذا الآن؟",
  Opportunity: "الفرصة",
  Solution: "التوجه الاستراتيجي",
  Portfolio: "المبادرات الرئيسية",
  Roadmap: "خارطة الطريق",
  Process: "نموذج التنفيذ والحوكمة",
  Financial: "الاستثمار والقيمة",
  "Data Story": "الأثر المتوقع",
  Comparison: "مقارنة الخيارات",
  "Case Study": "نقطة إثبات",
  "Call to Action": "القرار المطلوب",
  Closing: "شكرًا لكم",
};

const LAYOUT_BY_INTENT: Partial<Record<SlideIntent, string>> = {
  Cover: "cover-minimal",
  Agenda: "four-cards",
  "Executive Summary": "four-cards",
  "Section Divider": "section-divider",
  "Big Number": "big-number",
  Problem: "three-cards",
  Opportunity: "image-text",
  Solution: "three-cards",
  Comparison: "comparison",
  Timeline: "timeline",
  Process: "timeline",
  Roadmap: "timeline",
  Portfolio: "four-cards",
  Dashboard: "kpi-metrics",
  "Data Story": "kpi-metrics",
  Financial: "kpi-metrics",
  Quote: "section-divider",
  "Case Study": "image-text",
  "Before / After": "comparison",
  Team: "three-cards",
  "Call to Action": "closing-cta",
  Closing: "closing-cta",
};

type SlideCopy = {
  title?: string;
  keyMessage: string;
  contentSummary: string;
  bullets?: string[];
  kpis?: string[];
};

function englishCopy(slide: PlannedSlide, subject: string): SlideCopy {
  switch (slide.slideIntent) {
    case "Cover":
      return {
        title: subject,
        keyMessage: slide.keyMessage || "A focused executive view of the opportunity, choices and path forward.",
        contentSummary: "Prepared for decision-making: context, priorities, roadmap and the action required.",
      };
    case "Executive Summary":
      return {
        keyMessage: `The case for ${subject} can be reduced to four executive messages.`,
        contentSummary: "Use this page as the one-minute version of the full presentation.",
        bullets: [
          "Context: What has changed and why the topic matters now",
          "Priority: The few issues that deserve leadership attention",
          "Path: The proposed response and how it will be delivered",
          "Decision: The action, sponsorship or approval required",
        ],
      };
    case "Agenda":
      return {
        keyMessage: "Move from context to decision in a deliberate sequence.",
        contentSummary: "A concise map of the conversation ahead.",
        bullets: [
          "Context: Current position and relevant signals",
          "Challenge: Constraints, gaps and implications",
          "Response: Strategic choices and priority initiatives",
          "Execution: Roadmap, economics and required decisions",
        ],
      };
    case "Problem":
      if (/challenge/i.test(slide.title)) {
        return {
          keyMessage: `Progress on ${subject} depends on resolving a small set of structural constraints.`,
          contentSummary: "Separate root causes from symptoms and keep the discussion decision-oriented.",
          bullets: [
            "Operating model: Ownership or handoffs are not yet clear enough",
            "Process: Critical work contains avoidable friction or delay",
            "Information: Decisions are made with fragmented or late visibility",
            "Execution: Priorities compete without one sequenced delivery plan",
          ],
        };
      }
      return {
        keyMessage: `The current state of ${subject} creates a clear case for change.`,
        contentSummary: "Frame the baseline before proposing the future state.",
        bullets: [
          "Current model: How work is performed today",
          "Evidence: Signals that show where performance is constrained",
          "Implication: What the current model costs in time, quality or control",
          "Need: Why incremental fixes alone are unlikely to be sufficient",
        ],
      };
    case "Big Number":
      return {
        keyMessage: "The most important message is urgency, not an invented statistic.",
        contentSummary: "Replace the headline value with a validated KPI when source data is available.",
        bullets: ["Evidence: Add the strongest validated metric supporting urgency"],
        kpis: ["NOW"],
      };
    case "Opportunity":
      return {
        keyMessage: `A better model for ${subject} should improve visibility, speed and accountability together.`,
        contentSummary: "Describe the future state in practical operating terms.",
        bullets: [
          "Visibility: One reliable view of progress and performance",
          "Speed: Shorter handoffs and faster decision cycles",
          "Control: Clear ownership, standards and escalation",
        ],
      };
    case "Solution":
      return {
        keyMessage: `The strategy for ${subject} should rest on a small number of mutually reinforcing pillars.`,
        contentSummary: "Keep each pillar distinct, actionable and connected to a measurable outcome.",
        bullets: [
          "Simplify: Remove unnecessary complexity before automating it",
          "Connect: Link information, teams and decisions end to end",
          "Automate: Apply technology where it removes repeatable friction",
        ],
      };
    case "Portfolio":
      return {
        keyMessage: "Translate the strategy into a portfolio that can be owned and sequenced.",
        contentSummary: "Group initiatives by outcome rather than by department.",
        bullets: [
          "Foundation: Data, standards and enabling capabilities",
          "Operations: High-friction workflows to redesign first",
          "Experience: Improvements visible to customers or employees",
          "Governance: Measurement, ownership and continuous improvement",
        ],
      };
    case "Roadmap":
    case "Timeline":
      return {
        keyMessage: "Sequence delivery so each phase creates the conditions for the next.",
        contentSummary: "Use milestones and decision gates rather than a list of dates.",
        bullets: [
          "Align: Confirm scope, baseline and accountable owners",
          "Build: Deliver foundations and first priority capabilities",
          "Scale: Expand proven changes across the operating model",
          "Optimize: Measure outcomes and refine continuously",
        ],
      };
    case "Process":
      return {
        keyMessage: "Execution needs a visible cadence, clear decision rights and rapid escalation.",
        contentSummary: "Make governance light enough to accelerate delivery rather than slow it.",
        bullets: [
          "Prioritize: Maintain one ranked backlog of outcomes",
          "Deliver: Run short cycles with named owners",
          "Review: Measure progress against agreed evidence",
          "Decide: Escalate exceptions quickly and document decisions",
        ],
      };
    case "Financial":
      return {
        keyMessage: "Evaluate investment and value on the same page.",
        contentSummary: "Use validated finance data when available; these are decision categories, not fabricated figures.",
        bullets: [
          "CAPEX: One-time implementation and enabling investment",
          "OPEX: Recurring operating and support cost",
          "Value: Benefits, avoided cost and risk reduction",
        ],
        kpis: ["CAPEX", "OPEX", "ROI"],
      };
    case "Data Story":
    case "Dashboard":
      return {
        keyMessage: "Define success before execution begins.",
        contentSummary: "Track a balanced set of outcome indicators rather than activity alone.",
        bullets: [
          "Impact: Business outcome the initiative must improve",
          "Speed: Time required to deliver or decide",
          "Adoption: Degree to which the new model is actually used",
        ],
        kpis: ["Impact", "Speed", "Adoption"],
      };
    case "Comparison":
    case "Before / After":
      return {
        keyMessage: "Make the trade-off visible so the recommendation is easy to understand.",
        contentSummary: "Compare the current path with the proposed path using the same criteria.",
        bullets: [
          "Current approach: Fragmented ownership, slower feedback and limited visibility",
          "Proposed approach: Integrated ownership, faster decisions and measurable outcomes",
        ],
      };
    case "Case Study":
      return {
        keyMessage: "Use evidence only when it is relevant and verifiable.",
        contentSummary: "Add a comparable internal or external example with a source before final export.",
        bullets: [
          "Situation: What made the example comparable",
          "Lesson: What should be repeated or avoided",
        ],
      };
    case "Call to Action":
      return {
        keyMessage: "End with a precise decision, not a generic closing.",
        contentSummary: "Confirm sponsorship, scope and the immediate next step.",
        bullets: [
          "Approve: Confirm the proposed direction and scope",
          "Sponsor: Name the accountable executive owner",
          "Start: Authorize the first planning and validation cycle",
        ],
      };
    case "Closing":
      return {
        keyMessage: `Keep the final message simple: align on ${subject}, then move into execution.`,
        contentSummary: "Questions and discussion.",
      };
    default:
      return {
        keyMessage: slide.keyMessage,
        contentSummary: slide.contentSummary,
      };
  }
}

function arabicCopy(slide: PlannedSlide, subject: string): SlideCopy {
  switch (slide.slideIntent) {
    case "Cover":
      return {
        title: subject,
        keyMessage: "رؤية تنفيذية مركزة توضح الوضع الحالي والخيارات والمسار المقترح.",
        contentSummary: "عرض موجه لاتخاذ القرار يشمل الأولويات وخارطة الطريق والإجراء المطلوب.",
      };
    case "Executive Summary":
      return {
        keyMessage: `يمكن تلخيص موضوع «${subject}» في أربع رسائل تنفيذية رئيسية.`,
        contentSummary: "هذه الصفحة تمثل النسخة المختصرة التي يمكن استيعابها خلال دقيقة واحدة.",
        bullets: [
          "السياق: ما الذي تغير ولماذا أصبح الموضوع مهمًا الآن",
          "الأولوية: القضايا القليلة التي تتطلب اهتمام الإدارة",
          "المسار: الاستجابة المقترحة وكيفية تنفيذها",
          "القرار: الإجراء أو الدعم أو الاعتماد المطلوب",
        ],
      };
    case "Agenda":
      return {
        keyMessage: "ننتقل من فهم الوضع الحالي إلى قرار واضح عبر تسلسل منطقي.",
        contentSummary: "خريطة مختصرة لمسار العرض.",
        bullets: [
          "السياق: الوضع الحالي والمؤشرات ذات الصلة",
          "التحدي: القيود والفجوات وآثارها",
          "الاستجابة: الخيارات الاستراتيجية والمبادرات ذات الأولوية",
          "التنفيذ: خارطة الطريق والقيمة والقرارات المطلوبة",
        ],
      };
    case "Problem":
      if (/challenge/i.test(slide.title) || slide.purpose === "Problem") {
        return {
          title: "التحديات الرئيسية",
          keyMessage: `يتطلب التقدم في «${subject}» معالجة عدد محدود من القيود الجوهرية.`,
          contentSummary: "التركيز على الأسباب الجذرية بدل الأعراض مع ربطها بقرارات قابلة للتنفيذ.",
          bullets: [
            "نموذج التشغيل: الحاجة إلى وضوح أكبر في الملكية ونقاط التسليم",
            "الإجراءات: وجود احتكاك أو تأخير يمكن إزالته من الأعمال الحرجة",
            "المعلومات: القرارات تعتمد أحيانًا على رؤية مجزأة أو متأخرة",
            "التنفيذ: الأولويات تحتاج إلى خطة موحدة ومتسلسلة",
          ],
        };
      }
      return {
        title: "أين نحن اليوم؟",
        keyMessage: `الوضع الحالي لموضوع «${subject}» يقدم مبررًا واضحًا للتغيير.`,
        contentSummary: "تحديد خط الأساس قبل عرض النموذج المستهدف.",
        bullets: [
          "الوضع الحالي: كيف يتم تنفيذ العمل اليوم",
          "المؤشرات: ما الذي يكشف نقاط التعثر أو القصور",
          "الأثر: تكلفة الوضع الحالي من حيث الوقت أو الجودة أو الرقابة",
          "الحاجة: لماذا قد لا تكون التحسينات الجزئية وحدها كافية",
        ],
      };
    case "Big Number":
      return {
        keyMessage: "الرسالة الأساسية هي توضيح الإلحاح دون اختلاق أرقام غير موثقة.",
        contentSummary: "يتم استبدال القيمة الرئيسية بمؤشر معتمد عند توفر مصدر البيانات.",
        bullets: ["الدليل: أضف أقوى مؤشر موثق يوضح سبب التحرك الآن"],
        kpis: ["الآن"],
      };
    case "Opportunity":
      return {
        keyMessage: `النموذج الأفضل لـ«${subject}» يجب أن يرفع الوضوح والسرعة والمساءلة معًا.`,
        contentSummary: "وصف الحالة المستقبلية بلغة تشغيلية واضحة.",
        bullets: [
          "الوضوح: مصدر موحد وموثوق لمتابعة الأداء والتقدم",
          "السرعة: تقليل نقاط التسليم وتسريع دورة اتخاذ القرار",
          "الرقابة: ملكية ومعايير ومسارات تصعيد واضحة",
        ],
      };
    case "Solution":
      return {
        keyMessage: `استراتيجية «${subject}» يجب أن ترتكز على عدد محدود من الركائز المتكاملة.`,
        contentSummary: "كل ركيزة يجب أن تكون متميزة وقابلة للتنفيذ ومرتبطة بنتيجة يمكن قياسها.",
        bullets: [
          "التبسيط: إزالة التعقيد غير الضروري قبل الأتمتة",
          "الربط: ربط البيانات والفرق والقرارات من البداية للنهاية",
          "الأتمتة: استخدام التقنية لإزالة الأعمال المتكررة ونقاط التعثر",
        ],
      };
    case "Portfolio":
      return {
        keyMessage: "تحويل الاستراتيجية إلى محفظة مبادرات واضحة الملكية والأولوية.",
        contentSummary: "تجميع المبادرات حسب النتائج المطلوبة وليس حسب الإدارات فقط.",
        bullets: [
          "الأساس: البيانات والمعايير والقدرات الممكنة",
          "التشغيل: إعادة تصميم الإجراءات الأعلى احتكاكًا أولًا",
          "التجربة: تحسينات ملموسة للمستفيد أو الموظف",
          "الحوكمة: القياس والملكية والتحسين المستمر",
        ],
      };
    case "Roadmap":
    case "Timeline":
      return {
        keyMessage: "تنفيذ متسلسل بحيث تهيئ كل مرحلة متطلبات نجاح المرحلة التالية.",
        contentSummary: "التركيز على المعالم ونقاط القرار بدل قائمة طويلة من التواريخ.",
        bullets: [
          "المواءمة: اعتماد النطاق وخط الأساس والمسؤوليات",
          "البناء: تنفيذ الأساس والقدرات ذات الأولوية",
          "التوسع: تعميم ما ثبت نجاحه على نطاق أوسع",
          "التحسين: قياس النتائج والتطوير المستمر",
        ],
      };
    case "Process":
      return {
        keyMessage: "التنفيذ يحتاج إلى إيقاع واضح وصلاحيات قرار ومسار تصعيد سريع.",
        contentSummary: "حوكمة خفيفة تسرع التنفيذ بدل أن تتحول إلى عبء إضافي.",
        bullets: [
          "الأولوية: قائمة واحدة مرتبة للنتائج المطلوبة",
          "التنفيذ: دورات قصيرة بمسؤولين محددين",
          "المراجعة: قياس التقدم وفق أدلة متفق عليها",
          "القرار: تصعيد الاستثناءات وتوثيق القرارات بسرعة",
        ],
      };
    case "Financial":
      return {
        keyMessage: "عرض الاستثمار والقيمة المتوقعة في صفحة واحدة.",
        contentSummary: "تستخدم البيانات المالية المعتمدة عند توفرها؛ والقيم الحالية تصنيفات قرار وليست أرقامًا مختلقة.",
        bullets: [
          "CAPEX: الاستثمار التأسيسي والتنفيذي لمرة واحدة",
          "OPEX: التكلفة التشغيلية والدعم المستمر",
          "القيمة: المنافع وتجنب التكلفة وتقليل المخاطر",
        ],
        kpis: ["CAPEX", "OPEX", "ROI"],
      };
    case "Data Story":
    case "Dashboard":
      return {
        keyMessage: "تحديد معايير النجاح قبل بدء التنفيذ.",
        contentSummary: "قياس النتائج الفعلية وليس حجم الأنشطة فقط.",
        bullets: [
          "الأثر: النتيجة التجارية أو التشغيلية المطلوب تحسينها",
          "السرعة: الزمن اللازم للتنفيذ أو اتخاذ القرار",
          "التبني: مدى الاستخدام الفعلي للنموذج الجديد",
        ],
        kpis: ["الأثر", "السرعة", "التبني"],
      };
    case "Comparison":
    case "Before / After":
      return {
        keyMessage: "إظهار المفاضلة بوضوح يجعل منطق التوصية أسهل في التقييم.",
        contentSummary: "مقارنة الوضع الحالي والمسار المقترح باستخدام المعايير نفسها.",
        bullets: [
          "الوضع الحالي: ملكية مجزأة وتغذية راجعة أبطأ ورؤية محدودة",
          "الوضع المقترح: ملكية مترابطة وقرارات أسرع ونتائج قابلة للقياس",
        ],
      };
    case "Case Study":
      return {
        keyMessage: "استخدام أمثلة قابلة للتحقق ومرتبطة بالسياق فقط.",
        contentSummary: "أضف مثالًا داخليًا أو خارجيًا مشابهًا مع مصدر واضح قبل التصدير النهائي.",
        bullets: [
          "الحالة: ما الذي يجعل المثال قابلًا للمقارنة",
          "الدرس: ما الذي ينبغي تكراره أو تجنبه",
        ],
      };
    case "Call to Action":
      return {
        keyMessage: "إنهاء العرض بقرار محدد وليس بخاتمة عامة.",
        contentSummary: "اعتماد الرعاية والنطاق والخطوة التالية المباشرة.",
        bullets: [
          "الاعتماد: الموافقة على التوجه والنطاق المقترح",
          "الرعاية: تحديد المسؤول التنفيذي عن المبادرة",
          "البدء: اعتماد دورة التخطيط والتحقق الأولى",
        ],
      };
    case "Closing":
      return {
        keyMessage: `الرسالة الأخيرة: الاتفاق على «${subject}» ثم الانتقال إلى التنفيذ.`,
        contentSummary: "الأسئلة والنقاش.",
      };
    default:
      return {
        keyMessage: slide.keyMessage,
        contentSummary: slide.contentSummary,
      };
  }
}

export function designPlannedSlides(slides: PlannedSlide[], request: PlanRequest): PlannedSlide[] {
  const subject = subjectFromTopic(request.topic) || "Untitled Presentation";
  const arabic = isArabic(request);
  const bilingual = isBilingual(request);

  return slides.map((slide) => {
    const copy = arabic ? arabicCopy(slide, subject) : englishCopy(slide, subject);
    const localizedTitle =
      slide.slideIntent === "Cover"
        ? subject
        : arabic
          ? copy.title ?? AR_TITLES[slide.slideIntent] ?? slide.title
          : copy.title ?? slide.title;

    return {
      ...slide,
      title: bilingual && slide.slideIntent !== "Cover" && AR_TITLES[slide.slideIntent]
        ? `${localizedTitle} / ${AR_TITLES[slide.slideIntent]}`
        : localizedTitle,
      keyMessage: copy.keyMessage,
      contentSummary: copy.contentSummary,
      bullets: copy.bullets,
      kpis: copy.kpis,
      layoutId: LAYOUT_BY_INTENT[slide.slideIntent] ?? "title-content",
    };
  });
}

export function storyArcFor(request: PlanRequest): StoryBeat[] {
  if (!isArabic(request)) {
    return [
      { id: "context", label: "Context", question: "Where are we today?" },
      { id: "problem", label: "Problem", question: "What is holding us back?" },
      { id: "opportunity", label: "Opportunity", question: "What can change?" },
      { id: "strategy", label: "Strategy", question: "What should we do?" },
      { id: "roadmap", label: "Roadmap", question: "How will we execute?" },
      { id: "investment", label: "Investment", question: "What resources are required?" },
      { id: "impact", label: "Business Impact", question: "What value will be created?" },
      { id: "decision", label: "Decision", question: "What approval or action is required?" },
    ];
  }
  return [
    { id: "context", label: "السياق", question: "أين نحن اليوم؟" },
    { id: "problem", label: "التحدي", question: "ما الذي يحد من التقدم؟" },
    { id: "opportunity", label: "الفرصة", question: "ما الذي يمكن تغييره؟" },
    { id: "strategy", label: "الاستراتيجية", question: "ما الذي ينبغي فعله؟" },
    { id: "roadmap", label: "خارطة الطريق", question: "كيف سيتم التنفيذ؟" },
    { id: "investment", label: "الاستثمار", question: "ما الموارد المطلوبة؟" },
    { id: "impact", label: "الأثر", question: "ما القيمة المتوقعة؟" },
    { id: "decision", label: "القرار", question: "ما الاعتماد أو الإجراء المطلوب؟" },
  ];
}

export function briefCopy(request: PlanRequest, subject: string) {
  if (isArabic(request)) {
    return {
      objective:
        request.objective?.trim() ||
        `تقديم رؤية واضحة إلى ${request.audience} حول «${subject}» والوصول إلى قرار عملي قابل للتنفيذ.`,
      coreMessage:
        `يحتاج «${subject}» إلى مسار واضح يربط الأولويات بالتنفيذ والقياس والقرار المطلوب من الإدارة.`,
      visualDirection:
        request.tone === "Data-driven"
          ? "تصميم تنفيذي يركز على البيانات، مع رسوم واضحة وتسلسل بصري هادئ."
          : request.tone === "Creative"
            ? "تصميم بصري حديث يعتمد على المساحات والصور والطباعة التعبيرية دون ازدحام."
            : "تصميم تنفيذي حديث: فكرة واحدة رئيسية في كل شريحة، مساحات مريحة وتسلسل بصري قوي.",
    };
  }

  return {
    objective:
      request.objective?.trim() ||
      `Give the ${request.audience.toLowerCase()} a clear view of ${subject} and move the discussion toward a concrete decision.`,
    coreMessage:
      `${subject} needs a clear path that connects priorities, execution, measurement and the decision required from leadership.`,
    visualDirection:
      request.tone === "Data-driven"
        ? "Chart-led, restrained palette and clear evidence hierarchy."
        : request.tone === "Creative"
          ? "Image-led with generous space and expressive typography."
          : "Executive and spacious: one idea per slide, quiet palette and strong hierarchy.",
  };
}
