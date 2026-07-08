# Workspace Creation Allowlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Only emails in `WORKSPACE_CREATION_ALLOWED_EMAILS` may create workspaces when `DISABLE_WORKSPACE_CREATION=true`; users with no workspace and no creation right see an "invitation required" screen instead of onboarding.

**Architecture:** Extend the existing `DISABLE_WORKSPACE_CREATION` self-host gate (#3433) with a backend email allowlist. The per-user permission travels on the authenticated `/api/me` response as `can_create_workspace` (the public `/api/config` must stay user-agnostic). The frontend derives one effective flag via a new `useWorkspaceCreationDisabled()` hook that combines the public config flag with the per-user field; all existing UI read sites switch to that hook. `OnboardingFlow` early-returns to a new `InvitationRequiredScreen` for users who can't create and have zero workspaces.

**Tech Stack:** Go (Chi, sqlc) backend, TypeScript/React shared packages (`packages/core`, `packages/views`), zod, Vitest, Go `testing`.

**Spec:** `docs/superpowers/specs/2026-07-08-workspace-creation-allowlist-design.md`

## Global Constraints

- `packages/core/`: no `react-dom`, no `localStorage`, no `process.env`, no UI libraries.
- `packages/views/`: no `next/*`, no `react-router-dom`, no stores of its own.
- Parse API JSON with `parseWithFallback` + zod schema; schema changes get a malformed/missing-field test (CLAUDE.md "API Compatibility").
- Explicit boolean checks on server fields: `=== true`, never truthy checks.
- Code comments in English. Conventional commit prefixes.
- Go tests run with `make test` (needs local PostgreSQL; tests skip when `testHandler == nil`). TS tests: `pnpm test`. Types: `pnpm typecheck`.
- Deliberate decision from the spec: **no backend role check is added to `CreateInvitation`** — the invite form is already hidden from plain members in the UI; direct-API invites by members are an accepted risk.

---

### Task 1: Backend — allowlist config and CreateWorkspace gate

**Files:**
- Modify: `server/internal/handler/handler.go` (Config struct, ~line 57–67)
- Modify: `server/internal/handler/workspace.go` (CreateWorkspace gate, ~line 148–156)
- Modify: `server/cmd/server/router.go` (env parsing, ~line 167–172)
- Test: `server/internal/handler/workspace_test.go`

**Interfaces:**
- Consumes: existing `h.cfg`, `requireUserID`, `parseUUID`, `h.Queries.GetUser`, `splitAndTrim` (router.go).
- Produces: `Config.WorkspaceCreationAllowedEmails []string`; method `func (h *Handler) canCreateWorkspace(email string) bool` — Task 2 calls this.

- [ ] **Step 1: Write the failing tests**

Append to `server/internal/handler/workspace_test.go` (imports `context`, `net/http`, `net/http/httptest` already present in the file):

```go
// TestCreateWorkspace_AllowlistBypassesDisable: with the self-host gate on,
// an email listed in WorkspaceCreationAllowedEmails may still create a
// workspace. Matching is case-insensitive.
func TestCreateWorkspace_AllowlistBypassesDisable(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}

	const slug = "handler-tests-allowlist-create"
	ctx := context.Background()
	_, _ = testPool.Exec(ctx, `DELETE FROM workspace WHERE slug = $1`, slug)
	t.Cleanup(func() {
		_, _ = testPool.Exec(context.Background(), `DELETE FROM workspace WHERE slug = $1`, slug)
	})

	prev := testHandler.cfg
	testHandler.cfg = Config{
		AllowSignup:                    prev.AllowSignup,
		DisableWorkspaceCreation:       true,
		// Deliberately different case from handlerTestEmail to pin
		// case-insensitive matching.
		WorkspaceCreationAllowedEmails: []string{"Handler-Test@multica.ai"},
	}
	t.Cleanup(func() { testHandler.cfg = prev })

	w := httptest.NewRecorder()
	req := newRequest("POST", "/api/workspaces", map[string]any{
		"name": "Allowlist Create",
		"slug": slug,
	})
	testHandler.CreateWorkspace(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 for allowlisted email, got %d: %s", w.Code, w.Body.String())
	}
}

// TestCreateWorkspace_NotOnAllowlistStillForbidden: a non-empty allowlist
// that does NOT contain the caller's email keeps the 403.
func TestCreateWorkspace_NotOnAllowlistStillForbidden(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}

	const slug = "handler-tests-allowlist-forbidden"
	ctx := context.Background()
	_, _ = testPool.Exec(ctx, `DELETE FROM workspace WHERE slug = $1`, slug)
	t.Cleanup(func() {
		_, _ = testPool.Exec(context.Background(), `DELETE FROM workspace WHERE slug = $1`, slug)
	})

	prev := testHandler.cfg
	testHandler.cfg = Config{
		AllowSignup:                    prev.AllowSignup,
		DisableWorkspaceCreation:       true,
		WorkspaceCreationAllowedEmails: []string{"someone-else@multica.ai"},
	}
	t.Cleanup(func() { testHandler.cfg = prev })

	w := httptest.NewRecorder()
	req := newRequest("POST", "/api/workspaces", map[string]any{
		"name": "Forbidden Create",
		"slug": slug,
	})
	testHandler.CreateWorkspace(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for non-allowlisted email, got %d: %s", w.Code, w.Body.String())
	}

	var count int
	if err := testPool.QueryRow(ctx, `SELECT count(*) FROM workspace WHERE slug = $1`, slug).Scan(&count); err != nil {
		t.Fatalf("count workspaces: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected no workspace row, found %d", count)
	}
}
```

The test user's email is the `handlerTestEmail` constant (`"handler-test@multica.ai"`, `handler_test.go:33`); `newRequest` stamps `X-User-ID: testUserID` (`handler_test.go:174`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && go test ./internal/handler/ -run 'TestCreateWorkspace_Allowlist|TestCreateWorkspace_NotOnAllowlist' -v`
Expected: FAIL — `unknown field WorkspaceCreationAllowedEmails in struct literal` (compile error).

- [ ] **Step 3: Implement**

In `server/internal/handler/handler.go`, inside `type Config struct`, replace the `DisableWorkspaceCreation` comment block and add the new field:

```go
	// DisableWorkspaceCreation, when true, makes POST /api/workspaces return
	// 403 unless the caller's email is in WorkspaceCreationAllowedEmails.
	// Operators bootstrap by either creating the workspace with the flag off,
	// or by allowlisting the platform admin's email; all other users join via
	// invitation only. The public /api/config endpoint mirrors only the
	// instance-wide flag (never the allowlist) so the UI can hide "Create
	// workspace" affordances — the per-user exception travels on /api/me as
	// can_create_workspace. See #3433.
	DisableWorkspaceCreation bool
	// WorkspaceCreationAllowedEmails lists emails exempt from
	// DisableWorkspaceCreation (WORKSPACE_CREATION_ALLOWED_EMAILS,
	// comma-separated, case-insensitive). Ignored when the flag is off.
	WorkspaceCreationAllowedEmails []string
```

Still in `handler.go`, add below the Config struct (package already imports `strings`; add the import if missing):

```go
// canCreateWorkspace reports whether a user with this email may create
// workspaces: always when the self-host gate is off, otherwise only when
// the email is on the allowlist (case-insensitive).
func (h *Handler) canCreateWorkspace(email string) bool {
	if !h.cfg.DisableWorkspaceCreation {
		return true
	}
	for _, allowed := range h.cfg.WorkspaceCreationAllowedEmails {
		if strings.EqualFold(strings.TrimSpace(allowed), email) {
			return true
		}
	}
	return false
}
```

In `server/internal/handler/workspace.go`, replace the existing gate in `CreateWorkspace` (lines 148–156):

```go
	// Self-host gate (#3433): when the operator has set
	// DISABLE_WORKSPACE_CREATION=true, only callers whose email is in
	// WORKSPACE_CREATION_ALLOWED_EMAILS may create workspaces. The frontend
	// hides "Create workspace" affordances via /api/config + /api/me, but
	// the 403 here is the only authoritative check.
	if h.cfg.DisableWorkspaceCreation {
		user, err := h.Queries.GetUser(r.Context(), parseUUID(userID))
		if err != nil || !h.canCreateWorkspace(user.Email) {
			writeError(w, http.StatusForbidden, "workspace creation is disabled for this instance")
			return
		}
	}
```

In `server/cmd/server/router.go`, inside the `signupConfig := handler.Config{...}` literal (line ~167), add after `DisableWorkspaceCreation`:

```go
		WorkspaceCreationAllowedEmails: splitAndTrim(os.Getenv("WORKSPACE_CREATION_ALLOWED_EMAILS")),
```

- [ ] **Step 4: Run tests to verify they pass (including the pre-existing gate test)**

Run: `cd server && go test ./internal/handler/ -run 'TestCreateWorkspace' -v`
Expected: PASS for `TestCreateWorkspace_AllowlistBypassesDisable`, `TestCreateWorkspace_NotOnAllowlistStillForbidden`, and the pre-existing `TestCreateWorkspace_DisabledByConfig` (empty allowlist ⇒ still 403) and `TestCreateWorkspaceDoesNotMarkOnboarded`.

- [ ] **Step 5: Commit**

```bash
git add server/internal/handler/handler.go server/internal/handler/workspace.go server/cmd/server/router.go server/internal/handler/workspace_test.go
git commit -m "feat(server): allowlist exception for DISABLE_WORKSPACE_CREATION"
```

---

### Task 2: Backend — `can_create_workspace` on user responses

**Files:**
- Modify: `server/internal/handler/auth.go` (UserResponse ~line 52–96; call sites at lines ~417, 433, 611, 719)
- Modify: `server/internal/handler/onboarding.go` (call sites at lines ~127, 283, 345)
- Test: `server/internal/handler/auth_test.go` (create if absent — check with `ls server/internal/handler/auth_test.go`; if it doesn't exist, create with `package handler` and the imports shown)

**Interfaces:**
- Consumes: `h.canCreateWorkspace(email string) bool` from Task 1.
- Produces: `UserResponse.CanCreateWorkspace bool` serialized as `"can_create_workspace"` on every endpoint that returns a user (`/api/me` GET/PATCH, login/verify-code, Google login, onboarding responses). Task 3's zod schema reads this exact key.

- [ ] **Step 1: Write the failing test**

Add to `server/internal/handler/auth_test.go` (imports: `encoding/json`, `net/http`, `net/http/httptest`, `testing`):

```go
// TestGetMe_CanCreateWorkspace pins the per-user creation permission on
// /api/me across the three config states: gate off, gate on without
// allowlist, gate on with the caller allowlisted.
func TestGetMe_CanCreateWorkspace(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}

	prev := testHandler.cfg
	t.Cleanup(func() { testHandler.cfg = prev })

	fetch := func(t *testing.T) bool {
		t.Helper()
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/api/me", nil)
		req.Header.Set("X-User-ID", testUserID)
		testHandler.GetMe(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("GetMe: %d %s", w.Code, w.Body.String())
		}
		var resp struct {
			CanCreateWorkspace bool `json:"can_create_workspace"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("decode: %v", err)
		}
		return resp.CanCreateWorkspace
	}

	testHandler.cfg = Config{AllowSignup: prev.AllowSignup}
	if !fetch(t) {
		t.Fatal("gate off: expected can_create_workspace=true")
	}

	testHandler.cfg = Config{AllowSignup: prev.AllowSignup, DisableWorkspaceCreation: true}
	if fetch(t) {
		t.Fatal("gate on, not allowlisted: expected can_create_workspace=false")
	}

	testHandler.cfg = Config{
		AllowSignup:                    prev.AllowSignup,
		DisableWorkspaceCreation:       true,
		WorkspaceCreationAllowedEmails: []string{handlerTestEmail},
	}
	if !fetch(t) {
		t.Fatal("gate on, allowlisted: expected can_create_workspace=true")
	}
}
```

Note: if `requireUserID` in this codebase reads user identity from request context rather than the `X-User-ID` header, mirror however the existing `newRequest` helper builds requests (`handler_test.go:174`) — `req := newRequest("GET", "/api/me", nil)` is the fallback form.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && go test ./internal/handler/ -run TestGetMe_CanCreateWorkspace -v`
Expected: FAIL — `can_create_workspace` absent, so all decodes yield `false` and the first assertion fires ("gate off: expected can_create_workspace=true").

