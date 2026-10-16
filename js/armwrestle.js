import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { storefront, faceNearestRoad } from './propKit.js';
import { createCharacter, animateIdle } from './characters.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// ARM WRESTLING: a high table outside the Iron Elbow bar near spawn. Pay the
// entry fee and lock hands with the next name on the ladder. A power gauge
// needle sweeps back and forth: press E while it is inside the green sweet
// spot to drive your opponent's arm down, while they push back steadily the
// whole time. Pressing E outside the green gives ground, so mashing loses.
// Beat all five to become the champ of the block.

const OPPONENTS = [
  { name: 'Skinny Pete', pay: 60, push: 0.06, speed: 1.0, zone: 0.26, scale: 0.94, outfit: { shirt: '#8c8c84', pants: '#28333d', skin: '#e6b88f', hair: '#6a4a2a' } },
  { name: 'Big Lou', pay: 120, push: 0.09, speed: 1.2, zone: 0.23, scale: 1.04, outfit: { shirt: '#8a5222', pants: '#22304d', skin: '#c98e63', hair: '#221a14' } },
  { name: 'Knuckles Malone', pay: 220, push: 0.12, speed: 1.42, zone: 0.2, scale: 1.08, outfit: { shirt: '#23303d', pants: '#181f28', skin: '#d9a06e', hair: '#3a2a1a' } },
  { name: 'Iron Irina', pay: 400, push: 0.15, speed: 1.64, zone: 0.17, scale: 1.06, outfit: { shirt: '#6a3a4a', pants: '#33333a', skin: '#e6b88f', hair: '#c8a050' } },
  { name: 'The Anvil', pay: 750, push: 0.18, speed: 1.88, zone: 0.14, scale: 1.18, outfit: { shirt: '#1c1f24', pants: '#181f28', skin: '#6b4226', hair: '#111111' } },
];
const ENTRY = 20;
const HIT = 0.16;            // tug gained for E inside the green
const PERFECT = 1.5;         // multiplier for E in the middle third of the green
const MISS = 0.09;           // tug lost for E outside the green
const LOCKOUT = 0.12;        // seconds after any press before the next one counts
const INTRO = 1.6;           // "ready... go" before the needle starts
const RESULT_TIME = 1.8;
const COOLDOWN = 5;
const TABLE_TOP = 1.05;
const REACH = 2.6;

export function initArmWrestle(scene, world, save) {
  const pos = world.city.spawn.clone().add(new THREE.Vector3(30, 0, -24));
  placeStreetSite(world.city, pos, 3.6, 'arm-wrestle'); // bar front, table, both wrestlers
  const yaw = faceNearestRoad(world.city, pos);
  const local = (x, z) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(pos.x, 0, pos.z));

  // the bar sits behind the table, door and sign facing the same road
  const barPos = local(0, -2.3);
  const bar = storefront(scene, world.city, barPos, {
    name: 'IRON ELBOW', w: 3.2, h: 2.7, d: 1.8, wall: 0x4a3a30, accent: 0x8a2a1a,
    sign: { fg: '#ffe8c0', bg: '#2a1208', accent: '#ff7a2a' },
  });
  bar.group.position.set(barPos.x, 0, barPos.z);
  bar.group.rotation.y = yaw;

  // a tall round-cornered table with two elbow pads and hand pegs
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.75 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x2e3238, roughness: 0.5, metalness: 0.5 });
  const pad = new THREE.MeshStandardMaterial({ color: 0x8a1e1e, roughness: 0.8 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.07, 1.0), wood);
  slab.position.y = TABLE_TOP - 0.035;
  slab.castShadow = slab.receiveShadow = true;
  group.add(slab);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, TABLE_TOP - 0.07, 10), metal);
  post.position.y = (TABLE_TOP - 0.07) / 2;
  group.add(post);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.05, 16), metal);
  foot.position.y = 0.025;
  group.add(foot);
  const padGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.025, 14);
  for (const z of [0.24, -0.24]) {
    const p = new THREE.Mesh(padGeo, pad);
    p.position.set(0, TABLE_TOP + 0.012, z);
    group.add(p);
  }
  const pegGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8);
  for (const x of [-0.3, 0.3]) {
    const peg = new THREE.Mesh(pegGeo, metal);
    peg.position.set(x, TABLE_TOP + 0.08, 0);
    group.add(peg);
  }

  // the locked arms: two forearms from the elbow pads meeting in a fist over
  // the middle; the whole lock tilts sideways (about local z) with the tug
  const lock = new THREE.Group();
  lock.position.y = TABLE_TOP + 0.02;
  const armGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.38, 10);
  const youMat = new THREE.MeshStandardMaterial({ color: 0xc98e63, roughness: 0.7 });
  const oppMat = new THREE.MeshStandardMaterial({ color: 0x8d5a3a, roughness: 0.7 });
  for (const [z, mat] of [[0.24, youMat], [-0.24, oppMat]]) {
    const arm = new THREE.Mesh(armGeo, mat);
    // from the pad at (0,0,z) up to the fist at (0,0.32,0)
    arm.position.set(0, 0.16, z / 2);
    arm.rotation.x = Math.atan2(-z, 0.32);
    lock.add(arm);
  }
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), youMat);
  fist.position.y = 0.34;
  lock.add(fist);
  lock.visible = false;
  group.add(lock);

  group.position.set(pos.x, 0, pos.z);
  group.rotation.y = yaw;
  scene.add(group);

  // one wrestler per rung; only the current challenger stands at the table
  const oppSpot = local(0, -0.62);
  const wrestlers = OPPONENTS.map((o) => {
    const ch = createCharacter(o.outfit);
    ch.group.scale.setScalar(o.scale);
    ch.group.position.copy(oppSpot);
    ch.group.rotation.y = yaw; // faces local +z, toward the player
    ch.group.visible = false;
    scene.add(ch.group);
    return ch;
  });

  const rung = Math.max(0, Math.min(OPPONENTS.length, save?.armWrestleRung ?? 0));
  world.armWrestle = {
    pos, yaw, group, lock, oppMat, wrestlers,
    stand: local(0, 0.62),   // where the player is held during a match
    state: 'idle',           // idle -> intro -> match -> result -> idle
    t: 0, cooldown: 0,
    rung,                    // index of the next opponent (5 = ladder cleared)
    opp: 0,                  // index of the opponent in the current/last match
    tug: 0,                  // -1 opponent wins .. +1 player wins
    needle: 0, dir: 1,       // gauge needle 0..1 and its sweep direction
    zoneC: 0.5, zoneW: 0.26, // green sweet spot centre and width (0..1)
    lockout: 0, flash: 0, flashHit: false, flashPerfect: false,
    hits: 0, misses: 0, lastResult: null,
    hud: null,
  };
  showWrestler(world.armWrestle);
}

