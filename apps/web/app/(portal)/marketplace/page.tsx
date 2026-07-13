import type { Metadata } from "next";
import { MarketplacePage } from "@/features/portal/marketplace/marketplace-page";
import { buildPortalPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPortalPageMetadata({
  title: "Chợ dự án — UNICOM",
  description:
    "Tham khảo các dự án phần mềm UNICOM đã thực hiện và trao đổi với trợ lý AI về dự án của bạn.",
  path: "/marketplace",
});

export default function Page() {
  return <MarketplacePage />;
}
