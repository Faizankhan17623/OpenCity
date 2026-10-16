import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked, groundHeight, invalidateColliderGrid } from './city.js';
import { postSign, faceNearestRoad } from './propKit.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// VERTICAL LIMIT: a 12 m outdoor climbing wall on a plaza near spawn. Pay $10
// and press E to clip in. You climb by ALTERNATING hands: 1 = left, 2 = right.
// The hold you're reaching for pulses on a beat: press while it glows bright
// for a good grip (one move up); press while it's dim and you slip down a
// move. Using the same hand twice or mashing burns stamina fast; pause for a
// moment and it creeps back. Two rest ledges let you press 3 for a full
// recovery at the cost of 3 seconds. Hit 0 stamina and you peel off and the
// auto-belay lowers you down. Ring the bell at the top inside 60 s to get paid
// by time. 0 lets go.

const WALL_H = 12;
const WALL_W = 4.4;
const FACE_Z = -0.6;        // climbing face, local z (local +z faces the road)
const HOLD_OUT = 0.55;      // climber's centre out from the face
const MOVES = 24;           // moves from the mat to the bell
const FOOT0 = 0.25;         // feet on the mat
const FOOT_TOP = 10.1;      // feet when the hand reaches the bell
const MOVE_H = (FOOT_TOP - FOOT0) / MOVES;
const LEDGES = [8, 16];     // moves at which you stand on a rest ledge
const COST = 10;
const TIME_LIMIT = 60;
const PERIOD_START = 0.85, PERIOD_END = 0.62; // grip pulse period (s), tightening as you climb
const BRIGHT_LO = 0.3, BRIGHT_HI = 0.7;       // bright part of each pulse
const STAM_MAX = 100;
const STAM_MOVE = 3.5, STAM_SLIP = 7, STAM_SAME = 15, STAM_MASH = 12;
const MASH_GAP = 0.16;      // presses closer than this are mashing
const REGEN_AFTER = 1.0, REGEN_RATE = 14;
const REST_TIME = 3;
const LOWER_SPEED = 1.5;
const PAY_BASE = 40, PAY_PER_SEC = 8;
const COOLDOWN = 4;
const SITE_R = 4.2;
const REACH = 3.0;
const HOLD_COLORS = [0xff4060, 0x40c0ff, 0xffd030, 0x50e070, 0xb070ff, 0xff8a30];

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _h = new THREE.Vector3();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const footY = (m) => FOOT0 + m * MOVE_H;

function wallTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 352;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#5d6b78';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#3e4955';
  g.lineWidth = 2;
  for (let y = 0; y <= c.height; y += 44) { g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke(); }
  for (let x = 0; x <= c.width; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, c.height); g.stroke(); }
  g.fillStyle = '#2e363f';
  for (let y = 6; y < c.height; y += 11) for (let x = 6; x < c.width; x += 11) g.fillRect(x, y, 2, 2); // t-nuts
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function initClimbWall(scene, world, save) {
  const city = world.city;
  let pos = city.spawn.clone().add(new THREE.Vector3(-50, 0, 50));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), city.colliders, SITE_R)) pos = city.spawn.clone().add(new THREE.Vector3(-54, 0, 46));
  placeStreetSite(city, pos, SITE_R, 'climbing-wall'); // wall, mats and struts all inside the radius
  const yaw = faceNearestRoad(city, pos); // the climbing face looks onto the street

  const group = new THREE.Group();
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m; };
  const steel = new THREE.MeshStandardMaterial({ color: 0x30363e, roughness: 0.5, metalness: 0.6 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wallTexture(), roughness: 0.9 });
  if (!wallMat.map) wallMat.color.set(0x5d6b78);
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.8 });

  add(new THREE.BoxGeometry(WALL_W, WALL_H, 0.4), wallMat, 0, WALL_H / 2, FACE_Z - 0.2);           // the wall
  for (const x of [-WALL_W / 2 - 0.12, WALL_W / 2 + 0.12]) add(new THREE.BoxGeometry(0.24, WALL_H + 0.8, 0.3), steel, x, (WALL_H + 0.8) / 2, FACE_Z - 0.2);
  add(new THREE.BoxGeometry(WALL_W + 0.5, 0.25, 0.9), steel, 0, WALL_H + 0.55, FACE_Z);             // top beam / anchor bar
  for (const x of [-1.6, 1.6]) {                                                                     // raking struts behind
    const s = add(new THREE.BoxGeometry(0.18, 10.4, 0.18), steel, x, 5, FACE_Z - 2.0);
    s.rotation.x = 0.29; // top leans in to the back of the wall
  }
  add(new THREE.BoxGeometry(WALL_W + 1.2, 0.3, 2.6), new THREE.MeshStandardMaterial({ color: 0x2856a8, roughness: 0.95 }), 0, 0.15, FACE_Z + 1.3); // crash mat
  for (const m of LEDGES) add(new THREE.BoxGeometry(2.2, 0.1, 0.4), wood, 0, footY(m) - 0.05, FACE_Z + 0.2);
  // auto-belay box and the bell
  add(new THREE.BoxGeometry(0.5, 0.5, 0.35), new THREE.MeshStandardMaterial({ color: 0xd8302a, roughness: 0.5 }), 0, WALL_H + 0.2, FACE_Z + 0.25);
  const bellPivot = new THREE.Group();
  bellPivot.position.set(0.95, WALL_H + 0.42, FACE_Z + 0.35);
  group.add(bellPivot);
  const brass = new THREE.MeshStandardMaterial({ color: 0xd8a830, roughness: 0.3, metalness: 0.9, emissive: 0x302000 });
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.24, 0.36, 14, 1, true), brass);
  bell.position.y = -0.24;
  bell.material.side = THREE.DoubleSide;
  bellPivot.add(bell);
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), steel);
  clapper.position.y = -0.4;
  bellPivot.add(clapper);

  // holds: two route holds per move (left and right hand) plus scattered
  // decoration, all one instanced mesh with per-hold colours
  const holdGeo = new THREE.DodecahedronGeometry(0.13, 0);
  holdGeo.scale(1, 0.8, 0.6);
  const holdMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const routeHolds = []; // [move][hand 0/1] -> local position
  const decor = [];
  let s = 4242;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let m = 1; m <= MOVES; m++) {
    const y = footY(m) + 1.95;
    routeHolds.push([
      new THREE.Vector3(-0.42 + (rnd() - 0.5) * 0.12, y + (rnd() - 0.5) * 0.08, FACE_Z + 0.05),
      new THREE.Vector3(0.42 + (rnd() - 0.5) * 0.12, y + (rnd() - 0.5) * 0.08, FACE_Z + 0.05),
    ]);
  }
  for (let i = 0; i < 70; i++) {
    const x = (rnd() - 0.5) * (WALL_W - 0.4), y = 0.4 + rnd() * (WALL_H - 0.8);
    if (Math.abs(x) < 0.7) continue; // keep the route lane readable
    decor.push(new THREE.Vector3(x, y, FACE_Z + 0.05));
  }
  const all = [...routeHolds.flat(), ...decor];
  const holds = new THREE.InstancedMesh(holdGeo, holdMat, all.length);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
  all.forEach((p, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rnd() * Math.PI);
    mtx.compose(p, q, sc);
    holds.setMatrixAt(i, mtx);
    holds.setColorAt(i, col.setHex(HOLD_COLORS[(rnd() * HOLD_COLORS.length) | 0]));
  });
  holds.instanceMatrix.needsUpdate = true;
  if (holds.instanceColor) holds.instanceColor.needsUpdate = true;
  group.add(holds);

  // the pulsing grip window: a halo ring around the hold you're reaching for
  const haloMat = new THREE.MeshBasicMaterial({ color: 0x60ff90, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.24, 24), haloMat);
  halo.visible = false;
  group.add(halo);

  // the auto-belay rope, scaled between the top anchor and the harness
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.7 }));
  rope.visible = false;
  scene.add(rope);

  group.position.set(pos.x, 0, pos.z);
  group.rotation.y = yaw;
  scene.add(group);
  group.updateMatrixWorld(true);

  postSign(scene, city, pos, 'VERTICAL LIMIT', { fg: '#fff2d8', bg: '#2a1408', accent: '#ff7a1a' }, { offset: 3.4 });

  // the wall is solid; the climber stands on a moving foothold collider
  const ax = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), nz = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const local = (x, y, z, out = new THREE.Vector3()) => out.set(pos.x, y, pos.z).addScaledVector(ax, x).addScaledVector(nz, z);
  const c0 = local(-WALL_W / 2 - 0.25, 0, FACE_Z - 0.4), c1 = local(WALL_W / 2 + 0.25, 0, FACE_Z);
  const wallCol = { x0: Math.min(c0.x, c1.x), x1: Math.max(c0.x, c1.x), z0: Math.min(c0.z, c1.z), z1: Math.max(c0.z, c1.z), h: WALL_H + 0.8, climbWall: true };
  const foot = { x0: 1e6, x1: 1e6 + 1, z0: 1e6, z1: 1e6 + 1, h: 1e4 + 1, roofY: 1e4, y0: 1e4, dynamic: true, climbFoothold: true };
  city.colliders.push(wallCol, foot);
  invalidateColliderGrid(city.colliders);

  world.climbWall = {
    pos, yaw, group, local, routeHolds, halo, haloMat, rope, bellPivot, foot,
    start: local(0, 0, FACE_Z + 1.9),   // where you stand to clip in (on the mat)
    state: 'idle',          // idle -> climb <-> rest -> lower -> idle
    move: 0, moves: MOVES, ledges: LEDGES,
    lastHand: 0,            // 1 left, 2 right, 0 = none yet
    nextHand: 0,            // the hand to press next (0 = either)
    stamina: STAM_MAX,
    phase: 0, beat: 0, movedBeat: -1, bright: false, glow: 0,
    t: 0, lastPressT: -9, restT: 0,
    dispY: FOOT0, dispX: 0, lowerT: 0, success: false,
    bellSwing: 0, bellV: 0,
    status: '', statusT: 0,
    atLedge: false,
    cooldown: 0,
    hud: null,
    best: save?.climbBest ?? 0,   // fastest time to the bell, seconds (0 = none)
  };
}

