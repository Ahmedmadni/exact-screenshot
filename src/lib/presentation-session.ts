import type {
  PresentationSession,
  PresentationSessionItem,
  PresentationSessionItemKind,
  PresentationSessionItemStatus,
} from "@/lib/types";
import { supabase } from "@/lib/cloud/supabase";

function requireCloud() {
  if (!supabase) throw new Error("Cloud presentation sessions are not configured.");
  return supabase;
}

export async function startPresentationSession(
  presentationId: string,
  title: string,
  currentSlideId?: string,
  currentSlideIndex = 0,
): Promise<PresentationSession> {
  const client = requireCloud();
  const { data, error } = await client.rpc("start_presentation_session", {
    p_presentation_id: presentationId,
    p_title: title,
    p_current_slide_id: currentSlideId ?? null,
    p_current_slide_index: currentSlideIndex,
  });
  if (error) throw error;
  return data as PresentationSession;
}

export async function getActivePresentationSession(
  presentationId: string,
): Promise<PresentationSession | null> {
  const client = requireCloud();
  const { data, error } = await client.rpc("get_active_presentation_session", {
    p_presentation_id: presentationId,
  });
  if (error) throw error;
  return data ? (data as PresentationSession) : null;
}

export async function listPresentationSessions(
  presentationId: string,
  limit = 20,
): Promise<PresentationSession[]> {
  const client = requireCloud();
  const { data, error } = await client.rpc("list_presentation_sessions", {
    p_presentation_id: presentationId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as PresentationSession[];
}

export async function updatePresentationSessionSlide(
  sessionId: string,
  slideId: string,
  slideIndex: number,
): Promise<PresentationSession> {
  const client = requireCloud();
  const { data, error } = await client.rpc("update_presentation_session_slide", {
    p_session_id: sessionId,
    p_slide_id: slideId,
    p_slide_index: slideIndex,
  });
  if (error) throw error;
  return data as PresentationSession;
}

export async function endPresentationSession(
  sessionId: string,
): Promise<PresentationSession> {
  const client = requireCloud();
  const { data, error } = await client.rpc("end_presentation_session", {
    p_session_id: sessionId,
  });
  if (error) throw error;
  return data as PresentationSession;
}

export async function addPresentationSessionItem(input: {
  sessionId: string;
  kind: PresentationSessionItemKind;
  body: string;
  slideId?: string;
  assignee?: string;
  dueDate?: string;
}): Promise<PresentationSessionItem> {
  const client = requireCloud();
  const { data, error } = await client.rpc("add_presentation_session_item", {
    p_session_id: input.sessionId,
    p_kind: input.kind,
    p_body: input.body,
    p_slide_id: input.slideId ?? null,
    p_assignee: input.assignee ?? null,
    p_due_date: input.dueDate ?? null,
  });
  if (error) throw error;
  return data as PresentationSessionItem;
}

export async function updatePresentationSessionItem(input: {
  itemId: string;
  status?: PresentationSessionItemStatus;
  resolution?: string;
  assignee?: string;
  dueDate?: string;
}): Promise<PresentationSessionItem> {
  const client = requireCloud();
  const { data, error } = await client.rpc("update_presentation_session_item", {
    p_item_id: input.itemId,
    p_status: input.status ?? null,
    p_resolution: input.resolution ?? null,
    p_assignee: input.assignee ?? null,
    p_due_date: input.dueDate ?? null,
  });
  if (error) throw error;
  return data as PresentationSessionItem;
}

export async function listPresentationSessionItems(
  sessionId: string,
): Promise<PresentationSessionItem[]> {
  const client = requireCloud();
  const { data, error } = await client.rpc("list_presentation_session_items", {
    p_session_id: sessionId,
  });
  if (error) throw error;
  return (data ?? []) as PresentationSessionItem[];
}
