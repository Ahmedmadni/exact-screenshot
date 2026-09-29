import type { CollaborationRole, Presentation, ReviewComment } from "@/lib/types";
import { cloudConfigured, getCloudSession, supabase } from "@/lib/cloud/supabase";

export interface LivePresentationEnvelope {
  presentation: Presentation;
  revision: number;
  role: CollaborationRole;
  ownerUserId: string;
  updatedAt?: string;
}

export interface LiveSaveResult {
  ok: boolean;
  conflict: boolean;
  revision: number;
  presentation?: Presentation;
  updatedAt?: string;
  merged?: boolean;
  reason?: string;
  elementId?: string;
}

export interface LiveElementChange {
  id: string;
  before: unknown | null;
  after: unknown | null;
}

export interface CollaborationMember {
  userId: string;
  email?: string | null;
  role: Exclude<CollaborationRole, "owner">;
  createdAt: string;
}

export interface CollaborationActivity {
  id: string;
  presentationId: string;
  actorUserId: string;
  actorEmail?: string | null;
  eventType: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface CollaborationInvite {
  id: string;
  presentation_id: string;
  invited_email: string;
  role: Exclude<CollaborationRole, "owner">;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

function secureToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  bytes.forEach((value) => { binary += String.fromCharCode(value); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function requireCloud() {
  if (!cloudConfigured || !supabase) throw new Error("Cloud collaboration is not configured.");
  return supabase;
}

export async function enableLiveCollaboration(presentationId: string): Promise<LivePresentationEnvelope> {
  const client = requireCloud();
  const session = await getCloudSession();
  if (!session?.user) throw new Error("Sign in before enabling collaboration.");
  const { data, error } = await client.rpc("enable_live_collaboration", { p_presentation_id: presentationId });
  if (error) throw error;
  return data as LivePresentationEnvelope;
}

export async function getLivePresentation(presentationId: string): Promise<LivePresentationEnvelope | null> {
  const client = requireCloud();
  const { data, error } = await client.rpc("get_live_presentation", { p_presentation_id: presentationId });
  if (error) throw error;
  return data ? data as LivePresentationEnvelope : null;
}

export async function saveLivePresentation(
  presentationId: string,
  expectedRevision: number,
  presentation: Presentation,
): Promise<LiveSaveResult> {
  const client = requireCloud();
  const { data, error } = await client.rpc("save_live_presentation", {
    p_presentation_id: presentationId,
    p_expected_revision: expectedRevision,
    p_payload: presentation,
  });
  if (error) throw error;
  return data as LiveSaveResult;
}

export async function applyLiveElementChanges(
  presentationId: string,
  baseRevision: number,
  slideId: string,
  changes: LiveElementChange[],
): Promise<LiveSaveResult> {
  const client = requireCloud();
  const { data, error } = await client.rpc("apply_live_element_changes", {
    p_presentation_id: presentationId,
    p_base_revision: baseRevision,
    p_slide_id: slideId,
    p_changes: changes,
  });
  if (error) throw error;
  return data as LiveSaveResult;
}

export async function createCollaborationInvite(
  presentationId: string,
  email: string,
  role: Exclude<CollaborationRole, "owner">,
  days = 7,
) {
  const client = requireCloud();
  const inviteToken = secureToken();
  const expiresAt = new Date(Date.now() + Math.max(1, days) * 86_400_000).toISOString();
  const { data, error } = await client.rpc("create_collaboration_invite", {
    p_presentation_id: presentationId,
    p_invited_email: email.trim().toLowerCase(),
    p_role: role,
    p_invite_token: inviteToken,
    p_expires_at: expiresAt,
  });
  if (error) throw error;
  await recordCollaborationActivity(presentationId, "invite_created", { email: email.trim().toLowerCase(), role });
  return {
    id: data?.id as string,
    token: inviteToken,
    expiresAt,
    url: window.location.origin + "/invite/" + encodeURIComponent(inviteToken),
  };
}

export async function acceptCollaborationInvite(inviteToken: string): Promise<LivePresentationEnvelope> {
  const client = requireCloud();
  const { data, error } = await client.rpc("accept_collaboration_invite", { p_invite_token: inviteToken });
  if (error) throw error;
  const envelope = data as LivePresentationEnvelope;
  await recordCollaborationActivity(envelope.presentation.id, "member_joined", { role: envelope.role });
  return envelope;
}

export async function listPresentationTeam(presentationId: string): Promise<CollaborationMember[]> {
  const client = requireCloud();
  const { data, error } = await client.rpc("list_presentation_team", { p_presentation_id: presentationId });
  if (error) throw error;
  return (data ?? []) as CollaborationMember[];
}

export async function listCollaborationInvites(presentationId: string): Promise<CollaborationInvite[]> {
  const client = requireCloud();
  const { data, error } = await client
    .from("collaboration_invites")
    .select("id,presentation_id,invited_email,role,expires_at,accepted_at,revoked_at,created_at")
    .eq("presentation_id", presentationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CollaborationInvite[];
}

export async function revokeCollaborationInvite(id: string) {
  const client = requireCloud();
  const { error } = await client.rpc("revoke_collaboration_invite", { p_invite_id: id });
  if (error) throw error;
}

export async function removeCollaborator(presentationId: string, userId: string) {
  const client = requireCloud();
  const { error } = await client.rpc("remove_presentation_collaborator", {
    p_presentation_id: presentationId,
    p_user_id: userId,
  });
  if (error) throw error;
  await recordCollaborationActivity(presentationId, "member_removed", { userId });
}

export async function updateCollaboratorRole(
  presentationId: string,
  userId: string,
  role: Exclude<CollaborationRole, "owner">,
) {
  const client = requireCloud();
  const { error } = await client.rpc("update_presentation_collaborator_role", {
    p_presentation_id: presentationId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw error;
  await recordCollaborationActivity(presentationId, "role_changed", { userId, role });
}

export async function addTeamReviewComment(
  presentationId: string,
  body: string,
  slideId?: string,
  elementId?: string,
): Promise<ReviewComment> {
  const client = requireCloud();
  const { data, error } = await client.rpc("add_team_review_comment", {
    p_presentation_id: presentationId,
    p_comment_body: body,
    p_slide_id: slideId ?? null,
    p_element_id: elementId ?? null,
  });
  if (error) throw error;
  await recordCollaborationActivity(presentationId, "comment_added", { slideId, elementId });
  return data as ReviewComment;
}

export async function listTeamReviewComments(presentationId: string): Promise<ReviewComment[]> {
  const client = requireCloud();
  const { data, error } = await client.rpc("list_team_review_comments", { p_presentation_id: presentationId });
  if (error) throw error;
  return (data ?? []) as ReviewComment[];
}


export async function recordCollaborationActivity(
  presentationId: string,
  eventType: string,
  details: Record<string, unknown> = {},
) {
  const client = requireCloud();
  const { error } = await client.rpc("record_collaboration_activity", {
    p_presentation_id: presentationId,
    p_event_type: eventType,
    p_details: details,
  });
  if (error) throw error;
}

export async function listCollaborationActivity(
  presentationId: string,
  limit = 30,
): Promise<CollaborationActivity[]> {
  const client = requireCloud();
  const { data, error } = await client.rpc("list_collaboration_activity", {
    p_presentation_id: presentationId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as CollaborationActivity[];
}
