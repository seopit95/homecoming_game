import test from 'node:test';
import assert from 'node:assert/strict';

test('V114 prolonged holding builds strain gradually, freezes on pause and clears smoothly after release',async()=>{
 const {freshHeldBreath,stepHeldBreath,stepBreathStrain}=await import('../lib/held-breath.ts');let s=freshHeldBreath(),strain=0;
 for(let i=0;i<60;i++){s=stepHeldBreath(s,.05,true,true);strain=stepBreathStrain(strain,.05,s);}assert.equal(strain,0,'a short hold remains clear');
 for(let i=0;i<150;i++){s=stepHeldBreath(s,.05,true,true);strain=stepBreathStrain(strain,.05,s);}assert.ok(strain>.75&&strain<=1);assert.equal(stepBreathStrain(strain,0,s),strain);
 const peak=strain;s=stepHeldBreath(s,.05,false,true);strain=stepBreathStrain(strain,.05,s);assert.ok(strain>0&&strain<peak);for(let i=0;i<200;i++)strain=stepBreathStrain(strain,.05,s);assert.equal(strain,0);
});

test('V113 holding silences hidden breathing, runs out and cannot restart until recovered',async()=>{
 const {freshHeldBreath,stepHeldBreath,playerBreathLevel}=await import('../lib/held-breath.ts');let s=freshHeldBreath();s=stepHeldBreath(s,1,true,true);assert.equal(s.holding,true);assert.equal(playerBreathLevel(s,.9,true),0);assert.ok(s.air<1);
 for(let i=0;i<300&&!s.locked;i++)s=stepHeldBreath(s,.1,true,true);assert.equal(s.holding,false);assert.equal(s.locked,true);assert.ok(playerBreathLevel(s,0,true)>.6);
 const air=s.air;s=stepHeldBreath(s,.1,true,true);assert.equal(s.holding,false);assert.ok(s.air>air);for(let i=0;i<50;i++)s=stepHeldBreath(s,.1,false,true);assert.equal(s.locked,false);assert.equal(stepHeldBreath(s,.1,true,true).holding,true);
});
test('V113 pause freezes the breath clock and leaving hiding releases without refilling air',async()=>{
 const {freshHeldBreath,stepHeldBreath,playerBreathLevel}=await import('../lib/held-breath.ts');const s=stepHeldBreath(freshHeldBreath(),2,true,true);assert.deepEqual(stepHeldBreath(s,0,true,true),s);const out=stepHeldBreath(s,.025,true,false);assert.equal(out.holding,false);assert.ok(out.air<.9);assert.equal(playerBreathLevel(out,0,false),0);assert.ok(playerBreathLevel(out,0,true)>0);
});
test('V113 breathing requires sustained nearby sound and cannot be heard across a solid wall',async()=>{
 const {stepBreathNotice}=await import('../lib/held-breath.ts');let level=0;for(let i=0;i<20;i++)level=stepBreathNotice(level,.05,3,.85,true);assert.ok(level>=1);assert.equal(stepBreathNotice(0,3,3,.15,true),0);assert.equal(stepBreathNotice(0,3,1,.85,false),0);assert.equal(stepBreathNotice(0,3,1,0,true),0);assert.ok(stepBreathNotice(level,.2,8,.85,true)<level);
});
test('V113 older custom keys remain valid when the breath binding is added',async()=>{
 const {normalizeSettings}=await import('../lib/preferences.ts');const s=normalizeSettings({bindings:{run:'ControlLeft'}});assert.equal(s.bindings.run,'ControlLeft');assert.ok(s.bindings.breath);assert.notEqual(s.bindings.breath,s.bindings.run);assert.equal(new Set(Object.values(s.bindings)).size,Object.keys(s.bindings).length);
});
