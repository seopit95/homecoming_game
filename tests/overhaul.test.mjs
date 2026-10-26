import test from 'node:test';
import assert from 'node:assert/strict';
import {initialStory,transition,hasFlashlight} from '../lib/story.ts';
import {freshStamina,stepStamina,canSprint} from '../lib/stamina.ts';
test('wake-up requires a failed switch and physical smartphone pickup before escape',()=>{
 let s=transition(initialStory(),'skip_memory');assert.equal(s.stage,'wake_ring');assert.equal(hasFlashlight(s),false);
 for(const [a,next] of [['awake','light_switch'],['switch','find_torch'],['flashlight','phone'],['phone','power'],['breaker','shoes']]){assert.equal(transition(s,'door'),s);s=transition(s,a);assert.equal(s.stage,next);}
 assert.equal(hasFlashlight(s),true);assert.equal(transition({...s,stage:'hide'},'door').stage,'lift_call');
});
test('office requires installed backup power and the correct tape timestamp',()=>{
 let s={...initialStory(),stage:'office_fuse'};s=transition(s,'fuse');s=transition(s,'office_install');
 for(const a of ['circuit_b','circuit_c'])s=transition(s,a);assert.equal(s.stage,'office_power');
 s=transition(s,'security_power');assert.equal(s.stage,'office_tape');assert.equal(transition(s,'monitor'),s);
 s=transition(s,'tape_next');assert.equal(s.tapeIndex,1);s=transition(s,'monitor');assert.equal(s.stage,'office_playback');
 assert.equal(s.notes.includes('monitor'),false,'evidence is not awarded before it is played');assert.equal(transition(s,'service_exit'),s);assert.equal(transition(s,'tape_next'),s);
 s=transition(s,'office_finish');assert.equal(s.stage,'office_key');assert.ok(s.notes.includes('monitor'));assert.equal(transition(s,'service_exit'),s,'the physical key has not been picked up');
 s=transition(s,'service_key');assert.equal(s.stage,'office_leave');
});
test('parking escape requires key, both isolation valves and drainage before the alarm',()=>{
 let s={...initialStory(),stage:'parking_gate'};s=transition(s,'exit');assert.equal(s.stage,'parking_key');assert.equal(transition(s,'alarm'),s);
 s=transition(s,'car_passenger');s=transition(s,'car_search');assert.equal(s.stage,'parking_pump');assert.equal(transition(s,'pump'),s);
 s=transition(s,'valve_a');assert.equal(transition(s,'pump'),s);s=transition(s,'valve_b');s=transition(s,'pump');assert.equal(s.stage,'parking_alarm');
});
test('sprinting exhausts, cannot restart immediately, and recovers without trapping walking',()=>{
 let s=freshStamina();for(let i=0;i<190;i++)s=stepStamina(s,.05,true,true);assert.equal(s.value,0);assert.equal(canSprint(s),false);
 for(let i=0;i<25;i++)s=stepStamina(s,.05,false,true);assert.equal(s.value,0);
 for(let i=0;i<100;i++)s=stepStamina(s,.05,false,true);assert.ok(s.value>.25);assert.equal(canSprint(s),true);
 const rested=freshStamina();assert.deepEqual(stepStamina(rested,5,true,false),rested);
 assert.deepEqual(stepStamina(s,0,true,true),s);
});
