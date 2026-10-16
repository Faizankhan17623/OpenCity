import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { signTexture, faceNearestRoad } from './propKit.js';
import { createCharacter, randomOutfit, animateIdle, animateWalk } from './characters.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// TACO LOCO: a food truck parked near spawn. Press E at the serving window to
// work a lunch rush: customers queue up, each wanting one item from the menu.
// Press the matching number for whoever is at the front before their patience
// runs out. Quick service earns tips; a wrong item costs patience; anyone who
// waits too long walks off. The number keys work on phones too.

const MENU = [
  { key: 'taco', name: 'Taco', icon: '🌮' },
  { key: 'burrito', name: 'Burrito', icon: '🌯' },
  { key: 'soda', name: 'Soda', icon: '🥤' },
  { key: 'churro', name: 'Churro', icon: '🍩' },
];
const SHIFT = 75;           // seconds in a lunch rush
const QUEUE = 3;            // customers in line at most
const PATIENCE = 12;        // seconds each customer waits
const WRONG_COST = 4;       // patience lost for a wrong item
const PRICE = 25;
const MAX_TIP = 20;         // tip scales with how much patience was left
const COOLDOWN = 20;

export function initFoodTruck(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(22, 0, 14));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 3)) pos = world.city.spawn.clone().add(new THREE.Vector3(26, 0, 18));
  placeStreetSite(world.city, pos, 5.2, 'food-truck'); // room for the truck and its queue

  // the truck: body, cab, wheels, a lit serving window and awning on its
  // street side (local +z, facing the nearest road), and a roof sign
  const truck = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xe8a33a, roughness: 0.5, metalness: 0.2 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x8a2a1a, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.7 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; truck.add(m); return m; };
  // the kitchen is open above the counter on the street side and at the back,
  // so the cook (the player) stays in view from the usual chase camera
  add(new THREE.BoxGeometry(4.2, 1.1, 2.3), paint, -0.5, 0.95, 0);          // lower body up to the counter
  for (const x of [-2.55, 1.55]) add(new THREE.BoxGeometry(0.1, 1.3, 2.3), paint, x, 2.15, 0); // end walls
  add(new THREE.BoxGeometry(4.4, 0.14, 2.5), paint, -0.5, 2.86, 0);         // roof
  add(new THREE.BoxGeometry(4.0, 0.05, 2.1), new THREE.MeshStandardMaterial({ color: 0x3a2a10, emissive: 0xffc070, emissiveIntensity: 0.8 }), -0.5, 2.77, 0); // kitchen light
  add(new THREE.BoxGeometry(1.4, 1.6, 2.2), paint, 2.3, 1.2, 0);            // cab
  add(new THREE.BoxGeometry(0.05, 0.7, 1.9), dark, 3.01, 1.6, 0);            // windscreen
  add(new THREE.BoxGeometry(4.4, 0.18, 2.4), trim, -0.5, 0.42, 0);          // skirt
  for (const [x, z] of [[-1.8, 1.1], [-1.8, -1.1], [2.2, 1.1], [2.2, -1.1]]) {
    const w = add(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 14), dark, x, 0.42, z);
    w.rotation.x = Math.PI / 2;
  }
  add(new THREE.BoxGeometry(2.6, 0.08, 0.35), trim, -0.6, 1.54, 1.2);       // serving counter
  const awning = add(new THREE.BoxGeometry(2.8, 0.06, 1.0), trim, -0.6, 2.72, 1.6);
  awning.rotation.x = 0.3;
  const signMat = new THREE.MeshBasicMaterial({ map: signTexture('TACO LOCO', { fg: '#fff3c8', bg: '#5a1a0e', accent: '#ffc040' }), toneMapped: false });
  for (const side of [1, -1]) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), signMat);
    board.position.set(-0.5, 3.4, side * 0.03);
    board.rotation.y = side > 0 ? 0 : Math.PI;
    truck.add(board);
  }
  const yaw = faceNearestRoad(world.city, pos); // serving window faces the street
  truck.position.set(pos.x, 0, pos.z);
  truck.rotation.y = yaw;
  scene.add(truck);

  // world-space helpers: the cook's spot inside the truck behind the window,
  // the queue spots in front of it, and where served customers walk off to
  const local = (x, z) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(pos.x, 0, pos.z));
  const counter = local(-0.6, 1.8);
  const cook = local(-0.6, 0.3);
  const spots = [0, 1, 2].map((i) => local(-0.6 - i * 0.5, 2.1 + i * 1.3));
  const exitTo = local(-7, 4);

  // a pool of customers, reused shift to shift
  const people = [];
  for (let i = 0; i < QUEUE + 2; i++) {
    const ch = createCharacter(randomOutfit());
    ch.group.visible = false;
    scene.add(ch.group);
    people.push({ ch, state: 'free', order: 0, patience: 0, t: 0 });
  }

  world.foodTruck = {
    pos, yaw, counter, cook, spots, exitTo, people,
    state: 'idle',       // idle -> shift
    t: 0, spawnT: 0, cooldown: 0,
    served: 0, walked: 0, earned: 0, combo: 0,
    hud: null,
    best: save?.foodTruckBest ?? 0,
  };
}

