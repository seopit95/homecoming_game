import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createDrivingCar} from '../lib/driving-car.ts';

Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:String(text).length*24}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})})})}});
const wreckModule=await import('../lib/vehicle-wreck.ts').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});

function build(){
 assert.equal(typeof wreckModule.createVehicleWreck,'function','V135 needs a real vehicle wreck helper');
 const car=createDrivingCar(true),snapshots=[];car.root.updateMatrixWorld(true);
 car.root.traverse(mesh=>{if(mesh.isMesh){const p=mesh.geometry.getAttribute('position'),points=[];for(let i=0;i<p.count;i++)points.push(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));snapshots.push({mesh,geometry:mesh.geometry,positions:p.array.slice(),normals:mesh.geometry.getAttribute('normal')?.array.slice(),visible:mesh.visible,points});}});
 const wreck=wreckModule.createVehicleWreck(car.root);return {car,wreck,snapshots};
}
function pointAfter(s,i,root){return root.worldToLocal(new T.Vector3().fromBufferAttribute(s.mesh.geometry.getAttribute('position'),i).applyMatrix4(s.mesh.matrixWorld));}
function close({car,snapshots,wreck}){wreck.dispose?.();const geometries=new Set(snapshots.map(s=>s.geometry)),materials=new Set();car.root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:[o.material]))materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}

test('V135 impact compresses the real nose, folds the bonnet and collapses the upper front while retaining the sedan rear',()=>{
 const fixture=build(),{car,wreck,snapshots}=fixture;try{
  car.pose(4,0,false,0,1);wreck.pose(1);car.root.updateMatrixWorld(true);
  let nose=0,noseTravel=0,fold=0,upper=0,upperDrop=0,windshield=0,glassInward=0,rear=0,support=0;
  for(const s of snapshots){if(s.mesh.isInstancedMesh)continue;const paint=s.mesh.material.vertexColors,glass=s.mesh.material.transparent&&s.mesh.material.opacity<.3;
   for(let i=0;i<s.points.length;i++){const before=s.points[i],after=pointAfter(s,i,car.root);
    if(paint&&before.z<-1.8&&before.y>.55){nose++;noseTravel+=after.z-before.z;fold=Math.max(fold,Math.abs(after.y-before.y));}
    if(paint&&before.y>1.35&&before.z<.1&&before.z>-.75){upper++;upperDrop+=before.y-after.y;}
    if(glass&&before.z<-.4&&before.z>-.95&&before.y>1.05){windshield++;glassInward+=after.z-before.z;}
    if(before.z>.85){rear++;assert.ok(after.distanceTo(before)<1e-6,'rear body, lamps and wheels preserve their actual vertices');}
    if(before.y<.005&&before.z<-.95&&Math.abs(before.x)>.65){support++;assert.ok(after.distanceTo(before)<1e-6,'front tire contact patches stay on the road');}
   }
  }
  assert.ok(nose>50&&noseTravel/nose>.48,'front sheet metal is shortened by at least 48cm on average');
  assert.ok(fold>.2,'bonnet has a visible fold beyond a small whole-car shrink');
  assert.ok(upper>50&&upperDrop/upper>.16,'front roof and A-pillar area buckle down');
  assert.ok(windshield>20&&glassInward/windshield>.12,'windshield is pushed into the cabin');
  assert.ok(rear>100,'rear preservation checks the real sedan geometry');
  assert.ok(support>20,'both front tires retain real supporting vertices');
 }finally{close(fixture);}
});

test('V135 zero and reset restore exact original geometry and never alter shared or instanced geometry',()=>{
 const fixture=build(),{wreck,snapshots}=fixture;try{
  const source=snapshots.find(s=>!s.mesh.isInstancedMesh&&s.mesh.material.vertexColors),shared=new T.Mesh(source.geometry,source.mesh.material);
  wreck.pose(1);assert.notEqual(source.mesh.geometry,shared.geometry,'damage owns a cloned geometry');
  assert.deepEqual(shared.geometry.getAttribute('position').array,source.positions,'another car sharing the source geometry remains intact');
  for(const s of snapshots.filter(s=>s.mesh.isInstancedMesh)){assert.equal(s.mesh.geometry,s.geometry);assert.deepEqual(s.mesh.geometry.getAttribute('position').array,s.positions);}
  for(const restore of[()=>wreck.pose(0),()=>{wreck.pose(.6);wreck.reset();}]){restore();
   for(const s of snapshots){assert.equal(s.mesh.geometry,s.geometry,'restores the original geometry object');assert.deepEqual(s.mesh.geometry.getAttribute('position').array,s.positions);assert.deepEqual(s.mesh.geometry.getAttribute('normal')?.array,s.normals);assert.equal(s.mesh.visible,s.visible);}
   assert.equal(wreck.root.visible,false,'no damage details are visible before impact');
  }
 }finally{close(fixture);}
});

