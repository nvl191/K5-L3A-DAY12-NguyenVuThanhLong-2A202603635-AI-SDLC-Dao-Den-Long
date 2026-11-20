import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = (name, score, minute) => ({ name, score, nights_won: 1, seed: 7, achieved_at: `2026-11-20T10:${String(minute).padStart(2, '0')}:00+07:00` });
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'lantern-test-'));

test('CLI export ranks the saved leaderboard, drops invalid rows and keeps ten', () => {
  const dir = tmp();
  const rows = [...Array.from({ length: 12 }, (_, i) => entry(`User${i}`, 100 + i, i)), { ...entry('bad name!', 9999, 1) }];
  fs.writeFileSync(path.join(dir, 'leaderboard.json'), JSON.stringify({ entries: rows }));
  const out = path.join(dir, 'out.json');
  const run = spawnSync(process.execPath, [path.join(root, 'src/cli.js'), '--export-leaderboard', out], { cwd: dir, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const { entries } = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(entries.length, 10);
  assert.equal(entries[0].name, 'User11');
  assert.ok(entries.every((e) => e.name !== 'bad name!'));
});

test('CLI export writes an empty list when nothing has been saved', () => {
  const dir = tmp(), out = path.join(dir, 'out.json');
  const run = spawnSync(process.execPath, [path.join(root, 'src/cli.js'), '--export-leaderboard', out], { cwd: dir, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), { entries: [] });
});

test('soak run is deterministic, crash-free and plays most of each night', () => {
  const run = () => JSON.parse(spawnSync(process.execPath, ['--expose-gc', path.join(root, 'src/soak.js'), '--seed', '7', '--nights', '3'], { encoding: 'utf8', cwd: root }).stdout);
  const a = run(), b = run();
  assert.equal(a.crashes, 0);
  assert.equal(a.results.length, 3);
  assert.deepEqual(a.ticks_per_night, b.ticks_per_night);
  assert.deepEqual(a.results, b.results);
  assert.ok(a.simulated_s > 60, 'bot should survive well beyond a random walk');
});

test('static server API stores, ranks and returns the leaderboard', async () => {
  const dir = tmp();
  const port = await new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
  const child = spawn(process.execPath, [path.join(root, 'server.js')], { cwd: dir, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  try {
    const base = `http://127.0.0.1:${port}/api/leaderboard`;
    for (let i = 0; i < 50; i++) { try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
    const post = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entries: [entry('Slow', 500, 5), entry('Fast', 500, 1), entry('Top', 900, 9)] }) });
    assert.equal(post.status, 200);
    const got = await (await fetch(base)).json();
    assert.deepEqual(got.entries.map((e) => e.name), ['Top', 'Fast', 'Slow']);
    assert.equal((await fetch(base, { method: 'POST', body: '{nope' })).status, 400);
  } finally { child.kill('SIGTERM'); }
});
