import * as THREE from 'three';
import { WATER_X0, WATER_Y } from './water.js';
import { pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxWeb, sfxExplosion, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// FIREWORKS SHOW: after dark, a firing barge anchors off the seawall and the
// launch console on the sand takes a show operator. Each shell has a target
// height, marked by a glowing ring over the barge. Hold E to charge the
// mortar and let go: the shell bursts at a height set by the charge. The
// closer each burst is to its ring, the louder the crowd and the bigger the
// tips. Eight shells a show, one show a night.

const SHELLS = 8;
const MIN_H = 25, MAX_H = 70;   // burst heights a full charge spans
const CHARGE_TIME = 1.6;        // seconds from empty to full
const RISE = 42;                // shell climb speed (m/s)
const BURST_LIFE = 2.3;
const PARTICLES = 150;
const COLORS = [0xff4060, 0x40ff90, 0x50a0ff, 0xffd24a, 0xd070ff, 0xff9030];
const TIERS = [[3, 100, 'PERFECT'], [7, 60, 'GREAT'], [12, 30, 'OK']];

const isNight = (clock) => clock >= 20 || clock < 2;

export function initFireworks(scene, world, save) {
  // the console stands on the sand strip between the ring road and the seawall
  let pos = new THREE.Vector3(WATER_X0 - 3, 0, 60);
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 1)) pos = new THREE.Vector3(WATER_X0 - 3, 0, 72);
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x30343c, roughness: 0.6, metalness: 0.4 })
  );
  desk.position.set(pos.x, 0.5, pos.z);
  scene.add(desk);
  const plunger = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xd03030, roughness: 0.5 })
  );
  plunger.position.set(pos.x, 1.25, pos.z);
  scene.add(plunger);

  // the barge, with a rack of mortar tubes
  const barge = new THREE.Vector3(WATER_X0 + 28, WATER_Y, pos.z);
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(5, 1, 9),
    new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.8 })
  );
  hull.position.set(barge.x, WATER_Y - 0.2, barge.z);
  scene.add(hull);
  const tubeMat = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.5, metalness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 10), tubeMat);
    tube.position.set(barge.x + (i % 2 ? 0.8 : -0.8), WATER_Y + 0.85, barge.z - 2.5 + Math.floor(i / 2) * 2.5);
    scene.add(tube);
  }

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4, 0.22, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.75, depthWrite: false })
  );
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  scene.add(ring);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
  shell.visible = false;
  scene.add(shell);

  world.fireworks = {
    pos, barge, ring, shell, scene,
    state: 'idle',        // idle -> aim -> flight -> (next shell | done)
    idx: 0, target: 0, charge: 0, burstH: 0, needRelease: false, wait: 0,
    score: 0, bursts: [], hud: null,
    doneDay: save?.fireworksDay ?? -99,
    best: save?.fireworksBest ?? 0,
  };
}

function ensureHud(world) {
  const F = world.fireworks;
  if (F.hud) return F.hud;
  const el = document.createElement('div');
  el.id = 'fireworks';
  el.style.cssText = 'position:fixed;left:50%;bottom:118px;transform:translateX(-50%);width:280px;height:44px;' +
    'background:#0b1018cc;border:1px solid #ffd24a;border-radius:5px;display:none;z-index:30;color:#fff3cf;font:bold 12px system-ui';
  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;left:0;right:0;top:4px;text-align:center';
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:4px;right:4px;top:22px;height:16px;background:#05080d;border-radius:3px;overflow:hidden';
  const zone = document.createElement('div');
  zone.style.cssText = 'position:absolute;top:0;height:100%;background:#ffd24a55';
  const fill = document.createElement('div');
  fill.style.cssText = 'position:absolute;top:0;left:0;height:100%;width:0;background:linear-gradient(90deg,#ff7a30,#ffd24a)';
  bar.append(zone, fill);
  el.append(label, bar);
  document.body.appendChild(el);
  F.hud = { el, label, zone, fill };
  return F.hud;
}

