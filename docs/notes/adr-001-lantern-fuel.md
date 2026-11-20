# ADR-001: Mô hình dầu đèn và điều kiện thắng

- **Ngày:** 2026-11-20
- **Trạng thái:** Chấp nhận
- **Bối cảnh:** Ticket-03 thay luật đèn sáng vĩnh viễn và thắng ngay khi mọi đèn sáng. Đèn phải có thể tắt, được châm lại, và cần giữ đủ đèn đến bình minh.

## Quyết định

- Simulation lưu dầu bằng số nguyên `fuelUnits`, trong đó 60 unit = 1 đơn vị dầu. Dầu tự hao 1 unit mỗi tick; mỗi shade `drain` hút thêm 5 unit mỗi tick. Snapshot mới làm tròn đến 0,1. Cách này loại sai số số thực qua các đêm dài và giữ kết quả headless tất định.
- `lit` là trạng thái hiện tại; `ever_lit` và `relit_count` lưu lịch sử. Khi cạn, đèn tắt, `fuelUnits` và `deposited` về 0. Thắp lại tốn 5 mote và đưa dầu về 100; thắp lần đầu cần 10 mote.
- Số lần thắp thành công trong đêm nằm ở người chơi và tăng sức chứa từ 10 thêm 2, tối đa 20. Đèn thiết lập sẵn trong scenario không tăng bộ đếm.
- Đêm chỉ hoàn tất ở bình minh. Hết lửa có ưu tiên cao hơn; nếu còn sống, ngưỡng đèn sáng là `ceil(60% * tổng đèn)`. Không còn kết thúc sớm khi tất cả đèn đều sáng.
- Điểm bình minh phụ thuộc số đèn còn sáng và dầu thực tế cùng số lửa; bỏ thưởng thời gian cũ.

## Hệ quả

- Snapshot và cách tính điểm v1.2 thay đổi có chủ đích. Test Phase 1/2 nào khẳng định thắng `all_lit` được thay bằng kiểm tra không thắng sớm và `dawn_survived`; không dùng skip.
- Renderer trình bày dầu và trạng thái, nhưng không điều khiển mô phỏng. Màu dễ phân biệt bổ sung màu xanh lam, biểu tượng cảnh báo và hình dáng khác nhau cho đèn tắt.
