import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked, BLOCK } from './city.js';
import { postSign, faceNearestRoad } from './propKit.js';
import { createCharacter, animateIdle, animateWalk } from './characters.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';
import { addCrime } from './police.js';

// PICKPOCKET: a hooded fence loiters by the bins near spawn. Press E for a
// mark: a big spender in a loud suit strolling the sidewalk ring of a nearby
// block. Creep up behind him, inside 1.5 m and in the cone at his back, and
// hold E for 1.5 s to lift the wallet. Every few seconds he stops and glances
// back. A "?" over his head gives 0.6 s warning. Stay in his sight within 6 m
// and suspicion climbs; get seen mid-lift or right behind him and he shouts
// "THIEF!" (+1 wanted star). Get the wallet to the fence within 60 s to be
// paid. Every clean job makes the next mark warier.

const LIFT_TIME = 1.5;      // seconds of holding E
const LIFT_R = 1.5;         // metres behind the mark
const BACK_CONE = Math.cos(THREE.MathUtils.degToRad(60)); // 120° cone behind his back
const SEE_CONE = Math.cos(THREE.MathUtils.degToRad(60));  // 120° cone in front
const SEE_R = 6;
const CLOSE_R = 3;          // "close behind": seen this near is as bad as lifting
const TELEGRAPH = 0.6;      // "?" shows this long before he turns
const TURN = 0.3;           // seconds to swing round (and back)
const WALK_SPEED = 1.35;
const FLEE_SPEED = 5.5;
const DELIVER_TIME = 60;
const COOLDOWN = 20;
const BASE_PAY = 220;
const PAY_STEP = 70;        // more per previous success (warier marks carry more)
const UP = new THREE.Vector3(0, 1, 0);
const _probe = new THREE.Vector3();

function blocked(world, x, z, pad) { return pointBlocked(_probe.set(x, 1, z), world.city.colliders, pad); }

