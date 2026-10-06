import { runtime } from './runtime.js';

// Stable first four indices preserve existing purchase and mission references.
export const VEHICLE_DEALS=Object.freeze([
 {id:'sport-coupe',tier:'Performance',kind:'car',cost:2500,name:'Supercar',description:'Fast road car; higher running and repair costs.',opts:{accel:26,top:58,componentClass:'performance'},color:'#c1121f'},
 {id:'sport-bike',tier:'Performance',kind:'bike',cost:1500,name:'Superbike',description:'Fast, light motorcycle with limited impact protection.',opts:{bike:true,accel:32,top:66},color:'#f5a800'},
 {id:'heavy-truck',tier:'Utility',kind:'car',cost:4000,name:'Monster Truck',description:'Heavy off-road chassis and a large fuel tank.',opts:{accel:20,top:44,rad:2.2,health:260,monster:true},color:'#3a6b2a'},
 {id:'vireo-400',tier:'Budget',kind:'car',cost:900,name:'Vireo 400',description:'Affordable compact with a 38-litre tank.',opts:{modelId:'oc_hatch_01',accel:16,top:34,rad:1.4,componentClass:'compact'},color:'#b84f27'},
 {id:'commuter-bike',tier:'Budget',kind:'bike',cost:600,name:'Coast 125',description:'Economical commuter; gentle acceleration and inexpensive parts.',opts:{modelId:'oc_scooter_01',bike:true,accel:18,top:36,fuelCapacityLiters:12},color:'#66bfb1'},
 {id:'everyday-sedan',tier:'Everyday',kind:'car',cost:1200,name:'Marina Sedan',description:'Balanced family car for delivery work and longer trips.',opts:{modelId:'basic-sedan',accel:18,top:40,componentClass:'car'},color:'#628f9d'},
 {id:'marquesa-type-9',tier:'Performance',kind:'car',cost:5200,name:'Marquesa Type-9',description:'Distinctive performance coupe with a 78-litre tank.',opts:{modelId:'oc_exotic_01',accel:30,top:64,componentClass:'performance'},color:'#8c2334'},
 ...(runtime.profile.vehicleCatalogue || [])
]);
export function catalogueVehicle(id){return VEHICLE_DEALS.find(d=>d.id===id);}
export function vehicleSaleQuote(record,car){
 if(!record||!car||car.dead)throw Error('Recover the vehicle before selling it.');
 const condition=Math.max(0,Math.min(1,car.health/(car.maxHealth||100)));
 return {vehicleId:record.id,amount:Math.floor(record.purchasePrice*(.25+.35*condition)),condition};
}
