import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { storefront, signTexture, faceNearestRoad } from './propKit.js';
import { makeVehicle } from './car.js';
import { repairVehicleComponent } from './vehicleComponents.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail, engine } from './sound.js';
import { addRep } from './economy.js';
import { availableFunds, spendMoney } from './wallet.js';

// CITY DRIVING SCHOOL: an office near spawn with a learner hatchback (L plate
// on the roof) parked beside it. Press E at the office (or E from the
// driver's seat of the learner car) to sit the $50 test: five lessons on the
// street the office faces, scored from 100 down.
//   1 SLALOM      weave the cones, alternating sides (knock one: -5)
//   2 STOP BOX    come to a full stop inside the box before the junction
//                 (rolling through it: -15)
//   3 SPEED ZONE  stay under the posted limit (-2 per second over)
//   4 THREE-POINT TURN  turn round inside the box, using reverse
//   5 PARKING     back to the office: park in the marked bay, nose to the door
// Any collision costs 10. 70+ passes: the LICENSED badge and $300.

const FEE = 50;
const PRIZE = 300;
const PASS = 70;
const LIMIT_MPH = 30;          // lesson 3 posted limit (HUD speed = m/s * 2.4)
const MPH = 2.4;
const CONES = 6;
const CONE_GAP = 9;          // 6 cones span 45 m: fits between junctions (56 m clear)
const CONE_HIT = 1.25;         // car centreline within ~1 m of a cone's edge topples it
const SPEED_SECTION = 140;
const TEST_TIME = 360;
const COOLDOWN = 3;
const LESSONS = ['SLALOM', 'STOP BOX', 'SPEED ZONE', 'THREE-POINT TURN', 'PARKING'];
const COLOR = '#ffe14a';

// ---------- shared geometry/materials, made once ----------
let G = null;
function shared() {
  if (G) return G;
  const coneGeo = new THREE.ConeGeometry(0.28, 0.75, 12);
  coneGeo.translate(0, 0.42, 0);
  const bandGeo = new THREE.CylinderGeometry(0.15, 0.19, 0.12, 12);
  bandGeo.translate(0, 0.45, 0);
  const baseGeo = new THREE.BoxGeometry(0.52, 0.05, 0.52);
  baseGeo.translate(0, 0.025, 0);
  G = {
    coneGeo, bandGeo, baseGeo,
    coneMat: new THREE.MeshStandardMaterial({ color: 0xff6a10, roughness: 0.6 }),
    bandMat: new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.5 }),
    baseMat: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }),
    lineYellow: new THREE.MeshBasicMaterial({ color: 0xffd23a }),
    lineWhite: new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }),
    lineRed: new THREE.MeshBasicMaterial({ color: 0xe8342a }),
    pole: new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.4 }),
    ringMat: new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
    beamMat: new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false }),
  };
  return G;
}

let lPlateTex = null;
function lPlateTexture() {
  if (lPlateTex) return lPlateTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#d01818'; g.lineWidth = 6; g.strokeRect(4, 4, 120, 120);
  g.fillStyle = '#d01818';
  g.fillRect(36, 18, 22, 92);   // the L, drawn as two bars (no font needed)
  g.fillRect(36, 88, 58, 22);
  lPlateTex = new THREE.CanvasTexture(c);
  lPlateTex.colorSpace = THREE.SRGBColorSpace;
  return lPlateTex;
}

// a rectangle painted on the road: 4 thin bars, local x = width, local z = length
function outline(width, length, mat, bar = 0.22) {
  const g = new THREE.Group();
  const along = new THREE.BoxGeometry(bar, 0.03, length);
  const across = new THREE.BoxGeometry(width, 0.03, bar);
  for (const s of [-1, 1]) {
    const a = new THREE.Mesh(along, mat); a.position.set(s * (width - bar) / 2, 0, 0); g.add(a);
    const b = new THREE.Mesh(across, mat); b.position.set(0, 0, s * (length - bar) / 2); g.add(b);
  }
  g.visible = false;
  return g;
}

function groundWord(text, w, h, sign) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTexture(text, sign), transparent: true, opacity: 0.9, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.visible = false;
  return m;
}

