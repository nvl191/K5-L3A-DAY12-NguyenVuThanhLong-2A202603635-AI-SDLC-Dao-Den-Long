import { CONFIG, TICK, TICK_RATE, distance3, distanceXZ, makeRng, motePoints, pointAt, round3, shadePoints, surfaceAt } from './config.js';

const vec = (v, fallback = [0, 0, 0]) => Array.isArray(v) && v.length === 3 ? v.map(Number) : [...fallback];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const idCompare = (a,b) => {
  const [ap,an]=String(a).match(/^(\D+)(\d+)$/)?.slice(1)??[String(a),0];
  const [bp,bn]=String(b).match(/^(\D+)(\d+)$/)?.slice(1)??[String(b),0];
  return ap.localeCompare(bp)||Number(an)-Number(bn);
};

export class Simulation {
  constructor({ seed = 1, night = 1, scenario = null } = {}) {
    if (![1, 2, 3].includes(Number(night))) throw new Error('night must be 1, 2, or 3');
    this.seed = Number(seed) >>> 0;
    this.night = Number(night);
    this.spec = CONFIG.nights[this.night];
    this.rng = makeRng(this.seed);
    this.randomMotes = true;
    this.randomShades = true;
    this.tick = 0;
    this.simTick = 0;
    this.timeLeftTicks = this.spec.seconds*TICK_RATE;
    this.state = 'playing';
    this.score = 0;
    this.events = [];
    this.nextMote = 1;
    this.nextShade = 1;
    this.nextDrifter = 1;
    this.input = { move: [0,0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
    this.previousButtons = { jump: false, interact: false, pulse: false, dash: false, pause: false };
    this.player = { pos: [0,0,0], vel: [0,0,0], flames: 3, carried: 0, successfulLights: 0, grounded: true, invuln: 0, dashCd: 0, pulseCd: 0, charmTicks: 0, dashTicks: 0, recoilTicks: 0, recoilDir: [0,0], respawnTicks: 0, hasFallen: false, springVel: null, facing: [0,1] };
    this.lanterns = this.spec.lanterns.map((pos, i) => ({ id: `L${i + 1}`, pos: [...pos], lit: false, fuelUnits: 0, ever_lit: false, relit_count: 0, deposited: 0 }));
    this.motes = [];
    this.shades = [];
    this.drifters = [];
    this.charms = [];
    this.wind = { active: false, dir_deg: 0, strength: 0 };
    this.windDir = this.rng() * 360;
    this.windWarn = 0;
    this._seedInitialEntities();
    if (scenario) this.applyScenario(scenario);
    this._emit('night_start',{night:this.night});
  }

  _seedInitialEntities() {
    const pts = motePoints(this.night);
    for (const p of pts.slice(0, this.night === 1 ? 20 : pts.length)) this._addMote(p, 'random', 0);
    const charms = this.night === 2 ? [[35,0,0]] : this.night === 3 ? [[30,0,25],[-30,0,25]] : [];
    this.charms = charms.map((pos, i) => ({ id: `C${i + 1}`, pos, available: true, respawnAt: null }));
  }

  _addMote(pos, kind = 'random', availableTick = this.simTick) {
    const m = { id: `M${this.nextMote++}`, pos: [...pos], kind, expiresAt: kind === 'dropped' ? this.simTick + CONFIG.dropTtl : null, availableTick };
    this.motes.push(m);
    return m;
  }

  applyScenario(s) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('scenario must be a JSON object');
    if (s.random_motes === false) this.randomMotes = false;
    if (s.random_shades === false) this.randomShades = false;
    if (s.player) {
      if (s.player.pos) this.player.pos = vec(s.player.pos);
      if (s.player.vel) this.player.vel = vec(s.player.vel);
      if (Number.isFinite(s.player.carried)) this.player.carried = Math.max(0, Math.floor(s.player.carried));
      if (Number.isFinite(s.player.successful_lights)) this.player.successfulLights = Math.max(0, Math.floor(s.player.successful_lights));
      if (Number.isFinite(s.player.flames)) this.player.flames = Math.max(0, Math.floor(s.player.flames));
      this.player.grounded = s.player.grounded ?? true;
      this.player.invuln = Math.max(0, Math.floor(s.player.invuln_ticks ?? 0));
      this.player.dashCd = Math.max(0, Math.floor(s.player.dash_cd_ticks ?? 0));
      this.player.pulseCd = Math.max(0, Math.floor(s.player.pulse_cd_ticks ?? 0));
      this.player.charmTicks = Math.max(0, Math.floor(s.player.charm_ticks ?? 0));
      this.player.carried=Math.min(this.player.carried,this.capacity);
    }
    if (Number.isFinite(s.time_left_s)) this.timeLeftTicks = Math.max(0,Math.round(s.time_left_s*TICK_RATE));
    if (Array.isArray(s.lanterns)) for (const patch of s.lanterns) {
      const l = this.lanterns.find((x) => x.id === patch.id);
      if (!l) continue;
      if (patch.pos) l.pos = vec(patch.pos);
      if (Number.isFinite(patch.deposited)) l.deposited = Math.max(0, Math.floor(patch.deposited));
      if (Number.isFinite(patch.fuel)) l.fuelUnits = clamp(Math.round(patch.fuel * TICK_RATE),0,CONFIG.fuelMax*TICK_RATE);
      if (patch.lit === true) {
        l.lit = true;
        if (!Number.isFinite(patch.fuel)) l.fuelUnits = CONFIG.fuelMax*TICK_RATE;
        if (!Number.isFinite(patch.deposited)) l.deposited = CONFIG.lanternCost;
      }
      if (patch.lit === false) { l.lit = false; l.fuelUnits = 0; }
      l.ever_lit = patch.ever_lit ?? (patch.lit === true);
      l.relit_count = Math.max(0,Math.floor(patch.relit_count??0));
    }
    if (Array.isArray(s.motes)) {
      this.motes = [];
      this.nextMote = 1;
      for (const entry of s.motes) {
        const pos = Array.isArray(entry) ? entry : entry?.pos;
        if (!Array.isArray(pos) || pos.length !== 3 || pos.some((n) => !Number.isFinite(n))) throw new Error('invalid mote in scenario');
        const m = this._addMote(pos, entry?.kind ?? 'random', this.simTick);
        if (!Array.isArray(entry) && entry.id) m.id = String(entry.id);
        if (!Array.isArray(entry) && Number.isFinite(entry.ttl_s)) m.expiresAt = this.simTick + Math.round(entry.ttl_s * TICK_RATE);
      }
    }
    if (s.random_motes === false && !Array.isArray(s.motes)) this.motes = [];
    if (Array.isArray(s.shades)) {
      this.shades = s.shades.map((entry, i) => ({
        id: entry.id ?? `S${i + 1}`, pos: vec(entry.pos, [10,0,0]), state: entry.state ?? 'chase', targetLanternId:entry.target_lantern_id??null,
        stateTicks: Math.max(0, Math.floor(entry.state_ticks_left ?? 0)), recoilTicks: 0,
        stunTicks: entry.state === 'stunned' ? Math.max(0, Math.floor(entry.state_ticks_left ?? CONFIG.pulseStunTicks)) : 0,
        pushTicks: 0, pushDir: [0,0], safePushTicks: 0, drainTicks:0,
      }));
      this.nextShade = Math.max(0,...this.shades.map((x)=>Number(String(x.id).match(/\d+$/)?.[0]??0)))+1;
    } else if (s.random_shades === false) this.shades = [];
    if (Array.isArray(s.drifters)) {
      this.drifters = s.drifters.map((d, i) => ({ id: d.id ?? `D${i + 1}`, pos: vec(d.pos), state: d.state ?? 'idle', stolen: Math.max(0, Math.floor(d.stolen ?? 0)), ticks: Math.max(0, Math.floor(d.state_ticks_left ?? 0)), activeTick: 0 }));
      this.nextDrifter = Math.max(0,...this.drifters.map((x)=>Number(String(x.id).match(/\d+$/)?.[0]??0)))+1;
    }
    if (Array.isArray(s.charms)) this.charms = s.charms.map((c, i) => ({ id: c.id ?? `C${i + 1}`, pos: vec(c.pos), available: c.available ?? true, respawnAt: c.available === false ? 2700 : null }));
    if (s.wind_enabled === false) this.windDisabled = true;
    if (s.random_drifters === false) this.driftersDisabled = true;
    if (s.state === 'paused') this.state = 'paused';
  }

  setInput(frame = {}) {
    const next = { ...this.input };
    if (frame.move !== undefined) next.move = frame.move.map((v) => clamp(Number(v) || 0, -1, 1));
    if (frame.cam_yaw_deg !== undefined) next.cam_yaw_deg = Number(frame.cam_yaw_deg) || 0;
    for (const key of ['jump','interact','pulse','dash','pause']) if (frame[key] !== undefined) next[key] = Boolean(frame[key]);
    this.input = next;
  }

  _emit(name, data = {}) { this.events.push({ type: 'event', tick: this.tick, name, data }); }
  _fuel(l) { return Math.round((l.fuelUnits/TICK_RATE)*10)/10; }
  drainEvents() { const e = this.events; this.events = []; return e; }
  get nightComplete() { return this.state === 'won'; }
  get capacity() { return Math.min(CONFIG.carryCapacityMax,CONFIG.carryCapacity+2*this.player.successfulLights); }

  _stepCounters() {
    this.timeLeftTicks = Math.max(0,this.timeLeftTicks-1);
    for (const key of ['invuln','dashCd','pulseCd','charmTicks','dashTicks','recoilTicks','respawnTicks']) this.player[key] = Math.max(0, this.player[key] - 1);
    if (this.player.hasFallen && this.player.respawnTicks === 0 && this.player.flames > 0) {
      this.player.pos = [0, 0, 0]; this.player.vel = [0, 0, 0]; this.player.grounded = true;
      this.player.hasFallen = false; this.player.springVel = null;
    }
    this.motes = this.motes.filter((m) => m.expiresAt === null || this.simTick <= m.expiresAt);
    for (const s of this.shades) {
      if (s.stateTicks > 0) s.stateTicks--;
      if (s.stunTicks > 0) { s.stunTicks--; if (s.stunTicks === 0 && s.state === 'stunned') { s.state = 'wander'; s.targetLanternId=null; } }
    }
    // Store fuel in 1/60-unit ticks so passive loss (1/s) and shade drain (5/s)
    // remain exact integers for deterministic headless runs.
    for(const l of this.lanterns) if(l.lit) l.fuelUnits=Math.max(0,l.fuelUnits-CONFIG.fuelDecayUnitsPerTick);
    const draining=this.shades.filter((s)=>s.state==='drain'&&s.targetLanternId).sort((a,b)=>idCompare(a.id,b.id));
    for(const s of draining){
      const l=this.lanterns.find((x)=>x.id===s.targetLanternId);
      if(!l?.lit||l.fuelUnits>=CONFIG.lowFuelThreshold*TICK_RATE){s.drainTicks=0;continue;}
      l.fuelUnits=Math.max(0,l.fuelUnits-CONFIG.drainUnitsPerTick);
      s.drainTicks=(s.drainTicks??0)+1;
      if(s.drainTicks%TICK_RATE===0)this._emit('fuel_drain',{lantern_id:l.id,shade_id:s.id,fuel:this._fuel(l)});
    }
    for(const l of this.lanterns)if(l.lit&&l.fuelUnits<=0){l.lit=false;l.deposited=0;l.fuelUnits=0;this._emit('lantern_out',{lantern_id:l.id});}
    for (const d of this.drifters) if (d.ticks > 0) d.ticks--;
    for (const c of this.charms) if (!c.available && c.respawnAt !== null && this.simTick >= c.respawnAt) { c.available = true; c.respawnAt = null; }
    if (this.windWarn > 0) this.windWarn--;
    if (this.night === 3 && !this.windDisabled) {
      const cycle = this.simTick % 1800;
      if (cycle === 0 && this.simTick > 0) { this.windDir = this.rng() * 360; this.windWarn = 120; }
      this.wind.active = cycle >= 120 && cycle < 420;
      this.wind.strength = this.wind.active ? 2 : 0;
      this.wind.dir_deg = this.windDir;
    }
  }

  _worldMove() {
    const p = this.player;
    if (p.pos[1] < -10 && !p.hasFallen) { this._fallHit(); return; }
    if (p.respawnTicks > 0) { p.vel = [0,0,0]; return; }
    const yaw = this.input.cam_yaw_deg * Math.PI / 180;
    let [mx, mz] = this.input.move;
    let len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; len = 1; }
    let dx = mx * Math.cos(yaw) + mz * Math.sin(yaw);
    let dz = -mx * Math.sin(yaw) + mz * Math.cos(yaw);
    if (len > 1e-6) p.facing = [dx / len, dz / len];
    const wasGrounded = p.grounded;
    if (this.input.jump && !this.previousButtons.jump && wasGrounded) { p.vel[1] = CONFIG.jumpSpeed; p.grounded = false; }
    if (this.input.dash && !this.previousButtons.dash && (p.dashCd === 0 || p.charmTicks > 0)) {
      const dir = len > 1e-6 ? [dx, dz] : p.facing;
      const n = Math.hypot(dir[0], dir[1]) || 1;
      p.dashDir = [dir[0] / n, dir[1] / n]; p.dashTicks = CONFIG.dashTicks; p.dashCd = p.charmTicks > 0 ? 0 : CONFIG.dashCooldownTicks;
      this._emit('dash');
    }
    if (p.dashTicks > 0) { dx = p.dashDir[0]; dz = p.dashDir[1]; }
    if (p.recoilTicks > 0) { dx = p.recoilDir[0]; dz = p.recoilDir[1]; }
    const speed = p.dashTicks > 0 ? CONFIG.dashSpeed : p.charmTicks > 0 ? 7.2 : CONFIG.playerSpeed;
    let vx = p.springVel && !p.dashTicks ? p.springVel[0] : dx * speed;
    let vz = p.springVel && !p.dashTicks ? p.springVel[1] : dz * speed;
    if (p.recoilTicks > 0) { const k = CONFIG.hitRecoilDistance / CONFIG.hitRecoilTicks; vx = p.recoilDir[0] * k * TICK_RATE; vz = p.recoilDir[1] * k * TICK_RATE; }
    if (this.wind.active) {
      const a = this.wind.dir_deg * Math.PI / 180;
      vx += Math.cos(a) * 2; vz += Math.sin(a) * 2;
    }
    p.vel[0] = vx; p.vel[2] = vz;
    if (!p.grounded) p.vel[1] += CONFIG.gravity * TICK;
    const next = [p.pos[0] + p.vel[0] * TICK, p.pos[1] + p.vel[1] * TICK, p.pos[2] + p.vel[2] * TICK];
    let surface = surfaceAt(this.night, next[0], next[2]);
    if (this.night === 3 && p.grounded && surface !== null && surface > p.pos[1] + 0.5) surface = 0;
    if (surface !== null && next[1] <= surface && p.vel[1] <= 0) { next[1] = surface; p.vel[1] = 0; p.grounded = true; p.springVel = null; }
    else if (surface !== null && p.grounded && p.pos[1] > surface + 0.5) { p.grounded = false; p.vel[1] = 0; }
    else if (surface === null && p.grounded) { p.grounded = false; p.vel[1] = 0; }
    p.pos = next;
    if (this.night === 2 && wasGrounded && this._onSpring(p.pos)) this._springboard();
    if (p.pos[1] < -10 && !p.hasFallen) this._fallHit();
  }

