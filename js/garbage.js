import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { storefront } from './propKit.js';
import { blockStart, N, pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxMissionPass, sfxMissionFail, sfxPickup } from './sound.js';
import { addRep } from './economy.js';

// SANITATION RUN: clock on at the yard, then clear every bin on the route
// before the shift clock runs out. Roll up to each bin to empty it; miss the
// clock and the route is scrubbed. Clear them all for the full payout plus a
// clean-sweep bonus. Any vehicle will do — the city just wants the bins empty.

const BINS = 7;
const TIME = 150;         // shift clock, seconds
const BIN_RADIUS = 5;
const PER_BIN = 90;
const SWEEP_BONUS = 500;

export function initGarbage(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(30, 0, -28));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 2)) pos = world.city.spawn.clone().add(new THREE.Vector3(26, 0, -24));
  placeStreetSite(world.city, pos, 2.8, 'yard');

  storefront(scene, world.city, pos, { name: 'SANITATION', w: 3, d: 2.4, wall: 0x4a6b44, accent: 0x2e7d32, sign: { fg: '#d8ffcf', bg: '#15291a', accent: '#5fd16a' } });

  // a pool of bin meshes we show/hide as routes come and go
  const bins = [];
  for (let i = 0; i < BINS; i++) {
    const bin = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.2, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7 })
    );
    bin.visible = false;
    scene.add(bin);
    bins.push({ mesh: bin, pos: new THREE.Vector3(), done: false });
  }

  world.garbage = {
    pos, bins,
    on: false, t: 0, left: 0,
    cooldown: 0,
    runs: save?.garbageRuns ?? 0,
  };
}

function layRoute(world) {
  const g = world.garbage;
  let placed = 0;
  for (let i = 0; i < 60 && placed < BINS; i++) {
    const bi = 1 + ((Math.random() * (N - 2)) | 0);
    const bj = 1 + ((Math.random() * (N - 2)) | 0);
    const x = blockStart(bi) + 8 + Math.random() * 44;
    const z = blockStart(bj) + 8 + Math.random() * 44;
    if (pointBlocked(new THREE.Vector3(x, 1, z), world.city.colliders, 1.5)) continue;
    const slot = g.bins[placed];
    if (g.bins.slice(0, placed).some((b) => Math.hypot(b.pos.x - x, b.pos.z - z) < 30)) continue;
    slot.pos.set(x, 0, z);
    slot.mesh.position.set(x, 0.6, z);
    slot.mesh.visible = true;
    slot.done = false;
    placed++;
  }
  return placed;
}

function clearBins(world) {
  for (const b of world.garbage.bins) b.mesh.visible = false;
  world.garbageBlip = null;
}

function endRun(world, finished) {
  const g = world.garbage;
  g.on = false;
  g.cooldown = 4;
  world.garbageHint = null;
  clearBins(world);
  if (finished) {
    g.runs++;
    const pay = SWEEP_BONUS; // each bin was already paid as it was emptied
    world.money += pay;
    addRep(world, 220);
    world.addXP?.(180);
    sfxMissionPass();
    showMissionMsg('ROUTE CLEARED', `Every bin emptied — +$${pay.toLocaleString()} bonus ($${(PER_BIN * BINS + pay).toLocaleString()} total)`, '#ffd24a');
    showNews('sanitation keeps the streets clean another day');
    world.onSave?.();
  } else {
    sfxMissionFail();
    showMissionMsg('SHIFT OVER', 'The clock beat you — clock on again to retry', '#ff5a4a');
  }
}

export function updateGarbage(world, dt, keys, pressed) {
  const g = world.garbage;
  if (!g) return;
  world.garbageHint = null;
  if (g.cooldown > 0) g.cooldown = Math.max(0, g.cooldown - dt);

  const player = world.player;
  const inVehicle = !!player.inCar;
  const focus = player.inCar ? player.inCar.pos : player.pos;

  if (!g.on) {
    const d = Math.hypot(focus.x - g.pos.x, focus.z - g.pos.z);
    if (d > 6 || g.cooldown > 0) return;
    if (!inVehicle) { world.garbageHint = 'SANITATION YARD — bring a vehicle to start a run'; return; }
    world.garbageHint = 'SANITATION — press <b>E</b> to start the garbage run';
    world.carActionE = true;
    if (pressed['KeyE']) {
      if (layRoute(world) < BINS) { showToast('No clear route right now — try again shortly'); g.cooldown = 3; return; }
      g.on = true;
      g.t = TIME;
      g.left = BINS;
      sfxPickup();
      showMissionMsg('SANITATION RUN', `Clear ${BINS} bins before the clock runs out`, '#ffd24a');
    }
    return;
  }

  // on a run: count down, empty bins on contact
  g.t -= dt;
  if (g.t <= 0) { endRun(world, false); return; }

  // point the map blip at the nearest remaining bin
  let nearest = null, nd = Infinity;
  for (const b of g.bins) {
    if (b.done) continue;
    b.mesh.rotation.y += dt;
    const d = Math.hypot(focus.x - b.pos.x, focus.z - b.pos.z);
    if (d < nd) { nd = d; nearest = b; }
    if (d < BIN_RADIUS && inVehicle) {
      b.done = true;
      b.mesh.visible = false;
      g.left--;
      world.money += PER_BIN;
      sfxPickup();
      if (g.left <= 0) { endRun(world, true); return; }
      showToast(`Bin emptied — ${g.left} left · ${Math.ceil(g.t)}s`);
    }
  }
  if (nearest) world.garbageBlip = { x: nearest.pos.x, z: nearest.pos.z };
  world.garbageHint = inVehicle
    ? `GARBAGE RUN — ${g.left} bins left · <b>${Math.ceil(g.t)}s</b>`
    : 'GARBAGE RUN — get back in a vehicle to keep the shift';
}

export function garbageSave(world) {
  return { garbageRuns: world.garbage?.runs };
}
