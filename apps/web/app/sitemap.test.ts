import { describe, it, expect, vi, beforeEach } from "vitest";
import sitemap from "./sitemap";
import { SITE_ORIGIN } from "@/lib/seo";

const { mockFetchProjects } = vi.hoisted(() => ({ mockFetchProjects: vi.fn() }));

vi.mock("@/lib/portal-server", () => ({
  fetchPortalProjects: mockFetchProjects,
}));

describe("sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the home page, marketplace and every published project", async () => {
    mockFetchProjects.mockResolvedValue([
      { slug: "app-fnb", name: "A" },
      { slug: "app-retail", name: "B" },
    ]);

    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain(SITE_ORIGIN);
    expect(urls).toContain(`${SITE_ORIGIN}/marketplace`);
    expect(urls).toContain(`${SITE_ORIGIN}/marketplace/app-fnb`);
    expect(urls).toContain(`${SITE_ORIGIN}/marketplace/app-retail`);
  });

  it("still emits the static pages when the project list is unavailable", async () => {
    mockFetchProjects.mockResolvedValue([]);

    const urls = (await sitemap()).map((e) => e.url);

    expect(urls).toEqual([SITE_ORIGIN, `${SITE_ORIGIN}/marketplace`]);
  });
});
