import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {initialStory,transition,checkpoint,objectiveFor,journalEntry} from '../lib/story.ts';
import {writeProgress,readProgress} from '../lib/preferences.ts';
import {buildWorld,disposeWorld} from '../lib/world.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
const state=(stage,notes=[])=>({...initialStory(),stage,notes});

test('V88 finding the car first permits a complete quiet escape without an exit or alarm checklist',()=>{
 let s=state('parking_gate',['plant_drained']);assert.equal(transition(s,'car_board'),s,'an unprepared car is not an escape');
 s=transition(s,'car_passenger');assert.equal(s.stage,'parking_key');
 s=transition(s,'car_search');assert.equal(s.stage,'parking_alarm');assert.ok(!s.notes.includes('exit')&&!s.notes.includes('alarm'));
 s=transition(s,'car_board');assert.equal(s.stage,'car_departure');assert.ok(!s.notes.includes('alarm'));
});
test('V88 the blocked pedestrian exit is optional evidence and cannot undo prepared car progress',()=>{
 const s=state('parking_alarm',['plant_drained','car_passenger','car_search']),next=transition(s,'exit');
 assert.equal(next.stage,'parking_alarm');assert.ok(next.notes.includes('exit'));assert.equal(transition(next,'exit'),next);
});
test('V88 an opened passenger-side search resumes directly without fabricating an exit inspection',()=>{
 const store={value:null,setItem(_,value){this.value=value;},getItem(){return this.value;}};
 const s=state('parking_key',['plant_drained','car_passenger']);writeProgress(store,s,1200);const saved=readProgress(store);
 assert.equal(saved.stage,'parking_key');assert.ok(!saved.notes.includes('exit'));
 assert.equal(checkpoint({...s,stage:'dying',resume:'parking_gate'}).stage,'parking_key');
});
test('V88 the old undrained checkpoint still requires its real drainage work before driving',()=>{
 let s=state('parking_gate');s=transition(s,'car_passenger');s=transition(s,'car_search');assert.equal(s.stage,'parking_pump');
 assert.equal(transition(s,'car_board'),s);s=transition(s,'valve_a');s=transition(s,'valve_b');s=transition(s,'pump');assert.equal(s.stage,'parking_alarm');assert.equal(transition(s,'car_board').stage,'car_departure');
});
test('V88 an already drained older search cannot demand the same pumping work again',()=>{
 const s=state('parking_key',['pump','car_passenger']);assert.equal(transition(s,'car_search').stage,'parking_alarm');
});
test('V88 completed older drainage guidance and water agree with the retained pump progress',()=>{
 const before=state('parking_key',['pump','car_passenger']),ready=transition(before,'car_search');
 assert.match(objectiveFor(before),/차 열쇠/);
 assert.match(journalEntry('car_search',ready).text,/배수는 이미 끝났다/);
 assert.match(journalEntry('exit',ready).text,/열쇠는 이미 챙겼다/);
 assert.match(journalEntry('pump',ready).text,/필요하면.*경보/);
 const w=buildWorld(new T.Scene(),'parking');
 try{w.updateStory(before.stage,1,false,before);assert.equal(w.root.getObjectByName('parking-flood').scale.y,.35);assert.match(w.targets.find(t=>t.id==='car_search').label,/차 열쇠/);}finally{disposeWorld(w.root);}
});
test('V88 quiet boarding cannot press a phantom fire call point, while a saved real alarm stays latched',()=>{
 const w=buildWorld(new T.Scene(),'parking');
 try{
  const button=w.root.getObjectByName('fire-call-button'),idle=button.position.z;
  w.updateStory('car_departure',1,false,state('car_departure',['plant_drained','car_search']));assert.equal(button.position.z,idle,'quiet escape has no pressed call point');
  w.reset();w.updateStory('parking_alarm',2,false,state('parking_alarm',['plant_drained','car_search','alarm']));assert.ok(button.position.z<idle-.008,'restored alarm progress retains the real pressed mechanism');
 }finally{disposeWorld(w.root);}
});
