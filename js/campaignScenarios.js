import * as THREE from 'three';
import {makeVehicle} from './car.js';
import {createCharacter,updateCharacterAnimation} from './characters.js';
import {disposeCharacterAsset,CHARACTER_ASSETS} from './gltfChar.js';
import {updateVehicleAsset,setVehiclePanel} from './gltfVehicle.js';
import {applyVehicleDamage,normalizeComponents,effectiveVehicleStats} from './vehicleComponents.js';
import {pointBlocked,groundHeight} from './city.js';
import {createRoadNetwork,planRoadRoute,planVehicleDetour,segmentClear} from './pursuitNavigation.js';
import {campaignMission} from './campaignContent.js';
import {scenarioContent,INSPECTION_STOCK,TRIAL_VEHICLE_ID} from './campaignScenarioContent.js';

const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const vec=p=>new THREE.Vector3(p?.x||0,p?.y||0,p?.z||0);
const keyOf=(m,pair)=>m.id+':'+pair[0]+':action-'+pair[1];
const atAction=(a,pair)=>a?.stage===pair[0]&&(a.actionIndex||0)===pair[1];
const stageNumber=s=>Number.isInteger(s?.index)?s.index:Number(String(s?.key||'').split(':')[1]);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

// This controller owns only temporary story entities. The campaign commits the
// JSON returned by interact first; update then reconciles that committed state.
// A failed save cannot board passengers, consume cargo or return the trial car.
export function createCampaignScenarios(world,hooks={}){
 const entities=new Map(),cars=new Map(),props=new Set(),barriers=[];
 let activeKey='',mission=null,definition=null,clock=0,disposed=false,network=null;
 let race=null,protection=null,pursuit=null,convoy=null,trial=null,retainedTrial=null;
 let restoredTransfers=new Set(),recoveredTrial=null;
 let poll=.25,polledActive=null;
 const originalActors=world.campaignActors||[];
 world.campaignActors=originalActors;
 const current=()=>hooks.getActive?.()||null;
 const focus=()=>world.player?.inCar?.pos||world.player?.pos;
 const colliders=()=>world.city?.colliders||[];
 const resolve=(id,mid=mission?.id,stage)=>{const result=hooks.resolveLocation?.(id,mid,stage);return vec(result?.position||result);};
 const work=()=>{const car=hooks.workVehicle?.()||world.player?.inCar;return car?.scenarioRemoved?null:car;};
 const observed=(a,m,pair)=>a?.observations?.[keyOf(m,pair)]?.scenario||null;
 const completed=(a,m,pair)=>pair[1]<0?a.stage>=pair[0]:!!observed(a,m,pair);
 const transfer=(a,m,spec)=>completed(a,m,spec.drop)?'delivered':completed(a,m,spec.load)?'aboard':'waiting';
 const removeFrom=(list,item)=>{const n=list?.indexOf(item);if(n>=0)list.splice(n,1);};
 function safePosition(base,index=0,padding=.6){
  for(let ring=0;ring<12;ring++)for(let n=0;n<12;n++){
   const angle=(n+index*3)*Math.PI/6,radius=ring?2+ring*2:0;
   const p=vec(base).add(new THREE.Vector3(Math.sin(angle)*radius,0,Math.cos(angle)*radius));p.y=.9;
   if(pointBlocked(p,colliders(),padding))continue;
   if([...cars.values()].some(c=>distance(c.pos,p)<padding+2.2))continue;
   p.y=groundHeight(p,colliders(),.25,base.y||0);return p;
  }
  return vec(base);
 }
 function vehicle(id,base,options={}){
  if(cars.has(id))return cars.get(id);
  const p=safePosition(base,cars.size,2.1),car=makeVehicle(world.scene,p.x,p.z,options.heading||0,options.color||'#426b70',{modelId:options.modelId||'oc_sedan_01',temporary:true,...options});
  car.scenarioId=id;car.scenarioManaged=true;car.campaignLoaner=mission?.id;car.ai=!!options.ai;
  car.scenarioRoute=[];car.scenarioRouteIndex=0;car.scenarioRouteGoal=null;
  cars.set(id,car);(world.parked||= []).push(car);return car;
 }
 function showVehicle(car,visible){
  const active=visible||world.player?.inCar===car;car.mesh.visible=active;
  if(!active){car.vel.set(0,0,0);removeFrom(world.parked,car);}
  else if(world.player?.inCar!==car&&!world.parked.includes(car))world.parked.push(car);
 }
 function removeCar(car){
  hooks.beforeRemoveVehicle?.(car);car.scenarioRemoved=true;car.vel.set(0,0,0);
  if(world.player?.inCar===car){
   world.player.inCar=null;world.player.pos.copy(safePosition(car.pos,0,.5));world.player.vel?.set(0,0,0);
   if(world.player.mesh)world.player.mesh.visible=true;
   if(world.player.group)world.player.group.visible=true;
  }
  car.mesh.removeFromParent();for(const list of [world.parked,world.traffic,world.cops])removeFrom(list,car);
  for(const [id,c]of cars)if(c===car)cars.delete(id);
  car.assetReady?.then(()=>{for(const mat of car.asset?.materials||[])mat.dispose();}).catch(()=>{});
 }
 function actor(id,label,base,{asset,hostile=false,officer=false,required=false,injured=false}={}){
  if(entities.has(id))return entities.get(id);
  const name=asset||label.toLowerCase().split(' ')[0];
  const ch=createCharacter({asset:officer?'officer':CHARACTER_ASSETS[name]?name:'kai',animationManaged:true,shirt:hostile?'#3a3030':'#69888b'});
  ch.group.name='Story: '+label;ch.group.position.copy(safePosition(base,entities.size));world.scene.add(ch.group);
  const a={id,label,char:ch,mesh:ch.group,group:ch.group,pos:ch.group.position,health:100,dead:false,hostile,officer,required,injured,scenarioManaged:true,state:'waiting',vehicle:null,seat:0,attackT:0};
  entities.set(id,a);world.campaignActors.push(a);return a;
 }
 function prop(id,position,size,color){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:.85}));
  mesh.name=id;mesh.position.copy(vec(position));mesh.castShadow=true;world.scene.add(mesh);props.add(mesh);return mesh;
 }
 function releaseProps(){for(const p of props){p.removeFromParent();p.geometry?.dispose();p.material?.dispose();}props.clear();for(const c of barriers)removeFrom(colliders(),c);barriers.length=0;}
 function clear({keepTrial=false}={}){
  for(const a of entities.values()){a.mesh.removeFromParent();removeFrom(world.campaignActors,a);a.char.assetReady?.then(()=>disposeCharacterAsset(a.char)).catch(()=>{});}
  entities.clear();for(const c of [...cars.values()])if(!keepTrial||c!==trial)removeCar(c);
  releaseProps();world.campaignRoadClosures=[];race=null;protection=null;pursuit=null;convoy=null;network=null;restoredTransfers.clear();
 }
 function storedTrial(){return current()?.scenarioState?.trial||world.campaign?.scenarioState?.trial||null;}
 function reset(){
  // Replay state never replaces the canonical trial. Real mission commits write
  // the condition snapshot before releasing its temporary scene objects.
  retainedTrial=clone(storedTrial()||(!activeKey.endsWith(':true')?checkpoint().trial:null)||retainedTrial);
  clear();trial=null;activeKey='';mission=null;definition=null;clock=0;poll=.25;polledActive=null;
 }
 function dispose(){reset();disposed=true;}
 function recoverVehicle(){
  // Only the supplied trial car receives checkpoint recovery. Preserve damage
  // and fuel on normal reloads, and restore enough mobility after a failed run.
  const saved=storedTrial()||retainedTrial;if(!saved||saved.returned)return;
  recoveredTrial=clone(saved);recoveredTrial.health=Math.max(35,recoveredTrial.health||0);
  recoveredTrial.fuelLitres=Math.max(5,recoveredTrial.fuelLitres||0);
  recoveredTrial.components=normalizeComponents(recoveredTrial.components,recoveredTrial.health,100);
  for(const part of ['engine','drivetrain','tyres'])recoveredTrial.components[part]=Math.max(35,recoveredTrial.components[part]||0);
  retainedTrial=clone(recoveredTrial);
 }
 function checkpoint(){
  const a=current(),saved=recoveredTrial||storedTrial()||retainedTrial;
  const returned=!!saved?.returned||!!(a?.id==='M36'&&observed(a,campaignMission('M36'),[2,0])?.trialReturned);
  if(!trial)return saved?{trial:{...clone(saved),returned}}:{};
  return {trial:{id:TRIAL_VEHICLE_ID,modelId:'oc_exotic_01',health:Math.max(0,Math.min(trial.maxHealth||100,trial.health)),components:clone(normalizeComponents(trial.components,trial.health,trial.maxHealth)),fuelLitres:Math.max(0,Math.min(trial.fuelCapacityLiters||78,trial.fuelLiters??78)),returned}};
 }
 function roadNetwork(){return network||=createRoadNetwork(world.city?.roadXs||world.city?.roadZs||[],colliders(),{padding:1.7});}
 function route(from,to){
  const start=vec(from),end=vec(to),planned=planRoadRoute(start,end,roadNetwork(),colliders());
  if(planned.length)return planned.map(vec).filter((p,i,all)=>i||distance(p,start)>2);
  return segmentClear({...start,y:1.25},{...end,y:1.25},colliders(),1.7,.8)?[end]:[];
 }
 function drive(car,target,dt,speed=15,stopRadius=5){
  if(!car||car.dead||car.health<=0||world.player?.inCar===car)return false;
  const mobility=effectiveVehicleStats(car);
  if(!mobility.propulsion||car.engineEnabled===false){car.vel.set(0,0,0);return false;}
  speed*=Math.min(1,mobility.topMul);
  if(distance(car.pos,target)<=stopRadius){car.vel.set(0,0,0);return true;}
  if(!car.scenarioRouteGoal||distance(car.scenarioRouteGoal,target)>12){car.scenarioRoute=route(car.pos,target);car.scenarioRouteIndex=0;car.scenarioRouteGoal=vec(target);}
  let goal=car.scenarioRoute[car.scenarioRouteIndex];
  while(goal&&distance(car.pos,goal)<.3&&car.scenarioRouteIndex<car.scenarioRoute.length-1)goal=car.scenarioRoute[++car.scenarioRouteIndex];
  if(goal&&distance(car.pos,goal)<.3&&distance(car.pos,target)>stopRadius){car.scenarioRouteGoal=null;car.vel.set(0,0,0);return false;}
  if(!goal){car.vel.set(0,0,0);return false;}
  const d=distance(car.pos,goal),step=Math.min(d,speed*dt),direction=vec(goal).sub(car.pos).setY(0).normalize(),next=car.pos.clone().addScaledVector(direction,step);
  if(!segmentClear({...car.pos,y:1.25},{...next,y:1.25},colliders(),1.6,.8)){car.vel.set(0,0,0);car.scenarioRouteGoal=null;return false;}
  const traffic=[...new Set([...(world.traffic||[]),...(world.parked||[]),world.player?.inCar])].filter(other=>other&&other!==car&&!other.dead);
  const blocker=traffic.find(other=>distance(other.pos,next)<3.3);
  if(blocker&&distance(blocker.pos,car.pos)>2){
   car.vel.set(0,0,0);
   if(clock>=(car.scenarioDetourAt||0)){
    car.scenarioDetourAt=clock+1;
    // A parked car may occupy an intersection waypoint. Rejoin farther along
    // the same route only when the complete bypass has collision clearance.
    for(let end=car.scenarioRouteIndex;end<Math.min(car.scenarioRoute.length,car.scenarioRouteIndex+3);end++){
     const bypass=planVehicleDetour(car.pos,car.scenarioRoute[end],colliders(),traffic.map(v=>v.pos));
     if(bypass.length){car.scenarioRoute.splice(car.scenarioRouteIndex,end-car.scenarioRouteIndex+1,...bypass.map(vec));break;}
    }
   }
   return false;
  }
  const angle=Math.atan2(direction.x,direction.z);car.heading+=wrap(angle-car.heading)*Math.min(1,dt*5);
  car.mesh.rotation.y=car.heading;car.vel.copy(direction).multiplyScalar(dt?step/dt:0);car.pos.copy(next);car.pos.y=0;
  for(const wheel of car.wheels||[])wheel.rotation.x+=step/(car.asset?.wheelRadius||.36);
  return distance(car.pos,target)<=stopRadius;
 }
 function pedestrianRoute(from,to){
  const level=p=>({x:p.x,y:Math.max(from.y||0,to.y||0)+.9,z:p.z});
  const clear=(a,b)=>segmentClear(level(a),level(b),colliders(),.32,.2);
  if(clear(from,to))return [vec(to)];
  // A small visibility graph around nearby AABB corners avoids the old straight
  // line walk getting stuck against the bank, a porch or a temporary roadblock.
  const nodes=[vec(from),vec(to)],margin=.65;
  const nearby=colliders().filter(c=>(c.h??Infinity)+.2>=level(from).y&&(c.y0??0)-.2<=level(from).y&&c.x1>=Math.min(from.x,to.x)-6&&c.x0<=Math.max(from.x,to.x)+6&&c.z1>=Math.min(from.z,to.z)-6&&c.z0<=Math.max(from.z,to.z)+6).slice(0,18);
  for(const c of nearby)for(const x of [c.x0-margin,c.x1+margin])for(const z of [c.z0-margin,c.z1+margin]){
   const p=new THREE.Vector3(x,from.y,z);if(!pointBlocked(level(p),colliders(),.32))nodes.push(p);
  }
  const costs=nodes.map(()=>Infinity),parents=nodes.map(()=>-1),seen=new Set();costs[0]=0;
  for(let count=0;count<nodes.length;count++){
   let next=-1;for(let i=0;i<nodes.length;i++)if(!seen.has(i)&&(next<0||costs[i]<costs[next]))next=i;
   if(next<0||!Number.isFinite(costs[next]))break;if(next===1){const result=[];for(let n=1;n>0;n=parents[n])result.unshift(nodes[n]);return result;}
   seen.add(next);for(let i=1;i<nodes.length;i++)if(!seen.has(i)&&clear(nodes[next],nodes[i])){const cost=costs[next]+distance(nodes[next],nodes[i]);if(cost<costs[i]){costs[i]=cost;parents[i]=next;}}
  }
  return [];
 }
 function walk(a,target,dt,speed=2.4){
  if(distance(a.pos,target)<.4)return true;
  if(!a.walkGoal||distance(a.walkGoal,target)>.8||a.walkColliderCount!==colliders().length){
   a.walkRoute=pedestrianRoute(a.pos,target);a.walkGoal=vec(target);a.walkColliderCount=colliders().length;
  }
  while(a.walkRoute?.length>1&&distance(a.pos,a.walkRoute[0])<.4)a.walkRoute.shift();
  const goal=a.walkRoute?.[0];if(!goal)return false;
  const d=distance(a.pos,goal),direction=vec(goal).sub(a.pos).setY(0).normalize(),next=a.pos.clone().addScaledVector(direction,Math.min(d,speed*dt));next.y=a.pos.y+.9;
  if(pointBlocked(next,colliders(),.3)){a.walkGoal=null;return false;}
  next.y=groundHeight(next,colliders(),.25,a.pos.y);a.pos.copy(next);a.mesh.rotation.y=Math.atan2(direction.x,direction.z);return false;
 }
 function ensure(a){
  const key=a?a.id+':'+!!a.replay:'';
  if(key===activeKey)return;
  const nextDefinition=scenarioContent(a?.id),outgoing=!activeKey.endsWith(':true')?checkpoint().trial:null;
  retainedTrial=clone(a?.scenarioState?.trial||world.campaign?.scenarioState?.trial||outgoing||retainedTrial);
  const keepTrial=!!trial&&!trial.dead&&!retainedTrial?.returned&&!a?.replay&&!activeKey.endsWith(':true')&&!!nextDefinition?.trial;
  clear({keepTrial});if(!keepTrial)trial=null;
  activeKey=key;mission=a?campaignMission(a.id):null;definition=nextDefinition;clock=0;
  if(!a||!definition)return;
  restoredTransfers=new Set([...(definition.passengers||[]),...(definition.cargo||[])].filter(spec=>transfer(a,mission,spec)==='aboard').map(spec=>spec.id));
  if(definition.inspection)for(const [i,s]of INSPECTION_STOCK.entries())vehicle('inspection:'+s.id,resolve('yard').add(new THREE.Vector3((i-1)*9,0,5)),{...s,ai:true});
  if(definition.closure)createClosure(definition.closure);
  if(definition.race)createRace(a);
  if(definition.protection)createProtection(a);
  if(definition.pursuit)createPursuit(a);
  if(definition.convoy)createConvoy(a);
 }
 function specLocation(spec,phase){return resolve(mission.stages[spec[phase][0]]?.location);}
 function transportFor(spec,index,base){
  // Each ordinary car carries three named passengers. Extra groups have visible
  // support vehicles which must arrive before a receiving headcount can pass.
  const lead=definition?.switchVehicles?cars.get('m02-sedan'):trial&&definition?.trial?trial:work();
  if(index<3&&lead&&!lead.bike)return lead;
  const shuttleIndex=Math.floor(index/3);
  const car=vehicle('shuttle:'+shuttleIndex,vec(base).add(new THREE.Vector3(5+shuttleIndex*6,0,-7)),{modelId:shuttleIndex%2?'oc_hatch_01':'oc_sedan_01',ai:true});
  const driver=actor('shuttle-driver:'+shuttleIndex,'Support driver '+shuttleIndex,car.pos,{});driver.vehicle=car;driver.state='seated';
  return car;
 }
 function reconcileTransfers(a,dt){
  let occupied=0;
  for(const spec of definition?.passengers||[]){
   const phase=transfer(a,mission,spec),loadAt=specLocation(spec,'load'),dropAt=specLocation(spec,'drop');
   if(a.stage<Math.max(0,spec.load[0]-1))continue;
   for(let i=0;i<spec.names.length;i++){
    const passenger=actor('passenger:'+spec.id+':'+i,spec.names[i],vec(phase==='delivered'?dropAt:loadAt).add(new THREE.Vector3(3+i*1.2,0,4)),{asset:spec.asset,injured:spec.injured,required:true});
    if(passenger.health<=0)continue;
    if(phase==='waiting'){passenger.state='waiting';continue;}
    if(phase==='aboard'){
     if(!passenger.vehicle){passenger.vehicle=transportFor(spec,occupied,restoredTransfers.has(spec.id)?work()?.pos||loadAt:loadAt);passenger.pickup=resolve(mission.stages[spec.load[0]].location,mission.id,{type:'drive'});passenger.seat=occupied%3;if(restoredTransfers.has(spec.id))passenger.state='seated';}
     occupied++;
     const car=passenger.vehicle;if(!car||car.dead||car.health<=0){hooks.fail?.('A required passenger vehicle is disabled. Retry the transfer checkpoint.');continue;}
     if(passenger.state!=='seated'){
      passenger.state='boarding';
      if(car.vel.length()>.8)continue;
      const previous=passenger.boardingDoor;
      if(!previous||distance(previous.carPosition,car.pos)>.8||Math.abs(wrap(previous.heading-car.heading))>.15){
       const doors=[{x:2.15,name:'Door_FR'},{x:-2.15,name:'Door_FL'}].map(d=>({...d,point:car.pos.clone().add(new THREE.Vector3(d.x,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),car.heading))}));
       const accessible=doors.filter(d=>!pointBlocked(d.point.clone().setY(d.point.y+.9),colliders(),.35)).map(d=>({...d,route:pedestrianRoute(passenger.pos,d.point)})).filter(d=>d.route.length);
       accessible.sort((a,b)=>distance(passenger.pos,a.point)-distance(passenger.pos,b.point));
       const door=accessible[0];passenger.boardingDoor=door?{...door,carPosition:car.pos.clone(),heading:car.heading}:null;
      }
      const door=passenger.boardingDoor;if(!door)continue;
      setVehiclePanel(car,door.name,true);
      if(walk(passenger,door.point,dt,2.8)){passenger.state='seated';setVehiclePanel(car,door.name,false);}
     }
     if(passenger.state==='seated'){
      const seats=[[.72,0,0],[-.03,0,-.82],[.72,0,-.82]],offset=new THREE.Vector3(...seats[passenger.seat]);offset.applyAxisAngle(new THREE.Vector3(0,1,0),car.heading);
      passenger.pos.copy(car.pos).add(offset);passenger.mesh.rotation.y=car.heading;
     }
    }else{
     const target=safePosition(vec(dropAt).add(new THREE.Vector3(4+i*1.3,0,4)),i);
     if(passenger.state==='seated'){passenger.pos.copy(passenger.vehicle.pos).add(new THREE.Vector3(2,0,0));passenger.vehicle=null;}
     passenger.state=walk(passenger,target,dt,2)?'safe':'disembarking';
    }
   }
  }
  restoredTransfers.clear();
  for(const spec of definition?.cargo||[]){
   if(a.stage<Math.max(0,spec.load[0]-1))continue;
   const phase=transfer(a,mission,spec),where=specLocation(spec,phase==='delivered'?'drop':'load');
   for(let i=0;i<spec.count;i++){
    const id='cargo:'+spec.id+':'+i;let mesh=[...props].find(p=>p.name===id);
    if(!mesh)mesh=prop(id,vec(where).add(new THREE.Vector3(3+i*.9,.4,3)),[.7,.7,.7],0x9d7954);
    if(phase==='aboard'){
     const car=definition.switchVehicles?cars.get('m02-sedan'):work();if(!car)continue;
     const p=new THREE.Vector3((i%2-.5)*.72,1.45,-.9-Math.floor(i/2)*.72).applyAxisAngle(new THREE.Vector3(0,1,0),car.heading);
     mesh.position.copy(car.pos).add(p);mesh.rotation.y=car.heading;mesh.userData.car=car;
    }else{mesh.position.copy(where).add(new THREE.Vector3(3+i*.9,.4,3));mesh.userData.car=null;}
   }
  }
  for(const car of cars.values())if(car.scenarioId.startsWith('shuttle:')){
   const riders=[...entities.values()].filter(e=>e.vehicle===car);
   const boarding=riders.find(e=>e.required&&e.state==='boarding');
   if(boarding&&boarding.pickup&&distance(car.pos,boarding.pickup)>6){drive(car,boarding.pickup,dt,14,5);}
   else if(boarding){car.vel.set(0,0,0);}
   else if(riders.length&&riders.every(e=>e.state==='seated')){
    const lead=world.player?.inCar||work();if(lead&&distance(car.pos,lead.pos)>12)drive(car,lead.pos,dt,Math.min(20,8+distance(car.pos,lead.pos)/10),10);
    else car.vel.set(0,0,0);
   }
  }
 }
 function transferReadiness(a,stage){
  let transferPoint=null;
  for(const kind of ['passengers','cargo'])for(const spec of definition?.[kind]||[]){
   const isLoad=atAction(a,spec.load),isDrop=atAction(a,spec.drop);
   if(!isLoad&&!isDrop)continue;
   const position=specLocation(spec,isLoad?'load':'drop'),car=definition?.switchVehicles?cars.get('m02-sedan'):trial&&definition?.trial?trial:work();
   if(!car||car.dead||car.bike)return gate(false,'Bring the supplied four-wheel transport to the group.',position,12);
   const curb=resolve(mission.stages[spec[isLoad?'load':'drop'][0]].location,mission.id,{type:'drive'});
   if(distance(car.pos,position)>16&&distance(car.pos,curb)>12)return gate(false,'Park the transport near the receiving entrance.',position,12);
   if(car.vel.length()>.6)return gate(false,'Stop the transport before loading or counting people.',position,12);
   transferPoint=position;
   if(isDrop){
    if(!completed(a,mission,spec.load))return gate(false,'Collect this assigned group or load first.',position,12);
    if(kind==='passengers'){
     const riders=[...entities.values()].filter(e=>e.id.startsWith('passenger:'+spec.id+':'));
     if(riders.length!==spec.names.length||riders.some(e=>e.health<=0))return gate(false,'The full named group must reach the receiving point.',position,12);
     if(riders.some(e=>e.state!=='seated'||distance(e.pos,position)>26))return gate(false,'Wait for every passenger and support car to arrive.',position,12);
    }else{
     const boxes=[...props].filter(p=>p.name.startsWith('cargo:'+spec.id+':'));
     if(boxes.length!==spec.count||boxes.some(p=>distance(p.position,position)>18))return gate(false,'Deliver every assigned cargo case to this receiving point.',position,12);
    }
   }
  }
  if(transferPoint){
   const ready=!world.player.inCar&&distance(world.player.pos,transferPoint)<=4;
   return {...gate(ready,ready?'':'Leave the stopped vehicle and meet the receiving group on foot.',transferPoint,4),onFoot:true};
  }
  if(stage.type==='drive'){
   const pending=[...entities.values()].filter(e=>e.required&&e.state==='boarding');
   if(pending.length)return gate(false,'Wait for '+pending.map(e=>e.label).join(', ')+' to board.',work()?.pos||focus(),18);
   for(const spec of definition?.passengers||[])if(transfer(a,mission,spec)==='aboard'){
    const riders=[...entities.values()].filter(e=>e.id.startsWith('passenger:'+spec.id+':'));
    if(riders.some(e=>e.vehicle?.dead))return gate(false,'A passenger vehicle needs checkpoint recovery.',focus(),12);
   }
  }
  return null;
 }
 function gate(ready,reason,position,radius=9,type){return {ready,reason,position:vec(position),radius,...(type?{type}:{})};}
 function damageActor(a,damage){
  if(!a?.scenarioManaged||!entities.has(a.id)||a.dead||!(damage>0))return false;
  a.health=Math.max(0,a.health-damage);
  if(a.health<=0){a.dead=true;a.state=a.hostile?'subdued':'down';if(a.required)hooks.fail?.('A required passenger is hurt. Retry from the safe transfer checkpoint.');}
  return true;
 }
 function requestVehicle(m,stage){
  const a=current();if(!a||!m)return null;ensure(a);const index=stageNumber(stage);
  if(m.id==='M02'){
   if(index<=5)return vehicle('m02-bike',resolve(index<3?'workshop':'hotel'),{modelId:'oc_scooter_01',bike:true});
   return vehicle('m02-sedan',resolve('coast'),{modelId:'oc_sedan_01'});
  }
  if(!definition?.trial||m.id==='M34'&&index<4||m.id==='M36'&&index>2)return null;
  if(retainedTrial?.returned&&!a.replay)return null;
  if(!trial||!cars.has(TRIAL_VEHICLE_ID)){
   const saved=a.replay?null:recoveredTrial||a.scenarioState?.trial||retainedTrial;
   trial=vehicle(TRIAL_VEHICLE_ID,resolve(m.id==='M34'?'showroom':stage.location),{modelId:'oc_exotic_01',health:saved?.health??100,components:saved?.components,fuelLiters:saved?.fuelLitres??78});
   trial.trialId=TRIAL_VEHICLE_ID;trial.saleBlocked=true;recoveredTrial=null;
  }
  return trial;
 }
 function ownsVehicle(car){return [...cars.values()].includes(car);}

 function createClosure(spec){
  const anchor=resolve(spec.location),meshes=[],solid=[];
  for(const x of [-5.5,5.5]){
   const p=anchor.clone().add(new THREE.Vector3(x,.65,18));meshes.push(prop('Road closed — pedestrian exit',p,[6,1.3,1],0xe5a43d));
   solid.push({x0:p.x-3,x1:p.x+3,z0:p.z-.5,z1:p.z+.5,y0:0,h:1.3,scenario:true});
  }
  const water=prop('Storm water beyond the controlled turnback',anchor.clone().add(new THREE.Vector3(0,.03,30)),[14,.06,20],0x396875);meshes.push(water);
  const fallen=prop('Fallen road debris',anchor.clone().add(new THREE.Vector3(3,.45,23)),[5,.9,1.3],0x71604c);fallen.rotation.y=.4;meshes.push(fallen);
  definition={...definition,closure:{...spec,meshes,solid,enabled:false}};
 }
 function updateClosure(a){
  const c=definition?.closure;if(!c?.meshes)return;
  const enabled=a.stage>=c.from&&a.stage<=c.to;
  c.meshes.forEach(p=>p.visible=enabled);
  if(c.enabled!==enabled){
   c.enabled=enabled;network=null;
   for(const b of c.solid){if(enabled){colliders().push(b);barriers.push(b);}else{removeFrom(colliders(),b);removeFrom(barriers,b);}}
  }
  if(definition.abandonVehicle&&completed(a,mission,definition.abandonVehicle)){
   const car=work();if(car?.temporary&&!car.storyAbandoned){car.storyAbandoned=true;car.engineEnabled=false;applyVehicleDamage(car,65,{kind:'collision'});car.vel.set(0,0,0);}
  }
 }
 function createPursuit(a){
  const anchor=resolve(mission.stages[definition.pursuit.from]?.location||'coast');
  pursuit={escaped:false,away:0,cars:[vehicle('pursuer:0',anchor.clone().add(new THREE.Vector3(0,0,-38)),{ai:true,color:'#4d3030'}),vehicle('pursuer:1',anchor.clone().add(new THREE.Vector3(8,0,-50)),{ai:true,color:'#33323c'})]};
 }
 function updatePursuit(a,dt){
  if(!pursuit)return;const spec=definition.pursuit;
  const active=a.stage>=spec.from&&a.stage<=spec.to;
  for(const c of pursuit.cars)showVehicle(c,active);
  if(!active||pursuit.escaped)return;
  const atSanctuary=distance(focus(),resolve(spec.sanctuary))<21;
  const far=pursuit.cars.every(c=>c.dead||c.health<=0||distance(c.pos,focus())>110);
  pursuit.away=far?pursuit.away+dt:0;
  if(atSanctuary||pursuit.away>5){pursuit.escaped=true;pursuit.cars.forEach(c=>c.vel.set(0,0,0));return;}
  for(const c of pursuit.cars){drive(c,focus(),dt,18,4);if(world.player.inCar&&distance(c.pos,focus())<4.5)applyVehicleDamage(world.player.inCar,dt*1.5,{kind:'collision'});}
 }
 function createProtection(a){
  const spec=definition.protection,at=resolve(spec.location);
  protection={crew:[],officers:[],patrol:null,reported:!spec.report,elapsed:0,arrived:false,arrested:false};
  for(let i=0;i<spec.crew;i++)protection.crew.push(actor('crew:'+i,i===0?'Kells':'Recovery crew '+(i+1),at.clone().add(new THREE.Vector3(-10-i*2,0,-12)),{hostile:true}));
  // Two pieces of cover define a pedestrian escape gap. They are removed with
  // this event and do not change the permanent authored building colliders.
  for(const x of [-6,6]){const p=at.clone().add(new THREE.Vector3(x,.6,5));prop('Escape route cover',p,[3,1.2,2],0x7a7b70);const c={x0:p.x-1.5,x1:p.x+1.5,z0:p.z-1,z1:p.z+1,y0:0,h:1.2,scenario:true};colliders().push(c);barriers.push(c);}
 }
 function updateProtection(a,dt){
  if(!protection)return;const spec=definition.protection,live=a.stage>=spec.from&&a.stage<=spec.to;
  for(const crew of protection.crew)crew.mesh.visible=live;
  if(protection.patrol)showVehicle(protection.patrol,live);
  for(const officer of protection.officers)officer.mesh.visible=live&&protection.arrived;
  if(!live)return;
  const base=resolve(spec.location),near=distance(focus(),base)<70;
  if(near)protection.elapsed+=dt;
  if(spec.report&&observed(a,mission,spec.report))protection.reported=true;
  if(protection.reported&&spec.officers&&protection.elapsed>9&&!protection.patrol){
   protection.patrol=vehicle('responding-patrol',base.clone().add(new THREE.Vector3(0,0,-48)),{modelId:'oc_police_sedan_01',police:true,ai:true});
   protection.officers=[0,1].map(i=>actor('responding-officer:'+i,i?'Patrol officer':'Mercer',protection.patrol.pos.clone().add(new THREE.Vector3(i*1.5,0,0)),{officer:true}));
  }
  if(protection.patrol){
   protection.arrived=drive(protection.patrol,base,dt,15,12)||protection.arrived;
   for(const [i,officer]of protection.officers.entries()){
    if(!protection.arrived){officer.pos.copy(protection.patrol.pos);officer.mesh.visible=false;continue;}
    officer.mesh.visible=true;officer.state='walking';
    const subject=protection.crew.find(c=>!c.arrested)||protection.crew[i%protection.crew.length];
    if(walk(officer,subject.pos,dt,3)||distance(officer.pos,subject.pos)<2.5){subject.arrested=true;subject.hostile=false;subject.state='arrested';}
   }
   protection.arrested=protection.crew.every(c=>c.arrested);
  }
  for(const crew of protection.crew){
   if(crew.dead||crew.arrested)continue;
   const vulnerable=[...entities.values()].filter(e=>e.required&&['waiting','boarding'].includes(e.state)&&distance(e.pos,base)<40);
   const nearest=vulnerable.sort((x,y)=>distance(crew.pos,x.pos)-distance(crew.pos,y.pos))[0];
   // Standing between the crew and the exit draws them away from civilians;
   // driving away once everyone boards is an equally valid nonlethal route.
   const playerNear=distance(crew.pos,focus())<12;
   const target=playerNear?world.player:nearest;
   if(!target||protection.elapsed<6){crew.state='guarding';continue;}
   crew.state='walking';walk(crew,target.pos,dt,1.75);crew.attackT=Math.max(0,crew.attackT-dt);
   if(distance(crew.pos,target.pos)<1.5&&crew.attackT===0){
    crew.attackT=1.2;crew.state='attacking';
    if(target===world.player){if(!world.player.inCar)world.player.health=Math.max(0,world.player.health-4);}
    else damageActor(target,8);
   }
  }
 }
 function createConvoy(a){
  const anchor=resolve('dispatch');convoy={cars:[vehicle('convoy:Paz',anchor.clone().add(new THREE.Vector3(0,0,-10)),{ai:true,modelId:'oc_hatch_01'}),vehicle('convoy:Ivo',anchor.clone().add(new THREE.Vector3(0,0,-22)),{ai:true})],broken:false,assistance:0,repaired:false};
  for(let i=0;i<convoy.cars.length;i++){
   const driver=actor('convoy-driver:'+i,i?'Ivo':'Paz',convoy.cars[i].pos,{required:false});driver.vehicle=convoy.cars[i];driver.state='seated';
  }
 }
 function updateConvoy(a,dt){
  if(!convoy)return;const spec=definition.convoy,active=a.stage>=spec.from&&a.stage<=spec.to;
  for(const c of convoy.cars)showVehicle(c,active);
  for(let i=0;i<convoy.cars.length;i++)entities.get('convoy-driver:'+i).mesh.visible=active;
  if(!active)return;
  const rest=resolve('rest');
  if(a.stage>=spec.breakdownStage-1&&distance(convoy.cars[1].pos,rest)<30&&!convoy.broken){convoy.broken=true;convoy.cars[1].components.engine=0;convoy.cars[1].vel.set(0,0,0);setVehiclePanel(convoy.cars[1],'Hood',true);}
  if(completed(a,mission,[spec.breakdownStage,spec.repairAction])){
   convoy.assistance+=dt;
   const mechanic=actor('convoy-mechanic','Road assistance',convoy.cars[1].pos.clone().add(new THREE.Vector3(2,0,2)),{});mechanic.state='repairing';
   if(convoy.assistance>=8){convoy.repaired=true;convoy.cars[1].components.engine=70;setVehiclePanel(convoy.cars[1],'Hood',false);}
  }
  const lead=world.player.inCar||work();if(!lead)return;
  for(const [i,c]of convoy.cars.entries()){
   if(i===1&&convoy.broken&&!convoy.repaired)continue;
   const target=i===0?lead:convoy.cars[0];drive(c,target.pos,dt,18,10);
   const driver=entities.get('convoy-driver:'+i);driver.pos.copy(c.pos);driver.mesh.rotation.y=c.heading;
  }
  if(convoy.cars.some(c=>c.dead||c.health<=0))hooks.fail?.('A convoy vehicle is disabled. Retry the current convoy checkpoint.');
 }
 function createRace(a){
  race={leg:0,gates:[],next:0,rivals:[],elapsed:0,classification:null,marker:null,lastPlayer:null,rescue:null};
  const completedLeg=[...definition.race.legs].reverse().find(leg=>a.stage>leg);
  if(completedLeg){
   race.leg=completedLeg;const start=resolve(completedLeg===definition.race.legs[0]?'coast':'island');
   race.gates=route(start,resolve(mission.stages[completedLeg].location));race.next=race.gates.length;
   if(completedLeg===definition.race.legs.at(-1))race.classification=observed(a,mission,[7,0])?.race?.position||3;
  }
  const start=resolve('coast');
  for(let i=0;i<definition.race.rivals;i++)race.rivals.push({car:vehicle('race-rival:'+i,start.clone().add(new THREE.Vector3((i?1:-1)*4,0,4)),{ai:true,color:i?'#99532e':'#404c88'}),next:0,finished:false});
 }
 function beginRaceLeg(a){
  const legs=definition.race.legs,index=legs.indexOf(a.stage);if(index<0)return;
  if(race.leg===a.stage)return;
  race.leg=a.stage;race.next=0;race.lastPlayer=vec(focus());
  const start=resolve(index?'island':'coast'),end=resolve(mission.stages[a.stage].location);
  race.gates=route(start,end);if(!race.gates.length)race.gates=[end];
  for(const rival of race.rivals){rival.next=0;rival.finished=false;rival.car.scenarioRouteGoal=null;}
  if(race.marker){race.marker.removeFromParent();props.delete(race.marker);race.marker.geometry.dispose();race.marker.material.dispose();}
  race.marker=new THREE.Mesh(new THREE.TorusGeometry(5,.18,6,32),new THREE.MeshBasicMaterial({color:0x52e7cf,transparent:true,opacity:.8}));race.marker.rotation.x=Math.PI/2;world.scene.add(race.marker);props.add(race.marker);
  const nodes=[start,...race.gates];world.campaignRoadClosures=nodes.slice(1).map((p,i)=>({a:{x:nodes[i].x,z:nodes[i].z},b:{x:p.x,z:p.z},width:10}));
  // Marshal barriers at road edges leave the actual course unobstructed.
  for(let i=0;i<race.gates.length;i++)for(const side of [-1,1]){
   const p=race.gates[i].clone().add(new THREE.Vector3(side*8,.5,0)),mesh=prop('Race marshal barrier',p,[1,1,1],0xeb8e34);mesh.userData.raceBarrier=true;
   if(!pointBlocked({...p,y:.9},colliders(),.3)){const c={x0:p.x-.5,x1:p.x+.5,z0:p.z-.5,z1:p.z+.5,y0:0,h:1,scenario:true};colliders().push(c);barriers.push(c);}
  }
 }
 function updateRace(a,dt){
  if(!race)return;
  const driving=definition.race.legs.includes(a.stage);if(driving)beginRaceLeg(a);
  if(driving){
   race.elapsed+=dt;const gatePos=race.gates[race.next],car=world.player?.inCar;
   if(gatePos&&car&&!car.dead&&distance(car.pos,gatePos)<7)race.next++;
   if(race.marker){const next=race.gates[race.next];race.marker.visible=!!next;if(next)race.marker.position.copy(next).setY(.12);}
   for(const [i,rival]of race.rivals.entries()){
    const destination=race.gates[rival.next];if(!destination)continue;
    if(drive(rival.car,destination,dt,i?16:19,5)){rival.next++;if(rival.next>=race.gates.length)rival.finished=true;}
   }
   if(race.next>=race.gates.length&&a.stage===definition.race.legs.at(-1)&&race.classification===null)race.classification=1+race.rivals.filter(r=>r.finished).length;
   if(car?.dead)hooks.fail?.('The event car is disabled. Retry this race checkpoint.');
  }else if(a.stage>definition.race.legs.at(-1)){
   world.campaignRoadClosures=[];if(race.marker)race.marker.visible=false;
  }
  if(a.stage>=9&&!race.rescue){
   const base=resolve('coast'),car=vehicle('vaughn-stopped',base.clone().add(new THREE.Vector3(5,0,3)),{ai:true,health:38,components:{engine:0}});
   const driver=actor('vaughn','Vaughn',car.pos,{injured:true,required:true});driver.state='trapped';race.rescue={car,driver,marshal:null,called:0};
  }
  if(race.rescue){
   const r=race.rescue;
   if(observed(a,mission,[10,0])?.beltReleased&&r.driver.state==='trapped'){setVehiclePanel(r.car,'Door_FL',true);r.driver.state='safe';r.driver.pos.copy(r.car.pos).add(new THREE.Vector3(-2,0,0));}
   if(observed(a,mission,[10,1])?.marshalCalled){r.called+=dt;if(!r.marshal)r.marshal=actor('race-marshal','Event marshal',resolve('coast').add(new THREE.Vector3(-10,0,0)),{});walk(r.marshal,r.driver.pos,dt,2.5);}
  }
 }
 function readiness(stage,m){
  const a=current();ensure(a);if(!a||!definition||m?.id!==mission?.id)return null;
  const index=stageNumber(stage),position=resolve(stage.location);
  if(m.id==='M02'){
   if(index===5)return gate(!world.player.inCar,world.player.inCar?'Leave Ewan’s bike at the hotel and walk to Nora.':'',position,9,'travel');
   if([1,3].includes(index)&&world.player.inCar!==cars.get('m02-bike'))return gate(false,'Use Milo’s signed-off Coast 125.',position);
   if(index>=8&&stage.type==='drive'&&world.player.inCar!==cars.get('m02-sedan'))return gate(false,'Use Nora’s supplied sedan for the linen deliveries.',position);
  }
  if(definition.inspection&&index===2){const car=cars.get('inspection:'+INSPECTION_STOCK[a.actionIndex||0]?.id);return gate(!!car&&!world.player.inCar&&distance(focus(),car.pos)<4,'Walk to the next marked stock vehicle and inspect it.',car?.pos||position,4);}
  if(definition.trial&&((m.id==='M34'&&index>=6)||m.id==='M35'||(m.id==='M36'&&index<=2))){
   if(!trial||trial.dead)return gate(false,'Request the assigned Rook trial vehicle.',position);
   if(stage.type==='drive'&&world.player.inCar!==trial)return gate(false,'Bring the same assigned Marquesa trial vehicle.',position);
   if(m.id==='M36'&&index===2&&(world.player.inCar||distance(trial.pos,position)>18))return gate(false,'Park the assigned Marquesa at the showroom, then leave it for the condition receipt.',position);
  }
  const transfers=transferReadiness(a,stage);if(transfers)return transfers;
  if(pursuit&&index===definition.pursuit.to&&!pursuit.escaped)return gate(false,'Reach the staffed forecourt or lose the following cars.',resolve(definition.pursuit.sanctuary),18);
  if(protection&&definition.protection.wait&&atAction(a,definition.protection.wait)&&!protection.arrested)return gate(false,'Keep the exit safe while Mercer and the patrol officers detain the crew.',position,12);
  if(convoy){
   if(index===definition.convoy.breakdownStage&&(a.actionIndex||0)===0){const c=convoy.cars[1];return gate(convoy.broken&&distance(focus(),c.pos)<8&&!world.player.inCar,'Stop beside Ivo’s disabled vehicle and request roadside assistance.',c.pos,8);}
   if(index===definition.convoy.breakdownStage&&(a.actionIndex||0)>0&&!convoy.repaired)return gate(false,'Roadside assistance is repairing Ivo’s engine. Stay nearby.',convoy.cars[1].pos,12);
   if([3,4,6,8,9].includes(index)&&convoy.cars.some(c=>distance(c.pos,position)>35))return gate(false,'Wait for both convoy vehicles at the checkpoint.',position,12);
  }
  if(race){
   if(definition.race.legs.includes(index)){
    beginRaceLeg(a);const next=race.gates[race.next];return gate(!next,next?'Pass the marked race gates in order.':'Stop safely at the checkpoint.',next||position,next?7:9);
   }
   if([5,7].includes(index)&&race.leg!==index-1)return gate(false,'Complete the controlled driving leg before checking in.',position);
   if(index===7&&race.classification===null)return gate(false,'Complete every gate for a classified finish; any position counts.',position);
   if(index===10){const r=race.rescue;return gate(!!r&&!world.player.inCar&&distance(focus(),r.car.pos)<5,'Stop, leave your car and help Vaughn at his driver door.',r?.car.pos||position,5);}
  }
  if(definition.abandonVehicle&&atAction(a,definition.abandonVehicle)){
   const c=work();return gate(!!c?.temporary&&!world.player.inCar&&distance(c.pos,position)<18,'Leave the empty supplied vehicle with the road staff before walking onward.',position,12);
  }
  return null;
 }
 function interact({stage,mission:m,action}){
  const a=current();ensure(a);if(!a||!definition||m?.id!==mission?.id)return null;
  const ready=readiness(stage,m);if(ready&&!ready.ready)throw Error(ready.reason);
  const observation={scenario:{}};let used=false;
  for(const kind of ['passengers','cargo'])for(const spec of definition[kind]||[]){
   const phase=atAction(a,spec.load)?'loaded':atAction(a,spec.drop)?'delivered':null;if(!phase)continue;
   (observation.scenario.transfers||=[]).push({id:spec.id,kind,phase,count:kind==='passengers'?spec.names.length:spec.count,names:spec.names||[],vehicle:(definition.switchVehicles?cars.get('m02-sedan'):trial&&definition.trial?trial:work())?.scenarioId||'work-vehicle'});used=true;
  }
  if(definition.inspection&&a.stage===2){
   const stock=INSPECTION_STOCK[a.actionIndex||0],car=cars.get('inspection:'+stock.id),conditions=normalizeComponents(car.components,car.health,car.maxHealth);
   Object.assign(observation,{vehicle:stock.id,component:action.component||'engine',condition:conditions[action.component||'engine'],components:clone(conditions),health:car.health});observation.scenario.inspected=stock.id;used=true;
  }
  if(m.id==='M02'&&a.stage===4){if(world.player.inCar)throw Error('Leave Ewan’s bike before returning the keys.');observation.scenario.bikeReturned=true;used=true;}
  if(m.id==='M34'&&atAction(a,[4,1])){observation.scenario.trialAccepted=TRIAL_VEHICLE_ID;used=true;}
  if(m.id==='M36'&&atAction(a,[2,0])){observation.scenario.trialReturned=true;observation.scenario.condition=checkpoint().trial;used=true;}
  if(convoy&&a.stage===definition.convoy.breakdownStage){observation.scenario.assistanceRequested=true;used=true;}
  if(protection&&definition.protection.report&&atAction(a,definition.protection.report)){observation.scenario.officersRequested=true;used=true;}
  if(protection&&definition.protection.wait&&atAction(a,definition.protection.wait)){observation.scenario.crewArrested=protection.arrested;used=true;}
  if(race&&[5,7].includes(a.stage)){observation.scenario.race={leg:race.leg,gates:race.gates.length,passed:race.next,position:race.classification,seconds:Math.round(race.elapsed*10)/10};used=true;}
  if(race&&a.stage===10){observation.scenario[(a.actionIndex||0)?'marshalCalled':'beltReleased']=true;used=true;}
  if(definition.abandonVehicle&&atAction(a,definition.abandonVehicle)){observation.scenario.emptyVehicleReleased=true;used=true;}
  return used?observation:null;
 }
 function update(dt){
  if(disposed||!Number.isFinite(dt)||dt<0)return;
  poll+=dt;const reconcile=poll>=.25;
  if(reconcile){poll=0;polledActive=current();ensure(polledActive);}
  const a=polledActive;if(!a||!definition||a.failure)return;
  dt=Math.min(dt,.1);clock+=dt;
  if(reconcile&&definition.switchVehicles)requestVehicle(mission,{...mission.stages[a.stage],index:a.stage});
  if(reconcile&&definition.trial&&((a.id==='M34'&&a.stage>=4)||(a.id==='M35')||(a.id==='M36'&&a.stage<=2)))requestVehicle(mission,{...mission.stages[a.stage],index:a.stage});
  reconcileTransfers(a,dt);if(reconcile)updateClosure(a);updatePursuit(a,dt);updateProtection(a,dt);updateConvoy(a,dt);updateRace(a,dt);
  if(trial&&a.id==='M36'&&observed(a,mission,[2,0])?.trialReturned){retainedTrial={...checkpoint().trial,returned:true};removeCar(trial);trial=null;}
  for(const car of cars.values())if(!world.activity||world.activity.active(car))updateVehicleAsset(car,dt,car.vel.length()>.3,false);
  for(const actor of entities.values()){
   if(!actor.mesh.visible)continue;
   if(actor.id.startsWith('shuttle-driver:')&&actor.vehicle){actor.pos.copy(actor.vehicle.pos);actor.mesh.rotation.y=actor.vehicle.heading;}
   if(world.activity&&!world.activity.shouldAnimate(actor.mesh,actor.pos))continue;
   const action=actor.dead?'idle':actor.state==='attacking'?'talk_emphatic':actor.state==='arrested'?'listen':actor.state==='repairing'||actor.injured&&actor.state==='waiting'?'inspect_crouch':undefined;
   actor.mesh.rotation.z=actor.dead?Math.PI/2:0;
   updateCharacterAnimation(actor.char,dt,{speed:['walking','boarding','disembarking'].includes(actor.state)?2:0,grounded:true,vehicle:actor.state==='seated'?actor.vehicle:null,action,interval:world.activity?.animationInterval||.05});
  }
 }
 function snapshot(){return {mission:mission?.id||null,actors:[...entities.values()].map(a=>({id:a.id,label:a.label,state:a.state,health:a.health,hostile:a.hostile,arrested:!!a.arrested,vehicle:a.vehicle?(a.vehicle.scenarioId||'work-vehicle'):null,position:{x:a.pos.x,y:a.pos.y,z:a.pos.z}})),vehicles:[...cars.values()].map(c=>({id:c.scenarioId,modelId:c.modelId,health:c.health,position:{x:c.pos.x,z:c.pos.z}})),cargo:[...props].filter(p=>p.name.startsWith('cargo:')).map(p=>({id:p.name,vehicle:p.userData.car?(p.userData.car.scenarioId||'work-vehicle'):null,position:{x:p.position.x,z:p.position.z}})),race:race?{leg:race.leg,passed:race.next,total:race.gates.length,position:race.classification,rivals:race.rivals.map(r=>({passed:r.next,finished:r.finished})),gates:race.gates.map(p=>({x:p.x,z:p.z}))}:null,convoy:convoy?{broken:convoy.broken,repaired:convoy.repaired}:null,protection:protection?{reported:protection.reported,arrived:protection.arrived,arrested:protection.arrested}:null,closures:barriers.length,trial:checkpoint().trial||null};}
 const api={update,readiness,interact,reset,dispose,snapshot,checkpoint,requestVehicle,ownsVehicle,damageActor,recoverVehicle};world.campaignScenarios=api;return api;
}
