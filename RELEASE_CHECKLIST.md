# Release Checklist — fork sau merge upstream v0.4.22 (commit `1efee5ed8`)

Ngày chạy: 2026-08-13. Môi trường: macOS (colima 6 CPU / 10 GB), Docker 29.5.2, goreleaser (brew), helm (brew), Go 1.26.1, Node 22 (CI) / 25 (local).

## 1. Build artifact thật

| Hạng mục | Kết quả | Ghi chú |
| --- | --- | --- |
| Docker backend (`Dockerfile`, `--no-cache`) | ✅ PASS | `multica-backend:release-check` (160 MB). Image chứa `server`, `migrate`, `migrations/`, CLI `multica`, `NOTICE` (file mới từ upstream). |
| Ldflags/version backend | ✅ PASS | `/app/multica --version` → `uniai release-check (commit: 1efee5ed8)`, go1.26.5 linux/amd64. |
| Docker web (`Dockerfile.web`, `--no-cache`) | ✅ PASS | `multica-web:release-check` (359 MB). Build in kèm warning `build-args [DOCS_URL REMOTE_API_URL] were not consumed` — xác nhận 2 biến này KHÔNG còn được bake lúc build (release.yml vẫn truyền cho image cũ, vô hại). |
| Docker docs (`Dockerfile.docs`) | ✅ PASS | `multica-docs:release-check`. |
| goreleaser snapshot (uniai + multica-compat) | ✅ PASS | 2 build × darwin/linux/windows × amd64/arm64. Binary đúng tên (`uniai`, `multica`), ldflags đúng: `uniai 0.4.22-SNAPSHOT-1efee5ed8 (commit: 1efee5ed8, built: 2026-08-13T07:56:41Z)`. Archive đủ 3 bộ: `uniai-cli-*`, `multica-cli-*` (compat), `multica_{os}_{arch}` (legacy self-update). `uniai --version` và `multica --version` chạy được trên host. |
| Web image runtime URL (REMOTE_API_URL / DOCS_URL) | ✅ PASS | Cùng 1 image chạy 2 lần với 2 bộ env trỏ vào 2 origin giả: `curl /api/config` trả `MARKER-SET-A-API` rồi `MARKER-SET-B-API`; `curl /docs/vi` trả `MARKER-A-DOCS` rồi `MARKER-B-DOCS`. URL được đọc từ env lúc runtime, không còn giá trị bake. |

## 2. Smoke test stack selfhost

| Hạng mục | Kết quả | Ghi chú |
| --- | --- | --- |
| Webhook delivery worker trong compose | ✅ KHÔNG CẦN THÊM SERVICE | Worker là goroutine trong tiến trình backend (`server/cmd/server/main.go:439`), mỗi replica tự chạy. Claim query dùng `SKIP LOCKED` (`webhook_delivery_worker.go`) nên 3 backend chạy song song an toàn, không giao trùng. Compose/helm không cần khai báo worker riêng. |
| Stack up + healthy | ✅ PASS (kèm 1 wart cold-start) | 8/8 service Up với image `release-check` (postgres, redis, backend×3, nginx, frontend, docs). 316 row `schema_migrations`, fork 272–275 áp cuối, bảng `portal_project` tồn tại. **Wart**: 3 backend cùng khởi động trên DB TRỐNG gây `deadlock detected` giữa advisory lock và `CREATE INDEX CONCURRENTLY` — container tự restart (≤3 lần) rồi migrate xong, server chạy bình thường; DB đã migrate thì re-run toàn `skip`, không deadlock. Không chặn release (prod DB đã migrate), nhưng cài mới nên start 1 backend trước. **Lưu ý compose**: service `docs` pin cứng tag `:latest` (không theo `MULTICA_IMAGE_TAG`). |
| Smoke qua nginx (login/portal/docs/WS realtime) | ✅ PASS | `/api/config` trả đều qua LB round-robin. Login bằng verification code (in ra log khi không có email backend) → JWT; tạo workspace `demo`, PAT, issue DEM-1. Branding: login/portal đầy UNICOM+UniAI, KHÔNG còn "Multica" user-facing (chuỗi duy nhất là tên service nội bộ `multica-cloud` trong trang billing thử nghiệm — đúng quy ước). Portal `/` (356 KB SSR), `/marketplace`, `/login`, `/docs` đều 200. **WS realtime**: 2 client WS qua nginx (`/ws?workspace_id=` + frame `{"type":"auth","payload":{"token":"mul_…"}}`) rơi vào các backend khác nhau (phân bố 1/2/1), tạo issue qua REST → CẢ HAI socket nhận `issue:created`/`activity:created`/`subscriber:added` → redis fan-out đa backend hoạt động. Giới hạn phạm vi: smoke bằng curl/script, không click UI browser; portal chat full-flow (cần agent + runtime thật) và docs viewer UI không test tay — docs-dialog đã có 7 unit test pass. |
| i18n en↔vi + docs fallback | ✅ PASS | SSR đổi theo cookie `multica-locale`: mặc định `lang="vi-VN"`, `en` → `lang="en"`, locale lạ (`zh-Hans`) → fallback `vi-VN`. 6 trang docs chưa có `.vi.mdx` (concepts, dingtalk-bot-integration, security-model, triggering-agents, tutorial, vcs-integration): `/docs/vi/<trang>` đều 200, trả nội dung tiếng Anh, không 404/blank; trang có bản dịch trả tiếng Việt ("Tạo và cấu hình agent"). |
| VCS flag off/on | ✅ PASS | Đính chính đề bài: compose default **BẬT** (`MULTICA_VCS_INTEGRATION_ENABLED=true`, self-host-only theo upstream) — nhưng thiếu secret key thì backend log `vcs integration disabled` và chạy bình thường. Flag `false` → `/api/config` KHÔNG có field `vcs_integration_available` (UI check `=== true` nên ẩn mục VCS), log sạch. Flag `true` + secret key giả (openssl rand) → backend Up ổn định, config trả `true`, không crash. ⚠️ Để ý: flag bật mà THIẾU key thì config vẫn trả `true` (UI hiện mục VCS nhưng kết nối sẽ lỗi) — khi deploy prod muốn dùng VCS phải set `MULTICA_VCS_SECRET_KEY`, không dùng thì set flag `false`. |

