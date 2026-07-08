"use client";

import { CircleHelp } from "lucide-react";
import { useDocsViewerStore } from "@multica/core/docs";
import { useT } from "../i18n";

export function HelpLauncher() {
  const { t } = useT("layout");
  const openDocs = useDocsViewerStore((s) => s.openDocs);

  return (
    <button
      type="button"
      aria-label={t(($) => $.help.docs)}
      title={t(($) => $.help.docs)}
      onClick={() => openDocs()}
      className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground"
    >
      <CircleHelp className="size-4" />
    </button>
  );
}
