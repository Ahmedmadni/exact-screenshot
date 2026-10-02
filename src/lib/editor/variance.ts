import type { ChartProps, SlideElement } from "./model";
import type { Slide } from "@/lib/types";

export type VarianceDirection = "higher-is-better" | "lower-is-better";
export type VarianceStatus = "favorable" | "unfavorable" | "on-target" | "not-available";

export interface VarianceRow {
  category: string;
  actual: number;
  budget: number;
  difference: number;
  percent: number | null;
  status: VarianceStatus;
}

export interface VarianceAnalysis {
  rows: VarianceRow[];
  actualTotal: number;
  budgetTotal: number;
  difference: number;
  percent: number | null;
  status: VarianceStatus;
  valid: boolean;
  reason?: string;
}

const empty = (reason: string): VarianceAnalysis => ({
  rows: [], actualTotal: 0, budgetTotal: 0, difference: 0,
  percent: null, status: "not-available", valid: false, reason,
});

/** Variance convention: Actual - Budget. Direction controls whether a variance is favorable. */
export function analyzeBudgetVariance(
  categories: string[],
  actual: number[],
  budget: number[],
  direction: VarianceDirection = "higher-is-better",
): VarianceAnalysis {
  if (!categories.length || actual.length !== categories.length || budget.length !== categories.length) {
    return empty("Actual and Budget must contain one finite number for each period.");
  }
  if ([...actual, ...budget].some(value => !Number.isFinite(value))) {
    return empty("Invalid or missing numeric value: revise the comparison data.");
  }
  // A freshly created all-zero chart is a template placeholder, not a real performance result.
  if ([...actual, ...budget].every(value => value === 0)) {
    return empty("Enter actual and budget values to calculate the variance.");
  }
  const statusFor = (diff: number): VarianceStatus =>
    diff === 0 ? "on-target" :
    (direction === "higher-is-better" ? diff > 0 : diff < 0) ? "favorable" : "unfavorable";
  const rows = categories.map((category, index) => {
    const a = actual[index]!;
    const b = budget[index]!;
    const difference = a - b;
    return {
      category,
      actual: a,
      budget: b,
      difference,
      percent: b === 0 ? null : difference / Math.abs(b) * 100,
      status: statusFor(difference),
    };
  });
  const actualTotal = actual.reduce((sum, v) => sum + v, 0);
  const budgetTotal = budget.reduce((sum, v) => sum + v, 0);
  const difference = actualTotal - budgetTotal;
  return {
    rows, actualTotal, budgetTotal, difference,
    percent: budgetTotal === 0 ? null : difference / Math.abs(budgetTotal) * 100,
    status: statusFor(difference),
    valid: true,
  };
}

export function analyzeChartBudget(props: ChartProps): VarianceAnalysis {
  if (props.series.length !== 2) return empty("Choose two chart series: Actual and Budget.");
  const actual = props.series.find(series => /^actual$/i.test(series.name.trim())) ?? props.series[0]!;
  const budget = props.series.find(series => /^budget$/i.test(series.name.trim())) ?? props.series[1]!;
  if (actual === budget) return empty("Actual and Budget must be different series.");
  return analyzeBudgetVariance(props.categories, actual.values, budget.values, props.varianceDirection);
}

export function formatVariance(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function varianceSummary(analysis: VarianceAnalysis): string {
  if (!analysis.valid) return analysis.reason ?? "Enter Actual and Budget data.";
  const percent = analysis.percent === null ? "N/A (zero budget)" : `${analysis.percent >= 0 ? "+" : ""}${analysis.percent.toFixed(1)}%`;
  const label = analysis.status === "favorable" ? "Favorable" :
    analysis.status === "unfavorable" ? "Unfavorable" : "On target";
  return `Actual: ${formatVariance(analysis.actualTotal)}  |  Budget: ${formatVariance(analysis.budgetTotal)}\nVariance (A − B): ${analysis.difference > 0 ? "+" : ""}${formatVariance(analysis.difference)} (${percent})\n${label} · ${analysis.rows.length} periods`;
}

/** Presentation-only derived content; chart changes update previews/PDF/PPTX without overwriting edits. */
export function renderedFinancialElements(slide: Slide): SlideElement[] {
  if (slide.layoutId !== "financial-actual-budget") return slide.elements;
  const chart = slide.elements.find(el => el.type === "chart" && el.role === "media");
  if (!chart || chart.type !== "chart") return slide.elements;
  const summary = varianceSummary(analyzeChartBudget(chart.properties));
  return slide.elements.map(el =>
    el.type === "text" && el.name === "Auto variance insight"
      ? { ...el, properties: { ...el.properties, text: summary } }
      : el,
  );
}
