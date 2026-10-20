import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {buildWorld,disposeWorld,hasLineOfSight} from '../lib/world.ts';import {initialStory,transition} from '../lib/story.ts';import {readProgress} from '../lib/preferences.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
test('V116 a handover key opens the safe but a physical key pickup is required before the exit',()=>{
 let s={...initialStory(),stage:'court_search',notes:['court_log']};s=transition(s,'court_confirm');assert.equal(s.stage,'court_safe_open');assert.equal(transition(s,'court_exit'),s);s=transition(s,'court_key');assert.equal(s.stage,'court_unlocked');assert.ok(s.notes.includes('court_key'));assert.equal(transition(s,'court_exit').stage,'court_departure');
});
test('V69 an open safe save remains recoverable and legacy unlocked saves retain their key',()=>{
 const save=stage=>readProgress({getItem:()=>JSON.stringify({version:2,stage,notes:['court_confirm'],circuit:[],elapsed:950,code:'2617'})});assert.equal(save('court_safe_open')?.stage,'court_safe_open');assert.equal(save('court_unlocked')?.stage,'court_unlocked');
 const w=buildWorld(new T.Scene(),'courtyard');try{w.updateStory('court_unlocked',100,false,{...initialStory(),stage:'court_unlocked',notes:['court_confirm']});assert.equal(w.root.getObjectByName('courtyard-basement-key')?.visible,false);}finally{disposeWorld(w.root);}
});
test('V69 the safe is hollow, grounded and exposes its supported key through an actual door opening',()=>{
 const w=buildWorld(new T.Scene(),'courtyard');try{const key=w.targets.find(t=>t.id==='court_key');assert.ok(key,'real key target exists');const hinge=w.root.getObjectByName('courtyard-safe-hinge');assert.ok(hinge);w.updateStory('court_safe_open',100,false,{...initialStory(),stage:'court_safe_open',notes:['court_confirm']});w.updateStory('court_safe_open',102,false,{...initialStory(),stage:'court_safe_open',notes:['court_confirm']});w.root.updateMatrixWorld(true);assert.ok(hinge.rotation.y< -1.5);const eye=new T.Vector3(25,1.65,31.2),d=key.point.clone().sub(eye);const ray=new T.Raycaster(eye,d.clone().normalize(),0,d.length()-.025),safe=w.root.getObjectByName('courtyard-key-safe');assert.equal(ray.intersectObject(safe,true).filter(h=>!key.mesh.getObjectById(h.object.id)).length,0,'case/leaf cannot hide the exposed key');assert.ok(hasLineOfSight(eye,key.point,w.solids));
 const plate=safe.getObjectByName('safe-floor');const min=new T.Box3().setFromObject(plate).min.y;assert.ok(Math.abs(min-.81)<.001,'safe underside meets the existing actual desk top');
 }finally{disposeWorld(w.root);}
});
test('V69 a completed optional call can be retained after the exit door has opened',()=>{
 const s={...initialStory(),stage:'court_departure',notes:['court_confirm']},next=transition(s,'court_phone');assert.ok(next.notes.includes('court_phone'));assert.equal(next.stage,'court_departure');
});

test('V69 legacy owned key cannot reappear during a death or ended checkpoint',()=>{
 const w=buildWorld(new T.Scene(),'courtyard');try{for(const stage of ['dying','ended']){w.updateStory(stage,100,false,{...initialStory(),stage,resume:'court_unlocked',notes:['court_confirm']});assert.equal(w.courtSafe.key.visible,false,stage);}}finally{disposeWorld(w.root);}
});

test('V69 moving safe leaf keeps its collider aligned and stops before an occupant',()=>{
 const w=buildWorld(new T.Scene(),'courtyard'),s={...initialStory(),stage:'court_safe_open',notes:['court_confirm']};try{w.updateStory(s.stage,0,false,s);for(const t of [.1,.25,.5,.75,1.05]){w.updateStory(s.stage,t,false,s);w.root.updateMatrixWorld(true);const center=new T.Box3().setFromObject(w.courtSafe.leaf).getCenter(new T.Vector3());assert.ok(Math.hypot(center.x-w.courtSafe.block.x,center.z-w.courtSafe.block.z)<.001,'actual moving door and navigation rectangle share their center');}
 w.reset();w.updateStory(s.stage,2,false,s);const actor={x:24.55,z:30.95,r:.23};w.updateStory(s.stage,4,false,s,[actor]);assert.ok(w.courtSafe.hinge.rotation.y> -1.7,'the door must not swing through a nearby body');
 }finally{disposeWorld(w.root);}
});

test('V69 safe underside and hanging ring have actual nearby supporting surfaces',()=>{
 const w=buildWorld(new T.Scene(),'courtyard');try{w.root.updateMatrixWorld(true);const safe=w.root.getObjectByName('courtyard-key-safe'),floor=safe.getObjectByName('safe-floor'),p=floor.geometry.attributes.position,others=[];w.root.traverse(o=>{if(o.isMesh&&!safe.getObjectById(o.id)&&!w.figure.getObjectById(o.id))others.push(o);});const min=new T.Box3().setFromObject(floor).min.y;let count=0;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(floor.matrixWorld);if(v.y>min+.000001)continue;v.y+=.0001;const hit=new T.Raycaster(v,new T.Vector3(0,-1,0),0,.002).intersectObjects(others,false)[0];assert.ok(hit&&hit.distance<.001,'the existing desk supports the real safe underside');count++;}assert.ok(count>=4);
 const ring=w.root.getObjectByName('basement-key-ring'),b=new T.Box3().setFromObject(ring),v=b.getCenter(new T.Vector3());v.y=b.max.y+.0005;v.z+=.01;const mounts=[];safe.traverse(o=>{if(o.isMesh&&!w.courtSafe.key.getObjectById(o.id))mounts.push(o);});const hit=new T.Raycaster(v,new T.Vector3(0,0,-1),0,.02).intersectObjects(mounts,false)[0];assert.ok(hit&&hit.distance<.015,'the key ring meets its actual bent metal hook');
 }finally{disposeWorld(w.root);}
});
