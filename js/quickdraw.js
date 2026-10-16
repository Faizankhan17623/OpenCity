import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { postSign, faceNearestRoad } from './propKit.js';
import { createCharacter, animateIdle } from './characters.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail, sfxShot } from './sound.js';
import { addRep } from './economy.js';

// QUICK-DRAW DUEL: a dusty strip in a quiet lot under a HIGH NOON sign. Stand
// on your mark and press E to call out the gunslinger ten metres away. The
// panel reads WAIT... for a few seconds, then DRAW! - press E faster than he
// can clear leather. Go early and it's a foul; go slow and you take a bullet.
// Five gunslingers, each quicker than the last. Reaction is timed in game
// time (summed dt), so pausing never helps or hurts.

const GUNSLINGERS = [
  { name: 'Dusty Pete', react: 0.55, pay: 100, shirt: '#8a5222', pants: '#43302a' },
  { name: 'Calamity Jo', react: 0.46, pay: 175, shirt: '#7a2a22', pants: '#33333a' },
  { name: 'Rattlesnake Ray', react: 0.38, pay: 275, shirt: '#2a6a5a', pants: '#43302a' },
  { name: 'The Undertaker', react: 0.30, pay: 400, shirt: '#23303d', pants: '#181f28' },
  { name: 'Kid Lightning', react: 0.24, pay: 600, shirt: '#9a8a3a', pants: '#22304d' },
];
const STRIP = 10;            // metres between the two marks
const WAIT_MIN = 1.5, WAIT_MAX = 4;
const RESULT_TIME = 2.4;     // seconds the outcome stays on screen
const COOLDOWN = 4;
const HIT = 15;              // health lost when he outdraws you
const REMATCH_PAY = 150;     // pay for beating the champion again once all five are down
const REACH = 3.2;           // how close to your mark to call him out