function ensureHud(world) {
  const C = world.climbWall;
  if (C.hud) return C.hud;
  const el = document.createElement('div');
  el.id = 'climbwall';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:300px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#1a0e06e0;border:1px solid #ff7a1a;border-radius:6px;display:none;z-index:30;color:#fff2d8;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#ff9a4a';
  const headL = document.createElement('span'), headR = document.createElement('span');
  head.append(headL, headR);
  const mid = document.createElement('div');
  mid.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:6px';
  const lamp = document.createElement('div');
  lamp.style.cssText = 'width:38px;height:38px;border-radius:50%;flex:none;border:2px solid #ffffff44';
  const hands = document.createElement('div');
  hands.style.cssText = 'flex:1;display:flex;gap:6px';
  const mkHand = (txt) => { const d = document.createElement('div'); d.style.cssText = 'flex:1;text-align:center;padding:6px 0;border-radius:4px;border:1px solid #ffffff33'; d.textContent = txt; hands.appendChild(d); return d; };
  const left = mkHand('1 ◀ LEFT'), right = mkHand('RIGHT ▶ 2');
  mid.append(lamp, hands);
  const mkBar = (label, color) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;margin-bottom:4px';
    const l = document.createElement('span'); l.style.cssText = 'width:56px;opacity:.8'; l.textContent = label;
    const bar = document.createElement('div'); bar.style.cssText = 'flex:1;height:8px;background:#0006;border-radius:4px;overflow:hidden';
    const fill = document.createElement('div'); fill.style.cssText = `height:100%;width:0;background:${color}`;
    bar.appendChild(fill); row.append(l, bar);
    return { row, fill };
  };
  const stam = mkBar('STAMINA', '#5fd16a');
  const height = mkBar('HEIGHT', '#ff9a4a');
  const status = document.createElement('div');
  status.style.cssText = 'font-size:12px;text-align:center;min-height:16px';
  el.append(head, mid, stam.row, height.row, status);
  document.body.appendChild(el);
  C.hud = { el, headL, headR, lamp, left, right, stam: stam.fill, height: height.fill, status };
  return C.hud;
}

