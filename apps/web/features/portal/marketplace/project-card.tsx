"use client";

import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { cn } from "@multica/ui/lib/utils";
import { useT } from "@multica/views/i18n";
import type { PortalProject } from "@multica/core/types/portal";

const CARD = "rounded-xl border border-border/60 bg-card";

export function ProjectCard({ project }: { project: PortalProject }) {
  const { t } = useT("portal");
  return (
    <Link
      href={`/marketplace/${project.slug}`}
      className={cn(
        CARD,
        "group flex h-full flex-col overflow-hidden transition-[border-color,box-shadow] duration-300 outline-none hover:border-brand/40 hover:shadow-[0_0_32px_-12px_color-mix(in_oklab,var(--brand-start)_45%,transparent)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        {project.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.images[0]}
            alt={project.name}
            className="size-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.04]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            aria-hidden
            className="flex size-full items-center justify-center bg-gradient-to-br from-brand-start/15 via-secondary to-brand-end/10"
          >
            <Layers className="size-8 text-brand/40" />
          </div>
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/60 to-transparent"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        {project.industry ? (
          <span className="mb-2 self-start rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
            {project.industry}
          </span>
        ) : null}
        <h3 className="text-lg font-semibold transition-colors group-hover:text-brand">
          {project.name}
        </h3>
        <p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {project.description}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
          {t(($) => $.marketplace.view_details)}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
