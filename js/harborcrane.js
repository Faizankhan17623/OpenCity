import * as THREE from 'three';
import { WATER_X0, WATER_Y } from './water.js';
import { pointBlocked } from './city.js';
import { signTexture } from './propKit.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxCrash, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';
import { addSparks, addRing } from './effects.js';

// HARBOR CRANE: a container gantry straddles the seawall past the city's east
// edge, its boom reaching out over a deck barge moored alongside. Climb the
// cab ladder (E) to work a shift. The trolley swings each box out from the
// quay stack and shuttles it back and forth along the boom on its own; press
// E to stop it, and the box lowers onto the barge, swinging a little as it
// goes. Land it on the yellow slot: within 0.4 m is perfect, within 1.2 m is
// fine, anything worse is a crunch that knocks the box into the harbor.
// Boxes stack two high, so the later drops are shorter and catch the swing at
// a different point. Eight boxes a shift; three crunches and you're sent home.
// Only E and 1 (clock off) do anything up there.

const BOXES = 8;
const MAX_CRUNCH = 3;
const PERFECT = 0.4, OK = 1.2;  // landing error limits (metres)
const PAY_PERFECT = 240;
const PAY_OK_HI = 180, PAY_OK_LO = 80; // OK pay slides from 0.4 m to 1.2 m
const DAMAGE = 75;                     // a crunch's repair bill
const CLEAN_BONUS = 400;               // a shift without a crunch
const COOLDOWN = 8;

// box and rig dimensions
const CW = 2.44, CH = 2.59, CL = 6.06;      // a 20 ft box, long side along z
const COLORS = [0xb5402e, 0x2e6fb5, 0x3a8a4a, 0xd08a2a, 0x7a8088, 0x7a3a8a, 0xd8b83a, 0x2a9a9a];

// the swing: once the trolley stops, the load keeps going in the direction of
// travel and swings like a pendulum, damping as it is paid out
const SWING_K = 0.12;                 // swing amplitude per m/s of trolley speed
const OMEGA = (Math.PI * 2) / 2.0;    // swing period 2 s: a deck drop lands on the
                                      // forward swing, a second-tier drop on the back swing
const DAMP = 0.25;
const LOWER_V = 3;                    // m/s the hoist pays out
const SHUTTLE_V = 11;                 // trolley speed fetching a box
const runSpeed = (i) => 4 + i * 0.45; // the trolley quickens box by box

let _tex = null;
function corrugation() {
  if (_tex) return _tex;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 64);
  for (let x = 0; x < 64; x += 8) {           // ribs: a dark groove and a highlight
    g.fillStyle = '#9a9a9a'; g.fillRect(x, 0, 3, 64);
    g.fillStyle = '#d4d4d4'; g.fillRect(x + 3, 0, 1, 64);
  }
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 64, 3); g.fillRect(0, 61, 64, 3); // top and bottom rails
  _tex = new THREE.CanvasTexture(c);
  _tex.wrapS = THREE.RepeatWrapping;
  _tex.repeat.set(7, 1);
  _tex.colorSpace = THREE.SRGBColorSpace;
  return _tex;
}

function pickZ(world) {
  const cols = world.city.colliders, sites = world.city.activitySites || [];
  for (const z of [-170, -195, -145, -250, 190, 240]) {
    const probes = [[WATER_X0 - 4.6, z - 6], [WATER_X0 - 3.4, z], [WATER_X0 - 3.4, z + 11], [WATER_X0 - 3.4, z - 12]];
    if (probes.some(([x, pz]) => pointBlocked(new THREE.Vector3(x, 1, pz), cols, 1))) continue;
    if (sites.some((s) => Math.abs(s.z - z) < 18 + (s.radius || 0) && Math.abs(s.x - WATER_X0) < 30 + (s.radius || 0))) continue;
    return z;
  }
  return -170;
}

