import test from 'node:test';
import assert from 'node:assert/strict';
import { runSimulation, Simulation } from '../src/sim/simulation.js';

function event(lines,name) { return lines.find((x)=>x.type==='event'&&x.name===name); }

test('same seed, scenario, and inputs produce identical JSONL objects',()=>{
  const opts={seed:42,night:1,ticks:600,snapshotEvery:60,scenario:{random_motes:false,random_shades:false,motes:[[0,0,1]]},frames:[{tick:0,move:[0,1]}]};
  assert.deepEqual(runSimulation(opts),runSimulation(opts));
});

test('tick model starts at snapshot zero and ends with requested count',()=>{
  const lines=runSimulation({seed:1,night:1,ticks:5,snapshotEvery:2});
  assert.equal(lines[0].tick,0);
  assert.deepEqual(lines.at(-1),{type:'end',ticks:5,state:'playing',score:0});
  assert.deepEqual(lines.filter((x)=>x.type==='snapshot').map((x)=>x.tick),[0,2,4]);
});

test('scenario mote is picked up on the next simulation tick',()=>{
  const lines=runSimulation({seed:1,night:1,ticks:1,snapshotEvery:1,scenario:{random_motes:false,random_shades:false,motes:[[0,0,0]]}});
  assert.equal(event(lines,'mote_picked').tick,1);
  assert.equal(lines.find((x)=>x.type==='snapshot'&&x.tick===1).player.carried,1);
});

test('interaction deposits only into nearest unlit lantern and reports standard score',()=>{
  const sim=new Simulation({seed:1,night:1,scenario:{random_motes:false,random_shades:false,player:{pos:[0,0,23],carried:10}}});
  sim.step({interact:true});
  const snapshot=sim.snapshot();
  assert.equal(snapshot.lanterns[0].lit,true);
  assert.equal(snapshot.score,150);
  assert.equal(snapshot.lanterns[0].fuel,100);
  assert.equal(sim.drainEvents().filter((e)=>e.name==='lantern_lit').length,1);
});

test('pulse spends three motes and stuns a shade within three-dimensional radius',()=>{
  const sim=new Simulation({seed:9,night:1,scenario:{random_motes:false,random_shades:false,player:{carried:4},shades:[{id:'S8',pos:[0,1,3],state:'chase'}]}});
  sim.step({pulse:true});
  const snap=sim.snapshot();
  assert.equal(snap.player.carried,1);
  assert.equal(snap.shades[0].state,'stunned');
  assert.equal(snap.score,5);
});

test('pause advances wall tick but freezes simulation time',()=>{
  const sim=new Simulation({seed:1,night:1});
  sim.step({pause:true});
  assert.equal(sim.tick,1); assert.equal(sim.simTick,0); assert.equal(sim.state,'paused');
  sim.step({pause:false}); sim.step({pause:true});
  assert.equal(sim.tick,3); assert.equal(sim.simTick,0); assert.equal(sim.state,'playing');
});

test('fall costs a flame even while invulnerable and ends immediately at zero',()=>{
  const lines=runSimulation({seed:1,night:1,ticks:2,snapshotEvery:1,scenario:{random_motes:false,random_shades:false,player:{pos:[0,-10.1,0],flames:1,invuln_ticks:50}}});
  const hit=event(lines,'player_hit');
  assert.equal(hit.data.by,'fall');
  assert.deepEqual(lines.at(-1),{type:'end',ticks:1,state:'lost',score:0});
});

test('night contract v1.2 has the three specified duration and lantern counts',()=>{
  for (const [night,seconds,count] of [[1,240,5],[2,270,6],[3,300,7]]) {
    const snapshot=runSimulation({seed:1,night,ticks:0})[0];
    assert.equal(snapshot.time_left_s,seconds);
    assert.equal(snapshot.lanterns.length,count);
  }
});

test('dash uses the normalized travel direction, lasts twelve ticks, and starts its cooldown',()=>{
  const sim=new Simulation({seed:3,night:1,scenario:{random_motes:false,random_shades:false}});
  sim.step({move:[0,1],dash:true});
  const s=sim.snapshot();
  assert.ok(Math.abs(s.player.pos[2]-14/60)<1e-3);
  assert.equal(s.player.dash_cd_s,1.5);
  assert.ok(sim.drainEvents().some((e)=>e.name==='dash'));
});

