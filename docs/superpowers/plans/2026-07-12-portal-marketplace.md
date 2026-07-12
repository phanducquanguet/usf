# Portal Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public marketplace of showcase projects on the customer portal — guests browse/filter, view detail, and open the consultation chat with project context; owner/admin manage the catalog from the Portal settings tab.

**Architecture:** New `portal_project` table scoped to the portal workspace. Admin CRUD under `/api/portal/projects` (owner/admin guard); public read endpoints under `/portal/projects` that never expose `source_url`. Guest session creation optionally records project context that is injected into the agent-facing `[PORTAL]` preamble on the first message. Frontend: shared admin section in `packages/views` settings; public pages are web-only under `apps/web/app/(portal)/marketplace/`.

**Tech Stack:** Go + chi + sqlc + pgx, Next.js App Router, TanStack Query, zod (`parseWithFallback`), i18next selector API, shadcn UI from `@multica/ui`.

**Spec:** `docs/superpowers/specs/2026-07-12-portal-marketplace-design.md`

## Global Constraints

- Table names are singular (`portal_project`), matching `portal_session`, `workspace(id)`, `agent(id)` FK style.
- Next migration number is **162** (latest is `161_agent_runtime_custom_name`).
- `source_url` must never appear in any `/portal/*` (public) response.
- All new API JSON consumed by UI goes through `parseWithFallback` + a zod `.loose()` schema with an EMPTY fallback const, plus a malformed-response test (repo rule).
- UUID handling in handlers: `parseUUIDOrBadRequest(w, s, field)` for request-boundary UUIDs; `ctxWorkspaceID(r.Context())` for workspace.
- Views code: no `next/*`; navigation via `<AppLink>`/`useNavigation()`. Web-only portal pages live in `apps/web/features/portal/` and may use `next/link`.
- i18n: add identical key structure to `packages/views/locales/en/*.json` and `vi/*.json`. Vietnamese copy follows `apps/docs/content/docs/developers/conventions.mdx`.
- Code comments in English. Conventional commits (`feat(portal): …`).
- Go verification: `make test` (skips DB tests if no DB; run with local DB via `make dev` postgres). TS: `pnpm typecheck`, `pnpm test`.
- After editing `server/pkg/db/queries/portal.sql` or migrations: run `make sqlc` and commit generated code.

---

### Task 1: Migration + sqlc queries

**Files:**
- Create: `server/migrations/162_portal_project.up.sql`
- Create: `server/migrations/162_portal_project.down.sql`
- Modify: `server/pkg/db/queries/portal.sql` (append)
- Generated: `server/pkg/db/generated/*` via `make sqlc`

**Interfaces:**
- Produces sqlc methods used by Tasks 2–4: `ListPortalProjects(ctx, workspaceID)`, `ListPublishedPortalProjects(ctx, workspaceID)`, `GetPortalProject(ctx, GetPortalProjectParams{ID, WorkspaceID})`, `GetPublishedPortalProjectBySlug(ctx, GetPublishedPortalProjectBySlugParams{WorkspaceID, Slug})`, `CreatePortalProject(ctx, CreatePortalProjectParams{…})`, `UpdatePortalProject(ctx, UpdatePortalProjectParams{…})`, `DeletePortalProject(ctx, DeletePortalProjectParams{ID, WorkspaceID})`.
- Produces `db.PortalProject` struct (`Features []string`, `Images []string`, `SortOrder int32`).
- Extends `CreatePortalSession` with a `ProjectContext` param and `portal_session.project_context` column (used by Task 4).

- [ ] **Step 1: Write the up migration**

`server/migrations/162_portal_project.up.sql`:

```sql
-- Marketplace catalog (spec: docs/superpowers/specs/2026-07-12-portal-marketplace-design.md).
-- portal_project: owner/admin-managed showcase projects; published rows are
-- listed on the public portal marketplace. source_url is internal-only.
CREATE TABLE portal_project (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    industry TEXT NOT NULL DEFAULT '',
    features TEXT[] NOT NULL DEFAULT '{}',
    images TEXT[] NOT NULL DEFAULT '{}',
    demo_url TEXT NOT NULL DEFAULT '',
    portfolio_url TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    published BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, slug)
);
CREATE INDEX idx_portal_project_ws ON portal_project(workspace_id, published, sort_order);

-- Guest-selected project context, captured at session creation and injected
-- into the agent-facing preamble on the first message.
ALTER TABLE portal_session ADD COLUMN project_context TEXT NOT NULL DEFAULT '';
```

- [ ] **Step 2: Write the down migration**

`server/migrations/162_portal_project.down.sql`:

```sql
ALTER TABLE portal_session DROP COLUMN project_context;
DROP TABLE portal_project;
```

- [ ] **Step 3: Append queries to `server/pkg/db/queries/portal.sql`**

```sql
-- name: ListPortalProjects :many
SELECT * FROM portal_project WHERE workspace_id = $1 ORDER BY sort_order, name;

-- name: ListPublishedPortalProjects :many
SELECT * FROM portal_project WHERE workspace_id = $1 AND published ORDER BY sort_order, name;

-- name: GetPortalProject :one
SELECT * FROM portal_project WHERE id = $1 AND workspace_id = $2;

-- name: GetPublishedPortalProjectBySlug :one
SELECT * FROM portal_project WHERE workspace_id = $1 AND slug = $2 AND published;

-- name: CreatePortalProject :one
INSERT INTO portal_project (
    workspace_id, slug, name, description, industry, features, images,
    demo_url, portfolio_url, source_url, published, sort_order
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: UpdatePortalProject :one
UPDATE portal_project
SET name = $3, description = $4, industry = $5, features = $6, images = $7,
    demo_url = $8, portfolio_url = $9, source_url = $10, published = $11,
    sort_order = $12, updated_at = now()
WHERE id = $1 AND workspace_id = $2
RETURNING *;

-- name: DeletePortalProject :exec
DELETE FROM portal_project WHERE id = $1 AND workspace_id = $2;
```

Also change the existing `CreatePortalSession` query to include the new column:

```sql
-- name: CreatePortalSession :one
INSERT INTO portal_session (workspace_id, chat_session_id, guest_token_hash, project_context)
VALUES ($1, $2, $3, $4)
RETURNING *;
```

- [ ] **Step 4: Regenerate sqlc and fix the one existing caller**

Run: `make sqlc`
Expected: regenerates `server/pkg/db/generated/`; `go build ./...` inside `server/` then fails only in `portal_public.go` where `CreatePortalSessionParams` gained `ProjectContext`. Add `ProjectContext: ""` to the existing call in `CreatePortalGuestSession` (Task 4 replaces it properly):

```go
if _, err := h.Queries.CreatePortalSession(r.Context(), db.CreatePortalSessionParams{
    WorkspaceID:    ws.ID,
    ChatSessionID:  session.ID,
    GuestTokenHash: hash,
    ProjectContext: "",
}); err != nil {
```

- [ ] **Step 5: Verify build + existing tests**

Run: `cd server && go build ./... && cd .. && make test`
Expected: build OK; portal tests pass (DB tests skip if no local DB).

- [ ] **Step 6: Commit**

```bash
git add server/migrations/162_portal_project.* server/pkg/db/queries/portal.sql server/pkg/db/generated server/internal/handler/portal_public.go
git commit -m "feat(portal): portal_project table and sqlc queries"
```

---

### Task 2: Admin CRUD endpoints

**Files:**
- Create: `server/internal/handler/portal_project.go`
- Create: `server/internal/handler/portal_project_test.go`
- Modify: `server/cmd/server/router.go` (next to the `/api/portal/config` block, ~line 1054)

**Interfaces:**
- Consumes: sqlc methods from Task 1.
- Produces handlers: `ListPortalAdminProjects`, `CreatePortalProject`, `UpdatePortalProject`, `DeletePortalProject`; response type `PortalAdminProjectResponse` (JSON: `id, slug, name, description, industry, features, images, demo_url, portfolio_url, source_url, published, sort_order, created_at, updated_at`). Public response type `PortalPublicProjectResponse` (same minus `source_url`, `published`, timestamps) is also defined here and reused by Task 3.
- Produces `portalProjectSlugify(name string) string`.

- [ ] **Step 1: Write failing tests** (`server/internal/handler/portal_project_test.go`; follows the fixture style of `portal_test.go` — `testHandler`, `testPool`, `testWorkspaceID`, `chatPendingCtxAs`)

