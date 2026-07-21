import { describe, expect, it } from "vitest";
import { prefixLocale } from "./locale-link";

describe("prefixLocale", () => {
  it("prefixes root-relative paths with the active non-default locale", () => {
    expect(prefixLocale("/workspaces", "vi")).toBe("/vi/workspaces");
    expect(prefixLocale("/agents-create", "vi")).toBe("/vi/agents-create");
  });

  it("preserves anchors and query strings on prefixed paths", () => {
    expect(prefixLocale("/providers#claude-code", "vi")).toBe(
      "/vi/providers#claude-code",
    );
    expect(prefixLocale("/agents?from=docs", "vi")).toBe(
      "/vi/agents?from=docs",
    );
  });

  it("rewrites the bare root path to the locale root", () => {
    expect(prefixLocale("/", "vi")).toBe("/vi");
  });

  it("leaves the default language untouched (URLs are prefix-less)", () => {
    expect(prefixLocale("/workspaces", "en")).toBe("/workspaces");
    expect(prefixLocale("/", "en")).toBe("/");
  });

  it("does not double-prefix paths that already carry a known locale", () => {
    expect(prefixLocale("/vi/workspaces", "vi")).toBe("/vi/workspaces");
    expect(prefixLocale("/en/workspaces", "vi")).toBe("/en/workspaces");
  });

  it("leaves external URLs alone", () => {
    expect(prefixLocale("https://multica.ai/download", "vi")).toBe(
      "https://multica.ai/download",
    );
    expect(prefixLocale("mailto:hello@multica.ai", "vi")).toBe(
      "mailto:hello@multica.ai",
    );
    expect(prefixLocale("tel:+1234567890", "vi")).toBe("tel:+1234567890");
  });

  it("leaves in-page anchors and relative paths alone", () => {
    expect(prefixLocale("#section", "vi")).toBe("#section");
    expect(prefixLocale("./sibling", "vi")).toBe("./sibling");
    expect(prefixLocale("../sibling", "vi")).toBe("../sibling");
  });

  it("returns empty/undefined hrefs unchanged", () => {
    expect(prefixLocale("", "vi")).toBe("");
  });
});
