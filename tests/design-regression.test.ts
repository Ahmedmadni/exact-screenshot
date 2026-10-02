import { describe, expect, test } from "bun:test";
import { applyVaultMedia, externalVisualSearchQuery } from "../src/lib/assets/auto-media";
import { applyLayout, buildLayout, contentFromSlide } from "../src/lib/editor/layouts";
import { imageTreatmentOverlay } from "../src/lib/editor/image-treatment";
import { getLayout, LAYOUTS } from "../src/lib/editor/layouts";
import { getTemplateFamily, templatePreviewSlides } from "../src/lib/templates";
import { rebuildGeneratedContent } from "../src/lib/editor/composer";
import type { AssetRecord, Slide } from "../src/lib/types";

const slide = (): Slide => ({
  id: "regression-slide",
  presentationId: "regression-deck",
  slideNumber: 1,
  title: "الاستثمار في الرياض",
  purpose: "Review the investment case",
  slideIntent: "Financial",
  keyMessage: "النمو المالي في السعودية",
  contentSummary: "Management financial review",
  visualType: "Chart" as Slide["visualType"],
  isOptional: false,
  sortOrder: 0,
  elements: [],
  createdAt: "2026-10-02T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
});

const asset: AssetRecord = {
  id: "vault-asset",
  presentationId: null,
  name: "Riyadh skyline",
  kind: "image",
  size: 100,
  createdAt: "2026-10-02T00:00:00.000Z",
  imageDataUrl: "data:image/png;base64,AAAA",
  extractionStatus: "ready",
  width: 1600,
  height: 900,
};

