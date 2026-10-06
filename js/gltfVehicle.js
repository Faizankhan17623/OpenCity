import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { runtime } from './runtime.js';

const assetPromises = new Map();
const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/');
const loader = new GLTFLoader().setDRACOLoader(draco);
// r170 does not bind KHR_animation_pointer. Patrol lights use the authored
// material names below; omit unsupported channels before GLTFLoader binds clips.
loader.register(parser => ({ name: 'OpenCityMaterialAnimationFallback', beforeRoot() {
  if (!parser.json.animations) return;
  parser.json.animations = parser.json.animations.map(clip => ({ ...clip,
    channels: clip.channels.filter(channel => channel.target?.path !== 'pointer')
  })).filter(clip => clip.channels.length);
} }));
function loadAsset(url) {
  if (!assetPromises.has(url)) assetPromises.set(url, loader.loadAsync(url).catch(error => {
    assetPromises.delete(url); throw error;
  }));
  return assetPromises.get(url);
}
function attachLod(root, distances = [0, 55, 110]) {
  const levels = ['LOD1','LOD2','LOD3'].map(name => root.getObjectByName(name));
  if (!levels.every(Boolean) || !levels.every(node => node.parent === levels[0].parent)) return null;
  const parent = levels[0].parent, lod = new THREE.LOD(); parent.add(lod);
  levels.forEach((node, index) => lod.addLevel(node, distances[index]));
  levels[1].visible = levels[2].visible = false;
  return lod;
}

export function attachVehicleAsset(v) {
  const vehicleDefinition = runtime.vehicle(v.modelId);
  const definition = vehicleDefinition?.asset;
  if (!definition) { v.assetReady = Promise.resolve(false); return; }
  const fallback = [...v.mesh.children];
  v.assetReady = loadAsset(definition.url).then(gltf => {
    if (v.dead) return false;
    const root = gltf.scene.clone(true);
    const materials = new Map();
    root.traverse(o => {
      if (o.isLight) { o.intensity = 0; o.visible = false; } // shared gameplay spotlight supplies beams
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const clone = m => {
        if (!materials.has(m)) materials.set(m, m.clone());
        return materials.get(m);
      };
      o.material = Array.isArray(o.material) ? o.material.map(clone) : clone(o.material);
    });
    const wheels = definition.wheels.map(n => root.getObjectByName(n));
    if (wheels.some(w => !w)) throw new Error('Vehicle wheel pivots missing');
    wheels.forEach(w => { w.rotation.order = 'YXZ'; });
    const panels = {};
    for (const [name, { node: nodeName, axis, angle }] of Object.entries(definition.panels || {})) {
      const node = root.getObjectByName(nodeName);
      if (!node) throw new Error('Vehicle mechanism missing: ' + nodeName);
      panels[name] = { node, axis, angle, closedAngle: node.rotation[axis], open: false };
    }
    const steering = definition.steering ? root.getObjectByName(definition.steering) : null;
    if (definition.steering && !steering) throw new Error('Vehicle steering pivot missing');
    const lean = definition.lean ? root.getObjectByName(definition.lean) : null;
    if (definition.lean && !lean) throw new Error('Vehicle lean root missing');
    // Blender visibility flags are not glTF visibility. Select one LOD and keep
    // authored failure meshes hidden until the matching mechanical fault occurs.
    const lod = attachLod(root);
    const damage = [];
    root.traverse(node => {
      if (!/^Damage_(Engine|Chassis|Susp|Tyre_[A-Z]+)$/.test(node.name)) return;
      node.visible = false;
      const key = node.name.startsWith('Damage_Tyre_') ? 'tyres' : {Damage_Engine:'engine',Damage_Chassis:'chassis',Damage_Susp:'suspension'}[node.name];
      const wheel = key === 'tyres' ? root.getObjectByName(node.name.replace('Damage_Tyre_', 'Wheel_')) : null;
      const normalTyres = [];
      wheel?.traverse(mesh => { if (mesh.isMesh && [mesh.material].flat().some(m => /Rubber|Tire|Tyre/i.test(m?.name || ''))) normalTyres.push(mesh); });
      damage.push({ node, key, normalTyres, wheel, restYaw: node.rotation.y, wheelRestYaw: wheel?.rotation.y || 0 });
    });
    // Earlier sedan/hatch exports do not include failure variants. Reuse their
    // rubber geometry for a flattened, non-spinning tyre around the exposed rim.
    // No authored geometry is modified, and repair restores the normal wheel.
    if (!damage.some(part => part.key === 'tyres')) {
      for (const wheel of wheels) {
        const normalTyres = [];
        wheel.traverse(node => { if (node.isMesh && [node.material].flat().some(m => /Rubber|Tire|Tyre/i.test(m?.name || ''))) normalTyres.push(node); });
        if (!normalTyres.length) continue;
        const flat = wheel.clone(true); flat.name = 'Runtime_Flat_' + wheel.name;
        flat.traverse(node => { if (node.isMesh) node.visible = [node.material].flat().some(m => /Rubber|Tire|Tyre/i.test(m?.name || '')); });
        flat.scale.y *= .6; flat.position.y -= (definition.wheelRadius || .36) * .4;
        flat.visible = false; wheel.parent.add(flat);
        damage.push({node:flat,key:'tyres',normalTyres,wheel,restYaw:flat.rotation.y,wheelRestYaw:wheel.rotation.y});
      }
    }
    const fallbackEngine = !damage.some(part => part.key === 'engine');
    const engineMaterials = fallbackEngine ? [...materials.values()].filter(m => /Engine/.test(m.name)).map(material => ({material,color:material.color.clone(),roughness:material.roughness,metalness:material.metalness})) : [];
    const fallbackChassis = damage.some(part => part.key === 'chassis') ? [] : Object.entries(panels).filter(([name]) => name.startsWith('Door_')).map(([,panel]) => ({node:panel.node,rest:panel.node.position.clone()}));
    fallback.forEach(o => { o.visible = false; });
    v.mesh.userData.modelDetail = null;
    v.mesh.add(root);
    v.wheels = wheels;
    v.asset = { root, panels, materials: [...materials.values()], clips: gltf.animations,
      materialRoles: definition.materials || {}, steering, lean, lod, damage,
      flashSeconds: 0, emergencyLights: definition.emergencyLights || null, fallbackEngine,engineMaterials,fallbackChassis,
      steeringRestYaw: steering?.rotation.y || 0, leanRestRoll: lean?.rotation.z || 0,
      wheelRestYaw: wheels.map(w => w.rotation.y),
      wheelRadius: definition.wheelRadius || .36, restY: root.position.y, restRoll: root.rotation.z };
    if (vehicleDefinition.componentSlots) v.componentSlots = [...vehicleDefinition.componentSlots];
    v.headlightsOn = true;
    for (const m of v.asset.materials) {
      if (m.name === v.asset.materialRoles.paint && v.paintColor && !v.police) m.color.set(v.paintColor);
    }
    return true;
  }).catch(error => {
    v.assetError = error.message;
    console.warn('Vehicle asset unavailable; using procedural fallback:', error.message);
    return false;
  });
}

