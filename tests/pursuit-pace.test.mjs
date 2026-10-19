import test from 'node:test';
import assert from 'node:assert/strict';
import {pursuitPace} from '../lib/pursuit.ts';

test('later pursuit closes on sprinting during bounded, announced surges',()=>{
 const early=pursuitPace('resident',1.4,.1,8),late=pursuitPace('parking',2.2,.1,8),surge=pursuitPace('parking',2.2,1.2,8);
 assert.ok(early.speed*.85>2);assert.ok(late.speed>early.speed);assert.ok(late.speed*.85<3.5);
 assert.ok(surge.burst&&surge.speed*.85>3.5);assert.equal(pursuitPace('parking',2.2,2.3,8).burst,false);
 assert.equal(pursuitPace('parking',2.2,1.2,1.5).burst,false,'no final unavoidable acceleration into contact');
 assert.equal(pursuitPace('parking',2.2,0,8).burst,false,'initial scream precedes the surge');
});
