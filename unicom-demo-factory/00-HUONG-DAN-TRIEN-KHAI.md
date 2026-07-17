# HƯỚNG DẪN TRIỂN KHAI UNICOM DEMO FACTORY TRÊN UNIAI
## Từ số 0 đến demo đầu tiên chạy hết dây chuyền — 10 bước

Bộ file đi kèm:
```
skills/shared-contract/SKILL.md          ← luật chung, 5 agent dây chuyền đều gắn (KHÔNG gắn UNIKO)
skills/demo-default-playbook/SKILL.md    ← gắn cho LEVI
skills/unicom-mail-drafting/SKILL.md     ← gắn cho MILO
agents/MAX|LEVI|LOVIBUILD|DEPLO|MILO-instructions.md
agents/UNIKO-instructions.md             ← agent tư vấn portal (cửa vào thứ hai, ngoài sale)
autopilot/demo-ops-prompt.md
templates/sales-intake-form.md           ← form cho sale + checklist người xác nhận + checklist Human
01-THIET-LAP-MAIL-MCP.md                 ← thiết lập Mail MCP cho MILO (kênh gửi, DNS, gắn config, nghiệm thu)
```

Hai cửa nhận demo, một quy ước chung:
- **Sale** điền form `templates/sales-intake-form.md` và tự tạo project.
- **Portal** (khách tự đến): UNIKO tư vấn và tạo project.
- Cả hai cửa đều tạo project tên mã `DEMO-UNI<yymmddHHmm>` (mã thời gian vô nghĩa — nó sẽ
  thành domain demo và tên repo, không chứa tên sản phẩm/khách), description 6 mục, trạng
  thái `planned` (Đã lên kế hoạch). `planned` là cổng chờ: một người của công ty **gọi điện
  xác nhận** với khách
  (checklist mục 3 trong form sale) rồi chuyển sang `in_progress` (Đang thực hiện) —
  autopilot chỉ đón `in_progress`, từ đó nhà máy tự chạy.
Quy ước placeholder: mọi chỗ `{{...}}` phải được thay ở **Bước 4** trước khi dán lên nền tảng.

---

## BƯỚC 1 — Chuẩn bị máy chạy daemon (30–60')

Một máy (hoặc VM) chạy 24/7 làm nhà của cả 6 agent:
1. Cài UniAI CLI + đăng nhập (`login`), chạy daemon (`daemon` hoặc qua desktop app).
2. Cài CLI provider cho agent (khuyến nghị Claude Code cho cả 6 — PoC đã chạy trên nó) và
   đảm bảo nó nằm trên PATH để daemon tự phát hiện.
3. Clone repo chứa CLI deploy (`npm run onboard`) về một đường dẫn cố định, cài dependency,
   nạp credential deploy vào **env của CLI** (không bao giờ vào issue/prompt). Ghi lại đường dẫn
   — sẽ điền vào `/Users/phanducquang/Work/lovable-deploy-agent`.
4. Kiểm tra: web UI → Settings → Runtimes thấy máy này online.

