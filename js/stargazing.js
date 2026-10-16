import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { postSign, faceNearestRoad } from './propKit.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// STARGAZING: a brass observatory telescope on a stone plinth. Open from
// 21:00 to 04:00. Press E to start a round: you're given three constellations
// in turn, each at a fixed spot in the sky. Turn the camera with the mouse
// until the signal meter peaks, then hold E for two seconds to lock it in.
// Each constellation pays, and finding all three pays a bonus.

const AIM_TOL = 6;            // degrees from the target to lock on
const LOCK_HOLD = 2;          // seconds of holding E on target
const ROUND_TIME = 150;       // seconds for all three
const TAP_QUIT = 0.35;        // a quick tap of E far off target packs up
const QUIT_ANGLE = 20;
const PAY_EACH = 150;
const ALL_BONUS = 300;
const SKY_R = 400;            // how far away the constellations are drawn
const COOLDOWN = 5;

// az: compass bearing in degrees clockwise from north (north is -z, east +x);
// el: degrees above the horizon. stars: [right, up] offsets in degrees.
const CONSTELLATIONS = [
  { name: 'Orion', az: 160, el: 34,
    stars: [[-4.5, 7], [4, 6], [-1.6, 0.4], [0, 0], [1.6, -0.4], [-4, -7], [4.5, -6.5]],
    lines: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]] },
  { name: 'Cassiopeia', az: 20, el: 56,
    stars: [[-8, 2], [-4, -2.5], [0, 1], [4, -3], [8, 1.5]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  { name: 'The Plough', az: 325, el: 40,
    stars: [[-9, 1], [-6, 2], [-3, 1.5], [0, 0], [0.5, -3.5], [4.5, -3.5], [4.5, 0.2]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
  { name: 'Cygnus', az: 80, el: 62,
    stars: [[0, 8], [0, 3], [0, -2], [0, -7], [-5, 3.8], [5, 2.2]],
    lines: [[0, 1], [1, 2], [2, 3], [4, 1], [1, 5]] },
  { name: 'Scorpius', az: 200, el: 22,
    stars: [[-7, 5], [-5, 3], [-3, 0.5], [-1, -2], [1.5, -4], [4, -4.5], [6.5, -3], [7.5, -0.5], [-7.5, 2], [-6, 7]],
    lines: [[9, 0], [0, 8], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]] },
  { name: 'Lyra', az: 285, el: 48,
    stars: [[0, 5], [-1.5, 1.5], [1.2, 1.2], [-2.2, -3], [0.6, -3.2]],
    lines: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4]] },
];

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const DEG = Math.PI / 180;

