import * as THREE from 'three';
import { placeStreetSite } from './site-layout.js';
import { postSign, signTexture, faceNearestRoad } from './propKit.js';
import { showToast, showMissionMsg, showNews } from './hud.js';
import { sfxPickup, sfxMissionPass, sfxMissionFail } from './sound.js';
import { addRep } from './economy.js';

// TRIVIA KIOSK: a glowing quiz booth by spawn. Pay $10 and press E for a
// five-question round: four answers on keys 1-4, ten seconds a question on a
// shrinking bar. Every right answer pays $40 and a perfect 5/5 adds a $200
// bonus. Half the questions are general knowledge; the rest are about this
// city (each one checked against the game's own code).

const FEE = 10;
const PER_CORRECT = 40;
const PERFECT_BONUS = 200;
const ROUND = 5;
const TIME = 10;          // seconds per question
const REVEAL = 1.4;       // seconds the right answer stays highlighted
const COOLDOWN = 5;
const REACH = 2.6;

// a: the right answer first, then three wrong ones; the order is shuffled when asked
const QUESTIONS = [
  // ---- general knowledge ----
  { q: 'What is the capital of Australia?', a: ['Canberra', 'Sydney', 'Melbourne', 'Perth'] },
  { q: 'How many planets are in our solar system?', a: ['8', '7', '9', '10'] },
  { q: 'What is the chemical symbol for gold?', a: ['Au', 'Ag', 'Gd', 'Go'] },
  { q: 'Which is the largest ocean on Earth?', a: ['Pacific', 'Atlantic', 'Indian', 'Arctic'] },
  { q: 'What is the fastest land animal?', a: ['Cheetah', 'Lion', 'Pronghorn', 'Greyhound'] },
  { q: 'Who painted the Mona Lisa?', a: ['Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Vincent van Gogh'] },
  { q: 'At sea level, water boils at...', a: ['100 °C', '90 °C', '110 °C', '212 °C'] },
  { q: 'What is the square root of 144?', a: ['12', '14', '11', '16'] },
  { q: 'Which is the largest planet in the solar system?', a: ['Jupiter', 'Saturn', 'Neptune', 'Earth'] },
  { q: 'In what year did humans first land on the Moon?', a: ['1969', '1959', '1972', '1965'] },
  { q: 'What is the smallest prime number?', a: ['2', '1', '3', '0'] },
  { q: 'How many bones are in an adult human body?', a: ['206', '186', '226', '300'] },
  { q: 'Which planet is known as the Red Planet?', a: ['Mars', 'Venus', 'Mercury', 'Jupiter'] },
  { q: 'Who wrote "Romeo and Juliet"?', a: ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'] },
  { q: 'How many sides does a hexagon have?', a: ['6', '5', '7', '8'] },
  { q: 'Which gas do plants take in for photosynthesis?', a: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'] },
  { q: 'What is the currency of Japan?', a: ['Yen', 'Won', 'Yuan', 'Ringgit'] },
  { q: 'How many continents are there?', a: ['7', '5', '6', '8'] },
  { q: 'What is the tallest mountain above sea level?', a: ['Mount Everest', 'K2', 'Kilimanjaro', 'Mont Blanc'] },
  { q: 'How many minutes are in a day?', a: ['1440', '1240', '1600', '3600'] },
  { q: 'What is the hardest natural material?', a: ['Diamond', 'Granite', 'Quartz', 'Iron'] },
  // ---- this city (checked against the code) ----
  { q: 'OPEN CITY: How many stars can your wanted level reach?', a: ['5', '3', '6', '10'] },                         // police.js
  { q: 'OPEN CITY: How tall is the Spire?', a: ['150 m', '100 m', '200 m', '300 m'] },                                 // landmarks.js
  { q: 'OPEN CITY: How many save slots are on the start screen?', a: ['3', '2', '4', '5'] },                         // saveStorage.js
  { q: 'OPEN CITY: Which character is the fast, agile glass cannon?', a: ['BOLT', 'WEAVER', 'BRICK', 'REX'] },      // characters.js
  { q: 'OPEN CITY: Which character is the tough bruiser?', a: ['BRICK', 'BOLT', 'WEAVER', 'VIPER'] },                // characters.js
  { q: 'OPEN CITY: Which character is the balanced all-rounder?', a: ['WEAVER', 'BRICK', 'BOLT', 'SPIRE'] },        // characters.js
  { q: 'OPEN CITY: How much health does BRICK start with?', a: ['150', '100', '120', '200'] },                       // characters.js
  { q: 'OPEN CITY: How big is the city grid?', a: ['10×10 blocks', '8×8 blocks', '12×12 blocks', '6×6 blocks'] },   // city.js N = 10
  { q: 'OPEN CITY: How many hidden packages are there?', a: ['20', '10', '50', '100'] },                             // legend.js
  { q: 'OPEN CITY: What hunts you at five stars?', a: ['An army tank', 'A UFO', 'A kaiju', 'The coast guard'] },    // army.js
  { q: 'OPEN CITY: What does petrol cost at the pumps?', a: ['$2 per litre', '$1 per litre', '$3 per litre', '$5 per litre'] }, // vehicleFuel.js
  { q: 'OPEN CITY: The harbor fireworks barge fires from...', a: ['20:00 to 02:00', '18:00 to 22:00', '22:00 to 04:00', 'Noon to 14:00'] }, // fireworks.js
  { q: 'OPEN CITY: What is the name of the dog you can adopt?', a: ['REX', 'MAX', 'BUDDY', 'SPOT'] },               // dog.js
  { q: 'OPEN CITY: Which gang holds the north-east corner district?', a: ['The Vipers', 'The Cobras', 'The Jackals', 'The Wolves'] }, // gangs.js
  { q: 'OPEN CITY: Which of these is NOT one of the city\'s weather states?', a: ['Snow', 'Fog', 'Storm', 'Cloudy'] }, // weather.js
  { q: 'OPEN CITY: How many golden sky hoops float above the streets?', a: ['10', '5', '20', '12'] },               // hoops.js
  { q: 'OPEN CITY: Which station is on the car radio?', a: ['NITE JAZZ', 'ROCK 101', 'CITY POP 99', 'NEWS 24'] },  // sound.js
  { q: 'OPEN CITY: What is the casino called?', a: ['The Lucky 7', 'The Golden Ace', 'The Royal Flush', 'The High Roller'] }, // casinoboss.js
  { q: 'OPEN CITY: Which key opens the Legend board?', a: ['L', 'M', 'P', 'G'] },                                     // main.js
  { q: 'OPEN CITY: How many billboards does the Billboard Hacker job light up?', a: ['4', '3', '5', '6'] },        // billboard.js
  { q: 'OPEN CITY: Which item is NOT on the Taco Loco menu?', a: ['Nachos', 'Churro', 'Burrito', 'Soda'] },          // foodtruck.js
  { q: 'OPEN CITY: When does the UFO circle the city?', a: ['Midnight to 4am', 'Dusk', 'Noon', 'During storms'] }, // ufo.js
];

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export function initTrivia(scene, world, save) {
  const pos = world.city.spawn.clone().add(new THREE.Vector3(18, 0, 34));
  placeStreetSite(world.city, pos, 2.4, 'trivia-kiosk');
  const yaw = faceNearestRoad(world.city, pos); // the screen faces the street
  const local = (x, z) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(pos.x, 0, pos.z));

  // the kiosk: a slim cabinet with a glowing screen, light strips and a lit topper
  const kiosk = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x1c1640, roughness: 0.5, metalness: 0.3 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x301a60, emissive: 0xb060ff, emissiveIntensity: 1.1 });
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x0a1030, emissive: 0x40c8ff, emissiveIntensity: 0.9, roughness: 0.2 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; kiosk.add(m); return m; };
  add(new THREE.BoxGeometry(1.5, 0.12, 1.0), body, 0, 0.06, 0);         // base plate
  add(new THREE.BoxGeometry(1.2, 2.1, 0.6), body, 0, 1.17, 0);          // cabinet
  const screen = add(new THREE.BoxGeometry(0.95, 0.75, 0.04), screenMat, 0, 1.55, 0.31);
  screen.rotation.x = -0.12;
  add(new THREE.BoxGeometry(1.0, 0.08, 0.25), body, 0, 1.05, 0.38);     // button ledge
  const btnGeo = new THREE.BoxGeometry(0.14, 0.04, 0.12);
  const btnCols = [0xff5a5a, 0xffd04a, 0x5fd16a, 0x4aa8ff];
  btnCols.forEach((c, i) => add(btnGeo, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 }), -0.33 + i * 0.22, 1.11, 0.4));
  for (const x of [-0.63, 0.63]) add(new THREE.BoxGeometry(0.06, 2.1, 0.62), glow, x, 1.17, 0); // side light strips
  const topMat = new THREE.MeshBasicMaterial({ map: signTexture('TRIVIA', { fg: '#f4e8ff', bg: '#1a0a3a', accent: '#c070ff' }), toneMapped: false });
  for (const side of [1, -1]) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), topMat);
    board.position.set(0, 2.45, side * 0.02);
    board.rotation.y = side > 0 ? 0 : Math.PI;
    kiosk.add(board);
  }
  kiosk.position.set(pos.x, 0, pos.z);
  kiosk.rotation.y = yaw;
  scene.add(kiosk);
  postSign(scene, world.city, pos, 'TRIVIA KIOSK', { fg: '#f4e8ff', bg: '#1a0a3a', accent: '#c070ff' }, { offset: 1.6, height: 2.6 });

  world.trivia = {
    pos, yaw, screenMat,
    stand: local(0, 1.0),   // where the player stands to play
    state: 'idle',          // idle -> question -> reveal -> ... -> idle
    deck: shuffle(QUESTIONS.map((_, i) => i)),
    round: [],              // question indices for this round
    qi: 0,                  // index into round
    q: null,                // { q, choices, correct }
    correct: -1,            // index (0-3) of the right answer as displayed; key = 'Digit' + (correct + 1)
    picked: -1,             // what the player chose (-1 = ran out of time)
    t: 0,                   // seconds left on this question (reveal: seconds left showing the answer)
    score: 0, earned: 0, cooldown: 0,
    hud: null,
    best: save?.triviaBest ?? 0,
    perfects: save?.triviaPerfects ?? 0,
  };
}

