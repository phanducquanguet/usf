import { describe, expect, it } from "vitest";
import { docsHrefForLocale } from "./docs-href";

describe("docsHrefForLocale", () => {
  it("routes every supported locale to the English docs", () => {
    expect(docsHrefForLocale("en")).toBe("/docs");
    expect(docsHrefForLocale("vi")).toBe("/docs");
  });
});
