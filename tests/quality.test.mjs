import test from 'node:test';
import assert from 'node:assert/strict';
const perception=await import('../lib/perception.ts').catch(()=>({}));
const prefs=await import('../lib/preferences.ts').catch(()=>({}));
test('vision depends on facing, while audible footsteps can be heard behind the ghost',()=>{
  assert.equal(typeof perception.perceives,'function');
  const input={ghost:{x:0,z:0},player:{x:0,z:4},heading:0,lineOfSight:true,torch:false,crouched:false,noise:0};
  assert.equal(perception.perceives(input),true);
  assert.equal(perception.perceives({...input,player:{x:0,z:-4}}),false);
  assert.equal(perception.perceives({...input,player:{x:0,z:-4},noise:10}),true);
  assert.equal(perception.perceives({...input,lineOfSight:false}),false);
});
test('progress roundtrips to a safe chapter and rejects corrupted or incompatible data',()=>{
  assert.equal(typeof prefs.readProgress,'function');
  const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  assert.equal(prefs.writeProgress(storage,{stage:'resident_return',notes:['belongings','answerphone']},123),true);
  const saved=prefs.readProgress(storage);assert.equal(saved.stage,'resident_entry');assert.equal(saved.elapsed,123);assert.deepEqual(saved.notes,['belongings','answerphone']);
  storage.setItem(prefs.PROGRESS_KEY,'{bad');assert.equal(prefs.readProgress(storage),null);
  storage.setItem(prefs.PROGRESS_KEY,JSON.stringify({version:2,stage:'made-up',notes:[],elapsed:2}));assert.equal(prefs.readProgress(storage),null);
  assert.equal(prefs.writeProgress({setItem(){throw Error('quota')}},{stage:'radio',notes:[]},2),false);
});
test('settings clamp numeric values and reject conflicting or reserved key bindings',()=>{
  assert.equal(typeof prefs.normalizeSettings,'function');
  const s=prefs.normalizeSettings({fov:400,volume:-5,sensitivity:NaN,bindings:{forward:'Escape',back:'KeyQ',left:'KeyQ'}});
  assert.equal(s.fov,95);assert.equal(s.volume,0);assert.equal(s.sensitivity,1);
  assert.notEqual(s.bindings.forward,'Escape');assert.notEqual(s.bindings.back,s.bindings.left);
});
test('a freed default key can be assigned to a different action without silently undoing it',()=>{
  const s=prefs.normalizeSettings({...prefs.defaultSettings,bindings:{...prefs.defaultBindings,interact:'KeyQ',forward:'KeyE'}});
  assert.equal(s.bindings.forward,'KeyE');assert.equal(s.bindings.interact,'KeyQ');
});
test('saving a stopped or descending elevator never rewinds to the apartment',()=>{
  assert.equal(prefs.progressStage('descent'),'lift_button');assert.equal(prefs.progressStage('pry'),'lift_button');assert.equal(prefs.progressStage('lift_exit'),'lift_exit');
});

test('legacy road saves migrate to the car finale and new finale saves resume before the reveal',()=>{
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 storage.setItem(prefs.PROGRESS_KEY,JSON.stringify({version:2,stage:'road_exit',notes:['phone'],elapsed:120}));
 assert.equal(prefs.readProgress(storage).stage,'car_escape');
 prefs.writeProgress(storage,{stage:'car_crash',notes:['phone']},140);assert.equal(prefs.readProgress(storage).stage,'car_escape');
});

test('car departure progress resumes safely in the garage and preserves earned notes',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 prefs.writeProgress(storage,{stage:'car_departure',notes:['plant_drained','car_search']},1000);
 assert.equal(prefs.readProgress(storage).stage,'car_departure');assert.deepEqual(prefs.readProgress(storage).notes,['plant_drained','car_search']);
});