  _onSpring(pos) {
    if (this.night === 2) return Math.hypot(pos[0] - 20,pos[2] - 18) <= 1 || Math.hypot(pos[0] - 50,pos[2] + 18) <= 1;
    if (this.night === 3) return Math.hypot(pos[0],pos[2] - 13) <= 1 && Math.abs(pos[1] - 3) < 0.5;
    return false;
  }
  _springboard() {
    if (this.night === 2) {
      const toB = this.player.pos[0] < 35;
      this.player.vel = [toB ? 24 : -24, 14, 0]; this.player.springVel = [toB ? 24 : -24, 0];
    } else { this.player.vel = [0,12,-8]; this.player.springVel = [0,-8]; }
    this.player.grounded = false;
  }

  _fallHit() {
    this.player.hasFallen = true;
    this.player.flames = Math.max(0, this.player.flames - 1);
    const lost = this.player.carried; this.player.carried = 0;
    this._emit('player_hit', { by: 'fall', flames: this.player.flames, dropped: 0, lost });
    if (this.player.flames === 0) return this._finish('lost','no_flames');
    this.player.respawnTicks = CONFIG.respawnTicks;
    this.player.invuln = CONFIG.invulnTicks;
    this.player.springVel = null;
    this.player.pos = [this.player.pos[0], -10.01, this.player.pos[2]];
    this.player.vel = [0,0,0];
  }

