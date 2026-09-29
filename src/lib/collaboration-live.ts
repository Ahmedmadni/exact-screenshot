import { useEffect } from "react";
import type { CollaborationState, Presentation } from "@/lib/types";
import { presentationRepository } from "@/lib/data/store";
import { supabase } from "@/lib/cloud/supabase";

export function useReadOnlyLivePresentation(
  presentationId: string,
  collaboration?: CollaborationState,
) {
  useEffect(() => {
    if (!collaboration?.enabled || !supabase) return;

    const channel = supabase
      .channel("readonly-live-document-" + presentationId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "presentation_live_documents",
          filter: "presentation_id=eq." + presentationId,
        },
        (event) => {
          const row = event.new as Record<string, unknown>;
          const revision = Number(row.revision ?? 0);
          const remote = row.payload as Presentation | undefined;
          if (!remote || !Number.isFinite(revision) || revision <= collaboration.revision) return;

          presentationRepository.upsertCollaborative({
            ...remote,
            collaboration: {
              ...collaboration,
              revision,
              liveUpdatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
            },
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [presentationId, collaboration?.enabled, collaboration?.role, collaboration?.revision]);
}
