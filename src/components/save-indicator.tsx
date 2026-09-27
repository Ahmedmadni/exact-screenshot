import { Check, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type SaveState = "idle" | "saving" | "saved";

export function SaveIndicator({ state }: { state: SaveState }) {
  const { t } = useI18n();
  if (state === "idle") return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {state === "saving" ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Check className="size-3.5 text-success" />
      )}
      {state === "saving" ? t("save.saving") : t("save.saved")}
    </span>
  );
}

/** Tracks the transient Saving… → Saved chrome for autosaving fields. */
export function useSaveState() {
  return null;
}