function currentOpp(A) { return Math.min(A.rung, OPPONENTS.length - 1); }

function showWrestler(A) {
  const i = currentOpp(A);
  A.wrestlers.forEach((w, k) => { w.group.visible = k === i; });
}

function ensureHud(world) {
  const A = world.armWrestle;
  if (A.hud) return A.hud;
  const el = document.createElement('div');
  el.id = 'armwrestle';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:340px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#180c06e0;border:1px solid #ff7a2a;border-radius:6px;display:none;z-index:30;color:#ffe8c0;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#ff7a2a';
  const title = document.createElement('span');
  const sub = document.createElement('span');
  head.append(title, sub);

  // tug-of-war: opponent's side on the left, yours on the right
  const tugLabels = document.createElement('div');
  tugLabels.style.cssText = 'display:flex;justify-content:space-between;font-size:11px;opacity:.8;margin-bottom:2px';
  const oppName = document.createElement('span');
  const you = document.createElement('span');
  you.textContent = 'YOU';
  tugLabels.append(oppName, you);
  const tugBar = document.createElement('div');
  tugBar.style.cssText = 'position:relative;height:14px;background:#0008;border-radius:7px;overflow:hidden;margin-bottom:8px';
  const tugFill = document.createElement('div');
  tugFill.style.cssText = 'position:absolute;top:0;bottom:0;left:50%;width:0';
  const tugMid = document.createElement('div');
  tugMid.style.cssText = 'position:absolute;top:0;bottom:0;left:50%;width:2px;margin-left:-1px;background:#ffe8c0aa';
  tugBar.append(tugFill, tugMid);

  // power gauge: a green sweet spot and a sweeping needle
  const gauge = document.createElement('div');
  gauge.style.cssText = 'position:relative;height:18px;background:linear-gradient(90deg,#5a1a10,#3a2a10 50%,#5a1a10);border-radius:4px;overflow:hidden';
  const zone = document.createElement('div');
  zone.style.cssText = 'position:absolute;top:0;bottom:0;background:#3fd46a';
  const sweet = document.createElement('div');
  sweet.style.cssText = 'position:absolute;top:0;bottom:0;background:#9cff9c';
  const needle = document.createElement('div');
  needle.style.cssText = 'position:absolute;top:-2px;bottom:-2px;width:4px;margin-left:-2px;background:#fff;box-shadow:0 0 6px #fff';
  gauge.append(zone, sweet, needle);
  const msg = document.createElement('div');
  msg.style.cssText = 'font-size:12px;opacity:.9;margin-top:6px;text-align:center';

  el.append(head, tugLabels, tugBar, gauge, msg);
  document.body.appendChild(el);
  A.hud = { el, title, sub, oppName, tugFill, zone, sweet, needle, msg };
  return A.hud;
}

