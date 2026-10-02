/** Pure running-total model shared by canvas, exports and regression tests.
 * Data contract: first category/value is opening balance, each following
 * category/value is a signed movement. Closing balance is computed, never input.
 */
export interface WaterfallStep {
  label: string;
  value: number;
  start: number;
  end: number;
  kind: "opening" | "increase" | "decrease" | "closing";
}

export interface WaterfallModel {
  steps: WaterfallStep[];
  min: number;
  max: number;
  closing: number;
  valid: boolean;
}

export function buildWaterfall(categories: string[], values: number[]): WaterfallModel {
  if (!values.length || values.length !== categories.length ||
      values.some(value => !Number.isFinite(value))) {
    return { steps: [], min: 0, max: 1, closing: 0, valid: false };
  }
  const first = values[0]!;
  const steps: WaterfallStep[] = [
    { label: categories[0] || "Opening", value: first, start: 0, end: first, kind: "opening" },
  ];
  let running = first;
  for (let i = 1; i < values.length; i++) {
    const change = values[i]!;
    const next = running + change;
    if (!Number.isFinite(next)) return { steps: [], min: 0, max: 1, closing: 0, valid: false };
    steps.push({
      label: categories[i] || `Movement ${i}`,
      value: change,
      start: running,
      end: next,
      kind: change < 0 ? "decrease" : "increase",
    });
    running = next;
  }
  steps.push({ label: "Closing", value: running, start: 0, end: running, kind: "closing" });
  const all = [0, ...steps.flatMap(step => [step.start, step.end])];
  const actualMin = Math.min(...all);
  const actualMax = Math.max(...all);
  const padding = Math.max((actualMax - actualMin) * 0.08, 1);
  return {
    steps,
    min: actualMin - padding,
    max: actualMax + padding,
    closing: running,
    valid: true,
  };
}

export function waterfallColor(kind: WaterfallStep["kind"]): "accent" | "primary" | "secondary" {
  return kind === "increase" ? "accent" : kind === "decrease" ? "secondary" : "primary";
}
