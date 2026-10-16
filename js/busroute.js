import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { storefront } from './propKit.js';
import { blockStart, N, pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxMissionPass, sfxPickup } from './sound.js';
import { addRep } from './economy.js';

// CITY LINE BUS: honest work on wheels. Start a shift at the depot, then run a
// fixed loop of stops in order. Pull up at each stop and hold a beat while the
// riders board, move to the next, and complete the loop for the fare. Any set
// of wheels counts — the schedule doesn't care what you drive.

const STOPS = 5;
const DWELL = 2.2;        // seconds to hold at a stop while riders board
const STOP_RADIUS = 6;
const FARE_PER_STOP = 120;
const LOOP_BONUS = 400;

function pickStops(world, origin) {
  // a loop of block-centre stops spread around the map, ordered by angle so the
  // route reads as a sensible circuit rather than crisscrossing the city
  const centres = [];
  for (let i = 0; i < 40 && centres.length < STOPS * 3; i++) {
    const bi = 1 + ((Math.random() * (N - 2)) | 0);
    const bj = 1 + ((Math.random() * (N - 2)) | 0);
    const x = blockStart(bi) + 30, z = blockStart(bj) + 30;
    if (pointBlocked(new THREE.Vector3(x, 1, z), world.city.colliders, 2)) continue;
    const d = Math.hypot(x - origin.x, z - origin.z);
    if (d < 40) continue;
    if (centres.some((c) => Math.hypot(c.x - x, c.z - z) < 50)) continue;
    centres.push({ x, z, ang: Math.atan2(z - origin.z, x - origin.x) });
  }
  centres.sort((a, b) => a.ang - b.ang);
  return centres.slice(0, STOPS).map((c) => new THREE.Vector3(c.x, 0, c.z));
}

export function initBusRoute(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(-20, 0, 26));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 2)) pos = world.city.spawn.clone().add(new THREE.Vector3(-26, 0, 20));
  placeStreetSite(world.city, pos, 2.8, 'bus-depot');

  storefront(scene, world.city, pos, { name: 'CITY LINE', w: 2.8, d: 2.2, wall: 0x3d6d96, accent: 0xe0b22c, sign: { fg: '#ffd24a', bg: '#10263a', accent: '#ffd24a' } });

  // one reusable stop ring + beacon that hops to the next stop
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(STOP_RADIUS, STOP_RADIUS, 0.1, 24),
    new THREE.MeshBasicMaterial({ color: 0x5ad2ff, transparent: true, opacity: 0.4, depthWrite: false })
  );
  ring.position.y = 0.06;
  ring.visible = false;
  scene.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.6, 40, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x5ad2ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.visible = false;
  scene.add(beam);

  world.busRoute = {
    pos, ring, beam,
    on: false, stops: [], idx: 0, dwell: 0,
    cooldown: 0,
    runs: save?.busRuns ?? 0,
  };
}

function moveRingTo(world, p) {
  const b = world.busRoute;
  b.ring.position.set(p.x, 0.06, p.z);
  b.ring.visible = true;
  b.beam.position.set(p.x, 20, p.z);
  b.beam.visible = true;
  world.busBlip = { x: p.x, z: p.z };
}

function endRoute(world, finished) {
  const b = world.busRoute;
  b.on = false;
  b.ring.visible = false;
  b.beam.visible = false;
  world.busBlip = null;
  world.busHint = null;
  b.cooldown = 4;
  if (finished) {
    b.runs++;
    const pay = LOOP_BONUS; // stop fares were already paid at each stop
    world.money += pay;
    addRep(world, 250);
    world.addXP?.(200);
    sfxMissionPass();
    showMissionMsg('ROUTE COMPLETE', `Full loop driven — +$${pay.toLocaleString()} bonus ($${(FARE_PER_STOP * STOPS + pay).toLocaleString()} total)`, '#ffd24a');
    showNews('the city line keeps the neighbourhood moving');
    world.onSave?.();
  }
}

export function updateBusRoute(world, dt, keys, pressed) {
  const b = world.busRoute;
  if (!b) return;
  world.busHint = null;
  b.ring.rotation.y += dt * 0.5;
  if (b.cooldown > 0) b.cooldown = Math.max(0, b.cooldown - dt);

  const player = world.player;
  const inVehicle = !!player.inCar;
  const focus = player.inCar ? player.inCar.pos : player.pos;

  if (!b.on) {
    const d = Math.hypot(focus.x - b.pos.x, focus.z - b.pos.z);
    if (d > 6 || b.cooldown > 0) return;
    if (!inVehicle) { world.busHint = 'CITY LINE DEPOT — bring a vehicle to start a route'; return; }
    world.busHint = 'CITY LINE — press <b>E</b> to start the bus route';
    world.carActionE = true;
    if (pressed['KeyE']) {
      b.stops = pickStops(world, b.pos);
      if (b.stops.length < STOPS) { showToast('No clear route right now — try again shortly'); b.cooldown = 3; return; }
      b.on = true;
      b.idx = 0;
      b.dwell = 0;
      moveRingTo(world, b.stops[0]);
      sfxPickup();
      showMissionMsg('CITY LINE', `Run the loop — ${STOPS} stops ahead`, '#ffd24a');
    }
    return;
  }

  // on a route: drive to the current stop, hold there while riders board
  if (!inVehicle) { world.busHint = 'CITY LINE — get back behind the wheel to keep the route'; return; }
  const target = b.stops[b.idx];
  const d = Math.hypot(focus.x - target.x, focus.z - target.z);
  if (d > STOP_RADIUS) {
    b.dwell = 0;
    world.busHint = `CITY LINE — drive to stop <b>${b.idx + 1}/${STOPS}</b>`;
    return;
  }
  // at the stop: hold still a moment for boarding
  const speed = player.inCar?.vel ? Math.hypot(player.inCar.vel.x, player.inCar.vel.z) : 0;
  if (speed > 4) { world.busHint = `STOP ${b.idx + 1}/${STOPS} — slow down and hold for riders`; return; }
  b.dwell += dt;
  world.busHint = `BOARDING AT STOP ${b.idx + 1}/${STOPS}... ${Math.max(0, DWELL - b.dwell).toFixed(1)}s`;
  if (b.dwell >= DWELL) {
    b.dwell = 0;
    world.money += FARE_PER_STOP;
    sfxPickup();
    b.idx++;
    if (b.idx >= b.stops.length) { endRoute(world, true); return; }
    moveRingTo(world, b.stops[b.idx]);
    showToast(`Fares collected — stop ${b.idx} of ${STOPS} done`);
  }
}

export function busRouteSave(world) {
  return { busRuns: world.busRoute?.runs };
}