function renderHud(world) {
  const A = world.armWrestle, hud = ensureHud(world), o = OPPONENTS[A.opp];
  hud.el.style.display = 'block';
  hud.title.textContent = o.name.toUpperCase();
  hud.sub.textContent = `rung ${A.opp + 1}/${OPPONENTS.length} · $${o.pay}`;
  hud.oppName.textContent = o.name;
  const t = Math.max(-1, Math.min(1, A.tug));
  hud.tugFill.style.left = t >= 0 ? '50%' : `${50 + t * 50}%`;
  hud.tugFill.style.width = `${Math.abs(t) * 50}%`;
  hud.tugFill.style.background = t >= 0 ? '#3fd46a' : '#ff5a4a';
  hud.zone.style.left = `${(A.zoneC - A.zoneW / 2) * 100}%`;
  hud.zone.style.width = `${A.zoneW * 100}%`;
  hud.sweet.style.left = `${(A.zoneC - A.zoneW / 6) * 100}%`;
  hud.sweet.style.width = `${A.zoneW / 3 * 100}%`;
  hud.needle.style.left = `${A.needle * 100}%`;
  hud.needle.style.background = A.flash > 0 ? (A.flashHit ? '#9cff9c' : '#ff5a4a') : '#fff';
  hud.msg.textContent = A.state === 'intro' ? (A.t < INTRO * 0.6 ? 'READY...' : 'GO!')
    : A.state === 'result' ? (A.lastResult === 'win' ? `YOU WIN! +$${o.pay}` : `${o.name} slams you down.`)
    : A.flash > 0 ? (A.flashHit ? (A.flashPerfect ? 'PERFECT PUSH!' : 'Good push!') : 'Slipped! You gave ground.')
    : 'Press E when the needle is in the green';
}

function hideHud(world) {
  const A = world.armWrestle;
  if (A.hud) A.hud.el.style.display = 'none';
}

function newZone(A) {
  const o = OPPONENTS[A.opp];
  A.zoneW = o.zone;
  // move the sweet spot away from the needle so each hit has to be aimed again
  let c;
  do c = A.zoneW / 2 + Math.random() * (1 - A.zoneW); while (Math.abs(c - A.needle) < 0.25);
  A.zoneC = c;
}

function startMatch(world) {
  const A = world.armWrestle;
  world.money -= ENTRY;
  A.opp = currentOpp(A);
  A.state = 'intro'; A.t = 0;
  A.tug = 0; A.needle = 0; A.dir = 1; A.lockout = 0; A.flash = 0;
  A.hits = 0; A.misses = 0; A.lastResult = null;
  newZone(A);
  A.lock.visible = true;
  A.lock.rotation.z = 0;
  A.oppMat.color.set(OPPONENTS[A.opp].outfit.skin);
  world.player.heading = A.yaw + Math.PI; // face the table
  sfxPickup();
  showToast(`$${ENTRY} entry paid · ${OPPONENTS[A.opp].name} cracks their knuckles`);
}

function endMatch(world, result) {
  const A = world.armWrestle, o = OPPONENTS[A.opp];
  A.state = 'result'; A.t = 0;
  A.lastResult = result;
  if (result === 'win') {
    const champ = A.rung >= OPPONENTS.length;
    const pay = champ ? Math.round(o.pay / 2) : o.pay; // rematches with The Anvil pay half
    world.money += pay;
    world.addXP?.(20 + A.opp * 15);
    addRep(world, 10 + A.opp * 8);
    sfxMissionPass();
    if (!champ) {
      A.rung++;
      if (A.rung >= OPPONENTS.length) {
        showMissionMsg('ARM WRESTLING CHAMP', `You put down ${o.name}! +$${pay}`, '#ff7a2a');
        showNews('nobody has ever pinned The Anvil, until today');
      } else {
        showMissionMsg(`BEAT ${o.name.toUpperCase()}`, `+$${pay} · next up: ${OPPONENTS[A.rung].name}`, '#ff7a2a');
      }
    } else {
      showMissionMsg('STILL THE CHAMP', `Rematch won · +$${pay}`, '#ff7a2a');
    }
    world.onSave?.();
  } else if (result === 'lose') {
    sfxMissionFail();
    showMissionMsg('PINNED', `${o.name} wins this one · ${A.hits} good pushes, ${A.misses} slips`, '#ff5a4a');
  } else {
    sfxMissionFail();
    showToast('You let go of the match. Entry fee lost.');
  }
}

