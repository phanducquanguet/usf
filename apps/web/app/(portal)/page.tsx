import type { Metadata } from "next";
import { PortalLanding } from "@/features/portal/landing/portal-landing";

export const metadata: Metadata = {
  title: { absolute: "UNICOM — Đặt làm phần mềm theo yêu cầu" },
  description:
    "Tư vấn miễn phí với trợ lý AI: mô tả phần mềm bạn cần, nhận bản yêu cầu rõ ràng, đội ngũ UNICOM liên hệ ngay.",
  alternates: { canonical: "/" },
};

export default function PortalPage() {
  return <PortalLanding />;
}
