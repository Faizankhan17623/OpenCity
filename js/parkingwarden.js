import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked, blockStart, BLOCK, ROAD, N } from './city.js';
import { storefront, faceNearestRoad } from './propKit.js';
import { makeVehicle, randomCarColor } from './car.js';
import { createCharacter, randomOutfit, animateIdle, animateWalk } from './characters.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail, sfxHorn } from './sound.js';
import { addRep } from './economy.js';

// PARKING ENFORCEMENT: clock on at the little booth near spawn for a 120 s
// shift on foot. Five cars nearby are parked illegally, each under a red "P".
// Walk up and hold E for a second to write the ticket. Some owners spot the
// warden and come sprinting out of a doorway: if they reach the car before the
// ticket is written, they jump in and drive off and that ticket is lost. Paid
// per ticket, with a bonus for booking all five. It's all on foot. Towing
// (towtruck.js) and valet parking (valet.js) are driving jobs.

const SHIFT = 120;          // seconds on the clock
const TICKETS = 5;          // violations per shift
const HOLD = 1.0;           // seconds of holding E to write a ticket
const WRITE_R = 3.0;        // how close to the car (centre) the warden must be
const PAY = 90;             // per ticket
const BONUS = 300;          // for booking all five
const OWNER_CHANCE = 1 / 3; // owners who come running out
const OWNER_SPOT = 11;      // owner bolts out when the warden gets this close
const OWNER_SPEED = 5.4;    // m/s, a proper sprint
const ARGUE = 2.2;          // seconds an owner rants at a ticketed car
const COOLDOWN = 25;
const KERB = ROAD / 2 - 1.6; // tight to the kerb, clear of the traffic lane at ±4 (npc.js)
const UP = new THREE.Vector3(0, 1, 0);
const _probe = new THREE.Vector3();

function blocked(world, x, z, pad) { return pointBlocked(_probe.set(x, 1, z), world.city.colliders, pad); }