function renderHud(world) {
  const C = world.climbWall, hud = ensureHud(world);
  hud.headL.textContent = 'VERTICAL LIMIT';
  hud.headR.textContent = `${Math.max(0, TIME_LIMIT - C.t).toFixed(1)}s`;
  const g = C.state === 'climb' ? C.glow : 0;
  hud.lamp.style.background = C.bright && C.state === 'climb' ? `rgba(96,255,144,${0.45 + 0.55 * g})` : `rgba(255,90,74,${0.15 + 0.3 * g})`;
  hud.lamp.style.boxShadow = C.bright && C.state === 'climb' ? '0 0 14px #60ff90' : 'none';
  for (const [el, hand] of [[hud.left, 1], [hud.right, 2]]) {
    const want = C.state === 'climb' && (C.nextHand === hand || C.nextHand === 0);
    el.style.background = want ? '#ff7a1a55' : 'transparent';
    el.style.opacity = want ? '1' : '0.45';
  }
  const st = C.stamina / STAM_MAX;
  hud.stam.style.width = `${Math.round(st * 100)}%`;
  hud.stam.style.background = st > 0.5 ? '#5fd16a' : st > 0.25 ? '#ffc040' : '#ff5a4a';
  hud.height.style.width = `${Math.round(100 * C.move / MOVES)}%`;
  hud.status.textContent = C.state === 'rest' ? `Resting on the ledge... ${C.restT.toFixed(1)}s`
    : C.state === 'lower' ? (C.success ? '🔔 Lowering off — nice climb!' : 'Lowering on the auto-belay...')
    : C.statusT > 0 ? C.status
    : C.atLedge ? 'Rest ledge — press 3 to recover stamina (3s)' : 'Press on the bright pulse · alternate 1 / 2';
}

function say(C, text) { C.status = text; C.statusT = 1.2; }

function startClimb(world) {
  const C = world.climbWall;
  world.money -= COST;
  C.state = 'climb';
  C.move = 0; C.lastHand = 0; C.nextHand = 0;
  C.stamina = STAM_MAX;
  C.phase = 0; C.beat = 0; C.movedBeat = -1;
  C.t = 0; C.lastPressT = -9; C.restT = 0;
  C.dispY = footY(0); C.dispX = 0;
  C.success = false; C.status = ''; C.statusT = 0;
  C.halo.visible = true;
  C.rope.visible = true;
  ensureHud(world).el.style.display = 'block';
  sfxPickup();
  showMissionMsg('VERTICAL LIMIT', `Alternate 1 (left) and 2 (right) on the bright pulse · 3 rests on a ledge · ring the bell inside ${TIME_LIMIT}s`, '#ff9a4a');
}

function beginLower(world, success, why) {
  const C = world.climbWall;
  C.state = 'lower';
  C.success = success;
  C.lowerT = 0;
  C.halo.visible = false;
  if (!success) {
    sfxMissionFail();
    showToast(why);
  }
}

