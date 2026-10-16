import { runtime } from './runtime.js';
import { createSaveStorage, parseSave, parseSavePackage, SAVE_PACKAGE_FORMAT, MAX_SAVE_PACKAGE_BYTES } from './saveStorage.js';

const { live: LIVE_KEY, slot: SLOT_KEY, active: ACTIVE_KEY, name: NAME_KEY } = runtime.saveKeys;
export const SLOT_COUNT = 3;
const store = createSaveStorage(localStorage, runtime.saveKeys, runtime.profile.id, {
  mapVersion:runtime.profile.mapVersion,
  coreVersion:runtime.profile.coreVersion,
  contentIds:runtime.profile.vehicles.map(v=>v.id),
});
let bootSnapshot = {}, bootError = null, booted = false, releaseLock;
const lsGet = k => localStorage.getItem(k);
const lsSet = (k,v) => store.setMetadata(k,v);
const lsDel = k => store.setMetadata(k,null);
const validSlot = i => { if (!Number.isInteger(i) || i < 0 || i >= SLOT_COUNT) throw Error('Invalid slot.'); };
export function activeSlot() { if (booted) return store.loadedSlot; const n = Number(lsGet(ACTIVE_KEY) || 0); return Number.isInteger(n) && n >= 0 && n < SLOT_COUNT ? n : 0; }
export function slotName(i) { validSlot(i); return lsGet(NAME_KEY(i)) || 'SLOT ' + (i+1); }
export function setSlotName(i,name) { validSlot(i); const n=String(name||'').trim().slice(0,18); if(n)lsSet(NAME_KEY(i),n);else lsDel(NAME_KEY(i)); }
export function suspendSaveWrites(reason) { store.suspend(reason); }
export function canWriteSave() { return store.writable && !bootError; }
export function readActiveSave() { return structuredClone(bootSnapshot); }
export async function bootActiveSlot() {
  const i=activeSlot(); let owns=false;
  if(navigator.locks?.request) {
    owns=await new Promise(resolve=>{
      navigator.locks.request('open-city-save:'+runtime.profile.id,{mode:'exclusive',ifAvailable:true},lock=>{
        resolve(!!lock); if(lock)return new Promise(release=>{releaseLock=release;});
      }).catch(()=>resolve(false));
    });
  }
  try { bootSnapshot=parseSave(store.boot(i,owns),{allowEmpty:true}); }
  catch(e) { bootError=e.message; bootSnapshot={}; }
  booted=true;
  window.addEventListener('pagehide',()=>{store.invalidate();releaseLock?.();});
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
  if(bootError || !owns) {
    const banner=document.createElement('div');banner.id='save-warning';banner.setAttribute('role','alert');
    banner.style.cssText='position:fixed;top:0;left:0;right:0;z-index:10000;background:#572c26;color:white;padding:12px;text-align:center;font:15px system-ui';
    banner.textContent=bootError?'Save could not be loaded: '+bootError+' Use a slot recovery copy or import a backup. Progress is protected.':navigator.locks?'Another game tab owns saving. Close it and reload this tab before playing.':'This browser cannot lock saves safely. Open the game in a current browser on localhost or HTTPS.';
    document.body.append(banner);
  }
}
export function commitActiveSave(snapshot) {
  if(bootError)throw Error('Recover the unreadable save before playing.');
  const copy=structuredClone(snapshot); store.commit(copy); bootSnapshot=copy; return true;
}
export function mirrorActiveSlot() { /* canonical slots are already durable */ }
export function switchToSlot(i) { validSlot(i); if(i===activeSlot())return;store.activate(i);location.reload(); }
export function slotSummary(i) {
  const raw=store.readSlot(i);if(!raw)return null;
  try { const s=parseSave(raw,{allowEmpty:true});if(!Object.keys(s).some(k=>k!=='_save'))return null;
    return {empty:false,money:s.money||0,bank:s.bank||0,missions:s.missions||0,level:1+Math.floor(Math.sqrt((s.xp||0)/120)),char:s.char||'weaver',crowned:!!s.crowned,packages:(s.tokens||[]).length};
  }catch{return {empty:false,corrupt:true};}
}
export function previewSaveImport(text) {
  const parsed=parseSavePackage(text),data=parsed.data,warnings=[]; const sourceEdition=data._save?.edition || 'legacy';
  if(sourceEdition!==runtime.profile.id)warnings.push('Create a '+runtime.profile.id+' copy of this '+sourceEdition+' save. The original is preserved.');
  const sourceContentIds=Array.isArray(data._save?.contentIds)?data._save.contentIds:[];
  const localContentIds=new Set(runtime.profile.vehicles.map(v=>v.id));
  const unavailable=sourceContentIds.filter(id=>!localContentIds.has(id));
  if(unavailable.length)warnings.push('This edition lacks saved content: '+unavailable.slice(0,5).join(', ')+(unavailable.length>5?' and '+(unavailable.length-5)+' more':'')+'. The imported copy will use documented fallbacks; the original is kept with save exports.');
  if(data._save?.mapVersion&&data._save.mapVersion!==runtime.profile.mapVersion)warnings.push('The save was created for map version '+data._save.mapVersion+'. World positions may use current-edition fallbacks; the source copy is preserved.');
  if(data._save?.coreVersion&&data._save.coreVersion!==runtime.profile.coreVersion)warnings.push('The save came from core '+data._save.coreVersion+' and will be stamped for '+runtime.profile.coreVersion+'.');
  const descriptors=[data.starterSedan,data.garageVehicle,...(data.lockup||[]),...(data.vehicleInventory||[]).map(r=>r?.descriptor)].filter(Boolean);
  for(const d of descriptors)if(d.modelId && !runtime.vehicle(d.modelId)) {
    warnings.push('Unavailable model '+d.modelId+' will use the starter vehicle appearance. Ownership, fuel, damage and loan records are retained.');
    d.sourceModelId=d.modelId;d.modelId=runtime.profile.starterVehicle.modelId;
  }
  const presets=runtime.profile.graphics.resolutionHeights || [720,900,1080];
  if(data.settings?.renderHeight && !presets.includes(data.settings.renderHeight)) { data.settings.renderHeight=presets[0];warnings.push('Render resolution reset to a supported preset.'); }
  delete data._save;
  return {data,source:parsed.source,warnings:[...new Set(warnings)],summary:'Cash $'+(data.money||0)+' · Bank $'+(data.bank||0)+' · Missions '+(data.missions||0)};
}
export function confirmSaveImport(text) { const p=previewSaveImport(text);return confirm(p.summary+'\n'+p.warnings.join('\n')+'\nReplace the selected slot? A recovery copy will be kept.'); }
export function importIntoSlot(i,text) { const p=previewSaveImport(text);store.replace(i,p.data,{source:p.source});if(i===activeSlot())location.reload(); }
export function copySlot(from,to) {validSlot(from);validSlot(to);if(from===to)return;const raw=store.readSlot(from);if(!raw)throw Error('Source slot is empty.');store.replace(to,parseSave(raw,{allowEmpty:true}),{source:store.importSource(from)||raw});if(to===activeSlot())location.reload();}
export function deleteSlot(i) { store.replace(i,{}); if(i===activeSlot())location.reload(); }
export function recoverSlot(i) { store.recover(i);if(i===activeSlot())location.reload(); }
export function hasRecovery(i) { validSlot(i);return !!lsGet(store.backup(i)); }
export function buildSlotExport(i) {
  const raw=store.readSlot(i)||'{}';
  const save=parseSave(raw,{allowEmpty:true}),source=store.importSource(i);
  const bundle={format:SAVE_PACKAGE_FORMAT,save,...(source?{migrationSource:source}:{})};
  const text=JSON.stringify(bundle);
  if(text.length>MAX_SAVE_PACKAGE_BYTES)throw Error('This save and its preserved source are too large to export together.');
  return text;
}
export function exportSlot(i) {
  const text=buildSlotExport(i),a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download='open-city-slot-'+(i+1)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
export function slotBlob(i) { const raw=store.readSlot(i);return raw?parseSave(raw,{allowEmpty:true}):null; }
export function writeSlotBlob(i,obj,cloudRevision=0) { const raw=JSON.stringify(obj);store.replace(i,parseSave(raw),{source:raw,cloudRevision}); }
export function slotCloudRev(i) {validSlot(i);const saved=slotBlob(i)?._save;let metadata;try{metadata=JSON.parse(lsGet(runtime.saveKeys.cloudRev(i))||'0');}catch{}return metadata?.epoch===(saved?.cloudEpoch||0)?metadata.rev:(saved?.cloudRevision||0);}
export function setSlotCloudRev(i,rev) { validSlot(i);lsSet(runtime.saveKeys.cloudRev(i),JSON.stringify({rev:Math.max(0,Math.trunc(rev)||0),epoch:slotBlob(i)?._save?.cloudEpoch||0})); }
export { SLOT_COUNT as CLOUD_SLOT_COUNT };

// ---------- start-screen UI ----------
// A row of slot cards injected above the character picker. Purely DOM; the
// game loop hasn't started yet when this is shown.

// `cloud` (optional) = { available(), status(slot), pull(slot), remote:[{slot,rev,updated_at,summary}] }
// so the picker can show sync state + a "pull from cloud" action per slot.
export function buildSlotPicker(container, cloud = null) {
  const wrap = document.createElement('div');
  wrap.id = 'slotpick';
  wrap.style.cssText = 'pointer-events:auto;margin-bottom:14px;';
  const cloudOn = !!cloud?.available?.();
  wrap.innerHTML =
    '<div style="color:#8ea6bb;font:800 11px Consolas,monospace;letter-spacing:.3em;margin-bottom:10px">SAVE SLOT' +
    (cloudOn ? ' <span style="color:#7cf78c">· ☁ SYNCED</span>' : '') + '</div>' +
    '<div id="slotrow" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"></div>';
  const row = wrap.querySelector('#slotrow');
  const active = activeSlot();
  const remoteBySlot = new Map((cloud?.remote || []).map((r) => [r.slot, r]));

  for (let i = 0; i < SLOT_COUNT; i++) {
    const sum = slotSummary(i);
    const card = document.createElement('div');
    card.tabIndex=0; card.setAttribute('role','group');card.setAttribute('aria-label',slotName(i));
    card.style.cssText =
      'width:150px;padding:10px 9px;cursor:pointer;transition:all .15s;' +
      'background:rgba(8,15,24,.72);border:1px solid rgba(140,170,190,.2);' +
      'clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);' +
      (i === active ? 'border-color:#55e6ff;background:rgba(85,230,255,.1);' : '');
    const body = sum && !sum.empty
      ? (sum.corrupt
          ? '<div style="color:#ff8a6a;font:700 11px Arial">corrupt save</div>'
          : `<div style="font:800 13px Consolas,monospace;color:#7cf78c">$${(sum.money + sum.bank).toLocaleString()}</div>` +
            `<div style="font:600 10px Consolas,monospace;color:#cfd8e3;line-height:1.7">LVL ${sum.level} · ${sum.missions} MISS<br>${sum.packages}/20 PKG${sum.crowned ? ' · 👑' : ''}</div>`)
      : '<div style="color:#8ea6bb;font:700 11px Arial">empty — new game</div>';
    const remote = remoteBySlot.get(i);
    let cloudLine = '';
    if (cloudOn) {
      if (remote) {
        const d = new Date(remote.updated_at);
        const when = isNaN(d) ? '' : d.toLocaleDateString();
        // server data: coerce to numbers before it goes into HTML
        const cash = (Number(remote.summary?.money) || 0) + (Number(remote.summary?.bank) || 0);
        const lvl = Math.max(1, Math.floor(Number(remote.summary?.level) || 1));
        cloudLine = `<div style="font:600 9px Consolas,monospace;color:#7cf78c;margin-top:4px">☁ $${cash.toLocaleString()} · LVL ${lvl}${when ? ' · ' + when : ''}</div>`;
      } else {
        cloudLine = `<div style="font:600 9px Consolas,monospace;color:#8ea6bb;margin-top:4px">☁ no cloud copy</div>`;
      }
    }
    card.innerHTML =
      `<div style="font:800 12px Consolas,monospace;letter-spacing:.12em;color:#eef4fb;text-transform:uppercase;margin-bottom:5px">${escapeText(slotName(i))}</div>` +
      body + cloudLine +
      `<div style="display:flex;gap:4px;margin-top:7px;justify-content:center;flex-wrap:wrap">` +
      `<button data-act="rename" title="Rename" style="${MINI}">✎</button>` +
      `<button data-act="export" title="Export to file" style="${MINI}">⬇</button>` +
      `<button data-act="import" title="Import from file" style="${MINI}">⬆</button>` +
      (hasRecovery(i) ? `<button data-act="recover" title="Restore previous save" style="${MINI}">↶</button>` : '') +
      (cloudOn && remote ? `<button data-act="pull" title="Pull this save from the cloud" style="${MINI};color:#7cf78c">☁↓</button>` : '') +
      (sum && !sum.empty ? `<button data-act="copy" title="Duplicate into a free slot" style="${MINI}">⧉</button>` : '') +
      (sum && !sum.empty ? `<button data-act="delete" title="Delete" style="${MINI};color:#ff8a6a">🗑</button>` : '') +
      `</div>`;

    card.onclick = (e) => {
      try {
      const act = e.target?.dataset?.act;
      if(act === 'recover') { if(confirm('Restore the previous save in this slot? The current copy will be retained.')) {recoverSlot(i);rebuild(container,cloud);} return; }
      if (act === 'rename') {
        const nm = prompt('Slot name:', slotName(i));
        if (nm != null) { setSlotName(i, nm); rebuild(container); }
        return;
      }
      if (act === 'export') { exportSlot(i); return; }
      if (act === 'import') {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json,application/json';
        input.onchange = () => {
          const f = input.files?.[0];
          if (!f) return;
          f.text().then((t) => {
            try { if(!confirmSaveImport(t))return; importIntoSlot(i, t); rebuild(container,cloud); }
            catch(e) { alert(e.message); }
          });
        };
        input.click();
        return;
      }
      if (act === 'copy') {
        // First empty slot wins; if every slot is full, ask which to overwrite.
        let target = -1;
        for (let k = 0; k < SLOT_COUNT; k++) if (k !== i && !slotSummary(k)) { target = k; break; }
        if (target < 0) {
          const answer = prompt(`All slots are full. Overwrite which slot? (1-${SLOT_COUNT}, not ${i + 1})`);
          const n = parseInt(answer, 10) - 1;
          if (!(n >= 0 && n < SLOT_COUNT && n !== i)) return;
          if (!confirm(`Overwrite "${slotName(n)}" with a copy of "${slotName(i)}"?`)) return;
          target = n;
        }
        copySlot(i, target);
        rebuild(container, cloud);
        return;
      }
      if (act === 'delete') {
        if (confirm(`Clear "${slotName(i)}"? A recovery copy will be kept.`)) { deleteSlot(i); rebuild(container, cloud); }
        return;
      }
      if (act === 'pull') {
        if (!confirm(`Overwrite "${slotName(i)}" with the cloud save?`)) return;
        Promise.resolve(cloud.pull(i)).then((r) => {
          if (r?.reloading) return; // active slot reloads
          if (r?.error) alert('Cloud pull failed: ' + r.error);
          else rebuild(container, cloud);
        });
        return;
      }
      // plain click on the card = make it active
      if (i !== activeSlot()) switchToSlot(i);
      } catch(e) { alert(e.message); }
    };
    card.onkeydown=e=>{if(e.target===card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();card.click();}};
    row.appendChild(card);
  }
  const legacy=localStorage.getItem('opencity-save-v1');
  if(legacy){const b=document.createElement('button');b.textContent='Import legacy progress into selected slot';b.onclick=()=>{try{if(confirmSaveImport(legacy))importIntoSlot(activeSlot(),legacy);}catch(e){alert(e.message)}};wrap.append(b);}
  container.prepend(wrap);
}

const MINI =
  'pointer-events:auto;cursor:pointer;width:22px;height:22px;padding:0;font-size:11px;' +
  'background:rgba(85,230,255,.12);border:1px solid rgba(85,230,255,.3);color:#eef4fb;' +
  'border-radius:4px;line-height:1;';

function rebuild(container, cloud = null) {
  document.getElementById('slotpick')?.remove();
  buildSlotPicker(container, cloud);
}

function escapeText(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
