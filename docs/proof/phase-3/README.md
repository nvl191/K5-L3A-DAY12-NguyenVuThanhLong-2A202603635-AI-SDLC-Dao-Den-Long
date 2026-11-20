# Bằng chứng Phase 3 — Contract 1.2

Sinh từ repo root bằng CLI headless. Các file JSONL không chỉnh tay.

| Yêu cầu | Lệnh | Kiểm tra trong output |
|---|---|---|
| Châm đèn đang sáng | `node src/cli.js --seed 31 --night 1 --scenario tests/scenarios/phase-3-refuel.json --inputs tests/inputs/phase-3-interact.json --ticks 1 --snapshot-every 1 --out docs/proof/phase-3/refuel.jsonl` | `refuel` có `amount` và dầu đầy 100 |
| Thắp lại đèn cạn | `node src/cli.js --seed 32 --night 1 --scenario tests/scenarios/phase-3-relight.json --inputs tests/inputs/phase-3-interact.json --ticks 1 --snapshot-every 1 --out docs/proof/phase-3/relight.jsonl` | `lantern_lit` có `relight: true`, dầu 100 |
| Bóng Mực hút dầu | `node src/cli.js --seed 33 --night 1 --scenario tests/scenarios/phase-3-drain.json --ticks 60 --snapshot-every 60 --out docs/proof/phase-3/drain.jsonl` | `fuel_drain` tại tick 60; dầu từ 30 xuống 24 (hao 1 + hút 5) |
| Thắng đủ đèn tại bình minh | `node src/cli.js --seed 34 --night 1 --scenario tests/scenarios/phase-3-dawn-win.json --ticks 60 --snapshot-every 60 --out docs/proof/phase-3/dawn-win.jsonl` | `game_over: won/dawn_survived` |
| Thua thiếu đèn tại bình minh | `node src/cli.js --seed 35 --night 1 --scenario tests/scenarios/phase-3-dawn-loss.json --ticks 60 --snapshot-every 60 --out docs/proof/phase-3/dawn-loss.jsonl` | `game_over: lost/dawn` |

Test tự động cho sức chứa, thứ tự ưu tiên hết lửa, ngưỡng an toàn, điểm và không kết thúc sớm nằm trong `tests/simulation.test.js`. Kết quả phải được chạy lại bằng `npm run verify` trước khi gắn tag.
