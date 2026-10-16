import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { postSign, signTexture, faceNearestRoad } from './propKit.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// MOLE MANIA: a carnival whack-a-mole cabinet near spawn. Press E ($15) for a
// 30-second round. Moles pop out of six holes, two rows of three numbered like
// a phone keypad (1 2 3 at the back, 4 5 6 at the front); press the hole's
// number to bonk it before it ducks. They pop faster and duck sooner as the
// clock runs down. A golden mole is worth 5; a bomb costs 3 if you hit it.
// Every point pays $3.

const COST = 15;
const ROUND = 30;
const PAY_PER_POINT = 3;
const COOLDOWN = 5;
const REACH = 2.4;
const GOLD_CHANCE = 0.08;
const BOMB_CHANCE = 0.13;
const POINTS = { mole: 1, gold: 5, bomb: -3 };
const TOP = 0.92;                 // cabinet play surface height
const HIDDEN_Y = TOP - 0.5;       // a mole tucked inside the cabinet
const UP_Y = TOP - 0.1;           // a mole popped up

export function initWhackAMole(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(40, 0, 30));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 2.5)) pos = world.city.spawn.clone().add(new THREE.Vector3(44, 0, 26));
  placeStreetSite(world.city, pos, 2.4, 'whack-a-mole');
  postSign(scene, world.city, pos, 'MOLE MANIA', { fg: '#fff4d0', bg: '#4a0f2a', accent: '#ffb02a' }, { offset: 2.0 });

  // the cabinet: a striped body with a play deck on top, six dark holes and
  // a lit backboard; the player stands on the street side (local +z)
  const yaw = faceNearestRoad(world.city, pos);
  const group = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xc8283a, roughness: 0.55 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xf2c440, roughness: 0.45, metalness: 0.2 });
  const deck = new THREE.MeshStandardMaterial({ color: 0x2f7a3a, roughness: 0.8 });
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 1 });
  const add = (geo, mat, x, y, z, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  add(new THREE.BoxGeometry(1.9, TOP - 0.04, 1.3), body, 0, (TOP - 0.04) / 2, 0);
  add(new THREE.BoxGeometry(1.96, 0.06, 1.36), trim, 0, TOP - 0.06, 0);
  add(new THREE.BoxGeometry(1.84, 0.02, 1.24), deck, 0, TOP - 0.02, 0);
  for (const y of [0.25, 0.55]) add(new THREE.BoxGeometry(1.92, 0.06, 1.32), trim, 0, y, 0); // stripes
  add(new THREE.BoxGeometry(1.9, 1.1, 0.12), body, 0, TOP + 0.55, -0.71);   // backboard
  const boardSign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.425), new THREE.MeshBasicMaterial({ map: signTexture('WHACK-A-MOLE', { fg: '#fff4d0', bg: '#4a0f2a', accent: '#ffb02a' }), toneMapped: false }));
  boardSign.position.set(0, TOP + 0.75, -0.645);
  group.add(boardSign);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe080, emissive: 0xffc040, emissiveIntensity: 0.9 });
  const bulbGeo = new THREE.SphereGeometry(0.04, 8, 6);
  for (let i = 0; i < 9; i++) add(bulbGeo, bulbMat, -0.8 + i * 0.2, TOP + 1.07, -0.64);

  // holes 1 2 3 at the back, 4 5 6 at the front, left to right from the player
  const holePos = [];
  for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) holePos.push([(col - 1) * 0.55, row === 0 ? -0.28 : 0.3]);
  const ringGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.012, 20);
  const moleBodyGeo = new THREE.CylinderGeometry(0.12, 0.13, 0.32, 14);
  const moleHeadGeo = new THREE.SphereGeometry(0.12, 14, 10);
  const noseGeo = new THREE.SphereGeometry(0.03, 8, 6);
  const eyeGeo = new THREE.SphereGeometry(0.018, 6, 5);
  const bombGeo = new THREE.SphereGeometry(0.13, 14, 10);
  const fuseGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6);
  const sparkGeo = new THREE.SphereGeometry(0.03, 6, 5);
  const mats = {
    mole: new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.8 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffd040, emissive: 0xb07a10, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.25 }),
    nose: new THREE.MeshStandardMaterial({ color: 0xf08a9a, roughness: 0.6 }),
    eye: new THREE.MeshBasicMaterial({ color: 0x050505 }),
    bomb: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.35, metalness: 0.5 }),
    fuse: new THREE.MeshStandardMaterial({ color: 0xc8b48a, roughness: 0.9 }),
    spark: new THREE.MeshBasicMaterial({ color: 0xffa030 }),
  };
  const holes = holePos.map(([x, z], i) => {
    add(ringGeo, holeMat, x, TOP + 0.002, z);
    const mole = new THREE.Group();
    const torso = add(moleBodyGeo, mats.mole, 0, 0.16, 0, mole);
    const head = add(moleHeadGeo, mats.mole, 0, 0.33, 0, mole);
    add(noseGeo, mats.nose, 0, 0.33, 0.12, mole);
    for (const ex of [-0.045, 0.045]) add(eyeGeo, mats.eye, ex, 0.38, 0.1, mole);
    mole.visible = false;
    mole.position.set(x, HIDDEN_Y, z);
    group.add(mole);
    const bomb = new THREE.Group();
    add(bombGeo, mats.bomb, 0, 0.2, 0, bomb);
    add(fuseGeo, mats.fuse, 0, 0.36, 0, bomb);
    const spark = add(sparkGeo, mats.spark, 0, 0.42, 0, bomb);
    bomb.visible = false;
    bomb.position.set(x, HIDDEN_Y, z);
    group.add(bomb);
    return {
      n: i + 1, x, z, mole, bomb, spark, skin: [torso, head],
      kind: null,       // null | 'mole' | 'gold' | 'bomb'
      up: 0,            // seconds left before it ducks
      rise: 0,          // 0 hidden .. 1 fully up (visual)
      bonk: 0,          // squash timer after a hit
    };
  });

  // a mallet that swings down onto the hole you pick
  const mallet = new THREE.Group();
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.8 }), 0, 0.25, 0.18, mallet).rotation.x = Math.PI / 2.4;
  const malletHead = add(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0xd83030, roughness: 0.5 }), 0, 0.06, 0, mallet);
  malletHead.rotation.z = Math.PI / 2;
  mallet.visible = false;
  group.add(mallet);

  group.position.set(pos.x, 0, pos.z);
  group.rotation.y = yaw;
  scene.add(group);

  const local = (x, z) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(pos.x, 0, pos.z));
  world.whackAMole = {
    pos, yaw, stand: local(0, 1.35), holes, mats, mallet, malletT: 0,
    state: 'idle',        // idle -> playing -> idle
    t: 0, spawnT: 0, cooldown: 0,
    score: 0, hits: 0, misses: 0, golds: 0, bombs: 0,
    hud: null,
    best: save?.whackBest ?? 0,
  };
}

