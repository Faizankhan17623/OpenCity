import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { invalidateColliderGrid } from './city.js';
import { postSign, faceNearestRoad } from './propKit.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// HEDGE MAZE: a real walkable maze of tall green hedges. Press E at the
// entrance arch to start the clock, find your way to the golden trophy in the
// middle and you are paid by how fast you got there. The layout is a perfect
// maze (exactly one route between any two cells) from a seeded recursive
// backtracker, so it is the same on every reload. Hedges are solid; climbing,
// web-zipping or flying over them (feet above 3.2 m) disqualifies the run.

const N = 9;                // cells per side
const S = 2.4;              // metres per cell
const T = 0.5;              // hedge thickness
const H = 2.7;              // visible hedge height
const COLLIDE_H = 3.6;      // collider height: a double jump can't clear it
const MAX_Y = 3.2;          // feet above this during a run = disqualified
const SEED = 0x4ed6e5;      // fixed layout
const SITE_RADIUS = 11.5;   // covers the 21.6 m maze plus its outer hedge
const GOAL_REACH = 1.3;
const START_REACH = 2.4;
const TIME_LIMIT = 300;
const PAY_MAX = 900, PAY_MIN = 150, PAY_PER_SEC = 7;
const BEST_BONUS = 100;
const COOLDOWN = 3;

// tiny deterministic PRNG (mulberry32)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cells[r][c] = { n, e, s, w }: true where a hedge stands on that side.
// Columns run along +x (east), rows along +z (south; north is -z).
function generateMaze(n, seed) {
  const rand = mulberry32(seed);
  const cells = Array.from({ length: n }, () => Array.from({ length: n }, () => ({ n: true, e: true, s: true, w: true })));
  const seen = cells.map((row) => row.map(() => false));
  const dirs = [[0, -1, 'n', 's'], [1, 0, 'e', 'w'], [0, 1, 's', 'n'], [-1, 0, 'w', 'e']];
  const stack = [[0, 0]];
  seen[0][0] = true;
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const open = dirs.filter(([dc, dr]) => {
      const cc = c + dc, rr = r + dr;
      return cc >= 0 && rr >= 0 && cc < n && rr < n && !seen[rr][cc];
    });
    if (!open.length) { stack.pop(); continue; }
    const [dc, dr, side, back] = open[Math.floor(rand() * open.length)];
    cells[r][c][side] = false;
    cells[r + dr][c + dc][back] = false;
    seen[r + dr][c + dc] = true;
    stack.push([c + dc, r + dr]);
  }
  return cells;
}

// breadth-first route through the cells, as [{c, r}, ...] from `from` to `to`
function solveMaze(cells, from, to) {
  const n = cells.length;
  const prev = new Map();
  const key = (c, r) => r * n + c;
  const queue = [from];
  prev.set(key(from.c, from.r), null);
  const steps = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
  while (queue.length) {
    const cur = queue.shift();
    if (cur.c === to.c && cur.r === to.r) break;
    for (const [side, [dc, dr]] of Object.entries(steps)) {
      const c = cur.c + dc, r = cur.r + dr;
      if (cells[cur.r][cur.c][side] || c < 0 || r < 0 || c >= n || r >= n || prev.has(key(c, r))) continue;
      prev.set(key(c, r), cur);
      queue.push({ c, r });
    }
  }
  if (!prev.has(key(to.c, to.r))) return null;
  const path = [];
  for (let p = to; p; p = prev.get(key(p.c, p.r))) path.push({ c: p.c, r: p.r });
  return path.reverse();
}

function leafTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#2f5e26';
  g.fillRect(0, 0, 128, 128);
  const rand = mulberry32(77);
  for (let i = 0; i < 900; i++) {
    const l = 22 + rand() * 26;
    g.fillStyle = `hsl(${100 + rand() * 25},${40 + rand() * 20}%,${l}%)`;
    g.beginPath();
    g.ellipse(rand() * 128, rand() * 128, 1.5 + rand() * 3, 1 + rand() * 2, rand() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function initHedgeMaze(scene, world, save) {
  const city = world.city;
  const pos = city.spawn.clone().add(new THREE.Vector3(60, 0, -60));
  try {
    placeStreetSite(city, pos, SITE_RADIUS, 'hedge-maze');
  } catch (err) {
    console.warn('Hedge maze: no clear site', err);
    return;
  }
  pos.y = 0;

  const cells = generateMaze(N, SEED);
  const half = (N * S) / 2;
  const x0 = pos.x - half, z0 = pos.z - half;
  const cellCenter = (c, r) => new THREE.Vector3(x0 + (c + 0.5) * S, 0, z0 + (r + 0.5) * S);

  // the entrance opens on the side facing the nearest road, in the middle
  const yaw = faceNearestRoad(city, pos);
  const side = Math.abs(yaw) < 0.1 ? 's' : Math.abs(Math.abs(yaw) - Math.PI) < 0.1 ? 'n' : yaw > 0 ? 'e' : 'w';
  const mid = (N - 1) / 2;
  const out = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }[side];
  const entranceCell = { s: { c: mid, r: N - 1 }, n: { c: mid, r: 0 }, e: { c: N - 1, r: mid }, w: { c: 0, r: mid } }[side];
  cells[entranceCell.r][entranceCell.c][side] = false;
  const goalCell = { c: mid, r: mid };
  const entrance = cellCenter(entranceCell.c, entranceCell.r).add(new THREE.Vector3(out[0], 0, out[1]).multiplyScalar(S / 2 + 0.9));
  const goal = cellCenter(goalCell.c, goalCell.r);

  // edges: horizontal ones lie on z-lines j (0..N) under column c; vertical
  // ones on x-lines i (0..N) beside row r
  const hEdge = (c, j) => c >= 0 && c < N && j >= 0 && j <= N && (j < N ? cells[j][c].n : cells[N - 1][c].s);
  const vEdge = (i, r) => r >= 0 && r < N && i >= 0 && i <= N && (i < N ? cells[r][i].w : cells[r][N - 1].e);

  // ---- visuals: hedge panels between topiary posts, one InstancedMesh each ----
  const leaf = leafTexture();
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: leaf, roughness: 0.95 });
  const segGeo = new THREE.BoxGeometry(S - T, H, T);
  const postGeo = new THREE.BoxGeometry(T + 0.08, H + 0.12, T + 0.08);
  const segs = [], posts = [];
  for (let j = 0; j <= N; j++) for (let c = 0; c < N; c++) if (hEdge(c, j)) segs.push({ x: x0 + (c + 0.5) * S, z: z0 + j * S, rot: 0 });
  for (let i = 0; i <= N; i++) for (let r = 0; r < N; r++) if (vEdge(i, r)) segs.push({ x: x0 + i * S, z: z0 + (r + 0.5) * S, rot: Math.PI / 2 });
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    if (hEdge(i - 1, j) || hEdge(i, j) || vEdge(i, j - 1) || vEdge(i, j)) posts.push({ x: x0 + i * S, z: z0 + j * S });
  }
  const rand = mulberry32(SEED ^ 0x5151);
  const dummy = new THREE.Object3D();
  const segMesh = new THREE.InstancedMesh(segGeo, hedgeMat, segs.length);
  segs.forEach((s, k) => {
    const sy = 0.96 + rand() * 0.06; // uneven trimming, and no coplanar tops
    dummy.position.set(s.x, (H * sy) / 2, s.z);
    dummy.rotation.set(0, s.rot, 0);
    dummy.scale.set(1, sy, 1);
    dummy.updateMatrix();
    segMesh.setMatrixAt(k, dummy.matrix);
  });
  const postMesh = new THREE.InstancedMesh(postGeo, hedgeMat, posts.length);
  posts.forEach((p, k) => {
    dummy.position.set(p.x, (H + 0.12) / 2, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    postMesh.setMatrixAt(k, dummy.matrix);
  });
  for (const m of [segMesh, postMesh]) {
    m.castShadow = true;
    m.receiveShadow = true;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    scene.add(m);
  }

  // gravel floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(N * S + T, N * S + T),
    new THREE.MeshStandardMaterial({ color: 0x8c8068, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(pos.x, 0.38, pos.z);
  floor.receiveShadow = true;
  scene.add(floor);

  // entrance arch: two tall posts and a crossbar over the opening (no collider)
  const ec = cellCenter(entranceCell.c, entranceCell.r).add(new THREE.Vector3(out[0], 0, out[1]).multiplyScalar(S / 2));
  const across = new THREE.Vector3(out[1], 0, -out[0]); // along the outer hedge
  const archMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: leaf, roughness: 0.95 });
  for (const sgn of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(T + 0.2, H + 0.9, T + 0.2), archMat);
    p.position.set(ec.x + across.x * sgn * S / 2, (H + 0.9) / 2, ec.z + across.z * sgn * S / 2);
    p.castShadow = true;
    scene.add(p);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(S + T + 0.2, 0.45, T + 0.2), archMat);
  bar.position.set(ec.x, H + 0.68, ec.z);
  bar.rotation.y = Math.atan2(across.z, across.x) * -1;
  bar.castShadow = true;
  scene.add(bar);
  postSign(scene, city, entrance, 'HEDGE MAZE', { fg: '#f2ffd8', bg: '#16330f', accent: '#ffd040' });

  // golden trophy on a stone plinth in the centre, with a faint beacon
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc83a, emissive: 0x7a4a00, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.25 });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 0.85 }));
  plinth.position.set(goal.x, 0.45, goal.z);
  plinth.castShadow = true;
  scene.add(plinth);
  const trophy = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.22, 0), new THREE.Vector2(0.22, 0.05), new THREE.Vector2(0.06, 0.09),
    new THREE.Vector2(0.05, 0.3), new THREE.Vector2(0.12, 0.36), new THREE.Vector2(0.24, 0.5), new THREE.Vector2(0.27, 0.72),
    new THREE.Vector2(0.25, 0.72), new THREE.Vector2(0.0, 0.42),
  ], 18), gold);
  trophy.add(cup);
  for (const sgn of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 12, Math.PI), gold);
    handle.position.set(sgn * 0.27, 0.56, 0);
    handle.rotation.z = sgn > 0 ? -Math.PI / 2 : Math.PI / 2;
    trophy.add(handle);
  }
  trophy.position.set(goal.x, 0.9, goal.z);
  scene.add(trophy);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 14, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })
  );
  beam.position.set(goal.x, 8.5, goal.z);
  scene.add(beam);

  // ---- colliders: merged straight runs of hedge, same format as the city ----
  const colliders = [];
  const add = (ax0, az0, ax1, az1) => colliders.push({ x0: ax0, z0: az0, x1: ax1, z1: az1, h: COLLIDE_H, walkable: false, hedge: true });
  for (let j = 0; j <= N; j++) {
    for (let c = 0; c < N;) {
      if (!hEdge(c, j)) { c++; continue; }
      let e = c;
      while (e + 1 < N && hEdge(e + 1, j)) e++;
      const z = z0 + j * S;
      add(x0 + c * S - T / 2, z - T / 2, x0 + (e + 1) * S + T / 2, z + T / 2);
      c = e + 1;
    }
  }
  for (let i = 0; i <= N; i++) {
    for (let r = 0; r < N;) {
      if (!vEdge(i, r)) { r++; continue; }
      let e = r;
      while (e + 1 < N && vEdge(i, e + 1)) e++;
      const x = x0 + i * S;
      add(x - T / 2, z0 + r * S - T / 2, x + T / 2, z0 + (e + 1) * S + T / 2);
      r = e + 1;
    }
  }
  city.colliders.push(...colliders);
  invalidateColliderGrid(city.colliders);

  world.hedgeMaze = {
    pos, cells, size: N, cellSize: S,
    bounds: { x0: x0 - T / 2, z0: z0 - T / 2, x1: x0 + N * S + T / 2, z1: z0 + N * S + T / 2 },
    entrance, goal, entranceCell, goalCell, colliders, trophy, beam,
    cellCenter,
    // world-space waypoints from the entrance to the trophy, for tests/bots
    solve() {
      const route = solveMaze(cells, entranceCell, goalCell);
      return route ? [entrance.clone(), ...route.map((p) => cellCenter(p.c, p.r))] : null;
    },
    state: 'idle',       // idle -> run
    t: 0, cooldown: 0, runs: 0,
    best: Number.isFinite(save?.mazeBestTime) ? save.mazeBestTime : null,
    hud: null,
  };
}

