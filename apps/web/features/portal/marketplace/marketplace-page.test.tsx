import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@multica/core/i18n/react";
import enPortal from "@multica/views/locales/en/portal.json";
import type { ReactNode } from "react";
import { MarketplacePage } from "./marketplace-page";

const TEST_RESOURCES = { en: { portal: enPortal } };

const { mockGetConfig, mockGetProjects } = vi.hoisted(() => ({
  mockGetConfig: vi.fn(),
  mockGetProjects: vi.fn(),
}));

vi.mock("@multica/core/api", () => ({
  api: { getPortalPublicConfig: mockGetConfig, getPortalProjects: mockGetProjects },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MarketplacePage />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <I18nProvider locale="en" resources={TEST_RESOURCES}>
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </I18nProvider>
    ),
  });
}

describe("MarketplacePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockResolvedValue({ enabled: true, hero_content: {}, agent: { name: "Bot" } });
    mockGetProjects.mockResolvedValue([
      {
        slug: "a", name: "App F&B", description: "desc", industry: "F&B",
        features: [], images: [], demo_url: "", portfolio_url: "",
      },
      {
        slug: "b", name: "App Retail", description: "desc", industry: "Retail",
        features: [], images: [], demo_url: "", portfolio_url: "",
      },
    ]);
  });

  it("renders projects and filters by industry", async () => {
    renderPage();
    expect(await screen.findByText("App F&B")).toBeInTheDocument();
    expect(screen.getByText("App Retail")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "F&B" }));
    expect(screen.queryByText("App Retail")).not.toBeInTheDocument();
    expect(screen.getByText("App F&B")).toBeInTheDocument();
  });

  it("filters by search text", async () => {
    renderPage();
    await screen.findByText("App F&B");
    await userEvent.type(screen.getByPlaceholderText("Search projects…"), "retail");
    expect(screen.queryByText("App F&B")).not.toBeInTheDocument();
    expect(screen.getByText("App Retail")).toBeInTheDocument();
  });

  it("shows the closed state when the portal is disabled", async () => {
    mockGetConfig.mockResolvedValue({ enabled: false });
    renderPage();
    expect(
      await screen.findByText("The marketplace is currently closed."),
    ).toBeInTheDocument();
  });
});