test('wind charm is collectible and removes dash cooldown while active',()=>{
  const sim=new Simulation({seed:5,night:2,scenario:{random_motes:false,random_shades:false,player:{pos:[35,0,0],dash_cd_ticks:80},charms:[{id:'C1',pos:[35,0,0]}]}});
  sim.step({dash:false});
  sim.step({dash:true});
  const snapshot=sim.snapshot();
  assert.equal(snapshot.player.charm_s,9.983);
  assert.equal(snapshot.player.dash_cd_s,0);
  assert.equal(snapshot.charms[0].available,false);
  assert.ok(sim.drainEvents().some((e)=>e.name==='charm_picked'));
});

test('drifter steals before a shade hit and keeps stolen motes when fleeing',()=>{
  const sim=new Simulation({seed:8,night:2,scenario:{random_motes:false,random_shades:false,player:{carried:5},drifters:[{id:'D1',pos:[0,0,1.25],state:'chase'}]}});
  sim.step();
  const s=sim.snapshot();
  assert.equal(s.player.carried,2);
  assert.equal(s.drifters[0].state,'flee');
  assert.equal(s.drifters[0].stolen,3);
  assert.ok(sim.drainEvents().some((e)=>e.name==='drifter_steal'));
});

test('night two springboards launch toward the other island',()=>{
  const sim=new Simulation({seed:1,night:2,scenario:{random_motes:false,random_shades:false,player:{pos:[20,0,18]}}});
  sim.step();
  const s=sim.snapshot();
  assert.equal(s.player.grounded,false);
  assert.equal(s.player.vel[0],24);
  assert.equal(s.player.vel[1],14);
});

test('night three wind warns for two seconds and blows for five seconds',()=>{
  const sim=new Simulation({seed:17,night:3,scenario:{random_motes:false,random_shades:false}});
  for(let i=0;i<1800;i++)sim.step();
  assert.equal(sim.snapshot().wind.active,false);
  for(let i=0;i<120;i++)sim.step();
  assert.equal(sim.snapshot().wind.active,true);
  for(let i=0;i<300;i++)sim.step();
  assert.equal(sim.snapshot().wind.active,false);
});

test('scenario flags suppress random scheduled pickups and shades',()=>{
  const lines=runSimulation({seed:4,night:1,ticks:800,snapshotEvery:800,scenario:{random_motes:false,random_shades:false,motes:[],shades:[]}});
  const final=lines.find((x)=>x.type==='snapshot'&&x.tick===800);
  assert.equal(final.motes.length,0);
  assert.equal(final.shades.length,0);
});

test('shade schedule creates two stable ids at tick 300',()=>{
  const lines=runSimulation({seed:2,night:1,ticks:300,snapshotEvery:300,scenario:{random_motes:false}});
  const eventLines=lines.filter((x)=>x.type==='event'&&x.name==='shade_spawned');
  assert.deepEqual(eventLines.map((x)=>x.data.id),['S1','S2']);
  assert.ok(eventLines.every((x)=>x.tick===300));
});

test('every night spawns two shades at tick 300, then one per night interval (Ticket-02)',()=>{
  for(const [night,every] of [[1,480],[2,420],[3,360]]){
    const lines=runSimulation({seed:2,night,ticks:300+every,snapshotEvery:1000,scenario:{random_motes:false,random_drifters:false,wind_enabled:false}});
    const spawns=lines.filter((x)=>x.type==='event'&&x.name==='shade_spawned');
    assert.deepEqual(spawns.map((x)=>x.tick),[300,300,300+every],`night ${night}`);
    assert.deepEqual(spawns.map((x)=>x.data.id),['S1','S2','S3']);
  }
});

