import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "./client";

function stubFetchJson(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("portal API schema fallbacks", () => {
  it("getPortalPublicConfig falls back to disabled on null body", async () => {
    stubFetchJson(null);
    const client = new ApiClient("https://api.example.test");
    expect(await client.getPortalPublicConfig()).toEqual({ enabled: false });
  });

  it("getPortalPublicConfig tolerates unknown fields and missing agent", async () => {
    stubFetchJson({ enabled: true, hero_content: { headline: "X", extra: 1 }, future: true });
    const client = new ApiClient("https://api.example.test");
    const cfg = await client.getPortalPublicConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.hero_content?.headline).toBe("X");
  });

  it("listPortalMessages falls back to an empty page on wrong shape", async () => {
    stubFetchJson({ wrong: "shape" });
    const client = new ApiClient("https://api.example.test");
    const page = await client.listPortalMessages("pgt_x");
    expect(page.messages).toEqual([]);
    expect(page.pending).toBe(false);
  });

  it("listPortalMessages accepts a future status value", async () => {
    stubFetchJson({ messages: [], pending: false, status: "future_state" });
    const client = new ApiClient("https://api.example.test");
    expect((await client.listPortalMessages("pgt_x")).status).toBe("future_state");
  });

  it("sendPortalMessage returns null when the body is malformed", async () => {
    stubFetchJson({ nope: true });
    const client = new ApiClient("https://api.example.test");
    expect(await client.sendPortalMessage("pgt_x", "hi")).toBeNull();
  });

  it("getPortalAdminConfig falls back to disabled on array body", async () => {
    stubFetchJson([1, 2, 3]);
    const client = new ApiClient("https://api.example.test");
    expect(await client.getPortalAdminConfig()).toEqual({ enabled: false });
  });
});
