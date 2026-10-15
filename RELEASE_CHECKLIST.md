# Release Checklist — v0.6.3 (fork sau merge upstream v0.6.2, commit `a632fec95`)

Ngày chạy: 2026-10-15. Môi trường: macOS (colima 4 CPU / 6 GB), Docker 29.5.2, goreleaser, Go 1.26.9 (giống CI) / 1.27.1 (local), Node 22 (CI) / 25 (local). Bản checklist v0.4.23 xem lịch sử git của file này.

## 1. Build artifact thật

| Hạng mục | Kết quả | Ghi chú |
| --- | --- | --- |
| `docker compose -f docker-compose.selfhost.build.yml build --no-cache` | ✅ PASS | backend 163 MB, web 377 MB, docs 355 MB. Cảnh báo CSS `::highlight(multica-find)` có từ trước merge, vô hại. |
| Backend image | ✅ PASS | Build bằng `golang:1.26.9`; chứa `server`, `migrate`, 603 cặp migration, CLI `uniai`. |
| goreleaser | ✅ PASS | `goreleaser check` hợp lệ; snapshot build ra `uniai` và `multica` (compat), `uniai 0.6.2-SNAPSHOT-a632fec95`, go1.26.9. |
| `govulncheck` (bước chặn release) | ✅ PASS với Go 1.26.9 | Go 1.27.1 local báo 11 lỗ hổng stdlib (đã vá ở 1.27.2) — không ảnh hưởng CI/image. |
| `scripts/test-go.test.sh` | ✅ PASS | |

## 2. Migration

| Hạng mục | Kết quả | Ghi chú |
| --- | --- | --- |
| DB sạch, `migrate up` | ✅ 603/603 | |
| Mô phỏng prod (runner v0.4.23 → runner mới) | ✅ PASS | Áp thêm 291 migration, không thiếu cái nào; `hero_content` không bị bọc lặp; 4 row tên cũ 272–275 vô hại. |
| Trùng số migration | ✅ Đã xử lý | Fork 272–275 → 573/574/576/577 + 575 index CONCURRENTLY; lint unique-prefix pass. |
| Rollback image về v0.4.23 | ❌ KHÔNG AN TOÀN | 468 xoá `issue_pull_request.reference_only` (image cũ còn truy vấn trong github/vcs queries); 469/494 forward-only. Rollback = restore backup DB. |

## 3. Test

| Hạng mục | Kết quả |
| --- | --- |
| Go (`scripts/test-go.sh`, scratch DB) | ✅ PASS — chỉ còn test phụ thuộc thời gian (pass khi chạy riêng) và 1 test lệch đồng hồ VM docker ~90ms (môi trường) |
| TS typecheck | ✅ 9/9 package |
| Lint | ✅ 0 error |
| Vitest | ✅ core 2246, views 5813, web, desktop 677, docs 14, ui-lab 45 |

## 4. Smoke stack selfhost (image vừa build, project `uniai-rc`, env cô lập)

| Hạng mục | Kết quả | Ghi chú |
| --- | --- | --- |
| 8 service Up, `/readyz` ok | ✅ PASS | DB trống + 3 backend cùng lên: 2 backend deadlock khi chờ advisory lock, restart 4 lần rồi ổn (đã biết). Restart lại trên DB đã migrate: 0 restart. |
| API qua nginx | ✅ PASS | Login (mã in log), tạo workspace, issue statuses, issue, runtime, agent, portal config, marketplace CRUD, portal public config/projects/detail (không lộ `source_url`), guest session. |
| Web/docs container | ✅ PASS | `/` portal (UNICOM/UniAI, không còn "Multica"), `/login`, `/portal/projects`, `/docs/vi`, `/docs/vi/telegram-bot-integration`, `/api/config` đều 200. |
| Browser (dev server) | ✅ PASS | Login vi, onboarding, Settings có nhóm mới + tab Portal khách hàng, landing portal 0 console error (sau fix avatar emoji). |

## 5. Kết luận: **GO** — tag `v0.6.3`

Số phiên bản: theo quy ước fork (upstream + 1 patch). Không dùng dòng 0.4.x vì code có ngưỡng CLI tối thiểu `0.4.24` (local worktree) và `v0.4.30` (repo checkout).

Rủi ro còn lại:

1. Rollback chỉ bằng restore DB (mục 2).
2. Compose bắt buộc `JWT_SECRET`; telemetry upstream bật mặc định (`DO_NOT_TRACK=1` để tắt).
3. Tab "Nhắn tin" (Channels) trong Settings hiển thị (upstream tách Integrations); quyết định ẩn/hiện để sau.
4. App mobile chỉ có en + zh-Hans (fork không phát hành mobile).
5. `scripts/selfhost-config.test.sh` fail như trước merge (backend sau nginx không publish port).
