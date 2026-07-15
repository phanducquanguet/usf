import type { ReactNode } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@multica/core/i18n/react";
import enCommon from "../../locales/en/common.json";
import enSettings from "../../locales/en/settings.json";

const mockUpdatePortalAdminConfig = vi.hoisted(() => vi.fn());
const membersRef = vi.hoisted(() => ({
  current: [{ user_id: "user-1", role: "owner" as "owner" | "admin" | "member" }],
}));
const agentsRef = vi.hoisted(() => ({
  current: [{ id: "agent-1", name: "Tư vấn" }] as Array<{
    id: string;
    name: string;
    archived_at?: string;
  }>,
}));
const configRef = vi.hoisted(() => ({
  current: { enabled: false } as {
    enabled: boolean;
    agent_id?: string;
    hero_content?: Record<string, string>;
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryKey?: unknown[] }) => {
    const key = opts.queryKey?.[0];
    if (key === "members") return { data: membersRef.current };
    if (key === "agents") return { data: agentsRef.current };
    if (opts.queryKey?.[1] === "admin-projects") return { data: [] };
    if (key === "portal") return { data: configRef.current };
    return { data: undefined };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: (opts: { mutationFn?: (v: unknown) => unknown }) => ({
    mutate: (v: unknown) => opts.mutationFn?.(v),
    isPending: false,
  }),
}));

vi.mock("@multica/core/hooks", () => ({
  useWorkspaceId: () => "workspace-1",
}));

vi.mock("@multica/core/workspace/queries", () => ({
  memberListOptions: () => ({ queryKey: ["members"], queryFn: vi.fn() }),
  agentListOptions: () => ({ queryKey: ["agents"], queryFn: vi.fn() }),
  portalAdminConfigOptions: () => ({ queryKey: ["portal"], queryFn: vi.fn() }),
  portalConfigKeys: {
    adminConfig: (wsId: string) => ["portal", "admin-config", wsId],
  },
  portalAdminProjectsOptions: (wsId: string) => ({
    queryKey: ["portal", "admin-projects", wsId],
    queryFn: vi.fn(),
  }),
  portalProjectKeys: {
    admin: (wsId: string) => ["portal", "admin-projects", wsId],
  },
}));

vi.mock("@multica/core/api", () => ({
  api: {
    getPortalAdminConfig: vi.fn(async () => configRef.current),
    updatePortalAdminConfig: mockUpdatePortalAdminConfig,
  },
}));

vi.mock("@multica/core/auth", () => {
  const useAuthStore = Object.assign(
    (sel?: (s: { user: { id: string } }) => unknown) =>
      sel ? sel({ user: { id: "user-1" } }) : { user: { id: "user-1" } },
    { getState: () => ({ user: { id: "user-1" } }) },
  );
  return { useAuthStore };
});

import { PortalTab } from "./portal-tab";

const TEST_RESOURCES = {
  en: { common: enCommon, settings: enSettings },
};

function I18nWrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider locale="en" resources={TEST_RESOURCES}>
      {children}
    </I18nProvider>
  );
}

describe("PortalTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membersRef.current = [{ user_id: "user-1", role: "owner" }];
    configRef.current = { enabled: false };
  });

  it("shows the enable switch and agent picker to an owner", async () => {
    render(<PortalTab />, { wrapper: I18nWrapper });
    await waitFor(() => {
      expect(screen.getByText("Customer portal")).toBeInTheDocument();
    });
    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByText("Consulting agent")).toBeInTheDocument();
  });

  it("excludes archived agents from the picker", async () => {
    agentsRef.current = [
      { id: "agent-1", name: "Tư vấn", archived_at: "2026-01-01T00:00:00Z" },
    ];
    render(<PortalTab />, { wrapper: I18nWrapper });
    await waitFor(() => {
      expect(
        screen.getByText("This workspace has no agents yet."),
      ).toBeInTheDocument();
    });
    agentsRef.current = [{ id: "agent-1", name: "Tư vấn" }];
  });

  it("warns when the configured agent has been archived", async () => {
    agentsRef.current = [
      { id: "agent-1", name: "Tư vấn", archived_at: "2026-01-01T00:00:00Z" },
      { id: "agent-2", name: "Khác" },
    ];
    configRef.current = { enabled: true, agent_id: "agent-1" };
    render(<PortalTab />, { wrapper: I18nWrapper });
    await waitFor(() => {
      expect(
        screen.getByText(
          "This agent has been archived, so the portal is offline. Pick another agent and save.",
        ),
      ).toBeInTheDocument();
    });
    agentsRef.current = [{ id: "agent-1", name: "Tư vấn" }];
  });

  it("shows the save bar only after an edit, with a working reset", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    render(<PortalTab />, { wrapper: I18nWrapper });
    await waitFor(() => {
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch"));
    expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    await waitFor(() =>
      expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("offers a view-portal shortcut", async () => {
    render(<PortalTab />, { wrapper: I18nWrapper });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "View portal" }),
      ).toBeInTheDocument();
    });
  });

  it("renders a read-only notice for non-owners", async () => {
    membersRef.current = [{ user_id: "user-1", role: "member" }];
    render(<PortalTab />, { wrapper: I18nWrapper });
    await waitFor(() => {
      expect(
        screen.getByText("Only the workspace owner can configure the portal."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});
