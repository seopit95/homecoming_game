import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld,canStandAt,hasLineOfSight} from '../lib/world.ts';
import {findPath} from '../lib/navigation.ts';
import {initialStory} from '../lib/story.ts';
import {apartment as home} from '../lib/apartment-layout.ts';

globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};

// Regression: static living-room dressing must not leave a second apparent
// key on the table that has no interaction and survives the actual pickup.
test('home key pickup leaves no inert duplicate keys on the table',()=>{
 const w=buildWorld(new T.Scene(),'apartment');
 try{
  w.root.updateMatrixWorld(true);
  const target=w.targets.find(t=>t.id==='home_car_key'),table=w.root.getObjectByName('home-phone-table'),center=table.getWorldPosition(new T.Vector3());
  assert.ok(target.mesh.visible);
  w.updateStory('escape',1,false,{...initialStory(),stage:'escape',notes:['home_retreat','home_car_key']});
  assert.equal(target.mesh.visible,false);
  const traces=w.root.getObjectByName('apartment-living-traces'),positions=traces.geometry.getAttribute('position');
  let duplicateVertices=0;
  for(let i=0;i<positions.count;i++){
   const p=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(traces.matrixWorld);
   if(p.x>center.x+.30&&p.x<center.x+.43&&p.z>center.z-.53&&p.z<center.z-.32&&p.y>.536&&p.y<.56)duplicateVertices++;
  }
  assert.equal(duplicateVertices,0,'decorative metal ring and two keys remain visible without an interaction');
 }finally{disposeWorld(w.root);}
});

test('the real home key has reachable standing and crouching approaches on every table side',()=>{
 const w=buildWorld(new T.Scene(),'apartment');
 try{
  w.root.updateMatrixWorld(true);
  const target=w.targets.find(t=>t.id==='home_car_key'),center=w.root.getObjectByName('home-phone-table').getWorldPosition(new T.Vector3()),start={x:home.closet[0]-.8,z:home.closet[2]};
  assert.ok(target.point.distanceTo(target.mesh.getWorldPosition(new T.Vector3()))<.03);
  for(const y of [1,1.65])for(const [x,z] of [[1.05,0],[-1.05,0],[0,-1.25],[0,1.25],[1.05,-1.25],[-1.05,-1.25],[1.05,1.25],[-1.05,1.25]]){
   const eye=new T.Vector3(center.x+x,y,center.z+z);
   assert.ok(canStandAt(eye.x,eye.z,w.solids,.23,w.bounds));
   assert.ok(findPath(start,eye,w.solids,w.bounds,.23).length);
   assert.ok(eye.distanceTo(target.point)<2.3);
   assert.ok(hasLineOfSight(eye,target.point,w.solids));
  }
 }finally{disposeWorld(w.root);}
});
