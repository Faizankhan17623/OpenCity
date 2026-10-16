import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { storefront, faceNearestRoad } from './propKit.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// LUCKY HOOVES OTB: an off-track betting parlour near spawn. Press E for the
// race card, 1-6 to pick a runner and 1-4 for a stake, then watch a 25 second
// race from Lucky Downs on the parlour's screen. A race goes off every three
// minutes whether anyone bets or not; a bet sends the field to post at once.
//
// Unlike the casino games, this one rewards homework. Every horse in the
// stable has a hidden ability that never changes, plus a hidden condition on
// the day. The bookie's odds come from a noisy read of ability and ignore the
// paddock entirely. The form line shows each horse's last four finishes
// (which track ability over time) and a paddock note (which tracks today's
// condition), so a player who reads the card can find horses the odds
// underrate. The margin is about 18%, so a lazy punter still loses.

// ---- race maths (pure) ----
// Kept free of THREE and the DOM so a node script can lift this block out and
// simulate thousands of races (see the scratchpad odds simulation).
const STABLE = [
  { name: 'Biscuit Thunder', base: 0.95, style: 'closer' },
  { name: 'Mortgage Payment', base: 0.15, style: 'front' },
  { name: 'Sir Trots-a-Lot', base: 0.5, style: 'stalker' },
  { name: 'Glue Factory Escapee', base: -0.7, style: 'front' },
  { name: 'Neigh Sayer', base: 0.0, style: 'closer' },
  { name: 'Pony Soprano', base: 0.75, style: 'front' },
  { name: 'Mane Event', base: 0.3, style: 'stalker' },
  { name: 'Oats McGee', base: -0.35, style: 'closer' },
  { name: 'Feeling Saddle', base: 0.1, style: 'stalker' },
  { name: 'Haywire Harold', base: -0.15, style: 'front' },
  { name: 'Galloping Gran', base: -0.85, style: 'closer' },
  { name: 'Unpaid Intern', base: 0.45, style: 'front' },
];
const FIELD = 6;
const STRENGTH = 1.25;      // softmax sharpness: rating gap -> win chance
const COND_SD = 0.38;       // hidden condition on the day (the paddock note hints at it)
const BOOK_SD = 0.3;        // how badly the bookie reads ability
const OVERROUND = 1.16;     // book adds up to ~116%; rounding down to the ladder adds a little more
const BOOK_SHRINK = 0.8;    // the bookie hedges toward the field (its read is noisy)
const NOTE_SD = 0.18;       // the paddock note is a hint, not a guarantee
const LADDER = [[2, '2/1'], [2.5, '5/2'], [3, '3/1'], [3.5, '7/2'], [4, '4/1'], [4.5, '9/2'], [5, '5/1'], [6, '6/1'],
  [7, '7/1'], [8, '8/1'], [10, '10/1'], [12, '12/1'], [14, '14/1'], [16, '16/1'], [20, '20/1']];
const PADDOCK = [
  [0.3, 'on its toes, coat gleaming'],
  [0.1, 'worked well this week'],
  [-0.1, 'nothing to report'],
  [-0.3, 'a bit sluggish in the paddock'],
  [-Infinity, 'sweating up, looks unhappy'],
];
const STYLE_NAME = { front: 'front-runner', stalker: 'stalker', closer: 'closer' };

