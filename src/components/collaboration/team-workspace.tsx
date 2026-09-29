import { Copy, Loader2, MailPlus, RefreshCw, Shield, Trash2, UserCog, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { CollaborationRole, Presentation } from "@/lib/types";
import {
  createCollaborationInvite,
  enableLiveCollaboration,
  listCollaborationActivity,
  listCollaborationInvites,
  listPresentationTeam,
  removeCollaborator,
  revokeCollaborationInvite,
  updateCollaboratorRole,
  type CollaborationActivity,
  type CollaborationInvite,
  type CollaborationMember,
} from "@/lib/collaboration";
import { cloudConfigured, getCloudSession } from "@/lib/cloud/supabase";
import { databaseSnapshot, presentationRepository, replaceDatabase } from "@/lib/data/store";
import { syncDatabaseWithCloud } from "@/lib/cloud/sync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MemberRole = Exclude<CollaborationRole, "owner">;

export function TeamWorkspace({ presentation: p }: { presentation: Presentation }) {
  const [members, setMembers] = useState<CollaborationMember[]>([]);
  const [invites, setInvites] = useState<CollaborationInvite[]>([]);
  const [activity, setActivity] = useState<CollaborationActivity[]>([]);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [latestUrl, setLatestUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const collaboration = p.collaboration;
  const isOwner = !collaboration || collaboration.role === "owner";

  const refresh = async () => {
    if (!cloudConfigured || !p.collaboration?.enabled) return;
    try {
      const session = await getCloudSession();
      setOwnerEmail(isOwner ? (session?.user.email ?? "") : "");
      const [team, events] = await Promise.all([
        listPresentationTeam(p.id),
        listCollaborationActivity(p.id, 20),
      ]);
      setMembers(team);
      setActivity(events);
      if (isOwner) setInvites(await listCollaborationInvites(p.id));
      else setInvites([]);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { void refresh(); }, [p.id, p.collaboration?.enabled, p.collaboration?.role]);

  if (!cloudConfigured) {
    return (
      <section className="panel border-dashed p-6">
        <div className="flex items-center gap-2"><Users className="size-5 text-muted-foreground" /><h2 className="text-base text-foreground">Live team collaboration</h2></div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Configure Supabase in Settings to enable team roles, invitations, live presence and revision-safe collaborative editing. This presentation remains fully usable in local-only mode.</p>
      </section>
    );
  }

  const enable = async () => {
    setBusy("enable");
    try {
      const synced = await syncDatabaseWithCloud(databaseSnapshot());
      replaceDatabase(synced.database);
      const envelope = await enableLiveCollaboration(p.id);
      presentationRepository.update(p.id, {
        collaboration: {
          enabled: true,
          role: "owner",
          ownerUserId: envelope.ownerUserId,
          revision: envelope.revision,
          liveUpdatedAt: envelope.updatedAt,
        },
      });
      toast.success("Live collaboration enabled for this presentation.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not enable collaboration.");
    } finally {
      setBusy(null);
    }
  };

  if (!collaboration?.enabled) {
    return (
      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow">Team collaboration</span>
            <h2 className="mt-1 text-xl text-foreground">Enable live collaboration for this deck</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">This is opt-in per presentation. Enabling creates a revisioned cloud document, while the normal local-first behavior remains unchanged for every other presentation.</p>
          </div>
          <Button onClick={() => void enable()} disabled={busy === "enable"}>
            {busy === "enable" ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />} Enable collaboration
          </Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Capability title="Editor" text="Can edit and save using revision conflict protection." />
          <Capability title="Reviewer" text="Can open the deck and review it without edit permission." />
          <Capability title="Viewer" text="Read-only access to the live presentation." />
        </div>
      </section>
    );
  }

  const invite = async () => {
    if (!email.trim()) return;
    setBusy("invite");
    try {
      const created = await createCollaborationInvite(p.id, email, role, 7);
      setLatestUrl(created.url);
      await navigator.clipboard?.writeText(created.url);
      setEmail("");
      toast.success("7-day team invitation created and copied.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not create invitation.");
    } finally {
      setBusy(null);
    }
  };

  const changeRole = async (userId: string, next: MemberRole) => {
    setBusy("role:" + userId);
    try {
      await updateCollaboratorRole(p.id, userId, next);
      toast.success("Team role updated.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Could not update role.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (userId: string) => {
    setBusy("remove:" + userId);
    try {
      await removeCollaborator(p.id, userId);
      toast.success("Collaborator removed.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Could not remove collaborator.");
    } finally {
      setBusy(null);
    }
  };

  const activeInvites = invites.filter((invite) => !invite.accepted_at && !invite.revoked_at && new Date(invite.expires_at).getTime() > Date.now());

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Your role" value={collaboration.role} detail={collaboration.role === "owner" ? "Full team administration" : collaboration.role === "editor" ? "Live editing enabled" : "Read-only collaboration"} />
        <Metric label="Team members" value={String(members.length + 1)} detail="Including presentation owner" />
        <Metric label="Live revision" value={"r" + collaboration.revision} detail={collaboration.liveUpdatedAt ? new Date(collaboration.liveUpdatedAt).toLocaleString() : "Revision-safe autosave"} />
      </section>

      {isOwner && (
        <section className="panel p-5">
          <div className="flex items-center gap-2"><MailPlus className="size-4 text-accent" /><h2 className="text-base text-foreground">Invite team member</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">Invitations are bound to an email address and expire after 7 days.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_170px_auto]">
            <Input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Select value={role} onValueChange={(value) => setRole(value as MemberRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="reviewer">Reviewer</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => void invite()} disabled={!email.trim() || busy === "invite"}>
              {busy === "invite" ? <Loader2 className="size-4 animate-spin" /> : <MailPlus className="size-4" />} Invite
            </Button>
          </div>
          {latestUrl && (
            <div className="mt-3 flex gap-2">
              <Input readOnly value={latestUrl} className="font-mono text-xs" />
              <Button size="icon" variant="outline" aria-label="Copy invite" onClick={() => { void navigator.clipboard?.writeText(latestUrl); toast.success("Invitation link copied."); }}>
                <Copy className="size-4" />
              </Button>
            </div>
          )}
        </section>
      )}

      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-base text-foreground">Presentation team</h2><p className="mt-1 text-sm text-muted-foreground">Roles are enforced by the server, not only hidden in the UI.</p></div>
          <Button size="sm" variant="ghost" onClick={() => void refresh()}><RefreshCw className="size-4" /> Refresh</Button>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
            <div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-accent/10 text-xs font-semibold text-accent">O</span><div><div className="text-sm font-medium text-foreground">{ownerEmail || "Presentation owner"}</div><div className="text-[11px] text-muted-foreground">Owner</div></div></div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Owner</span>
          </div>

          {members.map((member) => (
            <div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground">{(member.email ?? "T").slice(0,1).toUpperCase()}</span>
                <div><div className="text-sm font-medium text-foreground">{member.email ?? member.userId}</div><div className="text-[11px] text-muted-foreground">Joined {new Date(member.createdAt).toLocaleDateString()}</div></div>
              </div>
              {isOwner ? (
                <div className="flex items-center gap-2">
                  <Select value={member.role} onValueChange={(value) => void changeRole(member.userId, value as MemberRole)}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="editor">Editor</SelectItem><SelectItem value="reviewer">Reviewer</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" disabled={busy === "remove:" + member.userId} onClick={() => void remove(member.userId)} aria-label="Remove collaborator">
                    {busy === "remove:" + member.userId ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </Button>
                </div>
              ) : <span className="rounded-full bg-muted px-2 py-1 text-[10px] capitalize text-muted-foreground">{member.role}</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base text-foreground">Team activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">Recent collaboration events for this presentation.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => void refresh()}><RefreshCw className="size-4" /> Refresh</Button>
        </div>
        <div className="mt-4 space-y-2">
          {activity.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">No team activity recorded yet.</div>
          ) : activity.map((event) => (
            <div key={event.id} className="flex items-start gap-3 rounded-md border border-border p-3">
              <span className="mt-1 size-2 shrink-0 rounded-full bg-accent" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-foreground">{activityLabel(event)}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {event.actorEmail || "Team member"} · {new Date(event.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {isOwner && activeInvites.length > 0 && (
        <section className="panel p-5">
          <div className="flex items-center gap-2"><Shield className="size-4 text-muted-foreground" /><h2 className="text-base text-foreground">Pending invitations</h2></div>
          <div className="mt-3 space-y-2">
            {activeInvites.map((invite) => (
              <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                <div><div className="text-sm text-foreground">{invite.invited_email}</div><div className="mt-0.5 text-[11px] text-muted-foreground capitalize">{invite.role} · expires {new Date(invite.expires_at).toLocaleString()}</div></div>
                <Button size="sm" variant="ghost" onClick={async () => { setBusy("invite:" + invite.id); try { await revokeCollaborationInvite(invite.id); toast.success("Invitation revoked."); await refresh(); } finally { setBusy(null); } }}>
                  {busy === "invite:" + invite.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Revoke
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function activityLabel(event: CollaborationActivity) {
  const details = event.details ?? {};
  switch (event.eventType) {
    case "invite_created": return "Invitation created for " + String(details.email ?? "team member") + " as " + String(details.role ?? "member") + ".";
    case "invite_revoked": return "Invitation revoked for " + String(details.email ?? "team member") + ".";
    case "member_joined": return "A team member joined as " + String(details.role ?? "member") + ".";
    case "member_removed": return "A collaborator was removed.";
    case "role_changed": return "A collaborator role changed to " + String(details.role ?? "new role") + ".";
    case "comment_added": return "A live review comment was added.";
    case "conflict_detected": return "A revision conflict was detected.";
    case "conflict_resolved": return "A revision conflict was resolved using the latest team version.";
    case "opened_editor": return "The collaborative editor was opened.";
    case "opened_presenter": return "Presenter View was opened.";
    default: return event.eventType.replaceAll("_", " ");
  }
}

function Capability({ title, text }: { title: string; text: string }) {
  return <div className="rounded-md border border-border p-4"><div className="text-sm font-medium text-foreground">{title}</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></div>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="panel p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-2 text-xl font-semibold capitalize text-foreground">{value}</div><div className="mt-1 text-[11px] text-muted-foreground">{detail}</div></div>;
}
