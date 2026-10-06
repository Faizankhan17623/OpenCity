// Synchronous transactions share the game's authoritative local save snapshot.
export function vehicleTransaction(world, {label, amount, account='cash', credit=false, vehicleId=null, details=undefined, apply=()=>{}, rollback=()=>{}}) {
  if (!Number.isSafeInteger(amount) || amount<0) throw new Error('Invalid transaction amount.');
  if (!['cash','bank'].includes(account)) throw new Error('Choose cash or local bank funds.');
  const cash=world.money, bank=world.bank?.balance;
  const balance=account==='cash'?cash:bank;
  if (!Number.isFinite(balance) || (!credit && balance<amount)) throw new Error(`Not enough ${account==='cash'?'cash':'local bank funds'}.`);
  const receipts=world.vehicleReceipts || [];
  const receipt={id:crypto.randomUUID(),label,amount,account,credit,vehicleId,details,time:Date.now(),balanceBefore:balance,balanceAfter:balance+(credit?amount:-amount)};
  try {
    if(account==='cash')world.money=receipt.balanceAfter;else world.bank.balance=receipt.balanceAfter;
    apply();
    world.vehicleReceipts=[receipt,...receipts].slice(0,100);
    if(world.onSave?.()!==true)throw new Error('Could not save this transaction.');
  } catch(error) {
    world.money=cash;if(world.bank)world.bank.balance=bank;
    world.vehicleReceipts=receipts;rollback();
    throw new Error(`${error.message} No payment was taken.`);
  }
  return receipt;
}
