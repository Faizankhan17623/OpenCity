import * as THREE from 'three';
import { availableFunds, spendMoney } from './wallet.js';
import { placeStreetSite } from './site-layout.js';
import { showToast, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass } from './sound.js';

// PROPERTY EMPIRE: legitimate businesses you buy with cash and run for
// passive income. Each pays out at midnight into an uncollected pot; walk
// back to the counter to collect, or let it bank automatically once the pot
// hits its cap. Upgrade a business through three tiers for a bigger nightly
// cut. This is the clean money — no fists, no flags, unlike the gang empire.

// Each business: buy price, base nightly income, and the ceiling the
// uncollected pot climbs to before earnings start auto-depositing (so a
// business you ignore still pays, it just stops hoarding).
const BUSINESSES = [
  { key: 'laundromat', name: 'Suds & Spin Laundromat', price: 6000, income: 300, cap: 1500, off: [34, 40], tint: 0x4aa3c6 },
  { key: 'diner', name: 'Chrome Rail Diner', price: 12000, income: 560, cap: 2600, off: [-42, 30], tint: 0xd8a24a },
  { key: 'arcade', name: 'Neon Alley Arcade', price: 22000, income: 980, cap: 4200, off: [48, -46], tint: 0xc24ad0 },
  { key: 'nightclub', name: 'Azure Room Nightclub', price: 45000, income: 1900, cap: 8000, off: [-52, -40], tint: 0x5a6cff },
  { key: 'autoshop', name: 'Pier 9 Auto Garage', price: 30000, income: 1250, cap: 5200, off: [60, 54], tint: 0x6ab04a },
  { key: 'marina', name: 'Gold Coast Marina', price: 68000, income: 2800, cap: 12000, off: [-64, 56], tint: 0x44c0b0 },
];

// Three upgrade tiers. Each costs a multiple of the buy price and lifts the
// nightly income by a fixed factor over the base. Level 0 is the plain buy.
const UPGRADES = [
  { mult: 1.0, name: 'Standard' },
  { mult: 1.6, cost: 0.6, name: 'Renovated' },
  { mult: 2.4, cost: 1.1, name: 'Premium' },
  { mult: 3.6, cost: 2.0, name: 'Flagship' },
];

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function nightly(biz) {
  return Math.round(biz.income * UPGRADES[biz.level].mult);
}

function makeSign(scene, pos, tint, owned) {
  const group = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6),
    new THREE.MeshLambertMaterial({ color: 0x3a3f48 })
  );
  post.position.set(0, 1.3, 0);
  group.add(post);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.9, 0.1),
    new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: owned ? 0.5 : 0.12, roughness: 0.6 })
  );
  board.position.set(0, 2.4, 0);
  group.add(board);
  group.position.copy(pos);
  scene.add(group);
  return { group, board };
}

export function initProperties(scene, world, save) {
  const ownedMap = new Map((save?.properties || []).map((r) => [r.key, r]));
  const base = world.city.spawn;
  const list = BUSINESSES.map((def) => {
    const pos = base.clone().add(new THREE.Vector3(def.off[0], 0, def.off[1]));
    try { placeStreetSite(world.city, pos, 2.6, 'property'); } catch { /* keep intended spot if the city is packed */ }
    const saved = ownedMap.get(def.key);
    const biz = {
      ...def,
      pos,
      owned: !!saved,
      level: Math.min(UPGRADES.length - 1, Math.max(0, saved?.level ?? 0)),
      pot: Math.max(0, Math.round(saved?.pot ?? 0)),
    };
    biz.art = makeSign(scene, pos, def.tint, biz.owned);
    return biz;
  });

  // Management panel (hidden until you walk up and press E).
  const panel = document.createElement('section');
  panel.id = 'property-panel';
  panel.setAttribute('aria-label', 'Property management');
  panel.hidden = true;
  panel.style.cssText =
    'position:fixed;z-index:36;left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,90vw);' +
    'box-sizing:border-box;padding:20px 22px;background:rgba(8,22,29,.97);border:1px solid #78cbbd;' +
    'color:#f4eee3;font:15px/1.5 system-ui;box-shadow:0 10px 40px #000a;border-radius:8px;pointer-events:auto';
  document.body.appendChild(panel);

  world.properties = { list, panel, open: null, prevClock: world.clock };
  return world.properties;
}

