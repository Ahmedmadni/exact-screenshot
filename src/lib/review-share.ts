import { cloudConfigured, getCloudSession, supabase } from "@/lib/cloud/supabase";
import type { Presentation, ReviewComment } from "@/lib/types";

export interface ReviewShareMeta {
  id: string;
  presentation_id: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface SharedReviewPayload {
  presentation: Presentation;
  comments: ReviewComment[];
  expiresAt?: string | null;
}

function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  bytes.forEach((value) => { binary += String.fromCharCode(value); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function createReviewShare(presentationId: string, days = 7) {
  if (!cloudConfigured || !supabase) throw new Error("Cloud sharing is not configured.");
  const session = await getCloudSession();
  if (!session?.user) throw new Error("Sign in before creating a review link.");

  const shareToken = token();
  const expiresAt = new Date(Date.now() + Math.max(1, days) * 86_400_000).toISOString();
  const { data, error } = await supabase.rpc("create_review_share", {
    p_presentation_id: presentationId,
    p_share_token: shareToken,
    p_expires_at: expiresAt,
  });
  if (error) throw error;
  return {
    id: data?.id as string,
    token: shareToken,
    expiresAt,
    url: window.location.origin + "/review/" + encodeURIComponent(shareToken),
  };
}

export async function listReviewShares(presentationId: string): Promise<ReviewShareMeta[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("review_share_links")
    .select("id,presentation_id,expires_at,revoked_at,created_at")
    .eq("presentation_id", presentationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReviewShareMeta[];
}

export async function revokeReviewShare(id: string) {
  if (!supabase) throw new Error("Cloud sharing is not configured.");
  const { error } = await supabase.from("review_share_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function loadSharedReview(shareToken: string): Promise<SharedReviewPayload | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_review_share", { p_share_token: shareToken });
  if (error) throw error;
  return data ? data as SharedReviewPayload : null;
}

export async function addSharedReviewComment(
  shareToken: string,
  authorName: string,
  body: string,
  slideId?: string,
): Promise<ReviewComment> {
  if (!supabase) throw new Error("Cloud sharing is not configured.");
  const { data, error } = await supabase.rpc("add_review_share_comment", {
    p_share_token: shareToken,
    p_author_name: authorName,
    p_comment_body: body,
    p_slide_id: slideId ?? null,
  });
  if (error) throw error;
  return data as ReviewComment;
}
