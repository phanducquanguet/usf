# Changelog

## v0.4.23 — 2026-08-13

Bản release đầu tiên sau khi merge upstream Multica v0.4.22 vào fork (merge commit `1efee5ed8`). Toàn bộ vòng verification trước release được ghi trong `RELEASE_CHECKLIST.md`.

### Tính năng mới (từ upstream v0.4.22)

- **Tích hợp VCS self-host** (Forgejo / Gitea / GitLab): kết nối repo, PR card, webhook. Self-host bật sẵn qua `MULTICA_VCS_INTEGRATION_ENABLED=true`; **cần thêm `MULTICA_VCS_SECRET_KEY`** (khóa mã hóa token at-rest) thì mới hoạt động thật.
- **Kênh DingTalk và WeCom**: bind tài khoản, tạo issue từ chat, thông báo. WeCom cần `MULTICA_WECOM_SECRET_KEY` (không set = tắt).
- **Quick actions**: nút hành động chạy agent theo cấu hình sẵn trong workspace.
- **Onboarding "Mika"** viết lại; **agent builder**; **issue views / properties / labels** (label giờ dùng chung cho issue, agent, skill).
- **Webhook delivery worker**: hàng đợi giao webhook có retry/lease, chạy trong tiến trình backend (SKIP LOCKED — an toàn multi-replica, không cần service riêng).
- **Usage analytics** phía client; **runtime URL proxy** trong web image (`REMOTE_API_URL` / `DOCS_URL` đọc lúc runtime, không còn bake lúc build).
- Type scale mới theo vai trò (`text-body`, `text-caption`, …) kèm test guard chống lệch scale.

### Fork giữ nguyên

- Branding **UniAI** (sản phẩm) / **UNICOM** (landing, login); CLI `uniai` (kèm binary/archive `multica` để self-update từ bản cũ).
- **Customer portal** (landing / marketplace / chat) tại `/`; chỉ 2 locale **en + vi** (mặc định vi); embedded docs viewer.
- **Redis WS load-balancer**: 3 backend + nginx trong `docker-compose.selfhost.yml` — đã smoke test fan-out realtime đa backend.
- Shim tương thích: `MULTICA_*` env, `~/.multica/`, scheme `multica://`, header `X-Multica-*`.

### Database

- Migration fork đổi số **161–164 → 272–275** (idempotent, re-run trên DB đã migrate là no-op). Upstream thêm 161–271.
- **Deploy prod KHÔNG cần sửa tay `schema_migrations`** — runner tự áp file mới, bỏ qua row cũ.
- **Rollback image về bản trước merge an toàn** (đã phân tích 115 migration: không drop/rename/NOT NULL-không-default trên bảng cũ; chi tiết trong RELEASE_CHECKLIST.md mục 5).

### i18n

- 1.337 key giao diện mới dịch tiếng Việt; 235 key thừa gỡ bỏ; parity en↔vi 56/56.
- 6 trang docs chưa có bản `.vi.mdx` (concepts, dingtalk-bot-integration, security-model, triggering-agents, tutorial, vcs-integration) — tự fallback sang tiếng Anh, không 404.

### Env / secret mới khi deploy

| Biến | Bắt buộc? | Ghi chú |
| --- | --- | --- |
| `MULTICA_VCS_SECRET_KEY` | Nếu dùng VCS | `openssl rand -hex 32`; thiếu key mà flag bật thì UI hiện mục VCS nhưng kết nối lỗi — không dùng thì set `MULTICA_VCS_INTEGRATION_ENABLED=false`. |
| `MULTICA_VCS_INTEGRATION_ENABLED` | Không | Compose self-host mặc định `true`. |
| `MULTICA_WECOM_SECRET_KEY` | Nếu dùng WeCom | Không set = tính năng tắt. |
| `REMOTE_API_URL` / `DOCS_URL` | Không | Giờ là env runtime của web image; compose đã set sẵn (`http://backend:8080`, `http://docs:4000`). |

### Helm values mới (chart `deploy/helm/multica` — informational, prod dùng compose)

- `backend.config.vcsIntegrationEnabled` (default `true`).
- `frontend.compatibility.backendAlias` default **false** (image mới không cần Service alias `backend`).
- `frontend.compatibility.docsAlias` (default `true`) + `frontend.config.docsUrl` cho web image của fork.

### Lưu ý vận hành

- Khởi động 3 backend **cùng lúc trên DB trống** có thể deadlock advisory-lock ↔ `CREATE INDEX CONCURRENTLY` trong lúc migrate; container tự restart và hoàn tất (prod DB đã migrate không bị). Cài mới nên cho 1 backend chạy migrate xong rồi mới scale.
- Compose service `docs` pin tag `:latest` cố định (không theo `MULTICA_IMAGE_TAG`) — override bằng `MULTICA_DOCS_IMAGE` khi cần.