```go
package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

func cleanupPortalProjects(t *testing.T) {
	t.Helper()
	t.Cleanup(func() {
		testPool.Exec(context.Background(),
			`DELETE FROM portal_project WHERE workspace_id = $1`, testWorkspaceID)
	})
}

func adminProjectRequest(t *testing.T, method, path, id string, body map[string]any) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	reader := bytes.NewReader(nil)
	if body != nil {
		buf, _ := json.Marshal(body)
		reader = bytes.NewReader(buf)
	}
	req := httptest.NewRequest(method, path, reader)
	req = chatPendingCtxAs(t, req, testUserID)
	if id != "" {
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", id)
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	}
	return httptest.NewRecorder(), req
}

func createTestPortalProject(t *testing.T, name string, published bool) PortalAdminProjectResponse {
	t.Helper()
	rec, req := adminProjectRequest(t, "POST", "/api/portal/projects", "", map[string]any{
		"name": name, "description": "Mô tả", "industry": "F&B",
		"features": []string{"Đặt bàn", "Thanh toán"}, "images": []string{"https://cdn.example.com/a.png"},
		"demo_url": "https://demo.example.com", "portfolio_url": "https://p.example.com",
		"source_url": "git@internal:repo.git", "published": published, "sort_order": 1,
	})
	testHandler.CreatePortalProject(rec, req)
	if rec.Code != 201 {
		t.Fatalf("create project: %d %s", rec.Code, rec.Body.String())
	}
	var resp PortalAdminProjectResponse
	json.Unmarshal(rec.Body.Bytes(), &resp)
	return resp
}

func TestPortalProject_CreateGeneratesSlug(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	cleanupPortalProjects(t)
	p := createTestPortalProject(t, "Quản lý nhà hàng", true)
	if p.Slug != "quan-ly-nha-hang" {
		t.Fatalf("expected diacritics-stripped slug, got %q", p.Slug)
	}
	if p.SourceURL != "git@internal:repo.git" {
		t.Fatalf("admin response must include source_url, got %+v", p)
	}
	// Same name again gets a numbered suffix, not a 500.
	p2 := createTestPortalProject(t, "Quản lý nhà hàng", false)
	if p2.Slug != "quan-ly-nha-hang-2" {
		t.Fatalf("expected suffixed slug, got %q", p2.Slug)
	}
}

func TestPortalProject_CreateRequiresName(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	cleanupPortalProjects(t)
	rec, req := adminProjectRequest(t, "POST", "/api/portal/projects", "", map[string]any{"name": "  "})
	testHandler.CreatePortalProject(rec, req)
	if rec.Code != 400 {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestPortalProject_UpdateAndList(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	cleanupPortalProjects(t)
	p := createTestPortalProject(t, "App bán lẻ", false)
	rec, req := adminProjectRequest(t, "PUT", "/api/portal/projects/"+p.ID, p.ID, map[string]any{
		"name": "App bán lẻ", "description": "Mới", "industry": "Retail",
		"features": []string{}, "images": []string{}, "demo_url": "", "portfolio_url": "",
		"source_url": "", "published": true, "sort_order": 5,
	})
	testHandler.UpdatePortalProject(rec, req)
	if rec.Code != 200 {
		t.Fatalf("update: %d %s", rec.Code, rec.Body.String())
	}
	var updated PortalAdminProjectResponse
	json.Unmarshal(rec.Body.Bytes(), &updated)
	if !updated.Published || updated.SortOrder != 5 || updated.Description != "Mới" {
		t.Fatalf("unexpected update result: %+v", updated)
	}
	// List includes unpublished + published.
	createTestPortalProject(t, "Ẩn", false)
	recL, reqL := adminProjectRequest(t, "GET", "/api/portal/projects", "", nil)
	testHandler.ListPortalAdminProjects(recL, reqL)
	var list struct {
		Projects []PortalAdminProjectResponse `json:"projects"`
	}
	json.Unmarshal(recL.Body.Bytes(), &list)
	if len(list.Projects) != 2 {
		t.Fatalf("expected 2 projects, got %d", len(list.Projects))
	}
}

func TestPortalProject_Delete(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	cleanupPortalProjects(t)
	p := createTestPortalProject(t, "Xoá tôi", false)
	rec, req := adminProjectRequest(t, "DELETE", "/api/portal/projects/"+p.ID, p.ID, nil)
	testHandler.DeletePortalProject(rec, req)
	if rec.Code != 204 {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body.String())
	}
	recL, reqL := adminProjectRequest(t, "GET", "/api/portal/projects", "", nil)
	testHandler.ListPortalAdminProjects(recL, reqL)
	var list struct {
		Projects []PortalAdminProjectResponse `json:"projects"`
	}
	json.Unmarshal(recL.Body.Bytes(), &list)
	if len(list.Projects) != 0 {
		t.Fatalf("expected empty list, got %d", len(list.Projects))
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && go test ./internal/handler/ -run TestPortalProject -v`
Expected: compile error — `PortalAdminProjectResponse`, handlers undefined.

- [ ] **Step 3: Implement `server/internal/handler/portal_project.go`**