// ---------- the course: a frame on the road the office faces ----------
function buildCourse(city, pos, yaw) {
  const vertical = Math.abs(Math.sin(yaw)) > 0.5; // office faces a road running along z
  const roads = vertical ? city.roadXs : city.roadZs;
  const cross = vertical ? city.roadZs : city.roadXs;
  let roadC = roads[0];
  for (const r of roads) if (Math.abs(r - (vertical ? pos.x : pos.z)) < Math.abs(roadC - (vertical ? pos.x : pos.z))) roadC = r;
  const lim = Math.max(...city.roadXs.map(Math.abs), ...city.roadZs.map(Math.abs)) - 12;
  const U = (p) => (vertical ? p.z : p.x);
  const W = (p) => (vertical ? p.x : p.z) - roadC;
  const at = (u, w) => (vertical ? new THREE.Vector3(roadC + w, 0, u) : new THREE.Vector3(u, 0, roadC + w));
  const side = Math.sign(W(pos)) || 1;
  const uo = U(pos);
  const free = (a, b) => cross.every((c) => Math.max(a, b) < c - 10 || Math.min(a, b) > c + 10);

  const plan = (d) => {
    const laneW = (vertical ? 4 : -4) * d;     // right-hand traffic lane for direction d
    const findFree = (from, len) => {
      for (let k = 0; k < 300; k++) { const u = from + d * k; if (free(u, u + d * len)) return u; }
      return from;
    };
    const s1 = findFree(uo + d * 12, CONE_GAP * (CONES - 1) + 8); // run-in + cones + run-out
    const cones = [];
    for (let i = 0; i < CONES; i++) cones.push({ u: s1 + d * (4 + CONE_GAP * i), side: (i % 2 ? 1 : -1) * Math.sign(laneW) });
    const slalomEnd = s1 + d * (4 + CONE_GAP * (CONES - 1) + 4);
    let c = null;
    for (const r of [...cross].sort((a, b) => (a - b) * d)) if ((r - slalomEnd) * d > 12) { c = r; break; }
    if (c == null) c = slalomEnd + d * 30;
    const stopLine = c - d * 9;                // stop line just short of the junction
    const boxMid = stopLine - d * 3;           // 6 m stop box behind it
    const ua = c + d * 9;
    let ub = ua + d * SPEED_SECTION;
    for (let k = 0; k < 40 && !free(ub - 4, ub + 4); k++) ub += d * 5;
    const t0 = findFree(ub + d * 8, 18);
    const ut = t0 + d * 9;
    const dir = vertical ? new THREE.Vector3(0, 0, d) : new THREE.Vector3(d, 0, 0);
    return { d, laneW, cones, slalomEnd, stopLine, boxMid, ua, ub, ut, dir, heading: Math.atan2(dir.x, dir.z), ok: Math.abs(ut) + 10 < lim && Math.abs(ub) < lim };
  };
  let p = plan(vertical ? side : -side);       // pull out into the near lane
  if (!p.ok) p = plan(-p.d);
  return { vertical, roadC, U, W, at, uo, ...p };
}

