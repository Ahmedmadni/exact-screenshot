import { Link } from "@tanstack/react-router";
import { MoreHorizontal, Layers, Clock } from "lucide-react";
import type { Presentation } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { presentationRepository } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function relative(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function PresentationCard({ presentation }: { presentation: Presentation }) {
  const { t } = useI18n();

  return (
    <div className="panel group relative flex flex-col overflow-hidden transition-shadow hover:shadow-lift">
      <Link
        to="/presentations/$presentationId"
        params={{ presentationId: presentation.id }}
        className="focus-ring flex flex-col"
      >
        <div className="relative flex h-32 items-end border-b border-border bg-surface p-4">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--color-accent-soft),transparent_65%)]"
          />
          <div className="relative space-y-1.5">
            <span className="eyebrow">{presentation.presentationType}</span>
            <div className="flex gap-1">
              {presentation.slides.slice(0, 6).map((s) => (
                <span key={s.id} className="h-6 w-4 rounded-[3px] border border-border bg-card" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="line-clamp-1 text-base text-foreground">{presentation.title}</h3>
            <p className="line-clamp-1 text-sm text-muted-foreground">{presentation.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <StatusBadge status={presentation.status} />
            <span className="inline-flex items-center gap-1.5">
              <Layers className="size-3.5" />
              {presentation.slides.length} {t("common.slides")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {t("common.edited")} {relative(presentation.updatedAt)}
            </span>
          </div>
        </div>
      </Link>

      <div className="absolute end-3 top-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Actions"
            className="focus-ring flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => presentationRepository.duplicate(presentation.id)}>
              {t("common.duplicate")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onSelect={() => presentationRepository.remove(presentation.id)}
            >
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