function iconTexture(text, fg, bg) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill();
  g.lineWidth = 6; g.strokeStyle = fg; g.stroke();
  g.fillStyle = fg; g.font = `900 ${text.length > 1 ? 34 : 88}px Arial, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function initPickpocket(scene, world, save) {
  const city = world.city;
  let pos = city.spawn.clone().add(new THREE.Vector3(-44, 0, -20));
  if (blocked(world, pos.x, pos.z, 1.8)) pos = city.spawn.clone().add(new THREE.Vector3(-40, 0, -24));
  placeStreetSite(city, pos, 1.8, 'pickpocket-fence');
  const yaw = faceNearestRoad(city, pos);
  const local = (x, z) => new THREE.Vector3(x, 0, z).applyAxisAngle(UP, yaw).add(new THREE.Vector3(pos.x, 0, pos.z));

  // the fence: a hooded figure leaning by a dumpster under a dim sign
  const fence = createCharacter({ shirt: '#2b2e35', pants: '#1a1c21', skin: '#8d5a3a', hair: '#111111' });
  const hoodMat = new THREE.MeshStandardMaterial({ color: 0x2b2e35, roughness: 0.95 });
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), hoodMat);
  hood.position.set(0, 1.77, -0.03);
  hood.scale.set(1, 1.05, 1.1);
  fence.group.add(hood);
  const fenceSpot = local(0.4, 0.2);
  fence.group.position.copy(fenceSpot);
  fence.group.rotation.y = yaw;
  scene.add(fence.group);
  const bin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.9), new THREE.MeshStandardMaterial({ color: 0x2f4a32, roughness: 0.8, metalness: 0.2 }));
  bin.position.copy(local(-0.9, -0.7)).setY(0.55);
  bin.rotation.y = yaw;
  bin.castShadow = true;
  scene.add(bin);
  postSign(scene, city, pos, 'FENCE', { fg: '#c9c4d8', bg: '#121116', accent: '#7a4aff' }, { offset: 1.9, height: 2.3 });

  // the mark: loud suit, gold tie
  const mark = createCharacter({ shirt: '#ff2fa8', pants: '#ff2fa8', skin: '#e6b88f', hair: '#3a2614' });
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.03), new THREE.MeshStandardMaterial({ color: 0xffd040, roughness: 0.4, metalness: 0.5 }));
  tie.position.set(0, 1.3, 0.16);
  mark.group.add(tie);
  mark.group.visible = false;
  scene.add(mark.group);

  const iconMat = (t, fg, bg) => new THREE.SpriteMaterial({ map: iconTexture(t, fg, bg), transparent: true, depthTest: false, toneMapped: false });
  const query = new THREE.Sprite(iconMat('?', '#1a1406', '#ffd040'));
  const thief = new THREE.Sprite(iconMat('THIEF!', '#ffffff', '#d0201a'));
  for (const s of [query, thief]) { s.scale.set(0.7, 0.7, 1); s.visible = false; s.renderOrder = 5; scene.add(s); }
  thief.scale.set(1.1, 1.1, 1);

  world.pickpocket = {
    pos, fenceSpot, fence, mark, query, thief, yaw,
    state: 'idle',          // idle -> stalk -> deliver
    mode: 'hidden',         // the mark: hidden | walk | glance | flee
    route: null, s: 0, dir: 1,
    face: 0,                // mark's facing (rotation.y)
    glanceT: 0, glancePhase: 0, lookT: 0,
    suspicion: 0, lift: 0, timer: 0, fleeT: 0, anim: 0,
    cooldown: 0,
    blip: { x: 0, z: 0 },
    hud: null,
    score: save?.pickpocketScore ?? 0,
  };
}

// ---- the mark's route: the sidewalk ring of a nearby block ----

function makeRoute(walk, inset) {
  const h = BLOCK / 2 - inset;
  const pts = [[walk.x - h, walk.z - h], [walk.x + h, walk.z - h], [walk.x + h, walk.z + h], [walk.x - h, walk.z + h]];
  return { pts, side: 2 * h, len: 8 * h, cx: walk.x, cz: walk.z };
}

function routePoint(r, s, out) {
  s = ((s % r.len) + r.len) % r.len;
  const i = Math.floor(s / r.side), k = (s - i * r.side) / r.side;
  const a = r.pts[i], b = r.pts[(i + 1) % 4];
  out.x = a[0] + (b[0] - a[0]) * k;
  out.z = a[1] + (b[1] - a[1]) * k;
  out.dx = Math.sign(b[0] - a[0]); out.dz = Math.sign(b[1] - a[1]);
  return out;
}

// Route cost: Infinity if any sample is inside a building or collider,
// otherwise the number of samples that brush another activity's site (the
// mark sidesteps those as he walks, but fewer is better).
function routeCost(world, r) {
  const sites = world.city.activitySites || [];
  const p = {};
  let cost = 0;
  for (let s = 0; s < r.len; s += 1) {
    routePoint(r, s, p);
    if (blocked(world, p.x, p.z, 0.35)) return Infinity;
    if (sites.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < t.radius + 0.8)) cost++;
  }
  return cost;
}

function pickRoute(world) {
  const p = world.player.pos;
  const walks = world.city.walks.filter((w) => !w.authored)
    .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, 9);
  let best = null, bestCost = Infinity;
  for (const [i, w] of walks.entries()) {
    for (const inset of [2.6, 3.4, 4.2, 5.0, 2.0]) {
      const r = makeRoute(w, inset);
      const cost = routeCost(world, r) + i * 2; // nearer blocks preferred
      if (cost < bestCost) { best = r; bestCost = cost; }
    }
  }
  return best;
}

// nearest arc-length on the loop to a point
function projectOnRoute(r, x, z) {
  let best = 0, bestD = Infinity;
  const q = {};
  for (let s = 0; s < r.len; s += 1) {
    routePoint(r, s, q);
    const d = Math.hypot(q.x - x, q.z - z);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

function glanceGap(P) {
  const war = Math.min(P.score, 8);
  return Math.max(2.2, 7.5 - war * 0.65) + Math.random() * Math.max(1, 3 - war * 0.25);
}
function lookTime(P) { return Math.min(2.6, 1.4 + P.score * 0.15); }

// ---- HUD: suspicion and lift meters ----

function ensureHud(world) {
  const P = world.pickpocket;
  if (P.hud) return P.hud;
  const el = document.createElement('div');
  el.id = 'pickpocket';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:340px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#1a0e08e0;border:1px solid #c08aff;border-radius:6px;display:none;z-index:30;color:#fff3c8;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#c08aff';
  const title = document.createElement('span');
  const right = document.createElement('span');
  head.append(title, right);
  const meter = (name) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:3px 4px';
    const label = document.createElement('span');
    label.style.cssText = 'width:120px';
    label.textContent = name;
    const bar = document.createElement('div');
    bar.style.cssText = 'flex:1;height:8px;background:#0006;border-radius:4px;overflow:hidden';
    const fill = document.createElement('div');
    fill.style.cssText = 'height:100%;width:0%';
    bar.appendChild(fill);
    row.append(label, bar);
    el.appendChild(row);
    return { row, fill };
  };
  el.appendChild(head);
  const sus = meter('👁 Suspicion');
  const lift = meter('👛 Wallet');
  lift.fill.style.background = '#c08aff';
  document.body.appendChild(el);
  P.hud = { el, title, right, sus, lift };
  return P.hud;
}

function renderHud(world) {
  const P = world.pickpocket, hud = ensureHud(world);
  if (P.state === 'stalk') {
    hud.title.textContent = `PICKPOCKET  mark #${P.score + 1}`;
    hud.right.textContent = P.mode === 'glance' ? 'he\'s looking!' : P.query.visible ? 'he\'s about to turn…' : 'stay behind him';
    hud.sus.row.style.display = 'flex';
    hud.lift.row.style.display = 'flex';
    const s = Math.min(100, P.suspicion);
    hud.sus.fill.style.width = `${Math.round(s)}%`;
    hud.sus.fill.style.background = s < 40 ? '#5fd16a' : s < 75 ? '#ffc040' : '#ff5a4a';
    hud.lift.fill.style.width = `${Math.round(Math.min(1, P.lift) * 100)}%`;
  } else {
    hud.title.textContent = 'WALLET LIFTED';
    hud.right.textContent = `to the fence · ${Math.ceil(P.timer)}s`;
    hud.sus.row.style.display = 'none';
    hud.lift.row.style.display = 'none';
  }
}

