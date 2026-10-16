import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// CAT RESCUE: a worried-owners notice board by spawn. Take a job and a cat is
// stranded on a rooftop somewhere nearby — swing, zip or fly up, scoop it off
// the roof, and bring it back down to the board before it panics and bolts.
// Built for the web-slinging: no car can do this one for you. Faster pays more.

const TIME = 120;          // seconds to get the cat home
const BASE_PAY = 600;
const SPEED_PAY = 8;       // $ per second left
const GRAB_R = 2.2;
const COOLDOWN = 20;

function makeCat() {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0xe08a3a, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.5), fur);
  body.position.y = 0.2;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.2), fur);
  head.position.set(0, 0.36, 0.28);
  g.add(head);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), fur);
    ear.position.set(side * 0.07, 0.5, 0.28);
    g.add(ear);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.36), fur);
  tail.position.set(0, 0.3, -0.38);
  tail.rotation.x = -0.6;
  g.add(tail);
  g.visible = false;
  return { group: g, tail };
}

export function initCatRescue(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(12, 0, -14));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 1.6)) pos = world.city.spawn.clone().add(new THREE.Vector3(16, 0, -10));
  placeStreetSite(world.city, pos, 2.2, 'cat-rescue');

  // a cork notice board on two posts, plastered with "LOST CAT" flyers
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9 });
  for (const dx of [-0.8, 0.8]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2, 0.12), wood);
    post.position.set(pos.x + dx, 1, pos.z);
    scene.add(post);
  }
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 1.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.95 })
  );
  board.position.set(pos.x, 1.6, pos.z);
  scene.add(board);
  const flyer = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.02), new THREE.MeshBasicMaterial({ color: 0xffd24a }));
  flyer.position.set(pos.x - 0.4, 1.65, pos.z + 0.06);
  scene.add(flyer);

  const cat = makeCat();
  scene.add(cat.group);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.3, 30, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.visible = false;
  scene.add(beam);

  world.catRescue = {
    pos, cat, beam,
    state: 'idle',       // idle -> find -> carry
    catPos: new THREE.Vector3(),
    t: 0, cooldown: 0, anim: 0,
    saved: save?.catsSaved ?? 0,
  };
}

// a rooftop a fair swing away, tall enough to need the webs
function pickRoof(world) {
  const C = world.catRescue;
  const roofs = world.city.colliders.filter((c) => {
    const top = c.roofY ?? ((c.h ?? 0) - 0.3);
    if (top < 12 || top > 70) return false;
    if (c.x1 - c.x0 < 5 || c.z1 - c.z0 < 5) return false;
    const d = Math.hypot((c.x0 + c.x1) / 2 - C.pos.x, (c.z0 + c.z1) / 2 - C.pos.z);
    return d > 50 && d < 160;
  });
  if (!roofs.length) return false;
  const c = roofs[(Math.random() * roofs.length) | 0];
  C.catPos.set((c.x0 + c.x1) / 2, (c.roofY ?? (c.h - 0.3)), (c.z0 + c.z1) / 2);
  return true;
}

function endJob(world, ok) {
  const C = world.catRescue;
  C.state = 'idle';
  C.cooldown = COOLDOWN;
  C.cat.group.visible = false;
  C.beam.visible = false;
  world.catBlip = null;
  world.catHint = null;
  if (!ok) {
    sfxMissionFail();
    showMissionMsg('IT BOLTED', 'The cat panicked and ran off — try another job', '#ff5a4a');
    return;
  }
  const pay = BASE_PAY + Math.round(C.t * SPEED_PAY);
  world.money += pay;
  C.saved++;
  addRep(world, 150);
  world.addXP?.(140);
  sfxMissionPass();
  showMissionMsg('REUNITED!', `One very relieved owner — +$${pay.toLocaleString()}`, '#ffd24a');
  if (C.saved % 5 === 0) showNews(`the city's rooftop cat rescuer has now saved ${C.saved} cats`);
  world.onSave?.();
}

export function updateCatRescue(world, dt, keys, pressed) {
  const C = world.catRescue;
  if (!C) return;
  world.catHint = null;
  if (C.cooldown > 0) C.cooldown = Math.max(0, C.cooldown - dt);
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const dBoard = Math.hypot(player.pos.x - C.pos.x, player.pos.z - C.pos.z);

  if (C.state === 'idle') {
    if (!onFoot || dBoard > 3.2) return;
    if (C.cooldown > 0) { world.catHint = 'LOST PETS BOARD — no new flyers yet, check back in a moment'; return; }
    world.catHint = `LOST PETS BOARD — press <b>E</b> to take a cat rescue${C.saved ? ` (${C.saved} saved)` : ''}`;
    if (pressed['KeyE']) {
      if (!pickRoof(world)) { showToast('No stranded cats right now'); C.cooldown = 5; return; }
      C.state = 'find';
      C.t = TIME;
      C.cat.group.position.copy(C.catPos);
      C.cat.group.visible = true;
      C.beam.position.set(C.catPos.x, C.catPos.y + 15, C.catPos.z);
      C.beam.visible = true;
      world.catBlip = { x: C.catPos.x, z: C.catPos.z };
      sfxPickup();
      showMissionMsg('CAT ON A ROOF', 'Get up to the orange beam and grab it', '#ffa040');
    }
    return;
  }

  C.t -= dt;
  C.anim += dt;
  if (C.t <= 0) { endJob(world, false); return; }
  const clock = Math.ceil(C.t);

  if (C.state === 'find') {
    C.cat.tail.rotation.y = Math.sin(C.anim * 6) * 0.5; // an annoyed swish
    const dx = player.pos.x - C.catPos.x, dz = player.pos.z - C.catPos.z;
    const near = Math.hypot(dx, dz) < GRAB_R && Math.abs(player.pos.y - C.catPos.y) < 2.5;
    world.catHint = `CAT RESCUE — reach the rooftop cat (${Math.round(Math.hypot(dx, dz))}m, ${Math.round(C.catPos.y)}m up) · <b>${clock}s</b>`;
    if (near) {
      C.state = 'carry';
      C.beam.visible = false;
      world.catBlip = { x: C.pos.x, z: C.pos.z };
      sfxPickup();
      showToast('Got it! Bring the cat back down to the notice board');
    }
    return;
  }

  // carry: the cat rides on your shoulder until you're back at the board
  const focus = player.inCar?.pos || player.inHeli?.pos || player.inBoat?.pos || player.pos;
  C.cat.group.position.set(focus.x, focus.y + 1.6, focus.z);
  C.cat.group.rotation.y = player.heading || 0;
  world.catHint = `CAT RESCUE — bring it home to the notice board (${Math.round(dBoard)}m) · <b>${clock}s</b>`;
  if (onFoot && dBoard < 3.5 && player.pos.y < 3) endJob(world, true);
}

export function catRescueSave(world) {
  return { catsSaved: world.catRescue?.saved };
}
