import test from 'node:test';
import assert from 'node:assert/strict';
import {HorrorAudio} from '../lib/audio.ts';

class Param{value=0;targets=[];setTargetAtTime(...a){this.targets.push(a);}setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
class Node{gain=new Param();frequency=new Param();Q=new Param();pan=new Param();positionX=new Param();positionY=new Param();positionZ=new Param();playbackRate=new Param();connections=[];connect(n){this.connections.push(n);return n;}disconnect(){this.disconnected=true;}start(...a){this.startArgs=a;}stop(...a){this.stopped=true;this.stopArgs=a;}}
class Context{currentTime=10;sampleRate=24000;state='running';nodes=[];make(){const n=new Node();this.nodes.push(n);return n;}createBufferSource(){return this.make();}createGain(){return this.make();}createBiquadFilter(){return this.make();}createStereoPanner(){return this.make();}createPanner(){return this.make();}createOscillator(){return this.make();}createBuffer(_c,n){const data=new Float32Array(n);return {getChannelData:()=>data,duration:n/this.sampleRate};}suspend(){this.state='suspended';}resume(){this.state='running';}close(){this.state='closed';}}
const position=(x,z,occluded=false)=>({x,y:-.8,z,distance:Math.hypot(x,z),occluded});
function setup(){const audio=new HorrorAudio();audio.context=new Context();audio.master=new Node();audio.effectsBus=new Node();audio.noise={duration:4};return audio;}

test('V114 breath strain raises a centered heartbeat without a ghost and shares one bounded pulse with proximity',()=>{
 const a=setup();a.setBreathStrain(.3);const loop=a.heartbeatSource,quiet=a.heartbeat.gain.targets.at(-1)[0];assert.ok(quiet>0);assert.equal(a.ghostPanner,null,'personal strain cannot invent a ghost emitter');a.setBreathStrain(.9);assert.ok(a.heartbeat.gain.targets.at(-1)[0]>quiet);
 const strained=a.heartbeat.gain.targets.at(-1)[0];a.setGhostPosition(position(0,-2));assert.equal(a.heartbeatSource,loop);assert.ok(a.heartbeat.gain.targets.at(-1)[0]>strained);assert.ok(a.heartbeat.gain.targets.at(-1)[0]<=.85);a.setGhostPosition(null);assert.ok(a.heartbeat.gain.targets.at(-1)[0]>0,'removing the ghost cannot erase player strain');a.setBreathStrain(0);assert.equal(a.heartbeat.gain.targets.at(-1)[0],0);a.dispose();assert.equal(loop.stopped,true);
});

test('V112 real proximity quickens a centered double heartbeat without restarting or scheduling timers',()=>{
 const a=setup();a.setGhostPosition(position(0,-12));const loop=a.heartbeatSource,slow=loop.playbackRate.targets.at(-1)[0],quiet=a.heartbeat.gain.targets.at(-1)[0];a.setGhostPosition(position(0,-6));const medium=loop.playbackRate.targets.at(-1)[0];a.setGhostPosition(position(0,-1.5));
 assert.equal(a.heartbeatSource,loop);assert.ok(slow<medium&&medium<loop.playbackRate.targets.at(-1)[0]);assert.ok(a.heartbeat.gain.targets.at(-1)[0]>quiet);assert.ok(a.heartbeat.connections.includes(a.effectsBus));assert.equal(loop.loop,true);
 const pcm=loop.buffer.getChannelData(0);assert.ok(pcm.some(v=>Math.abs(v)>.2));assert.ok(pcm.slice(12000).every(v=>v===0),'space between paired thumps leaves a quiet half cycle');assert.equal(pcm.at(-1),0);
 a.setGhostPosition(position(0,-15));assert.equal(a.heartbeat.gain.targets.at(-1)[0],0);a.pause();assert.equal(a.context.state,'suspended');a.resume();a.setGhostPosition(null);assert.equal(a.heartbeat.gain.targets.at(-1)[0],0);const ctx=a.context;a.dispose();assert.equal(loop.stopped,true);assert.equal(ctx.state,'closed');assert.equal(a.heartbeatSource,null);
});

test('V112 ghost contact and breathing share a live HRTF source with distance and obstruction, player steps stay local',()=>{
 const a=setup(),ctx=a.context;a.setGhostPosition(position(-4,-3));const p=a.ghostPanner,count=ctx.nodes.length;assert.equal(p.panningModel,'HRTF');assert.equal(p.distanceModel,'inverse');assert.ok(p.rolloffFactor>0);assert.equal(p.positionX.targets.at(-1)[0],-4);
 a.setGhostPosition(position(4,3));assert.equal(p.positionX.targets.at(-1)[0],4);assert.equal(p.positionZ.targets.at(-1)[0],3);const clear=a.ghostFilter.frequency.targets.at(-1)[0];a.setGhostPosition(position(4,3,true));assert.ok(a.ghostFilter.frequency.targets.at(-1)[0]<clear);assert.ok(a.ghostGain.gain.targets.at(-1)[0]<1);
 for(let i=0;i<180;i++)a.setGhostPosition(position(4+i*.01,3,true));assert.equal(ctx.nodes.length,count,'movement updates parameters instead of allocating audio graphs');
 a.footstep('wet',0,.85,'ghost');a.sound('breath',0,1,true);const contacts=ctx.nodes.slice(count).filter(n=>n.connections.includes(a.ghostFilter));assert.equal(contacts.length,3,'sole, impact and breath all use the spatial graph');
 const beforePlayer=ctx.nodes.length;a.footstep('wood',0,.35);assert.ok(ctx.nodes.slice(beforePlayer).some(n=>n.connections.includes(a.effectsBus)));assert.ok(ctx.nodes.slice(beforePlayer).every(n=>!n.connections.includes(a.ghostFilter)));
 a.setGhostPosition(null);assert.equal(a.ghostGain.gain.targets.at(-1)[0],0,'chapter removal closes the old emitter');a.dispose();
});

test('V112 source coordinates rotate with player yaw and pitch and preserve true distance',async()=>{
 const {ghostSoundPosition}=await import('../lib/ghost-sound.ts');const listener={x:0,y:1.65,z:0},source={x:4,y:.65,z:-3};const a=ghostSoundPosition(listener,source,0,0,false),b=ghostSoundPosition(listener,source,Math.PI/2,0,true),c=ghostSoundPosition(listener,source,0,.5,false);
 assert.equal(a.x,4);assert.equal(a.z,-3);assert.ok(Math.abs(b.x-3)<1e-8);assert.ok(Math.abs(b.z-4)<1e-8);assert.equal(b.occluded,true);assert.equal(a.distance,b.distance);assert.equal(a.distance,c.distance);assert.notEqual(a.y,c.y);assert.ok(Math.abs(Math.hypot(c.x,c.y,c.z)-c.distance)<1e-8);
});

test('V112 changing chapters stops old spatial tails before the emitter can be reused',()=>{
 const a=setup(),ctx=a.context;a.setGhostPosition(position(0,-3));const before=ctx.nodes.length;a.sound('breath',0,1,true);a.footstep('wet',0,.8,'ghost');const sources=ctx.nodes.slice(before).filter(n=>n.startArgs);
 assert.ok(sources.length>=3);a.setGhostPosition(null);assert.ok(sources.every(n=>n.stopArgs?.length===0),'old breaths and contacts must not reappear at the next chapter spawn');a.setGhostPosition(position(1,-2));assert.ok(sources.every(n=>n.stopArgs?.length===0));a.dispose();
});
