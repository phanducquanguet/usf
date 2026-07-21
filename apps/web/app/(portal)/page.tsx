import type { Metadata } from "next";
import { PortalLanding } from "@/features/portal/landing/portal-landing";
import { buildPortalPageMetadata, organizationJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPortalPageMetadata({
  title: "UNICOM — Custom Software, Built to Order",
  description:
    "Free consulting with an AI assistant: describe the software you need, get a clear requirements brief, and the UNICOM team gets in touch right away.",
  path: "/",
  image: "/og-en.png",
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
