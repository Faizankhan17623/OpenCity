// A slot is committed with one localStorage write. Live-save and cloud mirrors
// are compatibility copies and never determine transaction success.
export const SAVE_SCHEMA = 3;
export const MAX_SAVE_BYTES = 2_000_000;

export function parseSave(text, { allowEmpty = false } = {}) {
  if (typeof text !== 'string' || text.length > MAX_SAVE_BYTES) throw Error('Save file is too large.');
  const value = JSON.parse(text);
  if (!value || Array.isArray(value) || typeof value !== 'object') throw Error('Choose an Open City save object.');
  if (!allowEmpty && !['money', 'missions', 'vehicleInventory', 'xp', 'bank'].some(k => Object.hasOwn(value, k))) throw Error('This file does not contain Open City progress.');
  if (value._save?.schema > SAVE_SCHEMA) throw Error('This save needs a newer game version.');
  for (const key of ['money', 'bank', 'xp', 'missions']) {
    if (value[key] !== undefined && (!Number.isFinite(value[key]) || value[key] < 0)) throw Error(`Invalid ${key} in save.`);
  }
  for (const key of ['vehicleInventory', 'vehicleReceipts', 'tokens', 'lockup']) {
    if (value[key] !== undefined && !Array.isArray(value[key])) throw Error(`Invalid ${key} in save.`);
  }
  for (const key of ['settings', 'bankLoans', 'introJob']) {
    if (value[key] !== undefined && (!value[key] || Array.isArray(value[key]) || typeof value[key] !== 'object')) throw Error(`Invalid ${key} in save.`);
  }
  return value;
}

export function createSaveStorage(storage, keys, edition) {
  let writable = false, loadedSlot = null, expected = null, invalidated = false, suspended = null;
  const validSlot = i => { if (!Number.isInteger(i) || i < 0 || i > 2) throw Error('Invalid save slot.'); };
  const canonical = i => keys.slot(i) + '.v3';
  const backup = i => keys.slot(i) + '.backup';
  const get = key => storage.getItem(key);
  const safeMirror = (key, raw) => { try { storage.setItem(key, raw); } catch { /* canonical committed */ } };
  function check() {
    if (suspended) throw Error(suspended);
    if (!writable) throw Error('Saving is locked by another game tab. Close that tab and reload this one.');
    if (invalidated) throw Error('Your save changed. Reload before continuing.');
    if (get(canonical(loadedSlot)) !== expected) throw Error('This save was changed elsewhere. Reload before saving.');
  }
  function readSlot(i) {
    validSlot(i);
    return get(canonical(i)) ?? get(keys.slot(i));
  }
  function stamp(value, slot, prior, cloudRevision, cloudEpoch) {
    return JSON.stringify({ ...value, _save: { schema: SAVE_SCHEMA, edition, slot,
      revision: (prior?._save?.revision || 0) + 1, savedAt: Date.now(),
      cloudRevision: cloudRevision ?? prior?._save?.cloudRevision ?? 0, cloudEpoch: cloudEpoch ?? prior?._save?.cloudEpoch ?? 0 } });
  }
  function replace(i, value, { source = null, cloudRevision, newCloudEpoch = false } = {}) {
    validSlot(i); check();
    const old = readSlot(i);
    // A required recovery copy is written BEFORE replacing any progress.
    if (old != null) storage.setItem(backup(i), old);
    if (source != null) storage.setItem(keys.slot(i) + '.import-source', source);
    let previous; try { previous = old && JSON.parse(old); } catch { previous = null; }
    const next = stamp(value, i, previous, cloudRevision, newCloudEpoch ? (previous?._save?.cloudEpoch||0)+1 : undefined);
    storage.setItem(canonical(i), next);
    if (i === loadedSlot) expected = next;
    safeMirror(keys.slot(i), next);
    if (i === loadedSlot) safeMirror(keys.live, next);
    return next;
  }
  return {
    canonical, backup,
    get writable() { return writable && !invalidated && !suspended; },
    get loadedSlot() { return loadedSlot; },
    boot(i, ownsLock) {
      validSlot(i); loadedSlot = i; writable = ownsLock; invalidated = false;
      expected = get(canonical(i));
      if (expected == null) {
        // Before v3, live was authoritative and an optional slot mirror could lag.
        const live = get(keys.live);
        let sameSlot = true; try { sameSlot = !JSON.parse(live)?._save || JSON.parse(live)._save.slot === i; } catch {}
        const raw = (sameSlot ? live : null) ?? get(keys.slot(i));
        if (raw != null && ownsLock) {
          const value = parseSave(raw, { allowEmpty: true });
          replace(i, value, { source: raw });
        }
      }
      if (expected != null) return expected;
      const live = get(keys.live);
      let useLive = true; try { useLive = !JSON.parse(live)?._save || JSON.parse(live)._save.slot === i; } catch {}
      return (useLive ? live : null) ?? get(keys.slot(i)) ?? '{}';
    },
    readSlot,
    commit(value) { return replace(loadedSlot, value); },
    replace(i, value, options) {
      const raw = replace(i, value, {cloudRevision:0,...options,newCloudEpoch:true});
      safeMirror(keys.cloudRev(i), '0');
      if (i === loadedSlot) invalidated = true;
      return raw;
    },
    activate(i) {
      validSlot(i); check();
      // Slot pointer is the commit. Boot reads that slot directly, not live.
      storage.setItem(keys.active, String(i)); invalidated = true;
    },
    setMetadata(key, value) { check(); if (value == null) storage.removeItem(key); else storage.setItem(key, value); },
    recover(i) {
      const raw = get(backup(i));
      if (!raw) throw Error('No recovery copy is available.');
      return this.replace(i, parseSave(raw, { allowEmpty: true }), { source: raw });
    },
    suspend(reason = "Saving is paused during memory replay. Leave the replay to resume your saved game.") { suspended = String(reason); },
    invalidate() { invalidated = true; },
  };
}
