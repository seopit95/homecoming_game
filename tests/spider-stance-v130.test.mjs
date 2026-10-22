import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import{createGhost,animateGhost}from'../lib/ghost.ts';
const at=(f,name)=>f.getObjectByName(name).getWorldPosition(new T.Vector3());
// Catches the old narrow, nearly kneeling silhouette even if root size is enlarged.
test('V130 an attacking adult spreads four bent human limbs sideways around a suspended low torso',()=>{
 const f=createGhost(new T.Group());
 for(const reduced of [false,true])for(const phase of [.4,2,4.3]){
  for(let i=0;i<=40;i++)animateGhost(f,10+phase+i*.05,1,.8,reduced,phase,1,()=>0,[],1);f.updateMatrixWorld(true);
  const palms=[-1,1].map(s=>at(f,`ghost-hand-${s}`)),knees=[-1,1].map(s=>at(f,`ghost-knee-${s}`));
  const span=palms[1].x-palms[0].x,kneeSpan=knees[1].x-knees[0].x;
  assert.ok(span>1.12,`palms must frame a wide spider silhouette; got ${span.toFixed(3)}m`);
  assert.ok(kneeSpan>1.05,`lifted knees flank the torso instead of kneeling; got ${kneeSpan.toFixed(3)}m`);
  for(const [i,side] of [-1,1].entries()){
   const shoulder=f.getObjectByName(`ghost-shoulder-${side}`),elbow=shoulder.children[0],wrist=elbow.children[0],a=shoulder.getWorldPosition(new T.Vector3()),b=elbow.getWorldPosition(new T.Vector3()),c=wrist.getWorldPosition(new T.Vector3());
   assert.ok((b.x-a.x)*side>.22,'upper arm reaches sideways instead of dropping like a stilt');
   assert.ok(b.clone().sub(a).normalize().dot(c.clone().sub(b).normalize())<.85,'elbow remains bent');
   assert.ok(Math.abs(a.distanceTo(b)-.46)<1e-5&&Math.abs(b.distanceTo(c)-.49)<1e-5,'spread cannot stretch bone lengths');
   assert.ok(knees[i].y>.24&&knees[i].y<.72,'knees are raised while the pelvis stays suspended');
  }
  assert.ok(at(f,'ghost-head').y>.7&&at(f,'ghost-head').y<1.12,'raised face over low spider torso');
  assert.deepEqual(f.scale.toArray(),[1,1,1]);
 }
});
// Chase should retain the recognisable exhausted face; the full gape belongs to capture.
test('V130 the crawling face stays recognisable between lunges instead of holding the capture gape',()=>{
 const f=createGhost(new T.Group());for(let i=0;i<=40;i++)animateGhost(f,10+i*.05,1,.8,false,2,1,()=>0,[],1);
 const face=f.getObjectByName('ghost-continuous-face');assert.ok(face.userData.openness>.12&&face.userData.openness<.45,'persistent pursuit should not hold the huge round capture mouth');
});
