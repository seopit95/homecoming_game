import test from 'node:test';
import assert from 'node:assert/strict';
import {HorrorAudio} from '../lib/audio.ts';

test('the apparition crossfades a connected music layer through volume and pause controls',()=>{
  class Param{value=0;targets=[];setTargetAtTime(...args){this.targets.push(args);}setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
  class Node{gain=new Param();frequency=new Param();Q=new Param();pan=new Param();delayTime=new Param();connections=[];connect(destination){this.connections.push(destination);return destination;}disconnect(){this.connections=[];}start(){}stop(){}}
  class Context{sampleRate=22050;currentTime=17;state='running';destination=new Node();nodes=[];make(){const n=new Node();this.nodes.push(n);return n;}createGain(){return this.make();}createBufferSource(){return this.make();}createBiquadFilter(){return this.make();}createOscillator(){return this.make();}createBuffer(_channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}}
  const previousFetch=globalThis.fetch,previousContext=globalThis.AudioContext;globalThis.AudioContext=Context;globalThis.fetch=async()=>({ok:false});
  const audio=new HorrorAudio();try{
    audio.start();const ctx=audio.context;assert.ok(audio.haunt.connections.includes(audio.master));assert.ok(ctx.nodes.filter(n=>n.connections.includes(audio.haunt)).length>=7,'the drone voices and wind feed the music layer');assert.equal(audio.haunt.gain.value,0);
    audio.setHaunt(1);assert.deepEqual(audio.haunt.gain.targets.at(-1),[1,17,.65]);assert.deepEqual(audio.weather.gain.targets.at(-1),[.4,17,.9]);
    const count=audio.haunt.gain.targets.length;audio.setHaunt(1);assert.equal(audio.haunt.gain.targets.length,count,'steady frames do not reschedule fades');
    audio.setVolume(0);assert.equal(audio.master.gain.targets.at(-1)[0],0);audio.pause();assert.equal(ctx.state,'suspended');audio.resume();assert.equal(ctx.state,'running');
    audio.setHaunt(0);assert.equal(audio.haunt.gain.targets.at(-1)[0],0);audio.dispose();assert.equal(ctx.state,'closed');assert.equal(audio.haunt,null);
  }finally{audio.dispose();globalThis.fetch=previousFetch;globalThis.AudioContext=previousContext;}
});
