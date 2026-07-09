-- Public customer portal (spec: docs/superpowers/specs/2026-07-09-customer-portal-design.md).
-- workspace_portal_config: owner-managed portal settings, one row per workspace.
-- portal_session: maps an anonymous guest token (hash only) to a real chat_session
-- created under the workspace's Portal service user.
CREATE TABLE workspace_portal_config (
    workspace_id UUID PRIMARY KEY REFERENCES workspace(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    agent_id UUID REFERENCES agent(id) ON DELETE SET NULL,
    service_user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    hero_content JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE portal_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    chat_session_id UUID NOT NULL REFERENCES chat_session(id) ON DELETE CASCADE,
    guest_token_hash TEXT NOT NULL UNIQUE,
    contact_name TEXT NOT NULL DEFAULT '',
    contact_email TEXT NOT NULL DEFAULT '',
    contact_phone TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_portal_session_workspace ON portal_session(workspace_id, created_at DESC);
