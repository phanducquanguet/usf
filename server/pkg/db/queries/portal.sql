-- name: GetPortalConfig :one
SELECT * FROM workspace_portal_config WHERE workspace_id = $1;

-- name: UpsertPortalConfig :one
INSERT INTO workspace_portal_config (workspace_id, enabled, agent_id, hero_content)
VALUES ($1, $2, $3, $4)
ON CONFLICT (workspace_id) DO UPDATE
SET enabled = EXCLUDED.enabled,
    agent_id = EXCLUDED.agent_id,
    hero_content = EXCLUDED.hero_content,
    updated_at = now()
RETURNING *;

-- name: SetPortalServiceUser :one
UPDATE workspace_portal_config
SET service_user_id = $2, updated_at = now()
WHERE workspace_id = $1
RETURNING *;

-- name: CreatePortalSession :one
INSERT INTO portal_session (workspace_id, chat_session_id, guest_token_hash)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetPortalSessionByTokenHash :one
SELECT * FROM portal_session WHERE guest_token_hash = $1;

-- name: TouchPortalSession :exec
UPDATE portal_session SET last_activity_at = now() WHERE id = $1;

-- name: ConfirmPortalSession :one
UPDATE portal_session
SET contact_name = $2, contact_email = $3, contact_phone = $4,
    status = 'confirmed', last_activity_at = now()
WHERE id = $1 AND status = 'active'
RETURNING *;

-- name: ClosePortalSession :exec
UPDATE portal_session SET status = 'closed' WHERE id = $1;
