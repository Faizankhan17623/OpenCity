import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { blockStart, N, pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxMissionPass, sfxPickup } from './sound.js';
import { addRep } from './economy.js';

// CITY TOW: clock on at the yard, then an abandoned car is flagged somewhere
// in town. Drive up close and hold to hook it, then haul it to the impound lot
// and pull in to drop it. Paid per tow. Any vehicle tows — the hook is magic,
// the paperwork is real.

const HOOK_RADIUS = 5;
const HOOK_HOLD = 2;      // seconds of holding beside the target to hook it
const DROP_RADIUS = 7;
const PAY = 650;

function spawnTarget(world) {
  const focus = world.player.inCar?.pos || world.player.pos;
  for (let i = 0; i < 40; i++) {
    const bi = 1 + ((Math.random() * (N - 2)) | 0);
    const bj = 1 + ((Math.random() * (N - 2)) | 0);
    const x = blockStart(bi) + 8 + Math.random() * 44;
    const z = blockStart(bj) + 8 + Math.random() * 44;
    if (pointBlocked(new THREE.Vector3(x, 1, z), world.city.colliders, 1.6)) continue;
    if (Math.hypot(x - focus.x, z - focus.z) < 40) continue;
    return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(focus.x + 60, 0, focus.z);
}

export function initTowTruck(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(34, 0, 22));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 2)) pos = world.city.spawn.clone().add(new THREE.Vector3(30, 0, 18));
  placeStreetSite(world.city, pos, 2.8, 'tow-yard');

  const booth = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.4, 2),
    new THREE.MeshStandardMaterial({ color: 0x8a6a2f, roughness: 0.8 })
  );
  booth.position.copy(pos).setY(1.2);
  scene.add(booth);

  // the flagged car (a dull wreck) — shown while a job is live
  const wreck = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.9, 4),
    new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.9, metalness: 0.1 })
  );
  body.position.y = 0.6;
  wreck.add(body);
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.7, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 })
  );
  cab.position.set(0, 1.25, -0.2);
  wreck.add(cab);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.6, 40, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.y = 20;
  wreck.add(beam);
  wreck.visible = false;
  scene.add(wreck);

  world.towTruck = {
    pos, wreck,
    state: 'idle',       // idle -> toHook -> toDrop
    target: new THREE.Vector3(), hold: 0,
    cooldown: 0,
    tows: save?.towJobs ?? 0,
  };
}

function endJob(world, finished) {
  const t = world.towTruck;
  t.state = 'idle';
  t.wreck.visible = false;
  t.hold = 0;
  world.towBlip = null;
  world.towHint = null;
  t.cooldown = 4;
  if (finished) {
    t.tows++;
    world.money += PAY;
    addRep(world, 200);
    world.addXP?.(180);
    sfxMissionPass();
    showMissionMsg('VEHICLE IMPOUNDED', `Dropped at the lot — +$${PAY.toLocaleString()}`, '#ffd24a');
    showNews('another abandoned heap hauled off the streets');
    world.onSave?.();
  }
}

export function updateTowTruck(world, dt, keys, pressed) {
  const t = world.towTruck;
  if (!t) return;
  world.towHint = null;
  if (t.cooldown > 0) t.cooldown = Math.max(0, t.cooldown - dt);
  t.wreck.rotation.y += (t.state === 'toHook' ? dt * 0.4 : 0);

  const player = world.player;
  const inVehicle = !!player.inCar;
  const focus = player.inCar ? player.inCar.pos : player.pos;

  if (t.state === 'idle') {
    const d = Math.hypot(focus.x - t.pos.x, focus.z - t.pos.z);
    if (d > 6 || t.cooldown > 0) return;
    if (!inVehicle) { world.towHint = 'CITY TOW YARD — bring a vehicle to start a tow'; return; }
    world.towHint = 'CITY TOW — press <b>E</b> to take a tow job';
    if (pressed['KeyE']) {
      t.target.copy(spawnTarget(world));
      t.wreck.position.set(t.target.x, 0, t.target.z);
      t.wreck.visible = true;
      t.state = 'toHook';
      t.hold = 0;
      world.towBlip = { x: t.target.x, z: t.target.z };
      sfxPickup();
      showMissionMsg('CITY TOW', 'Find the flagged car and hook it (hold beside it)', '#ffd24a');
    }
    return;
  }

  if (!inVehicle) { world.towHint = 'CITY TOW — get back in a vehicle to work the job'; return; }

  if (t.state === 'toHook') {
    const d = Math.hypot(focus.x - t.target.x, focus.z - t.target.z);
    if (d > HOOK_RADIUS) { t.hold = 0; world.towHint = 'CITY TOW — reach the <b>orange beam</b> and hook the car'; return; }
    t.hold += dt;
    world.towHint = `HOOKING... ${Math.max(0, HOOK_HOLD - t.hold).toFixed(1)}s`;
    if (t.hold >= HOOK_HOLD) {
      t.state = 'toDrop';
      t.hold = 0;
      const imp = world.impound?.officePos || world.city.spawn;
      world.towBlip = { x: imp.x, z: imp.z };
      sfxPickup();
      showMissionMsg('HOOKED', 'Haul it to the impound lot', '#7cf78c');
    }
    return;
  }

  // toDrop: the hooked wreck trails behind the player's vehicle, deliver to impound
  const car = player.inCar;
  const back = new THREE.Vector3(-Math.sin(car.heading || 0), 0, -Math.cos(car.heading || 0));
  t.wreck.position.set(car.pos.x + back.x * 5, 0, car.pos.z + back.z * 5);
  t.wreck.rotation.y = car.heading || 0;
  const imp = world.impound?.officePos || world.city.spawn;
  const d = Math.hypot(focus.x - imp.x, focus.z - imp.z);
  world.towHint = `CITY TOW — haul the car to the <b>impound lot</b> (${Math.round(d)}m)`;
  if (d < DROP_RADIUS) endJob(world, true);
}

export function towTruckSave(world) {
  return { towJobs: world.towTruck?.tows };
}
