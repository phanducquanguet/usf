# UniAI — TỜ KHÁI NIỆM BỎ TÚI
*(In 2 mặt khổ A4, phát kèm Phiếu tuyển cộng sự AI)*

---

## MẶT TRƯỚC — 8 khái niệm, 1 sơ đồ

### Sơ đồ gốc — mọi thứ trên UniAI đều nằm trong vòng này

```
BẠN tạo Issue ──▶ giao cho AGENT ──▶ agent dùng SKILL để làm
      ▲                                        │
      └────── BẠN duyệt ◀── agent báo cáo ◀────┘
```

### Nơi làm việc & công việc

| Khái niệm | Là gì |
|---|---|
| **Workspace** | "Văn phòng" của phòng ban: thành viên, dữ liệu, agent nằm trong đó. Ngoài workspace không thấy gì |
| **Project** | Nhóm việc theo một mục tiêu — nhìn project là thấy tiến độ tổng |
| **Issue** | Đơn vị công việc nhỏ nhất: mô tả, trạng thái, người/agent phụ trách. **Mô tả issue = đề bài bạn ra cho agent** |
| **Inbox** | Mọi cập nhật đổ về một chỗ: agent xong việc, được nhắc tên, được giao việc. Mở Inbox đầu ngày thay vì đi hỏi |

### Bộ máy AI

| Khái niệm | Là gì |
|---|---|
| **Agent** | Đồng nghiệp AI trong danh sách thành viên — nhận issue và làm đến xong, tự báo cáo |
| **Runtime** | "Chỗ làm việc" của agent: máy công ty hoặc máy của bạn, nơi agent thực sự chạy. Runtime online = agent làm việc được |
| **Skill** | Sổ tay nghiệp vụ đóng gói sẵn — agent tự tra và làm đúng chuẩn công ty, mọi lần như nhau |
| **Autopilot** | Đồng hồ báo thức của agent: đến giờ tự chạy việc định kỳ, kết quả về Inbox |

---

## MẶT SAU — công thức xây đội của bạn

### Công thức tạo MỘT cộng sự AI

> **BỘ NÃO** (model) + **KIẾN THỨC** (Skill) + **CÁNH TAY** (Tool/MCP) + **BẢN MÔ TẢ CÔNG VIỆC** (Instructions)

- Không cắm tay gửi mail thì *về mặt vật lý* không gửi mail được — an toàn bằng thiết kế, không bằng dặn dò.
- Càng ít cánh tay càng an toàn. Chỉ cấp thứ nghề đó bắt buộc cần.

### 3 cấp trưởng thành — ai cũng bắt đầu ở Cấp 1

| Cấp | Tên | Cần gì |
|---|---|---|
| **1 — Cộng sự** | 1 agent làm 1 nghề hẹp cho bạn | 1 agent + 1 skill + bạn duyệt. Dựng trong 1 buổi |
| **2 — Trợ lý tự động** | Cộng sự + đồng hồ | Cấp 1 + 1 autopilot |
| **3 — Dây chuyền** | Nhiều cộng sự chuyền tay nhau (như Demo Factory) | Đủ 5 khối, có quản đốc |

### 5 khối của một đội hình AI hoàn chỉnh (Cấp 3)

| Khối | Chức năng | Trong Demo Factory |
|---|---|---|
| 🔵 **Tiếp nhận** | Cửa vào duy nhất: hiểu yêu cầu, chuẩn hoá, đưa vào hàng đợi | UNIKO (portal) + form sale |
| 🟠 **Điều phối** | Giữ nhịp: chia việc, giao đúng người, đôn đốc. Không làm chuyên môn | MAX + autopilot demo-ops |
| 🟢 **Thực thi** | Thợ chuyên môn hẹp, mỗi người một nghề một cánh tay | LEVI → LOVIBUILD → DEPLO → MILO |
| 🔴 **Con người** | Phán quyết tại điểm không uỷ quyền được: cam kết với khách, chất lượng, phát ngôn ra ngoài | HUMAN + dự phòng, 3 điểm chạm |
| 🟣 **Cải tiến** | Vòng học: điều lặp lại thăng cấp thành luật — tuần sau giỏi hơn tuần trước | Assumption lặp → vào playbook |

**Thiếu khối nào, quy trình chết ở đó:** thiếu Tiếp nhận → việc trôi · thiếu Điều phối → tắc ·
thiếu Con người → rủi ro · thiếu Cải tiến → dậm chân.

### Bắt đầu từ ngày mai — 3 việc

1. Đăng nhập workspace phòng mình
2. Nộp **Phiếu tuyển cộng sự AI** cho đội nền tảng — agent được dựng trong 48 giờ
3. Tự tạo và giao **issue #1** cho cộng sự của bạn

*Hỗ trợ: kênh chat đội nền tảng UniAI · Tài liệu: xem hướng dẫn triển khai nội bộ.*
