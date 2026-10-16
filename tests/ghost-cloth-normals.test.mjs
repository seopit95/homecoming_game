import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGhost,animateGhost,animateGhostAttack,animateGhostPassenger} from '../lib/ghost.ts';
import cloth from '../lib/assets/ghost-dress.json' with {type:'json'};

test('the same cloth surface keeps a continuous lighting direction across texture seams',()=>{
 const copies=new Map();for(let i=0;i<cloth.position.length/3;i++){const key=cloth.position.slice(i*3,i*3+3).join('/')+'/'+cloth.armWeight[i];if(!copies.has(key))copies.set(key,[]);copies.get(key).push(i);}const seams=[...copies.values()].filter(g=>g.length>1);assert.ok(seams.length>100);
 const f=createGhost(new T.Group()),g=f.getObjectByName('ghost-wet-dress').geometry,index=g.index,uv=g.attributes.uv.array.slice(),a=new T.Vector3(),b=new T.Vector3();
 for(const pose of ['walk','crawl','attack','passenger']){
  if(pose==='attack')animateGhostAttack(f,.7167,false);else if(pose==='passenger')animateGhostPassenger(f,3,1,false,true);else animateGhost(f,3,1,.7,false,1.6,pose==='crawl'?1:0);
  const p=g.attributes.position,n=g.attributes.normal;
  for(const ids of seams)for(const i of ids.slice(1)){
   assert.ok(a.fromBufferAttribute(p,ids[0]).distanceTo(b.fromBufferAttribute(p,i))<1e-7,'copies sample one physical surface');
   assert.ok(a.fromBufferAttribute(n,ids[0]).distanceTo(b.fromBufferAttribute(n,i))<1e-6,`${pose}: texture seam becomes a rigid lighting crease at ${ids[0]}/${i}`);
   assert.ok(Math.abs(a.length()-1)<1e-5,'cloth normals remain finite and unit length');
  }
  assert.equal(g.index,index,'lighting must retain the rendered triangle/index owner');assert.deepEqual(g.attributes.uv.array,uv,'smoothing must not move the cloth print');
 }
});

test('stitched cloth normals include the area of triangles on both sides and stay private per figure',()=>{
 const a=createGhost(new T.Group()),b=createGhost(new T.Group()),ga=a.getObjectByName('ghost-wet-dress').geometry,gb=b.getObjectByName('ghost-wet-dress').geometry;
 animateGhost(a,3,1,.7,false,1.6,0);const previous=ga.attributes.normal.array.slice();animateGhostAttack(b,.7167,false);assert.deepEqual(ga.attributes.normal.array,previous,'another figure cannot overwrite the current cloth lighting');
 const p=gb.attributes.position,ix=gb.index,n=gb.attributes.normal,v0=new T.Vector3(),v1=new T.Vector3(),v2=new T.Vector3(),sum=new T.Vector3();
 for(const owner of [510,1060,254]){
  const key=cloth.position.slice(owner*3,owner*3+3).join('/')+'/'+cloth.armWeight[owner],ids=new Set();for(let i=0;i<p.count;i++)if(cloth.position.slice(i*3,i*3+3).join('/')+'/'+cloth.armWeight[i]===key)ids.add(i);assert.ok(ids.size>1);
  sum.set(0,0,0);for(let j=0;j<ix.count;j+=3){const tri=[ix.getX(j),ix.getX(j+1),ix.getX(j+2)];if(!tri.some(i=>ids.has(i)))continue;v0.fromBufferAttribute(p,tri[0]);v1.fromBufferAttribute(p,tri[1]).sub(v0);v2.fromBufferAttribute(p,tri[2]).sub(v0);sum.add(v1.cross(v2));}
  sum.normalize();assert.ok(sum.distanceTo(v0.fromBufferAttribute(n,owner))<1e-6,'a small UV island must not receive the same weight as a much larger cloth panel');
 }
});
