import { uid } from "@/lib/data/store";
import type { BrandKit, Presentation, Slide } from "@/lib/types";
import { themeOverridesFromBrandKit } from "@/lib/editor/themes";
import type { ImageElement } from "@/lib/editor/model";

const BRAND_LOGO_NAME = "Brand Logo";

function withBrandLogo(slide: Slide, logoDataUrl?: string): Slide {
  const kept = slide.elements.filter((el) => el.name !== BRAND_LOGO_NAME);
  if (!logoDataUrl) return kept.length === slide.elements.length ? slide : { ...slide, elements: kept };

  const cover = slide.slideIntent === "Cover";
  const width = cover ? 180 : 130;
  const height = cover ? 82 : 58;
  const x = 1600 - width - (cover ? 90 : 70);
  const y = cover ? 70 : 46;
  const maxZ = Math.max(-1, ...kept.map((el) => el.zIndex));
  const logo: ImageElement = {
    id: uid(),
    slideId: slide.id,
    type: "image",
    name: BRAND_LOGO_NAME,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    zIndex: maxZ + 1,
    locked: false,
    visible: true,
    properties: { src: logoDataUrl, fit: "contain", radius: 0 },
  };
  return { ...slide, elements: [...kept, logo], updatedAt: new Date().toISOString() };
}

export function applyBrandKit(presentation: Presentation, kit: BrandKit): Partial<Presentation> {
  return {
    brandKitId: kit.id,
    themeOverrides: themeOverridesFromBrandKit(kit),
    slides: presentation.slides.map((slide) => withBrandLogo(slide, kit.logoDataUrl)),
  };
}

export function clearBrandKit(presentation: Presentation): Partial<Presentation> {
  return {
    brandKitId: undefined,
    themeOverrides: undefined,
    slides: presentation.slides.map((slide) => withBrandLogo(slide, undefined)),
  };
}
