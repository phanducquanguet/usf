import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/seo";

// Only non-HTML backend endpoints are disallowed here. HTML routes that must
// stay out of the index (auth flows, workspace app pages) are crawlable but
// carry `robots: noindex` metadata — see app/(auth)/layout.tsx and
// app/[workspaceSlug]/layout.tsx. Disallowing them here would hide the
// noindex directive from crawlers.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        // /slack/ and /lark/ are token-carrying bot-bind client pages —
        // keep crawlers away entirely.
        disallow: ["/api/", "/portal/", "/auth/", "/uploads/", "/ws", "/slack/", "/lark/"],
      },
    ],
    sitemap: [`${SITE_ORIGIN}/sitemap.xml`, `${SITE_ORIGIN}/docs/sitemap.xml`],
  };
}
