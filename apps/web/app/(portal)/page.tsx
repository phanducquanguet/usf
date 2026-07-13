import type { Metadata } from "next";
import { PortalLanding } from "@/features/portal/landing/portal-landing";
import { buildPortalPageMetadata, organizationJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPortalPageMetadata({
  title: "UNICOM — Đặt làm phần mềm theo yêu cầu",
  description:
    "Tư vấn miễn phí với trợ lý AI: mô tả phần mềm bạn cần, nhận bản yêu cầu rõ ràng, đội ngũ UNICOM liên hệ ngay.",
  path: "/",
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