function skyDir(azDeg, elDeg, out = new THREE.Vector3()) {
  const az = azDeg * DEG, el = elDeg * DEG;
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

function bearingText(c) {
  const where = COMPASS[Math.round(c.az / 45) % 8];
  const height = c.el >= 50 ? 'high' : c.el >= 30 ? 'halfway up' : 'low';
  return `look ${where}, ${height}`;
}

function isStargazingHour(clock) { return clock >= 21 || clock < 4; }

export function initStargazing(scene, world, save) {
  const city = world.city;
  let pos = city.spawn.clone().add(new THREE.Vector3(-24, 0, -40));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), city.colliders, 3)) pos = city.spawn.clone().add(new THREE.Vector3(-28, 0, -36));
  try {
    placeStreetSite(city, pos, 2.6, 'stargazing');
  } catch (err) {
    console.warn('Stargazing: no clear site', err);
    return;
  }
  pos.y = 0;
  const yaw = faceNearestRoad(city, pos);
  postSign(scene, city, pos, 'OBSERVATORY', { fg: '#e8eeff', bg: '#0a1030', accent: '#8fb0ff' });

  // plinth, pier and a pivoting brass tube
  const stone = new THREE.MeshStandardMaterial({ color: 0x9a968c, roughness: 0.9 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.5, metalness: 0.6 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.35, metalness: 0.85 });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.5, 16), stone);
  plinth.position.set(pos.x, 0.25, pos.z);
  plinth.castShadow = true; plinth.receiveShadow = true;
  scene.add(plinth);
  const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.1, 10), iron);
  pier.position.set(pos.x, 1.05, pos.z);
  pier.castShadow = true;
  scene.add(pier);
  const pivot = new THREE.Group();
  pivot.position.set(pos.x, 1.65, pos.z);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.6, 16), brass);
  tube.rotation.x = Math.PI / 2;   // the tube's axis runs along the pivot's +z
  tube.position.z = 0.25;
  tube.castShadow = true;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), new THREE.MeshStandardMaterial({ color: 0x0a1424, emissive: 0x3050a0, emissiveIntensity: 0.6 }));
  lens.position.z = 1.06;
  const eyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.25, 8), iron);
  eyepiece.rotation.x = Math.PI / 2;
  eyepiece.position.z = -0.6;
  pivot.add(tube, lens, eyepiece);
  scene.add(pivot);
  const rest = skyDir(45, 40);
  pivot.lookAt(pivot.position.clone().add(rest));

  // where the stargazer stands, behind the eyepiece on the street side
  const spot = new THREE.Vector3(pos.x + Math.sin(yaw) * 1.1, 0, pos.z + Math.cos(yaw) * 1.1);

  // every constellation as unit-sphere star points plus faint lines, built
  // once; the group follows the camera and is scaled out to SKY_R
  const sky = new THREE.Group();
  sky.visible = false;
  sky.frustumCulled = false;
  sky.renderOrder = -8;
  const mats = {
    star: new THREE.PointsMaterial({ color: 0xeef4ff, size: 6, sizeAttenuation: false, transparent: true, opacity: 1, depthWrite: false, fog: false }),
    starDim: new THREE.PointsMaterial({ color: 0xa8b8e0, size: 4, sizeAttenuation: false, transparent: true, opacity: 0.75, depthWrite: false, fog: false }),
    starFound: new THREE.PointsMaterial({ color: 0xffd060, size: 6, sizeAttenuation: false, transparent: true, opacity: 1, depthWrite: false, fog: false }),
    line: new THREE.LineBasicMaterial({ color: 0x9fb8ff, transparent: true, opacity: 0.4, depthWrite: false, fog: false }),
    lineDim: new THREE.LineBasicMaterial({ color: 0x8090c0, transparent: true, opacity: 0.18, depthWrite: false, fog: false }),
    lineFound: new THREE.LineBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.55, depthWrite: false, fog: false }),
  };
  const up = new THREE.Vector3(0, 1, 0);
  const shapes = CONSTELLATIONS.map((c) => {
    const centre = skyDir(c.az, c.el);
    const right = new THREE.Vector3().crossVectors(centre, up).normalize();
    const upv = new THREE.Vector3().crossVectors(right, centre).normalize();
    const dirs = c.stars.map(([dx, dy]) => centre.clone()
      .addScaledVector(right, Math.tan(dx * DEG)).addScaledVector(upv, Math.tan(dy * DEG)).normalize());
    const pts = new THREE.BufferGeometry().setFromPoints(dirs);
    const seg = new THREE.BufferGeometry().setFromPoints(c.lines.flatMap(([a, b]) => [dirs[a], dirs[b]]));
    const points = new THREE.Points(pts, mats.starDim);
    const lines = new THREE.LineSegments(seg, mats.lineDim);
    for (const o of [points, lines]) { o.frustumCulled = false; o.renderOrder = -8; o.visible = false; sky.add(o); }
    return { points, lines, dir: centre, aim: { yaw: Math.atan2(centre.x, centre.z), pitch: -Math.asin(centre.y) } };
  });
  scene.add(sky);

  world.stargazing = {
    pos, spot, yaw, pivot, rest, sky, shapes, mats,
    constellations: CONSTELLATIONS,
    state: 'idle',        // idle -> round
    set: [], idx: 0,      // this round's constellation indices, and which is up
    target: null,         // unit Vector3 toward the current constellation
    aim: null,            // { yaw, pitch } for __debug.setCamYaw / setCamPitch
    angle: 180, signal: 0, hold: 0, t: 0, found: 0, cooldown: 0,
    tap: null,            // { t, angle } while an E press is being timed
    rounds: 0,
    starsFound: save?.starsFound ?? 0,
    hud: null,
  };
}

