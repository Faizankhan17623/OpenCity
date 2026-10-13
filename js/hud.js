import { HALF } from './city.js';
import { keys } from './input.js';
import { drawMapMarkers } from './mapMarkers.js';

let els = null;
let mapCtx = null;

export function initHUD() {
  els = {
    money: document.getElementById('money'),
    clock: document.getElementById('clock'),
    stars: document.getElementById('stars').children,
    health: document.getElementById('health'),
    speed: document.getElementById('speed'),
    weapon: document.getElementById('weapon'),
    hint: document.getElementById('hint'),
    crosshair: document.getElementById('crosshair'),
    banner: document.getElementById('banner'),
    toast: document.getElementById('toast'),
    minimap: document.getElementById('minimap'),
    kw: document.getElementById('k-w'),
    ka: document.getElementById('k-a'),
    ks: document.getElementById('k-s'),
    kd: document.getElementById('k-d'),
    mission: document.getElementById('mission'),
    mtitle: document.getElementById('mtitle'),
    mtext: document.getElementById('mtext'),
    mtimer: document.getElementById('mtimer'),
    missionmsg: document.getElementById('missionmsg'),
    mm1: document.getElementById('mm1'),
    mm2: document.getElementById('mm2'),
    damage: document.getElementById('damage'),
  };
  mapCtx = els.minimap.getContext('2d');

  // news ticker along the bottom edge
  const news = document.createElement('div');
  news.id = 'news';
  news.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;z-index:30;display:none;' +
    'background:rgba(6,12,20,0.82);color:#55e6ff;text-align:center;' +
    'font:800 11px/2 Consolas,ui-monospace,monospace;letter-spacing:.28em;text-transform:uppercase;' +
    'border-top:1px solid rgba(85,230,255,0.4);padding:2px 0;text-shadow:0 0 10px rgba(85,230,255,.4)';
  document.body.appendChild(news);
  els.news = news;

  // NPC speech-bubble pool
  els.barks = [];
  for (let i = 0; i < 5; i++) {
    const b = document.createElement('div');
    b.style.cssText =
      'position:fixed;z-index:6;display:none;transform:translate(-50%,-100%);' +
      'background:rgba(9,16,26,0.92);color:#eef4fb;font:700 11px Consolas,monospace;' +
      'letter-spacing:.04em;padding:4px 9px;white-space:nowrap;pointer-events:none;' +
      'border:1px solid rgba(85,230,255,0.35);' +
      'clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px);';
    document.body.appendChild(b);
    els.barks.push(b);
  }

  // level badge along the top edge
  const lvl = document.createElement('div');
  lvl.id = 'level-readout';
  lvl.style.cssText =
    'position:fixed;top:9px;left:50%;transform:translateX(-50%);z-index:6;text-align:center;' +
    'color:#55e6ff;font:800 12px/1.5 Consolas,ui-monospace,monospace;letter-spacing:.22em;' +
    'text-transform:uppercase;text-shadow:0 2px 6px #000;pointer-events:none;';
  document.body.appendChild(lvl);
  els.level = lvl;
}

let newsTimer = null;
export function showNews(text) {
  if (!els) return;
  els.news.textContent = '⚡ CITY NEWS — ' + text;
  els.news.style.display = 'block';
  clearTimeout(newsTimer);
  newsTimer = setTimeout(() => { els.news.style.display = 'none'; }, 8000);
}

let msgTimer = null;
export function showMissionMsg(title, sub, color = '#7cf78c') {
  els.mm1.textContent = title;
  els.mm1.style.color = color;
  els.mm2.textContent = sub || '';
  els.missionmsg.classList.add('show');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => els.missionmsg.classList.remove('show'), 3200);
}

export function setHint(html) {
  if (html) {
    els.hint.innerHTML = html;
    els.hint.style.display = 'block';
  } else {
    els.hint.style.display = 'none';
  }
}

export function showBanner(text, color) {
  els.banner.textContent = text;
  els.banner.style.color = color;
  els.banner.style.display = 'block';
}

export function hideBanner() {
  els.banner.style.display = 'none';
}

