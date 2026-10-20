import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayerGait} from '../lib/player-gait.ts';
import {defaultSettings,readSettings} from '../lib/preferences.ts';

test('V110 gait follows travelled distance, strengthens for running and settles instead of snapping',()=>{
 const walk=createPlayerGait(),run=createPlayerGait();let w=0,r=0,steps=0;
 for(let i=0;i<120;i++){if(walk.step(2/60,1/60,false,false,true))steps++;run.step(3.5/60,1/60,true,false,true);w=Math.max(w,Math.abs(walk.y));r=Math.max(r,Math.abs(run.y));}
 assert.ok(w>.018&&r>w*1.6);assert.ok(steps>=4&&steps<=5);assert.ok(Math.abs(run.roll)<.009);
 const phase=run.phase,before=run.y;assert.equal(run.step(0,1/60,true,false,true),false);assert.equal(run.phase,phase);assert.ok(Math.abs(run.y-before)<.012,'stopping cannot abruptly zero the view');
 for(let i=0;i<60;i++)run.step(0,1/60,false,false,true);assert.ok(Math.abs(run.y)<.0001&&Math.abs(run.roll)<.0001);
 walk.step(.1,.05,false,false,false);assert.equal(Math.abs(walk.y),0);assert.equal(walk.pitch,0);assert.equal(walk.roll,0);
 const blocked=createPlayerGait();for(let i=0;i<120;i++)blocked.step(0,1/60,true,false,true);assert.equal(blocked.phase,0);assert.equal(Math.abs(blocked.y),0);
});

test('V110 new players get gait by default while a saved off preference is preserved',()=>{
 assert.equal(defaultSettings.bob,true);assert.equal(readSettings({getItem:()=>'{"bob":false,"reducedMotion":true}'}).bob,false);
});
