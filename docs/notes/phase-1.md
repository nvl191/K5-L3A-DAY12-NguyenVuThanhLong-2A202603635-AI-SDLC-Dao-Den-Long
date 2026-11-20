# Phase 1 — PRD-0: giả định và tiêu chí nghiệm thu

## Phạm vi

Một màn chơi Đêm 1 – Đảo Bến: Mây thu thập đom đóm, nạp 5 đèn, tránh Bóng Mực và có thể dùng Tỏa Sáng. Bàn giao có game web 3D, headless theo Test Contract, README, harness và bằng chứng.

## Giả định đã chọn (các số được khai báo trong `game.contract.json`)

- Đảo là đĩa tròn bán kính 40 m; vị trí chuẩn của Mây và 5 đèn theo bản đồ Phase 2.
- Mỗi đèn cần 10 đom đóm; sức chứa 10; nhặt trong 1 m; nạp trong 2 m.
- Mây có 3 Ngọn Lửa, 300 giây, tốc độ 6 m/s; Bóng Mực tốc độ 4 m/s.
- Tỏa Sáng tốn 3 đom đóm, tầm 5 m, hồi chiêu 3 giây; choáng 2 giây.
- Bị chạm mất 1 lửa, làm rơi một nửa số đom đóm đang mang (làm tròn xuống), bất tử 1.5 giây.
- Điểm: +10 mỗi đom đóm nạp, +100 mỗi đèn thắp, +5 mỗi Bóng Mực trúng Tỏa Sáng; thắng cộng 2 điểm/giây còn lại và 50 điểm/lửa còn.
- Phần hình ảnh tự tạo bằng hình học/material procedural; không dùng tài sản ngoài.

## Acceptance criteria

| Yêu cầu | Kiểm chứng | Bằng chứng |
|---|---|---|
| Chạy game 3D trên macOS/Linux | Mở trang bằng Vite, quan sát scene/camera/HUD | Ảnh hoặc clip Phase 1 |
| Di chuyển, nhảy, nhặt, nạp đèn | Chơi thủ công và scenario headless | JSONL và ảnh |
| Bóng Mực đuổi, chạm gây sát thương; Tỏa Sáng làm choáng | Scenario có enemy và pulse/hit | JSONL event/snapshot |
| Thắng/thua, điểm, chơi lại | Scenario victory, dawn, no_flames và nút replay | JSONL + clip |
| Contract hợp lệ và tất định | Chạy scenario/input giống nhau hai lần, so byte output | `docs/proof/phase-1/` |

## Kết quả

Được cập nhật sau khi kiểm chứng chạy thật. Không đánh dấu đạt trước khi bằng chứng được sinh từ mã ở tag tương ứng.
