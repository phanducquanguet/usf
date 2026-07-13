"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Loader2,
  Maximize2,
  Minimize2,
  Send,
  X,
} from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { Input } from "@multica/ui/components/ui/input";
import { Textarea } from "@multica/ui/components/ui/textarea";
import { Markdown } from "@multica/ui/markdown";
import { cn } from "@multica/ui/lib/utils";
import { useT } from "@multica/views/i18n";
import { PORTAL_SUMMARY_END_MARKER, PORTAL_SUMMARY_MARKER } from "./constants";
import { usePortalChat } from "./use-portal-chat";

/** The summary markers are a machine contract with the agent; guests should
 * never see them. Strip them for display only — summary detection in
 * use-portal-chat still reads the raw content. */
function stripSummaryMarkers(content: string): string {
  return content
    .replaceAll(PORTAL_SUMMARY_MARKER, "")
    .replaceAll(PORTAL_SUMMARY_END_MARKER, "")
    .trim();
}

export function PortalChat({
  onClose,
  greeting,
  agentName,
  projectSlug,
  projectName,
}: {
  onClose: () => void;
  greeting?: string;
  agentName?: string;
  projectSlug?: string;
  projectName?: string;
}) {
  const { t } = useT("portal");
  const chat = usePortalChat(projectSlug);
  const [draft, setDraft] = useState("");
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [emailTouched, setEmailTouched] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // True while the guest is at (or near) the bottom of the log. Polling can
  // deliver new messages while they scrolled up to reread — don't yank them
  // down; only follow the conversation when they're already following it.
  const stickToBottomRef = useRef(true);

  const { hasSession, starting, startFailed, startSession } = chat;
  useEffect(() => {
    if (!hasSession && !starting && !startFailed) startSession(projectSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSession]);

  // Server-side project context now travels with the first send (see
  // usePortalChat), so this prefill is purely user-visible framing: a guest
  // whose session predates this panel sees their opening message reference
  // the project they clicked. Fresh sessions open with an empty composer —
  // the greeting already invites them to describe their need. Runs once;
  // never overwrites typed text.
  const hadSessionAtMountRef = useRef(hasSession);
  useEffect(() => {
    if (hadSessionAtMountRef.current && projectName && draft === "") {
      setDraft(t(($) => $.marketplace.prefill, { name: projectName }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Desktop only: focus the composer once the session is live. On touch
  // devices this would pop the keyboard before the guest reads the greeting,
  // so the shell's panel focus is kept there instead.
  useEffect(() => {
    if (!hasSession || typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(min-width: 640px)").matches) composerRef.current?.focus();
  }, [hasSession]);

  // Scroll the log container directly — never native scrollIntoView, which
  // scrolls every scrollable ancestor (landing page / visual viewport) and
  // makes the fixed panel jump over the conversation (#3929-class bug).
  useEffect(() => {
    const el = logRef.current;
    if (!el || !stickToBottomRef.current) return;
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [chat.messages.length, chat.outgoing, chat.pending, chat.failed]);

  const submit = () => {
    const content = draft.trim();
    if (!content || chat.pending || chat.sendBusy) return;
    // Sending is an explicit "I'm at the conversation's end" signal.
    stickToBottomRef.current = true;
    chat.send(content);
    setDraft("");
  };

  // Same validity source as the submit gate below; the message appears on
  // blur and clears live as soon as the address becomes valid.
  const emailValid = contact.email.includes("@");
  const emailError =
    emailTouched && contact.email.trim() !== "" && !emailValid
      ? t(($) => $.confirm.email_invalid)
      : null;

  // No session yet: show an explicit connecting / failed state instead of an
  // empty panel with a live composer (sending without a token is impossible).
  if (!hasSession) {
    return (
      <PortalShell onClose={onClose} title={agentName ?? t(($) => $.chat.title)}>
        <div
          className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
          role="status"
        >
          {startFailed ? (
            <>
              <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="size-6 text-destructive" />
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                {t(($) => $.chat.start_failed)}
              </p>
              <Button variant="outline" onClick={() => startSession(projectSlug)}>
                {t(($) => $.chat.retry)}
              </Button>
            </>
          ) : (
            <>
              <div className="flex size-12 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-brand-start to-brand-end motion-reduce:animate-none">
                <Bot className="size-6 text-white" />
              </div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {t(($) => $.chat.connecting)}
              </p>
            </>
          )}
        </div>
      </PortalShell>
    );
  }

  if (chat.status === "confirmed") {
    return (
      <PortalShell onClose={onClose} title={agentName ?? t(($) => $.chat.title)}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="size-7 text-success" />
          </div>
          <p className="text-lg font-semibold">{t(($) => $.thankyou.title)}</p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {t(($) => $.thankyou.body)}
          </p>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell onClose={onClose} title={agentName ?? t(($) => $.chat.title)}>
      {/* The column caps at ~70ch and centers itself, so the expanded desktop
       * panel keeps a readable measure instead of edge-to-edge bubbles.
       * tabIndex: scrollable region must be keyboard-reachable — Safari and
       * Firefox don't make scroll containers focusable on their own. */}
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label={agentName ?? t(($) => $.chat.title)}
        tabIndex={0}
        className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottomRef.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          <AgentBubble content={greeting || t(($) => $.chat.greeting)} />
          {chat.messages.map((m) =>
            m.role === "user" ? (
              <UserBubble key={m.id} content={m.content} />
            ) : (
              <AgentBubble key={m.id} content={stripSummaryMarkers(m.content)} />
            ),
          )}
          {chat.outgoing ? <UserBubble content={chat.outgoing} pending /> : null}
          {chat.failed ? (
            <>
              <UserBubble content={chat.failed} pending />
              <div
                role="alert"
                className="flex items-center gap-2 self-end text-xs text-destructive"
              >
                {t(($) => $.chat.send_failed)}
                <button
                  type="button"
                  className="font-medium underline underline-offset-2 disabled:opacity-50"
                  onClick={chat.retry}
                  disabled={chat.sendBusy}
                >
                  {t(($) => $.chat.resend)}
                </button>
              </div>
            </>
          ) : null}
          {chat.pending ? <TypingIndicator label={t(($) => $.chat.thinking)} /> : null}
          {chat.summaryReady ? (
            <div className="portal-gradient-border rounded-xl bg-card p-4 duration-300 animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none sm:p-5">
              <p className="mb-4 text-sm font-semibold">{t(($) => $.confirm.title)}</p>
              <div className="space-y-3">
                <ContactField
                  id="portal-contact-name"
                  label={t(($) => $.confirm.name)}
                  required
                  autoComplete="name"
                  value={contact.name}
                  onChange={(name) => setContact({ ...contact, name })}
                />
                <ContactField
                  id="portal-contact-email"
                  label={t(($) => $.confirm.email)}
                  required
                  type="email"
                  autoComplete="email"
                  value={contact.email}
                  onChange={(email) => setContact({ ...contact, email })}
                  onBlur={() => setEmailTouched(true)}
                  error={emailError}
                />
                <ContactField
                  id="portal-contact-phone"
                  label={t(($) => $.confirm.phone)}
                  type="tel"
                  autoComplete="tel"
                  value={contact.phone}
                  onChange={(phone) => setContact({ ...contact, phone })}
                />
                <Button
                  className="w-full"
                  disabled={
                    chat.confirming || !contact.name.trim() || !contact.email.includes("@")
                  }
                  onClick={() => chat.confirm(contact)}
                >
                  {chat.confirming ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  {t(($) => $.confirm.submit)}
                </Button>
                {chat.confirmFailed && !chat.confirming ? (
                  <p role="alert" className="text-xs text-destructive">
                    {t(($) => $.confirm.failed)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="border-t border-border/60 p-3 sm:p-4">
        <div className="mx-auto w-full max-w-2xl">
          {chat.agentUnavailable ? (
            <div
              role="alert"
              className="mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              {t(($) => $.chat.agent_unavailable)}
            </div>
          ) : null}
          <div className="flex items-end gap-2 rounded-xl border border-input bg-secondary/40 p-1.5 pl-3.5 transition-colors focus-within:border-brand/50 focus-within:ring-1 focus-within:ring-brand/40">
            <Textarea
              ref={composerRef}
              rows={2}
              aria-label={t(($) => $.chat.placeholder)}
              className="max-h-32 min-h-0 flex-1 resize-none border-0 bg-transparent p-0 py-1.5 shadow-none field-sizing-content focus-visible:ring-0"
              placeholder={t(($) => $.chat.placeholder)}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // isComposing: Enter that commits an IME composition must not
                // send a half-composed message.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <Button
              size="icon"
              className="size-11 shrink-0 rounded-full sm:size-9"
              aria-label={t(($) => $.chat.send)}
              onClick={submit}
              disabled={chat.pending || chat.sendBusy || !draft.trim()}
            >
              {chat.sendBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          {chat.pending ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t(($) => $.chat.wait_note)}
            </p>
          ) : null}
        </div>
      </div>
    </PortalShell>
  );
}

/** Docked panel on desktop (bottom-right, like the hero ChatPreview it
 * fulfils), full-screen sheet on mobile. Carries the brand gradient border +
 * glow — the landing's signature treatment for the chat surface. */
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
  const panelRef = useRef<HTMLDivElement>(null);
  // Desktop-only wide mode, mirroring the in-app chat window's expand/restore.
  // Lives here so it survives the connecting → active → confirmed re-renders.
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.isComposing) return;
      // Closing unmounts the panel and discards the draft / half-filled
      // contact form. If the guest is mid-typing, Escape must not eat their
      // text — a second Escape from an empty field still closes.
      const el = e.target;
      if (
        (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
        el.value.trim() !== ""
      ) {
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Non-modal dialog focus pattern: move focus into the panel on open and
  // return it to the trigger on close. The composer steals focus afterwards
  // on desktop (child effects run first), which is the intended order.
  useEffect(() => {
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    return () => prev?.focus();
  }, []);

  // Below sm the sheet visually covers the whole landing, but its siblings
  // would still be reachable by keyboard / screen reader. Make them inert.
  // Siblings are captured up front: by passive-cleanup time the panel may
  // already be detached, and a live query would then restore nothing.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 639px)");
    const siblings = Array.from(panel.parentElement?.children ?? []).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== panel,
    );
    const apply = () => {
      for (const el of siblings) el.inert = mq.matches;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      for (const el of siblings) el.inert = false;
    };
  }, []);

  // iOS Safari keeps the layout viewport when the keyboard opens, so a
  // bottom-anchored composer would sit behind it. Track the visual viewport
  // and size the full-screen sheet to the visible area instead.
  useEffect(() => {
    const vv = window.visualViewport;
    const panel = panelRef.current;
    if (!vv || !panel) return;
    const onChange = () => {
      panel.style.setProperty("--portal-vvh", `${vv.height}px`);
      panel.style.transform = vv.offsetTop > 0 ? `translateY(${vv.offsetTop}px)` : "";
    };
    onChange();
    vv.addEventListener("resize", onChange);
    vv.addEventListener("scroll", onChange);
    return () => {
      vv.removeEventListener("resize", onChange);
      vv.removeEventListener("scroll", onChange);
    };
  }, []);

  return (
    // Positioning lives on the outer node; portal-gradient-border sets its own
    // `position: relative` and would silently defeat `fixed` on the same node.
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-label={title}
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-[var(--portal-vvh,100dvh)] outline-none",
        expanded
          ? "sm:inset-6 sm:mx-auto sm:h-auto sm:max-w-6xl"
          : "sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(44rem,calc(100dvh-3rem))] sm:w-[min(26.5rem,calc(100vw-3rem))]",
      )}
    >
      <div className="portal-gradient-border portal-glow flex h-full w-full flex-col overflow-hidden bg-card pb-[env(safe-area-inset-bottom)] duration-300 animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <div className="relative shrink-0">
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-start to-brand-end">
              <Bot className="size-5 text-white" />
            </div>
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-success"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {t(($) => $.chat.status)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-9 shrink-0 sm:inline-flex"
            aria-label={expanded ? t(($) => $.chat.collapse) : t(($) => $.chat.expand)}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 sm:size-9"
            aria-label={t(($) => $.chat.close)}
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ContactField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  type,
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-destructive">
            *
          </span>
        ) : null}
      </label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function UserBubble({ content, pending }: { content: string; pending?: boolean }) {
  // Brand-tinted, matching the landing hero's ChatPreview bubbles so the
  // product delivers exactly what the preview promises.
  return (
    <div
      className={cn(
        "max-w-[85%] self-end whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-brand/15 px-4 py-2.5 text-sm leading-relaxed text-foreground duration-200 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none",
        pending && "opacity-60",
      )}
    >
      {content}
    </div>
  );
}

function AgentBubble({ content }: { content: string }) {
  return (
    <div className="max-w-[85%] self-start break-words rounded-2xl rounded-bl-sm bg-secondary px-4 py-2.5 text-secondary-foreground duration-200 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none">
      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto">
        <Markdown>{content}</Markdown>
      </div>
    </div>
  );
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-1.5 self-start rounded-2xl rounded-bl-sm bg-secondary px-4 py-3.5"
    >
      <span className="sr-only">{label}</span>
      {[0, 250, 500].map((delay) => (
        <span
          key={delay}
          aria-hidden
          className="size-1.5 animate-pulse rounded-full bg-muted-foreground/70 motion-reduce:animate-none"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
