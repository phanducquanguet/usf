# Portal Marketplace — Design Spec

Date: 2026-07-12
Status: Approved

## Goal

Add a public "Marketplace" to the customer portal: a catalog of the company's
past/showcase projects that guests can browse and filter, with a per-project
detail page whose primary CTA opens the existing consultation chat with that
project as context. Owner/admin manage the catalog (CRUD + publish) from the
existing Portal settings tab.

Out of scope (future): agent clones `source_url` to bootstrap/deploy a new
project for the customer. The schema reserves the field; no behavior now.

## Data

New migration `portal_projects` (next free number in `server/migrations/`):

```sql
CREATE TABLE portal_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,          -- URL identifier, unique per workspace
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  industry      TEXT NOT NULL DEFAULT '',
  features      TEXT[] NOT NULL DEFAULT '{}',
  images        TEXT[] NOT NULL DEFAULT '{}',  -- CDN URLs from /api/upload-file
  demo_url      TEXT NOT NULL DEFAULT '',
  portfolio_url TEXT NOT NULL DEFAULT '',
  source_url    TEXT NOT NULL DEFAULT '',      -- internal only; never in public API
  published     BOOLEAN NOT NULL DEFAULT false,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);
```

- `industry` is free text; the public filter dropdown is derived from data.
- Images are CDN URLs; upload reuses the existing `/api/upload-file` endpoint.
- Regenerate sqlc after adding queries (`make sqlc`).

## Backend (Go)

### Admin endpoints — `server/internal/handler/portal.go`

Same owner/admin guard as existing portal config endpoints; scoped to the
portal workspace.

- `GET /api/portal/projects` — all projects (incl. unpublished, incl. `source_url`).
- `POST /api/portal/projects` — create; slug generated from name, uniqueness enforced.
- `PATCH /api/portal/projects/{id}` — partial update, incl. `published` toggle
  and `sort_order`.
- `DELETE /api/portal/projects/{id}`.

UUID handling per repo rules: `parseUUIDOrBadRequest` for path ids.

### Public endpoints — `server/internal/handler/portal_public.go`

No auth; 404 when portal disabled (same behavior as existing guest endpoints).

- `GET /portal/projects` — published only, ordered by `sort_order`, then name.
  Response omits `source_url` and `published`.
- `GET /portal/projects/{slug}` — one published project; 404 if missing or
  unpublished. Omits `source_url`.

### Chat context

`POST /portal/sessions` accepts optional body `{ "project_slug": string }`.
If the slug resolves to a published project, the first-message preamble
becomes `[PORTAL] Khách đang quan tâm dự án: <name> (<demo_url>)`. An invalid
or unpublished slug is silently ignored — session creation never fails
because of it.

If the guest already has a session, `project_slug` has no server effect; the
frontend instead pre-fills the chat input with "Tôi quan tâm dự án <name>"
for the guest to send.

## Core (`packages/core`)

- `api/portal-schemas.ts`: `portalPublicProjectSchema` (no `source_url`),
  `portalAdminProjectSchema` (full), list wrappers.
- `api/client.ts`: `getPortalProjects()`, `getPortalProject(slug)` (public),
  `getPortalAdminProjects()`, `createPortalProject()`, `updatePortalProject()`,
  `deletePortalProject()` (admin), `createPortalGuestSession({ projectSlug? })`.
- All responses go through `parseWithFallback` with empty fallbacks.
- Malformed-response tests in `portal-schemas.test.ts` per repo API rules.

## Admin UI (`packages/views`)

New `packages/views/settings/components/portal-projects-section.tsx`, rendered
inside the existing owner-only Portal tab (`portal-tab.tsx`):

- Table: name, industry, published switch, sort order, edit/delete actions.
- Add/edit dialog: all fields; image upload via existing upload endpoint;
  features as tag-style multi-input.
- Delete requires confirm dialog.
- Shared by web + desktop automatically (lives in `packages/views`).

## Public UI (`apps/web` only — portal is web-only)

- **Landing** (`apps/web/features/portal/landing/portal-landing.tsx`): a
  "Featured projects" section after Services — grid of up to 6 published
  projects by `sort_order`, CTA "Xem tất cả" → `/marketplace`. Section hidden
  when there are no published projects. Landing nav gains a "Marketplace" item.
- **`/marketplace`** (`apps/web/app/(portal)/marketplace/page.tsx`): card grid
  (first image, name, industry, short description), client-side search +
  industry filter derived from loaded data. Loads the full list once; no
  pagination.
- **`/marketplace/[slug]`**: image gallery, description, feature list,
  "Xem demo" / "Xem portfolio" buttons (new tab), primary CTA "Tư vấn dự án
  tương tự" opening `PortalChat` with `project_slug`.
- Add `marketplace` to `server/internal/handler/reserved_slugs.json` and run
  `pnpm generate:reserved-slugs`.
- i18n keys in `packages/views/locales` portal namespace; follow
  `apps/docs/content/docs/developers/conventions.mdx` for Vietnamese copy.

## Edge cases

- Portal disabled: public project endpoints 404; `/marketplace` renders the
  same closed state as the landing.
- Project unpublished while a guest views it: API 404 → "dự án không còn khả
  dụng" state with a link back to `/marketplace`.
- Invalid `project_slug` on session create: ignored, session proceeds.

## Testing

- Go: admin CRUD + guard (non-admin 403), public list excludes `source_url`,
  detail 404 on unpublished, session create with bad `project_slug` succeeds.
- Core: malformed-response tests for new schemas.
- Views: portal-projects-section tests with mocked `@multica/core/api` and
  callable-store-shaped store mocks.
