import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiProvider } from "@/lib/ai";
import { materializeSlide } from "@/lib/editor/layouts";
import { composeDeck } from "@/lib/editor/composer";
import { presentationRepository, uid } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import {
  AUDIENCES, LANGUAGES, LENGTHS, LENGTH_RANGES, PRESENTATION_TYPES, PURPOSES, TONES,
  type Audience, type LengthPreset, type PresentationLanguage, type PresentationType, type Purpose, type Tone,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/new")({
  validateSearch: z.object({ topic: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "New presentation — Meridian Studio" },
      { name: "description", content: "Set the audience, goal and tone for your next presentation." },
      { property: "og:title", content: "New presentation — Meridian Studio" },
      { property: "og:description", content: "Set the audience, goal and tone for your next presentation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Setup,
});

function infer(topic: string) {
  const s = topic.toLowerCase();
  const has = (...w: string[]) => w.some((x) => s.includes(x));
  const arabic = /[\u0600-\u06FF]/.test(topic);
  return {
    audience: (has("board", "مجلس") ? "Board of Directors" : has("investor", "pitch", "series") ? "Investors" : has("customer", "sales") ? "Customers" : has("training", "employee") ? "Employees" : "Executive Management") as Audience,
    purpose: (has("pitch", "series") ? "Pitch" : has("strategy", "استراتيج") ? "Strategy" : has("review", "quarter") ? "Business Review" : has("training") ? "Training" : has("proposal") ? "Proposal" : "Inform") as Purpose,
    type: (has("pitch", "series") ? "Pitch Deck" : has("strategy", "استراتيج") ? "Strategy Deck" : has("board") ? "Board Presentation" : has("financial", "budget") ? "Financial Review" : has("training") ? "Training" : "Executive Presentation") as PresentationType,
    language: (arabic ? "Arabic" : "English") as PresentationLanguage,
    tone: (has("pitch") ? "Persuasive" : has("financial", "review") ? "Data-driven" : "Executive") as Tone,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Pick<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Setup() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { topic: initial = "" } = Route.useSearch();
  const guess = infer(initial);
  const [topic, setTopic] = useState(initial);
  const [objective, setObjective] = useState("");
  const [audience, setAudience] = useState(guess.audience);
  const [purpose, setPurpose] = useState(guess.purpose);
  const [type, setType] = useState(guess.type);
  const [language, setLanguage] = useState(guess.language);
  const [tone, setTone] = useState(guess.tone);
  const [length, setLength] = useState<LengthPreset>("Standard");
  const [custom, setCustom] = useState(10);
  const [busy, setBusy] = useState(false);

  const slideCount = length === "Custom" ? custom : Math.round((LENGTH_RANGES[length][0] + LENGTH_RANGES[length][1]) / 2);

  const build = async () => {
    if (!topic.trim()) return;
    setBusy(true);
    const request = { topic, objective, purpose, audience, presentationType: type, language, tone, lengthPreset: length, slideCount };
    const plan = await aiProvider().createPlan(request);
    const stamp = new Date().toISOString();
    const created = presentationRepository.create({
      title: plan.brief.title,
      description: plan.brief.objective,
      topic,
      objective: plan.brief.objective,
      purpose, audience, presentationType: type, language, tone,
      status: "Generated",
      lengthPreset: length,
      recommendedSlideCount: plan.brief.recommendedSlideCount,
      estimatedDuration: plan.brief.estimatedDuration,
      coreMessage: plan.brief.coreMessage,
      visualDirection: plan.brief.visualDirection,
      storyArc: plan.storyArc,
      slides: [],
    });
    const generatedSlides = plan.slides.map((s) =>
      materializeSlide({ ...s, id: uid(), presentationId: created.id, elements: [], createdAt: stamp, updatedAt: stamp }),
    );
    presentationRepository.replaceSlides(created.id, composeDeck(generatedSlides));
    navigate({ to: "/presentations/$presentationId", params: { presentationId: created.id } });
  };

  return (
    <AppShell>
      <button onClick={() => navigate({ to: "/" })} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("setup.back")}
      </button>
      <header className="mb-8 space-y-2">
        <span className="eyebrow">Step 1 of 2</span>
        <h1 className="text-3xl text-foreground">{t("setup.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("setup.subtitle")}</p>
      </header>

      <div className="panel space-y-6 p-6">
        <Field label={t("setup.topic")}>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
        </Field>
        <Field label={t("setup.objective")}>
          <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} placeholder="Optional — we will infer it if left blank" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("setup.audience")}><Pick value={audience} options={AUDIENCES} onChange={setAudience} /></Field>
          <Field label={t("setup.purpose")}><Pick value={purpose} options={PURPOSES} onChange={setPurpose} /></Field>
          <Field label={t("setup.type")}><Pick value={type} options={PRESENTATION_TYPES} onChange={setType} /></Field>
          <Field label={t("setup.tone")}><Pick value={tone} options={TONES} onChange={setTone} /></Field>
          <Field label={t("setup.language")}><Pick value={language} options={LANGUAGES} onChange={setLanguage} /></Field>
        </div>
        <Field label={t("setup.length")}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LENGTHS.map((l) => (
              <button
                key={l}
                onClick={() => setLength(l)}
                className={cn(
                  "focus-ring rounded-lg border p-3 text-start transition-colors",
                  length === l ? "border-accent bg-accent-soft" : "border-border hover:border-foreground/30",
                )}
              >
                <div className="text-sm text-foreground">{l}</div>
                <div className="text-xs text-muted-foreground">
                  {l === "Custom" ? "Your call" : `${LENGTH_RANGES[l][0]}–${LENGTH_RANGES[l][1]} slides`}
                </div>
              </button>
            ))}
          </div>
          {length === "Custom" && (
            <Input type="number" min={3} max={30} value={custom} onChange={(e) => setCustom(Number(e.target.value) || 3)} className="mt-2 w-32" />
          )}
        </Field>
        <div className="flex justify-end">
          <Button size="lg" onClick={build} disabled={busy || !topic.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {busy ? t("setup.building") : t("setup.build")}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
