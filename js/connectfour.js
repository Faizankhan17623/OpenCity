import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { postSign, faceNearestRoad } from './propKit.js';
import { createCharacter, animateIdle } from './characters.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// FOUR IN A ROW: an old-timer hustles Connect Four on a park table near spawn.
// Press E to sit down for a $20 game. Press 1-7 (0 also means column 7, for
// the phone digit row) to drop a red disc; he answers with yellow after a
// short think. Four in a row wins: a win pays 3x the stake, a draw refunds it,
// and walking off mid-game forfeits it. The board shows in a DOM panel and on
// a little upright frame on the table.

const STAKE = 20;
const WIN_MULT = 3;
const COOLDOWN = 6;
const RESULT_SHOW = 3.5;    // seconds the final board stays up
const REACH = 2.6;          // how close to the table to sit down
const CELL = 0.14;          // 3D frame cell size (m)

// --- board logic (pure) ---
// The board is a flat array of 42 cells, index r * 7 + c, row 0 at the bottom.
// 0 empty, 1 the player (red), 2 the old-timer (yellow).
const COLS = 7, ROWS = 6;
const ORDER = [3, 2, 4, 1, 5, 0, 6]; // centre first: search order and tie-break
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]]; // [dr, dc]: horizontal, vertical, both diagonals
const WINDOWS = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (const [dr, dc] of DIRS) {
  const r3 = r + dr * 3, c3 = c + dc * 3;
  if (r3 < 0 || r3 >= ROWS || c3 < 0 || c3 >= COLS) continue;
  WINDOWS.push([0, 1, 2, 3].map((k) => (r + dr * k) * COLS + c + dc * k));
}

