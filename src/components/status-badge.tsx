import type { PresentationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<PresentationStatus, string> = {
  Draft: "border-border text-muted-foreground",
  Planning: "border-accent/40 bg-accent-soft text-foreground",
  Generated: "border-chart-2/30 text-chart-2",
  "Under Review": "border-chart-4/50 text-foreground bg-accent-soft/60",
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
