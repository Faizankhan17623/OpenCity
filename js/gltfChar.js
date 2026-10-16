import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

// A single skeleton/clip library is shared by Kai, contacts and police. Game
// physics owns movement; clip Root travel is removed for ordinary locomotion.
const libraryUrl = 'assets/characters/oc_humanoid_base_01.glb';
const weaponUrl = 'assets/props/oc_weapon_compact_01.glb';
const cache = new Map();
const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/');
const loader = new GLTFLoader().setDRACOLoader(draco);
const contacts = ['rosa','dara','celia','sal','tessa','rook','imani','leela','nora','dev','mercer'];
export const CHARACTER_ASSETS = Object.freeze(Object.fromEntries([
  ['kai', 'oc_kai_dena_01'], ['officer', 'oc_police_officer_01'],
  ...contacts.map(key => [key, 'oc_contact_' + key + '_01']),
].map(([key,id]) => [key, Object.freeze({id,url:'assets/characters/'+id+'.glb'})])));
const requiredBones = ['Root','Hips','Spine_01','Spine_02','Spine_03','Head','Arm_Upper_L','Arm_Upper_R','Arm_Lower_L','Arm_Lower_R','Leg_Upper_L','Leg_Upper_R','Attach_Hand_R','Attach_Hip'];
const upperBone = /^(Spine_|Neck|Head|Shoulder_|Arm_|Hand_|Fingers_|Thumb_|Attach_Hand_)/;
const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
function load(url) {
  if (!cache.has(url)) cache.set(url,loader.loadAsync(url).catch(error=>{cache.delete(url);throw error;}));
  return cache.get(url);
}
function metadata(root) {
  let result={}; root.traverse(node=>{ if (node.userData.asset_id) result={...result,...node.userData}; }); return result;
}
function cloneMaterials(root) {
  const mats=new Map();root.traverse(node=>{
    if(node.isLight){node.visible=false;node.intensity=0;}
    if(!node.isMesh)return;
    node.castShadow=true;node.receiveShadow=true;
    const one=m=>{if(!mats.has(m))mats.set(m,m.clone());return mats.get(m);};
    node.material=Array.isArray(node.material)?node.material.map(one):one(node.material);
  });return [...mats.values()];
}
// Blender exports frame 1 at 1/FPS. Shift the whole clip to zero so frame
// cues, loop lengths and the vehicle door timeline share the authored clock.
function zeroBased(clip) {
  const copy=clip.clone();
  const start=Math.min(...copy.tracks.map(track=>track.times[0]).filter(Number.isFinite));
  if(Number.isFinite(start)&&start>0)for(const track of copy.tracks)track.shift(-start);
  copy.resetDuration();return copy;
}
function inPlace(clip) {
  const copy=clip.clone();
  for(const track of copy.tracks){
    if(track.name==='Root.position')for(let i=0;i<track.values.length;i+=3){track.values[i]=track.values[0];track.values[i+2]=track.values[2];}
    if(track.name==='Root.quaternion')for(let i=4;i<track.values.length;i++)track.values[i]=track.values[i%4];
  }return copy;
}
function upperOnly(clip){const result=clip.clone();result.tracks=result.tracks.filter(t=>upperBone.test(t.name.split('.')[0]));return result;}
let sharedLibrary;
export function loadCharacterClips() {
  if(!sharedLibrary)sharedLibrary=load(libraryUrl).then(async gltf=>{
    const meta=metadata(gltf.scene);let events=meta.clip_events||{};
    if(typeof events==='string')events=JSON.parse(events);events=events.clips||events;
    const raw=new Map(),clips=new Map();
    // Let input/loading paint between batches instead of cloning all 42 clips
    // and their tracks in a single asset-completion microtask.
    for(let i=0;i<gltf.animations.length;i++){
      const c=gltf.animations[i],clip=zeroBased(c);raw.set(c.name,clip);clips.set(c.name,inPlace(clip));
      if(i%6===5)await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(raw.size!==42||!raw.has('idle')||!raw.has('weapon_aim'))throw Error('Shared humanoid must contain the 42 approved clips');
    const additives=new Map();
    for(const [name,reference] of [['car_steer_L','car_sit_idle'],['car_steer_R','car_sit_idle'],['bike_lean_L','bike_ride_idle'],['bike_lean_R','bike_ride_idle'],['weapon_aim','weapon_idle']]){
      const clip=clips.get(name).clone();THREE.AnimationUtils.makeClipAdditive(clip,0,clips.get(reference));additives.set(name,clip);
    }
    return {raw,clips,additives,events};
  }).catch(error=>{sharedLibrary=null;throw error;});
  return sharedLibrary;
}

export function attachCharacterAsset(ch,definition='kai',options={}) {
  const def=typeof definition==='string'?CHARACTER_ASSETS[definition]:definition;
  if(!ch?.group||!def?.url){ch.assetReady=Promise.resolve(false);return ch.assetReady;}
  if(ch.asset?.id===def.id)return Promise.resolve(true);
  const token={};ch._assetRequest=token;
  const fallback=ch.group.children.filter(child=>child!==ch.asset?.root);
  ch.assetReady=Promise.all([load(def.url),loadCharacterClips()]).then(([gltf,library])=>{
    if(ch._assetRequest!==token)return false;
    const root=cloneSkeleton(gltf.scene),nodes={};
    root.traverse(node=>{if(node.name)nodes[node.name]=node;});
    for(const name of requiredBones)if(!nodes[name]?.isBone)throw Error('Character skeleton missing '+name);
    const materials=cloneMaterials(root),meta=metadata(root);
    root.scale.multiplyScalar(Number(options.scale||meta.game_scale)||1);
    if(nodes.Officer_Body_A){nodes.Officer_Body_A.visible=options.body!=='B';nodes.Officer_Body_B.visible=options.body==='B';}
    if(options.skin)for(const m of materials)if(m.name==='OC_Officer_Skin')m.color.set(options.skin);
    const mixer=new THREE.AnimationMixer(root);
    const asset={id:def.id,root,nodes,materials,mixer,library,actions:new Map(),additiveActions:new Map(),fallback,
      current:null,desired:'idle',lastTime:performance.now(),managed:!!options.animationManaged,weapon:null,weaponRaised:false,pitch:0,recoil:0,
      rootPosition:nodes.Root.position.clone(),rootQuaternion:nodes.Root.quaternion.clone(),disposed:false};
    if(ch.asset)disposeCharacterAsset(ch);
    fallback.forEach(child=>{child.visible=false;});ch.group.add(root);ch.asset=asset;ch.assetError=null;
    if(ch.weapon)attachCharacterWeapon(ch,ch.weapon);
    playCharacterClip(ch,'idle',{fade:0});mixer.update(0);return true;
  }).catch(error=>{if(ch._assetRequest===token)ch.assetError=error.message;return false;});
  return ch.assetReady;
}
function actionFor(a,name,{upper=false,rootMotion=false,additive=false}={}){
  const key=name+(upper?':upper':'')+(rootMotion?':root':'')+(additive?':add':'');
  if(a.actions.has(key))return a.actions.get(key);
  let clip=(additive?a.library.additives:rootMotion?a.library.raw:a.library.clips).get(name);
  if(!clip)return null;if(upper)clip=upperOnly(clip);
  const action=a.mixer.clipAction(clip);a.actions.set(key,action);return action;
}
export function playCharacterClip(ch,name,{fade=.15,loop,rootMotion=false,restart=false,speed=1}={}){
  const a=ch?.asset;if(!a||!a.library.clips.has(name))return false;
  const action=actionFor(a,name,{rootMotion});
  if(a.current?.action===action&&!restart){action.setEffectiveTimeScale(speed);return true;}
  const previous=a.current?.action;
  action.reset().setEffectiveWeight(1).setEffectiveTimeScale(speed);
  const looping=loop??a.library.events[name]?.loop??false;
  action.setLoop(looping?THREE.LoopRepeat:THREE.LoopOnce,looping?Infinity:1);action.clampWhenFinished=!looping;
  action.play();if(previous&&fade>0)previous.crossFadeTo(action,fade,false);else if(previous&&previous!==action)previous.stop();
  a.current={name,action,rootMotion};a.desired=name;return true;
}
// Deterministic sampling for short authored interactions. The controller owns
// elapsed game time; AnimationMixer must not also advance these paused actions.
export function sampleCharacterClip(ch,name,time,{rootMotion=true,loop=false}={}){
  const a=ch?.asset;if(!a||a.disposed)return false;
  if(!playCharacterClip(ch,name,{fade:0,loop,rootMotion}))return false;
  const action=a.current.action;
  for(const other of a.actions.values())if(other!==action){other.enabled=false;other.setEffectiveWeight(0);}
  if(a.aimCorrection){a.nodes.Spine_03.quaternion.copy(a.aimCorrection);a.aimCorrection=null;}
  const duration=action.getClip().duration;
  action.enabled=true;action.paused=true;action.setEffectiveWeight(1);
  action.time=loop&&duration>0?Math.max(0,time)%duration:clamp(time,0,duration);
  a.mixer.update(0);return true;
}

function additive(a,name,weight){
  let action=a.additiveActions.get(name);
  if(!action&&weight<=0)return; // Do not bind unused driving/aim clips on every rig.
  if(!action){action=actionFor(a,name,{additive:true});if(!action)return;a.additiveActions.set(name,action);action.play();action.paused=true;action.time=0;}
  action.enabled=weight>0;action.setEffectiveWeight(weight);
}
export function requestCharacterAnimation(ch,name,{speed=1}={}){
  const a=ch?.asset;if(!a)return false;a.desired=name;a.desiredSpeed=speed;
  if(!a.managed){const now=performance.now(),dt=clamp((now-a.lastTime)/1000,0,.1);a.lastTime=now;updateCharacterAnimation(ch,dt,{action:name,speedScale:speed});}
  return true;
}
export function updateCharacterAnimation(ch,dt,state={}) {
  const a=ch?.asset;if(!a||a.disposed)return false;
  if(a.sequence)return true; // A timed sequence samples the mixer after ordinary movement.
  dt=clamp(Number(dt)||0,0,.1);
  a.animationElapsed=(a.animationElapsed||0)+dt;
  if(a.animationElapsed<(state.interval||0))return true;
  dt=Math.min(a.animationElapsed,.3);a.animationElapsed=0;
  const velocity=Math.max(0,Number(state.speed)||0),vehicle=state.vehicle;
  let name=state.action||a.desired||'idle';
  if(!state.action&&('speed'in state||'grounded'in state||'vehicle'in state||'refuelling'in state||'talking'in state)){
    if(state.refuelling)name='fuel_hold';
    else if(vehicle)name=vehicle.bike?'bike_ride_idle':'car_sit_idle';
    else if(state.grounded===false)name=state.verticalSpeed>1?'jump_start':'jump_air';
    else if(state.landing)name='jump_land';
    else if(velocity>5.5)name='sprint';else if(velocity>2)name='run';else if(velocity>.2)name='walk';else name='idle';
    if(state.talking&&velocity<.2&&!vehicle)name='talk_neutral';
  }
  const speed=state.speedScale||(velocity&&a.library.events[name]?.root_speed_mps?clamp(velocity/a.library.events[name].root_speed_mps,.55,2.2):a.desiredSpeed||1);
  playCharacterClip(ch,name,{speed});
  for(const key of ['car_steer_L','car_steer_R','bike_lean_L','bike_lean_R']){
    const turn=clamp(Number(state.steer??vehicle?.steer)||0,-1,1);
    const active=!!vehicle&&key.startsWith(vehicle.bike?'bike_':'car_');additive(a,key,active?Math.max(0,key.endsWith('_L')?turn:-turn):0);
  }
  const armed=!!ch.weapon&&!vehicle&&!state.refuelling&&a.weaponRaised;
  const upper=armed?actionFor(a,'weapon_idle',{upper:true}):a.actions.get('weapon_idle:upper');
  if(upper){upper.enabled=armed;if(armed)upper.setEffectiveWeight(1).play();}
  additive(a,'weapon_aim',armed&&a.weaponRaised?1:0);
  // Remove last frame's manual aim before the mixer writes a fresh pose.
  if(a.aimCorrection){a.nodes.Spine_03.quaternion.copy(a.aimCorrection);a.aimCorrection=null;}
  a.mixer.update(dt);
  if(armed&&a.weaponRaised){a.aimCorrection=a.nodes.Spine_03.quaternion.clone();a.nodes.Spine_03.rotateX(clamp(a.pitch,-1.2,1.2)-a.recoil*.08);}
  if(a.nodes.Kai_Bag&&Number.isFinite(state.arc))a.nodes.Kai_Bag.visible=state.arc<3;
  if(ch.weapon){
    const socket=armed?a.nodes.Attach_Hand_R:a.nodes.Attach_Hip;
    if(ch.weapon.group.parent!==socket){socket.add(ch.weapon.group);ch.weapon.group.position.set(0,0,0);ch.weapon.group.quaternion.copy(ch.weapon._gripRotation||new THREE.Quaternion());}
    ch.weapon.group.visible=!vehicle&&!state.refuelling;
  }
  a.lastTime=performance.now();return true;
}
export function poseCharacterWeapon(ch,raised,recoil=0,pitch=0){
  const a=ch?.asset;if(!a)return false;
  if(a.sequence)return true;
  a.weaponRaised=!!raised;a.recoil=Number(recoil)||0;a.pitch=Number(pitch)||0;
  if(ch.weapon){const socket=raised?a.nodes.Attach_Hand_R:a.nodes.Attach_Hip;if(ch.weapon.group.parent!==socket){socket.add(ch.weapon.group);ch.weapon.group.position.set(0,0,0);ch.weapon.group.quaternion.copy(ch.weapon._gripRotation||new THREE.Quaternion());}}
  return true;
}

export function attachCharacterWeapon(ch,weapon){
  const a=ch?.asset;if(!a||!weapon?.group)return false;
  const held=a.nodes.Attach_Hand_R;
  weapon.group.position.set(0,0,0);weapon.group.rotation.set(0,0,0);weapon.group.scale.set(1,1,1);held.add(weapon.group);
  if(weapon._characterAsset===a)return true;weapon._characterAsset=a;
  load(weaponUrl).then(gltf=>{
    if(ch.asset!==a||ch.weapon!==weapon)return;
    const model=gltf.scene.clone(true);cloneMaterials(model);
    if(weapon.index===0){
      const muzzle=model.getObjectByName('Muzzle');if(!muzzle)throw Error('Authored weapon Muzzle missing');
      for(const child of [...weapon.group.children])child.visible=false;
      weapon.group.add(model);if(weapon.flash){weapon.flash.removeFromParent();muzzle.add(weapon.flash);}
      weapon.muzzle=muzzle;weapon.authored=true;
    }else{
      // Legacy weapon silhouettes share +Z forward. The authored mount defines
      // the hand-grip basis; use that basis without replacing their silhouettes.
      const mount=model.getObjectByName('Weapon_Mount');if(mount){weapon.group.quaternion.copy(mount.quaternion);weapon._gripRotation=mount.quaternion.clone();}
    }
  }).catch(error=>{weapon.assetError=error.message;});return true;
}
export function applyCharacterAssetSuit(ch,suit){
  if(!ch?.asset)return;
  const roles={shirt:/OC_Kai_Shirt|OC_Char_Top/,pants:/OC_Kai_Trousers|OC_Char_Bottom/,skin:/OC_Kai_Skin|OC_Char_Skin/,hair:/OC_Kai_Hair|OC_Char_Hair/};
  for(const [key,pattern]of Object.entries(roles))if(suit[key])for(const material of ch.asset.materials)if(pattern.test(material.name))material.color.set(suit[key]);
}
export function disposeCharacterAsset(ch){
  const a=ch?.asset;if(!a)return;a.sequence?.cancel('asset-disposed');a.disposed=true;a.mixer.stopAllAction();a.mixer.uncacheRoot(a.root);a.root.removeFromParent();
  for(const material of a.materials)material.dispose();a.fallback.forEach(child=>{child.visible=true;});ch.asset=null;
}

export function placeCharacterInVehicle(ch,vehicle){
 if(!ch?.asset||!vehicle||vehicle.tank)return false;
 // Transforms must follow a moving vehicle every frame; seat setup is only
 // needed when changing vehicles. Never quantize the driver's position to 4 Hz.
 if(ch.asset.seatVehicle!==vehicle){ch.asset.seatVehicle=vehicle;ch.group.scale.set(1,1,1);}
 ch.group.position.copy(vehicle.pos);ch.group.quaternion.copy(vehicle.mesh.quaternion);ch.group.visible=true;
 return true;
}
