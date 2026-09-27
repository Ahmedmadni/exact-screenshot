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
];

export const DEFAULT_THEME_ID = "executive-light";

export function getTheme(id?: string): SlideTheme {
  return SLIDE_THEMES.find((t) => t.id === id) ?? SLIDE_THEMES[0]!;
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
];
