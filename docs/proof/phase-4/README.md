# Bằng chứng Phase 4 — Contract 1.3

Mọi file JSON và ảnh trong thư mục này được sinh từ mã ở commit `phase-4`, không chỉnh tay. Máy đo: Apple M1 Max (10 lõi, 64 GB), macOS (Darwin 25.6.0, arm64), Node v24.8.0, HeadlessChrome 157, GPU thật qua ANGLE/Metal (xem trường `machine` trong `bench.json`).

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Kiểm tra tổng, tất định, đêm đầy đủ < 30 s | `npm run verify` | 34 test đạt, build, JSONL hai lần giống hệt, đêm 3 đầy đủ chạy dưới 1 s | Đạt |
| Benchmark 1280×720, 200 Bóng Mực, 100 đom đóm, 3 đèn, vsync tắt, 30 s | `npm run bench -- --seed 42 --duration 30 --out docs/proof/phase-4/bench.json` | [bench.json](bench.json): avg 452,7 FPS, p1-low 307,3 FPS, p95 khung 2,6 ms, 13 581 khung | Đã đo; ngưỡng nghiệm thu do giảng viên công bố, máy chấm mới là số chính thức |
| Bộ nhớ đỉnh của benchmark | cùng lệnh | `peak_mem_mb: null` | Chưa đo: RSS của tiến trình renderer Chrome không lấy được ổn định chéo hệ điều hành |
| Soak 10 đêm không crash, bộ nhớ ổn định | `npm run soak -- --seed 7 --nights 10 --out docs/proof/phase-4/soak.json` | [soak.json](soak.json): 0 crash, 1 605,5 giây mô phỏng, heap 4,2 → 4,5 MB, RSS 58,5 → 67,8 MB | Đạt về crash; heap ổn định. RSS tăng khoảng 9 MB sau chuỗi dài, chưa đủ dài để loại trừ hoàn toàn rò rỉ nhỏ |
| Bảng xếp hạng top 10, xếp điểm giảm dần, hòa thì ai đạt trước | `tests/leaderboard.test.js`, `tests/phase4.test.js` (API server + export CLI) | Test tự động | Đạt |
| Export bảng xếp hạng JSON | `npm run start -- --export-leaderboard out.json` hoặc `node src/cli.js --export-leaderboard out.json` | Test `CLI export ranks…` | Đạt (cả hai lệnh cho cùng kết quả đã xếp hạng) |
| Cảnh benchmark vẫn hiển thị đúng | Ảnh chụp | [bench-scene.png](bench-scene.png), [menu.png](menu.png) | Đạt (kiểm tra bằng mắt) |

## Lịch sử đo benchmark và lỗi đã sửa

Lần đo đầu (trước khi sửa) chỉ đạt khoảng 7–8 FPS (p1-low 3–6,5 FPS) trên cùng máy. Nguyên nhân là phần trình bày, không phải mô phỏng:

- Mỗi đom đóm có một `PointLight` riêng, khiến cảnh benchmark có hơn 100 đèn điểm và mọi fragment phải tính tất cả.
- Mỗi Bóng Mực tạo geometry và material riêng và bật đổ bóng, khoảng 2 000 draw call.

Đã sửa: bỏ đèn điểm của đom đóm (giữ phát sáng bằng vật liệu emissive và quầng sáng), dùng chung geometry/material cho đom đóm và Bóng Mực, tắt đổ bóng cho chi tiết nhỏ của Bóng Mực. Kết quả: 8 → khoảng 450 FPS. Mô phỏng và JSONL headless không đổi.

Các lỗi khác tìm thấy khi rà soát và đã sửa:

- `load_ms` trong benchmark ra giá trị âm khổng lồ (trừ nhầm `performance.timeOrigin`).
- Chuỗi renderer bị che ("WebKit WebGL"); nay lấy tên GPU thật qua `WEBGL_debug_renderer_info`. Cờ GPU mặc định nay không ép SwiftShader; `BENCH_SOFTWARE_GL=1` để so sánh với render phần mềm.
- Soak ban đầu dùng bước đi ngẫu nhiên nên cả 10 đêm thua sau 16–68 giây và cả bài chạy 0,2 giây, không có ý nghĩa cho kiểm tra ổn định. Nay là bot có seed biết nhặt đom đóm, châm dầu và Tỏa Sáng; các đêm chạy tới 1 605 giây mô phỏng.
- `--export-leaderboard` có hai bản không nhất quán (`src/cli.js` không xếp hạng). Nay cùng dùng `rankEntries`.

## Chưa đạt hoặc chưa làm

- Benchmark chưa chạy trên máy chấm; không suy diễn ngưỡng nghiệm thu từ máy phát triển.
- `peak_mem_mb` là `null` (giải thích ở trên).
- Cả 10 đêm soak đều kết thúc `lost`: bot chỉ để kiểm tra ổn định, không phải bằng chứng cân bằng game.
- Chưa có video demo `.mp4`.
