import * as THREE from 'three';
import { blockStart } from './city.js';
import { placeStreetSite } from './site-layout.js';
import { showToast, showNews, showMissionMsg } from './hud.js';
import { sfxMissionPass, sfxMissionFail, sfxPickup } from './sound.js';
import { addRep, addChaos } from './economy.js';
import { addCrime } from './police.js';
import { availableFunds, spendMoney } from './wallet.js';

// THE VAULT — a planned, multi-stage score separate from the daily bank job.
// Scope the target, optionally buy gear to cut the heat and crack time, break
// in and hold the floor while the drill runs, then lose five stars and reach
// the drop-off with the take. Bigger risk, bigger payout. Once per in-game day.

const CRACK_TIME = 26;        // seconds of drilling, before gear
const GEAR_COST = 4000;       // optional prep: thermal lance + jammer
const BASE_REWARD = 9000;     // base take before loot multiplier
const SCOPE_RADIUS = 3.6;

function makeGuard(world, x, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.8, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x24324f, metalness: 0.4, roughness: 0.6 })
  );
  mesh.position.set(x, 0.9, z);
  world.scene.add(mesh);
  const foe = { mesh, pos: mesh.position, hp: 60, dead: false };
  foe.target = {
    pos: foe.pos, aimY: 0.9, r: 1.0,
    get dead() { return foe.dead; },
    hit() { foe.hp -= 30; if (foe.hp <= 0 && !foe.dead) { foe.dead = true; foe.mesh.rotation.z = Math.PI / 2; foe.mesh.position.y = 0.3; } },
  };
  world.targets.push(foe.target);
  return foe;
}

function clearGuards(world) {
  const v = world.vault;
  for (const f of v.foes) {
    world.scene.remove(f.mesh);
    const ti = world.targets.indexOf(f.target);
    if (ti >= 0) world.targets.splice(ti, 1);
  }
  v.foes.length = 0;
}

function spawnGuards(world, n) {
  const v = world.vault;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    v.foes.push(makeGuard(world, v.pos.x + Math.cos(a) * 6, v.pos.z + Math.sin(a) * 6));
  }
}

export function initVaultHeist(scene, world, save) {
  // Put the entrance on open ground near a block away from the daily bank job's
  // corner — placeStreetSite nudges it off roads and out of building colliders
  // so the player can actually stand on the interaction point.
  const pos = new THREE.Vector3(blockStart(7) + 6, 0, blockStart(2) + 6);
  try { placeStreetSite(world.city, pos, 3.2, 'vault'); } catch { /* keep intended spot if the city is packed */ }
  const bx = pos.x, bz = pos.z;

  // target marker ring
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.6, 0.5, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.position.set(bx, 0.4, bz);
  scene.add(ring);

  // drop-off beam (hidden until the escape leg) — open ground away from the vault
  const drop = world.city.spawn.clone().add(new THREE.Vector3(-26, 0, 22));
  try { placeStreetSite(world.city, drop, 3, 'vault-drop'); } catch { /* keep intended spot */ }
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 2.2, 44, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x40d0ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.set(drop.x, 22, drop.z);
  beam.visible = false;
  scene.add(beam);

  world.vault = {
    pos, ring, beam, drop,
    state: 'idle',       // idle -> scoped -> breakin -> escape
    holdT: 0, t: 0, crackTotal: 0, wave2: false,
    geared: false,
    foes: [],
    doneDay: save.vaultDay ?? -99,
  };
}

export function failVaultHeist(world) {
  const v = world.vault;
  if (!v || v.state === 'idle') return;
  v.state = 'idle';
  v.holdT = 0;
  v.geared = false;
  clearGuards(world);
  v.beam.visible = false;
  sfxMissionFail();
  showMissionMsg('SCORE BLOWN', 'The crew bailed — the vault reseals. Try again tomorrow.', '#ff5a4a');
}

function crackTime(world) {
  const v = world.vault;
  let t = CRACK_TIME;
  if (v.geared) t *= 0.7;             // thermal lance drills faster
  if (world.crew?.hacker) t *= 0.75;  // a hacker shaves the alarm loop
  return t;
}
function breakinGuards(world) { return world.crew?.muscle ? 4 : 6; }
function escapeStars(world) { const v = world.vault; return (v.geared ? 4 : 5) - (world.crew?.driver ? 1 : 0); }
function lootMult(world) {
  let m = 1;
  if (world.crew?.driver && world.crew?.hacker && world.crew?.muscle) m += 0.6; // full crew cut
  if (world.vault.geared) m += 0.25; // clean job pays more
  return m;
}

