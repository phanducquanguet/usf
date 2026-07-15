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
INSERT INTO portal_session (workspace_id, chat_session_id, guest_token_hash, project_context)
VALUES ($1, $2, $3, $4)
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
    demo_url, portfolio_url, source_url, published, sort_order, i18n
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *;

-- name: UpdatePortalProject :one
UPDATE portal_project
SET name = $3, description = $4, industry = $5, features = $6, images = $7,
    demo_url = $8, portfolio_url = $9, source_url = $10, published = $11,
    sort_order = $12, i18n = $13, updated_at = now()
WHERE id = $1 AND workspace_id = $2
RETURNING *;

-- name: DeletePortalProject :exec
DELETE FROM portal_project WHERE id = $1 AND workspace_id = $2;
