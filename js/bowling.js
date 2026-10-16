import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// STRIKE LANES: ten frames of bowling. Each roll is a two-step timing shot —
// first catch the AIM sweep near centre, then the POWER sweep near the top.
// How close you land on both decides how many of the ten pins fall. Score the
// frame total; a good game pays out and beats your saved high.

const FRAMES = 10;
const STAKE = 50;

export function initBowling(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(-14, 0, -24));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 1.6)) pos = world.city.spawn.clone().add(new THREE.Vector3(-18, 0, -20));
  placeStreetSite(world.city, pos, 2.6, 'bowling');

  const hall = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 2.6, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x242a48, roughness: 0.7 })
  );
  hall.position.copy(pos).setY(1.3);
  scene.add(hall);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.6, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x55e6ff })
  );
  sign.position.copy(pos).add(new THREE.Vector3(0, 3, 1.25));
  scene.add(sign);

  world.bowling = {
    pos, playing: false,
    frame: 0, roll: 0, pinsStanding: 10, score: 0,
    phase: 'aim',        // aim -> power (per roll)
    marker: 0, dir: 1, aim: 0,
    hud: null,
    high: save?.bowlingHigh ?? 0,
  };
}

function ensureHud(world) {
  const b = world.bowling;
  if (b.hud) return b.hud;
  const el = document.createElement('div');
  el.id = 'bowling';
  el.style.cssText = 'position:fixed;left:50%;bottom:118px;transform:translateX(-50%);width:260px;height:44px;' +
    'background:#101820cc;border:1px solid #55e6ff;border-radius:5px;display:none;z-index:30;color:#dff;font:bold 12px system-ui';
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:4px;right:4px;top:22px;height:16px;background:#0a1016;border-radius:3px;overflow:hidden';
  const zone = document.createElement('div');
  zone.style.cssText = 'position:absolute;top:0;height:100%;background:#2fd06a55';
  const needle = document.createElement('div');
  needle.style.cssText = 'position:absolute;top:0;width:3px;height:100%;background:#ffd24a';
  bar.append(zone, needle);
  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;left:0;right:0;top:4px;text-align:center';
  el.append(label, bar);
  document.body.appendChild(el);
  b.hud = { el, zone, needle, label };
  return b.hud;
}

function start(world) {
  const b = world.bowling;
  if (world.money < STAKE) { showToast('Not enough cash for the lane'); return; }
  world.money -= STAKE;
  b.playing = true; b.frame = 0; b.roll = 0; b.pinsStanding = 10; b.score = 0;
  b.phase = 'aim'; b.marker = 0; b.dir = 1; b.aim = 0;
  ensureHud(world).el.style.display = 'block';
  showMissionMsg('STRIKE LANES', 'Catch AIM at centre, then POWER at the top', '#55e6ff');
}

function finish(world) {
  const b = world.bowling;
  b.playing = false;
  world.bowlingHint = null;
  if (b.hud) b.hud.el.style.display = 'none';
  const pay = Math.round(b.score * 8);
  world.money += pay;
  addRep(world, Math.round(b.score / 2));
  const newBest = b.score > b.high;
  if (newBest) { b.high = b.score; showNews('a new top score goes up at the bowling alley'); }
  (b.score >= 100 ? sfxMissionPass : sfxMissionFail)();
  showMissionMsg('GAME OVER', `Score ${b.score} · +$${pay}${newBest ? ' · NEW BEST!' : ` · best ${b.high}`}`, '#55e6ff');
  world.onSave?.();
}

function roll(world) {
  const b = world.bowling;
  // aim accuracy (centre) and power accuracy (top) combine into pins knocked
  const aimAcc = 1 - Math.abs(b.aim - 0.5) * 2;      // 1 best
  const powAcc = Math.max(0, (b.marker - 0.4) / 0.6); // rewards high power
  const quality = Math.max(0, Math.min(1, aimAcc * 0.5 + powAcc * 0.5));
  let knocked = Math.round(b.pinsStanding * (0.4 + quality * 0.65));
  knocked = Math.max(0, Math.min(b.pinsStanding, knocked));
  b.pinsStanding -= knocked;
  b.score += knocked;
  sfxPickup();
  const strikeOrSpare = b.pinsStanding === 0;
  showToast(strikeOrSpare ? (b.roll === 0 ? 'STRIKE!' : 'SPARE!') : `${knocked} pins`);

  if (b.pinsStanding === 0 || b.roll === 1) {
    // frame over
    b.frame++;
    b.roll = 0;
    b.pinsStanding = 10;
    if (b.frame >= FRAMES) { finish(world); return; }
  } else {
    b.roll++;
  }
  b.phase = 'aim'; b.marker = 0; b.dir = 1; b.aim = 0;
}

export function updateBowling(world, dt, keys, pressed) {
  const b = world.bowling;
  if (!b) return;
  world.bowlingHint = null;
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const d = Math.hypot(player.pos.x - b.pos.x, player.pos.z - b.pos.z);

  if (b.playing) {
    if (d > 5 || !onFoot) { finish(world); return; }
    const hud = ensureHud(world);
    b.marker += b.dir * 1.4 * dt;
    if (b.marker >= 1) { b.marker = 1; b.dir = -1; }
    if (b.marker <= 0) { b.marker = 0; b.dir = 1; }

    if (b.phase === 'aim') {
      hud.label.textContent = `FRAME ${b.frame + 1}/${FRAMES} · AIM · score ${b.score}`;
      hud.zone.style.left = '42%'; hud.zone.style.width = '16%';
      hud.needle.style.left = (b.marker * 100) + '%';
      world.bowlingHint = `BOWLING — set your <b>AIM</b> (tap E)`;
      if (pressed['KeyE']) { b.aim = b.marker; b.phase = 'power'; b.marker = 0; b.dir = 1; sfxPickup(); }
    } else {
      hud.label.textContent = `FRAME ${b.frame + 1}/${FRAMES} · POWER · score ${b.score}`;
      hud.zone.style.left = '78%'; hud.zone.style.width = '22%';
      hud.needle.style.left = (b.marker * 100) + '%';
      world.bowlingHint = `BOWLING — hit the <b>POWER</b> (tap E)`;
      if (pressed['KeyE']) roll(world);
    }
    return;
  }

  if (d > 3.4 || !onFoot) { if (b.hud) b.hud.el.style.display = 'none'; return; }
  world.bowlingHint = `STRIKE LANES — press <b>E</b> to bowl ($${STAKE})${b.high ? ` · best ${b.high}` : ''}`;
  if (pressed['KeyE']) start(world);
}

export function bowlingSave(world) {
  return { bowlingHigh: world.bowling?.high };
}
