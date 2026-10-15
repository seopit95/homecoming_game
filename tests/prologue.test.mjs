import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildRoad} from '../lib/prologue.ts';
import {opening} from '../lib/story.ts';

test('the final drive reveals a seated passenger, collides at the barrier and freezes on pause',()=>{
  const road=buildRoad(new T.Scene(),true),camera=new T.PerspectiveCamera(72,16/9,.06,160);
  road.pose('car_escape',0,camera,false);const start=camera.position.clone();
  const passenger=road.root.getObjectByName('finale-passenger');assert.ok(passenger);assert.equal(passenger.visible,false);
  road.pose('car_escape',10,camera,false);const arrival=camera.position.clone();assert.ok(arrival.z<start.z-50);
  road.pose('car_voice',0,camera,false);assert.ok(camera.position.distanceTo(arrival)<.01);assert.equal(passenger.visible,true);
  road.pose('car_voice',4.9,camera,false);assert.ok(camera.rotation.y<-.9,'the driver turns right to the passenger');
  const face=passenger.getObjectByName('ghost-head').localToWorld(new T.Vector3(0,.13,.16));camera.updateMatrixWorld();const screen=face.project(camera);assert.ok(Math.abs(screen.x)<.7&&Math.abs(screen.y)<.85,'the passenger face is actually in frame');
  road.pose('car_crash',.55,camera,false);const car=road.root.getObjectByName('memory-car'),barrier=road.root.getObjectByName('finale-barrier');assert.ok(Math.abs(car.position.z-2.25-barrier.position.z)<.5,'the impact lands at the obstruction');
  road.pose('car_crash',3,camera,false);assert.equal(road.root.getObjectByName('finale-shattered-windshield').visible,true);const stopped=camera.position.clone();road.pose('car_crash',3,camera,false);assert.deepEqual(camera.position.toArray(),stopped.toArray());
  assert.equal(road.root.getObjectByName('memory-pedestrian').visible,false,'the ending is not another pedestrian collision');
});
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

test('the opening has room to follow the aftermath without becoming a long unskippable film',()=>{
  const seconds=Object.values(opening).reduce((sum,s)=>sum+s.duration,0);
  assert.ok(seconds>=45&&seconds<=55,`memory lasts ${seconds}s before waking`);
  assert.ok(opening.impact.duration>=11,'the player can register the victim and the ignored phone before departure');
});

test('the phone distraction is brief and the pedestrian reaches the bumper only at impact',()=>{
  const road=buildRoad(new T.Scene()),camera=new T.PerspectiveCamera(68,16/9,.06,160);
  let distracted=0;
  for(let t=0;t<opening.drive.duration;t+=.05){road.pose('drive',t,camera,true);if(camera.rotation.y<-.15)distracted+=.05;}
  assert.ok(distracted>=1&&distracted<2.5,`a glance, not ${distracted}s looking away`);
  road.pose('drive',opening.drive.duration-5,camera,true);const car=road.root.getObjectByName('memory-car'),person=road.root.getObjectByName('memory-pedestrian');assert.ok(car.position.z-person.position.z>30);
  road.pose('drive',opening.drive.duration,camera,true);assert.ok(Math.abs(car.position.z-2.92-person.position.z)<.2,'collision happens at the front bumper');
});

test('the passenger is actually visible above the cushion inside the shared sedan',()=>{
 const road=buildRoad(new T.Scene(),true),camera=new T.PerspectiveCamera(72,16/9,.06,160);
 road.pose('car_voice',3.5,camera,false);road.root.updateMatrixWorld(true);
 const passenger=road.root.getObjectByName('finale-passenger'),head=passenger.getObjectByName('ghost-head'),face=head.localToWorld(new T.Vector3(0,.13,.16)),car=road.root.getObjectByName('hero-sedan');
 const opaque=[];car.traverse(o=>{if(o.isMesh&&!o.material.transparent)opaque.push(o);});
 const distance=camera.position.distanceTo(face),ray=new T.Raycaster(camera.position.clone(),face.clone().sub(camera.position).normalize(),.02,distance-.02);
 assert.equal(ray.intersectObjects(opaque,false).length,0,'seat/back/headrest/body must not hide the passenger face');
 assert.ok(new T.Vector3(0,0,1).transformDirection(head.matrixWorld).dot(camera.position.clone().sub(face).normalize())>.3,'passenger turns her face toward the driver in the unmirrored cabin');
 const headBounds=new T.Box3().setFromObject(head,true);assert.ok(face.y>1.1,'face is above the cushion, unlike the long hanging hair');assert.ok(new T.Box3().setFromObject(passenger,true).min.y>.272,'feet stay above the actual cabin floor');assert.ok(headBounds.max.y<1.46,'head fits below the real roof');
});

