import test from'node:test';import assert from'node:assert/strict';import{HorrorAudio}from'../lib/audio.ts';
class Param{setTargetAtTime(){}setValueAtTime(){}}
class Node{gain=new Param();frequency=new Param();pan=new Param();connect(){return this;}disconnect(){}start(...args){this.started=args;}stop(){}}
test('V135 the CCTV plea is silent even when its old clip is cached, while the lock sound remains',()=>{
 const a=new HorrorAudio(),sources=[];a.context={state:'running',currentTime:10,createBufferSource(){const n=new Node();sources.push(n);return n;},createBiquadFilter:()=>new Node(),createGain:()=>new Node(),createStereoPanner:()=>new Node()};a.voiceBus=new Node();const plea={duration:5},lock={duration:.1};a.clips['archive-plea']=plea;a.clips['archive-lock']=lock;a.setArchiveRecord({source:'gate',time:0,playing:true});assert.equal(sources.some(s=>s.buffer===plea),false);assert.equal(sources.length,1);assert.equal(sources[0].buffer,lock);assert.equal(sources[0].started[0],15.8);
});
