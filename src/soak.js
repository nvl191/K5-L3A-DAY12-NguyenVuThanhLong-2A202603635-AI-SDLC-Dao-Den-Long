import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { Simulation } from './sim/simulation.js';
import { makeRng, TICK_RATE } from './sim/config.js';

function args(argv) {
  const out={};
  for(let i=0;i<argv.length;i+=2) {
    const key=argv[i];
    if(!['--seed','--nights','--out'].includes(key)||!argv[i+1]||argv[i+1].startsWith('--')) throw new Error(`Invalid soak argument: ${key}`);
    out[key]=argv[i+1];
  }
  const seed=Number(out['--seed']??7),nights=Number(out['--nights']??10);
  if(!Number.isInteger(seed)||!Number.isInteger(nights)||nights<1) throw new Error('seed and nights must be integers; nights must be positive');
  return {seed,nights,path:out['--out']};
}

// Ticket-04 input model: every 30 ticks pick a new direction; each tick 5% jump, 3% dash, 2% pulse, 10% interact.
function playNight(sim,rng) {
  let direction=[0,0];
  const maxTicks=sim.spec.seconds*TICK_RATE;
  for(let tick=0;tick<maxTicks&&sim.state==='playing';tick++) {
    if(tick%30===0) {
      const angle=Math.floor(rng()*8)*Math.PI/4;
      direction=[Math.round(Math.sin(angle)),Math.round(-Math.cos(angle))];
    }
    sim.step({move:direction,jump:rng()<.05,dash:rng()<.03,pulse:rng()<.02,interact:rng()<.10});
  }
}

const {seed,nights,path}=args(process.argv.slice(2));
const started=performance.now(),results=[];
let memStart=null,memEnd=null,crashes=0;
// Warm the JS runtime and allocator with one unmeasured night so RSS growth from JIT and allocator start-up is not read as a leak.
playNight(new Simulation({seed:seed-1,night:3}),makeRng((seed-1)>>>0));
globalThis.gc?.();
for(let i=1;i<=nights;i++) {
  const night=((i-1)%3)+1,nightSeed=(seed+i-1)>>>0,rng=makeRng(nightSeed);let sim=new Simulation({seed:nightSeed,night});
  if(i===1)memStart=process.memoryUsage().rss/1048576;
  try {
    playNight(sim,rng);
    results.push(sim.state==='won'?'won':'lost');
  } catch(error) { crashes++;results.push('crash'); }
  sim=null;globalThis.gc?.();
  if(i===nights)memEnd=process.memoryUsage().rss/1048576;
}
const report={nights,crashes,results,mem_start_mb:Math.round(memStart*10)/10,mem_end_mb:Math.round(memEnd*10)/10,duration_s:Math.round((performance.now()-started)/100)/10};
const json=JSON.stringify(report,null,2)+'\n';
if(path)fs.writeFileSync(path,json,'utf8');else process.stdout.write(json);
