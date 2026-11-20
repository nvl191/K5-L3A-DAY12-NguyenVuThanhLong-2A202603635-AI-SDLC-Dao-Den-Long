# Changelog

## Phase 3 — Contract 1.2

### Breaking changes

- Thời lượng đổi thành 240/270/300 giây cho ba đêm.
- Đèn sáng có dầu và có thể tắt; snapshot mỗi đèn thêm `fuel`, `ever_lit`, `relit_count`; `player` thêm `capacity`; shade có trạng thái `drain`.
- `all_lit` không còn là điều kiện thắng; `game_over.reason` khi thắng bình minh là `dawn_survived`, khi thiếu đèn là `dawn`.
- Công thức điểm thay đổi: mỗi mote +5, thắp đầu +100, thắp lại +40, hút dầu trúng Tỏa Sáng +15, bình minh cộng điểm theo dầu và lửa; không còn thưởng thời gian.
- Thêm event `refuel`, `lantern_out`, `fuel_drain`; `lantern_lit` thêm `relight`.
- Test thắng sớm cũ được thay bằng test giữ đèn đến bình minh và kiểm tra ngưỡng thắng/thua; không bỏ qua âm thầm.
