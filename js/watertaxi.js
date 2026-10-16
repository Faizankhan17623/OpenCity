import * as THREE from 'three';
import { WATER_X0, WATER_Z } from './water.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass } from './sound.js';
import { addRep } from './economy.js';

// WATER TAXI: once you're at the helm of a boat, fares start waving from the
// seawall. Pull in beside the cyan beam and ease off the throttle to let them
// hop aboard, then run them along the coast to the green beam and stop again
// to drop them. Paid by the distance plus a bonus for a quick crossing. Works
// from any boat; it's the harbor's answer to the street taxi and the sky cab.

const BASE = 250;
const RATE = 3;            // $ per metre along the coast
const SPEED_BONUS = 600;
const CRUISE = 20;         // m/s a brisk skipper averages
const DOCK_R = 7;
const DOCK_SPEED = 4;      // must be nearly stopped to board or land
const SHORE_X = WATER_X0 + 4; // just off the seawall, where a hull can reach
const SPAN = WATER_Z - 25;

function beamMesh(color) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 2, 40, 10, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
  );
  m.visible = false;
  return m;
}

function makeFare() {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: 0x3a5a8a, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.3), coat);
  body.position.y = 0.75;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc89070, roughness: 0.7 }));
  head.position.y = 1.5;
  g.add(head);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), coat);
  arm.position.set(0.32, 1.45, 0);
  g.add(arm);
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.2), new THREE.MeshStandardMaterial({ color: 0x8a5a2a, roughness: 0.8 }));
  bag.position.set(-0.4, 0.35, 0);
  g.add(bag);
  g.visible = false;
  return { group: g, arm };
}

export function initWaterTaxi(scene, world, save) {
  const pickBeam = beamMesh(0x3dd2ff);
  const dropBeam = beamMesh(0x7cf78c);
  scene.add(pickBeam, dropBeam);
  const fare = makeFare();
  scene.add(fare.group);
  world.waterTaxi = {
    pickBeam, dropBeam, fare,
    state: 'idle',       // idle -> toPickup -> toDrop
    pickup: new THREE.Vector3(), drop: new THREE.Vector3(),
    cooldown: 8, t: 0, dist: 0, anim: 0,
    fares: save?.waterFares ?? 0,
  };
}

function offer(world) {
  const W = world.waterTaxi;
  const z = (Math.random() * 2 - 1) * SPAN;
  W.pickup.set(SHORE_X, 0, z);
  // a destination well along the coast, either way
  let dz = 150 + Math.random() * 250;
  if (Math.abs(z + dz) > SPAN || (Math.abs(z - dz) <= SPAN && Math.random() < 0.5)) dz = -dz;
  W.drop.set(SHORE_X, 0, Math.max(-SPAN, Math.min(SPAN, z + dz)));
  W.fare.group.position.set(WATER_X0 - 1.5, 0, z);
  W.fare.group.rotation.y = -Math.PI / 2; // facing the water
  W.fare.group.visible = true;
  W.pickBeam.position.set(W.pickup.x, 20, W.pickup.z);
  W.pickBeam.visible = true;
  W.dropBeam.visible = false;
  W.state = 'toPickup';
  world.waterPickBlip = { x: W.pickup.x, z: W.pickup.z };
  world.waterDropBlip = null;
  showToast('WATER TAXI — someone is waving from the seawall (cyan beam)');
}

function stoppedAt(boat, p) {
  return Math.hypot(boat.pos.x - p.x, boat.pos.z - p.z) < DOCK_R && Math.hypot(boat.vel.x, boat.vel.z) < DOCK_SPEED;
}

export function updateWaterTaxi(world, dt) {
  const W = world.waterTaxi;
  if (!W) return;
  world.waterTaxiHint = null;
  W.anim += dt;
  W.pickBeam.rotation.y += dt * 0.5;
  W.dropBeam.rotation.y += dt * 0.5;
  const boat = world.player.inBoat;

  if (W.state === 'idle') {
    if (!boat) return;
    W.cooldown -= dt;
    if (W.cooldown <= 0) offer(world);
    return;
  }

  if (W.state === 'toPickup') W.fare.arm.rotation.z = Math.sin(W.anim * 8) * 0.6; // waving you in
  if (!boat) { world.waterTaxiHint = 'WATER TAXI — get back on a boat to keep the fare'; return; }
  const speed = Math.hypot(boat.vel.x, boat.vel.z);

  if (W.state === 'toPickup') {
    const d = Math.hypot(boat.pos.x - W.pickup.x, boat.pos.z - W.pickup.z);
    world.waterTaxiHint = d < DOCK_R && speed >= DOCK_SPEED
      ? 'WATER TAXI — ease off so they can step aboard'
      : `WATER TAXI — pull in at the <b>cyan beam</b> (${Math.round(d)}m)`;
    if (stoppedAt(boat, W.pickup)) {
      W.state = 'toDrop';
      W.t = 0;
      W.dist = Math.abs(W.drop.z - W.pickup.z);
      W.fare.group.visible = false;
      W.pickBeam.visible = false;
      W.dropBeam.position.set(W.drop.x, 20, W.drop.z);
      W.dropBeam.visible = true;
      world.waterPickBlip = null;
      world.waterDropBlip = { x: W.drop.x, z: W.drop.z };
      sfxPickup();
      showMissionMsg('FARE ABOARD', 'Run them along the coast to the green beam — quick pays more', '#7cf78c');
    }
    return;
  }

  // toDrop
  W.t += dt;
  const d = Math.hypot(boat.pos.x - W.drop.x, boat.pos.z - W.drop.z);
  world.waterTaxiHint = d < DOCK_R && speed >= DOCK_SPEED
    ? 'WATER TAXI — slow down to let them off'
    : `WATER TAXI — drop off at the <b>green beam</b> (${Math.round(d)}m)`;
  if (stoppedAt(boat, W.drop)) {
    const quick = W.t <= W.dist / CRUISE;
    const pay = BASE + Math.round(W.dist * RATE) + (quick ? SPEED_BONUS : 0);
    world.money += pay;
    W.fares++;
    addRep(world, 180);
    world.addXP?.(120);
    W.state = 'idle';
    W.cooldown = 10 + Math.random() * 10;
    W.dropBeam.visible = false;
    world.waterDropBlip = null;
    sfxMissionPass();
    showMissionMsg('FARE DELIVERED', `+$${pay.toLocaleString()}${quick ? ' (quick crossing bonus!)' : ''}`, '#ffd24a');
    if (W.fares % 10 === 0) showNews(`the harbor water taxi has now ferried ${W.fares} passengers`);
    world.onSave?.();
  }
}

export function waterTaxiSave(world) {
  return { waterFares: world.waterTaxi?.fares };
}
