import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Optional authored buildings. Definitions and approved, reserved placements come
// from the edition composition; this shared module contains no asset paths.
const finite = Number.isFinite;
const vector = value => Array.isArray(value) && value.length === 3 && value.every(finite);
const intersects = (a,b) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
function transformOf(placement) {
  const position = placement.position || [0,0,0], value = placement.scale ?? 1, scale=Array.isArray(value)?value:[value,value,value], rotationY = placement.rotationY ?? 0;
  if (!vector(position) || !vector(scale) || scale.some(n=>n<=0) || !finite(rotationY)) throw Error('Invalid building transform.');
  return {position,scale,rotationY};
}
function validBounds(box) {
  return vector(box?.min) && vector(box?.max) && box.min.every((n,i)=>n <= box.max[i]);
}
export function transformAuthoredBounds(box, placement) {
  if (!validBounds(box)) throw Error('Invalid building bounds.');
  const {position:p,scale:s,rotationY:r} = transformOf(placement), c=Math.cos(r), t=Math.sin(r);
  const xs=[],zs=[];
  for (const x of [box.min[0],box.max[0]]) for (const z of [box.min[2],box.max[2]]) {
    xs.push(p[0]+x*s[0]*c+z*s[2]*t);zs.push(p[2]-x*s[0]*t+z*s[2]*c);
  }
  return {x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs),
    y0:p[1]+s[1]*box.min[1],h:p[1]+s[1]*box.max[1]};
}
export function transformAuthoredCollision(collision, placement) {
  if (!Array.isArray(collision?.boxes) || !collision.boxes.length) throw Error('Explicit building collision boxes are required.');
  return collision.boxes.map((box,i)=>{
    const bounds=transformAuthoredBounds(box,placement);
    if (bounds.x1 <= bounds.x0 || bounds.z1 <= bounds.z0 || bounds.h <= bounds.y0) throw Error('Building collision box has no volume.');
    return {...bounds,roofY:bounds.h,walkable:box.walkable!==false,step:box.step===true,authoredId:placement.id,name:box.name || 'box-'+i};
  });
}
export function distanceToAuthoredBounds(position,bounds) {
  const x=Math.max(bounds.x0,Math.min(position.x,bounds.x1));
  const z=Math.max(bounds.z0,Math.min(position.z,bounds.z1));
  return Math.hypot(position.x-x,position.z-z);
}
function releaseResources(object, seen) {
  object?.traverse(node=>{
    if (node.geometry && !seen.has(node.geometry)) {seen.add(node.geometry);node.geometry.dispose();}
    const materials=Array.isArray(node.material)?node.material:[node.material];
    for (const material of materials) if (material && !seen.has(material)) {
      seen.add(material);
      for (const value of Object.values(material)) if (value?.isTexture && !seen.has(value)) {seen.add(value);value.dispose();}
      material.dispose();
    }
  });
}

