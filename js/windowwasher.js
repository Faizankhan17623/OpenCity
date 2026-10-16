import * as THREE from 'three';
import { placeStreetSite, overlapsRoad } from './site-layout.js';
import { groundHeight, invalidateColliderGrid } from './city.js';
import { postSign } from './propKit.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// WINDOW WASHER: a cleaning gondola hangs off a roof davit against one face of
// a tall tower near spawn. Press E at its base to take the job: the cradle is
// hoisted to the top and then creeps down the face by itself. Three columns of
// glass panels scroll past; the grimy ones (brown film) need scrubbing. Press
// 1/2/3 to slide the cradle to a column and hold E for ~0.8 s to scrub the
// panel in front of you. There is no going back up: a dirty panel that scrolls
// above you is missed and docked from your pay. Wind gusts (flagged a moment
// ahead) swing the cradle, and you can't scrub while it swings hard. 0 bails.

const COLS = 3;
const COL_W = 2.4;          // metres between column centres (and panel width + mullion)
const ROW_H = 3.0;          // storey height: one row of panels per floor
const PANEL_W = 2.2, PANEL_H = 2.6;
const TOP_GAP = 2.5;        // first row centre below the roof line
const MIN_ROW_Y = 3.6;      // lowest row centre (out of reach once the cradle lands)
const FLOOR_PARK = 0.35;    // cradle floor height when parked on the sidewalk
const STAND_Z = 0.95;       // player / cradle centre distance out from the glass
const CHEST = 1.3;          // reach centre above the cradle floor
const REACH = 1.7;          // vertical reach from the chest to a panel centre (rows overlap a little)
const SCRUB_TIME = 0.8;
const DESCENT = 0.75;       // m/s while panels are still coming
const FAST_DESCENT = 3.2;   // m/s once the last row has scrolled past
const HOIST = 9;            // m/s riding up at the start
const BAIL = 6;             // m/s when bailing out with 0
const SLIDE = 3.4;          // m/s sliding between columns
const ALIGN = 0.12;         // how close to a column centre counts as "in front"
const HARD_SWING = 0.3;     // swing offset (m) above which scrubbing is impossible
const PANEL_PAY = 30;
const MISS_COST = 20;
const COOLDOWN = 12;
const SITE_R = 2.6;

const _v = new THREE.Vector3();