function renderPanel(world, biz) {
  const P = world.properties;
  const panel = P.panel;
  const price = Math.round(biz.price * (world.discount || 1));
  const funds = availableFunds(world, price);
  let html =
    `<h2 style="font-size:17px;color:#8edbc8;margin:0 0 4px">${biz.name}</h2>` +
    `<p style="color:#9fcfc2;margin:0 0 14px;font-size:13px">` +
    (biz.owned
      ? `${UPGRADES[biz.level].name} · $${nightly(biz)}/night`
      : `FOR SALE · earns $${biz.income}/night`) +
    `</p>`;

  if (!biz.owned) {
    html +=
      `<p style="margin:0 0 12px">Buy this business for <strong style="color:#ffd190">$${price.toLocaleString()}</strong>. ` +
      `It pays into your uncollected earnings every night. Come back here to collect, or let it bank once the pot fills.</p>` +
      `<nav style="display:flex;gap:8px;flex-wrap:wrap">` +
      `<button data-act="buy" ${funds < price ? 'disabled' : ''} style="${btn(funds >= price)}">` +
      `${funds < price ? 'Not enough cash' : 'Buy — $' + price.toLocaleString()}</button>` +
      `<button data-act="close" style="${btn(true, true)}">Close</button></nav>`;
  } else {
    const next = UPGRADES[biz.level + 1];
    html +=
      `<div style="background:#0e262c;border-radius:6px;padding:12px 14px;margin:0 0 14px">` +
      `<div style="display:flex;justify-content:space-between"><span>Uncollected earnings</span>` +
      `<strong style="color:#7fe6b5">$${biz.pot.toLocaleString()}</strong></div>` +
      `<div style="display:flex;justify-content:space-between;color:#9fcfc2;font-size:13px;margin-top:4px">` +
      `<span>Nightly income</span><span>$${nightly(biz)}</span></div>` +
      `<div style="display:flex;justify-content:space-between;color:#9fcfc2;font-size:13px">` +
      `<span>Auto-banks at</span><span>$${biz.cap.toLocaleString()}</span></div></div>` +
      `<nav style="display:flex;gap:8px;flex-wrap:wrap">`;
    html +=
      `<button data-act="collect" ${biz.pot <= 0 ? 'disabled' : ''} style="${btn(biz.pot > 0)}">` +
      `Collect $${biz.pot.toLocaleString()}</button>`;
    if (next) {
      const upCost = Math.round(biz.price * next.cost * (world.discount || 1));
      const canUp = availableFunds(world, upCost) >= upCost;
      html +=
        `<button data-act="upgrade" ${canUp ? '' : 'disabled'} style="${btn(canUp)}">` +
        `${next.name} — $${upCost.toLocaleString()} ($${Math.round(biz.income * next.mult)}/night)</button>`;
    } else {
      html += `<button disabled style="${btn(false)}">Flagship — maxed</button>`;
    }
    html += `<button data-act="close" style="${btn(true, true)}">Close</button></nav>`;
  }
  panel.innerHTML = html;

  panel.querySelectorAll('button[data-act]').forEach((b) => {
    b.onclick = () => handleAction(world, biz, b.dataset.act);
  });
}

function btn(enabled, ghost = false) {
  const base = 'padding:9px 14px;font:inherit;border-radius:5px;cursor:pointer;border:1px solid #79cebb;';
  if (!enabled) return base + 'background:#1a2c30;color:#5f7a77;cursor:not-allowed;border-color:#355';
  if (ghost) return base + 'background:transparent;color:#9fcfc2';
  return base + 'background:#1f5a52;color:#f4eee3';
}

