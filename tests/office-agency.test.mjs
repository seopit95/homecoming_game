import test from 'node:test';import assert from 'node:assert/strict';
import * as S from '../lib/story.ts';import {readProgress,writeProgress} from '../lib/preferences.ts';
import * as T from 'three';import {buildWorld,disposeWorld} from '../lib/world.ts';
const enter=()=>({...S.initialStory(),stage:'office_record'});
function setup(){let s=enter();for(const a of ['service_key','fuse','office_install'])s=S.transition(s,a);return s;}
const save=s=>{let raw;const storage={setItem:(_,v)=>raw=v,getItem:()=>raw};writeProgress(storage,s,500,false);return readProgress(storage);};

test('V91 visible office keys and spare fuse can be collected before reading the log',()=>{
 for(const order of [['service_key','fuse'],['fuse','service_key']]){let s=enter();for(const a of order){s=S.transition(s,a);assert.ok(s.notes.includes(a));assert.equal(S.transition(s,a),s);}assert.equal(s.stage,'office_power');assert.equal(s.officeSupply,false);assert.equal(s.notes.includes('monitor'),false);assert.equal(S.transition(s,'service_exit'),s,'an unpowered lift still cannot depart');}
});
test('V91 a powered lift and real key allow departure without compulsory CCTV playback',()=>{
 let s=setup();s=S.transition(s,'circuit_c');s=S.transition(s,'security_power');assert.equal(s.officeSupply,true);assert.equal(s.stage,'office_leave');assert.deepEqual(s.circuit,['circuit_c']);assert.equal(s.notes.includes('monitor'),false);assert.equal(S.transition(s,'service_exit').stage,'office_departure');
 const missingKey={...s,notes:s.notes.filter(n=>n!=='service_key')};assert.equal(S.transition(missingKey,'service_exit'),missingKey);assert.equal(S.transition({...s,officeSupply:false},'service_exit').stage,'office_leave','invalid stale stage cannot bypass actual supply');
});
test('V91 supply follows selected loads and opening a branch disconnects an in-progress recording',()=>{
 let s=setup();s=S.transition(s,'circuit_b');s=S.transition(s,'security_power');assert.equal(s.officeSupply,true);assert.equal(s.stage,'office_tape');s={...s,tapeIndex:1};s=S.transition(s,'monitor');assert.equal(s.stage,'office_playback');
 s=S.transition(s,'circuit_c');assert.equal(s.officeSupply,false);assert.notEqual(s.stage,'office_playback');assert.equal(S.transition(s,'office_finish'),s,'power loss cannot finish an unheard record');assert.equal(s.notes.includes('monitor'),false);
 s=S.transition(s,'security_power');assert.equal(s.officeSupply,true);assert.equal(s.stage,'office_leave');s=S.transition(s,'monitor');assert.equal(s.stage,'office_playback');s=S.transition(s,'office_finish');assert.ok(s.notes.includes('monitor'));assert.equal(s.stage,'office_leave','already carried key does not need another pickup');
});
test('V91 explicit office supply and partial routes survive saves without inventing restored circuits',()=>{
 for(let s of [setup(),S.transition(S.transition(setup(),'circuit_c'),'security_power')]){const r=save(s);assert.equal(r.officeSupply,s.officeSupply);assert.deepEqual(r.circuit,s.circuit);assert.ok(r.notes.includes('service_key'));assert.equal(r.notes.includes('monitor'),false);assert.equal(r.stage,s.stage);}
 let s=S.transition(S.transition(setup(),'circuit_b'),'security_power');s=S.transition(s,'circuit_c');const r=save(s);assert.equal(r.officeSupply,false);assert.deepEqual(r.circuit,['circuit_b','circuit_c']);assert.equal(r.stage,'office_power');
 const old=readProgress({getItem:()=>JSON.stringify({version:2,stage:'office_record',notes:['record','monitor'],elapsed:500})});assert.equal(old.officeSupply,true);assert.equal(old.stage,'office_key');assert.deepEqual(old.circuit,['circuit_b','circuit_c']);
});

test('V91 the photographed office desk supports its CRT and the break-room mug meets its table',()=>{
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},clearRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};const w=buildWorld(new T.Scene(),'office');
 try{w.root.updateMatrixWorld(true);const desk=w.root.getObjectByName('office-duty-desk'),mug=w.root.getObjectByName('office-break-mug');assert.ok(desk&&mug);const b=new T.Box3().setFromObject(desk),crt=new T.Box3().setFromObject(w.root.getObjectByName('office-crt-monitor'));assert.ok(Math.abs(b.min.y)<.001);assert.ok(Math.abs(b.max.y-.8)<.001);assert.ok(Math.abs(crt.min.y-b.max.y)<.002);assert.ok(Math.abs(new T.Box3().setFromObject(mug).min.y-.8)<.001);let photographic=false;desk.traverse(o=>{if(o.isMesh&&o.material.userData.facilityTextures)photographic=true;});assert.ok(photographic,'the desk uses the retained source model and its mapped surfaces');
 }finally{disposeWorld(w.root);}
});
