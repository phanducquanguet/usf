-- Flatten the Vietnamese copy back to the legacy single-language shape;
-- English copy has no legacy representation and is dropped.
UPDATE workspace_portal_config
SET hero_content = jsonb_strip_nulls(
    (hero_content - 'vi' - 'en') || COALESCE(hero_content -> 'vi', '{}'::jsonb)
)
WHERE hero_content ?| ARRAY['vi', 'en'];
