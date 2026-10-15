import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// BUNGEE CRANE: a tall jump crane by the water. Get up to the platform (webs,
// heli or jetpack — your problem) and touch the ring to leap. You free-fall,
// then the cord catches you and recoils; the closer you dare to drop before it
// snaps taut, the bigger the nerve bonus. A couple of bounces, then you are set
// gently down. One quick thrill, repeatable, pays on nerve.

const TOP_Y = 60;
const CORD_LEN = 46;      // how far you fall before the cord catches (keeps you off the ground)
const GROUND = 1;

export function initBungee(scene, world, save) {
  // stand it near the shoreline, off the road grid
  let base = world.city.spawn.clone().add(new THREE.Vector3(60, 0, 44));
  if (pointBlocked(new THREE.Vector3(base.x, 1, base.z), world.city.colliders, 3)) base = world.city.spawn.clone().add(new THREE.Vector3(66, 0, 38));
  placeStreetSite(world.city, base, 3, 'bungee');

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 1, TOP_Y, 8),
    new THREE.MeshStandardMaterial({ color: 0xd04a2a, roughness: 0.6, metalness: 0.3 })
  );
  mast.position.set(base.x, TOP_Y / 2, base.z);
  scene.add(mast);
  const jib = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.6, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xd04a2a, roughness: 0.6 })
  );
  jib.position.set(base.x + 4, TOP_Y - 1, base.z);
  scene.add(jib);

  const platform = new THREE.Vector3(base.x + 8, TOP_Y - 1, base.z);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.18, 8, 20),
    new THREE.MeshBasicMaterial({ color: 0x55e6ff })
  );
  ring.position.copy(platform);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 1, 6),
    new THREE.MeshBasicMaterial({ color: 0x33cc66 })
  );
  cord.visible = false;
  scene.add(cord);

  world.bungee = {
    base, platform, ring, cord,
    state: 'idle',       // idle -> fall -> recoil -> settle
    anchorY: TOP_Y - 1,
    y: 0, vy: 0, lowest: 0, bounces: 0,
    jumps: save?.bungeeJumps ?? 0,
  };
}

function updateCord(world) {
  const b = world.bungee;
  const px = world.player.pos.x, pz = world.player.pos.z;
  const topY = b.anchorY;
  const botY = world.player.pos.y;
  const mid = (topY + botY) / 2;
  b.cord.position.set(b.platform.x, mid, b.platform.z);
  b.cord.scale.y = Math.max(0.1, topY - botY);
  b.cord.visible = true;
}

export function updateBungee(world, dt, keys, pressed) {
  const b = world.bungee;
  if (!b) return;
  world.bungeeHint = null;
  b.ring.rotation.z += dt;
  const player = world.player;

  if (b.state === 'idle') {
    b.cord.visible = false;
    // must be up at the platform to jump
    const d = Math.hypot(player.pos.x - b.platform.x, player.pos.z - b.platform.z);
    const atTop = d < 3 && Math.abs(player.pos.y - b.platform.y) < 4;
    if (!atTop) return;
    world.bungeeHint = 'BUNGEE — press <b>E</b> to leap! (the cord will catch you)';
    if (pressed['KeyE']) {
      b.state = 'fall';
      b.anchorY = b.platform.y;
      b.vy = 0;
      b.lowest = player.pos.y;
      b.bounces = 0;
      b.rideT = 0;
      // snap the player to hang below the jib
      player.pos.x = b.platform.x;
      player.pos.z = b.platform.z;
      player.inCar = null; player.inHeli = null;
      player.glide = false;
      player.vy = 0; player.vel.x = 0; player.vel.z = 0;
      sfxPickup();
      showMissionMsg('BUNGEE!', 'Freeeee faaaall...', '#55e6ff');
    }
    return;
  }

  // physics: gravity pulls down; the cord is a spring once past CORD_LEN, with
  // strong damping so it reliably comes to rest hanging below the catch point.
  b.rideT = (b.rideT || 0) + dt;
  // the cord owns the player for the ride: cancel the on-foot step's gravity
  // and walking so it can't drag them into the ground or off the line
  player.vy = 0; player.vel.x = 0; player.vel.z = 0;
  player.pos.x = b.platform.x; player.pos.z = b.platform.z;
  const extend = b.anchorY - player.pos.y; // how far below the anchor
  b.vy -= 26 * dt;                          // gravity
  if (extend > CORD_LEN) {
    const stretch = extend - CORD_LEN;
    b.vy += stretch * 14 * dt;              // cord spring pulls back up
    b.vy *= 0.94;                           // damping (bleeds energy each frame)
  }
  player.pos.y += b.vy * dt;
  b.lowest = Math.min(b.lowest, player.pos.y);
  updateCord(world);
  world.bungeeHint = 'BUNGEE — enjoy the ride!';

  // count a bounce each time it turns from falling to rising while stretched
  if (b.state === 'fall' && b.vy > 0 && extend > CORD_LEN) { b.state = 'recoil'; b.bounces++; }
  if (b.state === 'recoil' && b.vy < 0) { b.state = 'fall'; }

  // never hit the ground — clamp a safe distance above it
  if (player.pos.y < GROUND + 3) { player.pos.y = GROUND + 3; if (b.vy < 0) b.vy = -b.vy * 0.4; }

  // settle once the ride has calmed down (low speed, hanging) or after a while
  const calmed = Math.abs(b.vy) < 1.5 && extend > CORD_LEN - 4 && b.bounces >= 1;
  if (calmed || b.rideT > 12) {
    // nerve = how close the lowest point came to the ground
    const clearance = Math.max(0, b.lowest - GROUND);
    const nerve = Math.max(0, 1 - clearance / 12);         // within ~12m of the ground = full nerve
    const pay = Math.round(300 + nerve * 1200);
    world.player.pos.y = GROUND + 0.2;
    world.player.vy = 0;
    b.cord.visible = false;
    b.state = 'idle';
    b.jumps++;
    world.money += pay;
    addRep(world, Math.round(100 + nerve * 200));
    world.addXP?.(120);
    sfxMissionPass();
    showMissionMsg('WHAT A RUSH!', `+$${pay}${nerve > 0.8 ? ' — ICE in your veins!' : ''}`, '#ffd24a');
    if (nerve > 0.8) showNews('a daredevil skims the ground on the bungee crane');
    world.onSave?.();
  }
}

export function bungeeSave(world) {
  return { bungeeJumps: world.bungee?.jumps };
}
