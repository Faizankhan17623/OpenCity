import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { blockStart, N, pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxMissionPass, sfxMissionFail, sfxPickup } from './sound.js';
import { addRep } from './economy.js';

// POSTAL RUN: load a sack at the post office, then hit a chain of addresses in
// order before the clock runs out. Each drop pays; finish the whole round for a
// bonus. Any wheels (or none) work — the mail must go through.

const DROPS = 5;
const TIME = 140;
const DROP_RADIUS = 5;
const PER_DROP = 130;
const ROUND_BONUS = 450;

export function initMailRun(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(18, 0, 30));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 2)) pos = world.city.spawn.clone().add(new THREE.Vector3(14, 0, 26));
  placeStreetSite(world.city, pos, 2.6, 'post-office');

  const office = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 2.6, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x2a4d8a, roughness: 0.7 })
  );
  office.position.copy(pos).setY(1.3);
  scene.add(office);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.6, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xffd24a })
  );
  sign.position.copy(pos).add(new THREE.Vector3(0, 3, 1.15));
  scene.add(sign);

  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(DROP_RADIUS, DROP_RADIUS, 0.1, 24),
    new THREE.MeshBasicMaterial({ color: 0x4a9aff, transparent: true, opacity: 0.4, depthWrite: false })
  );
  ring.position.y = 0.06;
  ring.visible = false;
  scene.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.5, 40, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x4a9aff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.visible = false;
  scene.add(beam);

  world.mailRun = {
    pos, ring, beam,
    on: false, t: 0, idx: 0, drops: [],
    cooldown: 0,
    rounds: save?.mailRounds ?? 0,
  };
}

function layRoute(world) {
  const m = world.mailRun;
  m.drops = [];
  for (let i = 0; i < 40 && m.drops.length < DROPS; i++) {
    const bi = 1 + ((Math.random() * (N - 2)) | 0);
    const bj = 1 + ((Math.random() * (N - 2)) | 0);
    const x = blockStart(bi) + 8 + Math.random() * 44;
    const z = blockStart(bj) + 8 + Math.random() * 44;
    if (pointBlocked(new THREE.Vector3(x, 1, z), world.city.colliders, 1.5)) continue;
    if (m.drops.some((d) => Math.hypot(d.x - x, d.z - z) < 28)) continue;
    m.drops.push(new THREE.Vector3(x, 0, z));
  }
  return m.drops.length;
}

function moveRing(world) {
  const m = world.mailRun;
  const d = m.drops[m.idx];
  m.ring.position.set(d.x, 0.06, d.z);
  m.ring.visible = true;
  m.beam.position.set(d.x, 20, d.z);
  m.beam.visible = true;
  world.mailBlip = { x: d.x, z: d.z };
}

function endRun(world, finished) {
  const m = world.mailRun;
  m.on = false;
  m.ring.visible = false;
  m.beam.visible = false;
  world.mailBlip = null;
  world.mailHint = null;
  m.cooldown = 4;
  if (finished) {
    m.rounds++;
    world.money += ROUND_BONUS;
    addRep(world, 200);
    world.addXP?.(170);
    sfxMissionPass();
    showMissionMsg('ROUND DELIVERED', `Every letter dropped — +$${ROUND_BONUS} bonus`, '#ffd24a');
    showNews('the post always gets through, rain or shine');
    world.onSave?.();
  } else {
    sfxMissionFail();
    showMissionMsg('MAIL LATE', 'The clock beat you — clock on again to retry', '#ff5a4a');
  }
}

export function updateMailRun(world, dt, keys, pressed) {
  const m = world.mailRun;
  if (!m) return;
  world.mailHint = null;
  m.ring.rotation.y += dt * 0.5;
  if (m.cooldown > 0) m.cooldown = Math.max(0, m.cooldown - dt);

  const player = world.player;
  const focus = player.inCar ? player.inCar.pos : player.pos;

  if (!m.on) {
    const d = Math.hypot(focus.x - m.pos.x, focus.z - m.pos.z);
    if (d > 6 || m.cooldown > 0) return;
    world.mailHint = 'POST OFFICE — press <b>E</b> to load a mail round';
    if (pressed['KeyE']) {
      if (layRoute(world) < DROPS) { showToast('No clear route right now — try again shortly'); m.cooldown = 3; return; }
      m.on = true;
      m.t = TIME;
      m.idx = 0;
      moveRing(world);
      sfxPickup();
      showMissionMsg('POSTAL RUN', `${DROPS} addresses — beat the clock`, '#ffd24a');
    }
    return;
  }

  m.t -= dt;
  if (m.t <= 0) { endRun(world, false); return; }

  const target = m.drops[m.idx];
  world.mailHint = `MAIL — drop <b>${m.idx + 1}/${DROPS}</b> · <b>${Math.ceil(m.t)}s</b>`;
  if (Math.hypot(focus.x - target.x, focus.z - target.z) < DROP_RADIUS) {
    world.money += PER_DROP;
    sfxPickup();
    m.idx++;
    if (m.idx >= m.drops.length) { endRun(world, true); return; }
    moveRing(world);
    showToast(`Delivered — ${m.idx}/${DROPS} · ${Math.ceil(m.t)}s`);
  }
}

export function mailRunSave(world) {
  return { mailRounds: world.mailRun?.rounds };
}