  _collect() {
    const p = this.player;
    if (p.respawnTicks > 0) return;
    for (const m of this.motes) {
      if (m.availableTick > this.simTick || (m.expiresAt !== null && this.simTick > m.expiresAt) || p.carried >= this.capacity) continue;
      const ground = surfaceAt(this.night, m.pos[0], m.pos[2]) ?? m.pos[1];
      if (distanceXZ(p.pos,m.pos) <= CONFIG.pickupRadius && Math.abs(p.pos[1] - ground) <= 1.5) {
        p.carried++; m.expiresAt = -1; this._emit('mote_picked',{carried:p.carried});
      }
    }
    this.motes = this.motes.filter((m) => m.expiresAt === null || this.simTick <= m.expiresAt);
    for (const c of this.charms) if (c.available && distanceXZ(p.pos,c.pos) <= CONFIG.pickupRadius && Math.abs(p.pos[1]-c.pos[1]) <= 1.5) {
      c.available = false; c.respawnAt = this.simTick + 2700; p.charmTicks = 600; this._emit('charm_picked',{charm_id:c.id,charm_ticks:p.charmTicks});
    }
  }

  _interact() {
    if (!this.input.interact || this.previousButtons.interact || this.player.respawnTicks > 0) return;
    const candidates = this.lanterns.filter((l) => (!l.lit || l.fuelUnits<CONFIG.fuelMax*TICK_RATE) && distanceXZ(this.player.pos,l.pos) <= CONFIG.interactRadius).sort((a,b) => distanceXZ(this.player.pos,a.pos)-distanceXZ(this.player.pos,b.pos) || a.id.localeCompare(b.id));
    const l = candidates[0]; if (!l) return;
    const wasLit=l.lit, relight=!wasLit&&l.ever_lit;
    const needed=wasLit?Math.ceil((CONFIG.fuelMax*TICK_RATE-l.fuelUnits)/(CONFIG.fuelPerMote*TICK_RATE)):(relight?CONFIG.relightCost:CONFIG.lanternCost);
    const amount=wasLit?Math.min(this.player.carried,needed):this.player.carried>=needed?needed:0;
    if(amount<=0)return;
    this.player.carried -= amount; l.deposited += amount; this.score += amount * CONFIG.score.moteDeposited;
    l.fuelUnits=wasLit?Math.min(CONFIG.fuelMax*TICK_RATE,l.fuelUnits+amount*CONFIG.fuelPerMote*TICK_RATE):CONFIG.fuelMax*TICK_RATE;
    this._emit('deposit',{lantern_id:l.id,amount,deposited:l.deposited});
    if(wasLit){this._emit('refuel',{lantern_id:l.id,amount,fuel:this._fuel(l)});}
    else {
      l.lit=true;l.ever_lit=true;l.relit_count+=relight?1:0;this.player.successfulLights++;
      this.score+=relight?CONFIG.score.lanternRelit:CONFIG.score.lanternLit;
      this._emit('lantern_lit',{lantern_id:l.id,relight,fuel:this._fuel(l)});
    }
    if(l.lit&&l.fuelUnits>=CONFIG.lowFuelThreshold*TICK_RATE){
      for(const s of this.shades)if(s.state==='drain'&&s.targetLanternId===l.id){s.state='wander';s.targetLanternId=null;}
    }
  }