function ensureHud(world) {
  const F = world.foodTruck;
  if (F.hud) return F.hud;
  const el = document.createElement('div');
  el.id = 'foodtruck';
  el.style.cssText = 'position:fixed;left:50%;top:170px;transform:translateX(-50%);width:340px;padding:8px 10px;' +
    'background:#1a0e08e0;border:1px solid #ffc040;border-radius:6px;display:none;z-index:30;color:#fff3c8;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#ffc040';
  const menu = document.createElement('div');
  menu.style.cssText = 'font-size:12px;opacity:.85;margin-bottom:6px';
  menu.textContent = MENU.map((m, i) => `${i + 1} ${m.icon} ${m.name}`).join('  ·  ');
  const rows = document.createElement('div');
  el.append(head, menu, rows);
  document.body.appendChild(el);
  F.hud = { el, head, rows };
  return F.hud;
}

function renderHud(world) {
  const F = world.foodTruck, hud = ensureHud(world);
  hud.head.textContent = `LUNCH RUSH  ${Math.ceil(F.t)}s`;
  hud.head.appendChild(Object.assign(document.createElement('span'), { textContent: `served ${F.served} · $${F.earned}` }));
  const line = F.people.filter((p) => p.state === 'waiting').sort((a, b) => a.slot - b.slot);
  hud.rows.replaceChildren(...line.map((p, i) => {
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;gap:8px;padding:3px 4px;border-radius:4px;${i === 0 ? 'background:#ffc04033;outline:1px solid #ffc040' : 'opacity:.7'}`;
    const m = MENU[p.order];
    const label = document.createElement('span');
    label.style.cssText = 'width:120px';
    label.textContent = `${i === 0 ? '▶ ' : ''}${m.icon} ${m.name} (${p.order + 1})`;
    const bar = document.createElement('div');
    bar.style.cssText = 'flex:1;height:8px;background:#0006;border-radius:4px;overflow:hidden';
    const fill = document.createElement('div');
    const frac = Math.max(0, p.patience / PATIENCE);
    fill.style.cssText = `height:100%;width:${Math.round(frac * 100)}%;background:${frac > 0.5 ? '#5fd16a' : frac > 0.25 ? '#ffc040' : '#ff5a4a'}`;
    bar.appendChild(fill);
    row.append(label, bar);
    return row;
  }));
}

function queueCount(F) { return F.people.filter((p) => p.state === 'waiting').length; }

function spawnCustomer(world) {
  const F = world.foodTruck;
  const p = F.people.find((x) => x.state === 'free');
  if (!p) return;
  const taken = new Set(F.people.filter((x) => x.state === 'waiting').map((x) => x.slot));
  const slot = [0, 1, 2].find((s) => !taken.has(s));
  if (slot == null) return;
  p.state = 'waiting'; p.slot = slot; p.order = (Math.random() * MENU.length) | 0; p.patience = PATIENCE; p.t = 0;
  p.ch.group.position.copy(F.spots[slot]);
  p.ch.group.rotation.y = F.yaw + Math.PI; // facing the window
  p.ch.group.visible = true;
}

// close up the line: everyone steps forward into the lowest free spot
function shuffleForward(F) {
  const line = F.people.filter((p) => p.state === 'waiting').sort((a, b) => a.slot - b.slot);
  line.forEach((p, i) => { p.slot = i; p.ch.group.position.copy(F.spots[i]); });
}

function sendAway(F, p) {
  p.state = 'leaving'; p.t = 0;
  p.from = p.ch.group.position.clone();
  p.ch.group.rotation.y = Math.atan2(F.exitTo.x - p.from.x, F.exitTo.z - p.from.z);
}

function endShift(world, early) {
  const F = world.foodTruck;
  F.state = 'idle';
  F.cooldown = COOLDOWN;
  for (const p of F.people) if (p.state === 'waiting') sendAway(F, p);
  if (F.hud) F.hud.el.style.display = 'none';
  world.foodTruckHint = null;
  addRep(world, F.served * 10);
  world.addXP?.(F.served * 8);
  const newBest = F.served > F.best;
  if (newBest) F.best = F.served;
  (F.served >= 12 && !early ? sfxMissionPass : sfxMissionFail)();
  showMissionMsg(early ? 'TRUCK CLOSED EARLY' : 'LUNCH RUSH OVER',
    `${F.served} served · ${F.walked} walked off · $${F.earned} earned${newBest ? ' · NEW BEST!' : ''}`, '#ffc040');
  if (F.served >= 20) showNews('the line at the Taco Loco truck stretches round the block');
  world.onSave?.();
}

export function updateFoodTruck(world, dt, keys, pressed) {
  const F = world.foodTruck;
  if (!F) return;
  world.foodTruckHint = null;
  if (F.cooldown > 0) F.cooldown = Math.max(0, F.cooldown - dt);

  // customers walking away fade out on their own, shift or not
  for (const p of F.people) {
    if (p.state === 'waiting') { animateIdle(p.ch); continue; }
    if (p.state !== 'leaving') continue;
    p.t += dt;
    const k = Math.min(1, p.t / 2.2);
    p.ch.group.position.lerpVectors(p.from, F.exitTo, k);
    animateWalk(p.ch, p.t * 8, 0.7);
    if (k >= 1) { p.state = 'free'; p.ch.group.visible = false; }
  }

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const d = Math.hypot(player.pos.x - F.counter.x, player.pos.z - F.counter.z);

  if (F.state === 'idle') {
    if (!onFoot || d > 3.2) return;
    if (F.cooldown > 0) { world.foodTruckHint = 'TACO LOCO — restocking the truck, back in a moment'; return; }
    world.foodTruckHint = `TACO LOCO — press <b>E</b> to work the lunch rush${F.best ? ` (best ${F.best} served)` : ''}`;
    if (pressed['KeyE']) {
      F.state = 'shift'; F.t = SHIFT; F.spawnT = 0.5;
      F.served = 0; F.walked = 0; F.earned = 0; F.combo = 0;
      ensureHud(world).el.style.display = 'block';
      sfxPickup();
      showMissionMsg('LUNCH RUSH', 'Press the number for each order — 1 taco · 2 burrito · 3 soda · 4 churro · E to close up', '#ffc040');
    }
    return;
  }

  // ---- a shift is running: the cook stays at the window; E closes up early ----
  if (!onFoot || pressed['KeyE']) { endShift(world, true); return; }
  player.pos.x = F.cook.x; player.pos.z = F.cook.z;
  player.vel.x = 0; player.vel.z = 0;
  world.nearKiosk = true; // the number keys serve food here, not switch weapons
  F.t -= dt;
  if (F.t <= 0) { endShift(world, false); return; }

  F.spawnT -= dt;
  if (F.spawnT <= 0 && queueCount(F) < QUEUE) { spawnCustomer(world); F.spawnT = 2.6 + Math.random() * 2.2; }

  for (const p of F.people) {
    if (p.state !== 'waiting') continue;
    p.patience -= dt;
    if (p.patience <= 0) {
      F.walked++; F.combo = 0;
      sendAway(F, p);
      showToast(`${MENU[p.order].icon} customer got tired of waiting`);
      shuffleForward(F);
    }
  }

  const front = F.people.filter((p) => p.state === 'waiting').sort((a, b) => a.slot - b.slot)[0];
  const choice = [1, 2, 3, 4].find((n) => pressed['Digit' + n]);
  if (front && choice) {
    if (choice - 1 === front.order) {
      const tip = Math.round(MAX_TIP * Math.max(0, front.patience) / PATIENCE);
      F.combo++;
      const pay = PRICE + tip;
      world.money += pay;
      F.earned += pay;
      F.served++;
      sfxPickup();
      showToast(`${MENU[front.order].icon} served! +$${pay}${F.combo >= 5 && F.combo % 5 === 0 ? ` · ${F.combo} in a row` : ''}`);
      sendAway(F, front);
      shuffleForward(F);
    } else {
      front.patience -= WRONG_COST;
      F.combo = 0;
      sfxMissionFail();
      showToast(`That's not a ${MENU[front.order].name.toLowerCase()}!`);
    }
  }
  world.foodTruckHint = front
    ? `TACO LOCO — front of the line wants <b>${MENU[front.order].name}</b>: press <b>${front.order + 1}</b> · <b>E</b> closes up`
    : 'TACO LOCO — waiting for the next customer... · <b>E</b> closes up';
  renderHud(world);
}

export function foodTruckSave(world) {
  return { foodTruckBest: world.foodTruck?.best };
}
