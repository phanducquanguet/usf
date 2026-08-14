import { describe, expect, it } from "vitest";
import { pickContentLang } from "./index";

describe("pickContentLang", () => {
  it("uses the shared locale matcher before selecting persisted content", () => {
    expect(pickContentLang("en-US")).toBe("en");
    expect(pickContentLang("vi-VN")).toBe("vi");
  });

  it("falls back to the default locale for unsupported or missing languages", () => {
    // Mirrors the app i18n layer: unmatched languages get DEFAULT_LOCALE (vi).
    expect(pickContentLang("fr-FR")).toBe("vi");
    expect(pickContentLang(null)).toBe("vi");
    expect(pickContentLang(undefined)).toBe("vi");
  });
});