function handleAction(world, biz, act) {
  const price = Math.round(biz.price * (world.discount || 1));
  if (act === 'close') { closePanel(world); return; }
  if (act === 'buy') {
    if (availableFunds(world, price) < price) { showToast('Not enough cash for that deal'); return; }
    spendMoney(world, price);
    biz.owned = true;
    biz.art.board.material.emissiveIntensity = 0.5;
    sfxMissionPass();
    showNews(`You now own ${biz.name} — earning $${nightly(biz)} a night`);
    world.onSave?.();
    renderPanel(world, biz);
    return;
  }
  if (act === 'upgrade') {
    const next = UPGRADES[biz.level + 1];
    if (!next) return;
    const upCost = Math.round(biz.price * next.cost * (world.discount || 1));
    if (availableFunds(world, upCost) < upCost) { showToast('Not enough cash to upgrade'); return; }
    spendMoney(world, upCost);
    biz.level += 1;
    sfxPickup();
    showToast(`${biz.name} upgraded to ${UPGRADES[biz.level].name} — $${nightly(biz)}/night`);
    world.onSave?.();
    renderPanel(world, biz);
    return;
  }
  if (act === 'collect') {
    if (biz.pot <= 0) return;
    const amount = biz.pot;
    world.money += amount;
    biz.pot = 0;
    sfxPickup();
    showToast(`Collected $${amount.toLocaleString()} from ${biz.name}`);
    world.onSave?.();
    renderPanel(world, biz);
  }
}

function openPanel(world, biz) {
  const P = world.properties;
  P.open = biz;
  P.panel.hidden = false;
  world.storyUiOpen = true; // reuse the global "a menu is up" flag the camera/input respect
  document.exitPointerLock?.();
  renderPanel(world, biz);
}

function closePanel(world) {
  const P = world.properties;
  if (!P || !P.open) return;
  P.open = null;
  P.panel.hidden = true;
  world.storyUiOpen = false;
}

// Called at every in-game midnight from the main loop. Each owned business
// adds its nightly income to the uncollected pot; any amount over the cap is
// auto-deposited to the bank so an idle empire still pays out.
export function propertiesMidnight(world) {
  const P = world.properties;
  if (!P) return;
  let autoBanked = 0;
  let owned = 0;
  for (const biz of P.list) {
    if (!biz.owned) continue;
    owned++;
    biz.pot += Math.round(nightly(biz) * (world.payMult || 1));
    if (biz.pot > biz.cap) {
      const over = biz.pot - biz.cap;
      biz.pot = biz.cap;
      if (world.bank) { world.bank.balance = (world.bank.balance || 0) + over; autoBanked += over; }
      else { world.money += over; autoBanked += over; }
    }
  }
  if (owned > 0) {
    showToast(autoBanked > 0
      ? `Businesses earned overnight — $${autoBanked.toLocaleString()} auto-banked`
      : `Your ${owned} business${owned > 1 ? 'es' : ''} earned overnight — collect in person`);
  }
}

export function updateProperties(world, dt, pressed) {
  const P = world.properties;
  if (!P) return;
  const player = world.player;
  world.propertyHint = null;

  // If a panel is open, Esc/E closes it and nothing else happens here.
  if (P.open) {
    if (pressed['KeyE'] || pressed['Escape']) closePanel(world);
    return;
  }

  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  if (!onFoot) return;

  let near = null;
  let nearD = 3.2;
  for (const biz of P.list) {
    const d = distance(player.pos, biz.pos);
    if (d < nearD) { nearD = d; near = biz; }
  }
  if (!near) return;

  if (near.owned) {
    const pot = near.pot > 0 ? ` — $${near.pot.toLocaleString()} waiting` : '';
    world.propertyHint = `Press <b>E</b> — ${near.name}${pot}`;
  } else {
    const price = Math.round(near.price * (world.discount || 1));
    world.propertyHint = `Press <b>E</b> — buy ${near.name} ($${price.toLocaleString()})`;
  }
  if (pressed['KeyE']) openPanel(world, near);
}

// Snapshot for saveGame: only owned businesses, with level and pot.
export function propertiesSave(world) {
  const P = world.properties;
  if (!P) return [];
  return P.list.filter((b) => b.owned).map((b) => ({ key: b.key, level: b.level, pot: Math.round(b.pot) }));
}
