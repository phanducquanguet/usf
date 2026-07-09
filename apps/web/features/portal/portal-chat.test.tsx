import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@multica/core/i18n/react";
import enPortal from "@multica/views/locales/en/portal.json";
import type { ReactNode } from "react";
import { PORTAL_TOKEN_STORAGE_KEY } from "./constants";
import { PortalChat } from "./portal-chat";

const TEST_RESOURCES = { en: { portal: enPortal } };

const { mockCreateSession, mockListMessages, mockSendMessage, mockConfirmSession } =
  vi.hoisted(() => ({
    mockCreateSession: vi.fn(),
    mockListMessages: vi.fn(),
    mockSendMessage: vi.fn(),
    mockConfirmSession: vi.fn(),
  }));

vi.mock("@multica/core/api", () => ({
  api: {
    createPortalGuestSession: mockCreateSession,
    listPortalMessages: mockListMessages,
    sendPortalMessage: mockSendMessage,
    confirmPortalSession: mockConfirmSession,
  },
}));

// The full markdown renderer is irrelevant here; passthrough is enough.
vi.mock("@multica/ui/markdown", () => ({
  Markdown: ({ children }: { children: string }) => <div>{children}</div>,
}));

function renderChat(props: { greeting?: string; onClose?: () => void } = {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<PortalChat onClose={props.onClose ?? vi.fn()} greeting={props.greeting} />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <I18nProvider locale="en" resources={TEST_RESOURCES}>
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </I18nProvider>
    ),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem(PORTAL_TOKEN_STORAGE_KEY);
});

describe("PortalChat session start", () => {
  it("shows a connecting state without a composer while the session starts", () => {
    mockCreateSession.mockReturnValue(new Promise(() => {}));
    renderChat();
    expect(screen.getByText(enPortal.chat.connecting)).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(enPortal.chat.placeholder),
    ).not.toBeInTheDocument();
  });

  it("shows a retry state when the session fails to start, then recovers on retry", async () => {
    const user = userEvent.setup();
    mockCreateSession.mockRejectedValueOnce(new Error("500"));
    mockListMessages.mockResolvedValue({ messages: [], pending: false, status: "active" });
    renderChat();

    const retry = await screen.findByRole("button", { name: enPortal.chat.retry });
    // No composer while there is no session, so nothing can send a null token.
    expect(
      screen.queryByPlaceholderText(enPortal.chat.placeholder),
    ).not.toBeInTheDocument();
    expect(mockSendMessage).not.toHaveBeenCalled();

    mockCreateSession.mockResolvedValueOnce({ token: "tok-1" });
    await user.click(retry);

    expect(
      await screen.findByPlaceholderText(enPortal.chat.placeholder),
    ).toBeInTheDocument();
    expect(mockCreateSession).toHaveBeenCalledTimes(2);
  });

  it("falls back to the locale greeting when none is configured", async () => {
    mockCreateSession.mockResolvedValue({ token: "tok-1" });
    mockListMessages.mockResolvedValue({ messages: [], pending: false, status: "active" });
    renderChat();
    expect(await screen.findByText(enPortal.chat.greeting)).toBeInTheDocument();
  });

  it("prefers the configured greeting over the locale default", async () => {
    mockCreateSession.mockResolvedValue({ token: "tok-1" });
    mockListMessages.mockResolvedValue({ messages: [], pending: false, status: "active" });
    renderChat({ greeting: "Custom hello" });
    expect(await screen.findByText("Custom hello")).toBeInTheDocument();
    expect(screen.queryByText(enPortal.chat.greeting)).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockCreateSession.mockReturnValue(new Promise(() => {}));
    renderChat({ onClose });
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