function gauss(rng) {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

function softmax(xs, k) {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(k * (x - m)));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

// Plackett-Luce: draw a winner by probability, remove it, repeat.
// Win frequency of each runner is therefore exactly its true probability.
function drawOrder(p, rng) {
  const left = p.map((_, i) => i);
  const order = [];
  while (left.length) {
    const tot = left.reduce((s, i) => s + p[i], 0);
    let r = rng() * tot, k = 0;
    while (k < left.length - 1 && (r -= p[left[k]]) > 0) k++;
    order.push(left.splice(k, 1)[0]);
  }
  return order;
}

// Fresh form for a horse: four earlier runs in random fields.
function seedHistory(rng) {
  return STABLE.map((h) => {
    const runs = [];
    for (let n = 0; n < 4; n++) {
      const others = [];
      for (let k = 0; k < FIELD - 1; k++) others.push(STABLE[(rng() * STABLE.length) | 0].base + gauss(rng) * COND_SD);
      const field = [h.base + gauss(rng) * COND_SD, ...others];
      runs.push(drawOrder(softmax(field, STRENGTH), rng).indexOf(0) + 1);
    }
    return runs;
  });
}

// A race card: six runners from the stable, true chances, the bookie's odds.
function makeCard(history, rng) {
  const pool = STABLE.map((_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const ids = pool.slice(0, FIELD);
  const cond = ids.map(() => gauss(rng) * COND_SD);
  const truth = ids.map((id, i) => STABLE[id].base + cond[i]);
  const seen = ids.map((id) => STABLE[id].base + gauss(rng) * BOOK_SD);
  // flatten an over-strong field so the favourite never beats the 2/1 floor
  let k = STRENGTH, q = softmax(seen, k * BOOK_SHRINK);
  while (Math.max(...q) * OVERROUND > 1 / 3 && k > 0.2) { k *= 0.92; q = softmax(seen, k * BOOK_SHRINK); }
  const p = softmax(truth, k);
  const runners = ids.map((id, i) => {
    const fair = 1 / (q[i] * OVERROUND) - 1;
    let rung = LADDER[0];
    for (const r of LADDER) if (r[0] <= fair) rung = r; // round down: shorter odds keep the margin
    const note = PADDOCK.find((b) => cond[i] + gauss(rng) * NOTE_SD > b[0])[1];
    return {
      id, name: STABLE[id].name, style: STABLE[id].style,
      odds: rung[0], oddsText: rung[1],
      form: history[id].join('-'), note,
      p: p[i], // hidden
    };
  });
  return { runners, k };
}

// Push the latest finishes onto each runner's form line (most recent first).
function recordResult(history, card, order) {
  order.forEach((lane, place) => {
    const h = history[card.runners[lane].id];
    h.unshift(place + 1);
    h.length = 4;
  });
}

// Finish times in the drawn order, plus a speed profile per runner so the
// race has front-runners fading, closers sweeping late and the odd surge.
function raceScript(card, order, rng) {
  const n = card.runners.length;
  const finish = new Array(n);
  let t = 23.6 + rng() * 1.6;
  order.forEach((lane, place) => {
    finish[lane] = t;
    t += place === 0 ? (rng() < 0.25 ? 0.04 + rng() * 0.12 : 0.2 + rng() * 0.6) : 0.15 + rng() * 0.9;
  });
  const STEPS = 120;
  const curves = card.runners.map((r, lane) => {
    const place = order.indexOf(lane);
    // the placed horses get a late kick more often, so the finish is a fight
    const surgeAt = place < 2 && rng() < 0.75 ? 0.72 + rng() * 0.2 : 0.25 + rng() * 0.6;
    const surge = 0.12 + rng() * 0.22;
    const wob = 0.03 + rng() * 0.04, wf = 1 + rng() * 2, wp = rng() * 6.28;
    const speed = (u) => {
      let s = r.style === 'front' ? 1.2 - 0.42 * u
        : r.style === 'closer' ? 0.84 + 0.42 * Math.min(1, Math.max(0, (u - 0.5) / 0.4))
        : 1.0 + 0.08 * Math.sin(Math.PI * u);
      s += surge * Math.exp(-(((u - surgeAt) / 0.09) ** 2));
      s += wob * Math.sin(2 * Math.PI * wf * u + wp);
      return Math.max(0.2, s);
    };
    const cum = [0];
    for (let i = 1; i <= STEPS; i++) cum.push(cum[i - 1] + speed((i - 0.5) / STEPS));
    const total = cum[STEPS];
    return cum.map((c) => c / total);
  });
  return { finish, curves, end: Math.max(...finish) + 0.4 };
}

// Distance run (0 start, 1 the post) by a lane at race time t.
function raceX(script, lane, t) {
  const u = Math.min(1, Math.max(0, t / script.finish[lane]));
  const c = script.curves[lane], f = u * (c.length - 1), i = Math.min(c.length - 2, f | 0);
  return c[i] + (c[i + 1] - c[i]) * (f - i);
}
// ---- end race maths ----

const CYCLE = 180;          // a race goes off every three minutes
const TO_POST = 5;          // a bet loads the gates: off in a few seconds
const COOLDOWN = 9;         // results board stays up before the next card
const STAKES = [10, 50, 100, 500];
const SILKS = ['#d8262c', '#f2f2f2', '#2a5cd8', '#f2d22a', '#2aa04a', '#1a1a1a'];
const SILK_INK = ['#fff', '#111', '#fff', '#111', '#fff', '#fff'];
const REACH = 3.0;

export function initHorseBets(scene, world, save) {
  const pos = world.city.spawn.clone().add(new THREE.Vector3(-34, 0, -48));
  placeStreetSite(world.city, pos, 3.4, 'horse-bets');
  const yaw = faceNearestRoad(world.city, pos);
  const local = (x, z) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(pos.x, 0, pos.z));

  const shopPos = local(0, -1.4);
  const shop = storefront(scene, world.city, shopPos, {
    name: 'LUCKY HOOVES OTB', w: 4.2, h: 2.9, d: 2.2, wall: 0x2e4a32, accent: 0xb8862a,
    sign: { fg: '#fff2c0', bg: '#123018', accent: '#ffcc40' },
  });
  shop.group.position.set(shopPos.x, 0, shopPos.z);
  shop.group.rotation.y = yaw;
  // a brass betting rail out front and a lit odds screen on a post beside it
  const rail = new THREE.MeshStandardMaterial({ color: 0xb8862a, roughness: 0.4, metalness: 0.6 });
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.55, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x08200c, emissive: 0x40ff70, emissiveIntensity: 0.6, roughness: 0.3 })
  );
  screen.position.set(1.75, 1.75, 2.1);
  shop.group.add(screen);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8), rail);
  pole.position.set(1.75, 0.75, 2.05);
  shop.group.add(pole);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 8), rail);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.95, 2.1);
  shop.group.add(bar);
  for (const x of [-1.2, 1.2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 8), rail);
    post.position.set(x, 0.48, 2.1);
    shop.group.add(post);
  }

  const history = seedHistory(Math.random);
  world.horseBets = {
    pos, yaw,
    stand: local(0, 1.3),            // where a punter stands at the counter
    state: 'open',                    // open (card up, post counting down) -> racing -> result -> open
    ui: 'closed',                     // closed | card | stake | watch
    post: CYCLE, t: 0, cooldown: 0,
    history, card: makeCard(history, Math.random), script: null, order: null,
    pick: -1, bet: null,             // bet: { lane, stake }
    lastBet: null,                    // { lane, stake, place, won, payout } for the most recent settled bet
    leader: -1, commentary: '', sayT: 0, milestone: 0,
    profit: save?.horseBetsProfit ?? 0,
    races: 0,
    hud: null,
  };
}

