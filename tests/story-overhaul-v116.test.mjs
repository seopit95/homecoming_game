import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {initialStory,transition,checkpoint} from '../lib/story.ts';
import {expansionTargetActive} from '../lib/expansion-story.ts';
import {readProgress,writeProgress} from '../lib/preferences.ts';
import {buildWorld,disposeWorld} from '../lib/world.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}})})};
const state=(stage,notes=[])=>({...initialStory(),stage,notes});

test('V116 the communal intercom needs no second fuse, including old checkpoints',()=>{
 const mapped=transition(state('annex_arrival'),'annex_map');assert.equal(mapped.stage,'annex_unlock');
 for(const stage of ['annex_fuse','annex_restore','annex_search','annex_unlock'])for(const notes of [[],['annex_fuse']]){
  const resumed=checkpoint(state(stage,notes));assert.equal(resumed.stage,'annex_unlock');
  assert.equal(expansionTargetActive(resumed,'annex_dial'),true);
  assert.equal(transition(resumed,'annex_line_home').stage,'annex_exit_ready');
 }
 const w=buildWorld(new T.Scene(),'annex');try{assert.ok(!w.targets.some(t=>['annex_fuse','annex_restore'].includes(t.id)));assert.equal(w.root.getObjectByName('annex-fuse-pickup'),undefined);}finally{disposeWorld(w.root);}
});

test('V116 handover key opens the real safe without digit input and earned legacy states stay usable',()=>{
 let s=transition(state('court_arrival'),'court_gate');assert.equal(transition(s,'court_confirm'),s);
 assert.equal(expansionTargetActive(s,'court_digit_0'),false);
 s=transition(s,'court_log');assert.equal(s.stage,'court_search');
 for(const code of ['0000','2617','9999'])assert.equal(transition({...s,code},'court_confirm').stage,'court_safe_open');
 for(const original of [state('court_code',['court_log']),state('court_search',['court_confirm']),state('court_code',['court_confirm']),state('court_code',['court_confirm','court_key']),state('court_code',['court_key']),state('court_safe_open',['court_key']),state('court_safe_open',['court_confirm']),state('court_unlocked',['court_confirm','court_key'])]){
  let raw;writeProgress({setItem:(_k,v)=>raw=v},original,950);const saved=readProgress({getItem:()=>raw});let next=checkpoint({...original,...saved});
  if(original.notes.includes('court_key'))assert.equal(next.stage,'court_unlocked','an owned key cannot require picking up the now hidden key again');
  else if(original.notes.includes('court_confirm'))assert.equal(next.stage,'court_safe_open','earned unlock must reopen the safe before the repeated-journal guard can intercept it');
  if(['court_search','court_code'].includes(next.stage))next=transition(next,'court_confirm');
  if(next.stage==='court_safe_open')next=transition(next,'court_key');
  assert.equal(next.stage,'court_unlocked');assert.equal(transition(next,'court_exit').stage,'court_departure');
 }
 const w=buildWorld(new T.Scene(),'courtyard');try{assert.ok(!w.targets.some(t=>t.id.startsWith('court_digit_')));assert.ok(w.targets.some(t=>t.id==='court_confirm'));assert.equal(w.root.getObjectByName('safe-number-wheel'),undefined);}finally{disposeWorld(w.root);}
});