export function initHarborCrane(scene, world, save) {
  const CZ = pickZ(world);
  const X0 = WATER_X0;
  const LEG_IN = X0 - 4, LEG_OUT = X0 + 4;   // landside legs on the sand, waterside legs in the harbor
  const GANTRY_H = 15, BOOM_Y = 16.2;
  const BOOM_X0 = X0 - 9, BOOM_X1 = X0 + 36;
  const TROLLEY_Y = 15.3;
  const CARRY_Y = 8.6;                       // box bottom while carried
  const DECK_Y = WATER_Y + 0.9;              // barge deck top
  const STACK_X = X0 - 3.4;                  // the quay stack, under the backreach
  const CAB = new THREE.Vector3(X0 + 5.6, 13.2, CZ - 2.3);
  const ladder = new THREE.Vector3(LEG_IN - 0.9, 0, CZ - 6);

  const root = new THREE.Group();
  scene.add(root);
  const steel = new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.55, metalness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23272d, roughness: 0.7, metalness: 0.3 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5, metalness: 0.2 });
  const box = (w, h, d, mat, x, y, z, parent = root) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const _up = new THREE.Vector3(0, 1, 0);
  const rod = (a, b, t, mat) => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.BoxGeometry(t, dir.length(), t), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(_up, dir.normalize());
    root.add(m);
    return m;
  };

  // gantry: four legs, sill beams, portal beams, an A-frame and stays to the boom
  for (const x of [LEG_IN, LEG_OUT]) {
    const y0 = x === LEG_OUT ? -2 : 0;
    for (const z of [CZ - 6, CZ + 6]) {
      box(0.8, GANTRY_H - y0, 0.8, steel, x, (GANTRY_H + y0) / 2, z);
      box(1.4, 0.6, 1.4, dark, x, y0 + 0.3, z); // bogie
    }
    box(0.9, 1, 13, steel, x, GANTRY_H, CZ);   // portal beam along z
  }
  for (const z of [CZ - 6, CZ + 6]) {
    box(LEG_OUT - LEG_IN + 0.8, 0.8, 0.8, steel, X0, GANTRY_H - 0.1, z);
    rod(new THREE.Vector3(LEG_IN, 3, z), new THREE.Vector3(LEG_OUT, GANTRY_H - 1, z), 0.3, steel); // cross brace
  }
  const apex = new THREE.Vector3(X0, 25, CZ);
  for (const z of [CZ - 1.4, CZ + 1.4]) {
    rod(new THREE.Vector3(LEG_IN, GANTRY_H, z), new THREE.Vector3(X0, 25, z), 0.45, steel);
    rod(new THREE.Vector3(LEG_OUT, GANTRY_H, z), new THREE.Vector3(X0, 25, z), 0.45, steel);
  }
  box(0.6, 0.6, 3.4, steel, X0, 25, CZ);
  rod(apex, new THREE.Vector3(BOOM_X1 - 1, BOOM_Y + 0.5, CZ), 0.18, dark); // forestay to the boom tip
  rod(apex, new THREE.Vector3(BOOM_X0 + 1, BOOM_Y + 0.5, CZ), 0.18, dark); // backstay
  // the boom: two girders with the trolley running between them
  for (const z of [CZ - 1.1, CZ + 1.1]) box(BOOM_X1 - BOOM_X0, 1.0, 0.45, steel, (BOOM_X0 + BOOM_X1) / 2, BOOM_Y, z);
  for (let x = BOOM_X0 + 2; x < BOOM_X1; x += 4) box(0.25, 0.25, 2.6, steel, x, BOOM_Y + 0.55, CZ);
  const tipLight = box(0.35, 0.35, 0.35, new THREE.MeshBasicMaterial({ color: 0xff3020 }), BOOM_X1 - 0.3, BOOM_Y + 0.7, CZ);
  tipLight.castShadow = false;
  // machinery house over the landside legs, with the operator's name board
  box(5, 2.6, 4.4, new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.7 }), X0 - 3, BOOM_Y + 1.8, CZ);
  const signMat = new THREE.MeshBasicMaterial({ map: signTexture('PORT OF OPENCITY', { fg: '#ffffff', bg: '#14304a', accent: '#f2c230' }), toneMapped: false });
  for (const side of [1, -1]) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), signMat);
    board.position.set(X0 - 3, BOOM_Y + 1.8, CZ + side * 2.22);
    board.rotation.y = side > 0 ? 0 : Math.PI;
    root.add(board);
  }

  // the operator's cab hangs off the side of the boom, just outboard of the legs
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.25, roughness: 0.1, metalness: 0.6, depthWrite: false });
  box(2.4, 0.2, 2.4, dark, CAB.x, CAB.y - 0.1, CAB.z);           // floor
  box(2.6, 0.2, 2.6, steel, CAB.x, CAB.y + 2.3, CAB.z);           // roof
  for (const [dx, dz] of [[-1.15, -1.15], [1.15, -1.15], [-1.15, 1.15], [1.15, 1.15]]) box(0.12, 2.3, 0.12, steel, CAB.x + dx, CAB.y + 1.15, CAB.z + dz);
  box(0.05, 1.6, 2.3, glass, CAB.x + 1.18, CAB.y + 1.2, CAB.z).castShadow = false;   // windscreen over the water
  box(2.3, 1.6, 0.05, glass, CAB.x, CAB.y + 1.2, CAB.z - 1.18).castShadow = false;
  rod(new THREE.Vector3(CAB.x, CAB.y + 2.4, CAB.z + 0.6), new THREE.Vector3(CAB.x, BOOM_Y - 0.5, CZ - 1.1), 0.2, steel); // hanger
  box(0.5, 0.5, 0.4, yellow, CAB.x - 0.4, CAB.y + 0.75, CAB.z + 0.6); // the console
  // a floor the operator can stand on (only solid from the floor up)
  world.city.colliders.push({ x0: CAB.x - 1.2, z0: CAB.z - 1.2, x1: CAB.x + 1.2, z1: CAB.z + 1.2, y0: CAB.y - 0.4, h: CAB.y + 0.3, roofY: CAB.y });

  // the ladder up the landside leg
  for (const dz of [-0.3, 0.3]) box(0.08, GANTRY_H, 0.08, yellow, LEG_IN - 0.5, GANTRY_H / 2, CZ - 6 + dz);
  for (let y = 0.4; y < GANTRY_H; y += 0.45) box(0.05, 0.05, 0.6, yellow, LEG_IN - 0.5, y, CZ - 6);

  // trolley, hoist cables and spreader
  const trolley = box(2.0, 0.8, 1.8, yellow, X0, TROLLEY_Y, CZ);
  const cableGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 5);
  cableGeo.translate(0, -0.5, 0); // pivot at the top so scale.y is the length
  const cables = [-0.7, 0.7].map((dz) => {
    const c = new THREE.Mesh(cableGeo, dark);
    root.add(c);
    return { mesh: c, dz };
  });
  const spreader = new THREE.Group();
  box(CW + 0.1, 0.3, CL + 0.1, yellow, 0, 0.15, 0, spreader);
  box(0.4, 0.5, 0.8, dark, 0, 0.5, 0, spreader);
  root.add(spreader);

  // the deck barge moored alongside, with a little wheelhouse at the far end
  const bargeX = X0 + 19.5;
  box(22, 1.8, 14, new THREE.MeshStandardMaterial({ color: 0x3d4148, roughness: 0.85 }), bargeX, WATER_Y, CZ);
  box(22, 0.05, 13.4, new THREE.MeshStandardMaterial({ color: 0x5a3d2a, roughness: 0.9 }), bargeX, DECK_Y + 0.02, CZ);
  for (const z of [CZ - 6.85, CZ + 6.85]) box(22, 0.5, 0.3, new THREE.MeshStandardMaterial({ color: 0xc23a2a, roughness: 0.7 }), bargeX, DECK_Y + 0.25, z);
  box(3, 2.6, 4, new THREE.MeshStandardMaterial({ color: 0xe8e6de, roughness: 0.7 }), bargeX + 9, DECK_Y + 1.3, CZ);
  box(3.1, 0.6, 4.1, dark, bargeX + 9, DECK_Y + 2.1, CZ);
  const slots = [X0 + 13, X0 + 16.2, X0 + 19.4, X0 + 22.6];
  const X_LO = X0 + 9, X_HI = X0 + 28;      // the trolley's run over the barge
  // slot paint lines on the deck
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xe8e0c0 });
  for (const sx of slots) for (const dx of [-CW / 2 - 0.15, CW / 2 + 0.15]) box(0.08, 0.02, CL + 0.3, lineMat, sx + dx, DECK_Y + 0.06, CZ).castShadow = false;

  const target = new THREE.Mesh(
    new THREE.BoxGeometry(CW + 0.3, 0.12, CL + 0.3),
    new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.6, depthWrite: false })
  );
  target.visible = false;
  root.add(target);

  // containers: one material per colour, all sharing the corrugation texture
  const tex = corrugation();
  const cGeo = new THREE.BoxGeometry(CW, CH, CL);
  const cMats = COLORS.map((color) => new THREE.MeshStandardMaterial({ color, map: tex, roughness: 0.75, metalness: 0.2 }));
  const makeBox = (i) => { const m = new THREE.Mesh(cGeo, cMats[i % cMats.length]); m.castShadow = true; m.receiveShadow = true; root.add(m); return m; };

  // the quay stack under the backreach, and two more along the sand
  const stacks = [[CZ, 2], [CZ + 10.5, 3], [CZ - 12.5, 2]];
  let k = 3;
  for (const [z, n] of stacks) {
    for (let j = 0; j < n; j++) { const m = makeBox(k++); m.position.set(STACK_X, CH / 2 + j * CH, z); }
    world.city.colliders.push({ x0: STACK_X - CW / 2, z0: z - CL / 2, x1: STACK_X + CW / 2, z1: z + CL / 2, h: n * CH + 0.3, roofY: n * CH });
  }
  const pool = [];
  for (let i = 0; i < BOXES; i++) { const m = makeBox(i); m.visible = false; pool.push(m); }

  (world.city.activitySites ||= []).push({ x: X0 - 1, z: CZ, radius: 16, label: 'harbor-crane' });

  world.harborCrane = {
    pos: ladder, cab: CAB, cz: CZ,
    state: 'idle',        // idle -> fetch -> run -> lower -> settle -> (fetch | idle)
    phase: 0, t: 0,
    trolley, cables, spreader, target, pool, tipLight,
    slots, X_LO, X_HI, STACK_X, CARRY_Y, TROLLEY_Y, DECK_Y,
    trolleyX: STACK_X, hookY: CARRY_Y + CH, // spreader bottom height
    s: 0, dir: 1, speed: 0,
    stopX: 0, stopV: 0, loadX: 0, landY: 0, T: 0,
    targets: [], stackN: [0, 0, 0, 0],
    idx: 0, crunches: 0, perfects: 0, score: 0, earned: 0,
    box: null, waiting: null, falling: [], last: null,
    idealPlus: 0, idealMinus: 0,
    cooldown: 0, hud: null,
    best: save?.craneBestScore ?? 0,
  };
  placeRig(world.harborCrane);
}

