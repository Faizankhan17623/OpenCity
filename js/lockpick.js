import * as THREE from 'three';
import { blockStart, N, pointBlocked } from './city.js';
import { makeVehicle } from './car.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';
import { addCrime } from './police.js';

// GRAND THEFT: a few high-end cars sit locked around town. Walk up to one and
// a lockpick sweep runs — tap E when the marker is in the green to pop the
// lock. Nail it and the car is yours to drive (and a little reward for the
// steal, plus some heat). Fancier cars have a tighter sweet spot. Miss and the
// pick jams for a beat. Separate from just hopping into an unlocked ride.

const CARS = [
  { color: '#1a1a22', top: 62, accel: 30, reward: 800, sweet: 0.26, name: 'blacked-out coupe' },
  { color: '#8a1c2a', top: 66, accel: 32, reward: 1100, sweet: 0.2, name: 'crimson roadster' },
  { color: '#c8b020', top: 70, accel: 34, reward: 1500, sweet: 0.15, name: 'gold supercar' },
];
const PICK_SPEED = 1.1;   // marker sweeps 0..1 at this rate

function spawnSpot(world, i) {
  for (let a = 0; a < 40; a++) {
    const bi = 1 + ((Math.random() * (N - 2)) | 0);
    const bj = 1 + ((Math.random() * (N - 2)) | 0);
    const x = blockStart(bi) + 10 + Math.random() * 40;
    const z = blockStart(bj) + 10 + Math.random() * 40;
    if (pointBlocked(new THREE.Vector3(x, 1, z), world.city.colliders, 1.8)) continue;
    if (Math.hypot(x - world.city.spawn.x, z - world.city.spawn.z) < 30) continue;
    return { x, z };
  }
  return { x: world.city.spawn.x + 40 + i * 12, z: world.city.spawn.z + 40 };
}

export function initLockpick(scene, world, save) {
  const cars = CARS.map((def, i) => {
    const spot = spawnSpot(world, i);
    const veh = makeVehicle(scene, spot.x, spot.z, Math.random() * Math.PI, def.color, { top: def.top, accel: def.accel });
    veh.locked = true; // kept out of world.parked until picked
    return { def, veh, pos: veh.pos, picked: false };
  });
  world.lockpick = {
    cars,
    active: null,   // the car being picked
    marker: 0, dir: 1, jam: 0,
    hud: null,
    stolen: save?.carsStolen ?? 0,
  };
}

function ensureHud(world) {
  const lp = world.lockpick;
  if (lp.hud) return lp.hud;
  const el = document.createElement('div');
  el.id = 'lockpick';
  el.style.cssText = 'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);width:260px;height:20px;' +
    'background:#101820cc;border:1px solid #79cebb;border-radius:4px;display:none;z-index:30;overflow:hidden';
  const zone = document.createElement('div');
  zone.style.cssText = 'position:absolute;top:0;height:100%;background:#2fd06a66';
  const needle = document.createElement('div');
  needle.style.cssText = 'position:absolute;top:0;width:3px;height:100%;background:#ffd24a';
  el.append(zone, needle);
  document.body.appendChild(el);
  lp.hud = { el, zone, needle };
  return lp.hud;
}

export function updateLockpick(world, dt, keys, pressed) {
  const lp = world.lockpick;
  if (!lp) return;
  world.lockpickHint = null;
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const hud = ensureHud(world);

  if (lp.active) {
    // the picking mini-game
    const def = lp.active.def;
    if (lp.jam > 0) { lp.jam -= dt; world.lockpickHint = 'LOCK JAMMED — wait a beat'; }
    else {
      lp.marker += lp.dir * PICK_SPEED * dt;
      if (lp.marker >= 1) { lp.marker = 1; lp.dir = -1; }
      if (lp.marker <= 0) { lp.marker = 0; lp.dir = 1; }
    }
    // sweet spot centred at 0.5
    const lo = 0.5 - def.sweet / 2, hi = 0.5 + def.sweet / 2;
    hud.el.style.display = 'block';
    hud.zone.style.left = (lo * 100) + '%';
    hud.zone.style.width = (def.sweet * 100) + '%';
    hud.needle.style.left = (lp.marker * 100) + '%';
    world.lockpickHint = `PICKING THE ${def.name.toUpperCase()} — tap <b>E</b> in the green`;

    // walking away cancels
    if (Math.hypot(player.pos.x - lp.active.pos.x, player.pos.z - lp.active.pos.z) > 4 || !onFoot) {
      hud.el.style.display = 'none'; lp.active = null; return;
    }
    if (pressed['KeyE'] && lp.jam <= 0) {
      if (lp.marker >= lo && lp.marker <= hi) {
        // popped
        const car = lp.active;
        car.picked = true;
        car.veh.locked = false;
        world.parked.push(car.veh); // now a normal drivable parked car
        world.money += def.reward;
        addRep(world, 250);
        addCrime(world, 2);
        world.lockpick.stolen++;
        sfxPickup();
        hud.el.style.display = 'none';
        lp.active = null;
        showMissionMsg('LOCK POPPED', `${def.name} is yours — +$${def.reward} (get in with E)`, '#7cf78c');
        showNews('another high-end motor vanishes from the curb');
        world.onSave?.();
      } else {
        lp.jam = 0.8;
        sfxMissionFail();
        showToast('Slipped — the pick jams');
      }
    }
    return;
  }

  // not picking: look for a nearby locked car to start on
  hud.el.style.display = 'none';
  if (!onFoot) return;
  for (const car of lp.cars) {
    if (car.picked) continue;
    const d = Math.hypot(player.pos.x - car.pos.x, player.pos.z - car.pos.z);
    if (d > 3.2) continue;
    world.lockpickHint = `LOCKED ${car.def.name.toUpperCase()} — press <b>E</b> to pick the lock`;
    if (pressed['KeyE']) { lp.active = car; lp.marker = 0; lp.dir = 1; lp.jam = 0; }
    return;
  }
}

export function lockpickSave(world) {
  return { carsStolen: world.lockpick?.stolen };
}
