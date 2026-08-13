-- hero_content becomes locale-keyed: {contact_email, vi: {...}, en: {...}}
-- so the portal language switch also switches admin-authored copy.
-- Existing flat copy fields were authored in Vietnamese; move them under "vi".
--
-- Re-run safe: originally shipped as 163_portal_hero_locale, renumbered to
-- 274 after colliding with upstream v0.4.22's 163_agent_builder. The WHERE
-- guard only matches the legacy flat shape, so already-migrated rows are
-- untouched on a re-run.
UPDATE workspace_portal_config
SET hero_content = jsonb_strip_nulls(
    jsonb_build_object(
        'contact_email', hero_content -> 'contact_email',
        'vi', hero_content - 'contact_email'
    )
)
WHERE hero_content ?| ARRAY['greeting', 'headline', 'subheadline'];