function nextIndex(T) {
  if (!T.deck.length) T.deck = shuffle(QUESTIONS.map((_, i) => i));
  return T.deck.pop();
}

function ask(T) {
  const src = QUESTIONS[T.round[T.qi]];
  const order = shuffle([0, 1, 2, 3]);
  T.q = { q: src.q, choices: order.map((i) => src.a[i]), correct: order.indexOf(0) };
  T.correct = T.q.correct;
  T.picked = -1;
  T.t = TIME;
  T.state = 'question';
}

function ensureHud(world) {
  const T = world.trivia;
  if (T.hud) return T.hud;
  const el = document.createElement('div');
  el.id = 'trivia';
  el.style.cssText = 'position:fixed;left:50%;top:96px;transform:translateX(-50%);width:380px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:8px 10px;' +
    'background:#120a26e8;border:1px solid #c070ff;border-radius:6px;display:none;z-index:30;color:#f4e8ff;font:600 13px system-ui';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;font-weight:800;margin-bottom:6px;color:#c070ff';
  const bar = document.createElement('div');
  bar.style.cssText = 'height:8px;background:#0006;border-radius:4px;overflow:hidden;margin-bottom:8px';
  const fill = document.createElement('div');
  fill.style.cssText = 'height:100%;width:100%;background:#5fd16a';
  bar.appendChild(fill);
  const question = document.createElement('div');
  question.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:8px;line-height:1.3';
  const answers = document.createElement('div');
  answers.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px';
  const rows = [0, 1, 2, 3].map(() => {
    const r = document.createElement('div');
    r.style.cssText = 'padding:6px 8px;border-radius:4px;background:#ffffff14;outline:1px solid #ffffff22;overflow-wrap:anywhere';
    answers.appendChild(r);
    return r;
  });
  el.append(head, bar, question, answers);
  document.body.appendChild(el);
  T.hud = { el, head, fill, question, rows };
  return T.hud;
}