// ---------- the panel ----------

function ensureHud(world) {
  const H = world.horseBets;
  if (H.hud) return H.hud;
  const el = document.createElement('div');
  el.id = 'horsebets';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:460px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#08160ce8;border:1px solid #ffcc40;border-radius:6px;display:none;z-index:30;color:#fff2c0;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#ffcc40';
  const headL = document.createElement('span');
  const headR = document.createElement('span');
  head.append(headL, headR);
  const body = document.createElement('div');

  // the track: six lanes of turf with a finish post on the right
  const track = document.createElement('div');
  track.style.cssText = 'position:relative;background:repeating-linear-gradient(90deg,#2f6a2a 0 24px,#2a6126 24px 48px);border:1px solid #0008;border-radius:4px;overflow:hidden;display:none';
  const post = document.createElement('div');
  post.style.cssText = 'position:absolute;top:0;bottom:0;right:26px;width:3px;background:repeating-linear-gradient(#fff 0 6px,#d8262c 6px 12px);opacity:.9';
  track.appendChild(post);
  const lanes = [];
  for (let i = 0; i < FIELD; i++) {
    const lane = document.createElement('div');
    lane.style.cssText = 'position:relative;height:26px;border-bottom:1px dashed #ffffff26';
    const tag = document.createElement('span');
    tag.style.cssText = `position:absolute;left:3px;top:5px;width:16px;height:16px;border-radius:3px;font:800 11px/16px system-ui;text-align:center;background:${SILKS[i]};color:${SILK_INK[i]}`;
    tag.textContent = String(i + 1);
    const name = document.createElement('span');
    name.style.cssText = 'position:absolute;left:24px;top:6px;font:600 11px system-ui;color:#ffffff80;white-space:nowrap';
    const horse = document.createElement('span');
    horse.style.cssText = 'position:absolute;top:0;left:18px;font-size:21px;line-height:26px;will-change:transform';
    const rider = document.createElement('span');
    rider.style.cssText = 'display:inline-block;transform:scaleX(-1)'; // the emoji gallops left; turn it to face the post
    rider.textContent = '🏇';
    horse.appendChild(rider);
    lane.append(tag, name, horse);
    track.appendChild(lane);
    lanes.push({ lane, name, horse });
  }
  const call = document.createElement('div');
  call.style.cssText = 'margin-top:6px;min-height:18px;font:800 13px system-ui;color:#fff;font-style:italic';
  const foot = document.createElement('div');
  foot.style.cssText = 'margin-top:6px;font-size:11px;opacity:.75';
  el.append(head, body, track, call, foot);
  document.body.appendChild(el);
  H.hud = { el, headL, headR, body, track, lanes, call, foot, view: '' };
  return H.hud;
}