  _safeZones() {
    for (const s of this.shades) {
      const lit = this.lanterns.filter((l) => l.lit && l.fuelUnits>=CONFIG.lowFuelThreshold*TICK_RATE);
      for (const l of lit) {
        const d = distanceXZ(s.pos,l.pos);
        if (d < CONFIG.safeRadius) {
          const ux=d>1e-6?(s.pos[0]-l.pos[0])/d:1, uz=d>1e-6?(s.pos[2]-l.pos[2])/d:0;
          s.pos[0]=l.pos[0]+ux*CONFIG.safeRadius; s.pos[2]=l.pos[2]+uz*CONFIG.safeRadius;
          s.safePushTicks=CONFIG.safePushTicks;
        }
      }
    }
  }

  _pulse() {
    const p = this.player;
    if (!this.input.pulse || this.previousButtons.pulse || p.pulseCd > 0 || p.carried < CONFIG.pulseCost || p.respawnTicks > 0) return;
    p.carried -= CONFIG.pulseCost; p.pulseCd = CONFIG.pulseCooldownTicks;
    const center = [p.pos[0],p.pos[1]+0.8,p.pos[2]], stunned = [];
    for (const s of this.shades) if (distance3(center,s.pos) <= CONFIG.pulseRadius) {
      const d = distanceXZ(center,s.pos), dir = d > 1e-6 ? [(s.pos[0]-p.pos[0])/d,(s.pos[2]-p.pos[2])/d] : [1,0];
      const wasDraining=s.state==='drain';
      s.state = 'stunned'; s.targetLanternId=null; s.stunTicks = CONFIG.pulseStunTicks; s.stateTicks = CONFIG.pulseStunTicks; s.pushTicks = CONFIG.pulsePushTicks; s.pushDir = dir;
      if(wasDraining)s.drainTicks=0;
      stunned.push(s.id); this.score += wasDraining?CONFIG.score.pulseDrainHit:CONFIG.score.pulseHit;
    }
    const hitDrifters = [];
    for (const d of this.drifters) if (distance3(center,d.pos) <= CONFIG.pulseRadius) {
      if (d.state === 'chase') { d.state='flee'; d.ticks=240; hitDrifters.push(d.id); }
      else if (d.state === 'flee' && d.stolen > 0) {
        for (let i=0;i<d.stolen;i++) { const m=this._addMote([...d.pos], 'dropped', this.simTick + 1); m.expiresAt=this.simTick+120; }
        this._emit('drifter_drop',{drifter_id:d.id,amount:d.stolen}); d.stolen=0; d.state='removed'; d.ticks=120;
      }
    }
    this._emit('pulse',{stunned_ids:stunned});
  }

