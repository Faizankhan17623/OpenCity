import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { showToast, showNews } from './hud.js';
import { sfxMissionPass } from './sound.js';

// TATTOO PARLOR: ink that shows on your character. Pick a sleeve design and it
// wraps both forearms, persisting with your look (like the barber's haircut,
// but on the skin). Purely cosmetic — the wanted posters still don't notice.

const COST = 400;
const DESIGNS = [
  { key: 'tribal', name: 'TRIBAL BLACK', hex: 0x101014 },
  { key: 'crimson', name: 'CRIMSON KOI', hex: 0x8a1c1c },
  { key: 'jade', name: 'JADE DRAGON', hex: 0x1f7a52 },
  { key: 'ocean', name: 'OCEAN SLEEVE', hex: 0x1f4e8a },
  { key: 'gold', name: 'GOLD FILIGREE', hex: 0xb8902a },
];

// Attach a thin sleeve over each forearm. The forearm skin capsule is child[0]
// of the elbow group; the band sits just proud of it so it reads as ink.
function sleeveFor(elbow) {
  let band = elbow.userData.tattooBand;
  if (!band) {
    band = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.066, 0.1, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.6, metalness: 0.05 })
    );
    band.position.set(0, -0.14, 0);
    band.visible = false;
    elbow.add(band);
    elbow.userData.tattooBand = band;
  }
  return band;
}

function applyTattoo(ch, hex) {
  for (const pivot of [ch.lArm, ch.rArm]) {
    const elbow = pivot.children.find((c) => c.isGroup);
    if (!elbow) continue;
    const band = sleeveFor(elbow);
    if (hex == null) { band.visible = false; continue; }
    band.material.color.setHex(hex);
    band.visible = true;
  }
}

export function initTattoo(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(26, 0, 8));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 1.4)) pos = world.city.spawn.clone().add(new THREE.Vector3(28, 0, 4));
  placeStreetSite(world.city, pos, 2.5, 'tattoo');

  const booth = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 2.4, 2),
    new THREE.MeshStandardMaterial({ color: 0x1a1520, roughness: 0.7 })
  );
  booth.position.copy(pos).setY(1.2);
  scene.add(booth);
  const neon = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.08, 8, 20),
    new THREE.MeshBasicMaterial({ color: 0xff4080 })
  );
  neon.position.copy(pos).add(new THREE.Vector3(0, 2.7, 1.05));
  scene.add(neon);

  const saved = save?.tattoo ?? null;
  world.tattoo = { pos, neon, open: false, design: saved };
  if (saved) {
    const d = DESIGNS.find((x) => x.key === saved);
    if (d) applyTattoo(world.player.ch, d.hex);
  }
}

export function updateTattoo(world, dt, pressed) {
  const t = world.tattoo;
  if (!t) return;
  const player = world.player;
  world.tattooHint = null;
  t.neon.rotation.z += dt;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const d = Math.hypot(player.pos.x - t.pos.x, player.pos.z - t.pos.z);
  if (d > 3.4 || !onFoot) { t.open = false; return; }

  if (!t.open) {
    world.tattooHint = 'Press <b>E</b> — TATTOO PARLOR';
    if (pressed['KeyE']) t.open = true;
    return;
  }

  const lines = DESIGNS.map((x, i) => `${i + 1}) ${x.name}`).join(' · ');
  world.tattooHint = `TATTOO ($${COST}): ${lines} · <b>0</b> remove · <b>E</b> close`;
  if (pressed['Digit0']) {
    t.design = null;
    applyTattoo(player.ch, null);
    showToast('Ink removed');
    world.onSave?.();
    return;
  }
  for (let i = 0; i < DESIGNS.length; i++) {
    if (!pressed['Digit' + (i + 1)]) continue;
    const des = DESIGNS[i];
    if (world.money < COST) { showToast('Not enough cash for ink'); continue; }
    world.money -= COST;
    t.design = des.key;
    applyTattoo(player.ch, des.hex);
    sfxMissionPass();
    showToast(`FRESH INK — ${des.name}`);
    showNews('a new sleeve turns heads on the boulevard');
    world.onSave?.();
  }
}

export function tattooSave(world) {
  return { tattoo: world.tattoo?.design };
}
