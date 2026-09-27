import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Meridian Studio" },
      { name: "description", content: "Profile, interface language and workspace preferences." },
      { property: "og:title", content: "Settings — Meridian Studio" },
      {
        property: "og:description",
        content: "Profile, interface language and workspace preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { lang, setLang } = useI18n();

  return (
    <AppShell>
      <header className="mb-8 space-y-2">
        <span className="eyebrow">Settings</span>
        <h1 className="text-3xl text-foreground">Ahmed ELmadni</h1>
        <p className="text-sm text-muted-foreground">Preferences for this workspace.</p>
      </header>

      <section className="panel max-w-xl space-y-5 p-6">
        <div className="space-y-1">
          <h2 className="text-base text-foreground">Interface language</h2>
          <p className="text-sm text-muted-foreground">
            Arabic switches the whole interface to right-to-left.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>
            English
          </Button>
          <Button variant={lang === "ar" ? "default" : "outline"} onClick={() => setLang("ar")}>
            العربية
          </Button>
        </div>
      </section>

      <section className="panel mt-5 max-w-xl space-y-2 p-6">
        <h2 className="text-base text-foreground">Account</h2>
        <p className="text-sm text-muted-foreground">
          Sign-in and cloud sync are not switched on yet, so your work is saved in this browser only.
        </p>
      </section>
    </AppShell>
  );
}
