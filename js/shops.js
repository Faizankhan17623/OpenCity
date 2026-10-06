import { availableFunds, spendMoney } from './wallet.js';
import { VEHICLE_DEALS, buyOwnedVehicle } from './ownedVehicles.js';
import { purchaseNitro, depositNitroCash, NITRO_PRICE_PER_PERCENT } from './nitroStation.js';
import { attachNitroStation, addNitroColliders, createNitroBayMarkers, inNitroBay, updateNitroDisplay } from './nitroStationModel.js';
import { placeStreetSite } from './site-layout.js';
import { createShowroom, updateShowroom } from './showroomModel.js';
import * as THREE from 'three';
import { blockStart, BLOCK, N } from './city.js';
import { showToast, showNews } from './hud.js';
import { addCrime } from './police.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { webCfg } from './web.js';
import { makeVehicle, resprayVehicle } from './car.js';
import { applySuit } from './characters.js';
import { watchForCash } from './ads.js';
import { casinoOdds } from './mayor.js';

// Robbable corner stores (hold E: cash + heat) and the upgrade den where
// swing money buys permanent buffs.

const ROB_TIME = 1.6;
const ROB_COOLDOWN = 90;

function kiosk(scene, pos, color, signColor, label) {
  const group = new THREE.Group();
  const hut = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 2.4, 2.6),
    new THREE.MeshLambertMaterial({ color })
  );
  hut.position.y = 1.2;
  hut.castShadow = true;
  group.add(hut);

  const c = document.createElement('canvas');
  c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#0a0a10';
  g.fillRect(0, 0, 128, 32);
  g.fillStyle = signColor;
  g.font = 'bold 18px Arial';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, 64, 17);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.65),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  sign.position.set(0, 2.75, 0);
  group.add(sign);
  group.userData.sign = sign;

  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.3, 0.4, 22, 1, true),
    new THREE.MeshBasicMaterial({ color: signColor, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.position.y = 0.4;
  group.add(ring);
  group.userData.ring = ring;

  group.position.copy(pos);
  scene.add(group);
  return group;
}

export function initShops(scene, world, savedUpgrades, savedMods) {
  const shops = [];
  // one store on a corner of six different blocks, spread over the city
  const picks = [[0, 0], [3, 1], [6, 2], [1, 5], [4, 6], [7, 7]];
  for (const [bi, bj] of picks) {
    const pos = new THREE.Vector3(blockStart(bi) + 2.5, 0, blockStart(bj) + 2.5);
    placeStreetSite(world.city, pos, 2.4, 'corner-shop');
    const mesh = kiosk(scene, pos, '#3a2f28', '#5fe07a', 'CORNER $HOP');
    shops.push({ pos, mesh, cd: 0, robT: 0 });
  }
  world.storePos = shops[0].pos;

  // upgrade den near spawn — purple neon
  const denPos = world.city.spawn.clone().add(new THREE.Vector3(14, 0, -10));
  placeStreetSite(world.city, denPos, 2.4, 'web-den');
  const den = kiosk(scene, denPos, '#241a30', '#c95aff', 'WEB DEN');

  // wardrobe — pink, beside the den
  const wardrobePos = world.city.spawn.clone().add(new THREE.Vector3(14, 0, 12));
  placeStreetSite(world.city, wardrobePos, 2.4, 'wardrobe');
  kiosk(scene, wardrobePos, '#301a2a', '#ff6ab0', 'WARDROBE');

  // casino — gold, a block over
  const casinoPos = world.city.spawn.clone().add(new THREE.Vector3(-16, 0, 12));
  placeStreetSite(world.city, casinoPos, 2.4, 'casino');
  kiosk(scene, casinoPos, '#2e2410', '#ffd24a', 'LUCKY 7 CASINO');

  // dealership — cyan
  const dealerPos = world.city.spawn.clone().add(new THREE.Vector3(-16, 0, -12));
  placeStreetSite(world.city, dealerPos, 8.6, 'dealership');
  world.dealerBuildingPos = dealerPos.clone();
  const showroom = createShowroom(world, world.dealerBuildingPos);
  const dealer = showroom.group;
  // The map and purchase trigger point at the walk-in entrance, not the roof.
  dealerPos.z += 4;
  dealer.name = 'Auto Palace vehicle store';
  // A landmark visible above pedestrians and parked cars from every approach.
  const dealerCanvas = document.createElement('canvas');
  dealerCanvas.width = 512; dealerCanvas.height = 256;
  const dealerInk = dealerCanvas.getContext('2d');
  dealerInk.fillStyle = '#102a2e'; dealerInk.fillRect(0,0,512,256);
  dealerInk.strokeStyle = '#3dd2ff'; dealerInk.lineWidth = 12; dealerInk.strokeRect(6,6,500,244);
  dealerInk.fillStyle = '#3dd2ff'; dealerInk.textAlign = 'center';
  dealerInk.font = 'bold 100px Arial'; dealerInk.fillText('V',256,108);
  dealerInk.font = 'bold 36px Arial'; dealerInk.fillText('VEHICLE STORE',256,165);
  dealerInk.font = '24px Arial'; dealerInk.fillText('Walk closer to buy',256,210);
  const dealerTexture = new THREE.CanvasTexture(dealerCanvas);
  dealerTexture.colorSpace = THREE.SRGBColorSpace;
  const dealerSign = new THREE.Sprite(new THREE.SpriteMaterial({map:dealerTexture}));
  dealerSign.position.set(0,6.7,3.4); dealerSign.scale.set(4,2,1); dealer.add(dealerSign);
  const dealerZone = new THREE.Mesh(new THREE.RingGeometry(1.4,1.5,32),
    new THREE.MeshBasicMaterial({color:'#3dd2ff',side:THREE.DoubleSide}));
  dealerZone.rotation.x = -Math.PI/2; dealerZone.position.set(0,.02,4); dealer.add(dealerZone);
  world.dealerDeliveryPos = world.dealerBuildingPos.clone().add(new THREE.Vector3(-3.8,0,5.5));

  // garage pad — park any vehicle here and it's yours forever
  const garagePos = world.city.spawn.clone().add(new THREE.Vector3(16, 0, 14));
  placeStreetSite(world.city, garagePos, 4.3, 'garage');
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 0.22, 24),
    new THREE.MeshLambertMaterial({ color: 0x1a2a45 })
  );
  pad.position.copy(garagePos).setY(0.3);
  scene.add(pad);
  const padRing = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 0.5, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x4a8cff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
  );
  padRing.position.copy(garagePos).setY(0.5);
  scene.add(padRing);

  world.upgrades = { range: false, winch: false, armor: false, electro: false, magnet: false, ...(savedUpgrades || {}) };
  world.garageMods = { paint: null, engine: false, armor: false, nitro: false, spikes: false, neon: false, ...(savedMods || {}) };
  world.shops = shops;
  world.shopHint = null;
  world.nearDen = false;
  world.nearKiosk = false;
  applyUpgrades(world);

  // suits restore from the save
  world.suitsOwned = { street: true, ...(world.suitsOwnedSaved || {}) };
  wearSuit(world, world.suitSaved || 'street', true);

  const state = { shops, den, denPos, casinoPos, dealerPos, garagePos, wardrobePos, casinoCd: 0, garageVeh: null };
  world.dealerPos = dealerPos;
  world.nitroPos = world.city.spawn.clone().add(new THREE.Vector3(30,0,-24));
  placeStreetSite(world.city,world.nitroPos,7.5,'nitro');
  const nitroFallback = kiosk(scene,world.nitroPos,'#142c2f','#d99323','NITRO STATION');
  addNitroColliders(world);
  createNitroBayMarkers(world);
  attachNitroStation(world,nitroFallback);
  return state;
}

