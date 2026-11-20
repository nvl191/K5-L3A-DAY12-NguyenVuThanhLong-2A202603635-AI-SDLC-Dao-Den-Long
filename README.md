# Day 12 — AI SDLC: Đảo Đèn Lồng

> **Cá nhân** (1 người / 1 MSSV) · Áp dụng SDLC cùng AI để xây game 3D qua 4 phase.
> **Lab board + trợ giảng:** [Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)
> **Video demo:** _chưa quay_ — sẽ đính kèm Release `v1.0.0` hoặc lưu tại `docs/demo/demo.mp4`, rồi thay dòng này bằng link.

## Game

**Đảo Đèn Lồng** là game phiêu lưu 3D góc nhìn thứ ba chạy trong trình duyệt. Mây gom đom đóm, thắp và châm dầu cho đèn, rồi giữ đủ đèn sáng tới bình minh qua ba hòn đảo.

## Chạy game

Yêu cầu Node.js 20.19+.

Clone repo sạch và chạy đúng 3 lệnh để build, mở game:

```bash
npm ci
npm run build
npm start
```

Mở `http://localhost:4173`. Leaderboard lưu trong `leaderboard.json` tại máy này, ngoài repo. Trong lúc phát triển, dùng `npm run dev`.

Điều khiển: `W A S D` di chuyển theo hướng camera, rê chuột xoay camera, `Space` nhảy, `Shift` lướt, `E` tương tác/châm dầu, `Q` Tỏa Sáng, `P` hoặc `Esc` tạm dừng. Cài đặt lưu âm lượng, độ nhạy chuột và bảng màu dễ phân biệt trên trình duyệt hiện tại.

## Kiểm tra, headless và benchmark

```bash
npm run verify
node src/cli.js --seed 7 --night 1 --scenario tests/scenarios/phase-3-dawn-win.json --ticks 60 --snapshot-every 60 --out /tmp/dawn.jsonl
npm run bench -- --seed 42 --duration 30 --out bench.json
npm run soak -- --seed 7 --nights 10 --out soak.json
npm run start -- --export-leaderboard out.json
```

Headless chạy mô phỏng JavaScript thuần ở 60 tick/giây. Cùng seed, scenario và inputs tạo JSONL giống hệt. Benchmark mở Chrome ở 1280×720 với GPU thật, dùng cảnh chuẩn 200 Bóng Mực, 100 đom đóm và 3 đèn, bỏ 3 giây khởi động rồi đo đủ thời lượng; báo cáo ghi kèm cấu hình máy (`machine`) và tên GPU. Cờ tắt vsync được truyền cho Chrome; `BENCH_SOFTWARE_GL=1` ép render phần mềm để so sánh. `peak_mem_mb` là `null` vì bản web không thể tách RSS của tiến trình renderer ổn định trên các hệ điều hành. Benchmark trên máy chấm mới là số liệu nghiệm thu. Soak test chạy 10 đêm bằng bot có seed (nhặt đom đóm, châm dầu, Tỏa Sáng) và báo số tick mỗi đêm, bộ nhớ đầu/cuối. Contract là [v1.3](game.contract.json); xem [bằng chứng Phase 1](docs/proof/phase-1/README.md), [Phase 3](docs/proof/phase-3/README.md) và [Phase 4](docs/proof/phase-4/README.md).

## Tài liệu của lab

| File | Nội dung |
|---|---|
| [GUIDE.md](GUIDE.md) | Vòng làm việc theo phase, harness và kiểm chứng |
| [CHECKPOINTS.md](CHECKPOINTS.md) | Các mốc tự kiểm tra |
| [SUBMISSION.md](SUBMISSION.md) | Repo, hạn tag, Release, video và checklist |
| [RULES.md](RULES.md) | Quy định AI, bằng chứng, bản quyền và bảo mật |
| [RUBRIC.md](RUBRIC.md) | Thang điểm |
| [AGENTS.md](AGENTS.md) | Hướng dẫn dành cho agent trong repo (kèm hook Stop, skill `phase-proof` trong `.claude/`, CI trong `.github/workflows/`) |

## Tài liệu dự án

- PRD-0 và giả định: [Phase 1](docs/notes/phase-1.md).
- Ticket-02: [Phase 2](docs/notes/phase-2.md).
- Ticket-03, dầu đèn và luật bình minh: [Phase 3](docs/notes/phase-3.md), [ADR-001](docs/notes/adr-001-lantern-fuel.md), [changelog](docs/CHANGELOG.md).
- Ticket-04, benchmark, ổn định, leaderboard và accessibility: [Phase 4](docs/notes/phase-4.md), [retro](docs/notes/retro.md).
- Nhật ký dùng AI: [ai-log.md](docs/notes/ai-log.md).
- Nguồn và giấy phép: [CREDITS.md](CREDITS.md), [LICENSE](LICENSE).

