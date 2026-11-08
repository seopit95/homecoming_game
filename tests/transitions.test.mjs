import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,canStandAt,disposeWorld} from '../lib/world.ts';
import {findPath} from '../lib/navigation.ts';
const ctx={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({getContext:()=>ctx})},configurable:true});

test('the concealed chapter connections have matching architecture and walkable receiving entrances',()=>{
 for(const [from,to,outX,outZ,inZ,dy] of [['corridor','stairs',0,-20,6,0],['resident','office',0,-5.95,7.8,0],['annex','courtyard',0,-34,48,0],['courtyard','archive',14,-51,32,2.8],['archive','plant',0,-32,36,0],['plant','parking',0,-36,22,0]]){
  const a=buildWorld(new T.Scene(),from),b=buildWorld(new T.Scene(),to);
  try{
   const source=a.root.children.find(o=>o.name==='continuous-connection'&&o.position.x===outX&&o.position.z===outZ),dest=b.root.children.find(o=>o.name==='continuous-connection'&&o.position.z===inZ+6);
   assert.ok(source&&dest);assert.equal(source.children.length,dest.children.length);
   for(let i=0;i<source.children.length;i++){assert.deepEqual(source.children[i].position.toArray(),dest.children[i].position.toArray());assert.deepEqual(Array.from(source.children[i].geometry.attributes.position.array),Array.from(dest.children[i].geometry.attributes.position.array));}
   for(const x of [1.3,1.45,1.55,1.7]){
    const old={x:outX+x,z:outZ-2},next={x:x-3,z:inZ+4};
    assert.equal(a.heightAt(old.x,old.z)+dy,b.heightAt(next.x,next.z),'crossing preserves the floor height through the turn');
    assert.ok(canStandAt(next.x,next.z,b.solids,.23,b.bounds));
   }
   assert.ok(findPath({x:-1.4,z:inZ+4},{x:0,z:inZ-1},b.solids,b.bounds,.23).length,'the arrival connects to the actual room');
   b.root.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(0,1.65,inZ+.5),new T.Vector3(0,0,-1),0,1);
   assert.equal(ray.intersectObject(b.root,true).filter(hit=>hit.object.visible&&hit.object.isMesh&&!hit.object.material.transparent).length,0,'no opaque closed door remains inside the opening');
  }finally{disposeWorld(a.root);disposeWorld(b.root);}
 }
});

test('cached worlds restore door colliders, animation clocks and alarm lamp colors',()=>{
 const w=buildWorld(new T.Scene(),'annex'),p=buildWorld(new T.Scene(),'parking');
 try{
  const count=w.solids.length;w.updateStory('annex_departure',20,false);w.updateStory('annex_departure',22,false);assert.ok(canStandAt(0,-34,w.solids,.23,w.bounds),'the doorway clears while the leaf remains solid');
  w.reset();assert.equal(w.solids.length,count);assert.equal(Math.abs(w.root.getObjectByName('expansion-exit-door').rotation.y),0);
  w.updateStory('annex_departure',2,false);assert.equal(Math.abs(w.root.getObjectByName('expansion-exit-door').rotation.y),0,'retry starts a fresh opening clock');w.updateStory('annex_departure',3,false);assert.ok(canStandAt(0,-34,w.solids,.23,w.bounds),'the doorway clears while the leaf remains solid');
  const color=p.lamps[0].color.clone();p.lamps[0].color.set('#e64a29');p.reset();assert.ok(p.lamps[0].color.equals(color));
 }finally{disposeWorld(w.root);disposeWorld(p.root);}
});


test('the lift shows the correct landing after static geometry batching and resets for replay',()=>{
 const w=buildWorld(new T.Scene(),'lift');
 try{
  const upper=w.root.children.filter(o=>o.name.startsWith('lift-preview-24-')),ground=w.root.children.filter(o=>o.name.startsWith('lift-preview-1-'));
  assert.ok(upper.length>10&&ground.length>5);
  w.updateStory('service_open',0,false);assert.ok(upper.every(o=>!o.visible)&&ground.every(o=>o.visible));
  w.reset();assert.ok(upper.every(o=>o.visible)&&ground.every(o=>!o.visible));
 }finally{disposeWorld(w.root);}
});
