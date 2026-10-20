import test from 'node:test';import assert from 'node:assert/strict';import * as nav from '../lib/navigation.ts';
test('V116 pursuit sweeps the whole stroke against a thin closed door and moves along body heading',()=>{
 assert.equal(typeof nav.movePursuer,'function');const p={x:0,z:-.6},door=[{x:0,z:0,w:3,d:.06}],bounds={x:5,z:5};assert.equal(nav.movePursuer(p,0,1.2,door,bounds),false);assert.deepEqual(p,{x:0,z:-.6},'a free end point cannot tunnel across the closed door');assert.equal(nav.movePursuer(p,Math.PI/2,.2,[],bounds),true);assert.ok(Math.abs(p.x-.2)<1e-9&&Math.abs(p.z+.6)<1e-9);
});
