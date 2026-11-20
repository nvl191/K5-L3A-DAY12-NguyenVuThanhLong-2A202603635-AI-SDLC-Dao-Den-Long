# Đảo Đèn Lồng — hướng dẫn cho agent

- Phase hiện tại: Ticket-04, contract 1.3; giữ mọi yêu cầu Ticket-01 đến Ticket-03.
- Dự án dùng JavaScript ES modules, Three.js cho hiển thị, Vite để chạy web.
- Logic tất định ở `src/sim/`; không import Three.js, DOM, Date.now hoặc Math.random vào mô phỏng.
- Headless: `node src/cli.js --seed 1 --night 1 --ticks 600 --out /tmp/dao.jsonl`.
- Benchmark: `npm run bench -- --seed 42 --duration 30 --out bench.json` (Chrome, 1280×720).
- Soak: `npm run soak -- --seed 7 --nights 10 --out soak.json` (bot có seed; xem `ticks_per_night`, đừng chỉ nhìn `crashes`).
- Leaderboard export: `node src/cli.js --export-leaderboard out.json` (hoặc `npm run start -- --export-leaderboard out.json`); cả hai dùng `rankEntries`.
- Hiệu năng cảnh: không thêm `PointLight` hay geometry/material riêng cho thực thể số lượng lớn (đom đóm, Bóng Mực); dùng `_shared()` trong `src/view/world.js`.
- Harness: hook Stop chặn kết thúc khi test đỏ (`.claude/settings.json`), skill `phase-proof` để sinh bằng chứng, CI chạy `npm run verify`.
- Kiểm tra đầy đủ: `npm run verify` (test, build, determinism, toàn đêm dưới 30 giây); hoặc `npm test`; build web: `npm run build`.
- Mỗi tick đúng 1/60 giây; thứ tự cơ bản trong `docs/notes/phase-2.md`, các sửa đổi Ticket-03 trong `docs/notes/phase-3.md`.
- Không sửa tay output kiểm chứng. Bằng chứng phải được sinh từ mã hiện tại.
- Giữ code và tài liệu của lab; không commit `.env`, token, khóa hoặc `node_modules/`.
- Trước khi kết thúc, xem diff, chạy kiểm tra liên quan và ghi rõ việc chưa đạt.
