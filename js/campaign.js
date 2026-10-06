import { CAMPAIGN_MISSIONS, CAMPAIGN_LOCATIONS, campaignMission } from './campaignContent.js';
import { CAMPAIGN_FAILURE_CAPTIONS, CAMPAIGN_RECAPS } from './campaignRecaps.js';
import { normalizeComponents } from './vehicleComponents.js';
const clone = value => JSON.parse(JSON.stringify(value));
const finite = n => Number.isFinite(n);
const emptyState = () => ({version:1,completed:{},active:null,flags:{},choices:{}});
const distance = (a,b) => a&&b ? Math.hypot(a.x-b.x,a.z-b.z) : Infinity;
const missionOf = active => active && campaignMission(active.id);
const record = value => !!value && typeof value==='object' && !Array.isArray(value);
const validChoices = value => record(value) && Object.entries(value).every(([key,v])=>key==='rosaCar' && ['keep','sell'].includes(v));
const validFlags = value => record(value) && Object.entries(value).every(([key,v])=>Object.values(CAMPAIGN_MISSIONS).some(m=>Object.hasOwn(m.outcomes,key)) && typeof v==='boolean');
function dialogueFor(stage,active,state) {
  if(stage.variants)return stage.variants[active?.choices?.[stage.choiceKey]]||[];
  if(stage.afterFlag && state.flags?.[stage.afterFlag])return stage.afterLines;
  return stage.lines||[];
}
function validScenarioState(value){
 if(value===undefined)return true;
 if(!record(value)||Object.keys(value).some(k=>k!=='trial'))return false;
 const t=value.trial;if(t==null)return true;
 return record(t)&&t.id==='rook-trial-01'&&t.modelId==='oc_exotic_01'&&finite(t.health)&&t.health>=0&&t.health<=10000&&finite(t.fuelLitres)&&t.fuelLitres>=0&&t.fuelLitres<=1000&&typeof t.returned==='boolean'&&record(t.components)&&Object.values(t.components).every(n=>finite(n)&&n>=0&&n<=100);
}
function validCampaignState(value) {
  if(!validScenarioState(value?.scenarioState)||!record(value)||value.version!==1||!record(value.completed)||!validFlags(value.flags)||!validChoices(value.choices))return false;
  for(const [id,done]of Object.entries(value.completed))if(!campaignMission(id)||!record(done)||!Number.isSafeInteger(done.reward)||done.reward<0||!finite(done.completedAt)||done.completedAt<0||!validChoices(done.choices||{}))return false;
  const a=value.active;if(a===null)return true;
  if(!record(a))return false;const m=missionOf(a);
  if(!m||value.completed[a.id]||!Number.isInteger(a.stage)||a.stage<0||a.stage>=m.stages.length)return false;
  const s=m.stages[a.stage],d=a.dialogueIndex??0,i=a.actionIndex??0;
  if(a.stageKey!==undefined&&a.stageKey!==s.key)return false;
  if(!Number.isInteger(d)||d<0||!Number.isInteger(i)||i<0||!validChoices(a.choices||{})||!record(a.observations||{}))return false;
  if(a.failure!=null&&(typeof a.failure!=='string'||a.failure.length>500))return false;
  if(s.type==='dialogue'?(d>=dialogueFor(s,a,value).length||i!==0):d!==0)return false;
  if(s.type==='interact'?i>=s.actions.length:i!==0)return false;
  return true;
}


