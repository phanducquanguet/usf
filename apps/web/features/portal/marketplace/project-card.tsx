"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@multica/ui/lib/utils";
import type { PortalProject } from "@multica/core/types/portal";

const CARD = "rounded-xl border border-border/60 bg-card";

export function ProjectCard({ project }: { project: PortalProject }) {
  return (
    <Link
      href={`/marketplace/${project.slug}`}
      className={cn(
        CARD,
        "group flex h-full flex-col overflow-hidden transition-colors hover:border-brand/40",
      )}
    >
      {project.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.images[0]}
          alt={project.name}
          className="aspect-video w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div aria-hidden className="aspect-video w-full bg-secondary" />
      )}
      <div className="flex flex-1 flex-col p-5">
        {project.industry ? (
          <span className="mb-2 self-start rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
            {project.industry}
          </span>
        ) : null}
        <h3 className="text-lg font-semibold">{project.name}</h3>
        <p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {project.description}
        </p>
        <span
          aria-hidden
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand"
        >
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
