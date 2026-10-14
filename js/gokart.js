import * as THREE from 'three';
import { roadCenter } from './city.js';
import { showToast, showMissionMsg, showNews, setHint } from './hud.js';
import { sfxMissionPass, sfxMissionFail, sfxPickup } from './sound.js';
import { addRep } from './economy.js';

// KART CIRCUIT: a tight go-kart loop marked by gates. Roll a vehicle into the
// start ring to begin three timed laps through the gates in order. Beat the
// target times for gold/silver/bronze and a cash payout; best lap is saved.
// It is its own little track, separate from the road-race circuit in races.js.

const rc = roadCenter;
const LAPS = 3;
const GATES = [
  [rc(3), rc(3)], [rc(5), rc(3)], [rc(5), rc(5)], [rc(3), rc(5)],
];
const START = [rc(3) - 6, rc(3)];
const TARGETS = { gold: 54, silver: 72, bronze: 95 }; // total for 3 laps
const PAYOUT = { gold: 1200, silver: 650, bronze: 350 };

export function initGokart(scene, world, save) {
  const start = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5, 0.08, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.45, depthWrite: false })
  );
  start.position.set(START[0], 0.12, START[1]);
  scene.add(start);

  const gate = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5, 3, 22, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x7cf78c, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
  );
  gate.visible = false;
  scene.add(gate);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.2, 40, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x7cf78c, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.visible = false;
  scene.add(beam);

  world.gokart = {
    start, gate, beam,
    active: false, lap: 0, idx: 0, t: 0, countdown: 0, cooldown: 0,
    best: save?.kartBest ?? null,
  };
}

function moveGate(world) {
  const g = world.gokart;
  const c = GATES[g.idx];
  g.gate.position.set(c[0], 1.6, c[1]);
  g.gate.visible = true;
  g.beam.position.set(c[0], 20, c[1]);
  g.beam.visible = true;
  world.kartBlip = { x: c[0], z: c[1] };
}

function endRace(world, failed) {
  const g = world.gokart;
  g.active = false;
  g.gate.visible = false;
  g.beam.visible = false;
  world.kartBlip = null;
  world.kartHint = null;
  g.cooldown = 4;
  if (failed) { sfxMissionFail(); showMissionMsg('OUT OF THE KART', 'Back to the start ring to try again', '#ff5a4a'); return; }
  const t = g.t;
  const medal = t <= TARGETS.gold ? 'gold' : t <= TARGETS.silver ? 'silver' : t <= TARGETS.bronze ? 'bronze' : null;
  const pay = medal ? PAYOUT[medal] : 100;
  world.money += pay;
  if (g.best == null || t < g.best) { g.best = Math.round(t * 10) / 10; showNews('new lap record at the kart circuit'); }
  addRep(world, medal === 'gold' ? 300 : 120);
  world.addXP?.(140);
  sfxMissionPass();
  showMissionMsg(medal ? `${medal.toUpperCase()} MEDAL!` : 'FINISHED', `${t.toFixed(1)}s · +$${pay}${g.best ? ` · best ${g.best}s` : ''}`, medal === 'gold' ? '#ffd24a' : '#7cf78c');
  world.onSave?.();
}

export function updateGokart(world, dt, keys, pressed) {
  const g = world.gokart;
  if (!g) return;
  world.kartHint = null;
  g.start.rotation.y += dt;
  if (g.cooldown > 0) g.cooldown = Math.max(0, g.cooldown - dt);

  const player = world.player;
  const focus = player.inCar ? player.inCar.pos : player.pos;

  if (!g.active) {
    if (g.cooldown > 0) return;
    const d = Math.hypot(focus.x - START[0], focus.z - START[1]);
    if (d > 6) return;
    if (!player.inCar) { world.kartHint = 'KART CIRCUIT — roll a vehicle into the ring to race'; return; }
    world.kartHint = `KART CIRCUIT — press <b>E</b> for ${LAPS} laps` + (g.best ? ` (best ${g.best}s)` : '');
    if (pressed['KeyE']) {
      g.active = true; g.lap = 0; g.idx = 0; g.t = 0; g.countdown = 3;
      moveGate(world);
      showMissionMsg('KART CIRCUIT', 'Get ready...', '#ffd24a');
    }
    return;
  }

  if (!player.inCar) { endRace(world, true); return; }

  if (g.countdown > 0) {
    const b = Math.ceil(g.countdown);
    g.countdown -= dt;
    const a = Math.ceil(g.countdown);
    if (a !== b && a > 0) showMissionMsg('KART CIRCUIT', `${a}...`, '#ffd24a');
    if (g.countdown <= 0) { showMissionMsg('GO!', '', '#7cf78c'); sfxPickup(); }
    return;
  }

  g.t += dt;
  g.gate.rotation.y += dt * 2;
  const c = GATES[g.idx];
  world.kartHint = `KART — lap <b>${g.lap + 1}/${LAPS}</b> · gate ${g.idx + 1}/${GATES.length} · <b>${g.t.toFixed(1)}s</b>`;

  if (Math.hypot(focus.x - c[0], focus.z - c[1]) < 6) {
    g.idx++;
    sfxPickup();
    if (g.idx >= GATES.length) {
      g.idx = 0;
      g.lap++;
      if (g.lap >= LAPS) { endRace(world, false); return; }
      showToast(`Lap ${g.lap} done`);
    }
    moveGate(world);
  }
}

export function gokartSave(world) {
  return { kartBest: world.gokart?.best };
}
