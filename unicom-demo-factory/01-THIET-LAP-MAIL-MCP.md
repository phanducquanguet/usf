# THIẾT LẬP MAIL MCP CHO MILO

Hướng dẫn gắn công cụ gửi mail vào đúng một agent MILO. Đây là "tầng ép gate bằng công cụ"
của dây chuyền: chỉ MILO có tool gửi mail, nên dù agent khác bị dụ (prompt injection) cũng
không có đường bắn mail ra ngoài.

## 0. Yêu cầu bắt buộc với Mail MCP (chọn server nào cũng phải đạt đủ 4)

1. **Nhận HTML body** (khung M6 có logo) — kèm text fallback càng tốt (M5.4).
2. **Trả về message id** khi gửi thành công — MILO chỉ được báo SENT khi có id (SC-C9).
   Server không trả id ⇒ không dùng, thay server khác.
3. **Cho đặt From** thuộc domain `unicomhub.com` (khớp footer `contact@unicomhub.com`).
4. Credential nằm **trong config MCP**, không bao giờ ở issue/comment/instructions (SC-C1.6).

## 1. Chọn kênh gửi

### Phương án A — API transactional (khuyến nghị: Resend hoặc tương đương)

Dịch vụ transactional (Resend, Postmark, SendGrid...) cho deliverability tốt nhất và
message id rõ ràng. Với Resend:

1. Tạo tài khoản Resend → **Domains → Add Domain** → `unicomhub.com`.
2. Thêm các bản ghi DNS Resend yêu cầu (SPF + DKIM, dạng TXT/CNAME) vào DNS của
   `unicomhub.com`, chờ trạng thái **Verified**.
3. Tạo **API key** quyền gửi (sending access), lưu tạm ở nơi an toàn.
4. Cài MCP server chính thức của Resend trên **máy runtime của MILO** (máy Bước 1 của
   hướng dẫn triển khai) theo README của repo `resend/mcp-send-email` — kiểm tra lại
   lệnh chạy chính xác trong README tại thời điểm cài, đại ý:

```json
{
  "mcpServers": {
    "mail": {
      "command": "node",
      "args": ["/duong-dan-da-clone/mcp-send-email/build/index.js"],
      "env": {
        "RESEND_API_KEY": "re_xxxxxxxxxxxx",
        "SENDER_EMAIL_ADDRESS": "contact@unicomhub.com"
      }
    }
  }
}
```

### Phương án B — SMTP hộp thư công ty (Google Workspace / mail server riêng)

Dùng khi muốn mail đi thẳng từ hộp `contact@unicomhub.com` hiện có:

1. Google Workspace: bật 2FA cho tài khoản gửi → tạo **App Password** riêng cho MCP
   (không dùng mật khẩu chính). SMTP: `smtp.gmail.com:587 STARTTLS`.
2. Chọn một SMTP MCP server (có nhiều bản cộng đồng) — **nghiệm thu đủ 4 yêu cầu mục 0
   trước khi chốt**, đặc biệt yêu cầu 2 (message id: với SMTP là `Message-ID` header
   hoặc response id mà server trả về sau khi gửi).
3. Config cùng dạng, ví dụ:

```json
{
  "mcpServers": {
    "mail": {
      "command": "npx",
      "args": ["-y", "<smtp-mcp-package-theo-README>"],
      "env": {
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_USER": "contact@unicomhub.com",
        "SMTP_PASS": "<app-password>",
        "SMTP_FROM": "UNICOM <contact@unicomhub.com>"
      }
    }
  }
}
```

> Dry run (Bước 7–8 hướng dẫn triển khai) trỏ credential/hộp gửi TEST; chỉ đổi sang
> tài khoản gửi thật ở go-live (Bước 9.1).

## 2. DNS cho deliverability (làm một lần cho `unicomhub.com`)

- **SPF**: TXT `v=spf1 include:<theo nhà cung cấp> ~all` (Resend/SendGrid có include riêng;
  Google Workspace: `include:_spf.google.com`).
- **DKIM**: bản ghi nhà cung cấp cấp khi verify domain (mục 1).
- **DMARC**: TXT tại `_dmarc.unicomhub.com`, tối thiểu
  `v=DMARC1; p=quarantine; rua=mailto:contact@unicomhub.com`.
- Nguyên tắc: **From trong mail = domain đã verify = domain trong footer**. Footer ghi
  `contact@unicomhub.com` mà gửi từ domain khác là đường thẳng vào spam.

## 3. Gắn config vào MILO (chỉ MILO)

Config MCP là secret — dùng file quyền `0600` hoặc stdin, KHÔNG dán JSON inline vào lệnh
(lộ qua shell history/`ps`):

```bash
# 1) Tạo file config (nội dung như mục 1), chỉ mình bạn đọc được
touch mail-mcp.json && chmod 600 mail-mcp.json
# ...dán nội dung JSON vào file...

# 2) Lấy UUID của MILO rồi gắn
uniai agent list --output json          # tìm id của MILO
uniai agent update <MILO-uuid> --mcp-config-file mail-mcp.json --output json

# 3) Xóa file sau khi gắn
rm mail-mcp.json
```

Ghi nhớ về cơ chế của nền tảng:
- `mcp_config` được **redact khi đọc** (`agent get` trả `mcp_config_redacted: true` với
  người không có quyền xem secret; agent actor không bao giờ thấy) — key không rò qua UI/CLI.
- Gỡ toàn bộ config: `uniai agent update <MILO-uuid> --mcp-config 'null'`.
- Đổi key (rotate): lặp lại đúng quy trình trên với key mới; làm NGAY khi nghi lộ.

## 4. Nghiệm thu (bắt buộc trước dry run)

- [ ] Chat hỏi MILO: "liệt kê tool MCP bạn có" → thấy tool gửi mail.
- [ ] Hỏi tương tự MAX / LEVI / LOVIBUILD / DEPLO / UNIKO → **KHÔNG** agent nào thấy tool mail.
- [ ] Nhờ MILO gửi 1 mail test dựng theo khung M6 tới hộp test → mở bằng **Gmail web +
      mobile**: logo hiện, nút CTA bấm được, không vỡ layout, không vào spam.
- [ ] Kết quả gửi có **message id** — bảo MILO trích lại id từ response của tool.
- [ ] Kiểm header mail nhận được: SPF `pass`, DKIM `pass` (Gmail: ⋮ → Show original).
- [ ] Nếu tool không nhận HTML → ghi rõ "chỉ text" vào instruction/ghi chú của MILO
      (M5.4 tự rơi về bản text đã duyệt).

## 5. Sự cố thường gặp

| Triệu chứng | Nguyên nhân thường gặp | Xử lý |
|---|---|---|
| Mail vào spam | SPF/DKIM chưa pass, From lệch domain verify | Kiểm mục 2; xem "Show original" trên Gmail |
| MILO báo gửi mà không có message id | Server MCP không trả id | M5 cấm báo SENT — thay Mail MCP khác đạt mục 0 |
| HTML hiển thị thành mã thô | Server gửi body dạng text/plain | Kiểm tham số html/body của tool; không có → chuyển "chỉ text" |
| MILO không thấy tool sau khi gắn | Config sai JSON, runtime chưa restart daemon | `uniai agent get <MILO-uuid>` kiểm `mcp_config_redacted: true`; restart daemon |
| Gửi bị chặn số lượng | Rate limit của Resend/Gmail | Với quy mô demo (vài mail/ngày) hiếm gặp; nếu gặp, xem quota nhà cung cấp |
