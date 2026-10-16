import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { postSign, faceNearestRoad } from './propKit.js';
import { createCharacter, randomOutfit, animateIdle, animateWalk } from './characters.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';
import { mouse } from './input.js';

// LIVING STATUE: a marble plinth with a tip hat and an easel sign. Press E to
// step up and strike a pose, then hold perfectly still: ANY key or mouse
// movement breaks it. Passers-by stop to watch and drop coins in the hat, and
// the longer you hold, the bigger the stillness multiplier on every tip. Tips
// already in the hat are yours to keep; breaking the pose just sends the crowd
// off booing. Breaking the pose is also how you step down.

const PLINTH_TOP = 1.32;     // standing height on the plinth
const REACH = 2.6;           // from the plinth centre to step up
const GRACE = 0.8;           // seconds to settle into the pose before stillness counts
const MOUSE_SLACK = 1;       // mouse counts per frame ignored as sensor jitter
const MULT_RATE = 12;        // seconds of stillness per +1 multiplier
const MULT_MAX = 5;
const CROWD = 4;
const WALK_SPEED = 1.5;
const COOLDOWN = 4;
const STONE = new THREE.Color(0x9c9a94);

export function initLivingStatue(scene, world, save) {
  const pos = world.city.spawn.clone().add(new THREE.Vector3(12, 0, -36));
  placeStreetSite(world.city, pos, 3.6, 'living-statue'); // plinth plus room for the crowd
  postSign(scene, world.city, pos, 'LIVING STATUE', { fg: '#f6f1e6', bg: '#2a2622', accent: '#d8c39a' }, { offset: 2.6 });
  const yaw = faceNearestRoad(world.city, pos); // the crowd gathers on the street side (local +z)

  const group = new THREE.Group();
  const marble = new THREE.MeshStandardMaterial({ color: 0xe2ddd2, roughness: 0.45 });
  const vein = new THREE.MeshStandardMaterial({ color: 0xb9b3a6, roughness: 0.55 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8b04a, roughness: 0.3, metalness: 0.85 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6, side: THREE.DoubleSide });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: 0.8 });
  const add = (geo, mat, x, y, z, parent = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  // a classical plinth: stepped base, die, gilded band and a moulded cap
  add(new THREE.BoxGeometry(1.5, 0.16, 1.5), vein, 0, 0.08, 0);
  add(new THREE.BoxGeometry(1.32, 0.12, 1.32), marble, 0, 0.22, 0);
  add(new THREE.BoxGeometry(1.08, 0.86, 1.08), marble, 0, 0.71, 0);
  add(new THREE.BoxGeometry(1.1, 0.06, 1.1), gold, 0, 1.0, 0);
  add(new THREE.BoxGeometry(1.24, 0.1, 1.24), vein, 0, 1.12, 0);
  add(new THREE.BoxGeometry(1.32, 0.15, 1.32), marble, 0, PLINTH_TOP - 0.075, 0);
  add(new THREE.BoxGeometry(0.62, 0.16, 0.02), gold, 0, 0.72, 0.55); // a blank brass plate

  // the tip hat, upside down on the pavement in front
  const hat = new THREE.Group();
  add(new THREE.CylinderGeometry(0.2, 0.19, 0.26, 18, 1, true), black, 0, 0.13, 0, hat);
  add(new THREE.CylinderGeometry(0.19, 0.19, 0.01, 18), black, 0, 0.005, 0, hat);
  add(new THREE.CylinderGeometry(0.31, 0.31, 0.015, 24), black, 0, 0.26, 0, hat);
  add(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 18), new THREE.MeshStandardMaterial({ color: 0x7a1a22, roughness: 0.7 }), 0, 0.22, 0, hat);
  hat.position.set(0, 0, 1.05);
  group.add(hat);
  const hatCoins = add(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 16), gold, 0, 0.03, 1.05);
  hatCoins.visible = false;

  // an A-frame easel: LIVING STATUE / TIPS WELCOME
  const easel = new THREE.Group();
  for (const s of [-1, 1]) {
    const leg = add(new THREE.BoxGeometry(0.05, 1.25, 0.05), wood, s * 0.38, 0.6, 0.12, easel);
    leg.rotation.x = -0.12;
    const back = add(new THREE.BoxGeometry(0.05, 1.2, 0.05), wood, s * 0.38, 0.58, -0.18, easel);
    back.rotation.x = 0.28;
  }
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.72), new THREE.MeshBasicMaterial({ map: easelTexture(), toneMapped: false }));
  board.position.set(0, 0.86, 0.17);
  board.rotation.x = -0.12;
  easel.add(board);
  easel.position.set(1.45, 0, 1.15);
  easel.rotation.y = -0.35;
  group.add(easel);

  group.position.set(pos.x, 0, pos.z);
  group.rotation.y = yaw;
  scene.add(group);
  // solid plinth you can stand on (its top is walkable ground)
  world.city.colliders.push({ x0: pos.x - 0.68, x1: pos.x + 0.68, z0: pos.z - 0.68, z1: pos.z + 0.68, h: PLINTH_TOP + 0.08, roofY: PLINTH_TOP });

  const local = (x, z) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(pos.x, 0, pos.z));
  const spots = [local(-1.5, 2.3), local(1.5, 2.4), local(-0.5, 2.9), local(0.6, 2.85)];
  const entries = [local(-7.5, 4.6), local(7.5, 4.6)];
  const hatPos = local(0, 1.05);

  // a pool of passers-by, reused show to show
  const people = [];
  for (let i = 0; i < CROWD; i++) {
    const ch = createCharacter(randomOutfit());
    ch.group.visible = false;
    scene.add(ch.group);
    people.push({ ch, state: 'free', slot: i, t: 0, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), tipT: 0 });
  }

  // coins flicked from a watcher into the hat
  const coinGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.012, 12);
  const coins = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(coinGeo, gold);
    m.visible = false;
    scene.add(m);
    coins.push({ mesh: m, t: 0, from: new THREE.Vector3(), live: false });
  }

  world.livingStatue = {
    pos, yaw, spots, entries, hatPos, hatCoins, people, coins,
    state: 'idle',        // idle -> pose
    t: 0,                 // seconds since stepping up
    held: 0,              // seconds of counted stillness
    mult: 1, earned: 0, tips: 0,
    arriveT: 0, cooldown: 0,
    prevDown: false, prevRdown: false,
    tint: null,           // Map(material -> original colour) while posing
    hud: null,
    best: save?.statueBestSeconds ?? 0,
    lastBreak: null,      // why the last pose ended (for tests and the summary)
  };
}

