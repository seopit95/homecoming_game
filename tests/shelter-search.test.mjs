import test from 'node:test';
import assert from 'node:assert/strict';
import {shelterSearchPlan} from '../lib/shelter-search.ts';

test('V109 searches vary their wait and route without repeating the previous pattern',()=>{
 const plans=[0,.4,.99].map(n=>shelterSearchPlan(-1,()=>n));
 assert.equal(new Set(plans.map(p=>p.kind)).size,3);
 assert.ok(plans.every(p=>p.wait>=2.5&&p.wait<=4.2&&p.steps.every(s=>s.pause>=0&&s.pause<=3.2)));
 assert.notEqual(plans[0].wait,plans[2].wait);
 for(let previous=0;previous<3;previous++)for(const n of [0,.4,.99])assert.notEqual(shelterSearchPlan(previous,()=>n).kind,previous);
 assert.ok(plans.some(p=>p.steps.some(s=>s.point==='front'&&s.pause>1.5)),'one pattern stops in front of the cabinet');
 const returning=plans.find(p=>{const names=p.steps.map(s=>s.point);return names.indexOf('away')>=0&&names.lastIndexOf('front')>names.indexOf('away');});
 assert.ok(returning,'a search can go away before coming back to the door');assert.equal(returning.steps.at(-1).point,'away');
});
