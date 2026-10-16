import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFace,poseFace} from '../lib/ghost-face.ts';

test('every rendered oral surface has finite reusable vertices through opening and closure',()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial());
 for(const open of [0,.22,.5,1,1.025,0]){
  poseFace(r,open);
  head.traverse(mesh=>{if(mesh.isMesh)assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite),`non-finite rendered geometry: ${mesh.name} at ${open}`);});
 }
});

test('opening the mouth retracts the lower lip around a turning mandible without lengthening its chin',()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial()),p=r.face.geometry.attributes.position;
 const border=r.face.userData.mouthBorder,bottom=border.reduce((a,b)=>p.getY(a)<p.getY(b)?a:b),restLip=new T.Vector3().fromBufferAttribute(p,bottom),restJoint=r.jaw.position.clone();
 const chin=[];for(let i=0;i<p.count;i++)if(p.getY(i)<-.052&&p.getY(i)>-.075&&p.getZ(i)>.11)chin.push(i);
 assert.ok(chin.length>=3,'actual lower chin skin must be measured');
 const rest=chin.map(i=>new T.Vector3().fromBufferAttribute(p,i)),closed=p.array.slice();
 for(const open of [.3,.65,1,1.025]){
  poseFace(r,open);head.updateMatrixWorld(true);
  const lip=new T.Vector3().fromBufferAttribute(p,bottom);
  if(open>=1){
   assert.ok(lip.z-r.jaw.position.z<restLip.z-restJoint.z-.035,'the mandibular arc must recede relative to its advancing joint instead of stretching vertically');
   assert.ok(restLip.y-lip.y<.17,'a scream must preserve the compact lower-face proportions');
  }
  const rotation=r.lower.getWorldQuaternion(new T.Quaternion()).angleTo(new T.Quaternion());
  assert.ok(rotation>open*.5,'lower dentition must turn with the mandibular frame');
  for(let i=1;i<chin.length;i++){
   const span=new T.Vector3().fromBufferAttribute(p,chin[i]).distanceTo(new T.Vector3().fromBufferAttribute(p,chin[0])),original=rest[i].distanceTo(rest[0]);
   if(original>.008)assert.ok(Math.abs(span/original-1)<.08,`chin skin stretches instead of following its bone at ${open}: ${span/original}`);
  }
 }
 poseFace(r,0);assert.deepEqual(p.array,closed,'restoring the face cannot leave residual jaw deformation');
});