export function initQuickDraw(scene, world, save) {
  const pos = world.city.spawn.clone().add(new THREE.Vector3(-40, 0, -30));
  placeStreetSite(world.city, pos, 7, 'quick-draw');
  const yaw = faceNearestRoad(world.city, pos);
  // local frame: the strip runs along local x (parallel to the street),
  // local +z faces the street
  const local = (x, z) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(pos.x, 0, pos.z));

  const group = new THREE.Group();
  const dirt = new THREE.MeshStandardMaterial({ color: 0xb08850, roughness: 1 });
  const chalk = new THREE.MeshStandardMaterial({ color: 0xf2ecd8, roughness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4626, roughness: 0.9 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(STRIP + 3, 3.2), dirt);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.03;
  ground.receiveShadow = true;
  group.add(ground);
  // chalk boundary lines along both long edges and the two firing marks
  const edgeGeo = new THREE.PlaneGeometry(STRIP + 3, 0.08);
  for (const z of [-1.55, 1.55]) {
    const e = new THREE.Mesh(edgeGeo, chalk);
    e.rotation.x = -Math.PI / 2;
    e.position.set(0, 0.04, z);
    group.add(e);
  }
  const markGeo = new THREE.PlaneGeometry(0.12, 1.4);
  for (const x of [-STRIP / 2, STRIP / 2]) {
    const m = new THREE.Mesh(markGeo, chalk);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.045, 0);
    group.add(m);
  }
  // hitching posts with a rail along the back, and a couple of hay bales
  const postGeo = new THREE.BoxGeometry(0.14, 1.1, 0.14);
  for (const x of [-6, -2, 2, 6]) {
    const p = new THREE.Mesh(postGeo, wood);
    p.position.set(x, 0.55, -2.1);
    p.castShadow = true;
    group.add(p);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.1, 0.1), wood);
  rail.position.set(0, 0.95, -2.1);
  group.add(rail);
  const hay = new THREE.MeshStandardMaterial({ color: 0xd8b860, roughness: 1 });
  const baleGeo = new THREE.BoxGeometry(1.1, 0.5, 0.6);
  for (const [x, z] of [[-6.6, 1.9], [6.6, -1.4]]) {
    const b = new THREE.Mesh(baleGeo, hay);
    b.position.set(x, 0.25, z);
    b.castShadow = true;
    group.add(b);
  }
  group.position.set(pos.x, 0, pos.z);
  group.rotation.y = yaw;
  scene.add(group);

  // the HIGH NOON board stands behind the rail, clear of the line of fire
  postSign(scene, world.city, local(0, -2.8), 'HIGH NOON', { fg: '#fff0c8', bg: '#3a1e0a', accent: '#ffb040' }, { offset: 0, height: 2.8 });

  const mark = local(-STRIP / 2, 0);   // where the player stands
  const oppSpot = local(STRIP / 2, 0); // where the gunslinger stands

  // the opponent, with a wide-brimmed hat
  const g0 = GUNSLINGERS[0];
  const opp = createCharacter({ shirt: g0.shirt, pants: g0.pants, skin: '#c98e63' });
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: 0.8 });
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 16), hatMat);
  brim.position.y = 1.86;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.2, 14), hatMat);
  crown.position.y = 1.97;
  opp.group.add(brim, crown);
  opp.group.rotation.order = 'YXZ'; // so the fall tips him over his own heels
  opp.group.position.copy(oppSpot);
  const faceYaw = Math.atan2(mark.x - oppSpot.x, mark.z - oppSpot.z);
  opp.group.rotation.y = faceYaw;
  scene.add(opp.group);

  const rung = Math.max(0, Math.min(GUNSLINGERS.length, save?.quickdrawRung ?? 0));
  world.quickDraw = {
    pos, yaw, mark, oppSpot, opp, faceYaw,
    playerYaw: Math.atan2(oppSpot.x - mark.x, oppSpot.z - mark.z),
    state: 'idle',        // idle -> wait -> draw -> result -> idle
    t: 0,                 // seconds in the current state (draw: your reaction clock)
    waitT: 0,             // seconds of WAIT... left
    oppReact: 0,          // his reaction this round, seconds
    react: null,          // your last reaction, seconds (null on a foul / too slow)
    outcome: null,        // 'win' | 'lose' | 'foul'
    fall: 0,              // 0..1 how far he has toppled
    cooldown: 0,
    foeIdx: 0,            // index into GUNSLINGERS of this round's opponent
    rung,                 // gunslingers beaten (0..5); the next opponent is GUNSLINGERS[min(rung, 4)]
    bestMs: save?.quickdrawBestMs ?? 0,
    wins: 0,
    hud: null,
  };
  dressOpponent(world);
}

function current(Q) { return GUNSLINGERS[Math.min(Q.rung, GUNSLINGERS.length - 1)]; }
// the gunslinger in the current round (rung can move on mid-round when you win)
function foe(Q) { return GUNSLINGERS[Q.foeIdx]; }

function dressOpponent(world) {
  const Q = world.quickDraw, g = current(Q);
  const g0 = Q.opp.group;
  // recolour the torso and legs to this gunslinger's outfit
  const torso = g0.getObjectByName('shirt');
  if (torso?.material?.color) torso.material.color.set(g.shirt);
  for (const leg of [Q.opp.lLeg, Q.opp.rLeg]) {
    const m = leg?.children?.[0]?.material;
    if (m?.color) m.color.set(g.pants);
  }
}

function standUp(Q) {
  Q.fall = 0;
  Q.opp.group.rotation.x = 0;
  Q.opp.group.position.copy(Q.oppSpot);
}