## 3. CLI shim & tương thích

| Hạng mục | Kết quả | Ghi chú |
| --- | --- | --- |
| Điểm chạm shim trong code | ✅ XÁC NHẬN | `MULTICA_*` env (19 điểm đọc, gồm `MULTICA_TOKEN`, `MULTICA_WORKSPACE_ID`); `~/.multica/` + `~/.multica/profiles/*` (cmd_daemon.go); scheme `multica://` (desktop deep-link + web auth callback); header `X-Multica-Next-Before`/`-Id` (pagination cursor). |
| Test runtime CLI ↔ stack local | ✅ PASS | Binary snapshot `uniai` (HOME cô lập) chạy qua nginx LB `http://localhost:18080`: `config set server_url/app_url` ghi đúng `~/.multica/config.json`; `MULTICA_TOKEN` (PAT `mul_…` mint qua `POST /api/tokens`) auth OK; `workspace list` / `workspace switch demo` / `issue create` (DEM-1) / `issue comment add + list` đều chạy — chứng minh luồng PAT + X-Workspace-ID với backend mới. `multica://` (deep-link desktop) và header `X-Multica-Next-Before*` xác nhận ở mức code (không đổi sau merge); nginx mặc định không strip custom header. |

## 4. Helm

| Hạng mục | Kết quả | Ghi chú |
| --- | --- | --- |
| `helm lint` | ✅ PASS | 0 failed (chỉ INFO thiếu icon). |
| `helm template` (values mặc định) | ✅ PASS | 14 resources render sạch. |
| Diff manifest trước/sau merge | ✅ PASS — đúng 4 thay đổi, không có gì ngoài dự kiến | (1) ConfigMap thêm `MULTICA_VCS_INTEGRATION_ENABLED: "true"`; (2) bỏ Service ExternalName `backend` (do `backendAlias` default `false` — image mới đọc REMOTE_API_URL runtime); (3) frontend Deployment thêm env `REMOTE_API_URL=http://rel-backend:8080`; (4) checksum/config đổi theo. |
| Biến thể values | ✅ PASS | `vcsIntegrationEnabled=false` → ConfigMap `"false"`; `backendAlias=true` → Service `backend` quay lại; `docsAlias=false` + `docsUrl` set → bỏ alias, inject `DOCS_URL`. Mặc định giữ Service `docs` cho web image của fork. |
| Webhook worker manifest | ✅ KHÔNG CẦN | In-process trong backend (xem mục 2). |
| Lưu ý | ⚠️ | Production thực tế chạy `docker-compose.selfhost.yml` trên node-master, KHÔNG chạy helm — diff trên là informational. Chart default vẫn trỏ `ghcr.io/multica-ai/*` (upstream); nếu deploy helm với image fork cần override `images.*.repository`. |

