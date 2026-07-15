"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";
import { Separator } from "@multica/ui/components/ui/separator";
import { Switch } from "@multica/ui/components/ui/switch";
import { Textarea } from "@multica/ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@multica/ui/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@multica/ui/components/ui/tabs";
import { Skeleton } from "@multica/ui/components/ui/skeleton";
import { api } from "@multica/core/api";
import { useAuthStore } from "@multica/core/auth";
import { useWorkspaceId } from "@multica/core/hooks";
import { paths, useWorkspaceSlug } from "@multica/core/paths";
import {
  agentListOptions,
  memberListOptions,
  portalAdminConfigOptions,
  portalConfigKeys,
} from "@multica/core/workspace/queries";
import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@multica/core/i18n";
import type {
  PortalHeroContent,
  PortalHeroCopy,
  UpdatePortalAdminConfigRequest,
} from "@multica/core/types/portal";
import { useT } from "../../i18n";
import { AppLink } from "../../navigation";
import { openExternal } from "../../platform";
import { PortalProjectsSection } from "./portal-projects-section";
import { UnsavedChangesBar } from "./unsaved-changes-bar";

// Autonyms, deliberately untranslated — same convention as the landing's
// VI|EN language switch.
const HERO_LOCALE_LABELS: Record<SupportedLocale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

// Example copy is pinned to each group's own language (a VI example teaches
// what to type in the VI fields regardless of UI language), so these are
// per-group constants like the autonyms above, not UI translations.
const HERO_PLACEHOLDERS: Record<SupportedLocale, Required<PortalHeroCopy>> = {
  vi: {
    headline: "VD: Kể cho chúng tôi về phần mềm bạn cần",
    subheadline: "Một vài câu giới thiệu hiển thị dưới tiêu đề",
    greeting: "Tin nhắn đầu tiên agent gửi cho khách",
  },
  en: {
    headline: "e.g. Tell us about the software you need",
    subheadline: "A few sentences shown under the headline",
    greeting: "The first message the agent sends to a customer",
  },
};

/** The public landing lives at the web root of the deployment. On web the
 * API base is same-origin (""), so this resolves to "/"; on desktop it is
 * the full server origin. */
function portalUrl(): string {
  return `${api.getBaseUrl() || ""}/`;
}