// These are the rendered mesh surfaces, including transparent closed glass and
// the deformed continuous arms, wrist seams, anatomical fingers and nail tips.
function cabinTriangles(car){
 const grid=new Map(),inverse=car.matrixWorld.clone().invert(),step=.12;
 function cells(box,visit){for(let x=Math.floor(box.min.x/step);x<=Math.floor(box.max.x/step);x++)for(let y=Math.floor(box.min.y/step);y<=Math.floor(box.max.y/step);y++)for(let z=Math.floor(box.min.z/step);z<=Math.floor(box.max.z/step);z++)visit(`${x},${y},${z}`);}
 car.traverse(o=>{if(!o.isMesh)return;const matrix=inverse.clone().multiply(o.matrixWorld),p=o.geometry.getAttribute('position'),ix=o.geometry.index;
  for(let i=0;i<(ix?ix.count:p.count);i+=3){const tri=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(matrix))),box=new T.Box3().setFromPoints([tri.a,tri.b,tri.c]);
   const item={tri,box,name:o.name||o.material.name||o.material.type,glass:o.material.transparent===true,index:i/3};cells(box,key=>{const list=grid.get(key)||[];list.push(item);grid.set(key,list);});
  }
 });
 const ray=new T.Ray(),direction=new T.Vector3(),point=new T.Vector3();
 function edges(a,b){for(const [v,w] of [[a.a,a.b],[a.b,a.c],[a.c,a.a]]){direction.subVectors(w,v);const length=direction.length();if(length<1e-9)continue;ray.set(v,direction.divideScalar(length));if(ray.intersectTriangle(b.a,b.b,b.c,false,point)&&point.distanceTo(v)<=length+1e-7)return point.clone();}return null;}
 return (tri)=>{const box=new T.Box3().setFromPoints([tri.a,tri.b,tri.c]),candidates=new Set();cells(box,key=>{for(const item of grid.get(key)||[])candidates.add(item);});
  for(const item of candidates)if(box.intersectsBox(item.box)){const point=edges(tri,item.tri)||edges(item.tri,tri);if(point)return {...item,point:point.toArray()};}return null;
 };
}

test('the replaced passenger hair clears the actual closed cabin through the visible scare',()=>{
 const road=buildRoad(new T.Scene(),true),camera=new T.PerspectiveCamera(72,16/9,.06,160);
 for(const [stage,time] of [['car_voice',3.5],...Array.from({length:55},(_,i)=>['car_crash',Math.min(i*.025,1.349)])]){
  road.pose(stage,time,camera,false);road.root.updateMatrixWorld(true);
  const car=road.root.getObjectByName('hero-sedan'),hair=road.root.getObjectByName('finale-passenger').getObjectByName('ghost-authored-long-hair'),p=hair.geometry.attributes.position,ix=hair.geometry.index;
  const hit=cabinTriangles(car),matrix=car.matrixWorld.clone().invert().multiply(hair.matrixWorld);
  for(let i=0;i<ix.count;i+=3){const tri=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix.getX(i+j)).applyMatrix4(matrix))),crossing=hit(tri);
   assert.equal(crossing,null,`hair crosses ${crossing?.name} at ${stage} ${time}s, triangle ${i/3}, point ${crossing?.point}`);
  }
 }
});