function clock(s) {
  s = Math.max(0, Math.ceil(s));
  return `${(s / 60) | 0}:${String(s % 60).padStart(2, '0')}`;
}

function cardRow(r, i, chosen) {
  const row = document.createElement('div');
  row.style.cssText = `display:flex;gap:8px;align-items:baseline;padding:3px 4px;border-radius:4px;${chosen ? 'background:#ffcc4033;outline:1px solid #ffcc40' : ''}`;
  const tag = document.createElement('span');
  tag.style.cssText = `flex:none;width:16px;height:16px;border-radius:3px;font:800 11px/16px system-ui;text-align:center;background:${SILKS[i]};color:${SILK_INK[i]}`;
  tag.textContent = String(i + 1);
  const mid = document.createElement('div');
  mid.style.cssText = 'flex:1;min-width:0';
  const nm = document.createElement('div');
  nm.style.cssText = 'font-weight:800;color:#fff';
  nm.textContent = r.name;
  const form = document.createElement('div');
  form.style.cssText = 'font-size:11px;opacity:.75';
  form.textContent = `form ${r.form} · ${STYLE_NAME[r.style]} · “${r.note}”`;
  mid.append(nm, form);
  const odds = document.createElement('span');
  odds.style.cssText = 'flex:none;font:800 15px system-ui;color:#ffcc40;min-width:44px;text-align:right';
  odds.textContent = r.oddsText;
  row.append(tag, mid, odds);
  return row;
}

function showView(hud, view) {
  if (hud.view === view) return false;
  hud.view = view;
  hud.bodyKey = '';
  const race = view === 'race';
  hud.track.style.display = race ? 'block' : 'none';
  hud.call.style.display = race ? 'block' : 'none';
  hud.body.style.display = race ? 'none' : 'block';
  return true;
}

