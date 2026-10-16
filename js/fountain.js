import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { signTexture, faceNearestRoad } from './propKit.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// WISHING FOUNTAIN: a tiered stone fountain on its own little plaza near
// spawn. Once per in-game day, press E to toss a coin and pick a wish with
// 1-4: Luck (payouts +50% for a while), Health (full heal), Calm (one wanted
// star washes away) or Fortune (a 1-in-20 shot at $500). The coin arcs into
// the pool and the wish comes true when it splashes down.

const WISHES = [
  { key: 'luck', name: 'Luck', icon: '🍀', cost: 25, text: 'payouts +50% for 3 minutes' },
  { key: 'health', name: 'Health', icon: '❤️', cost: 25, text: 'refill health to full' },
  { key: 'calm', name: 'Calm', icon: '🕊️', cost: 100, text: 'one wanted star washes away' },
  { key: 'fortune', name: 'Fortune', icon: '🎲', cost: 10, text: '1 in 20 pays $500' },
];
const LUCK_TIME = 180;      // seconds of boosted payouts (3 in-game hours on the clock)
const LUCK_BOOST = 0.5;     // added to world.payMult while lucky
const FORTUNE_ODDS = 20;
const FORTUNE_PRIZE = 500;
const REACH = 4.6;          // from the fountain centre (the basin is ~3 m across the rim)
const TOSS_TIME = 0.8;
const WATER_Y = 0.5;
const BASIN_R = 2.56;
const FLOOR_COINS = 60;
const SPRAY = 320;
const RIPPLES = 8;
const DROPS = 24;
const FIZZLES = [
  'The fountain gurgles. Nothing happens. Classic fountain.',
  'A pigeon drinks from your wish. Better luck tomorrow.',
  'Your coin joins the others. Somewhere, a city worker smiles.',
  'The water shimmers... and keeps your ten bucks.',
  'Close! (It was not close.)',
  'The fountain says: "new phone, who dis?"',
];

