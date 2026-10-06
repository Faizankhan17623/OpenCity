import * as THREE from 'three';
import { loadAsset } from './assetLoader.js';
import { NITRO_PRICE_PER_PERCENT } from './nitroStation.js';

// City lot pavements top out at 0.24 m. Keep the apron and painted bays above
// that surface; ground-level markers were previously buried inside the lot.
const APRON_HEIGHT = .25;
const BAY_CENTRES = [-3.9, 3.9];
const BAY_HALF_WIDTH = 1.8;
const BAY_HALF_LENGTH = 3.8;

// The optional model is mounted by the local preview server; public builds
// keep the procedural station when the private asset is unavailable.
export function attachNitroStation(world, fallback) {
  world.nitroAssetReady = loadAsset('/assets/props/oc_nitro_station_01.glb').then(gltf => {
    const root = gltf.scene;
    root.position.copy(world.nitroPos);
    root.position.y += APRON_HEIGHT;
    root.name = 'Open City Nitro Fuel Pump';
    root.traverse(o => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      if (/^Panel[_ ](total|fill|rate|left|right)/i.test(o.name)) o.visible = false;
      if (/^Roadside[_ ]rate/i.test(o.name)) o.visible = false;
    });
    const dual = !!root.getObjectByName('nitro_display_left');
    const canvas = document.createElement('canvas'); canvas.width = dual ? 256 : 512; canvas.height = dual ? 352 : 256;
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    for (const x of dual ? [-.215,.215] : [0]) {
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(dual ? .276 : .82,dual ? .375 : .44), new THREE.MeshBasicMaterial({map:texture}));
      screen.position.set(x,dual ? 1.985 : 1.5,dual ? .398 : .405); root.add(screen);
    }
    const priceCanvas = document.createElement('canvas'); priceCanvas.width=512; priceCanvas.height=768;
    const priceTexture = new THREE.CanvasTexture(priceCanvas); priceTexture.colorSpace=THREE.SRGBColorSpace;
    const priceBoard = new THREE.Mesh(new THREE.PlaneGeometry(1,1.38),new THREE.MeshBasicMaterial({map:priceTexture}));
    priceBoard.position.set(-5.8,2.5,5.255);root.add(priceBoard);
    world.scene.add(root); fallback.visible = false;
    world.nitroModel = {root,canvas,texture,priceCanvas,priceTexture,dual,lastText:''};
    updateNitroDisplay(world);
    return true;
  }).catch(error => { world.nitroAssetError = error.message; return false; });
}

export function updateNitroDisplay(world) {
  const model = world.nitroModel;
  if (!model) return;
  const car = world.player.inCar;
  const charge = car ? Math.round(car.nitro ?? 100) : 0;
  const cost = world.nitroLastPurchase ?? 0;
  const text = `${charge}/${cost}/${NITRO_PRICE_PER_PERCENT}`;
  if (text === model.lastText) return;
  model.lastText = text;
  const board = model.priceCanvas.getContext('2d');
  board.fillStyle='#123237';board.fillRect(0,0,512,768);board.textAlign='center';board.fillStyle='#eef4eb';
  board.font='bold 76px sans-serif';board.fillText('NITRO',256,140);
  board.font='bold 65px monospace';board.fillStyle='#88e4dd';board.fillText(`PRICE $${NITRO_PRICE_PER_PERCENT}`,256,330);
  board.font='bold 34px sans-serif';board.fillText('1% FILLING PRICE',256,418);
  board.font='bold 40px sans-serif';board.fillStyle='#eef4eb';board.fillText('MAX 500%',256,635);
  model.priceTexture.needsUpdate=true;
  const g = model.canvas.getContext('2d');
  if (model.dual) {
    g.fillStyle = '#142019'; g.fillRect(0,0,256,352);
    g.fillStyle = '#b2cba8'; g.textAlign = 'center';
    for (const [label,value,y] of [['TOTAL','$'+cost,28],['NITRO',charge+'%',140]]) {
      g.font = '20px monospace'; g.fillText(label,128,y);
      g.font = 'bold 43px monospace'; g.fillText(value,128,y+56);
    }
    g.font='bold 34px monospace';g.fillText(`PRICE $${NITRO_PRICE_PER_PERCENT}`,128,280);
    g.font='18px sans-serif';g.fillText('1% FILLING PRICE',128,325);
    model.texture.needsUpdate = true; return;
  }
  g.fillStyle = '#061419'; g.fillRect(0,0,512,256);
  g.fillStyle = '#8ce7da'; g.font = 'bold 44px monospace';
  g.fillText(`PAID  $${cost}`,20,61); g.fillText(`NITRO ${charge}%`,20,137);
  g.font = 'bold 30px monospace'; g.fillText(`PRICE $${NITRO_PRICE_PER_PERCENT}`,20,194);
  g.font = '24px sans-serif'; g.fillText('1% FILLING PRICE',20,232);
  model.texture.needsUpdate = true;
}

