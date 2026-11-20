// Claude Code Stop hook: refuse to end the turn while the test suite is red.
import { spawnSync } from 'node:child_process';
let input = {};
try { input = JSON.parse(await new Promise((resolve) => { let data = ''; process.stdin.on('data', (c) => (data += c)); process.stdin.on('end', () => resolve(data || '{}')); })); } catch {}
if (input.stop_hook_active) process.exit(0); // already blocked once this turn; avoid an endless loop
const run = spawnSync(process.execPath, ['--test'], { encoding: 'utf8', timeout: 120_000 });
if (run.status === 0) process.exit(0);
process.stderr.write(`npm test is failing; fix it or record the failure before finishing.\n${(run.stdout + run.stderr).split('\n').slice(-40).join('\n')}\n`);
process.exit(2);