function finish(world) {
  const A = world.armWrestle;
  A.state = 'idle';
  A.cooldown = COOLDOWN;
  A.lock.visible = false;
  hideHud(world);
  showWrestler(A);
}

export function updateArmWrestle(world, dt, keys, pressed) {
  const A = world.armWrestle;
  if (!A) return;
  world.armWrestleHint = null;
  if (A.cooldown > 0) A.cooldown = Math.max(0, A.cooldown - dt);

  // the challenger idles; during a match their arm is raised into the lock
  const ch = A.wrestlers[A.state === 'idle' ? currentOpp(A) : A.opp];
  animateIdle(ch);
  if (A.state !== 'idle' && ch.rArm) {
    ch.rArm.rotation.x = -1.3 - A.tug * 0.25;
    ch.rArm.rotation.z = -0.1;
    if (A.state === 'match') ch.group.rotation.z = A.tug * 0.05;
  }
  // the locked fists lean toward whoever is losing
  A.lock.rotation.z += (-A.tug * 1.1 - A.lock.rotation.z) * Math.min(1, dt * 12);

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const d = Math.hypot(player.pos.x - A.stand.x, player.pos.z - A.stand.z);

  if (A.state === 'idle') {
    if (!onFoot || d > REACH) return;
    const o = OPPONENTS[currentOpp(A)];
    if (A.cooldown > 0) { world.armWrestleHint = 'ARM WRESTLING — catching their breath, back in a moment'; return; }
    if (world.money < ENTRY) { world.armWrestleHint = `ARM WRESTLING — you need <b>$${ENTRY}</b> to enter`; return; }
    const champ = A.rung >= OPPONENTS.length;
    world.armWrestleHint = champ
      ? `ARM WRESTLING — champ of the block! press <b>E</b> for a rematch with ${o.name} ($${ENTRY} entry, pays $${Math.round(o.pay / 2)})`
      : `ARM WRESTLING — press <b>E</b> to challenge <b>${o.name}</b> (rung ${A.rung + 1}/${OPPONENTS.length}) · $${ENTRY} entry, pays $${o.pay}`;
    if (pressed['KeyE']) startMatch(world);
    return;
  }

  if (A.state === 'result') {
    A.t += dt;
    world.armWrestleHint = A.lastResult === 'win' ? 'ARM WRESTLING — victory!' : 'ARM WRESTLING — pinned!';
    if (A.t >= RESULT_TIME) { finish(world); return; }
    renderHud(world);
    return;
  }

  // ---- a match is running: hold the player at the table ----
  if (!onFoot) { endMatch(world, 'abandon'); finish(world); return; }
  player.pos.x = A.stand.x; player.pos.z = A.stand.z;
  player.vel.x = 0; player.vel.z = 0;
  A.t += dt;

  if (A.state === 'intro') {
    world.armWrestleHint = 'ARM WRESTLING — get a grip...';
    if (A.t >= INTRO) { A.state = 'match'; A.t = 0; }
    renderHud(world);
    return;
  }

  // state === 'match'
  const o = OPPONENTS[A.opp];
  A.needle += A.dir * o.speed * dt;
  if (A.needle >= 1) { A.needle = 2 - A.needle; A.dir = -1; }
  if (A.needle <= 0) { A.needle = -A.needle; A.dir = 1; }
  A.tug -= o.push * dt; // the opponent leans in steadily
  if (A.lockout > 0) A.lockout -= dt;
  if (A.flash > 0) A.flash -= dt;

  if (pressed['KeyE'] && A.lockout <= 0) {
    A.lockout = LOCKOUT;
    const off = Math.abs(A.needle - A.zoneC);
    if (off <= A.zoneW / 2) {
      const perfect = off <= A.zoneW / 6;
      A.tug += HIT * (perfect ? PERFECT : 1);
      A.hits++;
      A.flash = 0.35; A.flashHit = true; A.flashPerfect = perfect;
      newZone(A);
    } else {
      A.tug -= MISS;
      A.misses++;
      A.flash = 0.35; A.flashHit = false;
    }
  }

  world.armWrestleHint = `ARM WRESTLING vs <b>${o.name}</b> — press <b>E</b> when the needle is in the green`;
  if (A.tug >= 1) { A.tug = 1; endMatch(world, 'win'); }
  else if (A.tug <= -1) { A.tug = -1; endMatch(world, 'lose'); }
  renderHud(world);
}

export function armWrestleSave(world) {
  return { armWrestleRung: world.armWrestle?.rung };
}