export function initCampaign(world,save={},hooks={}) {
  let loadError=null;
  const candidate=save.campaign;
  if(candidate==null)world.campaign=emptyState();
  else {
    // Invalid and unknown save versions remain intact for recovery.
    const valid=validCampaignState(candidate);
    world.campaign=valid?clone(candidate):candidate;
    if(!valid)loadError='Campaign save needs recovery; the original data is preserved.';
    else if(candidate.active)world.campaign.active={...clone(candidate.active),dialogueIndex:candidate.active.dialogueIndex||0,actionIndex:candidate.active.actionIndex||0,choices:clone(candidate.active.choices||{}),observations:clone(candidate.active.observations||{})};
  }
  let replayState=null,workCar=null,hold=0,retryCooldown=0,lastError=loadError,notice='';
  const current=()=>replayState||world.campaign?.active;
  const enabled=()=>{if(loadError)throw Error(loadError);};
  const focus=()=>world.player?.inCar?.pos||world.player?.pos;
  const speed=()=>world.player?.inCar?.vel?.length?.()||0;
  const runningOther=()=>world.mission?.active||world.vehicleServices?.testDrive||['pickup','return'].includes(world.introJob?.stage);
  function location(id,stage=missionOf(current())?.stages[current()?.stage]) {
    const supplied=hooks.resolveLocation?.(id,current()?.id,stage);
    let value=supplied?.position||supplied;
    if(!value) {
      if(id==='workshop'||id==='office')value=world.workshopPos;
      if(id==='showroom')value=world.dealerPos;
      if(id==='bank')value=world.bank?.machines?.find(m=>!m.dead)?.pos;
      if(id==='petrol')value=world.gas?.stations?.[0]?.pos;
    }
    if(!value) {
      const spec=CAMPAIGN_LOCATIONS[id];if(!spec)throw Error('Unknown campaign destination.');
      const xs=world.city?.roadXs||[],zs=world.city?.roadZs||[];
      const coordinate=(list,index)=>list.length?list[Math.round(index/10*(list.length-1))]:-300+index*60;
      value={x:coordinate(xs,spec.road[0]),z:coordinate(zs,spec.road[1])};
    }
    if(!finite(value.x)||!finite(value.z))throw Error('Campaign destination is unavailable.');
    const result=world.player?.pos?.clone?.()||{x:0,y:0,z:0};
    result.x=value.x;result.y=finite(value.y)?value.y:0;result.z=value.z;return result;
  }
  function guide() {
    const a=current(),m=missionOf(a),stage=m?.stages[a.stage];
    if(!stage)return;
    try{const pos=readiness(stage).position;if(hooks.navigate)hooks.navigate(stage.label,pos);else{world.waypoint=pos;world.destinationLabel=stage.label;}}
    catch(e){lastError=e.message;}
    if(stage.type==='dialogue')try{hooks.showDialogue?.(dialogueFor(stage,a,world.campaign)[a.dialogueIndex||0],m);}catch(e){lastError=e.message;}
  }
  function commit(change) {
    enabled();
    if(replayState){const before=clone(replayState);try{const snapshot=hooks.checkpoint?.();if(snapshot)replayState.scenarioState=clone(snapshot);change(replayState);lastError=null;}catch(e){replayState=before;throw e;}return;}
    const before=clone(world.campaign),money=world.money,receipts=world.vehicleReceipts;
    try{const snapshot=hooks.checkpoint?.();if(snapshot){if(!validScenarioState(snapshot))throw Error('Story vehicle checkpoint is invalid.');world.campaign.scenarioState=clone(snapshot);}change(world.campaign.active);if(world.onSave?.()!==true)throw Error('Could not save campaign progress.');lastError=null;}
    catch(error){world.campaign=before;world.money=money;world.vehicleReceipts=receipts;lastError=error.message;throw error;}
  }
  function release() {const old=workCar;workCar=null;if(old)try{hooks.releaseVehicle?.(old);}catch(e){lastError=e.message;}}
  function requestVehicle() {
    enabled();const a=current(),m=missionOf(a);if(!m?.vehicle)return null;
    const special=hooks.scenarioVehicle?.(m,{...m.stages[a.stage],index:a.stage});
    if(special){if(workCar&&workCar!==special)release();workCar=special;return workCar;}
    if(workCar&&!workCar.dead&&!workCar.scenarioRemoved)return workCar;
    const provided=hooks.provideVehicle?.({missionId:m.id,vehicle:m.vehicle,replay:!!replayState,position:location(m.stages[a.stage].location)});
    if(provided&&typeof provided.then==='function')throw Error('Campaign vehicle hook must return its vehicle immediately.');
    workCar=provided?.car||provided||null;
    if(!workCar)notice='Use an available vehicle or request the supplied work vehicle. No purchase or loan is required.';
    else notice='A supplied work vehicle is ready. It is not purchased property.';
    return workCar;
  }
  function availability(m) {
    if(world.campaign?.completed?.[m.id])return 'Completed. Choose replay to revisit without rewards.';
    if(m.requires.some(id=>!world.campaign?.completed?.[id]))return 'Complete the preceding story first.';
    if(m.optional && world.campaign?.completed?.M36 && !world.campaign?.completed?.M44)return 'Character stories resume after the emergency transfers.';
    return null;
  }
  function list() {
    return CAMPAIGN_MISSIONS.map(m=>{const reason=loadError||availability(m),done=!!world.campaign?.completed?.[m.id];return {
      id:m.id,title:m.title,chapter:m.chapter,contact:m.contact,summary:!reason||done?m.summary:'',reward:m.reward,
      optional:m.optional,available:!reason,completed:done,active:current()?.id===m.id,lockedReason:reason,
    };});
  }
  function readiness(stage) {
    let pos=location(stage.location,stage),radius=stage.radius||9;
    const scenario=hooks.readiness?.({...stage,position:pos,index:current()?.stage},missionOf(current()))||{};
    pos=scenario.position||pos;radius=scenario.radius??radius;
    const type=scenario.type||stage.type,d=distance(focus(),pos);
    let reason='';
    if(d>radius)reason='Reach '+(CAMPAIGN_LOCATIONS[stage.location]?.label||stage.location)+'.';
    else if((scenario.onFoot??stage.onFoot)&&world.player.inCar)reason='Exit the vehicle and continue on foot with the receiving group.';
    else if(type==='drive'&&!world.player.inCar)reason='Use the supplied work vehicle or another suitable vehicle.';
    else if(world.player.inCar?.dead)reason='The vehicle is disabled. Retry from this checkpoint.';
    else if(speed()>.6)reason='Stop safely before continuing.';
    else if(world.wanted>0)reason='Finish the active pursuit before this meeting or handover.';
    else if(Math.abs((focus()?.y||0)-(pos.y||0))>3)reason='Reach the meeting at street level.';
    else if(scenario.ready===false)reason=scenario.reason||'Complete the current physical objective.';
    return {position:pos,distance:d,ready:!reason,reason,type,radius};
  }
  function currentStage() {
    if(loadError)return null;
    const a=current(),m=missionOf(a);if(!m)return null;
    const s=m.stages[a.stage],r=readiness(s),index=a.dialogueIndex||0,actionIndex=a.actionIndex||0;
    const lines=dialogueFor(s,a,world.campaign);
    return {...s,...r,lines,index:a.stage,total:m.stages.length,replay:!!replayState,
      dialogue:s.type==='dialogue'?lines[index]||null:null,dialogueIndex:index,
      action:s.type==='interact'?s.actions[actionIndex]||null:null,actionIndex,
      holdProgress:s.holdSeconds?Math.min(1,hold/s.holdSeconds):0,failure:a.failure||null,observations:clone(a.observations||{})};
  }
  function status() {
    const a=current(),m=missionOf(a),completed=Object.keys(world.campaign?.completed||{}).filter(id=>campaignMission(id));
    return {state:loadError?'failed':a?.failure?'failed':replayState?'replay':a?'active':'idle',active:a?.id||null,mission:m||null,
      completed:completed.length,mainCompleted:completed.filter(id=>id[0]==='M').length,total:CAMPAIGN_MISSIONS.length,
      message:a?.failure||lastError||notice||(a?m.stages[a.stage].label:'Choose an available story.'),lastError};
  }
  function newAttempt(id) {return {id,stage:0,stageKey:id+':0',dialogueIndex:0,actionIndex:0,failure:null,choices:{},observations:{}};}
  function start(id) {
    enabled();if(current())throw Error('Finish or leave the current story first.');
    if(runningOther())throw Error('Finish the active job or test drive first.');
    if(world.wanted>0)throw Error('Return when the active police pursuit has ended.');
    const m=campaignMission(id);if(!m)throw Error('Unknown story.');
    const reason=availability(m);if(reason)throw Error(reason);
    commit(()=>{world.campaign.active=newAttempt(id);});hold=0;notice='';guide();
    try{requestVehicle();}catch(e){lastError=e.message;}return status();
  }
  function replay(id) {
    enabled();if(current()||runningOther())throw Error('Finish the active story, job or test drive first.');
    if(!world.campaign.completed[id])throw Error('Complete this story before replaying it.');
    if(world.wanted>0)throw Error('Return when the active police pursuit has ended.');
    hooks.beforeReplay?.();
    replayState={...newAttempt(id),scenarioState:clone(world.campaign.scenarioState||{})};hooks.reset?.();hold=0;notice='Memory replay: no new rewards or permanent campaign changes.';guide();
    try{requestVehicle();}catch(e){lastError=e.message;}return status();
  }
  function advance(change=()=>{}) {
    const a=current(),m=missionOf(a),last=a.stage===m.stages.length-1;
    if(last&&replayState){replayState=null;hold=0;notice='Replay complete. Campaign progress and rewards are unchanged.';release();hooks.reset?.();hooks.afterReplay?.('complete');return;}
    commit(active=>{
      change(active);
      if(!last){active.stage++;active.stageKey=m.stages[active.stage].key;active.dialogueIndex=0;active.actionIndex=0;active.failure=null;return;}
      if(world.campaign.completed[m.id])throw Error('This story reward was already recorded.');
      const cash=world.money??0;if(!finite(cash)||cash+m.reward>Number.MAX_SAFE_INTEGER)throw Error('Wallet is unavailable. Campaign reward was not applied.');
      world.campaign.completed[m.id]={completedAt:Date.now(),reward:m.reward,choices:clone(active.choices||{})};
      Object.assign(world.campaign.flags,m.outcomes||{});
      Object.assign(world.campaign.choices,active.choices||{});
      world.money=cash+m.reward;
      if(m.reward)world.vehicleReceipts=[{id:'campaign:'+m.id,label:'Story: '+m.title,amount:m.reward,account:'cash',credit:true,time:Date.now(),balanceBefore:cash,balanceAfter:world.money},...(world.vehicleReceipts||[])].slice(0,100);
      world.campaign.active=null;
    });
    hold=0;if(last){notice=CAMPAIGN_RECAPS[m.id]||m.title+' complete.';release();hooks.reset?.();}else{try{requestVehicle();}catch(e){lastError=e.message;}guide();}
  }
  function requireStage(types) {
    enabled();const a=current();if(!a)throw Error('Choose a story first.');
    if(a.failure)throw Error('Retry or leave this failed checkpoint first.');
    const s=currentStage();if(!types.includes(s.type))throw Error('Complete the current objective first.');
    if(!s.ready)throw Error(s.reason);return s;
  }
  function advanceDialogue() {
    const s=requireStage(['dialogue']),a=current();
    if((a.dialogueIndex||0)+1>=s.lines.length)advance();
    else{commit(active=>{active.dialogueIndex=(active.dialogueIndex||0)+1;});guide();}
    return currentStage();
  }
  function skipDialogue() {
    requireStage(['dialogue']);advance();return currentStage();
  }
  function interact(choiceId) {
    const s=requireStage(['interact','choice']),a=current();
    if(s.type==='choice') {
      const choice=s.choices.find(c=>c.id===choiceId);if(!choice)throw Error('Choose one of the listed outcomes.');
      advance(active=>{active.choices[s.choiceKey]=choice.id;});notice=choice.recap;return currentStage();
    }
    const action=s.action;if(!action)throw Error('This handover is already complete.');
    if(choiceId&&choiceId!==action.id)throw Error('Complete the listed action first.');
    let observation=hooks.interact?.({stage:s,mission:missionOf(a),action})??null;
    if(action.kind==='inspect'&&!observation) {
      const nearby=[world.player.inCar,workCar,...(world.parked||[])].filter(v=>v&&!v.dead&&distance(v.pos,focus())<18);
      const vehicle=nearby[0];if(!vehicle)throw Error('Bring the supplied inspection vehicle to this bay first.');
      const conditions=normalizeComponents(vehicle.components,vehicle.health,vehicle.maxHealth);
      observation={component:action.component,condition:conditions[action.component],vehicle:vehicle.ownedId||'work-vehicle'};
    }
    const final=(a.actionIndex||0)+1>=s.actions.length;
    const recordAction=active=>{if(observation)active.observations={...(active.observations||{}),[s.key+':'+action.id]:observation};active.actionIndex=(active.actionIndex||0)+1;};
    if(final)advance(recordAction);else commit(recordAction);
    try{hooks.presentAction?.({stage:s,action,observation});}catch(e){lastError=e.message;}
    guide();return currentStage();
  }
  function fail(message) {
    const a=current();if(!a||a.failure)return;
    commit(active=>{active.failure=message;});hold=0;
  }
  function retry() {
    enabled();const a=current();if(!a)throw Error('No story checkpoint to retry.');
    commit(active=>{active.failure=null;});
    hold=0;retryCooldown=0;release();hooks.reset?.();
    hooks.retry?.({stage:currentStage(),mission:missionOf(current())});
    guide();try{requestVehicle();}catch(e){lastError=e.message;}
    return currentStage();
  }
  function cancel() {
    if(!current())return;
    const wasReplay=!!replayState;
    if(replayState)replayState=null;else commit(()=>{world.campaign.active=null;});
    hold=0;release();hooks.reset?.();if(wasReplay)hooks.afterReplay?.('cancel');notice='Story postponed. Completed missions and rewards are retained.';
  }
  function update(dt) {
    if(loadError||!current()||!finite(dt)||dt<=0)return;
    retryCooldown=Math.max(0,retryCooldown-dt);if(retryCooldown)return;
    const a=current();if(a.failure)return;
    try {
      if(world.player.health<=0){fail(CAMPAIGN_FAILURE_CAPTIONS.PLAYER_DOWN);return;}
      const s=currentStage();
      if(s.type!=='drive'&&s.type!=='travel')return;
      if(s.type==='drive'&&(world.player.inCar?.dead||workCar?.dead)){fail(CAMPAIGN_FAILURE_CAPTIONS.VEHICLE_LOST);return;}
      if(!s.ready){hold=0;return;}
      hold+=Math.min(dt,1);
      if(hold>=(s.holdSeconds||0))advance();
    }catch(e){lastError=e.message;retryCooldown=2;}
  }
  const api={list,status,currentStage,start,advanceDialogue,skipDialogue,interact,retry,replay,cancel,update,requestVehicle,guide,fail,
    progress:()=>current()?{...clone(current()),replay:!!replayState,scenarioState:clone(replayState?.scenarioState||world.campaign.scenarioState||{})}:null,
    workVehicle:()=>workCar};
  world.campaignService=api;
  if(current()&&!loadError){guide();try{requestVehicle();}catch(e){lastError=e.message;}}
  return api;
}
