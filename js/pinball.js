import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { signTexture, faceNearestRoad } from './propKit.js';
import { pointBlocked } from './city.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// PINBALL: a cabinet by the arcade. Launch the ball and keep it alive with the
// flippers (A left, D right) as it drops to the bottom. Bumpers score points;
// catch the ball with a flipper when it reaches the bottom to punt it back up.
// Three balls, then the score pays tickets (cash) and a saved high score.

const BALLS = 3;
const STAKE = 20;
const W = 180, H = 300;   // playfield px
const GRAV = 220;         // px/s^2

export function initPinball(scene, world, save) {
  let pos = world.city.spawn.clone().add(new THREE.Vector3(-22, 0, 24));
  if (pointBlocked(new THREE.Vector3(pos.x, 1, pos.z), world.city.colliders, 1.6)) pos = world.city.spawn.clone().add(new THREE.Vector3(-26, 0, 20));
  placeStreetSite(world.city, pos, 2.4, 'pinball');

  // a proper cabinet: legs, body, a sloped lit playfield under glass and a
  // backbox with the marquee, turned so the player end faces the street
  const cab = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x401850, roughness: 0.55, metalness: 0.25 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.3, metalness: 0.85 });
  for (const [x, z] of [[-0.36, 0.62], [0.36, 0.62], [-0.36, -0.62], [0.36, -0.62]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 0.07), chrome);
    leg.position.set(x, 0.36, z);
    cab.add(leg);
  }
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.42, 1.5), body);
  box.position.set(0, 0.93, 0);
  box.rotation.x = -0.07; // playfields tilt up toward the back
  cab.add(box);
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 1.38),
    new THREE.MeshStandardMaterial({ color: 0x120a30, emissive: 0x6a30ff, emissiveIntensity: 0.55, roughness: 0.2 })
  );
  field.rotation.x = -Math.PI / 2 - 0.07;
  field.position.set(0, 1.15, 0);
  cab.add(field);
  const backbox = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.72, 0.16), body);
  backbox.position.set(0, 1.5, -0.72);
  cab.add(backbox);
  const marquee = new THREE.Mesh(
    new THREE.PlaneGeometry(0.76, 0.19),
    new THREE.MeshBasicMaterial({ map: signTexture('PINBALL', { fg: '#ffe9ff', bg: '#2a0d44', accent: '#c070ff' }), toneMapped: false })
  );
  marquee.position.set(0, 1.62, -0.635);
  cab.add(marquee);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x220a10, emissive: 0xff7a30, emissiveIntensity: 0.45 })
  );
  screen.position.set(0, 1.36, -0.635);
  cab.add(screen);
  cab.position.set(pos.x, 0, pos.z);
  cab.rotation.y = faceNearestRoad(world.city, pos);
  cab.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(cab);

  world.pinball = {
    pos, playing: false,
    ballsLeft: BALLS, score: 0,
    bx: 0, by: 0, vx: 0, vy: 0, live: false,
    hud: null, bumpers: [],
    high: save?.pinballHigh ?? 0,
  };
}

function ensureHud(world) {
  const pb = world.pinball;
  if (pb.hud) return pb.hud;
  const el = document.createElement('div');
  el.id = 'pinball';
  el.style.cssText = `position:fixed;left:50%;top:10%;transform:translateX(-50%);width:${W}px;height:${H}px;` +
    `background:#0a0618ee;border:2px solid #b060ff;border-radius:10px;display:none;z-index:31;overflow:hidden;font:bold 13px system-ui;color:#fff`;
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;inset:0';
  const ball = document.createElement('div');
  ball.style.cssText = 'position:absolute;width:14px;height:14px;border-radius:50%;background:#dde;box-shadow:0 0 6px #fff';
  const lflip = document.createElement('div');
  lflip.style.cssText = `position:absolute;bottom:14px;left:24px;width:48px;height:10px;background:#ff6;border-radius:4px;transform-origin:left center`;
  const rflip = document.createElement('div');
  rflip.style.cssText = `position:absolute;bottom:14px;right:24px;width:48px;height:10px;background:#ff6;border-radius:4px;transform-origin:right center`;
  const score = document.createElement('div');
  score.style.cssText = 'position:absolute;top:4px;left:0;right:0;text-align:center;color:#ffd24a;font-size:12px';
  layer.append(ball, lflip, rflip);
  el.append(layer, score);
  document.body.appendChild(el);
  pb.hud = { el, layer, ball, lflip, rflip, score };
  // place bumpers once
  pb.bumpers = [ { x: W * 0.3, y: H * 0.3 }, { x: W * 0.7, y: H * 0.3 }, { x: W * 0.5, y: H * 0.5 } ].map((b) => {
    const dot = document.createElement('div');
    dot.style.cssText = `position:absolute;width:26px;height:26px;border-radius:50%;background:#3a9;left:${b.x - 13}px;top:${b.y - 13}px;box-shadow:0 0 8px #3fa`;
    layer.appendChild(dot);
    return { ...b, dot };
  });
  return pb.hud;
}

