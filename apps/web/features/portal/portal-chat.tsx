"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, X } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { Input } from "@multica/ui/components/ui/input";
import { Textarea } from "@multica/ui/components/ui/textarea";
import { Markdown } from "@multica/ui/markdown";
import { useT } from "@multica/views/i18n";
import { usePortalChat } from "./use-portal-chat";

export function PortalChat({
  onClose,
  greeting,
  agentName,
}: {
  onClose: () => void;
  greeting?: string;
  agentName?: string;
}) {
  const { t } = useT("portal");
  const chat = usePortalChat();
  const [draft, setDraft] = useState("");
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const bottomRef = useRef<HTMLDivElement>(null);

  const { hasSession, starting, startFailed, startSession } = chat;
  useEffect(() => {
    if (!hasSession && !starting && !startFailed) startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages.length, chat.outgoing, chat.pending]);

  const submit = () => {
    const content = draft.trim();
    if (!content || chat.pending || chat.sendBusy) return;
    chat.send(content);
    setDraft("");
  };

  // No session yet: show an explicit connecting / failed state instead of an
  // empty panel with a live composer (sending without a token is impossible).
  if (!hasSession) {
    return (
      <PortalShell onClose={onClose} title={agentName ?? t(($) => $.chat.title)}>
        <div
          className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
          role="status"
        >
          {startFailed ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t(($) => $.chat.start_failed)}
              </p>
              <Button variant="outline" onClick={startSession}>
                {t(($) => $.chat.retry)}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t(($) => $.chat.connecting)}
            </div>
          )}
        </div>
      </PortalShell>
    );
  }

  if (chat.status === "confirmed") {
    return (
      <PortalShell onClose={onClose} title={agentName ?? t(($) => $.chat.title)}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-lg font-medium">{t(($) => $.thankyou.title)}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {t(($) => $.thankyou.body)}
          </p>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell onClose={onClose} title={agentName ?? t(($) => $.chat.title)}>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <AgentBubble content={greeting || t(($) => $.chat.greeting)} />
        {chat.messages.map((m) =>
          m.role === "user" ? (
            <UserBubble key={m.id} content={m.content} />
          ) : (
            <AgentBubble key={m.id} content={m.content} />
          ),
        )}
        {chat.outgoing ? <UserBubble content={chat.outgoing} pending /> : null}
        {chat.pending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t(($) => $.chat.thinking)}
          </div>
        ) : null}
        {chat.summaryReady ? (
          <div className="rounded-lg border bg-card p-4">
            <p className="mb-3 text-sm font-medium">{t(($) => $.confirm.title)}</p>
            <div className="space-y-2">
              <Input
                placeholder={t(($) => $.confirm.name)}
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
              />
              <Input
                type="email"
                placeholder={t(($) => $.confirm.email)}
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
              />
              <Input
                placeholder={t(($) => $.confirm.phone)}
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              />
              <Button
                className="w-full"
                disabled={
                  chat.confirming || !contact.name.trim() || !contact.email.includes("@")
                }
                onClick={() => chat.confirm(contact)}
              >
                {t(($) => $.confirm.submit)}
              </Button>
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>
      <div className="border-t p-3">
        {chat.agentUnavailable ? (
          <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
            {t(($) => $.chat.agent_unavailable)}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <Textarea
            rows={2}
            className="min-h-0 flex-1 resize-none"
            placeholder={t(($) => $.chat.placeholder)}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button
            size="icon"
            aria-label={t(($) => $.chat.send)}
            onClick={submit}
            disabled={chat.pending || chat.sendBusy || !draft.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {chat.pending ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t(($) => $.chat.wait_note)}
          </p>
        ) : null}
      </div>
    </PortalShell>
  );
}

function PortalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useT("portal");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-medium">{title}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t(($) => $.chat.close)}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {children}
    </div>
  );
}

function UserBubble({ content, pending }: { content: string; pending?: boolean }) {
  // Brand-tinted, matching the landing hero's ChatPreview bubbles so the
  // product delivers exactly what the preview promises.
  return (
    <div className="flex justify-end">
      <div
        className={`max-w-[80%] rounded-2xl rounded-br-sm bg-brand/15 px-3.5 py-2 text-sm text-foreground ${pending ? "opacity-60" : ""}`}
      >
        {content}
      </div>
    </div>
  );
}

function AgentBubble({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
      <Markdown>{content}</Markdown>
    </div>
  );
}
