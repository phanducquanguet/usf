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
