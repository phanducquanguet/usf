import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailPage } from "@/features/portal/marketplace/project-detail-page";
import { fetchPortalProject } from "@/lib/portal-server";
import {
  buildProjectMetadata,
  projectBreadcrumbJsonLd,
  projectJsonLd,
} from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchPortalProject(slug);

  // Confirmed missing → notFound() as early as possible. The root layout's
  // Suspense (DocsViewerHost) commits the response to 200 once streaming
  // starts, so crawlers may see 200 — Next then injects
  // <meta name="robots" content="noindex"> which keeps these URLs out of
  // the index (the documented soft-404 mitigation).
  if (project === null) notFound();

  // API unreachable → still emit a self-referencing canonical so the page
  // never inherits another page's canonical.
  if (project === undefined) {
    return {
      title: { absolute: "Dự án — UNICOM" },
      alternates: { canonical: `/marketplace/${encodeURIComponent(slug)}` },
    };
  }

  return buildProjectMetadata(project);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const project = await fetchPortalProject(slug);

  // Real 404 status for unknown slugs instead of a 200 with an error card.
  if (project === null) notFound();

  return (
    <>
      {project ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              projectJsonLd(project),
              projectBreadcrumbJsonLd(project),
            ]),
          }}
        />
      ) : null}
      <ProjectDetailPage slug={slug} initialProject={project ?? undefined} />
    </>
  );
}