- [ ] **Step 3: Implement**

In `server/internal/handler/auth.go`, add a field to `UserResponse` (after `ProfileDescription`):

```go
	// CanCreateWorkspace reflects the self-host creation gate for THIS user:
	// true when DISABLE_WORKSPACE_CREATION is off, or when the user's email
	// is in WORKSPACE_CREATION_ALLOWED_EMAILS. The UI combines it with the
	// instance-wide flag from /api/config to decide whether to show "Create
	// workspace" affordances.
	CanCreateWorkspace bool `json:"can_create_workspace"`
```

Convert `userToResponse` to a handler method so it can read `h.cfg` (auth.go:74):

```go
func (h *Handler) userToResponse(u db.User) UserResponse {
```

and inside the returned struct literal add:

```go
		CanCreateWorkspace:      h.canCreateWorkspace(u.Email),
```

Update every call site from `userToResponse(` to `h.userToResponse(`. Find them all:

Run: `rg -n 'userToResponse\(' server/internal/handler/`
Expected sites (7): `auth.go:417`, `auth.go:433`, `auth.go:611`, `auth.go:719`, `onboarding.go:127`, `onboarding.go:283`, `onboarding.go:345` (line numbers may drift; trust rg).

- [ ] **Step 4: Run tests and build**

Run: `cd server && go build ./... && go test ./internal/handler/ -run 'TestGetMe_CanCreateWorkspace|TestCreateWorkspace' -v`
Expected: build OK, all PASS.

