import test from 'node:test';
import assert from 'node:assert/strict';
import {HorrorAudio} from '../lib/audio.ts';

class Param{value=0;targets=[];setTargetAtTime(...a){this.targets.push(a);}setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
class Node{gain=new Param();frequency=new Param();Q=new Param();pan=new Param();delayTime=new Param();playbackRate=new Param();connections=[];connect(n){this.connections.push(n);return n;}disconnect(){this.disconnected=true;}start(){this.started=true;}stop(){this.stopped=true;}}
class Context{sampleRate=8000;currentTime=0;state='running';destination=new Node();nodes=[];make(){const n=new Node();this.nodes.push(n);return n;}createBufferSource(){return this.make();}createGain(){return this.make();}createBiquadFilter(){return this.make();}createOscillator(){return this.make();}createStereoPanner(){return this.make();}createDelay(){return this.make();}createBuffer(_c,n){const data=new Float32Array(n);return {getChannelData:()=>data,duration:n/this.sampleRate};}decodeAudioData(data){return Promise.resolve({duration:48,data});}suspend(){this.state='suspended';return Promise.resolve();}resume(){this.state='running';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}}

test('finale assets load once on demand and the ending score follows the music bus and restart lifecycle',async()=>{
 const oldContext=globalThis.AudioContext,oldFetch=globalThis.fetch,requested=[];
 globalThis.AudioContext=Context;globalThis.fetch=async url=>{requested.push(url);return {ok:String(url).includes('/finale-v137/'),arrayBuffer:async()=>new ArrayBuffer(4)};};
 const a=new HorrorAudio();try{
  a.prepare();assert.ok(!requested.some(url=>url.includes('finale-v137')),'new audio must not delay the initial game load');
  const prepared=a.prepareFinale();a.prepareFinale();a.setEndingMusic(1);await prepared;
  assert.equal(requested.filter(url=>url.includes('/finale-v137/')).length,3);
  assert.ok(a.clips['truck-horn']);assert.ok(a.clips['truck-impact']);
  const source=a.endingSource,gain=a.endingGain;assert.ok(source.started);assert.equal(source.loop,true);
  assert.ok(gain.connections.includes(a.musicBus),'score must respect the music slider, separate from dialogue');
  assert.ok(gain.gain.targets.at(-1)[0]>0&&gain.gain.targets.at(-1)[0]<=.4,'keep the score below foreground effects');
  a.setEndingMusic(.5);assert.equal(a.endingSource,source,'credit fade changes gain without restarting the song');
  a.pause();assert.equal(a.context.state,'suspended');a.resume();assert.equal(a.endingSource,source);
  a.recorded('truck-horn',.55,.25);const horn=[...a.roadSounds].at(-1);assert.equal(horn.connections[0].connections[0].connections[0],a.effectsBus);
  a.setDrive(null);assert.equal(horn.stopped,true);assert.equal(source.stopped,undefined,'road cleanup must preserve the epilogue');
  a.setEndingMusic(0);assert.equal(source.stopped,true);assert.ok(source.disconnected&&gain.disconnected);
  a.setEndingMusic(1);assert.notEqual(a.endingSource,source,'replay starts the score from the beginning');
  const replay=a.endingSource;a.dispose();assert.equal(replay.stopped,true);assert.equal(a.endingSource,null);
 }finally{a.dispose();globalThis.AudioContext=oldContext;globalThis.fetch=oldFetch;}
});

test('a late finale download cannot restart music after leaving the ending',async()=>{
 const a=new HorrorAudio();a.context=new Context();a.musicBus=new Node();
 const oldFetch=globalThis.fetch;const releases=[];globalThis.fetch=()=>new Promise(resolve=>{releases.push(()=>resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}));});
 try{const loading=a.prepareFinale();a.setEndingMusic(1);a.setEndingMusic(0);a.dispose();releases.forEach(release=>release());await loading;assert.equal(a.endingSource,null);assert.equal(a.endingBuffer,null);}finally{globalThis.fetch=oldFetch;}
});
