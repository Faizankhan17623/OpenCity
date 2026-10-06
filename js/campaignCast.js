import * as THREE from 'three';
import {createCharacter,updateCharacterAnimation} from './characters.js';
import {CHARACTER_ASSETS} from './gltfChar.js';
import {createCharacterSequenceController} from './characterSequences.js';
import {pointBlocked,groundHeight} from './city.js';
import {CAMPAIGN_MISSIONS} from './campaignContent.js';
const chapters=[...new Set(CAMPAIGN_MISSIONS.map(m=>m.chapter))];
export function campaignArc(mission,completed={}){
 if(mission)return chapters.indexOf(mission.chapter)+1;
 return Math.max(1,...CAMPAIGN_MISSIONS.filter(m=>completed[m.id]).map(m=>chapters.indexOf(m.chapter)+1));
}
export function createCampaignCast(world){
 const actors=new Map(),placements=new Map(),sequences=new Map();let lastStage='',poll=.25;
 function actor(key){
  if(!actors.has(key)){
   const ch=createCharacter({asset:key,animationManaged:true});ch.group.name='Story contact: '+key;world.scene.add(ch.group);actors.set(key,ch);sequences.set(key,createCharacterSequenceController(ch));
  }
  return actors.get(key);
 }
 function reconcile(){
  for(const ch of actors.values())ch.group.visible=false;
  const service=world.campaignService,stage=service?.currentStage(),mission=service?.status().mission;
  if(!stage||!mission||stage.type==='drive'||stage.type==='travel')return;
  const line=stage.dialogue,at=stage.position;
  if(!at)return;
  const contactKey=name=>{
   const key=String(name||'').toLowerCase().split(/[^a-z]+/)[0];
   return CHARACTER_ASSETS[key]&&key!=='kai'&&key!=='officer'?key:null;
  };
  // Keep all in-person participants present through the whole conversation.
  // Telephone speakers belong only in the portrait/dialogue layer.
  const keys=stage.type==='dialogue'
   ? [...new Set((stage.lines||[]).filter(l=>!/phone|radio/i.test(l.delivery||'')).map(l=>contactKey(l.speaker)).filter(Boolean))]
   : [contactKey(mission.contact)].filter(Boolean);
  const talking=/phone|radio/i.test(line?.delivery||'')?null:contactKey(line?.speaker);
  const stageKey=mission.id+':'+stage.index;
  if(stageKey!==lastStage){for(const sequence of sequences.values())sequence.cancel('scene-changed');placements.clear();lastStage=stageKey;}
  for(const key of keys){
   if(!placements.has(key)){
    for(let i=0;i<16;i++){
     const angle=i*Math.PI/8,p=new THREE.Vector3(at.x+Math.sin(angle)*2.6,.9,at.z+Math.cos(angle)*2.6);
     if(pointBlocked(p,world.city.colliders,.4)||[...placements.values()].some(v=>v.distanceTo(p)<1.4))continue;
     p.y=groundHeight(p,world.city.colliders,.25,at.y??0);placements.set(key,p);break;
    }
   }
   const position=placements.get(key);if(!position)continue;
   if(world.activity&&!world.activity.inRange(position))continue;
   const ch=actor(key);ch.group.position.copy(position);
   ch.group.visible=position.distanceTo(world.player.pos)<(world.activity?.radius||100);
   ch.group.rotation.y=Math.atan2(world.player.pos.x-position.x,world.player.pos.z-position.z);
   ch.talking=talking===key;
  }
 }
 function update(dt){
  poll+=dt;if(poll>=.25){poll=0;reconcile();}
  for(const [key,ch] of actors){
   const sequence=sequences.get(key);
   if(sequence.busy)sequence.update(dt);
   else if(ch.group.visible&&(!world.activity||world.activity.shouldAnimate(ch.group)))updateCharacterAnimation(ch,dt,{speed:0,grounded:true,talking:ch.talking,interval:.25});
  }
 }
 function presentAction(action){
  if(action.kind==='inspect')return;
  const visible=[...actors.entries()].filter(([,ch])=>ch.group.visible);
  const contact=String(world.campaignService?.status().mission?.contact||'').toLowerCase().split(/[^a-z]+/)[0];
  const key=visible.find(([key])=>key===contact)?.[0]||visible[0]?.[0];
  if(key)sequences.get(key)?.start('handover_take');
 }
 return {update,presentAction,actors,ready:()=>Promise.all([...actors.values()].map(c=>c.assetReady))};
}