export function addNitroColliders(world) {
  // Only solid equipment blocks the car. Neither the canopy's bounding box
  // nor the driveable apron/low kerbs belong in the ground collision list.
  const p = world.nitroPos;
  const boxes = [[0, 0, .65, .4]];
  for (const x of [-1.65, 1.65]) {
    for (const z of [-.95, .95]) boxes.push([x, z, .14, .14]);
  }
  world.nitroColliders = boxes.map(([x,z,rx,rz]) => ({
    x0:p.x+x-rx, x1:p.x+x+rx, z0:p.z+z-rz, z1:p.z+z+rz,
    y0:0, y1:2.55, nitro:true,
  }));
  world.city.colliders.push(...world.nitroColliders);
}

export function createNitroBayMarkers(world) {
  const p = world.nitroPos;
  world.nitroBays = BAY_CENTRES.map((x, i) => ({x:p.x+x, z:p.z, index:i+1}));
  for (const bay of world.nitroBays) {
    const marking = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({color:0x46e6ef,side:THREE.DoubleSide});
    for (const [x,z,w,l] of [
      [-BAY_HALF_WIDTH,0,.1,BAY_HALF_LENGTH*2], [BAY_HALF_WIDTH,0,.1,BAY_HALF_LENGTH*2],
      [0,-BAY_HALF_LENGTH,BAY_HALF_WIDTH*2,.1], [0,BAY_HALF_LENGTH,BAY_HALF_WIDTH*2,.1],
    ]) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(w,l),material);
      stripe.rotation.x=-Math.PI/2;stripe.position.set(x,0,z);marking.add(stripe);
    }
    marking.position.set(bay.x,p.y+APRON_HEIGHT+.02,bay.z);world.scene.add(marking);
    const c=document.createElement('canvas');c.width=512;c.height=192;const g=c.getContext('2d');
    g.fillStyle='#092326';g.fillRect(0,0,512,192);g.strokeStyle='#46e6ef';g.lineWidth=8;g.strokeRect(4,4,504,184);
    g.fillStyle='#e9ffff';g.textAlign='center';g.font='bold 42px sans-serif';g.fillText(`NITRO BAY ${bay.index}`,256,70);
    g.font='bold 30px sans-serif';g.fillText('PARK · STOP · PRESS 5',256,133);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    // A billboard stays readable from both approaches, without mirrored text.
    const board=new THREE.Sprite(new THREE.SpriteMaterial({map:texture}));
    board.position.set(bay.x,p.y+3,bay.z);board.scale.set(3.6,1.35,1);world.scene.add(board);
    bay.marking=marking;bay.board=board;bay.material=material;
  }
}

export function inNitroBay(world, car) {
  if (!car || car.dead || car.tank) return false;
  return (world.nitroBays || []).some(bay =>
    Math.abs(car.pos.x-bay.x) <= BAY_HALF_WIDTH &&
    Math.abs(car.pos.z-bay.z) <= BAY_HALF_LENGTH &&
    Math.abs(car.pos.y-world.nitroPos.y) < 2);
}