test('V135 damage is reversible and idempotent, including repeated poses after the driving-car hood animation',()=>{
 const fixture=build(),{car,wreck,snapshots}=fixture;try{
  const pose=p=>{car.pose(8,0,false,0,p);wreck.pose(p);car.root.updateMatrixWorld(true);};
  pose(.65);const first=snapshots.map(s=>s.mesh.geometry.getAttribute('position').array.slice()),hood=car.root.getObjectByName('hero-hood'),firstHood=new T.Box3().setFromObject(hood);
  pose(.65);for(let i=0;i<snapshots.length;i++)assert.deepEqual(snapshots[i].mesh.geometry.getAttribute('position').array,first[i]);
  assert.ok(new T.Box3().setFromObject(hood).min.distanceTo(firstHood.min)<1e-7,'the animated hinge does not accumulate damage offsets');
  pose(1);pose(.65);for(let i=0;i<snapshots.length;i++)assert.deepEqual(snapshots[i].mesh.geometry.getAttribute('position').array,first[i]);
  for(const p of[-1,0,.3,1,2,Number.NaN]){pose(p);car.root.traverse(mesh=>{if(!mesh.isMesh)return;for(const name of['position','normal']){const a=mesh.geometry.getAttribute(name);if(a)for(const value of a.array)assert.ok(Number.isFinite(value),`${name} stays finite`);}});}
 }finally{close(fixture);}
});

test('V135 restrained fragments rest on the road and broken lamp detail follows the damaged nose',()=>{
 const fixture=build(),{car,wreck}=fixture;try{
  wreck.pose(1);car.root.updateMatrixWorld(true);
  const fragments=wreck.root.getObjectByName('wreck-ground-fragments');assert.ok(fragments,'the impact leaves real small mesh fragments');
  assert.ok(fragments.children.length>=3&&fragments.children.length<=12,'debris is restrained');
  for(const shard of fragments.children){const box=new T.Box3().setFromObject(shard);assert.ok(box.min.y>=.002&&box.min.y<=.025,'each fragment touches the road');assert.ok(box.max.y<.15,'fragments stay flat on the road');assert.ok(box.min.z>-2.8&&box.max.z<-.8,'fragments stay by the struck front');assert.ok(box.getSize(new T.Vector3()).length()<.38,'no oversized floating slabs');}
  const lamp=wreck.root.getObjectByName('wreck-broken-lamp');assert.ok(lamp,'a dark broken lamp socket supplies actual depth');const box=new T.Box3().setFromObject(lamp);assert.ok(box.min.y>.3&&box.max.y<.95&&box.min.z>-1.9&&box.max.z<-1,'lamp detail follows the shortened nose');
 }finally{close(fixture);}
});

test('V135 disposal restores the hero and releases only the private deformation geometries once',()=>{
 const fixture=build(),{wreck,snapshots}=fixture;try{
  assert.equal(typeof wreck.dispose,'function','scene cleanup must release the private geometry copies');
  wreck.pose(1);let copies=0,released=0,originalsReleased=0;
  for(const s of snapshots){s.geometry.addEventListener('dispose',()=>originalsReleased++);if(s.mesh.geometry!==s.geometry){copies++;s.mesh.geometry.addEventListener('dispose',()=>released++);}}
  wreck.dispose();wreck.dispose();
  assert.ok(copies>0);assert.equal(released,copies);assert.equal(originalsReleased,0,'scene cleanup still owns the restored source geometries');
  for(const s of snapshots)assert.equal(s.mesh.geometry,s.geometry);
  assert.equal(wreck.root.visible,false);
 }finally{close(fixture);}
});