function markerTexture(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  draw(c.getContext('2d'));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function initParkingWarden(scene, world, save) {
  const city = world.city;
  let pos = city.spawn.clone().add(new THREE.Vector3(34, 0, 44));
  if (blocked(world, pos.x, pos.z, 2)) pos = city.spawn.clone().add(new THREE.Vector3(30, 0, 40));
  placeStreetSite(city, pos, 2.4, 'parking-warden');

  storefront(scene, city, pos, {
    name: 'PARKING ENFORCEMENT', w: 2.6, h: 2.5, d: 1.8, wall: 0x2f3d4c, accent: 0xd8b820,
    sign: { fg: '#ffe040', bg: '#10161e', accent: '#ffe040' },
  });
  const yaw = faceNearestRoad(city, pos);
  const counter = new THREE.Vector3(0, 0, 2.0).applyAxisAngle(UP, yaw).add(new THREE.Vector3(pos.x, 0, pos.z));

  // shared marker art: a red "P" (violation) and a green tick (ticketed)
  const pTex = markerTexture((g) => {
    g.fillStyle = '#d0201a'; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
    g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.stroke();
    g.fillStyle = '#ffffff'; g.font = '900 84px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('P', 64, 70);
  });
  const okTex = markerTexture((g) => {
    g.fillStyle = '#1f8a3a'; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
    g.lineWidth = 14; g.strokeStyle = '#ffffff'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(34, 66); g.lineTo(56, 88); g.lineTo(96, 40); g.stroke();
  });
  const pMat = new THREE.SpriteMaterial({ map: pTex, transparent: true, depthTest: false, toneMapped: false });
  const okMat = new THREE.SpriteMaterial({ map: okTex, transparent: true, depthTest: false, toneMapped: false });
  // flashing hazard lamps: two amber blobs at the rear corners of each car
  const hazGeo = new THREE.SphereGeometry(0.13, 8, 6);
  const hazMat = new THREE.MeshBasicMaterial({ color: 0xffa020, toneMapped: false });

  const markers = [];
  for (let i = 0; i < TICKETS; i++) {
    const s = new THREE.Sprite(pMat);
    s.scale.set(1.1, 1.1, 1);
    s.visible = false;
    s.renderOrder = 5;
    scene.add(s);
    const haz = new THREE.Group();
    for (const x of [-0.85, 0.85]) {
      const m = new THREE.Mesh(hazGeo, hazMat);
      m.position.set(x, 0.85, -2.25);
      haz.add(m);
    }
    haz.visible = false;
    scene.add(haz);
    markers.push({ sprite: s, haz });
  }

  // owners: a small pool of characters reused shift to shift
  const owners = [];
  for (let i = 0; i < 3; i++) {
    const ch = createCharacter(randomOutfit());
    ch.group.visible = false;
    scene.add(ch.group);
    owners.push({ ch, busy: false });
  }

  world.parkingWarden = {
    pos, yaw, counter, scene,
    state: 'idle',          // idle -> shift
    t: 0, cooldown: 0, anim: 0,
    cars: [],               // pooled vehicles, created on the first shift
    viol: [],               // this shift's violations
    owners, markers, pMat, okMat, hazMat,
    hold: 0, holdTarget: null,
    tickets: 0, lost: 0, earned: 0,
    blip: { x: 0, z: 0 },
    hud: null,
    lifetime: save?.wardenTickets ?? 0,
  };
}

// ---- violation spots: kerbside in the parking lane, off the carriageway ----

function pickSpots(world) {
  const W = world.parkingWarden, city = world.city;
  const others = [...(world.parked || []), ...(world.traffic || [])];
  const sites = city.activitySites || [];
  const cands = [];
  for (let i = 0; i < 260; i++) {
    const vertical = Math.random() < 0.5;
    const roads = vertical ? city.roadXs : city.roadZs;
    const road = roads[(Math.random() * roads.length) | 0];
    const block = (Math.random() * N) | 0;
    const along = blockStart(block) + 7 + Math.random() * (BLOCK - 14);
    const side = Math.random() < 0.5 ? 1 : -1;
    const off = road + side * KERB;
    const x = vertical ? off : along, z = vertical ? along : off;
    const d = Math.hypot(x - W.pos.x, z - W.pos.z);
    if (d < 16 || d > 105) continue;
    cands.push({ x, z, d, vertical, side });
  }
  cands.sort((a, b) => a.d - b.d);
  const out = [];
  for (const c of cands) {
    if (out.length >= TICKETS * 2) break;
    if (blocked(world, c.x, c.z, 1.4)) continue;
    const sx = c.vertical ? c.side : 0, sz = c.vertical ? 0 : c.side;
    const door = { x: c.x + sx * 1.9, z: c.z + sz * 1.9 };
    if (blocked(world, door.x, door.z, 0.3)) continue;
    if (out.some((o) => Math.hypot(o.x - c.x, o.z - c.z) < 12)) continue;
    if (others.some((v) => v && !v.dead && Math.hypot(v.pos.x - c.x, v.pos.z - c.z) < 8)) continue;
    if (sites.some((s) => Math.hypot(s.x - c.x, s.z - c.z) < s.radius + 4)) continue;
    const heading = c.vertical ? (c.side > 0 ? 0 : Math.PI) : (c.side > 0 ? Math.PI / 2 : -Math.PI / 2);
    out.push({ x: c.x, z: c.z, heading, side: { x: sx, z: sz }, door });
  }
  // a little variety: keep the closest handful, then shuffle down to five
  for (let i = out.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [out[i], out[j]] = [out[j], out[i]]; }
  return out.slice(0, TICKETS);
}

// The doorway an owner comes running out of: the face of a nearby building
// with a clear straight run to the car's kerbside door. Falls back to a point
// down the sidewalk. Returns null if nothing has a clean line.
function clearLine(world, a, b) {
  const len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(2, Math.ceil(len / 0.8));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    if (blocked(world, a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k, 0.2)) return false;
  }
  return true;
}