// ---- job lifecycle ----

function startJob(world) {
  const P = world.pickpocket;
  const r = pickRoute(world);
  if (!r) { showToast('No marks around right now'); P.cooldown = 5; return; }
  P.route = r;
  // start him ~25 m along the loop from you, walking away
  const s0 = projectOnRoute(r, world.player.pos.x, world.player.pos.z);
  P.dir = Math.random() < 0.5 ? 1 : -1;
  P.s = s0 + P.dir * 25;
  const q = routePoint(r, P.s, {});
  P.mark.group.position.set(q.x, 0, q.z);
  P.face = Math.atan2(q.dx * P.dir, q.dz * P.dir);
  P.mark.group.rotation.set(0, P.face, 0);
  P.mark.group.visible = true;
  P.mode = 'walk';
  P.glanceT = glanceGap(P) + 2;
  P.suspicion = 0; P.lift = 0;
  P.state = 'stalk';
  ensureHud(world).el.style.display = 'block';
  sfxPickup();
  showMissionMsg('THE MARK', 'Pink suit, fat wallet. Sneak up behind him and hold E. Watch for the "?"', '#c08aff');
}

function hideMark(P) {
  P.mode = 'hidden';
  P.mark.group.visible = false;
  P.query.visible = false;
  P.thief.visible = false;
}

function endJob(world, outcome) {
  const P = world.pickpocket;
  P.state = 'idle';
  P.cooldown = outcome === 'paid' ? COOLDOWN : outcome === 'vehicle' ? 8 : COOLDOWN;
  P.lift = 0;
  if (P.mode !== 'flee') hideMark(P);
  P.query.visible = false;
  if (P.hud) P.hud.el.style.display = 'none';
  world.pickpocketBlip = null;
  world.pickpocketHint = null;
  if (outcome === 'paid') {
    const pay = BASE_PAY + PAY_STEP * Math.min(P.score, 10) + Math.round(P.timer * 3);
    world.money += pay;
    P.score++;
    addRep(world, 40 + 10 * Math.min(P.score, 10));
    world.addXP?.(60 + 10 * Math.min(P.score, 10));
    sfxMissionPass();
    showMissionMsg('FENCED', `+$${pay} for the wallet · the next mark will be warier`, '#c08aff');
    if (P.score % 5 === 0) showNews('police warn shoppers: a pickpocket is working the sidewalks downtown');
    world.onSave?.();
  } else if (outcome === 'late') {
    sfxMissionFail();
    showMissionMsg('FENCE GONE', 'You took too long — the fence won\'t touch it now', '#ff5a4a');
  } else if (outcome === 'vehicle') {
    showToast('Pickpocket job dropped — no lifting from behind a wheel');
  }
}

