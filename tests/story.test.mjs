import test from 'node:test';
import assert from 'node:assert/strict';

test('the stair door opens before walking into the gallery, and 1704 opens before its investigation',()=>{
  let s={...initialStory(),stage:'stairs_reverse'};
  s=transition(s,'up');assert.equal(s.stage,'stairs_passage');
  s=transition(s,'stair_exit');assert.equal(s.stage,'resident_arrival');
  assert.equal(transition(s,'belongings'),s,'clues inside cannot be collected before opening the door');
  s=transition(s,'resident_open');assert.equal(s.stage,'resident_entry');
});
test('the resident investigation accepts evidence in either order and unlocks its return',()=>{
  for(const order of [['belongings','answerphone','portrait'],['belongings','portrait','answerphone'],['answerphone','belongings','portrait'],['answerphone','portrait','belongings'],['portrait','belongings','answerphone'],['portrait','answerphone','belongings']]){
    let s={...initialStory(),stage:'resident_entry'};
    assert.equal(transition(s,'resident_leave').stage,'resident_entry');
    for(const action of order)s=transition(s,action);
    assert.equal(s.stage,'resident_return');assert.equal(s.notes.filter(n=>n==='belongings').length,1);
    s=transition(s,'resident_leave');assert.equal(s.stage,'resident_departure');assert.equal(transition(s,'office_entry').stage,'office_record');
  }
});
test('boarding the car leads to the passenger reveal and fatal crash, with no walking exit shortcut',()=>{
  let s={...initialStory(),stage:'parking_run'};assert.equal(transition(s,'exit'),s);assert.equal(transition(s,'fatal'),s);
  for(const [action,stage] of [['car_board','car_escape'],['passenger','car_voice'],['wreck','car_crash'],['fatal','ended']]){
    if(s.stage!=='road_wait')assert.equal(transition(s,'stay').stage,s.stage);
    s=transition(s,action);assert.equal(s.stage,stage);
  }
  assert.equal(s.ending,'crashed');
});
test('leaving the wardrobe early creates a real escape attempt instead of forcing another hide stage',()=>{
  const s={...initialStory(),stage:'wait',hidden:true};
  const out=transition(s,'closet');assert.equal(out.stage,'escape');assert.equal(out.hidden,false);
  assert.equal(transition(out,'caught').stage,'dying');
});
import {initialStory, transition, checkpoint} from '../lib/story.ts';
function apartmentExit(){let s=transition(initialStory(),'skip_memory');for(const a of ['awake','switch','flashlight','breaker','phone','shoes','radio','heard','closet','survived','closet','door'])s=transition(s,a);return s;}
test('waking and finding a flashlight precede checking the breaker, and the radio goes silent before the threat',()=>{
  let s=transition(initialStory(),'skip_memory');assert.equal(s.stage,'wake_ring');assert.deepEqual(transition(s,'breaker'),s);
  for(const [action,stage] of [['awake','light_switch'],['switch','find_torch'],['flashlight','power'],['breaker','phone'],['phone','shoes'],['shoes','radio'],['radio','listen'],['heard','hide']]){s=transition(s,action);assert.equal(s.stage,stage,action);}
});
test('leaving home continues instead of awarding the ending',()=>{const s=apartmentExit();assert.equal(s.stage,'lift_call');assert.equal(s.ending,null);});
test('the complete route requires the lift, stairs, investigation and alarm',()=>{
  let s=apartmentExit();
  for(const [action,stage] of [['call','lift_wait'],['arrived','lift_enter'],['enter','lift_boarding'],['sealed','lift_button'],['panel','descent'],['stopped','pry'],['pry','lift_exit'],['leave_lift','corridor_run'],['stairs','stairs_loop'],['down','stairs_clue'],['stair_note','stairs_reverse'],['up','stairs_passage'],['stair_exit','resident_arrival'],['resident_open','resident_entry'],['belongings','resident_memory'],['answerphone','resident_memory'],['portrait','resident_return'],['resident_leave','resident_departure'],['office_entry','office_record'],['record','office_fuse'],['fuse','office_power'],['circuit_b','office_power'],['circuit_a','office_power'],['circuit_c','office_tape'],['tape_next','office_tape'],['monitor','office_leave'],['service_exit','office_departure'],['service_board','service_ride'],['service_arrive','service_open'],['annex_enter','annex_arrival'],['annex_map','annex_fuse'],['annex_fuse','annex_restore'],['annex_restore','annex_search'],['annex_badge','annex_search'],['annex_notice','annex_search'],['annex_call','annex_unlock'],['annex_line_home','annex_exit_ready'],['annex_exit','annex_departure'],['court_enter','court_arrival'],['court_gate','court_search'],['court_log','court_search'],['court_phone','court_search'],['court_evidence','court_code'],...Array.from('2617').flatMap((n,i)=>Array.from({length:Number(n)},()=>[`court_digit_${i}`,'court_code'])),['court_confirm','court_unlocked'],['court_exit','court_departure'],['archive_enter','archive_arrival'],['archive_ledger','archive_search'],['archive_road','archive_search'],['archive_call','archive_search'],['archive_gate','archive_edit'],['archive_sequence_road','archive_edit'],['archive_sequence_call','archive_edit'],['archive_sequence_gate','archive_reveal'],['archive_play','archive_playback'],['archive_finish','archive_escape'],['archive_exit','archive_departure'],['plant_enter','plant_arrival'],['plant_diagram','plant_isolate'],['plant_valve_west','plant_isolate'],['plant_valve_east','plant_power'],['plant_circuit_pump','plant_power'],['plant_circuit_air','plant_power'],['plant_start','plant_drain'],['plant_drained','plant_exit_ready'],['plant_exit','plant_departure'],['parking_enter','parking_gate'],['exit','parking_key'],['car_search','parking_alarm'],['alarm','parking_run'],['car_board','car_escape'],['passenger','car_voice'],['wreck','car_crash'],['fatal','ended']]){s=transition(s,action);assert.equal(s.stage,stage,action);}
  assert.equal(s.ending,'crashed');assert.ok(s.notes.length>=4);assert.deepEqual(transition(s,'caught'),s);
});
test('wardrobe protects the player but leaving early resumes the threat',()=>{
  let s=transition(transition(checkpoint(),'radio'),'heard');s=transition(s,'closet');assert.equal(s.hidden,true);assert.deepEqual(transition(s,'caught'),s);assert.deepEqual(transition(s,'door'),s);
  const safe=transition(s,'survived');assert.equal(safe.stage,'escape');assert.deepEqual(transition(safe,'door'),safe);
  s=transition(s,'closet');s=transition(s,'caught');assert.equal(s.ending,'caught');
});
test('shortcuts cannot skip the lift failure, stair clue, key or alarm',()=>{
  for(const [stage,action] of [['tv','door'],['lift_wait','enter'],['descent','pry'],['pry','leave_lift'],['stairs_loop','up'],['stairs_clue','up'],['office_fuse','service_exit'],['parking_gate','alarm']]){const s={...initialStory(),stage};assert.deepEqual(transition(s,action),s,`${stage}: ${action}`);}
  assert.equal(transition({...initialStory(),stage:'stairs_reverse'},'down').stage,'stairs_reverse');
});
test('the front door stays closed until the apparition arrives, and hiding prevents leaving',()=>{
  for(const stage of ['power','phone','shoes','radio','listen'])assert.equal(transition({...initialStory(),stage},'door').stage,stage);
  for(const stage of ['hide','escape'])assert.equal(transition({...initialStory(),stage},'door').stage,'lift_call');
  assert.equal(transition({...initialStory(),stage:'wait',hidden:true},'door').stage,'wait');
});
test('the hunt continues through the hall, stairs and archive with nearby retry points',()=>{
  for(const [stage,resume] of [['lift_wait','lift_call'],['stairs_reverse','stairs_loop'],['office_fuse','office_record']]){
    const caught=transition({...initialStory(),stage},'caught');assert.equal(caught.ending,'caught');assert.equal(checkpoint(caught).stage,resume);
  }
});
test('each chase is lethal and retries restore its section with notes',()=>{
  for(const [stage,want] of [['hide','radio'],['escape','radio'],['corridor_run','lift_exit'],['parking_run','parking_alarm']]){
    const s={...initialStory(),stage,notes:['phone','record','monitor']};const caught=transition(s,'caught');assert.equal(caught.ending,'caught',stage);
    const retry=checkpoint(caught);assert.equal(retry.stage,want,stage);assert.equal(retry.ending,null);assert.equal(retry.hidden,false);assert.deepEqual(retry.notes,s.notes);
  }
});
test('contact enters a locked death sequence before the retry screen',()=>{
  const caught=transition({...initialStory(),stage:'corridor_run',notes:['phone']},'caught');
  assert.equal(caught.stage,'dying');assert.equal(caught.resume,'lift_exit');
  for(const action of ['stairs','closet','door','caught'])assert.equal(transition(caught,action),caught);
  const dead=transition(caught,'dead');assert.equal(dead.stage,'ended');assert.equal(dead.ending,'caught');assert.deepEqual(checkpoint(dead).notes,['phone']);
});
test('the fatal hit-and-run memory precedes the haunting three nights later',()=>{
  let s=initialStory();assert.equal(s.stage,'drive');
  for(const [action,stage] of [['collision','impact'],['fled','flee'],['home','sleep'],['wake','wake_ring']]){s=transition(s,action);assert.equal(s.stage,stage);}
  assert.ok(s.notes.includes('wake'));assert.equal(transition(s,'awake').stage,'light_switch');
  const skipped=transition(initialStory(),'skip_memory');assert.equal(skipped.stage,'wake_ring');assert.deepEqual(skipped.notes,s.notes);
  assert.equal(transition({...s,stage:'hide'},'skip_memory').stage,'hide');
});

test('rereading a collected resident clue leaves the pursuit timeline unchanged',()=>{
 const s={...initialStory(),stage:'resident_return',notes:['belongings','answerphone','portrait']};
 for(const action of s.notes)assert.equal(transition(s,action),s);
});
