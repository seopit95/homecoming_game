import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildResidentialStairs} from '../lib/residential-stairs.ts';
import {buildApartmentEscape} from '../lib/apartment-escape.ts';
import {disposeWorld} from '../lib/world.ts';
const context={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){},clearRect(){}};
Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>context})}});
const roots=[];
function build(builder){const root=new T.Group(),world=builder(root);root.updateMatrixWorld(true);roots.push(root);return {root,...world};}
function hit(root,from,to){const a=new T.Vector3(...from),b=new T.Vector3(...to),d=b.sub(a);return new T.Raycaster(a,d.clone().normalize(),0,d.length()).intersectObject(root,true)[0];}
after(()=>roots.forEach(disposeWorld));
// Removing the bottom slab exposes black infinity beyond the guarded last flight.
test('residential end well has a concrete bottom, including its side and landing seams',()=>{
 const {root}=build(r=>buildResidentialStairs(r,true));
 for(const x of [.3,1.1,1.97])for(const z of [.2,1.6,3.3,4.55]){
  const h=hit(root,[x,-10.8,z],[x,-12,z]);
  assert.ok(h,`open shaft bottom at ${x},${z}`);
  assert.ok(h.point.y>=-11.43,'closure meets the shaft walls');
 }
});
// B1 side wells were unsealed; the end walls also omitted the opposite landing band.
test('B1 stair shell closes side wells and upper/lower end-wall bands',()=>{
 const {root}=build(r=>buildApartmentEscape(r,'plant'));
 for(const [x,z] of [[1.35,2],[-1.35,-4],[-2.8,2],[2.8,-4],[0,2]])assert.ok(hit(root,[x,-2.7,z],[x,-3.2,z]),`open B1 base ${x},${z}`);
});
test('B1 end walls cover both elevation bands from standing and crouched viewpoints',()=>{
 const {root}=build(r=>buildApartmentEscape(r,'plant'));
 for(const eye of [1.05,1.65]){
  assert.ok(hit(root,[-1.35,-1.4+eye,0],[-1.35,-2.1,8.4]),`open lower entry wall from ${eye} eye`);
  assert.ok(hit(root,[-1.35,eye,3],[-1.35,1.8,-8.4]),`open upper exit wall from ${eye} eye`);
 }
});
// Keeping the old absolute y or skipping x>0 loses the signs at a real descent eye height.
test('B1 turning and exit plaques are mounted at each landing eye level',()=>{
 const {root}=build(r=>buildApartmentEscape(r,'plant'));
 for(const [name,ground,x] of [['plant-midlanding-direction',-1.4,-1.35],['plant-lower-direction',-2.8,1.35]]){
  const sign=root.getObjectByName(name);assert.ok(sign,`${name} missing`);
  assert.ok(sign.position.y-ground>1&&sign.position.y-ground<1.8,`${name} above readable landing height`);
  const face=sign.getObjectByName(`${name}-face`),p=face.getWorldPosition(new T.Vector3());
  for(const eye of [1.05,1.65]){
   const h=hit(root,[x,ground+eye,p.z],p.toArray());
   assert.ok(h&&h.object===face,`${name} is occluded from ${eye} eye`);
  }
 }
});
// A base below the wall foot leaves a thin but visible light leak at the seam.
test('B1 shaft bottom joins both side walls without an underfloor slit',()=>{
 const {root}=build(r=>buildApartmentEscape(r,'plant'));
 for(const side of [-1,1])for(const z of [-4,2])assert.ok(hit(root,[side*2.7,-2.85,z],[side*3.2,-2.85,z]),`open base-wall seam ${side},${z}`);
});
// Lowering the route plaque must not cover the maintenance-door warning below it.
test('midlanding route plaque fits its door and does not mask the maintenance notice',()=>{
 const {root}=build(r=>buildApartmentEscape(r,'plant'));
 const plate=root.getObjectByName('plant-midlanding-direction'),door=root.getObjectByName('plant-closed-maintenance-door');
 let notice;door.traverse(o=>{if(o.userData.text?.includes('관계자 외'))notice=o;});
 const a=new T.Box3().setFromObject(plate),b=new T.Box3().setFromObject(notice);
 assert.ok(a.max.y<b.min.y||a.min.y>b.max.y,'route and maintenance lettering overlap');
 assert.ok(a.min.z>=-1.47&&a.max.z<=-.53,'plate overhangs its supporting door');
});
