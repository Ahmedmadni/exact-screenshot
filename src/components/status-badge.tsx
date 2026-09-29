import type { PresentationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<PresentationStatus, string> = {
  Draft: "border-border text-muted-foreground",
  Planning: "border-accent/40 bg-accent-soft text-foreground",
  Generated: "border-chart-2/30 text-chart-2",
  "Under Review": "border-chart-4/50 text-foreground bg-accent-soft/60",
  "Changes Requested": "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Approved: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Completed: "border-success/40 text-success",
};

export function StatusBadge({ status }: { status: PresentationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
