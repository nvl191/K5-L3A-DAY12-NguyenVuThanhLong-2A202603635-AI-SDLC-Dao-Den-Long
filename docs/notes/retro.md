# Retro dự án Đảo Đèn Lồng

## Đánh giá từng phase

| Phase | Đạt | Hồi quy / thay đổi | Cần chỉnh |
|---|---|---|---|
| 1 — PRD-0 | Đêm 1 chơi được, headless v1.0 tất định, mã thoát 2 khi file sai, scenario và JSONL ở `docs/proof/phase-1/` | — | Gộp Phase 1–3 vào một commit nên không có tag `phase-1`, `phase-2` đúng nghĩa |
| 2 — Ticket-02 | 3 đêm, Lướt, Gió Lạc, Bùa Gió, bục nhảy, gió, tạm dừng, HUD; mỗi tính năng có test headless | Số liệu chuẩn thay giá trị tự chọn | Lịch sinh Bóng Mực của Đêm 2–3 bị làm sai (tick 420/360 thay vì 300); chỉ phát hiện ở phase 4 khi đọc lại ticket |
| 3 — Ticket-03 | Dầu đèn, hút dầu, thắng ở bình minh, sức chứa, điểm mới, bảng màu dễ phân biệt; ADR-001, CHANGELOG | Test thắng sớm cũ được thay có lý do, không skip | Lỗi nhân 60 lần ở hao dầu (test bắt được) |
| 4 — Ticket-04 | Benchmark, soak, bảng xếp hạng, accessibility, đóng gói; `verify` và 36 test đạt | Giữ nguyên contract v1.0–v1.2 | `run_cmd` sai, chữ UI dưới 18 px, benchmark 7–8 FPS (đều sửa); xem [proof Phase 4](../proof/phase-4/README.md) |

## Điều hiệu quả

- Tách mô phỏng tất định (`src/sim/`) khỏi hiển thị: test headless nhanh (36 test dưới 2 giây), JSONL so sánh được từng byte.
- Mỗi ticket có ghi chú giả định và thay đổi (`docs/notes/phase-N.md`, ADR-001); test cũ bị luật mới làm sai được thay thế có lý do.
- `npm run verify` gom test, build, tất định và thời gian đêm đầy đủ vào một lệnh.

## Lần AI sai và cách phát hiện

| Phase | Lỗi | Phát hiện | Khắc phục |
|---|---|---|---|
| 1 | Chưa nhận scenario bắt đầu ngoài đảo (Y < -10) | Test kịch bản rơi | Sửa mô phỏng |
| 2 | Lịch sinh Bóng Mực Đêm 2–3 lệch ticket | Đối chiếu từng dòng Ticket-02 ở phase 4 | Sửa cấu hình, thêm test cho cả ba đêm |
| 3 | Hao dầu thụ động bị nhân 60 lần | Test 1 giây và test hút dầu | Đổi sang số nguyên 1/60 đơn vị |
| 4 | Benchmark 7–8 FPS: mỗi đom đóm có PointLight, mỗi Bóng Mực có geometry/material riêng | Chạy lại benchmark, đọc `world.js`; đổi cờ GPU không giúp nên loại trừ render phần mềm | Dùng chung tài nguyên, bỏ đèn điểm đom đóm |
| 4 | `load_ms` âm khổng lồ nằm trong thư mục bằng chứng mà không ai nhận ra | Đọc lại JSON khi rà soát | Sửa phép tính |
| 4 | `run_cmd = npm run start` nên `--export-leaderboard` bị npm nuốt, server treo | Chạy đúng lệnh mà contract sẽ ghép | Đổi thành `node server.js`, thêm test |
| 4 | Chữ UI dưới 18 px (badge 9 px, cảnh báo gió 9 px, …) | Script đọc `font-size` thực tế của mọi phần tử | Sửa CSS, kiểm tra lại các màn hình |
| 4 | Viết lại soak thành bot biết chơi khi chưa đọc đặc tả; Ticket-04 quy định input ngẫu nhiên | Đối chiếu khi có đủ ba ticket | Khôi phục đúng mô hình input, thêm test kiểm tra hình dạng báo cáo |

Bài học chung: một con số bằng chứng chỉ có giá trị khi đã đọc kỹ nó, và sửa một thứ gì đó "cho có ý nghĩa hơn" khi chưa đọc đặc tả gốc có thể làm sai yêu cầu. "Đã sinh file" chưa phải "đã đạt".

## Harness

- `AGENTS.md` ngắn, có lệnh build/test/bench/soak và các ràng buộc rút ra từ lỗi thật (lệnh contract nối cờ, chữ 18 px, không thêm PointLight cho thực thể số lượng lớn).
- Hook Stop (`.claude/settings.json` + `scripts/stop-hook.mjs`) chặn kết thúc khi `node --test` đỏ; skill `phase-proof` nhắc quy trình sinh bằng chứng; CI GitHub Actions chạy `npm run verify`.
- Hook và skill chỉ có tác dụng với Claude Code, không với Codex.

## Token và chi phí

Giao diện công cụ không cung cấp số token cho Codex (Phase 1–3) lẫn Claude Code (Phase 4). Không ghi con số suy đoán; nếu nộp bài có số liệu thật thì bổ sung vào `ai-log.md`. Cách tiết kiệm: kiểm thử logic thuần trước đồ họa, đo benchmark ngắn (6–8 giây) khi thử nghiệm và chỉ chạy bản 30 giây để lấy bằng chứng cuối.

## Nếu làm lại

- Đọc lại toàn bộ ticket từng dòng trước khi gắn tag mỗi phase và đối chiếu bằng một bảng yêu cầu, thay vì dồn tới phase cuối.
- Chạy lệnh trong `game.contract.json` đúng cách giảng viên sẽ ghép tham số, ngay từ Phase 1.
- Đo benchmark từ Phase 2, khi cảnh còn nhỏ.
- Commit và tag từng phase đúng hạn thay vì gộp Phase 1–3.
- Thêm CI và hook từ Phase 1.