  _moveShades() {
    const p = this.player;
    for (const s of this.shades) {
      if (s.state === 'recoil' && s.recoilTicks === 0) s.state = 'chase';
      if (s.state === 'stunned' || s.state === 'spawning') { if (s.pushTicks>0) { const step=CONFIG.pulsePushDistance/CONFIG.pulsePushTicks; s.pos[0]+=s.pushDir[0]*step; s.pos[2]+=s.pushDir[1]*step; s.pushTicks--; } if (s.state==='spawning' && s.stateTicks===0) s.state='wander'; continue; }
      if (s.safePushTicks>0) { s.safePushTicks--; continue; }
      const d = distanceXZ(s.pos,p.pos);
      if(s.state==='drain'){
        const target=this.lanterns.find((l)=>l.id===s.targetLanternId);
        if(d<=6){s.state='chase';s.targetLanternId=null;s.drainTicks=0;}
        else if(!target?.lit||target.fuelUnits>=CONFIG.lowFuelThreshold*TICK_RATE||distanceXZ(s.pos,target.pos)>2){s.state='wander';s.targetLanternId=null;s.drainTicks=0;}
        else continue;
      }else if (d <= 12) s.state='chase'; else if (d >= 18) s.state='wander';
      if (p.respawnTicks > 0 || p.hasFallen) continue;
      if (s.state === 'recoil' && s.recoilTicks>0) { const step=CONFIG.hitRecoilDistance/CONFIG.hitRecoilTicks; s.pos[0]+=s.recoilDir[0]*step; s.pos[2]+=s.recoilDir[1]*step; s.recoilTicks--; continue; }
      if (s.state==='chase') {
        const ux=(p.pos[0]-s.pos[0])/(d||1), uz=(p.pos[2]-s.pos[2])/(d||1);
        s.pos[0]+=ux*this.spec.shadeSpeed*TICK; s.pos[2]+=uz*this.spec.shadeSpeed*TICK;
      } else if (s.state==='wander') {
        const weak=this.lanterns.filter((l)=>l.lit&&l.fuelUnits<CONFIG.lowFuelThreshold*TICK_RATE).sort((a,b)=>distanceXZ(s.pos,a.pos)-distanceXZ(s.pos,b.pos)||a.id.localeCompare(b.id));
        const dark=this.lanterns.filter((l)=>!l.lit).sort((a,b)=>distanceXZ(s.pos,a.pos)-distanceXZ(s.pos,b.pos)||a.id.localeCompare(b.id));
        const target=weak[0]??dark[0];s.targetLanternId=target?.id??null;
        if(target){
          const td=distanceXZ(s.pos,target.pos);
          if(weak.length&&td<=2){s.state='drain';continue;}
          const ux=(target.pos[0]-s.pos[0])/(td||1),uz=(target.pos[2]-s.pos[2])/(td||1);
          s.pos[0]+=ux*this.spec.shadeSpeed*TICK;s.pos[2]+=uz*this.spec.shadeSpeed*TICK;
        }else{
          const phase=(Number(String(s.id).match(/\d+$/)?.[0]??1)*1.618 + this.simTick*.004) % (Math.PI*2);
          s.pos[0]+=Math.cos(phase)*TICK;s.pos[2]+=Math.sin(phase)*TICK;
        }
      }
    }
  }

