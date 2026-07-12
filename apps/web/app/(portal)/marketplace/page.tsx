import type { Metadata } from "next";
import { MarketplacePage } from "@/features/portal/marketplace/marketplace-page";

export const metadata: Metadata = {
  title: { absolute: "Chợ dự án — UNICOM" },
  description:
    "Tham khảo các dự án phần mềm UNICOM đã thực hiện và trao đổi với trợ lý AI về dự án của bạn.",
  alternates: { canonical: "/marketplace" },
};

export default function Page() {
  return <MarketplacePage />;
}
