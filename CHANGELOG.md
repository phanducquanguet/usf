# Changelog

## v0.6.3 — 2026-10-15

Bản release đầu tiên sau khi merge upstream Multica v0.6.2 vào fork (merge commit `a632fec95`, 928 commit upstream từ v0.4.23 → v0.6.2). Verification trước release ghi trong `RELEASE_CHECKLIST.md`.

### Tính năng mới (từ upstream v0.4.23 → v0.6.2)

- **Issue**: wakeup rules (đánh thức agent theo điều kiện), trạng thái issue tùy chỉnh theo 4 nhóm, thuộc tính text/link, đánh dấu issue trùng, sub-issue từ comment, comment permalink, annotation trong comment/mô tả.
- **Lượt chạy (run, trước gọi là task)**: điều khiển run đang chạy (steer), lịch sử run có phân trang, đường cong chi phí cộng dồn, transcript trong sidebar, PR auto-complete.
- **Kênh chat**: tích hợp **Telegram** (cần `MULTICA_TELEGRAM_SECRET_KEY`), DingTalk viết lại (nhóm, trích dẫn), `/new` và `/clear` cho Slack/DingTalk/Telegram/WeCom, gửi file/media.
- **Settings** gom nhóm mới (Issue & quy trình, Kết nối & tiện ích mở rộng), quản lý máy chủ MCP, plugin, Inbox archive, tìm kiếm tức thì, Cmd+K chuyển workspace.
- Runtime mới: CodeArts, DeepSeek Harness, MiniMax Code, Dim, ZeroClaw…; Claude Code model discovery; worktree cho thư mục local.
- Rất nhiều bản vá ổn định (task start khi upgrade, channel reply, search workspace lớn, đăng nhập lâu hơn).

### Fork giữ nguyên

- Branding **UniAI** / **UNICOM**, CLI `uniai` (kèm binary `multica` tương thích), endpoint release/update trỏ về fork.
- **Customer portal + marketplace**, allowlist tạo workspace, chỉ 2 locale **en + vi** (mặc định vi), docs chỉ cho bản hosted, embedded docs viewer.
- Stack compose prod: redis, 3 backend + nginx, service docs.

### Database

- Upstream thêm **291 migration (272–572)**. Migration fork đổi số **272–275 → 573, 574, 576, 577**, tách index portal thành `575_portal_project_ws_index` (CONCURRENTLY). Tất cả idempotent; **không cần sửa tay `schema_migrations`** (4 row tên cũ 272–275 còn lại là vô hại).
- ⚠️ **ROLLBACK IMAGE KHÔNG AN TOÀN**: migration 468 xoá cột `issue_pull_request.reference_only` mà image v0.4.23 vẫn truy vấn; 469/494 là forward-only. Muốn quay lại bản cũ phải **restore bản backup DB** — bắt buộc `pg_dump` trước khi deploy.

### i18n

- ~1.790 key giao diện mới + ~160 key upstream đổi câu được dịch tiếng Việt; parity en↔vi đầy đủ. Bỏ bundle zh-Hans/ja/ko/fr.
- 34/34 trang docs có bản `.vi.mdx` (thêm trang Telegram, đồng bộ nội dung mới).

### Env / secret khi deploy

| Biến | Bắt buộc? | Ghi chú |
| --- | --- | --- |
| `JWT_SECRET` | **Có** | Compose giờ từ chối khởi động nếu thiếu (`openssl rand -hex 32`). Prod phải giữ giá trị cũ để không đăng xuất mọi người. |
| `DO_NOT_TRACK` | Khuyến nghị `1` | Upstream thêm telemetry ẩn danh gửi mỗi ngày về `telemetry.multica.ai`, mặc định BẬT. |
| `MULTICA_IMAGE_TAG` | Có | Đặt `v0.6.3`. Service `docs` vẫn pin `:latest` (release đẩy cả tag latest). |
| `MULTICA_TELEGRAM_SECRET_KEY` | Nếu dùng Telegram | Không set = tắt. |
| `MULTICA_DINGTALK_SECRET_KEY` | Nếu dùng DingTalk | Không set = tắt. |

### Lưu ý vận hành

- Nâng cấp lần này có nhiều index build `CONCURRENTLY`: 3 backend khởi động cùng lúc sẽ deadlock khi chờ khóa migrate và tự restart (tự phục hồi, nhưng nginx có thể trả 502 vài chục giây). Nên chạy `./migrate up` một lần trước rồi mới bật backend (xem hướng dẫn deploy).
- Release workflow giờ chạy `govulncheck` (Go 1.26.9) và chặn release nếu có lỗ hổng.

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