function renderCard(world) {
  const H = world.horseBets, hud = ensureHud(world);
  showView(hud, 'card');
  hud.headL.textContent = `LUCKY DOWNS · RACE ${H.races + 1}`;
  hud.headR.textContent = H.bet ? `off in ${Math.ceil(H.post)}s` : `off in ${clock(H.post)}`;
  hud.foot.textContent = `${H.ui === 'stake' ? 'E backs out' : 'E to leave'} · lifetime P/L ${H.profit >= 0 ? '+' : '-'}$${Math.abs(H.profit)} · cash $${world.money}`;
  // the rows only change when the card, the pick or the bet does
  const key = `${H.races}|${H.ui}|${H.pick}|${H.bet ? H.bet.lane : -1}`;
  if (hud.bodyKey === key) return;
  hud.bodyKey = key;
  const rows = H.card.runners.map((r, i) => cardRow(r, i, H.bet ? H.bet.lane === i : H.ui === 'stake' && H.pick === i));
  const tip = document.createElement('div');
  tip.style.cssText = 'margin-top:6px;font-size:12px;color:#ffcc40';
  if (H.ui === 'stake') {
    const r = H.card.runners[H.pick];
    tip.textContent = `${r.name} at ${r.oddsText} — stake: ` +
      STAKES.map((s, k) => `${k + 1} $${s} (returns $${Math.round(s * r.odds + s)})`).join(' · ');
  } else if (H.bet) {
    const r = H.card.runners[H.bet.lane];
    tip.textContent = `$${H.bet.stake} on ${r.name} at ${r.oddsText}. They're going behind the stalls...`;
  } else {
    tip.textContent = 'Read the form: last four finishes (latest first), running style and the paddock note. Pick a runner 1–6.';
  }
  hud.body.replaceChildren(...rows, tip);
}

function renderRace(world) {
  const H = world.horseBets, hud = ensureHud(world);
  if (showView(hud, 'race')) {
    H.card.runners.forEach((r, i) => { hud.lanes[i].name.textContent = r.name; });
    hud.trackW = hud.track.clientWidth || 440; // measured once per race, not every frame
  }
  const run = hud.trackW - 18 - 26 - 26; // from the gate to the post, less the emoji's width
  H.card.runners.forEach((r, i) => {
    const x = H.script ? raceX(H.script, i, H.t) : 0;
    hud.lanes[i].horse.style.transform = `translateX(${Math.round(x * run)}px)`;
    hud.lanes[i].lane.style.background = H.bet && H.bet.lane === i ? '#ffcc4022' : '';
  });
  hud.headL.textContent = `LUCKY DOWNS · RACE ${H.races + 1}`;
  hud.headR.textContent = H.state === 'racing' ? `${H.t.toFixed(1)}s` : 'RESULT';
  if (hud.call.textContent !== H.commentary) hud.call.textContent = H.commentary;
  if (H.state === 'result') {
    hud.foot.textContent = H.order.map((lane, k) => `${k + 1}. ${H.card.runners[lane].name}`).join('  ') +
      (H.lastBet && H.lastBet.race === H.races ? `  ·  ${H.lastBet.won ? `WON +$${H.lastBet.payout}` : `lost $${H.lastBet.stake}`}` : '');
  } else {
    const r = H.bet && H.card.runners[H.bet.lane];
    hud.foot.textContent = (r ? `your $${H.bet.stake} on ${r.name} (${r.oddsText}) · ` : 'no bet · ') + 'E to leave';
  }
}

function closePanel(world) {
  const H = world.horseBets;
  H.ui = 'closed';
  if (H.hud) { H.hud.el.style.display = 'none'; H.hud.view = ''; }
}

function openPanel(world, ui) {
  const H = world.horseBets;
  H.ui = ui;
  ensureHud(world).el.style.display = 'block';
}

// ---------- the race ----------

function say(H, text) { H.commentary = text; H.sayT = 0; }

function startRace(world) {
  const H = world.horseBets;
  H.order = drawOrder(H.card.runners.map((r) => r.p), Math.random);
  H.script = raceScript(H.card, H.order, Math.random);
  H.state = 'racing';
  H.t = 0; H.leader = -1; H.milestone = 0; H.sayT = 0;
  say(H, "AND THEY'RE OFF at Lucky Downs!");
  if (H.ui === 'card' || H.ui === 'stake') { H.ui = 'watch'; showToast("They're off — betting is closed"); }
}

function standings(H) {
  return H.card.runners.map((_, i) => i).sort((a, b) => raceX(H.script, b, H.t) - raceX(H.script, a, H.t));
}

