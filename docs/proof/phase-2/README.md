# Bằng chứng Phase 2 — Contract 1.1 (Ticket-02)

Mỗi tính năng mới của Ticket-02 được kiểm chứng bằng test headless chạy qua `runSimulation`/`Simulation` với scenario riêng trong `tests/simulation.test.js`. Chạy lại: `node --test` (36 test, dưới 2 giây). Ghi chú: một số luật Phase 2 đã bị Ticket-03 thay thế (thắng sớm, điểm, thời lượng); xem [CHANGELOG](../../../CHANGELOG.md).

| Tính năng Ticket-02 | Test (tên trong `tests/simulation.test.js`) |
|---|---|
| Headless tất định, mô hình tick | `same seed, scenario, and inputs produce identical JSONL objects`, `tick model starts at snapshot zero and ends with requested count` |
| Nhặt đom đóm từ tick kế tiếp | `scenario mote is picked up on the next simulation tick` |
| Nạp đèn vào đèn gần nhất, điểm chuẩn | `interaction deposits only into nearest unlit lantern and reports standard score` |
| Tỏa Sáng, bán kính 3D, trả đom đóm bị cướp | `pulse spends three motes and stuns a shade within three-dimensional radius`, `pulse returns every stolen mote with dropped kind and next-tick availability` |
| Tạm dừng | `pause advances wall tick but freezes simulation time` |
| Rơi khỏi đảo, bỏ qua bất tử | `fall costs a flame even while invulnerable and ends immediately at zero` |
| Lướt | `dash uses the normalized travel direction, lasts twelve ticks, and starts its cooldown` |
| Bùa Gió | `wind charm is collectible and removes dash cooldown while active` |
| Gió Lạc cướp trước Bóng Mực | `drifter steals before a shade hit and keeps stolen motes when fleeing` |
| Bục nhảy Đêm 2 | `night two springboards launch toward the other island` |
| Gió Đêm 3: báo trước 2 s, thổi 5 s | `night three wind warns for two seconds and blows for five seconds` |
| Tầng và vách Đêm 3 | `night three ledges cannot be walked up and release the player when stepped off` |
| Cờ scenario tắt sinh ngẫu nhiên | `scenario flags suppress random scheduled pickups and shades` |
| Lịch sinh Bóng Mực cả ba đêm (2 con tại tick 300, sau đó theo khoảng sinh) | `every night spawns two shades at tick 300, then one per night interval (Ticket-02)`, `shade schedule creates two stable ids at tick 300` |
| Thời lượng và số đèn ba đêm | `night contract v1.2 has the three specified duration and lantern counts` |
| Một đêm đầy đủ headless ≤ 30 s | `npm run verify` (đêm 3, 18 000 tick) |

## Chưa đạt hoặc chưa kiểm chứng

- Giao diện (menu, intro, kết quả, màn hình Bình Minh, âm thanh, bảng màu chuẩn ±10%) chỉ kiểm tra bằng mắt trên bản web; ảnh chụp HUD, menu và cài đặt ở [proof Phase 4](../phase-4/README.md). Chưa có test tự động cho âm thanh và bảng màu.
- Chưa đo FPS riêng ở Phase 2; benchmark chuẩn của Ticket-04 nằm ở proof Phase 4.
- Các JSONL Phase 1 (`docs/proof/phase-1/`) là đầu ra lịch sử của contract cũ; không phải bằng chứng cho contract hiện hành.