function ensureHud(world) {
  const W = world.whackAMole;
  if (W.hud) return W.hud;
  const el = document.createElement('div');
  el.id = 'whackamole';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:280px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#2a0818e0;border:1px solid #ffb02a;border-radius:6px;display:none;z-index:30;color:#fff4d0;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#ffb02a';
  const time = document.createElement('span');
  const score = document.createElement('span');
  head.append(time, score);
  const bar = document.createElement('div');
  bar.style.cssText = 'height:6px;background:#0006;border-radius:3px;overflow:hidden;margin-bottom:8px';
  const fill = document.createElement('div');
  fill.style.cssText = 'height:100%;width:100%;background:#ffb02a';
  bar.appendChild(fill);
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px;background:#2f7a3a;border-radius:6px';
  const cells = W.holes.map((h) => {
    const cell = document.createElement('div');
    cell.style.cssText = 'position:relative;height:52px;border-radius:50%/40%;background:#0c0a08;display:flex;align-items:center;justify-content:center;font-size:26px;transition:background .08s';
    const num = document.createElement('span');
    num.style.cssText = 'position:absolute;left:6px;top:2px;font-size:12px;font-weight:800;color:#fff4d0';
    num.textContent = String(h.n);
    const icon = document.createElement('span');
    cell.append(num, icon);
    grid.appendChild(cell);
    return { cell, icon };
  });
  const help = document.createElement('div');
  help.style.cssText = 'margin-top:6px;font-size:11px;opacity:.85;text-align:center';
  help.textContent = 'Press 1–6 to bonk · 🐹 +1 · ⭐ golden +5 · 💣 bomb −3 · E stops';
  el.append(head, bar, grid, help);
  document.body.appendChild(el);
  W.hud = { el, time, score, fill, cells };
  return W.hud;
}