function emptyBoard() { return new Array(COLS * ROWS).fill(0); }
function dropRow(b, c) { for (let r = 0; r < ROWS; r++) if (!b[r * COLS + c]) return r; return -1; }
function validCols(b) { return ORDER.filter((c) => b[(ROWS - 1) * COLS + c] === 0); }
function isFull(b) { return validCols(b).length === 0; }
// drop p's disc in column c; returns the cell index, or -1 if the column is full
function play(b, c, p) { const r = dropRow(b, c); if (r < 0) return -1; b[r * COLS + c] = p; return r * COLS + c; }
// the four cells of a line of p's, or null
function findWin(b, p) {
  for (const w of WINDOWS) if (b[w[0]] === p && b[w[1]] === p && b[w[2]] === p && b[w[3]] === p) return w;
  return null;
}
// does the disc at idx complete a four for p? (only checks lines through idx)
function winsFrom(b, idx, p) {
  const r0 = (idx / COLS) | 0, c0 = idx % COLS;
  for (const [dr, dc] of DIRS) {
    let n = 1;
    for (const s of [1, -1]) {
      let r = r0 + dr * s, c = c0 + dc * s;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && b[r * COLS + c] === p) { n++; r += dr * s; c += dc * s; }
    }
    if (n >= 4) return true;
  }
  return false;
}
function winsAt(b, c, p) {
  const i = play(b, c, p);
  if (i < 0) return false;
  const w = winsFrom(b, i, p);
  b[i] = 0;
  return w;
}
function evaluate(b, me) {
  const opp = 3 - me;
  let s = 0;
  for (let r = 0; r < ROWS; r++) { const v = b[r * COLS + 3]; if (v === me) s += 3; else if (v === opp) s -= 3; }
  for (const w of WINDOWS) {
    let m = 0, o = 0;
    for (const i of w) { if (b[i] === me) m++; else if (b[i] === opp) o++; }
    if (m && o) continue;
    if (m === 3) s += 6; else if (m === 2) s += 2;
    if (o === 3) s -= 8; else if (o === 2) s -= 2;
  }
  return s;
}
// negamax with alpha-beta: the score from p's point of view, p to move
function negamax(b, depth, alpha, beta, p) {
  const cols = validCols(b);
  if (!cols.length) return 0;
  for (const c of cols) if (winsAt(b, c, p)) return 100000 + depth;
  if (depth <= 0) return evaluate(b, p);
  let best = -Infinity;
  for (const c of cols) {
    const i = play(b, c, p);
    const v = -negamax(b, depth - 1, -beta, -alpha, 3 - p);
    b[i] = 0;
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
// the old-timer's column: win now, else block, else never set up the
// opponent's win, else a shallow search that prefers the centre
function aiMove(b, me = 2, depth = 4) {
  const opp = 3 - me;
  const cols = validCols(b);
  if (!cols.length) return -1;
  for (const c of cols) if (winsAt(b, c, me)) return c;
  for (const c of cols) if (winsAt(b, c, opp)) return c;
  const safe = cols.filter((c) => {
    const i = play(b, c, me);
    const bad = validCols(b).some((c2) => winsAt(b, c2, opp));
    b[i] = 0;
    return !bad;
  });
  const cand = safe.length ? safe : cols;
  let best = -Infinity, pick = cand[0];
  for (const c of cand) {
    const i = play(b, c, me);
    const v = -negamax(b, depth - 1, -Infinity, Infinity, opp);
    b[i] = 0;
    if (v > best) { best = v; pick = c; }
  }
  return pick;
}
// --- end board logic ---

export function initConnectFour(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(-20, 0, 40));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 2.5)) pos = world.city.spawn.clone().add(new THREE.Vector3(-24, 0, 44));
  placeStreetSite(world.city, pos, 2.6, 'connect-four');
  postSign(scene, world.city, pos, 'FOUR IN A ROW', { fg: '#fff6d8', bg: '#10264a', accent: '#ffd23a' }, { offset: 2.2 });

  // a park table, square to the road: the player sits on the street side
  // (local +z), the old-timer across from them, the upright frame between
  const yaw = faceNearestRoad(world.city, pos);
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5434, roughness: 0.85 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.6, metalness: 0.4 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m; };
  add(new THREE.BoxGeometry(1.5, 0.07, 1.0), wood, 0, 0.78, 0);              // table top
  const legGeo = new THREE.BoxGeometry(0.07, 0.76, 0.07);
  for (const [x, z] of [[-0.66, -0.42], [0.66, -0.42], [-0.66, 0.42], [0.66, 0.42]]) add(legGeo, iron, x, 0.38, z);
  for (const z of [-1.0, 1.0]) {                                              // benches
    add(new THREE.BoxGeometry(1.5, 0.06, 0.32), wood, 0, 0.45, z);
    for (const x of [-0.6, 0.6]) add(new THREE.BoxGeometry(0.06, 0.44, 0.06), iron, x, 0.22, z);
  }

  // the upright frame: a blue panel with 42 disc slots poking through it,
  // so the board reads from both sides; each slot swaps its material
  const W = COLS * CELL + 0.06, H = ROWS * CELL + 0.06, base = 0.86;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f4fb8, roughness: 0.45, metalness: 0.1 });
  add(new THREE.BoxGeometry(W, H, 0.03), frameMat, 0, base + H / 2, 0);
  add(new THREE.BoxGeometry(W + 0.2, 0.05, 0.2), frameMat, 0, 0.835, 0);     // foot
  const mats = {
    hole: new THREE.MeshStandardMaterial({ color: 0x0b1428, roughness: 0.9 }),
    red: new THREE.MeshStandardMaterial({ color: 0xe0302a, roughness: 0.4 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xf4c81e, roughness: 0.4 }),
  };
  const discGeo = new THREE.CylinderGeometry(CELL * 0.4, CELL * 0.4, 0.05, 16);
  const slotY = (r) => base + 0.03 + CELL / 2 + r * CELL;
  const slotX = (c) => (c - (COLS - 1) / 2) * CELL;   // column 1 on the player's left
  const slots = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const m = new THREE.Mesh(discGeo, mats.hole);
    m.rotation.x = Math.PI / 2;
    m.position.set(slotX(c), slotY(r), 0);
    group.add(m);
    slots.push(m);
  }
  const faller = new THREE.Mesh(discGeo, mats.red);   // the disc in mid-drop
  faller.rotation.x = Math.PI / 2;
  faller.visible = false;
  group.add(faller);

  group.position.set(pos.x, 0, pos.z);
  group.rotation.y = yaw;
  scene.add(group);

  const local = (x, z) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(pos.x, 0, pos.z));
  const oldTimer = createCharacter({ shirt: '#6a5a44', pants: '#3a3a42', skin: '#d9a06e', hair: '#d8d8d4' });
  oldTimer.group.position.copy(local(0, -1.25));
  oldTimer.group.rotation.y = yaw;       // facing the frame and the player
  scene.add(oldTimer.group);

  world.connectFour = {
    pos, yaw, seat: local(0, 1.25), oldTimer, slots, faller, mats, slotX, slotY,
    state: 'idle',        // idle -> yourTurn <-> aiThinking -> result -> idle
    board: emptyBoard(), winLine: null, lastMove: -1, outcome: null,
    think: 0, resultT: 0, cooldown: 0, moves: 0,
    fall: null,           // { idx, who, y } while a disc is dropping in 3D
    hud: null,
    wins: save?.c4Wins ?? 0,
  };
  renderFrame(world.connectFour);
}