export function initDrivingSchool(scene, world, save) {
  const city = world.city;
  let pos = city.spawn.clone().add(new THREE.Vector3(-60, 0, 30));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), city.colliders, 3)) pos = city.spawn.clone().add(new THREE.Vector3(-66, 0, 24));
  placeStreetSite(city, pos, 5.5, 'driving-school'); // room for the office and the learner bay

  const S = shared();
  const shop = storefront(scene, city, pos, { name: 'CITY DRIVING SCHOOL', w: 3.4, d: 2.4, wall: 0xe6e1d4, accent: 0xc4231c, sign: { fg: '#ffffff', bg: '#b41c16', accent: COLOR } });
  const yaw = faceNearestRoad(city, pos);
  const local = (x, z) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(pos.x, 0, pos.z));
  const counter = local(-0.8, shop.d / 2 + 1.3);
  const home = local(4.0, 0.6);            // learner car's spot, nose toward the road
  const bayYaw = yaw + Math.PI;            // lesson 5: park nose-in, facing the office

  const course = buildCourse(city, pos, yaw);

  // cones (one group each, pivot at the base so they topple)
  const cones = course.cones.map((c) => {
    const g = new THREE.Group();
    for (const [geo, mat] of [[S.coneGeo, S.coneMat], [S.bandGeo, S.bandMat], [S.baseGeo, S.baseMat]]) {
      const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m);
    }
    const p = course.at(c.u, course.laneW);
    g.position.copy(p);
    g.visible = false;
    scene.add(g);
    return { mesh: g, home: p, u: c.u, side: c.side, knocked: false, gated: false, fallT: 0, fallDir: new THREE.Vector3(), slide: 0 };
  });

  // painted markings, all static, shown lesson by lesson
  const dirYaw = course.heading;
  const stopBox = outline(7, 6, S.lineRed);
  stopBox.position.copy(course.at(course.boxMid, course.laneW)).setY(0.06);
  stopBox.rotation.y = dirYaw;
  const stopWord = groundWord('STOP', 4.4, 1.1, { fg: '#ffffff', bg: '#b41c16', accent: '#ffffff' });
  stopWord.position.copy(course.at(course.stopLine - course.d * 1.4, course.laneW)).setY(0.07);
  stopWord.rotation.z = dirYaw + Math.PI;    // reads the right way up for an approaching driver
  const turnBox = outline(15.2, 16, S.lineYellow);
  turnBox.position.copy(course.at(course.ut, 0)).setY(0.06);
  turnBox.rotation.y = dirYaw;
  const bay = outline(3.0, 5.6, S.lineWhite, 0.16);
  bay.position.copy(home).setY(0.06);
  bay.rotation.y = bayYaw;
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 3), S.lineWhite);
  arrow.rotation.x = Math.PI / 2;            // lies flat, points along the bay's local +z
  arrow.scale.set(1, 1, 0.05);
  bay.add(arrow);
  for (const m of [stopBox, stopWord, turnBox, bay]) scene.add(m);

  // speed-limit sign on the kerb at the start of lesson 3
  const limitSign = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 8), S.pole);
  pole.position.y = 1.2;
  limitSign.add(pole);
  const limitMat = new THREE.MeshBasicMaterial({ map: signTexture(`LIMIT ${LIMIT_MPH}`, { fg: '#111111', bg: '#ffffff', accent: '#d01818' }), toneMapped: false, side: THREE.DoubleSide });
  const limitBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), limitMat);
  limitBoard.position.y = 2.55;
  limitSign.add(limitBoard);
  limitSign.position.copy(course.at(course.ua, course.laneW + Math.sign(course.laneW) * 4.6));
  limitSign.rotation.y = dirYaw + Math.PI;   // faces oncoming learners
  limitSign.visible = false;
  scene.add(limitSign);

  // one gate ring + beam that hops between objectives
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1.2, 24, 1, true), S.ringMat);
  ring.visible = false;
  scene.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 40, 10, 1, true), S.beamMat);
  beam.visible = false;
  scene.add(beam);

  world.drivingSchool = {
    scene, pos, yaw, counter, home, bayYaw, course, cones,
    marks: { stopBox, stopWord, turnBox, bay, limitSign, ring, beam },
    learner: null,
    state: 'idle',          // idle -> (boarding) -> test
    lesson: 0, lessonName: '', score: 100, penalties: [],
    t: 0, lessonT: 0, holdT: 0, overT: 0, collideCD: 0, lastHealth: 0,
    stopped: false, entered: false, reversed: false, maxDist: 0,
    cooldown: 0, boardT: 0, offerPrev: false,
    speedLimit: LIMIT_MPH / MPH, speedLimitMph: LIMIT_MPH,
    hud: null, toldLicence: false,
    licensed: !!save?.drivingLicence,
    best: save?.drivingSchoolBest ?? 0,
  };
  world.drivingLicence = world.drivingSchool.licensed;
  spawnLearner(world);
}