function finish(world, why) {
  const C = world.climbWall, player = world.player;
  const inVehicle = why === 'vehicle';
  C.state = 'idle';
  C.cooldown = COOLDOWN;
  C.halo.visible = false;
  C.rope.visible = false;
  C.atLedge = false; C.bright = false; C.nextHand = 0;
  parkFoot(C);
  if (C.hud) C.hud.el.style.display = 'none';
  world.climbWallHint = null;
  if (!inVehicle) {
    player.pos.set(C.start.x, 0, C.start.z);
    player.pos.y = groundHeight(player.pos, world.city.colliders, 0.1, 2);
    player.vel.set(0, 0, 0);
    player.vy = 0;
    player.onGround = true;
  }
  if (!C.success) {
    showMissionMsg('OFF THE WALL', `${why || 'Lowered off'} · reached move ${C.move}/${MOVES}`, '#ff9a4a');
  }
  world.onSave?.();
}

function parkFoot(C) {
  const F = C.foot;
  F.x0 = 1e6; F.x1 = 1e6 + 1; F.z0 = 1e6; F.z1 = 1e6 + 1; F.roofY = 1e4; F.h = 1e4 + 1; F.y0 = 1e4;
}

// hold the climber on the wall at (dispX, dispY), facing it, standing on the foothold
function holdPlayer(world, x, y, out) {
  const C = world.climbWall, player = world.player;
  const p = C.local(x, y, FACE_Z + HOLD_OUT + out, _a);
  player.pos.set(p.x, y, p.z);
  player.vel.x = 0; player.vel.z = 0;
  player.vy = 0;
  player.onGround = true;
  player.heading = C.yaw + Math.PI;
  const F = C.foot;
  F.x0 = p.x - 0.4; F.x1 = p.x + 0.4; F.z0 = p.z - 0.4; F.z1 = p.z + 0.4;
  F.roofY = y; F.h = y + 0.3; F.y0 = y - 0.3;
}

// arms up on the wall: the hand that just moved reaches highest
function poseClimber(world, lowering) {
  const C = world.climbWall, ch = world.player.ch;
  if (!ch?.lArm || !ch?.rArm) return;
  const t = C.t;
  if (lowering) {
    ch.lArm.rotation.x = ch.rArm.rotation.x = -2.7;      // both hands on the rope
    ch.lArm.rotation.z = 0.15; ch.rArm.rotation.z = -0.15;
    if (ch.lLeg && ch.rLeg) { ch.lLeg.rotation.x = ch.rLeg.rotation.x = -1.2 + Math.sin(t * 3) * 0.1; } // feet on the wall
    return;
  }
  const leftHigh = C.lastHand === 1;
  ch.lArm.rotation.x = leftHigh ? -2.95 : -2.35;
  ch.rArm.rotation.x = leftHigh ? -2.35 : -2.95;
  ch.lArm.rotation.z = 0.25; ch.rArm.rotation.z = -0.25;
  if (ch.lLeg && ch.rLeg) {
    ch.lLeg.rotation.x = leftHigh ? -0.25 : -0.6;
    ch.rLeg.rotation.x = leftHigh ? -0.6 : -0.25;
  }
}

function placeRope(C, harness) {
  const top = C.local(0, WALL_H + 0.1, FACE_Z + 0.3, _b);
  _d.subVectors(top, harness);
  const len = Math.max(0.05, _d.length());
  C.rope.position.addVectors(top, harness).multiplyScalar(0.5);
  C.rope.scale.set(1, len, 1);
  C.rope.quaternion.setFromUnitVectors(Y_AXIS, _d.normalize());
}

function updateBell(C, dt) {
  C.bellV += (-40 * C.bellSwing - 1.5 * C.bellV) * dt;
  C.bellSwing += C.bellV * dt;
  C.bellPivot.rotation.z = C.bellSwing;
}

