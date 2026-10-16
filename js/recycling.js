import * as THREE from 'three';
import { placeStreetSite, overlapsRoad } from './site-layout.js';
import { pointBlocked } from './city.js';
import { signTexture, faceNearestRoad } from './propKit.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass } from './sound.js';
import { addRep } from './economy.js';

// RECYCLING: empty cans and bottles litter the sidewalks of the nine blocks
// around spawn. Walk over one to bag it (30 fit in the bag), then feed them
// into the green-lit RECYCLE machine near spawn with E for $4 apiece. Every
// 100 lifetime items earns an Eco Warrior bonus. The litter is re-strewn each
// in-game day; what you picked up today stays picked up across a reload.
//
// These are deliberately not world.pickups (which respawn instantly and sit
// on the map) and not hidden packages: they are one InstancedMesh, kept in
// this module's own list, and never drawn on the map.

const CANS = 40;
const CAP = 30;
const PRICE = 4;
const MILESTONE = 100;
const MILESTONE_BONUS = 250;
const PICK_R = 1.0;          // metres, on foot
const REACH = 2.4;           // from the machine's slot
const FEED_RATE = 12;        // items a second into the machine
const WALK_TOP = 0.24;       // sidewalk slab surface height
const CAN_R = 0.06, CAN_L = 0.2;
const CAN_COLORS = [0xd8262c, 0x2a6ad8, 0xc8ccd0, 0xf0b020];
const BOTTLE_COLORS = [0x2f8a3a, 0x7a4a1a, 0x9ad0c0];

// a small seeded generator so the same day lays the same litter after a reload
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function initRecycling(scene, world, save) {
  const city = world.city;
  const pos = city.spawn.clone().add(new THREE.Vector3(26, 0, -6));
  placeStreetSite(city, pos, 1.6, 'recycling');
  const yaw = faceNearestRoad(city, pos);
  const local = (x, z) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(pos.x, 0, pos.z));

  // the reverse-vending machine: a cabinet with a green-lit front, a bottle
  // slot, a little screen, a RECYCLE sign on top and a green pool of light
  const machine = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x2c3a34, roughness: 0.6, metalness: 0.3 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x0a2a14, emissive: 0x30ff70, emissiveIntensity: 0.9, roughness: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.8 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; machine.add(m); return m; };
  add(new THREE.BoxGeometry(1.2, 2.0, 0.8), body, 0, 1.0 + WALK_TOP, 0);
  add(new THREE.BoxGeometry(1.04, 0.06, 0.04), glow, 0, 1.85 + WALK_TOP, 0.41);  // light bars
  add(new THREE.BoxGeometry(1.04, 0.06, 0.04), glow, 0, 0.35 + WALK_TOP, 0.41);
  for (const x of [-0.52, 0.52]) add(new THREE.BoxGeometry(0.06, 1.5, 0.04), glow, x, 1.1 + WALK_TOP, 0.41);
  add(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 18), black, -0.2, 1.1 + WALK_TOP, 0.41).rotation.x = Math.PI / 2; // the slot
  add(new THREE.BoxGeometry(0.34, 0.24, 0.03), glow, 0.25, 1.45 + WALK_TOP, 0.41);                                    // screen
  const signMat = new THREE.MeshBasicMaterial({ map: signTexture('RECYCLE', { fg: '#e8ffe8', bg: '#06240e', accent: '#30ff70' }), toneMapped: false });
  for (const side of [1, -1]) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), signMat);
    board.position.set(0, 2.25 + WALK_TOP, side * 0.02);
    board.rotation.y = side > 0 ? 0 : Math.PI;
    machine.add(board);
  }
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 24),
    new THREE.MeshBasicMaterial({ color: 0x30ff70, transparent: true, opacity: 0.16, depthWrite: false })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, WALK_TOP + 0.02, 0.9);
  machine.add(pool);
  machine.position.set(pos.x, 0, pos.z);
  machine.rotation.y = yaw;
  scene.add(machine);

  // all the litter is one instanced draw: lying cans and slightly longer bottles
  const mesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(CAN_R, CAN_R, CAN_L, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.45 }),
    CANS
  );
  mesh.frustumCulled = false; // forty tiny instances spread over nine blocks
  mesh.castShadow = false;
  scene.add(mesh);

  // the nine sidewalk blocks nearest spawn, skipping the authored lots
  const blocks = city.walks.filter((w) => !w.authored)
    .map((w) => ({ w, d: Math.hypot(w.x - city.spawn.x, w.z - city.spawn.z) }))
    .sort((a, b) => a.d - b.d || a.w.bi - b.w.bi || a.w.bj - b.w.bj)
    .slice(0, 9).map((e) => e.w);

  const day = world.dailyDay ?? save?.dailyDay ?? 0;
  world.recycling = {
    pos, yaw,
    slot: local(0, 0.9),             // where you stand to feed the machine
    state: 'idle',                   // idle -> feeding
    blocks, mesh,
    cans: [],                        // { x, z, kind: 'can'|'bottle', taken }
    day,
    held: save?.recycleHeld ?? 0,
    total: save?.recycleTotal ?? 0,
    feedT: 0, fed: 0, paid: 0,
    toastT: 0, fullT: 0,
    counter: null, shown: -1,
  };
  scatter(world, day);
  if (save?.recycleDay === day && Array.isArray(save.recycleTaken)) {
    for (const i of save.recycleTaken) if (world.recycling.cans[i]) world.recycling.cans[i].taken = true;
  }
  refreshMesh(world);
}

