import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildRoad} from '../lib/prologue.ts';
import {disposeWorld} from '../lib/world.ts';
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},arc(){},fill(){}};
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({width:0,height:0,getContext:()=>context})},configurable:true});

test('ending road does not construct the opening-only pedestrian rig',()=>{
 const r=buildRoad(new T.Scene(),true),camera=new T.PerspectiveCamera();
 try{
  assert.equal(r.root.getObjectByName('memory-pedestrian')?.children.length??0,0,'finale must not build an unused living rig');
  assert.ok(r.root.getObjectByName('finale-passenger'));
  for(const [stage,t] of [['car_escape',0],['car_voice',1],['car_crash',2],['ended',0],['car_escape',0]])r.pose(stage,t,camera,true);
  assert.ok(camera.position.toArray().every(Number.isFinite));
 }finally{r.dispose();disposeWorld(r.root);}
});

test('opening road retains its real pedestrian and collision poses',()=>{
 const r=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera();
 try{assert.ok(r.root.getObjectByName('pedestrian-anatomical-head'));r.pose('drive',10,camera,true);r.pose('impact',1,camera,true);assert.equal(r.root.getObjectByName('memory-pedestrian').visible,true);}
 finally{r.dispose();disposeWorld(r.root);}
});
