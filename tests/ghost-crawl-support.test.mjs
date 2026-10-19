import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createGhost,animateGhost} from '../lib/ghost.ts';
const at=(f,name)=>f.getObjectByName(name).getWorldPosition(new T.Vector3());
test('V101 crawl knees support the moving pelvis through a complete alternating pull',()=>{
 for(const side of [-1,1]){const f=createGhost(new T.Group());let planted;
  for(let frame=0;frame<=30;frame++){
   const u=.37+frame*.017,phase=(u-.25-(side===-1?0:.5))*Math.PI*2,distance=.82*frame*.017;f.position.z=distance;
   animateGhost(f,3+frame/60,.7,.7,false,phase,1);f.updateMatrixWorld(true);
   const knee=at(f,`ghost-knee-${side}`);planted??=knee.clone();
   assert.ok(knee.distanceTo(planted)<.012,`supporting knee ${side} slides ${knee.distanceTo(planted)}m at ${u}`);
   assert.ok(knee.y>.035&&knee.y<.12,`support knee joint floats above its surface: ${knee.y}`);
  }
 }
});
test('V101 crowded crawl hands keep their long fingers on their own side of the body',()=>{
 const f=createGhost(new T.Group()),solids=[{x:0,z:.56,w:3,d:.2},{x:0,z:-.56,w:3,d:.2}];
 for(const phase of [0,1.6,3.2,4.8]){
  animateGhost(f,3,1,.7,false,phase,1,undefined,solids);f.updateMatrixWorld(true);
  for(const side of [-1,1]){const hand=f.getObjectByName(`ghost-hand-${side}`),p=new T.Vector3();let nearest=Infinity;hand.traverse(m=>{if(!m.isMesh)return;const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);nearest=Math.min(nearest,p.x*side);}});assert.ok(nearest>.015,`hand ${side} crosses the body midline by ${-nearest}m`);}
 }
});

test('V101 actual flat-floor grounding keeps a crawling support knee on its contact surface',()=>{
 const f=createGhost(new T.Group());let planted;
 for(let frame=0;frame<24;frame++){
  const u=.4+frame*.018;f.position.z=.82*frame*.018;animateGhost(f,3+frame/60,.7,.7,false,(u-.25)*Math.PI*2,1,()=>0);f.updateMatrixWorld(true);
  const knee=at(f,'ghost-knee--1');planted??=knee.clone();assert.ok(knee.y>.035&&knee.y<.12,`actual floor helper lifts the knee to ${knee.y}`);assert.ok(knee.distanceTo(planted)<.012,'ground helper may not undo the planted knee');
 }
});
