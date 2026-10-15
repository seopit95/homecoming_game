import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import * as story from '../lib/story.ts';
import {buildWorld,disposeWorld} from '../lib/world.ts';
import {buildRoad} from '../lib/prologue.ts';
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
test('boarding succeeds in the actual garage before reaching the road',()=>{
 let s={...story.initialStory(),stage:'parking_run'};s=story.transition(s,'car_board');
 assert.equal(s.stage,'car_departure');assert.equal(story.areaFor(s),'parking');assert.ok(story.isCinematic(s.stage));
 assert.equal(story.transition(s,'caught'),s);assert.equal(story.checkpoint(s).stage,'car_departure');
 s=story.transition(s,'car_departed');assert.equal(s.stage,'car_escape');assert.equal(story.areaFor(s),'aftermath');
});

// Triangle-vs-oriented-box sampling retains all static scene meshes, including
// the eight parked cars, visible wheel stops, pipes, ramp, shutter and ceiling.
// The chassis envelope excludes only the empty volume below its undertray;
// four separate wheel envelopes cover the tyres down to the contact patches.
test('the real chassis and hinged door sweep through the installed garage and ramp without static overlap',()=>{
 const w=buildWorld(new T.Scene(),'parking'),r=w.carDeparture,c=new T.PerspectiveCamera(72,16/9,.06,160);
 try{
  assert.ok(r);assert.equal(r.duration,story.carDepartureDuration);assert.equal(r.duration,24);
  assert.equal(w.root.children.filter(o=>o.name==='parked-sedan').length,8);
  c.position.set(3.2,1.65,-17.8);c.rotation.y=-Math.PI/2;
  const meshes=[];w.root.traverse(o=>{if(o.isMesh&&!r.car.getObjectById(o.id)&&!w.figure.getObjectById(o.id))meshes.push(o);});
  const tri=new T.Triangle(),inv=new T.Matrix4(),mat=new T.Matrix4(),bb=new T.Box3(),worldBox=new T.Box3();
  const body=new T.Box3(new T.Vector3(-1.12,.325,-2.27),new T.Vector3(1.12,1.49,2.27));
  const door=r.car.getObjectByName('hero-driver-door'),doorBounds=new T.Box3();
  door.updateWorldMatrix(true,true);doorBounds.setFromObject(door,true);doorBounds.applyMatrix4(new T.Matrix4().copy(door.matrixWorld).invert());
  const envelopes=[{object:r.car,box:new T.Box3(new T.Vector3(-.85,.177,-1.78),new T.Vector3(.85,.325,1.78))},{object:r.car,box:body},{object:door,box:doorBounds}];
  for(const x of [-.795,.795])for(const z of [-1.35,1.35])envelopes.push({object:r.car,box:new T.Box3(new T.Vector3(x-.111,.065,z-.312),new T.Vector3(x+.111,.626,z+.312))});
  for(let step=0;step<=240;step++){
   const t=step/10;r.pose(t,c,false);w.root.updateMatrixWorld(true);
   // The tyre contact cap below 65 mm is curved rather than a rectangular
   // volume. Test its real vertices against the installed ramp floor.
   r.car.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.getAttribute('position'),v=new T.Vector3();for(let j=0;j<p.count;j++){v.fromBufferAttribute(p,j).applyMatrix4(o.matrixWorld);const ramp=1.2*T.MathUtils.smoothstep(-v.z,24,40);assert.ok(v.y>=ramp-.012,`real tyre/body below ramp t=${t}, y=${v.y}, floor=${ramp}`);}});
   for(const envelope of envelopes){
    inv.copy(envelope.object.matrixWorld).invert();worldBox.copy(envelope.box).applyMatrix4(envelope.object.matrixWorld);
    for(const m of meshes){
     bb.setFromObject(m);if(!bb.intersectsBox(worldBox))continue;
     mat.multiplyMatrices(inv,m.matrixWorld);const p=m.geometry.getAttribute('position'),index=m.geometry.index,count=index?index.count:p.count;
     for(let i=0;i<count;i+=3){
      tri.a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(mat);tri.b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(mat);tri.c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(mat);
      assert.equal(envelope.box.intersectsTriangle(tri),false,`t=${t}, envelope=${envelope.object.name}, mesh=${m.name||m.id}, triangle=${i/3}, at=${m.position.toArray()}`);
     }
    }
   }
  }
  const exit=c.position.clone(),exitRotation=c.quaternion.clone(),carBox=new T.Box3().setFromObject(r.car,true),road=buildRoad(new T.Scene(),true);
  road.setDepartureFrame(r.roadFrame);road.pose('car_escape',0,c,false);road.root.updateMatrixWorld(true);
  assert.ok(c.position.distanceTo(exit)<.00001,'same real seated eye at road handoff');assert.ok(c.quaternion.angleTo(exitRotation)<.00001,'same heading and pitch');
  const roadCar=road.root.getObjectByName('hero-sedan'),roadBox=new T.Box3().setFromObject(roadCar,true);
  assert.ok(carBox.min.distanceTo(roadBox.min)<.001&&carBox.max.distanceTo(roadBox.max)<.001,'same actual body/door envelope');
  // Floor, roof and walls under/ahead of the exit eye exist at the same distances.
  for(const direction of [new T.Vector3(0,-1,0),new T.Vector3(0,1,0),new T.Vector3(-1,0,0),new T.Vector3(1,0,0)]){
   const origin=new T.Vector3(5.8,2.4,-49),ray=new T.Raycaster(origin,direction,0,5);
   const a=ray.intersectObjects(meshes.filter(o=>!o.material.transparent),false)[0],roadMeshes=[];road.root.traverse(o=>{if(o.isMesh&&!road.root.getObjectByName('memory-car').getObjectById(o.id))roadMeshes.push(o);});
   const b=ray.intersectObjects(roadMeshes.filter(o=>!o.material.transparent),false)[0];assert.ok(a&&b);assert.ok(Math.abs(a.distance-b.distance)<.015,`surface distance ${a.distance}/${b.distance}`);
  }
  road.dispose();disposeWorld(road.root);
 }finally{disposeWorld(w.root);}
});

