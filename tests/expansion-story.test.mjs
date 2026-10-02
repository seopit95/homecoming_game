import test from 'node:test';
import assert from 'node:assert/strict';
import {initialStory,transition,checkpoint,areaFor,objectiveFor} from '../lib/story.ts';
import {readProgress,writeProgress,PROGRESS_KEY} from '../lib/preferences.ts';
import {expansionTargetActive} from '../lib/expansion-story.ts';
const state=stage=>({...initialStory(),stage});
const act=(s,...actions)=>actions.reduce(transition,s);

test('the management exit goes through a service lift before the communal facilities',()=>{
 let s=act(state('office_leave'),'service_exit');assert.equal(s.stage,'office_departure');
 s=act(s,'service_board');assert.equal(s.stage,'service_ride');assert.equal(areaFor(s),'lift');
 s=act(s,'service_arrive','annex_enter');assert.equal(s.stage,'annex_arrival');assert.equal(areaFor(s),'annex');
});
test('communal facilities require power and all caller evidence before the correct extension opens the exit',()=>{
 let s=state('annex_arrival');assert.equal(transition(s,'annex_exit'),s);
 s=act(s,'annex_map','annex_fuse','annex_restore');assert.equal(s.stage,'annex_search');
 s=act(s,'annex_badge','annex_call');assert.equal(s.stage,'annex_search');assert.equal(transition(s,'annex_line_home'),s);
 s=act(s,'annex_notice');assert.equal(s.stage,'annex_unlock');assert.equal(transition(s,'annex_line_victim').stage,'annex_unlock');
 const repeated=transition(s,'annex_notice');assert.equal(repeated,s);
 s=act(s,'annex_line_home','annex_exit','court_enter');assert.equal(s.stage,'court_arrival');
});
test('the archive reconstruction rejects a wrong chronology without deleting collected evidence',()=>{
 let s=act(state('archive_arrival'),'archive_ledger','archive_road','archive_gate','archive_call');assert.equal(s.stage,'archive_edit');
 s=act(s,'archive_sequence_road','archive_sequence_gate');assert.deepEqual(s.circuit,[]);assert.ok(s.notes.includes('archive_call'));
 assert.equal(transition(s,'archive_exit'),s);
 s=act(s,'archive_sequence_road','archive_sequence_call','archive_sequence_gate');assert.equal(s.stage,'archive_reveal');
 s=act(s,'archive_play','archive_finish','archive_exit','plant_enter');assert.equal(s.stage,'plant_arrival');
});
test('the plant enforces isolation and a safe electrical load before drainage unlocks parking',()=>{
 let s=act(state('plant_arrival'),'plant_diagram');assert.equal(transition(s,'plant_start'),s);
 s=act(s,'plant_valve_west');assert.equal(s.stage,'plant_isolate');s=act(s,'plant_valve_east');assert.equal(s.stage,'plant_power');
 s=act(s,'plant_circuit_pump','plant_circuit_air','plant_circuit_lights');assert.equal(transition(s,'plant_start'),s);
 s=act(s,'plant_circuit_lights','plant_start');assert.equal(s.stage,'plant_drain');assert.equal(transition(s,'plant_exit'),s);
 s=act(s,'plant_drained','plant_exit','parking_enter');assert.equal(s.stage,'parking_gate');
 s=act(s,'exit','car_search');assert.equal(s.stage,'parking_alarm','completed plant drainage must not ask for the old pump puzzle again');
});
test('a mid-puzzle save and retry retain evidence and circuit input with a useful objective',()=>{
 const s=act(state('archive_arrival'),'archive_ledger','archive_road','archive_call','archive_gate','archive_sequence_road');
 let raw;const storage={setItem(k,v){assert.equal(k,PROGRESS_KEY);raw=v;},getItem(){return raw;}};
 assert.equal(writeProgress(storage,s,1200),true);const saved=readProgress(storage);assert.equal(saved.stage,'archive_edit');assert.deepEqual(saved.circuit,['archive_sequence_road']);
 const retried=checkpoint({...s,stage:'dying',resume:'archive_edit',ending:'caught'});assert.equal(retried.stage,'archive_edit');assert.deepEqual(retried.circuit,s.circuit);assert.ok(objectiveFor(retried));
});

test('courtyard safe accepts the two useful clues and preserves partial input on save and retry',()=>{
 let s=act(state('court_arrival'),'court_gate','court_log','court_phone');
 assert.equal(s.stage,'court_code');assert.equal(transition(s,'court_confirm'),s);
 assert.equal(s.notes.includes('court_evidence'),false);
 s=act(s,'court_digit_0','court_digit_0');assert.equal(s.code,'2000');
 const storage={value:null,getItem(){return this.value;},setItem(_,v){this.value=v;}};
 writeProgress(storage,s,1300);assert.equal(readProgress(storage).code,'2000');
 assert.equal(checkpoint({...s,stage:'dying',resume:'court_code'}).code,'2000');
 for(const [i,n] of [[1,6],[2,1],[3,7]])for(let k=0;k<n;k++)s=transition(s,`court_digit_${i}`);
 s=act(s,'court_confirm','court_exit','archive_enter');assert.equal(s.stage,'archive_arrival');
});

test('a known safe code works after reading its instructions and optional evidence remains collectible',()=>{
 let s=act(state('court_arrival'),'court_gate');
 assert.equal(expansionTargetActive(s,'court_digit_0'),true);
 assert.equal(expansionTargetActive(s,'court_confirm'),true);
 assert.equal(transition(s,'court_confirm'),s,'an incorrect code still keeps the safe shut');
 for(const [i,n] of [[0,2],[1,6],[2,1],[3,7]])for(let k=0;k<n;k++)s=transition(s,`court_digit_${i}`);
 s=transition(s,'court_confirm');assert.equal(s.stage,'court_unlocked');
 assert.equal(s.notes.includes('court_log'),false);assert.equal(s.notes.includes('court_phone'),false);
 s=transition(s,'court_evidence');assert.equal(s.stage,'court_unlocked');assert.ok(s.notes.includes('court_evidence'));
 assert.equal(transition(s,'court_evidence'),s,'rereading an optional record cannot reset progress');
 s=act(s,'court_exit','archive_enter');assert.equal(s.stage,'archive_arrival');
});

test('an old search checkpoint with both code clues can unlock after load and retry',()=>{
 const original={...state('court_search'),notes:['court_gate','court_log','court_phone'],code:'2617'};
 const storage={value:null,getItem(){return this.value;},setItem(_,v){this.value=v;}};
 writeProgress(storage,original,1300);const saved=readProgress(storage);
 for(const s of [{...state(saved.stage),notes:saved.notes,code:saved.code},checkpoint(transition(transition(original,'caught'),'dead'))]){
  assert.equal(expansionTargetActive(s,'court_confirm'),true);
  assert.equal(transition(s,'court_confirm').stage,'court_unlocked');
 }
});

test('interrupted archive playback resumes before the replay and may play the collected record again',()=>{
 const s={...state('archive_playback'),notes:['archive_ledger','archive_road','archive_call','archive_gate','archive_play'],circuit:['archive_sequence_road','archive_sequence_call','archive_sequence_gate']};
 const storage={value:null,getItem(){return this.value;},setItem(_,v){this.value=v;}};
 writeProgress(storage,s,1400);const saved=readProgress(storage);assert.equal(saved.stage,'archive_reveal');
 const resumed={...state(saved.stage),notes:saved.notes,circuit:saved.circuit};assert.equal(transition(resumed,'archive_play').stage,'archive_playback');
 assert.equal(transition(s,'archive_exit'),s);
});
