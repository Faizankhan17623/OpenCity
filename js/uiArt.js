// Local presentation URLs. Source images stay on the art drive.
import { runtime } from './runtime.js';
// An edition that ships without the art (presentationArt: false) never requests
// it, so the console stays free of 404s; other editions are unaffected.
export const presentationArt = runtime.profile.presentationArt !== false;
export const loadingHints=[
  "Vehicles burn petrol. Run the tank dry and you stop where you are.",
  "A full tank will not fix a failed engine.",
  "Pumps charge by the litre. Stop at the pump and hold E.",
  "You can carry up to $10,000 in cash. Anything over goes straight to the bank.",
  "Shift+K opens the bank, wherever you are.",
  "F4 shows your vehicles, the workshop and city services.",
  "Test drives are free and last two minutes. The car goes back afterwards.",
  "A part that does not fit this vehicle is never offered.",
  "Repair only what is broken. Each system is priced separately.",
  "Lost your car? Recovery brings it back to the workshop.",
  "Loan interest builds each day you play, on what you still owe.",
  "Repay a loan whenever you like. There are no late fees.",
  "A financed vehicle can't be sold until its loan is repaid.",
  "An auction bid holds your money. Get outbid and it comes straight back.",
  "Get caught driving and your car is towed to the impound lot.",
  "Nitro is bought at the station bay, from your bank balance."
];
const portraits=new Set(["kamila","celia","dara","dev","imani","kai","leela","mercer","nora","rook","rosa","sal","tessa","ada","amel","anja","bea","bellamy","duarte_sr","ellis","ewan","harlan","ines","irene","ivo","jo","joel","june","kells","leon","luz","mara","milo","mira","niko","oren","owen","paz","pia","rina","sef","suri","tomas","vale","vaughn"]);
export function portraitUrl(name){if(!presentationArt)return null;let key=String(name||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'_');if(key==='mother')key='kamila';if(!portraits.has(key))key=key.split('_').find(part=>portraits.has(part))||key;return portraits.has(key)?'assets/ui/portraits/portrait_'+key+'_96.webp':null;}
export const chapterArt=(arc,revealed=false)=>!presentationArt?null:'assets/ui/loading/chapter_'+Math.max(1,Math.min(6,arc|0))+'_'+(revealed?'revealed':'locked')+'.webp';
