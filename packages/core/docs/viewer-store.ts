"use client";

import { create } from "zustand";

/**
 * In-app docs viewer state. Any surface can open the bundled DocsDialog at a
 * specific page instead of linking out to the marketing docs site.
 */
interface DocsViewerStore {
  open: boolean;
  /** Slug of the doc page to show, e.g. "agents", "skills". */
  slug: string;
  openDocs: (slug?: string) => void;
  close: () => void;
}

export const useDocsViewerStore = create<DocsViewerStore>((set) => ({
  open: false,
  slug: "index",
  openDocs: (slug = "index") => set({ open: true, slug }),
  close: () => set({ open: false }),
}));
