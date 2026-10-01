import { useEffect, useState, type ReactNode } from "react";
import { Pencil, Sparkles } from "lucide-react";
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical,
  ArrowDownToLine, ArrowUpToLine, Bold, ChevronDown, ChevronUp, Copy, Eye, EyeOff, Italic, Lock, Trash2, Underline, Unlock,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ChartProps, DiagramProps, SlideElement, TableProps, TextProps } from "@/lib/editor/model";
import { SLIDE_H, SLIDE_W } from "@/lib/editor/model";
import { FONT_CHOICES, SLIDE_THEMES, THEME_COLOR_KEYS, resolveColor, type SlideTheme } from "@/lib/editor/themes";
import { LAYOUTS, applyLayout, layoutsForIntent } from "@/lib/editor/layouts";
import { magicDesignVariants } from "@/lib/editor/composer";
import { SlideStage, useFitScale } from "@/components/editor/slide-renderer";
import { cloneElement } from "@/lib/editor/elements";
import { cn } from "@/lib/utils";
import { chartToText, diagramToText, recommendChartType, tableToText, textToChart, textToDiagram, textToTable } from "@/lib/editor/data-utils";
import type { EditorApi } from "./use-editor";
import { IconPicker } from "./icon-picker";
import { readImage } from "./image-upload";
import { AssetPicker } from "./asset-picker";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 border-b border-border px-4 py-4">
      <h3 className="eyebrow">{title}</h3>
      {children}
    </div>
  );
}

function DataTextarea({ value, onCommit, rows = 6 }: { value: string; onCommit: (v: string) => void; rows?: number }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Textarea
      value={draft}
      rows={rows}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      className="font-mono text-xs"
    />
  );
}

function NumField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex items-center gap-1.5 rounded-md border border-input px-2">
      <span className="w-5 text-[11px] text-muted-foreground">{label}</span>
      <input
        type="number"
        step={step}
        className="h-8 w-full min-w-0 bg-transparent text-sm outline-none"
        value={Math.round(value * 100) / 100}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) onChange(v); }}
      />
    </label>
  );
}

export function ColorField({ value, theme, onChange, allowNone }: { value: string; theme: SlideTheme; onChange: (v: string) => void; allowNone?: boolean }) {
  const resolved = resolveColor(value, theme);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {THEME_COLOR_KEYS.map((k) => (
        <button
          key={k}
          title={`Theme · ${k}`}
          onClick={() => onChange(`theme:${k}`)}
          className={cn("size-6 rounded-full border border-border", value === `theme:${k}` && "ring-2 ring-primary ring-offset-1")}
          style={{ background: theme.colors[k] }}
        />
      ))}
      {allowNone && (
        <button title="None" onClick={() => onChange("transparent")} className={cn("size-6 rounded-full border border-border bg-[linear-gradient(135deg,transparent_45%,var(--destructive)_45%,var(--destructive)_55%,transparent_55%)]", value === "transparent" && "ring-2 ring-primary ring-offset-1")} />
      )}
      <input type="color" title="Custom color" value={resolved.startsWith("#") ? resolved.slice(0, 7) : "#000000"} onChange={(e) => onChange(e.target.value)} className="size-6 cursor-pointer rounded border-0 bg-transparent p-0" />
    </div>
  );
}

