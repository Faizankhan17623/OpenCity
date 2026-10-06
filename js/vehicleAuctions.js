import { VEHICLE_DEALS, catalogueVehicle } from './vehicleCatalog.js';
import { vehicleTransaction } from './vehicleTransactions.js';
import { commitVehicleDelivery } from './ownedVehicles.js';
import { transitionLoanLedger } from './loanLedger.js';
import { validateBorrowing, economyPolicy, creditCapacity } from './economyPolicy.js';

function newEvent(event=1){return {version:1,event,lots:VEHICLE_DEALS.filter(d=>['vireo-400','commuter-bike','everyday-sedan'].includes(d.id)).map((d,i)=>({
 id:'auction-'+event+'-'+d.id,catalogueId:d.id,name:d.name,status:'open',duration:180+i*60,elapsed:0,
 bid:Math.ceil(d.cost*.55),increment:50,leader:'none',npcBudget:Math.ceil(d.cost*(.65+i*.03)),npcStep:0,escrow:null,
 condition:65+i*5,settlementId:null
 }))};}
function validateState(state){
 if(state?.version!==1||!Number.isSafeInteger(state.event)||state.event<1||!Array.isArray(state.lots))throw Error('Auction save is unavailable. Restore a known save before bidding.');
 const ids=new Set();
 for(const l of state.lots){
  if(!l||typeof l.id!=='string'||ids.has(l.id)||!catalogueVehicle(l.catalogueId)||!['open','won','sold','claimed'].includes(l.status)||!['none','npc','player'].includes(l.leader)||![l.bid,l.increment,l.npcBudget,l.npcStep].every(n=>Number.isSafeInteger(n)&&n>=0)||![l.elapsed,l.duration,l.condition].every(n=>Number.isFinite(n)&&n>=0))throw Error('Invalid auction lot; saved data preserved.');
  ids.add(l.id);const e=l.escrow;
  if(e&&(!['cash','bank'].includes(e.account)||![e.cash,e.creditCents].every(n=>Number.isSafeInteger(n)&&n>=0)||e.cash+e.creditCents/100!==l.bid||l.leader!=='player'||!['open','won'].includes(l.status)))throw Error('Invalid auction reservation; saved data preserved.');
 }
 return state;
}
export function initVehicleAuctions(world,save){
 world.auctions=structuredClone(save.auctions||newEvent());world.auctionError=null;
 try{validateState(world.auctions);}catch(e){world.auctionError=e.message;}
 const ready=()=>{if(world.auctionError)throw Error(world.auctionError);};
 const atDesk=()=>{ready();if(world.player.inCar||Math.hypot(world.player.pos.x-world.dealerPos.x,world.player.pos.z-world.dealerPos.z)>6)throw Error('Visit the Auto Palace auction desk on foot.');};
 const lot=id=>{ready();const l=world.auctions.lots.find(l=>l.id===id);if(!l)throw Error('Auction lot not found.');return l;};
 function commit(next,label,{amount=0,account='cash',credit=false}={}){
  validateState(next);const before=world.auctions;
  return vehicleTransaction(world,{label,amount,account,credit,apply(){world.auctions=next;},rollback(){world.auctions=before;}});
 }
 function release(next,l,status,label){const e=l.escrow;l.escrow=null;l.status=status;l.leader='npc';return commit(next,label,{amount:e?.cash||0,account:e?.account||'cash',credit:true});}
 const api={
  list(){ready();return structuredClone(world.auctions.lots);},
  bid(id,amount,account='cash',creditDollars=0){
   atDesk();const old=lot(id);if(old.status!=='open'||old.elapsed>=old.duration)throw Error('Bidding is closed.');
   if(!Number.isSafeInteger(amount)||amount<old.bid+(old.leader==='none'?0:old.increment))throw Error('Bid at least the displayed minimum in whole dollars.');
   if(!['cash','bank'].includes(account)||!Number.isSafeInteger(creditDollars)||creditDollars<0||creditDollars>Math.floor(amount*.8))throw Error('Choose cash/local bank and credit up to 80% of the bid.');
   if(old.escrow&&old.escrow.account!==account)throw Error('Use the same account for an increased bid, or cancel first.');
   const creditCents=creditDollars*100;
   if(creditCents){const projected={...world,auctions:{...world.auctions,lots:world.auctions.lots.filter(l=>l.id!==id)}};validateBorrowing(projected,creditCents,{kind:'vehicle'});}
   const cash=amount-creditDollars,delta=cash-(old.escrow?.cash||0);
   const next=structuredClone(world.auctions),l=next.lots.find(l=>l.id===id);
   l.bid=amount;l.leader='player';l.escrow={cash,creditCents,account,rateBps:economyPolicy(world).rateBps};
   return commit(next,'Auction bid reserve: '+l.name,{amount:Math.abs(delta),account,credit:delta<0});
  },
  cancel(id){atDesk();const old=lot(id);if(!['open','won'].includes(old.status)||!old.escrow)throw Error('Only an uncollected reserved lot can be cancelled.');const next=structuredClone(world.auctions),l=next.lots.find(l=>l.id===id);return release(next,l,'sold','Auction bid cancelled: '+l.name);},
  claim(id){
   atDesk();const old=lot(id);if(old.status!=='won'||!old.escrow||old.settlementId)throw Error('This lot is not awaiting your collection.');
   const deal=catalogueVehicle(old.catalogueId),e=old.escrow;let loanNext=null;
   if(e.creditCents){
    const projected={...world,auctions:{...world.auctions,lots:world.auctions.lots.filter(l=>l.id!==id)}};
    validateBorrowing(projected,e.creditCents,{kind:'vehicle'});
    const base={...world.bank.loanState,balanceCents:Math.round(world.bank.balance*100)};
    loanNext=transitionLoanLedger(base,{id:old.id,type:'borrow',loanId:old.id,amountCents:e.creditCents,rateBps:e.rateBps});
    loanNext.balanceCents=base.balanceCents;
    Object.assign(loanNext.loans.at(-1),{kind:'vehicle',vehicleId:id,vehicleName:deal.name,purchaseId:id,originalPrincipalCents:e.creditCents});
   }
   const before=world.auctions,next=structuredClone(before),l=next.lots.find(l=>l.id===id);
   l.status='claimed';l.settlementId=id;l.escrow=null;
   return commitVehicleDelivery(world,deal,{id,account:e.account,amount:0,loanNext,loanId:e.creditCents?id:null,
    label:'Auction collection: '+deal.name,details:{salePrice:old.bid,escrowCash:e.cash,creditCents:e.creditCents},
    descriptor:{health:(deal.opts.health|| (deal.opts.bike?60:100))*old.condition/100},
    applyExtra(){world.auctions=next;},rollbackExtra(){world.auctions=before;}});
  },
  nextEvent(){atDesk();if(world.auctions.lots.some(l=>['open','won'].includes(l.status)))throw Error('Finish or collect the current lots first.');return commit(newEvent(world.auctions.event+1),'New auction event');},
  update(dt){
   if(world.auctionError||!Number.isFinite(dt)||dt<=0)return;
   for(const id of world.auctions.lots.map(l=>l.id)){
    const current=world.auctions.lots.find(l=>l.id===id);
    if(current.status!=='open')continue;
    current.elapsed=Math.min(current.duration,current.elapsed+dt);
    const next=structuredClone(world.auctions),l=next.lots.find(l=>l.id===current.id);
    try{
     if(l.elapsed>=l.duration){
      l.status=l.leader==='player'?'won':'sold';commit(next,'Auction closed: '+l.name);continue;
     }
     const thresholds=[.35,.65,.85];
     if(l.npcStep<thresholds.length&&l.elapsed>=l.duration*thresholds[l.npcStep]){
      l.npcStep++;
      const bid=l.bid+(l.leader==='none'?0:l.increment);
      if(l.leader!=='npc'&&bid<=l.npcBudget){
       l.bid=bid;const e=l.escrow;l.escrow=null;l.leader='npc';
       commit(next,'Outbid — reservation released: '+l.name,{amount:e?.cash||0,account:e?.account||'cash',credit:true});
      }else commit(next,'Auction round: '+l.name);
     }
    }catch(e){world.auctionStatus=e.message;return;}
   }
  }
 };
 world.auctionService=api;return api;
}