// ---------- the learner car (one, reused; replaced only when wrecked) ----------
function spawnLearner(world) {
  const D = world.drivingSchool;
  if (D.learner) {
    D.scene.remove(D.learner.mesh);
    const i = world.parked.indexOf(D.learner);
    if (i >= 0) world.parked.splice(i, 1);
  }
  const car = makeVehicle(D.scene, D.home.x, D.home.z, D.yaw, '#f4f2ea', { modelId: 'oc_hatch_01', accel: 16, top: 34, rad: 1.4, componentClass: 'compact', temporary: true });
  car.learner = true;
  const S = shared();
  S.plateMat ||= new THREE.MeshBasicMaterial({ map: lPlateTexture(), toneMapped: false });
  S.plateGeo ||= new THREE.PlaneGeometry(0.46, 0.46);
  S.standGeo ||= new THREE.BoxGeometry(0.08, 0.3, 0.08);
  const stand = new THREE.Mesh(S.standGeo, S.pole);
  stand.position.set(0, 1.62, -0.3);
  car.mesh.add(stand);
  for (const s of [1, -1]) {
    const plate = new THREE.Mesh(S.plateGeo, S.plateMat);
    plate.position.set(0, 1.98, -0.3 + s * 0.012);
    plate.rotation.y = s > 0 ? 0 : Math.PI;
    car.mesh.add(plate);
  }
  world.parked.push(car);
  D.learner = car;
  return car;
}

function resetLearner(world) {
  const D = world.drivingSchool;
  let car = D.learner;
  if (!car || car.dead || !car.mesh.parent) car = spawnLearner(world); // wrecked, or exported/towed off
  if (world.player.inCar !== car) {
    car.pos.set(D.home.x, 0, D.home.z);
    car.heading = D.yaw;
    car.mesh.rotation.y = D.yaw;
    car.vel.set(0, 0, 0);
    if (!world.parked.includes(car)) world.parked.push(car);
  }
  try { repairVehicleComponent(car, 'all'); } catch { car.health = car.maxHealth ?? 100; }
  return car;
}

// derby.js-style direct entry, unless main passes a proper enterCar
function putPlayerIn(world, car, api) {
  if (api?.enterCar) { api.enterCar(car); return world.player.inCar === car; }
  const i = world.parked.indexOf(car);
  if (i >= 0) world.parked.splice(i, 1);
  car.ai = null;
  world.player.inCar = car;
  if (world.player.mesh) world.player.mesh.visible = false;
  engine?.start?.();
  return true;
}

// ---------- HUD ----------
function ensureHud(world) {
  const D = world.drivingSchool;
  if (D.hud) return D.hud;
  const el = document.createElement('div');
  el.id = 'drivingschool';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:340px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#0e1420e0;border:1px solid #ffe14a;border-radius:6px;display:none;z-index:30;color:#f4f0dc;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:4px;color:#ffe14a';
  const title = document.createElement('span');
  const score = document.createElement('span');
  head.append(title, score);
  const steps = document.createElement('div');
  steps.style.cssText = 'display:flex;gap:4px;margin-bottom:6px';
  const pips = LESSONS.map(() => {
    const p = document.createElement('div');
    p.style.cssText = 'flex:1;height:5px;border-radius:3px;background:#ffffff26';
    steps.appendChild(p);
    return p;
  });
  const task = document.createElement('div');
  task.style.cssText = 'font-size:12px;opacity:.9;margin-bottom:4px';
  const speed = document.createElement('div');
  speed.style.cssText = 'font:800 20px system-ui;text-align:center;margin:4px 0;display:none';
  const log = document.createElement('div');
  log.style.cssText = 'font-size:11px;color:#ff9a8a;min-height:14px';
  el.append(head, steps, task, speed, log);
  document.body.appendChild(el);
  D.hud = { el, title, score, pips, task, speed, log };
  return D.hud;
}

function renderHud(world, task) {
  const D = world.drivingSchool, h = ensureHud(world);
  h.el.style.display = 'block';
  h.title.textContent = `DRIVING TEST · ${D.lesson + 1}/5 ${LESSONS[D.lesson]}`;
  h.score.textContent = `${D.score} pts`;
  h.score.style.color = D.score >= PASS ? '#7cf78c' : '#ff5a4a';
  h.pips.forEach((p, i) => { p.style.background = i < D.lesson ? '#7cf78c' : i === D.lesson ? '#ffe14a' : '#ffffff26'; });
  h.task.textContent = task;
  if (D.lesson === 2) {
    const mph = Math.round(speedOf(D.learner) * MPH);
    h.speed.style.display = 'block';
    h.speed.textContent = `${mph} / LIMIT ${LIMIT_MPH} MPH`;
    h.speed.style.color = mph > LIMIT_MPH ? '#ff5a4a' : '#7cf78c';
  } else h.speed.style.display = 'none';
  h.log.textContent = D.penalties.slice(-3).map((p) => `${p.why} −${p.pts}`).join(' · ');
}

