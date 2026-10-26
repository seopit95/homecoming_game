import test from'node:test';import assert from'node:assert/strict';import*as T from'three';import{buildRoad}from'../lib/prologue.ts';import{finale,finaleTiming}from'../lib/story.ts';
const ctx={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},arc(){},fill(){}};globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
test('V135 the passenger leans a real adult face close to the driver without crossing the lens',()=>{
 const r=buildRoad(new T.Scene(),true),c=new T.PerspectiveCamera(72,16/9,.06,200);try{
  r.pose('car_voice',finale.car_voice.duration-.05,c,true);const head=r.root.getObjectByName('finale-passenger').getObjectByName('ghost-head'),face=head.getObjectByName('ghost-continuous-face'),p=face.geometry.attributes.position,ys=[],depths=[];c.updateMatrixWorld();const v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(face.matrixWorld);depths.push(-v.clone().applyMatrix4(c.matrixWorldInverse).z);ys.push(v.project(c).y);}assert.ok(Math.min(...depths)>c.near+.02,'the lens stays outside her face');assert.ok(Math.max(...ys)-Math.min(...ys)>1,'face fills more than half the screen height');
 }finally{r.dispose();}
});
test('V135 the truck hits just after the frightened driver turns forward, on real bumper contact',()=>{
 assert.ok(finaleTiming.impact-finaleTiming.forwardEnd<=.25);assert.ok(finaleTiming.impact<.8);assert.ok(finaleTiming.truckSpeed>=30);
 const r=buildRoad(new T.Scene(),true),c=new T.PerspectiveCamera(72,16/9,.06,200);try{
  r.pose('car_crash',finaleTiming.impact,c,true);r.root.updateMatrixWorld(true);const car=r.root.getObjectByName('hero-sedan'),truck=r.root.getObjectByName('finale-dump-truck'),a=new T.Box3().setFromObject(car,true),b=new T.Box3().setFromObject(truck.getObjectByName('dump-front-bumper'),true);assert.ok(Math.abs(a.min.z-b.max.z)<.15);assert.ok(Math.abs(c.rotation.y)<.04);
 }finally{r.dispose();}
});

test('V135 the aftermath shows the visibly crushed front quarter rather than hiding it behind the intact rear',()=>{
 const r=buildRoad(new T.Scene(),true),c=new T.PerspectiveCamera(72,16/9,.06,200);try{
  r.pose('ended',4,c,true);const car=r.root.getObjectByName('hero-sedan'),wreck=car.getObjectByName('hero-vehicle-wreck'),local=car.worldToLocal(c.position.clone());assert.ok(wreck.visible);assert.ok(local.z<-2&&local.x<-3,'front-quarter view of the actual impacted car');const hood=car.getObjectByName('hero-hood').getWorldPosition(new T.Vector3()).project(c);assert.ok(Math.abs(hood.x)<.9&&Math.abs(hood.y)<.9,'folded bonnet is within the epilogue frame');
 }finally{r.dispose();}
});