export function createAuthoredDistrict({scene,assets=[],placements=[],colliders,
  canPlace,onCollidersChanged=()=>{},supportsElevatedColliders=false,
  loadAsset,prepareModel=()=>{},onReady=()=>{},chunkSize=128,loadDistance=220,visibleDistance=320,maxConcurrent=2}={}) {
  if (!scene?.add || !Array.isArray(colliders)) throw Error('A scene and authoritative collider array are required.');
  if (![chunkSize,loadDistance,visibleDistance].every(n=>finite(n)&&n>0) || visibleDistance < loadDistance) throw Error('Invalid authored district distances.');
  if (!Number.isInteger(maxConcurrent)||maxConcurrent<1||maxConcurrent>8) throw Error('Invalid building loader concurrency.');
  const definitions=new Map();
  for (const asset of assets) {
    if (!asset?.id || definitions.has(asset.id) || typeof asset.url!=='string' || !asset.url || !validBounds(asset.bounds)) throw Error('Invalid or duplicate authored asset definition.');
    const definition=structuredClone(asset);
    transformAuthoredCollision(definition.collision,{id:'validation'});
    definitions.set(asset.id,definition);
  }
  const group=new THREE.Group();group.name='AuthoredDistrict';scene.add(group);
  const rows=new Map(),chunks=new Map(),cache=new Map(),queue=[],pending=new Set(),released=new Set();
  const fallbackMaterial=new THREE.MeshStandardMaterial({color:0xb1aaa0,roughness:.92});
  const loader=loadAsset ? null : new GLTFLoader();
  const fetchAsset=loadAsset || (url=>loader.loadAsync(url));
  let disposed=false,running=0,lastPosition=null,authoredEnabled=true;

  function status() {return [...rows.values()].map(r=>({id:r.id,assetId:r.assetId,state:r.state,error:r.error||null,lod:r.lod||null,visible:!!r.root?.visible && !!r.chunk?.visible}));}
  function fallback(asset) {
    const object=new THREE.Group();object.name='ProceduralFallback';
    for (const box of asset.collision.boxes) {
      const dimensions=box.max.map((n,i)=>n-box.min[i]);
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(...dimensions),fallbackMaterial);
      mesh.position.set(...box.min.map((n,i)=>(n+box.max[i])/2));mesh.castShadow=mesh.receiveShadow=true;object.add(mesh);
    }
    return object;
  }
  for (const original of placements) {
    if (!original?.id || rows.has(original.id)) {dispose();throw Error('Missing or duplicate building placement ID.');}
    const placement=structuredClone(original),row={id:placement.id,assetId:placement.assetId,placement,state:'rejected',error:null};rows.set(row.id,row);
    try {
      const asset=definitions.get(row.assetId);if(!asset)throw Error('Building asset is not registered.');
      const transform=transformOf(placement);
      // Current collision consumers use AABBs. Cardinal yaw preserves authored
      // door openings instead of replacing a rotated notch with a solid AABB.
      if(Math.abs(transform.rotationY/(Math.PI/2)-Math.round(transform.rotationY/(Math.PI/2)))>1e-6)throw Error('Building collision requires a cardinal rotation.');
      const boxes=transformAuthoredCollision(asset.collision,placement),bounds=transformAuthoredBounds(asset.bounds,placement);
      if(!supportsElevatedColliders && boxes.some(b=>b.y0>transform.position[1]+.001))throw Error('Collision integration must support y0 and roofY before this building can be placed.');
      if(colliders.some(c=>intersects(bounds,c)))throw Error('Building bounds overlap existing collision; reserve a clear lot first.');
      if([...rows.values()].some(r=>r.bounds&&intersects(bounds,r.bounds)))throw Error('Building bounds overlap another authored placement.');
      const decision=canPlace?.({placement,asset,bounds,boxes});
      if(decision!==true)throw Error(typeof decision==='string'?decision:'An explicit clear-lot and activity-site placement check is required.');
      const root=new THREE.Group();root.name=placement.id;root.position.set(...transform.position);root.rotation.y=transform.rotationY;root.scale.set(...transform.scale);
      const key=Math.floor(transform.position[0]/chunkSize)+','+Math.floor(transform.position[2]/chunkSize);
      let chunk=chunks.get(key);if(!chunk){chunk=new THREE.Group();chunk.name='AuthoredChunk:'+key;chunk.visible=false;chunk.userData.rows=[];chunks.set(key,chunk);group.add(chunk);}
      const placeholder=fallback(asset);root.add(placeholder);chunk.add(root);
      Object.assign(row,{asset,bounds,boxes,root,chunk,placeholder,state:'fallback',lod:null});chunk.userData.rows.push(row);
      colliders.push(...boxes);
    } catch(error) {row.error=error.message;}
  }
  onCollidersChanged();

  function template(asset) {
    let entry=cache.get(asset.url);if(entry)return entry.promise;
    entry={source:null,promise:null};cache.set(asset.url,entry);
    entry.promise=Promise.resolve().then(()=>fetchAsset(asset.url)).then(gltf=>{
      if(!gltf?.scene?.isObject3D)throw Error('Asset has no renderable scene.');
      entry.source=gltf.scene;
      if(disposed){releaseResources(gltf.scene,released);throw Error('District disposed.');}
      return gltf;
    }).catch(error=>{cache.delete(asset.url);throw error;});
    return entry.promise;
  }
  function applyLOD(row,distance) {
    if(!row.model)return;
    const levels=row.levels;
    let selected=levels[0];for(const level of levels)if(distance>=level.distance)selected=level;
    for(const level of levels)level.node.visible=level===selected;
    row.lod=selected?.name||'single';
    row.model.visible=authoredEnabled;row.placeholder.visible=!authoredEnabled;
  }
  function start(row) {
    running++;row.state='loading';
    const work=template(row.asset).then(gltf=>{
      if(disposed)return;
      const model=gltf.scene.clone(true);
      model.traverse(node=>{if(node.isCamera||node.isLight||/^COL_|COLLISION|^Damage_/.test(node.name))node.visible=false;if(node.isMesh){node.castShadow=node.receiveShadow=true;node.frustumCulled=true;}});
      prepareModel(model,row.asset,row.placement);
      const specs=row.asset.lods||[{node:'LOD1',distance:0},{node:'LOD2',distance:40},{node:'LOD3',distance:120}];
      const levels=specs.map(spec=>({name:spec.node,node:model.getObjectByName(spec.node),distance:spec.distance})).filter(level=>level.node && finite(level.distance) && level.distance>=0).sort((a,b)=>a.distance-b.distance);
      if(!levels.length)throw Error('Asset has no configured LOD groups.');
      row.model=model;row.levels=levels;row.clips=gltf.animations||[];row.root.add(model);
      if(row.asset.poses)for(const [clip,time]of Object.entries(row.asset.poses))setClipTime(row.id,clip,time);
      row.placeholder.visible=false;row.state='ready';row.error=null;
      applyLOD(row,lastPosition?distanceToAuthoredBounds(lastPosition,row.bounds):0);
      onReady({id:row.id,asset:row.asset,model,placement:row.placement});
    }).catch(error=>{
      if(disposed)return;
      if(row.model){row.root.remove(row.model);row.mixer?.stopAllAction();row.mixer?.uncacheRoot(row.model);row.model=null;}
      row.state='fallback';row.error=error.message;row.placeholder.visible=true;
    }).finally(()=>{running--;pending.delete(work);pump();});
    pending.add(work);
  }
  function pump() {if(disposed)return;while(running<maxConcurrent&&queue.length)start(queue.shift());}
    function update(position,{enabled=true,visibleDistance:radius=visibleDistance}={}) {
    if(disposed)return;
    if(!position || ![position.x,position.y??0,position.z].every(finite))throw Error('Valid district observer position required.');
    lastPosition={x:position.x,y:position.y??0,z:position.z};authoredEnabled=enabled!==false;
    for(const chunk of chunks.values()) {
        const near=chunk.userData.rows.some(row=>distanceToAuthoredBounds(position,row.bounds)<=radius);
      chunk.visible=near;
      for(const row of chunk.userData.rows) {
          const distance=distanceToAuthoredBounds(position,row.bounds);row.root.visible=distance<=radius;
        if(authoredEnabled&&distance<=loadDistance&&row.state==='fallback'&&!row.error){row.state='queued';queue.push(row);}
        applyLOD(row,distance);
      }
    }
    pump();
  }
  async function ready() {while(!disposed&&(queue.length||pending.size)){pump();await Promise.all([...pending]);}return status();}
  function socket(id,name) {
    const row=rows.get(id);if(!row?.root)return null;
    row.root.updateWorldMatrix(true,true);
    const node=row.model?.getObjectByName(name);
    if(node)return node.getWorldPosition(new THREE.Vector3());
    const point=row.asset.sockets?.[name];
    return vector(point)?row.root.localToWorld(new THREE.Vector3(...point)):null;
  }
  function setClipTime(id,name,time) {
    const row=rows.get(id),clip=row?.clips?.find(c=>c.name===name);
    if(!row?.model||!clip||!finite(time)||time<0)throw Error('Building animation pose is unavailable.');
    row.mixer ||= new THREE.AnimationMixer(row.model);
    const action=row.mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;action.time=Math.min(time,clip.duration);row.mixer.update(0);
    return true;
  }
  function retry(id) {const row=rows.get(id);if(disposed||!row?.root||row.state!=='fallback')return false;row.error=null;if(lastPosition)update(lastPosition,{enabled:authoredEnabled});return true;}
  function dispose() {
    if(disposed)return;disposed=true;queue.length=0;
    const owned=new Set([...rows.values()].flatMap(row=>row.boxes||[]));
    for(let i=colliders.length-1;i>=0;i--)if(owned.has(colliders[i]))colliders.splice(i,1);
    for(const row of rows.values()){row.mixer?.stopAllAction();if(row.model)row.mixer?.uncacheRoot(row.model);}
    scene.remove(group);releaseResources(group,released);
    for(const entry of cache.values())releaseResources(entry.source,released);
    if(!released.has(fallbackMaterial)){released.add(fallbackMaterial);fallbackMaterial.dispose();}
    onCollidersChanged();
  }
  return {update,ready,status,socket,setClipTime,retry,dispose,object:id=>rows.get(id)?.model||null};
}
