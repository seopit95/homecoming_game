import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {initialStory,transition,objectiveFor,journal,checkpoint} from '../lib/story.ts';import {writeProgress,readProgress} from '../lib/preferences.ts';
import {buildWorld,disposeWorld,hasLineOfSight,canStandAt} from '../lib/world.ts';import {solidContainsPoint} from '../lib/collision.ts';
const ctx={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const state=()=>({...initialStory(),stage:'parking_key',notes:['plant_drained']});
test('the passenger door must be opened before taking a real car key, with progress retained on save',()=>{
 const s=state();assert.equal(transition(s,'car_search'),s,'closed sheet metal is not a bag interaction');assert.match(objectiveFor(s),/문/);
 const opened=transition(s,'car_passenger');assert.equal(opened.stage,'parking_key');assert.ok(opened.notes.includes('car_passenger'));assert.ok(journal.car_passenger);assert.match(objectiveFor(opened),/가방/);
 const store={value:null,setItem(_,v){this.value=v;},getItem(){return this.value;}};writeProgress(store,opened,1200);assert.ok(readProgress(store).notes.includes('car_passenger'));
 const taken=transition(opened,'car_search');assert.equal(taken.stage,'parking_alarm');assert.ok(taken.notes.includes('car_search'));
});
test('the garage passenger hinge opens a real aperture and exposes the bag and reachable key',()=>{
 const w=buildWorld(new T.Scene(),'parking');try{
  const door=w.carDeparture.car.getObjectByName('hero-passenger-door');assert.ok(door,'a real passenger hinge exists on the garage car');
  let s=state();w.updateStory(s.stage,0,false,s);assert.equal(door.rotation.y,0);s=transition(s,'car_passenger');w.updateStory(s.stage,.1,false,s);w.updateStory(s.stage,1.3,false,s);assert.ok(door.rotation.y>1);
  w.root.updateMatrixWorld(true);const targets=w.targets,bag=w.carDeparture.car.getObjectByName('garage-seat-bag'),key=w.carDeparture.car.getObjectByName('garage-car-key');assert.ok(bag&&key?.visible);assert.ok(new T.Box3().setFromObject(bag).min.y>.27&&new T.Box3().setFromObject(bag).min.y<.28,'bag rests on the real rear footwell floor');
  const t=targets.find(t=>t.id==='car_search'),p=t.mesh.userData.approach;assert.ok(p&&canStandAt(p.x,p.z,w.solids,.23,w.bounds));assert.ok(hasLineOfSight({x:p.x,y:1.65,z:p.z},t.point,w.solids));assert.ok(new T.Vector3(p.x,1.65,p.z).distanceTo(t.point)<2.3);
  const meshes=[];w.carDeparture.car.traverse(o=>{if(o.isMesh)meshes.push(o);});assert.equal(new T.Raycaster(new T.Vector3(7.1,1.18,-18.2),new T.Vector3(-1,0,0),0,1.5).intersectObjects(meshes,false).length,0,'the open side has no fixed intact pane or body sheet');
  s=transition(s,'car_search');w.updateStory(s.stage,1.31,false,s);assert.equal(key.visible,false);assert.ok(door.rotation.y>.8,'pickup cannot pop the door shut');w.updateStory(s.stage,2.5,false,s);assert.equal(door.rotation.y,0);
 }finally{disposeWorld(w.root);}
});
test('the passenger door sweep respects a person in the side aisle and resumes once clear',()=>{
 const w=buildWorld(new T.Scene(),'parking');try{
  const s=transition(state(),'car_passenger'),door=w.carDeparture.car.getObjectByName('hero-passenger-door');assert.ok(door);w.updateStory(s.stage,0,false,s);
  const occupant={x:6.64,z:-18.32,r:.23};assert.ok(canStandAt(occupant.x,occupant.z,w.solids,occupant.r,w.bounds));w.updateStory(s.stage,1,false,s,[occupant]);const blocked=door.rotation.y;assert.ok(blocked<1,'opening pauses before sweeping into the person');
  const block=w.solids.find(o=>o===door.userData.block);assert.ok(block);assert.equal(solidContainsPoint(block,occupant.x,occupant.z,occupant.r),false);w.updateStory(s.stage,2,false,s);assert.ok(door.rotation.y>1);
 }finally{disposeWorld(w.root);}
});

test('the recovered bag remains in the same footwell after the garage to road handoff, clear of the passenger',async()=>{
 const {buildRoad}=await import('../lib/prologue.ts');const w=buildWorld(new T.Scene(),'parking'),road=buildRoad(new T.Scene(),true),camera=new T.PerspectiveCamera();
 try{
  const car=road.root.getObjectByName('hero-sedan'),bag=car.getObjectByName('garage-seat-bag'),original=w.carDeparture.car.getObjectByName('garage-seat-bag');assert.ok(bag);assert.deepEqual(bag.position.toArray(),original.position.toArray());assert.deepEqual(bag.scale.toArray(),original.scale.toArray());assert.equal(car.getObjectByName('garage-car-key').visible,false,'the recovered key is no longer in the bag');
  const bounds=new T.Box3(new T.Vector3(.22,.274,.065),new T.Vector3(.61,.56,.275)),trimBounds=new T.Box3(new T.Vector3(.765,.43,-.89),new T.Vector3(.86,.87,.18)),inverse=new T.Matrix4(),relative=new T.Matrix4(),tri=new T.Triangle();
  for(const [stage,time] of [['car_voice',0],['car_voice',3.2],['car_crash',.55]]){
   road.pose(stage,time,camera,false);road.root.updateMatrixWorld(true);inverse.copy(car.matrixWorld).invert();let hits=0;
   const passenger=road.root.getObjectByName('finale-passenger');passenger.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,index=g.index,count=index?index.count:g.attributes.position.count;relative.multiplyMatrices(inverse,o.matrixWorld);for(let i=0;i<count;i+=3){for(const [j,v] of [[0,tri.a],[1,tri.b],[2,tri.c]]){o.getVertexPosition(index?index.getX(i+j):i+j,v);v.applyMatrix4(relative);}if((bounds.intersectsTriangle(tri)||trimBounds.intersectsTriangle(tri)))hits++;}});assert.equal(hits,0,`${stage}:${time} new bag or passenger-door trim intersects the existing passenger`);
  }
 }finally{disposeWorld(w.root);road.dispose();}
});