// ---------- test flow ----------
const speedOf = (car) => (car ? Math.hypot(car.vel.x, car.vel.z) : 0);

function penalize(world, pts, why) {
  const D = world.drivingSchool;
  D.score = Math.max(0, D.score - pts);
  D.penalties.push({ why, pts });
  showToast(`${why} −${pts}`);
}

function showMarks(world) {
  const D = world.drivingSchool, M = D.marks, C = D.course;
  for (const k of ['stopBox', 'stopWord', 'turnBox', 'bay', 'limitSign', 'ring', 'beam']) M[k].visible = false;
  const l = D.lesson;
  if (l === 1) { M.stopBox.visible = M.stopWord.visible = true; }
  if (l === 2) { M.limitSign.visible = true; placeRing(D, C.at(C.ub, C.laneW)); }
  if (l === 3) M.turnBox.visible = true;
  if (l === 4) M.bay.visible = true;
  if (l === 0) placeRing(D, C.at(C.slalomEnd, C.laneW));
  const t = target(D);
  M.beam.position.set(t.x, 20, t.z);
  M.beam.visible = true;
}

function placeRing(D, p) {
  D.marks.ring.position.set(p.x, 1.4, p.z);
  D.marks.ring.visible = true;
}

function target(D) {
  const C = D.course;
  switch (D.lesson) {
    case 0: { const next = D.cones.find((c) => !c.gated); return next ? C.at(next.u, C.laneW) : C.at(C.slalomEnd, C.laneW); }
    case 1: return C.at(C.boxMid, C.laneW);
    case 2: return C.at(C.ub, C.laneW);
    case 3: return C.at(C.ut, 0);
    default: return D.home;
  }
}

function startLesson(world, n) {
  const D = world.drivingSchool;
  D.lesson = n;
  D.lessonName = LESSONS[n];
  D.lessonT = 0; D.holdT = 0; D.overT = 0;
  D.stopped = false; D.entered = false; D.reversed = false;
  showMarks(world);
  const t = target(D), car = D.learner;
  D.maxDist = Math.hypot(car.pos.x - t.x, car.pos.z - t.z) + 120;
  if (n > 0) { sfxPickup(); showMissionMsg(`LESSON ${n + 1}: ${LESSONS[n]}`, LESSON_TIPS[n], COLOR); }
}

const LESSON_TIPS = [
  'Weave through the cones, alternating sides — don\'t knock any over',
  'Come to a FULL stop inside the red box before the junction',
  `Speed limit ${LIMIT_MPH} MPH to the ring — every second over costs 2`,
  'Turn round inside the yellow box: forward, reverse, forward',
  'Head back to the school and park nose-in, inside the bay',
];

function beginTest(world) {
  const D = world.drivingSchool;
  D.state = 'test';
  D.score = 100; D.penalties = []; D.t = 0;
  D.collideCD = 0; D.lastHealth = D.learner.health;
  D.boardT = 0;
  for (const c of D.cones) {
    c.knocked = false; c.gated = false; c.fallT = 0; c.slide = 0;
    c.mesh.position.copy(c.home); c.mesh.quaternion.identity(); c.mesh.visible = true;
  }
  startLesson(world, 0);
  sfxPickup();
  showMissionMsg('DRIVING TEST', `Lesson 1: SLALOM — ${LESSON_TIPS[0]}`, COLOR);
}

function cleanup(world) {
  const D = world.drivingSchool;
  D.state = 'idle';
  D.cooldown = COOLDOWN;
  for (const c of D.cones) c.mesh.visible = false;
  for (const m of Object.values(D.marks)) m.visible = false;
  if (D.hud) D.hud.el.style.display = 'none';
  world.drivingSchoolBlip = null;
  world.drivingSchoolHint = null;
}

function abandon(world, why) {
  cleanup(world);
  sfxMissionFail();
  showMissionMsg('TEST ABANDONED', why, '#ff5a4a');
}

