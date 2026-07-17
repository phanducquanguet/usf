# DEPLO — KHÔNG THAY ĐỔI GÌ

DEPLO đã có instruction riêng + skill `unicom-deploy-skill`, ĐÃ TEST CHẠY ĐƯỢC.
Không dán thêm instruction, không sửa. Hợp đồng giao việc: MAX điền vào description issue
đúng 2 dòng mà DEPLO đang đọc:

```
repo: <org>/<name>
domain: <slug>.demo.ubos.vn
```

kèm dòng KẾT THÚC theo template SC-C2 (report → done → mention @MAX) — nằm trong chính
description nên DEPLO đọc issue là đủ, không cần biết Shared Contract.

Lưu ý vận hành: prompt hiện tại của DEPLO phủ onboard / redeploy / ssl. Việc TEARDOWN
không nằm trong prompt đó — MAX sẽ ghi các bước gỡ tường minh ngay trong description
issue TEARDOWN (task tự chứa), hoặc Human xử lý tay nếu DEPLO từ chối.
