export const NITRO_PRICE_PER_PERCENT = 2;
export function purchaseNitro(world, vehicle) {
  if (!vehicle || vehicle.dead || vehicle.tank) throw new Error('Drive a car or motorcycle to the station first.');
  if (vehicle.nitro >= 500) throw new Error('Nitro is already full at 500%.');
  const current = Math.max(0, Math.min(500, vehicle.nitro ?? 100));
  const points = Math.min(500 - current, Math.floor(Math.max(0, world.bank?.balance || 0) / NITRO_PRICE_PER_PERCENT));
  if (!Number.isFinite(world.bank?.balance) || points <= 0) throw new Error(`Nitro uses BANK funds. BANK $${world.bank?.balance ?? 0} · CASH $${world.money ?? 0}. Press 6 here to deposit cash, then 5 to refill.`);
  const price = Math.round(points * NITRO_PRICE_PER_PERCENT * 100) / 100;
  const balance=world.bank.balance, previous=vehicle.nitro, previousReserve=vehicle.pumpNitro;
  world.bank.balance -= price;
  vehicle.nitro=current+points;vehicle.pumpNitro=true;
  if(world.onSave?.()!==true){world.bank.balance=balance;vehicle.nitro=previous;vehicle.pumpNitro=previousReserve;throw new Error('Could not save. Your bank account was not charged.');}
  return price;
}

export function depositNitroCash(world) {
  const amount = Math.floor(world.money || 0);
  if (amount <= 0) throw new Error('No cash available to deposit.');
  if (!Number.isFinite(world.bank?.balance)) throw new Error('Bank account is unavailable. Open City Bank with Shift+K.');
  const cash = world.money, bank = world.bank.balance;
  world.money -= amount;
  world.bank.balance += amount;
  if (world.onSave?.() !== true) {
    world.money = cash; world.bank.balance = bank;
    throw new Error('Could not save. No cash was deposited.');
  }
  return amount;
}

export function tickNitro(vehicle, dt, boosting) {
  vehicle.nitro = Math.max(0, Math.min(vehicle.pumpNitro ? 500 : 100, vehicle.nitro ?? 100));
  if (boosting) {
    vehicle.nitro = Math.max(0, vehicle.nitro - 40 * dt);
    if (vehicle.nitro === 0) vehicle.pumpNitro = false;
  } else if (!vehicle.pumpNitro) {
    vehicle.nitro = Math.min(100, vehicle.nitro + (vehicle.bigNitro ? 14 : 9) * dt);
  }
  return vehicle.nitro;
}