## 5. Tương thích rollback (DB 275 migration ↔ image trước merge)

**Kết luận: ROLLBACK IMAGE AN TOÀN.** Phạm vi thực tế của merge là upstream 161–271 (110 file) + fork 272–275, đã quét toàn bộ 115 file:

- **Không có** `DROP TABLE` / `DROP COLUMN` / `RENAME COLUMN` / `SET NOT NULL` / đổi kiểu cột trên bảng có sẵn.
- **Mọi `ADD COLUMN`** đều nullable hoặc có `DEFAULT` (33 file) → code cũ INSERT không liệt kê cột mới vẫn chạy.
- **Constraint swap (15 file `DROP CONSTRAINT`)** đều là NỚI RỘNG: thêm giá trị vào CHECK IN (protocol_family, origin_type, subscriber reason, item_type), bỏ FK (đúng quy ước repo), hoặc rename constraint (199) — code cũ không tham chiếu tên constraint.
- **Trigger mới (243)** trên bảng cũ (`agent_task_queue`, `issue`, `task_usage`) ghi vào bảng dirty-marker đã tồn tại sau migrate → write từ code cũ vẫn thành công.
- **Runner migrate của image cũ** chỉ duyệt file nó mang theo; row `schema_migrations` "lạ" (161–271, 272–275) bị bỏ qua, không lỗi.
- Fork 274 (hero_content locale-keyed) không ảnh hưởng: image trước merge đã đọc shape locale-keyed (fork có 163_portal_hero_locale từ trước).

**Caveat rollback** (không chặn, cần biết): dữ liệu tạo bởi tính năng mới (issue từ DingTalk/WeCom, issue views, quick actions, VCS connections, label agent/skill…) sẽ vô hình/không truy cập được dưới image cũ nhưng không gây crash; quay lại image mới thì thấy lại đầy đủ.

## 6. Chốt release

- **CHANGELOG**: `CHANGELOG.md` (mới) — entry v0.4.23 gồm tính năng upstream v0.4.22, thay đổi fork, env/secret mới (`MULTICA_VCS_SECRET_KEY` nếu bật VCS, `MULTICA_WECOM_SECRET_KEY` nếu dùng WeCom), helm values mới.
- **Working tree**: sạch — chỉ 2 file mới chủ đích (`CHANGELOG.md`, `RELEASE_CHECKLIST.md`); `dist/` của goreleaser đã nằm trong `.gitignore`.
- **Verification tổng**: Go test PASS, 5.745 TS test PASS, typecheck 6/6, lint PASS, migration DB sạch + prod-sim PASS (vòng trước); vòng này thêm: build image no-cache PASS, goreleaser snapshot PASS, runtime URL PASS, smoke stack 8 service PASS, WS fan-out đa backend PASS, i18n/docs fallback PASS, VCS flag 2 chiều PASS, CLI shim PASS, helm PASS, rollback AN TOÀN.

### KẾT LUẬN: **GO** — đề xuất tag `v0.4.23`

Rủi ro còn lại (không chặn):

1. **6 trang docs chưa dịch vi** (concepts, dingtalk-bot-integration, security-model, triggering-agents, tutorial, vcs-integration) — fallback tiếng Anh hoạt động; nên dịch dần sau release.
2. **VCS flag bật mặc định trong compose nhưng thiếu secret key** → UI hiện mục VCS, kết nối sẽ lỗi. Prod: hoặc thêm `MULTICA_VCS_SECRET_KEY` vào `.env`, hoặc set flag `false`.
3. **Cold-start deadlock migrate** khi 3 backend cùng lên trên DB trống — tự phục hồi qua restart; chỉ ảnh hưởng cài mới, không ảnh hưởng prod upgrade.
4. **Compose `docs` pin tag `:latest`** — khi release image docs mới nhớ push tag latest hoặc override `MULTICA_DOCS_IMAGE`.
5. **Menu Help của upstream (hàng Server version + Feedback) không được đưa vào** — fork giữ nút docs đơn giản (quyết định chủ đích khi merge).
6. Smoke UI ở mức HTTP/script, chưa click tay trên browser; portal chat full-flow (cần agent + runtime thật) chưa test end-to-end — nên thử nhanh trên prod sau deploy.
7. Test suite local trên Node 25 cần `NODE_OPTIONS=--no-experimental-webstorage` (CI Node 22 không bị).