function findDoor(world, v) {
  const t = v.door;
  let best = null, bestScore = Infinity;
  for (const c of world.city.colliders) {
    if ((c.h ?? 0) < 6 || c.x1 - c.x0 < 6 || c.z1 - c.z0 < 6 || c.dynamic) continue;
    const cx = Math.max(c.x0, Math.min(t.x, c.x1)), cz = Math.max(c.z0, Math.min(t.z, c.z1));
    const dx = t.x - cx, dz = t.z - cz, d = Math.hypot(dx, dz);
    if (d < 6 || d > 26) continue;
    const p = { x: cx + dx / d * 0.9, z: cz + dz / d * 0.9 };
    const score = Math.abs(d - 13);
    if (score >= bestScore) continue;
    if (blocked(world, p.x, p.z, 0.25) || !clearLine(world, p, t)) continue;
    best = p; bestScore = score;
  }
  if (best) return best;
  const ax = v.side.z, az = v.side.x; // along the kerb
  for (const s of [1, -1]) {
    const p = { x: t.x + ax * s * 14 + v.side.x * 2, z: t.z + az * s * 14 + v.side.z * 2 };
    if (!blocked(world, p.x, p.z, 0.25) && clearLine(world, p, t)) return p;
  }
  return null;
}

// ---- HUD ----

function ensureHud(world) {
  const W = world.parkingWarden;
  if (W.hud) return W.hud;
  const el = document.createElement('div');
  el.id = 'parkingwarden';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:340px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#1a0e08e0;border:1px solid #ffe040;border-radius:6px;display:none;z-index:30;color:#fff3c8;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#ffe040';
  const title = document.createElement('span');
  const stats = document.createElement('span');
  head.append(title, stats);
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:3px 4px';
  const label = document.createElement('span');
  label.style.cssText = 'width:120px';
  label.textContent = '🧾 Ticket';
  const bar = document.createElement('div');
  bar.style.cssText = 'flex:1;height:8px;background:#0006;border-radius:4px;overflow:hidden';
  const fill = document.createElement('div');
  fill.style.cssText = 'height:100%;width:0%;background:#ffe040';
  bar.appendChild(fill);
  row.append(label, bar);
  const warn = document.createElement('div');
  warn.style.cssText = 'font-size:12px;color:#ff7a5a;margin-top:4px;display:none';
  el.append(head, row, warn);
  document.body.appendChild(el);
  W.hud = { el, title, stats, fill, warn };
  return W.hud;
}

function renderHud(world) {
  const W = world.parkingWarden, hud = ensureHud(world);
  hud.title.textContent = `PARKING PATROL  ${Math.ceil(W.t)}s`;
  hud.stats.textContent = `tickets ${W.tickets}/${W.viol.length} · $${W.earned}`;
  hud.fill.style.width = `${Math.round(Math.min(1, W.hold / HOLD) * 100)}%`;
  const running = W.viol.some((v) => v.owner && v.owner.mode === 'run' && v.status === 'open');
  hud.warn.style.display = running ? 'block' : 'none';
  if (running) hud.warn.textContent = '⚠ An owner is running for their car — book it first!';
}

// ---- shift lifecycle ----

