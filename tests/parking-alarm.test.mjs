import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld,hasLineOfSight,canStandAt} from '../lib/world.ts';
import {initialStory} from '../lib/story.ts';
import {HorrorAudio} from '../lib/audio.ts';
const ctx={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({getContext:()=>ctx})},configurable:true});

test('the garage fire call point has a supported physical pressed state and resets for retry',()=>{
 const w=buildWorld(new T.Scene(),'parking');try{
  const button=w.root.getObjectByName('fire-call-button'),pilot=w.root.getObjectByName('fire-alarm-pilot');assert.ok(button&&pilot,'the active call point must have real button and pilot geometry');
  const initial=button.position.z,target=w.targets.find(t=>t.id==='alarm');assert.equal(target.mesh,button);
  assert.ok(canStandAt(-10.8,17.4,w.solids,.23,w.bounds));assert.ok(hasLineOfSight({x:-10.8,y:1.65,z:17.4},target.point,w.solids));
  w.updateStory('parking_run',14,false,{...initialStory(),stage:'parking_run'});assert.ok(button.position.z<initial-.008,'a pressed button seats into its bezel');assert.ok(pilot.material.emissiveIntensity>.5);
  const panel=w.root.getObjectByName('fire-alarm-cabinet'),bounds=new T.Box3().setFromObject(panel);assert.ok(bounds.min.z<=15.94&&bounds.max.z>=16.019,'the cabinet is seated against the concrete mounting wall');
  w.updateStory('dying',15,false);assert.ok(button.position.z<initial-.008,'a latched call point cannot reset itself when the player is caught');
  w.reset();assert.equal(button.position.z,initial);assert.ok(pilot.material.emissiveIntensity<.2,'retry restores the inactive call point');
 }finally{disposeWorld(w.root);}
});

test('the fire bell uses its own continuous effects loop and releases its audio nodes',()=>{
 class Param{value=0;setTargetAtTime(v){this.value=v;}}
 class Node{gain=new Param();pan=new Param();connections=[];connect(n){this.connections.push(n);}disconnect(){this.connections=[];}start(){}stop(){this.stopped=true;}}
 const context={currentTime:1,createBufferSource:()=>new Node(),createGain:()=>new Node(),createStereoPanner:()=>new Node(),close:()=>Promise.resolve()};
 const a=new HorrorAudio();a.context=context;a.effectsBus=new Node();const bell={duration:2.4},radio={duration:9};a.clips['fire-bell']=bell;a.clips['radio-tuning-broadcast']=radio;
 a.setDevice('alarm',.8,-.6);const loop=a.deviceLoops.get('alarm');assert.equal(loop?.source.buffer,bell,'a fire alarm must never replay the radio broadcast');assert.equal(loop.source.loop,true);assert.equal(loop.pan.connections[0],a.effectsBus);
 a.setDevice('alarm',.2,.7);assert.equal(a.deviceLoops.get('alarm'),loop,'moving the listener must keep one uninterrupted loop');assert.equal(loop.pan.pan.value,.7);
 a.dispose();assert.equal(loop.source.stopped,true);assert.equal(a.deviceLoops.size,0,'teardown must disconnect the added ringing source');
});

test('the call button is physically seated on its mounting mechanism',()=>{
 const w=buildWorld(new T.Scene(),'parking');try{
  const button=w.root.getObjectByName('fire-call-button');w.root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(button),eye=new T.Vector3(-10.8,1.4,bounds.min.z+.001);
  const hit=new T.Raycaster(eye,new T.Vector3(0,0,-1),0,.2).intersectObject(w.root,true).find(h=>{for(let o=h.object;o;o=o.parent)if(o===button)return false;return h.object.isMesh;});
  assert.ok(hit&&hit.distance<.003,`the button needs a backing instead of floating off the panel: ${hit?.distance}`);
 }finally{disposeWorld(w.root);}
});
