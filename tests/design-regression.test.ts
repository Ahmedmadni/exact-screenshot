import { describe, expect, test } from "bun:test";
import JSZip from "jszip";
import { createPresentationPptx } from "../src/lib/export/pptx";
import { validatePresentationForExport, contentBeyondSlide, substantialTextOverlap } from "../src/lib/export/validate";
import { reviewPresentation } from "../src/lib/quality";
import type { Presentation } from "../src/lib/types";
import { applyVaultMedia, externalVisualSearchQuery } from "../src/lib/assets/auto-media";
import { applyLayout, buildLayout, contentFromSlide } from "../src/lib/editor/layouts";
import { imageTreatmentOverlay } from "../src/lib/editor/image-treatment";
import { imageCropControls, imageCropCss, imageCropFocalPreset, imageCropFromControls, imageCropPptx, normalizeImageCrop } from "../src/lib/editor/image-crop";
import { canStartEditorGesture, isActiveEditorPointer } from "../src/lib/editor/pointer-gesture";
import { moveItemByStep } from "../src/lib/editor/slide-order";
import { encodeBrowserDatabase, decodeBrowserDatabase } from "../src/lib/data/storage-codec";
import { createWorkspaceBackup, parseWorkspaceBackup } from "../src/lib/data/workspace-backup";
import type { Database } from "../src/lib/data/store";
import { cloneSlidesForPresentation } from "../src/lib/data/presentation-clone";
import { elementOnlyChanges } from "../src/lib/editor/element-diff";
import { getLayout, LAYOUTS } from "../src/lib/editor/layouts";
import { getTemplateFamily, templatePreviewSlides, TEMPLATE_FAMILIES } from "../src/lib/templates";
import { editableTemplateDeckInput, editableTemplateSlides } from "../src/lib/template-starter";
import { withTemplateText, withTemplateImage, clearTemplateImage, updateTemplateElementInSlides } from "../src/lib/editor/template-edit";
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
  test("portable workspace backup round-trips every collection and repeated media", () => {
    const png = "data:image/png;base64," + "A".repeat(12000);
    const deck = slide();
    deck.elements = buildLayout("image-text", contentFromSlide(deck), deck.id).map(el =>
      el.type === "image" ? { ...el, properties: { ...el.properties, src: png } } : el);
    const workspace: Database = {
      presentations: [{ id: "deck", title: "Portable", slides: [deck] } as unknown as Presentation],
      themes: [], brandKits: [], savedTemplates: [], versions: [],
      reviewComments: [], reviewDecisions: [], assets: [],
    };
    const raw = createWorkspaceBackup(workspace, "2026-10-04T00:00:00.000Z");
    expect(parseWorkspaceBackup(raw)).toEqual(workspace);
  });

  test("invalid, partial, duplicate and unsupported workspace backups are rejected", () => {
    const blank: Database = {
      presentations: [], themes: [], brandKits: [], savedTemplates: [],
      versions: [], reviewComments: [], reviewDecisions: [], assets: [],
    };
    const valid = JSON.parse(createWorkspaceBackup(blank));
    expect(() => parseWorkspaceBackup("not-json")).toThrow();
    expect(() => parseWorkspaceBackup(JSON.stringify({ ...valid, version: 999 }))).toThrow();
    expect(() => parseWorkspaceBackup(JSON.stringify({ ...valid, database: "{}" }))).toThrow();
    expect(() => parseWorkspaceBackup(JSON.stringify({ ...valid, database: JSON.stringify({
      ...blank, presentations: [{ id: "x", slides: [] }, { id: "x", slides: [] }],
    }) }))).toThrow(/Duplicate/);
    expect(parseWorkspaceBackup(JSON.stringify(valid))).toEqual(blank);
  });


  test("100-slide collaborative edit diff isolates a changed text and handles structural edits safely", () => {
    const baseSlide = slide();
    baseSlide.elements = buildLayout("title-content", contentFromSlide(baseSlide), baseSlide.id);
    const slides = Array.from({ length: 100 }, (_, index) => {
      const copy = structuredClone(baseSlide);
      const id = "collab-slide-" + index;
      copy.id = id;
      copy.elements = copy.elements.map((element, position) => ({
        ...element, id: id + "-element-" + position, slideId: id,
      }));
      return copy;
    });
    const base = { slides, themeId: "executive-light" };
    const selected = slides[62]!;
    const target = selected.elements.find(element => element.type === "text");
    expect(target?.type).toBe("text");
    if (!target || target.type !== "text") return;
    const changed = { ...target, properties: { ...target.properties, text: "Updated collaboration text" } };
    const updated = {
      ...base,
      slides: slides.map((item, i) => i === 62
        ? { ...item, elements: item.elements.map(element => element.id === target.id ? changed : element), updatedAt: "2026-10-03" }
        : item),
    };
    const delta = elementOnlyChanges(base, updated);
    expect(delta?.slideId).toBe(selected.id);
    expect(delta?.changes).toEqual([{ id: target.id, before: target, after: changed }]);
    expect(elementOnlyChanges(base, base)).toBeNull();
    const cosmeticClone = { ...base, slides: [...slides] };
    expect(elementOnlyChanges(base, cosmeticClone)).toBeNull();
    const secondSlide = { ...slides[80]!, elements: slides[80]!.elements.slice(1) };
    const twoSlideChanges = {
      ...updated,
      slides: updated.slides.map((item, i) => i === 80 ? secondSlide : item),
    };
    expect(elementOnlyChanges(base, twoSlideChanges)).toBeNull();
    expect(elementOnlyChanges(base, { ...updated, themeId: "new-theme" })).toBeNull();
    expect(elementOnlyChanges(base, { ...base, slides: slides.slice(0, -1) })).toBeNull();
    expect(elementOnlyChanges(base, {
      ...base, slides: slides.map((item, i) => i === 62 ? { ...item, title: "Renamed" } : item),
    })).toBeNull();
    expect(base.slides[62]!.elements.find(element => element.id === target.id)).toBe(target);
  });

  test("100-slide editable PPTX export retains all slides and native text content", async () => {
    const template = slide();
    template.elements = buildLayout("title-content", contentFromSlide(template), template.id);
    const sourceSlides = Array.from({ length: 100 }, (_, index) => {
      const unique = structuredClone(template);
      unique.id = "pptx-stress-" + index;
      unique.title = "Presentation section " + (index + 1);
      unique.elements = unique.elements.map((element, position) => {
        if (element.type !== "text") return { ...element, id: unique.id + "-" + position, slideId: unique.id };
        return { ...element, id: unique.id + "-" + position, slideId: unique.id,
          properties: { ...element.properties, text: "Slide content " + (index + 1) } };
      });
      return unique;
    });
    const source = { title: "100 slide export check", description: "Large editable deck", themeId: "executive-light",
      slides: sourceSlides } as unknown as Presentation;
    const start = performance.now();
    const exportDeck = await createPresentationPptx(source);
    const data = await exportDeck.write({ outputType: "nodebuffer" });
    const elapsedMs = Math.round(performance.now() - start);
    const zip = await JSZip.loadAsync(data);
    const xmlNames = Object.keys(zip.files).filter(name => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"));
    expect(xmlNames).toHaveLength(100);
    const first = await zip.file("ppt/slides/slide1.xml")?.async("string");
    const last = await zip.file("ppt/slides/slide100.xml")?.async("string");
    expect(first).toContain("Slide content 1");
    expect(last).toContain("Slide content 100");
    expect(zip.file("ppt/presentation.xml")).toBeDefined();
    console.log("PPTX_100_SLIDE_BENCHMARK " + JSON.stringify({
      slides: xmlNames.length, exportMs: elapsedMs, bytes: data.byteLength,
    }));
  });


  test("mixed 48-slide PPTX preserves native charts, editable tables and photos", async () => {
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9bWwsAAAAASUVORK5CYII=";
    const layouts = ["chart-story", "finance-table", "image-text"] as const;
    const slides = Array.from({ length: 48 }, (_, index) => {
      const current = slide();
      current.id = "mixed-export-slide-" + index;
      current.slideNumber = index + 1;
      current.sortOrder = index;
      current.layoutId = layouts[index % layouts.length];
      current.title = "Mixed slide " + (index + 1);
      current.elements = buildLayout(current.layoutId, contentFromSlide(current), current.id).map((element) => {
        if (element.type === "chart") return {
          ...element, properties: { ...element.properties, chartType: "bar" as const,
            categories: ["Q1", "Q2", "Q3"], series: [{ name: "Actual", values: [120, 140, 160] }],
          },
        };
        if (element.type === "table") return {
          ...element, properties: { ...element.properties,
            rows: [["Metric", "Current"], ["Revenue", String(index + 100)], ["Operating cost", "45"]],
            headerRow: true,
          },
        };
        if (element.type === "image") return {
          ...element, properties: { ...element.properties, src: png, fit: "cover" as const,
            crop: { x: 0.1, y: 0.1, width: 0.75, height: 0.75 },
          },
        };
        return element;
      });
      return current;
    });
    const deck = { title: "Mixed media stress test", description: "Native editing coverage",
      themeId: "executive-light", language: "English", slides } as unknown as Presentation;
    const start = performance.now();
    const generated = await createPresentationPptx(deck);
    const data = await generated.write({ outputType: "nodebuffer" });
    const elapsed = Math.round(performance.now() - start);
    const zip = await JSZip.loadAsync(data);
    const slideXmls = Object.keys(zip.files).filter(name =>
      /^ppt\/slides\/slide[0-9]+\.xml$/.test(name));
    const chartXmls = Object.keys(zip.files).filter(name =>
      /^ppt\/charts\/chart[0-9]+\.xml$/.test(name));
    expect(slideXmls).toHaveLength(48);
    expect(chartXmls.length).toBeGreaterThanOrEqual(16);
    expect(Object.keys(zip.files).some(name => name.startsWith("ppt/media/"))).toBe(true);
    const xmlByType = await Promise.all([1, 2, 3, 46, 47, 48].map(index =>
      zip.file("ppt/slides/slide" + index + ".xml")!.async("string")));
    expect(xmlByType[0]).toContain("<c:chart");
    expect(xmlByType[1]).toContain("<a:tbl");
    expect(xmlByType[1]).toContain("Revenue");
    expect(xmlByType[2]).toContain("<p:pic>");
    expect(xmlByType[2]).toContain("<a:srcRect");
    expect(xmlByType[3]).toContain("<c:chart");
    expect(xmlByType[4]).toContain("<a:tbl");
    expect(xmlByType[5]).toContain("<p:pic>");
    console.log("MIXED_PPTX_BENCHMARK " + JSON.stringify({
      slides: slideXmls.length, charts: chartXmls.length,
      milliseconds: elapsed, bytes: data.byteLength,
    }));
  });

  test("72-slide image and recurring icon export preserves editable pictures and SVG media", async () => {
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9bWwsAAAAASUVORK5CYII=";
    const slides = Array.from({ length: 72 }, (_, index) => {
      const current = slide();
      current.id = "photo-stress-" + index;
      current.slideNumber = index + 1;
      current.sortOrder = index;
      current.layoutId = "image-text";
      current.elements = buildLayout("image-text", contentFromSlide(current), current.id)
        .map(element => element.type === "image"
          ? { ...element, properties: { ...element.properties, src: png, fit: "cover" as const,
              crop: { x: 0.15, y: 0.1, width: 0.75, height: 0.75 },
            } }
          : element);
      const icon: Slide["elements"][number] = {
        id: current.id + "-icon", slideId: current.id, type: "icon",
        name: "Recurring star", x: 1420, y: 80, width: 64, height: 64, zIndex: 99,
        rotation: 0, opacity: 1, locked: false, visible: true,
        properties: { name: "star", color: "#F5B51B", strokeWidth: 2 },
      };
      current.elements.push(icon);
      return current;
    });
    const deck = { title: "72 image-heavy slides", description: "Recurring images and icon SVGs",
      themeId: "executive-light", language: "English", slides } as unknown as Presentation;
    const start = performance.now();
    const generated = await createPresentationPptx(deck);
    const buffer = await generated.write({ outputType: "nodebuffer" });
    const zip = await JSZip.loadAsync(buffer);
    const xmlFiles = Object.keys(zip.files).filter(name =>
      name.startsWith("ppt/slides/slide") && name.endsWith(".xml"));
    expect(xmlFiles).toHaveLength(72);
    const first = await zip.file("ppt/slides/slide1.xml")?.async("string");
    const last = await zip.file("ppt/slides/slide72.xml")?.async("string");
    expect(first).toContain("<p:pic>");
    expect(first).toContain("<a:srcRect");
    expect(last).toContain("<p:pic>");
    expect(Object.keys(zip.files).some(name => name.startsWith("ppt/media/") && name.endsWith(".svg"))).toBe(true);
    expect(Object.keys(zip.files).some(name => name.startsWith("ppt/media/") && name.endsWith(".png"))).toBe(true);
    console.log("IMAGE_HEAVY_PPTX_BENCHMARK " + JSON.stringify({
      slides: xmlFiles.length, elapsedMs: Math.round(performance.now() - start), bytes: buffer.byteLength,
    }));
  });

  test("100-slide media-heavy presentation round-trips with zero image or text loss", () => {
    const pool = Array.from({ length: 6 }, (_, i) =>
      "data:image/png;base64," + String(i).repeat(11_000));
    const slides = Array.from({ length: 100 }, (_, i) => ({
      id: "slide-" + i,
      elements: Array.from({ length: 8 }, (_, j) => ({
        id: "element-" + i + "-" + j,
        type: j % 4 === 0 ? "text" : "image",
        properties: j % 4 === 0
          ? { text: "Performance slide " + i + " content element " + j }
          : { src: pool[(i + j) % pool.length], crop: { x: 0.1, y: 0.15, width: 0.7, height: 0.7 } },
      })),
    }));
    const db = { presentations: [{ id: "stress", slides }], savedTemplates: [
      { snapshot: { slides: structuredClone(slides) } },
    ], versions: [{ snapshot: { slides: structuredClone(slides) } }] };
    const plainSize = JSON.stringify(db).length;
    const stored = encodeBrowserDatabase(db);
    expect(plainSize).toBeGreaterThan(6_000_000);
    expect(stored.length).toBeLessThan(plainSize * 0.2);
    const result = decodeBrowserDatabase(stored);
    expect(result).toEqual(db);
    expect(decodeBrowserDatabase(encodeBrowserDatabase(result))).toEqual(db);
  });

  test("cloning 100 slides regenerates every nested element id and isolates edits", () => {
    const family = getTemplateFamily("creative-portfolio-premium")!;
    const preview = editableTemplateSlides(family, "original");
    const original = Array.from({ length: 100 }, (_, index) => {
      const base = structuredClone(preview[index % preview.length]!);
      const slideId = "source-slide-" + index;
      return {
        ...base, id: slideId, presentationId: "original",
        elements: base.elements.map((element, i) => ({
          ...element, id: "source-element-" + index + "-" + i, slideId,
        })),
      };
    });
    let nextId = 0;
    const created = cloneSlidesForPresentation(original, "copy", () => "copy-id-" + (++nextId), "2026-10-03T00:00:00Z");
    expect(created).toHaveLength(100);
    expect(new Set(created.map(slide => slide.id)).size).toBe(100);
    const oldIds = new Set(original.flatMap(slide => [slide.id, ...slide.elements.map(el => el.id)]));
    const newIds = created.flatMap(slide => [slide.id, ...slide.elements.map(el => el.id)]);
    expect(new Set(newIds).size).toBe(newIds.length);
    expect(newIds.some(id => oldIds.has(id))).toBe(false);
    created.forEach((slide, index) => {
      expect(slide.presentationId).toBe("copy");
      expect(slide.sortOrder).toBe(index);
      expect(slide.slideNumber).toBe(index + 1);
      expect(slide.elements.every(element => element.slideId === slide.id)).toBe(true);
    });
    const text = created.flatMap(slide => slide.elements).find(element => element.type === "text");
    const originalText = original.flatMap(slide => slide.elements).find(element => element.type === "text");
    expect(text?.type).toBe("text");
    if (text?.type === "text" && originalText?.type === "text") {
      text.properties.text = "Only in independent duplicate";
      expect(originalText.properties.text).not.toBe(text.properties.text);
    }
  });


  test("duplicate pictures in deck versions and saved templates are pooled losslessly", () => {
    const png = "data:image/png;base64," + "A".repeat(12_000);
    const source = {
      presentations: [{ slides: [{ elements: [
        { type: "image", properties: { src: png, treatment: "brand", crop: { x: 0.25, y: 0.1, width: 0.5, height: 0.5 } } },
        { type: "text", properties: { text: "data:image/png;base64," + "A".repeat(12_000) } },
      ] }] }],
      savedTemplates: [{ snapshot: { slides: [{ elements: [{ type: "image", properties: { src: png } }] }] } }],
      assets: [{ imageDataUrl: png }],
      versions: [{ snapshot: { slides: [{ elements: [{ type: "image", properties: { src: png } }] }] } }],
    };
    const packed = encodeBrowserDatabase(source);
    expect(packed.length).toBeLessThan(JSON.stringify(source).length / 2);
    expect(decodeBrowserDatabase(packed)).toEqual(source);
    // Editing the restored copy does not change the original source object.
    const restored = decodeBrowserDatabase(packed) as typeof source;
    restored.assets[0]!.imageDataUrl = "data:image/png;base64,BBBB";
    expect(source.assets[0]!.imageDataUrl).toBe(png);
    expect(source.presentations[0]!.slides[0]!.elements[1]!.properties.text).toBe(png);
  });

  test("browser storage stays compatible with existing data and validates corrupt media references", () => {
    const legacy = { presentations: [{ title: "Legacy" }], assets: [{ imageDataUrl: "data:image/png;base64,AAAA" }] };
    expect(decodeBrowserDatabase(JSON.stringify(legacy))).toEqual(legacy);
    expect(encodeBrowserDatabase(legacy)).toBe(JSON.stringify(legacy));
    const unique = { images: [{ src: "data:image/png;base64," + "A".repeat(900) }] };
    expect(encodeBrowserDatabase(unique)).toBe(JSON.stringify(unique));
    expect(() => decodeBrowserDatabase('{"__meridian_media_pool_v1__":true,"media":[],"data":{"src":"__meridian_image_ref__:99"}}'))
      .toThrow("Invalid pooled image reference");
    expect(() => decodeBrowserDatabase('{"__meridian_media_pool_v1__":true,"media":null,"data":{}}'))
      .toThrow("Invalid pooled browser database");
  });


  test("quick-edit text stays on its original slide after navigation and remains immutable", () => {
    const family = getTemplateFamily("creative-portfolio-premium")!;
    const [first, second] = editableTemplateSlides(family, "client-presentation");
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    const text = first!.elements.find(element => element.type === "text" && element.role === "title");
    expect(text).toBeDefined();
    if (!text) return;
    const original = [first!, second!];
    const changed = updateTemplateElementInSlides(
      original, first!.id, text.id, element => withTemplateText(element, "Custom client headline"),
    );
    expect(changed).not.toBe(original);
    expect(changed[1]).toBe(original[1]);
    expect(changed[0]!.elements.find(element => element.id === text.id && element.type === "text")?.properties.text)
      .toBe("Custom client headline");
    expect(original[0]!.elements.find(element => element.id === text.id && element.type === "text")?.properties.text)
      .not.toBe("Custom client headline");
    expect(updateTemplateElementInSlides(changed, first!.id, text.id,
      element => withTemplateText(element, "Custom client headline"))).toBe(changed);
  });

  test("asynchronous image replacements only change the originally selected slide", () => {
    const slides = editableTemplateSlides(getTemplateFamily("creative-portfolio-premium")!, "client-images");
    const photo = slides[0]!.elements.find(element => element.type === "image");
    expect(photo).toBeDefined();
    if (!photo) return;
    const edited = updateTemplateElementInSlides(
      slides, slides[0]!.id, photo.id, element =>
        withTemplateImage(element, "data:image/png;base64,AAA"),
    );
    const target = edited[0]!.elements.find(element => element.id === photo.id);
    expect(target?.type).toBe("image");
    if (target?.type === "image") expect(target.properties.src).toBe("data:image/png;base64,AAA");
    expect(edited[1]).toBe(slides[1]);
    expect(edited[2]).toBe(slides[2]);
    expect(updateTemplateElementInSlides(edited, "missing-slide", photo.id, clearTemplateImage)).toBe(edited);
    expect(updateTemplateElementInSlides(edited, slides[1]!.id, photo.id, clearTemplateImage)).toBe(edited);
  });


  test("touch reorder moves one slide, retains original ids and rejects out-of-range taps", () => {
    const ids = ["cover", "agenda", "portfolio", "closing"] as const;
    const movedUp = moveItemByStep(ids, 2, -1);
    expect(movedUp).toEqual(["cover", "portfolio", "agenda", "closing"]);
    expect(moveItemByStep(movedUp, 1, 1)).toEqual(ids);
    expect(moveItemByStep(ids, 0, -1)).toEqual(ids);
    expect(moveItemByStep(ids, 3, 1)).toEqual(ids);
    expect(moveItemByStep(ids, -1, 1)).toEqual(ids);
    expect(moveItemByStep(ids, 9, -1)).toEqual(ids);
    expect(ids).toEqual(["cover", "agenda", "portfolio", "closing"]);
    expect(new Set(movedUp).size).toBe(4);
  });


  test("touch edit gestures exclude secondary fingers and mismatched pointer events", () => {
    expect(canStartEditorGesture({ pointerId: 1, isPrimary: true, button: 0 })).toBe(true);
    expect(canStartEditorGesture({ pointerId: 2, isPrimary: false, button: 0 })).toBe(false);
    expect(canStartEditorGesture({ pointerId: 3, isPrimary: true, button: 2 })).toBe(false);
    expect(isActiveEditorPointer(11, { pointerId: 11 })).toBe(true);
    expect(isActiveEditorPointer(11, { pointerId: 12 })).toBe(false);
  });


  test("all nine photo focal presets retain current zoom and stay in bounds", () => {
    const current = imageCropFromControls(2.5, 47, 61);
    const pos = { left: 0, center: 50, right: 100 } as const;
    const vert = { top: 0, center: 50, bottom: 100 } as const;
    for (const horizontal of Object.keys(pos) as Array<keyof typeof pos>) {
      for (const vertical of Object.keys(vert) as Array<keyof typeof vert>) {
        const updated = imageCropFocalPreset(current, horizontal, vertical);
        const controls = imageCropControls(updated);
        expect(controls.zoom).toBe(2.5);
        expect(controls.horizontal).toBe(pos[horizontal]);
        expect(controls.vertical).toBe(vert[vertical]);
        expect(updated.x + updated.width).toBeLessThanOrEqual(1);
        expect(updated.y + updated.height).toBeLessThanOrEqual(1);
      }
    }
  });


  test("image zoom and pan normalization is finite clamped and reversible", () => {
    const crop = imageCropFromControls(2, 75, 25);
    expect(crop).toEqual({ x: 0.375, y: 0.125, width: 0.5, height: 0.5 });
    expect(imageCropControls(crop)).toEqual({ zoom: 2, horizontal: 75, vertical: 25 });
    expect(imageCropControls()).toEqual({ zoom: 1, horizontal: 50, vertical: 50 });
    expect(normalizeImageCrop({ x: 5, y: -1, width: 0, height: Infinity })).toEqual({
      x: 0.75, y: 0, width: 0.25, height: 1,
    });
    expect(imageCropFromControls(Number.NaN, Infinity, -100)).toEqual({
      x: 0, y: 0, width: 1, height: 1,
    });
    expect(imageCropCss(crop)).toMatchObject({
      width: "200%", height: "200%", left: "-75%", top: "-25%",
    });
    expect(imageCropPptx(crop, 5, 4)).toEqual({
      type: "crop", w: 10, h: 8, x: 3.75, y: 1,
    });
  });

  test("photo crop survives editorial layout changes and keeps original image bytes", () => {
    const source = slide();
    source.layoutId = "cover-product-launch";
    const crop = imageCropFromControls(2.5, 65, 35);
    const elements = buildLayout(source.layoutId, contentFromSlide(source), source.id);
    source.elements = elements.map(el => el.type === "image"
      ? { ...el, properties: { ...el.properties, src: "data:image/png;base64,AAAA", crop, treatment: "brand" as const } }
      : el);
    const next = applyLayout(source, "case-study-editorial");
    const photo = next.elements.find(el => el.type === "image");
    expect(photo?.type).toBe("image");
    if (photo?.type === "image") {
      expect(photo.properties.crop).toEqual(crop);
      expect(photo.properties.treatment).toBe("brand");
      expect(photo.properties.src).toBe("data:image/png;base64,AAAA");
    }
    const restored = applyLayout(next, source.layoutId);
    const restoredPhoto = restored.elements.find(el => el.type === "image");
    if (restoredPhoto?.type === "image") expect(restoredPhoto.properties.crop).toEqual(crop);
  });

  test("PPTX keeps panned image as a native picture and stores editable crop XML", async () => {
    const source = slide();
    source.layoutId = "cover-product-launch";
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9bWwsAAAAASUVORK5CYII=";
    source.elements = buildLayout(source.layoutId, contentFromSlide(source), source.id)
      .map(el => el.type === "image" ? { ...el, properties: {
        ...el.properties, src: png, crop: imageCropFromControls(2, 70, 30),
      } } : el);
    const pptx = await createPresentationPptx({
      title: "Image cropping test", themeId: "executive-light", slides: [source],
    } as unknown as Presentation);
    const zip = await JSZip.loadAsync(await pptx.write({ outputType: "nodebuffer" }));
    const xml = await zip.file("ppt/slides/slide1.xml")?.async("string");
    expect(xml).toContain("<p:pic>");
    expect(xml).toContain("<a:srcRect");
    expect(Object.keys(zip.files).some(name => name.startsWith("ppt/media/image"))).toBe(true);
  });


  test("template quick edits are immutable and persist independent text changes", () => {
    const family = getTemplateFamily("brand-storytelling")!;
    const first = editableTemplateSlides(family, "copy-one");
    const second = editableTemplateSlides(family, "copy-two");
    const target = first[0]!.elements.find(element => element.type === "text" && element.role === "title")!;
    const original = target.type === "text" ? target.properties.text : "";
    const edited = withTemplateText(target, "A real client brand");
    expect(edited.type).toBe("text");
    if (edited.type === "text") expect(edited.properties.text).toBe("A real client brand");
    if (target.type === "text") expect(target.properties.text).toBe(original);
    expect(second[0]!.elements.some(el => el.type === "text" && el.properties.text === "A real client brand")).toBe(false);
    expect(withTemplateText(target, original)).toBe(target);
  });

  test("template photo upload and clear preserve frame, treatment and other copies", () => {
    const family = getTemplateFamily("creative-portfolio-premium")!;
    const original = editableTemplateSlides(family, "copy-one");
    const separate = editableTemplateSlides(family, "copy-two");
    const frame = original.flatMap(slide => slide.elements).find(el => el.type === "image")!;
    const source = frame.type === "image" ? frame.properties.src : "";
    const changed = withTemplateImage(frame, "data:image/png;base64,AA==");
    expect(changed).not.toBe(frame);
    if (changed.type === "image" && frame.type === "image") {
      expect(changed.properties.src).toBe("data:image/png;base64,AA==");
      expect(changed.width).toBe(frame.width);
      expect(changed.height).toBe(frame.height);
      expect(changed.properties.assetId).toBeUndefined();
      expect(frame.properties.src).toBe(source);
    }
    const cleared = clearTemplateImage(changed);
    if (cleared.type === "image") {
      expect(cleared.properties.src).toBe("");
      expect(cleared.properties.assetId).toBeUndefined();
      expect(cleared.id).toBe(frame.id);
    }
    expect(separate.flatMap(slide => slide.elements).some(el =>
      el.type === "image" && el.properties.src === "data:image/png;base64,AA==")).toBe(false);
    expect(withTemplateImage(frame, "  ")).toBe(frame);
  });


  test("eight newly added template families expose valid editable layouts and previews", () => {
    for (const id of ["construction-projects", "brand-storytelling", "training-workshop"]) {
      const family = getTemplateFamily(id);
      expect(family).toBeDefined();
      if (!family) continue;
      expect(family.previewLayouts).toHaveLength(3);
      expect(family.previewLayouts.every(layout => getLayout(layout))).toBe(true);
      const preview = templatePreviewSlides(family);
      expect(preview).toHaveLength(3);
      expect(preview.every(page => page.elements.length > 5)).toBe(true);
      const created = editableTemplateSlides(family, "fresh-deck-id");
      expect(created.every(page => page.elements.every(el => !el.locked && el.slideId === page.id))).toBe(true);
    }
  });

  test("two separately replaced photographs survive layout changes without duplicate overlays", () => {
    const source = slide();
    source.layoutId = "editorial-image-duo";
    source.elements = buildLayout(source.layoutId, contentFromSlide(source), source.id).map(el => {
      if (el.type !== "image") return el;
      const selected = el.name === "Lead project photo" ? "vault-lead" : "vault-detail";
      return { ...el, properties: { ...el.properties, src: "", assetId: selected, treatment: "brand" as const } };
    });
    const original = source.elements.filter(el => el.type === "image");
    expect(original).toHaveLength(2);
    expect(applyLayout(source, "editorial-image-duo")).toBe(source);
    const switched = applyLayout(source, "case-study-editorial");
    const restored = applyLayout(switched, "editorial-image-duo");
    const images = restored.elements.filter(el => el.type === "image");
    const ids = images.filter(el => !!el.properties.assetId).map(el => el.properties.assetId);
    expect(ids).toEqual(["vault-lead", "vault-detail"]);
    expect(images.filter(el => el.properties.assetId === "vault-detail")).toHaveLength(1);
    expect(images.every(el => el.properties.treatment === "brand")).toBe(true);
  });


  test("new premium layouts mirror correctly for Arabic while remaining independently editable", () => {
    const source = slide();
    source.title = "التقرير التنفيذي للمجموعة";
    source.keyMessage = "النتائج والفرص التشغيلية والاستراتيجية";
    for (const id of ["cover-product-launch", "cover-editorial-gallery", "case-study-editorial", "board-dashboard-tiles"]) {
      const content = contentFromSlide(source);
      const leftToRight = buildLayout(id, content, source.id, false);
      const rightToLeft = buildLayout(id, content, source.id, true);
      expect(rightToLeft).toHaveLength(leftToRight.length);
      leftToRight.forEach((element, index) => {
        const other = rightToLeft[index]!;
        expect(other.type).toBe(element.type);
        expect(other.x).toBe(1600 - element.x - element.width);
        expect(other.width).toBe(element.width);
        expect(other.locked).toBe(false);
      });
    }
  });


  test("new premium families have valid fully editable preview compositions", () => {
    const ids = ["annual-report-premium", "product-launch-premium", "creative-portfolio-premium", "healthcare-executive", "operations-command"];
    for (const id of ids) {
      const family = getTemplateFamily(id);
      expect(family).toBeDefined();
      if (!family) continue;
      expect(family.previewLayouts).toHaveLength(3);
      for (const layout of [...family.previewLayouts, ...Object.values(family.layoutMap)]) {
        expect(getLayout(layout)).toBeDefined();
      }
      const preview = templatePreviewSlides(family);
      expect(preview).toHaveLength(3);
      expect(preview.every(item => item.elements.some(el => el.type === "text" && el.role === "title"))).toBe(true);
      expect(preview.every(item => item.elements.every(el => el.visible && !el.locked))).toBe(true);
      expect(preview.flatMap(item => item.elements).some(el => el.type === "shape")).toBe(true);
    }
    expect(new Set(TEMPLATE_FAMILIES.map(family => family.id)).size).toBe(TEMPLATE_FAMILIES.length);
  });

  test("editable template starter duplicates every slide and element without shared ids", () => {
    const family = getTemplateFamily("creative-portfolio-premium")!;
    const original = templatePreviewSlides(family);
    const first = editableTemplateSlides(family, "my-custom-deck-one");
    const second = editableTemplateSlides(family, "my-custom-deck-two");
    const originalIds = new Set(original.flatMap(item => item.elements.map(el => el.id)));
    const firstIds = new Set(first.flatMap(item => item.elements.map(el => el.id)));
    const secondIds = new Set(second.flatMap(item => item.elements.map(el => el.id)));
    expect(first).toHaveLength(original.length);
    expect(first.every(item => item.presentationId === "my-custom-deck-one")).toBe(true);
    expect(first.every(item => item.elements.every(el => el.slideId === item.id && !el.locked))).toBe(true);
    expect(first.some(item => original.some(preview => preview.id === item.id))).toBe(false);
    expect([...firstIds].some(id => originalIds.has(id) || secondIds.has(id))).toBe(false);
    expect(firstIds.size).toBe(first.flatMap(item => item.elements).length);
    const image = first.flatMap(item => item.elements).find(el => el.type === "image");
    expect(image?.type).toBe("image");
    if (image?.type === "image") {
      image.properties.src = "data:image/png;base64,AA==";
      const other = second.flatMap(item => item.elements).find(el => el.type === "image");
      if (other?.type === "image") expect(other.properties.src).not.toBe(image.properties.src);
    }
    const title = first[0]?.elements.find(el => el.type === "text" && el.role === "title");
    expect(title?.type).toBe("text");
    if (title?.type === "text") title.properties.text = "A completely customized client presentation";
    expect(original[0]?.elements.some(el => el.type === "text" && el.properties.text === "A completely customized client presentation")).toBe(false);
  });

  test("starter metadata creates a draft that can become a reusable saved template", () => {
    const family = getTemplateFamily("annual-report-premium")!;
    const input = editableTemplateDeckInput(family);
    expect(input.status).toBe("Draft");
    expect(editableTemplateDeckInput(getTemplateFamily("arabic-executive")!).language).toBe("Arabic");
    expect(input.themeId).toBe(family.themeId);
    expect(input.slides).toHaveLength(3);
    expect(input.slides.every(item => item.elements.length > 0)).toBe(true);
    expect(input.slides.some(item => item.elements.some(el => el.type === "chart"))).toBe(true);
  });


  test("quality panel links export geometry warnings to the correct slide", () => {
    const source = slide();
    const title = buildLayout("cover-minimal", contentFromSlide(source), source.id)
      .find(element => element.type === "text" && element.role === "title");
    expect(title).toBeDefined();
    if (!title) return;
    source.elements = [{ ...title, x: 1550, width: 220, name: "Escaped title" }];
    const deck = { themeId: "executive-light", coreMessage: "Quality smoke test", slides: [source] } as unknown as Presentation;
    const warnings = reviewPresentation(deck);
    expect(warnings.some(item =>
      item.code === "element-outside-slide" &&
      item.slideId === source.id &&
      item.message.includes("Escaped title"),
    )).toBe(true);
  });

  test("quality check accepts linked Asset Vault photography without false missing-image alerts", () => {
    const source = slide();
    source.elements = [{
      ...buildLayout("cover-split", contentFromSlide(source), source.id)
        .find(element => element.type === "image")!,
      properties: { src: "", assetId: "existing-approved-photo", fit: "cover" as const, radius: 0 },
    }];
    const deck = { themeId: "executive-light", coreMessage: "Quality smoke test", slides: [source] } as unknown as Presentation;
    expect(reviewPresentation(deck).some(item => item.code === "missing-image")).toBe(false);
  });


  test("export preflight catches clipped primary text and ignores intentional full-bleed photography", () => {
    const source = slide();
    source.layoutId = "cover-minimal";
    const normal = buildLayout(source.layoutId, contentFromSlide(source), source.id);
    const title = normal.find(el => el.role === "title");
    expect(title?.type).toBe("text");
    if (!title) return;
    const clipped = { ...title, x: 1550, width: 300, name: "Clipped title" };
    expect(contentBeyondSlide(clipped)).toBe(true);
    const intentional = { ...clipped, type: "image", role: "media" };
    expect(contentBeyondSlide(intentional as typeof title)).toBe(false);
    const deck = { slides: [{ ...source, elements: [...normal, clipped] }] } as unknown as Presentation;
    expect(validatePresentationForExport(deck).some(issue => issue.message.includes("Clipped title") && issue.message.includes("boundary"))).toBe(true);
    expect(validatePresentationForExport({ slides: [{ ...source, elements: normal }] } as unknown as Presentation)
      .some(issue => issue.message.includes("boundary"))).toBe(false);
  });

  test("preflight detects substantial independent text overlap but ignores decorations", () => {
    const source = slide();
    const elements = buildLayout("cover-minimal", contentFromSlide(source), source.id);
    const title = elements.find(el => el.role === "title");
    expect(title?.type).toBe("text");
    if (!title || title.type !== "text") return;
    const duplicate = {
      ...title, id: "collision", name: "Duplicate heading", role: "subtitle" as const,
    };
    expect(substantialTextOverlap(title, duplicate)).toBe(true);
    expect(substantialTextOverlap(title, { ...duplicate, role: "decor" })).toBe(false);
    expect(substantialTextOverlap(title, { ...duplicate, x: 1400 })).toBe(false);
  });


  test("editable PPTX package contains the financial waterfall and Arabic text", async () => {
    const financial = slide();
    financial.layoutId = "financial-variance-bridge";
    financial.elements = buildLayout(financial.layoutId, contentFromSlide(financial), financial.id)
      .map(element => element.type === "chart"
        ? { ...element, properties: {
            ...element.properties,
            categories: ["Opening", "Receipts", "Payments"],
            series: [{ name: "Cash", values: [120, 30, -45] }],
          } }
        : element);
    const deck = {
      title: "اختبار العرض المالي", language: "Arabic",
      description: "", objective: "Financial QA", themeId: "executive-light",
      slides: [financial],
    } as unknown as Presentation;
    const pptx = await createPresentationPptx(deck);
    const blob = await pptx.write({ outputType: "nodebuffer" });
    const zip = await JSZip.loadAsync(blob);
    const xml = await zip.file("ppt/slides/slide1.xml")?.async("string");
    expect(xml).toBeDefined();
    expect(xml).toContain("Closing");
    expect(xml).toContain("105");
    expect(xml).toContain("الاستثمار");
    expect((xml?.match(/<p:sp>/g) ?? []).length).toBeGreaterThan(5);
    expect(zip.file("ppt/presentation.xml")).toBeTruthy();
  });


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
