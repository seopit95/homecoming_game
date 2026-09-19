import test from 'node:test';
import assert from 'node:assert/strict';
import {HorrorAudio} from '../lib/audio.ts';

test('the apparition crossfades a connected music layer through volume and pause controls',()=>{
  class Param{value=0;targets=[];setTargetAtTime(...args){this.targets.push(args);}setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
  class Node{gain=new Param();frequency=new Param();Q=new Param();pan=new Param();delayTime=new Param();connections=[];connect(destination){this.connections.push(destination);return destination;}disconnect(){this.connections=[];}start(){}stop(...args){this.stopArgs=args;}}
  class Context{sampleRate=22050;currentTime=17;state='running';destination=new Node();nodes=[];make(){const n=new Node();this.nodes.push(n);return n;}createGain(){return this.make();}createBufferSource(){return this.make();}createBiquadFilter(){return this.make();}createOscillator(){return this.make();}createStereoPanner(){return this.make();}createBuffer(_channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}}
  const previousFetch=globalThis.fetch,previousContext=globalThis.AudioContext;globalThis.AudioContext=Context;globalThis.fetch=async()=>({ok:false});
  const audio=new HorrorAudio();try{
    audio.start();const ctx=audio.context;assert.ok(audio.haunt.connections.includes(audio.musicBus)&&audio.musicBus.connections.includes(audio.master));assert.ok(ctx.nodes.filter(n=>n.connections.includes(audio.haunt)).length>=7,'the drone voices and wind feed the music layer');assert.equal(audio.haunt.gain.value,0);
    assert.ok(audio.chase.connections.includes(audio.musicBus),'the chase score follows the music mixer');
    audio.setChase(.5);const tempo=audio.chasePulse.frequency.targets.at(-1)[0];audio.setChase(1);
    assert.ok(audio.chasePulse.frequency.targets.at(-1)[0]>tempo,'closer pursuit raises the pulse');
    audio.setChase(0);assert.equal(audio.chase.gain.targets.at(-1)[0],0,'hiding releases the chase score');
    audio.setHaunt(1);assert.deepEqual(audio.haunt.gain.targets.at(-1),[1,17,.65]);assert.deepEqual(audio.weather.gain.targets.at(-1),[.4,17,.9]);
    const count=audio.haunt.gain.targets.length;audio.setHaunt(1);assert.equal(audio.haunt.gain.targets.length,count,'steady frames do not reschedule fades');
    audio.mix({music:0,effects:.4,voice:.7});assert.equal(audio.musicBus.gain.targets.at(-1)[0],0);assert.equal(audio.voiceBus.gain.targets.at(-1)[0],.7);assert.equal(audio.effectsBus.gain.targets.at(-1)[0],.4);audio.setVolume(0);assert.equal(audio.master.gain.targets.at(-1)[0],0);audio.pause();assert.equal(ctx.state,'suspended');audio.resume();assert.equal(ctx.state,'running');
    audio.setDrive(9);assert.ok(audio.driveBus.connections.includes(audio.effectsBus),'engine and tyres follow the effects volume');assert.ok(audio.driveTone.frequency.targets.at(-1)[0]>50);audio.sound('glass');const shardSound=ctx.nodes.find(n=>n.buffer===audio.noise&&!n.loop);audio.setDrive(null);assert.deepEqual(shardSound.stopArgs,[],'skipping cancels pending collision sounds immediately');assert.equal(audio.driveBus.gain.targets.at(-1)[0],0,'skipping stops road audio');
    audio.clips['phone-ring']={duration:9};audio.clips['radio-tuning-broadcast']={duration:12};audio.clips['male-surprise']={duration:.67};
    audio.setDevice('phone',.8,-.3);const ring=audio.deviceLoops.get('phone');assert.equal(ring.source.loop,true);assert.ok(ring.pan.connections.includes(audio.effectsBus));
    audio.setDevice('phone',.2,.4);assert.equal(audio.deviceLoops.get('phone'),ring,'position changes keep the same ringing loop');assert.equal(ring.pan.pan.value,.4);
    audio.pause();assert.equal(ctx.state,'suspended');audio.resume();audio.setDevice('phone',0);assert.equal(audio.deviceLoops.size,0);assert.deepEqual(ring.source.stopArgs,[]);
    audio.setDevice('radio',.5);audio.recorded('male-surprise');const gasp=[...audio.roadSounds][0];audio.setDrive(null);assert.deepEqual(gasp.stopArgs,[],'skip also cancels recorded opening voices');
    audio.clips['passenger-line']={duration:2.16};audio.recorded('passenger-line');const reaction=[...audio.roadSounds][0];
    assert.equal(reaction.connections[0].connections[0].connections[0],audio.voiceBus,'the passenger line follows dialogue volume');
    audio.pause();assert.equal(ctx.state,'suspended');audio.resume();audio.setDrive(null);assert.deepEqual(reaction.stopArgs,[],'restart stops the passenger line');
    audio.setHaunt(0);assert.equal(audio.haunt.gain.targets.at(-1)[0],0);audio.dispose();assert.equal(ctx.state,'closed');assert.equal(audio.haunt,null);assert.equal(audio.deviceLoops.size,0);
  }finally{audio.dispose();globalThis.fetch=previousFetch;globalThis.AudioContext=previousContext;}
});
