// Pure local economy foundation. Money is integer cents, rates are basis points.
const integer = n => Number.isSafeInteger(n) && n >= 0;
function requireValue(ok, message) { if (!ok) throw new Error(message); }
export function newLoanLedger() {
  return { version: 1, day: 0, balanceCents: 0, loans: [], transactions: [] };
}
export function validateLoanLedger(s) {
  requireValue(s?.version === 1 && integer(s.day) && integer(s.balanceCents), 'Invalid ledger');
  requireValue(Array.isArray(s.loans) && Array.isArray(s.transactions), 'Invalid ledger records');
  const ids = new Set();
  for (const l of s.loans) {
    requireValue(typeof l.id === 'string' && l.id.length > 0 && !ids.has(l.id), 'Invalid loan ID');
    ids.add(l.id);
    requireValue(integer(l.principalCents) && integer(l.interestCents) && integer(l.rateBps)
      && l.rateBps <= 10000 && integer(l.lastDay) && l.lastDay <= s.day, 'Invalid loan');
  }
  const tx = new Set();
  for (const t of s.transactions) {
    requireValue(typeof t.id === 'string' && t.id && !tx.has(t.id) && typeof t.fingerprint === 'string', 'Invalid transaction');
    tx.add(t.id);
  }
  return s;
}
function checkedAdd(a, b) { const n = a + b; requireValue(integer(n), 'Money overflow'); return n; }
export function transitionLoanLedger(previous, command) {
  validateLoanLedger(previous);
  requireValue(command && typeof command.id === 'string' && command.id.length > 0, 'Transaction ID required');
  const { type, loanId, amountCents, rateBps, day } = command;
  const fingerprint = JSON.stringify([type, loanId, amountCents, rateBps, day]);
  const old = previous.transactions.find(t => t.id === command.id);
  if (old) {
    requireValue(old.fingerprint === fingerprint, 'Transaction ID reused with different input');
    return structuredClone(previous);
  }
  const next = structuredClone(previous);
  if (type === 'borrow') {
    requireValue(typeof loanId === 'string' && loanId && !next.loans.some(l => l.id === loanId), 'Loan ID already exists');
    requireValue(integer(amountCents) && amountCents > 0 && integer(rateBps) && rateBps <= 10000, 'Invalid quote');
    next.loans.push({ id: loanId, principalCents: amountCents, interestCents: 0, rateBps, lastDay: next.day });
    next.balanceCents = checkedAdd(next.balanceCents, amountCents);
  } else if (type === 'advanceDay') {
    requireValue(integer(day) && day >= next.day, 'Game day cannot move backwards');
    for (const l of next.loans) {
      // BigInt avoids intermediate overflow; half-cent rounds up each day.
      const daily = (BigInt(l.principalCents) * BigInt(l.rateBps) + 5000n) / 10000n;
      const charge = daily * BigInt(day - l.lastDay);
      requireValue(charge <= BigInt(Number.MAX_SAFE_INTEGER), 'Interest overflow');
      l.interestCents = checkedAdd(l.interestCents, Number(charge));
      l.lastDay = day;
    }
    next.day = day;
  } else if (type === 'repay') {
    const l = next.loans.find(l => l.id === loanId);
    requireValue(l && integer(amountCents) && amountCents > 0, 'Invalid repayment');
    requireValue(amountCents <= next.balanceCents && amountCents <= checkedAdd(l.principalCents, l.interestCents), 'Repayment exceeds funds or debt');
    const interestPaid = Math.min(amountCents, l.interestCents);
    l.interestCents -= interestPaid;
    l.principalCents -= amountCents - interestPaid;
    next.balanceCents -= amountCents;
  } else {
    throw new Error('Unsupported loan command');
  }
  next.transactions.push({ id: command.id, fingerprint });
  return validateLoanLedger(next);
}

// Adapter is intentionally not attached to the legacy game wallet yet. The
// caller supplies an edition-specific key and authoritative opening snapshot.
// Persist first; publish the changed state only after the write succeeds.
export function openLoanStore(storage, key, initial = newLoanLedger()) {
  requireValue(typeof key === 'string' && key.length > 0, 'Save key required');
  const raw = storage.getItem(key);
  let current = validateLoanLedger(raw === null ? structuredClone(initial) : JSON.parse(raw));
  return {
    snapshot: () => structuredClone(current),
    commit(command) {
      const next = transitionLoanLedger(current, command);
      storage.setItem(key, JSON.stringify(next));
      current = next;
      return structuredClone(current);
    },
  };
}
