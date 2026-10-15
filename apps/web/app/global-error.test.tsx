// @vitest-environment jsdom

import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCALE_COOKIE } from "@multica/core/i18n";
import { resolveEmergencyLocale } from "./emergency-locale";
import GlobalError from "./global-error";

vi.mock("@multica/core/analytics", () => ({
  captureException: vi.fn(),
}));

function setBrowserLanguages(languages: string[]) {
  Object.defineProperty(window.navigator, "languages", {
    configurable: true,
    value: languages,
  });
}

function resetDocument() {
  document.open();
  document.write("<!doctype html><html><head></head><body></body></html>");
  document.close();
}

let hydratedRoot: Root | undefined;

async function hydrateGlobalError(documentLanguage: string) {
  const reset = vi.fn();
  const onRecoverableError = vi.fn();
  const element = <GlobalError error={new Error("boom")} reset={reset} />;

  document.open();
  document.write(`<!doctype html>${renderToString(element)}`);
  document.close();
  document.documentElement.lang = documentLanguage;

  await act(async () => {
    hydratedRoot = hydrateRoot(document, element, { onRecoverableError });
  });

  return { reset, onRecoverableError };
}

afterEach(async () => {
  await act(async () => {
    hydratedRoot?.unmount();
  });
  hydratedRoot = undefined;
  document.cookie = `${LOCALE_COOKIE}=;path=/;max-age=0`;
  setBrowserLanguages(["en-US"]);
  resetDocument();
});

describe("resolveEmergencyLocale", () => {
  it("prefers the product locale cookie over browser languages", () => {
    document.cookie = `${LOCALE_COOKIE}=en;path=/`;
    setBrowserLanguages(["vi-VN"]);

    expect(resolveEmergencyLocale()).toBe("en");
  });

  it("hydrates with the browser locale when no cookie exists", async () => {
    setBrowserLanguages(["vi-VN", "vi"]);
    const { reset, onRecoverableError } = await hydrateGlobalError("vi-VN");

    expect(document.documentElement.lang).toBe("vi-VN");
    expect(document.body).toHaveTextContent("Đã xảy ra lỗi");
    expect(document.body).not.toHaveTextContent("Something went wrong");
    expect(onRecoverableError).not.toHaveBeenCalled();

    await act(async () => {
      document.querySelector("button")?.click();
    });
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("hydrates in vi from the cookie when the browser uses another language", async () => {
    document.cookie = `${LOCALE_COOKIE}=vi;path=/`;
    setBrowserLanguages(["en-US"]);

    const { onRecoverableError } = await hydrateGlobalError("en");

    expect(document.documentElement.lang).toBe("vi-VN");
    expect(document.body).toHaveTextContent("Đã xảy ra lỗi");
    expect(document.querySelector("button")).toHaveTextContent("Tải lại");
    expect(document.body).not.toHaveTextContent("Something went wrong");
    expect(onRecoverableError).not.toHaveBeenCalled();
  });
});
