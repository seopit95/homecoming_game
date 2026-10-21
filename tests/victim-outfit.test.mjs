import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPedestrian} from '../lib/pedestrian.ts';
import {createGhost} from '../lib/ghost.ts';
import {prepareVisuals} from '../lib/materials.ts';

test('the living victim and ghost wear the same plain grey cloth after texture preparation',async()=>{
 const original=T.TextureLoader.prototype.loadAsync;
 T.TextureLoader.prototype.loadAsync=async url=>{const t=new T.Texture();t.name=url;return t;};
 try{
  await prepareVisuals();
  const p=createPedestrian(new T.Group()),f=createGhost(new T.Group()),dry=p.root.getObjectByName('pedestrian-authored-shirt').material,wet=f.getObjectByName('ghost-wet-dress').material;
  for(const material of [dry,wet]){
   assert.equal(material.map,null,'an albedo print would give the two dresses different patterns');
   assert.equal(material.color.getHexString(),'999891','both incarnations retain the same grey fabric');
   assert.equal(material.vertexColors,false,'old painted cloth colours cannot tint the shared base');
  }
  assert.ok(wet.roughness<dry.roughness&&wet.clearcoat>dry.clearcoat,'the damaged ghost dress remains visibly wet');
 }finally{T.TextureLoader.prototype.loadAsync=original;}
});

test('the victim has an ankle length skirt instead of the previous separate trousers',()=>{
 const p=createPedestrian(new T.Group()),skirt=p.root.getObjectByName('pedestrian-dress-skirt'),shirt=p.root.getObjectByName('pedestrian-authored-shirt');
 assert.ok(skirt?.isMesh,'the accident victim needs the same long dress silhouette as the ghost');
 assert.equal(skirt.material,shirt.material,'the bodice and skirt form one uninterrupted colour');
 const trousers=[];p.root.traverse(o=>{if(o.isMesh&&o.visible&&o.name.startsWith('pedestrian-trouser-'))trousers.push(o);});
 assert.equal(trousers.length,0,'changing the blouse colour alone leaves a different outfit');
 p.pose(18.1,null);p.root.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(skirt,true);
 assert.ok(bounds.min.y>.02&&bounds.min.y<.18,'the long hem finishes at the ankles and above the road');
 assert.ok(bounds.max.y>.9,'the skirt joins the existing waist');
});

test('the A-line skirt widens gradually below the waist instead of folding into a bucket lip',()=>{
 const p=createPedestrian(new T.Group());p.pose(18.4,null);p.root.updateMatrixWorld(true);
 const skirt=p.root.getObjectByName('pedestrian-dress-skirt'),a=skirt.geometry.attributes.position,{radialSegments:columns,heightSegments:rows}=skirt.geometry.parameters;
 let previous;
 for(let row=0;row<=rows;row++){
  const bounds=new T.Box3();for(let col=0;col<columns;col++)bounds.expandByPoint(new T.Vector3().fromBufferAttribute(a,row*(columns+1)+col));
  const y=bounds.getCenter(new T.Vector3()).y,width=(bounds.max.x-bounds.min.x)/2;
  if(previous){
   assert.ok(previous.y-y>.01,`cloth rings fold or bunch at the hip between rows ${row-1} and ${row}`);
   assert.ok((width-previous.width)/(previous.y-y)<.45,`the dress widens abruptly at row ${row}`);
  }
  previous={y,width};
 }
});

test('the skirt encloses both posed legs and preserves the body road contact through the accident',()=>{
 const p=createPedestrian(new T.Group()),skirt=p.root.getObjectByName('pedestrian-dress-skirt');
 assert.ok(skirt?.isMesh,'the leg-covering skirt must exist');
 const hands=['pedestrian-carry-hand','pedestrian-free-hand'].map(name=>p.root.getObjectByName(name));
 for(const [clock,hit] of [[18.1,null],[18.4,null],[18.7,null],[20,0],[20,.17],[20,.4],[20,1],[20,1.5],[20,3]]){
  p.pose(clock,hit);p.root.updateMatrixWorld(true);
  const skin=[];p.root.traverse(o=>{if(o.name==='pedestrian-leg-skin')skin.push(o);});
  assert.equal(skin.length,2,'the dress covers actual living legs');
  for(const leg of skin){
   const a=leg.geometry.attributes.position;
   for(const row of [3,7,11,15]){
    const center=new T.Vector3();for(let col=0;col<16;col++)center.add(new T.Vector3().fromBufferAttribute(a,row*17+col));center.multiplyScalar(1/16).applyMatrix4(leg.matrixWorld);
    for(let col=0;col<16;col+=2){
     const surface=new T.Vector3().fromBufferAttribute(a,row*17+col).applyMatrix4(leg.matrixWorld),up=new T.Vector3(0,1,0).transformDirection(leg.matrixWorld),out=surface.clone().sub(center).projectOnPlane(up).normalize();
     const ray=new T.Raycaster(surface.clone().addScaledVector(out,.6),out.negate(),0,.601),cloth=ray.intersectObject(skirt,false)[0];
     assert.ok(cloth&&cloth.distance<.599,`a leg emerges through the dress at ${clock}, ${hit}, row ${row}, col ${col}`);
    }
   }
  }
  if(hit===3){
   const floor=Math.min(...hands.map(hand=>new T.Box3().setFromObject(hand,true).min.y)),hem=new T.Box3().setFromObject(skirt,true).min.y;
   assert.ok(hem>=floor-.006,'the resting skirt cannot move the grounded hands above the road');
  }
 }
});