function commentate(world, dt) {
  const H = world.horseBets, R = H.card.runners;
  H.sayT += dt;
  const rank = standings(H);
  const lead = rank[0], lx = raceX(H.script, lead, H.t);
  const nm = (i) => R[i].name;
  // who has gained the most places lately: the "makes a move" horse
  const back = Math.max(0, H.t - 3);
  const before = R.map((_, i) => i).sort((a, b) => raceX(H.script, b, back) - raceX(H.script, a, back));
  let mover = rank[1], gain = 0;
  for (const i of rank.slice(0, 4)) { const g = before.indexOf(i) - rank.indexOf(i); if (g > gain) { gain = g; mover = i; } }

  if (H.milestone === 0 && lx > 0.22) { H.milestone = 1; say(H, `Round the turn — ${nm(lead)} leads from ${nm(rank[1])}, ${nm(rank[5])} detached at the back`); }
  else if (H.milestone === 1 && lx > 0.48) { H.milestone = 2; say(H, `Halfway — ${nm(lead)} in front, ${nm(rank[1])} tracking on the rail`); }
  else if (H.milestone === 2 && lx > 0.72) { H.milestone = 3; say(H, `Into the final furlong — ${nm(mover === lead ? rank[1] : mover)} makes a move!`); }
  else if (H.milestone === 3 && lx > 0.9) {
    H.milestone = 4;
    const gap = lx - raceX(H.script, rank[1], H.t);
    say(H, gap < 0.012 ? `${nm(lead)} and ${nm(rank[1])} — nothing between them!` : `${nm(lead)} digs deep, ${nm(rank[1])} closing!`);
  } else if (lead !== H.leader && H.leader >= 0 && H.sayT > 1.4 && lx < 0.985) {
    say(H, lx > 0.7 ? `${nm(lead)} hits the front!` : `${nm(lead)} takes it up`);
  }
  H.leader = lead;
}

function finishRace(world) {
  const H = world.horseBets, R = H.card.runners;
  const win = H.order[0];
  const photo = H.script.finish[H.order[1]] - H.script.finish[win] < 0.17;
  say(H, photo ? `PHOTO FINISH... ${R[win].name} by a nose!` : `${R[win].name} wins it at ${R[win].oddsText}!`);
  H.state = 'result';
  H.cooldown = COOLDOWN;
  recordResult(H.history, H.card, H.order);

  if (H.bet) {
    const { lane, stake } = H.bet, r = R[lane];
    const place = H.order.indexOf(lane) + 1;
    const won = place === 1;
    const payout = won ? Math.round(stake * r.odds + stake) : 0;
    if (won) world.money += payout;
    H.profit += payout - stake;
    H.lastBet = { race: H.races, lane, name: r.name, stake, place, won, payout };
    const ord = ['', '1st', '2nd', '3rd', '4th', '5th', '6th'][place];
    const watching = H.ui === 'watch';
    if (won) {
      sfxMissionPass();
      world.addXP?.(10 + Math.round(r.odds * 3));
      addRep(world, Math.round(5 + r.odds * 2));
      if (watching) showMissionMsg(`🏇 ${r.name.toUpperCase()} WINS!`, `$${stake} at ${r.oddsText} returns $${payout}`, '#ffcc40');
      else showToast(`🏇 LUCKY HOOVES: ${r.name} won at ${r.oddsText}! +$${payout}`);
      if (r.odds >= 10 && stake >= 100) showNews(`punter lands a ${r.oddsText} shot on ${r.name} at Lucky Downs`);
    } else {
      sfxMissionFail();
      const msg = `${R[win].name} won · your ${r.name} finished ${ord} (-$${stake})`;
      if (watching) showMissionMsg('🏇 NOT THIS TIME', msg, '#ffcc40');
      else showToast(`🏇 LUCKY HOOVES: ${msg}`);
    }
    H.bet = null;
    world.onSave?.();
  }
}

function newCard(world) {
  const H = world.horseBets;
  H.races++;
  H.card = makeCard(H.history, Math.random);
  H.script = null; H.order = null; H.t = 0;
  H.state = 'open';
  H.post = CYCLE - COOLDOWN - 26; // keep the off on a three-minute rhythm
  H.commentary = '';
  if (H.ui === 'watch') H.ui = 'card';
}

