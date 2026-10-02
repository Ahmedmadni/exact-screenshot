import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  importedRowsToTable,
  mapFinancialColumns,
  readFinancialWorkbook,
  type FinancialSheet,
} from "@/lib/editor/financial-import";
import type { ChartProps } from "@/lib/editor/model";
import { Button } from "@/components/ui/button";

/** Every import is staged until the user inspects its sheet, columns and preview. */
export function FinancialImportControl({
  mode,
  onChart,
  onTable,
}: {
  mode: "chart" | "table";
  onChart?: (values: Pick<ChartProps, "categories" | "series">) => void;
  onTable?: (rows: string[][]) => void;
}) {
  const [sheets, setSheets] = useState<FinancialSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [seriesIndices, setSeriesIndices] = useState<number[]>([1, 2]);
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const sheet = sheets[sheetIndex];
  const headers = sheet?.rows[0] ?? [];
  const width = headers.length;
  const proposed = useMemo(() => {
    if (!sheet) return null;
    return mode === "chart"
      ? mapFinancialColumns(sheet.rows, categoryIndex, seriesIndices)
      : importedRowsToTable(sheet.rows);
  }, [sheet, mode, categoryIndex, seriesIndices]);

  useEffect(() => {
    setCategoryIndex(0);
    setSeriesIndices(headers.map((_, i) => i).filter(i => i !== 0).slice(0, 2));
  }, [sheetIndex, sheet]);

  const clear = () => {
    setSheets([]);
    setSheetIndex(0);
    setCategoryIndex(0);
    setSeriesIndices([]);
    setFilename("");
  };

  const chooseFile = async (file: File) => {
    clear();
    setLoading(true);
    try {
      const imported = await readFinancialWorkbook(file);
      setSheets(imported);
      setFilename(file.name);
      setSeriesIndices((imported[0]?.rows[0] ?? []).map((_, i) => i).filter(i => i !== 0).slice(0, 2));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read this file.");
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!proposed || !proposed.ok) return;
    if (mode === "chart") {
      if (!onChart) return;
      onChart(proposed.value as Pick<ChartProps, "categories" | "series">);
    } else {
      if (!onTable) return;
      onTable(proposed.value as string[][]);
    }
    toast.success(`Imported ${proposed.rows} rows from ${sheet?.name ?? filename}`);
    clear();
  };

  return (
    <div className="space-y-2 rounded-md border border-border p-2">
      <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted">
        {loading ? "Reading file…" : "Choose Excel / CSV file"}
        <input
          type="file"
          accept=".csv,.tsv,.xls,.xlsx"
          className="sr-only"
          disabled={loading}
          onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void chooseFile(file);
          }}
        />
      </label>
      {sheet && (
        <div className="space-y-3" aria-label="Financial import preview">
          <p className="break-all text-[11px] text-muted-foreground">{filename} · Local preview, not imported yet</p>
          {sheets.length > 1 && (
            <label className="block space-y-1 text-xs">
              <span>Worksheet</span>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2" value={sheetIndex}
                onChange={event => setSheetIndex(Number(event.target.value))}>
                {sheets.map((entry, i) => <option key={i} value={i}>{entry.name}</option>)}
              </select>
            </label>
          )}
          {mode === "chart" && (
            <>
              <label className="block space-y-1 text-xs">
                <span>Category / period column</span>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2"
                  value={categoryIndex}
                  onChange={event => {
                    const chosen = Number(event.target.value);
                    setCategoryIndex(chosen);
                    setSeriesIndices(previous => previous.filter(i => i !== chosen));
                  }}>
                  {headers.map((heading, i) => <option key={i} value={i}>{heading || `Column ${i + 1}`}</option>)}
                </select>
              </label>
              <div className="space-y-1">
                <p className="text-xs">Numeric series columns</p>
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {headers.map((heading, i) => i === categoryIndex ? null : (
                    <label key={i} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={seriesIndices.includes(i)}
                        onChange={event => setSeriesIndices(previous =>
                          event.target.checked
                            ? [...previous, i].sort((a, b) => a - b)
                            : previous.filter(value => value !== i)
                        )}/>
                      <span>{heading || `Column ${i + 1}`}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-max text-[11px]">
              <thead><tr className="bg-muted">
                {headers.map((heading, i) => <th key={i} className="px-2 py-1 text-start font-semibold">{heading || `Column ${i + 1}`}</th>)}
              </tr></thead>
              <tbody>
                {sheet.rows.slice(1, 6).map((row, index) => (
                  <tr key={index} className="border-t border-border">
                    {headers.map((_, i) => <td key={i} className="max-w-44 truncate px-2 py-1">{row[i] ?? ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Showing up to five rows · {Math.max(0, sheet.rows.length - 1)} data rows detected
          </p>
          {proposed && !proposed.ok && <p role="alert" className="text-xs text-destructive">{proposed.error}</p>}
          {proposed?.ok && <p className="text-xs text-green-700 dark:text-green-400">
            Validated {proposed.rows} {mode === "chart" ? "numeric data" : "table"} rows.
          </p>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={clear}>Cancel</Button>
            <Button size="sm" onClick={apply} disabled={!proposed?.ok}>Apply import</Button>
          </div>
        </div>
      )}
    </div>
  );
}