function ensureHud(world) {
  const Q = world.quickDraw;
  if (Q.hud) return Q.hud;
  const el = document.createElement('div');
  el.id = 'quickdraw';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:340px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:10px 12px;' +
    'background:#1e1206e8;border:1px solid #ffb040;border-radius:6px;display:none;z-index:30;color:#fff0c8;font:600 13px system-ui;text-align:center';
  const head = document.createElement('div');
  head.style.cssText = 'font-weight:800;color:#ffb040;letter-spacing:1px;margin-bottom:4px';
  const big = document.createElement('div');
  big.style.cssText = 'font:900 44px Georgia, serif;letter-spacing:3px;line-height:1.15';
  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:12px;opacity:.85;margin-top:4px';
  el.append(head, big, sub);
  document.body.appendChild(el);
  Q.hud = { el, head, big, sub };
  return Q.hud;
}

function renderHud(world) {
  const Q = world.quickDraw, hud = ensureHud(world), g = foe(Q);
  hud.el.style.display = 'block';
  hud.head.textContent = `HIGH NOON · vs ${g.name} (${Q.foeIdx + 1}/${GUNSLINGERS.length})`;
  if (Q.state === 'wait') {
    hud.big.textContent = 'WAIT...';
    hud.big.style.color = '#d8c8a0';
    hud.sub.textContent = 'Hands still. Press E only when it says DRAW!';
  } else if (Q.state === 'draw') {
    hud.big.textContent = 'DRAW!';
    hud.big.style.color = '#ff5a3a';
    hud.sub.textContent = 'Press E!';
  } else if (Q.state === 'result') {
    const ms = Q.react != null ? `${Math.round(Q.react * 1000)} ms` : null;
    const his = `${Math.round(Q.oppReact * 1000)} ms`;
    if (Q.outcome === 'win') { hud.big.textContent = ms; hud.big.style.color = '#7cf78c'; hud.sub.textContent = `You beat him! His draw: ${his}`; }
    else if (Q.outcome === 'foul') { hud.big.textContent = 'FOUL!'; hud.big.style.color = '#ff5a4a'; hud.sub.textContent = 'You drew before the call.'; }
    else { hud.big.textContent = ms ?? 'TOO SLOW'; hud.big.style.color = '#ff5a4a'; hud.sub.textContent = `He was faster: ${his}`; }
  }
}

function hidePanel(Q) { if (Q.hud) Q.hud.el.style.display = 'none'; }

function finish(world, outcome) {
  const Q = world.quickDraw, g = foe(Q), player = world.player;
  Q.outcome = outcome;
  Q.state = 'result';
  Q.t = 0;
  if (outcome === 'win') {
    const ms = Math.round(Q.react * 1000);
    const champion = Q.rung >= GUNSLINGERS.length;
    const pay = champion ? REMATCH_PAY : g.pay;
    world.money += pay;
    Q.wins++;
    const newBest = !Q.bestMs || ms < Q.bestMs;
    if (newBest) Q.bestMs = ms;
    if (!champion) Q.rung++;
    sfxShot();
    sfxMissionPass();
    world.addXP?.(champion ? 15 : 20 + Q.rung * 10);
    addRep(world, champion ? 5 : 10 + Q.rung * 5);
    if (!champion && Q.rung >= GUNSLINGERS.length) {
      showMissionMsg('FASTEST GUN IN TOWN', `${g.name} is down in ${ms} ms · +$${pay}${newBest ? ' · NEW BEST!' : ''}`, '#ffb040');
      showNews('a stranger outdrew Kid Lightning at high noon');
    } else {
      showToast(`🤠 ${g.name} hits the dirt! ${ms} ms · +$${pay}${newBest ? ' · new best' : ''}`);
    }
    world.onSave?.();
  } else {
    sfxShot();
    sfxMissionFail();
    if (outcome === 'lose') {
      player.health = Math.max(1, player.health - HIT);
      showToast(`💥 ${g.name} got you first (${Math.round(Q.oppReact * 1000)} ms) · -${HIT} health`);
    } else {
      showToast(`🚫 Foul! You drew before the call`);
    }
  }
}

function endRound(world) {
  const Q = world.quickDraw;
  Q.state = 'idle';
  Q.cooldown = COOLDOWN;
  hidePanel(Q);
}