test('pulse returns every stolen mote with dropped kind and next-tick availability',()=>{
  const sim=new Simulation({seed:6,night:2,scenario:{random_motes:false,random_shades:false,player:{carried:3},drifters:[{id:'D1',pos:[0,0,2],state:'flee',stolen:3}]}});
  sim.step({pulse:true});
  const snapshot=sim.snapshot();
  assert.equal(snapshot.motes.filter((m)=>m.kind==='dropped').length,3);
  assert.ok(snapshot.motes.every((m)=>m.ttl_s===2));
  assert.equal(snapshot.drifters.length,0);
  assert.ok(sim.drainEvents().some((e)=>e.name==='drifter_drop'&&e.data.amount===3));
});

test('night three ledges cannot be walked up and release the player when stepped off',()=>{
  const blocked=new Simulation({seed:1,night:3,scenario:{random_motes:false,random_shades:false,player:{pos:[0,0,11.9]}}});
  blocked.step({move:[0,1]});
  assert.equal(blocked.snapshot().player.pos[1],0);
  const edge=new Simulation({seed:1,night:3,scenario:{random_motes:false,random_shades:false,player:{pos:[0,3,23.95]}}});
  edge.step({move:[0,1]});
  assert.equal(edge.snapshot().player.grounded,false);
});

test('lit lantern fuel decays exactly one unit per second and emits out at zero',()=>{
  const sim=new Simulation({seed:1,night:1,scenario:{random_motes:false,random_shades:false,player:{pos:[0,0,-10]},lanterns:[{id:'L1',lit:true,fuel:2}]}});
  for(let i=0;i<60;i++)sim.step();
  assert.equal(sim.snapshot().lanterns[0].fuel,1);
  for(let i=0;i<60;i++)sim.step();
  assert.equal(sim.snapshot().lanterns[0].lit,false);
  assert.equal(sim.snapshot().lanterns[0].fuel,0);
  assert.ok(sim.drainEvents().some((e)=>e.name==='lantern_out'&&e.data.lantern_id==='L1'));
});

test('refueling a lit lantern uses ceiling mote units, scores five each, and fills without overflow',()=>{
  const sim=new Simulation({seed:1,night:1,scenario:{random_motes:false,random_shades:false,player:{pos:[0,0,23],carried:1},lanterns:[{id:'L1',lit:true,fuel:99.9}]}});
  sim.step({interact:true});
  const s=sim.snapshot();
  assert.equal(s.lanterns[0].fuel,100);assert.equal(s.player.carried,0);assert.equal(s.score,5);
  assert.ok(sim.drainEvents().some((e)=>e.name==='refuel'&&e.data.amount===1&&e.data.fuel===100));
});

test('relighting costs five motes and grows capacity by two',()=>{
  const sim=new Simulation({seed:1,night:1,scenario:{random_motes:false,random_shades:false,player:{pos:[0,0,23],carried:5},lanterns:[{id:'L1',ever_lit:true}]}});
  sim.step({interact:true});
  const s=sim.snapshot();
  assert.equal(s.lanterns[0].lit,true);assert.equal(s.lanterns[0].fuel,100);assert.equal(s.lanterns[0].relit_count,1);
  assert.equal(s.player.capacity,12);assert.equal(s.player.carried,0);assert.equal(s.score,65);
  assert.ok(sim.drainEvents().some((e)=>e.name==='lantern_lit'&&e.data.relight===true));
});

test('a dark lantern first lit requires all ten motes and awards first-light score',()=>{
  const sim=new Simulation({seed:1,night:1,scenario:{random_motes:false,random_shades:false,player:{pos:[0,0,23],carried:9}}});
  sim.step({interact:true});
  assert.equal(sim.snapshot().lanterns[0].lit,false);assert.equal(sim.snapshot().player.carried,9);
  sim.step({interact:false});sim.step({interact:true});
  assert.equal(sim.snapshot().lanterns[0].lit,false);
  // Releasing E before pressing again does not change the insufficient-fuel result.
  assert.equal(sim.snapshot().score,0);
});

test('shade drains a weak lamp by five per second and reports the 60-tick event',()=>{
  const sim=new Simulation({seed:1,night:1,scenario:{random_motes:false,random_shades:false,player:{pos:[0,0,-10]},lanterns:[{id:'L1',lit:true,fuel:30}],shades:[{id:'S1',pos:[0,0,24],state:'drain',target_lantern_id:'L1'}]}});
  for(let i=0;i<60;i++)sim.step();
  assert.equal(sim.snapshot().lanterns[0].fuel,24);
  assert.ok(sim.drainEvents().some((e)=>e.name==='fuel_drain'&&e.data.shade_id==='S1'&&e.data.fuel===24));
});