export function PortalTab() {
  const { t } = useT("settings");
  const wsId = useWorkspaceId();
  const slug = useWorkspaceSlug();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: members = [], isPending: membersPending } = useQuery(
    memberListOptions(wsId),
  );
  const isOwner =
    (members.find((m) => m.user_id === user?.id)?.role ?? "") === "owner";

  const { data: agents = [], isPending: agentsPending } = useQuery({
    ...agentListOptions(wsId),
    enabled: isOwner,
  });
  const { data: config, isPending: configPending } = useQuery({
    ...portalAdminConfigOptions(wsId),
    enabled: isOwner,
  });

  const [enabled, setEnabled] = useState(false);
  const [agentId, setAgentId] = useState("");
  const [hero, setHero] = useState<PortalHeroContent>({});

  useEffect(() => {
    if (!config) return;
    setEnabled(config.enabled === true);
    setAgentId(config.agent_id ?? "");
    setHero(config.hero_content ?? {});
  }, [config]);

  const save = useMutation({
    mutationFn: (req: UpdatePortalAdminConfigRequest) =>
      api.updatePortalAdminConfig(req),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: portalConfigKeys.adminConfig(wsId),
      });
      toast.success(t(($) => $.portal.toast_saved));
    },
    onError: (err) =>
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : t(($) => $.portal.toast_failed),
      ),
  });

  // Avoid flashing the non-owner notice / empty form while queries resolve.
  if (membersPending || (isOwner && (configPending || agentsPending))) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Card>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          {t(($) => $.portal.owner_only)}
        </CardContent>
      </Card>
    );
  }

  const activeAgents = (agents ?? []).filter((a) => !a.archived_at);
  // Lookup over the full list so an already-configured agent that was later
  // archived still shows its name instead of the placeholder.
  const selectedAgent = (agents ?? []).find((a) => a.id === agentId);
  const missingAgent = enabled && !agentId;
  // The public portal treats an archived consulting agent as "portal
  // disabled", so surface that instead of silently looking healthy.
  const archivedAgent = enabled && !!selectedAgent?.archived_at;
  const setHeroCopyField = (locale: SupportedLocale, field: keyof PortalHeroCopy) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setHero({ ...hero, [locale]: { ...hero[locale], [field]: e.target.value } });
  const setContactEmail = (e: React.ChangeEvent<HTMLInputElement>) =>
    setHero({ ...hero, contact_email: e.target.value });

  // Dirty tracking against the last-loaded config: the save bar only appears
  // when there is actually something to save, and Reset restores the snapshot.
  const savedSnapshot = JSON.stringify({
    enabled: config?.enabled === true,
    agentId: config?.agent_id ?? "",
    hero: config?.hero_content ?? {},
  });
  const dirty = JSON.stringify({ enabled, agentId, hero }) !== savedSnapshot;
  const resetToSaved = () => {
    setEnabled(config?.enabled === true);
    setAgentId(config?.agent_id ?? "");
    setHero(config?.hero_content ?? {});
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div>
            <h2 className="text-sm font-semibold">{t(($) => $.portal.title)}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t(($) => $.portal.description)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => openExternal(portalUrl())}
          >
            {t(($) => $.portal.view_portal)}
            <ExternalLink className="size-3.5" />
          </Button>
        </div>

        <Card>
          <CardContent className="divide-y">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="portal-enabled" className="text-sm font-medium">
                  {t(($) => $.portal.enable)}
                </Label>
                <p id="portal-enabled-hint" className="text-xs text-muted-foreground">
                  {t(($) => $.portal.enable_hint)}
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className={
                      enabled && !archivedAgent && !missingAgent
                        ? "size-1.5 rounded-full bg-success"
                        : "size-1.5 rounded-full bg-muted-foreground/40"
                    }
                    aria-hidden
                  />
                  {t(($) =>
                    enabled && !archivedAgent && !missingAgent
                      ? $.portal.status_live
                      : $.portal.status_offline,
                  )}
                </span>
                <Switch
                  id="portal-enabled"
                  aria-describedby="portal-enabled-hint"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-4">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="portal-agent" className="text-sm font-medium">
                  {t(($) => $.portal.agent)}
                </Label>
                <p id="portal-agent-hint" className="text-xs text-muted-foreground">
                  {t(($) => $.portal.agent_hint)}
                </p>
              </div>
              {activeAgents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t(($) => $.portal.agents_empty)}{" "}
                  {slug ? (
                    <AppLink
                      href={paths.workspace(slug).agents()}
                      className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
                    >
                      {t(($) => $.portal.agents_empty_cta)}
                    </AppLink>
                  ) : null}
                </p>
              ) : (
                <Select
                  value={agentId}
                  onValueChange={(value) => setAgentId(value ?? "")}
                >
                  <SelectTrigger
                    id="portal-agent"
                    className="w-56 max-w-full"
                    aria-invalid={missingAgent || archivedAgent || undefined}
                    aria-describedby={
                      missingAgent || archivedAgent
                        ? "portal-agent-error"
                        : "portal-agent-hint"
                    }
                  >
                    <SelectValue
                      className={selectedAgent ? undefined : "text-muted-foreground"}
                    >
                      {selectedAgent?.name ?? t(($) => $.portal.agent_placeholder)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activeAgents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {missingAgent || archivedAgent ? (
                <p
                  id="portal-agent-error"
                  role="alert"
                  className="w-full text-xs text-destructive"
                >
                  {t(($) =>
                    missingAgent ? $.portal.agent_required : $.portal.agent_archived,
                  )}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">
            {t(($) => $.portal.content_title)}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t(($) => $.portal.content_description)}
          </p>
        </div>

        <Card>
          <CardContent className="space-y-6">
            {/* One tab per landing language instead of stacked fieldsets:
             * halves the visible fields and mirrors the landing's VI|EN
             * switch. Tab labels are autonyms (never translated). Blank
             * fields fall back to built-in translations. */}
            <Tabs defaultValue={SUPPORTED_LOCALES[0]}>
              <TabsList>
                {SUPPORTED_LOCALES.map((locale) => (
                  <TabsTrigger key={locale} value={locale} lang={locale}>
                    {HERO_LOCALE_LABELS[locale]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {SUPPORTED_LOCALES.map((locale) => {
                const copy = hero[locale] ?? {};
                return (
                  <TabsContent key={locale} value={locale}>
                    {/* lang so screen readers / spellcheck treat typed copy
                     * as that language. */}
                    <fieldset lang={locale} className="space-y-5 pt-3">
                      <div className="space-y-2">
                        <Label htmlFor={`portal-headline-${locale}`}>
                          {t(($) => $.portal.headline)}
                        </Label>
                        <Input
                          id={`portal-headline-${locale}`}
                          value={copy.headline ?? ""}
                          placeholder={HERO_PLACEHOLDERS[locale].headline}
                          onChange={setHeroCopyField(locale, "headline")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`portal-subheadline-${locale}`}>
                          {t(($) => $.portal.subheadline)}
                        </Label>
                        <Textarea
                          id={`portal-subheadline-${locale}`}
                          value={copy.subheadline ?? ""}
                          placeholder={HERO_PLACEHOLDERS[locale].subheadline}
                          onChange={setHeroCopyField(locale, "subheadline")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`portal-greeting-${locale}`}>
                          {t(($) => $.portal.greeting)}
                        </Label>
                        <Textarea
                          id={`portal-greeting-${locale}`}
                          value={copy.greeting ?? ""}
                          placeholder={HERO_PLACEHOLDERS[locale].greeting}
                          onChange={setHeroCopyField(locale, "greeting")}
                        />
                      </div>
                    </fieldset>
                  </TabsContent>
                );
              })}
            </Tabs>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="portal-contact-email">
                {t(($) => $.portal.contact_email)}
              </Label>
              <Input
                id="portal-contact-email"
                type="email"
                value={hero.contact_email ?? ""}
                placeholder={t(($) => $.portal.contact_email_placeholder)}
                onChange={setContactEmail}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {dirty || save.isPending ? (
        <UnsavedChangesBar
          saving={save.isPending}
          disabled={missingAgent}
          onReset={resetToSaved}
          onSave={() =>
            save.mutate({
              enabled,
              agent_id: agentId || undefined,
              hero_content: hero,
            })
          }
          saveLabel={t(($) => $.portal.save)}
          savingLabel={t(($) => $.portal.saving)}
        />
      ) : null}

      <PortalProjectsSection />
    </div>
  );
}