- [ ] **Step 5: Commit**

```bash
git add server/internal/handler/auth.go server/internal/handler/onboarding.go server/internal/handler/auth_test.go
git commit -m "feat(server): expose can_create_workspace on user responses"
```

---

### Task 3: Frontend core — schema field + `useWorkspaceCreationDisabled()` hook

**Files:**
- Modify: `packages/core/api/schemas.ts` (`UserSchema`, ~line 947)
- Modify: `packages/core/types/workspace.ts` (`interface User`, ~line 30)
- Modify: `packages/core/config/index.ts`
- Test: `packages/core/api/schemas.test.ts`

**Interfaces:**
- Consumes: `useConfigStore` (config/index.ts), `useAuthStore` (from `../auth` — no import cycle: `packages/core/auth` does not import `config`), `User` type.
- Produces: `useWorkspaceCreationDisabled(): boolean` exported from `@multica/core/config` — Tasks 4 and 5 import this exact name. `User.can_create_workspace?: boolean`.

- [ ] **Step 1: Write the failing schema tests**

Add to `packages/core/api/schemas.test.ts`, following the file's existing test style (locate the existing `UserSchema` tests with `rg -n "UserSchema" packages/core/api/schemas.test.ts` and add alongside; if none exist, add a new `describe` at the end):

