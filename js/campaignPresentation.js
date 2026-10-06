import * as THREE from 'three';
import {portraitUrl} from './uiArt.js';
import {CAMPAIGN_UI_COPY} from './campaignRecaps.js';
import {solidDistance} from './combat-view.js';
import {clearInput} from './input.js';

// Dialogue is available at the meeting itself; the services hub remains a journal.
export function createCampaignPresentation(world,{camera,resumePointer=()=>{},onError=()=>{}}={}){
 const root=document.createElement('section');root.id='story-scene';root.setAttribute('aria-label','Story scene');root.hidden=true;
 root.style.cssText='position:fixed;z-index:35;left:50%;bottom:8%;transform:translateX(-50%);width:min(760px,88vw);box-sizing:border-box;padding:18px 22px;background:rgba(8,22,29,.96);border:1px solid #78cbbd;color:#f4eee3;font:16px/1.5 system-ui;box-shadow:0 8px 35px #0008;max-height:68vh;overflow:auto;pointer-events:auto';
 const heading=document.createElement('h2'),portrait=document.createElement('img'),speaker=document.createElement('strong'),text=document.createElement('p'),message=document.createElement('p'),actions=document.createElement('nav');
 heading.style.cssText='font-size:15px;color:#8edbc8;margin:0 0 10px';portrait.width=72;portrait.height=72;portrait.style.cssText='float:left;margin:0 16px 8px 0;border-radius:6px;object-fit:cover';portrait.onerror=()=>{portrait.hidden=true;};
 text.style.margin='6px 0 14px';message.setAttribute('role','status');message.style.cssText='color:#ffd190;margin:6px 0';actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;clear:both';
 root.append(heading,portrait,speaker,text,message,actions);document.body.append(root);
 const prompt=document.createElement('aside');prompt.id='story-objective';prompt.style.cssText='position:fixed;top:20px;left:22px;z-index:14;max-width:min(360px,38vw);background:#0c1d25e8;color:#f4eee3;padding:10px 14px;font:14px/1.45 system-ui;border-left:3px solid #79cebb;pointer-events:none;white-space:pre-line';prompt.hidden=true;document.body.append(prompt);
 let currentKey='',minimized='',confirming=null,transcript=false,renderKey='',lastCount=0,lastActive=null,completion='',sceneRecap='',framedKey='',wasModal=false;
 let poll=.25;
 function modal(value){
  world.storyUiOpen=value;root.setAttribute('role',value?'dialog':'region');root.setAttribute('aria-modal',String(value));
  if(value&&!wasModal){clearInput();document.exitPointerLock?.();}wasModal=value;
 }
 function hide(){root.hidden=true;modal(false);renderKey='';}
 function button(label,fn){const b=document.createElement('button');b.textContent=label;b.type='button';b.style.cssText='border:1px solid #79cebb;background:#173c43;color:#f4eee3;padding:8px 12px;cursor:pointer;font:inherit;border-radius:4px';b.onclick=()=>run(fn);actions.append(b);return b;}
 function observeCompletion(){const status=world.campaignService.status();if(lastActive&&!status.active&&status.completed>lastCount)completion=status.message;lastActive=status.active;lastCount=status.completed;return status;}
 function run(fn){message.textContent='';try{fn();renderKey='';observeCompletion();update(0);}catch(e){message.textContent=e.message;onError(e);}}
 function dismiss(){minimized=currentKey;confirming=null;transcript=false;completion='';sceneRecap='';hide();clearInput();resumePointer();}
 function advance(stage){if(stage?.failure)world.campaignService.retry();else if(stage?.dialogue)world.campaignService.advanceDialogue();else if(stage?.action)world.campaignService.interact(stage.action.id);}
 function frame(stage){
  if(!camera||!stage?.dialogue||stage.dialogue.delivery==='telephone')return;
  const key=currentKey+':'+stage.dialogueIndex;if(framedKey===key)return;framedKey=key;
  const positions=[world.player.pos,...[...(world.campaignCast?.actors?.values()||[])].filter(ch=>ch.group.visible).map(ch=>ch.group.position)];
  const target=new THREE.Vector3();positions.forEach(p=>target.add(p));target.multiplyScalar(1/positions.length);target.y+=1.25;
  const angle=world.player.heading||0,offset=new THREE.Vector3(Math.cos(angle)*4,1.25,-Math.sin(angle)*4),dir=offset.clone().normalize();
  const clear=solidDistance(target,dir,world.city.colliders,offset.length());camera.position.copy(target).addScaledVector(dir,Math.max(1.2,Math.min(offset.length(),clear-.2)));camera.lookAt(target);
 }
 function render(stage,status){
  const wasFocused=root.contains(document.activeElement);
  modal(!!(completion||sceneRecap||confirming||transcript||stage?.dialogue||stage?.failure||stage?.type==='choice'));
  root.hidden=false;heading.textContent=completion?'Story complete':sceneRecap?'Scene recap':status.mission?.title||'Kai’s story';
  portrait.hidden=true;speaker.textContent='';text.style.whiteSpace='pre-line';actions.replaceChildren();
  root.style.fontSize=(16*Math.max(1,Math.min(1.5,Number(world.settings.storyTextSize)||1)))+'px';
  if(confirming){
   text.textContent=confirming==='skip'?CAMPAIGN_UI_COPY.skipConfirm:CAMPAIGN_UI_COPY.leaveConfirm;
   button('Keep playing',()=>{confirming=null;});
   button(confirming==='skip'?'Skip scene':'Leave attempt',()=>{
    if(confirming==='skip'){
     const old=world.campaignService.currentStage();
     world.campaignService.skipDialogue();
     sceneRecap=old.label+'\n\n'+(old.lines||[]).slice(-2).map(line=>line.speaker+': '+line.text).join('\n');
     confirming=null;
    }else{world.campaignService.cancel();confirming=null;dismiss();}
   });
  }else if(completion){text.textContent=completion;button('Return to the city',dismiss);}
  else if(sceneRecap){text.textContent=sceneRecap;button('Continue from recap',()=>{sceneRecap='';minimized='';const next=world.campaignService.currentStage();if(!next?.ready){hide();resumePointer();}});}
  else if(transcript){text.textContent=(stage?.lines||[]).map(l=>l.speaker+': '+l.text).join('\n\n');button('Back to scene',()=>{transcript=false;});}
  else if(stage){
   if(stage.failure){text.textContent=stage.failure;button('Retry saved checkpoint · Enter',()=>advance(world.campaignService.currentStage()));}
   else if(stage.dialogue){const line=stage.dialogue,url=portraitUrl(line.speaker);speaker.textContent=line.speaker+(line.delivery?' · '+line.delivery:'');text.textContent=line.text;if(url){portrait.src=url;portrait.alt=line.speaker;portrait.hidden=false;}button('Continue · Enter',()=>advance(world.campaignService.currentStage()));button('Transcript',()=>{transcript=true;});button('Skip scene',()=>{confirming='skip';});}
   else if(stage.type==='choice'){text.textContent=stage.label;for(const choice of stage.choices)button(choice.label,()=>world.campaignService.interact(choice.id));}
   else{text.textContent=stage.action?.label||stage.label;if(stage.action)button('Perform action · Enter',()=>advance(world.campaignService.currentStage()));}
   button('Text size',()=>{world.settings.storyTextSize=(Number(world.settings.storyTextSize)||1)>=1.5?1:(Number(world.settings.storyTextSize)||1)+.25;if(!world.campaignReplay)world.onSave?.();});
   button('Return to game · Esc',dismiss);button('Leave attempt',()=>{confirming='leave';});
  }
  if(wasFocused&&world.storyUiOpen)actions.querySelector('button')?.focus({preventScroll:true});
 }
 function update(dt,pressed={}){
  if(world.bankUiOpen||world.vehicleUiOpen){prompt.hidden=true;hide();poll=.25;return false;}
  poll+=dt;
  // Button handlers call update(0) and keyboard actions bypass polling so
  // dialogue remains responsive. Only passive objective/status reads run at 4 Hz.
  if(dt>0&&poll<.25&&!pressed.Enter&&!pressed.Escape)return !!world.storyUiOpen;
  poll=0;
  const status=observeCompletion(),stage=world.campaignService.currentStage();
  currentKey=stage?status.active+':'+stage.index:'';
  const available=!!stage&&(stage.ready||stage.failure),external=world.bankUiOpen||world.vehicleUiOpen;
  prompt.hidden=!stage||external;
  if(stage){const distance=Number.isFinite(stage.distance)?' '+Math.round(stage.distance)+' m':'';prompt.textContent=(stage.replay?'MEMORY REPLAY · ':'')+status.mission.title+'\n'+stage.label+'\n'+(stage.failure?'Retry saved checkpoint':stage.ready?'Enter · story action':stage.reason+distance);}
  // An external menu always owns its keys, including Enter. Invalidate the render
  // when hiding so reopening the same dialogue also restores the pause flag.
  if(external){hide();return false;}
  if(!completion&&!sceneRecap&&(!available||minimized===currentKey)){
   hide();if(!available||!pressed.Enter)return false;
   delete pressed.Enter;minimized='';
  }
  if(pressed.Escape){delete pressed.Escape;dismiss();return false;}
  if(pressed.Enter){delete pressed.Enter;if(!confirming&&!transcript&&!sceneRecap&&stage?.type!=='choice'){if(completion)dismiss();else run(()=>advance(stage));return !!world.storyUiOpen;}}
  const key=[currentKey,stage?.dialogueIndex,stage?.actionIndex,stage?.failure,confirming,transcript,completion,sceneRecap,world.settings.storyTextSize].join('|');
  if(key!==renderKey){renderKey=key;render(stage,status);}
  if(world.storyUiOpen)frame(stage);
  return !!world.storyUiOpen;
 }
 function keydown(event){
  if(root.hidden||world.bankUiOpen||world.vehicleUiOpen)return;
  const inside=event.target instanceof Node&&root.contains(event.target);
  if(!world.storyUiOpen&&!inside)return;
  if(event.code==='F4'||event.altKey||event.ctrlKey||event.metaKey)return;
  event.stopImmediatePropagation();
  if(event.code==='Escape'){event.preventDefault();if(!event.repeat)dismiss();return;}
  if(event.code==='Tab'&&world.storyUiOpen){
   const items=[...actions.querySelectorAll('button:not(:disabled)')],first=items[0],last=items.at(-1);
   if(!root.contains(document.activeElement)||event.shiftKey&&document.activeElement===first){event.preventDefault();(event.shiftKey?last:first)?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}return;
  }
  if(event.code==='Enter'||event.code==='Space'){
   event.preventDefault();if(event.repeat)return;
   const focused=inside&&event.target.closest?.('button');
   if(focused){focused.click();return;}
   if(event.code==='Enter'&&!confirming&&!transcript&&!sceneRecap){if(completion)dismiss();else{const stage=world.campaignService.currentStage();if(stage?.type!=='choice')run(()=>advance(stage));}}
  }
 }
 function keyup(event){if(!root.hidden&&!world.bankUiOpen&&!world.vehicleUiOpen&&(world.storyUiOpen||(event.target instanceof Node&&root.contains(event.target))))event.stopImmediatePropagation();}
 window.addEventListener('keydown',keydown,true);window.addEventListener('keyup',keyup,true);
 return {update,dismiss,reset(){minimized='';confirming=null;transcript=false;completion='';sceneRecap='';renderKey='';framedKey='';hide();},dispose(){window.removeEventListener('keydown',keydown,true);window.removeEventListener('keyup',keyup,true);root.remove();prompt.remove();world.storyUiOpen=false;}};
}
