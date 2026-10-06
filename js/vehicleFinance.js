import { economyPolicy, validateBorrowing } from './economyPolicy.js';
﻿import { LOAN_RATE_BPS, LOAN_CAP_CENTS, loanDebt } from './bankLoans.js';
import { transitionLoanLedger } from './loanLedger.js';

// Introductory local-game financing; quoted terms are retained with the purchase.
export function quoteVehicleFinance(world, deal, downPayment, account='cash') {
  if (!deal || !Number.isSafeInteger(deal.cost) || deal.cost<=0) throw Error('Choose a listed vehicle.');
  const minimum=Math.ceil(deal.cost*.2);
  if (!Number.isSafeInteger(downPayment) || downPayment<minimum || downPayment>=deal.cost) throw Error(`Down payment must be whole dollars from $${minimum} to $${deal.cost-1}.`);
  if (!['cash','bank'].includes(account)) throw Error('Choose cash or local bank funds.');
  if (world.bank.loanError) throw Error(world.bank.loanError);
  const principalCents=(deal.cost-downPayment)*100;
  validateBorrowing(world,principalCents,{kind:'vehicle'});
  const policy=economyPolicy(world);
  const balance=account==='cash'?world.money:world.bank.balance;
  if (!Number.isFinite(balance)||balance<downPayment) throw Error('Not enough funds for the down payment in the selected account.');
  return Object.freeze({id:crypto.randomUUID(),name:deal.name,price:deal.cost,downPayment,account,
    principalCents,rateBps:policy.rateBps,dailyInterestCents:Math.round(principalCents*policy.rateBps/10000),
    capCents:policy.principalCapCents,quotedDay:world.bank.loanState.day});
}
export function prepareVehicleLoan(world, deal, quote, vehicleId) {
  if (!quote || typeof quote.id!=='string' || !quote.id) throw Error('Review a finance quote first.');
  // Recheck availability at confirmation. The loan never becomes spendable cash.
  const current=quoteVehicleFinance(world,deal,quote.downPayment,quote.account);
  for(const key of ['name','price','principalCents','rateBps','dailyInterestCents','capCents'])if(quote[key]!==current[key])throw Error('The quote has changed. Review a new quote.');
  if (world.bank.loanState.loans.some(l=>l.id===quote.id)) throw Error('This quote has already been used.');
  const base={...world.bank.loanState,balanceCents:Math.round(world.bank.balance*100)};
  const next=transitionLoanLedger(base,{id:quote.id,type:'borrow',loanId:quote.id,amountCents:quote.principalCents,rateBps:quote.rateBps});
  next.balanceCents=base.balanceCents; // proceeds paid directly to dealer
  Object.assign(next.loans.at(-1),{kind:'vehicle',vehicleId,vehicleName:deal.name,purchaseId:quote.id,originalPrincipalCents:quote.principalCents,quote:{...quote}});
  return next;
}
export function vehicleFinanceStatus(world, record) {
  if(!record.loanId)return null;
  const loan=world.bank.loanState.loans.find(l=>l.id===record.loanId);
  if(!loan||world.bank.loanError)return {error:'Loan record unavailable. Visit the bank before making changes.'};
  return {loanId:loan.id,principalCents:loan.principalCents,interestCents:loan.interestCents,
    debtCents:loan.principalCents+loan.interestCents,rateBps:loan.rateBps,
    dailyInterestCents:Math.round(loan.principalCents*loan.rateBps/10000)};
}

export function vehicleTransferBlock(world,car) {
  if(car?.temporary)return 'Return the test-drive vehicle to the showroom; it cannot be sold or wagered.';
  if(!car?.ownedId)return null;
  const record=world.ownedVehicles.find(r=>r.id===car.ownedId);
  if(!record)return 'Vehicle ownership record unavailable.';
  const finance=vehicleFinanceStatus(world,record);
  if(finance?.error)return finance.error;
  if(finance?.debtCents>0)return 'Repay this vehicle loan at City Bank before selling or wagering it.';
  return null;
}
