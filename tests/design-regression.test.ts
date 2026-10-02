import { describe, expect, test } from "bun:test";
import { applyVaultMedia, externalVisualSearchQuery } from "../src/lib/assets/auto-media";
import { applyLayout, buildLayout, contentFromSlide } from "../src/lib/editor/layouts";
import { imageTreatmentOverlay } from "../src/lib/editor/image-treatment";
import { getLayout, LAYOUTS } from "../src/lib/editor/layouts";
import { getTemplateFamily, templatePreviewSlides } from "../src/lib/templates";
import { rebuildGeneratedContent } from "../src/lib/editor/composer";
import { buildWaterfall } from "../src/lib/editor/waterfall";
import { analyzeBudgetVariance, analyzeChartBudget, renderedFinancialElements, varianceSummary } from "../src/lib/editor/variance";
import { importedRowsToChart, importedRowsToTable, mapFinancialColumns, normalizeImportedRows, parseDelimited, parseFinancialNumber } from "../src/lib/editor/financial-import";
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
  test("Arabic and Persian financial number formats preserve signed amounts", () => {
    expect(parseFinancialNumber("١٬٢٣٤٫٥٠")).toBe(1234.5);
    expect(parseFinancialNumber("۱۲٬۳۴۵٫۶۷")).toBe(12345.67);
    expect(parseFinancialNumber("(٢٬٥٠٠٫٧٥)")).toBe(-2500.75);
    expect(parseFinancialNumber("-٣٥٠")).toBe(-350);
    expect(parseFinancialNumber("1,234.50")).toBe(1234.5);
    expect(parseFinancialNumber("١٢٫٥٪")).toBeNull();
    expect(parseFinancialNumber("1,23")).toBeNull();
    expect(parseFinancialNumber("1.234,56")).toBeNull();
    expect(parseFinancialNumber("1,00,000")).toBeNull();
    expect(parseFinancialNumber("١٢٣٤غيررقمي")).toBeNull();
    const imported = importedRowsToChart([
      ["الفترة", "الفعلي", "الموازنة"],
      ["يناير", "١٬٢٠٠", "١٬١٠٠"],
      ["فبراير", "(٣٥٠)", "٤٠٠"],
    ]);
    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.value.series[0]?.values).toEqual([1200, -350]);
      expect(imported.value.series[1]?.values).toEqual([1100, 400]);
    }
  });


  test("column mapping selects the correct worksheet metrics without changing source cells", () => {
    const source = [
      ["Notes", "Budget", "Period", "Actual", "Ignored"],
      ["North", "1,500", "Q1", "1,260", "misc"],
      ["South", "1,700", "Q2", "(280)", "misc"],
    ];
    const result = mapFinancialColumns(source, 2, [3, 1]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.categories).toEqual(["Q1", "Q2"]);
      expect(result.value.series.map(s => s.name)).toEqual(["Actual", "Budget"]);
      expect(result.value.series[0]?.values).toEqual([1260, -280]);
      expect(result.value.series[1]?.values).toEqual([1500, 1700]);
    }
    expect(source[2]![3]).toBe("(280)");
  });

  test("column selection blocks duplicate, missing and nonnumeric sources", () => {
    const rows = [
      ["Period", "Actual", "Budget", "Comment"],
      ["Jan", "110", "100", "draft"],
    ];
    expect(mapFinancialColumns(rows, 0, []).ok).toBe(false);
    expect(mapFinancialColumns(rows, 0, [0]).ok).toBe(false);
    expect(mapFinancialColumns(rows, 0, [5]).ok).toBe(false);
    expect(mapFinancialColumns(rows, 0, [1, 1]).ok).toBe(false);
    expect(mapFinancialColumns(rows, 0, [3]).ok).toBe(false);
    const valid = mapFinancialColumns(rows, 0, [1, 2]);
    expect(valid.ok).toBe(true);
  });


  test("CSV parser retains embedded delimiters, quoted newlines and escaped quotes", () => {
    const rows = parseDelimited('"Period","Actual","Budget"\r\n"Q1, North","1,250","1,500"\r\n"Q2 ""renewal""","240","260"');
    expect(rows).toEqual([
      ["Period", "Actual", "Budget"],
      ["Q1, North", "1,250", "1,500"],
      ['Q2 "renewal"', "240", "260"],
    ]);
    expect(parseDelimited("Period\tActual\tBudget\nQ1\t10\t12", "\t")[1]).toEqual(["Q1", "10", "12"]);
    expect(() => parseDelimited('A,B\n"unclosed,10')).toThrow("Unclosed");
  });

  test("strict financial import parses accounting negatives and thousand separators", () => {
    const result = importedRowsToChart([
      ["Period", "Actual", "Budget"],
      ["Q1", "1,200.50", "1000"],
      ["Q2", "(350)", "-200"],
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.categories).toEqual(["Q1", "Q2"]);
      expect(result.value.series[0]?.values).toEqual([1200.5, -350]);
      expect(result.value.series[1]?.values).toEqual([1000, -200]);
      expect(analyzeChartBudget({
        label: "", chartType: "column", categories: result.value.categories,
        series: result.value.series, showLegend: true, showValues: true,
        showGrid: true, accent: "theme:accent",
      }).valid).toBe(true);
    }
  });

  test("malformed financial imports cannot silently generate zero metrics", () => {
    const bad = [
      [["Period", "Actual", "Budget"], ["Jan", "", "100"]],
      [["Period", "Actual"], ["Jan", "20%"]],
      [["Period", "Actual"], ["Jan", "oops"]],
      [["Period", "Actual"], ["Jan", "10"], ["Jan", "15"]],
      [["Period", "Actual"], ["Jan", "NaN"]],
      [["Period", "Actual"], ["Jan", "Infinity"]],
      [["Period", "Actual"], ["Jan", "3"], ["Feb", "1e999"]],
    ];
    for (const rows of bad) expect(importedRowsToChart(rows).ok).toBe(false);
    expect(importedRowsToChart([["Period", "Actual"], ["Jan", 25]])).toMatchObject({ ok: true });
    expect(importedRowsToChart([["Period", "Actual"]]).ok).toBe(false);
  });

  test("table import preserves words, Arabic, and empty middle cells", () => {
    const result = importedRowsToTable([["البند", "فعلي", "موازنة"], ["الإيرادات", "1,200", ""], ["المصروفات", "(400)", "450"]]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[1]).toEqual(["الإيرادات", "1,200", ""]);
      expect(result.value[2]).toEqual(["المصروفات", "(400)", "450"]);
    }
    expect(normalizeImportedRows([]).ok).toBe(false);
    expect(normalizeImportedRows(Array.from({ length: 502 }, (_, i) => ["period" + i])).ok).toBe(false);
  });


  test("budget variance computes revenue totals and period-level percentages", () => {
    const result = analyzeBudgetVariance(["Q1", "Q2"], [115, 85], [100, 100]);
    expect(result.valid).toBe(true);
    expect(result.actualTotal).toBe(200);
    expect(result.budgetTotal).toBe(200);
    expect(result.difference).toBe(0);
    expect(result.status).toBe("on-target");
    expect(result.rows[0]?.difference).toBe(15);
    expect(result.rows[0]?.percent).toBe(15);
    expect(result.rows[1]?.status).toBe("unfavorable");
  });

  test("expense variance reverses favorability without altering numerical difference", () => {
    const income = analyzeBudgetVariance(["Q1"], [90], [100]);
    const expense = analyzeBudgetVariance(["Q1"], [90], [100], "lower-is-better");
    expect(income.status).toBe("unfavorable");
    expect(expense.status).toBe("favorable");
    expect(expense.difference).toBe(-10);
    expect(expense.percent).toBe(-10);
  });

  test("zero budget and negative budget avoid division by zero", () => {
    const noBudget = analyzeBudgetVariance(["Month"], [25], [0]);
    expect(noBudget.valid).toBe(true);
    expect(noBudget.percent).toBeNull();
    expect(noBudget.rows[0]?.percent).toBeNull();
    expect(varianceSummary(noBudget)).toContain("N/A");
    const negative = analyzeBudgetVariance(["Month"], [-120], [-100], "lower-is-better");
    expect(negative.percent).toBe(-20);
    expect(negative.status).toBe("favorable");
  });

  test("placeholder and malformed comparisons never produce fabricated insights", () => {
    expect(analyzeBudgetVariance(["Jan"], [0], [0]).valid).toBe(false);
    expect(analyzeBudgetVariance(["Jan", "Feb"], [1], [2, 3]).valid).toBe(false);
    expect(analyzeBudgetVariance(["Jan"], [Number.NaN], [2]).valid).toBe(false);
  });

  test("live financial insight follows edited chart and leaves source slide untouched", () => {
    const source = slide();
    source.layoutId = "financial-actual-budget";
    source.elements = buildLayout(source.layoutId, contentFromSlide(source), source.id).map(el =>
      el.type === "chart" ? { ...el, properties: {
        ...el.properties,
        series: [
          { name: "Actual", values: [120, 120, 120, 120] },
          { name: "Budget", values: [100, 100, 100, 100] },
        ],
      } } : el,
    );
    const original = source.elements.find(el => el.name === "Auto variance insight");
    const rendered = renderedFinancialElements(source);
    const updated = rendered.find(el => el.name === "Auto variance insight");
    expect(updated?.type).toBe("text");
    if (updated?.type === "text") expect(updated.properties.text).toContain("+80");
    expect(original).not.toBe(updated);
    if (original?.type === "text") expect(original.properties.text).not.toContain("+80");
    const chart = source.elements.find(el => el.type === "chart");
    if (chart?.type === "chart") expect(analyzeChartBudget(chart.properties).status).toBe("favorable");
  });


  test("signed waterfall reconciles positive and negative movements", () => {
    const result = buildWaterfall(
      ["Opening", "Collections", "Payments", "Financing"],
      [100, 45, -68, -12],
    );
    expect(result.valid).toBe(true);
    expect(result.closing).toBe(65);
    expect(result.steps.map(step => step.end)).toEqual([100, 145, 77, 65, 65]);
    expect(result.steps.map(step => step.kind)).toEqual([
      "opening", "increase", "decrease", "decrease", "closing",
    ]);
  });

  test("waterfall handles negative running balances and rejects incomplete input", () => {
    const model = buildWaterfall(["Opening", "Payment"], [20, -65]);
    expect(model.valid).toBe(true);
    expect(model.closing).toBe(-45);
    expect(model.min).toBeLessThan(-45);
    expect(model.max).toBeGreaterThan(20);
    expect(buildWaterfall(["Opening", "Change"], [20]).valid).toBe(false);
    expect(buildWaterfall(["Opening", "Change"], [20, Number.NaN]).valid).toBe(false);
    expect(buildWaterfall([], []).valid).toBe(false);
  });

  test("variance bridge layout is data-bound rather than static decorative bars", () => {
    const source = slide();
    const components = buildLayout("financial-variance-bridge", contentFromSlide(source), source.id);
    const waterfall = components.find(el => el.type === "chart" && el.role === "media");
    expect(waterfall?.type).toBe("chart");
    if (waterfall?.type === "chart") {
      expect(waterfall.properties.chartType).toBe("waterfall");
      expect(waterfall.properties.series[0]?.values).toEqual([0, 0, 0]);
      expect(buildWaterfall(waterfall.properties.categories, waterfall.properties.series[0]!.values).closing).toBe(0);
    }
    expect(components.filter(el => el.name.startsWith("Bridge measure"))).toHaveLength(0);
  });


  test("financial layouts keep all content editable and avoid invented financial values", () => {
    const layouts = ["financial-actual-budget", "financial-variance-bridge", "financial-cash-flow"];
    for (const id of layouts) {
      expect(getLayout(id)?.intents).toContain("Financial");
      const elements = buildLayout(id, contentFromSlide(slide()), slide().id);
      expect(elements.some(e => e.type === "text" && e.role === "title")).toBe(true);
      expect(elements.some(e => e.type === "text" && e.role === "subtitle")).toBe(true);
      expect(elements.every(e => e.type !== "image")).toBe(true);
    }
    const budget = buildLayout("financial-actual-budget", contentFromSlide(slide()), slide().id);
    const editable = budget.find(e => e.type === "chart");
    expect(editable?.type).toBe("chart");
    if (editable?.type === "chart") {
      expect(editable.properties.series.map(s => s.name)).toEqual(["Actual", "Budget"]);
      expect(editable.properties.series.every(s => s.values.every(v => v === 0))).toBe(true);
    }
  });

  test("edited actual-versus-budget chart survives Magic Design", () => {
    const source = slide();
    source.elements = buildLayout("financial-actual-budget", contentFromSlide(source), source.id)
      .map(e => e.type === "chart"
        ? { ...e, properties: { ...e.properties, series: [
            { name: "Actual", values: [101, 118, 127, 145] },
            { name: "Budget", values: [110, 120, 135, 140] },
          ] } }
        : e);
    const after = applyLayout(applyLayout(source, "financial-cash-flow"), "financial-actual-budget");
    const charts = after.elements.filter(e => e.type === "chart");
    expect(charts).toHaveLength(1);
    if (charts[0]?.type === "chart") expect(charts[0].properties.series[0]?.values).toEqual([101, 118, 127, 145]);
  });

  test("finance template previews use their new distinct financial layouts", () => {
    for (const id of ["financial-review", "cfo-performance", "feasibility-study", "capital-markets"]) {
      const family = getTemplateFamily(id);
      expect(family).toBeDefined();
      if (!family) continue;
      expect(family.previewLayouts.some(name => name.startsWith("financial-"))).toBe(true);
      const previews = templatePreviewSlides(family);
      expect(previews).toHaveLength(3);
      expect(previews[1]?.layoutId).toBe(family.previewLayouts[1]);
    }
  });


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
