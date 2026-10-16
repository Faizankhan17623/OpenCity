import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { postSign, faceNearestRoad } from './propKit.js';
import { createCharacter, randomOutfit, animateIdle } from './characters.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// SHELL GAME: a street hustler at a folding table near spawn. Press E to put
// down a stake, watch which cup the ball goes under, follow the shuffle, then
// press 1/2/3 (left, middle, right as you face the table) to pick a cup. A
// win pays double and lets you go again at a doubled stake; every win makes
// the next shuffle faster and longer. A wrong pick ends the streak.

const BASE_STAKE = 50;
const MAX_STAKE = 800;       // stake doubles each consecutive win up to this cap
const SHOW_TIME = 1.4;       // seconds the ball is shown before the shuffle
const REVEAL_TIME = 1.8;     // seconds the cups stay lifted after a pick
const AGAIN_TIME = 12;       // seconds to accept "go again" after a win
const COOLDOWN = 6;
const SLOT_X = [-0.42, 0, 0.42]; // local x of the three cup spots (player's left to right)
const TABLE_TOP = 0.86;
const CUP_H = 0.28;
const LIFT = 0.34;
const REACH = 2.6;

const stakeFor = (streak) => Math.min(MAX_STAKE, BASE_STAKE * 2 ** streak);
const swapTime = (streak) => Math.max(0.11, 0.42 * 0.8 ** streak);
const swapCount = (streak) => Math.min(16, 6 + streak * 2);

function digitTexture(n) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f4e6b0';
  g.font = '900 46px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(n), 32, 35);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function initShellGame(scene, world, save) {
  const pos = world.city.spawn.clone().add(new THREE.Vector3(-30, 0, 20));
  placeStreetSite(world.city, pos, 2.4, 'shell-game'); // table, hustler, player spot and sign
  postSign(scene, world.city, pos, 'SHELL GAME', { fg: '#fff1c0', bg: '#2a0f2e', accent: '#ff4fd8' }, { offset: 1.7 });
  const yaw = faceNearestRoad(world.city, pos);

  // the folding table: player stands on local +z (street side), hustler on -z
  const group = new THREE.Group();
  const top = new THREE.MeshStandardMaterial({ color: 0x1d5a34, roughness: 0.9 });         // green felt
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5, metalness: 0.5 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.75), top);
  slab.position.y = TABLE_TOP - 0.025;
  slab.castShadow = slab.receiveShadow = true;
  group.add(slab);
  const legGeo = new THREE.BoxGeometry(0.04, TABLE_TOP - 0.05, 0.04);
  for (const [x, z] of [[-0.68, -0.32], [0.68, -0.32], [-0.68, 0.32], [0.68, 0.32]]) {
    const leg = new THREE.Mesh(legGeo, metal);
    leg.position.set(x, (TABLE_TOP - 0.05) / 2, z);
    group.add(leg);
  }
  // painted slot numbers in front of each cup spot
  const numGeo = new THREE.PlaneGeometry(0.16, 0.16);
  SLOT_X.forEach((x, i) => {
    const m = new THREE.Mesh(numGeo, new THREE.MeshBasicMaterial({ map: digitTexture(i + 1), transparent: true }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, TABLE_TOP + 0.002, 0.27);
    group.add(m);
  });

  // three cups (open side down) and the ball
  const cupGeo = new THREE.CylinderGeometry(0.1, 0.15, CUP_H, 18);
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xb8332a, roughness: 0.45 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xf2d27a, roughness: 0.4, metalness: 0.3 });
  const rimGeo = new THREE.TorusGeometry(0.15, 0.012, 6, 18);
  const cups = SLOT_X.map((x, i) => {
    const mesh = new THREE.Group();
    const body = new THREE.Mesh(cupGeo, cupMat);
    body.castShadow = true;
    body.position.y = CUP_H / 2;
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.012;
    mesh.add(body, rim);
    mesh.position.set(x, TABLE_TOP, 0);
    group.add(mesh);
    return { mesh, slot: i, lift: 0 };
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), new THREE.MeshStandardMaterial({ color: 0xf5f5ee, roughness: 0.3 }));
  ball.position.set(SLOT_X[1], TABLE_TOP + 0.05, 0);
  group.add(ball);

  group.position.set(pos.x, 0, pos.z);
  group.rotation.y = yaw;
  scene.add(group);

  const local = (x, z) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(pos.x, 0, pos.z));
  const hustler = createCharacter(randomOutfit());
  hustler.group.position.copy(local(0, -0.7));
  hustler.group.rotation.y = yaw; // faces local +z, toward the player
  scene.add(hustler.group);

  world.shellGame = {
    pos, yaw, group, cups, ball, hustler,
    stand: local(0, 0.9),   // where the player is held during a round
    state: 'idle',          // idle -> show -> shuffle -> guess -> reveal -> won (-> show) | idle
    t: 0, cooldown: 0,
    ballCupId: 1,           // which cup object hides the ball
    ballCup: 1,             // slot (0 left, 1 middle, 2 right) the ball is under right now
    pick: -1, lastResult: null,
    swaps: [], swapIdx: 0, swapDur: 0.4,
    stake: BASE_STAKE, streak: 0, won: 0,
    hud: null,
    best: save?.shellBestStreak ?? 0,
  };
}

