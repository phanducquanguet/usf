import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@multica/core/i18n/react";
import enPortal from "@multica/views/locales/en/portal.json";
import type { ReactNode } from "react";
import { PortalLanding } from "./portal-landing";

const TEST_RESOURCES = { en: { portal: enPortal } };

const { mockGetConfig } = vi.hoisted(() => ({ mockGetConfig: vi.fn() }));

vi.mock("@multica/core/api", () => ({
  api: {
    getPortalPublicConfig: mockGetConfig,
    getPortalProjects: vi.fn(async () => []),
  },
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { priority: _priority, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// The chat itself is covered by portal-chat.test.tsx.
vi.mock("../portal-chat", () => ({
  PortalChat: () => <div data-testid="portal-chat" />,
}));

function renderLanding() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<PortalLanding />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <I18nProvider locale="en" resources={TEST_RESOURCES}>
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </I18nProvider>
    ),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PortalLanding language toggle", () => {
  it("persists the other locale to the cookie and reloads", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    mockGetConfig.mockReturnValue(new Promise(() => {}));
    renderLanding();
    // Rendered with locale "en" → clicking the active segment is a no-op.
    fireEvent.click(screen.getAllByRole("button", { name: "English" })[0]!);
    expect(reload).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Tiếng Việt" })[0]!);
    expect(document.cookie).toContain("multica-locale=vi");
    expect(reload).toHaveBeenCalled();
  });
});

describe("PortalLanding config states", () => {
  it("never claims the portal is closed while config is loading", () => {
    mockGetConfig.mockReturnValue(new Promise(() => {}));
    renderLanding();
    expect(screen.queryByText(enPortal.disabled.title)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: new RegExp(enPortal.hero.cta) }),
    ).not.toBeInTheDocument();
  });

  it("shows the disabled card with a mailto link when a contact email exists", async () => {
    mockGetConfig.mockResolvedValue({
      enabled: false,
      hero_content: { contact_email: "hello@unicomhub.com" },
    });
    renderLanding();
    expect(await screen.findByText(enPortal.disabled.title)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "hello@unicomhub.com" });
    expect(link).toHaveAttribute("href", "mailto:hello@unicomhub.com");
  });

  it("shows a generic disabled body instead of a dead-end email sentence when no email is configured", async () => {
    mockGetConfig.mockResolvedValue({ enabled: false, hero_content: {} });
    renderLanding();
    expect(await screen.findByText(enPortal.disabled.title)).toBeInTheDocument();
    expect(screen.getByText(enPortal.disabled.body_generic)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(enPortal.disabled.body))).not.toBeInTheDocument();
  });

  it("renders the hero CTAs when the portal is enabled", async () => {
    mockGetConfig.mockResolvedValue({ enabled: true, hero_content: {} });
    renderLanding();
    const ctas = await screen.findAllByRole("button", {
      name: new RegExp(enPortal.hero.cta),
    });
    expect(ctas.length).toBeGreaterThan(0);
    expect(screen.queryByText(enPortal.disabled.title)).not.toBeInTheDocument();
  });
});