function burst(world, x, y, z, color) {
  const F = world.fireworks;
  const positions = new Float32Array(PARTICLES * 3);
  const vels = [];
  for (let i = 0; i < PARTICLES; i++) {
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
    // an even-ish sphere of sparks
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const speed = 13 + Math.random() * 6;
    vels.push(new THREE.Vector3(s * Math.cos(a) * speed, u * speed, s * Math.sin(a) * speed));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color, size: 2.6, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false; // the cloud moves every frame; skip the stale bounds
  F.scene.add(points);
  F.bursts.push({ points, vels, t: 0 });
  sfxExplosion();
}

function updateBursts(world, dt) {
  const F = world.fireworks;
  for (let i = F.bursts.length - 1; i >= 0; i--) {
    const b = F.bursts[i];
    b.t += dt;
    if (b.t >= BURST_LIFE) {
      F.scene.remove(b.points);
      b.points.geometry.dispose();
      b.points.material.dispose();
      F.bursts.splice(i, 1);
      continue;
    }
    const arr = b.points.geometry.attributes.position.array;
    const drag = Math.max(0, 1 - 0.9 * dt);
    for (let j = 0; j < b.vels.length; j++) {
      const v = b.vels[j];
      v.y -= 7 * dt;
      v.multiplyScalar(drag);
      arr[j * 3] += v.x * dt; arr[j * 3 + 1] += v.y * dt; arr[j * 3 + 2] += v.z * dt;
    }
    b.points.geometry.attributes.position.needsUpdate = true;
    b.points.material.opacity = 1 - b.t / BURST_LIFE;
  }
}

function nextShell(world) {
  const F = world.fireworks;
  F.state = 'aim';
  F.charge = 0;
  F.needRelease = true; // the press that started (or the last hold) must be let go first
  F.target = MIN_H + 5 + Math.random() * (MAX_H - MIN_H - 10);
  F.ring.position.set(F.barge.x, F.target, F.barge.z);
  F.ring.material.color.setHex(COLORS[F.idx % COLORS.length]);
  F.ring.visible = true;
}

function endShow(world, cancelled) {
  const F = world.fireworks;
  F.state = 'idle';
  F.ring.visible = false;
  F.shell.visible = false;
  if (F.hud) F.hud.el.style.display = 'none';
  world.fireworksHint = null;
  F.doneDay = world.dailyDay;
  const tips = Math.round(F.score * 1.6);
  world.money += tips;
  addRep(world, Math.round(F.score / 4));
  world.addXP?.(Math.round(F.score / 5));
  if (cancelled) {
    sfxMissionFail();
    showMissionMsg('SHOW CUT SHORT', `The crowd drifts off — tips so far +$${tips}`, '#ff9a6a');
  } else {
    const newBest = F.score > F.best;
    if (newBest) F.best = F.score;
    (F.score >= SHELLS * 60 ? sfxMissionPass : sfxMissionFail)();
    showMissionMsg('WHAT A SHOW!', `Score ${F.score} · tips +$${tips}${newBest ? ' · NEW BEST!' : ''}`, '#ffd24a');
    if (F.score >= SHELLS * 80) showNews('the harbor fireworks have the whole waterfront cheering');
  }
  world.onSave?.();
}

export function updateFireworks(world, dt, keys, pressed) {
  const F = world.fireworks;
  if (!F) return;
  world.fireworksHint = null;
  updateBursts(world, dt);
  if (F.state === 'idle' && F.hud) F.hud.el.style.display = 'none';

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const d = Math.hypot(player.pos.x - F.pos.x, player.pos.z - F.pos.z);

  if (F.state === 'idle') {
    if (!onFoot || d > 3) return;
    if (!isNight(world.clock)) { world.fireworksHint = 'FIREWORKS CONSOLE — the barge fires after dark (20:00–02:00)'; return; }
    if (F.doneDay === world.dailyDay) { world.fireworksHint = 'FIREWORKS CONSOLE — tonight\'s show is done; the barge reloads for tomorrow'; return; }
    world.fireworksHint = `FIREWORKS CONSOLE — press <b>E</b> to run tonight's show${F.best ? ` · best ${F.best}` : ''}`;
    if (pressed['KeyE']) {
      F.idx = 0; F.score = 0;
      ensureHud(world).el.style.display = 'block';
      showMissionMsg('FIREWORKS SHOW', 'Hold E to charge, let go when the bar meets the gold zone', '#ffd24a');
      nextShell(world);
    }
    return;
  }

  if (!onFoot || d > 5) { endShow(world, true); return; }
  const hud = ensureHud(world);
  const span = MAX_H - MIN_H;
  const tPct = (F.target - MIN_H) / span;
  hud.zone.style.left = Math.max(0, (tPct - 7 / span) * 100) + '%';
  hud.zone.style.width = (14 / span * 100) + '%';
  hud.fill.style.width = (F.charge * 100) + '%';
  hud.label.textContent = `SHELL ${Math.min(F.idx + 1, SHELLS)}/${SHELLS} · score ${F.score}`;

  if (F.state === 'aim') {
    world.fireworksHint = F.needRelease ? 'FIREWORKS — release E, then hold it to charge the next shell' : 'FIREWORKS — hold <b>E</b> to charge, let go on the gold ring';
    if (F.needRelease) { if (!keys['KeyE']) F.needRelease = false; return; }
    if (keys['KeyE']) { F.charge = Math.min(1, F.charge + dt / CHARGE_TIME); return; }
    if (F.charge > 0) {
      // released: launch the shell from the barge
      F.burstH = MIN_H + F.charge * span;
      F.state = 'flight';
      F.ring.visible = true;
      F.shell.position.set(F.barge.x, WATER_Y + 1.4, F.barge.z);
      F.shell.visible = true;
      sfxWeb();
    }
    return;
  }

  if (F.state === 'flight') {
    world.fireworksHint = 'FIREWORKS — shell away...';
    F.shell.position.y += RISE * dt;
    if (F.shell.position.y < F.burstH) return;
    F.shell.visible = false;
    F.ring.visible = false;
    const err = Math.abs(F.burstH - F.target);
    const tier = TIERS.find(([lim]) => err <= lim);
    const pts = tier ? tier[1] : 0;
    F.score += pts;
    burst(world, F.barge.x, F.burstH, F.barge.z, COLORS[F.idx % COLORS.length]);
    if (pts >= 100) burst(world, F.barge.x, F.burstH, F.barge.z, 0xffffff); // a perfect shell gets a white crown
    showToast(tier ? `${tier[2]}! +${pts}` : 'Fizzled — way off the ring');
    F.idx++;
    F.state = 'gap';
    F.wait = 1.1;
    return;
  }

  // gap between shells, so each burst gets its moment
  world.fireworksHint = 'FIREWORKS — reloading the mortar...';
  F.wait -= dt;
  if (F.wait > 0) return;
  if (F.idx >= SHELLS) { endShow(world, false); return; }
  nextShell(world);
}

export function fireworksSave(world) {
  return { fireworksDay: world.fireworks?.doneDay, fireworksBest: world.fireworks?.best };
}
