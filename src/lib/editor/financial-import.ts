import type { ChartProps } from "./model";

/** A validated tabular import; malformed numeric cells are never replaced by zero. */
export type ImportResult<T> =
  | { ok: true; value: T; rows: number }
  | { ok: false; error: string };

export interface ImportedChart {
  categories: string[];
  series: ChartProps["series"];
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 501; // includes heading
const MAX_COLUMNS = 16;

const cell = (v: unknown): string => v == null ? "" : String(v).trim();

/** RFC-style CSV/TSV quoted-field handling, including multiline cells and escaped quotes. */
export function parseDelimited(text: string, separator: "," | "\t" = ","): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let quoted = false;
  let started = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else if (!started) quoted = true;
      else if (quoted) quoted = false;
      else field += ch;
    } else if (ch === separator && !quoted) {
      current.push(field);
      field = "";
      started = false;
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      current.push(field);
      if (current.some(c => c.trim())) rows.push(current);
      current = [];
      field = "";
      started = false;
    } else {
      field += ch;
      started = true;
    }
  }
  if (quoted) throw new Error("Unclosed quoted field in CSV.");
  current.push(field);
  if (current.some(c => c.trim())) rows.push(current);
  return rows;
}

export function normalizeImportedRows(source: unknown[][]): ImportResult<string[][]> {
  const rows = source.map(row => row.map(cell)).filter(row => row.some(Boolean));
  if (!rows.length) return { ok: false, error: "This sheet has no data." };
  if (rows.length > MAX_ROWS) return { ok: false, error: "Limit: 500 data rows per import." };
  if (rows.some(row => row.length > MAX_COLUMNS)) return { ok: false, error: "Limit: 16 columns per import." };
  const width = Math.max(...rows.map(row => row.length));
  const result = rows.map(row => Array.from({ length: width }, (_, i) => row[i] ?? ""));
  return { ok: true, value: result, rows: result.length };
}

function parseNumber(source: string): number | null {
  const raw = source.trim().replace(/[\u00A0\u202F\s]/g, "");
  if (!raw || /[%]/.test(raw)) return null; // % formatting is ambiguous (0.2 vs 20).
  const accounting = /^\((.+)\)$/.exec(raw);
  const unsigned = accounting ? accounting[1]! : raw;
  const cleaned = unsigned.replace(/,/g, "");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(cleaned)) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? (accounting ? -number : number) : null;
}

/** Expected schema: Period | Actual | Budget, or Category | Series 1 | Series 2 ... */
export function importedRowsToChart(rows: unknown[][]): ImportResult<ImportedChart> {
  const normalized = normalizeImportedRows(rows);
  if (!normalized.ok) return normalized;
  const table = normalized.value;
  if (table.length < 2 || table[0]!.length < 2) {
    return { ok: false, error: "Chart needs a header and at least one data row with numeric values." };
  }
  const headers = table[0]!;
  if (!headers[0] || headers.slice(1).some(h => !h)) {
    return { ok: false, error: "All series headers must be named." };
  }
  const categories: string[] = [];
  const series = headers.slice(1).map(name => ({ name, values: [] as number[] }));
  const seen = new Set<string>();
  for (let index = 1; index < table.length; index++) {
    const row = table[index]!;
    const category = row[0]?.trim();
    if (!category) return { ok: false, error: `Missing category in data row ${index + 1}.` };
    if (seen.has(category)) return { ok: false, error: `Duplicate category: ${category}.` };
    seen.add(category);
    categories.push(category);
    for (let i = 0; i < series.length; i++) {
      const raw = row[i + 1] ?? "";
      const parsed = parseNumber(raw);
      if (parsed === null) return { ok: false, error: `Invalid number at row ${index + 1}, column ${i + 2}: "${raw}".` };
      series[i]!.values.push(parsed);
    }
  }
  return { ok: true, value: { categories, series }, rows: categories.length };
}

export function importedRowsToTable(rows: unknown[][]): ImportResult<string[][]> {
  return normalizeImportedRows(rows);
}

export interface FinancialSheet {
  name: string;
  rows: string[][];
}

/** Parse locally. No upload and no mutation: caller must explicitly confirm selection. */
export async function readFinancialWorkbook(file: File): Promise<FinancialSheet[]> {
  if (file.size > MAX_FILE_BYTES) throw new Error("File too large (maximum 5 MB).");
  if (/\.(csv|tsv)$/i.test(file.name)) {
    const body = (await file.text()).replace(/^\uFEFF/, "");
    return [{ name: file.name, rows: parseDelimited(body, /\.tsv$/i.test(file.name) ? "\t" : ",") }];
  }
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    throw new Error("Choose a .csv, .tsv, .xlsx, or .xls file.");
  }
  const xlsx = await import("xlsx");
  const workbook = xlsx.read(await file.arrayBuffer(), { type: "array", cellDates: false, sheetStubs: false });
  if (workbook.SheetNames.length > 40) throw new Error("Workbook exceeds 40 sheets.");
  const sheets = workbook.SheetNames.filter(name => workbook.Sheets[name]?.["!ref"]).map(name => ({
    name,
    rows: xlsx.utils.sheet_to_json<unknown[]>(workbook.Sheets[name]!, {
      header: 1, raw: false, defval: "",
    }).map(row => row.map(cell)),
  }));
  if (!sheets.length) throw new Error("Workbook has no nonempty sheets.");
  return sheets;
}

/** Chart mapping retains the original strings for strict numerical validation. */
export function mapFinancialColumns(
  rows: unknown[][],
  categoryColumn: number,
  valueColumns: number[],
): ImportResult<ImportedChart> {
  const normalized = normalizeImportedRows(rows);
  if (!normalized.ok) return normalized;
  const data = normalized.value;
  const width = data[0]?.length ?? 0;
  const cols = [categoryColumn, ...valueColumns];
  if (!valueColumns.length || cols.some(index => !Number.isInteger(index) || index < 0 || index >= width)) {
    return { ok: false, error: "Choose a category column and at least one numeric series." };
  }
  if (new Set(cols).size !== cols.length) {
    return { ok: false, error: "Category and series columns must be different." };
  }
  return importedRowsToChart(data.map(row => cols.map(index => row[index] ?? "")));
}

export async function readFinancialFile(file: File): Promise<string[][]> {
  const sheets = await readFinancialWorkbook(file);
  return sheets[0]!.rows;
}
