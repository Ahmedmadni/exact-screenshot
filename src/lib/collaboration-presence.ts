import { useEffect, useRef, useState } from "react";
import type { CollaborationRole } from "@/lib/types";
import { getCloudSession, supabase } from "@/lib/cloud/supabase";

export interface PresenceParticipant {
  userId: string;
  email: string;
  role: CollaborationRole;
  activeSlideId?: string;
  editingElementId?: string;
  selectedElementIds?: string[];
  editingKind?: "element" | "text";
  textDraft?: string;
  textCaretStart?: number;
  textCaretEnd?: number;
  cursorX?: number;
  cursorY?: number;
  isSelf?: boolean;
  onlineAt: string;
}

export function useCollaborationPresence({
  presentationId,
  enabled,
  role,
  activeSlideId,
  editingElementId,
  selectedElementIds,
  editingKind,
  textDraft,
  textCaretStart,
  textCaretEnd,
  cursor,
}: {
  presentationId: string;
  enabled: boolean;
  role: CollaborationRole;
  activeSlideId?: string;
  editingElementId?: string;
  selectedElementIds?: string[];
  editingKind?: "element" | "text";
  textDraft?: string;
  textCaretStart?: number;
  textCaretEnd?: number;
  cursor?: { x: number; y: number };
}) {
  const [participants, setParticipants] = useState<PresenceParticipant[]>([]);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const identityRef = useRef<Pick<PresenceParticipant, "userId" | "email" | "role"> | null>(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !supabase) {
      setParticipants([]);
      return;
    }

    let alive = true;
    void getCloudSession().then((session) => {
      if (!alive || !session?.user || !supabase) return;
      identityRef.current = {
        userId: session.user.id,
        email: session.user.email ?? "Team member",
        role,
      };

      const channel = supabase.channel("presentation-presence-" + presentationId, {
        config: { presence: { key: session.user.id } },
      });
      channelRef.current = channel;

      const sync = () => {
        const state = channel.presenceState() as Record<string, Array<Record<string, unknown>>>;
        const next: PresenceParticipant[] = [];
        for (const entries of Object.values(state)) {
          for (const entry of entries) {
            if (typeof entry.userId !== "string") continue;
            next.push({
              userId: entry.userId,
              email: typeof entry.email === "string" ? entry.email : "Team member",
              role: (typeof entry.role === "string" ? entry.role : "viewer") as CollaborationRole,
              activeSlideId: typeof entry.activeSlideId === "string" ? entry.activeSlideId : undefined,
              editingElementId: typeof entry.editingElementId === "string" ? entry.editingElementId : undefined,
              selectedElementIds: Array.isArray(entry.selectedElementIds) ? entry.selectedElementIds.filter((value): value is string => typeof value === "string").slice(0, 40) : undefined,
              editingKind: entry.editingKind === "text" || entry.editingKind === "element" ? entry.editingKind : undefined,
              textDraft: typeof entry.textDraft === "string" ? entry.textDraft.slice(0, 4000) : undefined,
              textCaretStart: typeof entry.textCaretStart === "number" ? entry.textCaretStart : undefined,
              textCaretEnd: typeof entry.textCaretEnd === "number" ? entry.textCaretEnd : undefined,
              cursorX: typeof entry.cursorX === "number" ? entry.cursorX : undefined,
              cursorY: typeof entry.cursorY === "number" ? entry.cursorY : undefined,
              isSelf: entry.userId === identityRef.current?.userId,
              onlineAt: typeof entry.onlineAt === "string" ? entry.onlineAt : new Date().toISOString(),
            });
          }
        }
        const unique = new Map<string, PresenceParticipant>();
        next.forEach((item) => unique.set(item.userId, item));
        setParticipants([...unique.values()]);
      };

      channel
        .on("presence", { event: "sync" }, sync)
        .on("presence", { event: "join" }, sync)
        .on("presence", { event: "leave" }, sync)
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED" || !identityRef.current) return;
          subscribedRef.current = true;
          await channel.track({
            ...identityRef.current,
            activeSlideId,
            editingElementId,
            selectedElementIds: selectedElementIds?.slice(0, 40),
            editingKind,
            textDraft: textDraft?.slice(0, 4000),
            textCaretStart,
            textCaretEnd,
            cursorX: cursor?.x,
            cursorY: cursor?.y,
            onlineAt: new Date().toISOString(),
          });
        });
    });

    return () => {
      alive = false;
      subscribedRef.current = false;
      const channel = channelRef.current;
      channelRef.current = null;
      identityRef.current = null;
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [enabled, presentationId, role]);

  useEffect(() => {
    const channel = channelRef.current;
    const identity = identityRef.current;
    if (!channel || !identity || !subscribedRef.current) return;
    void channel.track({
      ...identity,
      activeSlideId,
      editingElementId,
      selectedElementIds: selectedElementIds?.slice(0, 40),
      editingKind,
      textDraft: textDraft?.slice(0, 4000),
      textCaretStart,
      textCaretEnd,
      cursorX: cursor?.x,
      cursorY: cursor?.y,
      onlineAt: new Date().toISOString(),
    });
  }, [
    activeSlideId,
    editingElementId,
    selectedElementIds?.join("|"),
    editingKind,
    textDraft,
    textCaretStart,
    textCaretEnd,
    cursor?.x,
    cursor?.y,
  ]);

  return participants;
}
