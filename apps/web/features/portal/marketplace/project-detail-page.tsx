"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ExternalLink, MessageSquare } from "lucide-react";
import { Button, buttonVariants } from "@multica/ui/components/ui/button";
import { cn } from "@multica/ui/lib/utils";
import { api } from "@multica/core/api";
import { useT } from "@multica/views/i18n";
import { PortalChat } from "../portal-chat";

const CARD = "rounded-xl border border-border/60 bg-card";

export function ProjectDetailPage({ slug }: { slug: string }) {
  const { t } = useT("portal");
  const [chatOpen, setChatOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const { data: config } = useQuery({
    queryKey: ["portal", "public-config"],
    queryFn: () => api.getPortalPublicConfig(),
    staleTime: 60_000,
  });
  const { data: project, isPending } = useQuery({
    queryKey: ["portal", "projects", slug],
    queryFn: () => api.getPortalProject(slug),
    retry: false,
  });

  const enabled = config?.enabled === true;

  return (
    <div className="dark portal-dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-14 md:py-20">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t(($) => $.marketplace.back)}
        </Link>

        {isPending ? (
          <div className="mt-8 space-y-4" aria-busy="true">
            <div className="h-10 w-2/3 animate-pulse rounded-md bg-secondary" />
            <div className="aspect-video animate-pulse rounded-xl bg-secondary" />
          </div>
        ) : project == null ? (
          <div className={cn(CARD, "mt-8 p-8")}>
            <h1 className="text-xl font-semibold">{t(($) => $.marketplace.not_found_title)}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(($) => $.marketplace.not_found_body)}
            </p>
          </div>
        ) : (
          <>
            {project.industry ? (
              <span className="mt-8 inline-block rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                {project.industry}
              </span>
            ) : null}
            <h1 className="mt-3 text-4xl font-bold md:text-5xl">{project.name}</h1>

            {project.images.length > 0 ? (
              <div className="mt-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.images[activeImage] ?? project.images[0]}
                  alt={project.name}
                  className="aspect-video w-full rounded-xl border border-border/60 object-cover"
                />
                {project.images.length > 1 ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {project.images.map((url, i) => (
                      <button
                        key={url}
                        type="button"
                        aria-label={`${project.name} ${i + 1}`}
                        onClick={() => setActiveImage(i)}
                        className="shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className={cn(
                            "h-16 w-28 cursor-pointer rounded-md border object-cover",
                            i === activeImage
                              ? "border-brand"
                              : "border-border/60 opacity-70",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <p className="mt-8 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
              {project.description}
            </p>

            {project.features.length > 0 ? (
              <div className={cn(CARD, "mt-8 p-6")}>
                <h2 className="text-lg font-semibold">
                  {t(($) => $.marketplace.features_title)}
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {project.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              {enabled ? (
                <Button
                  size="lg"
                  className="h-12 px-7 text-base"
                  onClick={() => setChatOpen(true)}
                >
                  <MessageSquare className="mr-2 size-5" />
                  {t(($) => $.marketplace.consult_cta)}
                </Button>
              ) : null}
              {project.demo_url ? (
                <a
                  href={project.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-12 px-7 text-base",
                  )}
                >
                  {t(($) => $.marketplace.view_demo)}
                  <ExternalLink className="ml-2 size-4" />
                </a>
              ) : null}
              {project.portfolio_url ? (
                <a
                  href={project.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-12 px-7 text-base",
                  )}
                >
                  {t(($) => $.marketplace.view_portfolio)}
                  <ExternalLink className="ml-2 size-4" />
                </a>
              ) : null}
            </div>
          </>
        )}
      </div>

      {chatOpen && project ? (
        <PortalChat
          onClose={() => setChatOpen(false)}
          agentName={config?.agent?.name}
          projectSlug={project.slug}
          projectName={project.name}
        />
      ) : null}
    </div>
  );
}