test('the visible hero hood and steering wheel receive the fatal impact and reset',()=>{
 const road=buildRoad(new T.Scene(),true),camera=new T.PerspectiveCamera(),car=road.root.getObjectByName('hero-sedan');
 function hoodHeight(){road.root.updateMatrixWorld(true);const inverse=car.matrixWorld.clone().invert(),v=new T.Vector3();let top=0;car.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.getAttribute('position'),m=inverse.clone().multiply(o.matrixWorld);for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);if(v.z< -1.05&&v.z> -2.19)top=Math.max(top,v.y);}});return top;}
 road.pose('car_crash',0,camera,true);const rest=hoodHeight();road.pose('car_crash',.8,camera,true);assert.ok(hoodHeight()>rest+.1,'the actual visible front sheet metal must deform, not the hidden memory hood');
 const wheel=car.getObjectByName('hero-steering-wheel');assert.ok(wheel);assert.ok(Math.abs(wheel.rotation.z)>.8);const after=hoodHeight();road.pose('car_crash',.8,camera,true);assert.equal(hoodHeight(),after);
 road.pose('car_escape',0,camera,true);assert.ok(Math.abs(hoodHeight()-rest)<1e-6);assert.equal(wheel.rotation.z,0);
 const hood=car.getObjectByName('hero-hood');assert.ok(hood);assert.ok(hood.children.some(o=>o.isMesh),'deformed hood owns the actual shell geometry');
 const restMeshes=[];car.traverse(o=>{if(o.isMesh&&!hood.getObjectById(o.id))restMeshes.push(o);});road.root.updateMatrixWorld(true);
 const origin=car.localToWorld(new T.Vector3(0,2,-1.5)),ray=new T.Raycaster(origin,new T.Vector3(0,-1,0),0,2);
 assert.ok(ray.intersectObjects(restMeshes,false).every(hit=>car.worldToLocal(hit.point.clone()).y<.6),'no intact static hood remains beneath the movable actual sheet');
});

test('the full visible crash reach clears actual closed cabin glass and solid surfaces',()=>{
 const road=buildRoad(new T.Scene(),true),camera=new T.PerspectiveCamera(72,16/9,.06,160),car=road.root.getObjectByName('hero-sedan'),passenger=road.root.getObjectByName('finale-passenger');
 road.pose('car_crash',0,camera,false);road.root.updateMatrixWorld(true);const limbs=[];
 passenger.traverse(o=>{if(o.isMesh&&/ghost-(continuous-arm|wrist-skin|hand-|long-nail)/.test(o.name))limbs.push(o);});assert.equal(limbs.length,16,'both arm/hand/nail chains; the joined garment has its own cabin surface check');
 for(const t of [...Array.from({length:54},(_,i)=>i*.025),1.349]){road.pose('car_crash',t,camera,false);road.root.updateMatrixWorld(true);assert.equal(passenger.visible,true);
  const collision=cabinTriangles(car),inverse=car.matrixWorld.clone().invert(),head=passenger.getObjectByName('ghost-head'),face=head.localToWorld(new T.Vector3(0,.13,.16)),opaque=[];car.traverse(o=>{if(o.isMesh&&!o.material.transparent)opaque.push(o);});
  const ray=new T.Raycaster(camera.position.clone(),face.clone().sub(camera.position).normalize(),.02,camera.position.distanceTo(face)-.02);assert.equal(ray.intersectObjects(opaque,false).length,0,`face remains clear at ${t}`);
  for(const side of [-1,1]){const foot=passenger.getObjectByName(`ghost-foot-${side}`),p=foot.geometry.getAttribute('position'),m=inverse.clone().multiply(foot.matrixWorld),v=new T.Vector3();for(let i=0;i<p.count;i++)assert.ok(v.fromBufferAttribute(p,i).applyMatrix4(m).y>.272,`foot stays above floor at ${t}`);
   const hip=passenger.getObjectByName(`ghost-hip-${side}`),down=new T.Raycaster(hip.getWorldPosition(new T.Vector3()),new T.Vector3(0,-1,0).transformDirection(car.matrixWorld),0,.12);assert.ok(down.intersectObjects(opaque,false).length>0,`thigh has actual cushion support at ${t}`);
  }
  head.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.getAttribute('position'),m=inverse.clone().multiply(o.matrixWorld),v=new T.Vector3();for(let i=0;i<p.count;i++)assert.ok(v.fromBufferAttribute(p,i).applyMatrix4(m).y<1.46,`head remains below roof at ${t}`);});
  if(t>=.25){const hand=passenger.getObjectByName('ghost-hand-1');assert.ok(hand.getWorldPosition(new T.Vector3()).applyMatrix4(inverse).x<-.15,'full scare still reaches across toward driver');}
  for(const o of limbs){const p=o.geometry.getAttribute('position'),ix=o.geometry.index,m=inverse.clone().multiply(o.matrixWorld);
   for(let i=0;i<(ix?ix.count:p.count);i+=3){const tri=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(m))),hit=collision(tri);assert.ok(!hit,JSON.stringify({t,limb:o.name,triangle:i/3,cabin:hit?.name,glass:hit?.glass,point:hit?.point}));}
  }
 }
});