function press(world, hand) {
  const C = world.climbWall;
  const since = C.t - C.lastPressT;
  C.lastPressT = C.t;
  if (since < MASH_GAP) { C.stamina -= STAM_MASH; say(C, '😤 Mashing! Stamina burning'); return; }
  if (C.lastHand && hand === C.lastHand) { C.stamina -= STAM_SAME; say(C, `✋ Same hand twice! Use ${hand === 1 ? 2 : 1}`); return; }
  if (C.movedBeat === C.beat) { C.stamina -= STAM_MASH; say(C, '😤 One move per pulse!'); return; }
  C.movedBeat = C.beat;
  if (C.bright) {
    C.move++;
    C.lastHand = hand;
    C.stamina -= STAM_MOVE;
    say(C, C.glow > 0.92 ? '💪 Perfect grip' : 'Good grip');
    if (C.move >= MOVES) reachTop(world);
  } else {
    C.move = Math.max(0, C.move - 1);
    C.stamina -= STAM_SLIP;
    say(C, '😬 Slipped! Wait for the bright pulse');
  }
}

function reachTop(world) {
  const C = world.climbWall;
  const time = C.t;
  const pay = Math.round(PAY_BASE + PAY_PER_SEC * Math.max(0, TIME_LIMIT - time));
  world.money += pay;
  const newBest = !C.best || time < C.best;
  if (newBest) C.best = Math.round(time * 10) / 10;
  C.bellV = 6;
  addRep(world, 12);
  world.addXP?.(45);
  sfxMissionPass();
  showMissionMsg('🔔 DING!', `Topped out in ${time.toFixed(1)}s · +$${pay}${newBest ? ' · NEW BEST!' : ''}`, '#ff9a4a');
  if (time < 22) showNews('a speed climber rang the VERTICAL LIMIT bell in record time');
  beginLower(world, true);
  world.onSave?.();
}

