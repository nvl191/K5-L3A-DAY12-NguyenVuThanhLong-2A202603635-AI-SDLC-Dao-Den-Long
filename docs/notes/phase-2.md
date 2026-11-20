# Phase 2 — Ticket-02: Ba hòn đảo

## Acceptance criteria

- Tuning chuẩn từ Ticket-02 được khai báo và dùng thống nhất trong simulation và contract 1.1.
- Headless nhận `--night 1|2|3`, seed, scenario, inputs, ticks, output và snapshot interval; đầu ra tất định, JSONL, kết thúc bằng `end`.
- Ba đêm có đúng thời lượng, hình học đảo, đèn và điểm sinh theo ticket.
- Lướt, Bóng Mực, Gió Lạc, Bùa Gió, gió Đêm 3, pause/resume và thứ tự xử lý được mô phỏng bằng tick 60 Hz.
- UI có menu → intro → chơi → kết quả → đêm kế/Bình Minh; pause, settings được lưu.
- HUD thể hiện lửa, thời gian, đèn, điểm, sức chứa, hồi chiêu, lời nhắc tương tác và chỉ hướng tới đèn.
- Mọi thay đổi đồ họa chỉ trình bày trạng thái simulation; simulation không import renderer/DOM và không dùng đồng hồ thật/ngẫu nhiên không seed.

## Thứ tự tick (Ticket-02)

1. Input/pause; khi pause chỉ tăng `tick`.
2. Giảm bộ đếm.
3. Di chuyển Mây, nhảy/lướt/bục/gió và xử lý rơi.
4. Nhặt đom đóm/bùa.
5. Nạp đèn.
6. Vùng an toàn.
7. Tỏa Sáng.
8. Di chuyển Bóng Mực/Gió Lạc.
9. Gió Lạc cướp trước, sau đó Bóng Mực gây hit theo ID.
10. Spawn; thực thể mới tương tác từ tick kế tiếp.
11. Xét thắng/thua.
12. Snapshot.

## Giả định triển khai

- Trạng thái có thể kiểm thử theo contract là nguồn sự thật duy nhất; 3D renderer nội suy/trình bày trạng thái đó.
- Browser input được đổi thành frame giữ trạng thái theo tick; game headless không phụ thuộc thời gian thực.
- Cài đặt người dùng lưu trong `localStorage`; đây là cài đặt trình duyệt, không đi vào contract.
- Kết quả kiểm chứng và các mục chưa đạt được cập nhật sau khi chạy thực tế.

> Ticket-03/contract 1.2 thay thời lượng, nhiên liệu, điểm và điều kiện thắng của một số luật trong tài liệu này. Các cơ chế Phase 2 không bị thay thế tiếp tục được giữ.