function caught(world) {
  const P = world.pickpocket;
  addCrime(world, 1, { witnessed: true });
  P.mode = 'flee';
  P.fleeT = 3;
  P.thief.visible = true;
  P.query.visible = false;
  sfxMissionFail();
  showMissionMsg('"THIEF!"', 'The mark spotted you — the cops are on their way', '#ff5a4a');
  endJob(world, 'caught');
}

// ---- per-frame ----

const _q = {};

function stepMark(world, P, dt, speed) {
  const r = P.route;
  P.s += P.dir * speed * dt;
  const q = routePoint(r, P.s, _q);
  let x = q.x, z = q.z;
  // street furniture streams in near the player: sidestep anything solid
  if (blocked(world, x, z, 0.3)) {
    const ix = -q.dz * P.dir, iz = q.dx * P.dir; // perpendicular
    for (const k of [0.9, -0.9, 1.6]) {
      if (!blocked(world, x + ix * k, z + iz * k, 0.3)) { x += ix * k; z += iz * k; break; }
    }
  }
  // step inward (toward the buildings, away from the road) round other activities' props
  for (const t of world.city.activitySites || []) {
    const dd = Math.hypot(t.x - x, t.z - z), need = t.radius + 0.8 - dd;
    if (need <= 0) continue;
    const ix = Math.sign(r.cx - x) * Math.abs(q.dz), iz = Math.sign(r.cz - z) * Math.abs(q.dx);
    const k = Math.min(2.6, need + 0.2);
    if (!blocked(world, x + ix * k, z + iz * k, 0.3)) { x += ix * k; z += iz * k; }
  }
  const g = P.mark.group;
  g.position.x += (x - g.position.x) * Math.min(1, dt * 8);
  g.position.z += (z - g.position.z) * Math.min(1, dt * 8);
  return Math.atan2(q.dx * P.dir, q.dz * P.dir);
}