// lay out today's litter along the sidewalk ring of each block: between the
// kerb and the building line, clear of colliders, roads and activity sites
function scatter(world, day) {
  const R = world.recycling, city = world.city;
  const rng = mulberry(91731 + day * 7919);
  const probe = new THREE.Vector3();
  R.cans = [];
  for (let i = 0; i < CANS; i++) {
    const w = R.blocks[i % R.blocks.length];
    const sx = w.x - 30, sz = w.z - 30;
    let x = w.x, z = w.z;
    for (let tries = 0; tries < 30; tries++) {
      const edge = (rng() * 4) | 0;
      const along = 2 + rng() * 56;
      const inset = 1.2 + rng() * 2.6; // buildings start 6 m in; the kerb is at 0
      x = edge === 0 ? sx + along : edge === 1 ? sx + along : edge === 2 ? sx + inset : sx + 60 - inset;
      z = edge === 0 ? sz + inset : edge === 1 ? sz + 60 - inset : sz + along;
      probe.set(x, 0.5, z);
      if (overlapsRoad(city, x, z, 0.2)) continue;
      if (pointBlocked(probe, city.colliders, 0.45)) continue;
      if ((city.activitySites || []).some((s) => Math.abs(x - s.x) < s.radius + 0.8 && Math.abs(z - s.z) < s.radius + 0.8)) continue;
      if (R.cans.some((c) => Math.abs(c.x - x) < 1.5 && Math.abs(c.z - z) < 1.5)) continue;
      break;
    }
    const kind = rng() < 0.35 ? 'bottle' : 'can';
    const palette = kind === 'bottle' ? BOTTLE_COLORS : CAN_COLORS;
    R.cans.push({ x, z, kind, yaw: rng() * Math.PI * 2, color: palette[(rng() * palette.length) | 0], taken: false });
  }
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
function refreshMesh(world) {
  const R = world.recycling;
  R.cans.forEach((c, i) => {
    if (c.taken) _s.set(0, 0, 0);
    else if (c.kind === 'bottle') _s.set(0.85, 1.5, 0.85);
    else _s.set(1, 1, 1);
    _e.set(0, c.yaw, Math.PI / 2); // lie it on its side, then turn it
    _q.setFromEuler(_e);
    _p.set(c.x, WALK_TOP + CAN_R * _s.x, c.z);
    _m.compose(_p, _q, _s);
    R.mesh.setMatrixAt(i, _m);
    R.mesh.setColorAt(i, _c.setHex(c.color));
  });
  R.mesh.instanceMatrix.needsUpdate = true;
  if (R.mesh.instanceColor) R.mesh.instanceColor.needsUpdate = true;
}

function hideOne(world, i) {
  const R = world.recycling;
  R.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
  R.mesh.instanceMatrix.needsUpdate = true;
}

function ensureCounter(world) {
  const R = world.recycling;
  if (R.counter) return R.counter;
  const el = document.createElement('div');
  el.id = 'recycling-bag';
  el.style.cssText = 'position:fixed;right:26px;bottom:74px;padding:4px 10px;box-sizing:border-box;' +
    'background:#06180ce0;border:1px solid #30ff70;border-radius:6px;display:none;z-index:30;color:#d8ffe0;font:800 13px system-ui;pointer-events:none';
  document.body.appendChild(el);
  R.counter = el;
  return el;
}

function renderCounter(world) {
  const R = world.recycling;
  if (R.shown === R.held) return;
  R.shown = R.held;
  if (R.held <= 0 && !R.counter) return;
  const el = ensureCounter(world);
  el.style.display = R.held > 0 ? 'block' : 'none';
  el.textContent = `♻ ${R.held}/${CAP}${R.held >= CAP ? ' FULL' : ''}`;
}

function finishFeeding(world) {
  const R = world.recycling;
  R.state = 'idle';
  if (R.fed > 0) {
    sfxPickup();
    showToast(`♻ Recycled ${R.fed} item${R.fed === 1 ? '' : 's'} · +$${R.paid} · ${R.total} lifetime`);
    world.addXP?.(Math.ceil(R.fed / 2));
    addRep(world, Math.max(1, Math.round(R.fed / 5)));
    world.onSave?.();
  }
  R.fed = 0; R.paid = 0;
}

export function updateRecycling(world, dt, keys, pressed) {
  const R = world.recycling;
  if (!R) return;
  world.recyclingHint = null;
  R.toastT = Math.max(0, R.toastT - dt);
  R.fullT = Math.max(0, R.fullT - dt);

  // a new in-game day strews fresh litter
  if (world.dailyDay != null && world.dailyDay !== R.day) {
    R.day = world.dailyDay;
    scatter(world, R.day);
    refreshMesh(world);
  }

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;

  // walking over litter bags it
  if (onFoot && player.pos.y < 2) {
    for (let i = 0; i < R.cans.length; i++) {
      const c = R.cans[i];
      if (c.taken) continue;
      const dx = c.x - player.pos.x, dz = c.z - player.pos.z;
      if (dx * dx + dz * dz > PICK_R * PICK_R) continue;
      if (R.held >= CAP) {
        if (R.fullT <= 0) { R.fullT = 4; showToast(`♻ Bag full (${CAP}) — feed the RECYCLE machine near spawn`); }
        break;
      }
      c.taken = true;
      R.held++;
      hideOne(world, i);
      if (R.toastT <= 0) {
        R.toastT = 1;
        sfxPickup();
        showToast(`♻ ${c.kind === 'bottle' ? 'Bottle' : 'Can'} bagged · ${R.held}/${CAP}`);
      }
    }
  }

  const d = Math.hypot(player.pos.x - R.slot.x, player.pos.z - R.slot.z);
  if (R.state === 'feeding') {
    if (!onFoot || R.held <= 0) { finishFeeding(world); }
    else {
      // stand at the slot while the machine swallows the bag
      player.pos.x = R.slot.x; player.pos.z = R.slot.z;
      player.vel.x = 0; player.vel.z = 0;
      R.feedT += dt;
      while (R.feedT >= 1 / FEED_RATE && R.held > 0) {
        R.feedT -= 1 / FEED_RATE;
        R.held--; R.fed++; R.paid += PRICE; R.total++;
        world.money += PRICE;
        if (R.total % MILESTONE === 0) {
          world.money += MILESTONE_BONUS;
          addRep(world, 100);
          world.addXP?.(50);
          sfxMissionPass();
          showMissionMsg('♻ ECO WARRIOR', `${R.total} items recycled · +$${MILESTONE_BONUS} bonus`, '#30ff70');
          if (R.total % (MILESTONE * 5) === 0) showNews(`eco warrior hits ${R.total} cans and bottles recycled`);
        }
      }
      world.recyclingHint = `RECYCLE — feeding... ${R.fed} in · +$${R.paid}`;
      if (R.held <= 0) finishFeeding(world);
    }
  } else if (onFoot && d < REACH) {
    if (R.held > 0) {
      world.recyclingHint = `RECYCLE — press <b>E</b> to feed in ${R.held} item${R.held === 1 ? '' : 's'} for $${R.held * PRICE}`;
      if (pressed['KeyE']) { R.state = 'feeding'; R.feedT = 0; R.fed = 0; R.paid = 0; }
    } else {
      const left = R.cans.filter((c) => !c.taken).length;
      world.recyclingHint = `RECYCLE — $${PRICE} per can or bottle · ${left} lying around the nearby sidewalks · ${R.total} recycled`;
    }
  }

  renderCounter(world);
}

export function recyclingSave(world) {
  const R = world.recycling;
  if (!R) return {};
  return {
    recycleHeld: R.held,
    recycleTotal: R.total,
    recycleDay: R.day,
    recycleTaken: R.cans.map((c, i) => (c.taken ? i : -1)).filter((i) => i >= 0),
  };
}
