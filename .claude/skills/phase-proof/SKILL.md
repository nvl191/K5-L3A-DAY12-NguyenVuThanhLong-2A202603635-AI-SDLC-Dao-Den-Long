---
name: phase-proof
description: Regenerate Phase 4 evidence (bench, soak, screenshots) from the current code and check it before tagging. Use before any commit that touches rendering, soak, leaderboard or contract files.
---

1. `npm run verify` must pass (tests, build, deterministic JSONL, full-night time).
2. `npm run bench -- --seed 42 --duration 30 --out docs/proof/phase-4/bench.json` (Chrome, 1280x720, vsync off; needs a GPU, `BENCH_SOFTWARE_GL=1` forces SwiftShader for comparison).
3. `npm run soak -- --seed 7 --nights 10 --out docs/proof/phase-4/soak.json`.
4. Do not hand-edit the JSON. `load_ms` must be positive and `crashes` 0; copy the numbers into `docs/proof/phase-4/README.md` only after the run.
5. State anything that failed or was not measured (for example `peak_mem_mb: null`) in the proof README.
