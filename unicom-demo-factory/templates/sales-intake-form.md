# SALES INTAKE FORM — TẠO PROJECT DEMO (v1.0)

Form này dành cho **sale** khi nhận brief demo từ khách (kênh ngoài portal: gọi điện,
gặp trực tiếp, email). Cấu trúc mục 1–6 **trùng khớp** với project do agent tư vấn UNIKO
tạo từ portal — cả dây chuyền (đặc biệt MILO lấy email khách) chỉ hiểu MỘT định dạng này.

---

## 1. Ba quy tắc tạo project (bắt buộc, sai một là dây chuyền không chạy)

1. **Tên project là MÃ KÝ HIỆU vô nghĩa**: `DEMO-UNI<yymmddHHmm>` — 10 chữ số là ngày giờ
   bạn tạo project. Ví dụ tạo lúc 14:32 ngày 17/07/2026 → `DEMO-UNI2607171432`.
   Mã này sẽ thành domain demo (`uni2607171432.demo.ubos.vn`) và tên repo, nên **không được
   chứa tên sản phẩm hay tên khách**. Tên thương mại đầy đủ (có dấu) ghi ở đầu mục 1 của
   description, dạng `Tên đầy đủ: <tên>`.
2. **Trạng thái khi tạo = "Đã lên kế hoạch" (`planned`)** và **0 issue** (không tạo issue nào
   trong project). `planned` là cổng chờ: sau khi **gọi điện xác nhận** với khách (checklist
   mục 3 dưới đây), người xác nhận chuyển trạng thái sang **"Đang thực hiện" (`in_progress`)**
   — autopilot chỉ đón project `in_progress`, tối đa 10 phút sau là nhà máy nổ máy.
3. **Mọi yêu cầu thay đổi giữa chừng** (từ khách hoặc từ sale) = **comment vào issue MASTER**
   của project đó, không nhắn riêng ai, không sửa description project. Yêu cầu khách gửi
   qua email: người nhận email dán nguyên văn vào MASTER làm comment (ghi rõ ai gửi, khi nào).

---

## 2. Mẫu description project (điền đủ 6 mục, giữ nguyên số thứ tự và tên mục)

```
1. Bối cảnh & mục tiêu: Tên đầy đủ: <tên sản phẩm có dấu>. <lĩnh vực kinh doanh, vấn đề
   hiện tại, mục tiêu của bản demo>
2. Tính năng chính:
   - <tính năng 1>
   - <tính năng 2>
   - <...>
3. Người dùng & tích hợp: <ai dùng (vai trò), tích hợp với hệ thống gì nếu có>
4. Người nhận bàn giao: Họ tên: <tên> / Email: <email> / SĐT: <số điện thoại>
5. Ràng buộc & mong muốn thời gian: <nếu có; không hứa deadline thay công ty>
6. Ngân sách & ghi chú thương mại: <kỳ vọng ngân sách, ghi chú nội bộ — CHỈ nằm ở mục này,
   không được xuất hiện trong bất kỳ mail/tài liệu nào gửi khách>
```

Lưu ý dữ liệu nhạy cảm: **mục 4 là nguồn duy nhất MILO dùng để gửi mail bàn giao.**
Điền sai email = demo gửi nhầm người. Kiểm tra hai lần trước khi lưu.

---

## 3. Checklist NGƯỜI XÁC NHẬN (cuộc gọi trước khi kích hoạt)

- [ ] Gọi SĐT ở mục 4, xác nhận với khách: phạm vi demo (mục 1–2), email nhận bàn giao (mục 4).
- [ ] Rà mục 6: kỳ vọng ngân sách có hợp lý để làm demo không; ghi chú thương mại đầy đủ.
- [ ] Đạt cả hai → chuyển trạng thái project sang **"Đang thực hiện" (`in_progress`)**.
      Không đạt → giữ `planned` và ghi lý do vào description mục 6, hoặc chuyển `cancelled`.

---

## 4. Checklist HUMAN REVIEWER — 3 điểm chạm trong dây chuyền

Sau khi kích hoạt, mọi việc cần người thật sẽ đến qua **Inbox** (issue/mention có deadline).
Cả dây chuyền chỉ có đúng 3 điểm chạm:

- [ ] **Điểm chạm 1 — Xác nhận assumption (chỉ khi có):** LEVI mention bạn trên issue x01 kèm
      danh sách assumption `[INTERPRETED]`. Trả lời từng mục major trong **2h** (quá hạn sẽ
      nhắc 1 lần, thêm 2h nữa là mặc nhiên chấp thuận theo phương án LEVI chọn — SC-C10).
- [ ] **Điểm chạm 2 — Review demo (x08, deadline 2h):** mở PREVIEW_URL, kiểm theo hướng dẫn
      3 bước trong issue; connect GitHub trên Lovable, lấy repo `demo-<mã>`. Comment kết thúc
      **bắt buộc đủ 2 field** theo SC-C5: `RESULT: APPROVE|REJECT` + `REPO_URL: https://github.com/<org>/demo-<mã>`
      (bắt buộc khi APPROVE) + mention @MAX. Thiếu REPO_URL = pipeline không đi tiếp.
- [ ] **Điểm chạm 3 — Duyệt mail bàn giao (x10, deadline 1h):** đọc **đúng bản nháp nguyên văn
      mới nhất** của MILO trên x10, rồi comment `RESULT: APPROVE`. Lưu ý: APPROVE đặt **trước**
      nháp cuối là vô hiệu — nếu MILO post nháp mới, phải duyệt lại. Gate này **không có
      mặc-nhiên-chấp-thuận**: bạn không duyệt thì mail không rời công ty.