function easelTexture() {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f3ecdc';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#8a6a3a';
  g.lineWidth = 10;
  g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.fillStyle = '#2a2622';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const fit = (text, size, y, weight = 900) => {
    g.font = `${weight} ${size}px Georgia, serif`;
    while (size > 16 && g.measureText(text).width > c.width - 40) { size -= 2; g.font = `${weight} ${size}px Georgia, serif`; }
    g.fillText(text, c.width / 2, y);
  };
  fit('LIVING', 64, 66);
  fit('STATUE', 64, 128);
  g.fillStyle = '#8a1a22';
  fit('— TIPS WELCOME —', 30, 196, 700);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ensureHud(world) {
  const S = world.livingStatue;
  if (S.hud) return S.hud;
  const el = document.createElement('div');
  el.id = 'livingstatue';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:320px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#1c1b19e0;border:1px solid #d8c39a;border-radius:6px;display:none;z-index:30;color:#f6f1e6;font:600 13px system-ui;pointer-events:none';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#d8c39a';
  const title = document.createElement('span');
  title.textContent = '🗿 LIVING STATUE';
  const time = document.createElement('span');
  head.append(title, time);
  const bar = document.createElement('div');
  bar.style.cssText = 'height:8px;background:#0006;border-radius:4px;overflow:hidden;margin-bottom:6px';
  const fill = document.createElement('div');
  fill.style.cssText = 'height:100%;width:0%;background:#d8c39a';
  bar.appendChild(fill);
  const stats = document.createElement('div');
  stats.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px';
  const multEl = document.createElement('span');
  const tipsEl = document.createElement('span');
  stats.append(multEl, tipsEl);
  const note = document.createElement('div');
  note.style.cssText = 'font-size:12px;opacity:.75';
  el.append(head, bar, stats, note);
  document.body.appendChild(el);
  S.hud = { el, time, fill, multEl, tipsEl, note };
  return S.hud;
}

function renderHud(world) {
  const S = world.livingStatue, hud = ensureHud(world);
  const watching = S.people.filter((p) => p.state === 'watching').length;
  hud.time.textContent = `${S.held.toFixed(1)}s${S.best ? ` · best ${Math.floor(S.best)}s` : ''}`;
  hud.fill.style.width = `${Math.round(((S.mult - 1) / (MULT_MAX - 1)) * 100)}%`;
  hud.multEl.textContent = `stillness ×${S.mult.toFixed(1)}`;
  hud.tipsEl.textContent = `👥 ${watching} · tips $${S.earned}`;
  hud.note.textContent = S.t < GRACE
    ? 'Settling into the pose...'
    : 'Hold perfectly still. Any key or mouse movement breaks the pose (and steps you down).';
}

// ---- stone tint on the player's own materials, restored exactly afterwards ----
function collectMaterials(ch) {
  const out = new Set();
  const skip = ch.weapon?.group;
  const walk = (o) => {
    if (o === skip) return; // weapon parts may share materials with other models
    if (o.isMesh && o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m?.color) out.add(m);
    for (const c of o.children) walk(c);
  };
  walk(ch.group);
  return out;
}

function applyTint(world, k) {
  const S = world.livingStatue, ch = world.player.ch;
  if (!ch?.group) return;
  if (!S.tint) {
    S.tint = new Map();
    for (const m of collectMaterials(ch)) S.tint.set(m, m.color.clone());
  }
  for (const [m, orig] of S.tint) m.color.copy(orig).lerp(STONE, k);
}

function clearTint(world) {
  const S = world.livingStatue;
  if (!S.tint) return;
  for (const [m, orig] of S.tint) m.color.copy(orig);
  S.tint = null;
}

// ---- the crowd ----
function walkTo(p, to, state) {
  p.from.copy(p.ch.group.position);
  p.to.copy(to);
  p.t = 0;
  p.dur = Math.max(0.4, p.from.distanceTo(p.to) / WALK_SPEED);
  p.state = state;
  p.ch.group.rotation.y = Math.atan2(p.to.x - p.from.x, p.to.z - p.from.z);
}

function arrive(world) {
  const S = world.livingStatue;
  const p = S.people.find((x) => x.state === 'free');
  if (!p) return;
  const entry = S.entries[(Math.random() * 2) | 0];
  p.ch.group.position.copy(entry);
  p.ch.group.visible = true;
  p.tipT = 1.5 + Math.random() * 2.5;
  walkTo(p, S.spots[p.slot], 'arriving');
}

function disperse(world) {
  const S = world.livingStatue;
  let n = 0;
  for (const p of S.people) {
    if (p.state !== 'arriving' && p.state !== 'watching') continue;
    n++;
    // head for whichever end of the street is nearer
    const e = S.entries[0].distanceTo(p.ch.group.position) < S.entries[1].distanceTo(p.ch.group.position) ? S.entries[0] : S.entries[1];
    walkTo(p, e, 'leaving');
  }
  return n;
}

function tip(world, p) {
  const S = world.livingStatue;
  const amount = Math.max(1, Math.round((1 + Math.random() * 3) * S.mult * (world.payMult || 1)));
  world.money += amount;
  S.earned += amount;
  S.tips++;
  S.hatCoins.visible = true;
  const c = S.coins.find((x) => !x.live) || S.coins[0];
  c.from.set(p.ch.group.position.x, 1.2, p.ch.group.position.z);
  c.t = 0; c.live = true;
  c.mesh.position.copy(c.from);
  c.mesh.visible = true;
  sfxPickup();
}

function updateCrowd(world, dt) {
  const S = world.livingStatue;
  for (const p of S.people) {
    if (p.state === 'free') continue;
    if (p.state === 'watching') {
      animateIdle(p.ch);
      if (S.state === 'pose' && S.t >= GRACE) {
        p.tipT -= dt;
        if (p.tipT <= 0) { tip(world, p); p.tipT = 2.5 + Math.random() * 3; }
      }
      continue;
    }
    p.t += dt;
    const k = Math.min(1, p.t / p.dur);
    p.ch.group.position.lerpVectors(p.from, p.to, k);
    animateWalk(p.ch, p.t * 7, 0.55);
    if (k < 1) continue;
    if (p.state === 'arriving') {
      p.state = 'watching';
      p.ch.group.rotation.y = Math.atan2(S.pos.x - p.to.x, S.pos.z - p.to.z); // face the statue
    } else {
      p.state = 'free';
      p.ch.group.visible = false;
    }
  }
  for (const c of S.coins) {
    if (!c.live) continue;
    c.t += dt;
    const k = Math.min(1, c.t / 0.55);
    c.mesh.position.lerpVectors(c.from, S.hatPos, k);
    c.mesh.position.y = c.from.y * (1 - k) + 0.25 * k + Math.sin(k * Math.PI) * 0.6;
    c.mesh.rotation.x += dt * 18;
    if (k >= 1) { c.live = false; c.mesh.visible = false; }
  }
}

// did the player do anything at all this frame?
function fidgeted(S, pressed) {
  for (const k in pressed) if (pressed[k]) return `pressed ${k}`;
  if (Math.abs(mouse.dx) > MOUSE_SLACK || Math.abs(mouse.dy) > MOUSE_SLACK) return 'moved the mouse';
  if (mouse.wheel) return 'scrolled';
  if ((mouse.down && !S.prevDown) || (mouse.rdown && !S.prevRdown)) return 'clicked';
  return null;
}

function breakPose(world, why) {
  const S = world.livingStatue;
  S.state = 'idle';
  S.cooldown = COOLDOWN;
  S.lastBreak = why;
  clearTint(world);
  if (S.hud) S.hud.el.style.display = 'none';
  const left = disperse(world);
  const secs = Math.floor(S.held);
  const newBest = S.held > S.best + 0.05;
  if (newBest) S.best = Math.round(S.held * 10) / 10;
  if (secs >= 5) {
    addRep(world, Math.floor(secs / 5));
    world.addXP?.(Math.floor(secs / 3));
  }
  if (left > 0) showToast('🗣️ BOOOO! The crowd shuffles off');
  (newBest && secs >= 20 ? sfxMissionPass : sfxMissionFail)();
  showMissionMsg('POSE BROKEN', `${secs}s of stillness · ${S.tips} tips · $${S.earned} in the hat${newBest ? ' · NEW BEST!' : ''}`, '#d8c39a');
  if (secs >= 120) showNews('a living statue near downtown hasn\'t blinked in minutes');
  world.onSave?.();
}

export function updateLivingStatue(world, dt, keys, pressed) {
  const S = world.livingStatue;
  if (!S) return;
  world.livingStatueHint = null;
  if (S.cooldown > 0) S.cooldown = Math.max(0, S.cooldown - dt);
  updateCrowd(world, dt);

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat && !player.inPlane;

  if (S.state === 'idle') {
    S.hatCoins.visible = S.cooldown > 0 && S.earned > 0;
    const d = Math.hypot(player.pos.x - S.pos.x, player.pos.z - S.pos.z);
    if (!onFoot || d > REACH) return;
    if (S.cooldown > 0) { world.livingStatueHint = 'LIVING STATUE — shaking out the pins and needles...'; return; }
    world.livingStatueHint = `LIVING STATUE — press <b>E</b> to step up and strike a pose. Any key or mouse movement steps you down${S.best ? ` (best ${Math.floor(S.best)}s)` : ''}`;
    if (pressed['KeyE']) {
      S.state = 'pose';
      S.t = 0; S.held = 0; S.mult = 1; S.earned = 0; S.tips = 0;
      S.arriveT = 2;
      S.lastBreak = null;
      S.prevDown = mouse.down; S.prevRdown = mouse.rdown;
      player.pos.set(S.pos.x, PLINTH_TOP, S.pos.z);
      player.vel.set(0, 0, 0);
      player.vy = 0;
      player.onGround = true;
      ensureHud(world).el.style.display = 'block';
      sfxPickup();
      showMissionMsg('LIVING STATUE', 'Strike a pose and hold perfectly still. Any key or mouse movement breaks it', '#d8c39a');
    }
    return;
  }

  // ---- performing: held on the plinth ----
  if (!onFoot) { breakPose(world, 'left on foot'); return; }
  S.t += dt;
  if (S.t >= GRACE) {
    const why = fidgeted(S, pressed);
    if (why) { breakPose(world, why); return; }
    S.held += dt;
  }
  S.prevDown = mouse.down; S.prevRdown = mouse.rdown;
  player.pos.x = S.pos.x; player.pos.z = S.pos.z;
  if (player.pos.y < PLINTH_TOP) { player.pos.y = PLINTH_TOP; player.vy = 0; player.onGround = true; }
  player.vel.x = 0; player.vel.z = 0;

  const prevMult = Math.floor(S.mult);
  S.mult = Math.min(MULT_MAX, 1 + S.held / MULT_RATE);
  if (Math.floor(S.mult) > prevMult) showToast(`🗿 The crowd is spellbound · stillness ×${Math.floor(S.mult)}`);
  applyTint(world, Math.min(1, S.t / GRACE) * 0.85);

  // a bigger crowd gathers the longer you hold
  const want = S.held < 15 ? 2 : S.held < 35 ? 3 : 4;
  const present = S.people.filter((p) => p.state === 'arriving' || p.state === 'watching').length;
  S.arriveT -= dt;
  if (present < want && S.arriveT <= 0) { arrive(world); S.arriveT = 3 + Math.random() * 3; }

  world.livingStatueHint = 'LIVING STATUE — hold perfectly still... any key or mouse movement steps you down';
  renderHud(world);
}

export function livingStatueSave(world) {
  return { statueBestSeconds: world.livingStatue?.best ?? 0 };
}
