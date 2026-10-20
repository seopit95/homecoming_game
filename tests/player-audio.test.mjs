import test from 'node:test';
import assert from 'node:assert/strict';
import {stepBreathing,freshStamina,stepStamina} from '../lib/stamina.ts';
import {playerFootSurface} from '../lib/footsteps.ts';
import {HorrorAudio} from '../lib/audio.ts';

test('V111 breathing rises before exhaustion and recovers smoothly without changing sprint capacity',()=>{
 let stamina=freshStamina(),load=0;const levels=[];
 for(let i=0;i<260;i++){stamina=stepStamina(stamina,.025,true,true);load=stepBreathing(load,.025,stamina,true);if(i===39||i===159||i===259)levels.push(load);}
 assert.ok(levels[0]>.05&&levels[0]<.35);assert.ok(levels[1]>levels[0]+.25);assert.ok(levels[2]>.9);assert.ok(stamina.value<.001);
 const before=load;stamina=stepStamina(stamina,.025,false,false);load=stepBreathing(load,.025,stamina,false);assert.ok(load>before-.05);
 assert.equal(stepBreathing(load,0,stamina,false),load,'pause cannot advance the recovery');for(let i=0;i<700;i++){stamina=stepStamina(stamina,.025,false,false);load=stepBreathing(load,.025,stamina,false);}assert.equal(load,0);
});

test('V111 floor sounds follow the authored wood, tile, concrete, metal and wet surfaces',()=>{
 assert.equal(playerFootSurface('apartment',0,2), 'wood');assert.equal(playerFootSurface('office',0,0),'wood');assert.equal(playerFootSurface('resident',0,8),'tile');assert.equal(playerFootSurface('lift',0,0),'metal');assert.equal(playerFootSurface('archive',0,0),'concrete');assert.equal(playerFootSurface('parking',0,-19,false),'wet');assert.equal(playerFootSurface('parking',0,-19,true),'concrete');assert.equal(playerFootSurface('courtyard',0,0),'wet');
});

class Param{value=0;targets=[];setTargetAtTime(...a){this.targets.push(a);}setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
class Node{gain=new Param();frequency=new Param();Q=new Param();pan=new Param();delayTime=new Param();playbackRate=new Param();connections=[];connect(n){this.connections.push(n);return n;}disconnect(){this.disconnected=true;}start(...a){this.startArgs=a;}stop(){this.stopped=true;}}
class Context{currentTime=10;state='running';nodes=[];make(){const n=new Node();this.nodes.push(n);return n;}createBufferSource(){return this.make();}createGain(){return this.make();}createBiquadFilter(){return this.make();}createStereoPanner(){return this.make();}createDelay(){return this.make();}}

test('V111 sampled footfalls vary without adjacent repeats, layer materials and release completed nodes',()=>{
 const audio=new HorrorAudio(),ctx=new Context(),bank={duration:20};audio.context=ctx;audio.effectsBus=new Node();audio.footstepBuffer=bank;
 audio.footstep('wood',-.1,.35);audio.footstep('wood',.1,.35);const wood=ctx.nodes.filter(n=>n.buffer===bank);assert.equal(wood.length,2);assert.notEqual(wood[0].startArgs[1],wood[1].startArgs[1]);
 for(const floor of ['tile','concrete','wet','metal'])audio.footstep(floor,0,.65);
 const samples=ctx.nodes.filter(n=>n.buffer===bank);assert.ok(samples.length>=8,'wet and metal combine sole contact with a material layer');assert.ok(samples.every(n=>n.startArgs[2]>0&&n.playbackRate.value>.85&&n.playbackRate.value<1.2));
 for(const n of samples)n.onended();assert.ok(ctx.nodes.every(n=>n.disconnected));
});

test('V111 exertion changes breath pace and roughness on one persistent effects loop',()=>{
 const audio=new HorrorAudio(),ctx=new Context();audio.context=ctx;audio.effectsBus=new Node();audio.clips['player-breath']={duration:5};audio.setExertion(.15);const src=audio.exertionSource,rate=src.playbackRate.targets.at(-1)?.[0];audio.setExertion(.9);
 assert.equal(audio.exertionSource,src);assert.ok(src.playbackRate.targets.at(-1)[0]>rate);assert.ok(audio.exertionFilter.frequency.targets.at(-1)[0]>2500);assert.ok(audio.exertion.connections.includes(audio.effectsBus));audio.setExertion(0);assert.equal(audio.exertion.gain.targets.at(-1)[0],0);
});

test('V111 tile reflections finish after the dry footfall instead of being disconnected with it',()=>{
 const audio=new HorrorAudio(),ctx=new Context(),bank={duration:20};audio.context=ctx;audio.effectsBus=new Node();audio.footstepBuffer=bank;audio.footstep('tile',0,.4);
 const sources=ctx.nodes.filter(n=>n.buffer===bank);assert.equal(sources.length,2);const [dry,echo]=sources;assert.ok(echo.startArgs[0]>dry.startArgs[0]);assert.equal(echo.startArgs[1],dry.startArgs[1]);assert.equal(echo.playbackRate.value,dry.playbackRate.value);
 dry.onended();assert.equal(dry.disconnected,true);assert.notEqual(echo.disconnected,true,'the quiet reflection must outlive the dry contact');echo.onended();assert.ok(ctx.nodes.every(n=>n.disconnected));
});

test('V111 fully recovered breathing reaches exact silence after its last quiet frame',()=>{
 const audio=new HorrorAudio();audio.context=new Context();audio.effectsBus=new Node();audio.clips['player-breath']={duration:5};audio.setExertion(.01);audio.setExertion(0);assert.equal(audio.exertion.gain.targets.at(-1)[0],0);
});
