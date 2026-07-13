import { describe, it, expect } from "vitest";
import robots from "./robots";

describe("robots", () => {
  const result = robots();
  const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
  const disallow = Array.isArray(rule?.disallow)
    ? (rule?.disallow ?? [])
    : [rule?.disallow].filter(Boolean);

  it("blocks API/backend endpoints from crawling", () => {
    for (const path of ["/api/", "/portal/", "/auth/", "/uploads/", "/ws"]) {
      expect(disallow).toContain(path);
    }
  });

  it("does not carry stale root-level app paths (real app routes are noindexed)", () => {
    // Workspace pages live under /[workspaceSlug]/... — a literal "/issues"
    // disallow matches nothing and hides the real coverage gap.
    expect(disallow).not.toContain("/issues");
    expect(disallow).not.toContain("/board");
  });

  it("references both the web and docs sitemaps", () => {
    const sitemaps = Array.isArray(result.sitemap) ? result.sitemap : [result.sitemap];
    expect(sitemaps).toContain("https://uniai.unicomhub.com/sitemap.xml");
    expect(sitemaps).toContain("https://uniai.unicomhub.com/docs/sitemap.xml");
  });
});
