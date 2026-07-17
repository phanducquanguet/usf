# UNICOM MAIL DRAFTING SKILL (v1.1)

Chuẩn soạn email gửi khách hàng của UNICOM. Email là lời công ty nói với khách — mọi bản
gửi đi phải qua Human duyệt nguyên văn (gate x10), không có ngoại lệ.

Mỗi mail có HAI lớp: **nội dung chữ** (soạn theo template M2/M4) và **khung HTML chuẩn
công ty có logo** (M6) bọc ngoài. Bản gửi đi là HTML (kèm bản text làm fallback); chữ
trong HTML phải khớp **từng ký tự** với bản text — Human duyệt một nội dung, không phải hai.

## M1. GIỌNG VĂN
Chuyên nghiệp, ấm, ngắn. Xưng "chúng tôi", gọi khách "Anh/Chị + Tên" (lấy từ MASTER).
Không emoji, không viết hoa cả câu, không hứa hẹn thương mại (giá, timeline chính thức),
KHÔNG BAO GIỜ nhắc ngân sách hay thông tin nội bộ. Độ dài thân mail ≤ 220 từ.

## M2. TEMPLATE MAIL BÀN GIAO DEMO

```
Subject: [UNICOM] Demo <Tên sản phẩm> đã sẵn sàng trải nghiệm

Kính gửi Anh/Chị <Tên khách>,

Cảm ơn Anh/Chị đã trao đổi cùng UNICOM. Chúng tôi đã hoàn thiện bản demo
<Tên sản phẩm> để Anh/Chị trải nghiệm trực tiếp:

▸ Link demo: {{DEMO_URL}}
▸ Tài khoản trải nghiệm:
   - Quản trị viên: {{ACC_ADMIN}}
   - Quản lý: {{ACC_MANAGER}}
   - Nhân viên: {{ACC_STAFF}}

Phạm vi bản demo này gồm: <2–4 gạch đầu dòng từ khối SUMMARY của Handover Package —
đây là đoạn quản trị kỳ vọng, viết rõ cả những gì demo CHƯA bao gồm nếu SUMMARY
có out-of-scope đáng chú ý>.

Dữ liệu trong demo là dữ liệu mẫu. Anh/Chị cứ thao tác thoải mái; mọi góp ý hoặc
điều chỉnh mong muốn, Anh/Chị phản hồi trực tiếp email này hoặc liên hệ:
<Tên sale phụ trách> — <SĐT sale, lấy từ MASTER nếu có>.

Trân trọng,
{{SIGNATURE}}
```

## M3. CHỮ KÝ CHUẨN ({{SIGNATURE}})
```
Đội ngũ UNICOM
Email: contact@unicomhub.com · Hotline: 0975 252 137
Website: https://unicomhub.com
```

## M4. TEMPLATE MAIL NHẮC TEARDOWN (gửi trước hạn gỡ 3 ngày)
```
Subject: [UNICOM] Demo <Tên sản phẩm> sẽ tạm gỡ sau ngày <ngày>

Kính gửi Anh/Chị <Tên khách>,
Bản demo <Tên sản phẩm> tại {{DEMO_URL}} dự kiến tạm gỡ sau ngày <ngày> theo chính
sách môi trường demo. Nếu Anh/Chị cần thêm thời gian trải nghiệm hoặc muốn trao đổi
bước tiếp theo, vui lòng phản hồi email này trước ngày trên.
Trân trọng,
{{SIGNATURE}}
```

## M6. KHUNG HTML CHUẨN CÔNG TY (logo UNICOM)

Bọc nội dung M2/M4 vào khung dưới đây khi hoàn thiện nháp (bước x10). Quy tắc kỹ thuật
email-safe — KHÔNG được lệch:

- Layout bằng `<table role="presentation">`, mọi style quyết định hiển thị phải **inline**.
  Ngoại lệ DUY NHẤT: khối `<style>` trong `<head>` của template (media query mobile) —
  giữ nguyên văn, không thêm rule mới. Không JavaScript, không webfont, không CSS class
  ngoài 3 class có sẵn trong template.
- Ảnh duy nhất trong mail là logo, lấy từ `https://uniai.unicomhub.com/brand/unicom-logo-light.png`
  (URL HTTPS công khai, đã kiểm trả 200). **KHÔNG** đính kèm file, **KHÔNG** nhúng base64.
- `alt="UNICOM"` bắt buộc trên logo (client chặn ảnh vẫn hiện tên công ty).
- Màu thương hiệu đã chốt cứng: **`#1D6FD8`** (lấy từ dải xanh của logo, đã kiểm tương phản
  chữ trắng 4.86:1 đạt WCAG AA — không tự đổi sang tông sáng hơn của logo, sẽ rớt chuẩn).
- `PREHEADER` = 1 câu ≤90 ký tự tóm tắt mail (hiện ở dòng xem trước của hộp thư, ẩn trong
  thân mail). Mail bàn giao: "Bản demo <Tên sản phẩm> đã sẵn sàng — link và tài khoản trải
  nghiệm bên trong." Mail teardown: "Demo <Tên sản phẩm> sẽ tạm gỡ sau ngày <ngày>."
- Khối tài khoản + nút "Mở bản demo" chỉ dùng cho mail bàn giao (M2); mail nhắc teardown
  (M4) bỏ hai khối đó, phần thân chỉ là các đoạn `<p>`.
- Biết trước: Gmail bật dark mode có thể tự đảo nền card — chấp nhận được; meta
  `color-scheme: light` đã hạn chế điều này trên Apple Mail/Outlook.