function finishTest(world) {
  const D = world.drivingSchool;
  const score = D.score;
  const pass = score >= PASS;
  const newBest = score > D.best;
  if (newBest) D.best = score;
  cleanup(world);
  if (!pass) {
    sfxMissionFail();
    showMissionMsg('TEST FAILED', `${score}/100 — you need ${PASS} to pass${newBest ? ' · best yet' : ''}`, '#ff5a4a');
    world.onSave?.();
    return;
  }
  sfxMissionPass();
  if (!D.licensed) {
    D.licensed = true;
    D.toldLicence = true;
    world.drivingLicence = true;
    world.money += PRIZE;
    addRep(world, 250);
    world.addXP?.(200);
    showMissionMsg('🪪 LICENSED!', `Passed with ${score}/100 · +$${PRIZE} · LICENSED badge earned`, '#7cf78c');
    showNews('the city driving school signs off another licensed driver');
  } else {
    addRep(world, 60);
    world.addXP?.(60);
    showMissionMsg('PASSED AGAIN', `${score}/100${newBest ? ' · NEW BEST' : ''} · best ${D.best}`, '#7cf78c');
  }
  world.onSave?.();
}

// cones: topple when the car's centreline passes within ~1 m of the cone
function updateCones(world, dt, car) {
  const D = world.drivingSchool;
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  const sp = speedOf(car);
  for (const c of D.cones) {
    if (c.knocked) {
      if (c.fallT < 1) {
        c.fallT = Math.min(1, c.fallT + dt / 0.3);
        const axis = new THREE.Vector3(c.fallDir.z, 0, -c.fallDir.x);
        c.mesh.quaternion.setFromAxisAngle(axis, (Math.PI / 2) * c.fallT);
        c.mesh.position.copy(c.home).addScaledVector(c.fallDir, c.slide * c.fallT);
      }
      continue;
    }
    const dx = c.home.x - car.pos.x, dz = c.home.z - car.pos.z;
    const along = Math.max(-1.9, Math.min(1.9, dx * fx + dz * fz));
    const ex = dx - fx * along, ez = dz - fz * along;
    if (ex * ex + ez * ez < CONE_HIT * CONE_HIT) {
      c.knocked = true; c.gated = true;
      c.fallT = 0;
      const len = Math.hypot(dx, dz) || 1;
      c.fallDir.set(dx / len, 0, dz / len);
      if (sp > 1) c.fallDir.set(car.vel.x / sp, 0, car.vel.z / sp).add(c.fallDir).normalize();
      c.slide = 0.4 + Math.min(2.5, sp * 0.12);
      penalize(world, 5, 'Knocked a cone');
    }
  }
}

