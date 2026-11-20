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

const {seed,nights,path}=args(process.argv.slice(2));

// Seeded bot that actually plays (collect motes, refuel/relight lamps, pulse nearby shades) so nights run for most of
// their duration instead of ending after a few seconds of random walking. 10% of decisions are random for variety.
function botInput(sim,rng,state) {
  const snap=sim.snapshot(),p=snap.player,toward=(pos)=>{const dx=pos[0]-p.pos[0],dz=pos[2]-p.pos[2],len=Math.hypot(dx,dz)||1;return [dx/len,dz/len,len];};
  const nearest=(items)=>items.map((item)=>({item,d:Math.hypot(item.pos[0]-p.pos[0],item.pos[2]-p.pos[2])})).sort((a,b)=>a.d-b.d)[0];
  const needy=snap.lanterns.filter((l)=>!l.lit||l.fuel<80),shade=nearest(snap.shades.filter((x)=>x.state!=='stunned'&&x.state!=='spawning'));
  let move=state.wander,interact=false;
  const wantsLamp=needy.length>0&&(p.carried>=(needy.some((l)=>!l.ever_lit)?10:5)||snap.motes.length===0);
  if(wantsLamp){needy.sort((a,b)=>(a.lit-b.lit)||a.fuel-b.fuel);const [x,z,len]=toward(needy[0].pos);move=[x,z];interact=len<1.8;}
  else if(snap.motes.length){const [x,z]=toward(nearest(snap.motes).item.pos);move=[x,z];}
  if(rng()<.1)move=state.wander;
  const pulse=Boolean(shade&&shade.d<3.5&&p.carried>=3&&p.pulse_cd_s<=0);
  return {move,jump:rng()<.01,dash:rng()<.01,pulse,interact};
}
function playNight(sim,rng) {
  const state={wander:[0,0]};let ticks=0;const maxTicks=sim.spec.seconds*TICK_RATE;
  for(;ticks<maxTicks&&sim.state==='playing';ticks++) {
    if(ticks%30===0){const angle=Math.floor(rng()*8)*Math.PI/4;state.wander=[Math.round(Math.sin(angle)),Math.round(-Math.cos(angle))];}
    sim.step(botInput(sim,rng,state));
  }
  return ticks;
}

const started=performance.now(),results=[],ticksPerNight=[];
let memStart=null,memEnd=null,heapStart=null,heapEnd=null,crashes=0;
// Warm the JS runtime and allocator with one unmeasured night before comparing memory.
playNight(new Simulation({seed:seed-1,night:3}),makeRng((seed-1)>>>0));
globalThis.gc?.();
for(let i=1;i<=nights;i++) {
  const night=((i-1)%3)+1,nightSeed=(seed+i-1)>>>0,rng=makeRng(nightSeed);let sim=new Simulation({seed:nightSeed,night});
  if(i===1){globalThis.gc?.();const m=process.memoryUsage();memStart=m.rss/1048576;heapStart=m.heapUsed/1048576;}
  try {
    ticksPerNight.push(playNight(sim,rng));
    results.push(sim.state==='won'?'won':sim.state==='lost'?'lost':'timeout');
  } catch(error) { crashes++;results.push('crash');ticksPerNight.push(0); }
  sim=null;
  if(i===nights){globalThis.gc?.();const m=process.memoryUsage();memEnd=m.rss/1048576;heapEnd=m.heapUsed/1048576;}
}
const r1=(n)=>Math.round(n*10)/10,totalTicks=ticksPerNight.reduce((a,b)=>a+b,0);
const report={nights,crashes,results,ticks_per_night:ticksPerNight,simulated_s:r1(totalTicks/TICK_RATE),mem_start_mb:r1(memStart),mem_end_mb:r1(memEnd),heap_start_mb:r1(heapStart),heap_end_mb:r1(heapEnd),duration_s:r1((performance.now()-started)/1000)};
const json=JSON.stringify(report,null,2)+'\n';
if(path)fs.writeFileSync(path,json,'utf8');else process.stdout.write(json);
