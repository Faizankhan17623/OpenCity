import * as THREE from 'three';
import { WATER_X0, WATER_Z } from './water.js';
import { pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass } from './sound.js';
import { addRep } from './economy.js';

// BEACH COMBING: borrow a metal detector from the shack by the seawall and
// sweep the sand. A HUD meter and a quickening beep tell you how close the
// nearest buried find is; stand on the hotspot and hold E to dig it up. Finds
// are cash of varying size, a few of them rare. Refreshes when you exhaust it.

const FINDS = 6;
const DIG_RADIUS = 2;
const DIG_HOLD = 1.5;
const DETECT_RANGE = 22;   // metres the meter reacts within

function beachSpot(world) {
  // the strip of sand between the outer ring road and the seawall; retry any
  // spot that lands in a collider, or it could never be dug
  for (let i = 0; i < 30; i++) {
    const x = WATER_X0 - 1.5 - Math.random() * 4;
    const z = (Math.random() * 2 - 1) * (WATER_Z - 20);
    if (!pointBlocked(new THREE.Vector3(x, 1, z), world.city.colliders, DIG_RADIUS)) return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(WATER_X0 - 3, 0, (Math.random() * 2 - 1) * 40);
}

export function initTreasure(scene, world, save) {
  // the sand runs between the outer ring road (ends 6m inland) and the seawall
  // (z = 16 keeps it clear of the crosstown street that meets the shore at z = 0)
  const shack = new THREE.Vector3(WATER_X0 - 3, 0, 16);
  if (pointBlocked(new THREE.Vector3(shack.x, 1, shack.z), world.city.colliders, 1)) shack.set(WATER_X0 - 3, 0, 24);

  const hut = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.2, 2),
    new THREE.MeshStandardMaterial({ color: 0x9a7b4a, roughness: 0.85 })
  );
  hut.position.copy(shack).setY(1.1);
  scene.add(hut);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.5, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffd24a })
  );
  sign.position.copy(shack).add(new THREE.Vector3(0, 2.5, 1.05));
  scene.add(sign);

  world.treasure = {
    shack, has: false,
    finds: [], dig: 0, beepT: 0,
    hud: null,
    found: save?.treasuresFound ?? 0,
  };
}

function seedFinds(world) {
  const t = world.treasure;
  t.finds = [];
  for (let i = 0; i < FINDS; i++) {
    const rare = Math.random() < 0.25;
    t.finds.push({ pos: beachSpot(world), value: rare ? 1200 + ((Math.random() * 800) | 0) : 150 + ((Math.random() * 350) | 0), rare, got: false });
  }
}

function ensureHud(world) {
  const t = world.treasure;
  if (t.hud) return t.hud;
  const el = document.createElement('div');
  el.id = 'detector';
  el.style.cssText = 'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);width:200px;height:14px;' +
    'background:#101820cc;border:1px solid #c8a24a;border-radius:7px;display:none;z-index:30;overflow:hidden';
  const fill = document.createElement('div');
  fill.style.cssText = 'height:100%;width:0;background:linear-gradient(90deg,#4a6,#ffd24a)';
  el.appendChild(fill);
  document.body.appendChild(el);
  t.hud = { el, fill };
  return t.hud;
}

export function updateTreasure(world, dt, keys, pressed) {
  const t = world.treasure;
  if (!t) return;
  world.treasureHint = null;
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const hud = ensureHud(world);

  // borrow / return the detector at the shack
  const dShack = Math.hypot(player.pos.x - t.shack.x, player.pos.z - t.shack.z);
  if (onFoot && dShack < 3.5 && !t.has) {
    world.treasureHint = 'BEACH SHACK — press <b>E</b> to grab the metal detector';
    if (pressed['KeyE']) { t.has = true; seedFinds(world); showMissionMsg('METAL DETECTOR', 'Sweep the sand — louder beep means you are close', '#ffd24a'); }
    hud.el.style.display = 'none';
    return;
  }

  if (!t.has) { hud.el.style.display = 'none'; return; }
  if (!onFoot) { hud.el.style.display = 'none'; world.treasureHint = 'Detecting pauses while you ride — get back on foot'; return; }

  // find the nearest unfound item
  let near = null, nd = Infinity;
  for (const f of t.finds) {
    if (f.got) continue;
    const d = Math.hypot(player.pos.x - f.pos.x, player.pos.z - f.pos.z);
    if (d < nd) { nd = d; near = f; }
  }
  if (!near) {
    // all dug up — stroll back to the shack to reset
    hud.el.style.display = 'none';
    world.treasureHint = 'BEACH — all finds recovered; return to the shack for a fresh sweep';
    if (dShack < 3.5) { t.has = false; showToast('Detector returned'); }
    return;
  }

  // meter + beep: closer = fuller bar and faster beep
  const prox = Math.max(0, 1 - nd / DETECT_RANGE);
  hud.el.style.display = 'block';
  hud.fill.style.width = Math.round(prox * 100) + '%';
  t.beepT -= dt;
  if (prox > 0.1 && t.beepT <= 0) { t.beepT = 0.6 - prox * 0.5; sfxPickup(); }

  if (nd <= DIG_RADIUS) {
    if (keys['KeyE']) {
      t.dig += dt;
      world.treasureHint = `DIGGING... ${Math.max(0, DIG_HOLD - t.dig).toFixed(1)}s`;
      if (t.dig >= DIG_HOLD) {
        t.dig = 0;
        near.got = true;
        world.money += near.value;
        addRep(world, near.rare ? 150 : 40);
        t.found++;
        sfxMissionPass();
        showMissionMsg(near.rare ? 'RARE FIND!' : 'DUG IT UP', `+$${near.value.toLocaleString()}`, near.rare ? '#ffd24a' : '#7cf78c');
        if (near.rare) showNews('a beachcomber turns up a glittering find in the sand');
        world.onSave?.();
      }
    } else {
      t.dig = Math.max(0, t.dig - dt * 2);
      world.treasureHint = 'STRONG SIGNAL — hold <b>E</b> to dig here';
    }
  } else {
    t.dig = Math.max(0, t.dig - dt * 2);
    world.treasureHint = `DETECTOR — ${Math.round(prox * 100)}% · follow the beep`;
  }
}

export function treasureSave(world) {
  return { treasuresFound: world.treasure?.found };
}
