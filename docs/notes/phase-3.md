# Phase 3 — Ticket-03: Đèn cạn dầu

## Acceptance criteria

- Contract là v1.2; Night 1/2/3 kéo dài 240/270/300 giây.
- Đèn lưu nhiên liệu chính xác theo tick; hao 1 đơn vị/giây, hút thêm 5/giây mỗi Bóng Mực drain.
- Đèn cạn dầu tắt, đặt `deposited=0`, giữ lịch sử `ever_lit` và phát `lantern_out`.
- Tương tác chọn đèn nhận được gần nhất theo khoảng cách XZ, hòa thì theo ID. Đèn đầy không nhận tương tác; đèn đang sáng được châm theo số mote cần thiết, đèn cạn dầu thắp lại với 5 mote, đèn chưa từng sáng cần 10.
- Mỗi mote được nạp cho +5; lần thắp đầu +100, thắp lại +40. Đom đóm được nhặt làm tăng sức chứa thêm 2 sau mỗi lần thắp thành công, tối đa 20.
- Đèn dưới 30 dầu mất vùng an toàn. Bóng Mực trạng thái wander nhắm đèn yếu gần nhất, dừng trong 2 m để hút; khi được Tỏa Sáng, châm lên ngưỡng an toàn, hoặc đèn đổi trạng thái thì rời drain.
- Thắng chỉ xét ở bình minh: còn sống và có ít nhất `ceil(0.6 * số đèn)` đèn đang sáng. Hết lửa luôn thua trước. Sáng hết đèn không kết thúc sớm.
- Điểm thắng là `+50 + floor(fuel)` cho mỗi đèn đang sáng và `+50` cho mỗi Ngọn Lửa còn lại; bỏ thưởng theo thời gian.
- Snapshot có `fuel`, `ever_lit`, `relit_count`, `player.capacity`; shade hỗ trợ `drain`; JSONL vẫn tất định.
- Cài đặt màu dễ phân biệt lưu trên trình duyệt; đèn bật/tắt phân biệt thêm bằng hình dạng, đèn dầu yếu nhấp nháy 1 Hz.

## Tick order bổ sung

Ở bước 2, giảm thời gian, tiêu hao dầu của đèn đang sáng và áp dụng hút dầu cho shade đã ở trạng thái `drain`; ngay sau đó tắt đèn cạn dầu. Tiếp tục thứ tự Ticket-02 cho đến bước tương tác. Vùng an toàn ở bước 6 chỉ xét đèn đang sáng có dầu `>=30`. Kết thúc tick: hết lửa thua trước; chỉ khi hết giờ mới xét ngưỡng bình minh.

## Kiểm chứng

Các test mới tập trung vào hao/hút dầu, event theo 60 tick, châm dầu và thắp lại, điểm, tăng sức chứa, vùng an toàn, drain, thắng/thua đúng tick bình minh. Lệnh và JSONL được ghi ở [proof Phase 3](../proof/phase-3/README.md). Test thắng cũ được thay bằng test không thắng sớm và test `dawn_survived`; lý do thay đổi nằm trong [ADR-001](adr-001-lantern-fuel.md).
