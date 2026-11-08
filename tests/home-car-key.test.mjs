import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {initialStory,transition,checkpoint,objectiveFor,journalEntry} from '../lib/story.ts';
import {readProgress,writeProgress} from '../lib/preferences.ts';
import {buildWorld,disposeWorld,canStandAt,hasLineOfSight} from '../lib/world.ts';
import {apartment as home} from '../lib/apartment-layout.ts';
import {translate} from '../lib/i18n.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
const state=(stage,notes=[])=>({...initialStory(),stage,notes});
test('home key is obtained after leaving hiding and remains unavailable inside the wardrobe',()=>{
 for(const stage of ['radio','hide','wait']){const s=state(stage);assert.equal(transition(s,'home_car_key'),s,stage);}
 let s={...state('wait'),hidden:true};s=transition(s,'survived');assert.ok(s.notes.includes('home_retreat'));
 assert.equal(transition(s,'home_car_key'),s,'cannot pick up while inside wardrobe');
 s=transition(s,'closet');assert.match(objectiveFor(s),/거실.*탁자.*차키/);
 const before=s;s=transition(s,'home_car_key');assert.ok(s.notes.includes('home_car_key'));assert.notEqual(s,before);assert.equal(transition(s,'home_car_key'),s);
 assert.match(objectiveFor(s),/현관/);assert.equal(transition(s,'door').stage,'lift_call');
});
test('home front door cannot bypass the living-room key',()=>{
 for(const stage of ['hide','escape']){const s=state(stage,['home_retreat']);assert.equal(transition(s,'door'),s);}
});
test('a retry and saved continuation preserve the completed wardrobe escape and key',()=>{
 for(const notes of [['home_retreat'],['home_retreat','home_car_key']]){
  const s=state('escape',notes),retry=checkpoint(transition(s,'caught'));assert.equal(retry.stage,'escape');assert.deepEqual(retry.notes,notes);
  let raw;writeProgress({setItem:(_,v)=>raw=v},s,100);const saved=readProgress({getItem:()=>raw});assert.equal(saved.stage,'escape');assert.deepEqual(saved.notes,notes);
 }
});
test('the current basement route goes directly to the driver door with the home key',()=>{
 let s=state('plant_exit_ready',['home_retreat','home_car_key']);s=transition(s,'plant_exit');s=transition(s,'parking_enter');
 assert.equal(s.stage,'parking_alarm');assert.ok(s.notes.includes('basement_route'));
 assert.doesNotMatch(objectiveFor(s),/조수석|배수|밸브|펌프|물/);assert.match(objectiveFor(s),/운전석/);
 assert.equal(transition(s,'car_passenger'),s);assert.equal(transition(s,'car_search'),s);
 assert.equal(transition(s,'car_board').stage,'car_departure');assert.ok(!s.notes.includes('alarm'));
 assert.doesNotMatch(journalEntry('exit',s).text,/열쇠.*찾|배수|펌프/);
});
test('old parking and exterior saves migrate without an impossible passenger search',()=>{
 for(const stage of ['lift_call','stairs_loop','annex_arrival','parking_gate','parking_key','parking_pump','parking_alarm']){
  const saved=readProgress({getItem:()=>JSON.stringify({version:2,stage,notes:['car_passenger'],elapsed:500,circuit:[]})});assert.ok(saved,stage);assert.ok(saved.notes.includes('home_car_key'),stage);
  if(stage.startsWith('parking')){assert.equal(saved.stage,'parking_alarm');assert.ok(saved.notes.includes('basement_route'));assert.ok(!saved.notes.includes('car_passenger'));}
 }
 const fresh=readProgress({getItem:()=>JSON.stringify({version:2,stage:'radio',notes:[],elapsed:50})});assert.ok(!fresh.notes.includes('home_car_key'));
});
test('a visible car key rests on the living room table and has a clear standing reach',()=>{
 const w=buildWorld(new T.Scene());try{
  const t=w.targets.find(t=>t.id==='home_car_key');assert.ok(t);w.root.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(t.mesh),table=w.root.getObjectByName('home-phone-table'),center=table.getWorldPosition(new T.Vector3());
  assert.ok(Math.abs(box.min.y-.535)<.012,'key must touch the tabletop');assert.ok(Math.abs(box.getCenter(new T.Vector3()).x-center.x)<.6);
  const eye={x:center.x+1.05,y:1.65,z:center.z};assert.ok(canStandAt(eye.x,eye.z,w.solids,.23,w.bounds));assert.ok(hasLineOfSight(eye,t.point,w.solids));
  w.updateStory('escape',1,false,state('escape',['home_retreat','home_car_key']));assert.equal(t.mesh.visible,false);w.reset();assert.equal(t.mesh.visible,true);
 }finally{disposeWorld(w.root);}
});
test('parking exposes only driver-side boarding, not a duplicate car key',()=>{
 const w=buildWorld(new T.Scene(),'parking');try{assert.ok(w.targets.some(t=>t.id==='car_board'));assert.ok(!w.targets.some(t=>['car_search','car_passenger'].includes(t.id)));w.updateStory('parking_alarm',1,false,state('parking_alarm',['home_car_key','basement_route']));assert.equal(w.carDeparture.key.visible,false);}finally{disposeWorld(w.root);}
});
test('requested departure line and current home mission localize in all supported languages',()=>{
 for(const language of ['en','ja','zh-CN']){for(const text of ['차키가 거실 탁자에 있는데...',objectiveFor(state('escape',['home_retreat']))])assert.doesNotMatch(translate(text,language),/[가-힣]/);}
});

test('re-hiding after the completed search saves the escape checkpoint instead of replaying the radio',()=>{
 for(const notes of [['home_retreat'],['home_retreat','home_car_key']]){
  const hidden=transition(state('escape',notes),'closet');assert.equal(hidden.hidden,true);assert.equal(hidden.stage,'wait');assert.equal(checkpoint(hidden).stage,'escape');
  let raw;writeProgress({setItem:(_,v)=>raw=v},hidden,250);const saved=readProgress({getItem:()=>raw});assert.equal(saved.stage,'escape');assert.deepEqual(saved.notes,notes);
 }
});

// A player can leave as soon as the apparition visibly starts walking away.
// The hidden search-complete flag must not make a visible reachable key inert.
test('keyfix leaving the wardrobe before the retreat cue does not disable the visible key',()=>{
 let s=transition(state('hide'),'closet');s=transition(s,'closet');
 assert.equal(s.stage,'escape');assert.equal(s.hidden,false);assert.ok(!s.notes.includes('home_retreat'));assert.doesNotMatch(objectiveFor(s),/다시 숨어|돌아가 숨/);
 s=transition(s,'home_car_key');assert.ok(s.notes.includes('home_car_key'));assert.ok(!s.notes.includes('home_retreat'),'pickup does not claim the unseen search finished');
 assert.match(objectiveFor(s),/현관/);assert.equal(transition(s,'door').stage,'lift_call');
 assert.equal(checkpoint(transition(s,'caught')).stage,'escape');
 const hidden=transition(s,'closet');assert.equal(checkpoint(hidden).stage,'escape');
 let raw;writeProgress({setItem:(_,v)=>raw=v},hidden,250);const saved=readProgress({getItem:()=>raw});assert.equal(saved.stage,'escape');assert.ok(saved.notes.includes('home_car_key'));
});
