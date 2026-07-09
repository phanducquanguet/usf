"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@multica/core/api";
import { defaultStorage } from "@multica/core/platform";
import type { PortalChatMessage, PortalContact } from "@multica/core/types/portal";
import {
  PORTAL_POLL_ACTIVE_MS,
  PORTAL_POLL_IDLE_MS,
  PORTAL_SUMMARY_MARKER,
  PORTAL_TOKEN_STORAGE_KEY,
} from "./constants";

function isAuthGone(err: unknown): boolean {
  // The shared client throws on non-2xx; 401 = unknown token, 410 = expired.
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("401") || msg.includes("410");
}

export function usePortalChat() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() =>
    defaultStorage.getItem(PORTAL_TOKEN_STORAGE_KEY),
  );
  // Pending-message pattern: render optimistically with a visible pending
  // state; clear once the server list contains the message.
  const [outgoing, setOutgoing] = useState<string | null>(null);
  // Set when a send fails with 503 agent_unavailable (daemon offline) so the
  // UI can show an "assistant is busy" banner.
  const [agentUnavailable, setAgentUnavailable] = useState(false);

  const clearToken = useCallback(() => {
    defaultStorage.removeItem(PORTAL_TOKEN_STORAGE_KEY);
    setToken(null);
  }, []);

  const start = useMutation({
    mutationFn: () => api.createPortalGuestSession(),
    onSuccess: ({ token: fresh }) => {
      if (!fresh) return;
      defaultStorage.setItem(PORTAL_TOKEN_STORAGE_KEY, fresh);
      setToken(fresh);
    },
  });

  const page = useQuery({
    queryKey: ["portal", "messages", token],
    queryFn: async () => {
      try {
        return await api.listPortalMessages(token as string);
      } catch (err) {
        if (isAuthGone(err)) clearToken();
        throw err;
      }
    },
    enabled: token != null,
    refetchInterval: (q) =>
      q.state.data?.pending === true ? PORTAL_POLL_ACTIVE_MS : PORTAL_POLL_IDLE_MS,
  });

  const messages: PortalChatMessage[] = page.data?.messages ?? [];
  const pending = page.data?.pending === true || outgoing != null;
  const status = page.data?.status ?? "active";

  if (outgoing != null && messages.some((m) => m.role === "user" && m.content === outgoing)) {
    setOutgoing(null);
  }

  const send = useMutation({
    // Callers are gated on hasSession, so token is non-null here.
    mutationFn: (content: string) => api.sendPortalMessage(token as string, content),
    onMutate: (content) => {
      setOutgoing(content);
      setAgentUnavailable(false);
    },
    onError: (err) => {
      setOutgoing(null);
      if (isAuthGone(err)) clearToken();
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("503") || msg.includes("agent_unavailable")) setAgentUnavailable(true);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["portal", "messages", token] }),
  });

  const confirm = useMutation({
    mutationFn: (contact: PortalContact) =>
      api.confirmPortalSession(token as string, contact),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["portal", "messages", token] }),
  });

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant"),
    [messages],
  );
  const summaryReady =
    status === "active" && lastAssistant?.content.includes(PORTAL_SUMMARY_MARKER) === true;

  return {
    token,
    hasSession: token != null,
    startSession: () => start.mutate(),
    starting: start.isPending,
    startFailed: start.isError,
    messages,
    outgoing,
    pending,
    status,
    summaryReady,
    agentUnavailable,
    send: (content: string) => {
      if (token != null) send.mutate(content);
    },
    sendBusy: send.isPending,
    confirm: (contact: PortalContact) => {
      if (token != null) confirm.mutate(contact);
    },
    confirming: confirm.isPending,
  };
}
