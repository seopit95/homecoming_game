import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {buildRoad} from '../lib/prologue.ts';
import {opening} from '../lib/story.ts';

globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
function visibleMeshes(root,opaqueOnly=true){
 const meshes=[];root.traverse(o=>{if(!o.isMesh||opaqueOnly&&o.material.transparent)return;for(let p=o;p;p=p.parent)if(!p.visible)return;meshes.push(o);});return meshes;
}

test('the driver actually sees the victim through the cabin during the aftermath',()=>{
 const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera(72,16/9,.06,160),car=road.root.getObjectByName('memory-car'),head=road.root.getObjectByName('pedestrian-anatomical-head');
 for(const t of [10.5,12,14.5]){
  road.pose('impact',t,camera,true);road.root.updateMatrixWorld(true);camera.updateMatrixWorld();
  const face=head.localToWorld(new T.Vector3(0,.09,.11)),screen=face.clone().project(camera);
  assert.ok(Math.abs(screen.x)<.7&&Math.abs(screen.y)<.7,'the victim must be readable in frame at '+t+'s; projected '+screen.toArray());
  const ray=new T.Raycaster(camera.position.clone(),face.clone().sub(camera.position).normalize(),.02,camera.position.distanceTo(face)-.015);
  assert.equal(ray.intersectObjects(visibleMeshes(car),false).length,0,'the dashboard or cabin hides the victim at '+t+'s');
 }
});

test('the driver exits through the open door and returns without crossing cabin surfaces',()=>{
 const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera(72,16/9,.06,160),car=road.root.getObjectByName('memory-car');
 road.pose('drive',opening.drive.duration,camera,true);const before=camera.position.clone(),rotation=camera.quaternion.clone();road.pose('impact',0,camera,true);
 assert.ok(camera.position.distanceTo(before)<.01&&camera.quaternion.angleTo(rotation)<.01,'contact must retain the normal driver view');
 let last=null;
 for(let i=0;i<=opening.impact.duration*60;i++){
  road.pose('impact',i/60,camera,true);road.root.updateMatrixWorld(true);
  if(last){const distance=camera.position.distanceTo(last);assert.ok(distance<.15,'no jump while checking the victim');if(distance>.001){const ray=new T.Raycaster(last,camera.position.clone().sub(last).normalize(),.0001,distance);assert.equal(ray.intersectObjects(visibleMeshes(car,false),false).length,0,'the camera crosses an actual cabin surface, including closed glass, at '+i/60+'s');}}last=camera.position.clone();
 }
 const stopped=camera.position.clone(),look=camera.quaternion.clone();road.pose('flee',0,camera,true);
 assert.ok(camera.position.distanceTo(stopped)<.01&&camera.quaternion.angleTo(look)<.01,'flee must begin from the returned seated view');
 road.pose('impact',12,camera,true);road.root.updateMatrixWorld(true);const standing=car.worldToLocal(camera.position.clone());assert.ok(standing.x>1.1&&standing.z<-2.4&&standing.y>1.5,'inspect the victim from outside the passenger front corner');
});

test('the victim hands settle on the road instead of holding a suspended impact pose',()=>{
 const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera();
 for(const t of [3.5,8,14]){
  road.pose('impact',t,camera,true);road.root.updateMatrixWorld(true);const actor=road.root.getObjectByName('memory-pedestrian');
  for(const name of ['pedestrian-carry-hand','pedestrian-free-hand']){const b=new T.Box3().setFromObject(actor.getObjectByName(name),true);assert.ok(b.min.y>=.001&&b.min.y<.025,name+' remains '+(b.min.y*100).toFixed(1)+'cm above road');}
 }
});

test('the new arm settling stays continuous and clear of the stopped car',()=>{
 const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera(),actor=road.root.getObjectByName('memory-pedestrian');let last=null;
 for(let i=0;i<=96;i++){
  road.pose('impact',1.5+i/60,camera,true);road.root.updateMatrixWorld(true);const head=actor.getObjectByName('pedestrian-head').getWorldPosition(new T.Vector3()),edge=new T.Box3().setFromObject(road.root.getObjectByName('memory-car'),true).max.x;
  if(last)assert.ok(head.distanceTo(last)<.025,'settling must not pop the grounded body');last=head;
  for(const name of ['pedestrian-carry-hand','pedestrian-free-hand'])assert.ok(new T.Box3().setFromObject(actor.getObjectByName(name),true).min.x>edge+.05,'the resting hand must stay outside the actual vehicle');
 }
});

test('the resting upper arm and forearm stay outside the actual shirt torso',()=>{
 const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera(),actor=road.root.getObjectByName('memory-pedestrian'),wrist=actor.getObjectByName('pedestrian-free-hand'),elbow=wrist.parent,arm=elbow.parent,torso=arm.parent;
 const asset=JSON.parse(readFileSync(new URL('../lib/assets/pedestrian-art.json',import.meta.url),'utf8')).shirt,index=[];
 for(let i=0;i<asset.index.length;i+=3){const triangle=asset.index.slice(i,i+3);if(triangle.every(v=>asset.armWeight[v]<.02))index.push(...triangle);}
 const body=new T.Mesh(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(asset.position,3)).setIndex(index),new T.MeshBasicMaterial({side:T.DoubleSide}));body.updateMatrixWorld();
 for(const t of [3.5,8,14]){
  road.pose('impact',t,camera,true);road.root.updateMatrixWorld(true);
  const points=[arm,elbow,wrist].map(b=>torso.worldToLocal(b.getWorldPosition(new T.Vector3())));
  for(let segment=0;segment<2;segment++)for(const u of [.35,.55,.75,1]){
   const p=points[segment].clone().lerp(points[segment+1],u),ray=new T.Raycaster(new T.Vector3(p.x,p.y,1),new T.Vector3(0,0,-1)),front=ray.intersectObject(body)[0];
   if(front)assert.ok(p.z>front.point.z+.02,'resting arm enters the torso at '+t+'s, segment '+segment+', sample '+u+': '+p.toArray());
  }
 }
});