export function initFountain(scene, world, save) {
  const pos = world.city.spawn.clone().add(new THREE.Vector3(-36, 0, 6));
  placeStreetSite(world.city, pos, 4.2, 'wishing-fountain');
  const yaw = faceNearestRoad(world.city, pos); // the plaque faces the street

  const group = new THREE.Group();
  group.position.set(pos.x, 0, pos.z);
  group.rotation.y = yaw;
  scene.add(group);

  const stone = new THREE.MeshStandardMaterial({ color: 0xd6cdb8, roughness: 0.82, side: THREE.DoubleSide });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x9c9384, roughness: 0.9 });
  const paving = new THREE.MeshStandardMaterial({ color: 0xb4ab9a, roughness: 0.95 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.3, metalness: 0.85, emissive: 0x3a2400, emissiveIntensity: 0.4 });
  const water = new THREE.MeshStandardMaterial({ color: 0x2f86b0, roughness: 0.06, metalness: 0.25, transparent: true, opacity: 0.72, emissive: 0x0b3b58, emissiveIntensity: 0.45, depthWrite: false });
  const tile = new THREE.MeshStandardMaterial({ color: 0x1f5a6e, roughness: 0.6 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffd890, emissiveIntensity: 1.2 });
  const add = (geo, mat, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const lathe = (pts, mat, segs = 48) => add(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs), mat, 0, 0, 0);

  // plaza: a round paved apron with a darker kerb ring
  add(new THREE.CylinderGeometry(4.1, 4.15, 0.06, 56), paving, 0, 0.03, 0, false);
  const kerb = add(new THREE.RingGeometry(3.9, 4.12, 56), darkStone, 0, 0.065, 0, false);
  kerb.rotation.x = -Math.PI / 2;

  // the basin: a moulded outer wall, a rolled rim and a tiled pool floor
  lathe([[2.98, 0.06], [3.04, 0.12], [2.96, 0.18], [2.92, 0.55], [3.06, 0.6], [3.1, 0.68], [3.04, 0.75], [2.64, 0.75], [2.58, 0.68], [2.56, 0.2], [0, 0.2]], stone, 64);
  const floor = add(new THREE.CircleGeometry(2.55, 48), tile, 0, 0.21, 0, false);
  floor.rotation.x = -Math.PI / 2;
  const pool = add(new THREE.CircleGeometry(BASIN_R, 64), water, 0, WATER_Y, 0, false);
  pool.rotation.x = -Math.PI / 2;
  pool.renderOrder = 2;

  // the central column: pedestal, a wide middle bowl, a slim shaft, a small
  // top bowl and a gilded finial where the jet comes out
  add(new THREE.CylinderGeometry(0.58, 0.7, 0.36, 24), darkStone, 0, 0.38, 0);
  add(new THREE.CylinderGeometry(0.3, 0.4, 1.0, 20), stone, 0, 0.96, 0);
  for (const y of [0.62, 1.22]) add(new THREE.TorusGeometry(0.38, 0.05, 8, 24), stone, 0, y, 0).rotation.x = Math.PI / 2;
  lathe([[0.28, 1.2], [0.75, 1.32], [1.08, 1.48], [1.17, 1.62], [1.12, 1.66], [1.02, 1.54], [0, 1.5]], stone);
  const midWater = add(new THREE.CircleGeometry(1.03, 40), water, 0, 1.58, 0, false);
  midWater.rotation.x = -Math.PI / 2;
  add(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 16), stone, 0, 1.92, 0);
  lathe([[0.14, 2.24], [0.38, 2.31], [0.54, 2.41], [0.59, 2.53], [0.56, 2.56], [0.5, 2.46], [0, 2.44]], stone, 32);
  const topWater = add(new THREE.CircleGeometry(0.5, 28), water, 0, 2.5, 0, false);
  topWater.rotation.x = -Math.PI / 2;
  add(new THREE.CylinderGeometry(0.06, 0.1, 0.22, 12), gold, 0, 2.62, 0);
  add(new THREE.SphereGeometry(0.11, 16, 12), gold, 0, 2.78, 0);

  // falling-water sheets off each bowl lip, a streaky texture scrolled down
  const streakCanvas = document.createElement('canvas');
  streakCanvas.width = 64; streakCanvas.height = 128;
  const g = streakCanvas.getContext('2d');
  g.clearRect(0, 0, 64, 128);
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 64, w = 1 + Math.random() * 3, a = 0.25 + Math.random() * 0.5;
    const y0 = Math.random() * 128, len = 30 + Math.random() * 90;
    const grad = g.createLinearGradient(0, y0, 0, y0 + len);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, `rgba(235,248,255,${a})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(x, y0, w, len);
    g.fillRect(x, y0 - 128, w, len); // wrap so the texture tiles vertically
  }
  const streaks = new THREE.CanvasTexture(streakCanvas);
  streaks.wrapS = streaks.wrapT = THREE.RepeatWrapping;
  streaks.repeat.set(8, 1);
  const sheetMat = new THREE.MeshBasicMaterial({ map: streaks, color: 0xd8f2ff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  add(new THREE.CylinderGeometry(1.15, 1.34, 1.08, 40, 1, true), sheetMat, 0, 1.04, 0, false).renderOrder = 3;
  add(new THREE.CylinderGeometry(0.57, 0.74, 0.9, 28, 1, true), sheetMat, 0, 2.06, 0, false).renderOrder = 3;

  // little warm uplights set into the rim, and a ring of coins on the pool floor
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    add(new THREE.BoxGeometry(0.16, 0.05, 0.16), lampMat, Math.cos(a) * 2.84, 0.77, Math.sin(a) * 2.84, false);
  }
  const coinGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.018, 14);
  const floorCoins = new THREE.InstancedMesh(coinGeo, gold, FLOOR_COINS);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  for (let i = 0; i < FLOOR_COINS; i++) {
    const r = 0.9 + Math.random() * 1.5, a = Math.random() * Math.PI * 2;
    v.set(Math.cos(a) * r, 0.225, Math.sin(a) * r);
    q.setFromEuler(e.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3));
    floorCoins.setMatrixAt(i, m4.compose(v, q, one));
  }
  group.add(floorCoins);

  // two benches facing the water
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5434, roughness: 0.8 });
  for (const side of [1, -1]) {
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.07, 1.7), wood);
    seat.position.y = 0.46;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 1.7), wood);
    back.position.set(0.22 * side, 0.72, 0);
    bench.add(seat, back);
    for (const z of [-0.7, 0.7]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.44, 0.08), darkStone);
      leg.position.set(0, 0.22, z);
      bench.add(leg);
    }
    bench.position.set(3.55 * side, 0, 0);
    bench.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(bench);
  }

  // the plaque on the street side
  add(new THREE.BoxGeometry(1.5, 0.82, 0.24), darkStone, 0, 0.41, 3.55);
  const plaqueMat = new THREE.MeshBasicMaterial({ map: signTexture('WISHING FOUNTAIN', { fg: '#ffe9a8', bg: '#16302a', accent: '#e8b84a' }), toneMapped: false });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.36), plaqueMat);
  plaque.position.set(0, 0.95, 3.6);
  plaque.rotation.x = -0.35;
  group.add(plaque);
  const plaqueBack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.06), gold);
  plaqueBack.position.set(0, 0.95, 3.565);
  plaqueBack.rotation.x = -0.35;
  group.add(plaqueBack);

  // the basin is solid: you walk round it, not through it
  world.city.colliders.push({ x0: pos.x - 3.0, x1: pos.x + 3.0, z0: pos.z - 3.0, z1: pos.z + 3.0, h: 0.95, roofY: 0.75 });

  // spray particles, in the group's local space
  const sprayPos = new Float32Array(SPRAY * 3);
  const sprayVel = new Float32Array(SPRAY * 3);
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: 0xdcf4ff, size: 0.085, transparent: true, opacity: 0.85, depthWrite: false }));
  spray.frustumCulled = false;
  spray.renderOrder = 4;
  group.add(spray);
  for (let i = 0; i < SPRAY; i++) {
    respawnDrop(sprayPos, sprayVel, i);
    // spread the initial lifetimes so the jets don't all start in step
    const t = Math.random() * 1.0;
    sprayPos[i * 3] += sprayVel[i * 3] * t;
    sprayPos[i * 3 + 1] += sprayVel[i * 3 + 1] * t - 4.9 * t * t;
    sprayPos[i * 3 + 2] += sprayVel[i * 3 + 2] * t;
    if (sprayPos[i * 3 + 1] < WATER_Y) respawnDrop(sprayPos, sprayVel, i);
  }

  // ripple rings on the pool, and droplets thrown up by a coin splash
  const ringGeo = new THREE.RingGeometry(0.8, 1.0, 28);
  const ripples = [];
  for (let i = 0; i < RIPPLES; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xe8f8ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    ring.renderOrder = 3;
    group.add(ring);
    ripples.push({ ring, t: 0, life: 1, size: 1 });
  }
  const dropGeo = new THREE.SphereGeometry(0.04, 6, 4);
  const dropMat = new THREE.MeshBasicMaterial({ color: 0xe0f6ff, transparent: true, opacity: 0.9 });
  const drops = [];
  for (let i = 0; i < DROPS; i++) {
    const d = new THREE.Mesh(dropGeo, dropMat);
    d.visible = false;
    group.add(d);
    drops.push({ mesh: d, vel: new THREE.Vector3(), live: false });
  }

  // the coin you toss
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16), gold);
  coin.visible = false;
  group.add(coin);

  world.fountain = {
    pos, yaw, group, streaks, pool, sprayPos, sprayVel, sprayGeo, ripples, drops, coin, floorCoins,
    state: 'idle',        // idle -> menu -> toss -> idle
    day: save?.fountainDay ?? null,   // dailyDay of the last wish
    wishes: save?.fountainWishes ?? 0,
    pending: -1, tossT: 0,
    tossFrom: new THREE.Vector3(), tossTo: new THREE.Vector3(),
    luckT: 0, luckBoost: 0,
    rippleT: 0, time: 0,
    hud: null,
  };
  floorCoins.count = Math.min(FLOOR_COINS, 24 + world.fountain.wishes);
}

// a new drop from one of the jets: the tall centre jet, overflow off the two
// bowls, or one of eight arcs thrown inward from the rim
function respawnDrop(P, V, i) {
  const k = i * 3, roll = Math.random(), a = Math.random() * Math.PI * 2;
  const c = Math.cos(a), s = Math.sin(a);
  if (roll < 0.38) {            // centre jet
    const out = 0.25 + Math.random() * 1.15, up = 3.1 + Math.random() * 0.8;
    P[k] = c * 0.03; P[k + 1] = 2.84; P[k + 2] = s * 0.03;
    V[k] = c * out; V[k + 1] = up; V[k + 2] = s * out;
  } else if (roll < 0.62) {     // middle bowl overflow
    const out = 0.3 + Math.random() * 0.35;
    P[k] = c * 1.16; P[k + 1] = 1.6; P[k + 2] = s * 1.16;
    V[k] = c * out; V[k + 1] = 0.1 + Math.random() * 0.2; V[k + 2] = s * out;
  } else if (roll < 0.72) {     // top bowl overflow
    const out = 0.2 + Math.random() * 0.25;
    P[k] = c * 0.58; P[k + 1] = 2.52; P[k + 2] = s * 0.58;
    V[k] = c * out; V[k + 1] = 0.1 + Math.random() * 0.15; V[k + 2] = s * out;
  } else {                      // rim arcs: eight nozzles throwing inward
    const n = (Math.random() * 8) | 0, na = (n / 8) * Math.PI * 2;
    const nc = Math.cos(na), ns = Math.sin(na);
    const inward = 1.35 + Math.random() * 0.25, up = 3.0 + Math.random() * 0.35;
    const jit = (Math.random() - 0.5) * 0.12;
    P[k] = nc * 2.5 - ns * jit; P[k + 1] = 0.66; P[k + 2] = ns * 2.5 + nc * jit;
    V[k] = -nc * inward; V[k + 1] = up; V[k + 2] = -ns * inward;
  }
}

function spawnRipple(F, x, z, size, life) {
  const r = F.ripples.find((p) => !p.ring.visible) || F.ripples.reduce((a, b) => (a.t / a.life > b.t / b.life ? a : b));
  r.ring.position.set(x, WATER_Y + 0.01, z);
  r.ring.visible = true;
  r.t = 0; r.life = life; r.size = size;
}

function splash(F, x, z) {
  spawnRipple(F, x, z, 0.9, 1.3);
  spawnRipple(F, x, z, 0.5, 0.8);
  let n = 0;
  for (const d of F.drops) {
    if (d.live) continue;
    const a = Math.random() * Math.PI * 2, out = 0.4 + Math.random() * 0.9;
    d.mesh.position.set(x, WATER_Y + 0.02, z);
    d.vel.set(Math.cos(a) * out, 1.8 + Math.random() * 1.6, Math.sin(a) * out);
    d.mesh.visible = true; d.live = true;
    if (++n >= 12) break;
  }
}

function animateWater(F, dt) {
  F.time += dt;
  F.streaks.offset.y -= dt * 1.4;
  F.pool.position.y = WATER_Y + Math.sin(F.time * 1.7) * 0.006;

  const P = F.sprayPos, V = F.sprayVel;
  for (let i = 0; i < SPRAY; i++) {
    const k = i * 3;
    const py = P[k + 1];
    V[k + 1] -= 9.8 * dt;
    P[k] += V[k] * dt; P[k + 1] += V[k + 1] * dt; P[k + 2] += V[k + 2] * dt;
    if (V[k + 1] >= 0) continue;
    const r = Math.hypot(P[k], P[k + 2]);
    // land in whichever bowl catches the drop on its way down
    if ((r < 0.56 && py >= 2.5 && P[k + 1] < 2.5) || (r < 1.12 && py >= 1.58 && P[k + 1] < 1.58) || P[k + 1] < WATER_Y) {
      if (P[k + 1] < WATER_Y && r < BASIN_R && Math.random() < 0.02) spawnRipple(F, P[k], P[k + 2], 0.25 + Math.random() * 0.2, 0.9);
      respawnDrop(P, V, i);
    }
  }
  F.sprayGeo.attributes.position.needsUpdate = true;

  // gentle background ripples where the bowl overflow lands
  F.rippleT -= dt;
  if (F.rippleT <= 0) {
    F.rippleT = 0.35 + Math.random() * 0.4;
    const a = Math.random() * Math.PI * 2, r = 1.25 + Math.random() * 0.3;
    spawnRipple(F, Math.cos(a) * r, Math.sin(a) * r, 0.35, 1.1);
  }
  for (const p of F.ripples) {
    if (!p.ring.visible) continue;
    p.t += dt;
    const k = p.t / p.life;
    if (k >= 1) { p.ring.visible = false; continue; }
    const s = p.size * (0.15 + k);
    p.ring.scale.set(s, s, s);
    p.ring.material.opacity = 0.55 * (1 - k);
  }
  for (const d of F.drops) {
    if (!d.live) continue;
    d.vel.y -= 9.8 * dt;
    d.mesh.position.addScaledVector(d.vel, dt);
    if (d.mesh.position.y < WATER_Y) { d.live = false; d.mesh.visible = false; }
  }
}

function ensureHud(world) {
  const F = world.fountain;
  if (F.hud) return F.hud;
  const el = document.createElement('div');
  el.id = 'fountain';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:360px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#0a1c22e8;border:1px solid #e8b84a;border-radius:6px;display:none;z-index:30;color:#e8f6ff;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'font-weight:800;color:#e8b84a;margin-bottom:2px';
  head.textContent = '⛲ WISHING FOUNTAIN';
  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:12px;opacity:.8;margin-bottom:6px';
  sub.textContent = 'Toss a coin and make one wish today. Press 1–4 · E keeps your coin';
  const rows = WISHES.map((w, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;align-items:baseline;padding:3px 4px;border-radius:4px';
    const label = document.createElement('span');
    label.style.cssText = 'width:120px;flex:none';
    label.textContent = `${i + 1}  ${w.icon} ${w.name}`;
    const price = document.createElement('span');
    price.style.cssText = 'width:44px;flex:none;color:#e8b84a';
    price.textContent = `$${w.cost}`;
    const text = document.createElement('span');
    text.style.cssText = 'font-size:12px;opacity:.85';
    row.append(label, price, text);
    el.appendChild(row);
    return { row, text };
  });
  el.prepend(head, sub);
  document.body.appendChild(el);
  F.hud = { el, rows };
  return F.hud;
}

// why a wish can't be made right now, or null if it can
function blocked(world, i) {
  const w = WISHES[i];
  if (world.money < w.cost) return `need $${w.cost}`;
  if (w.key === 'calm' && !(world.wanted > 0)) return 'no stars to wash away';
  if (w.key === 'health' && world.player.health >= world.maxHealth) return 'already at full health';
  if (w.key === 'luck' && world.fountain.luckT > 0) return 'already lucky';
  return null;
}

function renderHud(world) {
  const hud = ensureHud(world);
  WISHES.forEach((w, i) => {
    const why = blocked(world, i);
    const r = hud.rows[i];
    r.text.textContent = why ? `${w.text} (${why})` : w.text;
    r.row.style.opacity = why ? '0.45' : '1';
  });
}

function closeMenu(world) {
  const F = world.fountain;
  F.state = 'idle';
  if (F.hud) F.hud.el.style.display = 'none';
}

function grantWish(world, i) {
  const F = world.fountain, w = WISHES[i];
  world.addXP?.(5);
  if (w.key === 'luck') {
    F.luckBoost = LUCK_BOOST;
    world.payMult = (world.payMult || 1) + LUCK_BOOST;
    F.luckT = LUCK_TIME;
    sfxMissionPass();
    showMissionMsg('🍀 LUCKY', 'Payouts +50% for the next 3 minutes', '#7cf78c');
  } else if (w.key === 'health') {
    world.player.health = world.maxHealth;
    sfxPickup();
    showMissionMsg('❤️ REFRESHED', 'The cool water patches you right up', '#ff7a8a');
  } else if (w.key === 'calm') {
    if (world.wanted > 0) {
      world.wanted--;
      world.wantedTimer = 0;
      showMissionMsg('🕊️ CALM', 'A wanted star washes away', '#9fd8ff');
    } else {
      showMissionMsg('🕊️ CALM', 'All is already calm', '#9fd8ff');
    }
    sfxPickup();
  } else {
    if (Math.random() < 1 / FORTUNE_ODDS) {
      world.money += FORTUNE_PRIZE;
      addRep(world, 25);
      sfxMissionPass();
      showMissionMsg('🎲 FORTUNE SMILES', `+$${FORTUNE_PRIZE} from the wishing fountain!`, '#e8b84a');
      showNews('a lucky wisher strikes it rich at the fountain');
    } else {
      sfxMissionFail();
      showToast(`🎲 ${FIZZLES[(Math.random() * FIZZLES.length) | 0]}`);
    }
  }
  world.onSave?.();
}

export function updateFountain(world, dt, keys, pressed) {
  const F = world.fountain;
  if (!F) return;
  world.fountainHint = null;
  animateWater(F, dt);

  // Luck runs on its own clock, wherever the player wanders
  if (F.luckT > 0) {
    F.luckT -= dt;
    if (F.luckT <= 0) {
      F.luckT = 0;
      world.payMult = Math.max(1, (world.payMult || 1) - F.luckBoost);
      F.luckBoost = 0;
      showToast('🍀 Your fountain luck has run dry');
    }
  }

  // the coin in flight: a spinning arc into the pool, then the wish comes true
  if (F.state === 'toss') {
    F.tossT += dt;
    const k = Math.min(1, F.tossT / TOSS_TIME);
    F.coin.position.lerpVectors(F.tossFrom, F.tossTo, k);
    F.coin.position.y += Math.sin(k * Math.PI) * 1.3;
    F.coin.rotation.x += dt * 22;
    if (k >= 1) {
      F.coin.visible = false;
      splash(F, F.tossTo.x, F.tossTo.z);
      F.floorCoins.count = Math.min(FLOOR_COINS, 24 + F.wishes); // your coin joins the others
      const i = F.pending;
      F.pending = -1;
      F.state = 'idle';
      grantWish(world, i);
    }
    return;
  }

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat && !player.inPlane;
  const d = Math.hypot(player.pos.x - F.pos.x, player.pos.z - F.pos.z);
  const today = world.dailyDay ?? 0;
  const usedToday = F.day === today;
  const luckNote = F.luckT > 0 ? ` · 🍀 luck ${Math.ceil(F.luckT)}s` : '';

  if (F.state === 'menu') {
    if (!onFoot || d > REACH + 1.5 || usedToday) { closeMenu(world); return; }
    world.nearKiosk = true; // digits pick a wish here, not switch weapons
    if (pressed['KeyE']) { closeMenu(world); showToast('You pocket the coin. Maybe later.'); return; }
    renderHud(world);
    world.fountainHint = 'WISHING FOUNTAIN — pick a wish: <b>1</b> Luck · <b>2</b> Health · <b>3</b> Calm · <b>4</b> Fortune · <b>E</b> keep your coin';
    const choice = [1, 2, 3, 4].find((n) => pressed['Digit' + n]);
    if (!choice) return;
    const i = choice - 1, why = blocked(world, i);
    if (why) { sfxMissionFail(); showToast(`${WISHES[i].icon} ${WISHES[i].name}: ${why}`); return; }
    world.money -= WISHES[i].cost;
    F.day = today;
    F.wishes++;
    F.pending = i;
    F.state = 'toss';
    F.tossT = 0;
    // from the player's hand to a spot in the pool on their side of the column
    F.tossFrom.set(player.pos.x, player.pos.y + 1.4, player.pos.z);
    F.group.worldToLocal(F.tossFrom);
    const a = Math.atan2(F.tossFrom.z, F.tossFrom.x) + (Math.random() - 0.5) * 0.9;
    const r = 1.55 + Math.random() * 0.75;
    F.tossTo.set(Math.cos(a) * r, WATER_Y, Math.sin(a) * r);
    F.coin.position.copy(F.tossFrom);
    F.coin.visible = true;
    if (F.hud) F.hud.el.style.display = 'none';
    sfxPickup();
    showToast(`${WISHES[i].icon} You toss a coin and wish for ${WISHES[i].name.toLowerCase()}...`);
    world.onSave?.();
    return;
  }

  // idle
  if (!onFoot || d > REACH) return;
  if (usedToday) {
    world.fountainHint = `WISHING FOUNTAIN — you've made today's wish. Come back tomorrow${luckNote}`;
    return;
  }
  world.fountainHint = `WISHING FOUNTAIN — press <b>E</b> to toss a coin and make a wish (one a day)${luckNote}`;
  if (pressed['KeyE']) {
    F.state = 'menu';
    world.nearKiosk = true;
    ensureHud(world).el.style.display = 'block';
    renderHud(world);
  }
}

export function fountainSave(world) {
  return { fountainDay: world.fountain?.day ?? null, fountainWishes: world.fountain?.wishes ?? 0 };
}