function ensureHud(world) {
  const G = world.stargazing;
  if (G.hud) return G.hud;
  const el = document.createElement('div');
  el.id = 'stargazing';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:320px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#060a1ce0;border:1px solid #8fb0ff;border-radius:6px;display:none;z-index:30;color:#e8eeff;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:4px;color:#8fb0ff';
  const title = document.createElement('span');
  const clock = document.createElement('span');
  head.append(title, clock);
  const name = document.createElement('div');
  name.style.cssText = 'font-size:18px;font-weight:900;letter-spacing:.5px';
  const bearing = document.createElement('div');
  bearing.style.cssText = 'font-size:12px;opacity:.85;margin-bottom:6px';
  const meter = (label) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:3px;font-size:11px';
    const tag = document.createElement('span');
    tag.style.cssText = 'width:44px;opacity:.8';
    tag.textContent = label;
    const bar = document.createElement('div');
    bar.style.cssText = 'flex:1;height:8px;background:#0008;border-radius:4px;overflow:hidden';
    const fill = document.createElement('div');
    fill.style.cssText = 'height:100%;width:0%;background:#8fb0ff';
    bar.appendChild(fill);
    row.append(tag, bar);
    return { row, fill };
  };
  const signal = meter('SIGNAL');
  const lock = meter('LOCK');
  lock.fill.style.background = '#ffd060';
  el.append(head, name, bearing, signal.row, lock.row);
  document.body.appendChild(el);
  G.hud = { el, title, clock, name, bearing, signal: signal.fill, lock: lock.fill };
  return G.hud;
}

function setTarget(world) {
  const G = world.stargazing;
  const k = G.set[G.idx];
  G.shapes.forEach((s, i) => {
    const inRound = G.set.includes(i);
    const done = inRound && G.set.indexOf(i) < G.idx;
    s.points.visible = s.lines.visible = inRound;
    s.points.material = done ? G.mats.starFound : i === k ? G.mats.star : G.mats.starDim;
    s.lines.material = done ? G.mats.lineFound : i === k ? G.mats.line : G.mats.lineDim;
  });
  if (k == null) { G.target = null; G.aim = null; return; }
  G.target = G.shapes[k].dir.clone();
  G.aim = { ...G.shapes[k].aim };
  G.hold = 0;
}

function endRound(world, reason) {
  const G = world.stargazing;
  const found = G.found;
  const all = found === G.set.length && G.set.length > 0;
  G.state = 'idle';
  G.cooldown = COOLDOWN;
  G.sky.visible = false;
  G.target = null; G.aim = null; G.tap = null; G.hold = 0;
  G.pivot.lookAt(G.pivot.position.clone().add(G.rest));
  if (G.hud) G.hud.el.style.display = 'none';
  world.stargazingHint = null;
  G.rounds++;
  if (found) {
    addRep(world, found * 10 + (all ? 20 : 0));
    world.addXP?.(found * 25 + (all ? 50 : 0));
  }
  if (all) {
    sfxMissionPass();
    showMissionMsg('CLEAR SKIES', `All ${found} constellations found · +$${found * PAY_EACH + ALL_BONUS}`, '#8fb0ff');
    if (G.starsFound >= 30) showNews('the city observatory reports a dedicated night-owl astronomer');
  } else {
    sfxMissionFail();
    showMissionMsg(reason || 'TELESCOPE PACKED UP', `${found}/${G.set.length} constellations found${found ? ` · +$${found * PAY_EACH}` : ''}`, '#8fb0ff');
  }
  world.onSave?.();
}