let toastTimer = null;
let toastClickHandler = null;
export function showToast(text, { duration = 2200, dismissOnClick = false } = {}) {
  if (toastClickHandler) window.removeEventListener('click', toastClickHandler);
  toastClickHandler = null;
  els.toast.textContent = text;
  els.toast.style.display = 'block';
  els.toast.style.pointerEvents = dismissOnClick ? 'auto' : '';
  els.toast.style.cursor = dismissOnClick ? 'pointer' : '';
  els.toast.style.maxWidth = dismissOnClick ? 'min(90vw, 760px)' : '';
  els.toast.style.padding = dismissOnClick ? '10px 14px' : '';
  els.toast.style.background = dismissOnClick ? 'rgba(6,12,20,.94)' : '';
  els.toast.style.border = dismissOnClick ? '1px solid rgba(85,230,255,.45)' : '';
  els.toast.style.textAlign = dismissOnClick ? 'center' : '';
  els.toast.style.whiteSpace = dismissOnClick ? 'normal' : '';
  els.toast.style.textTransform = dismissOnClick ? 'none' : '';
  els.toast.setAttribute('role', dismissOnClick ? 'button' : 'status');
  els.toast.tabIndex = dismissOnClick ? 0 : -1;
  els.toast.onclick = dismissOnClick ? dismissToast : null;
  els.toast.onkeydown = dismissOnClick ? (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dismissToast();
    }
  } : null;
  if (dismissOnClick) {
    toastClickHandler = dismissToast;
    // Let the Play button's click finish before listening for a dismiss click.
    setTimeout(() => {
      if (toastClickHandler) window.addEventListener('click', toastClickHandler);
    }, 0);
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(dismissToast, duration);
}

function dismissToast() {
  if (!els?.toast) return;
  if (toastClickHandler) window.removeEventListener('click', toastClickHandler);
  toastClickHandler = null;
  clearTimeout(toastTimer);
  toastTimer = null;
  els.toast.style.display = 'none';
  els.toast.onclick = null;
  els.toast.onkeydown = null;
}

