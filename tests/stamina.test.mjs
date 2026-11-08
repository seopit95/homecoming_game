import test from 'node:test';
import assert from 'node:assert/strict';
import {fullStamina,updateStamina} from '../lib/stamina.ts';
test('sprinting depletes stamina, walking restores it after a delay, exhaustion requires recovery',()=>{
  let s=fullStamina();while(!s.exhausted)s=updateStamina(s,true,.1);
  assert.equal(s.exhausted,true);assert.equal(s.value,0);
  for(let i=0;i<8;i++)s=updateStamina(s,false,.1);assert.equal(s.value,0);
  s=updateStamina(s,false,1);assert.ok(s.value>0&&s.exhausted);
  s=updateStamina(s,false,10);assert.equal(s.exhausted,false);assert.ok(s.value<=100);
  assert.equal(updateStamina(s,false,100).value,100);
});
