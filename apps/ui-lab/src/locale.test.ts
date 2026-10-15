// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import i18next from "i18next";
import {
  isLabLocale,
  loadLocale,
  LOCALE_STORAGE_KEY,
  productLocale,
} from "./locale";
import { isPreviewSettings } from "./protocol";
import { emptyDraft } from "./tokens";
import en from "./locales/en.json";

afterEach(() => vi.unstubAllGlobals());

describe("UI Lab language preference", () => {
  it("defaults to English regardless of browser language and accepts only en or vi", () => {
    vi.stubGlobal("navigator", { language: "vi-VN" });
    for (const saved of [null, "", "ja", "vi-VN", "garbage"]) {
      vi.stubGlobal("localStorage", {
        getItem: vi.fn().mockReturnValue(saved),
      });
      expect(loadLocale()).toBe("en");
    }
    for (const saved of ["en", "vi"]) {
      const getItem = vi.fn().mockReturnValue(saved);
      vi.stubGlobal("localStorage", { getItem });
      expect(loadLocale()).toBe(saved);
      expect(getItem).toHaveBeenCalledWith(LOCALE_STORAGE_KEY);
    }
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("Storage blocked");
      },
    });
    expect(loadLocale()).toBe("en");
  });

  it("validates iframe locales and maps them to the production locale", () => {
    const message = {
      type: "multica-ui-lab:preview",
      selectedColor: "--brand",
      playbackSpeed: 1,
      scene: "button",
      theme: "light",
      buttonScale: "default",
      draft: emptyDraft(),
    };
    for (const locale of [
      undefined,
      null,
      "",
      "fr",
      "vi-VN",
      {},
      "en",
      "vi",
    ]) {
      expect(isPreviewSettings({ ...message, locale })).toBe(
        isLabLocale(locale),
      );
    }
    expect(productLocale("en")).toBe("en");
    expect(productLocale("vi")).toBe("vi");
  });

  it("provides a catalog with working counts and interpolation", () => {
    const i18n = i18next.createInstance();
    void i18n.init({
      lng: "en",
      initAsync: false,
      resources: { en: { uiLab: en } },
    });
    const english = i18n.getFixedT("en", "uiLab");
    expect(english(($) => $.lab.preview.changeCount, { count: 1 })).toBe(
      "1 change",
    );
    expect(english(($) => $.lab.preview.changeCount, { count: 2 })).toBe(
      "2 changes",
    );
    expect(
      english(($) => $.lab.notice.loaded, { name: "Custom <design>" }),
    ).toContain("Custom");
  });
});
