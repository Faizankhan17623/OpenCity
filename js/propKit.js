import * as THREE from 'three';

// Small storefront kit for the activity buildings: a plinth, walls, a door,
// a lit window, an awning, roof trim and an illuminated name sign that reads
// from the street. The shop turns to face its nearest road, so the sign and
// door are what the player sees walking or driving up. Signs are canvas
// textures, so this needs no image files.

const signCache = new Map();

export function signTexture(text, { fg = '#ffffff', bg = '#14212b', accent = '#55e6ff' } = {}) {
  const key = [text, fg, bg, accent].join('|');
  if (signCache.has(key)) return signCache.get(key);
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = accent;
  g.lineWidth = 8;
  g.strokeRect(6, 6, c.width - 12, c.height - 12);
  // largest bold size that fits the board
  let size = 78;
  g.font = `900 ${size}px Arial, sans-serif`;
  while (size > 28 && g.measureText(text).width > c.width - 56) { size -= 4; g.font = `900 ${size}px Arial, sans-serif`; }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = accent;
  g.shadowBlur = 14;
  g.fillStyle = fg;
  g.fillText(text, c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  signCache.set(key, tex);
  return tex;
}

// Rotation that turns local +z (the shopfront) toward the nearest road.
export function faceNearestRoad(city, pos) {
  let best = Infinity, yaw = 0;
  for (const rx of city.roadXs || []) {
    const d = Math.abs(rx - pos.x);
    if (d < best) { best = d; yaw = rx > pos.x ? Math.PI / 2 : -Math.PI / 2; }
  }
  for (const rz of city.roadZs || []) {
    const d = Math.abs(rz - pos.z);
    if (d < best) { best = d; yaw = rz > pos.z ? 0 : Math.PI; }
  }
  return yaw;
}

const shared = {
  plinth: new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.9 }),
  door: new THREE.MeshStandardMaterial({ color: 0x1a2630, roughness: 0.3, metalness: 0.4 }),
  window: new THREE.MeshStandardMaterial({ color: 0x3a3020, emissive: 0xffc070, emissiveIntensity: 0.55, roughness: 0.25 }),
  frame: new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.7 }),
};

/**
 * Build a storefront at pos (ground level) and add it to the scene.
 * opts: name (sign text), w/h/d (metres), wall, accent (hex numbers),
 * sign: { fg, bg, accent } (CSS colours), roofSign (bool, default true).
 * Returns { group, w, h, d } so callers can hang extras on the facade.
 */
export function storefront(scene, city, pos, opts = {}) {
  const { name = 'SHOP', w = 2.8, h = 2.7, d = 2.3, wall = 0x5a6470, accent = 0x2f7fa0, sign = {}, roofSign = true } = opts;
  const group = new THREE.Group();
  const accentMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6 });
  const wallMat = new THREE.MeshStandardMaterial({ color: wall, roughness: 0.85 });
  const add = (geo, mat, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const front = d / 2;

  add(new THREE.BoxGeometry(w + 0.24, 0.2, d + 0.24), shared.plinth, 0, 0.1, 0);
  add(new THREE.BoxGeometry(w, h, d), wallMat, 0, h / 2 + 0.1, 0);
  add(new THREE.BoxGeometry(w + 0.28, 0.2, d + 0.28), accentMat, 0, h + 0.2, 0);            // roof cornice
  add(new THREE.BoxGeometry(0.86, 1.8, 0.08), shared.door, -w * 0.24, 1.0, front + 0.03);    // door
  add(new THREE.BoxGeometry(0.98, 1.9, 0.05), shared.frame, -w * 0.24, 1.02, front + 0.01);  // door frame
  add(new THREE.BoxGeometry(w * 0.36, 0.95, 0.06), shared.window, w * 0.2, 1.3, front + 0.03);
  add(new THREE.BoxGeometry(w * 0.36 + 0.12, 1.07, 0.04), shared.frame, w * 0.2, 1.3, front + 0.01);
  add(new THREE.BoxGeometry(w + 0.1, 0.06, 0.85), accentMat, 0, 2.08, front + 0.4, 0.28);   // awning

  // facade sign above the awning, and a taller roof sign readable from the road
  const tex = signTexture(name, sign);
  const signMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const fh = w * 0.92 / 4;
  const facade = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, fh), signMat);
  facade.position.set(0, h + 0.06 - fh / 2, front + 0.05); // top tucked just under the cornice
  group.add(facade);
  if (roofSign) {
    const sw = w * 1.05, sh = sw / 4;
    for (const side of [1, -1]) {
      const board = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), signMat);
      board.position.set(0, h + 0.35 + sh / 2, side * 0.03);
      board.rotation.y = side > 0 ? 0 : Math.PI;
      group.add(board);
    }
    for (const x of [-sw * 0.35, sw * 0.35]) add(new THREE.BoxGeometry(0.06, 0.4, 0.06), shared.plinth, x, h + 0.35, 0);
  }

  group.position.set(pos.x, 0, pos.z);
  group.rotation.y = faceNearestRoad(city, pos);
  scene.add(group);
  return { group, w, h, d };
}