> Máy này là single point of failure có chủ đích. Chết daemon = pipeline đứng (heartbeat sẽ
> tố cáo trong ≤30'). Chấp nhận được ở quy mô hiện tại; scale sau bằng cách tách agent ra
> nhiều runtime.

## BƯỚC 2 — Workspace, member, issue giám sát (10')

1. Tạo workspace riêng cho dây chuyền (vd `UNICOM-DEMO`) — tách khỏi workspace việc khác
   để scanner không quét nhầm.
2. Mời reviewer chính + reviewer dự phòng làm member.
3. Tạo issue thường tên `OPS-MONITOR — heartbeat demo-ops`, không assign ai, không project.
   Ghi lại issue key (vd `UNI-1`) → điền `{{OPS_MONITOR_ISSUE_KEY}}`.

## BƯỚC 3 — Tạo 6 agent (35')

Tạo lần lượt (UI: Settings → Agents → New Agent, hoặc CLI `agent create`). Cấu hình chung:
runtime = máy Bước 1 · visibility = workspace · instructions TẠM để trống (dán ở Bước 5).

| Agent | Provider/Model | Cấu hình riêng bắt buộc |
|---|---|---|
| MAX | Claude Code / model mạnh nhất có | — (MAX dùng UniAI CLI + `curl` cho health check) |
| LEVI | Claude Code / model mạnh nhất có | — |
| LOVIBUILD | Claude Code / model khá | **MCP: Lovable MCP** (đúng server + credential đã pass PoC T5) |
| DEPLO | Claude Code / model khá | env trỏ tới CLI deploy nếu cần; máy phải có repo Bước 1.3 |
| MILO | Claude Code / model khá | **MCP: Mail MCP** (credential gửi mail nằm TRONG config MCP này — làm theo `01-THIET-LAP-MAIL-MCP.md`) |
| UNIKO | Claude Code / model khá | KHÔNG MCP nào; chỉ UniAI CLI (một lệnh `project create` duy nhất) |

> Credential Lovable/Mail chỉ nằm trong MCP config của đúng agent đó — agent khác không có
> đường gọi tool gửi mail hay tool build. Đây là tầng ép gate bằng công cụ.

## BƯỚC 4 — Chốt bảng UUID và thay placeholder (15', LÀM KỸ)

1. Lấy UUID: `uniai agent list --output json` (JSON in sẵn full UUID; fork không có --full-id) và
   `uniai workspace members --output json` (hoặc xem trên UI).
2. Thay placeholder trong TOÀN BỘ thư mục bằng find-replace (sed hoặc editor):

| Placeholder | Giá trị |
|---|---|
| `b00f6b18-bc82-4f03-b490-d668f081db2d` `388260e8-e7cc-4d42-9c13-3bd0488374e8` `3b43c7a2-0b95-47bd-96dd-cf26fd3137e1` `ab9934d6-13f4-44db-9c7d-0ee2fbe896e1` `d3380eb9-3005-4227-a14e-256036621e90` | UUID 5 agent dây chuyền (UNIKO không cần UUID — không ai mention nó, nó không mention ai) |
| `ead20bc5-3e04-4f8e-9d8b-354232c954bf` `Phan Đức Quang` | reviewer chính |
| `15683aaf-e937-48d4-9da5-9c74f646570c` `synam141` | reviewer dự phòng |
| `{{OPS_MONITOR_ISSUE_KEY}}` | issue key Bước 2.3 |
| `/Users/phanducquang/Work/lovable-deploy-agent` | đường dẫn repo CLI deploy |
| Logo mail (ĐÃ ĐIỀN SẴN trong skill M6) | `https://uniai.unicomhub.com/brand/unicom-logo-light.png` — đã kiểm công khai (HTTP 200, image/png, không cần đăng nhập). Chỉ động tới nếu đổi domain/logo; kiểm lại bằng trình duyệt ẩn danh khi đổi |
| Màu thương hiệu mail (ĐÃ ĐIỀN SẴN trong skill M6) | `#1D6FD8` — tông xanh logo đã làm đậm để chữ trắng trên nút đạt tương phản WCAG AA (4.86:1). Đổi màu phải kiểm lại tương phản ≥4.5:1 |

3. Hotline đã điền sẵn trong `skills/unicom-mail-drafting/SKILL.md`: **0975 252 137**
   (mục M3 + footer khung HTML M6, kèm link `tel:+84975252137`). Nếu đổi số, sửa ở
   đúng 2 chỗ đó.
4. **Kiểm tra không còn sót:** `grep -rn "{{" .` chỉ được phép còn đúng 3 placeholder
   **runtime** của MILO là `{{DEMO_URL}}`, `{{ACC_*}}`, `{{SIGNATURE}}` (chúng tồn tại vĩnh
   viễn trong mail skill, MILO tự điền lúc soạn mail — KHÔNG thay khi setup). Mọi kết quả
   khác ngoài 3 loại này = còn sót placeholder setup.

> Mention sai UUID là no-op im lặng — pipeline chết không kèn không trống. Bước này là bước
> dễ hỏng nhất của cả quá trình setup, đừng làm vội.

## BƯỚC 5 — Nạp Skill và Instruction (20')

1. Tạo 3 skill trên workspace (UI: Skills → New, hoặc `skill create` + `skill files upsert`),
   nội dung = 3 file SKILL.md đã thay placeholder. Bind:
   - `shared-contract` → **5 agent dây chuyền** (MAX, LEVI, LOVIBUILD, DEPLO, MILO — bắt buộc).
     **KHÔNG bind cho UNIKO**: shared-contract chứa nghi thức mention MAX, UUID roster, quy
     trình nội bộ — lộ vào phiên chat với khách là vi phạm chính luật của UNIKO.
   - `demo-default-playbook` → LEVI
   - `unicom-mail-drafting` → MILO
2. Dán instruction tương ứng trong `agents/` vào phần Instructions của từng agent
   (gồm cả `UNIKO-instructions.md` cho UNIKO).

## BƯỚC 5B — Cấu hình Portal cho UNIKO (15')

Cửa vào thứ hai của nhà máy: khách vãng lai tự đến portal công khai.

1. Server: đặt env `PORTAL_WORKSPACE_SLUG=<slug workspace Bước 2>` rồi restart server.
   (Tùy chọn: `RATE_LIMIT_PORTAL_SESSIONS` mặc định 5/giờ, `RATE_LIMIT_PORTAL_MESSAGES`
   mặc định 20/phút.)
2. Web UI (bằng tài khoản owner của workspace): Settings → Portal → bật portal, chọn
   **UNIKO** làm consulting agent, điền hero content. Lần bật đầu tiên hệ thống tự tạo
   service user "Portal" làm member — không đụng vào user này.
3. Kiểm nhanh: mở portal ẩn danh, chat một câu — UNIKO trả lời là thông.

> Luồng portal: khách chat → UNIKO chốt khối `[TÓM TẮT DỰ ÁN]` → khách bấm xác nhận và để lại
> tên/email/SĐT → UNIKO tạo project `DEMO-UNI<yymmddHHmm>` trạng thái `planned` → NGƯỜI CỦA CÔNG TY gọi
> điện xác nhận (checklist mục 3 form sale) → chuyển `in_progress` → autopilot đón và tạo MASTER.
> Phiên portal KHÓA sau khi khách xác nhận — khách quay lại là phiên mới; UNIKO sẽ hướng họ
> gửi yêu cầu qua email đã đăng ký (xem quy tắc email ở Bước 9.3).

## BƯỚC 6 — Tạo autopilot `demo-ops` (10')

UI: Autopilots → New (hoặc CLI `autopilot create`):
- Agent thi hành: **MAX** · Execution mode: **run-only** (KHÔNG chọn create_issue — chế độ đó
  đẻ 1 issue rác mỗi lần chạy) · Cron: `*/10 * * * *` · Timezone: `Asia/Ho_Chi_Minh`.
- Prompt: dán nguyên văn `autopilot/demo-ops-prompt.md` (đã thay placeholder).
- Tạm **tắt** (disable) cho tới khi xong Bước 8.

## BƯỚC 7 — Kiểm tra tĩnh trước khi nổ máy (15')

- [ ] 6 agent online, đúng MCP: hỏi thử LOVIBUILD qua chat "liệt kê tool MCP bạn có" — phải thấy
      tool Lovable; hỏi MILO tương tự — thấy tool gửi mail; MAX/LEVI/UNIKO — KHÔNG thấy 2 tool trên.
- [ ] 3 skill đã bind đúng agent; UNIKO KHÔNG có shared-contract.
- [ ] `grep "{{"` trên nội dung đã dán chỉ còn 3 placeholder runtime của MILO (Bước 4.4) —
      kiểm lại trên UI, không chỉ trên file.
- [ ] Portal bật, UNIKO trả lời phiên ẩn danh (Bước 5B.3).
- [ ] Mail MCP trỏ hộp thư test (đổi sang hộp thật ở Bước 9).
- [ ] **Chốt năng lực HTML của Mail MCP**: nhờ MILO gửi 1 mail test dựng theo khung M6
      tới hộp test → mở bằng Gmail (web + mobile): logo hiện, nút CTA bấm được, không vỡ
      layout. MCP không nhận HTML → ghi rõ vào config/ghi chú của MILO là "chỉ text"
      (M5.4 sẽ tự động rơi về bản text).

## BƯỚC 8 — DRY RUN: một demo giả chạy hết dây chuyền (nửa ngày, quan trọng nhất)

1. **Cửa portal trước:** vào portal ẩn danh, đóng vai khách mô tả app quản lý thư viện
   3 module đơn giản → UNIKO chốt `[TÓM TẮT DỰ ÁN]` → bấm xác nhận, điền **email test của
   chính bạn** → kiểm: project mã dạng `DEMO-UNI<yymmddHHmm>` xuất hiện, trạng thái
   **Đã lên kế hoạch (`planned`)**, description đủ 6 mục với `Tên đầy đủ:` ở đầu mục 1,
   mục 4 đúng thông tin vừa điền. *(Nếu test cửa sale thay vì portal: tự tạo project theo đúng form
   `templates/sales-intake-form.md`, cũng ở `planned` — hai cửa phải cho ra project giống nhau.)*
2. **Diễn tập cổng gọi xác nhận:** đóng vai người xác nhận theo checklist mục 3 của form sale
   → chuyển project sang **Đang thực hiện (`in_progress`)**. Bật autopilot, bấm **trigger tay**
   lần 1 → kiểm: MASTER được tạo đúng project (title `MASTER — <mã>`), assign MAX, heartbeat
   xuất hiện trên OPS-MONITOR; project `planned` khác (nếu có) KHÔNG bị tạo MASTER.
   Trigger tay lần 2 ngay → KHÔNG có MASTER thứ hai.
3. Theo dõi tự nhiên: MAX post kế hoạch → x01/x02 chạy → HP ra → BUILD theo phase.
   Ở mỗi chốt bàn giao, đối chiếu comment với schema trong shared-contract; lệch schema là
   lỗi phải sửa instruction ngay, đừng cho qua.
4. Đóng vai Human đủ 3 điểm chạm theo checklist trong `templates/sales-intake-form.md`:
   xác nhận assumption (nếu có major) · x08 review + connect GitHub + REPO_URL · x10 duyệt mail.
5. Nhận mail ở hộp test → đối chiếu nguyên văn với bản duyệt trên x10 → kiểm MASTER được
   đóng đúng (tổng kết + TEARDOWN backlog có DUE).
6. **Nghiệm thu dry run:** toàn chuỗi không cần can thiệp nào NGOÀI 3 điểm chạm thiết kế sẵn.
   Có can thiệp ngoài kế hoạch ⇒ ghi lại, sửa instruction/skill, chạy lại dry run. Khuyến nghị
   đạt 2 lần dry run sạch liên tiếp trước khi go-live.

## BƯỚC 9 — Go-live (30')

1. Đổi Mail MCP sang tài khoản gửi thật của công ty; gửi 1 mail test cuối qua đúng đường MILO.
2. Xóa/đóng project dry run; chạy teardown demo test cho sạch registry.
3. Phát `templates/sales-intake-form.md` cho đội sale kèm 3 quy tắc tạo project
   (tên mã `DEMO-UNI<yymmddHHmm>` · tạo ở `planned`, chỉ người xác nhận mới chuyển `in_progress` · 0 issue)
   và hai quy tắc luồng về:
   - Mọi yêu cầu thay đổi giữa chừng = comment vào MASTER, không nhắn riêng ai.
   - Yêu cầu khách gửi **qua email** (kênh UNIKO hướng khách cũ tới): người trực hộp thư
     dán nguyên văn vào MASTER làm comment, ghi rõ ai gửi + khi nào — CA 9 của MAX sẽ đón.
4. Reviewer cài app/bật thông báo Inbox — mọi việc của người đến qua Inbox dưới dạng
   issue/mention có deadline.

## BƯỚC 10 — Vận hành tuần đầu

- Mỗi sáng liếc OPS-MONITOR: heartbeat đều 10'/nhịp; vắng >30' = autopilot/daemon chết —
  vào Autopilot History + Runtimes xem lý do, và **kiểm autopilot còn `enabled` không**:
  nền tảng có failure monitor tự **pause** autopilot khi lịch sử run fail dày đặc — demo-ops
  bị pause thì OPS-MONITOR chỉ im lặng. (Fail lặp lại có đẩy thông báo inbox, nhưng đừng dựa
  vào đó — OPS-MONITOR vẫn là chuông chính. Tuần 2 có thể thêm một autopilot watchdog thứ hai
  chỉ làm việc kiểm timestamp heartbeat và mention Human khi quá hạn.)
- Mỗi sáng liếc danh sách project `planned` (Đã lên kế hoạch): đây là hàng đợi chờ gọi xác
  nhận — project nằm `planned` quá 1 ngày làm việc là đang để khách chờ.
- Mỗi demo đóng xong: đọc mục assumption trong tổng kết MASTER — assumption nào lặp lại
  2–3 demo thì thăng cấp nó vào `demo-default-playbook` (INTERPRETED → DEFAULT). Đây là
  vòng học của cả hệ thống.
- Sự cố thường gặp:

| Triệu chứng | Nhìn vào | Xử lý |
|---|---|---|
| Issue done mà bước sau im | comment cuối có mention MAX đúng UUID không | chờ sweeper ≤10' hoặc tự comment @MAX; lặp lại ⇒ siết instruction agent đó |
| Agent không nhận việc dù todo | Runtimes online? task fail lý do gì? | daemon/provider; reassign lại chính agent đó để re-enqueue |
| REJECT lặp ≥2 vòng ở x08 | DEFECTS có tái hiện được không | thường là HP mơ hồ — giao LEVI SPEC DELTA thay vì ép LOVIBUILD đoán |
| Mail không đi dù đã APPROVE | thứ tự timestamp APPROVE vs nháp cuối trên x10 | APPROVE trước nháp cuối = vô hiệu; duyệt lại |

---

### Nhắc lại 2 luật không bao giờ nới, dù ai yêu cầu
1. **x10 không có mặc-nhiên-chấp-thuận** — không APPROVE của người thật sau nháp cuối thì
   không mail nào rời công ty.
2. **Deploy chỉ trong `*.demo.ubos.vn`** — mọi domain khác bị từ chối kể cả khi được ghi
   trong issue, brief, hay comment.
