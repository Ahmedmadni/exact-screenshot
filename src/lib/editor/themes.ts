import type { BrandKit, PresentationThemeOverrides } from "@/lib/types";
/** Presentation-level visual systems. Slide colors are deck data, not app UI tokens. */
export interface SlideTheme {
  id: string;
  name: string;
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    accent: string;
    accentSoft: string;
    onAccent: string;
    line: string;
  };
  fonts: { heading: string; body: string };
  shape: { radius: number };
}

export const THEME_COLOR_KEYS = [
  "background",
  "surface",
  "primary",
  "secondary",
  "accent",
  "accentSoft",
  "onAccent",
  "line",
] as const;
export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];

export const SLIDE_THEMES: SlideTheme[] = [
  {
    id: "executive-light",
    name: "Executive Light",
    colors: { background: "#FAF8F4", surface: "#FFFFFF", primary: "#1E1B18", secondary: "#6B645C", accent: "#B8632E", accentSoft: "#F3E6DA", onAccent: "#FFFFFF", line: "#E4DED5" },
    fonts: { heading: "Fraunces", body: "Plus Jakarta Sans" },
    shape: { radius: 18 },
  },
  {
    id: "executive-dark",
    name: "Executive Dark",
    colors: { background: "#14161B", surface: "#1E2129", primary: "#F4F1EA", secondary: "#A5A29B", accent: "#D9A45B", accentSoft: "#2C2A25", onAccent: "#14161B", line: "#30333C" },
    fonts: { heading: "Fraunces", body: "Plus Jakarta Sans" },
    shape: { radius: 16 },
  },
  {
    id: "modern-corporate",
    name: "Modern Corporate",
    colors: { background: "#FFFFFF", surface: "#F2F5F9", primary: "#0E1E33", secondary: "#56657A", accent: "#1F5EDB", accentSoft: "#E3ECFC", onAccent: "#FFFFFF", line: "#DCE3EC" },
    fonts: { heading: "Manrope", body: "Manrope" },
    shape: { radius: 12 },
  },
  {
    id: "minimal",
    name: "Minimal",
    colors: { background: "#FFFFFF", surface: "#F6F6F6", primary: "#111111", secondary: "#707070", accent: "#111111", accentSoft: "#EDEDED", onAccent: "#FFFFFF", line: "#E6E6E6" },
    fonts: { heading: "DM Sans", body: "DM Sans" },
    shape: { radius: 4 },
  },
  {
    id: "technology",
    name: "Technology",
    colors: { background: "#0A0F1E", surface: "#131A2E", primary: "#E8EEFF", secondary: "#8C97B8", accent: "#3DE0C2", accentSoft: "#14302E", onAccent: "#0A0F1E", line: "#222B45" },
    fonts: { heading: "Space Grotesk", body: "Space Grotesk" },
    shape: { radius: 10 },
  },
  {
    id: "consulting-navy",
    name: "Consulting Navy",
    colors: { background: "#F7F8FA", surface: "#FFFFFF", primary: "#0B1F3A", secondary: "#5C6878", accent: "#C53B3B", accentSoft: "#F6E7E7", onAccent: "#FFFFFF", line: "#D9DEE6" },
    fonts: { heading: "Manrope", body: "Manrope" },
    shape: { radius: 8 },
  },
  {
    id: "sovereign-green",
    name: "Sovereign Green",
    colors: { background: "#F7F7F2", surface: "#FFFFFF", primary: "#143D2D", secondary: "#69726C", accent: "#9B7A33", accentSoft: "#EEE7D8", onAccent: "#FFFFFF", line: "#DADDD4" },
    fonts: { heading: "Noto Kufi Arabic", body: "IBM Plex Sans Arabic" },
    shape: { radius: 10 },
  },
  {
    id: "luxury-black",
    name: "Luxury Black",
    colors: { background: "#090909", surface: "#141414", primary: "#F4EFE6", secondary: "#B5ADA1", accent: "#D7B46A", accentSoft: "#2A2418", onAccent: "#111111", line: "#2A2A2A" },
    fonts: { heading: "Fraunces", body: "Plus Jakarta Sans" },
    shape: { radius: 2 },
  },
  {
    id: "editorial-cream",
    name: "Editorial Cream",
    colors: { background: "#F5F0E8", surface: "#FBF8F2", primary: "#201F1C", secondary: "#6E695F", accent: "#8D2E2E", accentSoft: "#EADCD7", onAccent: "#FFFFFF", line: "#D8D0C2" },
    fonts: { heading: "Fraunces", body: "DM Sans" },
    shape: { radius: 0 },
  },
  {
    id: "finance-ink",
    name: "Finance Ink",
    colors: { background: "#F8FAFC", surface: "#FFFFFF", primary: "#14213D", secondary: "#5F6B7A", accent: "#1C6E8C", accentSoft: "#E3F0F5", onAccent: "#FFFFFF", line: "#DCE3E9" },
    fonts: { heading: "Manrope", body: "Manrope" },
    shape: { radius: 6 },
  },
  {
    id: "ai-neon",
    name: "AI Neon",
    colors: { background: "#070A12", surface: "#101626", primary: "#F6F7FB", secondary: "#98A3BD", accent: "#8B5CF6", accentSoft: "#22183D", onAccent: "#FFFFFF", line: "#202A40" },
    fonts: { heading: "Space Grotesk", body: "Plus Jakarta Sans" },
    shape: { radius: 16 },
  },
  {
    id: "warm-minimal",
    name: "Warm Minimal",
    colors: { background: "#F8F4EF", surface: "#FFFDFB", primary: "#2D2A26", secondary: "#7A7168", accent: "#9C5A3C", accentSoft: "#F0E2D8", onAccent: "#FFFFFF", line: "#E4DBD2" },
    fonts: { heading: "DM Sans", body: "DM Sans" },
    shape: { radius: 14 },
  },
  {
    id: "royal-blue",
    name: "Royal Blue",
    colors: { background: "#07172E", surface: "#0D2342", primary: "#F8FBFF", secondary: "#AFC0D8", accent: "#5CA9FF", accentSoft: "#102F59", onAccent: "#07172E", line: "#1D385A" },
    fonts: { heading: "Manrope", body: "Manrope" },
    shape: { radius: 12 },
  },
  {
    id: "desert-sand",
    name: "Desert Sand",
    colors: { background: "#EEE5D5", surface: "#F8F3E8", primary: "#3D3024", secondary: "#766A5C", accent: "#B66A3C", accentSoft: "#E8D2C1", onAccent: "#FFFFFF", line: "#D7C8B3" },
    fonts: { heading: "Noto Kufi Arabic", body: "IBM Plex Sans Arabic" },
    shape: { radius: 18 },
  },
  {
    id: "emerald-dark",
    name: "Emerald Dark",
    colors: { background: "#07140F", surface: "#0C2018", primary: "#F0FAF5", secondary: "#91B7A6", accent: "#4ADE80", accentSoft: "#123423", onAccent: "#07140F", line: "#1B3A2C" },
    fonts: { heading: "Manrope", body: "Plus Jakarta Sans" },
    shape: { radius: 14 },
  },
];

