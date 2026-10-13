import * as THREE from 'three';
import { sfxThunder, setRain } from './sound.js';

// Dynamic weather: a cycle of conditions — clear, cloudy, rain, storm and fog —
// that fade into one another over time. Rain is a volume of falling line streaks
// that follows the camera; storms bring heavier rain with frequent thunder and
// lightning (applied to the scene lights by main.js); fog rolls a thick haze in
// that drops the view distance. main.js reads intensity (rain), fog and flash.

const DROPS = 1100;
const VOL_XZ = 55; // half-extent of the rain volume around the camera
const VOL_Y = 50;

// Each condition names its rain level, its overcast dimming, its fog level, how
// often lightning cracks (0 = never) and a HUD label. Transitions pick the next
// condition from `next`, weighted by listing a key more than once.
const CONDITIONS = {
  clear:  { rain: 0,   cloud: 0,    fog: 0,    strike: 0,  label: 'Clear ☀', hold: [70, 110], next: ['cloudy', 'cloudy', 'rain'] },
  cloudy: { rain: 0,   cloud: 0.45, fog: 0.08, strike: 0,  label: 'Cloudy ☁', hold: [45, 80],  next: ['clear', 'rain', 'fog'] },
  rain:   { rain: 0.7, cloud: 0.55, fog: 0.12, strike: 11, label: 'Rain 🌧', hold: [50, 90],  next: ['cloudy', 'storm', 'clear'] },
  storm:  { rain: 1,   cloud: 0.8,  fog: 0.2,  strike: 4,  label: 'Storm ⛈', hold: [35, 55],  next: ['rain', 'cloudy'] },
  fog:    { rain: 0,   cloud: 0.35, fog: 0.85, strike: 0,  label: 'Fog 🌫', hold: [50, 80],  next: ['cloudy', 'clear'] },
};

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export function initWeather(scene) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(DROPS * 6); // two verts per streak
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const drops = [];
  for (let i = 0; i < DROPS; i++) {
    drops.push({
      x: (Math.random() * 2 - 1) * VOL_XZ,
      y: Math.random() * VOL_Y,
      z: (Math.random() * 2 - 1) * VOL_XZ,
      v: 34 + Math.random() * 16,
    });
  }
  const mat = new THREE.LineBasicMaterial({ color: 0x9db8cc, transparent: true, opacity: 0, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.visible = false;
  scene.add(lines);

  const clear = CONDITIONS.clear;
  return {
    lines, mat, drops,
    state: 'clear',
    intensity: 0,  // rain amount, 0..1 (back-compat name)
    cloud: 0,      // overcast dimming, 0..1
    fog: 0,        // haze amount, 0..1
    rainTarget: 0, cloudTarget: 0, fogTarget: 0,
    switchT: rand(40, 70), // first change arrives fairly soon
    thunderT: 0,
    flash: 0,
    strike: 0,     // seconds between lightning for the active condition (0 = none)
    label: clear.label,
  };
}

function enter(w, name) {
  const c = CONDITIONS[name];
  w.state = name;
  w.rainTarget = c.rain;
  w.cloudTarget = c.cloud;
  w.fogTarget = c.fog;
  w.strike = c.strike;
  w.label = c.label;
  w.switchT = rand(c.hold[0], c.hold[1]);
  if (c.strike > 0) w.thunderT = rand(2, c.strike);
}

// Force a specific condition now (used by cheats/debug and the forecast cycle).
export function setWeather(w, name) {
  if (CONDITIONS[name]) enter(w, name);
  return w;
}
export const WEATHER_STATES = Object.keys(CONDITIONS);

export function updateWeather(w, dt, camera) {
  // Back-compat: an old save/state without the new fields still animates.
  if (w.rainTarget === undefined) { w.rainTarget = w.target ?? 0; w.cloudTarget = 0; w.fogTarget = 0; w.cloud = 0; w.fog = 0; w.strike = w.state === 'rain' ? 11 : 0; w.label = CONDITIONS[w.state]?.label || 'Clear ☀'; }

  w.switchT -= dt;
  if (w.switchT <= 0) enter(w, pick((CONDITIONS[w.state] || CONDITIONS.clear).next));

  // ease each channel toward its target
  const ease = (cur, tgt) => {
    const n = cur + (tgt - cur) * Math.min(1, 0.3 * dt);
    return Math.abs(n - tgt) < 0.01 ? tgt : n;
  };
  w.intensity = ease(w.intensity, w.rainTarget);
  w.cloud = ease(w.cloud, w.cloudTarget);
  w.fog = ease(w.fog, w.fogTarget);

  // lightning — only when the active condition strikes and there's real rain
  w.flash = Math.max(0, w.flash - 3 * dt);
  if (w.strike > 0 && w.intensity > 0.35) {
    w.thunderT -= dt;
    if (w.thunderT <= 0) {
      w.thunderT = w.strike + Math.random() * w.strike;
      w.flash = 1;
      sfxThunder();
    }
  }

  setRain(w.intensity);

  const visible = w.intensity > 0.02;
  w.lines.visible = visible;
  if (!visible) return w;

  w.mat.opacity = 0.38 * w.intensity;
  const arr = w.lines.geometry.attributes.position.array;
  const cx = camera.position.x;
  const cy = Math.max(0, camera.position.y - 12);
  const cz = camera.position.z;
  // storms slant the rain; calmer rain falls nearly straight
  const slant = 0.06 + (w.state === 'storm' ? 0.4 : 0) * w.intensity;
  for (let i = 0; i < DROPS; i++) {
    const d = w.drops[i];
    d.y -= d.v * dt;
    if (d.y < 0) {
      d.y += VOL_Y;
      d.x = (Math.random() * 2 - 1) * VOL_XZ;
      d.z = (Math.random() * 2 - 1) * VOL_XZ;
    }
    const x = cx + d.x;
    const y = cy + d.y;
    const z = cz + d.z;
    arr[i * 6] = x;
    arr[i * 6 + 1] = y;
    arr[i * 6 + 2] = z;
    arr[i * 6 + 3] = x + slant;
    arr[i * 6 + 4] = y + 0.9;
    arr[i * 6 + 5] = z;
  }
  w.lines.geometry.attributes.position.needsUpdate = true;
  return w;
}
