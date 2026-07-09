import type { ReactNode } from "react";
import { Be_Vietnam_Pro } from "next/font/google";

// Single type family for the public portal landing: Be Vietnam Pro carries
// both display and body inside `.portal-dark` via `--font-portal-sans`
// (see app/custom.css). A deliberate choice for a Vietnamese-market brand —
// first-class diacritics, humanist grotesque, committed weight range.
// The rest of the app stays on Inter.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-portal-sans",
});

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <div className={beVietnamPro.variable}>{children}</div>;
}
