import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// THE CORNER BAR: two bar games you can play for a small stake. DARTS is a
// moving-marker aim on a ring board — tap E to throw, closer to centre scores
// more over three darts. POOL is a power-timing break: catch the sweep near
// full power to sink more balls. Beat the target score to win the pot.

const STAKE = 100;
const DART_THROWS = 3;
const DART_TARGET = 120;     // total over 3 darts to win
const POOL_TARGET = 5;       // balls to sink to win

export function initBarGames(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(-18, 0, 16));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 1.6)) pos = world.city.spawn.clone().add(new THREE.Vector3(-22, 0, 12));
  placeStreetSite(world.city, pos, 2.6, 'bar');

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(3, 2.6, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x3a2518, roughness: 0.8 })
  );
  bar.position.copy(pos).setY(1.3);
  scene.add(bar);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.6, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xffaa33 })
  );
  sign.position.copy(pos).add(new THREE.Vector3(0, 3, 1.25));
  scene.add(sign);

  world.barGames = {
    pos, open: false, game: null,   // null | 'darts' | 'pool'
    marker: 0, dir: 1, throws: 0, score: 0, balls: 0,
    hud: null,
    dartsWins: save?.dartsWins ?? 0, poolWins: save?.poolWins ?? 0,
  };
}

function ensureHud(world) {
  const b = world.barGames;
  if (b.hud) return b.hud;
  const el = document.createElement('div');
  el.id = 'bargame';
  el.style.cssText = 'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);width:260px;height:20px;' +
    'background:#101820cc;border:1px solid #ffaa33;border-radius:4px;display:none;z-index:30;overflow:hidden';
  const zone = document.createElement('div');
  zone.style.cssText = 'position:absolute;top:0;height:100%;background:#2fd06a55';
  const needle = document.createElement('div');
  needle.style.cssText = 'position:absolute;top:0;width:3px;height:100%;background:#ffd24a';
  el.append(zone, needle);
  document.body.appendChild(el);
  b.hud = { el, zone, needle };
  return b.hud;
}

function startGame(world, game) {
  const b = world.barGames;
  if (world.money < STAKE) { showToast('Not enough cash for the stake'); return; }
  world.money -= STAKE;
  b.game = game;
  b.marker = 0; b.dir = 1; b.throws = 0; b.score = 0; b.balls = 0;
  ensureHud(world).el.style.display = 'block';
  showMissionMsg(game === 'darts' ? 'DARTS' : 'POOL', game === 'darts' ? 'Tap E to throw — centre scores most' : 'Tap E at full power to sink balls', '#ffaa33');
}

function finishGame(world, won) {
  const b = world.barGames;
  const game = b.game;
  b.game = null;
  if (b.hud) b.hud.el.style.display = 'none';
  if (won) {
    const pot = STAKE * 3;
    world.money += pot;
    addRep(world, 120);
    world.addXP?.(90);
    if (game === 'darts') b.dartsWins++; else b.poolWins++;
    sfxMissionPass();
    showMissionMsg('YOU WIN', `Took the pot — +$${pot}`, '#7cf78c');
    showNews('a sharp hand clears the table at the corner bar');
    world.onSave?.();
  } else {
    sfxMissionFail();
    showMissionMsg('YOU LOSE', 'The stake is gone — rack ’em again', '#ff5a4a');
  }
}

export function updateBarGames(world, dt, keys, pressed) {
  const b = world.barGames;
  if (!b) return;
  world.barHint = null;
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const d = Math.hypot(player.pos.x - b.pos.x, player.pos.z - b.pos.z);

  // a game in progress
  if (b.game) {
    const hud = ensureHud(world);
    b.marker += b.dir * 1.3 * dt;
    if (b.marker >= 1) { b.marker = 1; b.dir = -1; }
    if (b.marker <= 0) { b.marker = 0; b.dir = 1; }

    if (b.game === 'darts') {
      // sweet spot is the centre (0.5); score by nearness
      hud.zone.style.left = '42%'; hud.zone.style.width = '16%';
      hud.needle.style.left = (b.marker * 100) + '%';
      world.barHint = `DARTS — throw ${b.throws + 1}/${DART_THROWS} · score ${b.score} · tap <b>E</b>`;
      if (pressed['KeyE']) {
        const near = 1 - Math.abs(b.marker - 0.5) * 2; // 1 at centre, 0 at edges
        const pts = Math.round(near * 60);
        b.score += pts;
        b.throws++;
        sfxPickup();
        showToast(`${pts} points`);
        if (b.throws >= DART_THROWS) finishGame(world, b.score >= DART_TARGET);
      }
    } else {
      // pool: power meter, catch near the top (full power) to sink a ball
      hud.zone.style.left = '80%'; hud.zone.style.width = '20%';
      hud.needle.style.left = (b.marker * 100) + '%';
      world.barHint = `POOL — sunk ${b.balls}/${POOL_TARGET} · shots ${b.throws} · tap <b>E</b>`;
      if (pressed['KeyE']) {
        b.throws++;
        if (b.marker >= 0.8) { b.balls++; sfxPickup(); showToast('Sunk it!'); }
        else { sfxMissionFail(); showToast('Missed'); }
        if (b.balls >= POOL_TARGET) finishGame(world, true);
        else if (b.throws >= POOL_TARGET + 4) finishGame(world, false); // ran out of shots
      }
    }
    // walking away forfeits the stake
    if (d > 4 || !onFoot) finishGame(world, false);
    return;
  }

  if (d > 3.4 || !onFoot) { b.open = false; if (b.hud) b.hud.el.style.display = 'none'; return; }

  if (!b.open) {
    world.barHint = 'CORNER BAR — press <b>E</b> for bar games';
    if (pressed['KeyE']) b.open = true;
    return;
  }
  world.nearKiosk = true; // digits pick a game here, not switch weapons
  world.barHint = `BAR GAMES ($${STAKE} stake): <b>1</b> Darts · <b>2</b> Pool · <b>E</b> close`;
  if (pressed['Digit1']) { b.open = false; startGame(world, 'darts'); }
  else if (pressed['Digit2']) { b.open = false; startGame(world, 'pool'); }
  else if (pressed['KeyE']) b.open = false;
}

export function barGamesSave(world) {
  return { dartsWins: world.barGames?.dartsWins, poolWins: world.barGames?.poolWins };
}
