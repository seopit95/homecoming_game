import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildRoad} from '../lib/prologue.ts';
import {opening} from '../lib/story.ts';

test('the final drive reveals a seated passenger, collides at the barrier and freezes on pause',()=>{
  const road=buildRoad(new T.Scene(),true),camera=new T.PerspectiveCamera(72,16/9,.06,160);
  road.pose('car_escape',0,camera,false);const start=camera.position.clone();
  const passenger=road.root.getObjectByName('finale-passenger');assert.ok(passenger);assert.equal(passenger.visible,false);
  road.pose('car_escape',10,camera,false);const arrival=camera.position.clone();assert.ok(arrival.z<start.z-50);
  road.pose('car_voice',0,camera,false);assert.ok(camera.position.distanceTo(arrival)<.01);assert.equal(passenger.visible,true);
  road.pose('car_voice',4.9,camera,false);assert.ok(camera.rotation.y<-.9,'the driver turns right to the passenger');
  const face=passenger.getObjectByName('ghost-head').localToWorld(new T.Vector3(0,.13,.16));camera.updateMatrixWorld();const screen=face.project(camera);assert.ok(Math.abs(screen.x)<.7&&Math.abs(screen.y)<.85,'the passenger face is actually in frame');
  road.pose('car_crash',.55,camera,false);const car=road.root.getObjectByName('memory-car'),barrier=road.root.getObjectByName('finale-barrier');assert.ok(Math.abs(car.position.z-2.25-barrier.position.z)<.5,'the impact lands at the obstruction');
  road.pose('car_crash',3,camera,false);assert.equal(road.root.getObjectByName('finale-shattered-windshield').visible,true);const stopped=camera.position.clone();road.pose('car_crash',3,camera,false);assert.deepEqual(camera.position.toArray(),stopped.toArray());
  assert.equal(road.root.getObjectByName('memory-pedestrian').visible,false,'the ending is not another pedestrian collision');
});
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({width:0,height:0,getContext:()=>context})},configurable:true});

test('the driver and pedestrian stay in the same physical scene through impact, stop and escape',()=>{
  const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera(68,16/9,.06,160);
  const car=road.root.getObjectByName('memory-car'),person=road.root.getObjectByName('memory-pedestrian');
  road.pose('drive',opening.drive.duration,camera,true);
  const approach=camera.position.clone(),personAt=person.position.clone();
  road.pose('impact',0,camera,true);
  assert.ok(camera.position.distanceTo(approach)<.03,'cut to impact must not teleport the driver');
  assert.ok(person.position.distanceTo(personAt)<.03,'the struck person must stay at the collision point');
  road.pose('impact',2,camera,true);const stopped=car.position.clone();
  road.pose('impact',opening.impact.duration,camera,true);
  assert.ok(car.position.distanceTo(stopped)<.01,'the car holds still after braking');
  assert.equal(person.visible,true,'the victim remains in the scene after landing');
  const landedBounds=new T.Box3().setFromObject(person,true);
  assert.ok(landedBounds.min.y>=.005,'the landed body stays above the road surface');
  assert.ok(landedBounds.max.y<.7,'the landed body lies flat instead of standing');
  const bodyAt=person.position.clone(),beforeFlee=camera.position.clone();
  road.pose('flee',0,camera,true);
  assert.ok(camera.position.distanceTo(beforeFlee)<.03,'departure begins from the stopped car');
  road.pose('flee',3,camera,true);
  assert.ok(car.position.z<stopped.z-2,'departure accelerates away from the crossing');
  assert.ok(person.position.distanceTo(bodyAt)<.001,'the victim is left at the scene');
});

test('pausing the opening freezes the windshield and restarting clears the collision damage',()=>{
  const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera(68,16/9,.06,160);
  road.pose('impact',4,camera,false);road.root.updateMatrixWorld(true);
  const before=[];road.root.traverse(o=>before.push(o.matrixWorld.toArray()));
  road.pose('impact',4,camera,false);road.root.updateMatrixWorld(true);
  const after=[];road.root.traverse(o=>after.push(o.matrixWorld.toArray()));
  assert.deepEqual(after,before);
  assert.equal(road.root.getObjectByName('memory-cracked-glass').visible,true);
  road.pose('drive',0,camera,false);
  assert.equal(road.root.getObjectByName('memory-cracked-glass').visible,false);
});

test('the opening has room to follow the aftermath without becoming a long unskippable film',()=>{
  const seconds=Object.values(opening).reduce((sum,s)=>sum+s.duration,0);
  assert.ok(seconds>=45&&seconds<=55,`memory lasts ${seconds}s before waking`);
  assert.ok(opening.impact.duration>=11,'the player can register the victim and the ignored phone before departure');
});

test('the phone distraction is brief and the pedestrian reaches the bumper only at impact',()=>{
  const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera(68,16/9,.06,160);
  let distracted=0;
  for(let t=0;t<opening.drive.duration;t+=.05){road.pose('drive',t,camera,true);if(camera.rotation.y<-.15)distracted+=.05;}
  assert.ok(distracted>=1&&distracted<2.5,`a glance, not ${distracted}s looking away`);
  road.pose('drive',opening.drive.duration-5,camera,true);const car=road.root.getObjectByName('memory-car'),person=road.root.getObjectByName('memory-pedestrian');assert.ok(car.position.z-person.position.z>30);
  road.pose('drive',opening.drive.duration,camera,true);assert.ok(Math.abs(car.position.z-2.92-person.position.z)<.2,'collision happens at the front bumper');
});

test('the passenger is actually visible above the cushion inside the shared sedan',()=>{
 const road=buildRoad(new T.Scene(),true),camera=new T.PerspectiveCamera(72,16/9,.06,160);
 road.pose('car_voice',3.5,camera,false);road.root.updateMatrixWorld(true);
 const passenger=road.root.getObjectByName('finale-passenger'),head=passenger.getObjectByName('ghost-head'),face=head.localToWorld(new T.Vector3(0,.13,.16)),car=road.root.getObjectByName('hero-sedan');
 const opaque=[];car.traverse(o=>{if(o.isMesh&&!o.material.transparent)opaque.push(o);});
 const distance=camera.position.distanceTo(face),ray=new T.Raycaster(camera.position.clone(),face.clone().sub(camera.position).normalize(),.02,distance-.02);
 assert.equal(ray.intersectObjects(opaque,false).length,0,'seat/back/headrest/body must not hide the passenger face');
 assert.ok(new T.Vector3(0,0,1).transformDirection(head.matrixWorld).dot(camera.position.clone().sub(face).normalize())>.3,'passenger turns her face toward the driver in the unmirrored cabin');
 const headBounds=new T.Box3().setFromObject(head,true);assert.ok(face.y>1.1,'face is above the cushion, unlike the long hanging hair');assert.ok(new T.Box3().setFromObject(passenger,true).min.y>.272,'feet stay above the actual cabin floor');assert.ok(headBounds.max.y<1.46,'head fits below the real roof');
});