export function updateQuickDraw(world, dt, keys, pressed) {
  const Q = world.quickDraw;
  if (!Q) return;
  world.quickDrawHint = null;
  if (Q.cooldown > 0) Q.cooldown = Math.max(0, Q.cooldown - dt);

  const ch = Q.opp;
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;

  // the opponent: idle sway while standing, gun arm up once it's drawn,
  // toppled flat on his back after you win
  if (Q.fall > 0 || (Q.state === 'result' && Q.outcome === 'win')) {
    if (Q.state === 'result') Q.fall = Math.min(1, Q.fall + dt / 0.45);
    const k = Q.fall;
    ch.group.rotation.x = -Math.PI / 2 * k * k;
    ch.group.position.y = 0.15 * k;
  } else {
    animateIdle(ch);
    if (Q.state === 'result' || (Q.state === 'draw' && Q.t >= Q.oppReact * 0.6)) ch.rArm.rotation.x = -Math.PI / 2;
  }

  if (Q.state === 'idle') {
    // he gets back up once the cooldown runs out
    if (Q.fall > 0 && Q.cooldown <= 0) { standUp(Q); dressOpponent(world); }
    if (!onFoot) return;
    const d = Math.hypot(player.pos.x - Q.mark.x, player.pos.z - Q.mark.z);
    if (d > REACH) return;
    const g = current(Q);
    if (Q.cooldown > 0) { world.quickDrawHint = 'HIGH NOON — the dust is settling...'; return; }
    const ladder = Q.rung >= GUNSLINGERS.length ? 'champion rematch' : `gunslinger ${Q.rung + 1}/${GUNSLINGERS.length}`;
    world.quickDrawHint = `HIGH NOON — press <b>E</b> to call out <b>${g.name}</b> (${ladder})${Q.bestMs ? ` · best ${Q.bestMs} ms` : ''}`;
    if (pressed['KeyE']) {
      if (Q.fall > 0) { standUp(Q); dressOpponent(world); }
      Q.state = 'wait';
      Q.waitT = WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
      Q.t = 0;
      Q.react = null;
      Q.outcome = null;
      Q.foeIdx = Math.min(Q.rung, GUNSLINGERS.length - 1);
      // a hair of jitter so no two draws are identical, never quicker than listed
      Q.oppReact = g.react + Math.random() * 0.03;
      sfxPickup();
      renderHud(world); // the E that called him out must not also count as a draw
    }
    return;
  }

  // ---- a round is running: hold the player on the mark facing him ----
  if (!onFoot) { endRound(world); return; }
  player.pos.x = Q.mark.x; player.pos.z = Q.mark.z;
  player.vel.x = 0; player.vel.z = 0;
  player.heading = Q.playerYaw;

  if (Q.state === 'wait') {
    world.quickDrawHint = 'HIGH NOON — steady... wait for <b>DRAW!</b>';
    if (pressed['KeyE']) { finish(world, 'foul'); renderHud(world); return; }
    Q.waitT -= dt;
    if (Q.waitT <= 0) { Q.state = 'draw'; Q.t = 0; }
  } else if (Q.state === 'draw') {
    world.quickDrawHint = 'DRAW! press <b>E</b>!';
    Q.t += dt;
    if (pressed['KeyE']) {
      Q.react = Q.t;
      finish(world, Q.t < Q.oppReact ? 'win' : 'lose');
    } else if (Q.t >= Q.oppReact) {
      Q.react = null;
      finish(world, 'lose');
    }
  } else if (Q.state === 'result') {
    Q.t += dt;
    if (Q.t >= RESULT_TIME) { endRound(world); return; }
  }
  renderHud(world);
}

export function quickDrawSave(world) {
  return { quickdrawBestMs: world.quickDraw?.bestMs, quickdrawRung: world.quickDraw?.rung };
}
