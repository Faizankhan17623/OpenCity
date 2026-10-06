import * as THREE from 'three';
import { createAuthoredDistrict } from './authoredDistrict.js';
import { blockStart, BLOCK, ROAD, invalidateColliderGrid } from './city.js';
import { asphaltPBR } from './textures.js';

// These four ordinary blocks form a district east of the original services.
// Reserve them in buildCity BEFORE towers, roof clutter or activity sites exist.
// No park, landmark, existing service or traffic route is moved.
export const AUTHORED_WORLD_LOTS = Object.freeze([[6,4],[7,4],[6,5],[7,5]].map(Object.freeze));
const overlap=(a,b)=>a.x0 < b.x1-1e-6 && a.x1 > b.x0+1e-6 && a.z0 < b.z1-1e-6 && a.z1 > b.z0+1e-6;
const knownRoads=new Set(['oc_road_straight_01','oc_road_crossing_01','oc_road_junction_01']);

export function authoredWorldPlacements() {
  const rows=[];
  const add=(id,assetId,x,z,rotationY=0,extra={})=>rows.push({id,assetId,position:[x,.24,z],rotationY,...extra});
  add('flamingo-hotel','oc_hotel_flamingo_01',114,-43,Math.PI);
  add('marina-shops','oc_shop_row_01',190,-48,Math.PI);
  add('harbour-bank','oc_bank_harbour_mutual_01',104,26,Math.PI);
  add('marina-apartments','oc_apartments_01',130,47,Math.PI);
  add('mendez-garage','oc_mendez_garage_01',185,43,Math.PI);
  add('marina-forecourt','oc_petrol_forecourt_01',190,-21);
  add('flamingo-parking','oc_parking_01',113,-19.5,0,{scale:[.8,1,.5]});
  add('harbour-plaza','oc_plaza_01',103,53,Math.PI/2,{scale:[.75,1,.8]});
  // Four-way kit only: a T junction would physically close a live traffic lane.
  // 12m authored carriageway -> the existing 16m road. Kerb height stays 12cm.
  // Raise the kit15mm clear of the existing pavement to prevent coplanar flicker.
  const widthScale=ROAD/12;
  add('flamingo-crossroads','oc_road_junction_01',152,0,0,{position:[152,.135,0],scale:[widthScale,1,widthScale],road:true});
  for(const [arm,dx,dz,yaw] of [['north',0,-1,0],['south',0,1,0],['east',1,0,Math.PI/2],['west',-1,0,Math.PI/2]]) {
    for(let i=0;i<4;i++) {
      const distance=12+6.5+i*13, x=152+dx*distance,z=dz*distance;
      add('flamingo-road-'+arm+'-'+i,i===0?'oc_road_crossing_01':'oc_road_straight_01',x,z,yaw,
        {position:[x,.135,z],scale:[widthScale,1,13/12],road:true});
    }
  }
  // Furniture sits outside the 16m carriageway and clear of service approaches.
  for(const [i,x,z] of [[0,138,-25],[1,166,-25],[2,138,25],[3,166,25],[4,126,-64],[5,204,-62]]) {
    add('flamingo-lamp-'+i,'oc_lamp_01',x,z,x<152?-Math.PI/2:Math.PI/2);
  }
  for(const [i,x,z] of [[0,135,-58],[1,166.8,-58],[2,213,-58],[3,138,60],[4,211,59]])add('flamingo-palm-'+i,'oc_palm_01',x,z);
  add('bank-bench','oc_bench_01',94,37,Math.PI/2);
  add('bank-bin','oc_bin_01',94,39);
  add('bank-sign','oc_sign_01',94,16);
  add('bank-bollard-l','oc_bollard_01',101,15);
  add('bank-bollard-r','oc_bollard_01',107,15);
  add('plaza-fountain','oc_fountain_01',119,61);
  return rows;
}

