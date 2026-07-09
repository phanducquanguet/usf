"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { Button, buttonVariants } from "@multica/ui/components/ui/button";
import { api } from "@multica/core/api";
import { useT } from "@multica/views/i18n";
import { PortalChat } from "../portal-chat";

export function PortalLanding() {
  const { t } = useT("portal");
  const [chatOpen, setChatOpen] = useState(false);
  const { data: config } = useQuery({
    queryKey: ["portal", "public-config"],
    queryFn: () => api.getPortalPublicConfig(),
    staleTime: 60_000,
  });

  const enabled = config?.enabled === true;
  const hero = config?.hero_content ?? {};
  const features = t(($) => $.features.items, { returnObjects: true }) as {
    title: string;
    body: string;
  }[];
  const faqs = t(($) => $.faq.items, { returnObjects: true }) as { q: string; a: string }[];

  return (
    <div data-testid="portal-root" className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold">UNICOM</span>
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          {t(($) => $.hero.login)}
        </Link>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {hero.headline || t(($) => $.hero.headline)}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          {hero.subheadline || t(($) => $.hero.subheadline)}
        </p>
        {enabled ? (
          <Button size="lg" onClick={() => setChatOpen(true)}>
            <MessageSquare className="mr-2 h-5 w-5" />
            {t(($) => $.hero.cta)}
          </Button>
        ) : (
          <div className="rounded-lg border bg-card p-6">
            <p className="font-medium">{t(($) => $.disabled.title)}</p>
            <p className="text-sm text-muted-foreground">
              {t(($) => $.disabled.body)}{" "}
              {hero.contact_email ? (
                <a className="underline" href={`mailto:${hero.contact_email}`}>
                  {hero.contact_email}
                </a>
              ) : null}
            </p>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold">
          {t(($) => $.features.title)}
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-6">
              <p className="mb-2 font-medium">{f.title}</p>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold">{t(($) => $.faq.title)}</h2>
        <div className="space-y-4">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-lg border bg-card p-4">
              <p className="font-medium">{f.q}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        {t(($) => $.footer.copyright)}
      </footer>

      {chatOpen && enabled ? (
        <PortalChat
          onClose={() => setChatOpen(false)}
          greeting={hero.greeting}
          agentName={config?.agent?.name}
        />
      ) : null}
    </div>
  );
}
