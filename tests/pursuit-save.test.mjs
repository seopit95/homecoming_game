import test from 'node:test';
import assert from 'node:assert/strict';
import {writeProgress,readProgress} from '../lib/preferences.ts';
import {initialStory} from '../lib/story.ts';

test('save retains carried pursuit and old investigation saves infer the already earned threat',()=>{
 let raw;const storage={getItem:()=>raw,setItem:(_k,v)=>raw=v};
 writeProgress(storage,{...initialStory(),stage:'archive_edit',notes:['court_confirm'],circuit:['archive_sequence_road']},480,true);
 assert.equal(readProgress(storage).pursuit,true);assert.deepEqual(readProgress(storage).circuit,['archive_sequence_road']);
 for(const [stage,notes,want] of [['archive_edit',['court_confirm'],true],['plant_arrival',['archive_play'],true],['archive_arrival',[],false]]){
  raw=JSON.stringify({version:2,stage,notes,elapsed:0});assert.equal(readProgress(storage).pursuit,want,'legacy threat at '+stage);
 }
 raw=JSON.stringify({version:2,stage:'archive_edit',notes:[],elapsed:0,pursuit:'true'});assert.equal(readProgress(storage).pursuit,false,'untrusted truthy values cannot turn on a hunt');
});

test('remaining pursuit travel time survives save and invalid delay values cannot stall a hunt indefinitely',()=>{
 let raw;const storage={getItem:()=>raw,setItem:(_k,v)=>raw=v};writeProgress(storage,{...initialStory(),stage:'archive_edit',notes:[]},500,true,12.5);assert.equal(readProgress(storage).pursuitWait,12.5);
 for(const [input,want] of [[-2,0],['12',0],[null,0],[1e12,600]]){raw=JSON.stringify({version:2,stage:'plant_arrival',notes:[],elapsed:0,pursuit:true,pursuitWait:input});assert.equal(readProgress(storage).pursuitWait,want,'invalid saved delay '+input);}
});
