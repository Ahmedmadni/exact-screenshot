import type { AssetRecord, EvidenceRef, Presentation, Slide } from "@/lib/types";
import { uid } from "@/lib/data/store";
import { materializeSlide } from "@/lib/editor/layouts";
import { instantiate, textEl } from "@/lib/editor/elements";

export interface SourceSegment {
  id: string;
  assetId: string;
  assetName: string;
  kind: AssetRecord["kind"];
  locator: string;
  text: string;
}

export interface NumericEvidenceFact {
  id: string;
  value: string;
  context: string;
  segment: SourceSegment;
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function chunks(value: string, size = 900) {
  const paragraphs = value.split(/\n{2,}/).map(clean).filter(Boolean);
  const result: string[] = [];
  let buffer = "";
  for (const paragraph of paragraphs) {
    if ((buffer + " " + paragraph).trim().length > size && buffer) {
      result.push(buffer.trim());
      buffer = paragraph;
    } else {
      buffer = (buffer + " " + paragraph).trim();
    }
  }
  if (buffer) result.push(buffer);
  return result;
}

export function sourceSegments(asset: AssetRecord): SourceSegment[] {
  const text = asset.extractedText?.trim();
  if (!text) return [];

  const marker = /^\[(Page\s+\d+|Slide\s+\d+|Sheet:\s*[^\]]+)\]\s*$/gmi;
  const matches = [...text.matchAll(marker)];

  if (!matches.length) {
    return chunks(text).map((part, index) => ({
      id: `${asset.id}:section:${index + 1}`,
      assetId: asset.id,
      assetName: asset.name,
      kind: asset.kind,
      locator: `Section ${index + 1}`,
      text: part,
    }));
  }

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    return {
      id: `${asset.id}:${index + 1}`,
      assetId: asset.id,
      assetName: asset.name,
      kind: asset.kind,
      locator: match[1]!.replace(/^Sheet:\s*/i, "Sheet: "),
      text: clean(text.slice(start, end)),
    };
  }).filter((segment) => segment.text);
}

function tokens(query: string) {
  return clean(query.toLowerCase())
    .split(/[^\p{L}\p{N}%]+/u)
    .filter((token) => token.length >= 2);
}

function locatorIntent(query: string) {
  const page = query.match(/(?:page|صفحة)\s*(\d+)/i);
  if (page) return `page ${page[1]}`;
  const slide = query.match(/(?:slide|شريحة)\s*(\d+)/i);
  if (slide) return `slide ${slide[1]}`;
  const sheet = query.match(/(?:sheet|ورقة|شيت)\s*[:\-]?\s*([^,;]+)/i);
  if (sheet) return `sheet: ${sheet[1]!.trim().toLowerCase()}`;
  return null;
}

