import { createFileRoute } from "@tanstack/react-router";
import { Cloud, Loader2, LogIn, LogOut, RefreshCw, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cloudConfigured, supabase } from "@/lib/cloud/supabase";
import { syncDatabaseWithCloud } from "@/lib/cloud/sync";
import { databaseSnapshot, replaceDatabase } from "@/lib/data/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Meridian Studio" },
      { name: "description", content: "Profile, interface language and workspace preferences." },
      { property: "og:title", content: "Settings — Meridian Studio" },
      { property: "og:description", content: "Profile, interface language and workspace preferences." },
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
        <h1 className="text-3xl text-foreground">Workspace settings</h1>
        <p className="text-sm text-muted-foreground">Interface, account and cloud persistence.</p>
      </header>

      <section className="panel max-w-2xl space-y-5 p-6">
        <div className="space-y-1">
          <h2 className="text-base text-foreground">Interface language</h2>
          <p className="text-sm text-muted-foreground">Arabic switches the whole interface to right-to-left.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>English</Button>
          <Button variant={lang === "ar" ? "default" : "outline"} onClick={() => setLang("ar")}>العربية</Button>
        </div>
      </section>

      <section className="panel mt-5 max-w-2xl space-y-2 p-6">
        <h2 className="text-base text-foreground">Presentation intelligence</h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-foreground">{cloudConfigured ? "Cloud AI + Smart fallback" : "Local Smart planner"}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {cloudConfigured
                ? "The app tries the authenticated Edge Function first and automatically falls back to the deterministic local planner if cloud AI is unavailable."
                : "No cloud AI endpoint is configured, so planning and slide rewrites use the deterministic local engine."}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cloudConfigured ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
            {cloudConfigured ? "Hybrid" : "Local"}
          </span>
        </div>
      </section>

      <CloudAccount />
    </AppShell>
  );
}

function CloudAccount() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(cloudConfigured);
  const [busy, setBusy] = useState<"signin" | "signup" | "sync" | "signout" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) {
        setSession(data.session);
        setChecking(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (alive) setSession(next);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!cloudConfigured || !supabase) {
    return (
      <section className="panel mt-5 max-w-2xl space-y-3 p-6">
        <div className="flex items-center gap-2">
          <Cloud className="size-5 text-muted-foreground" />
          <h2 className="text-base text-foreground">Cloud persistence</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          The app is currently running in local-only mode. Add Supabase environment variables to enable accounts and sync without disabling local storage.
        </p>
        <div className="rounded-md border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
          VITE_SUPABASE_URL<br />
          VITE_SUPABASE_PUBLISHABLE_KEY
        </div>
      </section>
    );
  }

  if (checking) {
    return (
      <section className="panel mt-5 flex max-w-2xl items-center gap-3 p-6">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking cloud session…</span>
      </section>
    );
  }

  const signIn = async () => {
    if (!email.trim() || !password) return;
    setBusy("signin");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success("Signed in.");
  };

  const signUp = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error("Use a valid email and a password with at least 6 characters.");
      return;
    }
    setBusy("signup");
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(null);
    if (error) toast.error(error.message);
    else if (!data.session) toast.success("Account created. Check your email to confirm the address.");
    else toast.success("Account created and signed in.");
  };

  const signOut = async () => {
    setBusy("signout");
    const { error } = await supabase.auth.signOut();
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success("Signed out. Local data remains in this browser.");
  };

  const sync = async () => {
    setBusy("sync");
    try {
      const result = await syncDatabaseWithCloud(databaseSnapshot());
      replaceDatabase(result.database);
      toast.success(`Cloud sync complete · ${result.pulled} pulled · ${result.pushed} pushed`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cloud sync failed.");
    } finally {
      setBusy(null);
    }
  };

  if (!session) {
    return (
      <section className="panel mt-5 max-w-2xl space-y-5 p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cloud className="size-5 text-accent" />
            <h2 className="text-base text-foreground">Cloud account</h2>
          </div>
          <p className="text-sm text-muted-foreground">Sign in to sync presentations, brand kits, assets and saved templates across browsers.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={signIn} disabled={!!busy}>
            {busy === "signin" ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />} Sign in
          </Button>
          <Button variant="outline" onClick={signUp} disabled={!!busy}>
            {busy === "signup" ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Create account
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel mt-5 max-w-2xl space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cloud className="size-5 text-accent" />
            <h2 className="text-base text-foreground">Cloud sync enabled</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{session.user.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} disabled={!!busy}>
          {busy === "signout" ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />} Sign out
        </Button>
      </div>
      <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Sync merges local and cloud records by their most recent update time. Local storage remains available as an offline fallback.
      </div>
      <Button onClick={sync} disabled={!!busy}>
        {busy === "sync" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Sync now
      </Button>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
