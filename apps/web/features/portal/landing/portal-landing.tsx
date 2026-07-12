"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUp,
  Bot,
  CheckCircle2,
  Menu,
  MessageSquare,
  X,
  Zap,
} from "lucide-react";
import { Button, buttonVariants } from "@multica/ui/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@multica/ui/components/ui/accordion";
import { cn } from "@multica/ui/lib/utils";
import { api } from "@multica/core/api";
import { useT } from "@multica/views/i18n";
import { PortalChat } from "../portal-chat";
import { ProjectCard } from "../marketplace/project-card";
import { Reveal } from "./reveal";

/* Quiet surface system: interactive content sits on bordered cards;
 * non-interactive lists use hairline rules only. The brand gradient is
 * reserved for the hero chat preview (the one signature element). */
const CARD = "rounded-xl border border-border/60 bg-card";

type Item = { title: string; body: string };

function BrandLogo({ className }: { className?: string }) {
  // The landing is always dark, so only the dark logo variant is used.
  return (
    <Image
      src="/brand/unicom-logo-dark.png"
      alt="UNICOM — AI Software Factory"
      width={797}
      height={206}
      priority
      className={cn("w-auto", className)}
    />
  );
}

/** Thin brand progress bar + back-to-top affordance while scrolling.
 * The bar is driven through a ref + scaleX so scrolling never re-renders
 * React or invalidates layout; state only tracks the back-to-top toggle. */
function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const progress = total > 0 ? window.scrollY / total : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
      setShowTop(progress > 0.1);
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-0.5">
        <div
          ref={barRef}
          className="h-full origin-left bg-brand"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
      {showTop ? (
        <button
          type="button"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={cn(
            CARD,
            "fixed bottom-6 right-6 z-50 flex size-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors animate-in fade-in slide-in-from-bottom-2 hover:text-brand",
          )}
        >
          <ArrowUp className="size-5" />
        </button>
      ) : null}
    </>
  );
}

/** Display title + optional subtitle, shared by every section. The heading
 * carries the hierarchy alone — no eyebrow scaffolding. */
function SectionHeader({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Reveal className={cn("mb-14 text-center", className)}>
      <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold md:text-[2.75rem] md:leading-[1.15]">
        {title}
      </h2>
      {children}
    </Reveal>
  );
}

/** Decorative mock of the consultation chat, shown beside the hero copy.
 * The story it tells is the product's differentiator: a short conversation
 * that materializes as a project inside the UNICOM system. Bubble styles
 * match the real PortalChat so the preview promises what the product ships. */
