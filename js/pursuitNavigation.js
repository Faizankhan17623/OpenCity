// Geometry and routing shared by ground and airborne pursuit. No rendering state.
const distance2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function segmentClear(from, to, colliders, padding = 0, verticalPadding = padding) {
  for (const c of colliders || []) {
    let lo = 0, hi = 1;
    for (const axis of ['x', 'y', 'z']) {
      const clearance=axis==='y'?verticalPadding:padding;
      const min = (axis === 'y' ? (c.y0 ?? 0) : c[axis + '0']) - clearance;
      const max = (axis === 'y' ? (c.h ?? Infinity) : c[axis + '1']) + clearance;
      const start = from[axis] ?? 0, delta = (to[axis] ?? 0) - start;
      if (Math.abs(delta) < 1e-9) {
        if (start < min || start > max) { hi = -1; break; }
      } else {
        const a = (min - start) / delta, b = (max - start) / delta;
        lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
      }
    }
    if (lo <= hi) return false;
  }
  return true;
}

// Short, collision-checked bypass for a stopped vehicle. Circular traffic
// clearance matches the scenario driver's stopping distance; building corners
// allow the bypass to continue around a nearby wall without crossing it.
export function planVehicleDetour(from, target, colliders, vehicles = []) {
  const height=1.25,padding=1.6,clearance=3.3;
  const level=p=>({x:p.x,y:height,z:p.z});
  const inBounds=(x,z,margin)=>x>=Math.min(from.x,target.x)-margin&&x<=Math.max(from.x,target.x)+margin&&z>=Math.min(from.z,target.z)-margin&&z<=Math.max(from.z,target.z)+margin;
  const traffic=vehicles.filter(p=>inBounds(p.x,p.z,6));
  const solids=(colliders||[]).filter(c=>(c.h??Infinity)+.8>=height&&(c.y0??0)-.8<=height&&c.x1>=Math.min(from.x,target.x)-8&&c.x0<=Math.max(from.x,target.x)+8&&c.z1>=Math.min(from.z,target.z)-8&&c.z0<=Math.max(from.z,target.z)+8);
  const clear=(a,b)=>{
    if(!segmentClear(level(a),level(b),colliders,padding,.8))return false;
    const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
    return vehicles.every(p=>{const t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/len)):0;return Math.hypot(a.x+t*dx-p.x,a.z+t*dz-p.z)>=clearance;});
  };
  if(clear(from,target))return [level(target)];
  const nodes=[level(from),level(target)];
  for(const p of traffic)for(let i=0;i<8;i++){const angle=i*Math.PI/4,q={x:p.x+Math.cos(angle)*3.7,y:height,z:p.z+Math.sin(angle)*3.7};if(clear(q,q))nodes.push(q);}
  for(const c of solids)for(const x of [c.x0-padding-.15,c.x1+padding+.15])for(const z of [c.z0-padding-.15,c.z1+padding+.15]){const q={x,y:height,z};if(inBounds(x,z,8)&&clear(q,q))nodes.push(q);}
  const costs=nodes.map(()=>Infinity),parents=nodes.map(()=>-1),seen=new Set();costs[0]=0;
  for(let step=0;step<nodes.length;step++){
    let at=-1;for(let i=0;i<nodes.length;i++)if(!seen.has(i)&&(at<0||costs[i]<costs[at]))at=i;
    if(at<0||!Number.isFinite(costs[at]))break;
    if(at===1){const route=[];for(let n=1;n>0;n=parents[n])route.unshift(nodes[n]);return route;}
    seen.add(at);for(let i=1;i<nodes.length;i++)if(!seen.has(i)&&clear(nodes[at],nodes[i])){const cost=costs[at]+distance2(nodes[at],nodes[i]);if(cost<costs[i]){costs[i]=cost;parents[i]=at;}}
  }
  return [];
}

// Conservative sphere/frustum test. Without a camera, defer dispatch.
export function outsideCamera(point, camera, radius = 4) {
  const e = camera?.matrixWorldInverse?.elements;
  if (!e || !Number.isFinite(camera.fov) || !(camera.aspect > 0)) return false;
  const x = e[0] * point.x + e[4] * point.y + e[8] * point.z + e[12];
  const y = e[1] * point.x + e[5] * point.y + e[9] * point.z + e[13];
  const depth = -(e[2] * point.x + e[6] * point.y + e[10] * point.z + e[14]);
  const tanY = Math.tan(camera.fov * Math.PI / 360) / (camera.zoom || 1), tanX = tanY * camera.aspect;
  return depth + radius < (camera.near ?? .1) || depth - radius > (camera.far ?? Infinity)
    || Math.abs(x) > depth * tanX + radius * Math.hypot(1, tanX)
    || Math.abs(y) > depth * tanY + radius * Math.hypot(1, tanY);
}

export function dispatchDue(timers, key, dt, eligible, interval) {
  if (!eligible) { timers[key] = interval; return false; }
  timers[key] = (timers[key] ?? interval) - Math.max(0, dt);
  if (timers[key] > 0) return false;
  timers[key] = interval; // Never catch up several dispatches after a long frame.
  return true;
}

