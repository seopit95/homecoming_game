import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {initialStory} from '../lib/story.ts';
import {buildWorld,disposeWorld,hasLineOfSight,canStandAt} from '../lib/world.ts';import {solidContainsPoint} from '../lib/collision.ts';
import {setDoorAngle} from '../lib/passage.ts';
const ctx={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const state=()=>({...initialStory(),stage:'parking_alarm',notes:['home_car_key','basement_route']});

test('the driver door is reachable from the side aisle and opens during boarding',()=>{
 const w=buildWorld(new T.Scene(),'parking'),camera=new T.PerspectiveCamera();try{
  const s=state();w.updateStory(s.stage,0,false,s);w.root.updateMatrixWorld(true);
  const t=w.targets.find(t=>t.id==='car_board'),door=w.carDeparture.car.getObjectByName('hero-driver-door');assert.equal(t.mesh,door);
  const p={x:3.2,y:1.65,z:-17.8};assert.ok(canStandAt(p.x,p.z,w.solids,.23,w.bounds));assert.ok(hasLineOfSight(p,t.point,w.solids));assert.ok(new T.Vector3(p.x,p.y,p.z).distanceTo(t.point)<2.3);
  camera.position.set(p.x,p.y,p.z);w.carDeparture.pose(0,camera,false);assert.equal(Math.abs(door.rotation.y),0);w.carDeparture.pose(3,camera,false);assert.ok(Math.abs(door.rotation.y)>1);
  assert.equal(w.carDeparture.passengerDoor.rotation.y,0,'boarding never opens the unused passenger side');w.carDeparture.pose(6,camera,false);assert.equal(Math.abs(door.rotation.y),0);
 }finally{disposeWorld(w.root);}
});
test('retained passenger hinge collision geometry still respects a person in its sweep',()=>{
 // Isolated physical hinge regression, not a retired passenger-search mission.
 const w=buildWorld(new T.Scene(),'parking');try{
  const door=w.carDeparture.passengerDoor,block=door.userData.block,occupant={x:6.64,z:-18.32,r:.23};
  assert.ok(canStandAt(occupant.x,occupant.z,w.solids,occupant.r,w.bounds));
  setDoorAngle(door,block,1.2,-.025,-.585,[occupant]);assert.ok(door.rotation.y<1);assert.equal(solidContainsPoint(block,occupant.x,occupant.z,occupant.r),false);
  setDoorAngle(door,block,1.2,-.025,-.585);assert.ok(door.rotation.y>1);
  w.carDeparture.inspect('parking_alarm',0,state());w.carDeparture.inspect('parking_alarm',1,state());assert.equal(door.rotation.y,0,'normal parking inspection returns the unused hinge to closed');assert.equal(w.carDeparture.key.visible,false);
 }finally{disposeWorld(w.root);}
});

test('the retained bag remains in the same footwell after the garage to road handoff, clear of the passenger',async()=>{
 const {buildRoad}=await import('../lib/prologue.ts');const w=buildWorld(new T.Scene(),'parking'),road=buildRoad(new T.Scene(),true),camera=new T.PerspectiveCamera();
 try{
  const car=road.root.getObjectByName('hero-sedan'),bag=car.getObjectByName('garage-seat-bag'),original=w.carDeparture.car.getObjectByName('garage-seat-bag');assert.ok(bag);assert.deepEqual(bag.position.toArray(),original.position.toArray());assert.deepEqual(bag.scale.toArray(),original.scale.toArray());assert.equal(car.getObjectByName('garage-car-key').visible,false,'the home key is never duplicated in the bag');
  const bounds=new T.Box3(new T.Vector3(.22,.274,.065),new T.Vector3(.61,.56,.275)),trimBounds=new T.Box3(new T.Vector3(.765,.43,-.89),new T.Vector3(.86,.87,.18)),inverse=new T.Matrix4(),relative=new T.Matrix4(),tri=new T.Triangle();
  for(const [stage,time] of [['car_voice',0],['car_voice',3.2],['car_crash',.55]]){
   road.pose(stage,time,camera,false);road.root.updateMatrixWorld(true);inverse.copy(car.matrixWorld).invert();let hits=0;
   const passenger=road.root.getObjectByName('finale-passenger');passenger.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,index=g.index,count=index?index.count:g.attributes.position.count;relative.multiplyMatrices(inverse,o.matrixWorld);for(let i=0;i<count;i+=3){for(const [j,v] of [[0,tri.a],[1,tri.b],[2,tri.c]]){o.getVertexPosition(index?index.getX(i+j):i+j,v);v.applyMatrix4(relative);}if((bounds.intersectsTriangle(tri)||trimBounds.intersectsTriangle(tri)))hits++;}});assert.equal(hits,0,`${stage}:${time} new bag or passenger-door trim intersects the existing passenger`);
  }
 }finally{disposeWorld(w.root);road.dispose();}
});


test('car body and both door colliders travel with the visible departing car',()=>{
 const w=buildWorld(new T.Scene(),'parking'),camera=new T.PerspectiveCamera();try{
  w.updateStory('parking_alarm',0,false,state());const car=w.carDeparture.car,blocks=car.userData.interactionSolids.slice(0,3),before=blocks.map(b=>({x:b.x,z:b.z}));
  camera.position.set(3.2,1.65,-17.8);w.carDeparture.pose(0,camera,false);w.carDeparture.pose(13,camera,false);
  for(const [i,block] of blocks.entries()){assert.ok(block.z<before[i].z-3,'body and door solids cannot remain in the parking bay');assert.ok(Math.abs(block.z-car.position.z)<1.5);}
  w.reset();for(const [i,block] of blocks.entries()){assert.equal(block.x,before[i].x);assert.equal(block.z,before[i].z);}
 }finally{disposeWorld(w.root);}
});
