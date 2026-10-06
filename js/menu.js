import { CITY, HALF } from './city.js';
import { drawMapMarkers } from './mapMarkers.js';
import { resolutionPolicy } from './renderResolution.js';

// Pause menu (settings + stats) and the full-screen city map with waypoints.
// Plain DOM overlays; the game loop freezes while either is open.

let menuEl = null;
let mapEl = null;
let mapCanvas = null;
let statsEl = null;
let hooks = null;
let graphicsReadout = null;
let mapWorld = null;
let mapCursor = null;

const CLIP =
  'clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);';
const BTN =
  'display:block;width:240px;margin:8px auto;padding:12px 0;cursor:pointer;' +
  'font:900 14px Consolas,ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;' +
  'color:#06131a;border:none;background:#55e6ff;' + CLIP;

function row(label, input) {
  const r = document.createElement('label');
  r.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:260px;margin:7px auto;color:#cfd8e3;font:700 12px Consolas,monospace;letter-spacing:.08em;';
  const l = document.createElement('span');
  l.textContent = label;
  input.setAttribute('aria-label', label);
  r.append(l, input);
  return r;
}

export function initMenu(h) {
  hooks = h;

  // ---------- pause menu ----------
  menuEl = document.createElement('div');
  menuEl.id = 'pausemenu';
  menuEl.style.cssText =
    'position:fixed;inset:0;z-index:40;display:none;flex-direction:column;align-items:center;' +
    'justify-content:safe center;background:radial-gradient(ellipse at 50% 35%,rgba(22,52,79,.6),rgba(6,11,18,.94));' +
    'color:#eef4fb;text-align:center;overflow-y:auto;padding:24px 10px;box-sizing:border-box;' +
    'font-family:Segoe UI,Inter,Arial,sans-serif;';
  const h1 = document.createElement('div');
  h1.textContent = 'PAUSED';
  h1.id = 'pausemenu-title';
  menuEl.setAttribute('role', 'dialog');
  menuEl.setAttribute('aria-modal', 'true');
  menuEl.setAttribute('aria-labelledby', h1.id);
  bindDialogKeys(menuEl, () => hooks.onResume());
  h1.style.cssText = 'font:900 40px Segoe UI,Inter,sans-serif;letter-spacing:.28em;color:#55e6ff;' +
    'text-shadow:0 0 26px rgba(85,230,255,.4);margin-bottom:16px;';
  menuEl.appendChild(h1);

  const resume = document.createElement('button');
  resume.textContent = 'RESUME';
  resume.style.cssText = BTN;
  resume.onclick = () => hooks.onResume();
  menuEl.appendChild(resume);

  if(hooks.onStory){
    const story=document.createElement('button');story.textContent='STORY & JOURNAL';story.style.cssText=BTN;story.onclick=()=>hooks.onStory();menuEl.appendChild(story);
  }

  const photo = document.createElement('button');
  photo.textContent = 'PHOTO MODE';
  photo.style.cssText = BTN + 'background:transparent;color:#eef4fb;box-shadow:inset 0 0 0 1px rgba(85,230,255,.5);';
  photo.onclick = () => hooks.onPhoto();
  menuEl.appendChild(photo);

  if (hooks.onAccessibility) {
    const a11y = document.createElement('button');
    a11y.textContent = '♿ ACCESSIBILITY';
    a11y.style.cssText = BTN + 'background:transparent;color:#eef4fb;box-shadow:inset 0 0 0 1px rgba(85,230,255,.5);';
    a11y.onclick = () => hooks.onAccessibility();
    menuEl.appendChild(a11y);
  }

  if (hooks.cameraSupported) {
    const cam = document.createElement('button');
    cam.textContent = '📷 SELFIE CAM';
    cam.style.cssText = BTN + 'background:transparent;color:#eef4fb;box-shadow:inset 0 0 0 1px rgba(85,230,255,.5);';
    cam.onclick = () => hooks.onCamera();
    menuEl.appendChild(cam);
  }

  const restart = document.createElement('button');
  restart.textContent = 'RESTART (RESPAWN)';
  restart.style.cssText = BTN + 'background:transparent;color:#ff9a90;box-shadow:inset 0 0 0 1px rgba(255,91,82,.55);';
  restart.onclick = () => hooks.onRestart();
  menuEl.appendChild(restart);

  // settings
  const s = hooks.settings;
  const vol = document.createElement('input');
  vol.type = 'range'; vol.min = 0; vol.max = 100; vol.value = s.volume * 100;
  vol.oninput = () => { s.volume = vol.value / 100; hooks.onSettings(); };
  const sens = document.createElement('input');
  sens.type = 'range'; sens.min = 30; sens.max = 220; sens.value = s.sens * 100;
  sens.oninput = () => { s.sens = sens.value / 100; hooks.onSettings(); };
  const inv = document.createElement('input');
  inv.type = 'checkbox'; inv.checked = !!s.invertY;
  inv.onchange = () => { s.invertY = inv.checked; hooks.onSettings(); };
  const qual = document.createElement('select');qual.id = 'graphics-quality';
  for (const value of ['auto','low','medium','high']) {
    const option=document.createElement('option');option.value=value;option.textContent=value[0].toUpperCase()+value.slice(1);qual.appendChild(option);
  }
  qual.value = s.gfxTier || (s.lowGfx ? 'low' : 'auto');
  qual.onchange = () => { s.gfxTier=qual.value;s.lowGfx=qual.value==='low';hooks.onSettings(); };
  const radius = document.createElement('input');radius.id='active-radius';radius.type='range';radius.min=25;radius.max=150;radius.step=5;radius.value=s.activeRadius||50;
  radius.setAttribute('aria-label','Active radius in metres');radius.style.width='100px';
  const radiusLabel=document.createElement('span');radiusLabel.append(radius,document.createTextNode(''));
  const radiusText=()=>{radiusLabel.lastChild.textContent=' '+radius.value+' m';};radiusText();
  radius.oninput=()=>{s.activeRadius=Number(radius.value);radiusText();hooks.onSettings();};
  const ao = document.createElement('input');
  ao.type = 'checkbox'; ao.checked = !!s.ao;
  ao.onchange = () => { s.ao = ao.checked; hooks.onSettings(); };
  const fuel = document.createElement('input');
  fuel.type = 'checkbox'; fuel.checked = !!s.fuel;
  fuel.onchange = () => { s.fuel = fuel.checked; hooks.onSettings(); };
  const shake = document.createElement('input');
  shake.type = 'checkbox'; shake.checked = !!s.cameraShake;
  shake.onchange = () => { s.cameraShake = shake.checked; hooks.onSettings(); };
  const fps = document.createElement('input');
  fps.type = 'checkbox'; fps.checked = !!s.showFps;
  fps.onchange = () => { s.showFps = fps.checked; hooks.onSettings(); };

  const resolution = document.createElement('select');
  resolution.id = 'render-height';
  for (const height of resolutionPolicy(hooks.profile?.graphics).heights) {
    const option = document.createElement('option'); option.value = height;
    option.textContent = height + 'p budget'; resolution.appendChild(option);
  }
  const policy = resolutionPolicy(hooks.profile?.graphics);
  resolution.value = policy.heights.includes(s.renderHeight) ? s.renderHeight : policy.defaultHeight;
  const graphicsChanged = () => { (hooks.onGraphicsSettings || hooks.onSettings)?.(); refreshGraphicsReadout(); };
  resolution.onchange = () => { s.renderHeight = Number(resolution.value); graphicsChanged(); };
  const auto = document.createElement('input'); auto.type = 'checkbox'; auto.id = 'auto-resolution'; auto.checked = !!s.autoResolution;
  auto.onchange = () => { s.autoResolution = auto.checked; graphicsChanged(); };
  const north = document.createElement('input'); north.type = 'checkbox'; north.checked = !!s.minimapNorthUp;
  north.onchange = () => { s.minimapNorthUp = north.checked; hooks.onSettings(); };
  const range = document.createElement('select');
  for (const [value, name] of [[120, 'Near (120 m)'], [240, 'Street (240 m)'], [480, 'District (480 m)']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = name; range.appendChild(option);
  }
  range.value = [120,240,480].includes(s.minimapRange) ? s.minimapRange : 240;
  range.onchange = () => { s.minimapRange = Number(range.value); hooks.onSettings(); };
  for (const control of [qual, resolution, range]) control.style.cssText = 'max-width:150px;background:#142c2f;color:#f4eee3;border:1px solid #68d8de;padding:6px;font:inherit';

  const box = document.createElement('div');
  box.style.cssText = 'margin-top:16px;padding:14px 22px;background:rgba(8,15,24,0.72);border:1px solid rgba(85,230,255,0.3);' + CLIP;
  box.append(
    row('VOLUME', vol),
    row('SENSITIVITY', sens),
    row('INVERT Y', inv),
    row('GRAPHICS QUALITY (RELOAD)', qual),
    row('ACTIVE RADIUS', radiusLabel),
    row('3D RENDER BUDGET', resolution),
    row('AUTO RESOLUTION', auto),
    row('NORTH-UP MINIMAP', north),
    row('MINIMAP RANGE', range),
    row('AMBIENT OCCLUSION (RELOAD)', ao),
    row('VEHICLE FUEL', fuel),
    row('IMPACT CAMERA SHAKE', shake),
    row('SHOW FPS METER', fps),
  );
  graphicsReadout = document.createElement('div');
  graphicsReadout.id = 'render-resolution-status'; graphicsReadout.setAttribute('role', 'status');
  graphicsReadout.style.cssText = 'max-width:290px;margin:10px auto 0;font:12px/1.5 Arial;color:#b8d1d6';
  box.appendChild(graphicsReadout);
  const mapNote = document.createElement('div');
  mapNote.textContent = 'HUD size is in Accessibility. Reduced motion keeps the minimap north-up.';
  mapNote.style.cssText = 'max-width:290px;margin:8px auto 0;font:11px/1.5 Arial;color:#b8d1d6';
  box.appendChild(mapNote);
  menuEl.appendChild(box);

  // lifetime stats
  statsEl = document.createElement('div');
  statsEl.style.cssText = 'margin-top:14px;font:600 11px/1.95 Consolas,ui-monospace,monospace;color:#8ea6bb;letter-spacing:.1em;text-align:left;';
  menuEl.appendChild(statsEl);
  document.body.appendChild(menuEl);

  // ---------- big map ----------
  mapEl = document.createElement('div');
  mapEl.id = 'bigmap';
  mapEl.setAttribute('role', 'dialog');
  mapEl.setAttribute('aria-modal', 'true');
  mapEl.setAttribute('aria-label', 'City map');
  bindDialogKeys(mapEl, () => hooks.onCloseMap?.(), true);
  mapEl.style.cssText =
    'position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:safe center;' +
    'flex-direction:column;overflow:auto;padding:12px;box-sizing:border-box;background:radial-gradient(ellipse at center,rgba(22,52,79,.5),rgba(6,11,18,.95));';
  const tip = document.createElement('div');
  tip.textContent = 'CLICK A DESTINATION · ARROWS + ENTER FOR KEYBOARD · M TO CLOSE';
  tip.style.cssText = 'max-width:90vw;text-align:center;line-height:1.5;color:#55e6ff;font:800 12px Consolas,ui-monospace,monospace;letter-spacing:.24em;margin-bottom:10px;';
  mapCanvas = document.createElement('canvas');
  mapCanvas.width = 640;
  mapCanvas.height = 640;
  mapCanvas.tabIndex = 0;
  mapCanvas.setAttribute('aria-label', 'City map. Use arrow keys to choose a waypoint, then Enter to set it. Press M to close.');
  mapCanvas.style.cssText = 'width:min(76vmin,640px);height:min(76vmin,640px);flex-shrink:0;border:1px solid rgba(85,230,255,0.4);cursor:crosshair;' +
    'clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px);';
  mapCanvas.addEventListener('pointerdown', (e) => {
    const r = mapCanvas.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width;
    const v = (e.clientY - r.top) / r.height;
    hooks.onWaypoint(u * (CITY + 30) - HALF - 15, v * (CITY + 30) - HALF - 15);
  });
  mapCanvas.addEventListener('keydown', e => {
    if (!mapWorld || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Space'].includes(e.code)) return;
    e.preventDefault(); e.stopPropagation();
    const pos = (mapWorld.player.inCar || mapWorld.player.inHeli || mapWorld.player.inBoat || mapWorld.player.inPlane || mapWorld.player).pos;
    mapCursor ||= { x: pos.x, z: pos.z };
    const step = e.shiftKey ? 60 : 15;
    if (e.code === 'ArrowLeft') mapCursor.x -= step;
    if (e.code === 'ArrowRight') mapCursor.x += step;
    if (e.code === 'ArrowUp') mapCursor.z -= step;
    if (e.code === 'ArrowDown') mapCursor.z += step;
    mapCursor.x = Math.max(-HALF, Math.min(HALF, mapCursor.x));
    mapCursor.z = Math.max(-HALF, Math.min(HALF, mapCursor.z));
    if (e.code === 'Enter' || e.code === 'Space') hooks.onWaypoint(mapCursor.x, mapCursor.z);
    else drawBigMap(mapWorld);
  });
  const filters = document.createElement('div');
  filters.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;justify-content:center;color:#f4eee3;font:12px Arial;margin:8px';
  for (const [key,label] of [['mapServices','Services'],['mapActivities','Activities'],['mapPolice','Police']]) {
    const wrap = document.createElement('label'), check = document.createElement('input');
    check.type = 'checkbox'; check.checked = s[key] !== false;
    check.onchange = () => { s[key] = check.checked; hooks.onSettings(); if (mapWorld) drawBigMap(mapWorld); };
    wrap.append(check, document.createTextNode(label)); filters.appendChild(wrap);
  }
  const legend = document.createElement('div');
  legend.textContent = 'B Bank · V Dealer · G Workshop · S Store · Pump Petrol · Lightning Nitro · Blue Police';
  legend.style.cssText = 'color:#f4eee3;font:13px sans-serif;text-align:center;margin-top:8px';
  mapEl.append(tip, mapCanvas, filters, legend);
  if (hooks.onCloseMap) {
    const close = document.createElement('button');
    close.textContent = 'CLOSE MAP [M / ESC]';
    close.style.cssText = BTN + 'width:220px;margin:8px auto 0;padding:8px;flex-shrink:0';
    close.onclick = () => hooks.onCloseMap();
    mapEl.appendChild(close);
  }
  document.body.appendChild(mapEl);
  return { menuEl, mapEl };
}

function bindDialogKeys(dialog, close, map = false) {
  dialog.addEventListener('keydown', event => {
    if (event.code === 'Escape' || (map && event.code === 'KeyM' && !event.ctrlKey && !event.metaKey && !event.altKey)) {
      event.preventDefault(); event.stopPropagation(); if (!event.repeat) close();
      return;
    }
    if (event.code !== 'Tab') return;
    const items = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),canvas[tabindex]')];
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
}

function refreshGraphicsReadout() {
  if (!graphicsReadout) return;
  const status = hooks.graphics?.();
  graphicsReadout.textContent = status
    ? '3D: ' + status.width + ' × ' + status.height + ' pixels. Display: ' + status.nativeWidth + ' × ' + status.nativeHeight + '.' + (status.autoResolution ? ' Auto adjusts within your budget.' : '')
    : 'Render budget controls 3D detail in pixels. Menus and HUD keep their display resolution.';
}

export function openMenu(world) {
  refreshGraphicsReadout();
  const st = world.stats;
  const ach = world.ach ? Object.keys(world.ach).length : 0;
  const achTotal = world.achTotal || 10;
  statsEl.innerHTML =
    `DISTANCE SWUNG&nbsp;<b style="color:#fff">${(st.swungM / 1000).toFixed(2)} km</b><br>` +
    `BEST STYLE CASH-OUT&nbsp;<b style="color:#fff">$${st.styleBest | 0}</b> · LEVEL <b style="color:#fff">${world.level}</b> (${world.xp | 0} XP)<br>` +
    `MISSIONS <b style="color:#fff">${st.missions | 0}</b> · FARES <b style="color:#fff">${st.fares | 0}</b> · TANKS <b style="color:#fff">${st.tanks | 0}</b> · JACKPOTS <b style="color:#fff">${st.jackpots | 0}</b><br>` +
    `PACKAGES <b style="color:#fff">${st.tokens | 0}/20</b> · RIVALS BEATEN <b style="color:#fff">${st.rivals | 0}</b><br>` +
    `ACHIEVEMENTS UNLOCKED&nbsp;<b style="color:#fff">${ach}/${achTotal}</b>`;
  menuEl.style.display = 'flex';
  menuEl.querySelector('button')?.focus({ preventScroll: true });
}

export function closeMenu() {
  menuEl.style.display = 'none';
}

export function openMap(world) {
  mapWorld = world;
  mapCursor = null;
  mapEl.style.display = 'flex';
  drawBigMap(world);
  mapCanvas.focus({ preventScroll: true });
}

export function closeMap() {
  mapEl.style.display = 'none';
  mapWorld = null;
  mapCursor = null;
}

export function drawBigMap(world) {
  const g = mapCanvas.getContext('2d');
  const size = mapCanvas.width;
  const sc = size / (CITY + 30);
  const M = (x, z) => [(x + HALF + 15) * sc, (z + HALF + 15) * sc];

  g.fillStyle = '#111a24';
  g.fillRect(0, 0, size, size);
  g.strokeStyle = '#46505c';
  g.lineWidth = 16 * sc;
  for (const rx of world.city.roadXs) {
    const [mx] = M(rx, 0);
    g.beginPath(); g.moveTo(mx, 0); g.lineTo(mx, size); g.stroke();
  }
  for (const rz of world.city.roadZs) {
    const [, mz] = M(0, rz);
    g.beginPath(); g.moveTo(0, mz); g.lineTo(size, mz); g.stroke();
  }
  if (world.gang) {
    const z = world.gang.zone;
    const [x0, z0] = M(z.x0, z.z0);
    const [x1, z1] = M(z.x1, z.z1);
    g.fillStyle = world.gang.owned ? 'rgba(47,175,78,0.3)' : 'rgba(192,48,48,0.35)';
    g.fillRect(x0, z0, x1 - x0, z1 - z0);
  }
  const dot = (x, z, c, r = 5) => {
    const [mx, mz] = M(x, z);
    g.fillStyle = c;
    g.beginPath(); g.arc(mx, mz, r, 0, Math.PI * 2); g.fill();
  };
  drawMapMarkers(g,world,M,{size:22,labels:true});
  if (mapCursor) {
    const [x,y] = M(mapCursor.x,mapCursor.z);
    g.strokeStyle = '#f4eee3'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x-9,y); g.lineTo(x+9,y); g.moveTo(x,y-9); g.lineTo(x,y+9); g.stroke();
  }
  // player
  const p = world.player.inCar || world.player.inHeli || world.player.inBoat || world.player.inPlane || world.player;
  const [px, pz] = M(p.pos.x, p.pos.z);
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(px, pz, 7, 0, Math.PI * 2); g.fill();
}
