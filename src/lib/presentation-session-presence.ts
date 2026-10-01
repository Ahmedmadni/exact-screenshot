import { useEffect, useRef, useState } from "react";
import type { CollaborationRole } from "@/lib/types";
import { getCloudSession, supabase } from "@/lib/cloud/supabase";

export interface SessionPresenceParticipant {
  userId: string;
  email: string;
  role: CollaborationRole;
  raisedHand: boolean;
  activeSlideId?: string;
  joinedAt: string;
  isSelf?: boolean;
}

export function usePresentationSessionPresence({
  sessionId,
  role,
  activeSlideId,
  raisedHand,
}: {
  sessionId?: string;
  role: CollaborationRole;
  activeSlideId?: string;
  raisedHand: boolean;
}) {
  const [participants, setParticipants] = useState<SessionPresenceParticipant[]>([]);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const identityRef = useRef<{ userId: string; email: string; role: CollaborationRole } | null>(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!sessionId || !supabase) {
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

      const channel = supabase.channel("presentation-session-presence-" + sessionId, {
        config: { presence: { key: session.user.id } },
      });
      channelRef.current = channel;

      const sync = () => {
        const state = channel.presenceState() as Record<string, Array<Record<string, unknown>>>;
        const next: SessionPresenceParticipant[] = [];
        for (const entries of Object.values(state)) {
          for (const entry of entries) {
            if (typeof entry.userId !== "string") continue;
            next.push({
              userId: entry.userId,
              email: typeof entry.email === "string" ? entry.email : "Team member",
              role: (typeof entry.role === "string" ? entry.role : "viewer") as CollaborationRole,
              raisedHand: entry.raisedHand === true,
              activeSlideId: typeof entry.activeSlideId === "string" ? entry.activeSlideId : undefined,
              joinedAt: typeof entry.joinedAt === "string" ? entry.joinedAt : new Date().toISOString(),
              isSelf: entry.userId === identityRef.current?.userId,
            });
          }
        }
        const unique = new Map<string, SessionPresenceParticipant>();
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
            raisedHand,
            activeSlideId,
            joinedAt: new Date().toISOString(),
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
  }, [sessionId, role]);

  useEffect(() => {
    const channel = channelRef.current;
    const identity = identityRef.current;
    if (!channel || !identity || !subscribedRef.current) return;
    void channel.track({
      ...identity,
      raisedHand,
      activeSlideId,
      joinedAt: new Date().toISOString(),
    });
  }, [raisedHand, activeSlideId]);

  return participants;
}
