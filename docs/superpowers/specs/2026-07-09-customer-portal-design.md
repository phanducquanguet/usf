# Customer Portal — "Tư vấn & khởi tạo dự án" (Design Spec)

Date: 2026-07-09
Status: Approved by owner (quangpd), pending implementation plan.

## Purpose

A public portal at `/` (replacing the removed landing page) where prospective
customers chat with a dedicated consulting agent about the software they want.
When the survey is complete and the customer confirms, the agent creates a new
project in the configured workspace's project module, with the project title
and a full requirements description (including the customer's contact info).

Reference inspiration: `/Users/ducquang/product/factory-ai-genesis` (Lovable
demo — form-based mock "AI diagnosis"). We reuse its UX ideas (summary card,
confirmation step, thank-you screen), not its architecture: our version is a
real agent conversation persisted in Multica.

## Decisions (locked)

| Question | Decision |
| --- | --- |
| Access | Anonymous guests chat immediately; contact info (name/email/phone) required only at the confirmation step before project creation. |
| AI mechanism | Reuse existing infrastructure: guest messages go through `chat_session` → `agent_task_queue` → daemon → agent CLI. No direct LLM calls from the Go server. |
| Agent | A normal agent ("Tư vấn" / consulting agent), configured per workspace. Only the workspace **owner** can configure the portal. |
| Workspace binding | One deployment-wide portal workspace, selected by env `PORTAL_WORKSPACE_SLUG`. |
| End of flow | Agent proposes a summary (project title + full requirements). UI shows a contact + confirm form. After confirmation the agent creates the project via CLI; the guest sees a thank-you screen immediately (project creation runs in the background). |
| Portal UI | Full multi-section landing page (restore components from commit `98644c57`, rewrite content) with the chat as the primary CTA. |
| Guest bridge | Option A: `portal_session` table + public `/portal/*` endpoints + a single "Portal" service user that owns all guest chat sessions. |

## Architecture

### Backend (Go, `server/`)

**New migration** with two tables:

- `workspace_portal_config`: `workspace_id` (unique, FK cascade), `enabled`
  (bool, default false), `agent_id` (FK to agent, nullable), `hero_content`
  (jsonb: greeting, headline, section copy), `created_at`, `updated_at`.
- `portal_session`: `id`, `workspace_id` (FK), `chat_session_id` (FK),
  `guest_token_hash` (unique), `contact_name`, `contact_email`,
  `contact_phone`, `status` (`active` | `confirmed` | `closed`, default
  `active`), `created_at`, `last_activity_at`.

**Service user.** When the owner first enables the portal, the server creates
a system user ("Portal") plus a membership in the portal workspace. Every
guest `chat_session` is created with `creator_id` = this user. This is what
lets the existing pipeline run unmodified (`CreateChatMessage` →
`TaskService.EnqueueChatTask` → daemon → agent CLI) and makes guest
conversations visible to the team inside the app.

**Public routes** — registered outside the `middleware.Auth` group in
`server/cmd/server/router.go` (same pattern as `/auth/send-code`, webhooks,
invites), per-IP rate-limited. The portal workspace is resolved server-side
from `PORTAL_WORKSPACE_SLUG`.

- `GET  /portal/config` — `{ enabled, hero_content, agent: { name, avatar } }`.
- `POST /portal/sessions` — mint a 256-bit random guest token (store only its
  hash), create `chat_session` (creator = service user, agent = configured
  agent) + `portal_session`. Limit ≈ 5 sessions per IP per hour.
- `POST /portal/sessions/{token}/messages` — validate token, append user
  message, enqueue chat task. **Reject while the session has a pending/running
  task** (one guest turn ⇒ one agent turn; protects the daemon from spam).
  Enforce max message length.
- `GET  /portal/sessions/{token}/messages?after=<cursor>` — polling for the
  guest UI (the existing WebSocket hub is auth-gated; 2–3s polling is fine for
  v1).
- `POST /portal/sessions/{token}/confirm` — save contact fields, set
  `status=confirmed`, append a structured message
  (`[KHÁCH XÁC NHẬN] name/email/phone`) so the agent proceeds to create the
  project.

**Owner settings API** (inside the auth group, owner-role gated):
`GET/PUT /api/portal/config`.

**Consulting agent behavior** — delivered as a builtin skill `portal-intake`
under `server/internal/service/builtin_skills/` (with `SKILL.md` +
`references/*-source-map.md` per repo rules):

1. Survey the customer step by step (business context, problems, desired
   features, users, integrations, timeline/budget).
2. When information is sufficient, emit a summary in a machine-recognizable
   format (delimited block containing proposed project title + full
   requirements description) — the portal UI detects this and shows the
   contact/confirm form.
3. On receiving the `[KHÁCH XÁC NHẬN]` message, run
   `multica project create --title … --description …` where the description
   contains the full requirements plus the customer's contact info.

### Frontend

- **`apps/web/features/portal/`** — portal UI (web-only, so NOT in
  `packages/views/`): restored landing sections (from `98644c57`,
  `apps/web/features/landing/`) with rewritten content, plus `PortalChat` — a
  lightweight standalone chat component (fetches the public endpoints with zod
  schemas via `parseWithFallback`; does not reuse the internal `chat-window`,
  which is coupled to auth stores). Guest token kept in `localStorage` so a
  returning visitor resumes their session.
- **`apps/web/proxy.ts`** — `/` for unauthenticated visitors renders the
  portal instead of redirecting to `/login`. Authenticated visitors keep the
  current redirect into their workspace.
- **`packages/views/settings/`** — new "Portal" settings tab (shared
  web+desktop, owner-only): enable toggle, agent picker, hero content editor.
- i18n vi/en through the existing locales system; follow the conventions doc
  for Vietnamese product voice.

### Flow

```
Guest (browser, guest_token)
  → POST /portal/sessions            → chat_session (creator = Portal service user)
  → POST …/messages                  → chat_message + agent_task_queue
  → daemon claims task               → consulting agent CLI (portal-intake skill)
  → agent replies                    → GET …/messages (polling)
  → agent emits summary block        → UI shows contact + confirm form
  → POST …/confirm                   → [KHÁCH XÁC NHẬN] message + status=confirmed
  → UI shows thank-you screen        → agent runs `multica project create`
                                     → project appears in workspace's project module
```

## Error handling & abuse control

- Portal disabled / agent archived / agent missing → portal page shows a
  contact-email notice instead of the chat.
- Daemon offline → "agent is busy" banner (mirrors the internal
  `offline-banner` pattern).
- Guest tokens: 256-bit random, hash-compared server-side; sessions expire
  after 7 days of inactivity (`status=closed`).
- Rate limits: per-IP session creation, per-IP message rate, max message
  length, and one in-flight agent task per session.
- All portal endpoints return schema-stable JSON; client parses with zod +
  `parseWithFallback` and degrades defensively (API Compatibility rules).

## Testing

- Go handler tests: invalid/expired token, rate limiting, pending-task
  rejection, confirm flow (contact persisted + structured message appended),
  owner-only config access, service-user provisioning.
- Client: zod schema tests including malformed-response cases for every
  portal endpoint consumed by UI logic.
- Playwright e2e: open portal → start session → send message → see pending
  state; confirmation flow with a stubbed agent reply.

## Out of scope (v1)

- Per-workspace public portals (`/{slug}/portal`) — single configured
  workspace only.
- WebSocket/SSE streaming to guests — polling in v1.
- File attachments from guests.
- CAPTCHA — revisit if rate limits prove insufficient.
