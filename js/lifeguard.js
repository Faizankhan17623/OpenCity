import * as THREE from 'three';
import { WATER_X0, WATER_Z, WATER_Y, inWater } from './water.js';
import { pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// LIFEGUARD RESCUE: clock on at the tower by the seawall and keep the harbor
// safe. A swimmer gets into trouble out in the water; reach them before they
// go under (swim out, or grab a boat), then tow them back to the shore beacon.
// Three saves make a shift. Each rescue pays more the faster you were, and a
// clean shift earns a bonus. One slip and the shift is over.

const RESCUES = 3;
const TIME = 70;           // seconds to reach a swimmer and bring them in
const REACH_R = 4;         // grab distance
const SHORE_R = 10;        // drop distance from the shore beacon (boats can't beach)
const PER_RESCUE = 500;
const SPEED_PAY = 10;      // $ per second left on the clock
const SHIFT_BONUS = 800;

function beamMesh(color) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.6, 40, 10, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
  );
  m.visible = false;
  return m;
}

function makeSwimmer() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc89070, roughness: 0.7 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skin);
  head.position.y = 0.25;
  g.add(head);
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), skin);
    arm.position.set(side * 0.3, 0.45, 0);
    g.add(arm);
    arms.push(arm);
  }
  const buoy = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.12, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xff5030, roughness: 0.6 })
  );
  buoy.rotation.x = Math.PI / 2;
  buoy.visible = false; // thrown to them once you reach them
  g.add(buoy);
  g.visible = false;
  return { group: g, arms, buoy };
}

export function initLifeguard(scene, world, save) {
  // on the strip of sand between the outer ring road (it ends 6m short of the
  // shoreline) and the seawall, so traffic never drives through the tower
  let tower = new THREE.Vector3(WATER_X0 - 3, 0, -30);
  if (pointBlocked(new THREE.Vector3(tower.x, 1, tower.z), world.city.colliders, 1)) tower = new THREE.Vector3(WATER_X0 - 3, 0, -50);

  // the tower: four legs, a deck and a red roof you can spot from the water
  const wood = new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.85 });
  for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 0.15), wood);
    leg.position.set(tower.x + dx, 1.2, tower.z + dz);
    scene.add(leg);
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 2), wood);
  deck.position.set(tower.x, 2.4, tower.z);
  scene.add(deck);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 0.8, 4),
    new THREE.MeshStandardMaterial({ color: 0xd03a2a, roughness: 0.6 })
  );
  roof.position.set(tower.x, 3.8, tower.z);
  roof.rotation.y = Math.PI / 4;
  scene.add(roof);

  // the shore beacon you tow swimmers back to, just at the waterline
  const shore = new THREE.Vector3(WATER_X0 - 1, 0, tower.z + 6);
  const shoreBeam = beamMesh(0x7cf78c);
  shoreBeam.position.set(shore.x, 20, shore.z);
  scene.add(shoreBeam);
  const swimBeam = beamMesh(0xff5030);
  scene.add(swimBeam);

  const swimmer = makeSwimmer();
  scene.add(swimmer.group);

  world.lifeguard = {
    tower, shore, shoreBeam, swimBeam, swimmer,
    state: 'idle',       // idle -> reach -> tow (x RESCUES)
    pos: new THREE.Vector3(),
    t: 0, done: 0, earned: 0, anim: 0,
    rescues: save?.lifeguardRescues ?? 0,
  };
}

function placeSwimmer(world) {
  const L = world.lifeguard;
  for (let i = 0; i < 30; i++) {
    const x = WATER_X0 + 25 + Math.random() * 80;
    const z = Math.max(-(WATER_Z - 20), Math.min(WATER_Z - 20, L.tower.z + (Math.random() * 2 - 1) * 90));
    if (inWater(x, z)) { L.pos.set(x, 0, z); return; }
  }
  L.pos.set(WATER_X0 + 40, 0, L.tower.z);
}

function nextSwimmer(world) {
  const L = world.lifeguard;
  placeSwimmer(world);
  L.state = 'reach';
  L.t = TIME;
  L.swimmer.group.position.set(L.pos.x, WATER_Y, L.pos.z);
  L.swimmer.group.visible = true;
  L.swimmer.buoy.visible = false;
  L.swimBeam.position.set(L.pos.x, 20, L.pos.z);
  L.swimBeam.visible = true;
  L.shoreBeam.visible = false;
  world.lifeguardBlip = { x: L.pos.x, z: L.pos.z };
  showMissionMsg('SWIMMER IN TROUBLE', `Reach the red beam — ${TIME}s before they go under`, '#ff5030');
}

