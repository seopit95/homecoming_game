import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,canStandAt,hasLineOfSight,disposeWorld} from '../lib/world.ts';
import {findPath} from '../lib/navigation.ts';
import {initialStory} from '../lib/story.ts';
const ctx={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
globalThis.document={createElement(){return {width:0,height:0,getContext:()=>ctx};}};

for(const area of ['annex','courtyard','archive','plant'])test(`${area} provides reachable evidence, floor support and a physically opening exit`,()=>{
 const world=buildWorld(new T.Scene(),area);
 try{
  assert.ok(world.targets.length>=7);assert.ok(canStandAt(world.spawn.x,world.spawn.z,world.solids,.23,world.bounds));
  for(const target of world.targets){
   const approach=target.mesh.userData.approach;assert.ok(approach,`${target.id} has an authored interaction side`);
   assert.ok(canStandAt(approach.x,approach.z,world.solids,.23,world.bounds),`${target.id} clear approach`);
   if(target.id==='court_key'){
    assert.equal(hasLineOfSight({x:approach.x,y:1.65,z:approach.z},target.point,world.solids),false,'a closed safe door hides its key');
    const story={...initialStory(),stage:'court_safe_open',code:'2617',notes:['court_confirm']};world.updateStory(story.stage,0,false,story);world.updateStory(story.stage,1.2,false,story);
   }
   const p={x:approach.x,y:1.65,z:approach.z};assert.ok(hasLineOfSight(p,target.point,world.solids),`${target.id} visible from approach`);
   assert.ok(findPath(world.spawn,approach,world.solids,world.bounds,.23).length,`${target.id} has a walking route`);
   assert.ok(Math.hypot(p.x-target.point.x,p.y-target.point.y,p.z-target.point.z)<2.3,`${target.id} within reach`);
  }
  const door=world.root.getObjectByName('expansion-exit-door');assert.ok(door);
  assert.equal(canStandAt(door.position.x+.7,door.position.z,world.solids,.23,world.bounds),false);
  world.updateStory(area==='courtyard'?'court_departure':`${area}_departure`,0,false);world.updateStory(area==='courtyard'?'court_departure':`${area}_departure`,1.2,false);
  assert.equal(canStandAt(door.position.x+.7,door.position.z,world.solids,.23,world.bounds),true);
  assert.ok(findPath(world.spawn,{x:door.position.x+.7,z:door.position.z-1},world.solids,world.bounds).length);
  world.root.updateMatrixWorld(true);
  for(const prop of world.root.children.filter(o=>o.userData.floorProp)){
   const b=new T.Box3().setFromObject(prop);assert.ok(b.min.y>-.03&&b.min.y<.04,`${prop.name} rests on the floor at ${b.min.y}`);
  }
 }finally{disposeWorld(world.root);}
});

test('completed mechanical-plant drainage persists in parking while legacy parking saves retain the pump route',()=>{
 const world=buildWorld(new T.Scene(),'parking');
 try{
  const flood=world.root.getObjectByName('parking-flood'),target=world.targets.find(t=>t.id==='car_search');
  world.updateStory('parking_gate',0,false,{notes:['plant_drained']});assert.equal(flood.scale.y,.35);assert.match(target.label,/차 열쇠/);
  world.updateStory('parking_gate',0,false,{notes:[]});assert.equal(flood.scale.y,2.6);assert.match(target.label,/배수 설비/);
 }finally{disposeWorld(world.root);}
});
