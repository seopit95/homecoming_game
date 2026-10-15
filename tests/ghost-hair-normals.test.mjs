import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHair,settleHair} from '../lib/ghost-hair.ts';

test('UV seams on a continuous hair surface keep a continuous lighting normal after settling',()=>{
 const figure=new T.Group(),head=new T.Group();figure.add(head);head.position.y=1.5;
 const {tails}=createHair(head),mesh=tails.children[0],rest=mesh.userData.rest,groups=new Map();
 for(let i=0;i<rest.length/3;i++){
  const key=Array.from(rest.slice(i*3,i*3+3)).join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);
 }
 const seams=[...groups.values()].filter(g=>g.length>1);assert.ok(seams.length>0,'fixture includes authored UV seams');
 for(const tilt of [0,.5,-.4]){
  head.rotation.z=tilt;settleHair(tails,figure,2,.02);const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
  for(const g of seams)for(const i of g.slice(1)){
   const a=new T.Vector3().fromBufferAttribute(p,g[0]),b=new T.Vector3().fromBufferAttribute(p,i);assert.ok(a.distanceTo(b)<1e-6,'UV copies remain coincident');
   a.fromBufferAttribute(n,g[0]);b.fromBufferAttribute(n,i);
   assert.ok(a.distanceTo(b)<1e-5,`continuous hair seam has a lighting crease: ${a.distanceTo(b)}`);
   assert.ok(Math.abs(a.length()-1)<1e-5,'shared normal is finite and normalized');
  }
 }
});

test('settling a new hair pose schedules the changed reflection directions for GPU upload',()=>{
 const figure=new T.Group(),head=new T.Group();figure.add(head);head.position.y=1.5;
 const {tails}=createHair(head),geometry=tails.children[0].geometry;
 settleHair(tails,figure,0,.02);const tangent=geometry.getAttribute('tangent'),version=tangent.version,previous=tangent.array.slice();
 head.rotation.z=.5;settleHair(tails,figure,2,.02);
 assert.equal(geometry.getAttribute('tangent'),tangent,'pose updates reuse the uploaded attribute');
 assert.notDeepEqual(tangent.array,previous,'the deformed pose changes its reflection basis');
 assert.ok(tangent.version>version,'the renderer must upload the updated basis after its first visible frame');
});

test('bent hair retains finite surface-aligned directions for smooth strand reflections',()=>{
 const figure=new T.Group(),head=new T.Group();figure.add(head);head.position.y=1.5;
 const {tails}=createHair(head),mesh=tails.children[0];
 for(const tilt of [0,.5,-.4]){
  head.rotation.z=tilt;settleHair(tails,figure,2,.02);
  const n=mesh.geometry.getAttribute('normal'),t=mesh.geometry.getAttribute('tangent');
  assert.ok(t,'hair needs interpolated strand directions instead of a different direction per triangle');
  for(let i=0;i<t.count;i++){
   const normal=new T.Vector3().fromBufferAttribute(n,i),tangent=new T.Vector3().fromBufferAttribute(t,i);
   assert.ok(Number.isFinite(tangent.length())&&Math.abs(tangent.length()-1)<1e-5,'strand direction is normalized');
   assert.ok(Math.abs(normal.dot(tangent))<1e-5,'strand direction lies on the deformed hair surface');
   assert.equal(Math.abs(t.getW(i)),1,'UV handedness is retained');
  }
 }
});
