import test from 'node:test';
import assert from 'node:assert/strict';
import {initialStory, transition, checkpoint} from '../lib/story.ts';
function apartmentExit(){let s=transition(initialStory(),'skip_memory');for(const a of ['blackout','car_keys','breaker','phone','shoes','radio','heard','closet','survived','closet','door'])s=transition(s,a);return s;}
test('TV blackout precedes restoring power, and the radio goes silent before the threat',()=>{
  let s=transition(initialStory(),'skip_memory');assert.equal(s.stage,'tv');assert.deepEqual(transition(s,'breaker'),s);
  for(const [action,stage] of [['blackout','keys'],['car_keys','power'],['breaker','phone'],['phone','shoes'],['shoes','radio'],['radio','listen'],['heard','hide']]){s=transition(s,action);assert.equal(s.stage,stage,action);}
});
test('leaving home continues instead of awarding the ending',()=>{const s=apartmentExit();assert.equal(s.stage,'lift_call');assert.equal(s.ending,null);});
test('the complete route requires the lift, stairs, investigation and alarm',()=>{
  let s=apartmentExit();
  for(const [action,stage] of [['call','lift_wait'],['arrived','lift_enter'],['enter','lift_button'],['panel','descent'],['stopped','pry'],['pry','lift_exit'],['leave_lift','corridor_run'],['stairs','stairs_loop'],['down','stairs_clue'],['stair_note','stairs_reverse'],['up','office_record'],['record','office_fuse'],['fuse','office_power'],['security_power','office_tape'],['monitor','office_leave'],['service_exit','parking_car'],['find_car','parking_gate'],['exit','parking_power'],['gate_power','parking_alarm'],['alarm','parking_run'],['board_car','escape_drive'],['passenger','passenger_reveal'],['crash','car_crash'],['fatal','ended']]){s=transition(s,action);assert.equal(s.stage,stage,action);}
  assert.equal(s.ending,'fatal');assert.ok(s.notes.length>=4);assert.deepEqual(transition(s,'caught'),s);
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
test('the open front door allows an early escape, while hiding still prevents leaving',()=>{
  for(const stage of ['power','phone','shoes','radio','listen','hide','escape'])assert.equal(transition({...initialStory(),stage,hasCarKeys:true},'door').stage,'lift_call');
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
  for(const [action,stage] of [['collision','impact'],['fled','flee'],['home','sleep'],['wake','tv']]){s=transition(s,action);assert.equal(s.stage,stage);}
  assert.ok(s.notes.includes('wake'));assert.equal(transition(s,'blackout').stage,'keys');
  const skipped=transition(initialStory(),'skip_memory');assert.equal(skipped.stage,'tv');assert.deepEqual(skipped.notes,s.notes);
  assert.equal(transition({...s,stage:'hide'},'skip_memory').stage,'hide');
});
