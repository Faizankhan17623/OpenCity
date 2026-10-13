import * as THREE from 'three';
import { showToast, showNews, showMissionMsg } from './hud.js';
import { sfxMissionPass, sfxMissionFail, sfxPickup } from './sound.js';
import { addExplosion, addFlash } from './effects.js';
import { addRep, addChaos } from './economy.js';

// BOMB SQUAD: every so often a device is planted somewhere in the city and a
// countdown starts. Reach the beacon and hold E long enough to cut the wires
// before the timer hits zero — a clean defuse pays out and earns rep. Let it
// run out and it detonates, rocking the block. Optional, ambient, repeatable.

const FUSE = 120;          // seconds on the clock when a bomb is planted
const DEFUSE_HOLD = 4;     // seconds of holding E at the device to defuse it
const COOLDOWN = 150;      // seconds between devices after one resolves
const REWARD = 2500;
const DEFUSE_RADIUS = 3;

function placePlantSite(world) {
  // somewhere on open ground a short way from the player
  const p = world.player.pos;
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 90;
    const x = p.x + Math.cos(a) * r;
    const z = p.z + Math.sin(a) * r;
    const probe = new THREE.Vector3(x, 1, z);
    const blocked = world.city.colliders.some((c) => x > c.x0 - 1 && x < c.x1 + 1 && z > c.z0 - 1 && z < c.z1 + 1);
    if (!blocked) return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(p.x + 50, 0, p.z);
}

export function initBombSquad(scene, world, save) {
  // the device: a crate with a blinking light, hidden until planted
  const group = new THREE.Group();
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x33281a, metalness: 0.2, roughness: 0.8 })
  );
  crate.position.y = 0.35;
  group.add(crate);
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff3020 })
  );
  light.position.set(0, 0.8, 0);
  group.add(light);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.4, 40, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff5030, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.y = 20;
  group.add(beam);
  group.visible = false;
  scene.add(group);

  world.bombSquad = {
    group, light, beam,
    state: 'idle',       // idle -> armed -> (defused | boom)
    pos: new THREE.Vector3(),
    fuse: 0, hold: 0,
    cooldown: 30 + Math.random() * 40, // first call-out comes a little way in
    blink: 0,
    defused: save.bombsDefused ?? 0,
  };
}

function arm(world) {
  const b = world.bombSquad;
  b.pos.copy(placePlantSite(world));
  b.group.position.copy(b.pos);
  b.group.visible = true;
  b.state = 'armed';
  b.fuse = FUSE;
  b.hold = 0;
  world.bombBlip = { x: b.pos.x, z: b.pos.z };
  sfxMissionFail();
  showMissionMsg('BOMB SQUAD', 'A device was just planted — get to the red beam and defuse it!', '#ff5a4a');
  showNews('police scanner: an explosive device has been reported downtown');
}

function detonate(world) {
  const b = world.bombSquad;
  b.group.visible = false;
  b.state = 'idle';
  b.cooldown = COOLDOWN;
  world.bombBlip = null;
  addExplosion(b.pos.clone().setY(1));
  addFlash(b.pos.clone().setY(2), 0xffaa40, 8);
  addChaos(world, 50);
  // caught in the blast
  const d = Math.hypot(world.player.pos.x - b.pos.x, world.player.pos.z - b.pos.z);
  if (d < 12) world.player.health -= (12 - d) * 7;
  sfxMissionFail();
  showMissionMsg('DETONATION', 'The bomb went off — the block takes the hit.', '#ff5a4a');
  showNews('explosion rocks the city after a failed defusal');
}

export function updateBombSquad(world, dt, keys, pressed) {
  const b = world.bombSquad;
  if (!b) return;
  world.bombHint = null;

  if (b.state === 'idle') {
    b.cooldown -= dt;
    if (b.cooldown <= 0) arm(world);
    return;
  }

  // armed: blink the light, run the fuse, let the player defuse
  b.blink += dt * 6;
  b.light.material.color.setHex((Math.sin(b.blink) > 0) ? 0xff3020 : 0x401008);
  b.beam.rotation.y += dt;
  b.fuse -= dt;

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat && player.pos.y < 2.5;
  const d = Math.hypot(player.pos.x - b.pos.x, player.pos.z - b.pos.z);
  const mm = Math.floor(b.fuse / 60);
  const ss = Math.floor(b.fuse % 60);
  const clock = `${mm}:${String(ss).padStart(2, '0')}`;

  if (onFoot && d <= DEFUSE_RADIUS) {
    if (keys['KeyE']) {
      b.hold += dt;
      world.bombHint = `CUTTING WIRES... ${Math.max(0, DEFUSE_HOLD - b.hold).toFixed(1)}s · fuse ${clock}`;
      if (b.hold >= DEFUSE_HOLD) {
        // defused
        b.group.visible = false;
        b.state = 'idle';
        b.cooldown = COOLDOWN;
        b.defused++;
        world.bombBlip = null;
        world.money += REWARD;
        addRep(world, 700);
        world.addXP?.(350);
        sfxMissionPass();
        showMissionMsg('BOMB DEFUSED!', `Wires cut with ${clock} to spare — +$${REWARD.toLocaleString()}`, '#7cf78c');
        showNews('bomb squad hero defuses device with seconds to spare');
        world.onSave?.();
        return;
      }
    } else {
      b.hold = Math.max(0, b.hold - dt * 2);
      world.bombHint = `BOMB — hold <b>E</b> to defuse (${DEFUSE_HOLD}s) · fuse <b>${clock}</b>`;
    }
  } else {
    b.hold = Math.max(0, b.hold - dt * 2);
    world.bombHint = `BOMB ARMED — reach the red beam! · fuse <b>${clock}</b>`;
  }

  if (b.fuse <= 0) detonate(world);
}

export function bombSquadSave(world) {
  return { bombsDefused: world.bombSquad?.defused };
}
