# Retro dự án Đảo Đèn Lồng

## Điều hiệu quả

- Tách mô phỏng tất định (`src/sim/`) khỏi hiển thị: test headless nhanh (34 test dưới 2 giây), JSONL so sánh được byte-by-byte.
- Mỗi ticket có ghi chú giả định và thay đổi (`docs/notes/phase-N.md`, ADR-001 cho luật dầu đèn); test thắng sớm cũ được thay thế có lý do, không bỏ qua âm thầm.
- `npm run verify` gom test, build, tất định và thời gian đêm đầy đủ vào một lệnh.

## Lần AI sai và cách phát hiện

| Phase | Lỗi | Phát hiện | Khắc phục |
|---|---|---|---|
| 1 | Chưa nhận scenario bắt đầu ngoài đảo (Y < -10) | Test kịch bản rơi | Sửa mô phỏng |
| 3 | Hao dầu thụ động bị nhân 60 lần | Test 1 giây và test hút dầu | Đổi sang số nguyên 1/60 đơn vị |
| 4 | Benchmark chỉ 7–8 FPS vì mỗi đom đóm có PointLight và mỗi Bóng Mực có geometry/material riêng | Chạy lại benchmark và đọc `world.js`; đổi cờ GPU không cải thiện nên loại trừ nguyên nhân render phần mềm | Dùng chung tài nguyên, bỏ đèn điểm đom đóm |
| 4 | `load_ms` âm khổng lồ trong `bench.json` đã nằm trong thư mục bằng chứng mà không ai nhận ra | Đọc lại JSON khi rà soát tiến độ | Sửa phép tính |
| 4 | Soak "đạt" nhưng chỉ chạy 0,2 giây vì bot ngẫu nhiên chết sớm | Đếm tick mỗi đêm | Viết bot chơi có mục tiêu, ghi `ticks_per_night` để lộ chuyện này |
| 4 | README trỏ tới file chưa tồn tại (`proof/phase-4/README.md`, `retro.md`) | Rà soát link | Viết các file đó |

Bài học chung: một con số bằng chứng chỉ có giá trị khi đã đọc kỹ nó. "Đã sinh file" chưa phải "đã đạt".

## Harness

- `AGENTS.md` ngắn, có lệnh build/test/bench/soak.
- Hook Stop (`.claude/settings.json` + `scripts/stop-hook.mjs`) chặn kết thúc khi `node --test` đỏ.
- Skill `phase-proof` (`.claude/skills/phase-proof/`) nhắc quy trình sinh và kiểm tra bằng chứng.
- CI GitHub Actions chạy `npm run verify` mỗi lần push.

## Token và chi phí

Giao diện công cụ không cung cấp số token cho Phase 1–3 (Codex); Phase 4 được rà soát và hoàn thiện bằng Claude Code, cũng chưa có số liệu hiển thị. Không ghi con số suy đoán. Cách tiết kiệm: kiểm thử logic thuần trước đồ họa, đo benchmark ngắn (6–8 giây) khi thử nghiệm và chỉ chạy bản 30 giây để lấy bằng chứng cuối.

## Nếu làm lại

- Đo benchmark ngay từ Phase 2, khi cảnh còn nhỏ, thay vì dồn tới Phase 4.
- Commit và tag từng phase đúng hạn thay vì gộp Phase 1–3 vào một commit.
- Viết bot soak có mục tiêu ngay từ đầu và ghi số tick mỗi đêm trong báo cáo.
- Thêm CI và hook từ Phase 1.
