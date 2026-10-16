import { campaignArc } from './campaignCast.js';
import { CAMPAIGN_RECAPS, CAMPAIGN_UI_COPY } from './campaignRecaps.js';
import { availableVehicleComponents } from './vehicleComponents.js';
import { portraitUrl,chapterArt } from './uiArt.js';
import { loanPolicyText } from './economyPolicy.js';
import { clearInput } from './input.js';

// A single keyboard-accessible hub; the simulation pauses while it is open.
export function initVehiclePanel(world, api, hooks) {
  const el=(tag,text,parent)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(parent)parent.append(n);return n;};
  const style=el('style');style.textContent=`
  #vehicle-hub{position:fixed;inset:7vh max(12px,calc((100vw - 860px)/2));z-index:1200;max-height:86vh;overflow:auto;box-sizing:border-box;background:#142c2f;color:#f4eee3;border:2px solid #88d4c0;border-radius:12px;padding:20px;font:15px/1.5 system-ui;box-shadow:0 0 0 100vmax #071719bd}
  #vehicle-hub[hidden],#vehicle-launcher[hidden],#vehicle-guidance[hidden]{display:none}
  #vehicle-hub h2,#vehicle-hub h3{margin:8px 0}#vehicle-hub button,#vehicle-hub select{font:inherit;border:1px solid #88d4c0;border-radius:5px;background:#233f41;color:#f4eee3;padding:8px 12px;margin:4px;cursor:pointer}#vehicle-hub button:focus-visible,#vehicle-hub select:focus-visible{outline:3px solid #ffbc83;outline-offset:2px}
  #vehicle-hub button[aria-pressed=true]{background:#88d4c0;color:#142c2f}#vehicle-hub article{padding:12px 0;border-top:1px solid #446362}#vehicle-hub .hub-error{color:#ffbc83;min-height:24px}#vehicle-hub header{position:sticky;top:-20px;background:#142c2f;z-index:2;padding:8px 0;display:flex;justify-content:space-between;align-items:center;gap:16px}
  #vehicle-launcher{position:fixed;right:18px;bottom:180px;z-index:40;border:1px solid #88d4c0;border-radius:5px;background:#142c2fe8;color:#f4eee3;padding:9px 12px;cursor:pointer}
  #vehicle-guidance{position:fixed;bottom:82px;left:50%;transform:translateX(-50%);z-index:35;width:min(640px,70vw);box-sizing:border-box;padding:8px 12px;background:#142c2fea;color:#f4eee3;border-left:3px solid #88d4c0;border-radius:4px;font:13px/1.5 system-ui;text-align:center;pointer-events:none}
  `;document.head.append(style);
  const launcher=el('button','Vehicles / Services [F4]',document.body);launcher.id='vehicle-launcher';launcher.hidden=true;
  const guidance=el('div','',document.body);guidance.id='vehicle-guidance';guidance.hidden=true;
  const panel=el('section','',document.body);panel.id='vehicle-hub';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','vehicle-hub-title');
  const header=el('header','',panel),title=el('h2','Vehicles & City Services',header);title.id='vehicle-hub-title';
  const close=el('button','Close [Esc]',header);
  const balance=el('p','',panel),label=el('label','Pay from ',panel),payment=el('select','',label);
  for(const [value,text]of [['cash','Cash'],['bank','Local bank']]){const option=el('option',text,payment);option.value=value;}
  const nav=el('nav','',panel);nav.setAttribute('aria-label','Vehicle services');
  const error=el('div','',panel);error.className='hub-error';error.setAttribute('role','status');
  const content=el('div','',panel);
  let tab='My Vehicles',lastFocus=null,financeQuote=null,serviceQuote=null,saleQuote=null,storyConfirm=false;
  const replayTabs=new Set(['Story','Destinations','Receipts']);
  const buttons=new Map(),tabs=['My Vehicles','Showroom','Workshop','Destinations','Rosa’s Job','Story','Auctions','Receipts'];
  const money=n=>'$'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:Number.isInteger(Number(n||0))?0:2,maximumFractionDigits:2});
  const run=fn=>{error.textContent='';try{fn();render();}catch(e){error.textContent=e.message;}};
  const button=(parent,text,fn)=>{const b=el('button',text,parent);b.type='button';b.addEventListener('click',()=>run(()=>{if(world.campaignReplay&&!replayTabs.has(tab))throw Error('Finish or leave the memory replay before using city services.');fn();}));return b;};
  function dismiss(){
    financeQuote=null;serviceQuote=null;storyConfirm=false;api.cancelService();api.cancelFinance();
    panel.hidden=true;world.vehicleUiOpen=false;clearInput();lastFocus?.focus();
    if(hooks.isPlaying()){world.storyPresentation?.update(0);if(!world.storyUiOpen)hooks.resumePointer?.();}
  }
  function render(){
    const restoreFocus=content.contains(document.activeElement);
    if(world.campaignReplay&&!replayTabs.has(tab))tab='Story';
    label.hidden=!!world.campaignReplay;payment.disabled=!!world.campaignReplay;
    balance.textContent=`Cash ${money(world.money)} · Local bank ${money(world.bank?.balance)} · Game paused while this menu is open`;
    if(world.campaignReplay)balance.textContent='Memory replay · Purchases, jobs, auctions and saving are paused. Finish or leave to return to your saved city.';
    for(const [name,b] of buttons){b.setAttribute('aria-pressed',String(tab===name));b.disabled=!!world.campaignReplay&&!replayTabs.has(name);}
    content.replaceChildren();
    if(tab==='My Vehicles'){
      el('p','Purchased vehicles save automatically. Recovery costs $250 at the workshop; fuel and upgrades are kept.',content);
      if(!world.ownedVehicles.length)el('p','No purchased vehicles yet. Visit Auto Palace (V). Existing stored garage vehicles remain available on their pads.',content);
      for(const r of world.ownedVehicles){
        const v=world.ownedVehicleInstances.get(r.id),d=v||r.descriptor,card=el('article','',content);
        el('h3',r.name,card);
        el('p',`${!v||v.dead?'Recovery needed':'Available'} · Health ${Math.max(0,Math.round(d.health||0))}/${d.maxHealth||100} · Fuel ${(d.fuelLiters||0).toFixed(1)} L · Nitro ${Math.round(d.nitro||0)}%`,card);
        const finance=api.financeStatus(r);
        if(finance)el('p',finance.error || (finance.debtCents>0 ? 'Vehicle loan: '+money(finance.debtCents/100)+' outstanding; '+money(finance.dailyInterestCents/100)+' interest per played day at the current principal. Select this vehicle in City Bank to repay.' : 'Vehicle loan fully repaid.'),card);
        button(card,'Locate',()=>{api.locate(r.id);dismiss();});
        button(card,'Recover — $250',()=>api.recover(r.id,payment.value));
        button(card,'Review resale offer',()=>{saleQuote=api.quoteSale(r.id);});
        if(saleQuote?.vehicleId===r.id){el('p','Resale offer '+money(saleQuote.amount)+'. Visit Auto Palace with the vehicle. Outstanding vehicle debt must be repaid first.',card);button(card,'Confirm sale',()=>{api.sell(r.id,saleQuote);saleQuote=null;});button(card,'Keep vehicle',()=>{saleQuote=null;});}
      }
    }
    if(tab==='Showroom'){
      el('p','Walk into Auto Palace (V) to buy or start a free two-minute test drive. Keep the collection bay clear.',content);
      if(api.testDrive)button(content,'Return test-drive vehicle',()=>{api.endTestDrive();dismiss();});
      el('p',loanPolicyText(world)+' Vehicle finance requires at least 20% down.',content);
      api.deals.forEach((d,i)=>{
        const card=el('article','',content);el('h3',d.name+' - '+money(d.cost),card);el('p',d.tier+' · '+d.kind+' · '+d.description,card);el('p','Acceleration '+(d.opts.accel||17)+' · Top speed '+Math.round((d.opts.top||38)*3.6)+' km/h · Tank '+(d.opts.fuelCapacityLiters||(d.opts.bike?15:d.opts.monster?90:d.id==='vireo-400'?38:55))+' L',card);
        button(card,'Buy & save ownership',()=>{api.buy(i,payment.value);financeQuote=null;api.cancelFinance();});
        button(card,'Free test drive',()=>{api.startTestDrive(i);dismiss();});
        const downLabel=el('label','Down payment ($) ',card),down=el('input','',downLabel);
        down.type='number';down.min=String(Math.ceil(d.cost*.2));down.max=String(d.cost-1);down.step='1';down.setAttribute('aria-label',d.name+' down payment');
        down.value=String(financeQuote?.index===i?financeQuote.quote.downPayment:Math.ceil(d.cost*.2));
        down.style.cssText='width:100px;padding:8px;border:1px solid #88d4c0;background:#233f41;color:#f4eee3';
        down.disabled=financeQuote?.index===i;
        button(card,'Review finance quote',()=>{financeQuote={index:i,quote:api.quoteFinance(i,Number(down.value),payment.value)};});
        if(financeQuote?.index===i){
          const q=financeQuote.quote,preview=el('section','',card);preview.setAttribute('aria-label','Finance quote');
          el('p','Price '+money(q.price)+'; pay '+money(q.downPayment)+' now from '+(q.account==='bank'?'local bank':'cash')+'; borrow '+money(q.principalCents/100)+'.',preview);
          el('p','Interest starts at '+money(q.dailyInterestCents/100)+' per played day. Repay today: '+money(q.principalCents/100)+'. After one full played day without repayment: '+money((q.principalCents+q.dailyInterestCents)/100)+'. Interest falls as principal is repaid. No fixed instalments in this sample offer.',preview);
          button(preview,'Confirm financed purchase',()=>{api.finance(i,q);financeQuote=null;});
          button(preview,'Cancel quote',()=>{financeQuote=null;api.cancelFinance();});
        }
      });
    }
    if(tab==='Workshop'){
      el('p','Park an owned vehicle on the G workshop pad and stop. Diagnose individual components, review a quote, then confirm. Parts and repair costs depend on the vehicle class.',content);
      button(content,'Guide me to the workshop',()=>{api.navigate('Workshop — G',world.workshopPos);dismiss();});
      for(const r of world.ownedVehicles){
        const v=world.ownedVehicleInstances.get(r.id);if(!v||v.dead)continue;
        const card=el('article','',content);el('h3',r.name,card);
        el('p',Object.entries(api.components(v)).filter(([k])=>k!=='version').map(([k,n])=>k+': '+Math.round(n)+'%').join(' · '),card);
        button(card,'Review full repair — '+money(api.repairCost(v)),()=>{serviceQuote=api.quoteService(r.id,'repair');});
        for(const key of availableVehicleComponents(v))button(card,'Repair '+key,()=>{serviceQuote=api.quoteService(r.id,'repair:'+key);});
        for(const part of api.parts(v)){const b=button(card,part.label+' — '+(part.installed?'fitted':money(part.cost)),()=>{serviceQuote=api.quoteService(r.id,'part:'+part.id);});b.disabled=part.installed;}
        for(const [key,name,price] of [['paint','Cycle paint',200],['engine','Engine tune',800],['armor','Armor',600],['nitro','Nitro upgrade',500],['spikes','Ram spikes',700],['neon','Neon',300]]){
          if(key==='armor'&&!availableVehicleComponents(v).includes('chassis'))continue;
          const b=button(card,`${name} — ${v.upgrades[key]&&key!=='paint'?'fitted':money(price)}`,()=>{serviceQuote=api.quoteService(r.id,key);});b.disabled=key!=='paint'&&!!v.upgrades[key];
        }
      }
    }
    if(tab==='Workshop'&&serviceQuote){
      const q=serviceQuote,box=el('article','',content);box.setAttribute('aria-label','Workshop quote');el('h3',q.label+' — '+money(q.price),box);
      el('p','Effective acceleration '+q.before.accel.toFixed(1)+' → '+q.after.accel.toFixed(1)+'; top speed '+Math.round(q.before.top*3.6)+' → '+Math.round(q.after.top*3.6)+' km/h; braking '+q.before.braking.toFixed(1)+' → '+q.after.braking.toFixed(1),box);
      el('p','Grip '+q.before.grip.toFixed(1)+' → '+q.after.grip.toFixed(1)+'; steering '+q.before.steering.toFixed(1)+' → '+q.after.steering.toFixed(1)+'; integrity capacity '+q.before.maxHealth+' → '+q.after.maxHealth,box);
      if(q.note)el('p',q.note,box);
      el('p','Nothing is charged or changed until confirmation. Fuel and unrelated parts are preserved.',box);
      button(box,'Confirm service',()=>{api.confirmService(q,payment.value);serviceQuote=null;});button(box,'Cancel preview',()=>{serviceQuote=null;api.cancelService();});
    }
    if(tab==='Story'){
      const a=world.campaignService,status=a.status(),stage=a.currentStage();
      el('h3','The Long Road · Kai Dena',content);el('p',status.mainCompleted+'/44 main stories · '+status.completed+'/62 total completed',content);
      el('p',status.message,content);
      if(world.campaignReplay)el('p','This memory uses temporary progress. Finishing or leaving reloads your city from the snapshot taken before the replay.',content);
      if(stage){
        const art=chapterArt(campaignArc(status.mission));if(art){const plate=el('img','',content);plate.src=art;plate.alt=status.mission.chapter;plate.style.cssText='width:100%;max-height:150px;object-fit:cover;border-radius:6px';plate.onerror=()=>plate.remove();}
        el('h3',status.mission.id+' · '+status.mission.title,content);
        el('p','Step '+(stage.index+1)+'/'+stage.total+' · '+stage.label,content);
        el('p',stage.ready?'Ready at destination':stage.reason+' '+Math.round(stage.distance)+' m',content);
        if(stage.dialogue){const url=portraitUrl(stage.dialogue.speaker);if(url){const portrait=el('img','',content);portrait.src=url;portrait.alt=stage.dialogue.speaker;portrait.width=96;portrait.height=96;portrait.style.cssText='border-radius:8px;object-fit:cover';portrait.onerror=()=>portrait.remove();}el('h3',stage.dialogue.speaker,content);el('p',stage.dialogue.text,content);const b=button(content,'Continue dialogue',()=>a.advanceDialogue());b.disabled=!stage.ready||!!stage.failure;}
        if(stage.action){const b=button(content,stage.action.label,()=>a.interact(stage.action.id));b.disabled=!stage.ready||!!stage.failure;}
        if(stage.type==='choice')for(const choice of stage.choices){const b=button(content,choice.label,()=>a.interact(choice.id));b.disabled=!stage.ready||!!stage.failure;}
        if(stage.type==='drive'||stage.type==='travel')el('p','Resume play and reach the waypoint. Drive stages require a vehicle, then a safe stop.',content);
        button(content,'Guide to current objective',()=>{a.guide();dismiss();});
        button(content,'Locate supplied work vehicle',()=>{const car=a.requestVehicle();if(car){api.navigate('Supplied work vehicle',car.pos);dismiss();}});
        if(stage.failure)button(content,'Retry saved checkpoint',()=>a.retry());
        button(content,'Resume story in the city',dismiss);
        if(storyConfirm){el('p',CAMPAIGN_UI_COPY.leaveConfirm,content);button(content,'Keep this attempt',()=>{storyConfirm=false;});button(content,stage.replay?'Leave memory replay':'Confirm postpone',()=>{a.cancel();storyConfirm=false;});}
        else button(content,stage.replay?'Leave memory replay':'Postpone story',()=>{storyConfirm=true;});
      }else{
        el('p','Play the original campaign alongside free roam. Work vehicles are supplied; borrowing and personal purchases are optional. Meet contacts in the city to read scenes, perform handovers and complete each route.',content);
        for(const m of a.list().filter(m=>m.available||m.completed)){
          const card=el('article','',content);el('h3',m.id+' · '+m.title+' · '+m.chapter,card);el('p',m.summary,card);
          el('p',m.completed?'Completed':'Contact: '+m.contact+' · Reward '+money(m.reward),card);
          if(m.completed){const journal=el('details','',card);el('summary','Journal recap',journal);el('p',CAMPAIGN_RECAPS[m.id]||m.summary,journal);el('p',CAMPAIGN_UI_COPY.replay+' The city reloads from your saved snapshot when you finish or leave.',card);}
          button(card,m.completed?'Replay memory':'Start story',()=>{m.completed?a.replay(m.id):a.start(m.id);dismiss();});
        }
      }
    }
    if(tab==='Auctions'){
      el('p','Auto Palace used-vehicle auction. Timers advance during play. Cash is held when bidding; credit creates no debt until you win and collect. Cancelling withdraws you from that lot. Clear the collection bay before collecting.',content);
      if(world.auctionError)el('p',world.auctionError,content);
      else for(const lot of world.auctionService.list()){
        const card=el('article','',content);el('h3',lot.name+' · '+lot.status,card);
        el('p','Condition '+lot.condition+'% · Current '+money(lot.bid)+' · Leader '+lot.leader+' · '+Math.ceil(Math.max(0,lot.duration-lot.elapsed))+' active seconds left',card);
        if(lot.escrow)el('p','Cash held '+money(lot.escrow.cash)+'; interest-free credit reservation '+money(lot.escrow.creditCents/100),card);
        if(lot.status==='open'){
          const min=lot.bid+(lot.leader==='none'?0:lot.increment),label=el('label','Bid ($) ',card),input=el('input','',label);input.type='number';input.min=min;input.step=1;input.value=min;input.setAttribute('aria-label',lot.name+' bid');
          const cl=el('label',' Credit portion ($) ',card),credit=el('input','',cl);credit.type='number';credit.min=0;credit.step=1;credit.value=0;credit.setAttribute('aria-label',lot.name+' reserved credit');
          button(card,'Reserve bid',()=>world.auctionService.bid(lot.id,Number(input.value),payment.value,Number(credit.value)));
          if(lot.escrow)button(card,'Cancel and return held cash',()=>world.auctionService.cancel(lot.id));
        }
        if(lot.status==='won'){button(card,'Collect won vehicle',()=>world.auctionService.claim(lot.id));button(card,'Decline lot and refund reservation',()=>world.auctionService.cancel(lot.id));}
      }
      if(!world.auctionError)button(content,'Start next sale after all lots finish',()=>world.auctionService.nextEvent());
    }
    if(tab==='Destinations'){
      el('p','Choose a marker for distance and compass direction. Guidance shows a direct bearing; follow the streets around buildings.',content);
      for(const d of api.destinations())button(content,`${d.label} · ${Math.round(d.distance)} m`,()=>{api.navigate(d.label,d.pos);dismiss();});
      button(content,'Clear destination',()=>{world.waypoint=null;world.destinationLabel=null;});
    }
    if(tab==='Rosa’s Job'){
      el('h3','First Run · Kai Dena & Rosa',content);
      const stage=world.introJob.stage;
      el('p',stage==='done'?'Completed — $250 reward received.':stage==='return'?'Parts collected. Return to Rosa’s workshop in a vehicle and stop on the pad for two seconds.':stage==='pickup'?'Drive a vehicle to Auto Palace’s collection bay and stop for two seconds to collect Rosa’s parts.':'Rosa needs a reliable driver. Meet her at the workshop, collect parts from Auto Palace and bring them back. Reward: $250.',content);
      if(stage==='new')button(content,'Accept job at workshop',()=>{api.startIntro();dismiss();});
      if(stage!=='done')button(content,'Show job destination',()=>{api.guideIntro();dismiss();});
    }
    if(tab==='Receipts'){
      el('p','Latest 100 purchases, workshop services, recoveries and job rewards from this vehicle hub.',content);
      if(!world.vehicleReceipts.length)el('p','No transactions yet.',content);
      for(const r of world.vehicleReceipts){const card=el('article','',content);el('h3',r.label,card);el('p',`${r.credit?'+':'−'}${money(r.amount)} · ${r.account==='bank'?'Local bank':'Cash'} · ${new Date(r.time).toLocaleString()} · Balance ${money(r.balanceAfter)}`,card);}
    }
    if(restoreFocus){
      const quote=content.querySelector('[aria-label="Finance quote"], [aria-label="Workshop quote"]');
      (quote?.querySelector('button')||content.querySelector('button:not(:disabled)')||close).focus({preventScroll:!!quote});
      if(quote)quote.scrollIntoView({block:'center'});
    }
  }
  payment.addEventListener('change',()=>{financeQuote=null;api.cancelFinance();render();});
  for(const name of tabs){const b=button(nav,name,()=>{tab=name;financeQuote=null;serviceQuote=null;api.cancelService();api.cancelFinance();});buttons.set(name,b);}
  function open(){if(!hooks.isPlaying()||world.bankUiOpen)return;storyConfirm=false;if(world.campaignReplay)tab='Story';lastFocus=document.activeElement;world.vehicleUiOpen=true;clearInput();panel.hidden=false;render();document.exitPointerLock?.();close.focus();}
  close.addEventListener('click',dismiss);launcher.addEventListener('click',open);
  window.addEventListener('keydown',event=>{
    if(event.code==='F4'&&hooks.isPlaying()&&!world.bankUiOpen){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)panel.hidden?open():dismiss();return;}
    if(panel.hidden)return;
    event.stopImmediatePropagation();
    if(event.code==='Escape'){event.preventDefault();dismiss();}
    if(event.code==='Tab'){
      const items=[...panel.querySelectorAll('button:not(:disabled),select,input:not(:disabled)')],first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  },true);
  window.addEventListener('keyup',e=>{if(!panel.hidden)e.stopImmediatePropagation();},true);
  return {open,openStory(){tab='Story';open();},close:dismiss,render,update(){
    const playing=hooks.isPlaying();launcher.hidden=!playing||world.bankUiOpen||world.vehicleUiOpen;
    const story=world.campaignService?.status();const text=[api.guidance(),story?.active?'STORY: '+story.message+' · F4 → Story':''].filter(Boolean).join(' · ');guidance.textContent=text;guidance.hidden=!playing||world.bankUiOpen||world.vehicleUiOpen||world.storyUiOpen||!text;
  }};
}
