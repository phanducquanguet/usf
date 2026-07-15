-- hero_content becomes locale-keyed: {contact_email, vi: {...}, en: {...}}
-- so the portal language switch also switches admin-authored copy.
-- Existing flat copy fields were authored in Vietnamese; move them under "vi".
UPDATE workspace_portal_config
SET hero_content = jsonb_strip_nulls(
    jsonb_build_object(
        'contact_email', hero_content -> 'contact_email',
        'vi', hero_content - 'contact_email'
    )
)
WHERE hero_content ?| ARRAY['greeting', 'headline', 'subheadline'];
