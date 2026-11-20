export const TICK_RATE = 60;
export const TICK = 1 / TICK_RATE;
export const CONFIG = Object.freeze({
  playerSpeed: 6, carryCapacity: 10, carryCapacityMax: 20, lanternCost: 10,
  fuelMax: 100, fuelDecayUnitsPerTick: 1, fuelPerMote: 10, relightCost: 5,
  drainUnitsPerTick: 5, lowFuelThreshold: 30, winRatio: 0.6,
  pickupRadius: 1, interactRadius: 2, jumpSpeed: 7, gravity: -20,
  dashSpeed: 14, dashTicks: 12, dashCooldownTicks: 90,
  pulseCost: 3, pulseRadius: 5, pulseCooldownTicks: 180,
  pulseStunTicks: 120, pulsePushTicks: 15, pulsePushDistance: 4,
  hitRadius: 1, hitHeight: 1.5, hitRecoilTicks: 60, hitRecoilDistance: 2,
  invulnTicks: 90, safeRadius: 6, safePushTicks: 30,
  dropTtl: 480, respawnTicks: 60, moteSpawnEvery: 240,
  nights: {
    1: { name: 'Đảo Bến', seconds: 240, shadeSpeed: 4, shadeFirst: 300, shadeEvery: 480, maxShades: 6, lanterns: [[0,0,25],[23.8,0,7.7],[14.7,0,-20.2],[-14.7,0,-20.2],[-23.8,0,7.7]] },
    2: { name: 'Đảo Cau', seconds: 270, shadeSpeed: 4, shadeFirst: 420, shadeEvery: 420, maxShades: 8, lanterns: [[0,0,20],[17,0,-10],[-17,0,-10],[70,0,20],[87,0,-10],[53,0,-10]] },
    3: { name: 'Đảo Chuông', seconds: 300, shadeSpeed: 4.5, shadeFirst: 360, shadeEvery: 360, maxShades: 10, lanterns: [[0,6,6],[18,3,10],[-18,3,10],[35,0,-10],[-35,0,-10],[20,0,-35],[-20,0,-35]] },
  },
  score: { moteDeposited: 5, lanternLit: 100, lanternRelit: 40, pulseHit: 5, pulseDrainHit: 15, dawnLitLantern: 50, flameRemaining: 50 },
});

export function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function round3(n) { return Math.round(n * 1000) / 1000; }
export function distanceXZ(a, b) { return Math.hypot(a[0] - b[0], a[2] - b[2]); }
export function distance3(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
export function pointAt(radius, degrees, cx = 0, cz = 0, y = 0) {
  const r = degrees * Math.PI / 180;
  return [cx + radius * Math.cos(r), y, cz + radius * Math.sin(r)];
}

export function motePoints(night) {
  const pts = [];
  if (night === 1) {
    for (let i = 0; i < 8; i++) pts.push(pointAt(12, i * 45));
    for (let i = 0; i < 16; i++) pts.push(pointAt(33, i * 22.5));
  } else if (night === 2) {
    for (const cx of [0, 70]) {
      for (let i = 0; i < 4; i++) pts.push(pointAt(10, i * 90, cx));
      for (let i = 0; i < 8; i++) pts.push(pointAt(22, i * 45, cx));
    }
  } else {
    for (let i = 0; i < 18; i++) pts.push(pointAt(34, i * 20, 0, 0, 0));
    for (let i = 1; i <= 8; i++) pts.push(pointAt(18, i * 20, 0, 0, 3));
    for (const a of [45,135,225,315]) pts.push(pointAt(5, a, 0, 0, 6));
  }
  return pts;
}

export function shadePoints(night) {
  const pts = [];
  if (night === 1) for (let i = 0; i < 12; i++) pts.push(pointAt(37, 15 + i * 30));
  if (night === 2) for (const cx of [0,70]) for (let i = 0; i < 8; i++) pts.push(pointAt(26, 22.5 + i * 45, cx));
  if (night === 3) for (let i = 0; i < 16; i++) pts.push(pointAt(43, i * 22.5));
  return pts;
}

export function surfaceAt(night, x, z) {
  const r = Math.hypot(x, z);
  if (night === 1) return r <= 40 ? 0 : null;
  if (night === 2) {
    if (Math.hypot(x, z) <= 28 || Math.hypot(x - 70, z) <= 28) return 0;
    if (x >= 26 && x <= 44 && z >= -2 && z <= 2) return 0;
    return null;
  }
  if (r <= 8) return 6;
  if (r >= 12 && r <= 24 && z > 0) return 3;
  // Two three-meter ramps, centered at 30° and 150°.
  for (const angle of [30, 150]) {
    const a = Math.atan2(z, x) * 180 / Math.PI;
    let diff = Math.abs(((a - angle + 540) % 360) - 180);
    if (diff <= Math.atan2(1.5, 30) * 180 / Math.PI && r >= 24 && r <= 30) return Math.max(0, 3 * (30 - r) / 6);
  }
  return r <= 45 ? 0 : null;
}