export function selectRoadSpawn({ target, roads, colliders, vehicles = [], hidden, random = Math.random, min = 85, max = 180, attempts = 36 }) {
  if (!roads?.length || !hidden) return null;
  const low = roads[0] + 8, high = roads[roads.length - 1] - 8;
  for (let i = 0; i < attempts; i++) {
    const vertical = random() < .5;
    const cross = vertical ? target.x : target.z, ahead = vertical ? target.z : target.x;
    const nearby = roads.filter(road => Math.abs(road - cross) < max);
    if (!nearby.length) continue;
    const road = nearby[Math.min(nearby.length - 1, Math.floor(random() * nearby.length))];
    const begin = Math.max(low, ahead - max), finish = Math.min(high, ahead + max);
    if (begin > finish) continue;
    const along = begin + random() * (finish - begin), sign = random() < .5 ? -1 : 1;
    const p = { x: vertical ? road + sign * 3 : along, y: 1.5, z: vertical ? along : road - sign * 3 };
    const distance = distance2(p, target);
    if (distance < min || distance > max || !hidden(p, 4)) continue;
    if (!segmentClear(p, p, colliders, 2.2, .8)) continue;
    if (vehicles.some(v => v?.pos && distance2(v.pos, p) < (v.rad ?? 1.6) + 4)) continue;
    return { ...p, y: 0, heading: vertical ? (sign > 0 ? 0 : Math.PI) : sign * Math.PI / 2 };
  }
  return null;
}

export function createRoadNetwork(roads, colliders, {padding=2.2}={}) {
  const nodes = [], edges = [], n = roads.length;
  for (let x = 0; x < n; x++) for (let z = 0; z < n; z++) {
    nodes.push({ x: roads[x], y: 1.5, z: roads[z] }); edges.push([]);
  }
  for (let x = 0; x < n; x++) for (let z = 0; z < n; z++) {
    const a = x * n + z;
    for (const b of [x + 1 < n ? a + n : -1, z + 1 < n ? a + 1 : -1]) {
      if (b < 0 || !segmentClear(nodes[a], nodes[b], colliders, padding, .8)) continue;
      const cost = distance2(nodes[a], nodes[b]); edges[a].push({ to: b, cost }); edges[b].push({ to: a, cost });
    }
  }
  return { nodes, edges, height:1.5, verticalPadding:.8, padding };
}

export function planRoadRoute(from, target, network, colliders) {
  const { nodes, edges } = network;
  const height=network.height??1.5,vertical=network.verticalPadding??.8,padding=network.padding??2.2;
  const start = { x: from.x, y: height, z: from.z }, end = { x: target.x, y: height, z: target.z };
  const nearest = p => nodes.map((node, i) => ({ i, d: distance2(p, node) })).sort((a, b) => a.d - b.d).slice(0, 8);
  const starts = nearest(start).filter(c => segmentClear(start, nodes[c.i], colliders, padding, vertical));
  let goals = nearest(end).filter(c => segmentClear(nodes[c.i], end, colliders, padding, vertical));
  // An indoor/elevated target is approached from its nearest usable intersection.
  const appendTarget = goals.length > 0 && (target.y ?? 0) < 8;
  if (!goals.length) goals = nearest(end).filter(c => edges[c.i].length).slice(0, 1);
  if (!starts.length || !goals.length) return [];
  const costs = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set();
  for (const startNode of starts) costs[startNode.i] = startNode.d;
  for (let step = 0; step < nodes.length; step++) {
    let current = -1, best = Infinity;
    for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && costs[i] < best) { best = costs[i]; current = i; }
    if (current < 0) break;
    visited.add(current);
    for (const edge of edges[current]) {
      const cost = best + edge.cost;
      if (cost < costs[edge.to]) { costs[edge.to] = cost; previous[edge.to] = current; }
    }
  }
  const goal = goals.sort((a, b) => costs[a.i] + a.d - costs[b.i] - b.d)[0];
  if (!Number.isFinite(costs[goal.i])) return [];
  const route = [];
  for (let at = goal.i; at >= 0; at = previous[at]) route.unshift({ ...nodes[at] });
  if (appendTarget) route.push(end);
  return route;
}

// Clearance over every roof intersected by the horizontal flight segment.
export function flightAltitude(from, to, colliders, clearance = 8) {
  let altitude = 0;
  for (const c of colliders || []) {
    if (!Number.isFinite(c.h)) continue;
    if (!segmentClear({ x: from.x, y: c.h, z: from.z }, { x: to.x, y: c.h, z: to.z }, [c], clearance)) altitude = Math.max(altitude, c.h + clearance + .1);
  }
  return altitude;
}

export function safeFlightMove(position, proposed, colliders, padding = 6) {
  if (segmentClear(position, proposed, colliders, padding)) return { ...proposed, blocked: false };
  const vertical = { x: position.x, y: Math.max(position.y, proposed.y), z: position.z };
  if (segmentClear(position, vertical, colliders, padding)) return { ...vertical, blocked: true };
  return { x: position.x, y: position.y, z: position.z, blocked: true };
}

export function selectAirSpawn({ target, colliders, aircraft = [], hidden, random = Math.random, min = 165, max = 210, altitude = 65, radius = 10 }) {
  for (let i = 0; i < 32; i++) {
    const angle = random() * Math.PI * 2, distance = min + random() * (max - min);
    const p = { x: target.x + Math.sin(angle) * distance, y: Math.max(altitude, (target.y || 0) + 25), z: target.z + Math.cos(angle) * distance };
    p.y = Math.max(p.y, flightAltitude(p, p, colliders, radius));
    if (!hidden?.(p, radius) || !segmentClear(p, p, colliders, radius)) continue;
    if (aircraft.some(h => h?.pos && Math.hypot(h.pos.x - p.x, h.pos.y - p.y, h.pos.z - p.z) < radius * 3)) continue;
    return { ...p, heading: angle + Math.PI };
  }
  return null;
}