export function updateVaultHeist(world, dt, keys, pressed) {
  const v = world.vault;
  if (!v) return;
  const player = world.player;
  world.vaultHint = null;
  v.ring.rotation.y += dt * 0.8;
  v.ring.visible = v.state === 'idle' && v.doneDay !== world.dailyDay;

  const d = Math.hypot(player.pos.x - v.pos.x, player.pos.z - v.pos.z);
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat && player.pos.y < 2;

  // ---- idle / scope-out ----
  if (v.state === 'idle') {
    if (!onFoot || d > SCOPE_RADIUS) { v.holdT = 0; return; }
    if (v.doneDay === world.dailyDay) { world.vaultHint = 'THE VAULT — already hit today; it reopens tomorrow'; return; }
    if (keys['KeyE']) {
      v.holdT += dt;
      world.vaultHint = `CASING THE VAULT... ${Math.ceil((1.2 - v.holdT) * 10) / 10}s`;
      if (v.holdT >= 1.2) {
        v.holdT = 0;
        v.state = 'scoped';
        sfxPickup();
        showMissionMsg('THE VAULT — SCOPED', 'Buy gear to go in clean (press E), or crack it raw (press F).', '#ffd24a');
        showNews('someone has been casing the downtown vault');
      }
    } else {
      v.holdT = Math.max(0, v.holdT - dt * 2);
      world.vaultHint = 'THE VAULT — hold <b>E</b> to case the score (big take, five-star heat)';
    }
    return;
  }

  // ---- scoped: choose gear (E, costs cash) or go raw (F) ----
  if (v.state === 'scoped') {
    if (!onFoot || d > 7) { world.vaultHint = 'STAY ON THE VAULT — decide your approach'; return; }
    const cost = Math.round(GEAR_COST * (world.discount || 1));
    world.vaultHint = `GEAR UP: <b>E</b> buy lance+jammer ($${cost}, faster & less heat) · <b>F</b> crack it raw`;
    if (pressed['KeyE']) {
      if (availableFunds(world, cost) < cost) { showToast('Not enough cash for the gear — go raw with F, or come back funded'); return; }
      spendMoney(world, cost);
      v.geared = true;
      sfxPickup();
      showToast('GEARED UP — thermal lance and signal jammer loaded');
      beginBreakin(world);
    } else if (pressed['KeyF']) {
      v.geared = false;
      beginBreakin(world);
    }
    return;
  }

  // ---- breakin: hold the floor while the drill runs ----
  if (v.state === 'breakin') {
    if (d < 16) {
      v.t -= dt;
      world.vaultHint = `DRILLING THE VAULT — <b>${Math.ceil(v.t)}s</b> · hold the floor!`;
    } else {
      world.vaultHint = 'GET BACK TO THE VAULT — the drill stalled!';
    }
    if (!v.wave2 && v.t < v.crackTotal / 2) {
      v.wave2 = true;
      spawnGuards(world, breakinGuards(world));
      showToast('SECURITY TEAM INBOUND!');
    }
    for (const f of v.foes) {
      if (f.dead) continue;
      const dx = player.pos.x - f.pos.x, dz = player.pos.z - f.pos.z;
      const fd = Math.hypot(dx, dz) || 1;
      if (fd > 1.8) {
        f.pos.x += (dx / fd) * 4 * dt;
        f.pos.z += (dz / fd) * 4 * dt;
        f.mesh.rotation.y = Math.atan2(dx, dz);
      } else if (Math.random() < dt * 1.3) {
        player.health -= 6;
      }
    }
    if (v.t <= 0) {
      v.state = 'escape';
      clearGuards(world);
      v.beam.visible = true;
      world.wanted = Math.max(world.wanted, escapeStars(world));
      world.wantedTimer = 0;
      addChaos(world, 55);
      sfxMissionPass();
      showMissionMsg('GRAB THE TAKE!', 'Now lose the heat — reach the blue beam at the docks', '#40d0ff');
      showNews('downtown vault blown — crew on the run with the take');
    }
    return;
  }

  // ---- escape: reach the drop-off beam ----
  world.vaultHint = 'THE VAULT — escape to the <b>blue beam</b> at the docks with the take!';
  v.beam.rotation.y += dt;
  if (Math.hypot(player.pos.x - v.drop.x, player.pos.z - v.drop.z) < 5) {
    v.state = 'idle';
    v.doneDay = world.dailyDay;
    v.beam.visible = false;
    const mult = lootMult(world);
    const pay = Math.round(BASE_REWARD * mult);
    world.money += pay;
    addRep(world, 1400);
    world.addXP?.(650);
    v.geared = false;
    sfxMissionPass();
    showMissionMsg('VAULT CLEANED OUT!', `+$${pay.toLocaleString()}${mult > 1 ? ` (×${mult.toFixed(2)} take)` : ''} — a clean getaway`, '#ffd24a');
    showNews('record vault haul vanishes into the docks');
    world.onSave?.();
  }
}

function beginBreakin(world) {
  const v = world.vault;
  v.state = 'breakin';
  v.t = crackTime(world);
  v.crackTotal = v.t;
  v.wave2 = false;
  spawnGuards(world, breakinGuards(world));
  addCrime(world, 4);
  sfxMissionPass();
  showMissionMsg('THE VAULT', `Hold the floor while the drill runs — ${Math.ceil(v.t)}s`, '#ffd24a');
  showNews('silent alarm screams at the downtown vault');
}

// Save only the day it was last completed (like the bank job's doneDay).
export function vaultHeistSave(world) {
  return { vaultDay: world.vault?.doneDay };
}
