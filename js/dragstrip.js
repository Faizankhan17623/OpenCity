import * as THREE from 'three';
import { signTexture } from './propKit.js';
import { makeVehicle } from './car.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail, sfxHorn } from './sound.js';
import { addRep } from './economy.js';

// DRAG STRIP: a quarter-mile (400 m) painted on the south perimeter road, with
// a Christmas tree at the line and a finish gantry. Roll any car onto the line
// and press E to stage against the strip's resident rival. From then on it is
// all TIMING, no steering — the car tracks dead straight on its own:
//   * LAUNCH: three ambers count down, then green. Press E on green; your
//     reaction time is measured. E before green is a red light (DQ).
//   * SHIFT: a rev needle climbs through each of four gears. Press E with the
//     needle in the green shift zone near the redline. Early shifts bog the
//     engine; late ones bounce off the limiter.
// The rival's elapsed time drops with every win, 13.5 s down to 10.5 s.
// Separate from races.js (checkpoint medals), streetrace.js (driven circuits)
// and pinkslip.js (the west-perimeter drag you actually drive).

const STRIP = 400;
const LANE = 3.5;              // lane centres either side of the road centre
const START_R = 8;             // how close to the line counts as "at the strip"
const SHUTDOWN = 13;           // braking after the finish, m/s^2
const MPH = 2.4;               // matches the HUD speedo
const COOLDOWN = 3;
const RESULT_TIME = 7;
// four gears: speed at the redline (m/s) and peak acceleration
const VMAX = [16, 28, 42, 66];
const ACC = [14, 10.4, 7.8, 5.8];
const SHIFT_ZONE = [0.86, 0.96];   // rpm fraction of the redline that counts as a good shift
const PERFECT = [0.9, 0.95];
const RIVALS = ['ROOKIE RICKY', 'SHIFTY SUE', 'NITRO NATE', 'THE DUCHESS', 'PROFESSOR TORQUE', 'KING OF THE STRIP'];
const rivalET = (wins) => Math.max(10.5, 13.5 - 0.6 * wins);
const purse = (wins) => 300 + 150 * Math.min(wins, 5);
const COLOR = '#ffb43a';

const torque = (r) => { const k = Math.min(1, Math.max(0, (r - 0.2) / 0.65)); return 0.5 + 0.5 * k * k * (3 - 2 * k); };

