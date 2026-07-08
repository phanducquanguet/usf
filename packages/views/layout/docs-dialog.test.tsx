import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DocsDialog from "./docs-dialog";
import { DOC_SECTIONS_BY_LANG } from "./docs-content.generated";

// react-i18next isn't initialised in the views test env. Resolve selectors
// against a vi-like resource to verify section labels follow the app locale.
let mockLanguage = "en";
vi.mock("../i18n", () => ({
  useT: () => ({
    t: (
      sel: (r: {
        help: { docs: string; sections: Record<string, string> };
      }) => string,
    ) =>
      sel({
        help: {
          docs: "Tài liệu",
          sections: { agents: "Agent (vi)" },
        },
      }),
    i18n: { language: mockLanguage },
  }),
}));

beforeEach(() => {
  mockLanguage = "en";
});

describe("DocsDialog", () => {
  it("bundles docs content for every app language with no untransformed MDX", () => {
    for (const sections of Object.values(DOC_SECTIONS_BY_LANG)) {
      const pages = sections.flatMap((s) => s.pages);
      expect(pages.length).toBeGreaterThan(20);
      for (const page of pages) {
        expect(page.title).not.toBe("");
        // Generator must strip imports and MDX components.
        expect(page.content).not.toMatch(/^import /m);
        expect(page.content).not.toMatch(/<\/?(Callout|Steps|NumberedCard)/);
        // No links to external git hosts.
        expect(page.content).not.toMatch(
          /\]\(https?:\/\/(www\.)?(github\.com|gitlab\.com|bitbucket\.org)/,
        );
      }
    }
  });

  it("excludes temporarily closed pages (desktop app) and links to them", () => {
    for (const sections of Object.values(DOC_SECTIONS_BY_LANG)) {
      const pages = sections.flatMap((s) => s.pages);
      expect(pages.map((p) => p.slug)).not.toContain("desktop-app");
      for (const page of pages) {
        expect(page.content).not.toMatch(/\]\(\/desktop-app/);
      }
    }
  });

  it("renders the index page and switches pages via sidebar", async () => {
    const user = userEvent.setup();
    render(<DocsDialog open onOpenChange={() => {}} />);

    expect(screen.getByRole("heading", { level: 1, name: "Welcome" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Agents" }));
    expect(screen.getByRole("heading", { level: 1, name: "Agents" })).toBeInTheDocument();
  });

  it("shows Vietnamese docs content when the app language is vi", () => {
    mockLanguage = "vi";
    render(<DocsDialog open onOpenChange={() => {}} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Chào mừng" }),
    ).toBeInTheDocument();
  });

  it("shows the brand logo and localized chrome", () => {
    render(<DocsDialog open onOpenChange={() => {}} />);

    // Theme-aware UNICOM logo pair in the header (hideTagline variant, so the
    // alt text carries just the brand name).
    expect(screen.getAllByAltText("UNICOM")).toHaveLength(2);
    expect(screen.getByText("Tài liệu")).toBeInTheDocument();

    // Section label uses the app-locale translation when present and falls
    // back to the English label from the generated content otherwise.
    expect(screen.getByText("Agent (vi)")).toBeInTheDocument();
    expect(screen.getByText("Workspace & team")).toBeInTheDocument();
  });

  it("switches pages in place when an internal doc link is clicked", async () => {
    const user = userEvent.setup();
    render(<DocsDialog open onOpenChange={() => {}} />);

    // The Welcome page links to /agents.
    const links = screen.getAllByRole("link", { name: "agents" });
    await user.click(links[0]!);
    expect(screen.getByRole("heading", { level: 1, name: "Agents" })).toBeInTheDocument();
  });

  it("opens external links in a new tab", () => {
    render(<DocsDialog open onOpenChange={() => {}} />);
    const external = document.querySelectorAll('a[href^="http"]');
    for (const a of external) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a.getAttribute("href")).not.toMatch(
        /github\.com|gitlab\.com|bitbucket\.org/,
      );
    }
  });
});
