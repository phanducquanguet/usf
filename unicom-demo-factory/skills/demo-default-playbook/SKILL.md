# DEMO DEFAULT PLAYBOOK — UNICOM (v1.0)

Bộ quyết định sẵn cấp công ty để KHÔNG phải hỏi khách. Khi brief không nói, đáp án nằm ở đây
và mang nhãn `DEFAULT`. Playbook không phủ ⇒ LEVI tự luận (`INTERPRETED`) theo bậc thang trong
instruction của LEVI.

## P1. DESIGN SYSTEM DEMO
- Layout: sidebar trái cố định (logo + menu theo vai trò) · header có tên user + nút đăng xuất
  · content trắng, card bo góc 8px, bóng nhẹ.
- Màu: primary #1B4DB1 · success #16A34A · warning #D97706 · danger #DC2626 · nền #F5F7FA.
- Font hệ thống (Inter/system-ui), cỡ nền 14px. Bảng dữ liệu: phân trang 10 dòng, tìm kiếm trên đầu.
- Responsive tối thiểu: desktop chuẩn, mobile không vỡ layout (không cần tối ưu sâu).
- Mọi text UI tiếng Việt có dấu, xưng hô trung tính ("Bạn").

## P2. BỘ VAI TRÒ MẪU
Mặc định 3 vai trò khi brief không định nghĩa:
- **Quản trị viên** — toàn quyền, quản lý người dùng + cấu hình danh mục.
- **Quản lý** — duyệt/điều phối trong phạm vi nghiệp vụ, xem báo cáo.
- **Nhân viên** — tạo và xử lý bản ghi của mình.
Brief chỉ nhắc 1–2 vai trò ⇒ dùng đúng chừng đó, không tự thêm.

## P3. VÒNG ĐỜI TRẠNG THÁI MẪU (cho thực thể nghiệp vụ chính)
`Nháp → Chờ duyệt → Đã duyệt → Đang xử lý → Hoàn thành` + nhánh `Từ chối` (từ Chờ duyệt,
kèm lý do) và `Hủy` (từ Nháp/Chờ duyệt). Ai chuyển được trạng thái nào: theo P2
(Nhân viên tạo/nộp; Quản lý duyệt/từ chối; Quản trị viên mọi quyền).

## P4. MOCK DATA TIẾNG VIỆT
- 8–15 bản ghi/thực thể chính, đủ trải các trạng thái P3.
- Tên người: Nguyễn Văn An, Trần Thị Bích, Lê Minh Châu, Phạm Quốc Dũng, Hoàng Thu Hà,
  Vũ Đức Huy, Đỗ Ngọc Lan, Bùi Thanh Sơn… SĐT 09xx-xxx-xxx giả. Email `<ten>@example.vn`.
- Công ty giả: Công ty TNHH Sao Việt, CP Đại Phát, TM Hồng Hà… Địa chỉ Hà Nội/HCM/Đà Nẵng.
- Ngày tháng rải trong 60 ngày gần nhất. Tiền tệ VND có dấu chấm ngăn cách.
- CẤM: tên/thương hiệu thật của khách hàng khác, dữ liệu nhạy cảm, nội dung phản cảm.

## P5. AUTH DEMO
- Đăng nhập email + mật khẩu, KHÔNG xác thực email thật, KHÔNG OAuth, KHÔNG quên-mật-khẩu gửi mail.
- Tài khoản seed cố định (đưa vào mail cho khách):
  `admin@demo.vn / Demo@2026` · `quanly@demo.vn / Demo@2026` · `nhanvien@demo.vn / Demo@2026`
- Nút "Đăng nhập nhanh" theo vai trò trên màn login là bắt buộc (khách trải nghiệm không cần gõ).

## P6. CHUẨN UX 5 STATES (mọi màn hình danh sách/chi tiết)
Empty (có hướng dẫn + nút tạo mới) · Loading (skeleton) · Error (thông báo + thử lại) ·
Success (toast) · Partial/Validation (báo lỗi theo field, tiếng Việt, không mất dữ liệu đã nhập).

## P7. QUY ƯỚC ĐẶT TÊN
- slug: từ tên project, bỏ dấu, thường, `-` nối, `[a-z0-9-]`, 3–40 ký tự (slug do MAX sinh, LEVI chỉ dùng lại).
- Repo: `demo-<slug>`. Lovable project: `demo-<slug>`. Phase: P1, P2… AC: AC-01…
- P1 luôn là: khung app + auth demo + layout + danh mục nền. Phase cuối luôn gồm: seed mock data đầy đủ + rà 5 states.

## P8. OUT-OF-SCOPE MẶC ĐỊNH CỦA MỌI DEMO (trừ khi brief yêu cầu tường minh)
Thanh toán thật · gửi email/SMS thật từ app · tích hợp bên thứ ba thật · phân quyền theo bản ghi
chi tiết · import/export phức tạp · đa ngôn ngữ · tối ưu hiệu năng dữ liệu lớn · audit log đầy đủ.
Brief đòi những thứ này ⇒ đưa vào SPEC dạng mô phỏng (mock/simulated) và ghi rõ trong SUMMARY.

## P9. KHI BRIEF MÂU THUẪN
Ưu tiên: (1) yêu cầu tường minh mới nhất trong brief → (2) mục tiêu demo nêu ở đầu brief →
(3) Playbook. Mâu thuẫn khiến KHÔNG xác định nổi sản phẩm là gì ⇒ đó là ca escalation blocking
duy nhất được phép (theo instruction LEVI).
