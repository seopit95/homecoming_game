import test from'node:test';import assert from'node:assert/strict';
test('V134 escape mood starts at the stairs and preserves a readable, steady exit cue',async()=>{
 const {escapeMood,escapeLamp,escapeCue}=await import('../lib/escape-atmosphere.ts');
 assert.equal(escapeMood('apartment','hide'),false);assert.equal(escapeMood('corridor','corridor_run'),false);assert.equal(escapeMood('lift','pry'),false);
 for(const [area,stage]of[['stairs','stairs_loop'],['transfer','transfer_gallery'],['lift','transfer_ride'],['annex','annex_arrival'],['archive','archive_search'],['plant','plant_exit_ready'],['parking','parking_gate']])assert.equal(escapeMood(area,stage),true);
 const normal=[],still=[];for(let t=0;t<40;t+=.1){normal.push(escapeLamp(t,1,false,false));still.push(escapeLamp(t,1,true,false));assert.equal(escapeLamp(t,1,false,true),.4);}
 assert.ok(Math.min(...normal)<Math.max(...normal)*.4);assert.ok(Math.max(...normal)<=.32);assert.equal(new Set(still).size,1);assert.ok(still[0]>.1);
 const cues=Array.from({length:6},(_,i)=>escapeCue('stairs',i));assert.ok(new Set(cues.map(c=>c.kind)).size>=2);assert.ok(cues.every((c,i)=>i===0||c.at-cues[i-1].at>3));assert.equal(escapeCue('stairs',6),null);assert.equal(escapeCue('apartment',0),null);
});
