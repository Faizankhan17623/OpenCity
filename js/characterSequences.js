import {playCharacterClip,sampleCharacterClip} from './gltfChar.js';

const FPS=24,EPS=1e-6;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const stories=new Set(['talk_neutral','talk_emphatic','listen','handover_give','handover_take','inspect_crouch','point_direct','point_direct_L','radio_hold']);
export const CAR_DOOR_TIMING=Object.freeze({open:24/FPS,close:64/FPS,end:88/FPS});
export function characterDoorAmount(seconds){
  const {open,close,end}=CAR_DOOR_TIMING;
  return seconds<open?clamp(seconds/open,0,1):seconds<close?1:clamp((end-seconds)/(end-close),0,1);
}
function copyTransform(group){return {position:group.position.clone(),quaternion:group.quaternion.clone(),scale:group.scale.clone(),visible:group.visible};}
function restoreTransform(group,transform){group.position.copy(transform.position);group.quaternion.copy(transform.quaternion);group.scale.copy(transform.scale);group.visible=transform.visible;}
function mountWeapon(ch,raised){
  const a=ch.asset,w=ch.weapon?.group,socket=raised?a?.nodes.Attach_Hand_R:a?.nodes.Attach_Hip;
  if(!w||!socket)return;
  socket.add(w);w.position.set(0,0,0);w.quaternion.identity();if(ch.weapon._gripRotation)w.quaternion.copy(ch.weapon._gripRotation);
  w.visible=true;a.weaponRaised=raised;
}
function duration(asset,name){return asset.library.raw.get(name)?.duration||asset.library.events[name]?.duration_s||0;}

/** Timed visual interactions. Call update after movement/ordinary animation.
 * No inventory, vehicle ownership, money or save writes happen here.
 * onCommit is the single gameplay boundary; onComplete follows visual cleanup.
 * Vehicle/fuel positions use the vehicle-centre frame (+Z forward), matching GLB Root.
 * Stories use the character's current frame or options.position/quaternion.
 */