function ensureHud(world) {
  const F = world.connectFour;
  if (F.hud) return F.hud;
  const el = document.createElement('div');
  el.id = 'connectfour';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:300px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#0a1430e0;border:1px solid #ffd23a;border-radius:6px;display:none;z-index:30;color:#fff6d8;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#ffd23a';
  const title = document.createElement('span');
  title.textContent = 'FOUR IN A ROW';
  const record = document.createElement('span');
  head.append(title, record);
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:6px;background:#1f4fb8;border-radius:6px';
  const nums = [];
  for (let c = 0; c < COLS; c++) {
    const n = document.createElement('div');
    n.style.cssText = 'text-align:center;font-weight:800;font-size:12px;color:#fff6d8';
    n.textContent = c === 6 ? '7/0' : String(c + 1);
    grid.appendChild(n);
    nums.push(n);
  }
  const cells = new Array(COLS * ROWS);
  for (let r = ROWS - 1; r >= 0; r--) for (let c = 0; c < COLS; c++) {
    const d = document.createElement('div');
    d.style.cssText = 'aspect-ratio:1;border-radius:50%;background:#0b1428;box-sizing:border-box';
    grid.appendChild(d);
    cells[r * COLS + c] = d;
  }
  const status = document.createElement('div');
  status.style.cssText = 'margin-top:6px;text-align:center;font-weight:800';
  const help = document.createElement('div');
  help.style.cssText = 'margin-top:4px;font-size:11px;opacity:.8;text-align:center';
  help.textContent = 'Press 1–7 to drop in a column (7 or 0 for the last) · E resigns';
  el.append(head, grid, status, help);
  document.body.appendChild(el);
  F.hud = { el, record, nums, cells, status };
  return F.hud;
}

const COLOURS = ['#0b1428', '#e0302a', '#f4c81e'];

function renderHud(world) {
  const F = world.connectFour, hud = ensureHud(world);
  hud.record.textContent = `stake $${STAKE} · wins ${F.wins}`;
  const win = new Set(F.winLine || []);
  for (let i = 0; i < hud.cells.length; i++) {
    const s = hud.cells[i].style;
    s.background = COLOURS[F.board[i]];
    s.outline = win.has(i) ? '3px solid #ffffff' : i === F.lastMove ? '2px solid #ffffffaa' : 'none';
  }
  const open = new Set(validCols(F.board));
  hud.nums.forEach((n, c) => { n.style.opacity = F.state === 'yourTurn' && open.has(c) ? '1' : '.35'; });
  hud.status.textContent =
    F.state === 'yourTurn' ? 'Your move (red)' :
    F.state === 'aiThinking' ? 'The old-timer is thinking…' :
    F.outcome === 'win' ? `You win! +$${STAKE * WIN_MULT}` :
    F.outcome === 'draw' ? `Draw: stake refunded ($${STAKE})` :
    F.outcome === 'forfeit' ? 'Forfeit: the old-timer keeps the stake' :
    'The old-timer wins';
  hud.status.style.color = F.outcome === 'win' ? '#7cf78c' : F.outcome === 'draw' || !F.outcome ? '#fff6d8' : '#ff7a6a';
}

// sync the 3D frame with the board; the dropping disc's cell stays empty until it lands
function renderFrame(F) {
  for (let i = 0; i < F.slots.length; i++) {
    const v = F.fall && F.fall.idx === i ? 0 : F.board[i];
    F.slots[i].material = v === 1 ? F.mats.red : v === 2 ? F.mats.yellow : F.mats.hole;
  }
}

function dropDisc(world, c, who) {
  const F = world.connectFour;
  const idx = play(F.board, c, who);
  if (idx < 0) return -1;
  F.lastMove = idx;
  F.moves++;
  F.fall = { idx, who, y: F.slotY(ROWS) + 0.1, vy: 0 };
  F.faller.material = who === 1 ? F.mats.red : F.mats.yellow;
  F.faller.position.set(F.slotX(c), F.fall.y, 0);
  F.faller.visible = true;
  renderFrame(F);
  return idx;
}

function startGame(world) {
  const F = world.connectFour;
  world.money -= STAKE;
  F.board = emptyBoard();
  F.winLine = null; F.lastMove = -1; F.outcome = null; F.moves = 0;
  F.fall = null; F.faller.visible = false;
  F.state = 'yourTurn';
  renderFrame(F);
  ensureHud(world).el.style.display = 'block';
  sfxPickup();
  showMissionMsg('FOUR IN A ROW', `$${STAKE} on the table · press 1–7 (or 0 for 7) to drop · E resigns`, '#ffd23a');
}