export function initDragStrip(scene, world, save) {
  const city = world.city;
  // the edge road with the lowest z (south perimeter), running along x
  const zr = Math.min(...city.roadZs);
  const xs = city.roadXs;
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  // pick a start line so neither the line nor the finish sits in a junction,
  // with room for a shutdown area before the far corner
  let x0 = minX + 30, bestScore = -1;
  for (let x = minX + 30; x <= maxX - STRIP - 150; x += 1) {
    const clear = Math.min(...xs.map((c) => Math.min(Math.abs(x - c), Math.abs(x + STRIP - c))));
    const score = Math.min(clear, 16) - (x - minX) * 0.001; // prefer the west end once clear enough
    if (score > bestScore) { bestScore = score; x0 = x; }
  }
  const laneP = zr - LANE;   // the +x traffic lane (right-hand traffic)
  const laneR = zr + LANE;
  const pos = new THREE.Vector3(x0, 0, laneP);

  // ---- paint: start line, finish line ----
  const paint = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  const lineGeo = new THREE.BoxGeometry(0.5, 0.02, 15.5);
  for (const x of [x0 + 2.2, x0 + 2.2 + STRIP]) {
    const l = new THREE.Mesh(lineGeo, paint);
    l.position.set(x, 0.06, zr);
    scene.add(l);
  }
  // staging spot glow in the player's lane
  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.08, 24),
    new THREE.MeshBasicMaterial({ color: 0xffb43a, transparent: true, opacity: 0.4, depthWrite: false })
  );
  stage.position.set(x0, 0.1, laneP);
  scene.add(stage);

  // ---- the Christmas tree, between the lanes just past the line ----
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6, metalness: 0.5 });
  const tree = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.6, 0.22), steel);
  pole.position.y = 1.8;
  tree.add(pole);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.0, 0.7), steel);
  housing.position.y = 2.75;
  tree.add(housing);
  const mats = {
    stageOff: new THREE.MeshBasicMaterial({ color: 0x3a3a30 }), stageOn: new THREE.MeshBasicMaterial({ color: 0xfff6d0 }),
    amberOff: new THREE.MeshBasicMaterial({ color: 0x4a3010 }), amberOn: new THREE.MeshBasicMaterial({ color: 0xffb020 }),
    greenOff: new THREE.MeshBasicMaterial({ color: 0x0f3a18 }), greenOn: new THREE.MeshBasicMaterial({ color: 0x40ff60 }),
    redOff: new THREE.MeshBasicMaterial({ color: 0x3a1010 }), redOn: new THREE.MeshBasicMaterial({ color: 0xff2a20 }),
  };
  const bulbGeo = new THREE.SphereGeometry(0.13, 12, 8);
  const lamps = {};
  const order = [['stage', 3.6], ['amber1', 3.25], ['amber2', 2.95], ['amber3', 2.65], ['green', 2.3], ['red', 1.95]];
  for (const [key, y] of order) {
    const kind = key.replace(/\d/, '');
    lamps[key] = [];
    for (const side of [-1, 1]) {          // one bulb per lane, both facing the drivers (-x)
      const b = new THREE.Mesh(bulbGeo, mats[kind + 'Off']);
      b.position.set(-0.16, y - 0.05, side * 0.18);
      tree.add(b);
      lamps[key].push(b);
    }
  }
  const treeSign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: signTexture('DRAG STRIP', { fg: '#ffe0a0', bg: '#1a1208', accent: '#ffb43a' }), toneMapped: false, side: THREE.DoubleSide }));
  treeSign.position.set(0, 4.15, 0);
  treeSign.rotation.y = -Math.PI / 2;      // faces the staging lanes
  tree.add(treeSign);
  tree.position.set(x0 + 6, 0, zr);
  scene.add(tree);

  // ---- finish gantry ----
  const gantry = new THREE.Group();
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 6.4, 0.35), steel);
    post.position.set(0, 3.2, s * 8.6);
    gantry.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 17.6), steel);
  bar.position.y = 6.3;
  gantry.add(bar);
  const finMat = new THREE.MeshBasicMaterial({ map: signTexture('FINISH · 1/4 MILE', { fg: '#ffffff', bg: '#101014', accent: '#ffb43a' }), toneMapped: false });
  for (const s of [1, -1]) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), finMat);
    board.position.set(s * 0.22, 5.2, 0);
    board.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    gantry.add(board);
  }
  gantry.position.set(x0 + 2.2 + STRIP, 0, zr);
  scene.add(gantry);

  // ---- the rival, reused race to race, parked out of the world between runs ----
  const rival = makeVehicle(scene, 0, -9999, Math.PI / 2, '#d8d8e0', { top: 70, accel: 30 });
  rival.mesh.visible = false;

  world.dragStrip = {
    pos, x0, zr, laneP, laneR, heading: Math.PI / 2,
    stage, lamps, mats, rival,
    closure: { a: { x: x0 - 14, z: zr }, b: { x: x0 + STRIP + 160, z: zr }, width: 18, dragStrip: true },
    state: 'idle',        // idle -> staged -> run -> shutdown -> result -> idle
    lights: 'off',        // off | stage | amber1 | amber2 | amber3 | green | red
    car: null, t: 0, treeAt: 0, greenAt: 0, clock: 0,
    launched: false, runT: 0, speed: 0, dist: 0, gear: 1, rpm: 0, shiftT: 0, bogT: 0, limT: 0, grade: '',
    shiftZone: SHIFT_ZONE, perfectZone: PERFECT, redline: 1,
    reaction: null, et: null, trap: null, result: null,
    rv: { state: 'hidden', s: 0, v: 0, react: 0, et: 13.5, color: '#d8d8e0' },
    cooldown: 0, resultT: 0, offerPrev: false,
    hud: null, shownLights: null,
    wins: save?.dragWins ?? 0,
    best: save?.dragBestET ?? null,
  };
}

