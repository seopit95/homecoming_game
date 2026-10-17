import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {prepareVisuals,surface} from '../lib/materials.ts';
import {buildWorld,disposeWorld,canStandAt,hasLineOfSight} from '../lib/world.ts';
import {initialStory,transition} from '../lib/story.ts';
import {readProgress,writeProgress} from '../lib/preferences.ts';
const ctx={fillRect(){},clearRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};

test('V90 common floors use independent photographic colour, normal and roughness channels at two metre scale',async()=>{
 const original=T.TextureLoader.prototype.loadAsync;T.TextureLoader.prototype.loadAsync=async url=>{const t=new T.Texture();t.name=url;return t;};
 try{await prepareVisuals();const a=surface('oldTile'),b=surface('oldTile');
  assert.equal(a.map?.name,'/textures/pbr/terrazzo-color.jpg');assert.equal(a.normalMap?.name,'/textures/pbr/terrazzo-normal.jpg');assert.equal(a.roughnessMap?.name,'/textures/pbr/terrazzo-arm.jpg');assert.equal(a.roughnessMap,a.aoMap);assert.equal(a.map.colorSpace,T.SRGBColorSpace);assert.equal(a.normalMap.colorSpace,T.NoColorSpace);assert.equal(a.map.repeat.x,.9);assert.notEqual(a.map,b.map);
  for(const [area,x,z] of [['landing',0,5],['corridor',2.65,5],['lift',0,0],['annex',0,6]]){const w=buildWorld(new T.Scene(),area);try{w.root.updateMatrixWorld(true);const hit=new T.Raycaster(new T.Vector3(x,.08,z),new T.Vector3(0,-1,0),0,.1).intersectObject(w.root,true).find(h=>h.object.isMesh&&!h.object.material.transparent);assert.equal(hit?.object.material.map?.name,'/textures/pbr/terrazzo-color.jpg',area+' actual floor surface');}finally{disposeWorld(w.root);}}
  const group=new T.Group();group.add(new T.Mesh(new T.PlaneGeometry(1,1),a));let disposed=0,otherReleased=false;b.map.addEventListener('dispose',()=>otherReleased=true);for(const map of [a.map,a.normalMap,a.roughnessMap])map.addEventListener('dispose',()=>disposed++);disposeWorld(group);assert.equal(disposed,3);assert.equal(otherReleased,false);
 }finally{T.TextureLoader.prototype.loadAsync=original;}
});

test('V90 numbered gallery doors are grounded and agree with the four homes per floor',()=>{
 for(const [area,addresses] of [['landing',['2801','2802','2804']],['corridor',['2401','2402','2403','2404']]]){const w=buildWorld(new T.Scene(),area);try{w.root.updateMatrixWorld(true);const doors=[];w.root.traverse(o=>{if(o.userData.unitNumber)doors.push(o);});assert.deepEqual(doors.map(d=>d.userData.unitNumber).sort(),addresses);
  for(const door of doors){const leaf=door.getObjectByName('gallery-door-leaf'),step=door.getObjectByName('gallery-door-threshold');assert.ok(leaf&&step&&door.getObjectByName('gallery-door-peephole')&&door.getObjectByName('gallery-door-lock'));const b=new T.Box3().setFromObject(step);assert.ok(Math.abs(b.min.y)<.001,'stone threshold meets floor');assert.ok(new T.Box3().setFromObject(leaf).min.y>.015,'leaf clears threshold and floor');}
  for(const id of [area==='landing'?'gallery_notice':'core_notice']){const t=w.targets.find(t=>t.id===id);assert.ok(t,'readable notice must be attached to the actual route');const at=t.mesh.userData.approach;assert.ok(at&&canStandAt(at.x,at.z,w.solids,.23,w.bounds));assert.ok(hasLineOfSight({x:at.x,y:1.65,z:at.z},t.point,w.solids));}
 }finally{disposeWorld(w.root);}}
});

test('V90 optional common-area records preserve chase objectives and survive chapter checkpoints',()=>{
 for(const [stage,action] of [['lift_wait','gallery_notice'],['corridor_run','core_notice']]){let s={...initialStory(),stage};const next=transition(s,action);assert.ok(next.notes.includes(action));assert.equal(next.stage,stage);assert.equal(transition(next,action),next,'rereading cannot create another state transition');assert.equal(transition({...s,stage:'wake_ring'},action).notes.includes(action),false,'cannot remotely collect another chapter record');let raw;const storage={setItem:(_,v)=>raw=v,getItem:()=>raw};writeProgress(storage,next,210,true);assert.ok(readProgress(storage).notes.includes(action),'the record persists through checkpoint normalization');}
});

test('V90 photographic floor joints continue across both visible lift thresholds',()=>{
 const lift=buildWorld(new T.Scene(),'lift');
 const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
 try{for(const [stage,area,x,z,receivingZ] of [['lift_exit','corridor',2.65,-5.35,16],['service_open','annex',0,-5.35,30]]){
  const next=buildWorld(new T.Scene(),area);try{lift.updateStory(stage,0,false);lift.root.updateMatrixWorld(true);next.root.updateMatrixWorld(true);
   const hits=(w,x,z)=>new T.Raycaster(new T.Vector3(x,.08,z),new T.Vector3(0,-1,0),0,.1).intersectObject(w.root,true).filter(h=>h.object.isMesh&&!h.object.material.transparent&&visible(h.object));
   const a=hits(lift,x,z),b=hits(next,x,receivingZ)[0];assert.ok(a.length&&b?.uv);for(const hit of a)assert.ok(hit.uv.distanceTo(b.uv)<1e-5,area+' cannot retain a mismatched coplanar side floor under its aligned slab');
  }finally{disposeWorld(next.root);}}
 }finally{disposeWorld(lift.root);}
});