export function setVehiclePanel(v, name, open) {
  const panel = v?.asset?.panels[name];
  if (panel) panel.open = !!open;
}

export function updateVehicleAsset(v, dt, driving = false, braking = false) {
  if (!v.asset) return;
  for (const [name, p] of Object.entries(v.asset.panels)) {
    if (name === 'Fuel_Flap') p.open = !!v.refuelling;
    else if (name === 'Stand' && (driving || v.vel.lengthSq() > .25)) p.open = true;
    else if (v.vel.lengthSq() > 4) p.open = false;
    const engineGap = name === 'Hood' && v.asset.fallbackEngine && (v.components?.engine ?? 100) <= 15;
    const target = p.closedAngle + (!v.dead ? p.open ? p.angle : engineGap ? p.angle * .3 : 0 : 0);
    p.node.rotation[p.axis] = THREE.MathUtils.damp(p.node.rotation[p.axis], target, 9, dt);
  }
  for (const {node,key,normalTyres,wheel,restYaw,wheelRestYaw} of v.asset.damage) {
    const failed = v.dead || (v.components?.[key] ?? 100) <= 15;
    node.visible = failed;
    if (wheel && !v.asset.steering) node.rotation.y = restYaw + wheel.rotation.y - wheelRestYaw;
    for (const mesh of normalTyres) mesh.visible = !failed;
  }
  const engineFailed = v.dead || (v.components?.engine ?? 100) <= 15;
  for (const {material,color,roughness,metalness} of v.asset.engineMaterials) {
    material.color.copy(color); if (engineFailed) material.color.multiplyScalar(.3);
    material.roughness = engineFailed ? .98 : roughness;
    material.metalness = engineFailed ? .05 : metalness;
  }
  const chassisFailed = v.dead || (v.components?.chassis ?? 100) <= 15;
  for (const {node,rest} of v.asset.fallbackChassis) {
    node.position.copy(rest);
    if (chassisFailed) { node.position.y -= .1; node.position.x += Math.sign(rest.x) * .08; }
  }
  const suspension = v.asset.damage.find(d => d.key === 'suspension' && d.node.visible);
  v.asset.root.position.y = v.asset.restY - (suspension?.node.userData.drop_m || 0);
  v.asset.root.rotation.z = v.asset.restRoll + (suspension?.node.userData.lean_rad || 0);
  v.asset.flashSeconds = (v.asset.flashSeconds + dt) % .5;
  const activeFlash = !v.dead && v.emergencyLightsOn !== false;
  for (const m of v.asset.materials) {
    if (v.asset.emergencyLights?.includes(m.name)) {
      const phase = v.asset.emergencyLights.indexOf(m.name) === 0;
      m.emissiveIntensity = activeFlash && ((v.asset.flashSeconds < .25) === phase) ? 5 : .05;
    }
    if (m.name === v.asset.materialRoles.headlight) m.emissiveIntensity = !v.dead && v.headlightsOn ? 3 : 0;
    if (m.name === v.asset.materialRoles.tail) m.emissiveIntensity = v.dead ? 0 : driving && braking ? 3 : v.headlightsOn ? .5 : 0;
  }
}