function startShift(world) {
  const W = world.parkingWarden;
  const spots = pickSpots(world);
  if (spots.length < 3) { showToast('No parking violations nearby right now'); W.cooldown = 5; return; }
  while (W.cars.length < spots.length) {
    const car = makeVehicle(W.scene, 0, 0, 0, randomCarColor());
    W.scene.remove(car.mesh);
    W.cars.push(car);
  }
  W.viol = spots.map((s, i) => {
    const car = W.cars[i];
    car.pos.set(s.x, 0, s.z);
    car.heading = s.heading;
    car.mesh.rotation.set(0, s.heading, 0);
    car.vel.set(0, 0, 0);
    car.mesh.visible = true;
    W.scene.add(car.mesh);
    const mk = W.markers[i];
    mk.sprite.material = W.pMat;
    mk.sprite.visible = true;
    mk.haz.position.set(s.x, 0, s.z);
    mk.haz.rotation.y = s.heading;
    mk.haz.visible = true;
    return { ...s, car, mk, status: 'open', ownerRoll: Math.random() < OWNER_CHANCE, owner: null, driveT: -1, honked: false };
  });
  W.state = 'shift';
  W.t = SHIFT;
  W.hold = 0; W.holdTarget = null;
  W.tickets = 0; W.lost = 0; W.earned = 0;
  ensureHud(world).el.style.display = 'block';
  sfxPickup();
  showMissionMsg('PARKING PATROL', `${W.viol.length} cars under the red P · walk up and hold E to write each ticket`, '#ffe040');
}

function releaseOwner(o) {
  if (!o) return;
  o.slot.busy = false;
  o.slot.ch.group.visible = false;
}

function endShift(world, reason) {
  const W = world.parkingWarden;
  W.state = 'idle';
  W.cooldown = COOLDOWN;
  for (const v of W.viol) {
    releaseOwner(v.owner);
    v.owner = null;
    W.scene.remove(v.car.mesh);
    v.mk.sprite.visible = false;
    v.mk.haz.visible = false;
  }
  W.viol = [];
  W.hold = 0; W.holdTarget = null;
  if (W.hud) W.hud.el.style.display = 'none';
  world.parkingWardenBlip = null;
  world.parkingWardenHint = null;

  const all = W.tickets >= TICKETS;
  if (all) { world.money += BONUS; W.earned += BONUS; }
  W.lifetime += W.tickets;
  if (W.tickets) { addRep(world, W.tickets * 25 + (all ? 75 : 0)); world.addXP?.(W.tickets * 20 + (all ? 60 : 0)); }
  const title = reason === 'vehicle' ? 'OFF THE CLOCK' : reason === 'quit' ? 'SHIFT ENDED EARLY' : all ? 'FULL BOOK!' : 'SHIFT OVER';
  (W.tickets >= 3 && reason !== 'vehicle' && reason !== 'quit' ? sfxMissionPass : sfxMissionFail)();
  showMissionMsg(title,
    `${W.tickets} ticket${W.tickets === 1 ? '' : 's'} · ${W.lost} got away · $${W.earned} earned${all ? ` (incl. $${BONUS} bonus)` : ''}` +
    (reason === 'vehicle' ? ' — wardens work on foot' : ''), '#ffe040');
  if (all && W.lifetime >= 25 && W.lifetime - W.tickets < 25) showNews('residents report a parking warden who never, ever misses a car');
  world.onSave?.();
}

// ---- per-frame ----

function spawnOwner(world, v) {
  const W = world.parkingWarden;
  const slot = W.owners.find((o) => !o.busy);
  if (!slot) return;
  const from = findDoor(world, v);
  if (!from) return;
  slot.busy = true;
  slot.ch.group.position.set(from.x, 0, from.z);
  slot.ch.group.visible = true;
  v.owner = { slot, mode: 'run', t: 0, argue: 0 };
  sfxHorn();
  showToast('🏃 "HEY! THAT\'S MY CAR!" — the owner is running out');
}

