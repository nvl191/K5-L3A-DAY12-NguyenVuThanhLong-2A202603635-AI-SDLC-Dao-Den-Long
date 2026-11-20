# Bằng chứng Phase 4 — Contract 1.3

Mọi file JSON và ảnh trong thư mục này được sinh từ mã ở commit `phase-4`, không chỉnh tay. Máy đo: Apple M1 Max (10 lõi, 64 GB), macOS (Darwin 25.6.0, arm64), Node v24.8.0, HeadlessChrome 157, GPU thật qua ANGLE/Metal (xem trường `machine` trong `bench.json`).

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Kiểm tra tổng, tất định, đêm đầy đủ < 30 s | `npm run verify` | 36 test đạt, build, JSONL hai lần giống hệt, đêm 3 đầy đủ chạy dưới 1 s | Đạt |
| Benchmark 1280×720, 200 Bóng Mực, 100 đom đóm, 3 đèn, vsync tắt, 30 s | `npm run bench -- --seed 42 --duration 30 --out docs/proof/phase-4/bench.json` | [bench.json](bench.json): avg 421,1 FPS, p1-low 225,6 FPS, p95 khung 2,9 ms, 12 634 khung, load 290 ms | Đạt ngưỡng của Ticket-04 (avg ≥ 60, p1-low ≥ 30, load ≤ 10 000 ms) trên máy phát triển; máy chấm của giảng viên mới là số chính thức |
| Bộ nhớ đỉnh của benchmark | cùng lệnh | `peak_mem_mb: null` | Chưa đo: RSS của tiến trình renderer Chrome không lấy được ổn định chéo hệ điều hành |
| Soak 10 đêm, crash = 0, `mem_end_mb` ≤ 1,2 × `mem_start_mb` | `npm run soak -- --seed 7 --nights 10 --out docs/proof/phase-4/soak.json` | [soak.json](soak.json): 0 crash, RSS 55,1 → 57,8 MB (tỉ lệ 1,05; bốn lần chạy khác cho 1,09) | Đạt |
| Bảng xếp hạng top 10, xếp điểm giảm dần, hòa thì ai đạt trước | `tests/leaderboard.test.js`, `tests/phase4.test.js` (API server + export CLI) | Test tự động | Đạt |
| Export bảng xếp hạng JSON | `npm run start -- --export-leaderboard out.json` hoặc `node src/cli.js --export-leaderboard out.json` | Test `CLI export ranks…` | Đạt (cả hai lệnh cho cùng kết quả đã xếp hạng) |
| Chữ UI tối thiểu 18 px ở 1280×720 | Script CDP duyệt mọi phần tử có chữ ở menu, cài đặt, bảng xếp hạng, intro, HUD và tạm dừng, đọc `font-size` thực tế | 0 phần tử dưới 18 px sau khi sửa (trước đó 25 phần tử, thấp nhất 9 px) | Đạt (màn hình kết quả dùng cùng lớp CSS, chưa duyệt riêng) |
| `run_cmd --export-leaderboard out.json` | Test `contract commands accept the flags the grader appends` | `run_cmd` là `node server.js`; `npm run start --export-leaderboard` trước đó làm server treo thay vì xuất file | Đạt |
| Cảnh benchmark và giao diện hiển thị đúng | Ảnh chụp | [bench-scene.png](bench-scene.png), [menu.png](menu.png), [hud.png](hud.png), [settings.png](settings.png) | Đạt (kiểm tra bằng mắt) |

## Lịch sử đo benchmark và lỗi đã sửa

Lần đo đầu (trước khi sửa) chỉ đạt khoảng 7–8 FPS (p1-low 3–6,5 FPS) trên cùng máy. Nguyên nhân là phần trình bày, không phải mô phỏng:

- Mỗi đom đóm có một `PointLight` riêng, khiến cảnh benchmark có hơn 100 đèn điểm và mọi fragment phải tính tất cả.
- Mỗi Bóng Mực tạo geometry và material riêng và bật đổ bóng, khoảng 2 000 draw call.

Đã sửa: bỏ đèn điểm của đom đóm (giữ phát sáng bằng vật liệu emissive và quầng sáng), dùng chung geometry/material cho đom đóm và Bóng Mực, tắt đổ bóng cho chi tiết nhỏ của Bóng Mực. Kết quả: 8 → khoảng 450 FPS. Mô phỏng và JSONL headless không đổi.

Các lỗi khác tìm thấy khi rà soát và đã sửa:

- `load_ms` trong benchmark ra giá trị âm khổng lồ (trừ nhầm `performance.timeOrigin`).
- Chuỗi renderer bị che ("WebKit WebGL"); nay lấy tên GPU thật qua `WEBGL_debug_renderer_info`. Cờ GPU mặc định nay không ép SwiftShader; `BENCH_SOFTWARE_GL=1` để so sánh với render phần mềm.
- Soak đã được viết lại thành bot biết chơi trong một lần rà soát, rồi khôi phục: Ticket-04 quy định input ngẫu nhiên theo seed (5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác, đổi hướng mỗi 30 tick). Kết quả: mọi đêm đều kết thúc `lost` sau vài chục giây mô phỏng nên cả bài chạy 0,3 giây; đó là hành vi đúng của đặc tả, không phải bằng chứng cân bằng game.
- `--export-leaderboard` có hai bản không nhất quán (`src/cli.js` không xếp hạng). Nay cùng dùng `rankEntries`.

## Chưa đạt hoặc khác đặc tả

- Benchmark chưa chạy trên máy chấm; không suy diễn ngưỡng nghiệm thu từ máy phát triển.
- `peak_mem_mb` là `null` (giải thích ở trên).
- Trong cảnh benchmark, 200 Bóng Mực di chuyển trên quỹ đạo cố định quanh đảo, không đi theo luật `wander` của mô phỏng như Ticket-04 mô tả.
- `load_ms` đo từ lúc trang bắt đầu điều hướng đến khung đầu tiên của cảnh bench, không tính thời gian khởi động tiến trình Chrome.
- Đom đóm không còn `PointLight` riêng (thay bằng vật liệu emissive và quầng sáng). Thay đổi này áp dụng cho cả bản chơi thật, không chỉ cảnh benchmark.
- Soak có một đêm khởi động không tính số liệu trước khi đo `mem_start_mb` (xem `docs/notes/phase-4.md`).
- Tiếng Việt có dấu trong tên bảng xếp hạng chưa hỗ trợ (điểm cộng, không bắt buộc).
- Chưa có video demo `.mp4`.