function renderHud(world) {
  const T = world.trivia, hud = ensureHud(world);
  hud.el.style.display = 'block';
  hud.head.textContent = `TRIVIA  Q${T.qi + 1}/${ROUND}`;
  hud.head.appendChild(Object.assign(document.createElement('span'), { textContent: `${T.score} right · $${T.earned}` }));
  const frac = T.state === 'question' ? Math.max(0, T.t / TIME) : 0;
  hud.fill.style.width = `${Math.round(frac * 100)}%`;
  hud.fill.style.background = frac > 0.5 ? '#5fd16a' : frac > 0.25 ? '#ffc040' : '#ff5a4a';
  hud.question.textContent = T.q.q;
  T.q.choices.forEach((c, i) => {
    const r = hud.rows[i];
    r.textContent = `${i + 1}  ${c}`;
    let bg = '#ffffff14', ol = '#ffffff22';
    if (T.state === 'reveal') {
      if (i === T.correct) { bg = '#5fd16a55'; ol = '#5fd16a'; }
      else if (i === T.picked) { bg = '#ff5a4a55'; ol = '#ff5a4a'; }
    }
    r.style.background = bg;
    r.style.outlineColor = ol;
  });
}

function endRound(world, early) {
  const T = world.trivia;
  T.state = 'idle';
  T.cooldown = COOLDOWN;
  T.q = null;
  T.correct = -1;
  if (T.hud) T.hud.el.style.display = 'none';
  T.screenMat.emissive.setHex(0x40c8ff);
  if (early) {
    showMissionMsg('TRIVIA ENDED', `${T.score} right · $${T.earned} won`, '#c070ff');
    world.onSave?.();
    return;
  }
  const perfect = T.score === ROUND;
  if (perfect) {
    world.money += PERFECT_BONUS;
    T.earned += PERFECT_BONUS;
    T.perfects++;
  }
  const newBest = T.score > T.best;
  if (newBest) T.best = T.score;
  if (T.score > 0) {
    world.addXP?.(T.score * 6 + (perfect ? 30 : 0));
    addRep(world, T.score * 3 + (perfect ? 15 : 0));
  }
  (T.score >= 3 ? sfxMissionPass : sfxMissionFail)();
  showMissionMsg(perfect ? 'PERFECT ROUND!' : 'TRIVIA OVER',
    `${T.score}/${ROUND} right · $${T.earned} won${perfect ? ` (incl. $${PERFECT_BONUS} bonus)` : ''}${newBest ? ' · NEW BEST!' : ''}`, '#c070ff');
  if (perfect && T.perfects === 1) showNews('a quiz whiz aced the trivia kiosk by spawn');
  world.onSave?.();
}

