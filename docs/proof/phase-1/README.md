# Bằng chứng Phase 1

Sinh bằng lệnh tại repo root (cần chạy `npm ci` trước). Không sửa tay JSONL.

| Yêu cầu | Scenario | Cách chạy | Kỳ vọng |
|---|---|---|---|
| Nhặt đom đóm | `tests/scenarios/collect-one.json` | `node src/cli.js --seed 7 --night 1 --scenario tests/scenarios/collect-one.json --ticks 1 --snapshot-every 1 --out docs/proof/phase-1/collect-one.jsonl` | Có `mote_picked`, sức mang 1 |
| Tỏa sáng làm choáng | `tests/scenarios/pulse.json` + `tests/inputs/pulse.json` | `node src/cli.js --seed 7 --night 1 --scenario tests/scenarios/pulse.json --inputs tests/inputs/pulse.json --ticks 2 --snapshot-every 1 --out docs/proof/phase-1/pulse.jsonl` | Có `pulse`, S1 chuyển `stunned` |
| Thua do rơi khi đang bất tử | `tests/scenarios/fall-no-flames.json` | `node src/cli.js --seed 7 --night 1 --scenario tests/scenarios/fall-no-flames.json --ticks 1 --out docs/proof/phase-1/fall.jsonl` | Có `player_hit: fall`, `game_over: lost/no_flames` |
| Tính tất định | pulse scenario/input chạy hai lần | So sánh hai JSONL sinh từ cùng lệnh | Nội dung giống hệt |

`win.jsonl` trong thư mục này là đầu ra lịch sử của contract 1.1 trước Ticket-03. Ticket-03 thay luật thắng sớm; bằng chứng thắng theo contract hiện tại nằm ở [proof Phase 3](../phase-3/README.md). Các JSONL lịch sử không được xem là bằng chứng cho contract 1.2.

Các JSONL chỉ được xem là bằng chứng sau khi sinh và xem lại trên đúng phiên bản mã nguồn. Ảnh/clip game web được bổ sung sau kiểm tra trình duyệt.
