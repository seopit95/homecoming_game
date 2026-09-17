import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld} from '../lib/world.ts';
import {apartmentScale as S} from '../lib/apartment-layout.ts';
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({width:0,height:0,getContext:()=>context})},configurable:true});
function world(area='apartment'){const w=buildWorld(new T.Scene(),area);w.figure.visible=false;w.root.updateMatrixWorld(true);return w;}
function gap(w,origin,direction,exclude){
  const meshes=[];w.root.traverse(o=>{if(o.isMesh&&o!==exclude&&!o.parent?.name?.includes('ghost'))meshes.push(o);});
  const hits=new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction).normalize(),0,5).intersectObjects(meshes,false);
  return hits[0]?.distance??Infinity;
}
function closest(w,x,y,z){return w.root.children.filter(o=>o.isMesh).sort((a,b)=>a.position.distanceToSquared(new T.Vector3(x,y,z))-b.position.distanceToSquared(new T.Vector3(x,y,z)))[0];}
for(const [area,x,z,y,dx,dz] of [['apartment',-5.3*S,-5.6*S,.68,.88,.26],['resident',3,-4.65,.69,.82,.22]])test(`${area}: the writing desk has floor-to-top supports`,()=>{
  const w=world(area);
  for(const sideX of [-1,1])for(const sideZ of [-1,1]){
    const px=x+sideX*dx,pz=z+sideZ*dz;
    const supports=w.root.children.filter(o=>o.isMesh).map(o=>new T.Box3().setFromObject(o));
    assert.ok(supports.some(b=>b.min.x<=px&&b.max.x>=px&&b.min.z<=pz&&b.max.z>=pz&&b.min.y<=.01&&b.max.y>=y-.01&&b.max.y<y+.05),`a continuous desk support meets floor and top at ${px},${pz}`);
  }
});
test('the CCTV monitor rests on a stand connected to the desk',()=>{
  const w=world('office'),m=w.targets.find(t=>t.id==='monitor').mesh,b=new T.Box3().setFromObject(m),c=b.getCenter(new T.Vector3());
  assert.ok(gap(w,[c.x,b.min.y+.001,c.z],[0,-1,0],m)<.012,'monitor base must touch a support, not hover above the desk');
});
test('the bedroom switch back is mounted flush to the wall',()=>{
  const w=world(),m=w.targets.find(t=>t.id==='switch').mesh,b=new T.Box3().setFromObject(m),c=b.getCenter(new T.Vector3());
  assert.ok(gap(w,[b.min.x+.001,c.y,c.z],[-1,0,0],m)<.012,'mounting gap must stay below a centimetre');
});
test('the pump control enclosure has a physical neck above the pump',()=>{
  const w=world('parking'),m=closest(w,-10.5,1.16,-17),b=new T.Box3().setFromObject(m),c=b.getCenter(new T.Vector3());
  assert.ok(gap(w,[c.x,b.min.y+.001,c.z],[0,-1,0],m)<.012,'the control enclosure cannot float');
});