test('door aperture, deterministic pause, reset and reduced motion use the same physical car',()=>{
 const w=buildWorld(new T.Scene(),'parking'),r=w.carDeparture,c=new T.PerspectiveCamera();
 try{
  c.position.set(3.2,1.65,-17.8);r.pose(3,c,false);w.root.updateMatrixWorld(true);
  const carMeshes=[];r.car.traverse(o=>{if(o.isMesh)carMeshes.push(o);});
  const ray=new T.Raycaster(new T.Vector3(4.62,1.18,-18.24),new T.Vector3(-1,0,0),0,.72);
  assert.equal(ray.intersectObjects(carMeshes,false).length,0,'real open aperture, no intact side pane/panel');
  r.pose(13,c,false);const at=c.position.toArray(),q=c.quaternion.toArray(),solids=JSON.stringify(w.solids);r.pose(13,c,false);
  assert.deepEqual(c.position.toArray(),at);assert.deepEqual(c.quaternion.toArray(),q);assert.equal(JSON.stringify(w.solids),solids);
  r.pose(24,c,true);const reduced=c.position.clone();r.reset();c.position.set(3.2,1.65,-17.8);r.pose(24,c,false);assert.ok(c.position.distanceTo(reduced)<.00001);
  w.reset();assert.deepEqual(r.car.position.toArray(),[5,0,-18]);assert.equal(r.car.getObjectByName('hero-driver-door').rotation.y,0);assert.equal(w.root.getObjectByName('vehicle-shutter').position.y,1.3);
 }finally{disposeWorld(w.root);}
});

test('the visible wheel follows the bay alignment and centers at rest and handoff',()=>{
 const w=buildWorld(new T.Scene(),'parking'),r=w.carDeparture,c=new T.PerspectiveCamera(),wheel=r.car.getObjectByName('hero-steering-wheel');
 try{
  assert.ok(wheel);c.position.set(3.2,1.65,-17.8);r.pose(8,c,false);assert.equal(wheel.rotation.z,0);
  r.pose(11,c,false);assert.ok(wheel.rotation.z>.2,'wheel turns into the rightward bay alignment');const into=wheel.quaternion.clone();r.pose(11,c,false);assert.deepEqual(wheel.quaternion.toArray(),into.toArray());
  r.pose(13,c,false);assert.ok(wheel.rotation.z<-.2,'wheel counter-turns as the car aligns with the ramp');
  r.pose(24,c,false);assert.equal(wheel.rotation.z,0);r.pose(11,c,false);r.reset();assert.equal(wheel.rotation.z,0);
 }finally{disposeWorld(w.root);}
});
