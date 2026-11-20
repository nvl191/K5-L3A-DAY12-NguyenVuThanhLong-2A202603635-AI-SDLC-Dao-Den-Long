# Nhật ký sử dụng AI

| Phase | Công cụ | Việc dùng AI | Token/chi phí | Cách tiết kiệm |
|---|---|---|---|---|
| 1–3 | Codex trong ChatGPT | Đọc yêu cầu, lập cấu trúc, viết và rà soát mô phỏng/UI; sửa lỗi theo test | Chưa có số liệu token/chi phí hiển thị trong phiên này; không tự ước lượng thay số đo | Chia việc theo module, kiểm thử logic thuần trước khi hoàn thiện đồ họa |

## Lỗi AI và cách phát hiện

- Bước đầu mô hình hóa rơi khỏi đảo chưa nhận tình huống scenario bắt đầu tại Y < -10; test fall scenario phát hiện lỗi và mô phỏng được sửa.
- Ở bản đầu Ticket-03, mức hao dầu thụ động bị nhân nhầm 60 lần; test một giây và test hút dầu phát hiện lỗi. Đơn vị nội bộ được đổi sang số nguyên 1/60 đơn vị dầu và kiểm tra lại bằng test 60 tick.
- Số liệu và thay đổi theo ticket được đối chiếu với lab board; chỗ chưa có yêu cầu chính xác được ghi trong spec từng phase.

> Khi nộp bài, bổ sung số liệu token/chi phí nếu giao diện công cụ cung cấp; không ghi con số suy đoán.