export function vehicleControls(v, pressed) {
  if (!v.asset) return;
  if (pressed.Equal) v.headlightsOn = !v.headlightsOn;
  if (v.vel.lengthSq() > 1) return;
  if (pressed.BracketLeft) {
    const firstDoor = ['Door_FL', 'Door_FR', 'Door_RL', 'Door_RR'].find(n => v.asset.panels[n]);
    const open = firstDoor ? !v.asset.panels[firstDoor].open : false;
    for (const n of ['Door_FL', 'Door_FR', 'Door_RL', 'Door_RR']) setVehiclePanel(v, n, open);
  }
  const upper = v.bike ? 'Seat' : 'Hood', rear = v.bike ? 'Stand' : 'Trunk';
  if (pressed.BracketRight) setVehiclePanel(v, upper, !v.asset.panels[upper]?.open);
  if (pressed.Backslash) setVehiclePanel(v, rear, !v.asset.panels[rear]?.open);
}

// Only advertise mechanisms actually present on this vehicle.
export function vehicleControlHint(v) {
  if (!v?.asset) return '';
  const p = v.asset.panels, hints = ['= lights'];
  if (p.Door_FL || p.Door_FR) hints.push('[ doors');
  if (p.Hood) hints.push('] hood'); else if (p.Seat) hints.push('] seat');
  if (p.Trunk) hints.push('\\ trunk'); else if (p.Stand) hints.push('\\ stand');
  return hints.join(' · ');
}


