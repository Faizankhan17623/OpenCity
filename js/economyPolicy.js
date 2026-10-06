// Fictional local-game economy. Edition values are injected, never entitlements.
export const DEFAULT_ECONOMY_POLICY=Object.freeze({principalCapCents:1_000_000,maxLoans:1,bridgeCapCents:100_000,maxBridgeLoans:1,rateBps:2500,daySeconds:1440});
export function economyPolicy(world){return {...DEFAULT_ECONOMY_POLICY,...world.economyPolicy};}
export function creditCapacity(world,{ignoreAuction=false}={}){
  const policy=economyPolicy(world),loans=world.bank?.loanState?.loans||[];
  const active=loans.filter(l=>l.principalCents+l.interestCents>0);
  const held=ignoreAuction?0:(world.auctions?.lots||[]).reduce((n,l)=>n+(l.escrow?.creditCents||0),0);
  const principal=active.reduce((n,l)=>n+l.principalCents,0);
  const reservedLoans=ignoreAuction?0:(world.auctions?.lots||[]).filter(l=>l.escrow?.creditCents>0).length;
  return {policy,principal,held,availableCents:Math.max(0,policy.principalCapCents-principal-held),
    loans:active.filter(l=>l.kind!=='bridge').length+reservedLoans,bridges:active.filter(l=>l.kind==='bridge').length};
}
export function validateBorrowing(world,amountCents,{kind='general',missionId=null,ignoreAuction=false}={}){
  if(world.bank?.loanError)throw Error(world.bank.loanError);
  if(!Number.isSafeInteger(amountCents)||amountCents<=0)throw Error('Choose a positive whole-cent amount.');
  const c=creditCapacity(world,{ignoreAuction}),p=c.policy;
  if(amountCents>c.availableCents)throw Error('Not enough available credit within this edition’s principal limit.');
  if(kind==='bridge'){
    if(!missionId||typeof missionId!=='string')throw Error('Choose an active mission for this advance.');
    if(amountCents>p.bridgeCapCents||c.bridges>=p.maxBridgeLoans)throw Error('Mission advance limit reached. A supplied work vehicle remains available.');
    if((world.bank.loanState.loans||[]).some(l=>l.missionId===missionId))throw Error('This mission has already received its advance.');
  }else if(c.loans>=p.maxLoans)throw Error('Repay an existing loan before taking another.');
  return c;
}
export function loanPolicyText(world){const p=economyPolicy(world);return 'Local game loans: '+(p.rateBps/100)+'% per played day on remaining principal; no offline interest. Principal limit $'+(p.principalCapCents/100).toLocaleString()+', '+p.maxLoans+' non-mission loan'+(p.maxLoans===1?'':'s')+'. Repay any time; no late fees or repossession. Credit limits are provisional.';}
