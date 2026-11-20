import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

function run(command,args,options={}){
  const result=spawnSync(command,args,{encoding:'utf8',maxBuffer:32*1024*1024,timeout:options.timeout??120_000});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status})\n${result.stdout}${result.stderr}`);
  return result.stdout;
}

run('npm',['test']);
run('npm',['run','build']);
const common=['src/cli.js','--seed','2026','--night','1','--scenario','tests/scenarios/pulse.json','--inputs','tests/inputs/pulse.json','--ticks','240','--snapshot-every','10','--out','-'];
const a=run(process.execPath,common),b=run(process.execPath,common);
if(a!==b)throw new Error('Headless determinism check failed: repeated output differed');
const lines=a.trim().split('\n').map((line)=>JSON.parse(line));
if(lines[0]?.type!=='snapshot'||lines.at(-1)?.type!=='end'||!lines.some((x)=>x.type==='event'&&x.name==='pulse'))throw new Error('Headless output contract check failed');
const start=performance.now();
run(process.execPath,['src/cli.js','--seed','2026','--night','3','--ticks','18000','--snapshot-every','600','--out','-'],{timeout:30_000});
const seconds=(performance.now()-start)/1000;
if(seconds>30)throw new Error(`Full-night headless run exceeded 30 seconds (${seconds.toFixed(2)}s)`);
process.stdout.write(`verify passed: tests, build, deterministic JSONL, full night ${seconds.toFixed(2)}s\n`);