// ---------- the strip is closed while racing ----------
function closeStrip(world, on) {
  const D = world.dragStrip;
  const list = world.campaignRoadClosures ||= [];
  const i = list.indexOf(D.closure);
  if (on && i < 0) list.push(D.closure);
  if (!on && i >= 0) list.splice(i, 1);
}

// keep the lanes clear: through-traffic on the strip is waved on past the far
// end; anything stopped in the lanes is nudged to the kerb
function clearStrip(world) {
  const D = world.dragStrip;
  const x1 = D.x0 - 10, x2 = D.x0 + STRIP + 150;
  for (const list of [world.traffic, world.parked, world.cops]) {
    for (const v of list || []) {
      if (v === D.car || v.dead && list !== world.parked) continue;
      if (v.pos.x < x1 || v.pos.x > x2 || Math.abs(v.pos.z - D.zr) > 7) continue;
      if (v.ai && v.ai.fx) { v.pos.x = D.x0 + STRIP + 175; continue; }
      if (v.ai && v.ai.fz) continue;           // crossing at a junction, gone in a moment
      if (Math.abs(v.pos.z - D.zr) < 7.2) v.pos.z = D.zr + (v.pos.z < D.zr ? -7.2 : 7.2);
    }
  }
}

// ---------- HUD ----------
function ensureHud(world) {
  const D = world.dragStrip;
  if (D.hud) return D.hud;
  const el = document.createElement('div');
  el.id = 'dragstrip';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:340px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#140c04e0;border:1px solid #ffb43a;border-radius:6px;display:none;z-index:30;color:#ffe9c8;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#ffb43a';
  const title = document.createElement('span');
  const clock = document.createElement('span');
  head.append(title, clock);

  const treeRow = document.createElement('div');
  treeRow.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-bottom:6px';
  const bulbs = {};
  for (const [key, on] of [['amber1', '#ffb020'], ['amber2', '#ffb020'], ['amber3', '#ffb020'], ['green', '#40ff60'], ['red', '#ff2a20']]) {
    const b = document.createElement('div');
    b.style.cssText = 'width:20px;height:20px;border-radius:50%;border:2px solid #000a;background:#2a2218';
    b.dataset.on = on;
    treeRow.appendChild(b);
    bulbs[key] = b;
  }

  // rev gauge: a bar from 0 to 9000 rpm, green shift zone, red limiter band, needle
  const gauge = document.createElement('div');
  gauge.style.cssText = 'position:relative;height:18px;background:#0008;border-radius:4px;overflow:hidden;margin-bottom:4px';
  const scale = (r) => `${(r * 7000 + 1000) / 90}%`;
  const zone = document.createElement('div');
  zone.style.cssText = `position:absolute;top:0;bottom:0;left:${scale(SHIFT_ZONE[0])};width:calc(${scale(SHIFT_ZONE[1])} - ${scale(SHIFT_ZONE[0])});background:#40ff6055`;
  const perfect = document.createElement('div');
  perfect.style.cssText = `position:absolute;top:0;bottom:0;left:${scale(PERFECT[0])};width:calc(${scale(PERFECT[1])} - ${scale(PERFECT[0])});background:#40ff6099`;
  const red = document.createElement('div');
  red.style.cssText = `position:absolute;top:0;bottom:0;left:${scale(0.98)};right:0;background:#ff2a2066`;
  const needle = document.createElement('div');
  needle.style.cssText = 'position:absolute;top:-2px;bottom:-2px;width:3px;margin-left:-1px;background:#fff;box-shadow:0 0 6px #fff';
  gauge.append(zone, perfect, red, needle);

  const stats = document.createElement('div');
  stats.style.cssText = 'display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px';
  const gearEl = document.createElement('span');
  const rpmEl = document.createElement('span');
  const spdEl = document.createElement('span');
  stats.append(gearEl, rpmEl, spdEl);
  const status = document.createElement('div');
  status.style.cssText = 'text-align:center;font-weight:800;min-height:16px';
  const results = document.createElement('div');
  results.style.cssText = 'display:none;margin-top:6px;border-top:1px solid #ffb43a55;padding-top:6px;font-size:12px';
  el.append(head, treeRow, gauge, stats, status, results);
  document.body.appendChild(el);
  D.hud = { el, title, clock, bulbs, needle, gauge, gearEl, rpmEl, spdEl, status, results };
  return D.hud;
}

