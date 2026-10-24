import test from 'node:test';
import assert from 'node:assert/strict';
import {pursuitPace} from '../lib/pursuit.ts';

test('V132 house pursuit receives only a small speed increase',()=>{
 for(const [area,base,old] of [['apartment',2.65,2.92],['resident',1.4,3.28]]){
  const pace=pursuitPace(area,base,.1,8);assert.ok(pace.speed>old&&pace.speed/old<1.05);assert.equal(pace.burst,false);
 }
 assert.ok(Math.abs(pursuitPace('parking',2.2,.1,8).speed-4.11)<1e-8,'ordinary parking pursuit almost matches sprint speed');
});

test('later pursuit closes on sprinting during bounded, announced surges',()=>{
 const early=pursuitPace('resident',1.4,.1,8),late=pursuitPace('parking',2.2,.1,8),surge=pursuitPace('parking',2.2,1.2,8);
 assert.ok(early.speed*.85>2);assert.ok(late.speed>early.speed);assert.ok(late.speed*.85<3.5);
 assert.ok(surge.burst&&surge.speed*.85>3.5);assert.equal(pursuitPace('parking',2.2,2.3,8).burst,false);
 assert.equal(pursuitPace('parking',2.2,1.2,1.5).burst,false,'no final unavoidable acceleration into contact');
 assert.equal(pursuitPace('parking',2.2,0,8).burst,false,'initial scream precedes the surge');
});

// V132 keeps fixed, readable chase paces; no proximity teleport or speed snap.
test('V132 pursuit has a narrower sprint margin without a contact-distance surge',()=>{
 assert.ok(pursuitPace('landing',2,.1,8).speed>=3.45);
 assert.ok(pursuitPace('apartment',2.65,.1,8).speed>=3.0);
 const p=pursuitPace('parking',4.4,.1,8),b=pursuitPace('parking',4.4,1.2,8);
 assert.ok(p.speed>=4.4&&p.speed<=4.5);assert.ok(b.speed>p.speed);
 assert.equal(pursuitPace('parking',4.4,1.2,1.5).burst,false);
 assert.equal(pursuitPace('parking',4.4,0,8).burst,false);
});
