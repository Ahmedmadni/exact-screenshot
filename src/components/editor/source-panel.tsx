import { BookOpen, Calculator, FileSearch, Pin, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { AssetRecord, Slide } from "@/lib/types";
import type { SourceSegment } from "@/lib/evidence";
import { evidenceFromSegment, searchEvidence, topNumericEvidence } from "@/lib/evidence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

export function SourcePanel({
  assets,
  activeSlide,
  onPin,
  onRemove,
  onCreateSlide,
}: {
  assets: AssetRecord[];
  activeSlide?: Slide;
  onPin: (segment: SourceSegment) => void;
  onRemove: (evidenceId: string) => void;
  onCreateSlide: (segment: SourceSegment) => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "numbers">("search");

  const ready = assets.filter((asset) => asset.extractionStatus === "ready" && asset.extractedText);
  const results = useMemo(
    () => mode === "numbers" ? topNumericEvidence(ready, 18) : searchEvidence(ready, query, 18),
    [mode, query, ready],
  );
  const pinned = activeSlide?.evidenceRefs ?? [];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen className="size-4" /> Sources
          {pinned.length > 0 && <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">{pinned.length}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[520px] max-w-[92vw] flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-border p-5 pe-12">
          <SheetTitle>Research & evidence</SheetTitle>
          <SheetDescription>
            Search attached documents, jump to a page/slide/sheet, and pin exact evidence to the active slide.
          </SheetDescription>
        </SheetHeader>

        <div className="border-b border-border p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setMode("search"); }}
                placeholder="Search, “page 14”, “شريحة 3”, “revenue”…"
                className="ps-9"
              />
            </div>
            <Button variant={mode === "numbers" ? "default" : "outline"} size="sm" onClick={() => setMode(mode === "numbers" ? "search" : "numbers")}>
              <Calculator className="size-4" /> Top numbers
            </Button>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {ready.length} analyzed source{ready.length === 1 ? "" : "s"} · results are extracted from the files, not invented.
          </div>
        </div>

        {pinned.length > 0 && (
          <section className="border-b border-border bg-muted/20 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pinned to this slide</div>
            <div className="space-y-2">
              {pinned.map((ref) => (
                <div key={ref.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-foreground">{ref.assetName}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">{ref.locator ?? "Document"}</div>
                    </div>
                    <Button size="icon" variant="ghost" className="size-7" aria-label="Remove evidence" onClick={() => onRemove(ref.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{ref.quote}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {ready.length === 0 ? (
            <div className="grid place-items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
              <FileSearch className="size-7 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">No analyzed documents</div>
                <div className="mt-1 max-w-xs text-xs text-muted-foreground">Upload PDF, Word, Excel or PowerPoint files from the presentation Files tab first.</div>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="grid place-items-center gap-2 py-10 text-center">
              <FileSearch className="size-6 text-muted-foreground" />
              <div className="text-sm text-foreground">No matching evidence</div>
              <div className="text-xs text-muted-foreground">Try a shorter phrase, page number, slide number or sheet name.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((segment) => {
                const alreadyPinned = pinned.some((ref) => ref.assetId === segment.assetId && ref.locator === segment.locator);
                return (
                  <article key={segment.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="max-w-[250px] truncate text-xs font-semibold text-foreground">{segment.assetName}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{segment.locator}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{segment.kind}</span>
                    </div>
                    <p className="mt-2 line-clamp-6 text-xs leading-relaxed text-muted-foreground">{segment.text}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant={alreadyPinned ? "secondary" : "outline"} disabled={alreadyPinned} onClick={() => onPin(segment)}>
                        <Pin className="size-3.5" /> {alreadyPinned ? "Pinned" : "Pin citation"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onCreateSlide(segment)}>
                        <Plus className="size-3.5" /> Create slide
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