  _moveDrifters() {
    const p=this.player;
    for (const d of this.drifters) {
      if (d.state==='removed') continue;
      if (d.state==='flee') {
        const dist=distanceXZ(p.pos,d.pos)||1, ux=(d.pos[0]-p.pos[0])/dist, uz=(d.pos[2]-p.pos[2])/dist;
        d.pos[0]+=ux*7*TICK; d.pos[2]+=uz*7*TICK;
        if (d.ticks===0) { d.state='removed'; d.stolen=0; }
        continue;
      }
      const dist=distanceXZ(p.pos,d.pos);
      if (p.carried>=5 && dist<=15) d.state='chase'; else if (dist>15) d.state='idle';
      if (d.state==='chase' && p.carried>=5 && dist<=15) { const ux=(p.pos[0]-d.pos[0])/(dist||1), uz=(p.pos[2]-d.pos[2])/(dist||1); d.pos[0]+=ux*7*TICK; d.pos[2]+=uz*7*TICK; }
      else if (d.state==='idle') { d.phase=(d.phase??0)+TICK; d.pos[0]+=Math.cos(d.phase)*2*TICK; d.pos[2]+=Math.sin(d.phase)*2*TICK; }
    }
  }

  _collisions() {
    const p=this.player;
    for (const d of this.drifters) if (d.state==='chase' && d.stolen===0 && distanceXZ(p.pos,d.pos)<=1.2 && p.respawnTicks===0) {
      const amount=Math.min(3,p.carried); p.carried-=amount; d.stolen=amount; d.state='flee'; d.ticks=240; this._emit('drifter_steal',{drifter_id:d.id,amount,carried:p.carried});
    }
    if (p.invuln>0 || p.respawnTicks>0) return;
    const s=this.shades.filter((x)=>x.state!=='stunned' && x.state!=='spawning' && x.safePushTicks===0 && distanceXZ(p.pos,x.pos)<=CONFIG.hitRadius && Math.abs(p.pos[1]-(x.pos[1]-1))<=CONFIG.hitHeight).sort((a,b)=>idCompare(a.id,b.id))[0];
    if (!s) return;
    p.flames=Math.max(0,p.flames-1);
    const dropped=Math.floor(p.carried/2); p.carried-=dropped; p.invuln=CONFIG.invulnTicks; p.recoilTicks=CONFIG.hitRecoilTicks;
    const d=distanceXZ(p.pos,s.pos)||1; p.recoilDir=[(p.pos[0]-s.pos[0])/d,(p.pos[2]-s.pos[2])/d];
    for (let i=0;i<dropped;i++) { const a=(this.rng()*360)*Math.PI/180, r=1.5+this.rng(); this._addMote([p.pos[0]+Math.cos(a)*r,p.pos[1],p.pos[2]+Math.sin(a)*r],'dropped',this.simTick+1); }
    s.state='recoil'; s.recoilDir=[-p.recoilDir[0],-p.recoilDir[1]]; s.recoilTicks=CONFIG.hitRecoilTicks;
    this._emit('player_hit',{by:'shade',flames:p.flames,dropped});
    if(p.flames===0) this._finish('lost','no_flames');
  }

