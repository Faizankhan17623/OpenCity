import * as THREE from 'three';
import { WATER_X0, WATER_Z, WATER_Y, inWater } from './water.js';
import { pointBlocked } from './city.js';
import { storefront } from './propKit.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';
import { addRing } from './effects.js';

// CRAB POTS: the CRAB SHACK on the sand past the east edge sells pots. Take
// any boat out to the yellow buoys off the shack and press E beside one to
// drop a pot; a float marks it. Pots soak in game time: after about two
// in-game hours (two real minutes) the float turns green and bobs, and you
// can haul it from the boat with E. Each pot brings up 0-6 crabs, now and
// then an old boot or a lost ring; a pot left more than eight hours loses
// half its catch to the octopuses. Sell the crabs back at the shack. Pots
// come back up with the catch, so a full set of six keeps working.

const PRICE = 15;
const MAX_POTS = 6;
const BUY = [1, 3, 6];        // keys 1-3
const CRAB_PRICE = 18;
const READY_H = 2;            // in-game hours to soak
const SPOIL_H = 8;            // left longer than this, half the catch is gone
const DROP_R = 6;             // boat-to-buoy reach
const SHOP_R = 3.2;
const RING_PAY = 200;
// buoy spots out in the water off the shack: [metres out from the seawall, dz]
const SPOTS = [[40, -30], [55, 22], [70, -62], [86, 46], [100, -12], [116, 82], [130, -46], [146, 26], [162, 104], [178, -20]];

// in-game hours since day 0. world.clock wraps at 24 a frame before the day
// counter ticks over, so bridge that one frame rather than jump back a day.
function gameHours(world) {
  const C = world.crabPots;
  const clock = world.clock || 0;
  let day = world.dailyDay || 0;
  if (C && C._day === day && clock < C._clock - 12) day += 1;
  return day * 24 + clock;
}

function pickZ(world) {
  const cols = world.city.colliders, sites = world.city.activitySites || [];
  for (const z of [114, 130, 98, 190, 262]) {
    if (pointBlocked(new THREE.Vector3(WATER_X0 - 3, 1, z), cols, 1.6)) continue;
    if (sites.some((s) => Math.abs(s.z - z) < 4 + (s.radius || 0) && Math.abs(s.x - (WATER_X0 - 3)) < 4 + (s.radius || 0))) continue;
    return z;
  }
  return 114;
}

export function initCrabPots(scene, world, save) {
  const z = pickZ(world);
  // the shack stands on the sand strip between the ring road and the seawall,
  // its counter turned to the road like the other shopfronts
  const shackAt = new THREE.Vector3(WATER_X0 - 3, 0, z);
  const shop = storefront(scene, world.city, shackAt, {
    name: 'CRAB SHACK', w: 3.2, h: 2.6, d: 2.2, wall: 0x8a5a3a, accent: 0xc23a2a,
    sign: { fg: '#fff3e0', bg: '#6a1a12', accent: '#ff8a5a' },
  });
  const yaw = shop.group.rotation.y;
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const pos = shackAt.clone().addScaledVector(fwd, shop.d / 2 + 0.9); // where you stand at the counter
  // a stack of pot cages beside the door
  const cageMat = new THREE.MeshStandardMaterial({ color: 0x9aa4a8, roughness: 0.6, metalness: 0.5, wireframe: true });
  const cageGeo = new THREE.BoxGeometry(0.8, 0.5, 0.8);
  const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
  for (let i = 0; i < 4; i++) {
    const cage = new THREE.Mesh(cageGeo, cageMat);
    cage.position.copy(shackAt).addScaledVector(fwd, shop.d / 2 + 0.3).addScaledVector(side, 2.1 + (i % 2) * 0.85);
    cage.position.y = 0.25 + Math.floor(i / 2) * 0.5;
    scene.add(cage);
  }
  (world.city.activitySites ||= []).push({ x: shackAt.x, z: shackAt.z, radius: 2.6, label: 'crab-shack' });

  // yellow marker buoys, and a pool of pot floats (one per pot you can own)
  const buoyGeo = new THREE.SphereGeometry(0.45, 12, 8);
  const buoyMat = new THREE.MeshStandardMaterial({ color: 0xffd21a, roughness: 0.5, emissive: 0x332800 });
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });
  const spots = [];
  for (const [dx, dz] of SPOTS) {
    const x = WATER_X0 + dx;
    const sz = Math.max(-(WATER_Z - 15), Math.min(WATER_Z - 15, z + dz));
    if (!inWater(x, sz)) continue;
    const g = new THREE.Group();
    g.add(new THREE.Mesh(buoyGeo, buoyMat));
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 0.6;
    g.add(pole);
    g.position.set(x, WATER_Y, sz);
    scene.add(g);
    spots.push({ x, z: sz, buoy: g, phase: Math.random() * 6 });
  }
  const floatGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 10);
  const flagGeo = new THREE.PlaneGeometry(0.45, 0.3);
  const soakMat = new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.5 });
  const readyMat = new THREE.MeshStandardMaterial({ color: 0x3ae06a, roughness: 0.4, emissive: 0x0a4a1a });
  const flagMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const floats = [];
  for (let i = 0; i < MAX_POTS; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(floatGeo, soakMat);
    g.add(body);
    const stick = new THREE.Mesh(poleGeo, poleMat);
    stick.position.y = 0.75;
    g.add(stick);
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.24, 1.15, 0);
    g.add(flag);
    g.visible = false;
    scene.add(g);
    floats.push({ group: g, body, flag, used: false });
  }

  world.crabPots = {
    pos, shackAt, spots, floats, soakMat, readyMat,
    state: 'idle',        // idle | shop (at the counter)
    pots: [],             // { x, z, t, spot, float }
    spare: Math.max(0, Math.min(MAX_POTS, save?.crabPotsSpare ?? 0)),
    held: Math.max(0, save?.crabHeld ?? 0),
    total: Math.max(0, save?.crabTotal ?? 0),
    anim: 0, hud: null,
    _day: world.dailyDay || 0, _clock: world.clock || 0, loaded: false,
  };
  const C = world.crabPots;

  // put saved pots back in the water. The clock restarts on load, so the
  // first update clamps any pot "placed in the future" to start soaking now
  // (done there, not here, so the day counter has certainly been restored).
  for (const s of Array.isArray(save?.crabPots) ? save.crabPots : []) {
    if (C.pots.length >= MAX_POTS || !Number.isFinite(s?.x) || !Number.isFinite(s?.z)) continue;
    placePot(C, s.x, s.z, Number.isFinite(s.t) ? s.t : -Infinity);
  }
  C.loaded = true;
  C.spare = Math.min(C.spare, MAX_POTS - C.pots.length);
}

