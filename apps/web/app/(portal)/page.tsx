import type { Metadata } from "next";
import { PortalLanding } from "@/features/portal/landing/portal-landing";
import { buildPortalPageMetadata, organizationJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPortalPageMetadata({
  // og:site_name and the banner logo already carry the UNICOM brand, so the
  // title and description stay brand-free to avoid repetition in previews.
  title: "Custom Software, Built to Order",
  description:
    "Describe the software you need to an AI assistant, explore a marketplace of ready-made solutions, and get a working demo fast.",
  path: "/",
  // Chat apps cache OG images by URL; bump the version whenever og-en.png
  // changes so scrapers fetch the new file.
  image: "/og-en.png?v=2",
  locale: "en_US",
});

export default function PortalPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <PortalLanding />
    </>
  );
}