// ---- helpers ----

function placeRig(H) {
  H.trolley.position.x = H.trolleyX;
  const x = H.box ? H.loadX : H.trolleyX;
  const top = H.TROLLEY_Y - 0.4;
  const spreaderY = H.hookY + (H.box ? CH : 0);
  for (const c of H.cables) {
    c.mesh.position.set(H.trolleyX, top, H.cz + c.dz);
    const dx = x - H.trolleyX, dy = top - (spreaderY + 0.6);
    c.mesh.scale.y = Math.max(0.1, Math.hypot(dx, dy));
    c.mesh.rotation.z = Math.atan2(dx, dy);
  }
  H.spreader.position.set(x, spreaderY, H.cz);
  H.spreader.rotation.z = Math.atan2(x - H.trolleyX, top - spreaderY) * 0.5;
  if (H.box) {
    H.box.position.set(x, H.hookY + CH / 2, H.cz);
    H.box.rotation.z = H.spreader.rotation.z;
  }
}

// where the swing has carried the load (relative to the stop point) after
// lowering for T seconds, for a stop at speed v (signed, +x outward)
function swingOffset(v, T) {
  return v * SWING_K * Math.sin(OMEGA * T) * Math.exp(-DAMP * T);
}

function landingY(H, slot) { return H.DECK_Y + H.stackN[slot] * CH; }