function updateOwner(world, v, dt) {
  const W = world.parkingWarden, o = v.owner, g = o.slot.ch.group;
  o.t += dt;
  if (o.mode === 'run') {
    const dx = v.door.x - g.position.x, dz = v.door.z - g.position.z, d = Math.hypot(dx, dz);
    const step = OWNER_SPEED * dt;
    g.rotation.y = Math.atan2(dx, dz);
    if (d > step + 0.05) {
      g.position.x += dx / d * step; g.position.z += dz / d * step;
      animateWalk(o.slot.ch, o.t * 12, 0.95);
      return;
    }
    g.position.set(v.door.x, 0, v.door.z);
    if (v.status === 'open') {
      // beat you to it: in the car and away, ticket lost
      v.status = 'lost';
      W.lost++;
      if (W.holdTarget === v) { W.hold = 0; W.holdTarget = null; }
      v.mk.sprite.visible = false;
      v.mk.haz.visible = false;
      releaseOwner(o); v.owner = null;
      v.driveT = 0;
      sfxMissionFail();
      showToast('🚗 Too slow — the owner jumped in and drove off. Ticket lost');
      return;
    }
    o.mode = 'argue'; o.argue = ARGUE;
    showToast('😤 "I was gone TWO MINUTES!" — the ticket stands');
    return;
  }
  // argue: rant at the warden, then drive off with the ticket on the windscreen
  const p = world.player.pos;
  g.rotation.y = Math.atan2(p.x - g.position.x, p.z - g.position.z);
  animateIdle(o.slot.ch);
  g.rotation.z = Math.sin(o.t * 14) * 0.06; // arm-waving fury, roughly
  o.argue -= dt;
  if (o.argue <= 0) {
    g.rotation.z = 0;
    releaseOwner(o); v.owner = null;
    v.mk.sprite.visible = false;
    v.mk.haz.visible = false;
    v.driveT = 0;
  }
}

function updateDriveOff(world, v, dt) {
  const W = world.parkingWarden, car = v.car, p = world.player.pos;
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  // wait (and lean on the horn) if the warden is standing in front of the bonnet
  const ahead = (p.x - car.pos.x) * fx + (p.z - car.pos.z) * fz;
  const lateral = Math.abs((p.x - car.pos.x) * fz - (p.z - car.pos.z) * fx);
  if (ahead > 0 && ahead < 4 && lateral < 1.4) {
    if (!v.honked) { sfxHorn(); v.honked = true; }
    return;
  }
  v.driveT += dt;
  const speed = Math.min(14, 1 + v.driveT * 5);
  car.vel.set(fx * speed, 0, fz * speed);
  car.pos.x += fx * speed * dt; car.pos.z += fz * speed * dt;
  if (v.driveT > 4.5) { W.scene.remove(car.mesh); car.vel.set(0, 0, 0); v.driveT = -1; v.gone = true; }
}

// keep the warden from walking through the parked cars (they aren't in
// world.parked, so the main loop doesn't collide them, and E stays ours)
function pushOutOfCar(world, car) {
  const p = world.player.pos;
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  const rx = p.x - car.pos.x, rz = p.z - car.pos.z;
  const lz = rx * fx + rz * fz, lx = rx * fz - rz * fx; // along / across the car
  const hx = 1.35, hz = 2.65;
  if (Math.abs(lx) >= hx || Math.abs(lz) >= hz || p.y > 1.6) return;
  const px = hx - Math.abs(lx), pz = hz - Math.abs(lz);
  let nlx = lx, nlz = lz;
  if (px < pz) nlx = Math.sign(lx || 1) * hx; else nlz = Math.sign(lz || 1) * hz;
  p.x = car.pos.x + nlz * fx + nlx * fz;
  p.z = car.pos.z + nlz * fz - nlx * fx;
}