const ICONS = { mole: '🐹', gold: '⭐', bomb: '💣' };
const GLOW = { mole: '#5a3a20', gold: '#8a6a10', bomb: '#5a1010' };

function renderHud(world) {
  const W = world.whackAMole, hud = ensureHud(world);
  hud.time.textContent = `MOLE MANIA  ${Math.ceil(W.t)}s`;
  hud.score.textContent = `score ${W.score} · $${W.score * PAY_PER_POINT}`;
  hud.fill.style.width = `${Math.round(Math.max(0, W.t / ROUND) * 100)}%`;
  W.holes.forEach((h, i) => {
    const c = hud.cells[i];
    const showing = h.kind && h.bonk <= 0;
    c.icon.textContent = h.bonk > 0 ? '💥' : showing ? ICONS[h.kind] : '';
    c.cell.style.background = h.bonk > 0 ? '#ffb02a' : showing ? GLOW[h.kind] : '#0c0a08';
  });
}

// how long a mole stays up and the gap between pops, both shrinking over the round
function difficulty(W) {
  const k = Math.min(1, Math.max(0, 1 - W.t / ROUND)); // 0 at the start, 1 at the end
  return { window: 1.35 - 0.75 * k, gap: 0.85 - 0.45 * k, maxUp: k > 0.5 ? 3 : 2 };
}

function popOne(W) {
  const free = W.holes.filter((h) => !h.kind && h.rise <= 0.02 && h.bonk <= 0);
  if (!free.length) return;
  const h = free[(Math.random() * free.length) | 0];
  const r = Math.random();
  h.kind = r < GOLD_CHANCE ? 'gold' : r < GOLD_CHANCE + BOMB_CHANCE ? 'bomb' : 'mole';
  const { window } = difficulty(W);
  h.up = h.kind === 'gold' ? window * 0.75 : h.kind === 'bomb' ? window * 1.3 : window;
  if (h.kind !== 'bomb') for (const m of h.skin) m.material = h.kind === 'gold' ? W.mats.gold : W.mats.mole;
}

function clearHoles(W) {
  for (const h of W.holes) { h.kind = null; h.up = 0; h.bonk = 0; }
}

function endRound(world, early) {
  const W = world.whackAMole;
  W.state = 'idle';
  W.cooldown = COOLDOWN;
  clearHoles(W);
  if (W.hud) W.hud.el.style.display = 'none';
  world.whackAMoleHint = null;
  const pay = Math.max(0, W.score) * PAY_PER_POINT;
  world.money += pay;
  const newBest = W.score > W.best;
  if (newBest) W.best = W.score;
  if (W.score > 0) { world.addXP?.(W.score * 2); addRep(world, Math.ceil(W.score / 2)); }
  (W.score >= 25 && !early ? sfxMissionPass : sfxMissionFail)();
  showMissionMsg(early ? 'MOLE MANIA STOPPED' : 'TIME!',
    `${W.score} points · ${W.hits} bonks${W.golds ? ` · ${W.golds} golden` : ''}${W.bombs ? ` · ${W.bombs} bomb${W.bombs > 1 ? 's' : ''}` : ''} · +$${pay}${newBest ? ' · NEW BEST!' : ''}`, '#ffb02a');
  if (newBest && W.score >= 40) showNews('carnival staff report a whack-a-mole score that "should not be humanly possible"');
  world.onSave?.();
}

function animateHoles(W, dt) {
  for (const h of W.holes) {
    if (h.bonk > 0) h.bonk = Math.max(0, h.bonk - dt);
    const target = h.kind && h.bonk <= 0 ? 1 : 0;
    h.rise += Math.sign(target - h.rise) * Math.min(Math.abs(target - h.rise), dt * (target ? 9 : 6));
    const y = HIDDEN_Y + (UP_Y - HIDDEN_Y) * h.rise;
    const showBomb = h.kind === 'bomb' || (h.lastKind === 'bomb' && !h.kind);
    h.mole.visible = h.rise > 0.01 && !showBomb;
    h.bomb.visible = h.rise > 0.01 && showBomb;
    const squash = h.bonk > 0 ? 0.55 : 1;
    h.mole.position.y = y; h.mole.scale.y = squash;
    h.bomb.position.y = y;
    if (h.bomb.visible) h.spark.scale.setScalar(0.7 + Math.random() * 0.8);
    if (h.kind) h.lastKind = h.kind;
  }
}