export function searchEvidence(assets: AssetRecord[], query: string, limit = 20): SourceSegment[] {
  const all = assets.flatMap(sourceSegments);
  const q = clean(query);
  if (!q) return all.slice(0, limit);

  const locator = locatorIntent(q);
  if (locator) {
    const located = all.filter((segment) => segment.locator.toLowerCase().includes(locator));
    if (located.length) return located.slice(0, limit);
  }

  const ts = tokens(q);
  return all
    .map((segment) => {
      const hay = `${segment.assetName} ${segment.locator} ${segment.text}`.toLowerCase();
      const score = ts.reduce((sum, token) => sum + (hay.includes(token) ? 3 : 0), 0)
        + (segment.text.toLowerCase().includes(q.toLowerCase()) ? 8 : 0);
      return { segment, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.segment);
}

const NUMBER = /(?:SAR\s*)?(?:[$€£¥]\s*)?-?\d[\d,.]*(?:\.\d+)?\s*%?/gi;

export function numericEvidenceFacts(assets: AssetRecord[], limit = 20): NumericEvidenceFact[] {
  const facts: NumericEvidenceFact[] = [];
  for (const segment of assets.flatMap(sourceSegments)) {
    for (const match of segment.text.matchAll(NUMBER)) {
      const value = match[0]?.trim();
      if (!value) continue;
      const start = Math.max(0, (match.index ?? 0) - 90);
      const end = Math.min(segment.text.length, (match.index ?? 0) + value.length + 110);
      const context = clean(segment.text.slice(start, end));
      facts.push({
        id: `${segment.id}:number:${match.index ?? facts.length}`,
        value,
        context,
        segment,
      });
      if (facts.length >= limit * 3) break;
    }
  }
  return facts
    .filter((fact, index, all) => all.findIndex((other) =>
      other.value === fact.value && other.context === fact.context && other.segment.assetId === fact.segment.assetId
    ) === index)
    .slice(0, limit);
}

export function topNumericEvidence(assets: AssetRecord[], limit = 12): SourceSegment[] {
  const hits = assets.flatMap(sourceSegments).flatMap((segment) => {
    const count = segment.text.match(NUMBER)?.length ?? 0;
    return count ? [{ segment, count }] : [];
  });
  return hits.sort((a, b) => b.count - a.count).slice(0, limit).map((hit) => hit.segment);
}

export function evidenceFromAsset(asset: AssetRecord, locator: string, quote: string): EvidenceRef {
  return {
    id: uid(),
    assetId: asset.id,
    assetName: asset.name,
    locator,
    quote: clean(quote).slice(0, 1200),
    createdAt: new Date().toISOString(),
  };
}

export function evidenceFromSegment(segment: SourceSegment, quote = segment.text): EvidenceRef {
  return {
    id: uid(),
    assetId: segment.assetId,
    assetName: segment.assetName,
    locator: segment.locator,
    quote: clean(quote).slice(0, 1200),
    createdAt: new Date().toISOString(),
  };
}

function citationLabel(refs: EvidenceRef[]) {
  return refs.map((ref) => `${ref.assetName}${ref.locator ? ` · ${ref.locator}` : ""}`).join("   |   ");
}

export function addEvidenceToSlide(slide: Slide, evidence: EvidenceRef, withFooter = true): Slide {
  const refs = [...(slide.evidenceRefs ?? []).filter((ref) => !(ref.assetId === evidence.assetId && ref.locator === evidence.locator && ref.quote === evidence.quote)), evidence];
  const sourceAssetIds = [...new Set([...(slide.sourceAssetIds ?? []), evidence.assetId])];
  let elements = slide.elements.filter((el) => el.name !== "Evidence Citation");

  if (withFooter) {
    const maxZ = Math.max(-1, ...elements.map((el) => el.zIndex));
    const [footer] = instantiate([
      {
        ...textEl("Evidence Citation", citationLabel(refs), [70, 838, 1460, 28], {
          fontFamily: "theme:body",
          fontSize: 15,
          fontWeight: 400,
          color: "theme:secondary",
          align: "start",
          vAlign: "middle",
        }),
        role: "decor",
      },
    ], slide.id, maxZ + 1);
    elements = [...elements, footer!].map((el, zIndex) => ({ ...el, zIndex }));
  }

  return {
    ...slide,
    sourceAssetIds,
    evidenceRefs: refs,
    elements,
    updatedAt: new Date().toISOString(),
  };
}

function sentences(text: string) {
  return clean(text)
    .split(/(?<=[.!?؟])\s+/)
    .map(clean)
    .filter((sentence) => sentence.length >= 20)
    .slice(0, 5);
}

export function createSlideFromEvidence(presentation: Presentation, segment: SourceSegment): Slide {
  const stamp = new Date().toISOString();
  const id = uid();
  const hasNumbers = NUMBER.test(segment.text);
  NUMBER.lastIndex = 0;
  const bullets = sentences(segment.text);
  const base: Slide = {
    id,
    presentationId: presentation.id,
    slideNumber: presentation.slides.length + 1,
    sortOrder: presentation.slides.length,
    title: `${segment.assetName} — ${segment.locator}`,
    purpose: "Source Evidence",
    slideIntent: hasNumbers ? "Data Story" : "Case Study",
    keyMessage: bullets[0] ?? clean(segment.text).slice(0, 180),
    contentSummary: clean(segment.text).slice(0, 600),
    visualType: hasNumbers ? "Big Number" : "Minimal Text",
    isOptional: false,
    bullets: bullets.length ? bullets : [clean(segment.text).slice(0, 400)],
    sourceAssetIds: [segment.assetId],
    evidenceRefs: [],
    elements: [],
    layoutId: "title-content",
    createdAt: stamp,
    updatedAt: stamp,
  };
  return addEvidenceToSlide(materializeSlide(base), evidenceFromSegment(segment), true);
}


export function removeEvidenceFromSlide(slide: Slide, evidenceId: string): Slide {
  const refs = (slide.evidenceRefs ?? []).filter((ref) => ref.id !== evidenceId);
  let elements = slide.elements.filter((el) => el.name !== "Evidence Citation");
  if (refs.length) {
    const maxZ = Math.max(-1, ...elements.map((el) => el.zIndex));
    const [footer] = instantiate([
      {
        ...textEl("Evidence Citation", citationLabel(refs), [70, 838, 1460, 28], {
          fontFamily: "theme:body",
          fontSize: 15,
          fontWeight: 400,
          color: "theme:secondary",
          align: "start",
          vAlign: "middle",
        }),
        role: "decor",
      },
    ], slide.id, maxZ + 1);
    elements = [...elements, footer!].map((el, zIndex) => ({ ...el, zIndex }));
  }
  return {
    ...slide,
    evidenceRefs: refs,
    elements,
    updatedAt: new Date().toISOString(),
  };
}


function groundingTokens(value: string) {
  const stop = new Set([
    "the","and","for","with","from","this","that","into","will","are","our","your","you","of","to","in","on","a","an",
    "من","في","على","إلى","الى","عن","مع","هذا","هذه","ذلك","التي","الذي","و","أو","او","هو","هي","تم","يتم",
  ]);
  return [...new Set(tokens(value).filter((token) => !stop.has(token)))];
}

function overlapScore(slide: Slide, segment: SourceSegment) {
  const query = groundingTokens([
    slide.keyMessage,
    slide.contentSummary,
    ...(slide.bullets ?? []),
    ...(slide.kpis ?? []),
  ].join(" "));
  if (!query.length) return 0;
  const hay = segment.text.toLowerCase();
  const matches = query.filter((token) => hay.includes(token)).length;
  return matches / Math.min(Math.max(query.length, 1), 12);
}

export function groundSlidesFromSources(slides: Slide[], assets: AssetRecord[]): Slide[] {
  const segments = assets
    .filter((asset) => asset.extractionStatus === "ready" && asset.extractedText)
    .flatMap(sourceSegments);
  if (!segments.length) return slides;

  return slides.map((slide) => {
    if (slide.evidenceRefs?.length) return slide;
    const candidates = segments
      .map((segment) => ({ segment, score: overlapScore(slide, segment) }))
      .sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best || best.score < 0.34) return slide;
    return addEvidenceToSlide(slide, evidenceFromSegment(best.segment), true);
  });
}


export function createKpiSlideFromEvidence(
  presentation: Presentation,
  segment: SourceSegment,
  value: string,
  context: string,
): Slide {
  const stamp = new Date().toISOString();
  const id = uid();
  const base: Slide = {
    id,
    presentationId: presentation.id,
    slideNumber: presentation.slides.length + 1,
    sortOrder: presentation.slides.length,
    title: segment.locator,
    purpose: "Source KPI",
    slideIntent: "Big Number",
    keyMessage: clean(context).slice(0, 180),
    contentSummary: clean(context).slice(0, 500),
    visualType: "Big Number",
    isOptional: false,
    bullets: [clean(context).slice(0, 300)],
    kpis: [value],
    sourceAssetIds: [segment.assetId],
    evidenceRefs: [],
    elements: [],
    layoutId: "big-number",
    createdAt: stamp,
    updatedAt: stamp,
  };
  return addEvidenceToSlide(materializeSlide(base), evidenceFromSegment(segment, context), true);
}

export function createSourcesAppendixSlides(presentation: Presentation): Slide[] {
  const refs = presentation.slides
    .flatMap((slide) => slide.evidenceRefs ?? [])
    .filter((ref, index, all) =>
      all.findIndex((other) =>
        other.assetId === ref.assetId &&
        other.locator === ref.locator &&
        other.quote === ref.quote
      ) === index
    );

  if (!refs.length) return [];

  const chunkSize = 7;
  const chunks: EvidenceRef[][] = [];
  for (let i = 0; i < refs.length; i += chunkSize) chunks.push(refs.slice(i, i + chunkSize));

  return chunks.map((chunk, pageIndex) => {
    const stamp = new Date().toISOString();
    const id = uid();
    const bullets = chunk.map((ref, i) => {
      const number = pageIndex * chunkSize + i + 1;
      const quote = clean(ref.quote).slice(0, 180);
      return `[${number}] ${ref.assetName}${ref.locator ? ` · ${ref.locator}` : ""}: ${quote}`;
    });
    const base: Slide = {
      id,
      presentationId: presentation.id,
      slideNumber: presentation.slides.length + pageIndex + 1,
      sortOrder: presentation.slides.length + pageIndex,
      title: pageIndex === 0 ? "Sources & Evidence" : `Sources & Evidence (${pageIndex + 1})`,
      purpose: "References",
      slideIntent: "Closing",
      keyMessage: "Source material used in this presentation.",
      contentSummary: "References are generated from evidence explicitly pinned to slides.",
      visualType: "Minimal Text",
      isOptional: true,
      bullets,
      sourceAssetIds: [...new Set(chunk.map((ref) => ref.assetId))],
      evidenceRefs: [],
      elements: [],
      layoutId: "title-content",
      createdAt: stamp,
      updatedAt: stamp,
    };
    return materializeSlide(base);
  });
}