test('wandering shade targets the nearest weak lamp and starts draining within two meters',()=>{
  const sim=new Simulation({seed:1,night:1,scenario:{random_motes:false,random_shades:false,player:{pos:[0,0,-10]},lanterns:[{id:'L1',lit:true,fuel:29.9}],shades:[{id:'S1',pos:[0,0,23.5],state:'wander'}]}});
  sim.step();
  assert.equal(sim.snapshot().shades[0].state,'drain');
  assert.equal(sim.snapshot().shades[0].target_lantern_id,'L1');
});

test('pulse on a draining shade awards fifteen points and ends drain state',()=>{
  const sim=new Simulation({seed:1,night:1,scenario:{random_motes:false,random_shades:false,player:{pos:[0,0,23],carried:3},lanterns:[{id:'L1',lit:true,fuel:20}],shades:[{id:'S1',pos:[0,1,24],state:'drain',target_lantern_id:'L1'}]}});
  sim.step({pulse:true});
  assert.equal(sim.snapshot().shades[0].state,'stunned');assert.equal(sim.snapshot().score,15);
});

test('refueling a weak lamp above thirty ends its shade drain and restores safety',()=>{
  const sim=new Simulation({seed:1,night:1,scenario:{random_motes:false,random_shades:false,player:{pos:[0,0,23],carried:1},lanterns:[{id:'L1',lit:true,fuel:25}],shades:[{id:'S1',pos:[0,0,24],state:'drain',target_lantern_id:'L1'}]}});
  sim.step({interact:true});
  assert.ok(sim.snapshot().lanterns[0].fuel>=30);
  assert.equal(sim.snapshot().shades[0].state,'wander');
  assert.equal(sim.shades[0].safePushTicks,29); // current tick already performs the first safe-zone push
});

test('inventory grows to twenty at most and only picks up within the current capacity',()=>{
  const sim=new Simulation({seed:1,night:1,scenario:{random_motes:false,random_shades:false,player:{carried:19,successful_lights:99},motes:[[0,0,0]]}});
  sim.step();assert.equal(sim.snapshot().player.capacity,20);assert.equal(sim.snapshot().player.carried,20);
});

test('dawn score includes fuel and flames but no time bonus',()=>{
  const sim=new Simulation({seed:1,night:1,scenario:{random_motes:false,random_shades:false,time_left_s:1,player:{pos:[0,0,-10],flames:2},lanterns:[{id:'L1',lit:true,fuel:40.5},{id:'L2',lit:true},{id:'L3',lit:true}]}});
  for(let i=0;i<60;i++)sim.step();
  assert.equal(sim.state,'won');assert.equal(sim.score,487);
});

test('all lamps lit does not end early; dawn requires ceil of sixty percent lit',()=>{
  const all=new Simulation({seed:1,night:1,scenario:{random_motes:false,random_shades:false,lanterns:[1,2,3,4,5].map(i=>({id:`L${i}`,lit:true}))}});
  all.step();assert.equal(all.state,'playing');
  const make=(lit,flames=3)=>new Simulation({seed:1,night:1,scenario:{random_motes:false,random_shades:false,time_left_s:1,player:{pos:[0,0,-10],flames},lanterns:Array.from({length:lit},(_,i)=>({id:`L${i+1}`,lit:true}))}});
  const pass=make(3);for(let i=0;i<60;i++)pass.step();assert.equal(pass.state,'won');assert.equal(pass.drainEvents().find((e)=>e.name==='game_over').data.reason,'dawn_survived');
  const fail=make(2);for(let i=0;i<60;i++)fail.step();assert.equal(fail.state,'lost');assert.equal(fail.drainEvents().find((e)=>e.name==='game_over').data.reason,'dawn');
  const dead=make(3,0);dead.step();assert.equal(dead.state,'lost');assert.equal(dead.drainEvents().find((e)=>e.name==='game_over').data.reason,'no_flames');
});