export function updateParkingWarden(world, dt, keys, pressed) {
  const W = world.parkingWarden;
  if (!W) return;
  world.parkingWardenHint = null;
  if (W.cooldown > 0) W.cooldown = Math.max(0, W.cooldown - dt);
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat && !player.inPlane;
  const dBooth = Math.hypot(player.pos.x - W.counter.x, player.pos.z - W.counter.z);

  if (W.state === 'idle') {
    if (!onFoot || dBooth > 3.2 || player.pos.y > 3) return;
    if (W.cooldown > 0) { world.parkingWardenHint = `PARKING ENFORCEMENT — on a break, back in ${Math.ceil(W.cooldown)}s`; return; }
    world.parkingWardenHint = `PARKING ENFORCEMENT — press <b>E</b> to start a ticket shift${W.lifetime ? ` (${W.lifetime} written)` : ''}`;
    if (pressed['KeyE']) startShift(world);
    return;
  }

  // ---- shift running ----
  if (!onFoot) { endShift(world, 'vehicle'); return; }
  W.t -= dt;
  W.anim += dt;
  if (W.t <= 0) { endShift(world, 'time'); return; }

  const flash = Math.sin(W.anim * 9) > 0;
  W.hazMat.color.setHex(flash ? 0xffa020 : 0x3a2004);
  const bob = 2.55 + Math.sin(W.anim * 3) * 0.12;

  let nearest = null, nearestD = Infinity, writeV = null, writeD = Infinity;
  for (const v of W.viol) {
    if (v.driveT >= 0) updateDriveOff(world, v, dt);
    if (v.owner) updateOwner(world, v, dt);
    if (v.gone) continue;
    if (v.driveT < 0) pushOutOfCar(world, v.car);
    if (v.mk.sprite.visible) v.mk.sprite.position.set(v.car.pos.x, bob, v.car.pos.z);
    if (v.status !== 'open' || v.driveT >= 0) continue;
    const d = Math.hypot(player.pos.x - v.car.pos.x, player.pos.z - v.car.pos.z);
    if (d < nearestD) { nearestD = d; nearest = v; }
    if (d < WRITE_R && d < writeD && player.pos.y < 2.5) { writeD = d; writeV = v; }
    if (v.ownerRoll && !v.owner && d < OWNER_SPOT) { v.ownerRoll = false; spawnOwner(world, v); }
  }

  // writing a ticket: hold E beside the car
  if (writeV && keys['KeyE']) {
    if (W.holdTarget !== writeV) { W.holdTarget = writeV; W.hold = 0; }
    W.hold += dt;
    if (W.hold >= HOLD) {
      writeV.status = 'ticketed';
      W.tickets++;
      W.earned += PAY;
      world.money += PAY;
      writeV.mk.sprite.material = W.okMat;
      writeV.mk.haz.visible = false;
      W.hold = 0; W.holdTarget = null;
      sfxPickup();
      showToast(`🧾 Ticket written! +$${PAY} (${W.tickets}/${W.viol.length})`);
    }
  } else {
    W.hold = 0; W.holdTarget = null;
  }

  const open = W.viol.filter((v) => v.status === 'open' && v.driveT < 0 && !v.gone).length;
  if (!open && !W.viol.some((v) => v.owner || v.driveT >= 0)) { endShift(world, 'done'); return; }

  if (nearest) { W.blip.x = nearest.car.pos.x; W.blip.z = nearest.car.pos.z; world.parkingWardenBlip = W.blip; }
  else world.parkingWardenBlip = null;

  if (dBooth < 3.2 && !writeV && pressed['KeyE']) { endShift(world, 'quit'); return; }

  const clock = Math.ceil(W.t);
  if (writeV) {
    world.parkingWardenHint = W.hold > 0
      ? `WRITING TICKET… <b>${Math.round(W.hold / HOLD * 100)}%</b> — keep holding <b>E</b>`
      : `PARKING PATROL — hold <b>E</b> to write the ticket · <b>${clock}s</b>`;
  } else if (dBooth < 3.2) {
    world.parkingWardenHint = `PARKING PATROL — ${open} car${open === 1 ? '' : 's'} left · <b>E</b> clocks off · <b>${clock}s</b>`;
  } else if (nearest) {
    world.parkingWardenHint = `PARKING PATROL — next red <b>P</b> ${Math.round(nearestD)}m away · ${open} left · <b>${clock}s</b>`;
  }
  renderHud(world);
}

export function parkingWardenSave(world) {
  return { wardenTickets: world.parkingWarden?.lifetime };
}