function updateLesson(world, dt, car) {
  const D = world.drivingSchool, C = D.course;
  const u = C.U(car.pos), w = C.W(car.pos);
  const sp = speedOf(car);
  const prog = (x) => (u - x) * C.d;          // metres past x along the course direction
  D.lessonT += dt;

  if (D.lesson === 0) {
    for (const c of D.cones) {
      if (c.gated || prog(c.u) < 0) continue;
      c.gated = true;
      if (Math.sign(w - C.laneW) !== c.side) penalize(world, 5, 'Missed a slalom gate');
    }
    renderHud(world, D.cones.some((c) => !c.gated) ? `Weave the cones — pass the next one on the ${slalomSide(D)}` : 'Through the ring to finish the slalom');
    world.drivingSchoolHint = `DRIVING TEST — <b>SLALOM</b>: weave the cones · ${D.score} pts`;
    if (prog(C.slalomEnd) > 0 && Math.abs(w) < 9) { for (const c of D.cones) c.gated = true; startLesson(world, 1); }
    return;
  }

  if (D.lesson === 1) {
    const q = prog(C.stopLine);               // <0 before the line, box spans -6..0
    const inBox = q > -6.5 && q < 0.6 && Math.abs(w - C.laneW) < 4;
    if (inBox && sp < 0.5) D.holdT += dt; else D.holdT = 0;
    if (D.holdT > 0.4) {
      showToast('Clean stop — proceed');
      startLesson(world, 2);
      return;
    }
    if (q > 2.5 && Math.abs(w) < 9) {
      penalize(world, 15, 'Rolled the stop');
      startLesson(world, 2);
      return;
    }
    renderHud(world, q < -6.5 ? 'Slow down — the stop box is ahead' : 'Stop completely inside the red box');
    world.drivingSchoolHint = `DRIVING TEST — <b>STOP</b> fully inside the red box · ${D.score} pts`;
    return;
  }

  if (D.lesson === 2) {
    const inZone = prog(C.ua) > 0 && prog(C.ub) < 0;
    const mph = sp * MPH;
    if (inZone && mph > LIMIT_MPH + 1) {
      D.overT += dt;
      while (D.overT >= 1) { D.overT -= 1; penalize(world, 2, 'Speeding'); }
    }
    renderHud(world, inZone ? `Keep under ${LIMIT_MPH} MPH to the ring` : `Speed zone ahead — limit ${LIMIT_MPH} MPH`);
    world.drivingSchoolHint = `DRIVING TEST — <b>SPEED LIMIT ${LIMIT_MPH}</b> · ${Math.round(mph)} MPH · ${D.score} pts`;
    if (prog(C.ub) > 0 && Math.abs(w) < 9) startLesson(world, 3);
    return;
  }

  if (D.lesson === 3) {
    const inBox = Math.abs(u - C.ut) < 8 && Math.abs(w) < 7.6;
    const fwd = car.vel.x * Math.sin(car.heading) + car.vel.z * Math.cos(car.heading);
    const facingBack = -(Math.sin(car.heading) * C.dir.x + Math.cos(car.heading) * C.dir.z) > 0.9;
    if (inBox) {
      D.entered = true;
      if (fwd < -0.8) D.reversed = true;
      if (facingBack && sp < 4) {
        if (!D.reversed) penalize(world, 5, 'U-turn, not a three-point turn');
        else showToast('Neat three-point turn');
        startLesson(world, 4);
        return;
      }
    } else if (D.entered) {
      D.entered = false;
      penalize(world, 5, 'Left the turning box');
    }
    renderHud(world, inBox ? (D.reversed ? 'Now forward — finish facing back the way you came' : 'Turn, then REVERSE (S), then forward') : 'Pull into the yellow box and turn round inside it');
    world.drivingSchoolHint = `DRIVING TEST — <b>THREE-POINT TURN</b> in the yellow box · ${D.score} pts`;
    return;
  }

  // lesson 4: park in the bay, nose toward the office
  const bf = new THREE.Vector3(Math.sin(D.bayYaw), 0, Math.cos(D.bayYaw));
  const rx = car.pos.x - D.home.x, rz = car.pos.z - D.home.z;
  const lon = rx * bf.x + rz * bf.z, lat = rx * bf.z - rz * bf.x;
  const face = Math.sin(car.heading) * bf.x + Math.cos(car.heading) * bf.z;
  const inBay = Math.abs(lon) < 1.3 && Math.abs(lat) < 0.9;
  if (inBay && face > 0.94 && sp < 0.4) D.holdT += dt; else D.holdT = 0;
  const near = Math.hypot(rx, rz) < 8;
  renderHud(world, !near ? 'Drive back to the school' : inBay && face < -0.5 ? 'Wrong way round — nose toward the office' : inBay && face > 0.94 ? 'Hold it there...' : 'Straighten up inside the white bay, nose to the door');
  world.drivingSchoolHint = `DRIVING TEST — <b>PARK</b> in the bay by the school · ${D.score} pts`;
  if (D.holdT > 1) finishTest(world);
}

function slalomSide(D) {
  const next = D.cones.find((c) => !c.gated);
  if (!next) return '';
  // side is relative to the lane centre; turn it into the driver's left/right
  const C = D.course;
  const rightW = C.vertical ? -C.dir.z : C.dir.x; // driver's right (-fz, 0, fx) projected on the w axis
  return rightW * next.side > 0 ? 'right' : 'left';
}

function nearOtherCar(world) {
  const p = world.player.pos;
  for (const list of [world.parked, world.traffic, world.cops]) {
    for (const v of list || []) if (!v.dead && Math.hypot(v.pos.x - p.x, v.pos.z - p.z) < 3.9) return true;
  }
  return false;
}

