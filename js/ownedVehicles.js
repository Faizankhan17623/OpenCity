import { normalizeComponents } from './vehicleComponents.js';
import { makeVehicle } from './car.js';
import { describeVehicle } from './vehicleFuel.js';
import { pointBlocked, HALF } from './city.js';
import { vehicleTransaction } from './vehicleTransactions.js';
import { prepareVehicleLoan } from './vehicleFinance.js';

import { VEHICLE_DEALS } from './vehicleCatalog.js';
export { VEHICLE_DEALS };

function allVehicles(world) {
  return [...new Set([...world.parked,...(world.traffic||[]),...(world.cops||[]),world.player.inCar].filter(Boolean))];
}
export function spaceForVehicle(world, position, radius=1.6, except=null) {
  return Math.abs(position.x)<HALF-3 && Math.abs(position.z)<HALF-3 &&
    !pointBlocked({x:position.x,y:(position.y||0)+.9,z:position.z},world.city.colliders,radius) &&
    (world.player.inCar || Math.hypot(world.player.pos.x-position.x,world.player.pos.z-position.z)>radius+.6) &&
    !allVehicles(world).some(v=>v!==except && !v.dead && Math.hypot(v.pos.x-position.x,v.pos.z-position.z)<(v.rad??1.6)+radius+.5);
}
export function findVehicleSpace(world, origin, radius=1.6, except=null) {
  for(let ring=0;ring<=4;ring++)for(let i=0;i<(ring?8:1);i++) {
    const p=origin.clone();const angle=i*Math.PI/4;
    p.x+=Math.sin(angle)*ring*5;p.z+=Math.cos(angle)*ring*5;
    if(spaceForVehicle(world,p,radius,except))return p;
  }
  throw new Error('The collection area is blocked. Move nearby vehicles and try again.');
}
function removeVehicle(world,v) {
  world.scene.remove(v.mesh);
  for(const list of [world.parked,world.traffic,world.cops])if(list){const i=list.indexOf(v);if(i>=0)list.splice(i,1);}
}
export function initOwnedVehicles(world, save, applyMods) {
  world.ownedVehicles=[];world.ownedVehicleInstances=new Map();world.applyOwnedMods=applyMods;
  world.vehicleReceipts=Array.isArray(save.vehicleReceipts)?save.vehicleReceipts.slice(0,100):[];
  const ids=new Set();
  for(const record of Array.isArray(save.vehicleInventory)?save.vehicleInventory:[]) {
    if(!record || typeof record.id!=='string' || ids.has(record.id) || !record.descriptor)continue;
    ids.add(record.id);world.ownedVehicles.push(structuredClone(record));
    if(record.descriptor.dead)continue;
    const d=record.descriptor;
    const desired=world.dealerDeliveryPos.clone();
    if(Number.isFinite(record.position?.x)&&Number.isFinite(record.position?.z))desired.set(record.position.x,0,record.position.z);
    try {
      const p=findVehicleSpace(world,desired,d.rad??(d.bike?.9:1.6));
      const v=makeVehicle(world.scene,p.x,p.z,Number.isFinite(record.heading)?record.heading:0,d.color,{...d,ownedId:record.id});
      applyMods(world,v);world.ownedVehicleInstances.set(record.id,v);world.parked.push(v);
    } catch { /* Keep ownership; the player can recover it when a bay is clear. */ }
  }
}
export function ownedVehicleSnapshot(world) {
  return (world.ownedVehicles||[]).map(record=>{
    const v=world.ownedVehicleInstances?.get(record.id);
    return v?{...record,descriptor:describeVehicle(v),position:{x:v.pos.x,z:v.pos.z},heading:v.heading}:record;
  });
}
export function buyOwnedVehicle(world, deal, account='cash', quote=null) {
 if(!deal||!VEHICLE_DEALS.includes(deal))throw Error('Choose a listed vehicle.');
 if(quote&&quote.account!==account)throw Error('Invalid finance account.');
 const id=quote?.id||crypto.randomUUID();
 const loanNext=quote?prepareVehicleLoan(world,deal,quote,id):null;
 return commitVehicleDelivery(world,deal,{id,account,amount:quote?quote.downPayment:deal.cost,loanNext,loanId:quote?.id,
   label:(quote?'Finance down payment: ':'Purchase: ')+deal.name,details:quote?{finance:{...quote}}:undefined,finance:quote});
}
export function commitVehicleDelivery(world,deal,{id,account='cash',amount,loanNext=null,loanId=null,label,details,finance=null,descriptor={},applyExtra=()=>{},rollbackExtra=()=>{}}){
 if(!deal||!VEHICLE_DEALS.includes(deal)||!id)throw Error('Invalid vehicle delivery.');
 if(world.ownedVehicles.some(r=>r.id===id||r.purchaseId===id))throw Error('This purchase has already been delivered.');
 const p=world.dealerDeliveryPos;
 if(!spaceForVehicle(world,p,deal.opts.rad??(deal.opts.bike?.9:1.6)))throw Error('Move the vehicle from the collection bay before buying another.');
 const loanBefore=world.bank.loanState,before=world.ownedVehicles;let car;
 const receipt=vehicleTransaction(world,{label:label||'Purchase: '+deal.name,amount,account,vehicleId:id,details,
 apply(){
   if(loanNext){loanNext.balanceCents=Math.round(world.bank.balance*100);world.bank.loanState=loanNext;}
   car=makeVehicle(world.scene,p.x,p.z,0,deal.color,{...deal.opts,...descriptor,ownedId:id,upgrades:{}});
   world.ownedVehicles=[...before,{id,catalogueId:deal.id,name:deal.name,purchaseId:id,loanId,finance,purchasePrice:details?.salePrice??deal.cost,descriptor:describeVehicle(car),position:{x:p.x,z:p.z},heading:0}];
   world.ownedVehicleInstances.set(id,car);world.parked.push(car);applyExtra(car);
 },rollback(){world.bank.loanState=loanBefore;world.ownedVehicles=before;world.ownedVehicleInstances.delete(id);if(car)removeVehicle(world,car);rollbackExtra();}});
 return {car,receipt};
}
export function recoverOwnedVehicle(world,id,origin,account='cash') {
  const record=world.ownedVehicles.find(r=>r.id===id);
  if(!record)throw new Error('Vehicle ownership record not found.');
  const old=world.ownedVehicleInstances.get(id);
  if(old===world.player.inCar)throw new Error('Exit this vehicle before recovering it.');
  const descriptor=old?describeVehicle(old):record.descriptor;
  const p=findVehicleSpace(world,origin,descriptor.rad??(descriptor.bike?.9:1.6),old);
  const components=normalizeComponents(descriptor.components,descriptor.health,descriptor.maxHealth);
  components.engine=Math.max(20,components.engine);components.drivetrain=Math.max(20,components.drivetrain);
  let car;
  const receipt=vehicleTransaction(world,{label:`Recovery: ${record.name}`,amount:250,account,vehicleId:id,
    apply(){
      const max=descriptor.maxHealth??(descriptor.bike?60:descriptor.monster?260:100);
      car=makeVehicle(world.scene,p.x,p.z,0,descriptor.color,{...descriptor,components,dead:false,health:Math.max(25,descriptor.health||0),maxHealth:max,ownedId:id});
      world.applyOwnedMods(world,car);world.ownedVehicleInstances.set(id,car);world.parked.push(car);
    },rollback(){if(car)removeVehicle(world,car);if(old)world.ownedVehicleInstances.set(id,old);else world.ownedVehicleInstances.delete(id);},
  });
  if(old)removeVehicle(world,old);
  return {car,receipt};
}
