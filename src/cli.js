#!/usr/bin/env node
import fs from 'node:fs';
import { runSimulation } from './sim/simulation.js';

function parseArgs(argv) {
  const out = {};
  const flags = new Set(['--seed','--night','--scenario','--inputs','--ticks','--out','--snapshot-every']);
  for (let i=0;i<argv.length;i++) {
    const key=argv[i];
    if (!flags.has(key)) throw new Error(`unknown argument: ${key}`);
    if (i+1>=argv.length || argv[i+1].startsWith('--')) throw new Error(`missing value for ${key}`);
    if (out[key] !== undefined) throw new Error(`duplicate argument: ${key}`);
    out[key]=argv[++i];
  }
  return out;
}

function readJson(path,label) {
  if (!path) return null;
  try { return JSON.parse(fs.readFileSync(path,'utf8')); }
  catch (e) { throw new Error(`${label}: ${e.message}`); }
}

function validateInputs(inputs) {
  if (inputs === null) return [];
  if (!inputs || !Array.isArray(inputs.frames)) throw new Error('inputs.frames must be an array');
  let prev=-1;
  for (const [i,f] of inputs.frames.entries()) {
    if (!Number.isInteger(f.tick)||f.tick<0||f.tick<=prev) throw new Error(`inputs.frames[${i}].tick must increase strictly`);
    prev=f.tick;
    if (f.move!==undefined && (!Array.isArray(f.move)||f.move.length!==2||f.move.some((v)=>!Number.isFinite(v)||v < -1||v > 1))) throw new Error(`inputs.frames[${i}].move must be [x,z] in [-1,1]`);
    for (const k of ['jump','interact','pulse','dash','pause']) if(f[k]!==undefined&&typeof f[k]!=='boolean') throw new Error(`inputs.frames[${i}].${k} must be boolean`);
    if (f.cam_yaw_deg!==undefined&&!Number.isFinite(f.cam_yaw_deg)) throw new Error(`inputs.frames[${i}].cam_yaw_deg must be a number`);
  }
  return inputs.frames;
}

