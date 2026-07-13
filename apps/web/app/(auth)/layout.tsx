import type { Metadata } from "next";
import type { ReactNode } from "react";

// Auth flows (/login, /invite, /invitations, /onboarding, /workspaces) must
// never appear in search results. noindex instead of robots.txt disallow so
// the directive is visible to crawlers.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