const LIGHT_ORDER = ['amber1', 'amber2', 'amber3', 'green'];
function lit(D, key) {
  if (D.lights === 'red') return key === 'red';
  const i = LIGHT_ORDER.indexOf(D.lights), k = LIGHT_ORDER.indexOf(key);
  if (key === 'green') return D.lights === 'green';
  return i >= 0 && k >= 0 && k <= i && D.lights !== 'green';
}

function renderHud(world) {
  const D = world.dragStrip, h = ensureHud(world);
  h.el.style.display = 'block';
  h.title.textContent = `DRAG STRIP vs ${RIVALS[Math.min(D.wins, RIVALS.length - 1)]}`;
  h.clock.textContent = D.launched ? `${D.runT.toFixed(2)}s · ${Math.round(D.dist)}m` : `rival ${D.rv.et.toFixed(1)}s`;
  for (const [key, b] of Object.entries(h.bulbs)) b.style.background = lit(D, key) ? b.dataset.on : '#2a2218';
  h.needle.style.left = `${Math.min(100, (D.rpm * 7000 + 1000) / 90)}%`;
  h.gearEl.textContent = `GEAR ${D.gear}/4`;
  h.rpmEl.textContent = `${Math.round((D.rpm * 7000 + 1000) / 100) * 100} RPM`;
  h.spdEl.textContent = `${Math.round(D.speed * MPH)} MPH`;
  h.status.textContent = D.grade;
  h.status.style.color = /PERFECT|GOOD|WIN/.test(D.grade) ? '#7cf78c' : /EARLY|LATE|LIMITER|RED|LOSE|DQ/.test(D.grade) ? '#ff6a5a' : '#ffe9c8';
  const r = D.result;
  if (r && D.state === 'result') {
    h.results.style.display = 'block';
    const rows = [
      ['Reaction', r.reaction != null ? `${r.reaction.toFixed(3)}s` : '—'],
      ['ET', r.et != null ? `${r.et.toFixed(3)}s` : '—'],
      ['Trap speed', r.trap != null ? `${Math.round(r.trap * MPH)} MPH` : '—'],
      ['Rival', `${r.rivalReaction.toFixed(3)}s + ${r.rivalET.toFixed(2)}s`],
      ['Result', r.dq ? `DQ — ${r.dq}` : r.won ? `WIN · +$${r.pay}` : 'LOSE'],
    ];
    h.results.replaceChildren(...rows.map(([k, v]) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between';
      const a = document.createElement('span'); a.textContent = k; a.style.opacity = '.75';
      const b = document.createElement('span'); b.textContent = v;
      if (k === 'Result') b.style.color = r.won ? '#7cf78c' : '#ff6a5a';
      row.append(a, b);
      return row;
    }));
  } else h.results.style.display = 'none';
}

function setTreeLamps(D) {
  if (D.shownLights === D.lights) return;
  D.shownLights = D.lights;
  for (const [key, bulbs] of Object.entries(D.lamps)) {
    const kind = key.replace(/\d/, '');
    const on = key === 'stage' ? D.state === 'staged' || D.state === 'run' && !D.launched : lit(D, key);
    for (const b of bulbs) b.material = D.mats[kind + (on ? 'On' : 'Off')];
  }
}

// ---------- race flow ----------
function holdCar(D, car) {
  car.pos.set(D.x0 + D.dist, 0, D.laneP);
  car.heading = D.heading;
  car.mesh.rotation.set(0, D.heading, 0);
  car.vel.set(D.speed, 0, 0);
}