function setupTarget(H) {
  const slot = H.targets[H.idx];
  const tx = H.slots[slot];
  H.landY = landingY(H, slot);
  H.T = (H.CARRY_Y - H.landY) / LOWER_V;
  H.target.position.set(tx, H.landY + 0.08, H.cz);
  H.target.visible = true;
  // the stop points that would land dead on, either way the trolley is running
  const v = runSpeed(H.idx);
  H.idealPlus = tx - swingOffset(v, H.T);
  H.idealMinus = tx - swingOffset(-v, H.T);
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function ensureHud(world) {
  const H = world.harborCrane;
  if (H.hud) return H.hud;
  const el = document.createElement('div');
  el.id = 'harborcrane';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:340px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#0a1420e0;border:1px solid #f2c230;border-radius:6px;display:none;z-index:30;color:#e8f0f8;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#f2c230';
  const title = document.createElement('span');
  const right = document.createElement('span');
  head.append(title, right);
  const track = document.createElement('div');
  track.style.cssText = 'position:relative;height:20px;background:#0006;border-radius:4px;overflow:hidden;margin-bottom:6px';
  const okZone = document.createElement('div');
  okZone.style.cssText = 'position:absolute;top:0;height:100%;background:#f2c23040';
  const perfZone = document.createElement('div');
  perfZone.style.cssText = 'position:absolute;top:0;height:100%;background:#f2c230aa';
  const trolley = document.createElement('div');
  trolley.style.cssText = 'position:absolute;top:0;width:4px;height:8px;margin-left:-2px;background:#ffffff';
  const load = document.createElement('div');
  load.style.cssText = 'position:absolute;top:8px;width:10px;height:12px;margin-left:-5px;background:#ff8a3a;border-radius:2px';
  track.append(okZone, perfZone, trolley, load);
  const info = document.createElement('div');
  info.style.cssText = 'font-size:12px;opacity:.85';
  el.append(head, track, info);
  document.body.appendChild(el);
  H.hud = { el, title, right, okZone, perfZone, trolley, load, info };
  return H.hud;
}

function renderHud(world) {
  const H = world.harborCrane, hud = ensureHud(world);
  const span = H.X_HI - H.X_LO;
  const pct = (x) => Math.max(0, Math.min(100, ((x - H.X_LO) / span) * 100));
  hud.title.textContent = `HARBOR CRANE  box ${Math.min(H.idx + 1, BOXES)}/${BOXES}`;
  hud.right.textContent = `score ${H.score} · $${H.earned}`;
  const tx = H.target.visible ? H.target.position.x : null;
  hud.okZone.style.display = hud.perfZone.style.display = tx == null ? 'none' : 'block';
  if (tx != null) {
    hud.okZone.style.left = pct(tx - OK) + '%';
    hud.okZone.style.width = (2 * OK / span * 100) + '%';
    hud.perfZone.style.left = pct(tx - PERFECT) + '%';
    hud.perfZone.style.width = (2 * PERFECT / span * 100) + '%';
  }
  hud.trolley.style.left = pct(H.trolleyX) + '%';
  hud.load.style.display = H.box ? 'block' : 'none';
  hud.load.style.left = pct(H.loadX) + '%';
  const tier = H.target.visible && H.landY > H.DECK_Y + 0.5 ? ' · 2nd tier: mind the swing' : '';
  hud.info.textContent = `crunches ${'💥'.repeat(H.crunches)}${'·'.repeat(MAX_CRUNCH - H.crunches)}  ·  perfect ${H.perfects}${tier}`;
}

function startShift(world) {
  const H = world.harborCrane, p = world.player;
  H.state = 'fetch'; H.phase = 0; H.t = 0;
  H.idx = 0; H.crunches = 0; H.perfects = 0; H.score = 0; H.earned = 0;
  H.stackN = [0, 0, 0, 0];
  H.targets = [...shuffle([0, 1, 2, 3]), ...shuffle([0, 1, 2, 3])];
  for (const m of H.pool) m.visible = false;
  H.falling.length = 0;
  H.box = null; H.waiting = null; H.loadX = H.trolleyX;
  H.hookY = H.CARRY_Y + CH;
  p.pos.set(H.cab.x, H.cab.y, H.cab.z);
  p.vel.set(0, 0, 0); p.vy = 0;
  p.heading = Math.PI / 2; // facing the water
  ensureHud(world).el.style.display = 'block';
  sfxPickup();
  showMissionMsg('HARBOR CRANE', 'The trolley runs by itself — press E to stop it over the yellow slot · 1 clocks off', '#f2c230');
}

function endShift(world, why) {
  const H = world.harborCrane, p = world.player;
  H.state = 'idle';
  H.cooldown = COOLDOWN;
  H.target.visible = false;
  if (H.box) { H.box.visible = false; H.box = null; }
  if (H.waiting) { H.waiting.visible = false; H.waiting = null; }
  H.loadX = H.trolleyX;
  H.hookY = H.CARRY_Y + CH;
  if (H.hud) H.hud.el.style.display = 'none';
  world.harborCraneHint = null;
  // climb back down, unless something else has already taken the player away
  if (why !== 'vehicle' && why !== 'gone') {
    p.pos.set(H.pos.x, 0, H.pos.z);
    p.vel.set(0, 0, 0); p.vy = 0;
  }
  const landed = H.idx - H.crunches;
  let bonus = 0;
  if (why === 'done' && H.crunches === 0) { bonus = CLEAN_BONUS; world.money += bonus; H.earned += bonus; }
  addRep(world, Math.round(H.score / 4));
  world.addXP?.(Math.round(H.score / 3));
  const newBest = H.score > H.best;
  if (newBest) H.best = H.score;
  const title = why === 'done' ? 'SHIFT COMPLETE' : why === 'crunched' ? 'SENT HOME' : 'CLOCKED OFF';
  (why === 'done' ? sfxMissionPass : sfxMissionFail)();
  showMissionMsg(title, `${landed}/${BOXES} boxes landed · ${H.perfects} perfect · score ${H.score} · $${H.earned}${bonus ? ' (clean-shift bonus!)' : ''}${newBest ? ' · NEW BEST!' : ''}`, '#f2c230');
  if (why === 'done' && H.perfects >= 6) showNews('a crane operator at the Port of OpenCity lands a barge-load without a scratch');
  world.onSave?.();
}

function land(world) {
  const H = world.harborCrane;
  const slot = H.targets[H.idx];
  const tx = H.slots[slot];
  const err = Math.abs(H.loadX - tx);
  let msg;
  if (err <= OK) {
    const perfect = err <= PERFECT;
    const pay = perfect ? PAY_PERFECT : Math.round(PAY_OK_HI - (PAY_OK_HI - PAY_OK_LO) * (err - PERFECT) / (OK - PERFECT));
    const pts = perfect ? 100 : Math.round(70 - 40 * (err - PERFECT) / (OK - PERFECT));
    world.money += pay;
    H.earned += pay;
    H.score += pts;
    if (perfect) H.perfects++;
    H.stackN[slot]++;
    H.box.position.set(perfect ? tx : H.loadX, H.landY + CH / 2, H.cz);
    H.box.rotation.z = 0;
    sfxPickup();
    msg = `${perfect ? 'PERFECT' : 'OK'} — ${err.toFixed(2)} m off · +$${pay}`;
    H.last = { err, result: perfect ? 'perfect' : 'ok', pay };
  } else {
    H.crunches++;
    const fee = Math.min(DAMAGE, Math.max(0, world.money));
    world.money -= fee;
    H.earned -= fee;
    const out = Math.sign(H.loadX - tx) || 1;
    H.falling.push({ mesh: H.box, vx: out * 2.5, vy: 1.5, spin: out * -1.6 });
    const at = H.box.position.clone();
    addSparks(at, 16);
    sfxCrash(14);
    world.shake = Math.min(0.4, (world.shake || 0) + 0.25);
    msg = `CRUNCH! ${err.toFixed(1)} m off — the box goes over the side${fee ? ` · -$${fee} damage` : ''}`;
    H.last = { err, result: 'crunch', pay: -fee };
  }
  showToast(msg);
  H.box = null;
  H.hookY = H.landY + CH; // the empty spreader, still on the box's roof
  H.loadX = H.trolleyX;
  H.target.visible = false;
  H.idx++;
  H.state = 'settle';
  H.t = 0;
}

function updateFalling(H, dt) {
  for (let i = H.falling.length - 1; i >= 0; i--) {
    const f = H.falling[i];
    f.vy -= 9.8 * dt;
    f.mesh.position.x += f.vx * dt;
    f.mesh.position.y += f.vy * dt;
    f.mesh.rotation.z += f.spin * dt;
    if (!f.splashed && f.mesh.position.y < WATER_Y) { f.splashed = true; addRing(new THREE.Vector3(f.mesh.position.x, WATER_Y + 0.1, f.mesh.position.z), 0xd8f0ff); }
    if (f.mesh.position.y < WATER_Y - 5) { f.mesh.visible = false; H.falling.splice(i, 1); }
  }
}

const moveTo = (x, to, step) => (Math.abs(to - x) <= step ? to : x + Math.sign(to - x) * step);

export function updateHarborCrane(world, dt, keys, pressed) {
  const H = world.harborCrane;
  if (!H) return;
  world.harborCraneHint = null;
  if (H.cooldown > 0) H.cooldown = Math.max(0, H.cooldown - dt);
  updateFalling(H, dt);
  H.tipLight.visible = (world.time || 0) % 1.6 < 0.8;

  const p = world.player;
  const inVehicle = !!(p.inCar || p.inHeli || p.inBoat || p.inPlane);

  if (H.state === 'idle') {
    if (inVehicle || Math.hypot(p.pos.x - H.pos.x, p.pos.z - H.pos.z) > 3 || p.pos.y > 3) return;
    if (H.cooldown > 0) { world.harborCraneHint = 'HARBOR CRANE — the next barge is still being warped in'; return; }
    world.harborCraneHint = `HARBOR CRANE — press <b>E</b> to climb to the cab and work a shift${H.best ? ` (best ${H.best})` : ''}`;
    if (pressed['KeyE']) startShift(world);
    return;
  }

  // ---- on shift: the operator stays in the cab ----
  if (inVehicle) { endShift(world, 'vehicle'); return; }
  if ((p.health ?? 1) <= 0 || Math.hypot(p.pos.x - H.cab.x, p.pos.z - H.cab.z) > 8) { endShift(world, 'gone'); return; }
  world.nearKiosk = true; // 1 clocks off here, not a weapon switch
  if (pressed['Digit1']) { endShift(world, 'quit'); return; }
  p.pos.set(H.cab.x, H.cab.y, H.cab.z);
  p.vel.set(0, 0, 0); p.vy = 0;
  H.t += dt;

  if (H.state === 'fetch') {
    // 0: run back empty over the quay stack · 1: lower onto the new box ·
    // 2: hoist it · 3: carry it out to the barge
    world.harborCraneHint = `HARBOR CRANE — fetching box ${H.idx + 1}/${BOXES} from the quay...`;
    const stackTop = 2 * CH; // the next box waits on top of the two-high quay stack
    if (H.phase === 0) {
      H.trolleyX = moveTo(H.trolleyX, H.STACK_X, SHUTTLE_V * dt);
      H.hookY = Math.min(H.CARRY_Y + CH, H.hookY + LOWER_V * 2 * dt);
      if (H.trolleyX === H.STACK_X && H.hookY >= H.CARRY_Y + CH - 0.01) {
        H.phase = 1;
        const b = H.pool[H.idx];
        b.rotation.set(0, 0, 0);
        b.position.set(H.STACK_X, stackTop + CH / 2, H.cz);
        b.visible = true;
        H.waiting = b;
      }
    } else if (H.phase === 1) {
      // the empty spreader comes down onto the box's roof
      H.hookY = Math.max(stackTop + CH, H.hookY - LOWER_V * 2.5 * dt);
      if (H.hookY <= stackTop + CH) { H.phase = 2; H.box = H.waiting; H.waiting = null; H.hookY = stackTop; }
    } else if (H.phase === 2) {
      H.hookY = Math.min(H.CARRY_Y, H.hookY + LOWER_V * 2 * dt);
      if (H.hookY >= H.CARRY_Y) H.phase = 3;
    } else {
      H.trolleyX = moveTo(H.trolleyX, H.X_LO, SHUTTLE_V * dt);
      if (H.trolleyX === H.X_LO) {
        H.state = 'run';
        H.s = 0; H.dir = 1; H.speed = runSpeed(H.idx);
        setupTarget(H);
      }
    }
    H.loadX = H.trolleyX;
    placeRig(H);
    renderHud(world);
    return;
  }

  if (H.state === 'run') {
    const span = H.X_HI - H.X_LO;
    H.s += H.speed * dt;
    const m = H.s % (2 * span);
    H.dir = m < span ? 1 : -1;
    H.trolleyX = H.X_LO + (m < span ? m : 2 * span - m);
    H.loadX = H.trolleyX;
    placeRig(H);
    world.harborCraneHint = `HARBOR CRANE — press <b>E</b> to stop the trolley over the <b>yellow slot</b> · <b>1</b> clocks off`;
    if (pressed['KeyE']) {
      H.state = 'lower';
      H.t = 0;
      H.stopX = H.trolleyX;
      H.stopV = H.dir * H.speed;
      sfxCrash(3); // the trolley brakes clunk
    }
    renderHud(world);
    return;
  }

  if (H.state === 'lower') {
    world.harborCraneHint = 'HARBOR CRANE — lowering... watch the swing';
    const t = Math.min(H.t, H.T);
    H.trolleyX = H.stopX;
    H.loadX = H.stopX + swingOffset(H.stopV, t);
    H.hookY = H.CARRY_Y - LOWER_V * t;
    placeRig(H);
    renderHud(world);
    if (H.t >= H.T) land(world);
    return;
  }

  // settle: the empty spreader rises clear, then the next box (or the end)
  world.harborCraneHint = 'HARBOR CRANE — hoisting clear...';
  H.hookY = Math.min(H.CARRY_Y + CH, H.hookY + LOWER_V * 2 * dt);
  H.loadX = H.trolleyX;
  placeRig(H);
  renderHud(world);
  if (H.t < 1.2) return;
  if (H.crunches >= MAX_CRUNCH) { endShift(world, 'crunched'); return; }
  if (H.idx >= BOXES) { endShift(world, 'done'); return; }
  H.state = 'fetch'; H.phase = 0; H.t = 0;
}

export function harborCraneSave(world) {
  return { craneBestScore: world.harborCrane?.best };
}
