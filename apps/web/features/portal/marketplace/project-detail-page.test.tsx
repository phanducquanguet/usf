import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@multica/core/i18n/react";
import enPortal from "@multica/views/locales/en/portal.json";
import type { ReactNode } from "react";
import type { PortalProject } from "@multica/core/types/portal";
import { ProjectDetailPage } from "./project-detail-page";

const TEST_RESOURCES = { en: { portal: enPortal } };

const { mockGetConfig, mockGetProject } = vi.hoisted(() => ({
  mockGetConfig: vi.fn(),
  mockGetProject: vi.fn(),
}));

vi.mock("@multica/core/api", () => ({
  api: { getPortalPublicConfig: mockGetConfig, getPortalProject: mockGetProject },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const project: PortalProject = {
  slug: "app-fnb",
  name: "App quản lý F&B",
  description: "Phần mềm quản lý chuỗi nhà hàng.",
  industry: "F&B",
  features: [],
  images: [],
  demo_url: "",
  portfolio_url: "",
};

function renderPage(initialProject?: PortalProject) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ProjectDetailPage slug="app-fnb" initialProject={initialProject} />,
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <I18nProvider locale="en" resources={TEST_RESOURCES}>
          <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        </I18nProvider>
      ),
    },
  );
}

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockResolvedValue({ enabled: false });
  });

  it("renders server-provided project content synchronously without refetching", () => {
    renderPage(project);

    // Content must be in the initial render (what crawlers see via SSR),
    // not gated behind a client fetch.
    expect(
      screen.getByRole("heading", { name: "App quản lý F&B" }),
    ).toBeInTheDocument();
    expect(mockGetProject).not.toHaveBeenCalled();
  });

  it("still fetches on the client when no initial project is provided", async () => {
    mockGetProject.mockResolvedValue(project);

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "App quản lý F&B" }),
    ).toBeInTheDocument();
    expect(mockGetProject).toHaveBeenCalledWith("app-fnb");
  });
});
