import type { Metadata } from "next";

// Workspace app pages are auth-gated client shells with no crawlable content.
// noindex (rather than a robots.txt disallow) so crawlers can actually see
// the directive; robots.txt only blocks non-HTML endpoints.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export { default } from "./workspace-layout";
