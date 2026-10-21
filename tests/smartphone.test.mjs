import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {initialStory,transition} from '../lib/story.ts';

test('V123 the player picks up one smartphone, answers its call, then checks the breaker',()=>{
 let s=transition(initialStory(),'skip_memory');
 for(const [action,stage] of [['awake','light_switch'],['switch','find_torch'],['flashlight','phone'],['phone','power'],['breaker','shoes']]){s=transition(s,action);assert.equal(s.stage,stage,action);}
 assert.ok(s.notes.includes('smartphone')&&s.notes.includes('phone'));
});
test('V123 existing breaker-first saves retain a valid route through the call',()=>{
 for(const stage of ['power','phone']){let s={...initialStory(),stage,notes:['wake','flashlight']};if(stage==='power')s=transition(s,'breaker');s=transition(s,'phone');assert.equal(s.stage,'shoes');}
});
test('V123 saving with a carried ringing smartphone preserves the call and its new route',async()=>{
 const {writeProgress,readProgress}=await import('../lib/preferences.ts');let data;
 const storage={setItem:(_key,value)=>{data=value;},getItem:()=>data};
 const s={...initialStory(),stage:'phone',notes:['flashlight','smartphone']};writeProgress(storage,s,25);const saved=readProgress(storage);
 assert.equal(saved.stage,'phone');assert.ok(saved.notes.includes('smartphone'));
 const answered=transition({...initialStory(),...saved},'phone');assert.equal(answered.stage,'power');
 writeProgress(storage,transition(answered,'breaker'),30);assert.equal(readProgress(storage).stage,'shoes');
});
test('V123 a phone has separate front screen and rear LED at human scale',async()=>{
 const before=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
 try{const {createSmartphone}=await import('../lib/smartphone.ts');const phone=createSmartphone();const b=new T.Box3().setFromObject(phone.root),size=b.getSize(new T.Vector3());assert.ok(size.x>.065&&size.x<.09&&size.y>.14&&size.y<.17&&size.z<.025);assert.ok(phone.screen.position.z>0&&phone.led.position.z<0);phone.setState('torch');assert.ok(phone.led.material.emissiveIntensity>0);phone.setState('idle');assert.equal(phone.led.material.emissiveIntensity,0);}
 finally{globalThis.document=before;}
});
test('V123 the original mobile ringtone has clear bursts and a quiet gap',async()=>{
 const {smartphoneRing}=await import('../lib/audio.ts');let data;
 const buffer=smartphoneRing({sampleRate:8000,createBuffer:(_channels,length)=>{data=new Float32Array(length);return {getChannelData:()=>data};}});
 assert.ok(buffer);assert.equal(data.length,24000);assert.ok(data.slice(0,11000).some(n=>Math.abs(n)>.05));assert.ok(data.slice(12000).every(n=>n===0));
});