// a canvas of brown blotches and drip streaks, shared by every grime quad
function grimeTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = 'rgba(92,64,30,0.42)';
  g.fillRect(0, 0, 128, 128);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 46; i++) {
    const x = rnd() * 128, y = rnd() * 128, r = 6 + rnd() * 22;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(70,46,18,${0.35 + rnd() * 0.4})`);
    grd.addColorStop(1, 'rgba(70,46,18,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.fillStyle = 'rgba(60,40,15,0.35)';
  for (let i = 0; i < 14; i++) g.fillRect(rnd() * 128, rnd() * 40, 2 + rnd() * 3, 40 + rnd() * 80);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// billboards city.js hangs on tall facades; don't put the gondola through one
function findFacadeBillboards(scene) {
  const out = [];
  for (const o of scene.children) {
    const p = o.isMesh && o.geometry?.type === 'PlaneGeometry' ? o.geometry.parameters : null;
    if (p && p.width === 11 && p.height === 4.2) out.push(o.position);
  }
  return out;
}

// same test placeStreetSite runs, so the site lands exactly where we ask
function siteClear(city, x, z, r) {
  const sites = city.activitySites || [];
  return !overlapsRoad(city, x, z, r) &&
    !city.colliders.some((c) => x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1) &&
    !sites.some((s) => Math.abs(x - s.x) < r + s.radius + 1 && Math.abs(z - s.z) < r + s.radius + 1);
}

// a 30-70 m procedural tower near spawn, and the face of it that looks onto a sidewalk
function pickFacade(scene, city) {
  const spawn = city.spawn;
  const boards = findFacadeBillboards(scene);
  const towers = (city.buildings || []);
  const cands = city.colliders.filter((c) => {
    if (c.dynamic || c.roofY != null || c.walkable === false) return false;
    const top = (c.h ?? 0) - 0.3;
    if (top < 30 || top > 70) return false;
    if (c.x1 - c.x0 < 12 || c.z1 - c.z0 < 12) return false;
    const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2;
    // a real tower from the city grid, not a landmark or some other prop
    if (towers.length && !towers.some((b) => Math.abs(b.x - cx) < 0.05 && Math.abs(b.z - cz) < 0.05)) return false;
    const d = Math.hypot(cx - spawn.x, cz - spawn.z);
    return d > 15 && d < 260;
  }).sort((a, b) => Math.hypot((a.x0 + a.x1) / 2 - spawn.x, (a.z0 + a.z1) / 2 - spawn.z) -
    Math.hypot((b.x0 + b.x1) / 2 - spawn.x, (b.z0 + b.z1) / 2 - spawn.z));

  for (const c of cands) {
    const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2;
    const faces = [
      { x: c.x1, z: cz, nx: 1, nz: 0, width: c.z1 - c.z0 },
      { x: c.x0, z: cz, nx: -1, nz: 0, width: c.z1 - c.z0 },
      { x: cx, z: c.z1, nx: 0, nz: 1, width: c.x1 - c.x0 },
      { x: cx, z: c.z0, nx: 0, nz: -1, width: c.x1 - c.x0 },
    ];
    for (const f of faces) {
      // gap from the face to the kerb of the road it looks onto
      const roads = f.nx ? city.roadXs : city.roadZs;
      const at = f.nx ? f.x : f.z, dir = f.nx || f.nz;
      let gap = Infinity;
      for (const r of roads || []) { const g = (r - at) * dir - 8; if (g > 0 && g < gap) gap = g; }
      f.gap = gap;
    }
    faces.sort((a, b) => a.gap - b.gap);
    for (const f of faces) {
      if (f.gap < 5.5 || f.gap > 14 || f.width < COLS * COL_W + 1.5) continue;
      if (boards.some((p) => Math.abs((p.x - f.x) * f.nx + (p.z - f.z) * f.nz) < 1.2 &&
        Math.abs((p.x - f.x) * -f.nz + (p.z - f.z) * f.nx) < f.width / 2 + 1)) continue;
      const sx = f.x + f.nx * 2.8, sz = f.z + f.nz * 2.8;
      if (!siteClear(city, sx, sz, SITE_R)) continue;
      return { c, face: f, top: (c.h ?? 0) - 0.3, site: new THREE.Vector3(sx, 0, sz) };
    }
  }
  return null;
}

export function initWindowWasher(scene, world, save) {
  const city = world.city;
  const pick = pickFacade(scene, city);
  if (!pick) { console.warn('window washer: no suitable tower near spawn'); return; }
  const { face, top } = pick;
  const pos = pick.site;
  placeStreetSite(city, pos, SITE_R, 'window-washer'); // clear already, so it stays put

  // rig frame: origin on the face at street level, +x along the face, +z out
  const yaw = Math.atan2(face.nx, face.nz);
  const rig = new THREE.Group();
  rig.position.set(face.x, 0, face.z);
  rig.rotation.y = yaw;
  scene.add(rig);
  const ax = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const nrm = new THREE.Vector3(face.nx, 0, face.nz);
  const toWorld = (x, y, z, out = new THREE.Vector3()) =>
    out.set(face.x, y, face.z).addScaledVector(ax, x).addScaledVector(nrm, z);

  // ---- the glass strip: rows of panels down three columns ----
  const rowY = [];
  for (let y = top - TOP_GAP; y >= MIN_ROW_Y; y -= ROW_H) rowY.push(y);
  const ROWS = rowY.length;
  const stripW = COLS * COL_W + 0.2;
  const stripTop = rowY[0] + PANEL_H / 2 + 0.25, stripBot = rowY[ROWS - 1] - PANEL_H / 2 - 0.25;
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x6d8ea8, roughness: 0.12, metalness: 0.65, emissive: 0x0c1824, emissiveIntensity: 0.6 });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(stripW, stripTop - stripBot), glassMat);
  glass.position.set(0, (stripTop + stripBot) / 2, 0.04);
  rig.add(glass);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.5, metalness: 0.6 });
  const mullionGeo = new THREE.BoxGeometry(0.1, stripTop - stripBot, 0.08);
  for (let i = 0; i <= COLS; i++) {
    const m = new THREE.Mesh(mullionGeo, frameMat);
    m.position.set((i - COLS / 2) * COL_W, (stripTop + stripBot) / 2, 0.07);
    rig.add(m);
  }
  const transomGeo = new THREE.BoxGeometry(stripW, 0.1, 0.08);
  for (let r = 0; r <= ROWS; r++) {
    const m = new THREE.Mesh(transomGeo, frameMat);
    m.position.set(0, (r < ROWS ? rowY[r] + ROW_H / 2 : rowY[ROWS - 1] - ROW_H / 2), 0.07);
    rig.add(m);
  }
  // grime: one quad per panel, shown when that panel is dirty
  const grimeMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: grimeTexture(), transparent: true, opacity: 0.92, depthWrite: false });
  if (!grimeMat.map) { grimeMat.color.set(0x5a3e1c); grimeMat.opacity = 0.7; }
  const grimeGeo = new THREE.PlaneGeometry(PANEL_W, PANEL_H);
  const colX = [];
  for (let c = 0; c < COLS; c++) colX.push((c - (COLS - 1) / 2) * COL_W);
  const panels = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const mesh = new THREE.Mesh(grimeGeo, grimeMat);
      mesh.position.set(colX[c], rowY[r], 0.12);
      mesh.renderOrder = 2;
      mesh.visible = false;
      rig.add(mesh);
      panels.push({ r, c, y: rowY[r], mesh, dirty: false, scrub: 0, missed: false, cleaned: false });
    }
  }

  // ---- the gondola (cradle): platform, guard rails, end stirrups ----
  const gondola = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xf0b020, roughness: 0.55, metalness: 0.3 });
  const alu = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.35, metalness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.8 });
  const gadd = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; gondola.add(m); return m; };
  gadd(new THREE.BoxGeometry(2.7, 0.12, 1.1), dark, 0, -0.06, STAND_Z);              // deck
  gadd(new THREE.BoxGeometry(2.7, 0.22, 0.04), paint, 0, 0.11, STAND_Z + 0.55);       // toe boards
  gadd(new THREE.BoxGeometry(2.7, 0.22, 0.04), paint, 0, 0.11, STAND_Z - 0.55);
  const railX = new THREE.BoxGeometry(2.7, 0.06, 0.06);
  gadd(railX, alu, 0, 1.05, STAND_Z + 0.55);                                         // front top rail
  gadd(railX, alu, 0, 0.55, STAND_Z + 0.55);                                         // front mid rail
  gadd(railX, alu, 0, 0.6, STAND_Z - 0.55);                                          // low back rail (glass side)
  const post = new THREE.BoxGeometry(0.06, 1.05, 0.06);
  for (const x of [-1.32, -0.45, 0.45, 1.32]) gadd(post, alu, x, 0.52, STAND_Z + 0.55);
  for (const x of [-1.32, 1.32]) {
    gadd(new THREE.BoxGeometry(0.06, 0.06, 1.1), alu, x, 1.05, STAND_Z);              // side rails
    gadd(new THREE.BoxGeometry(0.08, 2.3, 0.08), paint, x, 1.15, STAND_Z);             // stirrup
    gadd(new THREE.BoxGeometry(0.08, 0.6, 0.08), paint, x, 0.3, STAND_Z - 0.55);
    gadd(new THREE.BoxGeometry(0.22, 0.14, 0.22), dark, x, 2.3, STAND_Z);              // hoist motor
  }
  const bucket = gadd(new THREE.CylinderGeometry(0.16, 0.13, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0x2f7fd0, roughness: 0.6 }), 0.95, 0.15, STAND_Z + 0.2);
  bucket.castShadow = false;
  rig.add(gondola);

  // ---- roof davit on a trolley, and the two hoist cables ----
  const davit = new THREE.Group();
  const dadd = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); davit.add(m); return m; };
  dadd(new THREE.BoxGeometry(3.0, 0.3, 0.9), dark, 0, 0.15, -1.2);                     // trolley on the roof
  for (const x of [-1.2, 1.2]) {
    dadd(new THREE.BoxGeometry(0.16, 1.7, 0.16), paint, x, 1.0, -1.2);                 // davit mast
    dadd(new THREE.BoxGeometry(0.14, 0.14, 2.3), paint, x, 1.8, -0.1);                  // davit arm out over the edge
    dadd(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 10), alu, x, 1.7, STAND_Z);          // sheave
  }
  davit.position.set(0, top, 0);
  rig.add(davit);
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const cableGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 5);
  const cables = [-1.2, 1.2].map((dx) => { const m = new THREE.Mesh(cableGeo, cableMat); m.userData.dx = dx; rig.add(m); return m; });

  postSign(scene, city, pos, 'SKYLINE GLASS CO.', { fg: '#e8f6ff', bg: '#0e2a3e', accent: '#5ac8ff' }, { offset: 2.4 });

  // a moving deck you stand on: a walkable collider that rides with the cradle
  const deck = { x0: 0, z0: 0, x1: 0, z1: 0, h: 1, roofY: 0.7, y0: 0.4, dynamic: true, washerDeck: true };
  city.colliders.push(deck);
  invalidateColliderGrid(city.colliders);

  world.windowWasher = {
    pos, yaw, rig, face, top, rowY, rows: ROWS, cols: COLS, colX, panels,
    gondola, davit, cables, deck, toWorld,
    state: 'idle',          // idle -> ascend -> work -> (bail) -> idle
    gy: FLOOR_PARK,         // cradle floor height
    gx: 0,                  // cradle centre along the face (rig local x)
    col: 1,                 // target column 0..2 (keys 1..3)
    swing: 0, swingV: 0,
    gust: 'calm', gustT: 0, gustDir: 1,
    t: 0, cooldown: 0,
    total: 0, cleaned: 0, missed: 0, earned: 0,
    reachPanel: null,       // the dirty panel in vertical reach (prefers the current column)
    inReach: false,         // a dirty panel is in reach in the current column
    canScrub: false,        // ...and the cradle is aligned and steady enough to scrub it
    scrubbing: null,
    hud: null,
    best: save?.washerBest ?? 0,
  };
  placeRig(world);
}

// move the cradle, davit trolley, cables and deck collider to the current state
function placeRig(world) {
  const W = world.windowWasher;
  const x = W.gx + W.swing;
  W.gondola.position.set(x, W.gy, 0);
  W.gondola.rotation.z = W.swing * 0.08; // hangs back toward the davit
  W.davit.position.x = W.gx;
  const topY = W.top + 1.7;
  for (const m of W.cables) {
    const ax = W.gx + m.userData.dx, bx = x + m.userData.dx, by = W.gy + 2.35;
    const rise = Math.max(0.05, topY - by);
    m.position.set((ax + bx) / 2, (topY + by) / 2, STAND_Z);
    m.scale.set(1, Math.hypot(rise, ax - bx), 1);
    m.rotation.z = Math.atan2(bx - ax, rise); // lean toward the swinging cradle
  }
  const p = W.toWorld(x, 0, STAND_Z, _v);
  const D = W.deck;
  D.x0 = p.x - 0.45; D.x1 = p.x + 0.45; D.z0 = p.z - 0.45; D.z1 = p.z + 0.45;
  D.roofY = W.gy; D.h = W.gy + 0.3; D.y0 = W.gy - 0.3;
}

function ensureHud(world) {
  const W = world.windowWasher;
  if (W.hud) return W.hud;
  const el = document.createElement('div');
  el.id = 'windowwasher';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:300px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#08141ee0;border:1px solid #5ac8ff;border-radius:6px;display:none;z-index:30;color:#e8f6ff;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#5ac8ff';
  const headL = document.createElement('span'), headR = document.createElement('span');
  head.append(headL, headR);
  const gust = document.createElement('div');
  gust.style.cssText = 'text-align:center;font-weight:900;border-radius:4px;padding:2px;margin-bottom:6px;visibility:hidden';
  // the next rows of panels: three columns, current row on top
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px';
  const keysRow = document.createElement('div');
  keysRow.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:4px;text-align:center;font-size:11px;opacity:.8';
  const keyCells = [0, 1, 2].map((c) => { const d = document.createElement('div'); d.textContent = `[${c + 1}]`; keysRow.appendChild(d); return d; });
  const cells = [];
  for (let i = 0; i < 4 * 3; i++) {
    const d = document.createElement('div');
    d.style.cssText = 'height:16px;border-radius:3px;border:1px solid #ffffff22';
    grid.appendChild(d);
    cells.push(d);
  }
  const bar = document.createElement('div');
  bar.style.cssText = 'height:8px;background:#0006;border-radius:4px;overflow:hidden;margin-bottom:4px';
  const fill = document.createElement('div');
  fill.style.cssText = 'height:100%;width:0;background:#5ac8ff';
  bar.appendChild(fill);
  const status = document.createElement('div');
  status.style.cssText = 'font-size:12px;opacity:.9;text-align:center';
  el.append(head, gust, keysRow, grid, bar, status);
  document.body.appendChild(el);
  W.hud = { el, headL, headR, gust, cells, keyCells, fill, status };
  return W.hud;
}

function renderHud(world) {
  const W = world.windowWasher, hud = ensureHud(world);
  const pct = W.total ? Math.round(100 * W.cleaned / W.total) : 0;
  hud.headL.textContent = `WINDOW WASHER · ${Math.max(0, Math.round(W.gy))}m`;
  hud.headR.textContent = `${pct}% · $${Math.max(0, W.earned)}`;
  hud.gust.style.visibility = W.gust === 'calm' ? 'hidden' : 'visible';
  if (W.gust === 'warn') {
    const on = Math.floor(W.t * 6) % 2 === 0;
    hud.gust.textContent = '💨 GUST INCOMING — brace!';
    hud.gust.style.background = on ? '#ffb02055' : '#ffb02022';
    hud.gust.style.color = '#ffd070';
  } else if (W.gust === 'gust') {
    hud.gust.textContent = Math.abs(W.swing) > HARD_SWING ? '🌬️ SWINGING — hold on!' : '🌬️ windy...';
    hud.gust.style.background = '#ff5a4a44';
    hud.gust.style.color = '#ffb0a8';
  }
  for (let c = 0; c < 3; c++) hud.keyCells[c].style.color = c === W.col ? '#5ac8ff' : '';
  const chest = W.gy + CHEST;
  // first row still in (or above) reach, then the three coming up below it
  let r0 = W.rows;
  for (let r = 0; r < W.rows; r++) if (W.rowY[r] - chest <= REACH) { r0 = r; break; }
  for (let i = 0; i < 4; i++) {
    for (let c = 0; c < 3; c++) {
      const cell = hud.cells[i * 3 + c];
      const p = W.panels[(r0 + i) * COLS + c];
      let bg = '#00000033', out = '';
      if (p) {
        bg = p.missed ? '#ff5a4a88' : p.dirty ? '#8a5a24' : p.cleaned ? '#5ac8ff88' : '#a8d8f033';
        if (i === 0 && Math.abs(p.y - chest) <= REACH) out = c === W.col ? '2px solid #ffffff' : '1px solid #5ac8ff';
      }
      cell.style.background = bg;
      cell.style.outline = out;
      cell.style.opacity = i === 0 ? '1' : String(0.85 - i * 0.18);
    }
  }
  const s = W.scrubbing;
  hud.fill.style.width = `${s ? Math.round(100 * Math.min(1, s.scrub / SCRUB_TIME)) : 0}%`;
  hud.status.textContent = W.state === 'ascend' ? 'Hoisting to the roof...'
    : W.state === 'bail' ? 'Bailing out — riding down'
    : `${W.cleaned} clean · ${W.missed} missed · ${W.total - W.cleaned - W.missed} to go`;
}

function startJob(world) {
  const W = world.windowWasher;
  W.total = 0; W.cleaned = 0; W.missed = 0; W.earned = 0; W.t = 0;
  for (const p of W.panels) { p.dirty = false; p.scrub = 0; p.missed = false; p.cleaned = false; }
  for (let r = 0; r < W.rows; r++) {
    const row = W.panels.slice(r * COLS, r * COLS + COLS);
    for (const p of row) p.dirty = Math.random() < 0.5;
    if (!row.some((p) => p.dirty)) row[(Math.random() * COLS) | 0].dirty = true;
  }
  for (const p of W.panels) {
    p.mesh.visible = p.dirty;
    p.mesh.scale.y = 1;
    p.mesh.position.y = p.y;
    if (p.dirty) W.total++;
  }
  W.col = 1; W.gx = W.colX[1];
  W.swing = 0; W.swingV = 0;
  W.gust = 'calm'; W.gustT = 6 + Math.random() * 4;
  W.scrubbing = null;
  W.state = 'ascend';
  ensureHud(world).el.style.display = 'block';
  sfxPickup();
  showMissionMsg('WINDOW WASHER', 'Riding up... 1/2/3 pick a column · hold E to scrub the brown panels · 0 bails out', '#5ac8ff');
}

function holdPlayer(world) {
  const W = world.windowWasher, player = world.player;
  const p = W.toWorld(W.gx + W.swing, W.gy, STAND_Z, _v);
  player.pos.set(p.x, W.gy, p.z);
  player.vel.x = 0; player.vel.z = 0;
  player.vy = 0;
  player.onGround = true;
  player.heading = W.yaw + Math.PI; // face the glass
}

function putDown(world) {
  const W = world.windowWasher, player = world.player;
  player.pos.set(W.pos.x, 0, W.pos.z);
  player.pos.y = groundHeight(player.pos, world.city.colliders, 0.1, 2);
  player.vel.set(0, 0, 0);
  player.vy = 0;
  player.onGround = true;
}

function endJob(world, why) {
  const W = world.windowWasher;
  const inVehicle = why === 'vehicle';
  W.state = 'idle';
  W.cooldown = COOLDOWN;
  W.scrubbing = null; W.reachPanel = null; W.inReach = false; W.canScrub = false;
  W.swing = 0; W.swingV = 0; W.gust = 'calm';
  W.gy = FLOOR_PARK;
  placeRig(world);
  if (W.hud) W.hud.el.style.display = 'none';
  world.windowWasherHint = null;
  if (!inVehicle) putDown(world);

  const pct = W.total ? Math.round(100 * W.cleaned / W.total) : 0;
  const spotless = why === 'done' && W.cleaned === W.total && W.total > 0;
  const bonus = spotless ? 150 + 10 * W.rows : 0;
  const pay = Math.max(0, W.earned) + bonus;
  world.money += pay;
  const counts = why === 'done';
  const newBest = counts && pct > W.best;
  if (newBest) W.best = pct;
  if (W.cleaned > 0) {
    addRep(world, Math.max(1, Math.round(W.cleaned / 2)) + (spotless ? 15 : 0));
    world.addXP?.(W.cleaned * 4 + (spotless ? 60 : 0));
  }
  (counts && pct >= 75 ? sfxMissionPass : sfxMissionFail)();
  const title = spotless ? 'SPOTLESS!' : why === 'done' ? 'SHIFT DONE' : why === 'bail' ? 'BAILED OUT' : 'JOB ABANDONED';
  showMissionMsg(title, `${W.cleaned}/${W.total} panels clean (${pct}%) · ${W.missed} missed · $${pay}${bonus ? ` incl. $${bonus} spotless bonus` : ''}${newBest ? ' · NEW BEST!' : ''}`, '#5ac8ff');
  if (spotless && W.top >= 45) showNews('not a smear on it: one downtown tower\'s glass is sparkling today');
  world.onSave?.();
}

export function updateWindowWasher(world, dt, keys, pressed) {
  const W = world.windowWasher;
  if (!W) return;
  world.windowWasherHint = null;
  if (W.cooldown > 0) W.cooldown = Math.max(0, W.cooldown - dt);
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat && !player.inPlane;

  if (W.state === 'idle') {
    if (!onFoot || Math.hypot(player.pos.x - W.pos.x, player.pos.z - W.pos.z) > 3.2 || player.pos.y > 3) return;
    if (W.cooldown > 0) { world.windowWasherHint = 'SKYLINE GLASS CO. — the crew is refilling the buckets, back in a moment'; return; }
    world.windowWasherHint = `SKYLINE GLASS CO. — press <b>E</b> to wash the tower's windows (${W.rows} floors)${W.best ? ` · best ${W.best}% clean` : ''}`;
    if (pressed['KeyE']) startJob(world);
    return;
  }

  // ---- on the job: held in the cradle ----
  if (!onFoot) { endJob(world, 'vehicle'); return; }
  world.nearKiosk = true; // digits pick columns here, not weapons
  W.t += dt;

  if (W.state === 'ascend') {
    const startY = W.rowY[0] - CHEST + 1.2; // top row just below the chest: a full reach window
    W.gy = Math.min(startY, W.gy + HOIST * dt);
    placeRig(world);
    holdPlayer(world);
    if (W.gy >= startY - 1e-3) { W.state = 'work'; showToast('🧽 Top floor — start scrubbing!'); }
    world.windowWasherHint = 'Hoisting the cradle to the roof...';
    renderHud(world);
    return;
  }

  if (W.state === 'work' && pressed['Digit0']) { W.state = 'bail'; W.scrubbing = null; showToast('Bailing out — no pay for the rest'); }

  // column choice and slide
  for (let c = 0; c < COLS; c++) if (pressed['Digit' + (c + 1)]) W.col = c;
  const tx = W.colX[W.col];
  const dx = tx - W.gx;
  W.gx += Math.sign(dx) * Math.min(Math.abs(dx), SLIDE * dt);

  // wind: calm -> warn -> gust -> calm; the cradle is a damped spring along the face
  W.gustT -= dt;
  if (W.gustT <= 0) {
    if (W.gust === 'calm') { W.gust = 'warn'; W.gustT = 1.6; W.gustDir = Math.random() < 0.5 ? -1 : 1; showToast('💨 Gust incoming!'); }
    else if (W.gust === 'warn') { W.gust = 'gust'; W.gustT = 2.4; }
    else { W.gust = 'calm'; W.gustT = 7 + Math.random() * 5; }
  }
  const force = W.gust === 'gust' ? W.gustDir * 3.2 * (0.75 + 0.25 * Math.sin(W.t * 5.3)) : 0;
  W.swingV += (-6.5 * W.swing - 1.4 * W.swingV + force) * dt;
  W.swing += W.swingV * dt;

  // descend
  const lastRowPassed = W.rowY[W.rows - 1] - (W.gy + CHEST) > REACH;
  const speed = W.state === 'bail' ? BAIL : lastRowPassed ? FAST_DESCENT : DESCENT;
  W.gy = Math.max(FLOOR_PARK, W.gy - speed * dt);
  const chest = W.gy + CHEST;

  // panels that scrolled above reach while still dirty are missed
  for (const p of W.panels) {
    if (!p.dirty || p.missed) continue;
    if (p.y - chest > REACH) {
      p.missed = true; p.dirty = false;
      W.missed++;
      if (W.state === 'work') { W.earned -= MISS_COST; showToast(`❌ Missed a panel −$${MISS_COST}`); }
      if (W.scrubbing === p) W.scrubbing = null;
    }
  }

  // what's in reach: prefer the panel in the current column
  let best = null;
  for (const p of W.panels) {
    if (!p.dirty || Math.abs(p.y - chest) > REACH) continue;
    if (!best || Math.abs(p.c - W.col) < Math.abs(best.c - W.col) || (p.c === best.c && p.y > best.y)) best = p;
  }
  W.reachPanel = best ? { col: best.c, row: best.r, key: `Digit${best.c + 1}` } : null;
  const front = best && best.c === W.col ? best : null;
  const aligned = Math.abs(W.gx - tx) < ALIGN;
  const steady = Math.abs(W.swing) <= HARD_SWING;
  W.inReach = !!front;
  W.canScrub = W.state === 'work' && !!front && aligned && steady;

  if (W.canScrub && keys['KeyE']) {
    W.scrubbing = front;
    front.scrub += dt;
    const k = Math.max(0, 1 - front.scrub / SCRUB_TIME);
    front.mesh.scale.y = Math.max(0.001, k);
    front.mesh.position.y = front.y - (1 - k) * PANEL_H / 2; // wiped from the top down
    if (front.scrub >= SCRUB_TIME) {
      front.dirty = false; front.cleaned = true; front.mesh.visible = false;
      W.cleaned++;
      W.earned += PANEL_PAY;
      W.scrubbing = null;
      sfxPickup();
    }
  } else if (W.scrubbing && (!keys['KeyE'] || W.scrubbing !== front)) {
    W.scrubbing = null; // partial progress stays on the panel
  }

  placeRig(world);
  holdPlayer(world);

  if (W.gy <= FLOOR_PARK + 1e-3) {
    // anything left dirty when you hit the sidewalk was never going to be reached
    endJob(world, W.state === 'bail' ? 'bail' : 'done');
    return;
  }

  if (W.state === 'bail') world.windowWasherHint = 'Riding down...';
  else if (W.gust === 'warn') world.windowWasherHint = '💨 Gust incoming — finish that panel!';
  else if (!steady && front) world.windowWasherHint = '🌬️ Swinging too hard to scrub — wait for it to settle';
  else if (front && !aligned) world.windowWasherHint = 'Sliding over...';
  else if (front) world.windowWasherHint = `Hold <b>E</b> to scrub this panel${front.scrub > 0 ? ` (${Math.round(100 * front.scrub / SCRUB_TIME)}%)` : ''}`;
  else if (best) world.windowWasherHint = `Dirty panel in column <b>${best.c + 1}</b> — press <b>${best.c + 1}</b>`;
  else world.windowWasherHint = '<b>1</b> <b>2</b> <b>3</b> pick a column · hold <b>E</b> to scrub · <b>0</b> bail out';
  renderHud(world);
}

export function windowWasherSave(world) {
  return { washerBest: world.windowWasher?.best ?? 0 };
}