function ChatPreview({
  title,
  status,
  messages,
  outcome,
}: {
  title: string;
  status: string;
  messages: { fromUser: boolean; text: string }[];
  outcome: { label: string; title: string; meta: string };
}) {
  return (
    <div aria-hidden className="portal-float relative lg:rotate-1">
      <div className="portal-gradient-border portal-glow relative overflow-hidden rounded-2xl bg-card">
        <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-start to-brand-end">
            <Bot className="size-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              {status}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-5">
          {messages.map((m) => (
            <div
              key={m.text}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.fromUser
                  ? "self-end rounded-br-sm bg-brand/15 text-foreground"
                  : "self-start rounded-bl-sm bg-secondary text-secondary-foreground",
              )}
            >
              {m.text}
            </div>
          ))}
          <div className="mt-1 flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-3.5">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{outcome.label}</p>
              <p className="mt-0.5 truncate text-sm font-medium">{outcome.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{outcome.meta}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PortalLanding() {
  const { t } = useT("portal");
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: config, isPending: configLoading } = useQuery({
    queryKey: ["portal", "public-config"],
    queryFn: () => api.getPortalPublicConfig(),
    staleTime: 60_000,
  });

  // Three states: loading (skeleton, claim nothing), enabled, disabled.
  // Unknown must never render the "portal closed" card.
  const enabled = config?.enabled === true;
  const { data: featured = [] } = useQuery({
    queryKey: ["portal", "projects"],
    queryFn: () => api.getPortalProjects(),
    staleTime: 60_000,
    enabled,
  });
  const hero = config?.hero_content ?? {};
  const heroSubs = t(($) => $.hero.subs, { returnObjects: true }) as string[];
  const problems = t(($) => $.problem.items, { returnObjects: true }) as Item[];
  const layers = t(($) => $.solution.layers, { returnObjects: true }) as (Item & {
    label: string;
  })[];
  const advantages = t(($) => $.advantages.items, { returnObjects: true }) as string[];
  const services = t(($) => $.services.items, { returnObjects: true }) as (Item & {
    cta: string;
  })[];
  const targetFit = t(($) => $.target_fit.items, { returnObjects: true }) as string[];
  const pricing = t(($) => $.pricing.items, { returnObjects: true }) as Item[];
  const steps = t(($) => $.process.steps, { returnObjects: true }) as Item[];
  const consultSteps = t(($) => $.consult.items, { returnObjects: true }) as Item[];
  const faqs = t(($) => $.faq.items, { returnObjects: true }) as { q: string; a: string }[];
  const previewMessages = [
    { fromUser: false, text: t(($) => $.preview.m1) },
    { fromUser: true, text: t(($) => $.preview.m2) },
    { fromUser: false, text: t(($) => $.preview.m3) },
  ];
  const previewOutcome = {
    label: t(($) => $.preview.outcome_label),
    title: t(($) => $.preview.outcome_title),
    meta: t(($) => $.preview.outcome_meta),
  };
  const navItems = [
    { label: t(($) => $.nav.solutions), href: "#solutions" },
    { label: t(($) => $.nav.services), href: "#services" },
    { label: t(($) => $.marketplace.nav), href: "/marketplace" },
    { label: t(($) => $.nav.process), href: "#process" },
    { label: t(($) => $.nav.faq), href: "#faq" },
  ];
  const openChat = () => setChatOpen(true);

  return (
    <div
      data-testid="portal-root"
      className="dark portal-dark min-h-screen bg-background text-foreground"
    >
      <ScrollProgress />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <BrandLogo className="h-9" />
          <nav aria-label="Landing" className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className={buttonVariants({ variant: "outline" })}>
              {t(($) => $.hero.login)}
            </Link>
            {configLoading ? (
              <div
                aria-hidden
                className="hidden h-9 w-40 animate-pulse rounded-md bg-secondary sm:block"
              />
            ) : enabled ? (
              <Button className="hidden sm:inline-flex" onClick={openChat}>
                {t(($) => $.hero.cta)}
              </Button>
            ) : null}
            <button
              type="button"
              aria-label={t(($) => $.nav.menu)}
              aria-expanded={menuOpen}
              aria-controls="portal-mobile-nav"
              onClick={() => setMenuOpen((open) => !open)}
              className="-mr-2 flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <nav
            id="portal-mobile-nav"
            aria-label="Landing"
            className="mx-auto max-w-6xl border-t border-border/60 px-6 pb-4 pt-2 lg:hidden"
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center text-base text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
            {enabled ? (
              <Button
                className="mt-2 w-full sm:hidden"
                onClick={() => {
                  setMenuOpen(false);
                  openChat();
                }}
              >
                {t(($) => $.hero.cta)}
              </Button>
            ) : null}
          </nav>
        ) : null}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="portal-hero-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-brand/15 blur-[128px]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-28">
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5">
              <span className="size-2 animate-pulse rounded-full bg-brand" />
              <span className="text-xs font-medium text-brand">{t(($) => $.hero.badge)}</span>
            </div>

            <h1 className="pb-2 text-[2.75rem] font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
              {hero.headline || t(($) => $.hero.headline)}
            </h1>
            <p className="mt-3 max-w-xl text-xl font-medium text-foreground/90 md:text-2xl">
              {hero.subheadline || t(($) => $.hero.tagline)}
            </p>

            <ul className="mt-6 space-y-2">
              {heroSubs.map((s) => (
                <li key={s} className="flex items-start gap-2.5 text-lg text-muted-foreground">
                  <CheckCircle2 className="mt-1.5 size-4 shrink-0 text-brand" />
                  {s}
                </li>
              ))}
            </ul>

            {configLoading ? (
              <div aria-hidden className="mt-9 flex flex-col gap-4 sm:flex-row">
                <div className="h-12 w-full animate-pulse rounded-md bg-secondary sm:w-56" />
                <div className="h-12 w-full animate-pulse rounded-md bg-secondary/50 sm:w-44" />
              </div>
            ) : enabled ? (
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Button size="lg" className="h-12 px-7 text-base" onClick={openChat}>
                  <MessageSquare className="mr-2 size-5" />
                  {t(($) => $.hero.cta)}
                </Button>
                <a
                  href="#solutions"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-12 px-7 text-base",
                  )}
                >
                  {t(($) => $.hero.cta_secondary)}
                  <ArrowRight className="ml-2 size-4" />
                </a>
              </div>
            ) : (
              <div className={cn(CARD, "mt-9 max-w-md p-6")}>
                <p className="font-medium">{t(($) => $.disabled.title)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hero.contact_email ? (
                    <>
                      {t(($) => $.disabled.body)}{" "}
                      <a className="underline" href={`mailto:${hero.contact_email}`}>
                        {hero.contact_email}
                      </a>
                    </>
                  ) : (
                    t(($) => $.disabled.body_generic)
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-6 fill-mode-backwards duration-700 [animation-delay:200ms]">
            <ChatPreview
              title={t(($) => $.preview.title)}
              status={t(($) => $.preview.status)}
              messages={previewMessages}
              outcome={previewOutcome}
            />
          </div>
        </div>
      </section>

      {/* Advantages — quiet claims strip */}
      <section className="mx-auto max-w-6xl px-6 pb-4 pt-2 md:pb-8">
        <Reveal>
          <p className="sr-only">{t(($) => $.advantages.title)}</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 border-y border-border/60 px-2 py-5 lg:justify-between">
            {advantages.map((a) => (
              <li key={a} className="flex items-center gap-2.5 text-sm text-foreground/85">
                <span className="size-1 shrink-0 rounded-full bg-brand/70" />
                {a}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* Problems */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <SectionHeader title={t(($) => $.problem.title)} />
        <Reveal>
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {problems.map((p) => (
              <div key={p.title} className="h-full border-t border-border/60 pt-5">
                <h3 className="mb-2 text-lg font-semibold">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Solution — 3-layer model */}
      <section id="solutions" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <SectionHeader title={t(($) => $.solution.title)} />
          <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:gap-0">
            {layers.map((layer, i) => (
              <div key={layer.title} className="flex items-stretch lg:flex-1">
                <Reveal delayMs={i * 120} className="flex-1">
                  <div className={cn(CARD, "h-full p-8")}>
                    <span className="text-sm font-medium text-brand">{layer.label}</span>
                    <h3 className="mb-2 mt-4 text-xl font-bold">{layer.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{layer.body}</p>
                  </div>
                </Reveal>
                {i < layers.length - 1 ? (
                  <div className="hidden items-center px-3 lg:flex">
                    <ArrowRight className="size-5 text-brand/40" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl scroll-mt-16 px-6 py-16 md:py-24">
        <SectionHeader title={t(($) => $.services.title)} />
        <Reveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <div
                key={s.title}
                className={cn(
                  CARD,
                  "group flex h-full flex-col p-6 transition-colors hover:border-brand/40",
                )}
              >
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
                {enabled ? (
                  <button
                    type="button"
                    onClick={openChat}
                    className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-brand"
                  >
                    {s.cta}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Featured marketplace projects */}
      {featured.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <SectionHeader title={t(($) => $.marketplace.featured_title)} />
          <Reveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.slice(0, 6).map((p) => (
                <ProjectCard key={p.slug} project={p} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/marketplace"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 px-7 text-base",
                )}
              >
                {t(($) => $.marketplace.featured_cta)}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* Target fit + Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeader
              title={t(($) => $.target_fit.title)}
              className="mb-8 text-left [&_h2]:mx-0"
            />
            <Reveal>
              <div className={cn(CARD, "space-y-4 p-8")}>
                {targetFit.map((item) => (
                  <div key={item} className="flex items-center gap-3.5">
                    <CheckCircle2 className="size-5 shrink-0 text-brand" />
                    <span className="text-base md:text-lg">{item}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
          <div>
            <SectionHeader
              title={t(($) => $.pricing.title)}
              className="mb-8 text-left [&_h2]:mx-0"
            />
            <Reveal>
              <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {pricing.map((p) => (
                  <div key={p.title} className="h-full border-t border-border/60 pt-5">
                    <h3 className="mb-1 font-semibold">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.body}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Implementation process */}
      <section id="process" className="mx-auto max-w-6xl scroll-mt-16 px-6 py-16 md:py-24">
        <SectionHeader title={t(($) => $.process.title)}>
          <p className="mt-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-sm font-medium text-brand">
              <Zap className="size-4" />
              {t(($) => $.process.highlight)}
            </span>
          </p>
        </SectionHeader>
        <div className="relative grid gap-10 md:grid-cols-4 md:gap-6">
          <div className="absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-border/60 md:block" />
          {steps.map((step, i) => (
            <Reveal key={step.title} delayMs={i * 120}>
              <div className="relative text-center">
                <div className="relative z-10 mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-brand/30 bg-background text-base font-semibold text-brand ring-4 ring-background">
                  {i + 1}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="mx-auto max-w-xs text-sm text-muted-foreground">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How the AI consultation works */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <SectionHeader title={t(($) => $.consult.title)} />
        <Reveal>
          <div
            className={cn(
              CARD,
              "grid divide-y divide-border/60 md:grid-cols-3 md:divide-x md:divide-y-0",
            )}
          >
            {consultSteps.map((f, i) => (
              <div key={f.title} className="p-8">
                <span className="flex size-8 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-sm font-semibold text-brand">
                  {i + 1}
                </span>
                <h3 className="mb-2 mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-2xl scroll-mt-16 px-6 py-16 md:py-24">
        <SectionHeader title={t(($) => $.faq.title)} className="mb-10" />
        <Reveal>
          <Accordion className={cn(CARD, "divide-y divide-border/60 px-6")}>
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q} className="border-none">
                <AccordionTrigger className="cursor-pointer py-5 text-left text-base font-medium hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>

      {/* Final CTA */}
      {enabled ? (
        <section className="mx-auto max-w-4xl px-6 py-16 md:py-24">
          <Reveal>
            <div className={cn(CARD, "relative overflow-hidden rounded-2xl p-10 text-center md:p-16")}>
              <div className="portal-hero-grid pointer-events-none absolute inset-0" />
              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-balance pb-1 text-3xl font-bold leading-[1.15] md:text-[2.75rem]">
                  {t(($) => $.cta_section.title)}
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
                  {t(($) => $.cta_section.body)}
                </p>
                <Button size="lg" className="mt-9 h-12 px-7 text-base" onClick={openChat}>
                  <MessageSquare className="mr-2 size-5" />
                  {t(($) => $.hero.cta)}
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      ) : null}

      <footer className="border-t border-border/60 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <BrandLogo className="h-6 opacity-80" />
            <p className="text-sm text-muted-foreground">{t(($) => $.footer.tagline)}</p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:items-end">
            <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <p className="text-sm text-muted-foreground">{t(($) => $.footer.copyright)}</p>
          </div>
        </div>
      </footer>

      {/* Chat can only be opened while enabled; keep it mounted afterwards so
       * a config refetch flipping `enabled` never kills a live conversation. */}
      {chatOpen ? (
        <PortalChat
          onClose={() => setChatOpen(false)}
          greeting={hero.greeting}
          agentName={config?.agent?.name}
        />
      ) : null}
    </div>
  );
}
