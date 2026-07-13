"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, SearchX } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { Input } from "@multica/ui/components/ui/input";
import { cn } from "@multica/ui/lib/utils";
import { api } from "@multica/core/api";
import { useT } from "@multica/views/i18n";
import { ProjectCard } from "./project-card";

const CARD = "rounded-xl border border-border/60 bg-card";

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

  const filtered = search.trim() !== "" || industry != null;

  return (
    <div className="dark portal-dark min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="portal-hero-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-brand/15 blur-[128px]" />

        <div className="relative mx-auto max-w-6xl px-6 pt-14 md:pt-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            UNICOM
          </Link>
          <div className="mx-auto max-w-2xl pt-8 text-center md:pt-12">
            <h1 className="text-balance text-4xl font-bold md:text-5xl">
              {t(($) => $.marketplace.title)}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {t(($) => $.marketplace.subtitle)}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-14 md:pb-20">
        {config?.enabled === false ? (
          <p className="mt-10 text-center text-muted-foreground">
            {t(($) => $.marketplace.closed)}
          </p>
        ) : (
          <>
            <div className="mx-auto mt-8 flex max-w-2xl flex-col items-center gap-4 md:mt-10">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t(($) => $.marketplace.search_placeholder)}
                  aria-label={t(($) => $.marketplace.search_placeholder)}
                  className="h-12 rounded-full bg-card pl-12 pr-5 text-base shadow-[0_0_24px_-12px_color-mix(in_oklab,var(--brand-start)_40%,transparent)]"
                />
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant={industry == null ? "default" : "outline"}
                  size="sm"
                  aria-pressed={industry == null}
                  className="rounded-full px-4 max-md:h-11"
                  onClick={() => setIndustry(null)}
                >
                  {t(($) => $.marketplace.all_industries)}
                </Button>
                {industries.map((ind) => (
                  <Button
                    key={ind}
                    variant={industry === ind ? "default" : "outline"}
                    size="sm"
                    aria-pressed={industry === ind}
                    className="rounded-full px-4 max-md:h-11"
                    onClick={() => setIndustry(industry === ind ? null : ind)}
                  >
                    {ind}
                  </Button>
                ))}
              </div>
            </div>

            {isPending ? (
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-72 animate-pulse rounded-xl bg-secondary" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className={cn(CARD, "mx-auto mt-12 max-w-md p-10 text-center")}>
                <SearchX className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">{t(($) => $.marketplace.empty)}</p>
                {filtered ? (
                  <Button
                    variant="outline"
                    className="mt-6 rounded-full"
                    onClick={() => {
                      setSearch("");
                      setIndustry(null);
                    }}
                  >
                    {t(($) => $.marketplace.clear_filters)}
                  </Button>
                ) : null}
              </div>
            ) : (
              <>
                <h2
                  className="mt-12 text-sm font-normal text-muted-foreground"
                  aria-live="polite"
                >
                  {t(($) => $.marketplace.results_count, { count: visible.length })}
                </h2>
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((p) => (
                    <ProjectCard key={p.slug} project={p} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
