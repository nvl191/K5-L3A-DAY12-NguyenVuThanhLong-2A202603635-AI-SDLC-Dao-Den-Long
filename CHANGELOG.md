# Changelog

## Phase 1 — Contract 1.0 (PRD-0)

- Màn Đêm 1 – Đảo Bến: Mây gom đom đóm, nạp 10 đom đóm để thắp 5 đèn, Bóng Mực đuổi và chạm làm mất Ngọn Lửa, Tỏa Sáng làm choáng.
- Thắng khi mọi đèn sáng, thua khi hết Ngọn Lửa hoặc hết giờ; có điểm, HUD, chơi lại.
- Headless `node src/cli.js` theo Test Contract v1.0 (JSONL tất định, tick 60 Hz, mã thoát 2 khi file đầu vào sai); `game.contract.json` khai báo số tuning.

## Phase 2 — Contract 1.1 (Ticket-02)

### Breaking changes

- Số liệu chuẩn thay mọi giá trị tự chọn ở Phase 1 (di chuyển, nhảy, nhặt, Tỏa Sáng, Bóng Mực, điểm); bản đồ Đêm 1 được chuẩn hóa lại.
- `--night` nhận 1, 2, 3; snapshot thêm `night`, `wind`, `player.{vel,grounded,invuln,dash_cd_s,pulse_cd_s,charm_s}` và các mảng `motes`, `drifters`, `charms`.
- Trạng thái Bóng Mực đổi tên chuẩn: `spawning`, `wander`, `chase`, `recoil`, `stunned`.

### Thêm mới

- Hai đêm mới (Đảo Cau, Đảo Chuông), Lướt, Gió Lạc, Bùa Gió, bục nhảy, gió mạnh Đêm 3, tạm dừng, cài đặt lưu, âm thanh, HUD đầy đủ.
- Sự kiện `dash`, `charm_picked`, `drifter_steal`, `drifter_drop`, `night_start`, `paused`, `resumed`.

## Phase 3 — Contract 1.2

### Breaking changes

- Thời lượng đổi thành 240/270/300 giây cho ba đêm.
- Đèn sáng có dầu và có thể tắt; snapshot mỗi đèn thêm `fuel`, `ever_lit`, `relit_count`; `player` thêm `capacity`; shade có trạng thái `drain`.
- `all_lit` không còn là điều kiện thắng; `game_over.reason` khi thắng bình minh là `dawn_survived`, khi thiếu đèn là `dawn`.
- Công thức điểm thay đổi: mỗi mote +5, thắp đầu +100, thắp lại +40, hút dầu trúng Tỏa Sáng +15, bình minh cộng điểm theo dầu và lửa; không còn thưởng thời gian.
- Thêm event `refuel`, `lantern_out`, `fuel_drain`; `lantern_lit` thêm `relight`.
- Test thắng sớm cũ được thay bằng test giữ đèn đến bình minh và kiểm tra ngưỡng thắng/thua; không bỏ qua âm thầm.

## Phase 4 — Contract 1.3

### Breaking changes

- Hợp đồng phát hành tăng từ 1.2 lên 1.3; `game.contract.json` bổ sung `bench_cmd` và `soak_cmd`.
- Thêm lệnh export bảng xếp hạng JSON; lưu trữ cục bộ có thêm file `leaderboard.json` ngoài git, không đổi output mô phỏng headless.
- `run_cmd` là `node server.js` (máy chủ static Node có API leaderboard, nhận `--export-leaderboard out.json`); `bench_cmd` và `soak_cmd` là phần lệnh gốc để giảng viên nối thêm tham số; lệnh phát triển Vite giữ nguyên.
- Chữ UI tối thiểu 18 px ở 1280×720.
- Cấu hình accessibility mới lưu đổi phím, giảm chuyển động và chữ lớn trên thiết bị.
- Soak dùng input ngẫu nhiên đúng Ticket-04; báo cáo soak đúng sáu trường của đặc tả. Báo cáo benchmark thêm trường `machine`.
- Sửa theo Ticket-02 khi rà soát cuối: Bóng Mực của cả ba đêm sinh 2 con tại tick 300 rồi 1 con mỗi khoảng sinh của đêm (trước đó Đêm 2 và 3 bắt đầu ở tick 420 và 360 với 1 con); đây là thay đổi hành vi headless có chủ đích.
- Sửa `load_ms` âm trong benchmark; cải thiện hiệu năng render cảnh nhiều thực thể (xem `docs/proof/phase-4/README.md`).
