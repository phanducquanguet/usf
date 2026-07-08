"use client";

import { Suspense, lazy, useState } from "react";
import { CircleHelp } from "lucide-react";
import { useT } from "../i18n";

// Lazy so the bundled docs content stays out of the initial bundle until
// the help button is first clicked.
const DocsDialog = lazy(() => import("./docs-dialog"));

export function HelpLauncher() {
  const { t } = useT("layout");
  const [open, setOpen] = useState(false);
  // Latch: keep the dialog mounted after first open so closing animates and
  // the reading position survives reopening.
  const [mounted, setMounted] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={t(($) => $.help.docs)}
        title={t(($) => $.help.docs)}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground"
      >
        <CircleHelp className="size-4" />
      </button>
      {mounted && (
        <Suspense fallback={null}>
          <DocsDialog open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
