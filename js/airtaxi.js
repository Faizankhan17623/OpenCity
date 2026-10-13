import * as THREE from 'three';
import { blockStart, N } from './city.js';
import { showToast, showNews, showMissionMsg } from './hud.js';
import { sfxMissionPass, sfxPickup } from './sound.js';
import { addRep } from './economy.js';

// AIR TAXI: fly a helicopter for fares. A passenger waits on a glowing cyan
// pad somewhere in the city; set down beside them to pick them up, then fly to
// the marked drop pad and land to drop them off. Paid by the distance flown
// plus a speed bonus for a quick, smooth run. You must be in a chopper — this
// is the sky cab, separate from the ground taxi gig.

const RATE = 6;           // $ per metre flown
const BASE = 300;
const SPEED_WINDOW = 1.1; // deliver under dist/this (seconds) for the full bonus
const SPEED_BONUS = 1200;
const LAND_Y = 3.2;       // "landed" if the chopper is below this above ground
const PAD_R = 7;

function padMesh(color) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(PAD_R, PAD_R, 0.12, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false })
  );
  disc.position.y = 0.06;
  g.add(disc);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 2, 46, 10, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.y = 23;
  g.add(beam);
  g.visible = false;
  return g;
}

function openSpot(world, focus, minR, maxR) {
  for (let i = 0; i < 16; i++) {
    const bi = (Math.random() * N) | 0, bj = (Math.random() * N) | 0;
    const x = blockStart(bi) + 30, z = blockStart(bj) + 30; // block centres sit between buildings
    const d = Math.hypot(x - focus.x, z - focus.z);
    if (d >= minR && d <= maxR) return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(focus.x + maxR, 0, focus.z);
}

export function initAirTaxi(scene, world, save) {
  const pickPad = padMesh(0x3dd2ff);
  const dropPad = padMesh(0x7cf78c);
  scene.add(pickPad);
  scene.add(dropPad);
  world.airTaxi = {
    pickPad, dropPad,
    state: 'idle',       // idle -> toPickup -> toDrop
    pickup: new THREE.Vector3(), drop: new THREE.Vector3(),
    cooldown: 10,
    runTime: 0, runDist: 0,
    fares: save.airFares ?? 0,
  };
}

function offer(world) {
  const t = world.airTaxi;
  const focus = world.player.inHeli?.pos || world.player.pos;
  t.pickup.copy(openSpot(world, focus, 30, 120));
  t.pickPad.position.set(t.pickup.x, 0, t.pickup.z);
  t.pickPad.visible = true;
  t.dropPad.visible = false;
  t.state = 'toPickup';
  world.airPickBlip = { x: t.pickup.x, z: t.pickup.z };
  world.airDropBlip = null;
  showToast('AIR TAXI — a fare is waiting at the cyan pad');
}

function landedAt(world, pos) {
  const h = world.player.inHeli;
  if (!h) return false;
  const horiz = Math.hypot(h.pos.x - pos.x, h.pos.z - pos.z);
  return horiz <= PAD_R && (h.pos.y - 0) < LAND_Y;
}

export function updateAirTaxi(world, dt, keys, pressed) {
  const t = world.airTaxi;
  if (!t) return;
  world.airHint = null;
  t.pickPad.rotation.y += dt * 0.5;
  t.dropPad.rotation.y += dt * 0.5;

  if (t.state === 'idle') {
    // only tout for fares once the player actually has a chopper
    if (!world.player.inHeli) return;
    t.cooldown -= dt;
    if (t.cooldown <= 0) offer(world);
    return;
  }

  // must be flying to work a sky fare
  if (!world.player.inHeli) {
    world.airHint = 'AIR TAXI — get back in a helicopter to work the fare';
    return;
  }

  if (t.state === 'toPickup') {
    world.airHint = 'AIR TAXI — land on the <b>cyan pad</b> to collect your fare';
    if (landedAt(world, t.pickup)) {
      // pick up: pick a drop a good distance off
      t.drop.copy(openSpot(world, t.pickup, 60, 180));
      t.dropPad.position.set(t.drop.x, 0, t.drop.z);
      t.dropPad.visible = true;
      t.pickPad.visible = false;
      t.state = 'toDrop';
      t.runTime = 0;
      t.runDist = Math.hypot(t.drop.x - t.pickup.x, t.drop.z - t.pickup.z);
      world.airPickBlip = null;
      world.airDropBlip = { x: t.drop.x, z: t.drop.z };
      sfxPickup();
      showMissionMsg('FARE ABOARD', 'Fly them to the green pad — faster pays more', '#7cf78c');
    }
    return;
  }

  // toDrop
  t.runTime += dt;
  world.airHint = 'AIR TAXI — land on the <b>green pad</b> to drop off';
  if (landedAt(world, t.drop)) {
    const dist = t.runDist;
    const fare = Math.round(BASE + dist * RATE);
    const quick = t.runTime <= dist / 18 * SPEED_WINDOW; // ~18 m/s baseline cruise
    const bonus = quick ? SPEED_BONUS : 0;
    const pay = fare + bonus;
    world.money += pay;
    addRep(world, 300);
    world.addXP?.(180);
    t.fares++;
    t.dropPad.visible = false;
    t.state = 'idle';
    t.cooldown = 14 + Math.random() * 10;
    world.airDropBlip = null;
    sfxMissionPass();
    showMissionMsg('FARE DELIVERED', `+$${pay.toLocaleString()}${bonus ? ' (speed bonus!)' : ''}`, '#ffd24a');
    showNews('sky cab makes another quick run across the bay');
    world.onSave?.();
  }
}

export function airTaxiSave(world) {
  return { airFares: world.airTaxi?.fares };
}
