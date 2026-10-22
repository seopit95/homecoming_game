import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {buildRoad} from '../lib/prologue.ts';import {buildWorld,disposeWorld} from '../lib/world.ts';import{initialStory,transition}from'../lib/story.ts';
const ink=new Proxy({measureText:text=>({width:String(text).length*(parseFloat(ink.font)||20)*.55}),createLinearGradient:()=>({addColorStop(){}})},{get:(obj,key)=>key in obj?obj[key]:(()=>{})});
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({width:0,height:0,getContext:()=>ink})},configurable:true});

test('V129 reaching the stair landing unlocks the exit route without reading a wall note',()=>{
 let s={...initialStory(),stage:'stairs_descent'};s=transition(s,'stair_loop');assert.equal(s.stage,'stairs_reverse','the landing itself reveals the onward route');assert.equal(s.notes.includes('stair_note'),false);
 s=transition(s,'up');assert.equal(s.stage,'stairs_passage');
 const legacy=transition({...initialStory(),stage:'stairs_clue'},'up');assert.equal(legacy.stage,'stairs_passage','a legacy in-memory stair state cannot be locked behind the removed note');
 const w=buildWorld(new T.Scene(),'stairs');try{assert.equal(w.targets.some(t=>t.id==='stair_note'),false);assert.ok(!w.root.getObjectByName('stairs-clue-panel'));assert.ok(w.targets.find(t=>t.id==='up'));}finally{disposeWorld(w.root);}
});
test('V129 the final passenger exposes the same native three-dimensional face as the pursuer',()=>{
 const r=buildRoad(new T.Scene(),true),c=new T.PerspectiveCamera(72,16/9,.06,220);try{
  r.pose('car_voice',2.45,c,true);const passenger=r.root.getObjectByName('finale-passenger'),face=passenger.getObjectByName('ghost-continuous-face');assert.ok(face?.isMesh);assert.equal(passenger.getObjectByName('ghost-head').visible,true);assert.ok(!passenger.getObjectByName('finale-passenger-portrait'),'no photographic replacement can obscure the native model');
  const p=face.geometry.attributes.position;assert.ok(p.count>1000);const box=new T.Box3().setFromBufferAttribute(p);assert.ok(box.max.z-box.min.z>.1,'the face keeps real 3D relief');
 }finally{r.dispose();}
});
test('V129 the epilogue camera views the actual frozen wreck from outside the vehicle',()=>{
 const r=buildRoad(new T.Scene(),true),c=new T.PerspectiveCamera(72,16/9,.06,220);try{
  r.pose('ended',0,c,true);r.root.updateMatrixWorld(true);const car=r.root.getObjectByName('memory-car'),truck=r.root.getObjectByName('finale-dump-truck');
  assert.ok(Math.abs(car.worldToLocal(c.position.clone()).x)>2.5,'aftermath is an exterior view of the game geometry,not the driver seat or a photo');assert.equal(truck.visible,true);assert.equal(r.root.getObjectByName('finale-passenger').visible,false,'the final aftermath seat is empty');assert.equal(r.root.getObjectByName('finale-shattered-windshield').visible,true);
  const direction=c.getWorldDirection(new T.Vector3()),v=car.getWorldPosition(new T.Vector3()).sub(c.position).normalize();assert.ok(direction.dot(v)>.7,'the real car is in the aftermath view');const first=c.matrixWorld.toArray();r.pose('ended',0,c,true);assert.deepEqual(c.matrixWorld.toArray(),first,'manual pause/repeat of same simulation instant is stable');
 }finally{r.dispose();}
});
