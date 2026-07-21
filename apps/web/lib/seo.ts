import type { Metadata } from "next";
import type { PortalProject } from "@multica/core/types/portal";

// Canonical production origin for the web app. Must stay in sync with
// app/robots.ts and apps/docs/lib/site.ts (SITE_ORIGIN there).
export const SITE_ORIGIN = "https://uniai.unicomhub.com";

// Public portal is UNICOM-branded; the product app itself is UniAI. The
// landing page uses English (global) copy, marketplace project pages keep
// Vietnamese data-driven copy. See memory/brand conventions.
export const PORTAL_SITE_NAME = "UNICOM";

export const DEFAULT_OG_IMAGE = "/og.png";

const MAX_DESCRIPTION_LENGTH = 160;

const FALLBACK_PROJECT_DESCRIPTION =
  "Dự án phần mềm do UNICOM thực hiện. Tham khảo và trao đổi với trợ lý AI về dự án của bạn.";

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_ORIGIN}${path}`;
}

function truncate(text: string, max = MAX_DESCRIPTION_LENGTH): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function projectPath(project: PortalProject): string {
  return `/marketplace/${encodeURIComponent(project.slug)}`;
}

function projectOgImage(project: PortalProject): string {
  const first = project.images[0];
  return absoluteUrl(first || DEFAULT_OG_IMAGE);
}

function projectDescription(project: PortalProject): string {
  const flat = project.description.replace(/\s+/g, " ").trim();
  return flat ? truncate(flat) : FALLBACK_PROJECT_DESCRIPTION;
}

export function buildPortalPageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  locale = "vi_VN",
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  locale?: string;
}): Metadata {
  const imageUrl = absoluteUrl(image);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: PORTAL_SITE_NAME,
      locale,
      title,
      description,
      url: absoluteUrl(path),
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function buildProjectMetadata(project: PortalProject): Metadata {
  return buildPortalPageMetadata({
    title: `${project.name} — ${PORTAL_SITE_NAME}`,
    description: projectDescription(project),
    path: projectPath(project),
    image: projectOgImage(project),
  });
}

export function organizationJsonLd(): Record<string, unknown> & {
  "@type": string;
  name: string;
  url: string;
} {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: PORTAL_SITE_NAME,
    url: SITE_ORIGIN,
    logo: absoluteUrl("/brand/unicom-logo-dark.png"),
  };
}

export function projectJsonLd(project: PortalProject): Record<string, unknown> & {
  "@type": string;
  name: string;
  url: string;
  image?: string;
} {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.name,
    description: projectDescription(project),
    url: absoluteUrl(projectPath(project)),
    ...(project.images[0] ? { image: absoluteUrl(project.images[0]) } : {}),
    author: { "@type": "Organization", name: PORTAL_SITE_NAME, url: SITE_ORIGIN },
  };
}

export function projectBreadcrumbJsonLd(project: PortalProject): {
  "@context": string;
  "@type": string;
  itemListElement: Array<{ "@type": string; position: number; name: string; item: string }>;
} {
  const crumbs = [
    { name: PORTAL_SITE_NAME, item: SITE_ORIGIN },
    { name: "Chợ dự án", item: absoluteUrl("/marketplace") },
    { name: project.name, item: absoluteUrl(projectPath(project)) },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}