function ensureHud(world) {
  const S = world.shellGame;
  if (S.hud) return S.hud;
  const el = document.createElement('div');
  el.id = 'shellgame';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:320px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#1a0a1ce0;border:1px solid #ff4fd8;border-radius:6px;display:none;z-index:30;color:#fff1c0;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#ff4fd8';
  const title = document.createElement('span');
  const stake = document.createElement('span');
  head.append(title, stake);
  const msg = document.createElement('div');
  msg.style.cssText = 'font-size:12px;opacity:.9';
  const keys = document.createElement('div');
  keys.style.cssText = 'display:flex;gap:6px;margin-top:6px';
  const keyEls = ['1 LEFT', '2 MIDDLE', '3 RIGHT'].map((t) => {
    const k = document.createElement('div');
    k.style.cssText = 'flex:1;text-align:center;padding:3px 0;border-radius:4px;border:1px solid #ff4fd866;font-size:12px';
    k.textContent = t;
    return k;
  });
  keys.append(...keyEls);
  el.append(head, msg, keys);
  document.body.appendChild(el);
  S.hud = { el, title, stake, msg, keyEls };
  return S.hud;
}

function renderHud(world) {
  const S = world.shellGame, hud = ensureHud(world);
  hud.el.style.display = 'block';
  hud.title.textContent = `SHELL GAME · streak ${S.streak}`;
  hud.stake.textContent = `stake $${S.stake}`;
  hud.msg.textContent = {
    show: 'Watch the ball...',
    shuffle: `Follow the cup! (${S.swapIdx}/${S.swaps.length} swaps)`,
    guess: 'Which cup hides the ball?',
    reveal: S.lastResult === 'win' ? `Found it! +$${S.stake * 2}` : 'Not that one. The house wins.',
    won: `Streak ${S.streak} · go again for $${stakeFor(S.streak)}?`,
  }[S.state] || '';
  hud.keyEls.forEach((k, i) => {
    const active = S.state === 'guess';
    const picked = S.state === 'reveal' && S.pick === i;
    k.style.opacity = active || picked ? '1' : '.45';
    k.style.background = picked ? (S.lastResult === 'win' ? '#2f9a4a' : '#9a2f2f') : active ? '#ff4fd833' : 'transparent';
  });
}

function hideHud(world) {
  const S = world.shellGame;
  if (S.hud) S.hud.el.style.display = 'none';
}

function cupInSlot(S, slot) { return S.cups.find((c) => c.slot === slot); }

function startRound(world) {
  const S = world.shellGame;
  S.stake = stakeFor(S.streak);
  world.money -= S.stake;
  S.state = 'show'; S.t = 0; S.pick = -1; S.lastResult = null;
  // reset the cups to their spots and hide the ball under a random one
  S.cups.forEach((c, i) => { c.slot = i; c.lift = 0; c.mesh.position.set(SLOT_X[i], TABLE_TOP, 0); });
  S.ballCupId = (Math.random() * 3) | 0;
  S.ballCup = S.ballCupId;
  // plan the shuffle: random pairs of slots, faster and longer every win
  S.swapDur = swapTime(S.streak);
  S.swaps = [];
  for (let i = 0; i < swapCount(S.streak); i++) {
    const a = (Math.random() * 3) | 0;
    const b = (a + 1 + ((Math.random() * 2) | 0)) % 3;
    S.swaps.push([a, b]);
  }
  S.swapIdx = 0;
  world.player.heading = S.yaw + Math.PI; // face the table
  sfxPickup();
  showToast(S.streak ? `Double or nothing: $${S.stake} on the table` : `$${S.stake} down. Keep your eye on the ball.`);
}

function finishStreak(world, reason) {
  const S = world.shellGame;
  if (S.streak > 0 && reason === 'cashout') {
    showMissionMsg('CASHED OUT', `${S.streak} win${S.streak > 1 ? 's' : ''} in a row · $${S.won} won`, '#ff4fd8');
  }
  S.streak = 0; S.won = 0;
  S.state = 'idle';
  S.cooldown = COOLDOWN;
  hideHud(world);
}

