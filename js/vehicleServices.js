import { vehicleSaleQuote } from './vehicleCatalog.js';
import { quoteComponentRepair, repairVehicleComponent, compatibleParts, installVehiclePart, effectiveVehicleStats, normalizeComponents, availableVehicleComponents } from './vehicleComponents.js';
﻿import { VEHICLE_DEALS, buyOwnedVehicle, recoverOwnedVehicle, findVehicleSpace } from './ownedVehicles.js';
import { vehicleTransaction } from './vehicleTransactions.js';
import { makeVehicle, resprayVehicle } from './car.js';
import { GARAGE_PAINTS } from './shops.js';
import { showToast } from './hud.js';
import { mission } from './missions.js';
import { quoteVehicleFinance, vehicleFinanceStatus, vehicleTransferBlock } from './vehicleFinance.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const SERVICES={paint:200,engine:800,armor:600,nitro:500,spikes:700,neon:300};
export function initVehicleServices(world, shops, save, hooks) {
  world.workshopPos=shops.garagePos;
  world.introJob={stage:['pickup','return','done'].includes(save.introJob?.stage)?save.introJob.stage:'new'};
  const workshopPads=()=>[shops.garagePos,world.city.authoredWorld?.socket('mendez-garage','socket_workshop_pad')].filter(Boolean);
  const nearestWorkshop=pos=>workshopPads().reduce((a,b)=>distance(pos,a)<=distance(pos,b)?a:b);
  let testDrive=null,stopTime=0,retryAfter=0;
  let pendingFinance=null, pendingService=null;
  const position=()=>world.player.inCar?.pos || world.player.pos;
  const navigate=(label,pos)=>{world.waypoint=pos.clone();world.destinationLabel=label;};
  const dealerReady=()=>{
    if(world.player.inCar||world.player.inHeli||distance(position(),world.dealerPos)>5.5)throw Error('Walk into the Auto Palace entrance first. Choose Destinations for guidance.');
  };
  const api={
    deals:VEHICLE_DEALS,
    get testDrive(){return testDrive;},
    navigate,
    destinations(){
      return [
        {label:'Auto Palace — V',pos:world.dealerPos},
        {label:'Workshop — G',pos:shops.garagePos},
        {label:'Mendez Motor Works',pos:world.city.authoredWorld?.socket('mendez-garage','socket_workshop_pad')},
        {label:'Harbour Mutual bank',pos:world.city.authoredWorld?.bankSockets().find(s=>s.name==='socket_loan_desk')?.pos},
        {label:'Nitro station',pos:world.nitroPos},
        ...(world.bank?.machines||[]).filter(m=>!m.dead).map((m,i)=>({label:`Bank / ATM ${i+1} — B`,pos:m.pos})),
        ...(world.gas?.stations||[]).map((s,i)=>({label:`Petrol station ${i+1}`,pos:s.pos})),
      ].filter(d=>d.pos).map(d=>({...d,distance:distance(position(),d.pos)}));
    },
    buy(index,account){dealerReady();if(testDrive)throw Error('End your test drive before buying.');return buyOwnedVehicle(world,VEHICLE_DEALS[index],account);},
    quoteFinance(index,downPayment,account){
      dealerReady();if(testDrive)throw Error('End your test drive first.');
      const quote=quoteVehicleFinance(world,VEHICLE_DEALS[index],downPayment,account);
      pendingFinance={index,quote};return quote;
    },
    cancelFinance(){pendingFinance=null;},
    finance(index,quote){
      dealerReady();if(testDrive)throw Error('End your test drive first.');
      if(!pendingFinance||pendingFinance.index!==index||pendingFinance.quote!==quote)throw Error('Review a new finance quote first.');
      const result=buyOwnedVehicle(world,VEHICLE_DEALS[index],quote.account,quote);pendingFinance=null;return result;
    },
    financeStatus(record){return vehicleFinanceStatus(world,record);},
    sellOwned(car,amount,label,apply=()=>{},rollback=()=>{}){
      const reason=vehicleTransferBlock(world,car);if(reason)throw Error(reason);
      if(!car.ownedId||!world.ownedVehicles.some(r=>r.id===car.ownedId))throw Error('Owned vehicle required.');
      const id=car.ownedId,records=world.ownedVehicles,instance=world.ownedVehicleInstances.get(id);
      const garage=shops.garageVeh,kind=world.garageKind,saved=world.garageVehicleSaved;
      const bays=(world.lockup?.bays||[]).filter(b=>b.desc?.ownedId===id).map(b=>({bay:b,desc:b.desc,veh:b.veh}));
      return vehicleTransaction(world,{label,amount,credit:true,vehicleId:id,
        apply(){
          world.ownedVehicles=records.filter(r=>r.id!==id);world.ownedVehicleInstances.delete(id);
          if(shops.garageVeh?.ownedId===id){shops.garageVeh=null;world.garageKind=null;}
          if(world.garageVehicleSaved?.ownedId===id)world.garageVehicleSaved=null;
          for(const {bay}of bays){bay.desc=null;bay.veh=null;}apply();
        },rollback(){
          world.ownedVehicles=records;world.ownedVehicleInstances.set(id,instance);
          shops.garageVeh=garage;world.garageKind=kind;world.garageVehicleSaved=saved;
          for(const {bay,desc,veh}of bays){bay.desc=desc;bay.veh=veh;}rollback();
        },
      });
    },
    quoteSale(id){const record=world.ownedVehicles.find(r=>r.id===id),car=world.ownedVehicleInstances.get(id);const reason=vehicleTransferBlock(world,car);if(reason)throw Error(reason);return vehicleSaleQuote(record,car);},
    sell(id,quote){
      dealerReady();const car=world.ownedVehicleInstances.get(id),current=api.quoteSale(id);
      if(!quote||quote.vehicleId!==id||quote.amount!==current.amount)throw Error('Review the current resale offer.');
      if(!car||distance(car.pos,world.dealerPos)>30)throw Error('Bring the vehicle to the showroom before selling.');
      const receipt=api.sellOwned(car,quote.amount,'Vehicle resale');
      world.scene.remove(car.mesh);for(const list of [world.parked,world.traffic,world.cops])if(list){const i=list.indexOf(car);if(i>=0)list.splice(i,1);}return receipt;
    },
    locate(id){const v=world.ownedVehicleInstances.get(id);if(!v||v.dead)throw Error('This vehicle needs recovery.');navigate(world.ownedVehicles.find(r=>r.id===id).name,v.pos);},
    recover(id,account){
      if(testDrive)throw Error('End your test drive first.');
      const pad=nearestWorkshop(position());
      if(distance(position(),pad)>6)throw Error('Visit a workshop (G) to collect a recovered vehicle.');
      const result=recoverOwnedVehicle(world,id,pad,account);
      if(shops.garageVeh?.ownedId===id)shops.garageVeh=result.car;
      for(const bay of world.lockup?.bays||[])if(bay.desc?.ownedId===id)bay.veh=result.car;
      return result;
    },
    repairCost(v){return quoteComponentRepair(v).cost;},
    components(v){const all=normalizeComponents(v.components,v.health,v.maxHealth);return Object.fromEntries(availableVehicleComponents(v).map(key=>[key,all[key]]));},
    parts(v){return compatibleParts(v);},
    quoteService(id,key){
      const v=world.ownedVehicleInstances.get(id);if(!v||v.dead)throw Error('Recover this vehicle first.');
      const sample={...v,components:structuredClone(v.components),parts:{...v.parts}};
      const before=effectiveVehicleStats(v);let price,label=key;
      if(key==='armor'&&!availableVehicleComponents(v).includes('chassis'))throw Error('This model has no chassis upgrade slot.');
      if(key==='repair'||key.startsWith('repair:')){const q=quoteComponentRepair(v,key==='repair'?'all':key.slice(7));price=q.cost;label=q.label;repairVehicleComponent(sample,q.key);}
      else if(key.startsWith('part:')){const part=compatibleParts(v).find(p=>p.id===key.slice(5));if(!part)throw Error('Part unavailable.');price=part.cost;label=part.label;installVehiclePart(sample,part.id);}
      else {
        if(!(key in SERVICES))throw Error('Service unavailable.');
        if(key!=='paint'&&v.upgrades[key])throw Error('This upgrade is already fitted.');
        price=SERVICES[key];
        if(key==='engine'&&!sample.engineMod){sample.accel=(sample.accel??17)+7;sample.top=(sample.top??38)+10;}
        if(key==='armor'&&!sample.armorMod){sample.maxHealth=Math.max(sample.maxHealth||100,200);sample.health=Math.max(sample.health,sample.maxHealth);}
      }
      pendingService={id,key,price,label,before:{...before,maxHealth:v.maxHealth},after:{...effectiveVehicleStats(sample),maxHealth:sample.maxHealth},note:key==='paint'?'Paint colour preview: '+GARAGE_PAINTS[v.upgrades.paint==null?0:(v.upgrades.paint+1)%GARAGE_PAINTS.length]:key==='nitro'?'Increases the supported nitro boost duration; current fuel and nitro are kept.':key==='spikes'?'Adds ram spikes and increases impact damage.':key==='neon'?'Adds underbody lighting.':null,fingerprint:JSON.stringify([v.health,v.maxHealth,v.components,v.parts,v.upgrades])};
      return pendingService;
    },
    cancelService(){pendingService=null;},
    confirmService(quote,account){
      if(!quote||pendingService!==quote)throw Error('Review a new service quote.');
      const v=world.ownedVehicleInstances.get(quote.id);
      if(!v||JSON.stringify([v.health,v.maxHealth,v.components,v.parts,v.upgrades])!==quote.fingerprint)throw Error('Vehicle condition changed. Review a new quote.');
      const result=api.service(quote.id,quote.key,account);pendingService=null;return result;
    },
    service(id,key,account){
      const v=world.ownedVehicleInstances.get(id);
      if(!v||v.dead)throw Error('Recover this vehicle first.');
      if(!workshopPads().some(p=>distance(position(),p)<=6&&distance(v.pos,p)<=6)||v.vel.length()>.5)throw Error('Park this vehicle on the workshop pad (G) and stop first.');
      if(key==='armor'&&!availableVehicleComponents(v).includes('chassis'))throw Error('This model has no chassis upgrade slot.');
      const repairKey=key==='repair'?'all':key.startsWith('repair:')?key.slice(7):null;
      const part=key.startsWith('part:')?compatibleParts(v).find(p=>p.id===key.slice(5)):null;
      if(!repairKey&&!part&&!(key in SERVICES))throw Error('Unknown workshop service.');
      if(!repairKey&&!part&&key!=='paint'&&v.upgrades[key])throw Error('This upgrade is already fitted to this vehicle.');
      const price=repairKey?quoteComponentRepair(v,repairKey).cost:part?part.cost:SERVICES[key];
      if(!price)throw Error('This vehicle is already fully repaired.');
      const fields=['health','maxHealth','accel','top','engineMod','armorMod','bigNitro','spikeMod','spikes','neonMod','paintColor'];
      const before=Object.fromEntries(fields.map(k=>[k,v[k]])),mods={...v.upgrades},components=structuredClone(v.components),parts={...v.parts},children=new Set(v.mesh.children);
      return vehicleTransaction(world,{label:`Workshop: ${key}`,amount:price,account,vehicleId:id,
        apply(){
          if(repairKey)repairVehicleComponent(v,repairKey);
          else if(part)installVehiclePart(v,part.id);
          else {
            v.upgrades={...v.upgrades,[key]:key==='paint'?(v.upgrades.paint==null?0:(v.upgrades.paint+1)%GARAGE_PAINTS.length):true};
            world.applyOwnedMods(world,v);
          }
        },rollback(){
          Object.assign(v,before);v.upgrades=mods;v.components=components;v.parts=parts;
          for(const child of [...v.mesh.children])if(!children.has(child))v.mesh.remove(child);
          if(before.paintColor)resprayVehicle(v,before.paintColor);
        },
      });
    },
    startTestDrive(index){
      dealerReady();
      if(testDrive||world.campaignService?.status().active||mission.active||['pickup','return'].includes(world.introJob.stage))throw Error('Finish the current drive or mission first.');
      const deal=VEHICLE_DEALS[index];if(!deal)throw Error('Choose a listed vehicle.');
      const p=findVehicleSpace(world,world.dealerDeliveryPos,deal.opts.rad??(deal.opts.bike?.9:1.6));
      const car=makeVehicle(world.scene,p.x,p.z,0,deal.color,{...deal.opts,temporary:true});
      testDrive={car,name:deal.name,remaining:120};world.parked.push(car);hooks.enterCar(car);
      showToast('TEST DRIVE — 120 seconds. Return through F4 when ready.');
    },
    endTestDrive(){
      if(!testDrive)return;
      const car=testDrive.car;
      if(world.player.inCar===car)hooks.exitCar();
      world.scene.remove(car.mesh);
      for(const list of [world.parked,world.traffic,world.cops])if(list){const i=list.indexOf(car);if(i>=0)list.splice(i,1);}
      world.player.pos.copy(world.dealerPos);world.player.vel?.set(0,0,0);
      testDrive=null;showToast('Test drive returned. No charge; this vehicle is not owned.');
    },
    startIntro(){
      if(world.introJob.stage!=='new')throw Error('This job has already started or finished.');
      if(mission.active||world.campaignService?.status().active||testDrive)throw Error('Finish your current mission or test drive first.');
      if(distance(position(),shops.garagePos)>6)throw Error('Meet Rosa at the workshop (G) first.');
      const before=world.introJob;
      world.introJob={stage:'pickup'};
      if(world.onSave?.()!==true){world.introJob=before;throw Error('Could not save the job. Try again.');}
      navigate('Rosa: collect parts at Auto Palace',world.dealerDeliveryPos);
      showToast('ROSA: Kai Dena, collect my parts from Auto Palace. Bring them back in one piece.');
    },
    guideIntro(){
      if(world.introJob.stage==='pickup')navigate('Rosa: collect parts',world.dealerDeliveryPos);
      else if(world.introJob.stage==='return')navigate('Rosa: return to workshop',shops.garagePos);
      else navigate('Rosa — workshop',shops.garagePos);
    },
    update(dt){
      if(testDrive){testDrive.remaining-=dt;if(testDrive.remaining<=0||testDrive.car.dead||world.player.health<=0)api.endTestDrive();}
      retryAfter=Math.max(0,retryAfter-dt);
      const stage=world.introJob.stage,car=world.player.inCar;
      const target=stage==='pickup'?world.dealerDeliveryPos:shops.garagePos;
      if(!['pickup','return'].includes(stage)||mission.active||!car||car.dead||car.temporary||car.vel.length()>.5||distance(car.pos,target)>5||retryAfter){stopTime=0;return;}
      stopTime+=dt;if(stopTime<2)return;stopTime=0;
      const before=world.introJob;
      try {
        if(stage==='pickup'){
          world.introJob={stage:'return'};
          if(world.onSave?.()!==true){world.introJob=before;throw Error('Could not save collection.');}
          navigate('Rosa: return to workshop',shops.garagePos);
          showToast('KAI DENA: Parts collected. ROSA: Good. Park on my workshop pad.');
        } else {
          vehicleTransaction(world,{label:'Rosa: First Run reward',amount:250,credit:true,
            apply(){world.introJob={stage:'done'};},rollback(){world.introJob=before;}});
          showToast('ROSA: Good work, Kai. $250 paid. First Run complete.');
        }
      } catch(error){retryAfter=5;showToast(error.message);}
    },
    guidance(){
      const parts=[];
      if(testDrive)parts.push(`TEST DRIVE: ${Math.ceil(testDrive.remaining)}s — F4 to return`);
      const stage=world.introJob.stage;
      if(stage==='pickup')parts.push('ROSA: drive to Auto Palace collection bay; stop for 2s');
      if(stage==='return')parts.push('ROSA: drive back to workshop (G); stop for 2s');
      if(world.waypoint){
        const p=position(),w=world.waypoint;
        const bearing=(Math.atan2(w.x-p.x,-(w.z-p.z))*180/Math.PI+360)%360;
        const dir=['N','NE','E','SE','S','SW','W','NW'][Math.round(bearing/45)%8];
        parts.push(`${world.destinationLabel||'Waypoint'}: ${Math.round(distance(p,w))} m ${dir} (direct bearing)`);
      }
      return parts.join(' · ');
    },
  };
  world.vehicleServices=api;return api;
}