  _spawn() {
    if (this.randomMotes && this.simTick > 0 && this.simTick % CONFIG.moteSpawnEvery === 0 && this.motes.length < 30) {
      const pts=motePoints(this.night), used=new Set(this.motes.map((m)=>`${m.pos[0].toFixed(2)},${m.pos[2].toFixed(2)}`));
      const free=pts.filter((p)=>!used.has(`${p[0].toFixed(2)},${p[2].toFixed(2)}`));
      if (free.length) this._addMote(free[Math.floor(this.rng()*free.length)],'random',this.simTick+1);
    }
    const tick=this.simTick;
    if (this.randomShades && tick >= this.spec.shadeFirst && (tick-this.spec.shadeFirst)%this.spec.shadeEvery===0 && this.shades.length < this.spec.maxShades) {
      const count=tick===this.spec.shadeFirst ? 2 : 1;
      for(let i=0;i<count && this.shades.length<this.spec.maxShades;i++) {
        const pts=shadePoints(this.night).filter((p)=>distanceXZ(p,this.player.pos)>=15);
        if(!pts.length) break;
        const pos=[...pts[Math.floor(this.rng()*pts.length)]]; pos[1]+=1;
        const id=`S${this.nextShade++}`; this.shades.push({id,pos,state:'spawning',stateTicks:1,recoilTicks:0,stunTicks:0,pushTicks:0,pushDir:[0,0],safePushTicks:0,drainTicks:0}); this._emit('shade_spawned',{id});
      }
    }
    if (this.night>=2 && !this.driftersDisabled && tick>0 && tick%1200===0 && this.drifters.filter((d)=>d.state!=='removed').length<2) {
      const a=this.rng()*Math.PI*2, pos=[Math.cos(a)*(this.night===3?39:25),this.night===3?1:0,Math.sin(a)*(this.night===3?39:25)];
        const id=`D${this.nextDrifter++}`; this.drifters.push({id,pos,state:'idle',stolen:0,ticks:0,activeTick:tick});
    }
  }

  _finish(state, reason) {
    if (this.state==='won' || this.state==='lost') return;
    this.state=state;
    if (state==='won') {
      this.score+=this.player.flames*CONFIG.score.flameRemaining;
      for(const l of this.lanterns)if(l.lit)this.score+=CONFIG.score.dawnLitLantern+Math.floor(l.fuelUnits/TICK_RATE);
    }
    this._emit('game_over',{result:state,reason});
  }

