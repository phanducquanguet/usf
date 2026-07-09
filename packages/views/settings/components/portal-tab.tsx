"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@multica/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@multica/ui/components/ui/card";
import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";
import { Switch } from "@multica/ui/components/ui/switch";
import { Textarea } from "@multica/ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@multica/ui/components/ui/select";
import { api } from "@multica/core/api";
import { useAuthStore } from "@multica/core/auth";
import { useWorkspaceId } from "@multica/core/hooks";
import { agentListOptions, memberListOptions } from "@multica/core/workspace/queries";
import type {
  PortalHeroContent,
  UpdatePortalAdminConfigRequest,
} from "@multica/core/types/portal";
import { useT } from "../../i18n";

const PORTAL_CONFIG_KEY = "portal";

export function PortalTab() {
  const { t } = useT("settings");
  const wsId = useWorkspaceId();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery(memberListOptions(wsId));
  const isOwner =
    (members.find((m) => m.user_id === user?.id)?.role ?? "") === "owner";

  const { data: agents = [] } = useQuery({
    ...agentListOptions(wsId),
    enabled: isOwner,
  });
  const { data: config } = useQuery({
    queryKey: [PORTAL_CONFIG_KEY, "admin-config", wsId],
    queryFn: () => api.getPortalAdminConfig(),
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
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [PORTAL_CONFIG_KEY, "admin-config", wsId],
      }),
  });

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          {t(($) => $.portal.owner_only)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(($) => $.portal.title)}</CardTitle>
        <CardDescription>{t(($) => $.portal.description)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="portal-enabled">{t(($) => $.portal.enable)}</Label>
          <Switch id="portal-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="space-y-2">
          <Label>{t(($) => $.portal.agent)}</Label>
          <Select value={agentId} onValueChange={setAgentId}>
            <SelectTrigger>
              <SelectValue placeholder={t(($) => $.portal.agent_placeholder)} />
            </SelectTrigger>
            <SelectContent>
              {(agents ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t(($) => $.portal.headline)}</Label>
          <Input
            value={hero.headline ?? ""}
            onChange={(e) => setHero({ ...hero, headline: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t(($) => $.portal.subheadline)}</Label>
          <Textarea
            value={hero.subheadline ?? ""}
            onChange={(e) => setHero({ ...hero, subheadline: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t(($) => $.portal.greeting)}</Label>
          <Textarea
            value={hero.greeting ?? ""}
            onChange={(e) => setHero({ ...hero, greeting: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t(($) => $.portal.contact_email)}</Label>
          <Input
            value={hero.contact_email ?? ""}
            onChange={(e) => setHero({ ...hero, contact_email: e.target.value })}
          />
        </div>
        <Button
          disabled={save.isPending || (enabled && !agentId)}
          onClick={() =>
            save.mutate({ enabled, agent_id: agentId || undefined, hero_content: hero })
          }
        >
          {t(($) => $.portal.save)}
        </Button>
        {enabled && !agentId ? (
          <p className="text-sm text-destructive">{t(($) => $.portal.agent_required)}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
