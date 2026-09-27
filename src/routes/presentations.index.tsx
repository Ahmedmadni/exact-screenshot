import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, PresentationIcon, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PresentationCard } from "@/components/presentation-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePresentations } from "@/lib/data/store";
import { STATUSES, type PresentationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/presentations/")({
  head: () => ({
    meta: [
      { title: "Presentations — Meridian Studio" },
      { name: "description", content: "Your library of presentation blueprints and decks." },
      { property: "og:title", content: "Presentations — Meridian Studio" },
      { property: "og:description", content: "Your library of presentation blueprints and decks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Library,
});

function Library() {
  const all = usePresentations();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<PresentationStatus | "All">("All");

  const list = useMemo(
    () =>
      all.filter(
        (p) =>
          (status === "All" || p.status === status) &&
          (p.title + p.topic).toLowerCase().includes(q.toLowerCase()),
      ),
    [all, q, status],
  );

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="eyebrow">Library</span>
          <h1 className="text-3xl text-foreground">Presentations</h1>
        </div>
        <Button asChild>
          <Link to="/">
            <Plus className="size-4" /> New presentation
          </Link>
        </Button>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="ps-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "focus-ring rounded-full border px-3 py-1 text-xs transition-colors",
                status === s
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={PresentationIcon}
          title={all.length ? "Nothing matches that filter" : "No presentations yet"}
          description={
            all.length
              ? "Try a different search or status."
              : "Start from the home screen with a single sentence describing your idea."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <PresentationCard key={p.id} presentation={p} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
