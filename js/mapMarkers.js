// Shared upright art and screen-space clustering for both maps.
import { presentationArt } from './uiArt.js';
const images=new Map();
function markerImage(kind){if(!presentationArt)return null;if(kind==='nitro')kind='pump';if(!images.has(kind)){const image=new Image();image.src='/assets/ui/markers/marker-'+kind+'.svg';images.set(kind,image);}return images.get(kind);}
export function collectMapMarkers(world){
 const sites=[],add=(pos,kind,label,category='services')=>{if(pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.z))sites.push({pos,kind,label,category});};
 for(const m of world.bank?.machines||[])if(!m.dead)add(m.pos,'bank','Bank / ATM');
 add(world.city.authoredWorld?.bankSockets().find(s=>s.name==='socket_atm')?.pos,'bank','Harbour Mutual');
 add(world.dealerPos,'showroom','Auto Palace');add(world.workshopPos,'garage','Workshop');
 add(world.city.authoredWorld?.socket('mendez-garage','socket_workshop_pad'),'garage','Mendez Motor Works');
 add(world.nitroPos,'nitro','Nitro Station');add(world.storePos,'contact','Store');
 for(const s of world.gas?.stations||[])add(s.pos,'pump','Petrol');
 for(const v of world.ownedVehicleInstances?.values?.()||[])if(!v.dead)add(v.pos,'owned','Owned vehicle');
 for(const s of world.shops||[])add(s.pos,'contact','Shop','activities');
 for(const s of world.mapRamps||[])add(s.pos,'hazard','Stunt','activities');
 for(const s of world.mapSkulls||[])add(s.pos,'hazard','Challenge','activities');
 add(world.medic?.hospital,'shelter','Hospital');add(world.armsdealer?.pos,'contact','Arms dealer');
 for(const b of world.properties?.list||[])add(b.pos,'contact',b.owned?(b.pot>0?b.name+' — $'+b.pot:b.name):b.name+' (for sale)',b.owned?'services':'activities');
 if(world.vault&&world.vault.state==='idle'&&world.vault.doneDay!==world.dailyDay)add(world.vault.pos,'hazard','The Vault','activities');
 for(const v of [...(world.cops||[]),...(world.policeHelis||[])])if(!v.dead)add(v.pos,'police','Police','police');
 for(const v of world.helis||[])if(!v.dead&&v!==world.player.inHeli)add(v.pos,'owned','Helicopter');
 for(const v of world.tanks||[])if(!v.dead)add(v.pos,'hazard','Tank','police');
 for(const pk of world.pickups||[])add(pk.pos,'owned',pk.type,'activities');
 const m=world.mission;if(m)add(m.active?m.objectivePos:m.markerPos,'mission',m.active?'Objective':'Job','objectives');
 const stage=world.campaignService?.currentStage();if(stage)add(stage.position,'mission',stage.label,'objectives');
 for(const[key,value]of Object.entries(world))if(key.endsWith('Blip')&&value)add(value,key==='fireBlip'||key==='disasterBlip'||key==='bombBlip'?'hazard':'mission',key.slice(0,-4)+' objective','objectives');
 add(world.waypoint,'waypoint','Waypoint','objectives');
 return sites;
}
export function layoutMapMarkers(sites,project,{width,height=width,size=18,margin=size/2+7,pinOffscreen=()=>true}={}){
 const points=sites.map(site=>{
  const[x,y]=project(site.pos.x,site.pos.z),dx=x-width/2,dy=y-height/2;
  const factor=Math.min(1,(width/2-margin)/Math.max(Math.abs(dx),1),(height/2-margin)/Math.max(Math.abs(dy),1));
  return {...site,x:width/2+dx*factor,y:height/2+dy*factor,edge:factor<1,angle:Math.atan2(dy,dx)};
 }).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&(!p.edge||pinOffscreen(p)));
 const priority={mission:0,waypoint:1,nitro:2,contact:2,pump:4};
 points.sort((a,b)=>(priority[a.kind]??3)-(priority[b.kind]??3));
 const groups=[];
 for(const p of points){const group=groups.find(g=>g[0].edge===p.edge&&(!p.edge||Math.cos(g[0].angle-p.angle)>.92)&&Math.hypot(g[0].x-p.x,g[0].y-p.y)<30);if(group)group.push(p);else groups.push([p]);}
 return groups.flatMap(members=>members.length>=4?[{...members[0],members,count:members.length,badge:members.length>9?'9+':String(members.length),scale:members[0].edge?.7:1}]:members.map((p,i)=>({...p,members:[p],count:1,badge:'',crowded:i>0,scale:p.edge||i>0?.7:1})));
}
export function drawMapMarkers(ctx,world,project,{size=18,labels=false,width=ctx.canvas.width,height=ctx.canvas.height,filter=true,sites=collectMapMarkers(world),pinOffscreen}={}){
 const visible=filter?sites.filter(s=>s.category==='objectives'||world.settings?.['map'+s.category[0].toUpperCase()+s.category.slice(1)]!==false):sites;
 const layout=layoutMapMarkers(visible,project,{width,height,size,...(pinOffscreen?{pinOffscreen}:{})});
 for(const p of layout){
  ctx.save();ctx.translate(p.x,p.y);const isNitro=p.kind==='nitro',markerSize=isNitro?Math.max(size*1.7,24):size*(p.scale||1),color=p.kind==='police'?'#669bff':p.kind==='hazard'?'#f08060':'#88d4c0';
  ctx.fillStyle=isNitro?'#34220b':'#142c2f';ctx.beginPath();ctx.arc(0,0,isNitro?Math.max(size*.78,14):size*.64,0,Math.PI*2);ctx.fill();
  if(isNitro){ctx.strokeStyle='#ffd365';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,Math.max(size*.78,14),0,Math.PI*2);ctx.stroke();}
  const image=markerImage(p.kind);
  if(image&&image.complete&&image.naturalWidth)ctx.drawImage(image,-markerSize/2,-markerSize/2,markerSize,markerSize);
  else{ctx.fillStyle=color;ctx.font='bold '+Math.round(size*.7)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.kind[0].toUpperCase(),0,0);}
  if(isNitro){ctx.font='900 '+Math.round(markerSize*.9)+'px Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='#1c160b';ctx.fillStyle='#ffe08a';ctx.strokeText('N',0,1);ctx.fillText('N',0,1);}
  if(p.edge){ctx.save();ctx.rotate(p.angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(size*.91,0);ctx.lineTo(size*.52,-4);ctx.lineTo(size*.52,4);ctx.closePath();ctx.fill();ctx.restore();}
  if(p.count>1){ctx.fillStyle='#f4eee3';ctx.beginPath();ctx.arc(size*.4,-size*.4,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#142c2f';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.badge,size*.4,-size*.4);}
  if(labels&&!p.edge&&!p.crowded){ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.strokeStyle='#142c2f';ctx.lineWidth=3;ctx.fillStyle='#f4eee3';const label=p.count>1?p.count+' nearby places':p.label;const x=Math.max(-p.x+65,Math.min(width-p.x-65,0));ctx.strokeText(label,x,size/2+5);ctx.fillText(label,x,size/2+5);}
  if(p.edge&&!p.crowded){const focus=world.player?.inCar?.pos||world.player?.pos;if(focus){const d=Math.hypot(p.pos.x-focus.x,p.pos.z-focus.z),label=d>=1000?(d/1000).toFixed(1)+' km':Math.round(d)+' m';ctx.font='9px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f4eee3';ctx.strokeStyle='#142c2f';ctx.lineWidth=3;const x=-Math.cos(p.angle)*25,y=-Math.sin(p.angle)*21;ctx.strokeText(label,x,y);ctx.fillText(label,x,y);}}
  ctx.restore();
 }return layout;
}
export function drawServiceMarkers(ctx,world,project,size=16,labels=false){return drawMapMarkers(ctx,world,project,{size,labels,sites:collectMapMarkers(world).filter(s=>s.category==='services')});}
export function drawFuelMarker(ctx,x,y,size=16){return drawMapMarkers(ctx,{settings:{}},()=>[x,y],{size,sites:[{pos:{x:0,z:0},kind:'pump',label:'Petrol',category:'services'}]});}