function ensureHud(world) {
  const M = world.hedgeMaze;
  if (M.hud) return M.hud;
  const el = document.createElement('div');
  el.id = 'hedgemaze';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:300px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#0d1a08e0;border:1px solid #ffd040;border-radius:6px;display:none;z-index:30;color:#f2ffd8;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:4px;color:#ffd040';
  const title = document.createElement('span');
  title.textContent = '🌿 HEDGE MAZE';
  const clock = document.createElement('span');
  head.append(title, clock);
  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:12px;opacity:.85';
  el.append(head, sub);
  document.body.appendChild(el);
  M.hud = { el, clock, sub };
  return M.hud;
}

function endRun(world, title, sub, color, pass) {
  const M = world.hedgeMaze;
  M.state = 'idle';
  M.cooldown = COOLDOWN;
  if (M.hud) M.hud.el.style.display = 'none';
  (pass ? sfxMissionPass : sfxMissionFail)();
  showMissionMsg(title, sub, color);
}

export function updateHedgeMaze(world, dt, keys, pressed) {
  const M = world.hedgeMaze;
  if (!M) return;
  world.hedgeMazeHint = null;
  if (M.cooldown > 0) M.cooldown = Math.max(0, M.cooldown - dt);
  M.trophy.rotation.y += dt * 1.2;

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat && !player.inPlane;

  if (M.state === 'idle') {
    if (!onFoot || Math.hypot(player.pos.x - M.entrance.x, player.pos.z - M.entrance.z) > START_REACH) return;
    if (M.cooldown > 0) { world.hedgeMazeHint = 'HEDGE MAZE — catch your breath a moment'; return; }
    world.hedgeMazeHint = `HEDGE MAZE — press <b>E</b> to start a timed run to the golden trophy${M.best != null ? ` (best ${M.best.toFixed(1)}s)` : ''}`;
    if (pressed['KeyE']) {
      M.state = 'run';
      M.t = 0;
      ensureHud(world).el.style.display = 'block';
      sfxPickup();
      showMissionMsg('HEDGE MAZE', 'Find the golden trophy in the middle. Feet on the ground, no going over the top!', '#ffd040');
    }
    return;
  }

  // ---- a run is on ----
  M.t += dt;
  const b = M.bounds;
  const outside = Math.max(b.x0 - player.pos.x, 0, player.pos.x - b.x1) + Math.max(b.z0 - player.pos.z, 0, player.pos.z - b.z1);
  if (!onFoot) { endRun(world, 'MAZE ABANDONED', 'You left on wheels: runs are on foot only', '#ff5a4a', false); return; }
  if (player.pos.y > MAX_Y) { endRun(world, 'DISQUALIFIED', 'Over the hedges? Nice try. Feet on the ground!', '#ff5a4a', false); return; }
  if (outside > 4) { endRun(world, 'MAZE ABANDONED', 'You walked out of the maze', '#ff5a4a', false); return; }
  if (M.t > TIME_LIMIT) { endRun(world, 'LOST IN THE HEDGES', 'Time ran out. The gardener had to lead you out', '#ff5a4a', false); return; }

  if (Math.hypot(player.pos.x - M.goal.x, player.pos.z - M.goal.z) < GOAL_REACH) {
    const time = M.t;
    let pay = Math.round(Math.max(PAY_MIN, Math.min(PAY_MAX, PAY_MAX - time * PAY_PER_SEC)));
    const newBest = M.best == null || time < M.best;
    if (newBest && M.best != null) pay += BEST_BONUS;
    if (newBest) M.best = time;
    M.runs++;
    world.money += pay;
    world.addXP?.(50);
    addRep(world, 15);
    endRun(world, 'TROPHY!', `${time.toFixed(1)}s through the maze · +$${pay}${newBest ? ' · NEW BEST!' : ''}`, '#ffd040', true);
    if (newBest && time < 40) showNews(`someone sprinted the park hedge maze in ${time.toFixed(1)} seconds`);
    else showToast('🏆 The trophy stays put for the next challenger');
    world.onSave?.();
    return;
  }

  const hud = ensureHud(world);
  hud.clock.textContent = `${M.t.toFixed(1)}s`;
  hud.sub.textContent = `Find the golden trophy in the middle${M.best != null ? ` · best ${M.best.toFixed(1)}s` : ''} · stay below the hedge tops`;
  world.hedgeMazeHint = `HEDGE MAZE — find the golden trophy · <b>${M.t.toFixed(1)}s</b>`;
}

export function hedgeMazeSave(world) {
  return { mazeBestTime: world.hedgeMaze?.best ?? undefined };
}
