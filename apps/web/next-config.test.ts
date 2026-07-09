import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

// The public customer portal endpoints (/portal/config, /portal/sessions/...)
// are fetched same-origin by the browser without the /api prefix, so they
// must be rewritten to the Go backend like /api/* — otherwise they fall
// through to the app router and 404.
describe("next.config rewrites", () => {
  it("forwards /portal/:path* to the same backend as /api/:path*", async () => {
    const rewrites = await nextConfig.rewrites!();
    const afterFiles = Array.isArray(rewrites) ? rewrites : (rewrites.afterFiles ?? []);

    const api = afterFiles.find((r) => r.source === "/api/:path*");
    const portal = afterFiles.find((r) => r.source === "/portal/:path*");

    expect(api).toBeDefined();
    expect(portal).toBeDefined();
    expect(portal?.destination).toBe(
      api!.destination.replace("/api/:path*", "/portal/:path*"),
    );
  });
});