// Garage customization: colors cycle on respray; perf mods apply once per vehicle.
export const GARAGE_PAINTS = ['#c1121f', '#f5a800', '#2fd06a', '#4a8cff', '#c95aff', '#f2f2f2', '#14181d'];

export function applyGarageMods(world, v) {
  const m = v?.ownedId ? v.upgrades : world.garageMods;
  if (!m || !v || v.dead) return;
  if (m.engine && !v.engineMod) {
    v.engineMod = true;
    v.accel = (v.accel ?? 17) + 7;
    v.top = (v.top ?? 38) + 10;
  }
  if (m.armor && !v.armorMod) {
    v.armorMod = true;
    v.maxHealth = Math.max(v.maxHealth || 100, 200);
    v.health = Math.max(v.health, v.maxHealth);
  }
  if (m.nitro) v.bigNitro = true;
  if (m.spikes && !v.spikeMod) {
    v.spikeMod = true;
    v.spikes = true; // ram damage bonus, applied in the driving impact code
    const mat = new THREE.MeshStandardMaterial({ color: 0xb8bec8, metalness: 0.85, roughness: 0.3 });
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 6), mat);
      spike.rotation.x = Math.PI / 2;
      spike.position.set(-0.6 + i * 0.4, 0.55, (v.bike ? 1.1 : 2.15));
      v.mesh.add(spike);
      if (v.bike) break; // one nasty prong is enough for a bike
    }
  }
  if (m.neon && !v.neonMod) {
    v.neonMod = true;
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(v.bike ? 1.4 : 2.6, v.bike ? 2.4 : 4.6),
      new THREE.MeshBasicMaterial({ color: 0x4ad2ff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.12;
    v.mesh.add(glow);
  }
  if (m.paint != null) resprayVehicle(v, GARAGE_PAINTS[m.paint % GARAGE_PAINTS.length]);
}

// Rebuild the saved garage vehicle on the pad (called at load + respawn).
export function ensureGarageVehicle(state, world) {
  const ownedId = state.garageVeh?.ownedId || world.garageVehicleSaved?.ownedId;
  if (ownedId) { state.garageVeh = world.ownedVehicleInstances?.get(ownedId) || null; return; }
  const kind = world.garageKind;
  if (!kind) return;
  if (state.garageVeh && !state.garageVeh.dead) return;
  const g = state.garagePos;
  const opts = { ...world.garageVehicleSaved, bike: kind === 'bike' };
  // Older saves already include tuned stats but predate the applied-mod flags.
  if (opts.engineMod == null && world.garageMods.engine && Number.isFinite(opts.accel) && Number.isFinite(opts.top)) opts.engineMod = true;
  const v = makeVehicle(world.scene, g.x, g.z, 0, opts.color || (kind === 'bike' ? '#23262d' : '#3d6b8f'), opts);
  applyGarageMods(world, v);
  state.garageVeh = v;
  world.parked.push(v);
}

// Exiting a vehicle on the pad stores it as your garage ride.
export function garageCheck(state, world, car) {
  if (car.tank || car.temporary) return; // the army wants that back
  if (Math.hypot(car.pos.x - state.garagePos.x, car.pos.z - state.garagePos.z) > 4.5) return;
  world.garageKind = car.bike ? 'bike' : 'car';
  state.garageVeh = car;
  applyGarageMods(world, car);
  showToast(car.ownedId ? 'VEHICLE SAVED - manage it in My Vehicles [F4]' : 'VEHICLE GARAGED - it respawns here if lost');
  world.onSave?.();
}

export function applyUpgrades(world) {
  if (world.upgrades.range) webCfg.range = 150;
  if (world.upgrades.winch) webCfg.reel = 17;
  world.maxHealth = world.upgrades.armor ? 150 : 100;
}

export const SUITS = [
  { key: 'street', cost: 0, name: 'STREET CLOTHES', colors: { shirt: '#cfcfc6', pants: '#27406b', skin: '#c98e63' }, perks: {} },
  { key: 'classic', cost: 600, name: 'CLASSIC RED-BLUE (+50% style)', colors: { shirt: '#c1121f', pants: '#1f3fa8', skin: '#c98e63' }, perks: { style: 1.5 } },
  { key: 'symbiote', cost: 1200, name: 'SYMBIOTE (2x melee, 10s webs)', colors: { shirt: '#101014', pants: '#101014', skin: '#25252c', hair: '#101014' }, perks: { melee: 2, webDur: 10 } },
  { key: 'stealth', cost: 900, name: 'STEALTH (heat fades 2x faster)', colors: { shirt: '#c9c9d2', pants: '#8f8f9c', skin: '#c98e63' }, perks: { decay: 12, busted: 3.2 } },
];

export function wearSuit(world, key, quiet = false) {
  const suit = SUITS.find((x) => x.key === key) || SUITS[0];
  world.suit = suit.key;
  world.perks = { style: 1, melee: 1, webDur: 6, decay: 24, busted: 1.6, ...suit.perks };
  applySuit(world.player.ch, suit.colors);
  if (!quiet) showToast(`SUIT: ${suit.name}`);
}

const UPG = [
  { key: 'range', cost: 800, name: 'LONG WEBS (150m range)' },
  { key: 'winch', cost: 600, name: 'FAST WINCH' },
  { key: 'armor', cost: 1000, name: 'BODY ARMOR (150 HP)' },
  { key: 'electro', cost: 1500, name: 'ELECTRO-WEB (Q stuns the whole crowd)' },
  { key: 'magnet', cost: 1000, name: 'MAGNET WEBS (loot flies to you mid-swing)' },
];

export function updateShops(state, world, dt, keys, pressed) {
  const player = world.player;
  world.shopHint = null;
  world.nearDen = false;
  world.nearKiosk = false;
  state.casinoCd = Math.max(0, state.casinoCd - dt);
  const onFoot = !player.inCar && !player.inHeli && player.pos.y < 2;
  world.nitroHint = null;
  const nitroLocation = player.inCar?.pos || player.pos;
  const nitroDistance = Math.hypot(world.nitroPos.x-nitroLocation.x,world.nitroPos.z-nitroLocation.z);
  if(nitroDistance<16 && !player.inHeli) {
    world.nearKiosk=true;
    const ready = inNitroBay(world,player.inCar) && player.inCar.vel.length() < .5;
    world.nitroHint = world.shopHint=`NITRO — BANK $${Math.floor(world.bank?.balance || 0)} · CASH $${Math.floor(world.money || 0)} · ${ready ? `<b>5</b> Refill ($${NITRO_PRICE_PER_PERCENT}/1%, max 500%)` : 'Park beside the pump in either marked bay'} · <b>6</b> Deposit all cash to local bank`;
    if (pressed['Digit6']) {
      try { const deposited=depositNitroCash(world); showToast(`Deposited $${deposited} CASH into BANK. Press 5 to buy nitro.`); }
      catch(e) { showToast(e.message); }
    }
    if(pressed['Digit5']) {
      try { if (!ready) throw new Error('Stop your car in a marked bay beside the nitro pump first.'); const cost=purchaseNitro(world,player.inCar);world.nitroLastPurchase=cost;showToast(`NITRO ${Math.round(player.inCar.nitro)}% — $${cost} deducted from BANK`); }
      catch(e){showToast(e.message);}
    }
  }

  updateNitroDisplay(world);
  updateShowroom(world, dt);

  for (const s of state.shops) {
    s.cd = Math.max(0, s.cd - dt);
    s.mesh.userData.ring.visible = s.cd <= 0;
    s.mesh.userData.ring.rotation.y += dt;

    const d = Math.hypot(s.pos.x - player.pos.x, s.pos.z - player.pos.z);
    if (!onFoot || d > 3.4) { s.robT = 0; continue; }

    if (s.cd > 0) {
      world.shopHint = 'Store already hit — come back later';
      continue;
    }
    if (keys['KeyE']) {
      s.robT += dt;
      world.shopHint = `ROBBING... ${Math.ceil((ROB_TIME - s.robT) * 10) / 10}s`;
      if (s.robT >= ROB_TIME) {
        s.robT = 0;
        s.cd = ROB_COOLDOWN;
        const take = 250 + ((Math.random() * 200) | 0);
        world.money += take;
        addCrime(world, 2);
        sfxPickup();
        showToast(`STORE ROBBED +$${take}`);
        world.onSave?.();
      }
    } else {
      s.robT = Math.max(0, s.robT - dt * 2);
      world.shopHint = 'Hold <b>E</b> to rob the store';
    }
  }

  // casino: 1/2/3 = bet $100 / $500 / $1000
  const cd = Math.hypot(state.casinoPos.x - player.pos.x, state.casinoPos.z - player.pos.z);
  if (onFoot && cd < 3.6) {
    world.nearKiosk = true;
    world.shopHint = 'LUCKY 7 — bet <b>1</b> $100 · <b>2</b> $500 · <b>3</b> $1000 · <b>4</b> FREE $500 (watch ad)';
    if (pressed['Digit4'] && state.casinoCd <= 0) {
      state.casinoCd = 4; // one ad at a time
      watchForCash(world, 500);
    }
    const bets = [100, 500, 1000];
    for (let i = 0; i < 3; i++) {
      if (!pressed['Digit' + (i + 1)] || state.casinoCd > 0) continue;
      state.casinoCd = 1.2;
      const bet = bets[i];
      if (availableFunds(world, bet) < bet) { showToast('Not enough cash'); continue; }
      spendMoney(world, bet);
      // mayoral casino regulation: HOUSE RULES / NORMAL / LOOSE SLOTS
      const odds = casinoOdds(world);
      const jackpotAt = 0.02 + odds * 0.03; // 2% / 5% / 8%
      const winAt = 0.4 + odds * 0.1;       // 40% / 50% / 60%
      const roll = Math.random();
      if (roll < jackpotAt) {
        world.money += bet * 5;
        if (world.stats) world.stats.jackpots++;
        sfxMissionPass();
        showToast(`JACKPOT!!! +$${bet * 5}`);
        showNews('massive jackpot hit at the Lucky 7');
      } else if (roll < winAt) {
        world.money += bet * 2;
        sfxPickup();
        showToast(`WINNER +$${bet * 2}`);
      } else {
        sfxMissionFail();
        showToast('House wins...');
      }
      world.onSave?.();
    }
  }

  // dealership: 1 = supercar, 2 = superbike
  const dl = Math.hypot(state.dealerPos.x - player.pos.x, state.dealerPos.z - player.pos.z);
  if (!onFoot && dl < 8) {
    world.shopHint = 'VEHICLE STORE — exit your vehicle and walk into the cyan ring to buy';
  }
  if (onFoot && dl < 5.5) {
    world.nearKiosk = true;
    world.shopHint = 'AUTO PALACE — <b>1</b> Supercar $2500 · <b>2</b> Superbike $1500';
    const deals = VEHICLE_DEALS;
    world.shopHint = 'AUTO PALACE — <b>1</b> Supercar $2500 · <b>2</b> Superbike $1500 · <b>3</b> Monster Truck $4000 · <b>4</b> Vireo 400 $900';
    for (let i = 0; i < deals.length; i++) {
      if (!pressed['Digit' + (i + 1)]) continue;
      const deal = deals[i];
      try {
        buyOwnedVehicle(world, deal);
        sfxMissionPass();showToast(deal.name + ' DELIVERED - saved in My Vehicles (F4)');
      } catch(error) { showToast(error.message); }
    }
  }

  // garage pad: store a ride, then tune it up
  // (the pad sits beside the wardrobe — whichever is closer owns the digit keys)
  const gd = Math.hypot(state.garagePos.x - player.pos.x, state.garagePos.z - player.pos.z);
  const wd = Math.hypot(state.wardrobePos.x - player.pos.x, state.wardrobePos.z - player.pos.z);
  if (onFoot && gd < 5 && gd <= wd) {
    if (!world.garageKind) {
      world.shopHint = 'GARAGE — exit any vehicle on the pad to keep it forever';
    } else if (state.garageVeh?.ownedId) {
      world.nearKiosk = true;
      world.shopHint = 'WORKSHOP - press F4 for repairs and upgrades for this vehicle';
    } else {
      world.nearKiosk = true;
      const m = world.garageMods;
      world.shopHint = 'GARAGE — <b>1</b> Respray $200 · ' +
        `<b>2</b> Engine tune ${m.engine ? '✔' : '$800'} · ` +
        `<b>3</b> Armor plate ${m.armor ? '✔' : '$600'} · ` +
        `<b>4</b> Big nitro ${m.nitro ? '✔' : '$500'} · ` +
        `<b>5</b> Ram spikes ${m.spikes ? '✔' : '$700'} · ` +
        `<b>6</b> Neon glow ${m.neon ? '✔' : '$300'}`;
      const mods = [
        { key: 'engine', cost: 800, name: 'ENGINE TUNE (+speed)' },
        { key: 'armor', cost: 600, name: 'ARMOR PLATING (200 HP)' },
        { key: 'nitro', cost: 500, name: 'BIG NITRO TANK' },
        { key: 'spikes', cost: 700, name: 'RAM SPIKES (2.5x crash damage dealt)' },
        { key: 'neon', cost: 300, name: 'NEON UNDERGLOW' },
      ];
      if (pressed['Digit1']) {
        if (availableFunds(world, 200) < 200) showToast('Not enough cash');
        else {
          spendMoney(world, 200);
          m.paint = m.paint == null ? 0 : (m.paint + 1) % GARAGE_PAINTS.length;
          applyGarageMods(world, state.garageVeh);
          sfxPickup();
          showToast('RESPRAYED — press 1 again to cycle colors');
          world.onSave?.();
        }
      }
      for (let i = 0; i < mods.length; i++) {
        if (!pressed['Digit' + (i + 2)]) continue;
        const u = mods[i];
        if (m[u.key]) showToast('Already fitted');
        else if (availableFunds(world, u.cost) < u.cost) showToast('Not enough cash');
        else {
          spendMoney(world, u.cost);
          m[u.key] = true;
          applyGarageMods(world, state.garageVeh);
          sfxMissionPass();
          showToast(`FITTED: ${u.name}`);
          world.onSave?.();
        }
      }
    }
  }

  // wardrobe: 1-4 buy/wear suits
  if (onFoot && wd < 3.6 && wd < gd) {
    world.nearKiosk = true;
    world.shopHint = 'WARDROBE — ' + SUITS.map((u, i) =>
      world.suitsOwned[u.key]
        ? `${i + 1}) ${u.name}${world.suit === u.key ? ' ✔' : ''}`
        : `${i + 1}) ${u.name} $${u.cost}`
    ).join(' · ');
    for (let i = 0; i < SUITS.length; i++) {
      if (!pressed['Digit' + (i + 1)]) continue;
      const u = SUITS[i];
      if (world.suitsOwned[u.key]) {
        wearSuit(world, u.key);
      } else if (availableFunds(world, u.cost) < u.cost) {
        showToast('Not enough cash');
      } else {
        spendMoney(world, u.cost);
        world.suitsOwned[u.key] = true;
        wearSuit(world, u.key);
        sfxMissionPass();
      }
      world.onSave?.();
    }
  }

  // upgrade den
  const dd = Math.hypot(state.denPos.x - player.pos.x, state.denPos.z - player.pos.z);
  if (onFoot && dd < 3.6) {
    world.nearDen = true;
    world.nearKiosk = true;
    const lines = UPG.map((u, i) =>
      world.upgrades[u.key] ? `${i + 1}) ${u.name} ✔` : `${i + 1}) ${u.name} $${u.cost}`
    );
    world.shopHint = `WEB DEN — press ${lines.join(' · ')}`;
    for (let i = 0; i < UPG.length; i++) {
      if (!pressed['Digit' + (i + 1)]) continue;
      const u = UPG[i];
      if (world.upgrades[u.key]) showToast('Already owned');
      else if (availableFunds(world, u.cost) < u.cost) showToast('Not enough cash');
      else {
        spendMoney(world, u.cost);
        world.upgrades[u.key] = true;
        applyUpgrades(world);
        if (u.key === 'armor') player.health = world.maxHealth;
        sfxMissionPass();
        showToast(`BOUGHT: ${u.name}`);
        world.onSave?.();
      }
    }
  }
}