// The police aircraft uses the same cached Draco loader, with its own rotor and
// damage contract. The procedural aircraft remains usable while loading.
export function attachHelicopterAsset(h) {
  const definition = h.police && runtime.profile.policeHelicopterAsset;
  if (!definition) { h.assetReady = Promise.resolve(false); return; }
  const fallback = [...h.mesh.children];
  h.assetReady = loadAsset(definition.url).then(gltf => {
    if (h.dead || !h.mesh.parent) return false;
    const root = gltf.scene.clone(true), materialMap = new Map(), searchlights = [];
    root.traverse(node => {
      if (node.isLight) {
        searchlights.push({node,intensity:node.intensity}); node.visible = false; node.intensity = 0;
        // Object3D.clone creates a detached SpotLight.target. glTF lights face -Z;
        // reconnect that target so rotating/moving the aircraft also aims its beam.
        if (node.isSpotLight) { node.target = new THREE.Object3D(); node.target.position.z = -1; node.add(node.target); }
      }
      if (!node.isMesh) return;
      node.castShadow = node.receiveShadow = true;
      node.material = [node.material].flat().map(material => {
        if (!materialMap.has(material)) materialMap.set(material, material.clone());
        return materialMap.get(material);
      });
      if (node.material.length === 1) node.material = node.material[0];
    });
    const mainRotor = root.getObjectByName(definition.mainRotor);
    const tailRotor = root.getObjectByName(definition.tailRotor);
    const authored = root.getObjectByName(definition.root);
    if (!mainRotor || !tailRotor || !authored) throw Error('Police helicopter rotor contract missing');
    const parse = (value, fallbackValue) => { try { return typeof value === 'string' ? JSON.parse(value) : value || fallbackValue; } catch { return fallbackValue; } };
    const states = parse(authored.userData.damage_states, {});
    if (!states.Clean || !states.Failing) throw Error('Police helicopter damage table missing');
    const blur = parse(authored.userData.rotor_blur, { blend_rpm: [60,150], operating_rpm:390 });
    const materials = [...materialMap.values()];
    const sharpMaterials = materials.filter(m => m.name === 'OC_Rotor_Blade');
    const blurMaterials = materials.filter(m => m.name === 'OC_Rotor_Blur');
    const blurOpacity = blurMaterials.map(m => m.opacity);
    for (const m of [...sharpMaterials,...blurMaterials]) { m.transparent = true; m.depthWrite = false; }
    // Detailed airframe keeps silhouette-changing damage readable from the ground.
    const lod = attachLod(root, [0,220,350]);
    for (const name of ['LOD2_OC_Rotor_Blur','LOD3_OC_Rotor_Blur']) {
      const node = root.getObjectByName(name); if (node) node.visible = false;
    }
    const controlledNames = new Set(Object.values(states).flatMap(state => [...(state.show || []),...(state.hide || [])]));
    const damageNodes = [...controlledNames].map(name => ({node:root.getObjectByName(name),normallyVisible:!name.startsWith('Damage_')}));
    const panels = ['Door_L','Door_R'].map((name,i) => ({node:root.getObjectByName(name),angle:i ? -1.08 : 1.08}));
    h.asset = {root,lod,materials,states,damageNodes,blur,blurOpacity,sharpMaterials,blurMaterials,panels,searchlights,
      mainRest:mainRotor.rotation.clone(),tailRest:tailRotor.rotation.clone(),elapsed:0,damageState:'Clean',smokeSockets:[]};
    fallback.forEach(node => {node.visible = false;});
    h.mesh.add(root); h.mainRotor = mainRotor; h.tailRotor = tailRotor;
    h.bladeMat = null; h.blurDisc = null;
    h.searchlightOn = true; h.doorsOpen = false;
    updateHelicopterAsset(h,0);
    return true;
  }).catch(error => {
    h.assetError = error.message;
    console.warn('Helicopter asset unavailable; using procedural fallback:',error.message);
    return false;
  });
}

export function updateHelicopterAsset(h,dt) {
  const asset = h.asset; if (!asset) return;
  asset.elapsed += dt;
  const ratio = Math.max(0,Math.min(100,h.health / (h.maxHealth || 70) * 100));
  const stateName = ratio >= 70 ? 'Clean' : ratio >= 40 ? 'Scarred' : ratio >= 15 ? 'Smoking' : 'Failing';
  const state = asset.states[stateName]; asset.damageState = stateName;
  for (const {node,normallyVisible} of asset.damageNodes) {
    if (node) node.visible = (state.show || []).includes(node.name) || (normallyVisible && !(state.hide || []).includes(node.name));
  }
  asset.smokeSockets = (state.emitters || []).map(name => asset.root.getObjectByName(name)).filter(Boolean);
  const rpm = Math.max(0,h.rotorSpeed) * (asset.blur.operating_rpm || 390);
  const [low,high] = asset.blur.blend_rpm || [60,150];
  const blend = THREE.MathUtils.clamp((rpm - low) / (high - low),0,1);
  for (const material of asset.sharpMaterials) material.opacity = 1-blend;
  asset.blurMaterials.forEach((material,index) => { material.opacity = asset.blurOpacity[index] * blend; });
  const wobble = THREE.MathUtils.degToRad(state.rotor_wobble_deg || 0);
  h.mainRotor.rotation.x = asset.mainRest.x + Math.sin(asset.elapsed * 23) * wobble;
  h.mainRotor.rotation.z = asset.mainRest.z + Math.cos(asset.elapsed * 19) * wobble;
  const lightsOn = !h.dead && h.searchlightOn !== false && state.searchlight_on !== 0;
  for (const light of asset.searchlights) { light.node.visible = lightsOn; light.node.intensity = lightsOn ? light.intensity : 0; }
  for (const material of asset.materials) if (material.name === 'OC_Searchlight_Emission') material.emissiveIntensity = lightsOn ? 3 : 0;
  for (const panel of asset.panels) if(panel.node) panel.node.rotation.y = THREE.MathUtils.damp(panel.node.rotation.y,h.doorsOpen ? panel.angle : 0,9,dt);
}

export function helicopterControls(h,pressed) {
  if (!h?.asset) return;
  if (pressed.Equal) h.searchlightOn = !h.searchlightOn;
  if (pressed.BracketLeft && h.vel.lengthSq() < 1) h.doorsOpen = !h.doorsOpen;
}
