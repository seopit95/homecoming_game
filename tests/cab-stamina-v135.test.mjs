import test from'node:test';import assert from'node:assert/strict';import*as T from'three';import{buildWorld}from'../lib/world.ts';import{freshStamina,stepStamina,canSprint}from'../lib/stamina.ts';
const ctx={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},arc(){},fill(){}};globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
test('V135 the receiving gallery floor never projects across the lift doors into the cab',()=>{
 const w=buildWorld(new T.Scene(),'lift');w.root.updateMatrixWorld(true);const floor=w.root.getObjectByName('gallery-lift-lobby-floor'),b=new T.Box3().setFromObject(floor);assert.ok(b.max.z<=-1.34,`raised landing intrudes to z=${b.max.z}`);
});
test('V135 normal boarding and travel have no raised landing; only forced doors reveal the offset',()=>{
 const w=buildWorld(new T.Scene(),'lift'),ledge=w.root.getObjectByName('lift-offset-ledge');
 for(const stage of ['lift_button','descent','transfer_panel','transfer_ride','transfer_exit']){w.updateStory(stage,0,false);assert.equal(ledge.visible,false,stage);assert.ok(!w.solids.some(s=>s.w===1.4&&s.h===.95),'no invisible sill collision');}
 for(const stage of ['pry','lift_exit','lift_climb']){w.updateStory(stage,1,false);assert.equal(ledge.visible,true,stage);assert.ok(w.solids.some(s=>s.w===1.4&&s.h===.95));}
 w.reset();assert.equal(ledge.visible,false);assert.ok(!w.solids.some(s=>s.w===1.4&&s.h===.95));
});
test('V135 sprint reserve lasts about nine seconds and still has a finite exhaustion/recovery boundary',()=>{
 let s=freshStamina();for(let i=0;i<170;i++)s=stepStamina(s,.05,true,true);assert.ok(canSprint(s)&&s.value>0,'8.5seconds must remain playable');for(let i=0;i<14;i++)s=stepStamina(s,.05,true,true);assert.equal(canSprint(s),false);assert.equal(s.value,0);for(let i=0;i<50;i++)s=stepStamina(s,.05,false,true);assert.ok(s.value>0&&s.value<.25);assert.deepEqual(stepStamina(s,0,true,true),s);
});