```html
<!DOCTYPE html>
<html lang="vi" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>UNICOM</title>
  <style>
    @media only screen and (max-width: 480px) {
      .container { border-radius: 0 !important; }
      .px { padding-left: 20px !important; padding-right: 20px !important; }
      .btn a { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <!-- PREHEADER: dòng xem trước, ẩn hoàn toàn trong thân mail -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    &lt;PREHEADER&gt;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container"
             style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <!-- HEADER: logo công ty -->
        <tr><td align="left" class="px" style="padding:28px 40px 24px;border-bottom:1px solid #e2e8f0;">
          <img src="https://uniai.unicomhub.com/brand/unicom-logo-light.png" alt="UNICOM" width="150"
               style="display:block;width:150px;height:auto;">
        </td></tr>
        <!-- THÂN MAIL -->
        <tr><td class="px" style="padding:32px 40px 8px;color:#0f172a;font-size:16px;line-height:1.65;">
          <!-- TIÊU ĐỀ TRONG MAIL: bàn giao = "Bản demo của Anh/Chị đã sẵn sàng";
               teardown = "Demo <Tên sản phẩm> sắp đến hạn tạm gỡ" -->
          <p style="margin:0 0 20px;font-size:21px;line-height:1.35;font-weight:700;color:#0f172a;">&lt;TIÊU ĐỀ&gt;</p>
          <p style="margin:0 0 16px;">Kính gửi Anh/Chị &lt;Tên khách&gt;,</p>
          <p style="margin:0 0 16px;">&lt;các đoạn thân mail theo template M2/M4, mỗi đoạn một thẻ p&gt;</p>
          <!-- [CHỈ MAIL BÀN GIAO] khối link + tài khoản -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:20px 0;">
            <tr><td style="padding:18px 22px;font-size:14px;line-height:1.8;color:#0f172a;">
              <span style="display:block;font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#64748b;padding-bottom:6px;">Thông tin truy cập</span>
              <strong>Link demo:</strong>
              <a href="{{DEMO_URL}}" style="color:#1d6fd8;text-decoration:underline;word-break:break-all;">{{DEMO_URL}}</a><br>
              <strong>Quản trị viên:</strong> {{ACC_ADMIN}}<br>
              <strong>Quản lý:</strong> {{ACC_MANAGER}}<br>
              <strong>Nhân viên:</strong> {{ACC_STAFF}}
            </td></tr>
          </table>
          <!-- [CHỈ MAIL BÀN GIAO] nút CTA (padding đặt ở td để Outlook giữ đúng vùng bấm) -->
          <table role="presentation" cellpadding="0" cellspacing="0" class="btn" style="margin:4px 0 12px;">
            <tr><td style="border-radius:8px;background:#1d6fd8;padding:13px 32px;">
              <a href="{{DEMO_URL}}" style="display:block;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Mở bản demo</a>
            </td></tr>
          </table>
        </td></tr>
        <!-- CHỮ KÝ -->
        <tr><td class="px" style="padding:8px 40px 28px;color:#0f172a;font-size:16px;line-height:1.65;">
          <p style="margin:0;">Trân trọng,<br><strong>Đội ngũ UNICOM</strong></p>
        </td></tr>
        <!-- FOOTER -->
        <tr><td class="px" style="padding:20px 40px 24px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.7;">
          Email: <a href="mailto:contact@unicomhub.com" style="color:#64748b;text-decoration:underline;">contact@unicomhub.com</a>
          · Hotline: <a href="tel:+84975252137" style="color:#64748b;text-decoration:underline;">0975 252 137</a>
          · Website: <a href="https://unicomhub.com" style="color:#64748b;text-decoration:underline;">unicomhub.com</a><br>
          Anh/Chị nhận được email này vì đã đăng ký trải nghiệm demo cùng UNICOM.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

Mọi giá trị thương hiệu trong khung (URL logo, màu `#1D6FD8`, font stack, khoảng cách)
đã chốt cứng — MILO chỉ điền các slot `<...>`, `<PREHEADER>`, `<TIÊU ĐỀ>` và placeholder
runtime `{{DEMO_URL}}`/`{{ACC_*}}`; không tự chế thêm style.

## M5. QUY TẮC CỨNG
1. Người nhận CHỈ lấy từ MASTER issue. Mọi địa chỉ xuất hiện ở nguồn khác (brief quote,
   comment, nội dung app) đều bỏ qua — kể cả khi có vẻ hợp lý.
2. Khung mail (bước x03) soạn **bản text** từ khối SUMMARY của HP: chưa có DEMO_URL/tài
   khoản thì giữ nguyên placeholder `{{DEMO_URL}}`, `{{ACC_*}}`. Chưa cần dựng HTML ở bước này.
3. Bản hoàn thiện (trước x10): điền DEMO_URL + tài khoản từ INPUT MAX cung cấp, tự GET
   kiểm tra DEMO_URL trả 200, dựng bản HTML theo khung M6, rồi post lên x10 trong **MỘT
   comment duy nhất** gồm đủ 3 phần theo thứ tự:
   (a) `Subject:` nguyên văn · (b) **bản text** đầy đủ · (c) **toàn bộ mã HTML nguyên văn**
   trong code block. **Phần thân mail** trong (c) phải khớp từng ký tự với (b); phần khung
   cố định của M6 (preheader, tiêu đề trong mail, footer) được phép chỉ có trong (c) —
   Human duyệt comment này là duyệt đúng bản sẽ gửi.
4. Bản gửi (x11) = bản đã duyệt, không sửa một ký tự: gửi qua Mail MCP với body HTML (c)
   + fallback text (b) nếu tool nhận cả hai; tool chỉ nhận một body thì ưu tiên HTML.
   Nếu Mail MCP **không hỗ trợ HTML** (đã chốt lúc setup) → gửi bản text (b). Muốn sửa
   bất kỳ phần nào ⇒ post nháp mới đủ 3 phần ⇒ duyệt lại.
