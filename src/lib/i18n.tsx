import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type UILanguage = "en" | "ar";
export type Direction = "ltr" | "rtl";

const STORAGE_KEY = "aps.lang";

type Dict = Record<string, string>;

const en: Dict = {
  "nav.home": "Home",
  "nav.presentations": "Presentations",
  "nav.templates": "Templates",
  "nav.brandKits": "Brand Kits",
  "nav.assets": "Assets",
  "nav.settings": "Settings",
  "brand.name": "Meridian Studio",
  "brand.tagline": "From idea to boardroom-ready presentation.",
  "home.heading": "What will we present today?",
  "home.placeholder": "Describe your presentation, topic, idea, or goal…",
  "home.generate": "Generate Presentation Plan",
  "home.attach": "Attach Files",
  "home.example": "Try an example",
  "home.recent": "Recent presentations",
  "home.viewAll": "View all",
  "greeting.morning": "Good morning",
  "greeting.afternoon": "Good afternoon",
  "greeting.evening": "Good evening",
  "setup.title": "Presentation setup",
  "setup.subtitle": "Confirm what we inferred. Everything here shapes the blueprint.",
  "setup.topic": "Presentation topic",
  "setup.objective": "Objective",
  "setup.audience": "Audience",
  "setup.purpose": "Purpose",
  "setup.type": "Presentation type",
  "setup.language": "Language",
  "setup.length": "Desired length",
  "setup.tone": "Tone",
  "setup.customCount": "Slide count",
  "setup.build": "Build the blueprint",
  "setup.building": "Analysing your idea…",
  "setup.back": "Back",
  "blueprint.brief": "Presentation brief",
  "blueprint.storyArc": "Story arc",
  "blueprint.slideMap": "Slide map",
  "blueprint.addSlide": "Add Slide",
  "blueprint.regenerate": "Regenerate Outline",
  "blueprint.shorten": "Shorten Presentation",
  "blueprint.expand": "Expand Presentation",
  "blueprint.continue": "Continue to Editor",
  "editor.open": "Open editor",
  "tab.blueprint": "Blueprint",
  "tab.slides": "Slides",
  "tab.design": "Design",
  "tab.files": "Files",
  "save.saving": "Saving…",
  "save.saved": "Saved",
  "common.slides": "slides",
  "common.minutes": "min",
  "common.edited": "Edited",
  "common.optional": "Optional",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.duplicate": "Duplicate",
  "common.rename": "Rename",
  "common.open": "Open",
  "common.merge": "Merge up",
};

const ar: Dict = {
  "nav.home": "الرئيسية",
  "nav.presentations": "العروض",
  "nav.templates": "القوالب",
  "nav.brandKits": "الهوية البصرية",
  "nav.assets": "الملفات",
  "nav.settings": "الإعدادات",
  "brand.name": "استوديو ميريديان",
  "brand.tagline": "من الفكرة إلى عرض جاهز لمجلس الإدارة.",
  "home.heading": "ماذا سنقدّم اليوم؟",
  "home.placeholder": "صِف عرضك أو موضوعك أو هدفك…",
  "home.generate": "إنشاء خطة العرض",
  "home.attach": "إرفاق ملفات",
  "home.example": "جرّب مثالاً",
  "home.recent": "أحدث العروض",
  "home.viewAll": "عرض الكل",
  "greeting.morning": "صباح الخير",
  "greeting.afternoon": "مساء الخير",
  "greeting.evening": "مساء الخير",
  "setup.title": "إعداد العرض",
  "setup.subtitle": "راجع ما استنتجناه. كل خيار هنا يشكّل المخطط.",
  "setup.topic": "موضوع العرض",
  "setup.objective": "الهدف",
  "setup.audience": "الجمهور",
  "setup.purpose": "الغرض",
  "setup.type": "نوع العرض",
  "setup.language": "اللغة",
  "setup.length": "الطول المطلوب",
  "setup.tone": "النبرة",
  "setup.customCount": "عدد الشرائح",
  "setup.build": "بناء المخطط",
  "setup.building": "نحلّل فكرتك…",
  "setup.back": "رجوع",
  "blueprint.brief": "ملخّص العرض",
  "blueprint.storyArc": "قوس السرد",
  "blueprint.slideMap": "خريطة الشرائح",
  "blueprint.addSlide": "إضافة شريحة",
  "blueprint.regenerate": "إعادة توليد المخطط",
  "blueprint.shorten": "اختصار العرض",
  "blueprint.expand": "توسيع العرض",
  "blueprint.continue": "المتابعة إلى المحرر",
  "editor.open": "فتح المحرر",
  "tab.blueprint": "المخطط",
  "tab.slides": "الشرائح",
  "tab.design": "التصميم",
  "tab.files": "الملفات",
  "save.saving": "جارٍ الحفظ…",
  "save.saved": "تم الحفظ",
  "common.slides": "شريحة",
  "common.minutes": "دقيقة",
  "common.edited": "آخر تعديل",
  "common.optional": "اختيارية",
  "common.cancel": "إلغاء",
  "common.delete": "حذف",
  "common.duplicate": "نسخ",
  "common.rename": "إعادة تسمية",
  "common.open": "فتح",
  "common.merge": "دمج مع السابقة",
};

const DICTS: Record<UILanguage, Dict> = { en, ar };

interface I18nValue {
  lang: UILanguage;
  dir: Direction;
  setLang: (lang: UILanguage) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UILanguage>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as UILanguage | null;
    if (stored === "ar" || stored === "en") setLangState(stored);
  }, []);

  const dir: Direction = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((next: UILanguage) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback((key: string) => DICTS[lang][key] ?? DICTS.en[key] ?? key, [lang]);

  const value = useMemo(() => ({ lang, dir, setLang, t }), [lang, dir, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
