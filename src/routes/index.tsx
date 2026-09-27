import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Paperclip, Sparkles, PresentationIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PresentationCard } from "@/components/presentation-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { usePresentations } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meridian Studio — AI presentation planning" },
      { name: "description", content: "Turn an idea into a boardroom-ready presentation blueprint in minutes." },
      { property: "og:title", content: "Meridian Studio — AI presentation planning" },
      { property: "og:description", content: "Turn an idea into a boardroom-ready presentation blueprint in minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const EXAMPLES = [
  "Digital transformation strategy 2027 for the board",
  "Series A pitch for a logistics SaaS startup",
  "Quarterly business review for executive management",
];

function Home() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const presentations = usePresentations();
  const [topic, setTopic] = useState("");
  const [greeting, setGreeting] = useState("greeting.morning");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "greeting.morning" : h < 18 ? "greeting.afternoon" : "greeting.evening");
  }, []);

  const go = (value = topic) => {
    if (!value.trim()) return;
    navigate({ to: "/new", search: { topic: value.trim() } });
  };

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl space-y-6 py-6 text-center">
        <span className="eyebrow">{t(greeting)}, Ahmed</span>
        <h1 className="text-3xl text-foreground sm:text-4xl">{t("home.heading")}</h1>
        <div className="panel p-3 text-start shadow-lift">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) go();
            }}
            rows={3}
            placeholder={t("home.placeholder")}
            className="w-full resize-none bg-transparent p-2 text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/assets">
                <Paperclip className="size-4" /> {t("home.attach")}
              </Link>
            </Button>
            <Button onClick={() => go()} disabled={!topic.trim()}>
              <Sparkles className="size-4" /> {t("home.generate")}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => go(ex)}
              className="focus-ring rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-foreground">{t("home.recent")}</h2>
          <Link to="/presentations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {t("home.viewAll")} <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </div>
        {presentations.length === 0 ? (
          <EmptyState
            icon={PresentationIcon}
            title="Your first deck starts with one sentence"
            description="Describe the idea above and we will shape the audience, story and slide map for you."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {presentations.slice(0, 6).map((p) => (
              <PresentationCard key={p.id} presentation={p} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
