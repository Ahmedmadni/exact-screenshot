import type { ChartProps, DiagramNode, TableProps } from "./model";

export function tableToText(rows: string[][]): string {
  return rows.map((row) => row.join("\t")).join("\n");
}

export function textToTable(value: string): string[][] {
  const rows = value
    .split(/\r?\n/)
    .map((line) => line.split(/\t|,/).map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
  return rows.length ? rows : [["Column 1", "Column 2"], ["Value", "Value"]];
}

export function chartToText(chart: ChartProps): string {
  const header = ["Category", ...chart.series.map((s) => s.name)];
  const rows = chart.categories.map((category, i) => [
    category,
    ...chart.series.map((s) => String(s.values[i] ?? 0)),
  ]);
  return [header, ...rows].map((row) => row.join("\t")).join("\n");
}

export function textToChart(value: string, fallback: ChartProps): Pick<ChartProps, "categories" | "series"> {
  const rows = textToTable(value);
  if (rows.length < 2 || rows[0]!.length < 2) {
    return { categories: fallback.categories, series: fallback.series };
  }
  const header = rows[0]!;
  const categories = rows.slice(1).map((row) => row[0] || "");
  const series = header.slice(1).map((name, si) => ({
    name: name || `Series ${si + 1}`,
    values: rows.slice(1).map((row) => {
      const parsed = Number(String(row[si + 1] ?? "").replace(/[%,$ ]/g, ""));
      return Number.isFinite(parsed) ? parsed : 0;
    }),
  }));
  return { categories, series };
}

export function diagramToText(nodes: DiagramNode[]): string {
  return nodes.map((node) => `${node.title}\t${node.text}`).join("\n");
}

export function textToDiagram(value: string): DiagramNode[] {
  const rows = textToTable(value);
  return rows.slice(0, 6).map((row, i) => ({
    title: row[0] || `Step ${i + 1}`,
    text: row.slice(1).join(" ") || "",
  }));
}

export function normalizeTableProps(props: TableProps): TableProps {
  return { ...props, rows: props.rows.length ? props.rows : [["Column 1", "Column 2"], ["Value", "Value"]] };
}
