// Persistent mechanical condition and compatible parts. Pure: no renderer or wallet.
// Conditions are percentages; purchase/repair billing belongs to vehicleServices.
export const VEHICLE_COMPONENT_KEYS = Object.freeze(['engine','drivetrain','chassis','brakes','suspension','tyres']);
const LABELS = Object.freeze({engine:'Engine',drivetrain:'Drivetrain',chassis:'Chassis / body',brakes:'Brakes',suspension:'Suspension / steering',tyres:'Tyres'});
const REPAIR_FULL = Object.freeze({engine:500,drivetrain:400,chassis:300,brakes:180,suspension:240,tyres:120});
const CLASS_COST = Object.freeze({bike:.7,compact:.85,car:1,performance:1.3,monster:1.5,tank:3});
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
const roundCondition = n => Math.round(clamp(n,0,100)*100)/100;
const healthLimit = car => Number.isFinite(car.maxHealth) && car.maxHealth>0 ? car.maxHealth : car.bike?60:car.monster?260:100;
const healthyRatio = (health,maxHealth) => Number.isFinite(health) && Number.isFinite(maxHealth) && maxHealth>0 ? clamp(health/maxHealth,0,1) : 1;

export function normalizeComponents(value,health=100,maxHealth=100) {
  const fallback=roundCondition(healthyRatio(health,maxHealth)*100);
  const result={version:1};
  for(const key of VEHICLE_COMPONENT_KEYS)result[key]=Number.isFinite(value?.[key])?roundCondition(value[key]):fallback;
  return result;
}
export function vehicleComponentClass(car) {
  if(car.tank)return 'tank';
  if(car.bike)return 'bike';
  if(car.monster)return 'monster';
  if(['compact','car','performance'].includes(car.componentClass))return car.componentClass;
  if(car.modelId==='oc_hatch_01')return 'compact';
  if((car.top??38)>=48)return 'performance';
  return 'car';
}
// Asset contracts can omit upgrade slots; procedural vehicles keep their legacy set.
export function availableVehicleComponents(car) {
  const keys = Array.isArray(car.componentSlots) ? car.componentSlots : VEHICLE_COMPONENT_KEYS;
  return VEHICLE_COMPONENT_KEYS.filter(k => keys.includes(k) && (!car.tank || !['tyres','suspension'].includes(k)));
}
const PART_TEMPLATES = Object.freeze([
  {key:'engine',name:'Street engine',cost:900,effects:{accelMul:1.14}},
  {key:'drivetrain',name:'Road gearing',cost:650,effects:{accelMul:1.04,topMul:1.10}},
  {key:'chassis',name:'Reinforced chassis',cost:750,effects:{damageMul:.85}},
  {key:'brakes',name:'Sport brakes',cost:380,effects:{brakeMul:1.22}},
  {key:'suspension',name:'Road suspension',cost:460,effects:{steerMul:1.10,gripMul:1.06}},
  {key:'tyres',name:'Road tyre set',cost:260,effects:{gripMul:1.16}},
]);
function partCatalog(car) {
  const category=vehicleComponentClass(car),factor=CLASS_COST[category];
  // Tracked vehicles have no tyre or conventional suspension kit.
  return PART_TEMPLATES.filter(p=>availableVehicleComponents(car).includes(p.key)).map(p=>({
    id:category+'-'+p.key+'-road-v1',key:p.key,label:(category==='bike'?'Motorcycle ':category==='monster'?'Heavy-duty ':'')+p.name,
    cost:Math.ceil(p.cost*factor),effects:{...p.effects},vehicleClass:category,
  }));
}
export function normalizeVehicleParts(car,parts=car.parts) {
  const result={};
  for(const part of partCatalog(car))if(parts?.[part.key]===part.id)result[part.key]=part.id;
  return result;
}
export function compatibleParts(car) {
  const fitted=normalizeVehicleParts(car);
  return partCatalog(car).map(p=>({...p,installed:fitted[p.key]===p.id}));
}
export function installVehiclePart(car,id) {
  if(car.dead)throw Error('Recover this vehicle before fitting parts.');
  const part=partCatalog(car).find(p=>p.id===id);
  if(!part)throw Error('This part is not compatible with this vehicle.');
  const parts=normalizeVehicleParts(car);
  if(parts[part.key]===id)throw Error('This part is already installed.');
  car.parts={...parts,[part.key]:id};
  return {...part,effects:{...part.effects},installed:true};
}
export function componentEffects(car) {
  const c=normalizeComponents(car.components,car.health,healthLimit(car));
  const available=availableVehicleComponents(car);
  for (const key of VEHICLE_COMPONENT_KEYS) if (!available.includes(key)) c[key]=100;
  const propulsion=!car.dead && (!Number.isFinite(car.health)||car.health>0) && c.engine>0 && c.drivetrain>0;
  const factors={propulsion,accelMul:propulsion?(.25+.75*c.engine/100)*(.3+.7*c.drivetrain/100):0,
    topMul:propulsion?(.45+.55*c.engine/100)*(.45+.55*c.drivetrain/100):0,
    brakeMul:.15+.85*c.brakes/100,steerMul:(.4+.6*c.suspension/100)*(.7+.3*c.chassis/100),
    gripMul:(.18+.82*c.tyres/100)*(.65+.35*c.suspension/100),damageMul:1};
  const category=vehicleComponentClass(car);
  for(const part of PART_TEMPLATES) {
    if(!available.includes(part.key))continue;
    if(car.parts?.[part.key]!==category+'-'+part.key+'-road-v1')continue;
    for(const [key,n]of Object.entries(part.effects))factors[key]*=n;
  }
  return factors;
}
export function effectiveVehicleStats(car) {
  const effects=componentEffects(car);
  return {...effects,accel:(car.accel??(car.bike?26:17))*effects.accelMul,
    top:(car.top??(car.bike?55:38))*effects.topMul,
    braking:26*effects.brakeMul,steering:2.1*effects.steerMul,grip:8*effects.gripMul};
}
export function applyVehicleDamage(car,amount,context={}) {
  if(!Number.isFinite(amount)||amount<0)throw Error('Invalid vehicle damage.');
  if(context.component && !VEHICLE_COMPONENT_KEYS.includes(context.component))throw Error('Unknown vehicle component.');
  if(car.dead || !amount)return 0;
  const max=healthLimit(car),before=Number.isFinite(car.health)?Math.max(0,car.health):max;
  const conditions=normalizeComponents(car.components,before,max);
  const damage=amount*componentEffects(car).damageMul;
  car.health=Math.max(0,before-damage);
  const points=damage/max*100;
  const impact={engine:.6,drivetrain:.45,chassis:1,brakes:.35,suspension:.7,tyres:.5};
  const gunfire={engine:.35,drivetrain:.2,chassis:1,brakes:.15,suspension:.2,tyres:.25};
  const weights=context.kind==='gunfire'?gunfire:impact;
  for(const key of availableVehicleComponents(car)) {
    const multiplier=context.component?(key===context.component?1:0):weights[key];
    conditions[key]=roundCondition(conditions[key]-points*multiplier);
  }
  car.components=conditions;
  return before-car.health;
}
export function quoteComponentRepair(car,key='all') {
  if(key!=='all' && !VEHICLE_COMPONENT_KEYS.includes(key))throw Error('Unknown vehicle component.');
  const c=normalizeComponents(car.components,car.health,healthLimit(car));
  const available=availableVehicleComponents(car);
  if(key!=='all' && !available.includes(key))throw Error('This vehicle does not have that component slot.');
  const keys=key==='all'?available:[key],factor=CLASS_COST[vehicleComponentClass(car)];
  const scalarMissing=Math.max(0,healthLimit(car)-(Number.isFinite(car.health)?car.health:healthLimit(car)));
  let cost=0;
  for(const k of keys) {
    const mechanical=(100-c[k])/100*REPAIR_FULL[k]*factor;
    cost+=Math.ceil(k==='chassis'?Math.max(mechanical,scalarMissing*2):mechanical);
  }
  // Full repair still restores collision health on bikes without a chassis slot.
  if(key==='all' && !available.includes('chassis'))cost+=Math.ceil(scalarMissing*2);
  return {key,label:key==='all'?'Full mechanical repair':LABELS[key],cost,components:[...keys],
    healthRestore:key==='all'||keys.includes('chassis')?scalarMissing:0,
    conditions:Object.fromEntries(keys.map(k=>[k,{before:c[k],after:100}]))};
}
export function repairVehicleComponent(car,key='all') {
  if(car.dead)throw Error('Recover this vehicle before repairing it.');
  const quote=quoteComponentRepair(car,key);
  const c=normalizeComponents(car.components,car.health,healthLimit(car));
  for(const k of quote.components)c[k]=100;
  car.components=c;
  if(key==='all'||quote.components.includes('chassis'))car.health=healthLimit(car);
  return quote;
}