## Sáng tạo của tôi

Đồ họa procedural low-poly, ánh sáng vàng ấm đối lập sương xanh tím, HUD dạng kính mờ, menu chuyện kể và hiệu ứng âm thanh tổng hợp được tạo bằng code. Chế độ màu dễ phân biệt, vết rách hình dạng trên đèn tắt và thanh dầu trên đèn là trình bày giao diện; logic headless vẫn là nguồn sự thật. Ảnh chụp cảnh và menu: [bench-scene.png](docs/proof/phase-4/bench-scene.png), [menu.png](docs/proof/phase-4/menu.png).

## Lab và lộ trình

Bài lab cá nhân áp dụng SDLC để làm game 3D qua 4 phase. Công nghệ tự chọn, chạy trên macOS hoặc Linux và tuân theo Test Contract headless.

| Phase | Đầu vào | Bàn giao |
|---|---|---|
| 1 | PRD-0 và Test Contract | Tag `phase-1` |
| 2 | Ticket-02 | Tag `phase-2` |
| 3 | Ticket-03 | Tag `phase-3` |
| 4 | Ticket-04 | Tag `phase-4`, Release `v1.0.0` và video demo |

Lab kéo dài 4 giờ: Phase 1–2 khoảng 1 giờ, Phase 3 khoảng 30 phút, Phase 4 khoảng 1 giờ 30 phút. Hết giờ mỗi phase thì gắn tag và chuyển tiếp; yêu cầu chưa đạt phải ghi trung thực trong bằng chứng.

| Mốc | Sự kiện | Hạn |
|---|---|---|
| 0h | Phase 1 phát hành | `phase-1` trước 1h |
| 1h | Phase 2 phát hành | `phase-2` trước 2h |
| 2h | Phase 3 phát hành | `phase-3` trước 2h30 |
| 2h30 | Phase 4 phát hành | `phase-4`, Release `v1.0.0` và video trước 4h |
| 4h | Kết thúc lab | Chốt bài |

## Gợi ý SDLC (cách làm là của bạn)

Mỗi phase là một vòng nhỏ. Đây là gợi ý, không bắt buộc đúng thứ tự:

1. **Requirements:** biến yêu cầu thành tiêu chí nghiệm thu kiểm chứng được; ghi giả định ở chỗ mơ hồ.
2. **Plan:** nghĩ cách kiểm chứng trước khi để agent viết code.
3. **Build:** điều phối agent, chia việc nhỏ và review diff.
4. **Verify:** chạy thật, kiểm tra hành vi và lưu bằng chứng.
5. **Evaluate:** ghi yêu cầu đạt/chưa đạt, lỗi AI và cải tiến harness.
6. **Release:** gắn tag đúng hạn.

## Ba điều cần nhớ

> Có thể sáng tạo quanh phần lõi (nhân vật, cơ chế nhỏ, câu chuyện, hiệu ứng, âm thanh) nếu không phá yêu cầu; ghi mục “Sáng tạo của tôi” và bằng chứng ngắn ở README.

- Game tốt là game đúng yêu cầu, không phải game phức tạp hay đẹp nhất. Làm đúng và chứng minh được trước, trau chuốt sau.
- Cân nhắc quota token. Ngữ cảnh gọn, kế hoạch rõ, kiểm chứng sớm thường tiết kiệm hơn chạy agent liên tục.
- Kiểm chứng là phần quan trọng nhất: test, headless output, ảnh và số đo đáng tin hơn lời mô tả.

## Bàn giao cuối cùng

Repo public cần có mã nguồn qua các phase, tag `phase-1` đến `phase-4`, Release `v1.0.0`, video `.mp4` dưới 5 phút, bằng chứng từng phase, harness AI, ghi chú spec/giả định và nhật ký token/chi phí. Không commit API key, token hoặc `.env`. Xem checklist đầy đủ trong [SUBMISSION.md](SUBMISSION.md).

## Đánh giá (100 điểm)

| Hạng mục | Điểm |
|---|---:|
| Test tự động ẩn (headless, gồm kiểm tra lại phase trước) | 30 |
| Kiểm chứng và bằng chứng | 20 |
| Quy trình SDLC và harness AI | 15 |
| Evaluation và retro (gồm cách dùng token) | 10 |
| Hiệu năng và ổn định | 10 |
| Chất lượng sản phẩm (đúng yêu cầu, chơi được) | 10 |
| Video demo | 5 |

## Quy định

- Được dùng AI; không sao chép repo của người khác.
- Bằng chứng phải thật và khớp mã ở tag tương ứng; không sửa tay output.
- Nhân vật, bối cảnh là bản gốc của lab. Asset bên ngoài phải có giấy phép phù hợp và ghi trong [CREDITS.md](CREDITS.md).