export function updateDrivingSchool(world, dt, keys, pressed, api) {
  const D = world.drivingSchool;
  if (!D) return;
  world.drivingSchoolHint = null;
  if (D.cooldown > 0) D.cooldown = Math.max(0, D.cooldown - dt);
  const player = world.player;
  const offered = D.offerPrev;
  D.offerPrev = false;

  // a one-time nod to licensed drivers, the first time they take the wheel
  if (D.licensed && !D.toldLicence && player.inCar) {
    D.toldLicence = true;
    showToast('🪪 LICENSED DRIVER — City Driving School badge on file');
  }

  if (D.state === 'test') {
    const car = D.learner;
    D.t += dt;
    if (!car || car.dead) { abandon(world, 'The learner car is wrecked'); return; }
    if (player.inCar !== car) { abandon(world, 'You left the learner car'); return; }
    if (D.t > TEST_TIME) { abandon(world, 'Out of time — the examiner went home'); return; }
    const t = target(D);
    const dist = Math.hypot(car.pos.x - t.x, car.pos.z - t.z);
    if (dist > D.maxDist) { abandon(world, 'You drove off the test route'); return; }
    world.drivingSchoolBlip = { x: t.x, z: t.z };
    D.marks.ring.rotation.y += dt;

    // any bump that dents the car costs 10 (car.js applies damage on impacts)
    D.collideCD = Math.max(0, D.collideCD - dt);
    if (car.health < D.lastHealth - 0.01 && D.collideCD <= 0) { penalize(world, 10, 'Collision'); D.collideCD = 1.5; }
    D.lastHealth = car.health;

    updateCones(world, dt, car);
    if (D.lesson === 0) { const nt = target(D); D.marks.beam.position.set(nt.x, 20, nt.z); }
    updateLesson(world, dt, car);
    return;
  }

  if (D.state === 'boarding') {
    const car = D.learner;
    D.boardT += dt;
    if (!car || car.dead || D.boardT > 90 || Math.hypot(player.pos.x - car.pos.x, player.pos.z - car.pos.z) > 80 && player.inCar !== car) {
      D.state = 'idle'; D.cooldown = COOLDOWN;
      world.drivingSchoolBlip = null;
      world.money += FEE;
      showToast(`Test cancelled — $${FEE} refunded`);
      return;
    }
    if (player.inCar === car) { beginTest(world); return; }
    world.drivingSchoolBlip = { x: car.pos.x, z: car.pos.z };
    world.drivingSchoolHint = 'CITY DRIVING SCHOOL — get in the <b>learner car</b> (L plate) to begin';
    return;
  }

  // ---- idle ----
  if (D.cooldown > 0) return;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat && !player.inPlane;
  const pay = () => {
    if (availableFunds(world, FEE) < FEE) { showToast(`The test fee is $${FEE}`); return false; }
    spendMoney(world, FEE);
    return true;
  };

  if (onFoot) {
    const d = Math.hypot(player.pos.x - D.counter.x, player.pos.z - D.counter.z);
    if (d > 2.6) return;
    world.drivingSchoolHint = D.licensed
      ? `CITY DRIVING SCHOOL — 🪪 <b>LICENSED</b> (best ${D.best}/100) · <b>E</b> to retake for a better score ($${FEE})`
      : `CITY DRIVING SCHOOL — press <b>E</b> to take your driving test ($${FEE})${D.best ? ` · best ${D.best}/100` : ''}`;
    if (!pressed['KeyE'] || world.mission?.active || nearOtherCar(world)) return; // main's E enters a car that close
    if (!pay()) return;
    const car = resetLearner(world);
    if (putPlayerIn(world, car, api) && player.inCar === car) beginTest(world);
    else { D.state = 'boarding'; D.boardT = 0; showMissionMsg('DRIVING TEST', 'Get in the learner car with the L plate', COLOR); }
    return;
  }

  // already sitting in the learner car near the school: E starts from the seat
  const car = D.learner;
  if (!car || player.inCar !== car) return;
  if (Math.hypot(car.pos.x - D.home.x, car.pos.z - D.home.z) > 15) return;
  world.drivingSchoolHint = `CITY DRIVING SCHOOL — press <b>E</b> to start the driving test ($${FEE})`;
  world.carActionE = true;
  D.offerPrev = true;
  if (pressed['KeyE'] && offered && !world.mission?.active) {
    if (!pay()) return;
    try { repairVehicleComponent(car, 'all'); } catch { /* keep going on a scratched car */ }
    beginTest(world);
  }
}

export function drivingSchoolSave(world) {
  const D = world.drivingSchool;
  return { drivingSchoolBest: D?.best, drivingLicence: !!D?.licensed };
}