export function updateTrivia(world, dt, keys, pressed) {
  const T = world.trivia;
  if (!T) return;
  world.triviaHint = null;
  if (T.cooldown > 0) T.cooldown = Math.max(0, T.cooldown - dt);

  const player = world.player;
  const onFoot = !player.inCar && !player.inHeli && !player.inBoat;

  if (T.state === 'idle') {
    if (!onFoot) return;
    const d = Math.hypot(player.pos.x - T.stand.x, player.pos.z - T.stand.z);
    if (d > REACH) return;
    if (T.cooldown > 0) { world.triviaHint = 'TRIVIA KIOSK — loading new questions...'; return; }
    if (world.money < FEE) { world.triviaHint = `TRIVIA KIOSK — a round costs $${FEE}`; return; }
    world.triviaHint = `TRIVIA KIOSK — press <b>E</b> to play 5 questions ($${FEE}) · $${PER_CORRECT} a right answer, $${PERFECT_BONUS} for 5/5${T.best ? ` · best ${T.best}/${ROUND}` : ''}`;
    if (pressed['KeyE']) {
      world.money -= FEE;
      T.round = [];
      for (let i = 0; i < ROUND; i++) T.round.push(nextIndex(T));
      T.qi = 0; T.score = 0; T.earned = 0;
      ask(T);
      sfxPickup();
      showToast(`🧠 Trivia! Answer with 1-4 · E quits`);
      renderHud(world);
    }
    return;
  }

  // ---- a round is running: stay at the screen; E quits ----
  if (!onFoot || pressed['KeyE']) { endRound(world, true); return; }
  player.pos.x = T.stand.x; player.pos.z = T.stand.z;
  player.vel.x = 0; player.vel.z = 0;
  player.heading = T.yaw + Math.PI; // facing the screen
  world.nearKiosk = true; // the number keys answer here, not switch weapons

  if (T.state === 'question') {
    world.triviaHint = 'TRIVIA — press <b>1</b>-<b>4</b> to answer · <b>E</b> quits';
    T.t -= dt;
    const choice = [1, 2, 3, 4].find((n) => pressed['Digit' + n]);
    if (choice || T.t <= 0) {
      T.picked = choice ? choice - 1 : -1;
      if (T.picked === T.correct) {
        T.score++;
        world.money += PER_CORRECT;
        T.earned += PER_CORRECT;
        sfxPickup();
        T.screenMat.emissive.setHex(0x5fd16a);
      } else {
        sfxMissionFail();
        T.screenMat.emissive.setHex(0xff5a4a);
        if (T.picked < 0) showToast('⏱ Out of time!');
      }
      T.state = 'reveal';
      T.t = REVEAL;
    }
  } else if (T.state === 'reveal') {
    world.triviaHint = T.picked === T.correct ? `Correct! +$${PER_CORRECT}` : 'Wrong — the right answer is highlighted';
    T.t -= dt;
    if (T.t <= 0) {
      T.screenMat.emissive.setHex(0x40c8ff);
      T.qi++;
      if (T.qi >= ROUND) { endRound(world, false); return; }
      ask(T);
    }
  }
  renderHud(world);
}

export function triviaSave(world) {
  return { triviaBest: world.trivia?.best, triviaPerfects: world.trivia?.perfects };
}