function nearestSpot(C, x, z) {
  let best = null, bd = Infinity;
  for (const s of C.spots) {
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < bd) { bd = d; best = s; }
  }
  return best ? { spot: best, d: bd } : null;
}

function placePot(C, x, z, t) {
  const f = C.floats.find((fl) => !fl.used);
  if (!f) return null;
  f.used = true;
  f.group.visible = true;
  f.group.position.set(x, WATER_Y, z);
  f.body.material = C.soakMat;
  const near = nearestSpot(C, x, z);
  const spot = near && near.d < 1.5 ? near.spot : null; // a pot on a spot hides its marker buoy
  const pot = { x, z, t, spot, float: f, phase: Math.random() * 6 };
  C.pots.push(pot);
  return pot;
}

function removePot(C, pot) {
  pot.float.used = false;
  pot.float.group.visible = false;
  C.pots.splice(C.pots.indexOf(pot), 1);
}

const owned = (C) => C.spare + C.pots.length;

function ensureHud(world) {
  const C = world.crabPots;
  if (C.hud) return C.hud;
  const el = document.createElement('div');
  el.id = 'crabpots';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:340px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#1a0c08e0;border:1px solid #ff8a5a;border-radius:6px;display:none;z-index:30;color:#fff3e0;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#ff8a5a';
  const title = document.createElement('span');
  title.textContent = '🦀 CRAB SHACK';
  const cash = document.createElement('span');
  head.append(title, cash);
  const rows = BUY.map((n, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'padding:3px 4px;border-radius:4px';
    row.textContent = `${i + 1}  ·  ${n} pot${n > 1 ? 's' : ''} — $${n * PRICE}`;
    return row;
  });
  const status = document.createElement('div');
  status.style.cssText = 'font-size:12px;opacity:.85;margin-top:6px';
  const foot = document.createElement('div');
  foot.style.cssText = 'font-size:12px;opacity:.7;margin-top:4px';
  foot.textContent = `Crabs sell for $${CRAB_PRICE} each · pots soak ~${READY_H} game hours · E to leave`;
  el.append(head, ...rows, status, foot);
  document.body.appendChild(el);
  C.hud = { el, cash, rows, status };
  return C.hud;
}

function renderHud(world) {
  const C = world.crabPots, hud = ensureHud(world);
  const room = MAX_POTS - owned(C);
  hud.cash.textContent = `$${Math.floor(world.money).toLocaleString()}`;
  BUY.forEach((n, i) => {
    const can = room > 0 && world.money >= Math.min(n, room) * PRICE;
    hud.rows[i].style.opacity = can ? '1' : '.4';
  });
  hud.status.textContent = `Pots: ${C.spare} on board · ${C.pots.length} in the water · room for ${room} more  ·  lifetime crabs ${C.total}`;
}

