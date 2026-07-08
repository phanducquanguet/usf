import { describe, expect, it } from "vitest";
import {
  isSupportedLocale,
  resolveLocaleFromSignals,
} from "./locale-routing";

describe("locale routing", () => {
  it("accepts only app-supported locale identifiers", () => {
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("vi")).toBe(true);
    expect(isSupportedLocale("zh-Hans")).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
  });

  it("resolves unsupported cookie locales to the default", () => {
    expect(
      resolveLocaleFromSignals({
        cookieLocale: "zh",
        acceptLanguage: "fr-FR,fr;q=0.9",
      }),
    ).toBe("vi");
  });

  it("prefers cookie locale over Accept-Language", () => {
    expect(
      resolveLocaleFromSignals({
        cookieLocale: "en",
        acceptLanguage: "vi-VN,vi;q=0.9",
      }),
    ).toBe("en");
  });

  it("falls back to Accept-Language when no cookie is set", () => {
    expect(
      resolveLocaleFromSignals({
        acceptLanguage: "en-US,en;q=0.9",
      }),
    ).toBe("en");
  });

  it("matches Vietnamese browser language signals", () => {
    expect(
      resolveLocaleFromSignals({
        acceptLanguage: "vi-VN,vi;q=0.9,en;q=0.8",
      }),
    ).toBe("vi");
  });
});
