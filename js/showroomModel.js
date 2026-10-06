import * as THREE from 'three';
import { loadAsset } from './assetLoader.js';
import { createCarMesh, createBikeMesh } from './car.js';

// Public-safe geometry remains usable when a local model mount is unavailable.
export function createShowroom(world, position) {
  const group = new THREE.Group();
  group.name = 'Auto Palace'; group.position.copy(position); group.position.y += .25;
  world.scene.add(group);
  const fallback = new THREE.Group(); group.add(fallback);
  const stucco = new THREE.MeshLambertMaterial({color:0xd6c7a6});
  const mint = new THREE.MeshLambertMaterial({color:0x328579});
  const glazing = new THREE.MeshStandardMaterial({color:0x639fac,transparent:true,opacity:.24,roughness:.2});
  const box = (x,y,z,w,h,d,material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;fallback.add(mesh);
  };
  box(0,0,1,15,.08,15,mint); box(0,2.25,-4.88,13,4.5,.24,stucco);
  for (const x of [-6.38,6.38]) box(x,2.25,-1,.24,4.5,8,stucco);
  box(0,4.58,-1,13.5,.22,8.5,stucco);
  box(0,4.4,3.4,13.8,.15,.3,mint);box(0,5,2.7,5.6,.65,1,stucco);
  for (const x of [-4,4]) box(x,1.8,3.04,4.6,3.4,.035,glazing);
  // Low furniture/display bases are visual, not an invisible building-sized box.
  const car = createCarMesh('#c65735').group;
  car.position.set(-3.6,.24,-.4);car.rotation.y=.18;group.add(car);
  const bike = createBikeMesh('#d6b561').group;
  bike.position.set(3.6,.24,-.4);bike.rotation.y=-.35;group.add(bike);
  const p=position;
  const walls=[[-6.38,-1,.12,4],[6.38,-1,.12,4],[0,-4.88,6.5,.12],[-4,3.04,2.4,.08],[4,3.04,2.4,.08]];
  const colliders=walls.map(([x,z,rx,rz])=>({x0:p.x+x-rx,x1:p.x+x+rx,z0:p.z+z-rz,z1:p.z+z+rz,y0:0,y1:4.7,showroom:true}));
  world.city.colliders.push(...colliders);
  const state={group,fallback,car,bike,colliders,doors:[],loaded:false};world.showroom=state;
  state.displayReady=loadAsset('/assets/vehicles/oc_hatch_01.glb').then(gltf=>{
    const display=gltf.scene;
    display.position.copy(car.position);display.rotation.copy(car.rotation);
    display.traverse(o=>{if(o.isLight)o.visible=false;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    group.add(display);car.visible=false;state.displayCar=display;return true;
  }).catch(()=>false);
  state.assetReady=loadAsset('/assets/buildings/oc_showroom_01.glb').then(gltf=>{
    const root=gltf.scene;
    root.traverse(o=>{
      if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}
      if(/^Door_[LR](?:\.\d+)?$/.test(o.name)) state.doors.push({node:o,angle:o.name.startsWith('Door_L')?-1.4:1.4});
    });
    if(state.doors.length!==2)throw new Error('Showroom door pivots missing');
    group.add(root);fallback.visible=false;state.loaded=true;return true;
  }).catch(error=>{state.error=error.message;return false;});
  return state;
}

export function updateShowroom(world, dt) {
  const state=world.showroom;
  if(!state) return;
  const p=world.player.pos, entry=world.dealerPos;
  const open=!world.player.inCar && Math.hypot(p.x-entry.x,p.z-entry.z)<5;
  for(const door of state.doors) door.node.rotation.y=THREE.MathUtils.damp(door.node.rotation.y,open?door.angle:0,6,dt);
}
