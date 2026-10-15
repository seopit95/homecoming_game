import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPedestrian} from '../lib/pedestrian.ts';
import data from '../lib/assets/pedestrian-art.json' with {type:'json'};

test('clothing covers the waist continuously between the blouse and trousers',()=>{
 const p=createPedestrian(new T.Group()),shirt=p.root.getObjectByName('pedestrian-authored-shirt'),torso=shirt.parent,clothes=[];
 p.root.traverse(o=>{if(o.isMesh&&(o.name==='pedestrian-authored-shirt'||o.name.startsWith('pedestrian-trouser-')))clothes.push(o);});
 for(const hit of [null,.2,.4,1.5]){
  p.pose(20,hit);p.root.updateMatrixWorld(true);
  for(let i=0;i<16;i++){
   const angle=i*Math.PI/8,center=torso.localToWorld(new T.Vector3(0,0,0)),origin=torso.localToWorld(new T.Vector3(Math.sin(angle)*.21,0,Math.cos(angle)*.21));
   const ray=new T.Raycaster(origin,center.clone().sub(origin).normalize(),0,.21);
   assert.ok(ray.intersectObjects(clothes,false).length,'an open waist is visible at angle '+i+' in pose '+hit);
  }
 }
});

test('the real shirt cuffs follow both wrists through the existing walking and impact poses',()=>{
 const p=createPedestrian(new T.Group()),shirt=p.root.getObjectByName('pedestrian-authored-shirt');
 const cuffs=[0,1].map(side=>{
  const anchor=new T.Vector3(...data.references[2][side]),ids=[];
  for(let i=0;i<data.shirt.position.length/3;i++){const v=new T.Vector3().fromArray(data.shirt.position,i*3);if((v.x<0?0:1)===side&&v.distanceTo(anchor)<.055)ids.push(i);}
  assert.ok(ids.length>8,'the source sleeve must contain a real cuff ring');return ids;
 });
 for(const [clock,hit] of [[18.1,null],[20,0],[20,.17],[20,.4],[20,1.5]]){
  p.pose(clock,hit);p.root.updateMatrixWorld(true);
  for(const side of [0,1]){
   const center=new T.Vector3();for(const i of cuffs[side])center.add(new T.Vector3().fromBufferAttribute(shirt.geometry.attributes.position,i).applyMatrix4(shirt.matrixWorld));center.divideScalar(cuffs[side].length);
   const wrist=p.root.getObjectByName(side===0?'pedestrian-carry-hand':'pedestrian-free-hand').getWorldPosition(new T.Vector3());
   assert.ok(center.distanceTo(wrist)<.045,'the cloth cuff separates '+(center.distanceTo(wrist)*100).toFixed(1)+'cm from its wrist at '+hit+'s');
  }
 }
});

test('the upper neck skin stays joined to the real moving head surface',()=>{
 const p=createPedestrian(new T.Group()),head=p.root.getObjectByName('pedestrian-anatomical-head'),neck=p.root.getObjectByName('pedestrian-clavicle'),position=head.geometry.attributes.position,index=head.geometry.index;
 const upper=Math.max(...data.chest.position.filter((_,i)=>i%3===1)),ids=[];
 for(let i=0;i<data.chest.position.length/3;i++)if(data.chest.position[i*3+1]>upper-.006)ids.push(i);
 assert.ok(ids.length>8,'a joined neck needs a complete attachment region');
 let worst=0;
 for(const hit of [null,.2,.4]){
  p.pose(20,hit);p.root.updateMatrixWorld(true);
  const intoHead=head.matrixWorld.clone().invert().multiply(neck.matrixWorld),point=new T.Vector3(),closest=new T.Vector3(),tri=new T.Triangle();
  for(const i of ids){point.fromBufferAttribute(neck.geometry.attributes.position,i).applyMatrix4(intoHead);let distance=Infinity;
   for(let j=0;j<index.count;j+=3){tri.setFromPointsAndIndices([0,1,2].map(k=>new T.Vector3().fromBufferAttribute(position,index.getX(j+k))),0,1,2).closestPointToPoint(point,closest);distance=Math.min(distance,point.distanceTo(closest));}
   worst=Math.max(worst,distance);
  }
 }
 assert.ok(worst<.005,'neck attachment separates '+(worst*100).toFixed(1)+'cm from the actual head');
});
