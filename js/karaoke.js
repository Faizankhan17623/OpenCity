import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// KARAOKE BAR: grab the mic and hit the notes in time. Four lanes (1 2 3 4);
// a note slides down each lane and you press its key as it crosses the line.
// Hits build a combo and the crowd's mood; the final score pays tips and rep.
// Lanes are the number keys: D/F/J/K would also strafe, punch and fire the jetpack.
// A light, musical change of pace from street busking.

const LANES = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];
const LANE_LABEL = ['1', '2', '3', '4'];
const NOTE_COUNT = 24;
const FALL = 2.0;         // seconds for a note to fall to the line
const HIT_WINDOW = 0.18;  // seconds of leeway around the line
const SPAWN_GAP = 0.7;

export function initKaraoke(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(-30, 0, -8));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 1.6)) pos = world.city.spawn.clone().add(new THREE.Vector3(-26, 0, -12));
  placeStreetSite(world.city, pos, 2.6, 'karaoke');

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(3, 2.6, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x2a1840, roughness: 0.7 })
  );
  bar.position.copy(pos).setY(1.3);
  scene.add(bar);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.7, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xff55c0 })
  );
  sign.position.copy(pos).add(new THREE.Vector3(0, 3, 1.2));
  scene.add(sign);

  world.karaoke = {
    pos, playing: false,
    notes: [], spawned: 0, spawnT: 0, t: 0,
    hits: 0, combo: 0, best: 0, score: 0,
    hud: null,
    high: save?.karaokeHigh ?? 0,
  };
}

function ensureHud(world) {
  const k = world.karaoke;
  if (k.hud) return k.hud;
  const el = document.createElement('div');
  el.id = 'karaoke';
  el.style.cssText = 'position:fixed;left:50%;top:14%;transform:translateX(-50%);width:240px;height:320px;' +
    'background:#0c0818e0;border:1px solid #ff55c0;border-radius:8px;display:none;z-index:31;overflow:hidden;font:bold 16px system-ui;color:#fff';
  const line = document.createElement('div');
  line.style.cssText = 'position:absolute;left:0;right:0;bottom:48px;height:3px;background:#ff55c0aa';
  const labels = document.createElement('div');
  labels.style.cssText = 'position:absolute;left:0;right:0;bottom:16px;display:flex;justify-content:space-around;color:#ff9ad8';
  labels.innerHTML = LANE_LABEL.map((l) => `<span>${l}</span>`).join('');
  const score = document.createElement('div');
  score.style.cssText = 'position:absolute;top:6px;left:0;right:0;text-align:center;font-size:14px;color:#ffd24a';
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;inset:0';
  el.append(layer, line, labels, score);
  document.body.appendChild(el);
  k.hud = { el, layer, score, line };
  return k.hud;
}

function spawnNote(world) {
  const k = world.karaoke;
  const lane = (Math.random() * 4) | 0;
  const dot = document.createElement('div');
  dot.style.cssText = `position:absolute;width:30px;height:30px;border-radius:50%;background:#55e6ff;` +
    `left:${12 + lane * 55}px;top:-30px`;
  k.hud.layer.appendChild(dot);
  k.notes.push({ lane, t: 0, dot, hit: false, linger: 0 });
  k.spawned++;
}

function finish(world) {
  const k = world.karaoke;
  k.playing = false;
  world.karaokeHint = null;
  if (k.hud) k.hud.el.style.display = 'none';
  for (const n of k.notes) n.dot.remove();
  k.notes.length = 0;
  const tips = k.score * 15;
  world.money += tips;
  addRep(world, Math.round(k.score * 2));
  if (k.score > k.high) { k.high = k.score; showNews('a new voice is the toast of the karaoke bar'); }
  (k.score >= NOTE_COUNT * 0.6 ? sfxMissionPass : sfxMissionFail)();
  showMissionMsg('ENCORE!', `${k.hits}/${NOTE_COUNT} notes · best combo ${k.best} · +$${tips}`, '#ff9ad8');
  world.onSave?.();
}

export function updateKaraoke(world, dt, keys, pressed) {
  const k = world.karaoke;
  if (!k) return;
  world.karaokeHint = null;
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;

  if (!k.playing) {
    const d = Math.hypot(player.pos.x - k.pos.x, player.pos.z - k.pos.z);
    if (d > 3.4 || !onFoot) return;
    world.karaokeHint = `KARAOKE BAR — press <b>E</b> to perform${k.high ? ` (best ${k.high})` : ''}`;
    if (pressed['KeyE']) {
      const hud = ensureHud(world);
      hud.el.style.display = 'block';
      k.playing = true; k.notes.length = 0; k.spawned = 0; k.spawnT = 0; k.t = 0;
      k.hits = 0; k.combo = 0; k.best = 0; k.score = 0;
      sfxPickup();
      showMissionMsg('KARAOKE', 'Hit 1 2 3 4 as the notes cross the line!', '#ff9ad8');
    }
    return;
  }

  // walking away or driving off ends the set early
  if (!onFoot || Math.hypot(player.pos.x - k.pos.x, player.pos.z - k.pos.z) > 6) { finish(world); return; }

  world.nearKiosk = true; // digits sing here, not switch weapons
  k.t += dt;
  k.spawnT -= dt;
  if (k.spawned < NOTE_COUNT && k.spawnT <= 0) { spawnNote(world); k.spawnT = SPAWN_GAP; }

  const hud = k.hud;
  const travel = 260; // px from spawn to the line
  for (const n of k.notes) {
    if (n.hit) { n.linger += dt; continue; } // keep a hit note on screen briefly, then it's cleaned up
    n.t += dt;
    const y = -30 + (n.t / FALL) * travel;
    n.dot.style.top = y + 'px';
    // did the player hit this lane within the window?
    if (pressed[LANES[n.lane]] && Math.abs(n.t - FALL) <= HIT_WINDOW) {
      n.hit = true; n.linger = 0;
      n.dot.style.background = '#2fd06a';
      k.hits++; k.combo++; k.best = Math.max(k.best, k.combo);
      k.score += 1 + Math.floor(k.combo / 5); // combos score more
      sfxPickup();
    } else if (n.t > FALL + HIT_WINDOW) {
      // missed — breaks the combo
      n.hit = true; n.linger = 0;
      n.dot.style.background = '#c0362e';
      k.combo = 0;
    }
  }
  // clean up notes that have been resolved for a beat
  for (let i = k.notes.length - 1; i >= 0; i--) {
    if (k.notes[i].hit && k.notes[i].linger > 0.3) { k.notes[i].dot.remove(); k.notes.splice(i, 1); }
  }
  hud.score.textContent = `SCORE ${k.score}  ·  COMBO ${k.combo}`;
  world.karaokeHint = `KARAOKE — ${k.hits}/${NOTE_COUNT} · combo ${k.combo}`;

  if (k.spawned >= NOTE_COUNT && k.notes.length === 0) finish(world);
}

export function karaokeSave(world) {
  return { karaokeHigh: world.karaoke?.high };
}