export function updateStargazing(world, dt, keys, pressed) {
  const G = world.stargazing;
  if (!G) return;
  world.stargazingHint = null;
  if (G.cooldown > 0) G.cooldown = Math.max(0, G.cooldown - dt);
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat && !player.inPlane;
  const clock = world.clock ?? 12;

  if (G.state === 'idle') {
    if (!onFoot || Math.hypot(player.pos.x - G.pos.x, player.pos.z - G.pos.z) > 2.6) return;
    if (!isStargazingHour(clock)) { world.stargazingHint = 'OBSERVATORY — Come back after dark (21:00–04:00)'; return; }
    if (G.cooldown > 0) { world.stargazingHint = 'OBSERVATORY — wiping the lens, one moment'; return; }
    world.stargazingHint = `OBSERVATORY — press <b>E</b> to find 3 constellations${G.starsFound ? ` (${G.starsFound} found so far)` : ''}`;
    if (pressed['KeyE']) {
      const start = (G.rounds * 3) % CONSTELLATIONS.length;
      G.set = [0, 1, 2].map((i) => (start + i) % CONSTELLATIONS.length);
      G.idx = 0; G.found = 0; G.t = ROUND_TIME; G.tap = null;
      G.state = 'round';
      G.sky.visible = true;
      setTarget(world);
      ensureHud(world).el.style.display = 'block';
      sfxPickup();
      showMissionMsg('STARGAZING', 'Aim with the mouse until the signal peaks, then hold E to lock on', '#8fb0ff');
    }
    return;
  }

  // ---- a round is on: the stargazer stays at the eyepiece ----
  if (!onFoot) { endRound(world, 'TELESCOPE ABANDONED'); return; }
  if (clock >= 4.5 && clock < 21) { endRound(world, 'DAWN BREAKS'); return; }
  G.t -= dt;
  if (G.t <= 0) { endRound(world, 'CLOUDS ROLL IN'); return; }
  player.pos.x = G.spot.x; player.pos.z = G.spot.z;
  player.vel.x = 0; player.vel.z = 0;

  const cam = world.camera;
  const R = Math.min(SKY_R, (cam.far || 1000) * 0.85);
  G.sky.position.copy(cam.position);
  G.sky.scale.setScalar(R);

  const view = cam.getWorldDirection(new THREE.Vector3());
  G.angle = Math.acos(Math.max(-1, Math.min(1, view.dot(G.target)))) / DEG;
  G.signal = Math.max(0, Math.min(1, 1 - G.angle / 60));
  const onTarget = G.angle <= AIM_TOL;
  G.pivot.lookAt(G.pivot.position.clone().add(view));

  // a quick tap of E well off target packs the telescope away
  if (pressed['KeyE']) G.tap = { t: 0, angle: G.angle };
  if (G.tap) {
    if (keys['KeyE']) G.tap.t += dt;
    else {
      const quit = G.tap.t < TAP_QUIT && G.tap.angle > QUIT_ANGLE;
      G.tap = null;
      if (quit) { endRound(world, 'TELESCOPE PACKED UP'); return; }
    }
  }

  if (onTarget && keys['KeyE']) G.hold += dt;
  else G.hold = Math.max(0, G.hold - dt * 2);

  const c = CONSTELLATIONS[G.set[G.idx]];
  if (G.hold >= LOCK_HOLD) {
    G.found++; G.starsFound++;
    world.money += PAY_EACH;
    sfxPickup();
    showToast(`✨ ${c.name} locked in! +$${PAY_EACH}`);
    G.idx++;
    if (G.idx >= G.set.length) {
      world.money += ALL_BONUS;
      endRound(world);
      return;
    }
    setTarget(world);
    world.onSave?.();
  }

  const cur = CONSTELLATIONS[G.set[G.idx]];
  const hud = ensureHud(world);
  hud.title.textContent = `🔭 STARGAZING ${G.idx + 1}/${G.set.length}`;
  hud.clock.textContent = `${Math.ceil(G.t)}s`;
  hud.name.textContent = cur.name;
  hud.bearing.textContent = `${bearingText(cur)} (${Math.round(G.angle)}° off)`;
  hud.signal.style.width = `${Math.round(G.signal * 100)}%`;
  hud.signal.style.background = onTarget ? '#5fd16a' : G.signal > 0.6 ? '#ffd060' : '#8fb0ff';
  hud.lock.style.width = `${Math.round(Math.min(1, G.hold / LOCK_HOLD) * 100)}%`;
  world.stargazingHint = onTarget
    ? `OBSERVATORY — <b>${cur.name}</b> in view: hold <b>E</b> to lock on`
    : `OBSERVATORY — find <b>${cur.name}</b>: ${bearingText(cur)} · tap <b>E</b> to pack up`;
}

export function stargazingSave(world) {
  return { starsFound: world.stargazing?.starsFound };
}
