-- Locale overrides for marketplace projects. Base columns (name, description,
-- industry, features) hold the Vietnamese copy; i18n holds per-field English
-- overrides ({"en": {"name": ..., ...}}), mirroring the hero_content pattern
-- from migration 163. Missing fields fall back to the base columns.
ALTER TABLE portal_project ADD COLUMN i18n JSONB NOT NULL DEFAULT '{}';