function stageRace(world, car) {
  const D = world.dragStrip;
  D.car = car;
  D.state = 'staged';
  D.t = 0;
  D.treeAt = 1.2 + Math.random() * 1.2;
  D.greenAt = D.treeAt + 1.5;
  D.clock = 0;
  D.lights = 'stage';
  D.launched = false; D.runT = 0; D.speed = 0; D.dist = 0; D.gear = 1; D.rpm = 0.12;
  D.shiftT = 0; D.bogT = 0; D.limT = 0; D.grade = 'Watch the tree — E on GREEN';
  D.reaction = null; D.et = null; D.trap = null; D.result = null;
  const rv = D.rv;
  rv.state = 'staged'; rv.s = 0; rv.v = 0;
  rv.react = 0.17 + Math.random() * 0.15;
  rv.et = rivalET(D.wins);
  const r = D.rival;
  r.pos.set(D.x0, 0, D.laneR);
  r.heading = D.heading;
  r.mesh.rotation.set(0, D.heading, 0);
  r.vel.set(0, 0, 0);
  r.mesh.visible = true;
  holdCar(D, car);
  closeStrip(world, true);
  clearStrip(world);
  D.stage.visible = false;
  sfxHorn();
  showMissionMsg('DRAG STRIP', `vs ${RIVALS[Math.min(D.wins, RIVALS.length - 1)]} (${rivalET(D.wins).toFixed(1)}s) — E on green, then E in the green shift zone`, COLOR);
}

function updateRival(world, dt) {
  const D = world.dragStrip, rv = D.rv, r = D.rival;
  if (rv.state === 'hidden') return;
  if (rv.state === 'run') {
    const rt = D.clock - rv.react;
    if (rt > 0) {
      const u = Math.min(1, rt / rv.et);
      rv.s = STRIP * Math.pow(u, 1.5);
      rv.v = (1.5 * STRIP / rv.et) * Math.sqrt(u);
      if (u >= 1) rv.state = 'shutdown';
    }
  } else if (rv.state === 'shutdown') {
    rv.v = Math.max(0, rv.v - SHUTDOWN * dt);
    rv.s += rv.v * dt;
    if (rv.v <= 0 && D.state !== 'staged' && D.state !== 'run' && D.state !== 'shutdown') hideRival(world);
  }
  if (rv.state === 'hidden') return;
  r.pos.set(D.x0 + rv.s, 0, D.laneR);
  r.vel.set(rv.v, 0, 0);
  for (const w of r.wheels || []) w.rotation.x += (rv.v * dt) / 0.36;
}

function hideRival(world) {
  const D = world.dragStrip;
  D.rv.state = 'hidden';
  D.rival.mesh.visible = false;
  D.rival.pos.set(0, -9999, 0);
  D.rival.vel.set(0, 0, 0);
  closeStrip(world, false);
}

function shift(D) {
  if (D.gear >= 4 || D.shiftT > 0) return;
  const r = D.rpm;
  if (r < SHIFT_ZONE[0]) {
    D.bogT = 0.35 + 1.6 * (SHIFT_ZONE[0] - r);
    D.shiftT = 0.15;
    D.grade = 'EARLY SHIFT — bogged';
  } else if (D.limT > 0.05) {
    D.shiftT = 0.15;
    D.grade = `LATE SHIFT — ${D.limT.toFixed(2)}s on the limiter`;
  } else if (r >= PERFECT[0] && r <= PERFECT[1]) {
    D.shiftT = 0.05;
    D.grade = 'PERFECT SHIFT';
  } else {
    D.shiftT = 0.15;
    D.grade = 'GOOD SHIFT';
  }
  D.gear++;
  D.limT = 0;
  sfxPickup();
}

function endRace(world, dq) {
  const D = world.dragStrip, rv = D.rv;
  const rivalFinish = rv.react + rv.et;
  const playerFinish = D.reaction != null && D.et != null ? D.reaction + D.et : Infinity;
  const won = !dq && playerFinish < rivalFinish;
  const pay = won ? purse(D.wins) : 0;
  D.result = { reaction: D.reaction, et: D.et, trap: D.trap, won, dq: dq || null, pay, rivalReaction: rv.react, rivalET: rv.et };
  const newBest = !dq && D.et != null && (D.best == null || D.et < D.best);
  if (newBest) D.best = Math.round(D.et * 1000) / 1000;
  if (won) {
    D.wins++;
    world.money += pay;
    addRep(world, 120 + 40 * Math.min(D.wins, 6));
    world.addXP?.(150);
    sfxMissionPass();
    D.grade = 'YOU WIN';
    showMissionMsg('WIN!', `${D.et.toFixed(3)}s @ ${Math.round(D.trap * MPH)} MPH · RT ${D.reaction.toFixed(3)} · +$${pay}${newBest ? ' · NEW BEST' : ''}`, '#7cf78c');
    if (D.wins === RIVALS.length) showNews('a new king of the drag strip has been crowned');
    else showNews('the drag strip crowd roars as an underdog takes the win');
  } else {
    sfxMissionFail();
    D.grade = dq ? `DQ — ${dq}` : 'YOU LOSE';
    showMissionMsg(dq ? 'DISQUALIFIED' : 'BEATEN', dq || `${D.et.toFixed(3)}s vs rival ${(rv.et).toFixed(2)}s — reaction ${D.reaction.toFixed(3)}s`, '#ff5a4a');
  }
  world.onSave?.();
}