function endGame(world, outcome) {
  const F = world.connectFour;
  F.state = 'result';
  F.outcome = outcome;
  F.resultT = RESULT_SHOW;
  F.cooldown = COOLDOWN;
  world.connectFourHint = null;
  if (outcome === 'win') {
    const pay = STAKE * WIN_MULT;
    world.money += pay;
    F.wins++;
    world.addXP?.(40);
    addRep(world, 15);
    sfxMissionPass();
    showMissionMsg('FOUR IN A ROW!', `You beat the old-timer · +$${pay} · ${F.wins} win${F.wins === 1 ? '' : 's'} total`, '#7cf78c');
    if (F.wins === 10) showNews('a park hustler swears he will never play the slinger at Connect Four again');
  } else if (outcome === 'draw') {
    world.money += STAKE;
    sfxPickup();
    showMissionMsg('DRAW', `Board's full · your $${STAKE} back`, '#ffd23a');
  } else if (outcome === 'forfeit') {
    sfxMissionFail();
    showMissionMsg('FORFEIT', `You got up from the table · the old-timer pockets your $${STAKE}`, '#ff7a6a');
  } else {
    sfxMissionFail();
    showMissionMsg('OUTPLAYED', '"Fifty years at this table, kid. Again?"', '#ff7a6a');
  }
  renderHud(world);
  world.onSave?.();
}

// after a disc lands (logically): win, draw, or hand over the turn
function afterMove(world, who, idx) {
  const F = world.connectFour;
  if (winsFrom(F.board, idx, who)) {
    F.winLine = findWin(F.board, who);
    endGame(world, who === 1 ? 'win' : 'lose');
  } else if (isFull(F.board)) {
    endGame(world, 'draw');
  } else if (who === 1) {
    F.state = 'aiThinking';
    F.think = 0.7 + Math.random() * 0.7;
  } else {
    F.state = 'yourTurn';
  }
}

export function updateConnectFour(world, dt, keys, pressed) {
  const F = world.connectFour;
  if (!F) return;
  world.connectFourHint = null;
  if (F.cooldown > 0 && F.state !== 'result') F.cooldown = Math.max(0, F.cooldown - dt);
  animateIdle(F.oldTimer);

  // the dropping disc falls under gravity in its column and settles into the slot
  if (F.fall) {
    const ty = F.slotY((F.fall.idx / COLS) | 0);
    F.fall.vy += 9.8 * dt;
    F.fall.y -= F.fall.vy * dt;
    if (F.fall.y <= ty) { F.fall = null; F.faller.visible = false; renderFrame(F); }
    else F.faller.position.y = F.fall.y;
  }

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const d = Math.hypot(player.pos.x - F.pos.x, player.pos.z - F.pos.z);

  if (F.state === 'result') {
    F.resultT -= dt;
    if (F.resultT <= 0) { F.state = 'idle'; if (F.hud) F.hud.el.style.display = 'none'; }
    return;
  }

  if (F.state === 'idle') {
    if (!onFoot || d > REACH) return;
    if (F.cooldown > 0) { world.connectFourHint = 'FOUR IN A ROW — the old-timer is setting up the board…'; return; }
    world.connectFourHint = `FOUR IN A ROW — press <b>E</b> to play the old-timer ($${STAKE}, win pays $${STAKE * WIN_MULT})${F.wins ? ` · ${F.wins} won` : ''}`;
    if (pressed['KeyE']) {
      if (world.money < STAKE) { showToast(`"No stake, no game." You need $${STAKE}.`); sfxMissionFail(); return; }
      startGame(world);
    }
    return;
  }

  // ---- a game is running: the player stays seated; leaving forfeits ----
  if (!onFoot || d > REACH + 1.5) { endGame(world, 'forfeit'); return; }
  if (pressed['KeyE']) { endGame(world, 'forfeit'); return; }
  player.pos.x = F.seat.x; player.pos.z = F.seat.z;
  player.vel.x = 0; player.vel.z = 0;
  world.nearKiosk = true; // digits drop discs here, not switch weapons

  if (F.state === 'yourTurn') {
    let col = -1;
    for (let n = 1; n <= 7; n++) if (pressed['Digit' + n]) { col = n - 1; break; }
    if (col < 0 && pressed['Digit0']) col = 6;
    if (col >= 0) {
      const idx = dropDisc(world, col, 1);
      if (idx < 0) showToast(`Column ${col + 1} is full`);
      else { sfxPickup(); afterMove(world, 1, idx); }
    }
    world.connectFourHint = 'FOUR IN A ROW — your move: <b>1</b>–<b>7</b> (<b>0</b> = 7) drops a disc · <b>E</b> resigns';
  } else if (F.state === 'aiThinking') {
    if (!F.fall) F.think -= dt;
    if (F.think <= 0) {
      const col = aiMove(F.board, 2, 4);
      const idx = dropDisc(world, col, 2);
      if (idx >= 0) afterMove(world, 2, idx);
    }
    world.connectFourHint = 'FOUR IN A ROW — the old-timer strokes his chin… · <b>E</b> resigns';
  }
  if (F.state !== 'result') renderHud(world);
}

export function connectFourSave(world) {
  return { c4Wins: world.connectFour?.wins };
}
