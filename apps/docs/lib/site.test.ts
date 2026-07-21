import { beforeEach, describe, expect, it, vi } from "vitest";

const existingDocs = vi.hoisted(() => new Set<string>());

vi.mock("node:fs", () => ({
  existsSync: vi.fn((path: string) => {
    const normalized = path.replaceAll("\\", "/");
    return [...existingDocs].some((suffix) => normalized.endsWith(suffix));
  }),
}));

const pages = new Map<string, { url: string }>([
  ["en:", { url: "/" }],
  ["vi:", { url: "/vi" }],
  ["en:agents", { url: "/agents" }],
  ["vi:agents", { url: "/vi/agents" }],
]);

vi.mock("@/lib/source", () => ({
  source: {
    getPage: vi.fn((slugs: string[], lang: string) => {
      return pages.get(`${lang}:${slugs.join("/")}`) ?? null;
    }),
  },
}));

// Suffixes carry the containing "docs/" segment so `agents/index.vi.mdx`
// (a per-page candidate) can never match the home page's `docs/index.vi.mdx`.
beforeEach(() => {
  existingDocs.clear();
  existingDocs.add("docs/index.mdx");
  existingDocs.add("docs/index.vi.mdx");
  existingDocs.add("docs/agents.mdx");
});

describe("docsAlternates", () => {
  it("omits Vietnamese hreflang when no Vietnamese MDX file exists for the page", async () => {
    const { docsAlternates } = await import("./site");

    expect(docsAlternates(["agents"])).toEqual({
      canonical: "https://uniai.unicomhub.com/docs/agents",
      languages: {
        en: "https://uniai.unicomhub.com/docs/agents",
        "x-default": "https://uniai.unicomhub.com/docs/agents",
      },
    });
  });

  it("omits Vietnamese hreflang even when source.getPage returns a page for Vietnamese", async () => {
    const { docsAlternates } = await import("./site");

    expect(docsAlternates(["agents"]).languages).not.toHaveProperty("vi");
  });

  it("includes Vietnamese hreflang when a real *.vi.mdx page exists", async () => {
    existingDocs.add("docs/agents.vi.mdx");
    const { docsAlternates } = await import("./site");

    expect(docsAlternates(["agents"])).toEqual({
      canonical: "https://uniai.unicomhub.com/docs/agents",
      languages: {
        en: "https://uniai.unicomhub.com/docs/agents",
        vi: "https://uniai.unicomhub.com/docs/vi/agents",
        "x-default": "https://uniai.unicomhub.com/docs/agents",
      },
    });
  });

  it("keeps the locale root alternates limited to real localized MDX pages", async () => {
    const { docsAlternates } = await import("./site");

    expect(docsAlternates([])).toEqual({
      canonical: "https://uniai.unicomhub.com/docs",
      languages: {
        en: "https://uniai.unicomhub.com/docs",
        vi: "https://uniai.unicomhub.com/docs/vi",
        "x-default": "https://uniai.unicomhub.com/docs",
      },
    });
  });
});