// ---------- per frame ----------

export function updateHorseBets(world, dt, keys, pressed) {
  const H = world.horseBets;
  if (!H) return;
  world.horseBetsHint = null;

  // the race clock runs whether anyone is watching or not
  if (H.state === 'open') {
    H.post -= dt;
    if (H.post <= 0) startRace(world);
  } else if (H.state === 'racing') {
    H.t += dt;
    commentate(world, dt);
    if (H.t >= H.script.end) finishRace(world);
  } else if (H.state === 'result') {
    H.cooldown -= dt;
    if (H.cooldown <= 0) newCard(world);
  }

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const d = Math.hypot(player.pos.x - H.stand.x, player.pos.z - H.stand.z);

  if (H.ui === 'closed') {
    if (!onFoot || d > REACH) return;
    const label = 'LUCKY HOOVES OTB';
    if (H.state === 'open') {
      world.horseBetsHint = H.bet
        ? `${label} — your bet is on, off in ${Math.ceil(H.post)}s · <b>E</b> to watch`
        : `${label} — press <b>E</b> for the race card (off in ${clock(H.post)})`;
    } else if (H.state === 'racing') {
      world.horseBetsHint = `${label} — race in progress · <b>E</b> to watch`;
    } else {
      world.horseBetsHint = `${label} — results are in, next card in ${Math.ceil(H.cooldown)}s · <b>E</b> to see them`;
    }
    if (pressed['KeyE']) {
      openPanel(world, H.state === 'open' && !H.bet ? 'card' : 'watch');
      sfxPickup();
    }
    return;
  }

  // ---- the panel is up ----
  const committed = !!H.bet;                       // a bet riding on this race
  const digits = H.ui === 'card' || H.ui === 'stake';
  if (!onFoot || (!committed && !digits && d > REACH + 3)) { closePanel(world); return; }
  if (pressed['KeyE']) {
    if (H.ui === 'stake') { H.ui = 'card'; H.pick = -1; }
    else {
      closePanel(world);
      if (committed) showToast('🏇 Your bet still stands — the result will come through');
      return;
    }
  }
  if (digits || committed) {
    // the punter stays at the counter while choosing and while their horse runs
    player.pos.x = H.stand.x; player.pos.z = H.stand.z;
    player.vel.x = 0; player.vel.z = 0;
  }
  if (digits) {
    world.nearKiosk = true; // the number keys bet here, not switch weapons
    if (H.ui === 'card') {
      const n = [1, 2, 3, 4, 5, 6].find((k) => pressed['Digit' + k]);
      if (n) { H.pick = n - 1; H.ui = 'stake'; sfxPickup(); }
      world.horseBetsHint = 'LUCKY HOOVES — press <b>1</b>–<b>6</b> to pick a runner · <b>E</b> to leave';
    } else {
      const n = [1, 2, 3, 4].find((k) => pressed['Digit' + k]);
      if (n) {
        const stake = STAKES[n - 1];
        if (world.money < stake) { showToast(`Not enough cash for a $${stake} stake`); sfxMissionFail(); }
        else {
          world.money -= stake;
          H.bet = { lane: H.pick, stake };
          H.post = Math.min(H.post, TO_POST);
          H.ui = 'watch';
          sfxPickup();
          showToast(`🎟 $${stake} on ${H.card.runners[H.pick].name} at ${H.card.runners[H.pick].oddsText}`);
          world.onSave?.();
        }
      }
      world.horseBetsHint = 'LUCKY HOOVES — stake <b>1</b> $10 · <b>2</b> $50 · <b>3</b> $100 · <b>4</b> $500 · <b>E</b> back';
    }
  } else {
    world.horseBetsHint = committed
      ? 'LUCKY HOOVES — come on! · <b>E</b> to leave (your bet still stands)'
      : 'LUCKY HOOVES — <b>E</b> to leave';
  }

  if (H.state === 'open') renderCard(world);
  else renderRace(world);
}

export function horseBetsSave(world) {
  return { horseBetsProfit: world.horseBets?.profit ?? 0 };
}