```ts
describe("UserSchema can_create_workspace", () => {
  const base = {
    id: "u1",
    name: "N",
    email: "e@example.com",
  };

  it("passes the field through when the server sends it", () => {
    const parsed = UserSchema.parse({ ...base, can_create_workspace: true });
    expect(parsed.can_create_workspace).toBe(true);
  });

  it("leaves the field undefined for older backends that omit it", () => {
    const parsed = UserSchema.parse(base);
    expect(parsed.can_create_workspace).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify the first fails**

Run: `pnpm --filter @multica/core test -- schemas`
Expected: the pass-through test FAILS (`.loose()` keeps unknown fields, so it may actually pass — if both pass, that's fine: the tests then pin the contract; continue). The `undefined` test passes either way.

- [ ] **Step 3: Implement schema + type + hook**

`packages/core/api/schemas.ts` — inside `UserSchema` after `timezone`:

```ts
  // Per-user workspace-creation permission under the self-host gate.
  // Optional: older backends omit it; readers must treat missing as
  // "not allowed" and let the instance-wide /api/config flag decide.
  can_create_workspace: z.boolean().optional(),
```

`packages/core/types/workspace.ts` — inside `interface User` after `timezone` (check the actual field order in the file):

```ts
  /**
   * Self-host creation gate, per user: true when this user may create
   * workspaces (gate off, or email allowlisted via
   * WORKSPACE_CREATION_ALLOWED_EMAILS). Optional — older backends omit it.
   */
  can_create_workspace?: boolean;
