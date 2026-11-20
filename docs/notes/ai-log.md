# Nhật ký sử dụng AI

| Phase | Công cụ | Việc dùng AI | Token/chi phí | Cách tiết kiệm |
|---|---|---|---|---|
| 1–3 | Codex trong ChatGPT | Đọc yêu cầu, lập cấu trúc, viết và rà soát mô phỏng/UI; sửa lỗi theo test | Chưa có số liệu token/chi phí hiển thị trong phiên này; không tự ước lượng thay số đo | Chia việc theo module, kiểm thử logic thuần trước khi hoàn thiện đồ họa |
| 4 | Codex (benchmark, soak, bảng xếp hạng, accessibility) rồi Claude Code (rà soát, sửa hiệu năng, soak, test, harness, tài liệu) | Đọc yêu cầu, viết bench/soak/leaderboard; Claude Code đo lại, tìm nguyên nhân 7–8 FPS, viết lại soak, thêm test và harness | Chưa có số liệu token/chi phí hiển thị; không tự ước lượng | Đo benchmark ngắn khi thử, chỉ chạy bản đầy đủ để lấy bằng chứng; đọc code thay vì thử cờ ngẫu nhiên khi đổi cờ GPU không cải thiện |

## Lỗi AI và cách phát hiện

- Bước đầu mô hình hóa rơi khỏi đảo chưa nhận tình huống scenario bắt đầu tại Y < -10; test fall scenario phát hiện lỗi và mô phỏng được sửa.
- Ở bản đầu Ticket-03, mức hao dầu thụ động bị nhân nhầm 60 lần; test một giây và test hút dầu phát hiện lỗi. Đơn vị nội bộ được đổi sang số nguyên 1/60 đơn vị dầu và kiểm tra lại bằng test 60 tick.
- Số liệu và thay đổi theo ticket được đối chiếu với lab board; chỗ chưa có yêu cầu chính xác được ghi trong spec từng phase.
- Phase 4: benchmark đầu chỉ 7–8 FPS do đèn điểm trên mỗi đom đóm và tài nguyên riêng cho mỗi Bóng Mực; `load_ms` âm và soak chỉ chạy 0,2 giây vẫn được ghi vào thư mục bằng chứng. Phát hiện khi rà soát lại số liệu; chi tiết ở [proof Phase 4](../proof/phase-4/README.md) và [retro](retro.md).

> Khi nộp bài, bổ sung số liệu token/chi phí nếu giao diện công cụ cung cấp; không ghi con số suy đoán.
