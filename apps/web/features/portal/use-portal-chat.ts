"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

// projectSlug: the marketplace project whose panel hosts this chat. It rides
// along with every send; the server only uses it to build context for the
// session's first message, which keeps reused sessions anchored to the
// project the guest is looking at now.
export function usePortalChat(projectSlug?: string) {
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
  // Pending-message pattern, failure half: a send that errored keeps its
  // content here so the UI can render a failed bubble with a retry action
  // instead of silently dropping what the guest wrote.
  const [failed, setFailed] = useState<string | null>(null);

  const clearToken = useCallback(() => {
    defaultStorage.removeItem(PORTAL_TOKEN_STORAGE_KEY);
    setToken(null);
  }, []);

  const start = useMutation({
    mutationFn: (projectSlug?: string) => api.createPortalGuestSession(projectSlug),
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

  const pageMessages = page.data?.messages;
  const messages: PortalChatMessage[] = useMemo(() => pageMessages ?? [], [pageMessages]);
  const status = page.data?.status ?? "active";
  // Streamed text of the reply being written right now. Gated on the same
  // payload's pending flag so a stale partial can never outlive its task —
  // the response carrying the final message also carries pending=false.
  const partial = page.data?.pending === true ? page.data.partial ?? "" : "";

  // The pending bubble is derived, so the frame where the server list first
  // contains the message never paints it twice; the state itself is released
  // in an effect once delivery is confirmed.
  const delivered =
    outgoing != null && messages.some((m) => m.role === "user" && m.content === outgoing);
  const visibleOutgoing = delivered ? null : outgoing;
  const pending = page.data?.pending === true || visibleOutgoing != null;

  useEffect(() => {
    if (delivered) setOutgoing(null);
  }, [delivered]);

  const send = useMutation({
    // Callers are gated on hasSession, so token is non-null here.
    mutationFn: (content: string) =>
      api.sendPortalMessage(token as string, content, projectSlug),
    onMutate: (content) => {
      setOutgoing(content);
      setFailed(null);
      setAgentUnavailable(false);
    },
    onError: (err, content) => {
      setOutgoing(null);
      if (isAuthGone(err)) clearToken();
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("503") || msg.includes("agent_unavailable")) {
        // The server persists the message before enqueueing the agent run, so
        // on 503 it is already saved — retrying would duplicate it. The busy
        // banner is the whole story.
        setAgentUnavailable(true);
      } else {
        setFailed(content);
      }
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
    startSession: (projectSlug?: string) => start.mutate(projectSlug),
    starting: start.isPending,
    startFailed: start.isError,
    messages,
    outgoing: visibleOutgoing,
    failed,
    retry: () => {
      if (token != null && failed != null) send.mutate(failed);
    },
    pending,
    partial,
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
    confirmFailed: confirm.isError,
  };
}
