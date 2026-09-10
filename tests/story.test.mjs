import test from 'node:test';
import assert from 'node:assert/strict';
import {initialStory, transition, checkpoint} from '../lib/story.ts';
function apartmentExit(){let s=initialStory();for(const a of ['blackout','breaker','phone','shoes','radio','heard','closet','survived','closet','door'])s=transition(s,a);return s;}
test('TV blackout precedes restoring power, and the radio goes silent before the threat',()=>{
  let s=initialStory();assert.equal(s.stage,'tv');assert.deepEqual(transition(s,'breaker'),s);
  for(const [action,stage] of [['blackout','power'],['breaker','phone'],['phone','shoes'],['shoes','radio'],['radio','listen'],['heard','hide']]){s=transition(s,action);assert.equal(s.stage,stage,action);}
});
test('leaving home continues instead of awarding the ending',()=>{const s=apartmentExit();assert.equal(s.stage,'lift_call');assert.equal(s.ending,null);});
test('the complete route requires the lift, stairs, investigation and alarm',()=>{
  let s=apartmentExit();
  for(const [action,stage] of [['call','lift_wait'],['arrived','lift_enter'],['enter','lift_button'],['panel','descent'],['stopped','pry'],['pry','lift_exit'],['leave_lift','corridor_run'],['stairs','stairs_loop'],['down','stairs_clue'],['stair_note','stairs_reverse'],['up','office_record'],['record','office_fuse'],['fuse','office_power'],['security_power','office_tape'],['monitor','office_leave'],['service_exit','parking_gate'],['exit','parking_alarm'],['alarm','parking_run'],['exit','ended']]){s=transition(s,action);assert.equal(s.stage,stage,action);}
  assert.equal(s.ending,'escaped');assert.ok(s.notes.length>=4);assert.deepEqual(transition(s,'caught'),s);
});
test('wardrobe protects the player but leaving early resumes the threat',()=>{
  let s=transition(transition(checkpoint(),'radio'),'heard');s=transition(s,'closet');assert.equal(s.hidden,true);assert.deepEqual(transition(s,'caught'),s);assert.deepEqual(transition(s,'door'),s);
  const safe=transition(s,'survived');assert.equal(safe.stage,'escape');assert.deepEqual(transition(safe,'door'),safe);
  s=transition(s,'closet');s=transition(s,'caught');assert.equal(s.ending,'caught');
});
test('shortcuts cannot skip the lift failure, stair clue, key or alarm',()=>{
  for(const [stage,action] of [['phone','door'],['lift_wait','enter'],['descent','pry'],['pry','leave_lift'],['stairs_loop','up'],['stairs_clue','up'],['office_fuse','service_exit'],['parking_gate','alarm']]){const s={...initialStory(),stage};assert.deepEqual(transition(s,action),s,`${stage}: ${action}`);}
  assert.equal(transition({...initialStory(),stage:'stairs_reverse'},'down').stage,'stairs_reverse');
});
test('each chase is lethal and retries restore its section with notes',()=>{
  for(const [stage,want] of [['hide','radio'],['escape','radio'],['corridor_run','lift_exit'],['parking_run','parking_alarm']]){
    const s={...initialStory(),stage,notes:['phone','record','monitor']};const caught=transition(s,'caught');assert.equal(caught.ending,'caught',stage);
    const retry=checkpoint(caught);assert.equal(retry.stage,want,stage);assert.equal(retry.ending,null);assert.equal(retry.hidden,false);assert.deepEqual(retry.notes,s.notes);
  }
});
