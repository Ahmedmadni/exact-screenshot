import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, LockKeyhole, LogIn, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptCollaborationInvite } from "@/lib/collaboration";
import { cloudConfigured, supabase } from "@/lib/cloud/supabase";
import { presentationRepository } from "@/lib/data/store";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Team Invitation — Meridian Studio" },
      { name: "description", content: "Accept a secure presentation collaboration invitation." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CollaborationInvitePage,
});

function CollaborationInvitePage() {
  const { token } = Route.useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(cloudConfigured);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"signin" | "accept" | null>(null);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState<{ title: string; id: string; role: string } | null>(null);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) {
        setSession(data.session);
        setEmail(data.session?.user.email ?? "");
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

  const signIn = async () => {
    if (!supabase || !email.trim() || !password) return;
    setBusy("signin");
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(null);
    if (authError) setError(authError.message);
  };

  const accept = async () => {
    if (!session) return;
    setBusy("accept");
    setError("");
    try {
      const envelope = await acceptCollaborationInvite(token);
      const presentation = {
        ...envelope.presentation,
        collaboration: {
          enabled: true,
          role: envelope.role,
          ownerUserId: envelope.ownerUserId,
          revision: envelope.revision,
          liveUpdatedAt: envelope.updatedAt,
        },
      };
      presentationRepository.upsertCollaborative(presentation);
      setAccepted({ title: presentation.title, id: presentation.id, role: envelope.role });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not accept this invitation.");
    } finally {
      setBusy(null);
    }
  };

  if (!cloudConfigured || !supabase) {
    return (
      <PageCard>
        <LockKeyhole className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-4 text-xl text-foreground">Cloud collaboration is unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">This deployment needs Supabase configuration before team invitations can be accepted.</p>
      </PageCard>
    );
  }

  if (checking) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  if (accepted) {
    return (
      <PageCard>
        <CheckCircle2 className="mx-auto size-9 text-emerald-600" />
        <h1 className="mt-4 text-xl text-foreground">Invitation accepted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You joined <strong className="text-foreground">{accepted.title}</strong> as {accepted.role}.
        </p>
        <Button className="mt-5" onClick={() => { window.location.href = "/presentations/" + encodeURIComponent(accepted.id) + "/editor"; }}>
          <Users className="size-4" /> Open presentation
        </Button>
      </PageCard>
    );
  }

  if (!session) {
    return (
      <PageCard>
        <Users className="mx-auto size-8 text-accent" />
        <h1 className="mt-4 text-xl text-foreground">Join presentation team</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in with the exact email address that received this invitation.</p>
        <div className="mt-5 space-y-3 text-start">
          <Input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>}
          <Button className="w-full" onClick={() => void signIn()} disabled={busy === "signin" || !email.trim() || !password}>
            {busy === "signin" ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />} Sign in
          </Button>
        </div>
      </PageCard>
    );
  }

  return (
    <PageCard>
      <Users className="mx-auto size-8 text-accent" />
      <h1 className="mt-4 text-xl text-foreground">Collaboration invitation</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as <strong className="text-foreground">{session.user.email}</strong>. Accepting will add this presentation to your local library and enable live team access.
      </p>
      {error && <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>}
      <Button className="mt-5" onClick={() => void accept()} disabled={busy === "accept"}>
        {busy === "accept" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Accept invitation
      </Button>
    </PageCard>
  );
}

function PageCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <main className="panel w-full max-w-md p-8 text-center">{children}</main>
    </div>
  );
}
