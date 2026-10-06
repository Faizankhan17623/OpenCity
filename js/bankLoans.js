import { economyPolicy, validateBorrowing, DEFAULT_ECONOMY_POLICY } from './economyPolicy.js';
import { newLoanLedger, validateLoanLedger, transitionLoanLedger } from './loanLedger.js';

// Initial local-bank offering. Rate/cap remain explicit test-balancing values.
export const LOAN_RATE_BPS = DEFAULT_ECONOMY_POLICY.rateBps;
export const LOAN_CAP_CENTS = DEFAULT_ECONOMY_POLICY.principalCapCents;
const DAY_SECONDS = 24 * 60;

export function initBankLoans(world, save) {
  world.bank.loanSeconds = Number.isFinite(save?.loanSeconds) && save.loanSeconds >= 0 ? save.loanSeconds : 0;
  world.bank.loanState = save?.loanState ?? newLoanLedger();
  world.bank.loanError = null;
  try { validateLoanLedger(world.bank.loanState); }
  catch { world.bank.loanError = 'Saved loan data is invalid. Loan actions are unavailable; your data is preserved.'; }
}
export function loanSave(world) {
  return { loanState: world.bank.loanState, loanSeconds: world.bank.loanSeconds };
}
export function loanDebt(world) {
  if (world.bank.loanError) return 0;
  return world.bank.loanState.loans.reduce((n,l)=>n+l.principalCents+l.interestCents,0);
}
function commit(world, command, seconds = world.bank.loanSeconds, receipt = null, attributes = null) {
  const bk = world.bank;
  if (bk.loanError) throw new Error(bk.loanError);
  const before = { state:bk.loanState, balance:bk.balance, seconds:bk.loanSeconds, receipts:world.vehicleReceipts };
  // The existing local bank balance is authoritative, not a parallel wallet.
  const base = { ...bk.loanState, balanceCents:Math.round(bk.balance * 100) };
  const next = transitionLoanLedger(base, command);
  if(attributes && command.type==='borrow')Object.assign(next.loans.at(-1),attributes);
  bk.loanState = next; bk.balance = next.balanceCents / 100; bk.loanSeconds = seconds;
  if (receipt) world.vehicleReceipts = [receipt,...(world.vehicleReceipts||[])].slice(0,100);
  try { if (world.onSave?.() !== true) throw new Error('Save failed'); } catch {
    bk.loanState = before.state; bk.balance = before.balance; bk.loanSeconds = before.seconds; world.vehicleReceipts = before.receipts;
    throw new Error('Could not save. No loan payment or balance change was applied.');
  }
}
export function borrowLocal(world, amountCents, {kind='general',missionId=null}={}) {
  validateBorrowing(world,amountCents,{kind,missionId});
  const id=crypto.randomUUID(),p=economyPolicy(world);
  const receipt={id,label:kind==='bridge'?'Mission advance: '+missionId:'Local bank loan',amount:amountCents/100,account:'bank',credit:true,time:Date.now(),balanceBefore:world.bank.balance,balanceAfter:world.bank.balance+amountCents/100};
  commit(world,{id,type:'borrow',loanId:id,amountCents,rateBps:p.rateBps},world.bank.loanSeconds,receipt,{kind,missionId,originalPrincipalCents:amountCents});
  return id;
}
export function repayLocal(world, amountCents, loanId = null) {
  const loan = world.bank.loanState.loans.find(l=>(!loanId || l.id===loanId) && l.principalCents+l.interestCents>0);
  if (!loan) throw new Error('No outstanding loan.');
  const id=crypto.randomUUID();
  const receipt={id,label:'Loan repayment: '+(loan.vehicleName||loan.missionId||'General loan'),amount:amountCents/100,
    account:'bank',credit:false,vehicleId:loan.vehicleId,time:Date.now(),balanceBefore:world.bank.balance,
    balanceAfter:world.bank.balance-amountCents/100,details:{loanId:loan.id}};
  commit(world,{id,type:'repay',loanId:loan.id,amountCents},world.bank.loanSeconds,receipt);
}
export function tickBankLoans(world, dt) {
  const bk = world.bank;
  if (world.bankUiOpen || world.vehicleUiOpen || bk.loanError || !Number.isFinite(dt) || dt <= 0) return;
  const nextSeconds = bk.loanSeconds + dt;
  const day = Math.floor(nextSeconds / economyPolicy(world).daySeconds);
  if (day <= bk.loanState.day) { bk.loanSeconds = nextSeconds; return; }
  try { commit(world,{id:`day-${day}`,type:'advanceDay',day},nextSeconds); bk.loanClockError = null; }
  catch (e) { bk.loanClockError = e.message; }
}