export function updateShellGame(world, dt, keys, pressed) {
  const S = world.shellGame;
  if (!S) return;
  world.shellGameHint = null;
  if (S.cooldown > 0) S.cooldown = Math.max(0, S.cooldown - dt);
  animateIdle(S.hustler);

  // cups ease toward their lift target; the ball rides with its cup
  const ballCupObj = S.cups[S.ballCupId];
  for (const c of S.cups) {
    const target = (S.state === 'reveal') || (S.state === 'show' && c === ballCupObj && S.t > 0.2 && S.t < SHOW_TIME - 0.3) ? LIFT : 0;
    c.lift += (target - c.lift) * Math.min(1, dt * 10);
    c.mesh.position.y = TABLE_TOP + c.lift;
  }
  S.ball.position.x = ballCupObj.mesh.position.x;
  S.ball.position.z = ballCupObj.mesh.position.z;

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const d = Math.hypot(player.pos.x - S.stand.x, player.pos.z - S.stand.z);

  if (S.state === 'idle') {
    if (!onFoot || d > REACH) return;
    if (S.cooldown > 0) { world.shellGameHint = 'SHELL GAME — the hustler is resetting the table...'; return; }
    if (world.money < BASE_STAKE) { world.shellGameHint = `SHELL GAME — you need <b>$${BASE_STAKE}</b> to play`; return; }
    world.shellGameHint = `SHELL GAME — press <b>E</b> to bet <b>$${BASE_STAKE}</b> · find the ball, win 2×${S.best ? ` (best streak ${S.best})` : ''}`;
    if (pressed['KeyE']) startRound(world);
    return;
  }

  if (S.state === 'won') {
    S.t += dt;
    const next = stakeFor(S.streak);
    if (!onFoot || d > REACH + 1.5 || S.t > AGAIN_TIME) { finishStreak(world, 'cashout'); return; }
    if (world.money < next) {
      world.shellGameHint = `SHELL GAME — you need <b>$${next}</b> to go again · walk away to cash out`;
    } else {
      world.shellGameHint = `SHELL GAME — press <b>E</b> to go again for <b>$${next}</b> · walk away to cash out`;
      if (pressed['KeyE']) { startRound(world); return; }
    }
    renderHud(world);
    return;
  }

  // ---- a round is running: hold the player at the table ----
  if (!onFoot) {
    showToast('The hustler pockets your stake.');
    sfxMissionFail();
    finishStreak(world, 'abandon');
    return;
  }
  player.pos.x = S.stand.x; player.pos.z = S.stand.z;
  player.vel.x = 0; player.vel.z = 0;
  world.nearKiosk = true; // digits pick cups here, not weapons
  S.t += dt;

  if (S.state === 'show') {
    world.shellGameHint = 'SHELL GAME — watch the ball...';
    if (S.t >= SHOW_TIME) { S.state = 'shuffle'; S.t = 0; }
  } else if (S.state === 'shuffle') {
    world.shellGameHint = 'SHELL GAME — keep your eye on the ball...';
    const [a, b] = S.swaps[S.swapIdx];
    const ca = cupInSlot(S, a), cb = cupInSlot(S, b);
    const k = Math.min(1, S.t / S.swapDur);
    const e = k * k * (3 - 2 * k);
    const arc = Math.sin(Math.PI * k) * 0.2;
    ca.mesh.position.x = SLOT_X[a] + (SLOT_X[b] - SLOT_X[a]) * e;
    ca.mesh.position.z = arc;
    cb.mesh.position.x = SLOT_X[b] + (SLOT_X[a] - SLOT_X[b]) * e;
    cb.mesh.position.z = -arc;
    if (k >= 1) {
      ca.slot = b; cb.slot = a;
      ca.mesh.position.set(SLOT_X[b], ca.mesh.position.y, 0);
      cb.mesh.position.set(SLOT_X[a], cb.mesh.position.y, 0);
      S.ballCup = S.cups[S.ballCupId].slot;
      S.swapIdx++;
      S.t = 0;
      if (S.swapIdx >= S.swaps.length) S.state = 'guess';
    }
  } else if (S.state === 'guess') {
    world.shellGameHint = 'SHELL GAME — which cup? press <b>1</b> <b>2</b> <b>3</b> (left · middle · right)';
    const choice = [1, 2, 3].find((n) => pressed['Digit' + n]);
    if (choice) {
      S.pick = choice - 1;
      S.state = 'reveal'; S.t = 0;
      if (S.pick === S.ballCup) {
        S.lastResult = 'win';
        const pay = S.stake * 2;
        world.money += pay;
        S.won += S.stake;
        S.streak++;
        sfxMissionPass();
        world.addXP?.(10 + S.streak * 5);
        addRep(world, 3 + S.streak * 2);
        if (S.streak > S.best) {
          S.best = S.streak;
          showToast(`Found it! +$${pay} · NEW BEST STREAK ${S.best}`);
          if (S.best >= 5) showNews(`street hustler swears the slinger has x-ray eyes after ${S.best} straight wins`);
        } else showToast(`Found it! +$${pay}`);
        world.onSave?.();
      } else {
        S.lastResult = 'lose';
        sfxMissionFail();
        showToast(S.streak ? `Wrong cup. Streak of ${S.streak} over.` : 'Wrong cup. Better luck next time.');
      }
    }
  } else if (S.state === 'reveal') {
    world.shellGameHint = S.lastResult === 'win' ? 'SHELL GAME — winner!' : 'SHELL GAME — the ball was under the other cup';
    if (S.t >= REVEAL_TIME) {
      if (S.lastResult === 'win') { S.state = 'won'; S.t = 0; }
      else { finishStreak(world, 'lose'); return; }
    }
  }
  renderHud(world);
}

export function shellGameSave(world) {
  return { shellBestStreak: world.shellGame?.best };
}
