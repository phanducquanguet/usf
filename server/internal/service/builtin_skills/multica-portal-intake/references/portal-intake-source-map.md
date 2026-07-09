# portal-intake source map

| Claim in SKILL.md | Source |
| --- | --- |
| `[PORTAL]` preamble on first guest message | `server/internal/handler/portal_public.go` (`portalFirstMessagePreamble`, `SendPortalMessage`) |
| `[TÓM TẮT DỰ ÁN]` block detection by UI | `apps/web/features/portal/constants.ts` (`PORTAL_SUMMARY_MARKER`) |
| `[KHÁCH XÁC NHẬN]` confirmation message | `server/internal/handler/portal_public.go` (`portalConfirmMarker`, `ConfirmPortalSession`) |
| `multica project create` flags | `server/cmd/multica/cmd_project.go` (`--title`, `--description`) |
| Contact collected by UI, not agent | `POST /portal/sessions/{token}/confirm` in `server/cmd/server/router.go` |
