import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildRoad} from '../lib/prologue.ts';
import {opening} from '../lib/story.ts';
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