export function updateClimbWall(world, dt, keys, pressed) {
  const C = world.climbWall;
  if (!C) return;
  world.climbWallHint = null;
  if (C.cooldown > 0) C.cooldown = Math.max(0, C.cooldown - dt);
  updateBell(C, dt);
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat && !player.inPlane;

  if (C.state === 'idle') {
    if (!onFoot || player.pos.y > 2) return;
    const d = Math.min(Math.hypot(player.pos.x - C.start.x, player.pos.z - C.start.z), Math.hypot(player.pos.x - C.pos.x, player.pos.z - C.pos.z));
    if (d > REACH) return;
    if (C.cooldown > 0) { world.climbWallHint = 'VERTICAL LIMIT — chalking up, one moment...'; return; }
    if (world.money < COST) { world.climbWallHint = `VERTICAL LIMIT — a climb costs $${COST}`; return; }
    world.climbWallHint = `VERTICAL LIMIT — press <b>E</b> to climb ($${COST}) · alternate <b>1</b>/<b>2</b> on the pulse${C.best ? ` · best ${C.best.toFixed(1)}s` : ''}`;
    if (pressed['KeyE']) startClimb(world);
    return;
  }

  // ---- on the wall ----
  if (!onFoot) { finish(world, 'vehicle'); return; }
  world.nearKiosk = true; // digits are hands here, not weapons
  C.statusT = Math.max(0, C.statusT - dt);

  if (C.state === 'lower') {
    C.lowerT += dt;
    C.dispY = Math.max(footY(0), C.dispY - LOWER_SPEED * dt);
    C.dispX += (0 - C.dispX) * Math.min(1, dt * 2);
    const sway = Math.sin(C.lowerT * 2.2) * 0.12;
    holdPlayer(world, C.dispX + sway, C.dispY, 0.25);
    poseClimber(world, true);
    placeRope(C, _h.set(player.pos.x, C.dispY + 1.05, player.pos.z));
    world.climbWallHint = C.success ? '🔔 Lowering off...' : 'Lowering on the auto-belay...';
    renderHud(world);
    if (C.dispY <= footY(0) + 1e-3) finish(world, C.success ? 'done' : C.failWhy);
    return;
  }

  C.t += dt;
  if (C.t >= TIME_LIMIT) { C.failWhy = 'Out of time'; beginLower(world, false, '⏱️ Out of time!'); return; }

  // grip pulse
  const period = PERIOD_START + (PERIOD_END - PERIOD_START) * (C.move / MOVES);
  C.phase += dt / period;
  C.beat = Math.floor(C.phase);
  const ph = C.phase - C.beat;
  C.glow = 0.5 - 0.5 * Math.cos(ph * Math.PI * 2);
  C.bright = ph >= BRIGHT_LO && ph <= BRIGHT_HI;
  C.atLedge = LEDGES.includes(C.move);
  C.nextHand = C.lastHand ? 3 - C.lastHand : 0;

  if (C.state === 'rest') {
    C.restT -= dt;
    C.stamina = Math.min(STAM_MAX, C.stamina + (STAM_MAX / REST_TIME) * dt * 1.05);
    if (C.restT <= 0) { C.state = 'climb'; C.stamina = STAM_MAX; C.lastPressT = C.t; say(C, 'Rested — back on it!'); }
  } else {
    if (pressed['Digit0']) { C.failWhy = 'You let go'; beginLower(world, false, 'You let go of the wall'); return; }
    if (pressed['Digit3']) {
      if (C.atLedge && C.move > 0) { C.state = 'rest'; C.restT = REST_TIME; say(C, 'Resting...'); }
      else say(C, 'No ledge here — rest ledges are the wooden planks');
    } else if (pressed['Digit1']) press(world, 1);
    else if (pressed['Digit2']) press(world, 2);
    if (C.state === 'climb' && C.t - C.lastPressT >= REGEN_AFTER) C.stamina = Math.min(STAM_MAX, C.stamina + REGEN_RATE * dt);
    if (C.state === 'climb' && C.stamina <= 0) {
      C.stamina = 0;
      C.failWhy = 'Out of stamina';
      beginLower(world, false, '😵 Pumped out! You peel off the wall');
      return;
    }
  }
  if (C.state === 'lower') { renderHud(world); return; } // topped out this frame
  C.atLedge = LEDGES.includes(C.move);
  C.nextHand = C.lastHand ? 3 - C.lastHand : 0;

  // position: ease toward the current move, leaning toward the hand that's high
  C.dispY += (footY(C.move) - C.dispY) * Math.min(1, dt * 10);
  C.dispX += ((C.lastHand === 1 ? -0.1 : C.lastHand === 2 ? 0.1 : 0) - C.dispX) * Math.min(1, dt * 8);
  holdPlayer(world, C.dispX, C.dispY, 0);
  poseClimber(world, false);
  placeRope(C, _h.set(player.pos.x, C.dispY + 1.05, player.pos.z));

  // the halo pulses on the hold you're reaching for
  const target = C.routeHolds[Math.min(MOVES - 1, C.move)][(C.nextHand || 1) - 1];
  C.halo.position.set(target.x, target.y, target.z + 0.07);
  C.halo.visible = C.state === 'climb';
  C.halo.scale.setScalar(0.8 + 0.5 * C.glow);
  C.haloMat.opacity = C.bright ? 0.55 + 0.45 * C.glow : 0.12 + 0.2 * C.glow;
  C.haloMat.color.setHex(C.bright ? 0x60ff90 : 0xff5a4a);

  const left = Math.max(0, TIME_LIMIT - C.t).toFixed(0);
  if (C.state === 'rest') world.climbWallHint = `Resting on the ledge... · <b>${left}s</b>`;
  else if (C.atLedge && C.stamina < 60) world.climbWallHint = `Rest ledge — press <b>3</b> for full stamina (3s) · <b>${left}s</b>`;
  else world.climbWallHint = `Press <b>${C.nextHand || '1</b>/<b>2'}</b> on the bright pulse · <b>3</b> rest on a ledge · <b>0</b> let go · <b>${left}s</b>`;
  renderHud(world);
}

export function climbWallSave(world) {
  return { climbBest: world.climbWall?.best ?? 0 };
}