test('the opened passenger aperture colliders travel with the visible car',()=>{
 const w=buildWorld(new T.Scene(),'parking'),c=new T.PerspectiveCamera();try{
  const s=transition(state(),'car_passenger');w.updateStory(s.stage,0,false,s);w.updateStory(s.stage,1,false,s);
  const before=w.solids.filter(o=>o.w===2.24&&o.d===1.33)[0];assert.ok(before);const z=before.z;c.position.set(3.2,1.65,-17.8);w.carDeparture.pose(13,c,false);assert.ok(before.z<z-3,'an open reach aperture cannot leave hood/boot occluders behind in the parking bay');
 }finally{disposeWorld(w.root);}
});


test('recovering the key cannot softlock modern or legacy parking saves and death retries',()=>{
 for(const [stage,notes] of [['parking_alarm',['plant_drained','car_passenger','car_search']],['parking_pump',['car_passenger','car_search','valve_a']]]){
  const s={...initialStory(),stage,notes};assert.equal(checkpoint(s).stage,stage,'retry retains the earned parking phase');
  const storage={value:null,setItem(_,v){this.value=v;},getItem(){return this.value;}};writeProgress(storage,s,1200);assert.equal(readProgress(storage).stage,stage,'new checkpoint continues after the recovered key');
  storage.value=JSON.stringify({version:2,stage:'parking_gate',notes,elapsed:1200,circuit:[]});assert.equal(readProgress(storage).stage,stage,'older saves are migrated from the obsolete entry phase');
  assert.equal(transition({...s,stage:'parking_gate'},'exit').stage,stage,'rechecking the blocked exit never demands an invisible already-owned key');
 }
});
