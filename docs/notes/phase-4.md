# Phase 4 — Ticket-04: Bình minh, v1.0.0

## Spec và giả định

- Giữ nguyên contract v1.0–v1.2; contract v1.3 thêm `bench_cmd` và `soak_cmd`. `run_cmd`, `bench_cmd`, `soak_cmd` là phần lệnh gốc để giảng viên nối thêm tham số, nên `run_cmd` là `node server.js` (không dùng `npm run start`, vì npm nuốt cờ `--export-leaderboard`).
- Bản web dùng Chrome headless với GPU thật (không ép SwiftShader) cho benchmark, scene night 1 đủ hiệu ứng/ánh sáng, đúng 200 shade, 100 mote, 3 lantern. Vsync tắt bằng hai cờ Chrome `--disable-frame-rate-limit` và `--disable-gpu-vsync`; số đo chỉ có ý nghĩa cùng cấu hình thiết bị được ghi trong JSON.
- RSS của browser renderer không đo được nhất quán từ một lệnh chéo macOS/Linux; theo Ticket-04 xuất `peak_mem_mb: null` và giải thích giới hạn này.
- Soak làm nóng runtime bằng một Đêm 3 không tính vào số liệu (tránh tính RSS tăng do JIT và bộ cấp phát chưa ổn định thành rò rỉ), sau đó chạy 10 đêm với seed 7–16 (i đánh số từ 0), xoay vòng Đêm 1–3. Input đúng Ticket-04: đổi hướng mỗi 30 tick, mỗi tick 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác. Đêm kết thúc sớm khi mô phỏng thắng/thua, nếu không chạy tới hết thời lượng.
- Leaderboard là local-only. `localStorage` giữ bản trình duyệt; máy chủ cục bộ ghi thêm `leaderboard.json` để lệnh export dùng cùng điểm đã lưu. Không đồng bộ điểm lên mạng. Export: `npm run start -- --export-leaderboard out.json`.
- Tên chấp nhận 3–12 ký tự ASCII `[A-Za-z0-9_]`; tiếng Việt có dấu không bật vì không thuộc hợp đồng bắt buộc.

## Thay đổi

- Thêm benchmark browser/CDP ở `src/bench.js`, scene chuẩn và đo trong `src/main.js`.
- Thêm soak test ngẫu nhiên 10 đêm trong `src/soak.js`.
- Thêm leaderboard top 10, sắp xếp điểm giảm dần, rồi thời gian đạt tăng dần; server static cung cấp API local và CLI xuất đúng thứ tự.
- Cài đặt: đổi phím cho chín hành động, kiểm tra trùng phím, khôi phục mặc định, giảm chuyển động, chữ lớn ×1.25. HUD thêm mũi tên Bóng Mực, cảnh báo đèn yếu, gió sắp nổi; đếm ngược 10 giây đã có.
- Máy chủ phát hành `npm start` phục vụ `dist/` và điểm local; từ bản clone sạch chạy `npm ci`, `npm run build`, `npm start`.

- Rà soát hiệu năng: bỏ `PointLight` của từng đom đóm, dùng chung geometry/material và tắt đổ bóng cho chi tiết nhỏ của Bóng Mực (chỉ phần trình bày; mô phỏng không đổi). Benchmark 7–8 → khoảng 450 FPS trên máy phát triển.
- Sửa `load_ms` âm, thêm cấu hình máy và tên GPU thật vào báo cáo benchmark.
- Thêm `tests/phase4.test.js` (export, soak, API server, lệnh trong contract), CI, hook Stop và skill `phase-proof`.

- Rà soát theo Ticket-02/04: Bóng Mực mọi đêm sinh 2 con ở tick 300 (trước đó chỉ Đêm 1); chữ UI tối thiểu 18 px.

## Kiểm chứng

Kết quả thực tế được sinh ở `docs/proof/phase-4/bench.json`, `soak.json` và mô tả trong `README.md` của thư mục proof. Các ngưỡng FPS quy định áp dụng trên máy chấm do giảng viên công bố; không suy diễn từ máy phát triển.
