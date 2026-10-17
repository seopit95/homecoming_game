import test from 'node:test';
import assert from 'node:assert/strict';
import {createRadioLure,annexRadio} from '../lib/radio-lure.ts';

// Removing player-priority gating would let this bait erase a witnessed pursuit.
test('a radio can draw a nearby searching ghost, but cannot erase its player knowledge',()=>{
 const radio=createRadioLure(),near={x:0,z:20};
 assert.equal(radio.interest(near,0,false),null);
 assert.equal(radio.toggle(),true);
 assert.equal(radio.interest(near,1,true),null);
 assert.deepEqual(radio.interest(near,2,false),annexRadio.approach);
 assert.equal(radio.interest(near,3,false),null,'a continuous broadcast does not keep reissuing a destination');
});

// Removing finite hearing/cooldown would give remote or rapid-toggle infinite protection.
test('distant broadcasts and rapid toggles cannot repeatedly pin the ghost',()=>{
 const radio=createRadioLure();radio.toggle();
 assert.equal(radio.interest({x:-15,z:-20},0,false),null);
 assert.deepEqual(radio.interest({x:10,z:20},1,false),annexRadio.approach);
 radio.toggle();radio.toggle();
 assert.equal(radio.interest({x:10,z:20},2,false),null);
 assert.deepEqual(radio.interest({x:10,z:20},14,false),annexRadio.approach);
});

test('switching off and chapter reset both silence a radio without changing story progress',()=>{
 const radio=createRadioLure();radio.toggle();radio.toggle();
 assert.equal(radio.active,false);assert.equal(radio.interest({x:10,z:20},0,false),null);
 radio.toggle();radio.reset();assert.equal(radio.active,false);
 radio.toggle();assert.deepEqual(radio.interest({x:10,z:20},0,false),annexRadio.approach);
});
