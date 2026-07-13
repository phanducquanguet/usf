import { ApiClient, ApiError } from "@multica/core/api";
import { noopLogger } from "@multica/core/logger";
import type { PortalProject } from "@multica/core/types/portal";
import { resolveRemoteApiUrl } from "@/config/runtime-urls";

// Server-side access to the public portal endpoints. The browser goes through
// the Next rewrite (`/portal/*` → API); on the server we talk to the API
// origin directly. Reuses ApiClient so schema parsing + normalization match
// the client exactly.
function portalApi(): ApiClient {
  return new ApiClient(resolveRemoteApiUrl(process.env), { logger: noopLogger });
}

/**
 * Fetch one published portal project for SSR/metadata.
 *
 * - project  → render + index it
 * - null     → confirmed missing (404): the page should `notFound()`
 * - undefined→ API unreachable/errored: fall back to client-side fetching
 */
export async function fetchPortalProject(
  slug: string,
): Promise<PortalProject | null | undefined> {
  try {
    return await portalApi().getPortalProject(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    return undefined;
  }
}

/** Fetch the published project list (sitemap). Degrades to [] on any failure. */
export async function fetchPortalProjects(): Promise<PortalProject[]> {
  try {
    return await portalApi().getPortalProjects();
  } catch {
    return [];
  }
}
