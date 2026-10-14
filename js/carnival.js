import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// FAIRGROUND: a little carnival with two attractions. The STRONGMAN high-striker
// is a timing swing — catch the power sweep near the top to send the puck up the
// tower and ring the bell for a prize. The FERRIS WHEEL is a scenic spin that
// turns slowly in the background. Walk up to either to play/ride.

const STRIKER_COST = 30;

export function initCarnival(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(-40, 0, 36));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 3)) pos = world.city.spawn.clone().add(new THREE.Vector3(-46, 0, 30));
  placeStreetSite(world.city, pos, 3, 'carnival');

  // ferris wheel (decor + a ride): a rotating ring with gondolas
  const wheelPos = pos.clone().add(new THREE.Vector3(-10, 0, 0));
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(8, 0.3, 8, 28),
    new THREE.MeshStandardMaterial({ color: 0x4aa3d0, metalness: 0.3, roughness: 0.5 })
  );
  wheel.add(rim);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const g = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1, 1.2),
      new THREE.MeshStandardMaterial({ color: [0xe04a4a, 0xf0b040, 0x4ad060, 0x6a7aff][i % 4] })
    );
    g.position.set(Math.cos(a) * 8, Math.sin(a) * 8, 0);
    wheel.add(g);
  }
  wheel.position.set(wheelPos.x, 9, wheelPos.z);
  scene.add(wheel);

  // high-striker tower
  const strikerPos = pos.clone().add(new THREE.Vector3(8, 0, 0));
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 10, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xcc3344, roughness: 0.6 })
  );
  tower.position.set(strikerPos.x, 5, strikerPos.z);
  scene.add(tower);
  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd24a, metalness: 0.5 })
  );
  bell.position.set(strikerPos.x, 10.3, strikerPos.z);
  scene.add(bell);
  const puck = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.4, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x55e6ff })
  );
  puck.position.set(strikerPos.x, 0.6, strikerPos.z);
  scene.add(puck);

  world.carnival = {
    pos, wheel, strikerPos, puck, bell,
    striking: false, marker: 0, dir: 1,
    puckAnim: 0, puckPeak: 0, ringing: 0,
    rings: save?.strongmanRings ?? 0, rides: save?.ferrisRides ?? 0,
    hud: null,
  };
}

function ensureHud(world) {
  const c = world.carnival;
  if (c.hud) return c.hud;
  const el = document.createElement('div');
  el.id = 'striker';
  el.style.cssText = 'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);width:240px;height:18px;' +
    'background:#101820cc;border:1px solid #cc3344;border-radius:4px;display:none;z-index:30;overflow:hidden';
  const zone = document.createElement('div');
  zone.style.cssText = 'position:absolute;top:0;right:0;height:100%;width:18%;background:#2fd06a55';
  const needle = document.createElement('div');
  needle.style.cssText = 'position:absolute;top:0;width:3px;height:100%;background:#ffd24a';
  el.append(zone, needle);
  document.body.appendChild(el);
  c.hud = { el, needle };
  return c.hud;
}

export function updateCarnival(world, dt, keys, pressed) {
  const c = world.carnival;
  if (!c) return;
  world.carnivalHint = null;
  c.wheel.rotation.z += dt * 0.25; // the wheel always turns

  // animate a struck puck flying up and (maybe) ringing the bell
  if (c.puckAnim > 0) {
    c.puckAnim -= dt;
    const t = 1 - c.puckAnim / 0.8;
    c.puck.position.y = 0.6 + Math.sin(Math.min(1, t) * Math.PI) * c.puckPeak;
  } else {
    c.puck.position.y = 0.6;
  }
  if (c.ringing > 0) { c.ringing -= dt; c.bell.position.y = 10.3 + Math.sin(c.ringing * 40) * 0.1; }

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;

  // STRONGMAN game
  if (c.striking) {
    const hud = ensureHud(world);
    c.marker += c.dir * 1.4 * dt;
    if (c.marker >= 1) { c.marker = 1; c.dir = -1; }
    if (c.marker <= 0) { c.marker = 0; c.dir = 1; }
    hud.needle.style.left = (c.marker * 100) + '%';
    world.carnivalHint = 'STRONGMAN — tap <b>E</b> at the top of the swing!';
    if (pressed['KeyE']) {
      c.striking = false;
      hud.el.style.display = 'none';
      const power = c.marker;             // 0..1, want near 1
      c.puckPeak = power * 10;
      c.puckAnim = 0.8;
      if (power >= 0.82) {
        c.ringing = 0.6;
        c.rings++;
        const prize = 400;
        world.money += prize;
        addRep(world, 80);
        sfxMissionPass();
        showMissionMsg('DING! BELL RUNG', `Strongman prize — +$${prize}`, '#ffd24a');
        showNews('someone rings the bell at the fair');
        world.onSave?.();
      } else {
        sfxMissionFail();
        showToast(power >= 0.5 ? 'So close!' : 'Not enough muscle');
      }
    }
    if (Math.hypot(player.pos.x - c.strikerPos.x, player.pos.z - c.strikerPos.z) > 4 || !onFoot) { c.striking = false; hud.el.style.display = 'none'; }
    return;
  }

  if (!onFoot) return;
  const dStrike = Math.hypot(player.pos.x - c.strikerPos.x, player.pos.z - c.strikerPos.z);
  const dWheel = Math.hypot(player.pos.x - c.wheel.position.x, player.pos.z - c.wheel.position.z);

  if (dStrike < 3.2) {
    world.carnivalHint = `HIGH-STRIKER — press <b>E</b> to test your strength ($${STRIKER_COST})`;
    if (pressed['KeyE']) {
      if (world.money < STRIKER_COST) { showToast('Not enough cash'); return; }
      world.money -= STRIKER_COST;
      c.striking = true; c.marker = 0; c.dir = 1;
      ensureHud(world).el.style.display = 'block';
      showMissionMsg('STRONGMAN', 'Catch the swing at the top (green)', '#cc3344');
    }
    return;
  }
  if (dWheel < 9) {
    world.carnivalHint = 'FERRIS WHEEL — press <b>E</b> for a ride';
    if (pressed['KeyE']) {
      c.rides++;
      addRep(world, 20);
      sfxPickup();
      showMissionMsg('FERRIS WHEEL', 'Round and round, over the bay — lovely view', '#4aa3d0');
      world.onSave?.();
    }
  }
}

export function carnivalSave(world) {
  return { strongmanRings: world.carnival?.rings, ferrisRides: world.carnival?.rides };
}