function closeShop(world) {
  const C = world.crabPots;
  C.state = 'idle';
  if (C.hud) C.hud.el.style.display = 'none';
}

function openShop(world) {
  const C = world.crabPots;
  C.state = 'shop';
  ensureHud(world).el.style.display = 'block';
  if (C.held > 0) {
    const pay = C.held * CRAB_PRICE;
    world.money += pay;
    addRep(world, C.held * 3);
    world.addXP?.(C.held * 2);
    sfxMissionPass();
    showMissionMsg('CRABS SOLD', `${C.held} crab${C.held > 1 ? 's' : ''} · +$${pay}`, '#ff8a5a');
    C.held = 0;
    world.onSave?.();
  } else {
    sfxPickup();
  }
}

function buy(world, i) {
  const C = world.crabPots;
  const room = MAX_POTS - owned(C);
  if (room <= 0) { sfxMissionFail(); showToast(`You already own ${MAX_POTS} pots — that's all the harbor master allows`); return; }
  const n = Math.min(BUY[i], room);
  const cost = n * PRICE;
  if (world.money < cost) { sfxMissionFail(); showToast(`Not enough cash — ${n} pot${n > 1 ? 's' : ''} cost $${cost}`); return; }
  world.money -= cost;
  C.spare += n;
  sfxPickup();
  showToast(`🦀 bought ${n} crab pot${n > 1 ? 's' : ''} −$${cost}${n < BUY[i] ? ` (room for only ${n})` : ''} — take a boat to the yellow buoys`);
  world.onSave?.();
}

function haul(world, pot, now) {
  const C = world.crabPots;
  const age = now - pot.t;
  removePot(C, pot);
  C.spare = Math.min(MAX_POTS - C.pots.length, C.spare + 1); // the pot comes back aboard
  addRing(new THREE.Vector3(pot.x, WATER_Y + 0.1, pot.z), 0xd8f0ff);
  const r = Math.random();
  if (r < 0.05) {
    if (r < 0.015) {
      world.money += RING_PAY;
      addRep(world, 40);
      world.addXP?.(30);
      sfxMissionPass();
      showMissionMsg('💍 A LOST RING', `Tangled in the pot — the pawn shop pays +$${RING_PAY}`, '#ffd24a');
    } else {
      sfxMissionFail();
      showToast('🥾 An old boot. The crabs ate the laces and left.');
    }
    world.onSave?.();
    return;
  }
  let crabs = Math.floor(Math.random() * 7); // 0-6
  const spoiled = age > SPOIL_H;
  if (spoiled) crabs = Math.floor(crabs / 2);
  C.held += crabs;
  C.total += crabs;
  addRep(world, crabs * 2);
  world.addXP?.(5 + crabs * 3);
  (crabs ? sfxPickup : sfxMissionFail)();
  showToast(crabs
    ? `🦀 hauled ${crabs} crab${crabs > 1 ? 's' : ''}${spoiled ? ' (left too long — half got out)' : ''} · ${C.held} on board`
    : `Empty pot${spoiled ? ' — left too long' : ''}. Better luck next soak.`);
  const before = C.total - crabs;
  if (Math.floor(C.total / 100) > Math.floor(before / 100)) showNews(`a harbor crabber lands their ${Math.floor(C.total / 100) * 100}th crab`);
  world.onSave?.();
}

