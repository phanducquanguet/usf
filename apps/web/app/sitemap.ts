import type { MetadataRoute } from "next";
import { fetchPortalProjects } from "@/lib/portal-server";
import { SITE_ORIGIN } from "@/lib/seo";

// Without this the sitemap is prerendered at build time, freezing the
// project list (and dropping it entirely when the API is unreachable
// during build). Serve it fresh per crawl instead.
export const dynamic = "force-dynamic";

// Sitemap for the public web pages (portal). Docs ship their own sitemap at
// /docs/sitemap.xml; robots.ts references both.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await fetchPortalProjects();

  return [
    { url: SITE_ORIGIN, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_ORIGIN}/marketplace`, changeFrequency: "daily", priority: 0.8 },
    ...projects.map((project) => ({
      url: `${SITE_ORIGIN}/marketplace/${encodeURIComponent(project.slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
