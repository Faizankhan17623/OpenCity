import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { postSign, signTexture } from './propKit.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// BILLBOARD HACKER: a netrunner's laptop stand near spawn. Take the job and
// four rooftop billboards light up across the city, one after another, on a
// single clock. Swing, zip or fly up to each, hold E to splice in, and the ad
// flips to your tag. All four before the clock runs out pays big; it's built
// for the web-slinging, chaining rooftops at speed.

const BOARDS = 4;
const TIME = 150;           // seconds for the whole run
const HACK_HOLD = 1.5;      // seconds of holding E at a board
const REACH = 3.2;          // horizontal reach to a board's console
const BASE_PAY = 1500;
const SPEED_PAY = 12;       // $ per second left on the clock
const COOLDOWN = 30;
const ADS = ['BUY MORE STUFF', 'DRINK FIZZ-O', 'SPIRE TOWERS', 'LUCKY 7 CASINO', 'MEGA MALL', 'AUTO PALACE'];

export function initBillboard(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(-12, 0, -16));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 1.6)) pos = world.city.spawn.clone().add(new THREE.Vector3(-16, 0, -12));
  placeStreetSite(world.city, pos, 2.2, 'billboard-hacker');
  postSign(scene, world.city, pos, 'NETRUNNER', { fg: '#c8ffd8', bg: '#071a10', accent: '#2fff7a' });

  // a folding table with a glowing laptop
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.08, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.6, metalness: 0.3 })
  );
  table.position.set(pos.x, 0.85, pos.z);
  scene.add(table);
  for (const [dx, dz] of [[-0.5, -0.28], [0.5, -0.28], [-0.5, 0.28], [0.5, 0.28]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.05), table.material);
    leg.position.set(pos.x + dx, 0.42, pos.z + dz);
    scene.add(leg);
  }
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.32, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x06140a, emissive: 0x2fff7a, emissiveIntensity: 0.7 })
  );
  screen.position.set(pos.x, 1.06, pos.z - 0.15);
  screen.rotation.x = -0.25;
  scene.add(screen);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.4, 30, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x2fff7a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.visible = false;
  scene.add(beam);

  world.billboard = {
    pos, scene, beam,
    state: 'idle',       // idle -> run
    boards: [], idx: 0, t: 0, hold: 0, cooldown: 0,
    runs: save?.billboardRuns ?? 0,
  };
}

// a rooftop billboard: two legs and a double-sided ad face on the roof's edge
function buildBoard(scene, roof, ad) {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.5, metalness: 0.6 });
  for (const x of [-1.6, 1.6]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 0.15), steel);
    leg.position.set(x, 1.1, 0);
    group.add(leg);
  }
  const mat = new THREE.MeshBasicMaterial({ map: signTexture(ad, { fg: '#ffffff', bg: '#3a1020', accent: '#ff6080' }), toneMapped: false });
  for (const side of [1, -1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), mat);
    face.position.set(0, 2.6, side * 0.03);
    face.rotation.y = side > 0 ? 0 : Math.PI;
    group.add(face);
  }
  group.position.set(roof.x, roof.y, roof.z);
  group.rotation.y = Math.random() * Math.PI;
  scene.add(group);
  return { group, mat, pos: new THREE.Vector3(roof.x, roof.y, roof.z), done: false };
}

// four roofs a fair swing apart, ordered as a sensible route from the stand
function pickRoute(world) {
  const B = world.billboard;
  const roofs = world.city.colliders.filter((c) => {
    const top = c.roofY ?? ((c.h ?? 0) - 0.3);
    if (top < 10 || top > 60 || c.x1 - c.x0 < 6 || c.z1 - c.z0 < 6) return false;
    const d = Math.hypot((c.x0 + c.x1) / 2 - B.pos.x, (c.z0 + c.z1) / 2 - B.pos.z);
    return d > 40 && d < 220;
  }).map((c) => ({ x: (c.x0 + c.x1) / 2, y: c.roofY ?? (c.h - 0.3), z: (c.z0 + c.z1) / 2 }));
  const route = [];
  let from = B.pos;
  for (let i = 0; i < BOARDS; i++) {
    const options = roofs.filter((r) => !route.includes(r) && route.every((q) => Math.hypot(q.x - r.x, q.z - r.z) > 45));
    if (!options.length) return null;
    // nearest few, then a random one of them, so routes vary but don't zig-zag
    options.sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z));
    const pick = options[(Math.random() * Math.min(3, options.length)) | 0];
    route.push(pick);
    from = pick;
  }
  return route;
}

