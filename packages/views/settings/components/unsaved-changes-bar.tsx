"use client";

import { Button } from "@multica/ui/components/ui/button";
import { useT } from "../../i18n";

/** Shared floating save bar for settings tabs with explicit save flows.
 * Parents render it only while there is something to save (dirty || saving),
 * so its appearance is itself the "unsaved changes" signal — role="status"
 * makes screen readers announce it. Sticks to the bottom of the settings
 * scroll pane so the action stays reachable however long the tab grows. */
export function UnsavedChangesBar({
  saving,
  disabled,
  onSave,
  onReset,
  saveLabel,
  savingLabel,
}: {
  saving: boolean;
  disabled?: boolean;
  onSave: () => void;
  onReset: () => void;
  saveLabel: string;
  savingLabel: string;
}) {
  const { t } = useT("settings");
  return (
    <div
      role="status"
      className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border bg-background/95 px-4 py-3 shadow-md backdrop-blur motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
    >
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="size-1.5 rounded-full bg-warning" aria-hidden />
        {t(($) => $.save_bar.unsaved)}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" disabled={saving} onClick={onReset}>
          {t(($) => $.save_bar.reset)}
        </Button>
        <Button size="sm" disabled={saving || disabled === true} onClick={onSave}>
          {saving ? savingLabel : saveLabel}
        </Button>
      </div>
    </div>
  );
}
