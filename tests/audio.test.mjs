import test from 'node:test';
import assert from 'node:assert/strict';
import {HorrorAudio} from '../lib/audio.ts';

test('the apparition crossfades a connected music layer through volume and pause controls',()=>{
  class Param{value=0;targets=[];setTargetAtTime(...args){this.targets.push(args);}setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
  class Node{gain=new Param();frequency=new Param();Q=new Param();pan=new Param();delayTime=new Param();connections=[];connect(destination){this.connections.push(destination);return destination;}disconnect(){this.connections=[];}start(){}stop(...args){this.stopArgs=args;}}
  class Context{sampleRate=22050;currentTime=17;state='running';destination=new Node();nodes=[];make(){const n=new Node();this.nodes.push(n);return n;}createGain(){return this.make();}createBufferSource(){return this.make();}createBiquadFilter(){return this.make();}createOscillator(){return this.make();}createStereoPanner(){return this.make();}createBuffer(_channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}}
  const previousFetch=globalThis.fetch,previousContext=globalThis.AudioContext;globalThis.AudioContext=Context;globalThis.fetch=async()=>({ok:false});
  const audio=new HorrorAudio();try{
    audio.prepare();const prepared=audio.context;
    assert.equal(prepared.state,'suspended','loading prepares the audio device without playing sound');assert.equal(audio.master.gain.value,0);
    audio.prepare();assert.equal(audio.context,prepared,'repeated preparation reuses the device');
    audio.start();const ctx=audio.context;assert.equal(ctx,prepared,'the start gesture must reuse the already prepared device');assert.equal(ctx.state,'running');assert.ok(audio.master.gain.targets.at(-1)[0]>0,'only the start gesture enables sound');
    assert.ok(audio.haunt.connections.includes(audio.musicBus)&&audio.musicBus.connections.includes(audio.master));assert.ok(ctx.nodes.filter(n=>n.connections.includes(audio.haunt)).length>=7,'the drone voices and wind feed the music layer');assert.equal(audio.haunt.gain.value,0);
    assert.ok(audio.chase.connections.includes(audio.musicBus),'the chase score follows the music mixer');
    audio.setChase(.5);const tempo=audio.chasePulse.frequency.targets.at(-1)[0];audio.setChase(1);
    assert.ok(audio.chasePulse.frequency.targets.at(-1)[0]>tempo,'closer pursuit raises the pulse');
    audio.setChase(0);assert.equal(audio.chase.gain.targets.at(-1)[0],0,'hiding releases the chase score');
    audio.setHaunt(1);assert.deepEqual(audio.haunt.gain.targets.at(-1),[1,17,.65]);assert.deepEqual(audio.weather.gain.targets.at(-1),[.4,17,.9]);
    const count=audio.haunt.gain.targets.length;audio.setHaunt(1);assert.equal(audio.haunt.gain.targets.length,count,'steady frames do not reschedule fades');
    audio.mix({music:0,effects:.4,voice:.7});assert.equal(audio.musicBus.gain.targets.at(-1)[0],0);assert.equal(audio.voiceBus.gain.targets.at(-1)[0],.7);assert.equal(audio.effectsBus.gain.targets.at(-1)[0],.4);audio.setVolume(0);assert.equal(audio.master.gain.targets.at(-1)[0],0);audio.pause();assert.equal(ctx.state,'suspended');audio.resume();assert.equal(ctx.state,'running');
    audio.setDrive(9);assert.ok(audio.driveBus.connections.includes(audio.effectsBus),'engine and tyres follow the effects volume');assert.ok(audio.driveTone.frequency.targets.at(-1)[0]>50);audio.sound('glass');const shardSound=ctx.nodes.find(n=>n.buffer===audio.noise&&!n.loop);audio.setDrive(null);assert.deepEqual(shardSound.stopArgs,[],'skipping cancels pending collision sounds immediately');assert.equal(audio.driveBus.gain.targets.at(-1)[0],0,'skipping stops road audio');
    audio.clips['player-breath']={duration:5};audio.setExertion(1);const breathing=audio.exertionSource;assert.equal(breathing.loop,true);assert.ok(audio.exertion.connections.includes(audio.effectsBus));audio.setExertion(.4);assert.equal(audio.exertionSource,breathing,'recovery changes volume without restarting each breath');audio.setExertion(0);assert.equal(audio.exertion.gain.targets.at(-1)[0],0);
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


test('V65 answering tape stays positional and independent of apparition voices, then releases its nodes',()=>{
  class Param{value=0;targets=[];setTargetAtTime(...args){this.targets.push(args);}}
  class Node{gain=new Param();frequency=new Param();pan=new Param();connections=[];connect(n){this.connections.push(n);return n;}disconnect(){this.connections=[];this.disconnected=true;}start(){this.started=true;}stop(){this.stopped=true;}}
  class Context{currentTime=3;state='running';nodes=[];make(){const n=new Node();this.nodes.push(n);return n;}createBufferSource(){return this.make();}createBiquadFilter(){return this.make();}createGain(){return this.make();}createStereoPanner(){return this.make();}}
  const audio=new HorrorAudio(),ctx=new Context();audio.context=ctx;audio.voiceBus=new Node();audio.voices.memory={duration:5.36244898};const ghost=new Node();audio.voiceSource=ghost;
  try{audio.recording();const source=ctx.nodes.find(n=>n.buffer===audio.voices.memory);assert.ok(source?.started);assert.equal(ghost.stopped,undefined,'playing a physical tape must not replace a ghost voice');audio.setRecordingPosition(.35,-.7);const p=ctx.nodes.find(n=>n.connections.includes(audio.voiceBus));assert.equal(p.pan.value,-.7);assert.ok(ctx.nodes.some(n=>n.gain.targets.at(-1)?.[0]>0));audio.stopVoices();assert.equal(source.stopped,undefined,'ghost chatter cleanup cannot cut the tape');audio.stopRecording();assert.equal(source.stopped,true);assert.ok(ctx.nodes.every(n=>n.disconnected),'all tape nodes are released');}
  finally{audio.stopRecording?.();audio.context=null;}
});

test('V83 two physical devices keep independent playback positions and one hangup cannot cut the other',()=>{
 class Param{value=0;targets=[];setTargetAtTime(...args){this.targets.push(args);}}
 class Node{gain=new Param();frequency=new Param();pan=new Param();connections=[];connect(n){this.connections.push(n);return n;}disconnect(){this.connections=[];this.disconnected=true;}start(){this.started=true;}stop(){this.stopped=true;}}
 class Context{currentTime=3;state='running';nodes=[];make(){const n=new Node();this.nodes.push(n);return n;}createBufferSource(){return this.make();}createBiquadFilter(){return this.make();}createGain(){return this.make();}createStereoPanner(){return this.make();}}
 const audio=new HorrorAudio(),ctx=new Context();audio.context=ctx;audio.voiceBus=new Node();audio.clips['archive-guard']={duration:7.706122};audio.voices.cry={duration:5.2};
 try{audio.recording('archive-guard');const local=ctx.nodes.find(n=>n.buffer===audio.clips['archive-guard']);audio.recording('cry','intercom');const call=ctx.nodes.find(n=>n.buffer===audio.voices.cry);
  assert.equal(local.stopped,undefined,'a telephone answer cannot switch off a separate cassette');
  audio.setRecordingPosition(.2,-.7);audio.setRecordingPosition(.8,.6,'intercom');const localPan=local.connections[0].connections[0].connections[0],callPan=call.connections[0].connections[0].connections[0];assert.equal(localPan.pan.value,-.7);assert.equal(callPan.pan.value,.6);
  audio.stopRecording('intercom');assert.equal(call.stopped,true);assert.equal(local.stopped,undefined);assert.equal(localPan.disconnected,undefined);audio.stopRecording();assert.equal(local.stopped,true);assert.ok(ctx.nodes.every(n=>n.disconnected));
 }finally{audio.stopRecording();audio.context=null;}
});

test('V66 PBX tones have quiet intervals and bounded click-free audible bursts',async()=>{
 const {intercomTone}=await import('../lib/audio.ts');assert.equal(typeof intercomTone,'function');
 const ctx={sampleRate:8000,createBuffer(_channels,length){const data=new Float32Array(length);return {getChannelData:()=>data,duration:length/8000};}};
 for(const busy of [false,true]){const buffer=intercomTone(ctx,busy),data=buffer.getChannelData(0),on=busy?.25:1,period=busy?.5:3;assert.equal(buffer.duration,period);const power=(a,b)=>Math.sqrt(data.slice(a*8000,b*8000).reduce((sum,x)=>sum+x*x,0)/((b-a)*8000));assert.ok(power(.03,.13)>.05);assert.equal(power(on+.02,period-.02),0);assert.equal(data[0],0);assert.ok(Math.abs(data[Math.round(on*8000)-1])<.01);assert.ok(Math.max(...data.map(Math.abs))<.3);}
});