function angleLerp(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

function updateMark(world, dt) {
  const P = world.pickpocket, g = P.mark.group;
  if (P.mode === 'hidden') return;
  P.anim += dt;
  if (P.mode === 'flee') {
    const face = stepMark(world, P, dt, FLEE_SPEED);
    P.face = angleLerp(P.face, face, Math.min(1, dt * 10));
    animateWalk(P.mark, P.anim * 12, 0.95);
    P.fleeT -= dt;
    P.thief.position.set(g.position.x, 2.6, g.position.z);
    if (P.fleeT <= 0) hideMark(P);
  } else if (P.mode === 'walk') {
    const face = stepMark(world, P, dt, WALK_SPEED);
    P.face = angleLerp(P.face, face, Math.min(1, dt * 6));
    animateWalk(P.mark, P.anim * 6, 0.45);
    if (P.state === 'stalk') {
      P.glanceT -= dt;
      P.query.visible = P.glanceT <= TELEGRAPH;
      if (P.glanceT <= 0) { P.mode = 'glance'; P.glancePhase = 0; P.lookT = lookTime(P); P.walkFace = face; }
    }
  } else if (P.mode === 'glance') {
    // turn round, look, turn back
    P.glancePhase += dt;
    const back = P.walkFace + Math.PI;
    if (P.glancePhase < TURN) P.face = angleLerp(P.walkFace, back, P.glancePhase / TURN);
    else if (P.glancePhase < TURN + P.lookT) P.face = back;
    else if (P.glancePhase < TURN * 2 + P.lookT) P.face = angleLerp(back, P.walkFace, (P.glancePhase - TURN - P.lookT) / TURN);
    else { P.face = P.walkFace; P.mode = 'walk'; P.glanceT = glanceGap(P); P.query.visible = false; }
    animateIdle(P.mark);
    P.query.visible = P.glancePhase < TURN + P.lookT;
  }
  g.rotation.y = P.face;
  if (P.query.visible) P.query.position.set(g.position.x, 2.35, g.position.z);
}

export function updatePickpocket(world, dt, keys, pressed) {
  const P = world.pickpocket;
  if (!P) return;
  world.pickpocketHint = null;
  if (P.cooldown > 0) P.cooldown = Math.max(0, P.cooldown - dt);
  animateIdle(P.fence);
  updateMark(world, dt);

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat && !player.inPlane;
  const dFence = Math.hypot(player.pos.x - P.fenceSpot.x, player.pos.z - P.fenceSpot.z);
  const atFence = onFoot && dFence < 2.8 && player.pos.y < 3;

  if (P.state === 'idle') {
    if (!atFence) return;
    if (P.cooldown > 0) { world.pickpocketHint = 'FENCE — "Lay low a bit. Come back later."'; return; }
    if (world.wanted > 0) { world.pickpocketHint = 'FENCE — "You\'re hot. Lose the cops first."'; return; }
    world.pickpocketHint = `FENCE — press <b>E</b> to get a mark to pickpocket${P.score ? ` (${P.score} wallets fenced)` : ''}`;
    if (pressed['KeyE']) startJob(world);
    return;
  }

  if (!onFoot) { endJob(world, 'vehicle'); return; }

  if (P.state === 'deliver') {
    P.timer -= dt;
    if (P.timer <= 0) { endJob(world, 'late'); return; }
    P.blip.x = P.fenceSpot.x; P.blip.z = P.fenceSpot.z;
    world.pickpocketBlip = P.blip;
    if (atFence) {
      world.pickpocketHint = 'FENCE — press <b>E</b> to hand over the wallet';
      if (pressed['KeyE']) { endJob(world, 'paid'); return; }
    } else {
      world.pickpocketHint = `WALLET LIFTED — get it to the <b>fence</b> (${Math.round(dFence)}m) · <b>${Math.ceil(P.timer)}s</b>`;
    }
    // once he's out of sight, he's gone
    if (P.mode === 'walk' && Math.hypot(player.pos.x - P.mark.group.position.x, player.pos.z - P.mark.group.position.z) > 60) hideMark(P);
    renderHud(world);
    return;
  }

  // ---- stalk ----
  const g = P.mark.group;
  const rx = player.pos.x - g.position.x, rz = player.pos.z - g.position.z;
  const d = Math.hypot(rx, rz) || 1e-6;
  const fx = Math.sin(P.face), fz = Math.cos(P.face);
  const facing = (rx * fx + rz * fz) / d;   // +1: right in front of him, -1: right behind
  const level = Math.abs(player.pos.y - g.position.y) < 1.5;
  const behind = level && d <= LIFT_R && -facing >= BACK_CONE;
  const lifting = behind && !!keys['KeyE'];

  // suspicion: he can only see you while he's turned round to look
  const looking = P.mode === 'glance' && P.glancePhase >= TURN * 0.6 && P.glancePhase < TURN + P.lookT;
  const inSight = looking && level && d < SEE_R && facing >= SEE_CONE;
  const war = 1 + Math.min(P.score, 8) * 0.15;
  if (inSight && (P.lift > 0.05 || keys['KeyE'] || d < CLOSE_R)) P.suspicion = 100;
  else if (inSight) P.suspicion += (45 + 90 * (1 - d / SEE_R)) * war * dt;
  else if (P.mode === 'walk' && level && d < 1.2 && !behind) P.suspicion += 30 * war * dt; // bumping into him
  else P.suspicion = Math.max(0, P.suspicion - 12 * dt);
  if (P.suspicion >= 100) { caught(world); return; }

  // the lift
  if (lifting && P.mode === 'walk') {
    P.lift += dt / LIFT_TIME;
    if (P.lift >= 1) {
      P.lift = 0;
      P.state = 'deliver';
      P.timer = DELIVER_TIME;
      P.query.visible = false;
      sfxPickup();
      showMissionMsg('GOT IT', `Wallet lifted — get it to the fence within ${DELIVER_TIME}s`, '#c08aff');
      renderHud(world);
      return;
    }
  } else {
    P.lift = Math.max(0, P.lift - dt * 0.8);
  }

  P.blip.x = g.position.x; P.blip.z = g.position.z;
  world.pickpocketBlip = P.blip;
  if (lifting) world.pickpocketHint = `LIFTING… <b>${Math.round(P.lift * 100)}%</b> — keep holding <b>E</b>`;
  else if (behind) world.pickpocketHint = 'PICKPOCKET — right behind him: hold <b>E</b> to lift the wallet';
  else if (P.query.visible) world.pickpocketHint = 'PICKPOCKET — <b>?</b> he\'s about to look round, back off!';
  else world.pickpocketHint = `PICKPOCKET — creep up <b>behind</b> the pink suit (${Math.round(d)}m)`;
  renderHud(world);
}

export function pickpocketSave(world) {
  return { pickpocketScore: world.pickpocket?.score };
}
