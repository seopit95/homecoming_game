import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildRoad} from '../lib/prologue.ts';
import {createDrivingCar} from '../lib/driving-car.ts';
import {finaleTiming} from '../lib/story.ts';

const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({width:0,height:0,getContext:()=>context})},configurable:true});
const camera=()=>new T.PerspectiveCamera(72,16/9,.06,220);
function vertices(object,frame){
  object.updateWorldMatrix(true,true);frame.updateWorldMatrix(true,false);
  const inverse=frame.matrixWorld.clone().invert(),bounds=new T.Box3(),p=new T.Vector3();
  object.traverse(mesh=>{if(!mesh.isMesh)return;for(let o=mesh;o;o=o.parent)if(!o.visible)return;
    const a=mesh.geometry.attributes.position,m=inverse.clone().multiply(mesh.matrixWorld);
    for(let i=0;i<a.count;i++)bounds.expandByPoint(p.fromBufferAttribute(a,i).applyMatrix4(m));
  });return bounds;
}

test('V127 the approaching dump truck has a supported cab, tipper and chassis with six road wheels',()=>{
  const road=buildRoad(new T.Scene(),true),c=camera();
  try{
    road.pose('car_voice',3.2,c,true);
    const truck=road.root.getObjectByName('finale-dump-truck');assert.ok(truck,'the fatal obstacle must be an oncoming dump truck');
    for(const name of ['dump-cab','dump-tipper-bed','dump-chassis','dump-front-bumper'])assert.ok(truck.getObjectByName(name),name);
    const box=vertices(truck,truck),bed=vertices(truck.getObjectByName('dump-tipper-bed'),truck),cab=vertices(truck.getObjectByName('dump-cab'),truck);
    assert.ok(box.max.y>2.7&&box.max.y<3.5&&box.max.z-box.min.z>6.5,'readable heavy vehicle proportions');
    assert.ok(bed.max.z<cab.max.z-1.5&&bed.min.y>1.1,'tipper sits behind the cab and above the chassis');
    const wheels=truck.getObjectsByProperty('name','dump-road-wheel');assert.equal(wheels.length,6);
    for(const wheel of wheels){const b=vertices(wheel,truck);assert.ok(Math.abs(b.min.y)<.015,'tyres contact the road');}
    assert.equal(truck.getObjectsByProperty('name','dump-headlight').length,2);
  }finally{road.dispose();}
});

test('V127 the driver continuously turns forward before the head-on bumper contact',()=>{
  const road=buildRoad(new T.Scene(),true),c=camera();
  try{
    road.pose('car_voice',4.999,c,true);const endVoice=c.quaternion.clone();
    road.pose('car_crash',0,c,true);assert.ok(c.quaternion.angleTo(endVoice)<.002,'stage boundary keeps the passenger view');
    let prior=c.quaternion.clone(),priorYaw=Math.abs(c.rotation.y);
    for(let t=.02;t<=1.2;t+=.02){road.pose('car_crash',t,c,true);assert.ok(c.quaternion.angleTo(prior)<.12,'no hard cut to the windshield');assert.ok(Math.abs(c.rotation.y)<=priorYaw+.002,'head turns toward the road');prior.copy(c.quaternion);priorYaw=Math.abs(c.rotation.y);}
    assert.ok(Math.abs(c.rotation.y)<.03,'driver faces forward before impact');
    const truck=road.root.getObjectByName('finale-dump-truck');assert.ok(truck);
    road.pose('car_voice',0,c,true);const first=truck.position.clone();assert.ok(first.x<0,'truck starts in the opposite lane');
    road.pose('car_crash',finaleTiming.impact-.08,c,true);const forward=new T.Vector3(0,0,-1).applyQuaternion(c.quaternion),nose=truck.getObjectByName('dump-front-bumper').getWorldPosition(new T.Vector3());
    assert.ok(forward.dot(nose.clone().sub(c.position).normalize())>.95,'truck is ahead through the windshield');
    const front=truck.getObjectByName('dump-cab'),bounds=new T.Box3().setFromObject(front,true),corners=[];
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])corners.push(new T.Vector3(x,y,bounds.max.z).project(c));
    assert.ok(Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x))>.3,'cab visibly expands across the windshield before contact');
    road.pose('car_crash',finaleTiming.impact,c,true);road.root.updateMatrixWorld(true);
    const car=road.root.getObjectByName('hero-sedan'),truckFront=new T.Box3().setFromObject(truck.getObjectByName('dump-front-bumper'),true).max.z,carFront=new T.Box3().setFromObject(car,true).min.z;
    assert.ok(Math.abs(truckFront-carFront)<.13,'actual truck and car front surfaces meet at impact');
    assert.ok(truck.position.z>first.z+80,'oncoming truck travels toward the driver');
    assert.equal(road.root.getObjectByName('finale-barrier'),undefined,'no roadblock substitutes for the truck');
    road.pose('car_crash',3,c,false);const pose=[...c.position.toArray(),...c.quaternion.toArray(),...truck.position.toArray()];road.pose('car_crash',3,c,false);assert.deepEqual([...c.position.toArray(),...c.quaternion.toArray(),...truck.position.toArray()],pose);
  }finally{road.dispose();}
});

