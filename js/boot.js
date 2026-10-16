import {loadingHints,presentationArt} from './uiArt.js';
// Keep failure/retry reachable even when a dependency cannot load.
const screen=document.createElement('section');screen.id='boot-loading';screen.setAttribute('role','status');screen.setAttribute('aria-live','polite');
screen.style.cssText='position:fixed;inset:0;z-index:20000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;box-sizing:border-box;background:radial-gradient(ellipse at top,#386e70,#142c2f 60%,#0a171b);color:#fff6e9;font:16px/1.5 system-ui;text-align:center';
const title=document.createElement('h1');title.textContent='OPEN CITY';title.style.cssText='letter-spacing:.25em;font-size:clamp(28px,5vw,64px);margin:0';
const status=document.createElement('p');status.textContent='Loading game modules…';
const progress=document.createElement('progress');progress.max=4;progress.style.cssText='width:min(540px,90vw);height:12px;accent-color:#88d4c0';progress.setAttribute('aria-label','Game preparation');
const hint=document.createElement('p');hint.textContent=loadingHints[Math.floor(Math.random()*loadingHints.length)];hint.style.cssText='max-width:640px;background:#102326d9;padding:12px 18px;border-radius:6px';
if(presentationArt){const plate=new Image();plate.alt='Coastal Open City';plate.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1;opacity:.45';let plateName='first_launch';try{const key='open-city-loading-seen:'+document.title;if(sessionStorage.getItem(key))plateName='load_'+String(1+Math.floor(Math.random()*6)).padStart(2,'0');sessionStorage.setItem(key,'1');}catch{}plate.src='/assets/ui/loading/'+plateName+'.webp';plate.onerror=()=>plate.remove();screen.style.isolation='isolate';screen.append(plate);}
screen.append(title,status,progress,hint);document.body.append(screen);
window.addEventListener('open-city-loading',e=>{const d=e.detail;status.textContent=d.label;if(Number.isFinite(d.completed))progress.value=d.completed;else progress.removeAttribute('value');});
await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
try{await import('./main.js');screen.remove();}
catch(e){
 status.textContent='The game could not finish loading.';progress.remove();
 hint.textContent='Check the connection, then retry. Existing saves were not reset. '+String(e.message||e);
 const retry=document.createElement('button');retry.textContent='Retry loading';retry.style.cssText='padding:12px 24px;font:inherit;background:#88d4c0;color:#142c2f;border:0;border-radius:6px;cursor:pointer';retry.onclick=()=>location.reload();screen.append(retry);retry.focus();
 console.error('Open City startup failed',e);
}