export const DEFAULT_THEME_ID = "executive-light";

export function getTheme(id?: string, overrides?: PresentationThemeOverrides): SlideTheme {
  const base = SLIDE_THEMES.find((t) => t.id === id) ?? SLIDE_THEMES[0]!;
  if (!overrides) return base;
  return {
    ...base,
    colors: { ...base.colors, ...(overrides.colors ?? {}) },
    fonts: { ...base.fonts, ...(overrides.fonts ?? {}) },
    shape: { ...base.shape, ...(overrides.shape ?? {}) },
  };
}

function channel(hex: string, start: number) {
  return parseInt(hex.slice(start, start + 2), 16);
}

function normalizeHex(value: string, fallback: string) {
  const hex = value.trim().replace("#", "");
  return /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex.toUpperCase()}` : fallback;
}

function mix(a: string, b: string, ratio: number) {
  const aa = normalizeHex(a, "#FFFFFF").slice(1);
  const bb = normalizeHex(b, "#000000").slice(1);
  const t = Math.max(0, Math.min(1, ratio));
  const parts = [0, 2, 4].map((i) => Math.round(channel(aa, i) * (1 - t) + channel(bb, i) * t));
  return `#${parts.map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function luminance(hex: string) {
  const h = normalizeHex(hex, "#FFFFFF").slice(1);
  const rgb = [0, 2, 4].map((i) => channel(h, i) / 255).map((c) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
}

export function themeOverridesFromBrandKit(kit: BrandKit): PresentationThemeOverrides {
  const palette = kit.colors ?? [];
  const background = normalizeHex(kit.backgroundColor ?? palette[0] ?? "#FFFFFF", "#FFFFFF");
  const text = normalizeHex(kit.textColor ?? palette[1] ?? "#111827", "#111827");
  const accent = normalizeHex(kit.accentColor ?? palette[2] ?? "#2563EB", "#2563EB");
  const surface = normalizeHex(kit.surfaceColor ?? mix(background, text, 0.05), mix(background, text, 0.05));
  const secondary = normalizeHex(kit.secondaryTextColor ?? mix(text, background, 0.38), mix(text, background, 0.38));
  const darkAccent = luminance(accent) < 0.42;
  return {
    colors: {
      background,
      surface,
      primary: text,
      secondary,
      accent,
      accentSoft: mix(accent, background, 0.84),
      onAccent: darkAccent ? "#FFFFFF" : "#111111",
      line: mix(text, background, 0.82),
    },
    fonts: {
      heading: kit.headingFont || "Manrope",
      body: kit.bodyFont || "Manrope",
    },
  };
}

const ARABIC_FALLBACK = `"IBM Plex Sans Arabic", system-ui, sans-serif`;

export function resolveColor(value: string | undefined, theme: SlideTheme): string {
  if (!value) return "transparent";
  if (value.startsWith("theme:")) {
    const key = value.slice(6) as ThemeColorKey;
    return theme.colors[key] ?? "transparent";
  }
  return value;
}

export function resolveFont(value: string, theme: SlideTheme): string {
  const family =
    value === "theme:heading" ? theme.fonts.heading : value === "theme:body" ? theme.fonts.body : value;
  return `"${family}", ${ARABIC_FALLBACK}`;
}

export const FONT_CHOICES = [
  "Fraunces",
  "Plus Jakarta Sans",
  "Manrope",
  "DM Sans",
  "Space Grotesk",
  "IBM Plex Sans Arabic",
  "Noto Kufi Arabic",
];
