import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {initialStory,transition,checkpoint,journalEntry} from '../lib/story.ts';
import {writeProgress,readProgress} from '../lib/preferences.ts';
import {buildWorld,disposeWorld} from '../lib/world.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
const state=(stage='parking_alarm',notes=['home_car_key','basement_route'])=>({...initialStory(),stage,notes});
const storage=()=>({value:null,setItem(_,value){this.value=value;},getItem(){return this.value;}});

test('the blocked pedestrian exit is optional evidence and cannot undo driver readiness',()=>{
 const s=state(),next=transition(s,'exit');
 assert.equal(next.stage,'parking_alarm');assert.ok(next.notes.includes('exit'));assert.equal(transition(next,'exit'),next);
 assert.equal(transition(next,'car_board').stage,'car_departure');
 assert.doesNotMatch(journalEntry('exit',next).text,/조수석|배수|펌프/);
});
test('the optional alarm permits immediate boarding without an exit checklist',()=>{
 const s=transition(state(),'alarm');assert.equal(s.stage,'parking_run');assert.ok(s.notes.includes('alarm'));
 assert.ok(!s.notes.includes('exit'));assert.equal(transition(s,'car_board').stage,'car_departure');
});
test('death and save reset the timed alarm but preserve boarding and allow rearming',()=>{
 const alarm=transition(state(),'alarm'),retry=checkpoint(transition(alarm,'caught'));
 assert.equal(retry.stage,'parking_alarm');assert.ok(!retry.notes.includes('alarm'));assert.equal(transition(retry,'alarm').stage,'parking_run');assert.equal(transition(retry,'car_board').stage,'car_departure');assert.ok(retry.notes.includes('home_car_key'));
 const store=storage();writeProgress(store,alarm,1200);const saved=readProgress(store);
 assert.equal(saved.stage,'parking_alarm');assert.ok(!saved.notes.includes('alarm'));assert.equal(transition(saved,'alarm').stage,'parking_run');assert.equal(transition(saved,'car_board').stage,'car_departure');
});
test('old partial drainage checkpoints retain evidence but do not require obsolete pumping',()=>{
 for(const notes of [[],['car_passenger'],['car_passenger','car_search','valve_a'],['pump','exit']]){
  const store=storage();store.value=JSON.stringify({version:2,stage:'parking_pump',notes,elapsed:1200,circuit:[]});
  const saved=readProgress(store);assert.equal(saved.stage,'parking_alarm');assert.equal(transition(saved,'car_board').stage,'car_departure');
  for(const note of notes.filter(n=>!['car_passenger','car_search'].includes(n)))assert.ok(saved.notes.includes(note));
  assert.ok(!saved.notes.includes('alarm'),'migration does not fabricate an alarm');
 }
});
test('the current basement route and retained old pumping both lower the same parking water',()=>{
 const w=buildWorld(new T.Scene(),'parking');try{
  for(const notes of [['home_car_key','basement_route'],['home_car_key','pump']]){
   w.reset();const s=state('parking_alarm',notes);w.updateStory(s.stage,1,false,s);assert.equal(w.root.getObjectByName('parking-flood').scale.y,.35);
  }
 }finally{disposeWorld(w.root);}
});
test('quiet boarding cannot press a phantom fire call point, while explicit alarm progress presses the real mechanism',()=>{
 const w=buildWorld(new T.Scene(),'parking');
 try{
  const button=w.root.getObjectByName('fire-call-button'),idle=button.position.z;
  w.updateStory('car_departure',1,false,transition(state(),'car_board'));assert.equal(button.position.z,idle,'quiet escape has no pressed call point');
  w.reset();w.updateStory('parking_alarm',2,false,state('parking_alarm',['home_car_key','basement_route','alarm']));assert.ok(button.position.z<idle-.008,'explicit alarm progress presses the real mechanism');
 }finally{disposeWorld(w.root);}
});
