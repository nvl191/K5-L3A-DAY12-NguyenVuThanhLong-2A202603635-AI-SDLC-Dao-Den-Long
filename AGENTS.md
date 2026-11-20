# Đảo Đèn Lồng — hướng dẫn cho agent

- Phase hiện tại: Ticket-03, contract 1.2; giữ các yêu cầu Ticket-02 không bị thay thế.
- Dự án dùng JavaScript ES modules, Three.js cho hiển thị, Vite để chạy web.
- Logic tất định ở `src/sim/`; không import Three.js, DOM, Date.now hoặc Math.random vào mô phỏng.
- Headless: `node src/cli.js --seed 1 --night 1 --ticks 600 --out /tmp/dao.jsonl`.
- Kiểm tra đầy đủ: `npm run verify` (test, build, determinism, toàn đêm dưới 30 giây); hoặc `npm test`; build web: `npm run build`.
- Mỗi tick đúng 1/60 giây; thứ tự cơ bản trong `docs/notes/phase-2.md`, các sửa đổi Ticket-03 trong `docs/notes/phase-3.md`.
- Không sửa tay output kiểm chứng. Bằng chứng phải được sinh từ mã hiện tại.
- Giữ code và tài liệu của lab; không commit `.env`, token, khóa hoặc `node_modules/`.
- Trước khi kết thúc, xem diff, chạy kiểm tra liên quan và ghi rõ việc chưa đạt.
