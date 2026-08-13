-- Locale overrides for marketplace projects. Base columns (name, description,
-- industry, features) hold the Vietnamese copy; i18n holds per-field English
-- overrides ({"en": {"name": ..., ...}}), mirroring the hero_content pattern
-- from migration 274_portal_hero_locale. Missing fields fall back to the base
-- columns.
--
-- IF NOT EXISTS: originally shipped as 164_portal_project_i18n, renumbered to
-- 275 after colliding with upstream v0.4.22's 164_attachment_task_id, so the
-- re-run on already-migrated deployments must be a no-op.
ALTER TABLE portal_project ADD COLUMN IF NOT EXISTS i18n JSONB NOT NULL DEFAULT '{}';