export function PropertiesPanel({ api, theme, onTheme }: { api: EditorApi; theme: SlideTheme; onTheme: (id: string) => void }) {
  const slide = api.active;
  if (!slide) return null;
  const sel = slide.elements.filter((e) => api.selected.includes(e.id));
  const el = sel.length === 1 ? sel[0]! : undefined;
  const set = (patch: (e: SlideElement) => SlideElement) => api.updateElements(api.selected, patch);
  const setProps = (p: Record<string, unknown>) => set((e) => ({ ...e, properties: { ...e.properties, ...p } }) as SlideElement);

  const reorderZ = (mode: "front" | "back" | "up" | "down") => {
    api.commit(api.mapElements((els) => {
      const sorted = [...els].sort((a, b) => a.zIndex - b.zIndex);
      const ids = new Set(api.selected);
      let arr = sorted;
      if (mode === "front") arr = [...sorted.filter((e) => !ids.has(e.id)), ...sorted.filter((e) => ids.has(e.id))];
      if (mode === "back") arr = [...sorted.filter((e) => ids.has(e.id)), ...sorted.filter((e) => !ids.has(e.id))];
      if (mode === "up") for (let i = arr.length - 2; i >= 0; i--) if (ids.has(arr[i]!.id) && !ids.has(arr[i + 1]!.id)) [arr[i], arr[i + 1]] = [arr[i + 1]!, arr[i]!];
      if (mode === "down") for (let i = 1; i < arr.length; i++) if (ids.has(arr[i]!.id) && !ids.has(arr[i - 1]!.id)) [arr[i], arr[i - 1]] = [arr[i - 1]!, arr[i]!];
      return arr.map((e, i) => ({ ...e, zIndex: i }));
    }));
  };

  const align = (mode: "l" | "c" | "r" | "t" | "m" | "b") => {
    const many = sel.length > 1;
    const bx = many ? Math.min(...sel.map((e) => e.x)) : 0;
    const by = many ? Math.min(...sel.map((e) => e.y)) : 0;
    const br = many ? Math.max(...sel.map((e) => e.x + e.width)) : SLIDE_W;
    const bb = many ? Math.max(...sel.map((e) => e.y + e.height)) : SLIDE_H;
    set((e) => {
      if (mode === "l") return { ...e, x: bx };
      if (mode === "c") return { ...e, x: Math.round((bx + br) / 2 - e.width / 2) };
      if (mode === "r") return { ...e, x: br - e.width };
      if (mode === "t") return { ...e, y: by };
      if (mode === "m") return { ...e, y: Math.round((by + bb) / 2 - e.height / 2) };
      return { ...e, y: bb - e.height };
    });
  };

  const remove = () => { api.commit(api.mapElements((els) => els.filter((e) => !api.selected.includes(e.id)))); api.setSelected([]); };
  const duplicate = () => {
    const copies = sel.map((e) => cloneElement(e, slide.id, 24));
    const maxZ = Math.max(0, ...slide.elements.map((e) => e.zIndex));
    api.commit(api.mapElements((els) => [...els, ...copies.map((c, i) => ({ ...c, zIndex: maxZ + 1 + i }))]));
    api.setSelected(copies.map((c) => c.id));
  };

  if (!sel.length) {
    const suggested = layoutsForIntent(slide.slideIntent).map((l) => l.id);
    return (
      <aside className="w-72 shrink-0 overflow-y-auto border-s border-border bg-card">
        <Section title="Slide">
          <p className="text-sm text-foreground">{slide.title}</p>
          <p className="text-xs text-muted-foreground">{slide.slideIntent} · {slide.purpose}</p>
        </Section>
        <Section title="Magic Design">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            <div>
              <div className="text-xs font-medium text-foreground">Four directions from the same content</div>
              <div className="text-[10px] text-muted-foreground">Choose a different visual personality without rewriting the slide.</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {magicDesignVariants(slide).map((variant) => (
              <button
                key={variant.id}
                onClick={() => api.commit(api.snapshot().map((candidate) => (candidate.id === slide.id ? variant.slide : candidate)))}
                className={cn(
                  "overflow-hidden rounded-md border bg-background text-start transition hover:-translate-y-0.5 hover:shadow-md",
                  slide.layoutId === variant.layoutId ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/40",
                )}
              >
                <LayoutPreview slide={variant.slide} theme={theme} />
                <div className="border-t border-border px-2 py-2">
                  <div className="flex items-center justify-between gap-1">
                    <div className="truncate text-[10px] font-semibold text-foreground">{variant.label}</div>
                    {variant.label === "Best fit" && <Sparkles className="size-3 text-accent" />}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[9px] leading-relaxed text-muted-foreground">{variant.description}</div>
                </div>
              </button>
            ))}
          </div>
        </Section>
        <Section title="Layout">
          <div className="space-y-3">
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Recommended</div>
              <div className="grid grid-cols-2 gap-2">
                {LAYOUTS.filter((layout) => suggested.includes(layout.id)).slice(0, 6).map((layout) => {
                  const preview = applyLayout(slide, layout.id);
                  return (
                    <button
                      key={layout.id}
                      onClick={() => api.commit(api.snapshot().map((candidate) => (candidate.id === slide.id ? preview : candidate)))}
                      className={cn(
                        "overflow-hidden rounded-md border bg-background text-start transition hover:-translate-y-0.5 hover:shadow-sm",
                        slide.layoutId === layout.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/40",
                      )}
                    >
                      <LayoutPreview slide={preview} theme={theme} />
                      <div className="border-t border-border px-2 py-1.5">
                        <div className="truncate text-[10px] font-medium text-foreground">{layout.name}</div>
                        <div className="text-[9px] text-accent">Suggested</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <details>
              <summary className="cursor-pointer select-none text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
                Browse all layouts · {LAYOUTS.length}
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {LAYOUTS.filter((layout) => !suggested.includes(layout.id)).map((layout) => {
                  const preview = applyLayout(slide, layout.id);
                  return (
                    <button
                      key={layout.id}
                      onClick={() => api.commit(api.snapshot().map((candidate) => (candidate.id === slide.id ? preview : candidate)))}
                      className={cn(
                        "overflow-hidden rounded-md border bg-background text-start transition hover:-translate-y-0.5 hover:shadow-sm",
                        slide.layoutId === layout.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/40",
                      )}
                    >
                      <LayoutPreview slide={preview} theme={theme} />
                      <div className="truncate border-t border-border px-2 py-1.5 text-[10px] text-muted-foreground">{layout.name}</div>
                    </button>
                  );
                })}
              </div>
            </details>
          </div>
          <p className="text-[11px] text-muted-foreground">Every preview uses this slide’s real content. Switching layouts preserves your text, images and free elements.</p>
        </Section>
        <Section title="Slide background">
          <div className="flex items-center gap-2">
            <Button size="sm" variant={slide.background ? "outline" : "secondary"} className="h-7 text-xs" onClick={() => api.updateActiveSlide({ background: undefined })}>Theme default</Button>
          </div>
          <ColorField value={slide.background ?? "theme:background"} theme={theme} onChange={(v) => api.updateActiveSlide({ background: v === "theme:background" ? undefined : v })} />
        </Section>
        <Section title="Theme">
          <div className="space-y-1.5">
            {SLIDE_THEMES.map((t) => (
              <button key={t.id} onClick={() => onTheme(t.id)} className={cn("flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-start text-xs", theme.id === t.id ? "border-primary" : "border-border hover:border-foreground/40")}>
                <span className="flex overflow-hidden rounded">{(["background", "primary", "accent", "accentSoft"] as const).map((k) => <span key={k} className="size-4" style={{ background: t.colors[k] }} />)}</span>
                {t.name}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Layers">
          <div className="space-y-0.5">
            {[...slide.elements].sort((a, b) => b.zIndex - a.zIndex).map((e) => (
              <div key={e.id} className="flex items-center gap-1 rounded px-1.5 py-1 text-xs hover:bg-muted">
                <LayerName name={e.name} onSelect={() => api.setSelected([e.id])} onRename={(name) => api.updateElements([e.id], (x) => ({ ...x, name: name || defaultName(x) }))} />
                <button aria-label="Toggle visibility" className="text-muted-foreground" onClick={() => api.updateElements([e.id], (x) => ({ ...x, visible: !x.visible }))}>{e.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</button>
                <button aria-label="Toggle lock" className="text-muted-foreground" onClick={() => api.updateElements([e.id], (x) => ({ ...x, locked: !x.locked }))}>{e.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}</button>
              </div>
            ))}
          </div>
        </Section>
      </aside>
    );
  }

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-s border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        {el ? <LayerName name={el.name} onRename={(name) => api.updateElements([el.id], (x) => ({ ...x, name: name || defaultName(x) }))} className="text-sm" /> : <span className="text-sm text-foreground">{sel.length} elements</span>}
        <div className="flex gap-0.5">
          <Button size="icon" variant="ghost" className="size-7" aria-label="Duplicate" onClick={duplicate}><Copy className="size-3.5" /></Button>
          <Button size="icon" variant="ghost" className="size-7" aria-label="Delete" onClick={remove}><Trash2 className="size-3.5" /></Button>
        </div>
      </div>

      <Section title={sel.length > 1 ? "Align selection" : "Align to slide"}>
        <div className="flex justify-between">
          {([["l", AlignStartVertical], ["c", AlignCenterVertical], ["r", AlignEndVertical], ["t", AlignStartHorizontal], ["m", AlignCenterHorizontal], ["b", AlignEndHorizontal]] as const).map(([m, I]) => (
            <Button key={m} size="icon" variant="ghost" className="size-8" onClick={() => align(m)} aria-label={`Align ${m}`}><I className="size-4" /></Button>
          ))}
        </div>
      </Section>

      {el && (
        <Section title="Position & size">
          <div className="grid grid-cols-2 gap-2">
            <NumField label="X" value={el.x} onChange={(v) => set((e) => ({ ...e, x: v }))} />
            <NumField label="Y" value={el.y} onChange={(v) => set((e) => ({ ...e, y: v }))} />
            <NumField label="W" value={el.width} onChange={(v) => set((e) => ({ ...e, width: Math.max(4, v) }))} />
            <NumField label="H" value={el.height} onChange={(v) => set((e) => ({ ...e, height: Math.max(4, v) }))} />
            <NumField label="°" value={el.rotation} onChange={(v) => set((e) => ({ ...e, rotation: v }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Opacity {Math.round(el.opacity * 100)}%</Label>
            <Slider value={[el.opacity * 100]} min={0} max={100} step={1} onValueChange={([v]) => api.updateElements([el.id], (e) => ({ ...e, opacity: v! / 100 }), true)} onValueCommit={([v]) => set((e) => ({ ...e, opacity: v! / 100 }))} />
          </div>
        </Section>
      )}

      {el?.type === "text" && <TextSection p={el.properties} theme={theme} setProps={setProps} />}

      {el?.type === "shape" && (
        <Section title="Shape">
          <Label className="text-xs text-muted-foreground">Fill</Label>
          <ColorField value={el.properties.fill} theme={theme} allowNone onChange={(v) => setProps({ fill: v })} />
          <Label className="text-xs text-muted-foreground">Border</Label>
          <ColorField value={el.properties.stroke} theme={theme} allowNone onChange={(v) => setProps({ stroke: v, strokeWidth: el.properties.strokeWidth || 2 })} />
          <div className="grid grid-cols-2 gap-2">
            <NumField label="B" value={el.properties.strokeWidth} onChange={(v) => setProps({ strokeWidth: Math.max(0, v) })} />
            <NumField label="R" value={el.properties.radius} onChange={(v) => setProps({ radius: Math.max(0, v) })} />
          </div>
        </Section>
      )}

      {el?.type === "icon" && (
        <Section title="Icon">
          <IconPicker onPick={(name) => setProps({ name })}><Button variant="outline" size="sm" className="w-full">Replace icon · {el.properties.name}</Button></IconPicker>
          <ColorField value={el.properties.color} theme={theme} onChange={(v) => setProps({ color: v })} />
          <NumField label="S" step={0.25} value={el.properties.strokeWidth} onChange={(v) => setProps({ strokeWidth: Math.max(0.5, v) })} />
        </Section>
      )}

      {el?.type === "image" && (
        <Section title="Image">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="inline-flex h-8 w-full cursor-pointer items-center justify-center rounded-md border border-input text-xs hover:bg-muted">{el.properties.src ? "Upload new" : "Upload image"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const src = await readImage(f); if (src) setProps({ src, assetId: undefined }); } e.target.value = ""; }} />
            </label>
            <AssetPicker onPick={(asset) => asset.imageDataUrl && setProps({ src: "", assetId: asset.id })} title="Replace from Asset Vault">
              <Button variant="outline" size="sm" className="h-8 w-full text-xs">Asset Vault</Button>
            </AssetPicker>
          </div>
          <Select value={el.properties.fit} onValueChange={(v) => setProps({ fit: v })}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="cover">Fill frame (crop)</SelectItem><SelectItem value="contain">Fit inside</SelectItem></SelectContent>
          </Select>
          <NumField label="R" value={el.properties.radius} onChange={(v) => setProps({ radius: Math.max(0, v) })} />
        </Section>
      )}

      {el?.type === "chart" && (
        <ChartSection p={el.properties} theme={theme} setProps={(patch) => setProps(patch)} />
      )}

      {el?.type === "table" && (
        <TableSection p={el.properties} theme={theme} setProps={(patch) => setProps(patch)} />
      )}

      {el?.type === "diagram" && (
        <DiagramSection p={el.properties} theme={theme} setProps={(patch) => setProps(patch)} />
      )}

      <Section title="Arrange">
        <div className="grid grid-cols-4 gap-1">
          <Button size="icon" variant="outline" className="h-8 w-full" aria-label="Bring to front" onClick={() => reorderZ("front")}><ArrowUpToLine className="size-4" /></Button>
          <Button size="icon" variant="outline" className="h-8 w-full" aria-label="Bring forward" onClick={() => reorderZ("up")}><ChevronUp className="size-4" /></Button>
          <Button size="icon" variant="outline" className="h-8 w-full" aria-label="Send backward" onClick={() => reorderZ("down")}><ChevronDown className="size-4" /></Button>
          <Button size="icon" variant="outline" className="h-8 w-full" aria-label="Send to back" onClick={() => reorderZ("back")}><ArrowDownToLine className="size-4" /></Button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <Button size="sm" variant="outline" onClick={() => set((e) => ({ ...e, locked: !sel.every((s) => s.locked) }))}>{sel.every((s) => s.locked) ? <><Unlock className="size-3.5" /> Unlock</> : <><Lock className="size-3.5" /> Lock</>}</Button>
          <Button size="sm" variant="outline" onClick={() => set((e) => ({ ...e, visible: false }))}><EyeOff className="size-3.5" /> Hide</Button>
        </div>
      </Section>
    </aside>
  );
}

function LayoutPreview({ slide, theme }: { slide: ReturnType<typeof applyLayout>; theme: SlideTheme }) {
  const { ref, scale } = useFitScale();
  return (
    <div ref={ref} className="relative aspect-video w-full overflow-hidden bg-muted">
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: SLIDE_W,
          height: SLIDE_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        dir="ltr"
      >
        <SlideStage slide={slide} theme={theme} />
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-primary" />
    </label>
  );
}

function ChartSection({ p, theme, setProps }: { p: ChartProps; theme: SlideTheme; setProps: (p: Partial<ChartProps>) => void }) {
  return (
    <Section title="Chart">
      <Input value={p.label} onChange={(e) => setProps({ label: e.target.value })} placeholder="Chart title" />
      <div className="flex gap-2">
        <Select value={p.chartType} onValueChange={(v) => setProps({ chartType: v as ChartProps["chartType"] })}>
          <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="column">Column</SelectItem>
            <SelectItem value="bar">Bar</SelectItem>
            <SelectItem value="line">Line</SelectItem>
            <SelectItem value="area">Area</SelectItem>
            <SelectItem value="pie">Pie</SelectItem>
            <SelectItem value="doughnut">Doughnut</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setProps({ chartType: recommendChartType(p) })}>Recommend</Button>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Paste data — first row contains series names</Label>
        <DataTextarea
          value={chartToText(p)}
          onCommit={(value) => setProps(textToChart(value, p))}
          rows={7}
        />
        <p className="text-[11px] text-muted-foreground">Paste from Excel or use tab/comma-separated data.</p>
      </div>
      <ToggleRow label="Show legend" checked={p.showLegend} onChange={(showLegend) => setProps({ showLegend })} />
      <ToggleRow label="Show values" checked={p.showValues} onChange={(showValues) => setProps({ showValues })} />
      <ToggleRow label="Show grid" checked={p.showGrid} onChange={(showGrid) => setProps({ showGrid })} />
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Primary colour</Label>
        <ColorField value={p.accent} theme={theme} onChange={(accent) => setProps({ accent })} />
      </div>
    </Section>
  );
}

function TableSection({ p, theme, setProps }: { p: TableProps; theme: SlideTheme; setProps: (p: Partial<TableProps>) => void }) {
  return (
    <Section title="Table">
      <Input value={p.label} onChange={(e) => setProps({ label: e.target.value })} placeholder="Table title" />
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Paste cells</Label>
        <DataTextarea value={tableToText(p.rows)} onCommit={(value) => setProps({ rows: textToTable(value) })} rows={8} />
        <p className="text-[11px] text-muted-foreground">Tabs and commas are both supported.</p>
      </div>
      <ToggleRow label="Header row" checked={p.headerRow} onChange={(headerRow) => setProps({ headerRow })} />
      <ToggleRow label="Banded rows" checked={p.bandedRows} onChange={(bandedRows) => setProps({ bandedRows })} />
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Header colour</Label>
        <ColorField value={p.headerFill} theme={theme} onChange={(headerFill) => setProps({ headerFill })} />
      </div>
    </Section>
  );
}

function DiagramSection({ p, theme, setProps }: { p: DiagramProps; theme: SlideTheme; setProps: (p: Partial<DiagramProps>) => void }) {
  return (
    <Section title="Diagram">
      <Input value={p.label} onChange={(e) => setProps({ label: e.target.value })} placeholder="Diagram title" />
      <Select value={p.diagramType} onValueChange={(v) => setProps({ diagramType: v as DiagramProps["diagramType"] })}>
        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="process">Process</SelectItem>
          <SelectItem value="timeline">Timeline</SelectItem>
          <SelectItem value="matrix">Matrix</SelectItem>
        </SelectContent>
      </Select>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Items — title then description</Label>
        <DataTextarea value={diagramToText(p.nodes)} onCommit={(value) => setProps({ nodes: textToDiagram(value) })} rows={7} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Accent colour</Label>
        <ColorField value={p.accent} theme={theme} onChange={(accent) => setProps({ accent })} />
      </div>
    </Section>
  );
}

function TextSection({ p, theme, setProps }: { p: TextProps; theme: SlideTheme; setProps: (p: Partial<TextProps>) => void }) {
  const fontValue = p.fontFamily;
  return (
    <Section title="Text">
      <Textarea dir="auto" rows={3} value={p.text} onChange={(e) => setProps({ text: e.target.value })} className="text-sm" />
      <Select value={fontValue} onValueChange={(v) => setProps({ fontFamily: v })}>
        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="theme:heading">Theme heading · {theme.fonts.heading}</SelectItem>
          <SelectItem value="theme:body">Theme body · {theme.fonts.body}</SelectItem>
          {FONT_CHOICES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Px" value={p.fontSize} onChange={(v) => setProps({ fontSize: Math.max(6, v) })} />
        <Select value={String(p.fontWeight)} onValueChange={(v) => setProps({ fontWeight: Number(v) })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{[300, 400, 500, 600, 700].map((w) => <SelectItem key={w} value={String(w)}>{w}</SelectItem>)}</SelectContent>
        </Select>
        <NumField label="LH" step={0.05} value={p.lineHeight} onChange={(v) => setProps({ lineHeight: Math.max(0.6, v) })} />
        <NumField label="LS" step={0.25} value={p.letterSpacing} onChange={(v) => setProps({ letterSpacing: v })} />
      </div>
      <div className="flex flex-wrap gap-1">
        <Button size="icon" variant={p.fontWeight >= 600 ? "secondary" : "ghost"} className="size-8" aria-label="Bold" onClick={() => setProps({ fontWeight: p.fontWeight >= 600 ? 400 : 700 })}><Bold className="size-4" /></Button>
        <Button size="icon" variant={p.italic ? "secondary" : "ghost"} className="size-8" aria-label="Italic" onClick={() => setProps({ italic: !p.italic })}><Italic className="size-4" /></Button>
        <Button size="icon" variant={p.underline ? "secondary" : "ghost"} className="size-8" aria-label="Underline" onClick={() => setProps({ underline: !p.underline })}><Underline className="size-4" /></Button>
        <span className="mx-1 w-px bg-border" />
        {([["start", AlignLeft], ["center", AlignCenter], ["end", AlignRight], ["justify", AlignJustify]] as const).map(([a, I]) => (
          <Button key={a} size="icon" variant={p.align === a ? "secondary" : "ghost"} className="size-8" aria-label={`Align ${a}`} onClick={() => setProps({ align: a })}><I className="size-4" /></Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select value={p.vAlign} onValueChange={(v) => setProps({ vAlign: v as TextProps["vAlign"] })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="top">Top</SelectItem><SelectItem value="middle">Middle</SelectItem><SelectItem value="bottom">Bottom</SelectItem></SelectContent>
        </Select>
        <Select value={p.dir} onValueChange={(v) => setProps({ dir: v as TextProps["dir"] })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="auto">Auto direction</SelectItem><SelectItem value="ltr">Left to right</SelectItem><SelectItem value="rtl">Right to left</SelectItem></SelectContent>
        </Select>
      </div>
      <Label className="text-xs text-muted-foreground">Color</Label>
      <ColorField value={p.color} theme={theme} onChange={(v) => setProps({ color: v })} />
    </Section>
  );
}

function defaultName(el: SlideElement) {
  return el.type === "shape" ? "Shape" : el.type.charAt(0).toUpperCase() + el.type.slice(1);
}

/** Double-click to rename. Enter confirms, Escape cancels, blank reverts to a default name. */
function LayerName({ name, onRename, onSelect, className }: { name: string; onRename: (n: string) => void; onSelect?: () => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const start = () => { setDraft(name); setEditing(true); };
  const [draft, setDraft] = useState(name);
  if (editing)
    return (
      <input
        autoFocus
        dir="auto"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") { setEditing(false); if (draft.trim() !== name) onRename(draft.trim()); }
          if (e.key === "Escape") { setEditing(false); setDraft(name); }
        }}
        onBlur={() => { setEditing(false); if (draft.trim() !== name) onRename(draft.trim()); }}
        className={cn("min-w-0 flex-1 rounded border border-primary bg-background px-1 text-xs outline-none", className)}
        aria-label="Layer name"
      />
    );
  return (
    <span className="group/name flex min-w-0 flex-1 items-center gap-1">
      <button
        className={cn("min-w-0 truncate text-start text-foreground", className)}
        title="Double-click to rename"
        onClick={(e) => { if (e.detail === 1) onSelect?.(); }}
        onDoubleClick={start}
      >
        {name}
      </button>
      <button aria-label="Rename layer" title="Rename" onClick={start} className="shrink-0 text-muted-foreground opacity-0 hover:text-foreground focus:opacity-100 group-hover/name:opacity-100">
        <Pencil className="size-3" />
      </button>
    </span>
  );
}
