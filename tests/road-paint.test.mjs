import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildRoad} from '../lib/prologue.ts';

globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
test('crossing and lane paint lie on the rendered road rather than floating as raised slabs',()=>{
 for(const ending of [false,true]){
  const scene=new T.Scene(),road=buildRoad(scene,ending);road.root.updateMatrixWorld(true);const surfaces=[];road.root.traverse(o=>{if(o.isMesh)surfaces.push(o);});
  for(const [x,z] of [[-2.67,-2],[-1.64,-2],[-.61,-2],[.42,-2],[1.45,-2],[2.48,-2],[0,-150],[-4.15,20],[4.15,20]]){
   const hits=new T.Raycaster(new T.Vector3(x,.2,z),new T.Vector3(0,-1,0),0,.4).intersectObjects(surfaces,false);
   assert.ok(hits.length,'the road must remain beneath every marking');
   assert.ok(hits[0].point.y>=0&&hits[0].point.y<.003,`paint at ${x},${z} floats ${(hits[0].point.y*100).toFixed(2)}cm above asphalt`);
  }
 }
});

test('resting accident props and the supporting shoe sit at the actual road surface',()=>{
 const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera();
 road.pose('impact',2,camera,true);
 for(const name of ['memory-lost-shoe','memory-bag']){
  const bottom=new T.Box3().setFromObject(road.root.getObjectByName(name),true).min.y;
  assert.ok(bottom>=.0005&&bottom<.006,name+' rests '+bottom+'m above the asphalt');
 }
 const actor=road.root.getObjectByName('memory-pedestrian'),feet=['memory-shoe','memory-other-shoe'].map(name=>actor.getObjectByName(name));
 for(const t of [16.1,16.35,16.6,16.85]){
  road.pose('drive',t,camera,true);const floor=Math.min(...feet.map(foot=>new T.Box3().setFromObject(foot,true).min.y));
  assert.ok(floor>=.0005&&floor<.006,'the supporting sole floats '+floor+'m above the crossing');
 }
});
