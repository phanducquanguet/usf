"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { Input } from "@multica/ui/components/ui/input";
import { api } from "@multica/core/api";
import { useT } from "@multica/views/i18n";
import { ProjectCard } from "./project-card";

export function MarketplacePage() {
  const { t } = useT("portal");
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);

  const { data: config } = useQuery({
    queryKey: ["portal", "public-config"],
    queryFn: () => api.getPortalPublicConfig(),
    staleTime: 60_000,
  });
  const { data: projects = [], isPending } = useQuery({
    queryKey: ["portal", "projects"],
    queryFn: () => api.getPortalProjects(),
    staleTime: 60_000,
  });

  const industries = useMemo(
    () => [...new Set(projects.map((p) => p.industry).filter(Boolean))],
    [projects],
  );
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (industry == null || p.industry === industry) &&
        (q === "" ||
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.industry.toLowerCase().includes(q)),
    );
  }, [projects, search, industry]);

  return (
    <div className="dark portal-dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          UNICOM
        </Link>
        <h1 className="mt-6 text-4xl font-bold md:text-5xl">
          {t(($) => $.marketplace.title)}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          {t(($) => $.marketplace.subtitle)}
        </p>

        {config?.enabled === false ? (
          <p className="mt-10 text-muted-foreground">{t(($) => $.marketplace.closed)}</p>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(($) => $.marketplace.search_placeholder)}
                className="w-full sm:w-72"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={industry == null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIndustry(null)}
                >
                  {t(($) => $.marketplace.all_industries)}
                </Button>
                {industries.map((ind) => (
                  <Button
                    key={ind}
                    variant={industry === ind ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIndustry(industry === ind ? null : ind)}
                  >
                    {ind}
                  </Button>
                ))}
              </div>
            </div>

            {isPending ? (
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-72 animate-pulse rounded-xl bg-secondary" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <p className="mt-10 text-muted-foreground">{t(($) => $.marketplace.empty)}</p>
            ) : (
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((p) => (
                  <ProjectCard key={p.slug} project={p} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