export function updateCrabPots(world, dt, keys, pressed) {
  const C = world.crabPots;
  if (!C) return;
  world.crabPotsHint = null;
  world.crabPotsBlip = null;
  world.crabShackBlip = null;
  C.anim += dt;
  const now = gameHours(world);
  C._day = world.dailyDay || 0;
  C._clock = world.clock || 0;
  if (C.loaded) { C.loaded = false; for (const p of C.pots) p.t = Number.isFinite(p.t) ? Math.min(p.t, now) : now; }

  // floats and buoys bob; ready floats turn green and bob harder
  for (const s of C.spots) {
    s.buoy.visible = !C.pots.some((p) => p.spot === s);
    s.buoy.position.y = WATER_Y + Math.sin(C.anim * 1.8 + s.phase) * 0.08;
  }
  let readyCount = 0;
  for (const p of C.pots) {
    const ready = now - p.t >= READY_H;
    if (ready) readyCount++;
    p.float.body.material = ready ? C.readyMat : C.soakMat;
    const g = p.float.group;
    g.position.y = WATER_Y + Math.sin(C.anim * (ready ? 4.5 : 1.6) + p.phase) * (ready ? 0.18 : 0.06);
    g.rotation.z = ready ? Math.sin(C.anim * 3.1 + p.phase) * 0.18 : 0;
    p.float.flag.rotation.y = Math.sin(C.anim * 2 + p.phase) * 0.4;
  }

  const player = world.player;
  const boat = player.inBoat;

  // ---- at the shack, on foot ----
  if (!boat) {
    const onFoot = !player.inCar && !player.inHeli && !player.inPlane;
    const d = Math.hypot(player.pos.x - C.pos.x, player.pos.z - C.pos.z);
    if (C.state === 'shop') {
      if (!onFoot || d > SHOP_R + 1.5 || pressed['KeyE']) { closeShop(world); return; }
      world.nearKiosk = true; // 1-3 buy pots here, not switch weapons
      const choice = [0, 1, 2].find((i) => pressed['Digit' + (i + 1)]);
      if (choice != null) buy(world, choice);
      world.crabPotsHint = `CRAB SHACK — <b>1</b> 1 pot · <b>2</b> 3 pots · <b>3</b> 6 pots ($${PRICE} each) · <b>E</b> to leave`;
      renderHud(world);
      return;
    }
    if (onFoot && d < SHOP_R && player.pos.y < 3) {
      world.crabPotsHint = C.held > 0
        ? `CRAB SHACK — press <b>E</b> to sell ${C.held} crab${C.held > 1 ? 's' : ''} ($${C.held * CRAB_PRICE}) and buy pots`
        : `CRAB SHACK — press <b>E</b> to buy crab pots ($${PRICE} each, ${owned(C)}/${MAX_POTS} owned)`;
      if (pressed['KeyE']) openShop(world);
      return;
    }
    if (C.held > 0) world.crabShackBlip = { x: C.pos.x, z: C.pos.z };
    else if (readyCount) {
      const p = C.pots.find((q) => now - q.t >= READY_H);
      world.crabPotsBlip = { x: p.x, z: p.z };
    }
    return;
  }
  if (C.state === 'shop') closeShop(world);

  // ---- out on the water ----
  const bx = boat.pos.x, bz = boat.pos.z;
  let near = null, nd = Infinity;
  for (const p of C.pots) {
    const d = Math.hypot(p.x - bx, p.z - bz);
    if (d < nd) { nd = d; near = p; }
  }
  // blip: the nearest ready pot, else the nearest free buoy while pots are aboard
  let blip = null, bd = Infinity;
  for (const p of C.pots) {
    if (now - p.t < READY_H) continue;
    const d = Math.hypot(p.x - bx, p.z - bz);
    if (d < bd) { bd = d; blip = p; }
  }
  if (!blip && C.spare > 0) {
    for (const s of C.spots) {
      if (C.pots.some((p) => p.spot === s)) continue;
      const d = Math.hypot(s.x - bx, s.z - bz);
      if (d < bd) { bd = d; blip = s; }
    }
  }
  if (!blip && C.held > 0) world.crabShackBlip = { x: C.pos.x, z: C.pos.z };
  if (blip) world.crabPotsBlip = { x: blip.x, z: blip.z };

  if (near && nd < DROP_R) {
    const age = now - near.t;
    if (age >= READY_H) {
      world.crabPotsHint = `CRAB POT — press <b>E</b> to haul it up${age > SPOIL_H ? ' (it\'s been down a long time)' : ''}`;
      world.carActionE = true;
      if (pressed['KeyE']) haul(world, near, now);
    } else {
      const mins = Math.max(1, Math.ceil((READY_H - age) * 60));
      world.crabPotsHint = `CRAB POT — still soaking, ready in ~${mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`} game time`;
    }
    return;
  }

  const free = C.spots.filter((s) => !C.pots.some((p) => p.spot === s));
  let spot = null, sd = Infinity;
  for (const s of free) {
    const d = Math.hypot(s.x - bx, s.z - bz);
    if (d < sd) { sd = d; spot = s; }
  }
  if (spot && sd < DROP_R) {
    if (C.spare <= 0) {
      world.crabPotsHint = C.pots.length ? 'CRAB BUOY — no pots aboard; haul the green floats or buy more at the CRAB SHACK' : 'CRAB BUOY — buy pots at the CRAB SHACK on the shore to fish here';
      return;
    }
    world.crabPotsHint = `CRAB BUOY — press <b>E</b> to drop a pot (${C.spare} aboard)`;
    world.carActionE = true;
    if (pressed['KeyE']) {
      C.spare--;
      placePot(C, spot.x, spot.z, now);
      addRing(new THREE.Vector3(spot.x, WATER_Y + 0.1, spot.z), 0xd8f0ff);
      sfxPickup();
      showToast(`🦀 pot down — back in ~${READY_H} game hours (${READY_H} real minutes) · ${C.spare} left aboard`);
      world.onSave?.();
    }
  }
}

export function crabPotsSave(world) {
  const C = world.crabPots;
  if (!C) return {};
  return {
    crabPots: C.pots.map((p) => ({ x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100, t: Math.round(p.t * 1000) / 1000 })),
    crabHeld: C.held,
    crabTotal: C.total,
    crabPotsSpare: C.spare,
  };
}