function validateScenario(s) {
  if (s === null) return;
  if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('scenario must be a JSON object');
  const pos=(value,label)=>{if(!Array.isArray(value)||value.length!==3||value.some((n)=>!Number.isFinite(n)))throw new Error(`${label} must be a three-number position`);};
  const int=(value,label)=>{if(!Number.isInteger(value)||value<0)throw new Error(`${label} must be a non-negative integer`);};
  for(const key of ['random_motes','random_shades','random_drifters','wind_enabled'])if(s[key]!==undefined&&typeof s[key]!=='boolean')throw new Error(`scenario.${key} must be boolean`);
  if(s.time_left_s!==undefined&&(!Number.isFinite(s.time_left_s)||s.time_left_s<0))throw new Error('scenario.time_left_s must be non-negative');
  if(s.player){if(typeof s.player!=='object'||Array.isArray(s.player))throw new Error('scenario.player must be an object');if(s.player.pos!==undefined)pos(s.player.pos,'scenario.player.pos');for(const key of ['carried','flames','invuln_ticks','dash_cd_ticks','pulse_cd_ticks','charm_ticks','successful_lights'])if(s.player[key]!==undefined)int(s.player[key],`scenario.player.${key}`);if(s.player.grounded!==undefined&&typeof s.player.grounded!=='boolean')throw new Error('scenario.player.grounded must be boolean');}
  if(s.motes!==undefined){if(!Array.isArray(s.motes))throw new Error('scenario.motes must be an array');for(const [i,m] of s.motes.entries()){const p=Array.isArray(m)?m:m?.pos;pos(p,`scenario.motes[${i}].pos`);if(!Array.isArray(m)&&m.kind!==undefined&&!['random','dropped'].includes(m.kind))throw new Error(`scenario.motes[${i}].kind must be random or dropped`);if(!Array.isArray(m)&&m.ttl_s!==undefined&&(!Number.isFinite(m.ttl_s)||m.ttl_s<0))throw new Error(`scenario.motes[${i}].ttl_s must be non-negative`);}}
  for(const [key,states] of [['shades',['spawning','wander','chase','recoil','stunned','drain']],['drifters',['idle','chase','flee','removed']]])if(s[key]!==undefined){if(!Array.isArray(s[key]))throw new Error(`scenario.${key} must be an array`);for(const [i,item] of s[key].entries()){if(!item||typeof item!=='object'||Array.isArray(item))throw new Error(`scenario.${key}[${i}] must be an object`);pos(item.pos,`scenario.${key}[${i}].pos`);if(item.state!==undefined&&!states.includes(item.state))throw new Error(`scenario.${key}[${i}].state is invalid`);if(item.state_ticks_left!==undefined)int(item.state_ticks_left,`scenario.${key}[${i}].state_ticks_left`);if(key==='drifters'&&item.stolen!==undefined)int(item.stolen,`scenario.${key}[${i}].stolen`);if(key==='shades'&&item.target_lantern_id!==undefined&&typeof item.target_lantern_id!=='string')throw new Error(`scenario.shades[${i}].target_lantern_id must be a string`);}}
  if(s.lanterns!==undefined){if(!Array.isArray(s.lanterns))throw new Error('scenario.lanterns must be an array');for(const [i,l] of s.lanterns.entries()){if(!l||typeof l!=='object'||Array.isArray(l)||typeof l.id!=='string')throw new Error(`scenario.lanterns[${i}] requires an id`);if(l.pos!==undefined)pos(l.pos,`scenario.lanterns[${i}].pos`);if(l.lit!==undefined&&typeof l.lit!=='boolean')throw new Error(`scenario.lanterns[${i}].lit must be boolean`);if(l.ever_lit!==undefined&&typeof l.ever_lit!=='boolean')throw new Error(`scenario.lanterns[${i}].ever_lit must be boolean`);if(l.fuel!==undefined&&(!Number.isFinite(l.fuel)||l.fuel<0||l.fuel>100))throw new Error(`scenario.lanterns[${i}].fuel must be from 0 to 100`);if(l.deposited!==undefined)int(l.deposited,`scenario.lanterns[${i}].deposited`);if(l.relit_count!==undefined)int(l.relit_count,`scenario.lanterns[${i}].relit_count`);}}
  if(s.charms!==undefined){if(!Array.isArray(s.charms))throw new Error('scenario.charms must be an array');for(const [i,ch] of s.charms.entries()){if(!ch||typeof ch!=='object'||Array.isArray(ch))throw new Error(`scenario.charms[${i}] must be an object`);pos(ch.pos,`scenario.charms[${i}].pos`);if(ch.available!==undefined&&typeof ch.available!=='boolean')throw new Error(`scenario.charms[${i}].available must be boolean`);}}
}

try {
  const a=parseArgs(process.argv.slice(2));
  const int=(key,fallback)=>{
    const v=a[key]===undefined?fallback:Number(a[key]);
    if(!Number.isInteger(v)||v<0) throw new Error(`${key} must be a non-negative integer`);
    return v;
  };
  const seed=a['--seed']===undefined?1:Number(a['--seed']);
  if(!Number.isInteger(seed))throw new Error('--seed must be an integer');
  const night=int('--night',1), ticks=int('--ticks',0), every=int('--snapshot-every',10);
  if (![1,2,3].includes(night)) throw new Error('--night must be 1, 2, or 3');
  if (every===0) throw new Error('--snapshot-every must be greater than 0');
  const scenario=readJson(a['--scenario'],'invalid scenario');
  const input=readJson(a['--inputs'],'invalid inputs');
  validateScenario(scenario);
  const frames=validateInputs(input);
  const lines=runSimulation({seed,night,scenario,frames,ticks,snapshotEvery:every}).map((x)=>JSON.stringify(x)).join('\n')+'\n';
  const target=a['--out'];
  if (!target || target==='-') process.stdout.write(lines);
  else fs.writeFileSync(target,lines,'utf8');
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode=2;
}