  step(frame = null) {
    if (frame) this.setInput(frame);
    if (this.state==='won'||this.state==='lost') { this.tick++; return; }
    this.tick++;
    const justPaused=this.input.pause&&!this.previousButtons.pause;
    if (justPaused) {
      this.state=this.state==='paused'?'playing':'paused';
      this._emit(this.state==='paused'?'paused':'resumed');
      this.previousButtons={jump:this.input.jump,interact:this.input.interact,pulse:this.input.pulse,dash:this.input.dash,pause:this.input.pause};
      return;
    }
    if(this.state==='paused') { this.previousButtons={...this.previousButtons,pause:this.input.pause}; return; }
    this.simTick++;
    this._stepCounters();
    this._worldMove();
    this._collect();
    this._interact();
    this._safeZones();
    this._pulse();
    this._moveShades();
    this._moveDrifters();
    this._collisions();
    this._spawn();
    if(this.state==='playing') {
      if(this.player.flames<=0) this._finish('lost','no_flames');
      else if(this.timeLeftTicks<=0) {
        const required=Math.ceil(CONFIG.winRatio*this.lanterns.length),lit=this.lanterns.filter((l)=>l.lit).length;
        this._finish(lit>=required?'won':'lost',lit>=required?'dawn_survived':'dawn');
      }
    }
    this.previousButtons={jump:this.input.jump,interact:this.input.interact,pulse:this.input.pulse,dash:this.input.dash,pause:this.input.pause};
  }

  snapshot() {
    return {
      type:'snapshot',tick:this.tick,sim_tick:this.simTick,state:this.state,night:this.night,
      time_left_s:round3(this.timeLeftTicks/TICK_RATE),score:this.score,
      player:{pos:this.player.pos.map(round3),vel:this.player.vel.map(round3),flames:this.player.flames,carried:this.player.carried,capacity:this.capacity,grounded:this.player.grounded,invuln:round3(this.player.invuln/TICK_RATE),dash_cd_s:round3(this.player.dashCd/TICK_RATE),pulse_cd_s:round3(this.player.pulseCd/TICK_RATE),charm_s:round3(this.player.charmTicks/TICK_RATE)},
      lanterns:this.lanterns.map((l)=>({id:l.id,pos:l.pos.map(round3),lit:l.lit,deposited:l.deposited,fuel:l.lit?this._fuel(l):0,ever_lit:l.ever_lit,relit_count:l.relit_count})),
      shades:this.shades.map((s)=>({id:s.id,pos:s.pos.map(round3),state:s.state,...(s.targetLanternId?{target_lantern_id:s.targetLanternId}:{})})),
      motes:this.motes.map((m)=>({id:m.id,pos:m.pos.map(round3),kind:m.kind,ttl_s:m.expiresAt===null?null:round3(Math.max(0,m.expiresAt-this.simTick)/TICK_RATE)})),motes_active:this.motes.length,
      drifters:this.drifters.filter((d)=>d.state!=='removed').map((d)=>({id:d.id,pos:d.pos.map(round3),state:d.state,stolen:d.stolen})),
      charms:this.charms.map((c)=>({id:c.id,available:c.available,respawn_s:c.respawnAt===null?null:round3(Math.max(0,c.respawnAt-this.simTick)/TICK_RATE)})),
      wind:{active:this.wind.active,dir_deg:round3(this.wind.dir_deg)},
    };
  }
}

export function runSimulation({seed=1,night=1,scenario=null,frames=[],ticks=0,snapshotEvery=10}) {
  if (!Number.isInteger(ticks)||ticks<0) throw new Error('ticks must be a non-negative integer');
  if (!Number.isInteger(snapshotEvery)||snapshotEvery<=0) throw new Error('snapshot-every must be a positive integer');
  const sim=new Simulation({seed,night,scenario});
  const out=[sim.snapshot(),...sim.drainEvents()];
  let fi=0, held={};
  for(let k=0;k<ticks;k++) {
    while(fi<frames.length && frames[fi].tick===k) { held={...held,...frames[fi]}; delete held.tick; fi++; }
    sim.step(held);
    out.push(...sim.drainEvents());
    if(sim.tick%snapshotEvery===0) out.push(sim.snapshot());
    if(sim.state==='won'||sim.state==='lost') break;
  }
  out.push({type:'end',ticks:sim.tick,state:sim.state,score:sim.score});
  return out;
}
