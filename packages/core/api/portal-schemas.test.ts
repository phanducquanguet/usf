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

  it("listPortalMessages exposes streamed partial text", async () => {
    stubFetchJson({ messages: [], pending: true, status: "active", partial: "Chào bạn, " });
    const client = new ApiClient("https://api.example.test");
    const page = await client.listPortalMessages("pgt_x");
    expect(page.pending).toBe(true);
    expect(page.partial).toBe("Chào bạn, ");
  });

  it("listPortalMessages keeps the page when partial is malformed", async () => {
    stubFetchJson({ messages: [], pending: true, status: "active", partial: 123 });
    const client = new ApiClient("https://api.example.test");
    const page = await client.listPortalMessages("pgt_x");
    expect(page.pending).toBe(true);
    expect(page.partial).toBe("");
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

  it("getPortalProjects falls back to [] on garbage and fills missing fields", async () => {
    stubFetchJson({ projects: "nope" });
    const client = new ApiClient("https://api.example.test");
    expect(await client.getPortalProjects()).toEqual([]);

    stubFetchJson({ projects: [{ slug: "a", name: "A", future_field: 1 }] });
    const projects = await client.getPortalProjects();
    expect(projects).toEqual([
      {
        slug: "a",
        name: "A",
        description: "",
        industry: "",
        features: [],
        images: [],
        demo_url: "",
        portfolio_url: "",
      },
    ]);
  });

  it("getPortalProject returns null on malformed body", async () => {
    stubFetchJson({ nope: true });
    const client = new ApiClient("https://api.example.test");
    expect(await client.getPortalProject("x")).toBeNull();
  });

  it("getPortalAdminProjects tolerates drift and defaults internals", async () => {
    stubFetchJson({
      projects: [{ id: "p1", slug: "a", name: "A", some_future_field: 1 }],
    });
    const client = new ApiClient("https://api.example.test");
    const projects = await client.getPortalAdminProjects();
    expect(projects[0]).toMatchObject({
      id: "p1",
      slug: "a",
      source_url: "",
      published: false,
      sort_order: 0,
    });
  });

  it("createPortalGuestSession sends project_slug only when provided", async () => {
    stubFetchJson({ token: "pgt_a" });
    const client = new ApiClient("https://api.example.test");
    await client.createPortalGuestSession("my-project");
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ project_slug: "my-project" }),
    );

    stubFetchJson({ token: "pgt_b" });
    await client.createPortalGuestSession();
    const secondMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(secondMock.mock.calls[0]?.[1]?.body).toBeUndefined();
  });
});