test('the authored nightdress clears actual closed cabin surfaces through the visible scare',()=>{
 const road=buildRoad(new T.Scene(),true),camera=new T.PerspectiveCamera(72,16/9,.06,160);
 for(const [stage,time] of [['car_voice',3.5],...Array.from({length:55},(_,i)=>['car_crash',Math.min(i*.025,1.349)])]){
  road.pose(stage,time,camera,false);road.root.updateMatrixWorld(true);
  const car=road.root.getObjectByName('hero-sedan'),gown=road.root.getObjectByName('finale-passenger').getObjectByName('ghost-wet-dress'),p=gown.geometry.attributes.position,ix=gown.geometry.index;
  const hit=cabinTriangles(car),matrix=car.matrixWorld.clone().invert().multiply(gown.matrixWorld);
  for(let i=0;i<ix.count;i+=3){const tri=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix.getX(i+j)).applyMatrix4(matrix))),crossing=hit(tri);
   assert.equal(crossing,null,`gown crosses ${crossing?.name} at ${stage} ${time}s, triangle ${i/3}, point ${crossing?.point}`);
  }
 }
});

test('the turning face and refitted hair clear actual closed cabin surfaces through the passenger scare',()=>{
 const road=buildRoad(new T.Scene(),true),camera=new T.PerspectiveCamera(72,16/9,.06,160);
 for(const [stage,time] of [['car_voice',3.5],...Array.from({length:55},(_,i)=>['car_crash',Math.min(i*.025,1.349)])]){
  road.pose(stage,time,camera,false);road.root.updateMatrixWorld(true);
  const car=road.root.getObjectByName('hero-sedan'),head=road.root.getObjectByName('finale-passenger').getObjectByName('ghost-head'),inverse=car.matrixWorld.clone().invert(),hit=cabinTriangles(car);
  head.traverse(mesh=>{
   if(!mesh.isMesh)return;for(let o=mesh;o!==head;o=o.parent)if(!o.visible)return;
   const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,matrix=inverse.clone().multiply(mesh.matrixWorld);
   for(let i=0;i<ix.count;i+=3){const tri=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix.getX(i+j)).applyMatrix4(matrix))),crossing=hit(tri);
    assert.equal(crossing,null,`${mesh.name} crosses ${crossing?.name} at ${stage} ${time}s, triangle ${i/3}`);
   }
  });
 }
});

test('the added clavicle skin fits inside the actual passenger cabin',()=>{
 const road=buildRoad(new T.Scene(),true),camera=new T.PerspectiveCamera(72,16/9,.06,160);
 // Two representative cabin poses; the upper skin follows the moving neck
 // bridge. These samples do not establish continuous-sweep clearance.
 for(const [stage,time] of [['car_voice',3.5],['car_crash',.4]]){
  road.pose(stage,time,camera,false);road.root.updateMatrixWorld(true);
  const car=road.root.getObjectByName('hero-sedan'),skin=road.root.getObjectByName('finale-passenger').getObjectByName('ghost-clavicle-skin'),p=skin.geometry.attributes.position,ix=skin.geometry.index,hit=cabinTriangles(car),m=car.matrixWorld.clone().invert().multiply(skin.matrixWorld);
  for(let i=0;i<ix.count;i+=3){const tri=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix.getX(i+j)).applyMatrix4(m)));assert.equal(hit(tri),null,`clavicle crosses cabin at ${stage}, triangle ${i/3}`);}
 }
});