export function createAuthoredWorld({scene,city,assets=[],loadAsset,protectedSites=[]}={}) {
  if(!city?.authoredLots || !AUTHORED_WORLD_LOTS.every(([x,z])=>city.authoredLots.includes(x+':'+z)))
    throw Error('Reserve AUTHORED_WORLD_LOTS in buildCity before creating the authored world.');
  const definitions=Array.isArray(assets)?assets:Object.entries(assets).map(([id,asset])=>({id,...asset}));
  const ids=new Set(definitions.map(a=>a.id));
  const placements=authoredWorldPlacements().filter(p=>ids.has(p.assetId));
  const usedIds=new Set(placements.map(p=>p.assetId));
  const usedDefinitions=definitions.filter(a=>usedIds.has(a.id));
  const roads=usedDefinitions.filter(a=>knownRoads.has(a.id));
  // Paving is physical but climbable; don't treat a 12cm kerb as a wall.
  const poses={oc_bank_harbour_mutual_01:{Door_Entrance_L_OpenClose:1.05,Door_Entrance_R_OpenClose:1.05},oc_mendez_garage_01:{BayDoor_1_OpenClose:1.05,BayDoor_2_OpenClose:1.05,OfficeDoor_OpenClose:1.05}};
  const prepared=usedDefinitions.map(a=>({...a,poses:a.poses||poses[a.id],collision:{...a.collision,boxes:(a.collision?.boxes||[]).map(b=>({...b,step:b.max[1]<=.16}))}}));
  const lots=AUTHORED_WORLD_LOTS.map(([bi,bj])=>({x0:blockStart(bi),x1:blockStart(bi)+BLOCK,z0:blockStart(bj),z1:blockStart(bj)+BLOCK}));
  let asphaltMaterial=null,disposed=false;
  if(roads.length) {
    const maps=asphaltPBR({size:256,anisotropy:8});
    for(const texture of Object.values(maps))texture.repeat.set(3,3);
    asphaltMaterial=new THREE.MeshStandardMaterial({...maps,roughness:1,metalness:0,envMapIntensity:.35});
    asphaltMaterial.name='Authored_Asphalt_PBR';asphaltMaterial.normalScale.set(.8,.8);
    asphaltMaterial.userData.dryRoughness=1;city.roadMats.push(asphaltMaterial);
  }
  const district=createAuthoredDistrict({scene,colliders:city.colliders,assets:prepared,placements,loadAsset,
    supportsElevatedColliders:true,onCollidersChanged:()=>invalidateColliderGrid(city.colliders),
    loadDistance:230,visibleDistance:400,maxConcurrent:3,
    canPlace:({placement,bounds})=>{
      if(!placement.road&&!lots.some(l=>bounds.x0>=l.x0+.5&&bounds.x1<=l.x1-.5&&bounds.z0>=l.z0+.5&&bounds.z1<=l.z1-.5))
        return 'Authored model exceeds its reserved off-road lot.';
      for(const site of [...(city.activitySites||[]),...protectedSites]) {
        const radius=site.radius??3;
        if(overlap(bounds,{x0:site.x-radius,x1:site.x+radius,z0:site.z-radius,z1:site.z+radius}))return 'Authored model overlaps an existing activity site.';
      }
      return true;
    },
    prepareModel:(model)=>model.traverse(node=>{
      if(!node.isMesh)return;
      const replace=material=>material?.name==='OC_Asphalt'&&asphaltMaterial?asphaltMaterial:material;
      node.material=Array.isArray(node.material)?node.material.map(replace):replace(node.material);
    })
  });
  return {
    ...district,
    // Socket positions use GLB transforms when loaded and supplied game-space
    // metadata while streaming. Banking owns the actual money transactions.
    bankSockets:()=>['socket_teller_1','socket_teller_2','socket_teller_3','socket_atm','socket_loan_desk']
      .map(name=>({name,pos:district.socket('harbour-bank',name)})).filter(s=>s.pos),
    dispose(){if(disposed)return;disposed=true;district.dispose();
      const at=city.roadMats.indexOf(asphaltMaterial);if(at>=0)city.roadMats.splice(at,1);
      // The district disposes the shared asphalt once with its loaded models.
      if(asphaltMaterial&&!district.object('flamingo-crossroads')){for(const value of Object.values(asphaltMaterial))if(value?.isTexture)value.dispose();asphaltMaterial.dispose();}
    }
  };
}