describe("design integrity", () => {
  test("specialized covers preserve editable title and message roles", () => {
    const covers = [
      "cover-board-report", "cover-financial-ledger", "cover-investment-memorandum",
      "cover-company-panorama", "cover-arabic-institutional", "cover-consulting-brief",
    ];
    for (const id of covers) {
      const definition = getLayout(id);
      expect(definition?.intents).toContain("Cover");
      const elements = buildLayout(id, contentFromSlide(slide()), "cover-test");
      expect(elements.some((element) => element.type === "text" && element.role === "title")).toBe(true);
      expect(elements.some((element) => element.type === "text" && element.role === "subtitle")).toBe(true);
      expect(elements.every((element) => element.id && element.zIndex >= 0)).toBe(true);
    }
    expect(new Set(LAYOUTS.map((layout) => layout.id)).size).toBe(LAYOUTS.length);
  });

  test("cover preview matches the generated template cover", () => {
    for (const [id, cover] of [
      ["boardroom-strategy", "cover-board-report"],
      ["financial-review", "cover-financial-ledger"],
      ["strategy-consulting", "cover-consulting-brief"],
      ["luxury-investment", "cover-investment-memorandum"],
      ["arabic-executive", "cover-arabic-institutional"],
      ["company-profile", "cover-company-panorama"],
    ]) {
      const template = getTemplateFamily(id);
      expect(template).toBeDefined();
      expect(template?.layoutMap.Cover).toBe(cover);
      expect(template?.previewLayouts[0]).toBe(cover);
      if (template) {
        const [preview] = templatePreviewSlides(template);
        expect(preview?.layoutId).toBe(cover);
      }
    }
  });

  test("Arabic cover mirrors its composition without flattening text", () => {
    const source = slide();
    const content = contentFromSlide(source);
    const regular = buildLayout("cover-arabic-institutional", content, source.id, false);
    const arabic = buildLayout("cover-arabic-institutional", content, source.id, true);
    const leftTitle = regular.find((element) => element.role === "title");
    const rightTitle = arabic.find((element) => element.role === "title");
    expect(leftTitle?.type).toBe("text");
    expect(rightTitle?.type).toBe("text");
    expect(rightTitle?.x).toBe(1600 - (leftTitle?.x ?? 0) - (leftTitle?.width ?? 0));
  });


  test("image treatments are non-destructive and have bounded opacity", () => {
    expect(imageTreatmentOverlay("natural")).toBeNull();
    for (const treatment of ["cinematic", "soft", "brand"] as const) {
      const overlay = imageTreatmentOverlay(treatment);
      expect(overlay).not.toBeNull();
      expect(overlay!.opacity).toBeGreaterThan(0);
      expect(overlay!.opacity).toBeLessThan(0.5);
    }
  });

  test("image treatments survive Magic Design layout changes", () => {
    const source = slide();
    source.elements = buildLayout("image-text", contentFromSlide(source), source.id).map((element) =>
      element.type === "image" && element.role === "media"
        ? { ...element, properties: { ...element.properties, treatment: "cinematic" as const } }
        : element,
    );
    const result = applyLayout(source, "image-caption");
    const photo = result.elements.find((element) => element.type === "image" && element.role === "media");
    expect(photo?.type).toBe("image");
    if (photo?.type === "image") expect(photo.properties.treatment).toBe("cinematic");
  });

  test("Arabic media queries retain mapped English search concepts", () => {
    const query = externalVisualSearchQuery(slide());
    expect(query).toContain("saudi arabia");
    expect(query).toContain("finance");
  });

  test("vault auto-fill never overwrites an existing assetId", () => {
    const source = slide();
    const existing = buildLayout("image-text", contentFromSlide(source), source.id);
    source.elements = existing.map((element) =>
      element.type === "image" && element.role === "media"
        ? { ...element, properties: { ...element.properties, src: "", assetId: "manually-chosen" } }
        : element,
    );
    const [result] = applyVaultMedia([source], [asset]);
    const image = result?.elements.find((element) => element.type === "image" && element.role === "media");
    expect(image?.type).toBe("image");
    if (image?.type === "image") expect(image.properties.assetId).toBe("manually-chosen");
  });

  test("Magic Design retains edited chart data without duplicating charts on repeat switches", () => {
    const source = slide();
    source.elements = buildLayout("chart-story", contentFromSlide(source), source.id).map((element) =>
      element.type === "chart"
        ? { ...element, properties: {
            ...element.properties,
            categories: ["Jan", "Feb", "Mar"],
            series: [{ name: "Actual revenue", values: [18, 21, 26] }],
          } }
        : element,
    );
    const viaTable = applyLayout(source, "finance-table");
    const restored = applyLayout(viaTable, "chart-story");
    const charts = restored.elements.filter((element) => element.type === "chart");
    expect(charts).toHaveLength(1);
    const chart = charts[0];
    if (chart?.type === "chart") {
      expect(chart.properties.categories).toEqual(["Jan", "Feb", "Mar"]);
      expect(chart.properties.series[0]?.values).toEqual([18, 21, 26]);
    }
  });

  test("regenerating content preserves selected image and treatment", () => {
    const source = slide();
    source.elements = buildLayout("image-text", contentFromSlide(source), source.id).map((element) =>
      element.type === "image" && element.role === "media"
        ? { ...element, properties: { ...element.properties, src: "", assetId: "my-photo", treatment: "brand" as const } }
        : element,
    );
    const next = rebuildGeneratedContent(source, {
      title: source.title,
      keyMessage: source.keyMessage,
      purpose: source.purpose,
      contentSummary: "Updated executive story",
      bullets: source.bullets,
      kpis: source.kpis,
      visualType: source.visualType,
      slideIntent: source.slideIntent,
    });
    const image = next.elements.find((element) => element.type === "image" && element.role === "media");
    if (image?.type === "image") {
      expect(image.properties.assetId).toBe("my-photo");
      expect(image.properties.treatment).toBe("brand");
    } else {
      // A data-first destination may not contain a photo slot; the photo should be retained.
      expect(next.elements.some((element) => element.type === "image" && element.properties.assetId === "my-photo")).toBe(true);
    }
  });

  test("layout changes do not duplicate manually added, unroled elements", () => {
    const source = slide();
    source.elements = buildLayout("chart-story", contentFromSlide(source), source.id);
    const manual = { ...source.elements[0]!, id: "manual-note", role: undefined, name: "My custom annotation" };
    source.elements.push(manual);
    const changed = applyLayout(source, "finance-table");
    expect(changed.elements.filter((element) => element.id === "manual-note")).toHaveLength(1);
  });
});
