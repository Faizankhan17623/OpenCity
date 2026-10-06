// Internal 3D resolution is independent of graphics detail and CSS/HUD size.
// Dimensions below are physical pixels. DPR is applied once, in this module.
const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;

export function resolutionPolicy(policy = {}) {
  const values = (Array.isArray(policy.resolutionHeights) ? policy.resolutionHeights : [720, 900, 1080])
    .filter(value => Number.isInteger(value) && value >= 360 && value <= 4320);
  const heights = [...new Set(values.length ? values : [720])].sort((a, b) => a - b);
  const defaultHeight = heights.includes(policy.defaultRenderHeight) ? policy.defaultRenderHeight : heights[0];
  return { heights, defaultHeight, maxPixels: positive(policy.maxRenderPixels, Math.ceil(heights.at(-1) ** 2 * 16 / 9)) };
}

export function computeRenderSize({ width, height, dpr = 1, policy = {}, settings = {}, scale = 1 } = {}) {
  const viewportWidth = positive(width, 1);
  const viewportHeight = positive(height, 1);
  const deviceDpr = positive(dpr, 1);
  const limits = resolutionPolicy(policy);
  const requested = positive(Number(settings.renderHeight), limits.defaultHeight);
  const selectedHeight = limits.heights.filter(value => value <= requested).at(-1) || limits.heights[0];
  const nativeWidth = viewportWidth * deviceDpr;
  const nativeHeight = viewportHeight * deviceDpr;
  // Each preset is a 16:9 reference budget, including on ultrawide displays.
  const budget = Math.min(limits.maxPixels, selectedHeight ** 2 * 16 / 9);
  const adaptiveScale = settings.autoResolution ? Math.max(0.5, Math.min(1, positive(scale, 1))) : 1;
  const ratio = Math.min(1, selectedHeight / nativeHeight, Math.sqrt(budget / (nativeWidth * nativeHeight))) * adaptiveScale;
  return {
    width: Math.max(1, Math.floor(nativeWidth * ratio)),
    height: Math.max(1, Math.floor(nativeHeight * ratio)),
    viewportWidth, viewportHeight, deviceDpr, selectedHeight, scale: adaptiveScale,
    autoResolution: !!settings.autoResolution,
    nativeWidth: Math.round(nativeWidth), nativeHeight: Math.round(nativeHeight),
    pixelBudget: budget, pixelRatio: 1,
  };
}

export function createRenderResolution({ renderer, camera, post, policy = {}, settings = {}, getViewport }) {
  const viewport = getViewport || (() => ({ width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 }));
  const currentSettings = () => (typeof settings === 'function' ? settings() : settings) || {};
  let scale = 1;
  let state = null;
  let elapsed = 0;
  let frames = 0;
  let fastSeconds = 0;
  let initialized = false;

  function resize() {
    const next = computeRenderSize({ ...viewport(), policy, settings: currentSettings(), scale });
    const bufferChanged = !state || next.width !== state.width || next.height !== state.height;
    const viewportChanged = !state || next.viewportWidth !== state.viewportWidth || next.viewportHeight !== state.viewportHeight;
    if (!initialized) {
      renderer.setPixelRatio(1);
      post?.setPixelRatio?.(1);
      initialized = true;
    }
    if (bufferChanged) {
      renderer.setSize(next.width, next.height, false);
      post?.setSize?.(next.width, next.height);
    }
    if (viewportChanged) {
      camera.aspect = next.viewportWidth / next.viewportHeight;
      camera.updateProjectionMatrix();
      renderer.domElement.style.width = `${next.viewportWidth}px`;
      renderer.domElement.style.height = `${next.viewportHeight}px`;
    }
    state = next;
    return { ...state };
  }

  function applySettings() {
    scale = 1;
    elapsed = frames = fastSeconds = 0;
    return resize();
  }

  // Supply actual active frame time, not the simulation's clamped dt. A long
  // pause/loading frame is excluded. Recovery requires ten stable seconds.
  function sample(frameSeconds, active = true) {
    if (!active || !currentSettings().autoResolution || !Number.isFinite(frameSeconds) || frameSeconds <= 0 || frameSeconds > 0.25) {
      elapsed = frames = fastSeconds = 0;
      return false;
    }
    elapsed += frameSeconds;
    frames += 1;
    if (elapsed < 2 || frames < 30) return false;
    const mean = elapsed / frames;
    const previous = scale;
    if (mean > 1 / 45) {
      scale = Math.max(0.5, Math.round(scale * 0.85 * 100) / 100);
      fastSeconds = 0;
    } else if (mean < 1 / 57) {
      fastSeconds += elapsed;
      if (fastSeconds >= 10) { scale = Math.min(1, Math.round((scale + 0.05) * 100) / 100); fastSeconds = 0; }
    } else fastSeconds = 0;
    elapsed = frames = 0;
    if (scale === previous) return false;
    resize();
    return true;
  }

  return { resize, applySettings, sample, snapshot: () => state ? { ...state } : resize() };
}
