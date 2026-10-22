import test from 'node:test';
import assert from 'node:assert/strict';
import {HorrorAudio} from '../lib/audio.ts';

class Param{value=0;setTargetAtTime(){}setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
class Node{gain=new Param();frequency=new Param();Q=new Param();pan=new Param();delayTime=new Param();playbackRate=new Param();connections=[];connect(n){this.connections.push(n);return n;}disconnect(){this.connections=[];}start(){this.started=true;}stop(){this.stopped=true;}}
class Context{currentTime=0;sampleRate=8000;state='running';destination=new Node();nodes=[];make(){const n=new Node();this.nodes.push(n);return n;}createBufferSource(){return this.make();}createGain(){return this.make();}createBiquadFilter(){return this.make();}createStereoPanner(){return this.make();}createDelay(){return this.make();}createOscillator(){return this.make();}createBuffer(_c,n){const data=new Float32Array(n);return {getChannelData:()=>data,duration:n/this.sampleRate};}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}}
function setup(){const a=new HorrorAudio();a.context=new Context();a.master=new Node();a.voiceBus=new Node();a.effectsBus=new Node();return a;}

test('V127 preloads distinct capture, metal scratch, terror and new dialogue while retaining the V126 chase file',()=>{
 const oldContext=globalThis.AudioContext,oldFetch=globalThis.fetch,urls=[];
 globalThis.AudioContext=Context;globalThis.fetch=async url=>{urls.push(url);return {ok:false};};
 const a=new HorrorAudio();try{a.prepare();for(const file of ['capture','lift-scratch','male-terror','passenger-line','refusal-ko'])assert.ok(urls.includes(`/audio/ghost-v127/${file}.wav`),file);assert.ok(urls.includes('/audio/ghost-v126/capture-scream.wav'));assert.ok(urls.includes('/audio/overhaul/male-surprise.wav'));}finally{a.dispose();globalThis.AudioContext=oldContext;globalThis.fetch=oldFetch;}
});

test('V127 gives the unchanged chase performance 20 percent more gain and preserves capture/refusal pitch',()=>{
 const a=setup();try{for(const line of ['scream','capture','no']){a.voices[line]={duration:1};a.voice(line);const source=a.voiceSource,filter=source.connections[0],gain=filter.connections[0];assert.equal(source.playbackRate.value,1,line);assert.equal(filter.frequency.value,11000);assert.equal(gain.gain.value,.64*(line==='scream'?1.2:1));}assert.notEqual(a.voices.capture,a.voices.scream);a.voice('capture',0,.6,true);assert.equal(a.voiceSource.connections[0].frequency.value,650,'capture retains wall occlusion');}finally{a.dispose();}
});

test('V127 final male terror follows dialogue volume while the ceiling scrape follows effects volume',()=>{
 const a=setup();try{for(const clip of ['male-terror','lift-scratch']){a.clips[clip]={duration:1.2};a.recorded(clip);const source=[...a.roadSounds].at(-1),pan=source.connections[0].connections[0];assert.equal(pan.connections[0],clip==='male-terror'?a.voiceBus:a.effectsBus);assert.equal(source.started,true);}const sources=[...a.roadSounds];a.setDrive(null);assert.ok(sources.every(s=>s.stopped),'restart clears these scheduled clips');}finally{a.dispose();}
});