```go
package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"unicode"

	"github.com/jackc/pgx/v5/pgconn"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

// PortalAdminProjectResponse is the owner/admin-facing marketplace project,
// including internal fields (source_url) the public API must never expose.
type PortalAdminProjectResponse struct {
	ID           string   `json:"id"`
	Slug         string   `json:"slug"`
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Industry     string   `json:"industry"`
	Features     []string `json:"features"`
	Images       []string `json:"images"`
	DemoURL      string   `json:"demo_url"`
	PortfolioURL string   `json:"portfolio_url"`
	SourceURL    string   `json:"source_url"`
	Published    bool     `json:"published"`
	SortOrder    int32    `json:"sort_order"`
	CreatedAt    string   `json:"created_at"`
	UpdatedAt    string   `json:"updated_at"`
}

// PortalPublicProjectResponse is the guest-facing shape. No source_url ever.
type PortalPublicProjectResponse struct {
	Slug         string   `json:"slug"`
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Industry     string   `json:"industry"`
	Features     []string `json:"features"`
	Images       []string `json:"images"`
	DemoURL      string   `json:"demo_url"`
	PortfolioURL string   `json:"portfolio_url"`
}

type portalProjectRequest struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Industry     string   `json:"industry"`
	Features     []string `json:"features"`
	Images       []string `json:"images"`
	DemoURL      string   `json:"demo_url"`
	PortfolioURL string   `json:"portfolio_url"`
	SourceURL    string   `json:"source_url"`
	Published    bool     `json:"published"`
	SortOrder    int32    `json:"sort_order"`
}

func portalProjectToAdminResponse(p db.PortalProject) PortalAdminProjectResponse {
	return PortalAdminProjectResponse{
		ID:           uuidToString(p.ID),
		Slug:         p.Slug,
		Name:         p.Name,
		Description:  p.Description,
		Industry:     p.Industry,
		Features:     emptyIfNil(p.Features),
		Images:       emptyIfNil(p.Images),
		DemoURL:      p.DemoUrl,
		PortfolioURL: p.PortfolioUrl,
		SourceURL:    p.SourceUrl,
		Published:    p.Published,
		SortOrder:    p.SortOrder,
		CreatedAt:    timestampToString(p.CreatedAt),
		UpdatedAt:    timestampToString(p.UpdatedAt),
	}
}

func portalProjectToPublicResponse(p db.PortalProject) PortalPublicProjectResponse {
	return PortalPublicProjectResponse{
		Slug:         p.Slug,
		Name:         p.Name,
		Description:  p.Description,
		Industry:     p.Industry,
		Features:     emptyIfNil(p.Features),
		Images:       emptyIfNil(p.Images),
		DemoURL:      p.DemoUrl,
		PortfolioURL: p.PortfolioUrl,
	}
}

// emptyIfNil keeps JSON arrays as [] instead of null.
func emptyIfNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// portalProjectSlugify lowercases, strips Vietnamese diacritics (đ→d), and
// collapses everything else into single dashes.
func portalProjectSlugify(name string) string {
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	folded, _, err := transform.String(t, strings.ToLower(strings.TrimSpace(name)))
	if err != nil {
		folded = strings.ToLower(strings.TrimSpace(name))
	}
	folded = strings.ReplaceAll(folded, "đ", "d")
	var b strings.Builder
	prevDash := true // suppress leading dash
	for _, r := range folded {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			prevDash = false
		} else if !prevDash {
			b.WriteByte('-')
			prevDash = true
		}
	}
	return strings.TrimSuffix(b.String(), "-")
}

func decodePortalProjectRequest(w http.ResponseWriter, r *http.Request) (portalProjectRequest, bool) {
	var req portalProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return req, false
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return req, false
	}
	if req.Features == nil {
		req.Features = []string{}
	}
	if req.Images == nil {
		req.Images = []string{}
	}
	return req, true
}

func (h *Handler) ListPortalAdminProjects(w http.ResponseWriter, r *http.Request) {
	workspaceUUID, ok := parseUUIDOrBadRequest(w, ctxWorkspaceID(r.Context()), "workspace id")
	if !ok {
		return
	}
	rows, err := h.Queries.ListPortalProjects(r.Context(), workspaceUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list projects")
		return
	}
	items := make([]PortalAdminProjectResponse, 0, len(rows))
	for _, p := range rows {
		items = append(items, portalProjectToAdminResponse(p))
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": items})
}

func (h *Handler) CreatePortalProject(w http.ResponseWriter, r *http.Request) {
	workspaceUUID, ok := parseUUIDOrBadRequest(w, ctxWorkspaceID(r.Context()), "workspace id")
	if !ok {
		return
	}
	req, ok := decodePortalProjectRequest(w, r)
	if !ok {
		return
	}
	base := portalProjectSlugify(req.Name)
	if base == "" {
		base = "du-an"
	}
	// Unique (workspace_id, slug): retry with numbered suffixes on collision.
	for attempt := 1; attempt <= 50; attempt++ {
		slug := base
		if attempt > 1 {
			slug = fmt.Sprintf("%s-%d", base, attempt)
		}
		row, err := h.Queries.CreatePortalProject(r.Context(), db.CreatePortalProjectParams{
			WorkspaceID:  workspaceUUID,
			Slug:         slug,
			Name:         req.Name,
			Description:  req.Description,
			Industry:     req.Industry,
			Features:     req.Features,
			Images:       req.Images,
			DemoUrl:      req.DemoURL,
			PortfolioUrl: req.PortfolioURL,
			SourceUrl:    req.SourceURL,
			Published:    req.Published,
			SortOrder:    req.SortOrder,
		})
		if err == nil {
			writeJSON(w, http.StatusCreated, portalProjectToAdminResponse(row))
			return
		}
		var pgErr *pgconn.PgError
		if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
			writeError(w, http.StatusInternalServerError, "failed to create project")
			return
		}
	}
	writeError(w, http.StatusConflict, "could not allocate a unique slug")
}

func (h *Handler) UpdatePortalProject(w http.ResponseWriter, r *http.Request) {
	workspaceUUID, ok := parseUUIDOrBadRequest(w, ctxWorkspaceID(r.Context()), "workspace id")
	if !ok {
		return
	}
	id, ok := parseUUIDOrBadRequest(w, chiURLParam(r, "id"), "project id")
	if !ok {
		return
	}
	req, ok := decodePortalProjectRequest(w, r)
	if !ok {
		return
	}
	row, err := h.Queries.UpdatePortalProject(r.Context(), db.UpdatePortalProjectParams{
		ID:           id,
		WorkspaceID:  workspaceUUID,
		Name:         req.Name,
		Description:  req.Description,
		Industry:     req.Industry,
		Features:     req.Features,
		Images:       req.Images,
		DemoUrl:      req.DemoURL,
		PortfolioUrl: req.PortfolioURL,
		SourceUrl:    req.SourceURL,
		Published:    req.Published,
		SortOrder:    req.SortOrder,
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}
	writeJSON(w, http.StatusOK, portalProjectToAdminResponse(row))
}

func (h *Handler) DeletePortalProject(w http.ResponseWriter, r *http.Request) {
	workspaceUUID, ok := parseUUIDOrBadRequest(w, ctxWorkspaceID(r.Context()), "workspace id")
	if !ok {
		return
	}
	id, ok := parseUUIDOrBadRequest(w, chiURLParam(r, "id"), "project id")
	if !ok {
		return
	}
	if err := h.Queries.DeletePortalProject(r.Context(), db.DeletePortalProjectParams{
		ID:          id,
		WorkspaceID: workspaceUUID,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete project")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

Notes for the implementer:
- Check how other handlers read chi URL params (grep `chi.URLParam(r, "id")` in `server/internal/handler/`); if there is no `chiURLParam` helper, use `chi.URLParam(r, "id")` directly.
- sqlc field casing (`DemoUrl` vs `DemoURL`) must match the generated `db.PortalProject` — check `server/pkg/db/generated/` after Task 1 and adjust.
- `golang.org/x/text` is currently an indirect dep; `go mod tidy` promotes it.

- [ ] **Step 4: Register routes in `server/cmd/server/router.go`** (immediately after the `/api/portal/config` block; note `member` table roles are `owner|admin|member`)

```go
// Marketplace catalog (owner/admin).
r.Route("/api/portal/projects", func(r chi.Router) {
	r.Use(middleware.RequireWorkspaceRole(queries, "owner", "admin"))
	r.Get("/", h.ListPortalAdminProjects)
	r.Post("/", h.CreatePortalProject)
	r.Route("/{id}", func(r chi.Router) {
		r.Put("/", h.UpdatePortalProject)
		r.Delete("/", h.DeletePortalProject)
	})
})
```

- [ ] **Step 5: Run tests**

Run: `cd server && go mod tidy && go test ./internal/handler/ -run TestPortalProject -v`
Expected: PASS (or SKIP without DB — then run `make test` with the dev DB up).

- [ ] **Step 6: Commit**

```bash
git add server/internal/handler/portal_project.go server/internal/handler/portal_project_test.go server/cmd/server/router.go server/go.mod server/go.sum
git commit -m "feat(portal): admin CRUD endpoints for marketplace projects"
```

---

### Task 3: Public marketplace endpoints

**Files:**
- Modify: `server/internal/handler/portal_public.go` (append handlers)
- Modify: `server/internal/handler/portal_project_test.go` (append tests)
- Modify: `server/cmd/server/router.go` (inside the existing `r.Route("/portal", …)` block, ~line 696)

**Interfaces:**
- Consumes: `loadPortalContext` (existing), `ListPublishedPortalProjects`, `GetPublishedPortalProjectBySlug` (Task 1), `PortalPublicProjectResponse` + `portalProjectToPublicResponse` (Task 2).
- Produces: `ListPortalPublicProjects` (GET `/portal/projects` → `{"projects": [...]}`), `GetPortalPublicProject` (GET `/portal/projects/{slug}`).

- [ ] **Step 1: Write failing tests** (append to `portal_project_test.go`)

```go
func publicProjectRequest(t *testing.T, path, slug string) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	req := httptest.NewRequest("GET", path, nil)
	if slug != "" {
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("slug", slug)
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	}
	return httptest.NewRecorder(), req
}

func TestPortalPublicProjects_ListsPublishedWithoutSourceURL(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	enablePortalForTests(t)
	cleanupPortalProjects(t)
	createTestPortalProject(t, "Public app", true)
	createTestPortalProject(t, "Draft app", false)

	rec, req := publicProjectRequest(t, "/portal/projects", "")
	testHandler.ListPortalPublicProjects(rec, req)
	if rec.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "source_url") {
		t.Fatal("public list must not contain source_url")
	}
	var resp struct {
		Projects []map[string]any `json:"projects"`
	}
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if len(resp.Projects) != 1 || resp.Projects[0]["slug"] != "public-app" {
		t.Fatalf("expected only the published project: %s", rec.Body.String())
	}
}

func TestPortalPublicProjects_DetailAndUnpublished404(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	enablePortalForTests(t)
	cleanupPortalProjects(t)
	createTestPortalProject(t, "Chi tiết app", true)
	createTestPortalProject(t, "Nháp", false)

	rec, req := publicProjectRequest(t, "/portal/projects/chi-tiet-app", "chi-tiet-app")
	testHandler.GetPortalPublicProject(rec, req)
	if rec.Code != 200 || strings.Contains(rec.Body.String(), "source_url") {
		t.Fatalf("detail: %d %s", rec.Code, rec.Body.String())
	}

	rec2, req2 := publicProjectRequest(t, "/portal/projects/nhap", "nhap")
	testHandler.GetPortalPublicProject(rec2, req2)
	if rec2.Code != 404 {
		t.Fatalf("unpublished must 404, got %d", rec2.Code)
	}
}