```

(`EMPTY_USER` in schemas.ts needs no change — the field is optional.)

`packages/core/config/index.ts` — add the import at the top and the hook at the end of the file:

```ts
import { useAuthStore } from "../auth";
```

```ts
/**
 * Effective "hide Create workspace affordances" flag for the current user:
 * the instance-wide public-config gate minus the per-user allowlist
 * exception carried on /api/me (`can_create_workspace`). Missing field
 * (old backend, user not loaded yet) counts as not-allowed, which keeps
 * the instance-wide flag's blanket behavior.
 */
export function useWorkspaceCreationDisabled(): boolean {
  const disabled = useConfigStore((s) => s.workspaceCreationDisabled);
  const canCreate = useAuthStore((s) => s.user?.can_create_workspace === true);
  return disabled && !canCreate;
}
```

- [ ] **Step 4: Run checks**

Run: `pnpm --filter @multica/core test -- schemas && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/api/schemas.ts packages/core/types/workspace.ts packages/core/config/index.ts packages/core/api/schemas.test.ts
git commit -m "feat(core): per-user workspace creation flag + useWorkspaceCreationDisabled"
```

---

### Task 4: Frontend views — switch read sites to the per-user hook

**Files:**
- Modify: `packages/views/onboarding/steps/step-workspace.tsx` (line ~86)
- Modify: `packages/views/layout/app-sidebar.tsx` (line ~355)
- Modify: `packages/views/modals/create-workspace.tsx` (line ~22)
- Modify: `packages/views/workspace/new-workspace-page.tsx` (line ~34)
- Test: `packages/views/onboarding/steps/step-workspace.test.tsx` (update mock)

**Interfaces:**
- Consumes: `useWorkspaceCreationDisabled` from `@multica/core/config` (Task 3).
- Produces: nothing new — behavior-preserving swap; the flag each component reads becomes per-user.

- [ ] **Step 1: Swap the four read sites**

In each of the four files, replace:

```ts
const workspaceCreationDisabled = useConfigStore((s) => s.workspaceCreationDisabled);
```

with:

```ts
const workspaceCreationDisabled = useWorkspaceCreationDisabled();
```

and add `useWorkspaceCreationDisabled` to the existing `@multica/core/config` import. Keep the `useConfigStore` import only where the file still uses it for other fields (`step-workspace.tsx` reads `daemonAppUrl`; check the other three with rg and drop the import if unused — `pnpm lint` will flag leftovers).

- [ ] **Step 2: Update the step-workspace test mock**

`packages/views/onboarding/steps/step-workspace.test.tsx` mocks `@multica/core/config` (line ~34). Extend the mock so the new hook is served from the same mock state, keeping the existing `setConfig`-style helpers working:

```ts
vi.mock("@multica/core/config", () => ({
  useConfigStore: (selector: (state: MockConfigState) => unknown) =>
    mockUseConfigStore(selector),
  useWorkspaceCreationDisabled: () =>
    mockUseConfigStore(
      (s: MockConfigState) => s.workspaceCreationDisabled,
    ) as boolean,
}));
```

(The file's existing `mockUseConfigStore.mockImplementation` helpers at line ~66 already flip `workspaceCreationDisabled` per test; routing the hook through the same selector keeps every existing test meaningful without rewriting them.)

- [ ] **Step 3: Run the views tests and typecheck; fix any other mocked-module fallout**

Run: `pnpm --filter @multica/views test && pnpm typecheck`
Expected: PASS. If another test file mocks `@multica/core/config` and now fails with "useWorkspaceCreationDisabled is not a function", add `useWorkspaceCreationDisabled: () => false` to that file's mock object (find candidates with `rg -ln 'vi.mock\("@multica/core/config"' packages/views apps`).

- [ ] **Step 4: Commit**

```bash
git add packages/views/onboarding/steps/step-workspace.tsx packages/views/layout/app-sidebar.tsx packages/views/modals/create-workspace.tsx packages/views/workspace/new-workspace-page.tsx packages/views/onboarding/steps/step-workspace.test.tsx
git commit -m "feat(views): per-user workspace-creation flag at all read sites"
```

---

### Task 5: Onboarding gate — invitation-required screen for strangers

**Files:**
- Create: `packages/views/onboarding/invitation-required.tsx`
- Modify: `packages/views/onboarding/onboarding-flow.tsx`
- Test: `packages/views/onboarding/invitation-required.test.tsx`

**Interfaces:**
- Consumes: `useWorkspaceCreationDisabled` (Task 3), `useLogout` from `packages/views/auth` (import path `../auth` from `packages/views/onboarding/`), existing locale keys `onboarding.step_workspace.creation_disabled_headline` / `creation_disabled_lede` / `creation_disabled_logout` (already present in `packages/views/locales/en/onboarding.json:309-311` and the `vi` counterpart — **no new locale strings**).
- Produces: `InvitationRequiredScreen` component; `OnboardingFlow` renders it (instead of any step) when the user cannot create workspaces and has zero workspaces.

- [ ] **Step 1: Write the failing component test**

Create `packages/views/onboarding/invitation-required.test.tsx`, mirroring the mock style of `packages/views/onboarding/steps/step-workspace.test.tsx` (real i18n, mocked auth/platform):

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockLogout = vi.hoisted(() => vi.fn());

vi.mock("../auth", () => ({
  useLogout: () => mockLogout,
}));

vi.mock("@multica/views/platform", () => ({
  DragStrip: () => null,
}));

import { InvitationRequiredScreen } from "./invitation-required";

describe("InvitationRequiredScreen", () => {
  it("shows the invitation-required copy and logs out on click", () => {
    render(<InvitationRequiredScreen />);
    expect(
      screen.getByText("Ask your administrator for an invitation."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(mockLogout).toHaveBeenCalled();
  });
});
```