function launchBall(world) {
  const pb = world.pinball;
  pb.bx = W - 18; pb.by = H - 60;
  pb.vx = -40 - Math.random() * 30; pb.vy = -260;
  pb.live = true;
}

function start(world) {
  const pb = world.pinball;
  if (world.money < STAKE) { showToast('Not enough cash for a game'); return; }
  world.money -= STAKE;
  pb.playing = true; pb.ballsLeft = BALLS; pb.score = 0;
  pb.standX = world.player.pos.x; pb.standZ = world.player.pos.z;
  ensureHud(world).el.style.display = 'block';
  launchBall(world);
  showMissionMsg('PINBALL', 'A left flipper · D right flipper — keep it alive!', '#b060ff');
}

function finish(world) {
  const pb = world.pinball;
  pb.playing = false; pb.live = false;
  world.pinballHint = null;
  if (pb.hud) pb.hud.el.style.display = 'none';
  const pay = Math.round(pb.score / 20);
  world.money += pay;
  addRep(world, Math.round(pb.score / 500));
  if (pb.score > pb.high) { pb.high = pb.score; showNews('a new high score lights up the pinball cabinet'); }
  (pb.score >= 5000 ? sfxMissionPass : sfxMissionFail)();
  showMissionMsg('GAME OVER', `Score ${pb.score} · +$${pay}`, '#b060ff');
  world.onSave?.();
}

export function updatePinball(world, dt, keys, pressed) {
  const pb = world.pinball;
  if (!pb) return;
  world.pinballHint = null;
  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;
  const d = Math.hypot(player.pos.x - pb.pos.x, player.pos.z - pb.pos.z);

  if (pb.playing) {
    // E ends the game; A/D are the flippers, so undo the on-foot strafe. (W/S used
    // to quit, but a phone joystick pushed sideways for a flipper leaks a little
    // W or S and ended the game by accident.)
    if (d > 4 || !onFoot || pressed['KeyE']) { finish(world); return; }
    player.pos.x = pb.standX; player.pos.z = pb.standZ; // held at the cabinet, W/S included
    player.vel.x = 0; player.vel.z = 0;
    const hud = ensureHud(world);
    const step = Math.min(dt, 0.05);
    // flipper visuals
    hud.lflip.style.transform = `rotate(${keys['KeyA'] ? -35 : 0}deg)`;
    hud.rflip.style.transform = `rotate(${keys['KeyD'] ? 35 : 0}deg)`;

    if (pb.live) {
      pb.vy += GRAV * step;
      pb.bx += pb.vx * step;
      pb.by += pb.vy * step;
      // walls
      if (pb.bx < 7) { pb.bx = 7; pb.vx = Math.abs(pb.vx); }
      if (pb.bx > W - 7) { pb.bx = W - 7; pb.vx = -Math.abs(pb.vx); }
      if (pb.by < 7) { pb.by = 7; pb.vy = Math.abs(pb.vy); }
      // bumpers
      for (const b of pb.bumpers) {
        if (Math.hypot(pb.bx - b.x, pb.by - b.y) < 20) {
          const a = Math.atan2(pb.by - b.y, pb.bx - b.x);
          pb.vx = Math.cos(a) * 240; pb.vy = Math.sin(a) * 240;
          pb.bx = b.x + Math.cos(a) * 21; pb.by = b.y + Math.sin(a) * 21; // out of reach: one hit per bounce
          pb.score += 150; sfxPickup();
        }
      }
      // bottom: a flipper can save it
      if (pb.by > H - 26) {
        const leftZone = pb.bx < W / 2;
        const flipped = leftZone ? keys['KeyA'] : keys['KeyD'];
        if (flipped && pb.by < H - 10) {
          pb.vy = -300; pb.vx = (leftZone ? 1 : -1) * (120 + Math.random() * 80);
          pb.score += 50; sfxPickup();
        } else if (pb.by > H - 8) {
          // drained
          pb.live = false;
          pb.ballsLeft--;
          if (pb.ballsLeft <= 0) { finish(world); return; }
          showToast(`Ball lost — ${pb.ballsLeft} left`);
          setTimeout(() => { if (pb.playing) launchBall(world); }, 400);
        }
      }
      hud.ball.style.left = (pb.bx - 7) + 'px';
      hud.ball.style.top = (pb.by - 7) + 'px';
    }
    hud.score.textContent = `SCORE ${pb.score}  ·  BALLS ${pb.ballsLeft}`;
    world.pinballHint = `PINBALL — ${pb.ballsLeft} balls · A/D flippers · <b>E</b> to stop`;
    return;
  }

  if (d > 3.2 || !onFoot) { if (pb.hud) pb.hud.el.style.display = 'none'; return; }
  world.pinballHint = `PINBALL — press <b>E</b> to play ($${STAKE})${pb.high ? ` · best ${pb.high}` : ''}`;
  if (pressed['KeyE']) start(world);
}

export function pinballSave(world) {
  return { pinballHigh: world.pinball?.high };
}
