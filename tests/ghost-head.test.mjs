import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGhost} from '../lib/ghost.ts';

test('the anatomical skin encloses the rear skull and the eyes sit in recessed lids',()=>{
 const figure=createGhost(new T.Group()),head=figure.getObjectByName('ghost-head'),face=figure.getObjectByName('ghost-continuous-face');
 figure.updateMatrixWorld(true);
 const ray=(origin,direction,objects)=>{
  const o=new T.Vector3(...origin).applyMatrix4(head.matrixWorld),d=new T.Vector3(...direction).transformDirection(head.matrixWorld);
  return new T.Raycaster(o,d).intersectObjects(objects,true).map(hit=>({...hit,local:head.worldToLocal(hit.point.clone())}));
 };
 const rear=ray([0,.18,-1],[0,0,1],[face])[0];
 assert.ok(rear&&rear.local.z<-.04,`complete anatomical skin must enclose rear skull; hit ${JSON.stringify(rear?.local)}`);
 const eye=ray([.058,.133,1],[0,0,-1],[head])[0];
 assert.ok(eye?.object.name.startsWith('ghost-eye'),`ray through lid aperture must hit seated eyeball, got ${eye?.object.name}`);
 const lid=ray([.058,.145,1],[0,0,-1],[face])[0];
 assert.ok(lid&&lid.local.z>eye.local.z+.004,'the actual upper lid must project in front of the seated eyeball');
 const nose=ray([0,.059,1],[0,0,-1],[face])[0],cheek=ray([.095,.059,1],[0,0,-1],[face])[0];
 assert.ok(nose&&cheek&&nose.local.z-cheek.local.z>.035,`nose must project ahead of cheek: ${nose?.local.z}, ${cheek?.local.z}`);
});

import {createFace,poseFace} from '../lib/ghost-face.ts';
import {createHair,settleHair} from '../lib/ghost-hair.ts';

test('the anatomical mouth morph keeps its joined rim, outward skin and exact reusable rest shape',()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial()),p=r.face.geometry.attributes.position,storage=p.array,rest=storage.slice(),scale=head.scale.clone(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 const border=r.face.userData.mouthBorder,first=border[0],ix=r.face.geometry.index,edges=new Map();
 for(let k=0;k<ix.count;k+=3)for(let j=0;j<3;j++){const u=ix.getX(k+j),v=ix.getX(k+(j+1)%3),key=[Math.min(u,v),Math.max(u,v)].join('/');edges.set(key,(edges.get(key)??0)+1);}
 for(const [key,count] of edges){assert.ok(count===1||count===2,'skin must be manifold');if(count===1){const [u,v]=key.split('/').map(Number);assert.ok(border.includes(u)&&border.includes(v)||p.getY(u)<-.108&&p.getY(v)<-.108,`unjoined skull/cheek boundary at ${key}`);}}
 for(const open of [0,1e-6,.12,.3,.65,1,1.025,0]){
  poseFace(r,open);assert.equal(p.array,storage);assert.ok([...storage].every(Number.isFinite));
  const cavity=r.throat.geometry.attributes.position;
  for(let i=0;i<border.length;i++){a.fromBufferAttribute(p,border[i]);b.fromBufferAttribute(cavity,i);assert.ok(a.distanceTo(b)<.00401,`lip/skin separation at ${open}, vertex ${i}`);}
  for(let k=0;k<ix.count;k+=3){const ids=[ix.getX(k),ix.getX(k+1),ix.getX(k+2)];if(ids.every(i=>i<first))continue;a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);const normal=b.sub(a).cross(c.sub(a));assert.ok(normal.z>1e-9,`oral skin folds through itself at ${open}, triangle ${k/3}`);}
  for(let i=0;i<p.count;i++)if(rest[i*3+1]>.07||rest[i*3+1]<-.108)assert.deepEqual([...storage.slice(i*3,i*3+3)],[...rest.slice(i*3,i*3+3)],'upper skull/lids/nose and the attached neck ring remain stable');
  const previous=storage.slice();poseFace(r,open+1e-7);let step=0;for(let i=0;i<storage.length;i++)step=Math.max(step,Math.abs(storage[i]-previous[i]));assert.ok(step<1e-6,`discontinuous morph at ${open}: ${step}`);
 }
 poseFace(r,0);assert.deepEqual(storage,rest);assert.deepEqual(head.scale.toArray(),scale.toArray());
});

test('deep oral tissue occludes the retained anterior neck throughout opening',()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial()),ray=new T.Raycaster();
 for(const open of [.3,.65,1,1.025]){
  poseFace(r,open);head.updateMatrixWorld(true);
  for(const x of [-.015,-.01,0,.01,.015])for(const dy of [-.01,0,.01]){
   const y=-.006-.111*open+dy;ray.set(new T.Vector3(x,y,1),new T.Vector3(0,0,-1));
   const hit=ray.intersectObjects([r.face,r.throat],false)[0];
   assert.ok(hit?.object===r.throat,`retained skin exposed inside aperture at open ${open}, x ${x}, y ${y}`);
   assert.ok(hit.point.z<.125,'the fitted rear tissue must remain recessed behind the rim');
  }
 }
});


test('authored hair triangle interiors clear the actual posed skin at rest, gape and tilt',()=>{
 const figure=new T.Group(),head=new T.Group();figure.add(head);head.position.y=1.4;
 const r=createFace(head,new T.MeshStandardMaterial()),{tails}=createHair(head),mesh=tails.children[0],p=mesh.geometry.attributes.position,ix=mesh.geometry.index;
 const ray=new T.Raycaster(),q=new T.Vector3(),origin=new T.Vector3(),direction=new T.Vector3(),local=new T.Vector3();
 for(const open of [0,1,1.025])for(const tilt of [0,.7]){
  poseFace(r,open);head.rotation.x=tilt;settleHair(tails,figure,3,.02);head.updateMatrixWorld(true);let checked=0;
  for(let t=0;t<ix.count;t+=3)for(const weights of [[.5,.5,0],[0,.5,.5],[.5,0,.5],[1/3,1/3,1/3]]){
   q.set(0,0,0);for(let n=0;n<3;n++){const i=ix.getX(t+n);q.x+=p.getX(i)*weights[n];q.y+=p.getY(i)*weights[n];q.z+=p.getZ(i)*weights[n];}
   // Conservative geometry coverage includes transparent texture-edge facets.
   if(q.z<=0||q.y>.37||q.y<-.4||Math.abs(q.x)>.18)continue;
   origin.set(q.x,q.y,1).applyMatrix4(head.matrixWorld);direction.set(0,0,-1).transformDirection(head.matrixWorld);ray.set(origin,direction);
   const hits=ray.intersectObject(r.face);if(hits.length<2)continue;checked++;
   const front=head.worldToLocal(local.copy(hits[0].point)).z,rear=head.worldToLocal(local.copy(hits.at(-1).point)).z;
   assert.ok(q.z>=front-.001||q.z<=rear+.001,`authored triangle ${t/3} inside skin at open ${open}, tilt ${tilt}: ${q.toArray()}`);
  }
  assert.ok(checked>100,'actual front hair surfaces must be covered');
 }
});
