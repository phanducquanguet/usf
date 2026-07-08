# Workspace Creation Allowlist Design

**Date:** 2026-07-08
**Status:** Approved

## Goal

On this deployment, only `quangpd@unicomhub.com` may create workspaces. Users
without an invitation never see the onboarding questionnaire — they see a
"you need an invitation" notice with a logout button. Invited users keep the
current behavior: accepting an invitation takes them straight into the
workspace (onboarding is already skipped for them today).

## Approach

Extend the existing `DISABLE_WORKSPACE_CREATION` self-host gate (#3433) with
an email allowlist exception, configured via environment variables. No new
DB schema, no platform-admin concept.

Operator configuration:

```
DISABLE_WORKSPACE_CREATION=true
WORKSPACE_CREATION_ALLOWED_EMAILS=quangpd@unicomhub.com
```

Alternatives considered and rejected:

- **Platform-admin flag in DB** — new schema and admin UI for a single-email
  requirement. YAGNI.
- **Hardcoded email** — changing the email would require a code change and
  redeploy.

## Design

### 1. Backend: workspace creation gate

- Add `WorkspaceCreationAllowedEmails []string` to `handler.Config`
  (`server/internal/handler/handler.go`), populated from the
  `WORKSPACE_CREATION_ALLOWED_EMAILS` env var (comma-separated,
  case-insensitive), following the existing `ALLOWED_EMAILS` pattern.
- In `CreateWorkspace` (`server/internal/handler/workspace.go`), the existing
  403 gate becomes: reject when `DisableWorkspaceCreation` is true AND the
  requesting user's email is not in the allowlist. Requires loading the
  user's email by userID (one `GetUser` query).

### 2. Backend: per-user signal for the frontend

`/api/config` is public and must not carry user-scoped data (documented in
`config.go`). Instead:

- Add `can_create_workspace: bool` to the authenticated `/api/me` response.
  Value: `!DisableWorkspaceCreation || email in allowlist`.

### 3. Frontend: effective creation-disabled flag

- After `/api/me` loads, compute the config store's
  `workspaceCreationDisabled` as
  `config.workspace_creation_disabled && me.can_create_workspace !== true`.
  Single write site; all existing readers (app sidebar, onboarding workspace
  step, create-workspace modal, new-workspace page) inherit the per-user
  value unchanged.
- Update the `/api/me` zod schema per the API-compatibility rules
  (`parseWithFallback`; missing field defaults to `false`-ish so old
  backends keep the blanket-disabled behavior).

### 4. Onboarding: strangers see no onboarding

- In `OnboardingFlow` (`packages/views/onboarding/`): when the effective
  `workspaceCreationDisabled` is true AND the user has no existing workspace,
  render a "you need an invitation to join a workspace" notice with a logout
  button as the entire flow — skip welcome/questionnaire/workspace steps.
  Reuse the existing `CreationDisabledNotice` pattern from
  `step-workspace.tsx`, hoisted to the top of the flow.
- Allowlisted users (quangpd) go through onboarding normally.
- Invited users are unaffected: `AcceptInvitation` already sets
  `onboarded_at` atomically and routes them straight into the workspace.

### 5. Member invitations

**Deliberate decision (user-approved):** no backend change. The invite form
is already hidden from plain members in the UI
(`packages/views/settings/components/members-tab.tsx`, `canManageWorkspace`
gate). `CreateInvitation` keeps its current membership-only check, so a
plain member could still invite via direct API call — accepted risk on this
deployment.

## Testing

- Go: `CreateWorkspace` with flag on + email in/out of allowlist;
  `/api/me` returns `can_create_workspace` correctly for both cases.
- Frontend: `/api/me` schema change gets a malformed-response test;
  `OnboardingFlow` renders the invitation-required notice when the
  effective flag is disabled and no workspace exists.
- i18n: new "invitation required" copy added to `packages/views/locales/`
  following the glossary in
  `apps/docs/content/docs/developers/conventions.mdx`.

## Edge cases

- A stranger mid-onboarding at deploy time sees the notice on next load.
- Existing account, not yet onboarded, zero workspaces: routed to
  `/onboarding`, which now renders the invitation-required notice (section 4).
  When invited, they enter via the `/invite/{id}` email link or the existing
  `/invitations` routing for un-onboarded users with pending invites.
- Existing account, already onboarded, zero workspaces (e.g. removed from a
  workspace): `resolvePostAuthDestination` routes them to `/workspaces/new`,
  which already renders a "creation disabled" notice instead of the form.
  With the per-user flag from section 3 this works without extra changes.
  They enter via the `/invite/{id}` email link when invited (onboarded users
  are not auto-routed to `/invitations` — existing product behavior).
- Desktop shares `packages/views`, so both platforms get the behavior.
- `/api/config` never exposes the allowlist to anonymous callers.
- Old desktop clients without the new `/api/me` field fall back to the
  blanket-disabled behavior (schema default), which is safe.
