import test from 'node:test';
import assert from 'node:assert/strict';
import {initialStory,transition,checkpoint} from '../lib/story.ts';

test('car keys are required before leaving the apartment and survive a retry',()=>{
  let s={...initialStory(),stage:'power'};
  assert.equal(transition(s,'door'),s);
  s=transition({...s,stage:'keys'},'car_keys');
  assert.equal(s.hasCarKeys,true);assert.equal(s.stage,'power');
  assert.equal(transition(s,'door').stage,'lift_call');
  assert.equal(checkpoint({...s,stage:'dying',resume:'parking_car'}).hasCarKeys,true);
});
test('the vehicle cannot escape before locating the car, restoring gate power and distracting the ghost',()=>{
  let s={...initialStory(),stage:'parking_car',hasCarKeys:true};
  assert.equal(transition(s,'board_car'),s);
  for(const [action,stage] of [['find_car','parking_gate'],['exit','parking_power'],['gate_power','parking_alarm'],['alarm','parking_run'],['board_car','escape_drive'],['passenger','passenger_reveal'],['crash','car_crash'],['fatal','ended']]){
    s=transition(s,action);assert.equal(s.stage,stage,action);
  }
  assert.equal(s.ending,'fatal');assert.equal(transition(s,'caught'),s);
});
