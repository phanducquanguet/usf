import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateMetadata } from "./page";

const { mockFetchProject } = vi.hoisted(() => ({ mockFetchProject: vi.fn() }));

vi.mock("@/lib/portal-server", () => ({
  fetchPortalProject: mockFetchProject,
}));

const params = Promise.resolve({ slug: "app-fnb" });

describe("marketplace project generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds project-specific metadata when the project exists", async () => {
    mockFetchProject.mockResolvedValue({
      slug: "app-fnb",
      name: "App F&B",
      description: "Quản lý chuỗi nhà hàng.",
      industry: "",
      features: [],
      images: [],
      demo_url: "",
      portfolio_url: "",
    });

    const md = await generateMetadata({ params });

    expect(md.title).toEqual({ absolute: "App F&B — UNICOM" });
    expect(md.alternates?.canonical).toBe("/marketplace/app-fnb");
  });

  it("throws notFound for a missing project instead of emitting metadata", async () => {
    // Fire notFound() from generateMetadata too so no canonical/OG tags are
    // ever emitted for a missing slug (streamed responses get Next's
    // noindex-meta soft-404 treatment).
    mockFetchProject.mockResolvedValue(null);
    await expect(generateMetadata({ params })).rejects.toThrowError();
  });

  it("keeps a self-referencing canonical when the API is unreachable", async () => {
    mockFetchProject.mockResolvedValue(undefined);
    const md = await generateMetadata({ params });
    expect(md.alternates?.canonical).toBe("/marketplace/app-fnb");
  });
});
