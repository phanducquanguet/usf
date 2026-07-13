import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchPortalProject, fetchPortalProjects } from "./portal-server";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("REMOTE_API_URL", "http://api.test");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchPortalProject", () => {
  it("fetches from the remote API and returns the normalized project", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ slug: "app-fnb", name: "App F&B" }),
    );

    const project = await fetchPortalProject("app-fnb");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.test/portal/projects/app-fnb",
      expect.anything(),
    );
    expect(project).toMatchObject({
      slug: "app-fnb",
      name: "App F&B",
      description: "",
      features: [],
      images: [],
    });
  });

  it("returns null on 404 so the page can render a real 404", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: "not found" }, 404));
    expect(await fetchPortalProject("missing")).toBeNull();
  });

  it("returns undefined when the API is unreachable (client will retry)", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await fetchPortalProject("app-fnb")).toBeUndefined();
  });
});

describe("fetchPortalProjects", () => {
  it("returns the normalized project list", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ projects: [{ slug: "a", name: "A" }] }),
    );
    const projects = await fetchPortalProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({ slug: "a", name: "A", images: [] });
  });

  it("degrades to an empty list when the API is unreachable", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await fetchPortalProjects()).toEqual([]);
  });
});
