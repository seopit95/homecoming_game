import test from 'node:test';
import assert from 'node:assert/strict';
import {HorrorAudio} from '../lib/audio.ts';

class Param{value=0;setTargetAtTime(){}setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
class Node{gain=new Param();frequency=new Param();Q=new Param();pan=new Param();delayTime=new Param();playbackRate=new Param();connections=[];connect(n){this.connections.push(n);return n;}disconnect(){this.disconnected=true;}start(){this.started=true;}stop(){this.stopped=true;}}
class Context{sampleRate=8000;currentTime=0;state='running';destination=new Node();make(){return new Node();}createBufferSource(){return this.make();}createGain(){return this.make();}createBiquadFilter(){return this.make();}createOscillator(){return this.make();}createStereoPanner(){return this.make();}createDelay(){return this.make();}createBuffer(_c,n){const data=new Float32Array(n);return {getChannelData:()=>data,duration:n/this.sampleRate};}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}}

test('V136 female sob uses a fresh recording at natural speed while preserving voice level, position and cleanup',()=>{
 const previousContext=globalThis.AudioContext,previousFetch=globalThis.fetch,requested=[];
 globalThis.AudioContext=Context;globalThis.fetch=async url=>{requested.push(url);return {ok:false};};
 const a=new HorrorAudio();
 try{
  a.prepare();assert.ok(requested.includes('/audio/ghost-v136/female-sob.wav'));assert.ok(!requested.includes('/audio/cry.wav'));
  a.context.state='running';a.voices.cry={duration:5.5669167};a.voice('cry',-.4,.35);
  const [source,filter,gain,pan,delay,echo]=a.voiceNodes;
  assert.equal(source.buffer,a.voices.cry);assert.equal(source.playbackRate.value,1);assert.ok(filter.frequency.value>=4800);
  assert.equal(gain.gain.value,.64*.35);assert.equal(pan.pan.value,-.4);assert.equal(delay.delayTime.value,.23);assert.equal(echo.gain.value,.22);
  assert.ok(pan.connections.includes(a.voiceBus));a.voice('cry',.6,.2,true);
  assert.equal(source.stopped,true);assert.equal(a.voiceNodes[1].frequency.value,650);assert.equal(a.voiceNodes[3].pan.value,.6);
  assert.equal(a.voiceNodes[2].gain.value,.64*.2);
  const current=a.voiceSource;a.pause();a.voice('cry');assert.equal(a.voiceSource,current,'paused audio cannot start another sob');
  a.stopVoices();assert.equal(current.stopped,true);assert.equal(a.voiceNodes.length,0);
 }finally{a.dispose();globalThis.AudioContext=previousContext;globalThis.fetch=previousFetch;}
});

test('V126 ghost distress requests fresh asset URLs instead of cached synthetic voices',()=>{
 const previousContext=globalThis.AudioContext,previousFetch=globalThis.fetch,requested=[];
 globalThis.AudioContext=Context;globalThis.fetch=async url=>{requested.push(url);return {ok:false};};
 const a=new HorrorAudio();
 try{
  a.prepare();
  assert.ok(requested.includes('/audio/ghost-v126/capture-scream.wav'),'capture and chase must load the replacement scream');
  assert.ok(requested.includes('/audio/ghost-v126/refusal-ko.wav'),'refusal must load the expressive Korean performance');
  assert.ok(!requested.includes('/audio/scream.wav')&&!requested.includes('/audio/no.wav'),'an old browser cache cannot supply either replacement');
 }finally{a.dispose();globalThis.AudioContext=previousContext;globalThis.fetch=previousFetch;}
});

test('V126 distress preserves natural speed and vocal detail with only a quiet early reflection',()=>{
 const a=new HorrorAudio();a.context=new Context();a.master=new Node();a.voiceBus=new Node();
 try{
  for(const line of ['scream','no']){
   a.voices[line]={duration:line==='scream'?4:2.586};a.voice(line,.3,.8);
   const [source,filter,gain,panner,delay,echo]=a.voiceNodes;
   assert.equal(source.buffer,a.voices[line]);assert.equal(source.playbackRate.value,1);
   assert.ok(filter.frequency.value>=10000,'breath and a strained cry must retain their upper harmonics');
   assert.ok(delay.delayTime.value<=.05&&echo.gain.value<=.05,'a loud delayed duplicate would make the shout sound artificial');
   assert.ok(panner.connections.includes(a.voiceBus));assert.ok(gain.gain.value>0&&gain.gain.value<1);
   a.stopVoices();assert.equal(source.stopped,true);assert.ok([source,filter,gain,panner,delay,echo].every(n=>n.disconnected));
   a.voice(line,0,1,true);assert.equal(a.voiceNodes[1].frequency.value,650,'walls must still occlude the new performance');
  }
 }finally{a.stopVoices();a.context=null;}
});