test('V127 the injured passenger remains seated inside the cabin without reaching at the driver',()=>{
  const road=buildRoad(new T.Scene(),true),c=camera();
  try{
    for(const [stage,t] of [['car_voice',3.5],['car_voice',4.9],['car_crash',0],['car_crash',.4],['car_crash',1.2]]){
      road.pose(stage,t,c,true);road.root.updateMatrixWorld(true);
      const figure=road.root.getObjectByName('finale-passenger'),car=road.root.getObjectByName('hero-sedan'),bounds=vertices(figure,car);
      assert.ok(bounds.min.x>0&&bounds.max.x<.79,'complete adult figure stays on passenger side');
      assert.ok(bounds.min.y>.272&&bounds.max.y<1.46,'feet and wet hair remain above floor, skull below roof');
      assert.ok(bounds.min.z>-.98&&bounds.max.z<.48,'body stays inside the front footwell and rear of the passenger seat');
      for(const side of [-1,1]){const hand=figure.getObjectByName(`ghost-hand-${side}`).getWorldPosition(new T.Vector3()).applyMatrix4(car.matrixWorld.clone().invert());assert.ok(hand.x>.15&&hand.y<.85,'hands rest at the lap throughout the scream and turn');}
      assert.equal(figure.getObjectByName('ghost-continuous-face').userData.openness,0,'the ending has no attack gape');
      const head=figure.getObjectByName('ghost-head'),face=head.localToWorld(new T.Vector3(0,.13,.16)),opaque=[];car.traverse(o=>{if(o.isMesh&&!o.material.transparent)opaque.push(o);});
      if(stage==='car_voice'){const ray=new T.Raycaster(c.position.clone(),face.clone().sub(c.position).normalize(),.02,c.position.distanceTo(face)-.02);assert.equal(ray.intersectObjects(opaque,false).length,0,'the face is exposed above the cushion');}
    }
  }finally{road.dispose();}
});

test('V127 the parked door trim stays attached to its hinge and exposes a clear sealed aperture',()=>{
  const rig=createDrivingCar(true,true),root=rig.root,door=root.getObjectByName('hero-passenger-door');
  const card=door.getObjectByName('hero-door-card'),seal=door.getObjectByName('hero-door-edge-seal'),sill=root.getObjectByName('hero-passenger-sill');
  assert.ok(card&&seal&&sill,'the open door needs a full inner panel, seals and fixed sill');
  root.updateMatrixWorld(true);const closed=card.getWorldPosition(new T.Vector3()),fixed=sill.getWorldPosition(new T.Vector3());
  assert.ok(vertices(card,door).max.x<.15,'inner card fits within the physical door thickness');
  assert.ok(door.getObjectByName('hero-door-hinge-upper')&&door.getObjectByName('hero-door-hinge-lower'));
  door.rotation.y=1.18;root.updateMatrixWorld(true);assert.ok(card.getWorldPosition(new T.Vector3()).distanceTo(closed)>.45,'card follows the opening leaf');assert.ok(sill.getWorldPosition(new T.Vector3()).distanceTo(fixed)<1e-9,'sill belongs to the chassis');
  const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const ray=new T.Raycaster(new T.Vector3(.38,1.18,-.24),new T.Vector3(1,0,0),0,.72);assert.equal(ray.intersectObjects(meshes,false).length,0,'open passenger aperture has no remaining side pane or panel');
});

