-- Split out of 574_portal_project so the index is built CONCURRENTLY.
-- IF NOT EXISTS: deployments that ran 273_portal_project already have it.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portal_project_ws ON portal_project(workspace_id, published, sort_order);