function aimAt(world) {
  const B = world.billboard, b = B.boards[B.idx];
  B.beam.position.set(b.pos.x, b.pos.y + 15, b.pos.z);
  B.beam.visible = true;
  world.billboardBlip = { x: b.pos.x, z: b.pos.z };
}

function clearRun(world) {
  const B = world.billboard;
  for (const b of B.boards) B.scene.remove(b.group);
  B.boards = [];
  B.beam.visible = false;
  world.billboardBlip = null;
  world.billboardHint = null;
  B.state = 'idle';
  B.cooldown = COOLDOWN;
}

export function updateBillboard(world, dt, keys, pressed) {
  const B = world.billboard;
  if (!B) return;
  world.billboardHint = null;
  if (B.cooldown > 0) B.cooldown = Math.max(0, B.cooldown - dt);
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;

  if (B.state === 'idle') {
    if (!onFoot || Math.hypot(player.pos.x - B.pos.x, player.pos.z - B.pos.z) > 3) return;
    if (B.cooldown > 0) { world.billboardHint = 'NETRUNNER — the trace is still hot, give it a moment'; return; }
    world.billboardHint = `NETRUNNER — press <b>E</b> to hack ${BOARDS} rooftop billboards against the clock${B.runs ? ` (${B.runs} runs)` : ''}`;
    if (pressed['KeyE']) {
      const route = pickRoute(world);
      if (!route) { showToast('No billboards in range right now'); B.cooldown = 5; return; }
      B.boards = route.map((r, i) => buildBoard(B.scene, r, ADS[(i + B.runs) % ADS.length]));
      B.idx = 0; B.t = TIME; B.hold = 0;
      B.state = 'run';
      aimAt(world);
      sfxPickup();
      showMissionMsg('BILLBOARD HACK', `${BOARDS} rooftops, ${TIME}s — swing to the green beam and hold E`, '#2fff7a');
    }
    return;
  }

  B.t -= dt;
  if (B.t <= 0) {
    clearRun(world);
    sfxMissionFail();
    showMissionMsg('TRACED', 'Security locked you out — the ads stay up for now', '#ff5a4a');
    return;
  }
  const b = B.boards[B.idx];
  const dx = player.pos.x - b.pos.x, dz = player.pos.z - b.pos.z;
  const near = Math.hypot(dx, dz) < REACH && Math.abs(player.pos.y - b.pos.y) < 3;
  const clock = Math.ceil(B.t);
  if (!near) {
    B.hold = Math.max(0, B.hold - dt * 2);
    world.billboardHint = `BILLBOARD ${B.idx + 1}/${BOARDS} — reach the green beam (${Math.round(Math.hypot(dx, dz))}m, ${Math.round(b.pos.y)}m up) · <b>${clock}s</b>`;
    return;
  }
  if (!keys['KeyE']) {
    B.hold = Math.max(0, B.hold - dt * 2);
    world.billboardHint = `BILLBOARD ${B.idx + 1}/${BOARDS} — hold <b>E</b> to splice in · <b>${clock}s</b>`;
    return;
  }
  B.hold += dt;
  world.billboardHint = `SPLICING... ${Math.max(0, HACK_HOLD - B.hold).toFixed(1)}s · <b>${clock}s</b>`;
  if (B.hold < HACK_HOLD) return;

  // hacked: the ad flips to our tag
  B.hold = 0;
  b.done = true;
  b.mat.map = signTexture('HACKED', { fg: '#c8ffd8', bg: '#04170b', accent: '#2fff7a' });
  b.mat.needsUpdate = true;
  sfxPickup();
  B.idx++;
  if (B.idx < BOARDS) { aimAt(world); showToast(`Billboard hacked — ${BOARDS - B.idx} to go`); return; }

  const pay = BASE_PAY + Math.round(B.t * SPEED_PAY);
  world.money += pay;
  B.runs++;
  addRep(world, 300);
  world.addXP?.(260);
  sfxMissionPass();
  showMissionMsg('CITY HACKED', `Every billboard is yours — +$${pay.toLocaleString()}`, '#2fff7a');
  showNews('rooftop billboards across the city flash a mysterious green tag');
  // let the hacked boards glow a while before the clean-up crews take them down
  const done = B.boards;
  B.boards = [];
  setTimeout(() => { for (const x of done) B.scene.remove(x.group); }, 20000);
  clearRun(world);
  world.onSave?.();
}

export function billboardSave(world) {
  return { billboardRuns: world.billboard?.runs };
}