export function updateHUD(world) {
  const { player } = world;

  els.money.textContent = 'CASH $' + world.money.toLocaleString('en-US', { maximumFractionDigits: 2 });

  const hh = Math.floor(world.clock);
  const mm = Math.floor((world.clock % 1) * 60);
  els.clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  // weather chip — a small condition readout tucked under the clock
  if (world.weatherLabel) {
    if (!els.weather) {
      const el = document.createElement('div');
      el.id = 'weather';
      el.style.cssText = 'font:600 12px/1 system-ui;color:#bfe0ea;text-shadow:0 1px 3px #000;opacity:.9;margin-top:3px;letter-spacing:.03em';
      els.clock.parentElement?.appendChild(el);
      els.weather = el;
    }
    if (els.weather.textContent !== world.weatherLabel) els.weather.textContent = world.weatherLabel;
  }

  for (let i = 0; i < 5; i++) {
    els.stars[i].classList.toggle('lit', i < world.wanted);
  }

  const hp = Math.max(0, player.health);
  const hpPct = Math.min(100, (hp / (world.maxHealth || 100)) * 100);
  els.health.style.width = hpPct + '%';
  els.health.style.background = hp > 40
    ? 'linear-gradient(90deg,#28c46e,#7cf0ac)'
    : 'linear-gradient(90deg,#c0362e,#ff6a60)';
  if (els.hpnum) els.hpnum.textContent = Math.round(hpPct);

  if (player.inCar || player.inHeli || player.inBoat) {
    const v = player.inCar || player.inHeli || player.inBoat;
    els.speed.style.display = 'block';
    const nitro = player.inCar && !player.inCar.tank
      ? ` <small style="color:#7ecbff">N₂O ${Math.round(player.inCar.nitro ?? 100)}%</small>` : '';
    els.speed.innerHTML = `<span class="big">${Math.round(v.vel.length() * 2.4)}</span> <small>MPH</small>` + nitro;
    if (player.inCar && !v.tank && world.settings.fuel) {
      const percent = Math.max(0, Math.min(100, v.fuelLiters / v.fuelCapacityLiters * 100));
      els.speed.innerHTML += `<div id="fuel-readout" style="font-size:13px;color:${percent < 12 ? '#ff785f' : '#ffd27b'}">PETROL ${v.fuelLiters.toFixed(1)} / ${v.fuelCapacityLiters} L` +
        `<div style="height:4px;background:#384350;margin-top:4px"><div style="height:100%;width:${percent}%;background:currentColor"></div></div></div>`;
    }
    els.crosshair.style.display = 'none';
    els.weapon.style.display = 'none';
  } else {
    els.speed.style.display = 'none';
    els.crosshair.style.display = world.aiming ? 'block' : 'none';
    els.weapon.style.display = 'block';
    els.weapon.textContent = world.weaponName || '';
  }

  // live key indicator — lights up when the game receives the key
  els.kw.classList.toggle('on', !!keys['KeyW']);
  els.ka.classList.toggle('on', !!keys['KeyA']);
  els.ks.classList.toggle('on', !!keys['KeyS']);
  els.kd.classList.toggle('on', !!keys['KeyD']);

  // mission panel
  const m = world.mission;
  if (m && m.active) {
    els.mission.style.display = 'block';
    els.mtitle.textContent = m.title;
    els.mtext.textContent = m.text;
    const secs = Math.max(0, Math.ceil(m.timeLeft));
    els.mtimer.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    els.mtimer.style.color = m.timeLeft < 12 ? '#ff5a4a' : '#fff';
  } else {
    els.mission.style.display = 'none';
  }

  // NPC speech bubbles (screen coords projected by main)
  for (let i = 0; i < els.barks.length; i++) {
    const div = els.barks[i];
    const b = world.barks && world.barks[i];
    if (!b || b.sy < 0) { div.style.display = 'none'; continue; }
    div.textContent = b.text;
    div.style.left = b.sx + 'px';
    div.style.top = b.sy + 'px';
    div.style.opacity = Math.min(1, b.t).toFixed(2);
    div.style.display = 'block';
  }

  // level + rep + style readout, with the daily challenge underneath
  let line = (world.prestige > 0 ? `<span style="color:#ffe27a">★${world.prestige}</span> · ` : '') +
    `LVL ${world.level || 1}`;
  if (world.mayor?.elected) line += ' · 🏛';
  if (world.repTier && world.repTier !== 'NOBODY') line += ` · ${world.repTier}`;
  if (world.style > 5) line += ` · STYLE ${Math.round(world.style)}`;
  if (world.chaos > 10) line += ` · CHAOS ${Math.round(world.chaos)}`;
  let sub = '';
  if (world.daily && !world.dailyDone) {
    const got = Math.min(Math.floor(world.counters?.[world.daily.stat] || 0), world.daily.goal);
    sub = `DAILY: ${world.daily.text} (${got}/${world.daily.goal})`;
  }
  els.level.innerHTML = line +
    (sub ? `<br><span style="font-size:9.5px;color:#ffb648;letter-spacing:.18em">${sub}</span>` : '');

  // hurt flash + low health pulse
  let dmg = world.damageFlash || 0;
  if (hp > 0 && hp < 30) dmg = Math.max(dmg, world.settings?.reduceMotion ? 0.18 : 0.22 + Math.sin(world.time * 6) * 0.1);
  els.damage.style.opacity = Math.min(1, dmg).toFixed(2);

  drawMinimap(world);
}

// Rotate world coordinates, never the canvas: map symbols stay upright.
export function createMinimapProjection({ size, x, z, heading = 0, range = 240, northUp = false }) {
  const span = Number.isFinite(range) ? Math.max(100, Math.min(600, range)) : 240;
  const rotation = northUp ? 0 : heading - Math.PI;
  const cosine = Math.cos(rotation), sine = Math.sin(rotation), scale = size / span;
  const project = (wx, wz) => {
    const dx = (wx - x) * scale, dz = (wz - z) * scale;
    return [size / 2 + dx * cosine - dz * sine, size / 2 + dx * sine + dz * cosine];
  };
  const edge = (wx, wz, margin = 10) => {
    const [px, py] = project(wx, wz);
    const dx = px - size / 2, dy = py - size / 2;
    const factor = Math.min(1, (size / 2 - margin) / Math.max(Math.abs(dx), Math.abs(dy), 1));
    return [size / 2 + dx * factor, size / 2 + dy * factor];
  };
  return { project, edge, rotation, scale, range: span };
}

