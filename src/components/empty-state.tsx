import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  hint?: string;
}

export function EmptyState({ icon: Icon, title, description, action, hint }: EmptyStateProps) {
  return (
    <div className="panel relative overflow-hidden px-8 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,var(--color-accent-soft),transparent_70%)] opacity-70"
      />
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-surface">
          <Icon className="size-5 text-accent" />
        </span>
        <div className="space-y-2">
          <h3 className="text-lg text-foreground">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {action}
        {hint && <p className="eyebrow">{hint}</p>}
      </div>
    </div>
  );
}