function endShift(world, failed) {
  const L = world.lifeguard;
  L.state = 'idle';
  L.swimmer.group.visible = false;
  L.swimBeam.visible = false;
  L.shoreBeam.visible = false;
  world.lifeguardBlip = null;
  world.lifeguardHint = null;
  if (failed) {
    sfxMissionFail();
    showMissionMsg('TOO LATE', `The swimmer went under — shift over${L.earned ? ` (kept $${L.earned.toLocaleString()})` : ''}`, '#ff5a4a');
    world.onSave?.();
    return;
  }
  world.money += SHIFT_BONUS;
  addRep(world, 400);
  world.addXP?.(300);
  sfxMissionPass();
  showMissionMsg('SHIFT COMPLETE', `${RESCUES} lives saved — +$${SHIFT_BONUS} bonus ($${(L.earned + SHIFT_BONUS).toLocaleString()} total)`, '#ffd24a');
  showNews('the harbor lifeguard pulls three swimmers from the water in one shift');
  world.onSave?.();
}

export function updateLifeguard(world, dt, keys, pressed) {
  const L = world.lifeguard;
  if (!L) return;
  world.lifeguardHint = null;
  const player = world.player;
  const focus = player.inBoat ? player.inBoat.pos : player.pos;

  if (L.state === 'idle') {
    const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
    if (!onFoot || Math.hypot(player.pos.x - L.tower.x, player.pos.z - L.tower.z) > 3.5) return;
    world.lifeguardHint = `LIFEGUARD TOWER — press <b>E</b> to start a rescue shift${L.rescues ? ` (${L.rescues} saved)` : ''}`;
    if (pressed['KeyE']) {
      L.done = 0; L.earned = 0;
      sfxPickup();
      nextSwimmer(world);
    }
    return;
  }

  L.t -= dt;
  L.anim += dt;
  if (L.t <= 0) { endShift(world, true); return; }
  const clock = Math.ceil(L.t);
  const sw = L.swimmer;

  if (L.state === 'reach') {
    // flailing: bob in place and wave both arms
    sw.group.position.y = WATER_Y + Math.sin(L.anim * 5) * 0.12;
    sw.arms[0].rotation.z = Math.sin(L.anim * 9) * 1.2;
    sw.arms[1].rotation.z = -Math.sin(L.anim * 9 + 1) * 1.2;
    const d = Math.hypot(focus.x - L.pos.x, focus.z - L.pos.z);
    world.lifeguardHint = `RESCUE ${L.done + 1}/${RESCUES} — reach the swimmer (${Math.round(d)}m) · <b>${clock}s</b>`;
    if (d < REACH_R) {
      L.state = 'tow';
      sw.buoy.visible = true;
      sw.arms[0].rotation.z = sw.arms[1].rotation.z = 0;
      L.swimBeam.visible = false;
      L.shoreBeam.visible = true;
      world.lifeguardBlip = { x: L.shore.x, z: L.shore.z };
      sfxPickup();
      showToast('Got them! Tow them back to the green beam on the shore');
    }
    return;
  }

  // tow: the swimmer trails behind on the buoy until you reach the shore beacon
  const back = new THREE.Vector3(L.pos.x - focus.x, 0, L.pos.z - focus.z);
  const len = back.length() || 1;
  const trail = player.inBoat ? 3.5 : 1.6;
  L.pos.set(focus.x + (back.x / len) * trail, 0, focus.z + (back.z / len) * trail);
  sw.group.position.set(L.pos.x, WATER_Y + Math.sin(L.anim * 3) * 0.05, L.pos.z);
  const d = Math.hypot(focus.x - L.shore.x, focus.z - L.shore.z);
  world.lifeguardHint = `RESCUE ${L.done + 1}/${RESCUES} — tow them to the <b>green beam</b> (${Math.round(d)}m) · <b>${clock}s</b>`;
  if (d < SHORE_R) {
    const pay = PER_RESCUE + Math.round(L.t * SPEED_PAY);
    world.money += pay;
    L.earned += pay;
    L.done++;
    L.rescues++;
    addRep(world, 120);
    sfxMissionPass();
    if (L.done >= RESCUES) { endShift(world, false); return; }
    showToast(`Safe on the sand — +$${pay.toLocaleString()}`);
    nextSwimmer(world); // the next call's banner follows straight on
  }
}

export function lifeguardSave(world) {
  return { lifeguardRescues: world.lifeguard?.rescues };
}