func TestPortalPublicProjects_DisabledPortal404(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	prev := testHandler.cfg.PortalWorkspaceSlug
	testHandler.cfg.PortalWorkspaceSlug = ""
	t.Cleanup(func() { testHandler.cfg.PortalWorkspaceSlug = prev })
	rec, req := publicProjectRequest(t, "/portal/projects", "")
	testHandler.ListPortalPublicProjects(rec, req)
	if rec.Code != 404 {
		t.Fatalf("expected 404 when portal disabled, got %d", rec.Code)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && go test ./internal/handler/ -run TestPortalPublicProjects -v`
Expected: compile error — handlers undefined.

- [ ] **Step 3: Implement handlers** (append to `portal_public.go`)

```go
func (h *Handler) ListPortalPublicProjects(w http.ResponseWriter, r *http.Request) {
	ws, _, _, err := h.loadPortalContext(r.Context())
	if err != nil {
		writeError(w, http.StatusNotFound, "portal_disabled")
		return
	}
	rows, err := h.Queries.ListPublishedPortalProjects(r.Context(), ws.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list projects")
		return
	}
	items := make([]PortalPublicProjectResponse, 0, len(rows))
	for _, p := range rows {
		items = append(items, portalProjectToPublicResponse(p))
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": items})
}

func (h *Handler) GetPortalPublicProject(w http.ResponseWriter, r *http.Request) {
	ws, _, _, err := h.loadPortalContext(r.Context())
	if err != nil {
		writeError(w, http.StatusNotFound, "portal_disabled")
		return
	}
	row, err := h.Queries.GetPublishedPortalProjectBySlug(r.Context(), db.GetPublishedPortalProjectBySlugParams{
		WorkspaceID: ws.ID,
		Slug:        chi.URLParam(r, "slug"),
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "project_not_found")
		return
	}
	writeJSON(w, http.StatusOK, portalProjectToPublicResponse(row))
}
```

- [ ] **Step 4: Register routes** (inside `r.Route("/portal", …)` in `router.go`)

```go
r.Get("/projects", h.ListPortalPublicProjects)
r.Get("/projects/{slug}", h.GetPortalPublicProject)
```

- [ ] **Step 5: Run tests**

Run: `cd server && go test ./internal/handler/ -run TestPortalPublicProjects -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/internal/handler/portal_public.go server/internal/handler/portal_project_test.go server/cmd/server/router.go
git commit -m "feat(portal): public marketplace endpoints"
```

---

### Task 4: Project context on guest sessions

**Files:**
- Modify: `server/internal/handler/portal_public.go` (`CreatePortalGuestSession`, `SendPortalMessage`)
- Modify: `server/internal/handler/portal_project_test.go` (append test)

**Interfaces:**
- Consumes: `GetPublishedPortalProjectBySlug` (Task 1), `ps.ProjectContext` column (Task 1).
- Produces: `POST /portal/sessions` accepts optional `{"project_slug": "..."}`; first guest message preamble gains a project-context line.

- [ ] **Step 1: Write failing test** (append to `portal_project_test.go`)

```go
func TestPortalGuestSession_ProjectSlugStoresContext(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	enablePortalForTests(t)
	cleanupPortalProjects(t)
	createTestPortalProject(t, "App giao hàng", true)

	// Valid slug → context stored on the portal session row.
	buf, _ := json.Marshal(map[string]any{"project_slug": "app-giao-hang"})
	rec := httptest.NewRecorder()
	testHandler.CreatePortalGuestSession(rec, httptest.NewRequest("POST", "/portal/sessions", bytes.NewReader(buf)))
	if rec.Code != 201 {
		t.Fatalf("create session: %d %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Token string `json:"token"`
	}
	json.Unmarshal(rec.Body.Bytes(), &resp)
	t.Cleanup(func() {
		testPool.Exec(context.Background(),
			`DELETE FROM chat_session WHERE id IN (SELECT chat_session_id FROM portal_session WHERE guest_token_hash = $1)`,
			hashPortalToken(resp.Token))
	})
	var storedCtx string
	err := testPool.QueryRow(context.Background(),
		`SELECT project_context FROM portal_session WHERE guest_token_hash = $1`,
		hashPortalToken(resp.Token)).Scan(&storedCtx)
	if err != nil || !strings.Contains(storedCtx, "App giao hàng") {
		t.Fatalf("project_context = %q err=%v", storedCtx, err)
	}

	// Invalid slug → session still created, empty context.
	buf2, _ := json.Marshal(map[string]any{"project_slug": "khong-ton-tai"})
	rec2 := httptest.NewRecorder()
	testHandler.CreatePortalGuestSession(rec2, httptest.NewRequest("POST", "/portal/sessions", bytes.NewReader(buf2)))
	if rec2.Code != 201 {
		t.Fatalf("invalid slug must not block session creation: %d", rec2.Code)
	}
	var resp2 struct {
		Token string `json:"token"`
	}
	json.Unmarshal(rec2.Body.Bytes(), &resp2)
	t.Cleanup(func() {
		testPool.Exec(context.Background(),
			`DELETE FROM chat_session WHERE id IN (SELECT chat_session_id FROM portal_session WHERE guest_token_hash = $1)`,
			hashPortalToken(resp2.Token))
	})
	var emptyCtx string
	testPool.QueryRow(context.Background(),
		`SELECT project_context FROM portal_session WHERE guest_token_hash = $1`,
		hashPortalToken(resp2.Token)).Scan(&emptyCtx)
	if emptyCtx != "" {
		t.Fatalf("expected empty context, got %q", emptyCtx)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && go test ./internal/handler/ -run TestPortalGuestSession_ProjectSlugStoresContext -v`
Expected: FAIL — `project_context` stays empty (body is ignored today).

- [ ] **Step 3: Implement**

In `CreatePortalGuestSession`, after `loadPortalContext` succeeds, decode the optional body and resolve the context (an empty/absent/garbage body must not fail — the existing endpoint is called with no body):

```go
// Optional body: {"project_slug": "..."} from a marketplace CTA. Any decode
// failure or unknown slug is ignored — context is best-effort, never a blocker.
projectContext := ""
var req struct {
	ProjectSlug string `json:"project_slug"`
}
if err := json.NewDecoder(r.Body).Decode(&req); err == nil && req.ProjectSlug != "" {
	if p, perr := h.Queries.GetPublishedPortalProjectBySlug(r.Context(), db.GetPublishedPortalProjectBySlugParams{
		WorkspaceID: ws.ID,
		Slug:        req.ProjectSlug,
	}); perr == nil {
		projectContext = "Khách đang quan tâm dự án trong marketplace: " + p.Name
		if p.DemoUrl != "" {
			projectContext += " (demo: " + p.DemoUrl + ")"
		}
	}
}
```

and pass `ProjectContext: projectContext` in the `CreatePortalSessionParams` call (replacing the `""` stub from Task 1).

In `SendPortalMessage`, extend the `count == 0` preamble to include the stored context:

```go
if count == 0 {
	// Mark the session as a portal intake for the agent (see the
	// multica-portal-intake builtin skill) without a wasted bootstrap run.
	preamble := portalFirstMessagePreamble + " Đây là phiên tư vấn với khách vãng lai trên portal công khai. Hãy làm theo skill multica-portal-intake."
	if ps.ProjectContext != "" {
		preamble += " " + ps.ProjectContext + "."
	}
	content = preamble + "\n\n" + content
}
```

(Check the generated field name — `ps.ProjectContext` — against `server/pkg/db/generated/` and adjust.)

- [ ] **Step 4: Run tests**

Run: `cd server && go test ./internal/handler/ -run "TestPortalGuestSession|TestPortalSendMessage" -v`
Expected: PASS, including all pre-existing session tests (no-body creation still works).

- [ ] **Step 5: Commit**

```bash
git add server/internal/handler/portal_public.go server/internal/handler/portal_project_test.go
git commit -m "feat(portal): guest sessions carry marketplace project context"
```

---

### Task 5: Reserve the `marketplace` slug

**Files:**
- Modify: `server/internal/handler/reserved_slugs.json` (add `"marketplace"` to the `"Platform / marketing routes (current + likely-future)"` group's `slugs` array)
- Generated: `packages/core/paths/reserved-slugs.ts` via `pnpm generate:reserved-slugs`

- [ ] **Step 1: Add the slug + regenerate**

Add `"marketplace"` to the platform/marketing group in `reserved_slugs.json`, then:

Run: `pnpm generate:reserved-slugs`
Expected: `packages/core/paths/reserved-slugs.ts` diff contains `"marketplace"`.

- [ ] **Step 2: Verify Go embed still parses**

Run: `cd server && go test ./internal/handler/ -run TestCreateWorkspace_RejectsReservedSlug -v`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/internal/handler/reserved_slugs.json packages/core/paths/reserved-slugs.ts
git commit -m "feat(portal): reserve marketplace slug"
```

---

### Task 6: Core types, schemas, client methods

**Files:**
- Modify: `packages/core/types/portal.ts`
- Modify: `packages/core/api/portal-schemas.ts`
- Modify: `packages/core/api/client.ts`
- Modify: `packages/core/api/portal-schemas.test.ts` (append malformed-response tests)
- Modify: `packages/core/workspace/queries.ts` (query keys + options)

**Interfaces:**
- Produces types: `PortalProject`, `PortalAdminProject`, `PortalProjectInput`.
- Produces client methods (all via `parseWithFallback`):
  - `getPortalProjects(): Promise<PortalProject[]>` — GET `/portal/projects`
  - `getPortalProject(slug: string): Promise<PortalProject | null>` — GET `/portal/projects/{slug}`; returns `null` when the parsed object has no `slug`
  - `createPortalGuestSession(projectSlug?: string)` — existing method, gains optional body
  - `getPortalAdminProjects(): Promise<PortalAdminProject[]>` — GET `/api/portal/projects`
  - `createPortalProject(input: PortalProjectInput): Promise<PortalAdminProject>`
  - `updatePortalProject(id: string, input: PortalProjectInput): Promise<PortalAdminProject>`
  - `deletePortalProject(id: string): Promise<void>`
- Produces query helpers: `portalProjectKeys = { admin: (wsId) => ["portal", "admin-projects", wsId], public: () => ["portal", "projects"], publicDetail: (slug) => ["portal", "projects", slug] }` and `portalAdminProjectsOptions(wsId)`.

- [ ] **Step 1: Add types to `packages/core/types/portal.ts`**

```ts
export interface PortalProject {
  slug: string;
  name: string;
  description: string;
  industry: string;
  features: string[];
  images: string[];
  demo_url: string;
  portfolio_url: string;
}

export interface PortalAdminProject extends PortalProject {
  id: string;
  source_url: string;
  published: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface PortalProjectInput {
  name: string;
  description: string;
  industry: string;
  features: string[];
  images: string[];
  demo_url: string;
  portfolio_url: string;
  source_url: string;
  published: boolean;
  sort_order: number;
}
```

- [ ] **Step 2: Write failing malformed-response tests** (append to `packages/core/api/portal-schemas.test.ts`; follow the file's existing test style — read it first)

```ts
describe("portal project schemas", () => {
  it("public project list tolerates junk and missing fields", () => {
    const parsed = portalPublicProjectsSchema.safeParse({
      projects: [{ slug: "a", name: "A" }, { slug: "b", name: "B", features: ["x"] }],
    });
    expect(parsed.success).toBe(true);
  });

  it("public project rejects non-object garbage via fallback shape", () => {
    expect(portalPublicProjectsSchema.safeParse("garbage").success).toBe(false);
    expect(portalPublicProjectsSchema.safeParse({ projects: "nope" }).success).toBe(false);
  });

  it("admin project list tolerates extra fields (drift)", () => {
    const parsed = portalAdminProjectsSchema.safeParse({
      projects: [
        {
          id: "x", slug: "a", name: "A", source_url: "s", published: true,
          sort_order: 0, some_future_field: 1,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @multica/core test -- portal-schemas`
Expected: FAIL — schemas undefined. (If the filter name differs, run `pnpm test` from repo root.)

- [ ] **Step 4: Add schemas** (append to `packages/core/api/portal-schemas.ts`)

```ts
export const portalPublicProjectSchema = z
  .object({
    slug: z.string(),
    name: z.string(),
    description: z.string().optional(),
    industry: z.string().optional(),
    features: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    demo_url: z.string().optional(),
    portfolio_url: z.string().optional(),
  })
  .loose();

export const portalPublicProjectsSchema = z
  .object({ projects: z.array(portalPublicProjectSchema) })
  .loose();

export const portalAdminProjectSchema = portalPublicProjectSchema
  .extend({
    id: z.string(),
    source_url: z.string().optional(),
    published: z.boolean().optional(),
    sort_order: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .loose();

export const portalAdminProjectsSchema = z
  .object({ projects: z.array(portalAdminProjectSchema) })
  .loose();

export const EMPTY_PORTAL_PROJECTS = { projects: [] };
```

- [ ] **Step 5: Add client methods** (in `packages/core/api/client.ts`, next to the existing portal methods; import the new schemas/types; a normalizer keeps optional-field defaults in one place)

```ts
function normalizePortalProject(p: z.infer<typeof portalPublicProjectSchema>): PortalProject {
  return {
    slug: p.slug,
    name: p.name,
    description: p.description ?? "",
    industry: p.industry ?? "",
    features: p.features ?? [],
    images: p.images ?? [],
    demo_url: p.demo_url ?? "",
    portfolio_url: p.portfolio_url ?? "",
  };
}
```

(Place `normalizePortalProject` at module scope in `client.ts`, or inline the mapping — match the file's existing style.)

```ts
async getPortalProjects(): Promise<PortalProject[]> {
  const data = await this.fetch<unknown>("/portal/projects");
  const parsed = parseWithFallback(data, portalPublicProjectsSchema, EMPTY_PORTAL_PROJECTS, {
    endpoint: "/portal/projects",
  });
  return parsed.projects.map(normalizePortalProject);
}

async getPortalProject(slug: string): Promise<PortalProject | null> {
  const data = await this.fetch<unknown>(`/portal/projects/${encodeURIComponent(slug)}`);
  const parsed = parseWithFallback(data, portalPublicProjectSchema, { slug: "", name: "" }, {
    endpoint: "/portal/projects/:slug",
  });
  return parsed.slug ? normalizePortalProject(parsed) : null;
}

async getPortalAdminProjects(): Promise<PortalAdminProject[]> {
  const data = await this.fetch<unknown>("/api/portal/projects");
  const parsed = parseWithFallback(data, portalAdminProjectsSchema, EMPTY_PORTAL_PROJECTS, {
    endpoint: "/api/portal/projects",
  });
  return parsed.projects.map((p) => ({
    ...normalizePortalProject(p),
    id: p.id,
    source_url: p.source_url ?? "",
    published: p.published === true,
    sort_order: p.sort_order ?? 0,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
}

async createPortalProject(input: PortalProjectInput): Promise<PortalAdminProject> {
  return this.fetch("/api/portal/projects", { method: "POST", body: JSON.stringify(input) });
}

async updatePortalProject(id: string, input: PortalProjectInput): Promise<PortalAdminProject> {
  return this.fetch(`/api/portal/projects/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

async deletePortalProject(id: string): Promise<void> {
  await this.fetch(`/api/portal/projects/${id}`, { method: "DELETE" });
}
```

Change `createPortalGuestSession` to accept the optional slug:

```ts
async createPortalGuestSession(projectSlug?: string): Promise<PortalGuestSession> {
  const data = await this.fetch<unknown>("/portal/sessions", {
    method: "POST",
    ...(projectSlug ? { body: JSON.stringify({ project_slug: projectSlug }) } : {}),
  });
  return parseWithFallback(
    data,
    portalGuestSessionSchema,
    { token: "" },
    { endpoint: "/portal/sessions" },
  );
}
```

Note: mutation responses (`createPortalProject`/`updatePortalProject`) are consumed only by the admin form which immediately invalidates the list query, so plain `this.fetch<T>` casting is acceptable there per existing repo practice for admin mutations — but if reviewers prefer, wrap them with `portalAdminProjectSchema` the same way. DELETE returns 204 — verify `this.fetch` tolerates an empty body (grep for another DELETE usage, e.g. `deleteLabel`, and mirror it).

- [ ] **Step 6: Add query keys/options** (append to `packages/core/workspace/queries.ts`, next to `portalConfigKeys`)

```ts
export const portalProjectKeys = {
  admin: (wsId: string) => ["portal", "admin-projects", wsId] as const,
};

// Owner/admin endpoint: non-privileged members get 403; fail fast, no retry.
export function portalAdminProjectsOptions(wsId: string) {
  return {
    queryKey: portalProjectKeys.admin(wsId),
    queryFn: () => api.getPortalAdminProjects(),
    retry: false,
  } as const;
}
```

- [ ] **Step 7: Run tests + typecheck**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core
git commit -m "feat(core): portal marketplace project types, schemas, client"
```

---

### Task 7: Admin UI — marketplace section in Portal settings tab

**Files:**
- Create: `packages/views/settings/components/portal-projects-section.tsx`
- Create: `packages/views/settings/components/portal-projects-section.test.tsx`
- Modify: `packages/views/settings/components/portal-tab.tsx` (render the section under the existing content, owner-gated already)
- Modify: `packages/views/locales/en/settings.json` and `packages/views/locales/vi/settings.json` (add `portal_projects` keys)

**Interfaces:**
- Consumes: `api.getPortalAdminProjects/createPortalProject/updatePortalProject/deletePortalProject`, `portalAdminProjectsOptions`, `portalProjectKeys` (Task 6), `api.uploadFile(file)` (existing — returns `Attachment` with a `url`).
- Produces: `<PortalProjectsSection />` (no props; reads `useWorkspaceId()` context like the rest of the tab file).

- [ ] **Step 1: Add i18n keys**

`packages/views/locales/en/settings.json` — add inside the top-level object (sibling of `portal`):

```json
"portal_projects": {
  "title": "Marketplace projects",
  "description": "Showcase projects guests can browse on the public marketplace.",
  "add": "Add project",
  "edit": "Edit project",
  "empty": "No projects yet. Add your first showcase project.",
  "name": "Name",
  "name_placeholder": "Restaurant management app",
  "description_label": "Description",
  "industry": "Industry",
  "industry_placeholder": "F&B",
  "features": "Features (one per line)",
  "images": "Images",
  "upload_image": "Upload image",
  "remove_image": "Remove",
  "demo_url": "Demo URL",
  "portfolio_url": "Portfolio URL",
  "source_url": "Source URL (internal)",
  "source_url_hint": "Never shown to guests. Used later to clone and customize for a customer.",
  "published": "Published",
  "sort_order": "Sort order",
  "save": "Save",
  "saving": "Saving…",
  "cancel": "Cancel",
  "delete": "Delete",
  "delete_confirm_title": "Delete this project?",
  "delete_confirm_body": "\"{{name}}\" will be removed from the marketplace. This cannot be undone.",
  "toast_saved": "Project saved",
  "toast_deleted": "Project deleted",
  "toast_failed": "Something went wrong"
}
```

`packages/views/locales/vi/settings.json` — same structure:

```json
"portal_projects": {
  "title": "Dự án marketplace",
  "description": "Các dự án mẫu hiển thị trên chợ dự án công khai của portal.",
  "add": "Thêm dự án",
  "edit": "Sửa dự án",
  "empty": "Chưa có dự án nào. Hãy thêm dự án mẫu đầu tiên.",
  "name": "Tên dự án",
  "name_placeholder": "Ứng dụng quản lý nhà hàng",
  "description_label": "Mô tả",
  "industry": "Ngành",
  "industry_placeholder": "F&B",
  "features": "Tính năng (mỗi dòng một tính năng)",
  "images": "Hình ảnh",
  "upload_image": "Tải ảnh lên",
  "remove_image": "Xóa",
  "demo_url": "Link demo",
  "portfolio_url": "Link portfolio",
  "source_url": "Link source (nội bộ)",
  "source_url_hint": "Không hiển thị cho khách. Dùng sau này để clone và tùy biến cho khách hàng.",
  "published": "Công khai",
  "sort_order": "Thứ tự",
  "save": "Lưu",
  "saving": "Đang lưu…",
  "cancel": "Hủy",
  "delete": "Xóa",
  "delete_confirm_title": "Xóa dự án này?",
  "delete_confirm_body": "\"{{name}}\" sẽ bị gỡ khỏi marketplace. Không thể hoàn tác.",
  "toast_saved": "Đã lưu dự án",
  "toast_deleted": "Đã xóa dự án",
  "toast_failed": "Có lỗi xảy ra"
}
```

- [ ] **Step 2: Write failing test** (`portal-projects-section.test.tsx`; repo rules — mock `@multica/core/api`, no `next/*` mocks. Read a neighboring test, e.g. `portal-tab.test.tsx`, first and mirror its render/provider setup exactly — QueryClientProvider wrapper, i18n setup, store mocks.)

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// Mirror provider/i18n/store setup from portal-tab.test.tsx here.
import { PortalProjectsSection } from "./portal-projects-section";

const mockProjects = [
  {
    id: "p1", slug: "quan-ly-nha-hang", name: "Quản lý nhà hàng",
    description: "Mô tả", industry: "F&B", features: ["Đặt bàn"], images: [],
    demo_url: "", portfolio_url: "", source_url: "git@x", published: true, sort_order: 0,
  },
];

vi.mock("@multica/core/api", () => ({
  api: {
    getPortalAdminProjects: vi.fn(async () => mockProjects),
    createPortalProject: vi.fn(async (input) => ({ ...input, id: "p2", slug: "x" })),
    updatePortalProject: vi.fn(async (id, input) => ({ ...input, id, slug: "x" })),
    deletePortalProject: vi.fn(async () => {}),
    uploadFile: vi.fn(async () => ({ url: "https://cdn/x.png" })),
  },
}));

describe("PortalProjectsSection", () => {
  it("lists projects with publish state", async () => {
    render(<PortalProjectsSection />); // wrap per portal-tab.test.tsx setup
    expect(await screen.findByText("Quản lý nhà hàng")).toBeInTheDocument();
    expect(screen.getByText("F&B")).toBeInTheDocument();
  });

  it("opens the create dialog", async () => {
    render(<PortalProjectsSection />);
    await screen.findByText("Quản lý nhà hàng");
    await userEvent.click(screen.getByRole("button", { name: /thêm dự án|add project/i }));
    expect(await screen.findByLabelText(/tên dự án|name/i)).toBeInTheDocument();
  });

  it("deletes after confirm", async () => {
    const { api } = await import("@multica/core/api");
    render(<PortalProjectsSection />);
    await screen.findByText("Quản lý nhà hàng");
    await userEvent.click(screen.getByRole("button", { name: /xóa|delete/i }));
    // Confirm dialog
    await userEvent.click(await screen.findByRole("button", { name: /xóa|delete/i }));
    await waitFor(() => expect(api.deletePortalProject).toHaveBeenCalledWith("p1"));
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @multica/views test -- portal-projects-section`
Expected: FAIL — component missing.

- [ ] **Step 4: Implement `portal-projects-section.tsx`**

Structure (complete component; adjust imports to real paths in `@multica/ui`):

```tsx
"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";
import { Switch } from "@multica/ui/components/ui/switch";
import { Textarea } from "@multica/ui/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@multica/ui/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@multica/ui/components/ui/alert-dialog";
import { api } from "@multica/core/api";
import { useWorkspaceId } from "@multica/core/hooks";
import {
  portalAdminProjectsOptions, portalProjectKeys,
} from "@multica/core/workspace/queries";
import type { PortalAdminProject, PortalProjectInput } from "@multica/core/types/portal";
import { useT } from "../../i18n";

const EMPTY_INPUT: PortalProjectInput = {
  name: "", description: "", industry: "", features: [], images: [],
  demo_url: "", portfolio_url: "", source_url: "", published: false, sort_order: 0,
};

function toInput(p: PortalAdminProject): PortalProjectInput {
  const { name, description, industry, features, images, demo_url, portfolio_url, source_url, published, sort_order } = p;
  return { name, description, industry, features, images, demo_url, portfolio_url, source_url, published, sort_order };
}

export function PortalProjectsSection() {
  const { t } = useT("settings");
  const wsId = useWorkspaceId();
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery(portalAdminProjectsOptions(wsId));

  // Dialog state: null = closed, "new" = create, otherwise the project being edited.
  const [editing, setEditing] = useState<PortalAdminProject | "new" | null>(null);
  const [form, setForm] = useState<PortalProjectInput>(EMPTY_INPUT);
  const [deleting, setDeleting] = useState<PortalAdminProject | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: portalProjectKeys.admin(wsId) });

  const save = useMutation({
    mutationFn: (input: PortalProjectInput) =>
      editing === "new" || editing == null
        ? api.createPortalProject(input)
        : api.updatePortalProject(editing.id, input),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success(t(($) => $.portal_projects.toast_saved));
    },
    onError: () => toast.error(t(($) => $.portal_projects.toast_failed)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deletePortalProject(id),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
      toast.success(t(($) => $.portal_projects.toast_deleted));
    },
    onError: () => toast.error(t(($) => $.portal_projects.toast_failed)),
  });

  const openCreate = () => {
    setForm(EMPTY_INPUT);
    setEditing("new");
  };
  const openEdit = (p: PortalAdminProject) => {
    setForm(toInput(p));
    setEditing(p);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const attachment = await api.uploadFile(file);
      if (attachment.url) setForm((f) => ({ ...f, images: [...f.images, attachment.url] }));
    } catch {
      toast.error(t(($) => $.portal_projects.toast_failed));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setField = <K extends keyof PortalProjectInput>(key: K, value: PortalProjectInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">{t(($) => $.portal_projects.title)}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t(($) => $.portal_projects.description)}
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4 mr-1.5" />
          {t(($) => $.portal_projects.add)}
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y">
          {projects.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              {t(($) => $.portal_projects.empty)}
            </p>
          ) : (
            projects.map((p) => (
              <div key={p.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  {p.industry ? (
                    <p className="text-xs text-muted-foreground">{p.industry}</p>
                  ) : null}
                </div>
                <Switch
                  checked={p.published}
                  aria-label={t(($) => $.portal_projects.published)}
                  onCheckedChange={(published) =>
                    save.mutate.call(null, { ...toInput(p), published }) ||
                    // updatePortalProject needs the id: publish toggles edit in place
                    undefined
                  }
                  disabled={save.isPending}
                />
                <Button variant="ghost" size="icon" aria-label={t(($) => $.portal_projects.edit)} onClick={() => openEdit(p)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={t(($) => $.portal_projects.delete)} onClick={() => setDeleting(p)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create/edit dialog */}
      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t(($) => (editing === "new" ? $.portal_projects.add : $.portal_projects.edit))}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pp-name">{t(($) => $.portal_projects.name)}</Label>
              <Input id="pp-name" value={form.name}
                placeholder={t(($) => $.portal_projects.name_placeholder)}
                onChange={(e) => setField("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-desc">{t(($) => $.portal_projects.description_label)}</Label>
              <Textarea id="pp-desc" value={form.description}
                onChange={(e) => setField("description", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pp-industry">{t(($) => $.portal_projects.industry)}</Label>
                <Input id="pp-industry" value={form.industry}
                  placeholder={t(($) => $.portal_projects.industry_placeholder)}
                  onChange={(e) => setField("industry", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pp-sort">{t(($) => $.portal_projects.sort_order)}</Label>
                <Input id="pp-sort" type="number" value={form.sort_order}
                  onChange={(e) => setField("sort_order", Number(e.target.value) || 0)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-features">{t(($) => $.portal_projects.features)}</Label>
              <Textarea id="pp-features" value={form.features.join("\n")}
                onChange={(e) =>
                  setField("features", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))
                } />
            </div>
            <div className="space-y-2">
              <Label>{t(($) => $.portal_projects.images)}</Label>
              <div className="flex flex-wrap gap-2">
                {form.images.map((url) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="size-16 rounded-md border object-cover" />
                    <button type="button"
                      aria-label={t(($) => $.portal_projects.remove_image)}
                      className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-0.5"
                      onClick={() => setField("images", form.images.filter((u) => u !== url))}>
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" disabled={uploading}
                  onClick={() => fileRef.current?.click()}>
                  <Upload className="size-4 mr-1.5" />
                  {t(($) => $.portal_projects.upload_image)}
                </Button>
                <input ref={fileRef} type="file" accept="image/*" hidden
                  onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-demo">{t(($) => $.portal_projects.demo_url)}</Label>
              <Input id="pp-demo" value={form.demo_url}
                onChange={(e) => setField("demo_url", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-portfolio">{t(($) => $.portal_projects.portfolio_url)}</Label>
              <Input id="pp-portfolio" value={form.portfolio_url}
                onChange={(e) => setField("portfolio_url", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-source">{t(($) => $.portal_projects.source_url)}</Label>
              <Input id="pp-source" value={form.source_url}
                onChange={(e) => setField("source_url", e.target.value)} />
              <p className="text-xs text-muted-foreground">
                {t(($) => $.portal_projects.source_url_hint)}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pp-published">{t(($) => $.portal_projects.published)}</Label>
              <Switch id="pp-published" checked={form.published}
                onCheckedChange={(v) => setField("published", v)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t(($) => $.portal_projects.cancel)}
            </Button>
            <Button disabled={save.isPending || !form.name.trim()} onClick={() => save.mutate(form)}>
              {t(($) => (save.isPending ? $.portal_projects.saving : $.portal_projects.save))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleting != null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(($) => $.portal_projects.delete_confirm_title)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(($) => $.portal_projects.delete_confirm_body, { name: deleting?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t(($) => $.portal_projects.cancel)}</AlertDialogCancel>
            <AlertDialogAction disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}>
              {t(($) => $.portal_projects.delete)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
```

Implementation notes:
- The publish-toggle-in-list needs the project id; `save` as written resolves the id from `editing`, which is null in that path. Fix by making the mutation take `{ id?: string; input: PortalProjectInput }` instead:

```tsx
const save = useMutation({
  mutationFn: ({ id, input }: { id?: string; input: PortalProjectInput }) =>
    id ? api.updatePortalProject(id, input) : api.createPortalProject(input),
  ...
});
// list toggle:  save.mutate({ id: p.id, input: { ...toInput(p), published } })
// dialog save:  save.mutate({ id: editing === "new" ? undefined : editing?.id, input: form })
```
  Use this corrected shape; the inline `save.mutate.call` in the sketch above is a placeholder for exactly this fix.
- If `alert-dialog` or `dialog` are missing from `packages/ui`, add via `pnpm ui:add alert-dialog` / `pnpm ui:add dialog` from repo root.

- [ ] **Step 5: Render the section in `portal-tab.tsx`**

At the end of the owner-only return block (after the save `<Button>`), add:

```tsx
<PortalProjectsSection />
```

with `import { PortalProjectsSection } from "./portal-projects-section";` — the surrounding `space-y-8` container spaces it correctly. The tab is already owner-gated; the section needs no extra guard.

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm typecheck && pnpm --filter @multica/views test -- portal-projects-section && pnpm --filter @multica/views test -- portal-tab`
Expected: PASS (existing portal-tab tests still green).

- [ ] **Step 7: Commit**

```bash
git add packages/views packages/ui
git commit -m "feat(portal): marketplace project management in settings"
```

---

### Task 8: Public marketplace pages + landing section + chat context

**Files:**
- Create: `apps/web/features/portal/marketplace/marketplace-page.tsx`
- Create: `apps/web/features/portal/marketplace/project-detail-page.tsx`
- Create: `apps/web/features/portal/marketplace/project-card.tsx`
- Create: `apps/web/app/(portal)/marketplace/page.tsx`
- Create: `apps/web/app/(portal)/marketplace/[slug]/page.tsx`
- Create: `apps/web/features/portal/marketplace/marketplace-page.test.tsx`
- Modify: `apps/web/features/portal/landing/portal-landing.tsx` (featured section + nav item)
- Modify: `apps/web/features/portal/portal-chat.tsx` (optional `projectSlug`/`projectName` props)
- Modify: `apps/web/features/portal/use-portal-chat.ts` (`startSession(projectSlug?)`)
- Modify: `packages/views/locales/en/portal.json` and `vi/portal.json` (add `marketplace` keys)

**Interfaces:**
- Consumes: `api.getPortalProjects()`, `api.getPortalProject(slug)`, `api.createPortalGuestSession(projectSlug?)` (Task 6), `PortalChat`, `PortalLanding` internals, `CARD` style constant.
- Produces: routes `/marketplace` and `/marketplace/[slug]`; `<PortalChat projectSlug projectName>`.

- [ ] **Step 1: Add i18n keys** (`packages/views/locales/{en,vi}/portal.json`, new top-level `marketplace` object)

en:

```json
"marketplace": {
  "nav": "Marketplace",
  "title": "Project marketplace",
  "subtitle": "Browse projects we have built. Found something close to what you need? Talk to our AI consultant.",
  "search_placeholder": "Search projects…",
  "all_industries": "All industries",
  "empty": "No projects match your search.",
  "closed": "The marketplace is currently closed.",
  "featured_title": "Featured projects",
  "featured_cta": "View all projects",
  "view_demo": "View demo",
  "view_portfolio": "View portfolio",
  "consult_cta": "Discuss a similar project",
  "features_title": "Key features",
  "not_found_title": "This project is no longer available",
  "not_found_body": "It may have been unpublished. Browse the marketplace for other projects.",
  "back": "Back to marketplace",
  "prefill": "I'm interested in the project \"{{name}}\". Please tell me more."
}
```

vi:

```json
"marketplace": {
  "nav": "Chợ dự án",
  "title": "Chợ dự án",
  "subtitle": "Tham khảo các dự án chúng tôi đã thực hiện. Thấy dự án gần với nhu cầu của bạn? Trao đổi ngay với trợ lý AI.",
  "search_placeholder": "Tìm dự án…",
  "all_industries": "Tất cả ngành",
  "empty": "Không có dự án nào khớp với tìm kiếm.",
  "closed": "Chợ dự án hiện đang đóng.",
  "featured_title": "Dự án tiêu biểu",
  "featured_cta": "Xem tất cả dự án",
  "view_demo": "Xem demo",
  "view_portfolio": "Xem portfolio",
  "consult_cta": "Tư vấn dự án tương tự",
  "features_title": "Tính năng chính",
  "not_found_title": "Dự án không còn khả dụng",
  "not_found_body": "Dự án có thể đã được gỡ xuống. Mời bạn xem các dự án khác trong chợ dự án.",
  "back": "Quay lại chợ dự án",
  "prefill": "Tôi quan tâm dự án \"{{name}}\". Cho tôi biết thêm chi tiết nhé."
}
```

- [ ] **Step 2: Extend `use-portal-chat.ts`**

Change the `start` mutation and exposed `startSession`:

```ts
const start = useMutation({
  mutationFn: (projectSlug?: string) => api.createPortalGuestSession(projectSlug),
  onSuccess: ({ token: fresh }) => {
    if (!fresh) return;
    defaultStorage.setItem(PORTAL_TOKEN_STORAGE_KEY, fresh);
    setToken(fresh);
  },
});
// in the returned object:
startSession: (projectSlug?: string) => start.mutate(projectSlug),
```

- [ ] **Step 3: Extend `portal-chat.tsx`**

Props gain `projectSlug` and `projectName`:

```tsx
export function PortalChat({
  onClose,
  greeting,
  agentName,
  projectSlug,
  projectName,
}: {
  onClose: () => void;
  greeting?: string;
  agentName?: string;
  projectSlug?: string;
  projectName?: string;
}) {
```

Session bootstrap passes the slug (new sessions get server-side context):

```tsx
useEffect(() => {
  if (!hasSession && !starting && !startFailed) startSession(projectSlug);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [hasSession]);
```

Existing sessions get a prefilled draft instead (once, only if the composer is empty):

```tsx
// A guest with a live session who clicks a project CTA gets a prefilled
// message instead of new server-side context (slug only applies at creation).
const prefilledRef = useRef(false);
useEffect(() => {
  if (hasSession && projectName && !prefilledRef.current && draft === "") {
    setDraft(t(($) => $.marketplace.prefill, { name: projectName }));
    prefilledRef.current = true;
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [hasSession, projectName]);
```

Note: `useT("portal")` is already in the component; the `marketplace.prefill` key comes from Step 1. Guard against overwriting a non-empty draft.

- [ ] **Step 4: Create `project-card.tsx`** (shared by list page and featured section)

```tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@multica/ui/lib/utils";
import type { PortalProject } from "@multica/core/types/portal";

const CARD = "rounded-xl border border-border/60 bg-card";

export function ProjectCard({ project }: { project: PortalProject }) {
  return (
    <Link
      href={`/marketplace/${project.slug}`}
      className={cn(CARD, "group flex h-full flex-col overflow-hidden transition-colors hover:border-brand/40")}
    >
      {project.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.images[0]}
          alt={project.name}
          className="aspect-video w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div aria-hidden className="aspect-video w-full bg-secondary" />
      )}
      <div className="flex flex-1 flex-col p-5">
        {project.industry ? (
          <span className="mb-2 self-start rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
            {project.industry}
          </span>
        ) : null}
        <h3 className="text-lg font-semibold">{project.name}</h3>
        <p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {project.description}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand">
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 5: Write failing test for the list page** (`marketplace-page.test.tsx`; mirror the setup of `portal-landing.test.tsx` — read it first for provider/i18n wiring)

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// Mirror provider setup from portal-landing.test.tsx.
import { MarketplacePage } from "./marketplace-page";

vi.mock("@multica/core/api", () => ({
  api: {
    getPortalPublicConfig: vi.fn(async () => ({ enabled: true, hero_content: {}, agent: { name: "Bot" } })),
    getPortalProjects: vi.fn(async () => [
      { slug: "a", name: "App F&B", description: "d", industry: "F&B", features: [], images: [], demo_url: "", portfolio_url: "" },
      { slug: "b", name: "App Retail", description: "d", industry: "Retail", features: [], images: [], demo_url: "", portfolio_url: "" },
    ]),
  },
}));

describe("MarketplacePage", () => {
  it("renders projects and filters by industry", async () => {
    render(<MarketplacePage />);
    expect(await screen.findByText("App F&B")).toBeInTheDocument();
    expect(screen.getByText("App Retail")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "F&B" }));
    expect(screen.queryByText("App Retail")).not.toBeInTheDocument();
    expect(screen.getByText("App F&B")).toBeInTheDocument();
  });

  it("filters by search text", async () => {
    render(<MarketplacePage />);
    await screen.findByText("App F&B");
    await userEvent.type(screen.getByPlaceholderText(/tìm dự án|search projects/i), "retail");
    expect(screen.queryByText("App F&B")).not.toBeInTheDocument();
    expect(screen.getByText("App Retail")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm --filter web test -- marketplace-page` (check `apps/web/package.json` for the actual package name/test script)
Expected: FAIL — component missing.

- [ ] **Step 7: Implement `marketplace-page.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { Input } from "@multica/ui/components/ui/input";
import { cn } from "@multica/ui/lib/utils";
import { api } from "@multica/core/api";
import { useT } from "@multica/views/i18n";
import { ProjectCard } from "./project-card";

export function MarketplacePage() {
  const { t } = useT("portal");
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);

  const { data: config } = useQuery({
    queryKey: ["portal", "public-config"],
    queryFn: () => api.getPortalPublicConfig(),
    staleTime: 60_000,
  });
  const { data: projects = [], isPending } = useQuery({
    queryKey: ["portal", "projects"],
    queryFn: () => api.getPortalProjects(),
    staleTime: 60_000,
  });

  const industries = useMemo(
    () => [...new Set(projects.map((p) => p.industry).filter(Boolean))],
    [projects],
  );
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (industry == null || p.industry === industry) &&
        (q === "" ||
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.industry.toLowerCase().includes(q)),
    );
  }, [projects, search, industry]);

  return (
    <div className="dark portal-dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          UNICOM
        </Link>
        <h1 className="mt-6 text-4xl font-bold md:text-5xl">
          {t(($) => $.marketplace.title)}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          {t(($) => $.marketplace.subtitle)}
        </p>

        {config?.enabled === false ? (
          <p className="mt-10 text-muted-foreground">{t(($) => $.marketplace.closed)}</p>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(($) => $.marketplace.search_placeholder)}
                className="w-full sm:w-72"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={industry == null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIndustry(null)}
                >
                  {t(($) => $.marketplace.all_industries)}
                </Button>
                {industries.map((ind) => (
                  <Button
                    key={ind}
                    variant={industry === ind ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIndustry(industry === ind ? null : ind)}
                  >
                    {ind}
                  </Button>
                ))}
              </div>
            </div>

            {isPending ? (
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-72 animate-pulse rounded-xl bg-secondary" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <p className="mt-10 text-muted-foreground">{t(($) => $.marketplace.empty)}</p>
            ) : (
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((p) => (
                  <ProjectCard key={p.slug} project={p} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Implement `project-detail-page.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ExternalLink, MessageSquare } from "lucide-react";
import { Button, buttonVariants } from "@multica/ui/components/ui/button";
import { cn } from "@multica/ui/lib/utils";
import { api } from "@multica/core/api";
import { useT } from "@multica/views/i18n";
import { PortalChat } from "../portal-chat";

const CARD = "rounded-xl border border-border/60 bg-card";

export function ProjectDetailPage({ slug }: { slug: string }) {
  const { t } = useT("portal");
  const [chatOpen, setChatOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const { data: config } = useQuery({
    queryKey: ["portal", "public-config"],
    queryFn: () => api.getPortalPublicConfig(),
    staleTime: 60_000,
  });
  const { data: project, isPending } = useQuery({
    queryKey: ["portal", "projects", slug],
    queryFn: () => api.getPortalProject(slug),
    retry: false,
  });

  const enabled = config?.enabled === true;

  return (
    <div className="dark portal-dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-14 md:py-20">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t(($) => $.marketplace.back)}
        </Link>

        {isPending ? (
          <div className="mt-8 space-y-4" aria-busy="true">
            <div className="h-10 w-2/3 animate-pulse rounded-md bg-secondary" />
            <div className="aspect-video animate-pulse rounded-xl bg-secondary" />
          </div>
        ) : project == null ? (
          <div className={cn(CARD, "mt-8 p-8")}>
            <h1 className="text-xl font-semibold">{t(($) => $.marketplace.not_found_title)}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(($) => $.marketplace.not_found_body)}
            </p>
          </div>
        ) : (
          <>
            {project.industry ? (
              <span className="mt-8 inline-block rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                {project.industry}
              </span>
            ) : null}
            <h1 className="mt-3 text-4xl font-bold md:text-5xl">{project.name}</h1>

            {project.images.length > 0 ? (
              <div className="mt-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.images[activeImage] ?? project.images[0]}
                  alt={project.name}
                  className="aspect-video w-full rounded-xl border border-border/60 object-cover"
                />
                {project.images.length > 1 ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {project.images.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt=""
                        onClick={() => setActiveImage(i)}
                        className={cn(
                          "h-16 w-28 shrink-0 cursor-pointer rounded-md border object-cover",
                          i === activeImage ? "border-brand" : "border-border/60 opacity-70",
                        )}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <p className="mt-8 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
              {project.description}
            </p>

            {project.features.length > 0 ? (
              <div className={cn(CARD, "mt-8 p-6")}>
                <h2 className="text-lg font-semibold">{t(($) => $.marketplace.features_title)}</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {project.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              {enabled ? (
                <Button size="lg" className="h-12 px-7 text-base" onClick={() => setChatOpen(true)}>
                  <MessageSquare className="mr-2 size-5" />
                  {t(($) => $.marketplace.consult_cta)}
                </Button>
              ) : null}
              {project.demo_url ? (
                <a
                  href={project.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-7 text-base")}
                >
                  {t(($) => $.marketplace.view_demo)}
                  <ExternalLink className="ml-2 size-4" />
                </a>
              ) : null}
              {project.portfolio_url ? (
                <a
                  href={project.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-7 text-base")}
                >
                  {t(($) => $.marketplace.view_portfolio)}
                  <ExternalLink className="ml-2 size-4" />
                </a>
              ) : null}
            </div>
          </>
        )}
      </div>

      {chatOpen && project ? (
        <PortalChat
          onClose={() => setChatOpen(false)}
          agentName={config?.agent?.name}
          projectSlug={project.slug}
          projectName={project.name}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 9: Route files**

`apps/web/app/(portal)/marketplace/page.tsx`:

```tsx
import type { Metadata } from "next";
import { MarketplacePage } from "@/features/portal/marketplace/marketplace-page";

export const metadata: Metadata = {
  title: { absolute: "Chợ dự án — UNICOM" },
  description:
    "Tham khảo các dự án phần mềm UNICOM đã thực hiện và trao đổi với trợ lý AI về dự án của bạn.",
  alternates: { canonical: "/marketplace" },
};

export default function Page() {
  return <MarketplacePage />;
}
```

`apps/web/app/(portal)/marketplace/[slug]/page.tsx`:

```tsx
import { ProjectDetailPage } from "@/features/portal/marketplace/project-detail-page";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProjectDetailPage slug={slug} />;
}
```

(Check the Next.js version's params convention — if other `[slug]` pages in `apps/web/app/` type `params` as a plain object, mirror that instead.)

- [ ] **Step 10: Landing featured section + nav item** (`portal-landing.tsx`)

Add the projects query next to the config query:

```tsx
const { data: featured = [] } = useQuery({
  queryKey: ["portal", "projects"],
  queryFn: () => api.getPortalProjects(),
  staleTime: 60_000,
  enabled,
});
```

Add nav item (after `services` in `navItems`; plain `href` works since it's a page, not an anchor):

```tsx
{ label: t(($) => $.marketplace.nav), href: "/marketplace" },
```

Insert the section after the Services `</section>` and before Target fit + Pricing (hidden when empty):

```tsx
{/* Featured marketplace projects */}
{featured.length > 0 ? (
  <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
    <SectionHeader title={t(($) => $.marketplace.featured_title)} />
    <Reveal>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.slice(0, 6).map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
      </div>
      <div className="mt-10 text-center">
        <Link
          href="/marketplace"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-7 text-base")}
        >
          {t(($) => $.marketplace.featured_cta)}
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </div>
    </Reveal>
  </section>
) : null}
```

with `import { ProjectCard } from "../marketplace/project-card";`.

- [ ] **Step 11: Run all web tests + typecheck**

Run: `pnpm typecheck && pnpm test`
Expected: PASS, including pre-existing `portal-landing.test.tsx` and `portal-chat.test.tsx` (the mocked `api` object in those tests may need `getPortalProjects: vi.fn(async () => [])` added — do that rather than weakening assertions).

- [ ] **Step 12: Manual smoke test**

Run: `make dev` (or `make start`), open `http://localhost:3000/`:
- Settings → Portal → add a project with image, publish it.
- Landing shows the featured section; `/marketplace` lists and filters; detail page renders; "Tư vấn dự án tương tự" opens chat and (fresh guest session) the agent's first reply reflects the project context.
- Verify `curl -s localhost:8080/portal/projects | grep source_url` returns nothing (adjust port to the dev server's).

- [ ] **Step 13: Commit**

```bash
git add apps/web packages/views/locales
git commit -m "feat(portal): public marketplace pages and landing section"
```

---

## Self-Review Notes

- Spec coverage: data model (T1), admin CRUD (T2), public API without `source_url` (T3), chat context incl. invalid-slug tolerance and existing-session prefill (T4 + T8 step 3), reserved slug (T5), core schemas + malformed tests (T6), admin UI (T7), landing/list/detail pages, filters, disabled/unpublished states (T8).
- sqlc-generated names (`DemoUrl` vs `DemoURL`, `ProjectContext`) and test-harness helper names must be verified against generated code / `portal_test.go` at implementation time — flagged inline where relevant.
- Out of scope per spec: agent clone/deploy flow (`source_url` reserved only).
