import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHair,settleHair} from '../lib/ghost-hair.ts';
import {createFace} from '../lib/ghost-face.ts';
import {createGhost,animateGhost} from '../lib/ghost.ts';

test('shortening seated loose hair never pulls its roots inside the scalp',()=>{
 const figure=new T.Group(),head=new T.Group();figure.add(head);head.position.y=1.4;
 createFace(head,new T.MeshStandardMaterial());const {tails}=createHair(head),mesh=tails.children[0],p=mesh.geometry.attributes.position,rest=mesh.userData.rest;
 const roots=Array.from({length:p.count},(_,i)=>i).filter(i=>rest[i*3+1]>.25);
 assert.ok(roots.length>40,'actual upper scalp vertices are required');
 const points=()=>{
  settleHair(tails,figure,0,.02);head.updateMatrixWorld(true);
  return roots.map(i=>head.worldToLocal(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld)));
 };
 const standing=points();tails.scale.y=.68;const seated=points();
 for(let i=0;i<roots.length;i++)assert.ok(standing[i].distanceTo(seated[i])<1e-5,`root ${roots[i]} moved ${standing[i].distanceTo(seated[i])}m when shortening the loose ends`);
});

test('the replaced hair clears walls, door frames and stair treads through crawl turns',()=>{
 const f=createGhost(new T.Group()),v=new T.Vector3();
 const cases=[{at:[0,0,0],solids:[{x:-1.1,z:0,w:1.2,d:.2},{x:1.1,z:0,w:1.2,d:.2}]},
  {at:[0,0,0],solids:[{x:.73,z:.2,w:.08,d:1.8,y:1.15,h:2.3,yaw:.55}]},
  ...[-.5,.5].map(x=>({at:[x,-1.4,-2],floor:(_x,z)=>z>=0?0:(x<0?1:-1)*Math.min(2.8,-z*.7),solids:[{x:0,z:-3,w:.12,d:6,y:1.4,h:9}]}))];
 for(const c of cases)for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const phase of [0,1.6,3.2,4.8]){
  f.position.set(...c.at);if(c.floor)f.position.y=c.floor(c.at[0],c.at[2]);f.rotation.set(0,yaw,0);animateGhost(f,3,1,.7,false,phase,1,c.floor,c.solids);f.updateMatrixWorld(true);
  const mesh=f.getObjectByName('ghost-authored-long-hair'),p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
   for(const s of c.solids){const co=Math.cos(s.yaw??0),si=Math.sin(s.yaw??0),x=co*(v.x-s.x)-si*(v.z-s.z),z=si*(v.x-s.x)+co*(v.z-s.z);
    assert.ok(!(Math.abs(x)<s.w/2-.002&&Math.abs(z)<s.d/2-.002&&Math.abs(v.y-(s.y??1.5))<(s.h??3)/2-.002),`hair enters wall at ${v.toArray()}, yaw ${yaw}, phase ${phase}`);
   }
   const floor=c.floor?c.floor(c.at[0],v.z):0;assert.ok(v.y>=floor-.002,'hair enters supporting stair/floor');
  }
 }
});

test('authored hair reuses its buffer, freezes at the same time and clears the floor under head tilt',()=>{
 const figure=new T.Group(),head=new T.Group();figure.add(head);head.position.y=1.4;
 createFace(head,new T.MeshStandardMaterial());const {tails}=createHair(head),mesh=tails.children[0],p=mesh.geometry.attributes.position,buffer=p.array,v=new T.Vector3();
 for(const tilt of [0,.7,1.2])for(const scale of [1,.68]){
  head.rotation.x=tilt;tails.scale.y=scale;settleHair(tails,figure,3,.02);head.updateMatrixWorld(true);
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);assert.ok(v.y>=.01999,'loose hair must not pass through the floor');}
  const before=buffer.slice();settleHair(tails,figure,3,.02);assert.equal(p.array,buffer);assert.deepEqual(buffer,before);
 }
});
