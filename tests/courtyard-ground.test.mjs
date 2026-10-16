import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {prepareVisuals,surface} from '../lib/materials.ts';
import {buildWorld,disposeWorld} from '../lib/world.ts';

globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};

// Removing the photographic channel branch or misaligning its channel scale
// must fail; replace only image fetching, leaving materials and disposal real.
test('courtyard paving owns correctly decoded physical maps with aligned channel scale',async()=>{
 const load=T.TextureLoader.prototype.loadAsync;
 T.TextureLoader.prototype.loadAsync=async function(url){const t=new T.Texture();t.name=url;return t;};
 try{
  await prepareVisuals();
  const w=buildWorld(new T.Scene(),'courtyard');w.root.updateMatrixWorld(true);
  const hit=new T.Raycaster(new T.Vector3(-21,.05,26),new T.Vector3(0,-1,0),0,.2).intersectObject(w.root,true)[0];
  assert.ok(hit,'the actual route has a floor');
  const a=hit.object.material;
  assert.equal(a.map.name,'/textures/pbr/paving-color.webp');
  const b=surface('paving');
  assert.ok(a.normalMap&&a.roughnessMap&&a.aoMap,'pavers require real relief and roughness channels');
  assert.equal(a.map.colorSpace,T.SRGBColorSpace);
  assert.equal(a.normalMap.colorSpace,T.NoColorSpace);
  assert.equal(a.roughnessMap.colorSpace,T.NoColorSpace);
  assert.equal(a.aoMap,a.roughnessMap);
  for(const channel of ['map','normalMap','roughnessMap']){
   assert.notEqual(a[channel],b[channel]);assert.deepEqual(a[channel].repeat.toArray(),a.map.repeat.toArray());
  }
  const disposed=[];a.map.addEventListener('dispose',()=>disposed.push('color'));
  disposeWorld(w.root);assert.deepEqual(disposed,['color']);
  b.dispose();
 }finally{T.TextureLoader.prototype.loadAsync=load;}
});

// A painted grate on the old uninterrupted slab fails the slot ray, and lifted
// covers fail the flush-height ray. These inspect rendered geometry, not labels.
test('courtyard drain slots expose recessed channels while their bars meet the walking plane',()=>{
 const w=buildWorld(new T.Scene(),'courtyard');
 try{
  w.root.updateMatrixWorld(true);
  for(const x of [-31.35,31.35])for(const z of [-42.95,-2.95,41.05]){
   const bar=new T.Raycaster(new T.Vector3(x,.1,z),new T.Vector3(0,-1,0),0,.5).intersectObject(w.root,true)[0];
   assert.ok(bar&&Math.abs(bar.point.y)<.0001,'actual grate bars are flush with paving');
   const slot=new T.Raycaster(new T.Vector3(x,.1,z+.05),new T.Vector3(0,-1,0),0,.5).intersectObject(w.root,true)[0];
   assert.ok(slot&&slot.point.y<-.1&&slot.point.y>-.16,'open slot reaches channel, not an uncut floor underneath');
  }
 }finally{disposeWorld(w.root);}
});

test('courtyard paving, repair slab and onward route retain continuous zero-height support',()=>{
 const w=buildWorld(new T.Scene(),'courtyard');
 try{
  w.root.updateMatrixWorld(true);
  for(const [x,z] of [[0,44],[0,26],[-21,26],[21,26],[-21,0],[21,0],[-21,-26],[21,-26],[0,-26],[8,-40],[14,-43],[0,0],[-31.2,45],[31.2,-45]]){
   const hit=new T.Raycaster(new T.Vector3(x,.05,z),new T.Vector3(0,-1,0),0,.2).intersectObject(w.root,true).find(h=>!h.object.material.transparent);
   assert.ok(hit&&Math.abs(hit.point.y)<.0001,`floor support at ${x},${z}`);
  }
 }finally{disposeWorld(w.root);}
});

test('covered guard booths have one concrete walking surface without a coplanar outdoor layer',()=>{
 const w=buildWorld(new T.Scene(),'courtyard');
 try{
  w.root.updateMatrixWorld(true);
  for(const x of [-25,25]){
   const hits=new T.Raycaster(new T.Vector3(x+.13,.05,30.21),new T.Vector3(0,-1,0),0,.1).intersectObject(w.root,true).filter(h=>!h.object.material.transparent);
   assert.equal(new Set(hits.map(h=>h.object.id)).size,1,'indoor floor cannot fight with outdoor paving');
   assert.equal(hits[0].object.material.name,'surface-castConcrete');
  }
 }finally{disposeWorld(w.root);}
});

test('handover print stays visibly in front of its paper backing without a floating gap',()=>{
 const w=buildWorld(new T.Scene(),'courtyard');
 try{
  w.root.updateMatrixWorld(true);const print=w.targets.find(t=>t.id==='court_log').mesh;
  const hits=new T.Raycaster(new T.Vector3(-26.47,1.57,27.25),new T.Vector3(0,0,-1),0,.25).intersectObject(w.root,true);
  const face=hits.find(h=>h.object===print),back=hits.find(h=>h.object!==print&&!h.object.material.transparent);
  assert.ok(face&&back);const gap=back.distance-face.distance;
  assert.ok(gap>.0001&&gap<.001,`print/backing separation ${gap}: avoid coplanar depth fighting and visible float`);
 }finally{disposeWorld(w.root);}
});
