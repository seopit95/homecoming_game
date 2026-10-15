import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildRoad} from '../lib/prologue.ts';
import {opening} from '../lib/story.ts';
import {createSurveillance} from '../lib/surveillance.ts';

// Only Canvas text is stubbed; all actor, shoe, rig and road geometry is real.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};

test('the collision inherits the actual moving pedestrian surfaces without a pose pop',()=>{
 const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera(),actor=road.root.getObjectByName('memory-pedestrian');
 const before=new Map();
 road.pose('drive',opening.drive.duration,camera,true);actor.updateWorldMatrix(true,true);
 actor.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;before.set(o.uuid,Array.from({length:p.count},(_,i)=>new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld)));});
 road.pose('impact',0,camera,true);actor.updateWorldMatrix(true,true);
 let worst=0;
 actor.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)worst=Math.max(worst,before.get(o.uuid)[i].distanceTo(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld)));});
 assert.ok(worst<.02,`an intact surface jumps ${(worst*100).toFixed(1)}cm at impact`);
});

test('a foot touching the crossing stays planted as the pedestrian advances',()=>{
 const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera(),actor=road.root.getObjectByName('memory-pedestrian');
 const feet=['memory-shoe','memory-other-shoe'].map(name=>actor.getObjectByName(name)),previous=new Map();
 let contacts=0,worstSlip=0,lowest=Infinity;
 for(let i=0;i<=120;i++){
  road.pose('drive',16+i/60,camera,true);actor.updateWorldMatrix(true,true);
  for(const foot of feet){
   const p=foot.getWorldPosition(new T.Vector3()),bounds=new T.Box3().setFromObject(foot,true),last=previous.get(foot.uuid);lowest=Math.min(lowest,bounds.min.y);
   if(last&&bounds.min.y<.04&&last.y<.04&&Math.abs(bounds.min.y-last.y)*60<.03){contacts++;worstSlip=Math.max(worstSlip,Math.hypot(p.x-last.p.x,p.z-last.p.z)*60);}
   previous.set(foot.uuid,{p,y:bounds.min.y});
  }
 }
 assert.ok(contacts>80,'each step must contain a real supported stance');
 assert.ok(lowest>=.005,`shoe sole clearance is only ${(lowest*100).toFixed(2)}cm above the road`);
 assert.ok(worstSlip<.3,`a planted foot slides at ${worstSlip.toFixed(2)}m/s`);
});

test('the supporting leg extends when the body passes over its planted foot',()=>{
 const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera(),actor=road.root.getObjectByName('memory-pedestrian');let supported=0,worstFlex=0;
 for(let i=0;i<120;i++){
  road.pose('drive',16+i/60,camera,true);actor.updateWorldMatrix(true,true);
  for(const name of ['memory-shoe','memory-other-shoe']){
   const foot=actor.getObjectByName(name),ankle=foot.parent,knee=ankle.parent,hip=knee.parent;
   const a=hip.getWorldPosition(new T.Vector3()),b=knee.getWorldPosition(new T.Vector3()),c=ankle.getWorldPosition(new T.Vector3());
   if(new T.Box3().setFromObject(foot,true).min.y<.04&&Math.hypot(a.x-c.x,a.z-c.z)<.12){supported++;worstFlex=Math.max(worstFlex,Math.PI-a.sub(b).angleTo(c.sub(b)));}
  }
 }
 assert.ok(supported>10,'the walk actually passes over supported feet');assert.ok(worstFlex<.4,`the supporting knee remains bent ${Math.round(worstFlex*180/Math.PI)} degrees`);
});

test('the moving hand holds the bag handle and the dropped bag rests on the road',()=>{
 const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera(),bag=road.root.getObjectByName('memory-bag'),hand=road.root.getObjectByName('pedestrian-carry-hand');
 for(const time of [16.2,16.5,17.1,18.4,19.9]){
  road.pose('drive',time,camera,true);road.root.updateMatrixWorld(true);
  const handle=bag.localToWorld(new T.Vector3(0,.22,0)),grip=hand.localToWorld(new T.Vector3(0,-.07,0));
  assert.ok(handle.distanceTo(grip)<.05,'the handle must follow the palm, not a detached world path');
 }
 road.pose('drive',opening.drive.duration,camera,true);const carried=bag.position.clone();road.pose('impact',0,camera,true);assert.ok(bag.position.distanceTo(carried)<.02,'the bag must not jump at contact');
 for(let i=0;i<=36;i++){road.pose('impact',i/24,camera,true);assert.ok(new T.Box3().setFromObject(road.root.getObjectByName('memory-pedestrian'),true).min.y>=.005,'the initial reaction must not put the shoes below the crossing');}
 road.pose('impact',2,camera,true);const landed=new T.Box3().setFromObject(bag,true),bottom=landed.min.y;assert.ok(bottom>=.005&&bottom<.035,`the bag bottom is ${bottom}m above the road`);
 assert.ok(landed.max.y-landed.min.y<.13,'the dropped bag must lie on a broad side rather than balance on one corner');
});

test('the actual CCTV caller matches its slow root motion to the shared stance',()=>{
 const screen=createSurveillance('office'),feed=screen.userData.surveillance,live=new T.Scene();let footage;
 // Capture the real recording scene at its GPU boundary; no actor behavior is mocked.
 const r={shadowMap:{autoUpdate:true},getRenderTarget(){return null;},setRenderTarget(){},render(scene){footage=scene;}};
 const previous=new Map();let contacts=0,worstSlip=0;
 try{for(let i=0;i<39;i++){
  feed.update('office_playback',3.1+i/10,'');feed.render(r,live,true);const driver=footage.getObjectByName('cctv-driver');driver.updateWorldMatrix(true,true);
  for(const name of ['memory-shoe','memory-other-shoe']){const foot=driver.getObjectByName(name),p=foot.getWorldPosition(new T.Vector3()),y=new T.Box3().setFromObject(foot,true).min.y,last=previous.get(name);
   if(last&&y<.015&&last.y<.015&&Math.abs(y-last.y)*10<.03){contacts++;worstSlip=Math.max(worstSlip,Math.hypot(p.x-last.p.x,p.z-last.p.z)*10);}previous.set(name,{p,y});
  }
 }}finally{feed.dispose();}
 assert.ok(contacts>15,'slow footage still contains planted steps');assert.ok(worstSlip<.1,`CCTV supporting shoe slides at ${worstSlip.toFixed(2)}m/s`);
});
