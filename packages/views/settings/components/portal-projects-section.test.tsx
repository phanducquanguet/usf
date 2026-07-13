import type { ReactNode } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@multica/core/i18n/react";
import enCommon from "../../locales/en/common.json";
import enSettings from "../../locales/en/settings.json";

const projectsRef = vi.hoisted(() => ({
  current: [
    {
      id: "p1",
      slug: "quan-ly-nha-hang",
      name: "Quản lý nhà hàng",
      description: "Mô tả",
      industry: "F&B",
      features: ["Đặt bàn"],
      images: [],
      demo_url: "",
      portfolio_url: "",
      source_url: "git@x",
      published: true,
      sort_order: 0,
    },
  ],
}));
const mockCreate = vi.hoisted(() => vi.fn(async (input: unknown) => input));
const mockUpdate = vi.hoisted(() => vi.fn(async (_id: string, input: unknown) => input));
const mockDelete = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryKey?: unknown[] }) => {
    if (opts.queryKey?.[1] === "admin-projects") return { data: projectsRef.current };
    return { data: undefined };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: (opts: {
    mutationFn?: (v: unknown) => Promise<unknown>;
    onSuccess?: () => void;
  }) => ({
    mutate: (v: unknown) => {
      void opts.mutationFn?.(v).then(() => opts.onSuccess?.());
    },
    isPending: false,
  }),
}));

vi.mock("@multica/core/hooks", () => ({
  useWorkspaceId: () => "workspace-1",
}));

vi.mock("@multica/core/workspace/queries", () => ({
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
    getPortalAdminProjects: vi.fn(async () => projectsRef.current),
    createPortalProject: mockCreate,
    updatePortalProject: mockUpdate,
    deletePortalProject: mockDelete,
    uploadFile: vi.fn(async () => ({ url: "https://cdn/x.png" })),
  },
}));

import { PortalProjectsSection } from "./portal-projects-section";

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

describe("PortalProjectsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists projects with industry and publish state", async () => {
    render(<PortalProjectsSection />, { wrapper: I18nWrapper });
    expect(await screen.findByText("Quản lý nhà hàng")).toBeInTheDocument();
    expect(screen.getByText("F&B")).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Published — Quản lý nhà hàng" }),
    ).toBeChecked();
  });

  it("opens the create dialog from the add button", async () => {
    render(<PortalProjectsSection />, { wrapper: I18nWrapper });
    await screen.findByText("Quản lý nhà hàng");
    await userEvent.click(screen.getByRole("button", { name: "Add project" }));
    expect(await screen.findByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Source URL (internal)")).toBeInTheDocument();
  });

  it("toggling publish sends a full update with the flipped flag", async () => {
    render(<PortalProjectsSection />, { wrapper: I18nWrapper });
    await screen.findByText("Quản lý nhà hàng");
    await userEvent.click(
      screen.getByRole("switch", { name: "Published — Quản lý nhà hàng" }),
    );
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ published: false, name: "Quản lý nhà hàng" }),
      ),
    );
  });

  it("deletes only after confirming", async () => {
    render(<PortalProjectsSection />, { wrapper: I18nWrapper });
    await screen.findByText("Quản lý nhà hàng");
    await userEvent.click(
      screen.getByRole("button", { name: "Delete Quản lý nhà hàng" }),
    );
    expect(mockDelete).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("p1"));
  });

  it("asks before discarding unsaved edits and keeps the dialog open", async () => {
    render(<PortalProjectsSection />, { wrapper: I18nWrapper });
    await screen.findByText("Quản lý nhà hàng");
    await userEvent.click(screen.getByRole("button", { name: "Add project" }));
    await userEvent.type(await screen.findByLabelText("Name"), "Draft app");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("Discard unsaved changes?")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    await waitFor(() =>
      expect(screen.queryByLabelText("Name")).not.toBeInTheDocument(),
    );
  });
});
