import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createGhost,animateGhost,animateGhostPassenger,animateGhostAttack} from '../lib/ghost.ts';
const at=(f,name)=>f.getObjectByName(name).getWorldPosition(new T.Vector3());
function pursue(f,solids=[],floor=()=>0,reduced=false){for(let i=0;i<=30;i++)animateGhost(f,3+i/20,1,.8,reduced,2,1,floor,solids,1);f.updateMatrixWorld(true);}
test('V129 the pursuing adult opens bent human limbs around a lifted spine without scaling the body',()=>{
 for(const reduced of [false,true]){const f=createGhost(new T.Group());pursue(f,[],()=>0,reduced);
  assert.ok(f.getObjectByName('ghost-head').parent.rotation.x>.85,'the arched spine stays forward over four supports');assert.ok(at(f,'ghost-head').y>.88,'the head remains lifted above the horizontal back');
  assert.ok(at(f,'ghost-hand-1').x-at(f,'ghost-hand--1').x>.77,'the palms spread without adding limbs');
  assert.ok(at(f,'ghost-knee-1').x-at(f,'ghost-knee--1').x>.65,'the knees visibly flank the pelvis');
  let elbowSpan=0;for(const side of [-1,1]){const upper=f.getObjectByName(`ghost-shoulder-${side}`),elbow=upper.children[0],wrist=elbow.children[0];const a=at(f,upper.name),b=elbow.getWorldPosition(new T.Vector3()),c=wrist.getWorldPosition(new T.Vector3());elbowSpan+=b.x*side;
   assert.ok(b.x*side>.35,'the human elbow bends out beyond its shoulder');assert.ok(b.clone().sub(a).normalize().dot(c.clone().sub(b).normalize())<.82,'the arms remain visibly bent rather than straight stilts');assert.ok(Math.abs(a.distanceTo(b)-.46)<1e-6&&Math.abs(b.distanceTo(c)-.49)<1e-6,'adult arm lengths remain anatomical');assert.ok(c.y<.12,'the wider hand still supports the floor');const knee=at(f,`ghost-knee-${side}`),hip=at(f,`ghost-hip-${side}`);assert.ok(knee.y>.18&&(knee.x-hip.x)*side>.2,'a lifted bent knee projects outside the hip');assert.ok(at(f,`ghost-ankle-${side}`).y<.16,'rear feet stay on or just above the surface through the alternating pull');}
  assert.ok(elbowSpan>.82,'both bent elbows enlarge the width of the supported silhouette');
  assert.deepEqual(f.scale.toArray(),[1,1,1]);assert.deepEqual(f.getObjectByName('ghost-head').scale.toArray(),[.67,.68,.68]);
 }
});
test('V129 the enlarged pursuit pose gathers at doors and the divided stair without crossing walls or treads',()=>{
 const f=createGhost(new T.Group());pursue(f);const stair=(x,z)=>z>=0?0:(x<0?1:-1)*Math.min(2.8,-z*.7),divider={x:0,z:-3,w:.12,d:6,y:1.4,h:9};
 const cases=[{at:[0,0,0],yaw:0,solids:[],floor:()=>0},{at:[0,0,0],yaw:.717,solids:[{x:.56,z:0,w:.2,d:4}],floor:()=>0},{at:[0,0,0],yaw:0,solids:[{x:-.55,z:0,w:.2,d:.25},{x:.55,z:0,w:.2,d:.25}],floor:()=>0},...[-.75,.75].map(x=>({at:[x,stair(x,-2),-2],yaw:x<0?0:Math.PI,solids:[divider],floor:stair}))];
 for(const [j,c] of cases.entries())for(const phase of [.7,2,4.5]){f.position.fromArray(c.at);f.rotation.y=c.yaw;animateGhost(f,5+j+phase/10,1,.8,false,phase,1,c.floor,c.solids,1);f.updateMatrixWorld(true);const point=new T.Vector3();
  f.traverse(mesh=>{if(!mesh.isMesh||mesh.isInstancedMesh)return;for(let o=mesh;o!==f;o=o.parent)if(!o.visible)return;const p=mesh.geometry.getAttribute('position');for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);const tread=c.floor===stair&&point.z<0&&point.z>-4?(point.x<0?1:-1)*(Math.floor(-point.z*17/4)+.5)*2.8/17:c.floor(point.x,point.z);assert.ok(point.y-tread>-.01,`${mesh.name} enters floor in case ${j}, phase ${phase}`);
   for(const s of c.solids){const a=Math.cos(s.yaw??0),b=Math.sin(s.yaw??0),dx=point.x-s.x,dz=point.z-s.z;assert.ok(!(Math.abs(a*dx-b*dz)<s.w/2-.002&&Math.abs(b*dx+a*dz)<s.d/2-.002&&Math.abs(point.y-(s.y??1.5))<(s.h??3)/2-.002),`${mesh.name} enters wall in case ${j}, phase ${phase}`);}
  }});
 }
});
test('V129 the widened pursuing palm and rear foot keep their floor contacts beneath lifted knees',()=>{
 const f=createGhost(new T.Group());pursue(f);let hand,foot;
 for(let frame=0;frame<=20;frame++){const distance=frame*.006;f.position.z=distance;animateGhost(f,5+frame/60,1,.8,false,Math.PI+distance*Math.PI*2/.82,1,()=>0,[],1);const nextHand=at(f,'ghost-hand--1'),nextFoot=at(f,'ghost-ankle--1');hand??=nextHand.clone();foot??=nextFoot.clone();assert.ok(nextHand.distanceTo(hand)<.015,'a wider palm remains planted');assert.ok(nextFoot.distanceTo(foot)<.015,'a rear foot remains planted');assert.ok(nextHand.y<.12&&nextFoot.y>.035&&nextFoot.y<.12,'native support joints remain on the floor');const sole=new T.Box3().setFromObject(f.getObjectByName('ghost-foot--1'),true).min.y;assert.ok(sole>-.002&&sole<.018,'the planted rear sole actually touches the floor');}
});
test('V129 both wet blood tears remain on the real facial skin through walk, crawl, passenger and capture',()=>{
 const f=createGhost(new T.Group()),face=f.getObjectByName('ghost-continuous-face'),tears=f.getObjectByName('ghost-blood-tears');assert.ok(tears,'the shared ghost has blood tears');assert.equal(tears.parent,face.parent);
 for(const pose of ['walk','crawl','passenger','capture']){if(pose==='passenger')animateGhostPassenger(f,1,.9,false,true);else if(pose==='capture')animateGhostAttack(f,.65,false);else animateGhost(f,4,1,.8,false,2,pose==='crawl'?1:0,()=>0,[],1);f.updateMatrixWorld(true);
  const p=tears.geometry.getAttribute('position'),ray=new T.Raycaster(),front=new T.Vector3(0,0,1).transformDirection(face.matrixWorld),v=new T.Vector3(),sides=new Set();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);sides.add(Math.sign(v.x));const world=v.applyMatrix4(tears.matrixWorld);ray.set(world.clone().addScaledVector(front,.012),front.clone().negate());ray.far=.02;const hit=ray.intersectObject(face,false)[0];assert.ok(hit&&hit.distance>.011&&hit.distance<.015,`${pose}: the blood film stays within 3 mm of skin`);}
  assert.equal(sides.size,2);assert.ok(tears.material.clearcoat>.7&&tears.material.roughness<.3,'tears retain a restrained wet surface');
 }
});
