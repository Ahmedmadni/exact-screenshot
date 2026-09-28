import type { AssetRecord, Slide } from "@/lib/types";
import { applyLayout } from "@/lib/editor/layouts";
import { chartEl, instantiate, tableEl } from "@/lib/editor/elements";
import { recommendChartType } from "@/lib/editor/data-utils";
import type { ChartProps } from "@/lib/editor/model";

function numeric(value: string | number) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const clean = value.replace(/[,%$€£¥ر.سSAR\s]/gi, "");
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function chartFromAsset(asset: AssetRecord) {
  const table = asset.dataTables?.find((candidate) => candidate.rows.length >= 2 && candidate.columns.length >= 2);
  if (!table) return null;

  const categories = table.rows.map((row) => String(row[0] ?? "")).filter(Boolean);
  if (categories.length < 2) return null;

  const series = table.columns.slice(1).flatMap((name, index) => {
    const values = table.rows.map((row) => numeric(row[index + 1] as string | number));
    const usable = values.filter((value): value is number => value !== null);
    if (usable.length < Math.max(2, Math.ceil(table.rows.length * 0.5))) return [];
    return [{ name, values: values.map((value) => value ?? 0) }];
  });

  if (!series.length) return null;

  const draft: ChartProps = {
    label: table.name,
    chartType: "column",
    categories,
    series,
    showLegend: series.length > 1,
    showValues: false,
    showGrid: true,
    accent: "theme:accent",
  };
  draft.chartType = recommendChartType(draft);
  return { table, chart: draft };
}

function tableRows(asset: AssetRecord) {
  const table = asset.dataTables?.find((candidate) => candidate.rows.length && candidate.columns.length);
  if (!table) return null;
  return {
    table,
    rows: [
      table.columns,
      ...table.rows.slice(0, 12).map((row) => row.map((cell) => String(cell ?? ""))),
    ],
  };
}

function withoutContentList(slide: Slide) {
  return slide.elements.filter((el) => !["item", "itemTitle"].includes(el.role ?? ""));
}

export function applySourceDataVisuals(slides: Slide[], assets: AssetRecord[]): Slide[] {
  const spreadsheetAssets = assets.filter((asset) => asset.kind === "excel" && asset.extractionStatus === "ready" && asset.dataTables?.length);
  if (!spreadsheetAssets.length) return slides;

  const next = [...slides];
  let used = 0;

  for (const asset of spreadsheetAssets) {
    const index = next.findIndex((slide, i) =>
      i >= used &&
      ["Data Story", "Financial", "Dashboard", "Big Number"].includes(slide.slideIntent) &&
      !slide.elements.some((el) => el.type === "chart" || el.type === "table"),
    );
    if (index < 0) break;

    const original = next[index]!;
    const base = applyLayout(original, "title-content");
    const chartData = chartFromAsset(asset);

    if (chartData) {
      const maxZ = Math.max(-1, ...base.elements.map((el) => el.zIndex));
      const [chart] = instantiate([
        chartEl(`Source chart · ${asset.name}`, [790, 260, 710, 500], chartData.chart),
      ], base.id, maxZ + 1);
      next[index] = {
        ...base,
        visualType: "Chart",
        contentSummary: `Source data from ${asset.name} · ${chartData.table.name}`,
        elements: [...withoutContentList(base), chart!].map((el, zIndex) => ({ ...el, zIndex })),
        updatedAt: new Date().toISOString(),
      };
    } else {
      const data = tableRows(asset);
      if (!data) continue;
      const maxZ = Math.max(-1, ...base.elements.map((el) => el.zIndex));
      const [table] = instantiate([
        tableEl(`Source table · ${asset.name}`, [760, 260, 740, 500], {
          label: data.table.name,
          rows: data.rows,
          headerRow: true,
          bandedRows: true,
          headerFill: "theme:accent",
        }),
      ], base.id, maxZ + 1);
      next[index] = {
        ...base,
        visualType: "Table",
        contentSummary: `Source table from ${asset.name} · ${data.table.name}`,
        elements: [...withoutContentList(base), table!].map((el, zIndex) => ({ ...el, zIndex })),
        updatedAt: new Date().toISOString(),
      };
    }

    used = index + 1;
  }

  return next;
}


function applySourceImages(slides: Slide[], assets: AssetRecord[]): Slide[] {
  const images = assets.filter((asset) => asset.kind === "image" && asset.extractionStatus === "ready" && asset.imageDataUrl);
  if (!images.length) return slides;

  const next = [...slides];
  let cursor = 0;

  for (const asset of images) {
    let index = next.findIndex((slide, i) =>
      i >= cursor &&
      slide.elements.some((el) => el.type === "image" && el.role === "media" && !el.properties.src),
    );

    if (index < 0) {
      index = next.findIndex((slide, i) =>
        i >= cursor &&
        (slide.slideIntent === "Cover" || ["Hero Image", "Image + Text", "Full Bleed Image"].includes(slide.visualType)),
      );
    }
    if (index < 0) break;

    const original = next[index]!;
    let base = original;
    let media = base.elements.find((el) => el.type === "image" && el.role === "media");

    if (!media) {
      const layoutId = original.slideIntent === "Cover" ? "cover-split" : "image-text";
      base = applyLayout(original, layoutId);
      media = base.elements.find((el) => el.type === "image" && el.role === "media");
    }

    if (!media || media.type !== "image") continue;
    next[index] = {
      ...base,
      visualType: original.slideIntent === "Cover" ? "Hero Image" : "Image + Text",
      elements: base.elements.map((el) =>
        el.id === media!.id && el.type === "image"
          ? { ...el, properties: { ...el.properties, src: asset.imageDataUrl! } }
          : el,
      ),
      updatedAt: new Date().toISOString(),
    };
    cursor = index + 1;
  }

  return next;
}

export function applySourceVisuals(slides: Slide[], assets: AssetRecord[]): Slide[] {
  return applySourceImages(applySourceDataVisuals(slides, assets), assets);
}
