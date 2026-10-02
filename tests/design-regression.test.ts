import { describe, expect, test } from "bun:test";
import { applyVaultMedia, externalVisualSearchQuery } from "../src/lib/assets/auto-media";
import { applyLayout, buildLayout, contentFromSlide } from "../src/lib/editor/layouts";
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

  test("layout changes do not duplicate manually added, unroled elements", () => {
    const source = slide();
    source.elements = buildLayout("chart-story", contentFromSlide(source), source.id);
    const manual = { ...source.elements[0]!, id: "manual-note", role: undefined, name: "My custom annotation" };
    source.elements.push(manual);
    const changed = applyLayout(source, "finance-table");
    expect(changed.elements.filter((element) => element.id === "manual-note")).toHaveLength(1);
  });
});