function drawMinimap(world) {
  const c = els.minimap;
  const g = mapCtx;
  const size = c.width;
  const p = world.player.inCar || world.player.inHeli || world.player.inBoat || world.player.inPlane || world.player;
  const h = Number.isFinite(p.heading) ? p.heading : world.player.heading || 0;
  const reduced = !!world.settings?.reduceMotion;
  const projection = createMinimapProjection({ size, x: p.pos.x, z: p.pos.z, heading: h,
    range: world.settings?.minimapRange || 240, northUp: reduced || !!world.settings?.minimapNorthUp });
  const sc = projection.scale;
  const toMap = projection.project;
  const mapTime = reduced ? 0 : performance.now();
  const polygon = rect => {
    const points = [[rect.x0, rect.z0], [rect.x1, rect.z0], [rect.x1, rect.z1], [rect.x0, rect.z1]].map(([x,z]) => toMap(x,z));
    g.beginPath(); points.forEach(([x,z],i) => i ? g.lineTo(x,z) : g.moveTo(x,z)); g.closePath(); g.fill();
  };

  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#0a141d';
  g.fillRect(0, 0, size, size);

  // Roads follow the same world projection as objectives and district polygons.
  g.strokeStyle = '#26414f';
  g.lineWidth = Math.max(2, 16 * sc);
  const road = (x0,z0,x1,z1) => {
    const [ax,ay] = toMap(x0,z0), [bx,by] = toMap(x1,z1);
    g.beginPath(); g.moveTo(ax,ay); g.lineTo(bx,by); g.stroke();
  };
  for (const rx of world.city.roadXs) road(rx, -HALF - 15, rx, HALF + 15);
  for (const rz of world.city.roadZs) road(-HALF - 15, rz, HALF + 15, rz);

  // empire district tints: green = yours, red = rival, flashing = under attack
  if (world.empire) {
    for (const z of world.empire.zones) {
      const raided = world.empire.raid?.zone === z && Math.floor(mapTime * 0.004) % 2 === 0;
      g.fillStyle = raided ? 'rgba(255,90,74,0.5)' : z.owned ? 'rgba(47,175,78,0.22)' : 'rgba(160,32,32,0.18)';
      polygon(z.rect);
    }
  }

  // gang turf tint
  if (world.gang) {
    const z = world.gang.zone;
    g.fillStyle = world.gang.owned ? 'rgba(47,175,78,0.25)' : 'rgba(192,48,48,0.3)';
    polygon(z);
  }

  drawMapMarkers(g,world,toMap,{size:14,filter:false});

  // player arrow
  const [mx, mz] = toMap(p.pos.x, p.pos.z);
  g.save();
  g.translate(mx, mz);
  g.rotate(Math.PI - h + projection.rotation);
  // sight cone ahead of the player, then the arrowhead
  g.fillStyle = 'rgba(85,230,255,0.16)';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(11, -20);
  g.lineTo(-11, -20);
  g.closePath();
  g.fill();
  g.fillStyle = '#55e6ff';
  g.beginPath();
  g.moveTo(0, -6);
  g.lineTo(4.5, 5);
  g.lineTo(-4.5, 5);
  g.closePath();
  g.fill();
  g.restore();

  // North indicator and range remain readable at every heading.
  const [nx, ny] = projection.edge(p.pos.x, p.pos.z - 10000, 15);
  g.save(); g.font = 'bold 10px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#071016'; g.fillRect(nx - 7, ny - 7, 14, 14);
  g.fillStyle = '#f4eee3'; g.fillText('N', nx, ny);
  g.font = '9px Arial'; g.textAlign = 'right'; g.fillText(Math.round(projection.range) + ' m', size - 6, size - 7);
  g.restore();
}