// stop driving the car and hand it back
function release(world) {
  const D = world.dragStrip;
  D.state = 'result';
  D.resultT = RESULT_TIME;
  if (D.car && !D.car.dead) D.car.vel.set(D.speed, 0, 0);
  D.car = null;
  D.lights = D.lights === 'red' ? 'red' : 'off';
}

function abort(world, why) {
  const D = world.dragStrip;
  D.car = null;
  D.state = 'idle';
  D.cooldown = COOLDOWN;
  D.lights = 'off';
  D.stage.visible = true;
  hideRival(world);
  if (D.hud) D.hud.el.style.display = 'none';
  world.dragStripBlip = null;
  sfxMissionFail();
  showToast(`DRAG RACE OFF — ${why}`);
}

export function updateDragStrip(world, dt, keys, pressed) {
  const D = world.dragStrip;
  if (!D) return;
  world.dragStripHint = null;
  const player = world.player;
  const offered = D.offerPrev;
  D.offerPrev = false;
  D.stage.rotation.y += dt;
  if (D.cooldown > 0) D.cooldown = Math.max(0, D.cooldown - dt);
  const E = !!pressed['KeyE'];   // the only key this minigame reads

  updateRival(world, dt);
  setTreeLamps(D);

  if (D.state === 'idle') {
    world.dragStripBlip = null;
    if (D.cooldown > 0 || player.inHeli || player.inBoat) return;
    const car = player.inCar;
    const focus = car ? car.pos : player.pos;
    const d = Math.hypot(focus.x - D.pos.x, focus.z - D.pos.z);
    if (d > 14) return;
    const who = RIVALS[Math.min(D.wins, RIVALS.length - 1)];
    if (!car) { world.dragStripHint = `DRAG STRIP — bring a car to the line · ${who} runs ${rivalET(D.wins).toFixed(1)}s${D.best ? ` · your best ${D.best.toFixed(2)}s` : ''}`; return; }
    if (car.tank || car.dead) { world.dragStripHint = 'DRAG STRIP — that is not a drag car'; return; }
    if (d > START_R) { world.dragStripHint = 'DRAG STRIP — roll up onto the glowing start pad'; return; }
    if (world.mission?.active) { world.dragStripHint = 'DRAG STRIP — finish your job first'; return; }
    world.dragStripHint = `DRAG STRIP — press <b>E</b> to stage vs <b>${who}</b> (${rivalET(D.wins).toFixed(1)}s · win $${purse(D.wins)})`;
    world.carActionE = true;
    D.offerPrev = true;
    if (E && offered) stageRace(world, car);
    return;
  }

  if (D.state === 'result') {
    D.resultT -= dt;
    renderHud(world);
    world.dragStripHint = D.result ? `DRAG STRIP — ${D.grade} · RT ${D.result.reaction != null ? D.result.reaction.toFixed(3) : '—'} · ET ${D.result.et != null ? D.result.et.toFixed(3) : '—'}` : null;
    if (D.resultT <= 0) {
      D.state = 'idle';
      D.cooldown = COOLDOWN;
      D.lights = 'off';
      D.stage.visible = true;
      if (D.hud) D.hud.el.style.display = 'none';
    }
    return;
  }

  // ---- staged / run / shutdown: the strip owns the car ----
  const car = D.car;
  if (!car || car.dead || player.inCar !== car) { abort(world, car?.dead ? 'car wrecked' : 'you left the car'); return; }
  world.carActionE = true;     // E is launch/shift here, never "get out"
  world.dragStripBlip = { x: D.x0 + STRIP, z: D.zr };
  clearStrip(world);
  closeStrip(world, true);     // in case something else reset the closure list

  if (D.state === 'staged') {
    D.t += dt;
    D.rpm = 0.12 + 0.03 * Math.sin(D.t * 9);
    D.lights = D.t < D.treeAt ? 'stage' : D.t < D.treeAt + 0.5 ? 'amber1' : D.t < D.treeAt + 1 ? 'amber2' : 'amber3';
    if (E) {                                  // jumped the tree
      D.lights = 'red';
      D.rv.state = 'run';
      endRace(world, 'RED LIGHT');
      release(world);
      renderHud(world);
      return;
    }
    if (D.t >= D.greenAt) {
      D.state = 'run';
      D.lights = 'green';
      D.clock = D.t - D.greenAt;
      D.rv.state = 'run';
      D.grade = 'GREEN — GO!';
    }
    world.dragStripHint = 'DRAG STRIP — watch the tree… press <b>E</b> on <b>GREEN</b>';
    holdCar(D, car);
    renderHud(world);
    return;
  }

  if (D.state === 'run') {
    D.clock += dt;
    if (!D.launched) {
      D.rpm = 0.45 + 0.05 * Math.sin(D.clock * 14);
      if (E) {
        D.launched = true;
        D.reaction = D.clock;
        D.grade = D.reaction < 0.3 ? 'GREAT LAUNCH' : D.reaction < 0.5 ? 'LAUNCHED' : 'SLOW LAUNCH';
        sfxPickup();
      } else if (D.clock > 4) {
        endRace(world, 'ASLEEP AT THE TREE');
        D.speed = 0;
        release(world);
        return;
      }
      world.dragStripHint = 'GREEN! press <b>E</b> to launch';
      holdCar(D, car);
      renderHud(world);
      return;
    }

    // timing-only physics: we integrate the car ourselves along the lane
    D.runT += dt;
    if (E) shift(D);
    const g = D.gear - 1;
    const raw = D.speed / VMAX[g];
    let a = 0;
    if (D.shiftT > 0) D.shiftT -= dt;
    else {
      a = ACC[g] * torque(Math.max(raw, g === 0 ? 0.45 : 0.2));
      if (D.bogT > 0) { D.bogT -= dt; a *= 0.45; }
    }
    a -= 0.0005 * D.speed * D.speed;
    const prevDist = D.dist;
    D.speed = Math.max(0, D.speed + a * dt);
    if (D.speed >= VMAX[g]) {                 // on the rev limiter
      D.speed = VMAX[g];
      if (D.gear < 4) { D.limT += dt; if (D.limT > 0.05) D.grade = 'LIMITER! SHIFT!'; }
    }
    D.rpm = D.shiftT > 0 ? Math.min(1, D.speed / VMAX[g]) * 0.9 : Math.min(1, D.speed / VMAX[g]) - (D.limT > 0 ? 0.03 * (1 + Math.sin(D.runT * 60)) : 0);
    D.dist += D.speed * dt;
    if (D.dist >= STRIP) {
      const over = (D.dist - STRIP) / Math.max(0.01, D.dist - prevDist);
      D.et = D.runT - over * dt;
      D.trap = D.speed;
      D.state = 'shutdown';
      endRace(world, null);
    }
    world.dragStripHint = D.gear < 4 ? `GEAR <b>${D.gear}</b> — press <b>E</b> in the green zone` : 'TOP GEAR — hold on!';
    holdCar(D, car);
    for (const w of car.wheels || []) w.rotation.x += (D.speed * dt) / 0.36;
    renderHud(world);
    return;
  }

  // shutdown: coast down past the finish, then hand back control
  D.speed = Math.max(0, D.speed - SHUTDOWN * dt);
  D.dist += D.speed * dt;
  D.rpm = Math.max(0.12, D.rpm - dt * 0.8);
  holdCar(D, car);
  world.dragStripHint = `DRAG STRIP — ${D.grade} · slowing down…`;
  renderHud(world);
  if (D.speed <= 0.3) { D.speed = 0; release(world); }
}

export function dragStripSave(world) {
  const D = world.dragStrip;
  return { dragBestET: D?.best ?? null, dragWins: D?.wins ?? 0 };
}
