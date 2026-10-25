import test from'node:test';import assert from'node:assert/strict';
import{initialStory,transition,areaFor,checkpoint,objectiveFor}from'../lib/story.ts';
test('V133 the stalled first lift requires a physical climb before the same-floor gallery',()=>{
 let s={...initialStory(),stage:'pry'};s=transition(s,'pry');assert.equal(s.stage,'lift_exit');s=transition(s,'leave_lift');assert.equal(s.stage,'lift_climb');assert.equal(areaFor(s),'lift');s=transition(s,'climbed');assert.equal(s.stage,'corridor_run');
});
test('V133 four-storey stairs lead to the other lift, which reaches1F beforeB1stairs',()=>{
 let s={...initialStory(),stage:'stairs_descent'};s=transition(s,'up');assert.equal(s.stage,'stairs_passage');s=transition(s,'stair_exit');assert.equal(s.stage,'transfer_gallery');assert.equal(areaFor(s),'transfer');
 for(const [action,stage]of[['call','transfer_wait'],['arrived','transfer_enter'],['enter','transfer_boarding'],['sealed','transfer_panel'],['panel','transfer_ride'],['stopped','transfer_exit'],['ground_arrived','annex_arrival']]){s=transition(s,action);assert.equal(s.stage,stage);}
 assert.equal(areaFor(s),'annex');assert.ok(!objectiveFor({...s,stage:'transfer_panel'}).includes('B1'),'the second lift serves the ground floor only');
 assert.equal(checkpoint({...s,stage:'transfer_wait'}).stage,'transfer_gallery');assert.equal(checkpoint({...s,stage:'transfer_ride'}).stage,'transfer_panel');
});
