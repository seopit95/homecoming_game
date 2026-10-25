import test from'node:test';import assert from'node:assert/strict';import*as T from'three';
import{buildResidentialGallery,buildResidentialLift}from'../lib/residential-gallery.ts';
const ctx={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},arc(){},fill(){}};globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
test('V133 residential floors have the same long gallery and two real lift doorways',()=>{
 let signature;for(const area of['landing','corridor','transfer']){const root=new T.Group(),w=buildResidentialGallery(root,area),floor=root.getObjectByName('residential-gallery-floor'),size=new T.Box3().setFromObject(floor).getSize(new T.Vector3()).toArray();
  if(signature)assert.deepEqual(size,signature);else signature=size;assert.ok(size[2]>40&&size[0]<3,'a long narrow real gallery');
  for(const id of['A','B'])assert.ok(root.getObjectByName('gallery-lift-'+id));assert.equal(w.targets.filter(t=>t.id==='call').length,area==='corridor'?0:1,'the available machine has an actual call button');
  assert.equal(w.targets.some(t=>t.id==='core_notice'),false,'no compulsory notice-reading detour');
 }
});
test('V133 the first stopped cab exposes a raised real landing and two bracing hands',()=>{
 const root=new T.Group(),w=buildResidentialLift(root);w.updateStory('lift_exit',10,false);root.updateMatrixWorld(true);
 const ledge=root.getObjectByName('lift-offset-ledge'),bounds=new T.Box3().setFromObject(ledge);assert.ok(Math.abs(bounds.max.y-.95)<.01);assert.ok(bounds.min.y<.01);
 assert.ok(root.getObjectByName('climb-hand-left')&&root.getObjectByName('climb-hand-right'));assert.ok(w.climb);
 const c=new T.PerspectiveCamera();c.position.set(0,1.65,-.9);for(const t of[0,.5,1,1.5,2.4]){w.climb.pose(t,c,false);assert.ok(c.position.toArray().every(Number.isFinite));if(c.position.z> -1.6)assert.ok(c.position.y<2.15,'duck through the partial-height gap');}
 assert.ok(c.position.y>2.55&&c.position.z< -2,'stand only after clearing the lip');
});
