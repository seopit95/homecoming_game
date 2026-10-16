import test from 'node:test';
import assert from 'node:assert/strict';
import {createArchiveReview} from '../lib/archive-review.ts';
import {initialStory,transition,objectiveFor} from '../lib/story.ts';
import {readProgress,writeProgress} from '../lib/preferences.ts';

test('a recovered original can be investigated before fetching the other rooms or reading the guide',()=>{
 let s={...initialStory(),stage:'archive_arrival'};
 s=transition(s,'archive_gate');assert.equal(s.stage,'archive_search');assert.ok(s.notes.includes('archive_gate'));
 assert.equal(transition(s,'archive_sequence_road'),s,'an unrecovered source cannot establish a finding');
 s=transition(s,'archive_sequence_gate');assert.ok(s.notes.includes('archive_sequence_gate'));assert.equal(s.stage,'archive_search');
 assert.match(objectiveFor(s),/대조.*1\/3/);
 s=transition(s,'archive_ledger');assert.equal(s.stage,'archive_search','reading the guide later cannot reset the investigation');
 let raw;writeProgress({setItem:(_k,v)=>raw=v},s,900);const saved=readProgress({getItem:()=>raw});assert.equal(saved.stage,'archive_search');assert.deepEqual(saved.circuit,['archive_sequence_gate']);
 s=transition(s,'archive_road');s=transition(s,'archive_sequence_road');s=transition(s,'archive_call');assert.equal(s.stage,'archive_edit');
 s=transition(s,'archive_sequence_call');assert.equal(s.stage,'archive_reveal');assert.deepEqual(s.circuit,['archive_sequence_gate','archive_sequence_road','archive_sequence_call']);
});

test('marking a viewed event asks for the supported fact rather than awarding an exact-time button press',()=>{
 const review=createArchiveReview();review.operate('archive_preview_call',0);
 assert.equal(review.operate('archive_record_choice_0',1).mark,undefined,'a conclusion requires an actual marked observation');
 assert.equal(review.operate('archive_record_mark',2).mark,undefined);assert.equal(review.read(2).question,false,'the event has not happened yet');
 const pending=review.operate('archive_record_mark',12);assert.equal(pending.mark,undefined);assert.equal(review.read(90).question,true);assert.equal(review.read(90).playing,false,'only the recording pauses while comparing');
 assert.ok(review.read(90).time>=9.5&&review.read(90).time<=10.5,'the displayed frame actually supports the question');
 const wrong=review.operate('archive_record_choice_1',90);assert.equal(wrong.mark,undefined);assert.equal(review.read(90).question,false);assert.equal(review.read(90).playing,true,'a mismatch replays the relevant section without resetting story progress');
 review.operate('archive_record_mark',94);const accepted=review.operate('archive_record_choice_0',94);assert.equal(accepted.mark,'archive_sequence_call');assert.equal(review.read(94).question,false);
 review.reset();assert.deepEqual(review.read(100),{source:null,time:0,playing:false,question:false});
});

test('the three conclusions reflect their own source and jogging returns to inspection',()=>{
 for(const [source,choice] of [['road',1],['call',0],['gate',1]]){
  const review=createArchiveReview();review.operate('archive_preview_'+source,0);review.operate('archive_record_mark',20);assert.equal(review.read(20).question,true);
  review.operate('archive_record_back',20);assert.equal(review.read(20).question,false,'jogging cannot leave a question attached to another frame');
  assert.equal(review.operate('archive_record_choice_'+choice,20).mark,undefined);
  review.operate('archive_preview_'+source,21);review.operate('archive_record_mark',41);assert.equal(review.operate('archive_record_choice_'+choice,41).mark,'archive_sequence_'+source);
 }
});

test('unrelated saved switches cannot count as an archive conclusion',()=>{
 let s={...initialStory(),stage:'archive_edit',notes:['archive_road','archive_call','archive_gate'],circuit:['plant_circuit_pump']};
 s=transition(s,'archive_sequence_road');s=transition(s,'archive_sequence_call');assert.equal(s.stage,'archive_edit');assert.match(objectiveFor(s),/대조 2\/3/);
 s=transition(s,'archive_sequence_gate');assert.equal(s.stage,'archive_reveal');
});
