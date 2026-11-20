# Changelog

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
- `run_cmd` chuyển sang máy chủ static Node có API leaderboard (`npm run start`); lệnh phát triển Vite giữ nguyên.
- Cấu hình accessibility mới lưu đổi phím, giảm chuyển động và chữ lớn trên thiết bị.
- Không đổi output mô phỏng headless. Báo cáo benchmark thêm trường `machine`; báo cáo soak thêm `ticks_per_night`, `simulated_s`, `heap_start_mb`, `heap_end_mb`.
- Sửa `load_ms` âm trong benchmark; cải thiện hiệu năng render cảnh nhiều thực thể (xem `docs/proof/phase-4/README.md`).
