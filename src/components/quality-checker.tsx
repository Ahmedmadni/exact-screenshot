import { AlertTriangle, CheckCircle2, CircleAlert, Info, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { Presentation } from "@/lib/types";
import { reviewPresentation, type QualityIssue, type QualitySeverity } from "@/lib/quality";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const META: Record<QualitySeverity, { icon: typeof CircleAlert; label: string; className: string }> = {
  error: { icon: CircleAlert, label: "Error", className: "text-destructive" },
  warning: { icon: AlertTriangle, label: "Warning", className: "text-amber-600 dark:text-amber-400" },
  info: { icon: Info, label: "Suggestion", className: "text-blue-600 dark:text-blue-400" },
};

export function QualityChecker({
  presentation,
  onSelectSlide,
  triggerLabel = "Quality",
}: {
  presentation: Presentation;
  onSelectSlide?: (slideId: string) => void;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const issues = reviewPresentation(presentation);
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const info = issues.filter((i) => i.severity === "info").length;

  const openIssue = (issue: QualityIssue) => {
    if (issue.slideId && onSelectSlide) {
      onSelectSlide(issue.slideId);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShieldCheck className="size-4" /> {triggerLabel}
          {(errors + warnings) > 0 && <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">{errors + warnings}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[82vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-6 pb-4">
          <DialogTitle>Presentation quality check</DialogTitle>
          <DialogDescription>Deterministic checks for readability, consistency, missing content and export readiness.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 px-6">
          <Summary label="Errors" value={errors} className="text-destructive" />
          <Summary label="Warnings" value={warnings} className="text-amber-600 dark:text-amber-400" />
          <Summary label="Suggestions" value={info} className="text-blue-600 dark:text-blue-400" />
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-6 pb-6">
          {issues.length === 0 ? (
            <div className="grid place-items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
              <CheckCircle2 className="size-8 text-emerald-600" />
              <div>
                <div className="text-sm font-medium text-foreground">No quality issues detected</div>
                <div className="mt-1 text-xs text-muted-foreground">The deck passed the current structural and visual checks.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue) => {
                const meta = META[issue.severity];
                const Icon = meta.icon;
                const clickable = Boolean(issue.slideId && onSelectSlide);
                return (
                  <button
                    key={issue.id}
                    disabled={!clickable}
                    onClick={() => openIssue(issue)}
                    className="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-start enabled:hover:bg-muted/50 disabled:cursor-default"
                  >
                    <Icon className={`mt-0.5 size-4 shrink-0 ${meta.className}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-medium ${meta.className}`}>{meta.label}</span>
                        {issue.slideNumber && <span className="text-[10px] text-muted-foreground">Slide {issue.slideNumber}</span>}
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{issue.code.replaceAll("-", " ")}</span>
                      </div>
                      <p className="mt-1 text-sm text-foreground">{issue.message}</p>
                      {clickable && <span className="mt-1 block text-[10px] text-muted-foreground">Open slide</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Summary({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className={`text-xl font-semibold tabular-nums ${className}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
