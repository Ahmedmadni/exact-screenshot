import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Palette, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readImage } from "@/components/editor/image-upload";
import { brandKitRepository, useDatabase } from "@/lib/data/store";
import { FONT_CHOICES, themeOverridesFromBrandKit, getTheme } from "@/lib/editor/themes";
import type { BrandKit } from "@/lib/types";

export const Route = createFileRoute("/brand-kits")({
  head: () => ({
    meta: [
      { title: "Brand Kits — Meridian Studio" },
      { name: "description", content: "Colours, typefaces and logos applied across every deck." },
      { property: "og:title", content: "Brand Kits — Meridian Studio" },
      { property: "og:description", content: "Colours, typefaces and logos applied across every deck." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrandKitsPage,
});

const NEW_KIT: Omit<BrandKit, "id"> = {
  name: "New Brand",
  colors: ["#FFFFFF", "#172033", "#2563EB"],
  backgroundColor: "#FFFFFF",
  surfaceColor: "#F5F7FA",
  textColor: "#172033",
  secondaryTextColor: "#667085",
  accentColor: "#2563EB",
  headingFont: "Manrope",
  bodyFont: "Manrope",
};

function BrandKitsPage() {
  const { brandKits } = useDatabase();
  const [editingId, setEditingId] = useState<string | null>(null);

  const add = () => {
    const kit = brandKitRepository.add(NEW_KIT);
    setEditingId(kit.id);
  };

  return (
    <AppShell>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="eyebrow">Brand Kits</span>
          <h1 className="text-3xl text-foreground">One identity, every deck</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Store your logo, colours and typography once. Applying a kit creates a stable identity snapshot inside the presentation.
          </p>
        </div>
        <Button onClick={add}><Plus className="size-4" /> New brand kit</Button>
      </header>

      {brandKits.length === 0 ? (
        <button onClick={add} className="panel grid w-full place-items-center gap-3 border-dashed p-12 text-center hover:border-foreground/30">
          <Palette className="size-8 text-accent" />
          <div>
            <div className="text-base text-foreground">Create your first brand kit</div>
            <div className="mt-1 text-sm text-muted-foreground">Add a logo, palette and fonts, then apply them to any deck.</div>
          </div>
        </button>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {brandKits.map((kit) => (
            <BrandCard key={kit.id} kit={kit} editing={editingId === kit.id} onEdit={() => setEditingId(kit.id)} onClose={() => setEditingId(null)} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function BrandCard({ kit, editing, onEdit, onClose }: { kit: BrandKit; editing: boolean; onEdit: () => void; onClose: () => void }) {
  const [draft, setDraft] = useState(kit);
  const patch = <K extends keyof BrandKit>(key: K, value: BrandKit[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = () => {
    const colors = [
      draft.backgroundColor ?? "#FFFFFF",
      draft.textColor ?? "#172033",
      draft.accentColor ?? "#2563EB",
      draft.surfaceColor ?? "#F5F7FA",
    ];
    brandKitRepository.update(kit.id, { ...draft, colors });
    onClose();
  };

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    const src = await readImage(file);
    if (src) patch("logoDataUrl", src);
  };

  const previewTheme = getTheme("modern-corporate", themeOverridesFromBrandKit(draft));

  if (!editing) {
    return (
      <article className="panel overflow-hidden">
        <div className="h-36 p-5" style={{ background: previewTheme.colors.background }}>
          <div className="flex h-full items-center justify-between gap-4">
            <div>
              <div style={{ color: previewTheme.colors.secondary, fontFamily: previewTheme.fonts.body }} className="text-xs uppercase tracking-[0.18em]">Brand preview</div>
              <div style={{ color: previewTheme.colors.primary, fontFamily: previewTheme.fonts.heading }} className="mt-2 text-2xl font-semibold">{kit.name}</div>
              <div className="mt-4 h-1 w-16 rounded" style={{ background: previewTheme.colors.accent }} />
            </div>
            {kit.logoDataUrl ? <img src={kit.logoDataUrl} alt="" className="max-h-20 max-w-32 object-contain" /> : <div className="grid size-16 place-items-center rounded-lg border" style={{ borderColor: previewTheme.colors.line, color: previewTheme.colors.secondary }}>Logo</div>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 p-5">
          <div>
            <div className="flex gap-1.5">
              {[previewTheme.colors.background, previewTheme.colors.primary, previewTheme.colors.accent, previewTheme.colors.surface].map((color) => <span key={color} className="size-6 rounded border border-border" style={{ background: color }} />)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{kit.headingFont} · {kit.bodyFont}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
            <Button variant="ghost" size="icon" aria-label="Delete brand kit" onClick={() => brandKitRepository.remove(kit.id)}><Trash2 className="size-4" /></Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="panel p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <span className="eyebrow">Editing brand kit</span>
          <h2 className="mt-1 text-lg text-foreground">{draft.name}</h2>
        </div>
        <Button size="sm" onClick={save}><Save className="size-4" /> Save</Button>
      </div>

      <div className="space-y-5">
        <Field label="Brand name"><Input value={draft.name} onChange={(e) => patch("name", e.target.value)} /></Field>

        <Field label="Logo">
          <div className="flex items-center gap-3">
            <div className="grid h-20 w-32 place-items-center overflow-hidden rounded-md border border-border bg-muted/30">
              {draft.logoDataUrl ? <img src={draft.logoDataUrl} alt="" className="max-h-full max-w-full object-contain" /> : <Palette className="size-5 text-muted-foreground" />}
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-muted">
              <ImagePlus className="size-4" /> {draft.logoDataUrl ? "Replace logo" : "Upload logo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { void uploadLogo(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField label="Background" value={draft.backgroundColor ?? "#FFFFFF"} onChange={(v) => patch("backgroundColor", v)} />
          <ColorField label="Surface" value={draft.surfaceColor ?? "#F5F7FA"} onChange={(v) => patch("surfaceColor", v)} />
          <ColorField label="Primary text" value={draft.textColor ?? "#172033"} onChange={(v) => patch("textColor", v)} />
          <ColorField label="Secondary text" value={draft.secondaryTextColor ?? "#667085"} onChange={(v) => patch("secondaryTextColor", v)} />
          <ColorField label="Accent" value={draft.accentColor ?? "#2563EB"} onChange={(v) => patch("accentColor", v)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FontField label="Heading font" value={draft.headingFont} onChange={(v) => patch("headingFont", v)} />
          <FontField label="Body font" value={draft.bodyFont} onChange={(v) => patch("bodyFont", v)} />
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="h-36 p-5" style={{ background: previewTheme.colors.background }}>
            <div style={{ color: previewTheme.colors.secondary, fontFamily: previewTheme.fonts.body }} className="text-xs">BRAND PREVIEW</div>
            <div style={{ color: previewTheme.colors.primary, fontFamily: previewTheme.fonts.heading }} className="mt-2 text-3xl font-semibold">Executive presentation</div>
            <div style={{ color: previewTheme.colors.secondary, fontFamily: previewTheme.fonts.body }} className="mt-2 text-sm">A consistent identity across slides, charts and exports.</div>
            <div className="mt-4 h-1 w-20 rounded" style={{ background: previewTheme.colors.accent }} />
          </div>
        </div>
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2 rounded-md border border-input px-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-7 cursor-pointer border-0 bg-transparent p-0" />
        <Input value={value.toUpperCase()} onChange={(e) => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && onChange(e.target.value)} className="h-8 border-0 px-0 font-mono text-xs shadow-none focus-visible:ring-0" />
      </div>
    </Field>
  );
}

function FontField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{FONT_CHOICES.map((font) => <SelectItem key={font} value={font}>{font}</SelectItem>)}</SelectContent>
      </Select>
    </Field>
  );
}
