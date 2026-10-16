import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// ARCHERY RANGE: step to the line and loose six arrows. Each shot is a two-step
// timing play — a horizontal AIM sweep for left/right, then a POWER sweep for
// elevation. Land both near the middle to cluster the bullseye. Round score
// pays out and beats your saved best.

const ARROWS = 6;
const STAKE = 40;

export function initArchery(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(20, 0, -34));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 1.6)) pos = world.city.spawn.clone().add(new THREE.Vector3(16, 0, -30));
  placeStreetSite(world.city, pos, 2.6, 'archery');

  const board = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.2, 20),
    new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.7 })
  );
  board.rotation.x = Math.PI / 2;
  board.position.copy(pos).add(new THREE.Vector3(0, 1.6, -4));
  scene.add(board);
  const bull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0xffd24a })
  );
  bull.rotation.x = Math.PI / 2;
  bull.position.copy(board.position).add(new THREE.Vector3(0, 0, 0.02));
  scene.add(bull);

  world.archery = {
    pos, open: false, playing: false,
    phase: 'aim', marker: 0, dir: 1, aim: 0,
    arrows: 0, score: 0,
    hud: null,
    high: save?.archeryHigh ?? 0,
  };
}

function ensureHud(world) {
  const a = world.archery;
  if (a.hud) return a.hud;
  const el = document.createElement('div');
  el.id = 'archery';
  el.style.cssText = 'position:fixed;left:50%;bottom:118px;transform:translateX(-50%);width:260px;height:42px;' +
    'background:#101820cc;border:1px solid #cc6633;border-radius:5px;display:none;z-index:30;color:#fed;font:bold 12px system-ui';
  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;left:0;right:0;top:4px;text-align:center';
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:4px;right:4px;top:22px;height:14px;background:#0a1016;border-radius:3px;overflow:hidden';
  const zone = document.createElement('div');
  zone.style.cssText = 'position:absolute;top:0;height:100%;background:#2fd06a55';
  const needle = document.createElement('div');
  needle.style.cssText = 'position:absolute;top:0;width:3px;height:100%;background:#ffd24a';
  bar.append(zone, needle);
  el.append(label, bar);
  document.body.appendChild(el);
  a.hud = { el, zone, needle, label };
  return a.hud;
}

function start(world) {
  const a = world.archery;
  if (world.money < STAKE) { showToast('Not enough cash for a round'); return; }
  world.money -= STAKE;
  a.playing = true; a.phase = 'aim'; a.marker = 0; a.dir = 1; a.aim = 0; a.arrows = 0; a.score = 0;
  ensureHud(world).el.style.display = 'block';
  showMissionMsg('ARCHERY', 'Catch AIM at centre, then POWER at centre', '#cc6633');
}

function finish(world) {
  const a = world.archery;
  a.playing = false;
  world.archeryHint = null;
  if (a.hud) a.hud.el.style.display = 'none';
  const pay = Math.round(a.score * 6);
  world.money += pay;
  addRep(world, Math.round(a.score / 3));
  const newBest = a.score > a.high;
  if (newBest) { a.high = a.score; showNews('a sharp eye tops the archery scoreboard'); }
  (a.score >= ARROWS * 6 ? sfxMissionPass : sfxMissionFail)();
  showMissionMsg('ROUND DONE', `Score ${a.score} · +$${pay}${newBest ? ' · NEW BEST!' : ` · best ${a.high}`}`, '#cc6633');
  world.onSave?.();
}

function loose(world) {
  const a = world.archery;
  const aimAcc = 1 - Math.abs(a.aim - 0.5) * 2;
  const powAcc = 1 - Math.abs(a.marker - 0.5) * 2;
  const q = Math.max(0, (aimAcc + powAcc) / 2);
  const pts = q > 0.9 ? 10 : q > 0.7 ? 8 : q > 0.4 ? 5 : q > 0.15 ? 2 : 0;
  a.score += pts;
  a.arrows++;
  sfxPickup();
  showToast(pts === 10 ? 'BULLSEYE! +10' : pts > 0 ? `+${pts}` : 'Missed');
  a.phase = 'aim'; a.marker = 0; a.dir = 1; a.aim = 0;
  if (a.arrows >= ARROWS) finish(world);
}

export function updateArchery(world, dt, keys, pressed) {
  const a = world.archery;
  if (!a) return;
  world.archeryHint = null;
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const d = Math.hypot(player.pos.x - a.pos.x, player.pos.z - a.pos.z);

  if (a.playing) {
    if (d > 5 || !onFoot) { finish(world); return; }
    const hud = ensureHud(world);
    a.marker += a.dir * 1.5 * dt;
    if (a.marker >= 1) { a.marker = 1; a.dir = -1; }
    if (a.marker <= 0) { a.marker = 0; a.dir = 1; }
    hud.zone.style.left = '42%'; hud.zone.style.width = '16%';
    hud.needle.style.left = (a.marker * 100) + '%';
    hud.label.textContent = `ARROW ${a.arrows + 1}/${ARROWS} · ${a.phase.toUpperCase()} · score ${a.score}`;
    world.archeryHint = a.phase === 'aim' ? 'ARCHERY — set your <b>AIM</b> (tap E)' : 'ARCHERY — set the <b>POWER</b> (tap E)';
    if (pressed['KeyE']) {
      if (a.phase === 'aim') { a.aim = a.marker; a.phase = 'power'; a.marker = 0; a.dir = 1; sfxPickup(); }
      else loose(world);
    }
    return;
  }

  if (d > 3.4 || !onFoot) { if (a.hud) a.hud.el.style.display = 'none'; return; }
  world.archeryHint = `ARCHERY RANGE — press <b>E</b> to shoot ($${STAKE})${a.high ? ` · best ${a.high}` : ''}`;
  if (pressed['KeyE']) start(world);
}

export function archerySave(world) {
  return { archeryHigh: world.archery?.high };
}