test('V127 the passenger portrait replaces the scalp at its real head anchor and keeps a safe fallback',async()=>{
  const road=buildRoad(new T.Scene(),true),c=camera();
  try{
    road.pose('car_voice',2.45,c,true);
    assert.ok(road.root.getObjectByName('finale-passenger-portrait'),'the authored portrait must belong to the actual seated figure');
    const {createPassengerPortrait}=await import('../lib/passenger-portrait.ts');
    const {createGhost,animateGhostPassenger}=await import('../lib/ghost.ts');
    const figure=createGhost(new T.Group());figure.position.set(.42,.055,-.11);figure.rotation.y=Math.PI;figure.scale.setScalar(.9);figure.visible=true;
    animateGhostPassenger(figure,12.45,0,true,true);
    const head=figure.getObjectByName('ghost-head'),source=new T.DataTexture(new Uint8Array([180,190,185,255]),1,1);
    const fallback=createPassengerPortrait(figure,null);fallback.pose(c,12.45,true);assert.equal(head.visible,true,'a failed texture load cannot leave a headless passenger');assert.equal(fallback.mesh.visible,false);
    const portrait=createPassengerPortrait(figure,source);portrait.pose(c,12.45,true);figure.updateMatrixWorld(true);
    assert.equal(head.visible,false,'flat scalp and old wide hair strips are completely hidden only after the portrait is ready');
    assert.equal(portrait.mesh.visible,true);assert.ok(portrait.mesh.material.transparent&&portrait.mesh.material.map,'fine hair uses the alpha cutout');
    const bounds=new T.Box3().setFromBufferAttribute(portrait.mesh.geometry.attributes.position);
    assert.ok(bounds.max.z-bounds.min.z>.01,'the head surface has physical curvature');
    const size=new T.Box3().setFromObject(portrait.mesh,true).getSize(new T.Vector3());assert.ok(size.y<.51&&size.y>.45,'portrait retains adult head/neck size');
    assert.ok(portrait.mesh.getWorldPosition(new T.Vector3()).distanceTo(head.getWorldPosition(new T.Vector3()))<.025,'photo stays on the original head instead of approaching the player');
    const fixed=portrait.mesh.matrixWorld.toArray();portrait.pose(c,12.45,true);figure.updateMatrixWorld(true);assert.deepEqual(portrait.mesh.matrixWorld.toArray(),fixed,'same simulation time freezes the portrait');
    const collar=figure.getObjectByName('ghost-collar-skin');assert.notEqual(collar.material,portrait.mesh.material,'the lower anatomical body retains its own real surface');
  }finally{road.dispose();}
});

test('V127 the portrait neck blends over the shoulder without changing head occlusion',async()=>{
  const {createPassengerPortrait}=await import('../lib/passenger-portrait.ts');
  const {createGhost,animateGhostPassenger}=await import('../lib/ghost.ts');
  const figure=createGhost(new T.Group());figure.position.set(.42,.055,-.11);figure.rotation.y=Math.PI;figure.scale.setScalar(.9);figure.visible=true;
  animateGhostPassenger(figure,12.45,0,true,true);
  const c=camera();c.position.set(-.38,1.22,-.24);
  const source=new T.DataTexture(new Uint8Array([180,190,185,255]),1,1),portrait=createPassengerPortrait(figure,source);portrait.pose(c,12.45,true);figure.updateMatrixWorld(true);
  const junction=portrait.mesh.getObjectByName('finale-passenger-portrait-junction');assert.ok(junction,'the neck must blend over the native sleeve instead of being cut through');
  assert.equal(portrait.mesh.material.depthTest,true,'the actual head still respects cabin occlusion');
  assert.equal(junction.material.depthTest,false,'only the lower neck paints over the shoulder');
  assert.ok(junction.material.transparent&&junction.material.map,'fine hair and lower fade retain their alpha');
  const hit=y=>new T.Raycaster(portrait.mesh.localToWorld(new T.Vector3(0,y,1)),new T.Vector3(0,0,-1).transformDirection(portrait.mesh.matrixWorld),0,2).intersectObject(junction,false);
  assert.ok(hit(-.15).length>0,'the native neck/chest area receives the overlay');assert.equal(hit(.1).length,0,'the overlay cannot cover the face or scalp');
});
