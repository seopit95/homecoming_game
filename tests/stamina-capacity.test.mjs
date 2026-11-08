import test from 'node:test';
import assert from 'node:assert/strict';
import {freshStamina,stepStamina,canSprint,stepBreathing} from '../lib/stamina.ts';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-12,`${actual} != ${expected}`);
for(const dt of [1/30,1/60,1/144,.025,.05])test(`sprint lasts 15 seconds with ${dt}-second frames`,()=>{
 let s=freshStamina(),elapsed=0;
 while(elapsed+dt<14.99){s=stepStamina(s,dt,true,true);elapsed+=dt;}
 s=stepStamina(s,14.99-elapsed,true,true);
 assert.ok(canSprint(s),'sprint is still available just before 15 seconds');
 close(s.value,.01/15);
 s=stepStamina(s,.010000001,true,true);
 assert.equal(s.value,0);assert.equal(canSprint(s),false);
});
test('half capacity stays normalized and lasts exactly 7.5 seconds',()=>{
 const half=stepStamina(freshStamina(),7.5,true,true);close(half.value,.5);
 assert.deepEqual(stepStamina({value:.5,rest:0,exhausted:false},7.5,true,true),{value:0,rest:0,exhausted:true});
});
test('exhaustion retains the 1.5-second delay, 25-percent unlock and nine-second refill',()=>{
 let s=stepStamina(freshStamina(),15,true,true);
 s=stepStamina(s,1.5,false,true);assert.deepEqual(s,{value:0,rest:1.5,exhausted:true});
 s=stepStamina(s,2.24,false,true);assert.equal(canSprint(s),false);
 s=stepStamina(s,.01,false,true);close(s.value,.25);assert.equal(canSprint(s),true);
 s=stepStamina(s,6.75,false,false);close(s.value,1);
 assert.equal(stepStamina(s,100,false,false).value,1);
});
test('pause freezes depleted stamina and breathing; pressing sprint without moving does not drain',()=>{
 const s=stepStamina(freshStamina(),7.5,true,true);
 for(const dt of [0,-1]){assert.strictEqual(stepStamina(s,dt,true,true),s);assert.equal(stepBreathing(.7,dt,s,true),.7);}
 assert.deepEqual(stepStamina(freshStamina(),20,true,false),freshStamina());
 const resting=stepStamina(s,1.5,true,false);close(resting.value,.5);
 close(stepStamina(resting,2.25,true,false).value,.75);
});

for(const dt of [1/30,1/60,1/144,.025,.05])test(`held sprint recovers and resumes without threshold flicker at ${dt}`,()=>{
 let s=freshStamina();
 for(let i=0;i<Math.round(15/dt);i++)s=stepStamina(s,dt,canSprint(s),true);
 assert.equal(s.value,0);assert.equal(s.exhausted,true);
 let elapsed=0;
 while(elapsed+dt<3.75-1e-9){s=stepStamina(s,dt,true,true);elapsed+=dt;assert.equal(s.exhausted,true);}
 s=stepStamina(s,3.75-elapsed,true,true);
 close(s.value,.25);assert.equal(s.exhausted,false);
 s=stepStamina(s,dt,true,true);assert.equal(s.exhausted,false);assert.ok(s.value<.25);
});
test('non-finite frame times do not corrupt stamina or breathing',()=>{
 const s={value:.4,rest:.2,exhausted:false};
 for(const dt of [NaN,Infinity,-Infinity]){assert.strictEqual(stepStamina(s,dt,true,true),s);assert.equal(stepBreathing(.4,dt,s,true),.4);}
});