If the real-i18n render errors because the test harness needs an i18n provider, copy the i18n setup lines from `step-workspace.test.tsx` verbatim (it renders `useT("onboarding")` strings, so it demonstrates the working pattern).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @multica/views test -- invitation-required`
Expected: FAIL — module `./invitation-required` not found.

- [ ] **Step 3: Implement the component**

Create `packages/views/onboarding/invitation-required.tsx`:

```tsx
"use client";

import { Button } from "@multica/ui/components/ui/button";
import { DragStrip } from "@multica/views/platform";
import { useLogout } from "../auth";
import { useT } from "../i18n";

/**
 * Full-screen gate shown instead of the onboarding flow when this user
 * cannot create workspaces (self-host allowlist gate) and belongs to no
 * workspace yet. Reuses the step_workspace.creation_disabled_* copy —
 * same situation, earlier surface. The logout button is the only escape
 * so a user who landed here without an invitation is not trapped.
 */
export function InvitationRequiredScreen() {
  const { t } = useT("onboarding");
  const logout = useLogout();
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <DragStrip />
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        <div className="flex w-full max-w-md flex-col gap-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t(($) => $.step_workspace.creation_disabled_headline)}
          </h1>
          <p className="text-muted-foreground">
            {t(($) => $.step_workspace.creation_disabled_lede)}
          </p>
          <Button
            variant="outline"
            size="lg"
            className="mx-auto mt-2"
            onClick={logout}
          >
            {t(($) => $.step_workspace.creation_disabled_logout)}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @multica/views test -- invitation-required`
Expected: PASS.

- [ ] **Step 5: Wire the gate into OnboardingFlow**

In `packages/views/onboarding/onboarding-flow.tsx`:

Add imports:

```ts
import { useWorkspaceCreationDisabled } from "@multica/core/config";
import { InvitationRequiredScreen } from "./invitation-required";
```

Add the flag next to the other hooks (right after `const isWeb = !!runtimeInstructions;`, line ~152):

```ts
  const creationDisabled = useWorkspaceCreationDisabled();
```

Insert the gate AFTER every hook declaration and BEFORE the first render branch (find the first `if (step === ` statement in the render section — all `useCallback`/`useState`/`useQuery` calls must stay above this early return):

```tsx
  // Stranger gate: a user who cannot create workspaces (self-host
  // allowlist, spec 2026-07-08) and has no workspace to resume gets the
  // invitation-required screen instead of the questionnaire. Invited
  // users never reach OnboardingFlow (AcceptInvitation marks them
  // onboarded), and a user with an existing workspace still finishes
  // onboarding normally. Hold rendering until the workspace list has
  // loaded so the Welcome step doesn't flash before the gate.
  if (creationDisabled && !workspacesFetched) {
    return null;
  }
  if (creationDisabled && workspaces.length === 0) {
    return <InvitationRequiredScreen />;
  }
```

Note: the `workspaces` query (line ~141) is `enabled` on the `welcome` step, which is the initial step, so `workspacesFetched` always becomes true here.

- [ ] **Step 6: Full frontend verification**

Run: `pnpm --filter @multica/views test && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/views/onboarding/invitation-required.tsx packages/views/onboarding/invitation-required.test.tsx packages/views/onboarding/onboarding-flow.tsx
git commit -m "feat(views): invitation-required gate replaces onboarding for non-creators"
```

---

### Task 6: Docs — environment variable reference

**Files:**
- Modify: `apps/docs/content/docs/environment-variables.mdx` (section "Locking down workspace creation", ~line 137–151)
- Modify: `apps/docs/content/docs/environment-variables.zh.mdx`, `.vi.mdx`, `.ja.mdx`, `.ko.mdx` (same section in each)

**Interfaces:** none — docs only. Read `apps/docs/content/docs/developers/conventions.mdx` / `.zh.mdx` before writing the zh copy (CLAUDE.md requirement for Chinese product voice).

- [ ] **Step 1: Update the English page**

In `environment-variables.mdx`, in the table under "Locking down workspace creation", replace the `DISABLE_WORKSPACE_CREATION` row's trailing sentence "There is no role/owner exception — the gate is global per instance" with "Emails in `WORKSPACE_CREATION_ALLOWED_EMAILS` are exempt" and add a row:

```markdown
| `WORKSPACE_CREATION_ALLOWED_EMAILS` | _(empty)_ | Comma-separated emails exempt from `DISABLE_WORKSPACE_CREATION` (case-insensitive). Exempt users keep the full create-workspace UI; everyone else sees an "ask your administrator for an invitation" screen until invited. Ignored when the gate is off |
```

Also update the "Recommended bootstrap sequence" list: add a note after step 3 that instead of the flag-off bootstrap, operators can start with both variables set (e.g. `WORKSPACE_CREATION_ALLOWED_EMAILS=admin@example.com`) and let the allowlisted admin create the workspace at any time.

- [ ] **Step 2: Mirror in the four translations**

Apply the equivalent edit to `.zh.mdx`, `.vi.mdx`, `.ja.mdx`, `.ko.mdx` — same table row and bootstrap note, translated in each file's existing voice (match the surrounding rows' terminology for "workspace"/"gate" in each language; for zh follow the glossary in `apps/docs/content/docs/developers/conventions.zh.mdx`). The variable name, default, and backtick-quoted values stay in English in all locales.

- [ ] **Step 3: Commit**

```bash
git add apps/docs/content/docs/environment-variables.mdx apps/docs/content/docs/environment-variables.zh.mdx apps/docs/content/docs/environment-variables.vi.mdx apps/docs/content/docs/environment-variables.ja.mdx apps/docs/content/docs/environment-variables.ko.mdx
git commit -m "docs: document WORKSPACE_CREATION_ALLOWED_EMAILS"
```

---

### Task 7: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suites**

Run: `make test` (Go) and `pnpm test` and `pnpm typecheck` from the repo root.
Expected: all PASS. If PostgreSQL isn't running, `make dev`/`make start` first (Go handler tests skip without a DB — a skip is NOT a pass for this feature; ensure the DB is up).

- [ ] **Step 2: Manual flow check (deploy config simulation)**

Start the stack with the gate on:

```bash
DISABLE_WORKSPACE_CREATION=true WORKSPACE_CREATION_ALLOWED_EMAILS=quangpd@unicomhub.com make start
```

Verify in the browser:
1. Log in as `quangpd@unicomhub.com` → onboarding shows the normal workspace-creation step; creating a workspace succeeds; the sidebar workspace switcher shows "Create workspace".
2. Log in as any other email with no invitations → `/onboarding` immediately shows "Ask your administrator for an invitation." + Log out; no questionnaire steps.
3. As owner/admin in the workspace, invite the other email; accept the invite as that user → lands directly in the workspace (no onboarding).
4. As the other user, `GET /api/me` shows `"can_create_workspace": false`; `POST /api/workspaces` returns 403.

- [ ] **Step 3: Final commit if any fixes were needed, then report**

Report results honestly: which checks ran, which passed, anything skipped.