export function createCharacterSequenceController(ch,{onError}={}){
  let state=null,disposed=false,lastError=null;
  function context(s){
    ch.group.updateWorldMatrix(true,true);
    const bone=ch.asset?.nodes.Root;
    const position=bone?.getWorldPosition(ch.group.position.clone())||ch.group.position.clone();
    // Root includes the imported skeleton's bone basis. Returning that as the
    // character-group rotation would tip Kai over after exit/refuelling.
    const quaternion=ch.group.quaternion.clone();
    return {kind:s.kind,phase:s.phase,vehicle:s.options.vehicle||null,position,quaternion,committed:s.committed,elapsed:s.elapsed};
  }
  function notify(s,name,...args){
    const fn=s.options[name];if(fn)fn(...args);
  }
  function event(s,name){notify(s,'onEvent',name,context(s));}
  function anchor(s){
    const v=s.options.vehicle;
    if(v){ch.group.position.copy(v.pos);ch.group.quaternion.copy(v.mesh.quaternion);ch.group.scale.set(1,1,1);}
    else {ch.group.position.copy(s.options.position||s.before.position);ch.group.quaternion.copy(s.options.quaternion||s.before.quaternion);}
    ch.group.visible=true;
  }
  function door(s,amount){
    if(!s.car)return;
    const v=s.options.vehicle,name=s.side==='R'?'Door_FR':'Door_FL';
    if(s.options.setDoor)s.options.setDoor(v,name,amount);
    else {const panel=v.asset?.panels?.[name];if(panel){panel.open=amount>0;panel.node.rotation[panel.axis]=panel.closedAngle+panel.angle*amount;}}
  }
  function sample(s,name,time,loop=false){
    sampleCharacterClip(ch,name,time,{rootMotion:true,loop});s.clip=name;
    if(s.kind!=='weapon-draw'&&s.kind!=='weapon-holster'&&ch.weapon?.group)ch.weapon.group.visible=false;
  }
  function commit(s){
    if(s.committed)return;s.committed=true;
    notify(s,'onCommit',context(s));
    if(state===s)event(s,'commit');
  }
  function end(reason=null){
    const s=state;if(!s)return false;
    const result=context(s),asset=s.asset;state=null;
    if(asset.sequence===api)asset.sequence=null;
    if(asset.current?.action)asset.current.action.paused=false;
    door(s,0);
    if(reason&&s.panelBefore&&!s.options.vehicle.dead){
      const {panel,open,angle}=s.panelBefore;panel.open=open;panel.node.rotation[panel.axis]=angle;
      if(s.options.setDoor)s.options.setDoor(s.options.vehicle,s.side==='R'?'Door_FR':'Door_FL',s.panelBefore.amount);
    }
    if(ch.asset===asset&&!asset.disposed){
      asset.mixer.stopAllAction();asset.current=null;
      const seated=s.kind==='vehicle-enter'&&s.committed||s.kind==='vehicle-exit'&&!s.committed;
      if(seated){anchor(s);playCharacterClip(ch,s.options.vehicle.bike?'bike_ride_idle':'car_sit_idle',{fade:0});}
      else {
        if(reason&&!s.committed)restoreTransform(ch.group,s.before);
        else if(s.kind==='vehicle-exit'||s.kind==='fuel'){ch.group.position.copy(result.position);ch.group.quaternion.copy(result.quaternion);ch.group.visible=true;}
        playCharacterClip(ch,'idle',{fade:0});
      }
      asset.mixer.update(0);
      mountWeapon(ch,reason?s.weaponRaised:s.kind==='weapon-draw'?true:s.kind==='weapon-holster'?false:s.weaponRaised);
      if(ch.weapon?.group)ch.weapon.group.visible=seated?false:s.weaponVisible;
    }
    if(reason)notify(s,'onCancel',reason,result);else notify(s,'onComplete',result);
    return true;
  }
  function error(error){
    lastError=error;
    try{end('error');}catch(cleanupError){lastError=cleanupError;}
    if(onError)onError(lastError);else console.error('Character sequence failed',lastError);
  }
  function step(s){
    anchor(s);
    const t=s.elapsed,a=s.asset;
    if(s.kind==='vehicle-enter'||s.kind==='vehicle-exit'){
      const entering=s.kind==='vehicle-enter',bike=s.options.vehicle.bike;
      const clip=bike?(entering?'bike_mount':'bike_dismount'):(entering?'car_enter_':'car_exit_')+s.side;
      const clipLength=duration(a,clip),delay=!bike&&!entering?CAR_DOOR_TIMING.open:0;
      if(t<delay){sample(s,'car_sit_idle',t,true);s.phase='opening';}
      else if(entering&&t>=delay+clipLength){sample(s,bike?'bike_ride_idle':'car_sit_idle',t-delay-clipLength,true);s.phase='seated';}
      else {sample(s,clip,Math.min(t-delay,clipLength));s.phase=entering?'entering':'exiting';}
      door(s,characterDoorAmount(t));
      if(t+EPS>=delay+clipLength)commit(s);
      if(state!==s)return;
      // Legacy instant callbacks may hide the character or move its group.
      // Reapply the sequence frame until the authored door sweep completes.
      anchor(s);
      if(t+EPS>=s.total){commit(s);if(state===s)end();}
    }else if(s.kind==='fuel'){
      const approach=duration(a,'fuel_approach');
      if(t<approach){s.phase='approach';sample(s,'fuel_approach',t);}
      else {
        if(!s.holding){s.holding=true;s.phase='hold';sample(s,'fuel_hold',0,true);notify(s,'onHold',context(s));if(state!==s)return;event(s,'fuel-hold');if(state!==s)return;}
        if(s.releaseRequested&&s.releaseAt===null){s.releaseAt=t;s.phase='release';notify(s,'onRelease',context(s));if(state!==s)return;event(s,'fuel-release');if(state!==s)return;}
        if(s.releaseAt!==null){s.phase='release';sample(s,'fuel_release',t-s.releaseAt);if(t-s.releaseAt+EPS>=duration(a,'fuel_release'))end();}
        else {s.phase='hold';sample(s,'fuel_hold',t-approach,true);}
      }
    }else if(s.kind==='weapon-draw'||s.kind==='weapon-holster'){
      const draw=s.kind==='weapon-draw',cue=(draw?3:12)/FPS;
      sample(s,draw?'weapon_draw':'weapon_holster',t);mountWeapon(ch,t+EPS>=cue?draw:!draw);
      if(!s.socketChanged&&t+EPS>=cue){s.socketChanged=true;event(s,draw?'weapon-in-hand':'weapon-on-hip');if(state!==s)return;}
      if(t+EPS>=s.total){commit(s);if(state===s)end();}
    }else {
      sample(s,s.kind,t,!!a.library.events[s.kind]?.loop);s.phase='acting';
      if(!s.transferred&&s.kind.startsWith('handover_')&&t+EPS>=21/FPS){s.transferred=true;notify(s,'onTransfer',context(s));if(state!==s)return;event(s,'handover');if(state!==s)return;}
      if(t+EPS>=s.total){commit(s);if(state===s)end();}
    }
  }
  const api={
    start(kind,options={}){
      const a=ch?.asset;if(disposed||state||!a||a.disposed||a.sequence)return false;
      const vehicle=options.vehicle,isVehicle=kind==='vehicle-enter'||kind==='vehicle-exit';
      if((isVehicle||kind==='fuel')&&(!vehicle?.mesh||!vehicle.pos||vehicle.tank||vehicle.dead))return false;
      if(!isVehicle&&kind!=='fuel'&&kind!=='weapon-draw'&&kind!=='weapon-holster'&&!stories.has(kind))return false;
      const side=options.side==='R'?'R':'L';
      const names=isVehicle?[vehicle.bike?(kind==='vehicle-enter'?'bike_mount':'bike_dismount'):(kind==='vehicle-enter'?'car_enter_':'car_exit_')+side,vehicle.bike?'bike_ride_idle':'car_sit_idle']
        :kind==='fuel'?['fuel_approach','fuel_hold','fuel_release']:kind.startsWith('weapon-')?[kind.replace('-','_')]:[kind];
      if(names.some(name=>!a.library.raw.has(name)))return false;
      const total=isVehicle?(vehicle.bike?duration(a,names[0]):CAR_DOOR_TIMING.end):kind==='fuel'?Infinity:Math.max(.05,Number(options.duration)||duration(a,names[0]));
      state={kind,options,asset:a,before:copyTransform(ch.group),weaponRaised:!!a.weaponRaised,weaponVisible:ch.weapon?.group.visible??true,
        elapsed:0,phase:'start',clip:names[0],side,car:isVehicle&&!vehicle.bike,total,committed:false,holding:false,releaseRequested:false,releaseAt:null};
      const panel=state.car&&vehicle.asset?.panels?.[side==='R'?'Door_FR':'Door_FL'];
      if(panel)state.panelBefore={panel,open:panel.open,angle:panel.node.rotation[panel.axis],amount:panel.angle?clamp((panel.node.rotation[panel.axis]-panel.closedAngle)/panel.angle,0,1):0};
      a.sequence=api;a.mixer.stopAllAction();a.current=null;
      try{
        const s=state;step(s);
        // Interactive entry can grant control immediately; cinematic callers
        // retain the authored commit cue. commit() remains exactly-once.
        if(state===s&&isVehicle&&options.commitOnStart)commit(s);
      }catch(e){error(e);return false;}
      return !!state;
    },
    update(dt){
      const s=state;if(!s)return false;
      if(ch.asset!==s.asset||s.asset.disposed){end('asset-changed');return false;}
      if(s.options.vehicle?.dead){end('vehicle-unavailable');return false;}
      try{
        if(s.options.canContinue&&!s.options.canContinue(context(s))){end('interrupted');return false;}
        s.elapsed+=clamp(Number(dt)||0,0,.1);step(s);
      }catch(e){error(e);}
      return !!state;
    },
    finish(){
      const s=state;if(!s||!Number.isFinite(s.total))return false;
      try{s.elapsed=s.total;step(s);if(state===s){commit(s);if(state===s)end();}}catch(e){error(e);}
      return !state;
    },
    release(){if(state?.kind!=='fuel')return false;state.releaseRequested=true;return true;},
    cancel(reason='cancelled'){return end(reason);},
    dispose(){if(disposed)return;disposed=true;end('disposed');},
    get busy(){return !!state;},
    get locksMovement(){return !!state&&!state.kind.startsWith('weapon-');},
    get active(){return state?{...context(state),clip:state.clip}:null;},
    get lastError(){return lastError;},
  };
  return api;
}
