import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ICON_CATEGORIES, getIcon, searchIcons } from "@/lib/editor/icons";

export function IconPicker({ children, onPick }: { children: ReactNode; onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const results = searchIcons(q);
  const groups: [string, string[]][] = q ? [["Results", results]] : Object.entries(ICON_CATEGORIES);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b border-border p-2"><Input autoFocus placeholder="Search icons" value={q} onChange={(e) => setQ(e.target.value)} className="h-8" /></div>
        <div className="max-h-80 space-y-3 overflow-y-auto p-3">
          {groups.map(([name, list]) => (
            <div key={name}>
              <p className="eyebrow mb-1.5">{name}</p>
              <div className="grid grid-cols-8 gap-1">
                {list.map((n) => {
                  const I = getIcon(n);
                  return (
                    <button key={n} title={n} onClick={() => { onPick(n); setOpen(false); }} className="grid aspect-square place-items-center rounded text-foreground hover:bg-muted">
                      <I className="size-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {q && !results.length && <p className="text-sm text-muted-foreground">No icons found.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
