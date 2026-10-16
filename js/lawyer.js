import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { storefront } from './propKit.js';
import { pointBlocked } from './city.js';
import { showToast, showMissionMsg } from './hud.js';
import { sfxMissionPass } from './sound.js';

// SAUL BETTERCALL, ATTORNEY: a storefront west of spawn. $1000 puts him
// on retainer — the next time the cuffs close at three-plus stars, he
// meets you at the precinct door and Harbor Island never happens
// (prison.js checks world.lawyerRetained). One bust per retainer.

const RETAINER = 1000;

export function initLawyer(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(-40, 0, -4));
  const probe = new THREE.Vector3(pos.x, 1, pos.z);
  if (pointBlocked(probe, world.city.colliders, 1.6)) pos = world.city.spawn.clone().add(new THREE.Vector3(-44, 0, 2));
  placeStreetSite(world.city, pos, 2.5, 'lawyer');

  storefront(scene, world.city, pos, { name: 'LAW OFFICE', w: 2.6, d: 2.2, wall: 0x5e5180, accent: 0xd0b04a, sign: { fg: '#f6e3a0', bg: '#221a33', accent: '#f0d24a' } });

  world.lawyer = { pos };
  world.lawyerRetained = !!save?.lawyer;
}

export function updateLawyer(world, dt, pressed) {
  const lw = world.lawyer;
  if (!lw) return;
  const player = world.player;
  world.lawyerHint = null;

  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const d = Math.hypot(player.pos.x - lw.pos.x, player.pos.z - lw.pos.z);
  if (d > 3.5 || !onFoot) return;

  if (world.lawyerRetained) {
    world.lawyerHint = 'SAUL BETTERCALL — already on retainer. "Relax. Go commit commerce."';
    return;
  }
  world.lawyerHint = `Press <b>E</b> — put SAUL BETTERCALL on retainer, $${RETAINER} (skips your next prison intake)`;
  if (!pressed['KeyE']) return;
  if (world.money < RETAINER) { showToast('"I like you. Not pro bono like you."'); return; }
  world.money -= RETAINER;
  world.lawyerRetained = true;
  sfxMissionPass();
  showMissionMsg('ON RETAINER', '"If they book you, say nothing. I\'ll hear about it before you do."', '#b08af0');
  world.onSave?.();
}