export function updateWhackAMole(world, dt, keys, pressed) {
  const W = world.whackAMole;
  if (!W) return;
  world.whackAMoleHint = null;
  if (W.cooldown > 0) W.cooldown = Math.max(0, W.cooldown - dt);
  animateHoles(W, dt);
  if (W.malletT > 0) {
    W.malletT = Math.max(0, W.malletT - dt);
    const k = W.malletT / 0.18;  // 1 raised .. 0 struck
    W.mallet.position.y = TOP + 0.08 + k * 0.35;
    W.mallet.visible = W.malletT > 0;
  }

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const d = Math.hypot(player.pos.x - W.pos.x, player.pos.z - W.pos.z);

  if (W.state === 'idle') {
    if (!onFoot || d > REACH) return;
    if (W.cooldown > 0) { world.whackAMoleHint = 'MOLE MANIA — the moles are catching their breath…'; return; }
    world.whackAMoleHint = `MOLE MANIA — press <b>E</b> to play ($${COST}, $${PAY_PER_POINT} a point)${W.best ? ` · best ${W.best}` : ''}`;
    if (pressed['KeyE']) {
      if (world.money < COST) { showToast(`You need $${COST} for a round`); sfxMissionFail(); return; }
      world.money -= COST;
      W.state = 'playing'; W.t = ROUND; W.spawnT = 0.6;
      W.score = 0; W.hits = 0; W.misses = 0; W.golds = 0; W.bombs = 0;
      clearHoles(W);
      ensureHud(world).el.style.display = 'block';
      sfxPickup();
      showMissionMsg('MOLE MANIA', 'Press 1–6 to bonk the mole in that hole · ⭐ = 5 · avoid 💣', '#ffb02a');
    }
    return;
  }

  // ---- a round is running: the player stays at the cabinet; E stops ----
  if (!onFoot || d > REACH + 1.5 || pressed['KeyE']) { endRound(world, true); return; }
  player.pos.x = W.stand.x; player.pos.z = W.stand.z;
  player.vel.x = 0; player.vel.z = 0;
  world.nearKiosk = true; // digits bonk moles here, not switch weapons
  W.t -= dt;
  if (W.t <= 0) { W.t = 0; endRound(world, false); return; }

  // ducking: anything left up too long drops back down (no penalty)
  for (const h of W.holes) {
    if (!h.kind || h.bonk > 0) continue;
    h.up -= dt;
    if (h.up <= 0) h.kind = null;
  }
  const diff = difficulty(W);
  W.spawnT -= dt;
  if (W.spawnT <= 0) {
    if (W.holes.filter((h) => h.kind).length < diff.maxUp) popOne(W);
    W.spawnT = diff.gap * (0.7 + Math.random() * 0.6);
  }

  for (let n = 1; n <= 6; n++) {
    if (!pressed['Digit' + n]) continue;
    const h = W.holes[n - 1];
    W.mallet.position.set(h.x, TOP + 0.43, h.z);
    W.mallet.visible = true;
    W.malletT = 0.18;
    if (!h.kind || h.bonk > 0) { W.misses++; continue; }
    const pts = POINTS[h.kind];
    W.score = Math.max(0, W.score + pts);
    if (h.kind === 'bomb') {
      W.bombs++;
      sfxMissionFail();
      showToast(`💣 BOOM! −${-pts} points`);
    } else {
      W.hits++;
      if (h.kind === 'gold') { W.golds++; showToast(`⭐ GOLDEN MOLE! +${pts}`); }
      sfxPickup();
    }
    h.kind = null;
    h.bonk = 0.22;
  }

  world.whackAMoleHint = `MOLE MANIA — <b>1</b>–<b>6</b> bonks a hole · score ${W.score} · <b>E</b> stops`;
  renderHud(world);
}

export function whackAMoleSave(world) {
  return { whackBest: world.whackAMole?.best };
}
