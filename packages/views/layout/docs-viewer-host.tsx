"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import { useDocsViewerStore } from "@multica/core/docs";

// Lazy so the bundled docs content stays out of the initial bundle until the
// viewer is first opened.
const DocsDialog = lazy(() => import("./docs-dialog"));

/**
 * Single global mount for the in-app docs viewer. Mount once near the app root
 * so any surface (dashboard, onboarding, settings) can open the docs at a page
 * via `useDocsViewerStore().openDocs(slug)` instead of linking out.
 */
export function DocsViewerHost() {
  const { open, slug, close } = useDocsViewerStore();
  // Latch: keep mounted after first open so closing animates and the reading
  // position survives reopening.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <DocsDialog
        open={open}
        slug={slug}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      />
    </Suspense>
  );
}
