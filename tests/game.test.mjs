import {archiveReplay} from '../lib/expansion-story.ts';
import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as realLighting from '../lib/lighting.ts';
import {opening,finale} from '../lib/story.ts';
import {accidentCar} from '../lib/chapters.ts';
import {apartment as home,homePosition as H,apartmentScale as S} from '../lib/apartment-layout.ts';

// Only device boundaries are replaced. Scene geometry, navigation, input,
// simulation timers, ray targets and story transitions run unchanged.
let renderedCamera,renderedScene;const voiceCalls=[],soundCalls=[];let hauntLevel=0,chaseLevel=0,breathLevel=0;const deviceLevels={phone:0,radio:0},deviceStarts={};
let pendingCompiles=null,rendererDisposals=0;
class Renderer{shadowMap={};getRenderTarget(){return null;}setRenderTarget(){}setPixelRatio(){}setSize(){}clearDepth(){}compileAsync(){return pendingCompiles?new Promise(resolve=>pendingCompiles.push(resolve)):Promise.resolve();}render(scene,camera){if(scene.name!=='first-person-hands'){renderedCamera=camera;renderedScene=scene;}}dispose(){rendererDisposals++;}}
mock.module('three',{namedExports:{...THREE,WebGLRenderer:Renderer}});
mock.module('../lib/lighting.ts',{namedExports:{...realLighting,roomReflections:()=>({dispose(){}})}});
mock.module('../lib/audio.ts',{namedExports:{HorrorAudio:class{prepare(){}start(){}voice(line){voiceCalls.push(line);}stopVoices(){}setTV(){}setDrive(){}setDevice(device,level){if(level>0&&!(deviceLevels[device]>0))deviceStarts[device]=(deviceStarts[device]??0)+1;deviceLevels[device]=level;}recorded(clip){soundCalls.push(clip);}setHaunt(value){hauntLevel=value;}setChase(value){chaseLevel=value;}setExertion(value){breathLevel=value;}setArchiveRecord(){}setVolume(){}mix(){}setRecordingPosition(){}stopRecording(){}recording(clip='memory'){voiceCalls.push(clip);}footstep(kind){soundCalls.push(kind);}pause(){}resume(){}sound(kind){soundCalls.push(kind);}dispose(){}}}});
let nextFrame,clock=0;
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},arc(){},fill(){}};
const doc=new EventTarget();Object.assign(doc,{createElement:()=>({width:0,height:0,getContext:()=>context}),pointerLockElement:null,hidden:false});
Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
const win=new EventTarget();Object.assign(win,{devicePixelRatio:1,matchMedia:()=>({matches:true})});Object.defineProperty(globalThis,'window',{value:win,configurable:true});
Object.assign(globalThis,{ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:fn=>{nextFrame=fn;return 1;},cancelAnimationFrame:()=>{nextFrame=undefined;}});
const {createGame}=await import('../lib/game.ts');
const event=(target,type,properties)=>{const e=new Event(type);Object.assign(e,properties);target.dispatchEvent(e);};
function tick(seconds=.05){for(let left=seconds;left>0;left-=.025){clock+=Math.min(.025,left)*1000;nextFrame(clock);}}

async function officeAgencyInput(saved){
 const previous=win.localStorage,data=new Map([['homecoming.progress.v2',JSON.stringify({version:2,stage:'office_record',notes:[],elapsed:500,officeSupply:false,...saved})]]);win.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));await game.ready;tick();game.continueGame();tick();
 function use(pos,at){renderedCamera.position.set(...pos);const d=new THREE.Vector3(...at).sub(renderedCamera.position),yaw=Math.atan2(-d.x,-d.z),pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();assert.ok(game.snapshot().prompt,'actual office item/control remains usable');game.interact();tick();}
 return {game,data,use,canvas,close(){game.dispose();win.localStorage=previous;}};
}
test('V107 unseen outdoor hiding keeps the chapter live while the ghost searches and passes',async()=>{
 const f=await officeAgencyInput({stage:'parking_alarm',notes:['plant_drained','car_search'],elapsed:1400});try{
  const cabinet=renderedScene.getObjectByName('shelter-parking-0');assert.ok(cabinet,'the shelter must be actual scene geometry');const s=cabinet.userData.shelter,ghost=renderedScene.getObjectByName('resident-remains');ghost.visible=false;
  f.use([s.exit.x,1.65,s.exit.z],s.target.point.toArray());assert.equal(f.game.snapshot().story.hidden,true);const stage=f.game.snapshot().story.stage,elapsed=f.game.snapshot().elapsed;
  ghost.position.set(s.approach.x+3,0,s.approach.z);ghost.visible=true;tick(15);
  assert.equal(f.game.snapshot().story.hidden,true);assert.equal(f.game.snapshot().story.stage,stage);assert.ok(f.game.snapshot().elapsed>elapsed+14);assert.ok(ghost.position.distanceTo(renderedCamera.position)>3,'the pursuer actually moves away, giving an exit window');
  f.game.interact();tick();assert.equal(f.game.snapshot().story.hidden,false);assert.equal(f.game.snapshot().story.stage,stage);assert.equal(f.game.snapshot().paused,false);
 }finally{f.close();}
});

test('V107 a gallery shelter remains usable while the lift arrives and preserves bounded peeking',async()=>{
 const f=await officeAgencyInput({stage:'lift_call',notes:[],elapsed:200});try{
  f.use([.2,1.65,-20.65],[.95,1.25,-22.55]);assert.equal(f.game.snapshot().story.stage,'lift_wait');
  const s=renderedScene.getObjectByName('shelter-landing-2').userData.shelter;
  f.use([s.exit.x,1.65,s.exit.z],s.target.point.toArray());assert.equal(f.game.snapshot().story.hidden,true);assert.equal(f.game.snapshot().flashlight,false);
  const before=renderedCamera.position.clone(),yaw=renderedCamera.rotation.y;event(f.canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:2});event(doc,'pointermove',{clientX:800,clientY:0});event(doc,'pointerup',{});tick();
  assert.ok(Math.abs(renderedCamera.rotation.y-yaw)<=.551);f.game.key('KeyW',true);tick(.3);f.game.key('KeyW',false);assert.ok(renderedCamera.position.distanceTo(before)<.001);
  tick(6.6);assert.equal(f.game.snapshot().story.stage,'lift_enter','the lift clock continues while concealed');assert.equal(f.game.snapshot().story.hidden,true);f.game.interact();assert.equal(f.game.snapshot().story.hidden,false);assert.equal(f.game.snapshot().flashlight,true);
 }finally{f.close();}
});

test('V107 crouched stair hiding exits at the same supported crouch height',async()=>{
 const f=await officeAgencyInput({stage:'stairs_loop',notes:[],elapsed:400});try{
  const s=renderedScene.getObjectByName('shelter-stairs-0').userData.shelter;f.game.crouch();f.use([s.exit.x,s.exit.y+1,s.exit.z],s.target.point.toArray());assert.equal(f.game.snapshot().story.hidden,true);f.game.interact();assert.equal(f.game.snapshot().story.hidden,false);assert.ok(Math.abs(renderedCamera.position.y-(s.exit.y+1))<.001,'leaving cannot stand the camera up for one frame');assert.equal(f.game.snapshot().crouched,true);
 }finally{f.close();}
});

test('V107 hiding keeps the handheld torch off for both keyboard and touch inputs',async()=>{
 const f=await officeAgencyInput({stage:'parking_alarm',notes:['plant_drained','car_search'],elapsed:1400});try{
  const s=renderedScene.getObjectByName('shelter-parking-0').userData.shelter;renderedScene.getObjectByName('resident-remains').visible=false;
  f.use([s.exit.x,1.65,s.exit.z],s.target.point.toArray());event(doc,'keydown',{code:'KeyF',repeat:false});assert.equal(f.game.snapshot().flashlight,false);f.game.torch();assert.equal(f.game.snapshot().flashlight,false);f.game.interact();assert.equal(f.game.snapshot().flashlight,true);
 }finally{f.close();}
});

test('V107 a witnessed hiding entry is searched and cannot grant immunity',async()=>{
 const f=await officeAgencyInput({stage:'parking_alarm',notes:['plant_drained','car_search'],elapsed:1400});try{
  const cabinet=renderedScene.getObjectByName('shelter-parking-0');assert.ok(cabinet);const s=cabinet.userData.shelter,ghost=renderedScene.getObjectByName('resident-remains');ghost.visible=true;ghost.position.set(s.approach.x+2.5,0,s.approach.z);ghost.rotation.y=-Math.PI/2;
  f.use([s.exit.x,1.65,s.exit.z],s.target.point.toArray());assert.equal(f.game.snapshot().story.hidden,true);tick(10);assert.equal(f.game.snapshot().story.ending,'caught');assert.equal(f.game.snapshot().story.hidden,false);
 }finally{f.close();}
});

test('V106 visible resident key can be picked up across its blade without pixel hunting',async()=>{
 const f=await officeAgencyInput({stage:'resident_entry',notes:['resident_drawer'],elapsed:350});try{
  tick(1.2);const key=renderedScene.getObjectByName('resident-study-key-tag'),aim=key.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(-.12,.005,0));
  f.use([3.06,1.65,-3.1],aim.toArray());assert.ok(f.game.snapshot().story.notes.includes('resident_key'),'looking at the exposed blade must collect the actual key, not the drawer handle');assert.equal(f.game.snapshot().story.stage,'resident_return');
  const saved=JSON.parse(f.data.get('homecoming.progress.v2'));assert.ok(saved.notes.includes('resident_key'));assert.equal(renderedScene.getObjectByName('resident-study-key').visible,false);
 }finally{f.close();}
});

test('V106 a detected late-game player triggers a scream and closing burst, with lower ambient fill',async()=>{
 const f=await officeAgencyInput({stage:'parking_alarm',notes:['plant_drained','car_search'],elapsed:1400});try{
  renderedCamera.position.set(2,1.65,0);const ghost=renderedScene.getObjectByName('resident-remains');ghost.position.set(2,0,11);ghost.rotation.y=Math.PI;voiceCalls.length=0;tick(2.9);
  ghost.position.set(2,0,11);ghost.rotation.y=Math.PI;tick(.1);const before=ghost.position.z;tick(1.6);
  assert.ok(voiceCalls.includes('scream'),'active pursuit must audibly threaten the player '+JSON.stringify({voices:voiceCalls,before,after:ghost.position.toArray(),player:renderedCamera.position.toArray(),threat:f.game.snapshot().threat,stage:f.game.snapshot().story.stage}));assert.ok(before-ghost.position.z>3.8,'late chase must close distance faster than walking');
  const ambient=renderedScene.children.find(o=>o.isHemisphereLight);assert.ok(ambient.intensity<=.18,'unlit parking should not have broad bright ambient fill');assert.ok(chaseLevel>.4);
 }finally{f.close();}
});

test('V91 real input takes the visible key first and powers only the lift without forced CCTV',async()=>{
 const f=await officeAgencyInput();try{
  f.use([-2.13,1.65,2.45],[-2.13,.82,1.28]);assert.ok(f.game.snapshot().story.notes.includes('service_key'));assert.equal(renderedScene.getObjectByName('office-exit-key').visible,false);
  f.use([-2.1,1.65,-4.95],[-2.1,1.17,-5.7]);assert.ok(f.game.snapshot().story.notes.includes('fuse'));f.use([4.55,1.65,-4.55],[5.39,1.02,-4.55]);f.use([4.55,1.65,-3.45],[5.34,1.45,-3.45]);f.use([4.55,1.65,-3.45],[5.39,.95,-3.45]);
  const s=f.game.snapshot().story;assert.equal(s.stage,'office_leave');assert.equal(s.officeSupply,true);assert.deepEqual(s.circuit,['circuit_c']);assert.equal(s.notes.includes('record'),false);assert.equal(s.notes.includes('monitor'),false);const stored=JSON.parse(f.data.get('homecoming.progress.v2'));assert.equal(stored.officeSupply,true);assert.deepEqual(stored.circuit,['circuit_c']);
  f.use([0,1.65,-6.5],[0,1.25,-7.48]);assert.equal(f.game.snapshot().story.stage,'office_departure');tick(1);assert.ok(renderedScene.getObjectByName('office-service-door').rotation.y>1.2);assert.equal(f.game.snapshot().paused,false);
 }finally{f.close();}
});
test('V91 switching CCTV power off interrupts the actual recording and restores a fresh replay clock',async()=>{
 const f=await officeAgencyInput({notes:['fuse','office_install','security_power'],circuit:['circuit_b'],officeSupply:true});try{
  const feed=renderedScene.getObjectByName('surveillance-screen').userData.surveillance,update=feed.update,frames=[];feed.update=function(...args){frames.push({stage:args[0],time:args[1]});return update.apply(this,args);};
  f.use([-1.95,1.65,2.6],[-1.95,.9,1.8]);f.use([-2.65,1.65,2.65],[-2.65,1.137,1.80]);assert.equal(f.game.snapshot().story.stage,'office_playback');tick(3);
  f.use([4.55,1.65,-4],[5.34,1.45,-4]);assert.equal(f.game.snapshot().story.officeSupply,false);assert.equal(f.game.snapshot().story.stage,'office_power');tick(5);assert.equal(f.game.snapshot().story.notes.includes('monitor'),false);
  f.use([4.55,1.65,-4],[5.34,1.45,-4]);f.use([4.55,1.65,-3.45],[5.39,.95,-3.45]);frames.length=0;f.use([-2.65,1.65,2.65],[-2.65,1.137,1.80]);const ghost=renderedScene.getObjectByName('resident-remains'),before=ghost.position.clone();tick(2);
  assert.equal(f.game.snapshot().story.stage,'office_playback');assert.equal(f.game.snapshot().story.notes.includes('monitor'),false);const playback=frames.filter(f=>f.stage==='office_playback');assert.ok(playback.length>20);assert.ok(playback[0].time<.1&&playback.at(-1).time<2.2,'the actual surveillance consumer receives a new recording clock');assert.ok(ghost.position.distanceTo(before)>.1,'the live pursuer is not paused for CCTV');
 }finally{f.close();}
});

test('V93 real safe confirmation exposes an actionable key under continuous physical occlusion',async()=>{
 const f=await officeAgencyInput({stage:'court_code',code:'2617',notes:[],elapsed:950});try{
  const safe=renderedScene.getObjectByName('courtyard-key-safe'),handle=safe.getObjectByName('safe-unlock-handle').getWorldPosition(new THREE.Vector3());handle.z+=.02;
  f.use([25,1.65,31.65],handle.toArray());assert.equal(f.game.snapshot().story.stage,'court_safe_open');tick(1.3);
  const key=safe.getObjectByName('courtyard-basement-key').getWorldPosition(new THREE.Vector3());f.use([25,1.65,31.65],key.toArray());assert.equal(f.game.snapshot().story.stage,'court_unlocked');assert.ok(f.game.snapshot().story.notes.includes('court_key'));assert.equal(f.game.snapshot().paused,false);
 }finally{f.close();}
});

test('V90 reading a real gallery notice cannot restart the lift arrival clock',async()=>{
 const previous=win.localStorage,data=new Map([['homecoming.progress.v2',JSON.stringify({version:2,stage:'lift_call',notes:[],elapsed:200})]]);win.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 function aim(pos,target){renderedCamera.position.set(...pos);const d=new THREE.Vector3(...target).sub(renderedCamera.position),yaw=Math.atan2(-d.x,-d.z),pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();assert.ok(game.snapshot().prompt,'actual mounted target is usable');}
 try{await game.ready;tick();game.continueGame();tick();aim([.2,1.65,-20.65],[.95,1.25,-22.55]);game.interact();assert.equal(game.snapshot().story.stage,'lift_wait');tick(3);
  const paper=renderedScene.getObjectByName('gallery-notice-paper');assert.ok(paper,'notice is real world geometry');aim([.15,1.65,-19.8],paper.getWorldPosition(new THREE.Vector3()).toArray());game.interact();assert.ok(game.snapshot().story.notes.includes('gallery_notice'));assert.equal(game.snapshot().paused,false);tick(3.2);assert.equal(game.snapshot().story.stage,'lift_enter','the original arrival clock continues while reading');assert.ok(JSON.parse(data.get('homecoming.progress.v2')).notes.includes('gallery_notice'));
 }finally{game.dispose();win.localStorage=previous;}
});

test('V77 real office input installs its fuse and chooses loads before operating the relay',async()=>{
 const previous=win.localStorage,data=new Map([['homecoming.progress.v2',JSON.stringify({version:2,stage:'office_record',notes:[],elapsed:500,pursuit:false})]]);win.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 function use(pos,target){renderedCamera.position.set(...pos);const d=new THREE.Vector3(...target).sub(renderedCamera.position),yaw=Math.atan2(-d.x,-d.z),pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();assert.ok(game.snapshot().prompt,'real target prompt at '+target);game.interact();tick();}
 try{await game.ready;tick();game.continueGame();tick();use([-3.7,1.65,2.6],[-3.7,.86,1.8]);assert.equal(game.snapshot().story.stage,'office_fuse');use([-2.1,1.65,-4.95],[-2.1,1.17,-5.7]);assert.equal(game.snapshot().story.stage,'office_power');
  assert.ok(renderedScene.getObjectByName('office-fuse-installed'));use([4.55,1.65,-4.55],[5.39,1.02,-4.55]);assert.ok(game.snapshot().story.notes.includes('office_install'));
  use([4.55,1.65,-4],[5.34,1.45,-4]);use([4.55,1.65,-4.55],[5.34,1.45,-4.55]);use([4.55,1.65,-3.45],[5.39,.95,-3.45]);assert.equal(game.snapshot().story.stage,'office_tape');assert.equal(game.snapshot().story.officeSupply,true);assert.deepEqual(game.snapshot().story.circuit,['circuit_b','circuit_a']);
  use([4.55,1.65,-4.55],[5.34,1.45,-4.55]);use([4.55,1.65,-3.45],[5.34,1.45,-3.45]);const record=JSON.parse(data.get('homecoming.progress.v2'));assert.equal(record.stage,'office_power');assert.ok(record.notes.includes('office_install'));
  assert.equal(game.snapshot().story.officeSupply,false,'changing selected loads cuts the main supply');voiceCalls.length=0;use([4.55,1.65,-3.45],[5.39,.95,-3.45]);assert.equal(game.snapshot().story.stage,'office_tape');assert.ok(renderedScene.getObjectByName('resident-remains').position.z>11,'a powered panel cannot move the incoming ghost indoors');assert.equal(voiceCalls.includes('cry'),false);
 }finally{game.dispose();win.localStorage=previous;}
});
test('V77 continuing a completed office recording releases the real waiting pursuer',async()=>{
 const previous=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'office_record',notes:['record','monitor'],elapsed:520,pursuit:false}):null,setItem(){}};const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{await game.ready;tick();game.continueGame();tick();assert.equal(game.snapshot().story.stage,'office_key');renderedCamera.position.set(-3.7,1.65,2.6);const ghost=renderedScene.getObjectByName('resident-remains'),before=ghost.position.clone();tick(8);assert.ok(renderedScene.getObjectByName('connection-fire-door').rotation.y<-1.2,'restoring after CCTV cannot leave the pursuer locked outside');assert.ok(ghost.position.distanceTo(before)>.5);assert.equal(renderedScene.getObjectByName('office-fuse-installed').visible,true);
 }finally{game.dispose();win.localStorage=previous;}
});

test('V75 real resident input opens the physical drawer, earns its key and cannot postpone the returning pursuer with a late record',async()=>{
 const previous=win.localStorage,data=new Map([['homecoming.progress.v2',JSON.stringify({version:2,stage:'resident_entry',notes:['belongings','answerphone','portrait'],elapsed:100})]]);win.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 function aim(pos,target){renderedCamera.position.set(...pos);const dx=target[0]-pos[0],dy=target[1]-pos[1],dz=target[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();}
 function use(pos,name){const mesh=renderedScene.getObjectByName(name);assert.ok(mesh,name);aim(pos,mesh.getWorldPosition(new THREE.Vector3()).toArray());assert.ok(game.snapshot().prompt,name+' must have a real input prompt');game.interact();}
 try{await game.ready;tick();game.continueGame();tick();assert.equal(game.snapshot().story.stage,'resident_entry','three old records do not imply physical key possession');aim([0,1.65,-4.6],[0,1.25,-5.65]);game.interact();assert.equal(game.snapshot().story.stage,'resident_entry');assert.match(game.snapshot().message,/열쇠/);
  use([3,1.65,-3.1],'resident-drawer-handle');tick(1);assert.ok(game.snapshot().story.notes.includes('resident_drawer'));use([3.06,1.65,-3.1],'resident-study-key-tag');assert.equal(game.snapshot().story.stage,'resident_return');assert.ok(game.snapshot().story.notes.includes('resident_key'));tick();assert.equal(renderedScene.getObjectByName('resident-study-key').visible,false);assert.ok(JSON.parse(data.get('homecoming.progress.v2')).notes.includes('resident_key'));
  tick(3);use([2.45,1.65,-3.1],'resident-shift-page');assert.equal(game.snapshot().story.stage,'resident_return');const ghost=renderedScene.getObjectByName('resident-remains'),before=ghost.position.clone();tick(1.5);assert.ok(ghost.visible&&ghost.position.distanceTo(before)>.1,'a late optional record cannot reset the return grace period');aim([0,1.65,-4.6],[0,1.25,-5.65]);game.interact();assert.equal(game.snapshot().story.stage,'resident_departure');
 }finally{game.dispose();win.localStorage=previous;}
});
test('V75 continuing with the resident key preserves the open desk and consumed pickup',async()=>{
 const previous=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'resident_entry',notes:['resident_drawer','resident_key'],elapsed:200}):null,setItem(){}};const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{await game.ready;tick();game.continueGame();tick();assert.equal(game.snapshot().story.stage,'resident_return');assert.equal(renderedScene.getObjectByName('resident-study-key').visible,false);tick(1);assert.ok(renderedScene.getObjectByName('resident-study-drawer').position.z>.4);assert.match(game.snapshot().objective,/연결문/);}finally{game.dispose();win.localStorage=previous;}
});

test('V75 a new optional record after key restore does not restart the entrance scare',async()=>{
 const previous=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'resident_entry',notes:['resident_drawer','resident_key'],elapsed:200}):null,setItem(){}};const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{await game.ready;tick();game.continueGame();tick();const page=renderedScene.getObjectByName('resident-shift-page'),at=page.getWorldPosition(new THREE.Vector3()),pos=[2.45,1.65,-3.1];renderedCamera.position.set(...pos);const d=at.clone().sub(renderedCamera.position),yaw=Math.atan2(-d.x,-d.z),pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();soundCalls.length=0;game.interact();assert.ok(game.snapshot().story.notes.includes('resident_shift'));assert.equal(soundCalls.includes('knock'),false,'an optional record is not another key pickup');assert.equal(renderedScene.getObjectByName('resident-remains').visible,false,'the original remaining entrance delay is retained');}finally{game.dispose();win.localStorage=previous;}
});

test('leaving while shaders compile stops frames and defers GPU disposal until both scenes finish',async()=>{
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  pendingCompiles=[];const game=createGame(canvas,()=>{},()=>{}),jobs=pendingCompiles;pendingCompiles=null;
  const before=rendererDisposals;assert.equal(jobs.length,2);game.dispose();game.dispose();
  assert.equal(nextFrame,undefined);assert.equal(rendererDisposals,before);
  jobs[0]();await Promise.resolve();assert.equal(rendererDisposals,before,'hands compilation still owns its materials');
  jobs[1]();await game.ready;await Promise.resolve();assert.equal(rendererDisposals,before+1);
});

function laterShadersQueued(jobs){
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('later room shader submissions are still serialized')),3000),push=jobs.push;
  jobs.push=function(...calls){const size=push.apply(this,calls);if(size>3){clearTimeout(timeout);resolve();}return size;};
 });
}
test('startup queues later scene shaders before waiting for the first later scene',async()=>{
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
 pendingCompiles=[];const game=createGame(canvas,()=>{},e=>assert.fail(e)),jobs=pendingCompiles;
 try{
  assert.equal(jobs.length,2);const queued=laterShadersQueued(jobs);jobs[0]();jobs[1]();await queued;
  assert.ok(jobs.length>3,'a slow shader from the first later room must not serialize all other rooms');
 }finally{
  pendingCompiles=null;for(const resolve of jobs)resolve();await game.ready;game.dispose();
 }
});

test('leaving during the startup shader batch retains GPU resources until the entire batch settles',async()=>{
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
 pendingCompiles=[];const game=createGame(canvas,()=>{},e=>assert.fail(e)),jobs=pendingCompiles,before=rendererDisposals;
 try{
  const queued=laterShadersQueued(jobs);jobs[0]();jobs[1]();await queued;assert.ok(jobs.length>3);
  game.dispose();pendingCompiles=null;
  for(const resolve of jobs.slice(0,-1))resolve();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(rendererDisposals,before,'the last shader still owns its GPU resources');
  jobs.at(-1)();await game.ready;await Promise.resolve();assert.equal(rendererDisposals,before+1);
 }finally{pendingCompiles=null;for(const resolve of jobs)resolve();await game.ready;game.dispose();}
});

test('a close divider stays within the held flashlight shadow frustum',()=>{
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},()=>{});tick();game.start();game.skipMemory();tick(7);
  renderedCamera.position.set(2.220584,1.65,0);
  event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});
  event(doc,'pointermove',{clientX:-(-Math.PI/2-renderedCamera.rotation.y)/.0021,clientY:0});event(doc,'pointerup',{});tick();
  const light=renderedScene.children.find(o=>o instanceof THREE.SpotLight&&o.distance===24);
  renderedScene.updateMatrixWorld(true);light.shadow.updateMatrices(light);
  const occluder=new THREE.Vector3(2.4607,light.position.y,light.position.z);
  const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(light.shadow.camera.projectionMatrix,light.shadow.camera.matrixWorldInverse));
  assert.ok(frustum.containsPoint(occluder),'the nearby wall must cast a shadow into the next room');game.dispose();
});

test('real interaction loop reaches the ending, requires a held pry, and freezes on pause',async()=>{
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const media=win.matchMedia;win.matchMedia=query=>({matches:query.includes('pointer:coarse')});
  const errors=[];const game=createGame(canvas,()=>{},e=>errors.push(e));await game.ready;win.matchMedia=media;tick();game.start();game.skipMemory();tick();
  event(win,'blur',{});event(doc,'pointerlockchange',{});assert.equal(game.snapshot().paused,false,'losing focus or pointer lock must not open a pause menu');
  doc.hidden=true;event(doc,'visibilitychange',{});const backgroundAt=game.snapshot().elapsed;tick(5);assert.equal(game.snapshot().paused,false);assert.equal(game.snapshot().elapsed,backgroundAt);doc.hidden=false;event(doc,'visibilitychange',{});
  assert.equal(game.snapshot().story.stage,'wake_ring');assert.equal(game.snapshot().hasFlashlight,false);
  const seated=renderedCamera.position.toArray();game.key('KeyW',true);tick(.2);game.key('KeyW',false);assert.deepEqual(renderedCamera.position.toArray(),seated,'waking starts in bed');
  game.pause();const beforePause=game.snapshot().elapsed;tick(10);assert.equal(game.snapshot().elapsed,beforePause);game.pause(false);
  tick(5);assert.equal(game.snapshot().story.stage,'light_switch');assert.equal(renderedScene.getObjectByName('apartment-lamp-0').intensity,0);assert.equal(renderedCamera.position.y,1.65);
  game.torch();assert.equal(game.snapshot().flashlight,false,'cannot use a torch before finding it');
  game.crouch();tick(.1);assert.equal(renderedCamera.position.y,1);game.crouch();tick(.1);assert.equal(renderedCamera.position.y,1.65);
  function aim(pos,target,check=true){
    renderedCamera.position.set(...pos);
    const dx=target[0]-pos[0],dy=target[1]-pos[1],dz=target[2]-pos[2];
    const yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));
    event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});
    event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});
    event(doc,'pointerup',{});tick();
    if(check)assert.ok(game.snapshot().prompt,`target prompt at ${pos}`);
  }
  function use(pos,target,stage){aim(pos,target);game.interact();assert.equal(game.snapshot().story.stage,stage);tick();}
  function runTo(x,z){const pos=renderedCamera.position.toArray();aim(pos,[x,pos[1],z],false);game.key('KeyW',true);game.key('ShiftLeft',true);let i=0;while(Math.hypot(renderedCamera.position.x-x,renderedCamera.position.z-z)>.09&&i++<12000&&!['dying','ended'].includes(game.snapshot().story.stage)){if(i%8===0)aim(renderedCamera.position.toArray(),[x,renderedCamera.position.y,z],false);tick(.0125);}game.key('KeyW',false);game.key('ShiftLeft',false);assert.ok(!['dying','ended'].includes(game.snapshot().story.stage),`survive route to ${x},${z}`);assert.ok(Math.hypot(renderedCamera.position.x-x,renderedCamera.position.z-z)<.15,`walkable route to ${x},${z}, actual ${renderedCamera.position.toArray()}`);}


  const runHome=(x,z)=>runTo(x*S,z*S),useHome=(pos,target,stage)=>use(H(...pos),H(...target),stage);
  use([home.switch[0]+.9,1.65,home.switch[2]],home.switch,'find_torch');
  use([home.flashlight[0],1.65,home.flashlight[2]-1],home.flashlight,'power');assert.equal(game.snapshot().flashlight,true);
  runHome(3.65,1.8);runHome(0,1.8);
  runHome(0,-1.4);runHome(2.9,-1.4);runHome(2.9,-4.1);
  useHome([3,1.65,-4.3],[2.05,1.6,-4.75],'phone');
  assert.equal(renderedScene.getObjectByName('apartment-lamp-0').intensity,0,'the broken breaker must not restore apartment lighting');
  runHome(2.9,-1.4);runHome(0,-1.4);runHome(-2.1,0);runHome(-2.1,2.4);
  useHome([-2.1,1.65,2.4],[-3.15,.58,2.4],'shoes');
  assert.ok(soundCalls.includes('wet-drop'),'the entrance evidence is introduced with its actual impact sound');
  runHome(-2.1,0);runHome(0,0);runHome(0,-3.5);
  useHome([0,1.65,-3.5],[0,.2,-4.65],'radio');
  assert.equal(deviceLevels.radio,0,'the radio waits until the discovery reaction has finished');
  const evidencePosition=renderedCamera.position.toArray();
  game.key('KeyW',true);tick(.8);game.key('KeyW',false);
  assert.deepEqual(renderedCamera.position.toArray(),evidencePosition,'the short inspection stays at the discovered evidence');
  assert.match(game.snapshot().message,/뭐야, 이게/);assert.equal(soundCalls.filter(c=>c==='player-evidence').length,0,'the discovery reaction is subtitle-only');
  game.interact();assert.match(game.snapshot().message,/뭐야, 이게/,'repeated interaction must not replace the reaction');
  game.pause();const reactionTime=game.snapshot().elapsed;tick(6);assert.equal(game.snapshot().elapsed,reactionTime);assert.equal(deviceLevels.radio,0);game.pause(false);
  tick(2.5);assert.match(game.snapshot().message,/도로에 두고 왔는데/);
  const shoePitch=renderedCamera.rotation.x;tick(1.5);assert.ok(renderedCamera.rotation.x<shoePitch-.03,'the gaze follows the water closer to the player');
  tick(1.5);assert.ok(deviceLevels.radio>0,'the radio leads into the next objective after the reaction');
  useHome([0,1.65,-3.5],[0,.2,-4.65],'radio');assert.equal(soundCalls.filter(c=>c==='player-evidence').length,0,'revisiting the evidence remains silent');
  runHome(0,2);runHome(2.75,2);runHome(2.75,3.9);
  useHome([2.75,1.65,3.9],[2.75,1.1,5.15],'listen');
  tick(1);assert.equal(game.snapshot().story.stage,'listen','there is a silence after turning the radio off');
  game.pause();tick(5);assert.equal(game.snapshot().story.stage,'listen');game.pause(false);
  tick(2);assert.equal(game.snapshot().story.stage,'hide');assert.match(game.snapshot().objective,/장롱/);assert.ok(chaseLevel>.4,'the first direct pursuit raises the chase score');
  assert.equal(renderedScene.getObjectByName('front-door').rotation.y,0,'the reveal comes from inside; the front door stays closed');
  assert.equal(renderedScene.getObjectByName('apartment-lamp-0').intensity,0,'the apartment stays dark throughout the encounter');
  runHome(2.75,2);runHome(4.65,1.55);
  useHome([4.65,1.65,1.55],[5.43,1.25,1.55],'wait');assert.equal(chaseLevel,0,'hiding releases the chase score');
  for(let i=0;i<1600&&!/어디 있지/.test(game.snapshot().whisper);i++)tick(.025);assert.match(game.snapshot().whisper,/어디 있지/);game.pause();tick(4);assert.match(game.snapshot().whisper,/어디 있지/);game.pause(false);
  for(let i=0;i<2400&&game.snapshot().story.stage==='wait';i++)tick(.025);assert.equal(game.snapshot().story.stage,'escape','ghost patrol must reach the other room');
  game.interact();assert.equal(game.snapshot().story.hidden,false);
  runHome(0,1.55);runHome(0,-4.7);
  aim([0,1.65,home.door[2]+.7],[0,1.65,home.door[2]-1],false);
  game.interact();assert.equal(game.snapshot().story.stage,'escape','E cannot teleport through the home door');
  game.key('KeyW',true);for(let i=0;i<60&&game.snapshot().story.stage==='escape';i++)tick(.025);game.key('KeyW',false);assert.equal(game.snapshot().story.stage,'lift_call','walking through the doorway exits the home');
  const emerging=renderedScene.getObjectByName('resident-remains');assert.ok(emerging.position.x>1.3,'pursuer begins inside the home doorway');assert.equal(emerging.position.z,20.5);assert.ok(renderedScene.getObjectByName('2803-open-door'));
  runTo(0,20.5);runTo(0,-21.2);assert.ok(emerging.position.x<1.3,'pursuer has walked out into the gallery');use([.95,1.65,-21.2],[.95,1.25,-22.55],'lift_wait');
  tick(5.5);assert.equal(game.snapshot().story.stage,'lift_enter');
  aim([0,1.65,-21.2],[0,1.65,-25],false);game.interact();assert.equal(game.snapshot().story.stage,'lift_enter');
  game.key('KeyW',true);for(let i=0;i<70&&game.snapshot().story.stage==='lift_enter';i++)tick(.025);game.key('KeyW',false);assert.equal(game.snapshot().story.stage,'lift_boarding');
  const pursuer=renderedScene.getObjectByName('resident-remains'),leaf=renderedScene.getObjectByName('lift-door-left');pursuer.position.set(0,0,-21.7);const at=pursuer.position.z;
  tick(.3);assert.ok(pursuer.position.z<at-.2,'pursuit continues during door closure');assert.equal(game.snapshot().story.stage,'lift_boarding');
  game.pause();const stoppedLeaf=leaf.position.x;tick(4);assert.equal(leaf.position.x,stoppedLeaf);game.pause(false);
  game.key('KeyS',true);tick(.3);game.key('KeyS',false);assert.ok(renderedCamera.position.z<=-23.25,'boarding stays committed inside the cab');assert.ok(pursuer.position.z>=-22.27,'ghost cannot enter the boarded cab');
  tick(3);assert.equal(game.snapshot().story.stage,'lift_button');
  use([0,1.65,-.45],[.92,1.3,-.45],'descent');
  tick(8);assert.equal(game.snapshot().liftFloor,26);
  const pausedAt=game.snapshot().elapsed;game.pause();tick(3);assert.equal(game.snapshot().elapsed,pausedAt);game.pause(false);
  tick(2.8);assert.equal(renderedScene.getObjectByName('lift-door-hand'),undefined);
  tick(5.3);assert.equal(game.snapshot().story.stage,'pry');assert.equal(game.snapshot().liftFloor,24);
  aim([0,1.65,-.15],[0,1.3,-1.13]);game.interact();assert.equal(game.snapshot().story.stage,'pry','click alone must not pry the door');
  game.key('KeyE',true);tick(1);assert.ok(game.snapshot().holdProgress>.3&&game.snapshot().holdProgress<.4);
  game.pause();tick(4);assert.equal(game.snapshot().story.stage,'pry');assert.equal(game.snapshot().holdProgress,0);game.pause(false);
  game.hold(true);tick(3.1);game.hold(false);assert.equal(game.snapshot().story.stage,'lift_exit');tick(1);
  aim([0,1.65,-.15],[0,1.65,-3],false);game.interact();assert.equal(game.snapshot().story.stage,'lift_exit','E does not exit the lift');game.crouch();game.key('KeyW',true);for(let i=0;i<100&&game.snapshot().story.stage==='lift_exit';i++)tick(.025);game.key('KeyW',false);assert.equal(game.snapshot().story.stage,'corridor_run');assert.equal(game.snapshot().crouched,true);assert.ok(Math.abs(renderedCamera.position.y-1)<.03);game.crouch();tick();
  assert.ok(renderedScene.getObjectByName('lift-ceiling-hatch'));assert.ok(renderedScene.getObjectByName('resident-remains').position.y>2,'pursuer starts above the cab');
  runTo(-2.6,16);runTo(-2.6,-16);runTo(0,-18.5);
  use([0,1.65,-18.5],[0,1.25,-19.68],'corridor_departure');tick(1);runTo(0,-22);aim(renderedCamera.position.toArray(),[3,1.65,-22],false);game.key('KeyW',true);for(let i=0;i<150&&game.snapshot().story.stage==='corridor_departure';i++)tick(.025);game.key('KeyW',false);assert.equal(game.snapshot().story.stage,'stairs_loop');runTo(0,10);runTo(0,5.5);
  use([1,-1.15,-4.8],[1,-1.55,-5.65],'stairs_descent');tick(1);runTo(1,-7.85);runTo(4,-7.85);aim(renderedCamera.position.toArray(),[4,-1.15,-13],false);game.key('KeyW',true);for(let i=0;i<150&&game.snapshot().story.stage==='stairs_descent';i++)tick(.025);game.key('KeyW',false);assert.equal(game.snapshot().story.stage,'stairs_clue');
  use([5.25,-1.15,-13.35],[5.25,-1.15,-12.15],'stairs_reverse');assert.equal(game.snapshot().floor,'17F');
  use([3,1.65,-22.65],[3,1.25,-23.5],'stairs_passage');
  assert.equal(renderedScene.getObjectByName('resident-1704'),undefined,'opening the stair door does not teleport into a home');
    tick(1);aim(renderedCamera.position.toArray(),[3,1.65,-25.5],false);game.key('KeyW',true);for(let i=0;i<220&&game.snapshot().story.stage==='stairs_passage';i++)tick(.025);game.key('KeyW',false);
  assert.equal(game.snapshot().story.stage,'resident_arrival');assert.ok(renderedCamera.position.z>6,'arrive outside 1704');assert.ok(deviceLevels.phone>0);
  runTo(0,7.25);use([0,1.65,7.25],[0,1.25,6.12],'resident_entry');tick(1);runTo(0,4.05);
  assert.equal(game.snapshot().threat,0,'the resident first visit leaves time to investigate');assert.equal(chaseLevel,0);assert.match(game.snapshot().objective,/0\/4/);
  runTo(1.6,4.05);use([1.6,1.65,4.05],[1.6,.15,4.8],'resident_memory');assert.match(game.snapshot().objective,/1\/4/);
  runTo(0,4.05);runTo(-1.65,4.05);runTo(-3.8,2.8);use([-3.8,1.65,2.8],[-3.674,.785,3.51],'resident_memory');assert.match(game.snapshot().objective,/재생 중/);tick(5.4);assert.match(game.snapshot().objective,/2\/4/);assert.equal(deviceLevels.phone,0);
  runTo(-1.6,3.15);runTo(0,3.15);runTo(3.8,3.15);use([3.8,1.65,3.15],[3.8,1.5,3.94],'resident_memory');assert.match(game.snapshot().objective,/3\/4/);
  runTo(0,3.15);runTo(0,-2.5);runTo(3,-2.5);runTo(3,-3.1);use([3,1.65,-3.1],[3,.621,-4.328],'resident_memory');tick(1);use([3.06,1.65,-3.1],[3.095,.55765,-4.07],'resident_return');runTo(3,-2.5);runTo(0,-2.5);
  runTo(0,3.15);runTo(0,-4.65);use([0,1.65,-4.65],[0,1.25,-5.65],'resident_departure');tick(1);
  runTo(0,-7.95);aim(renderedCamera.position.toArray(),[3,1.65,-7.95],false);game.key('KeyW',true);for(let i=0;i<150&&game.snapshot().story.stage==='resident_departure';i++)tick(.025);game.key('KeyW',false);assert.equal(game.snapshot().story.stage,'office_record');runTo(0,11.8);runTo(0,6.5);
  use([-3.7,1.65,2.8],[-3.7,.86,1.8],'office_fuse');
  use([-2.1,1.65,-4.95],[-2.1,1.17,-5.7],'office_power');
  use([4.55,1.65,-4.55],[5.39,1.02,-4.55],'office_power');
  use([4.55,1.65,-4],[5.34,1.45,-4],'office_power');
  use([4.55,1.65,-3.45],[5.34,1.45,-3.45],'office_power');
  use([4.55,1.65,-3.45],[5.415,.95,-3.45],'office_tape');
  use([-1.95,1.65,2.6],[-1.95,.9,1.8],'office_tape');
  use([-2.65,1.65,2.6],[-2.65,1.17,1.79],'office_playback');
  assert.equal(game.snapshot().prompt,'');const playbackAt=game.snapshot().elapsed;game.pause();tick(5);assert.equal(game.snapshot().elapsed,playbackAt);game.pause(false);tick(5);assert.equal(game.snapshot().story.stage,'office_playback');tick(6.1);assert.equal(game.snapshot().story.stage,'office_key');assert.ok(game.snapshot().story.notes.includes('monitor'));
  const waitingGhost=renderedScene.getObjectByName('resident-remains').position.clone();
  renderedScene.getObjectByName('resident-remains').position.set(0,0,-5);aim([-2.5,1.65,-5],[-2.5,1.65,-7],false);
  game.key('ShiftLeft',true);tick(6.1);assert.ok(game.snapshot().threat<.2,'holding Shift behind a wall is silent');
  game.key('KeyW',true);tick(.3);game.key('KeyW',false);game.key('ShiftLeft',false);assert.ok(game.snapshot().threat>.5,'actual running behind the wall attracts the ghost');renderedScene.getObjectByName('resident-remains').position.copy(waitingGhost);
  use([-2.13,1.65,2.6],[-2.13,.82,1.28],'office_leave');assert.equal(renderedScene.getObjectByName('office-exit-key').visible,false);

  use([0,1.65,-6.3],[0,1.25,-7.48],'office_departure');
  function cross(stage,next,z,x=0){tick(1);aim(renderedCamera.position.toArray(),[x,renderedCamera.position.y,z],false);game.key('KeyW',true);for(let i=0;i<600&&game.snapshot().story.stage===stage;i++)tick(.025);game.key('KeyW',false);assert.equal(game.snapshot().story.stage,next);}
  cross('office_departure','service_ride',-10);tick(11.3);assert.equal(game.snapshot().story.stage,'service_open');cross('service_open','annex_arrival',-4);
  const {buildWorld,disposeWorld}=await import('../lib/world.ts'),{findPath}=await import('../lib/navigation.ts'),{expansionLayout}=await import('../lib/expansion-world.ts');
  const expansionStart=game.snapshot().elapsed;
  for(const [area,actions,nextStage] of [
   ['annex',[['annex_map','annex_fuse'],['annex_fuse','annex_restore'],['annex_restore','annex_unlock'],['annex_badge','annex_unlock'],['annex_notice','annex_unlock'],['annex_call','annex_unlock'],['annex_digit_2','annex_unlock'],['annex_digit_8','annex_unlock'],['annex_digit_0','annex_unlock'],['annex_digit_3','annex_unlock'],['annex_dial','annex_unlock'],['annex_exit','annex_departure']],'court_arrival'],
   ['courtyard',[['court_gate','court_search'],['court_log','court_search'],['court_evidence','court_search'],['court_phone','court_search'],...Array.from('2617').flatMap((n,i)=>Array.from({length:Number(n)},()=>[`court_digit_${i}`,'court_code'])),['court_confirm','court_safe_open'],['court_key','court_unlocked'],['court_exit','court_departure']],'archive_arrival'],
   ['archive',[['archive_ledger','archive_search'],['archive_road','archive_search'],['archive_call','archive_search'],['archive_gate','archive_edit'],['archive_sequence_road','archive_edit'],['archive_sequence_call','archive_edit'],['archive_sequence_gate','archive_reveal'],['archive_play','archive_playback'],['archive_exit','archive_departure']],'plant_arrival'],
   ['plant',[['plant_diagram','plant_isolate'],['plant_valve_west','plant_isolate'],['plant_valve_east','plant_power'],['plant_filter','plant_power'],['plant_route','plant_power'],['plant_route','plant_power'],['plant_circuit_pump','plant_power'],['plant_circuit_air','plant_power'],['plant_start','plant_drain'],['plant_exit','plant_departure']],'parking_gate'],
  ]){
   const reference=buildWorld(new THREE.Scene(),area);
   try{
    for(const [id,want] of actions){
     const source=id.startsWith('archive_sequence_')?id.slice('archive_sequence_'.length):null;
     const t=reference.targets.find(t=>t.id===(source?'archive_preview_'+source:id)),at=t.mesh.userData.approach;
     const path=findPath(renderedCamera.position,at,reference.solids,reference.bounds,.26);assert.ok(path.length,`route to ${id} from ${renderedCamera.position.toArray()} to ${JSON.stringify(at)}`);for(const p of path)runTo(p.x,p.z);
     if(id==='plant_exit'&&game.snapshot().story.stage==='plant_drain'){game.key('KeyW',true);tick(.05);game.key('KeyW',false);tick(12);}
     aim(renderedCamera.position.toArray(),t.point.toArray());game.interact();
     if(source){event(doc,'keydown',{code:'Space',repeat:false});for(let i=0;i<({road:4,call:10,gate:6}[source]);i++)event(doc,'keydown',{code:'ArrowRight',repeat:false});event(doc,'keydown',{code:'Enter',repeat:false});event(doc,'keydown',{code:source==='call'?'Digit4':'Digit5',repeat:false});}
     assert.equal(game.snapshot().story.stage,want,id);tick();
     if(id==='court_confirm')tick(1.1);
     if(id==='court_phone'){tick(10.7);assert.equal(game.snapshot().story.stage,'court_code');}
     if(id==='annex_call'){tick(7.8);assert.equal(game.snapshot().story.stage,'annex_unlock');}
     if(id==='annex_dial'){tick(4.6);assert.equal(game.snapshot().story.stage,'annex_exit_ready');}
     if(id==='annex_exit'){assert.ok(voiceCalls.includes('no'),'opening 1F exit triggers the refusal shout');}
     if(id==='archive_play'){const before=game.snapshot().elapsed;game.pause();tick(5);assert.equal(game.snapshot().elapsed,before);game.pause(false);tick(32.1);assert.equal(game.snapshot().story.stage,'archive_escape');}
    }
    tick(1);
    const px=area==='courtyard'?14:0,pz=area==='courtyard'?-53:-expansionLayout[area].z-2;
    runTo(px,pz);aim(renderedCamera.position.toArray(),[px+3,renderedCamera.position.y,pz],false);game.key('KeyW',true);
    for(let i=0;i<250&&game.snapshot().story.stage!==nextStage;i++)tick(.025);game.key('KeyW',false);assert.equal(game.snapshot().story.stage,nextStage,'cross the shared corner');
    const nextZ=area==='annex'?48:area==='courtyard'?32:area==='archive'?36:22;
    if(area==='annex'){
     runTo(-2.55,nextZ+4);tick(1.4);assert.equal(game.snapshot().story.stage,'court_arrival');
     const door=renderedScene.children.flatMap(o=>o.children).find(o=>o.name==='continuous-connection'&&o.position.z===54)?.getObjectByName('connection-fire-door');
     assert.ok(door&&Math.abs(door.rotation.y)>1.4,'the self-closing door stays open when the player steps back');
    }
    runTo(0,nextZ+4);runTo(0,nextZ-1);
   }finally{disposeWorld(reference.root);}
  }
  console.log('Expanded chapters known-route simulation seconds',Math.round(game.snapshot().elapsed-expansionStart));
  runTo(2,20);runTo(2,-20.3);
  use([0,1.65,-20.3],[0,1.25,-21.68],'parking_key');
  use([7.1,1.65,-17.8],[6.02,1.1,-17.8],'parking_key');tick(1);use([7.1,1.65,-17.8],[5.415,.31,-17.83],'parking_alarm');
  use([-10.8,1.65,17.4],[-10.8,1.4,16.18],'parking_run');
  const lured=renderedScene.getObjectByName('resident-remains'),beforeLure=lured.position.clone();tick(1);assert.ok(lured.position.distanceTo(beforeLure)>.8,'the apparition actually follows the alarm around the mounting wall');
  runTo(-2.2,17.4);runTo(-2.2,-20);runTo(0,-20);
  aim([0,1.65,-20.3],[0,1.25,-21.68]);game.interact();assert.equal(game.snapshot().story.stage,'parking_run','the pedestrian door cannot trigger the new ending');
  runTo(3,-20);runTo(3,-17.8);
  aim([3,1.65,-17.8],[3.98,1.1,-17.8]);game.key('KeyE',true);tick(.95);game.key('KeyE',false);assert.equal(game.snapshot().story.stage,'car_departure');
  tick(finale.car_departure.duration+.05);assert.equal(game.snapshot().story.stage,'car_escape');
  assert.ok(renderedScene.getObjectByName('escape-drive'));
  game.key('KeyW',true);game.interact();game.skipMemory();assert.equal(game.snapshot().story.stage,'car_escape');
  const drivingFrom=renderedCamera.position.clone();tick(2);assert.ok(renderedCamera.position.distanceTo(drivingFrom)>2);
  game.pause();const drivePose=renderedCamera.matrixWorld.toArray(),driveClock=game.snapshot().elapsed;tick(4);assert.equal(game.snapshot().elapsed,driveClock);assert.deepEqual(renderedCamera.matrixWorld.toArray(),drivePose);game.pause(false);
  tick(finale.car_escape.duration-2);assert.equal(game.snapshot().story.stage,'car_voice');
  tick(.3);assert.ok(soundCalls.includes('passenger-line'));assert.match(game.snapshot().memoryText,/혼자 가려고/);
  game.pause();const voiceClock=game.snapshot().elapsed;tick(4);assert.equal(game.snapshot().elapsed,voiceClock);game.pause(false);
  tick(finale.car_voice.duration);assert.equal(game.snapshot().story.stage,'car_crash');
  tick(.8);assert.ok(soundCalls.includes('collision-impact'));assert.equal(game.snapshot().story.ending,null,'death follows the visible crash');
  tick(finale.car_crash.duration);assert.equal(game.snapshot().story.stage,'ended');assert.equal(game.snapshot().story.ending,'crashed');assert.deepEqual(errors,[]);
  game.start();tick(.2);assert.equal(game.snapshot().story.stage,'drive');game.skipMemory();assert.ok(game.snapshot().elapsed<.3,'fresh restart resets elapsed time');
  tick(7.1);game.key('KeyW',true);tick(.5);game.key('KeyW',false);assert.ok(renderedCamera.position.distanceTo(new THREE.Vector3(...home.wakeStand))>.5,'the player can walk after waking');game.dispose();
});

test('contact screams once, locks controls and falls before death; manual pause freezes it',()=>{
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));tick();game.start(true);tick();
  voiceCalls.length=0;
  event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:0,clientY:0});event(doc,'pointerup',{});game.interact();tick(3);
  // The radio encounter opens the front door; leave and let pursuit catch up.
  renderedCamera.position.set(.51,1.65,home.door[2]+1.16);
  event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});
  const desiredPitch=Math.atan2(-.45,1.16);
  event(doc,'pointermove',{clientX:renderedCamera.rotation.y/.0021,clientY:-(desiredPitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();game.key('KeyW',true);for(let i=0;i<60&&game.snapshot().story.stage==='hide';i++)tick(.025);game.key('KeyW',false);
  assert.equal(game.snapshot().story.stage,'lift_call');
  for(let i=0;i<1000&&game.snapshot().story.stage!=='dying';i++)tick(.025);
  assert.equal(game.snapshot().story.stage,'dying');assert.equal(game.snapshot().paused,false);assert.equal(voiceCalls.filter(l=>l==='scream').length,1);
  const root=renderedScene.getObjectByName('resident-remains'),initialY=renderedCamera.position.y;
  assert.ok(root.getObjectByName('ghost-attack-mouth').visible);const progress=game.snapshot().deathProgress;
  const torch=game.snapshot().flashlight;game.torch();game.crouch();game.interact();game.key('KeyW',true);assert.equal(game.snapshot().flashlight,torch);assert.equal(game.snapshot().crouched,false);
  game.pause();const pose=renderedCamera.matrixWorld.toArray();tick(5);assert.equal(game.snapshot().deathProgress,progress);assert.deepEqual(renderedCamera.matrixWorld.toArray(),pose);game.pause(false);
  tick(2.6);assert.equal(game.snapshot().story.stage,'dying');assert.ok(renderedCamera.position.y<initialY-1);assert.ok(game.snapshot().deathProgress>.8);assert.equal(renderedScene.getObjectByName('resident-remains'),root,'death stays in the place of contact');
  tick(.7);assert.equal(game.snapshot().story.stage,'ended');assert.equal(game.snapshot().story.ending,'caught');
  game.start(true);tick();assert.equal(game.snapshot().story.stage,'lift_call');assert.equal(game.snapshot().deathProgress,0);assert.equal(renderedCamera.position.y,1.65);game.dispose();
});

test('mandatory pry instructions follow rebound controls',()=>{
  const previousStorage=win.localStorage;
  win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'lift_button',notes:[],elapsed:0}):null,setItem(){},removeItem(){}};
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));
  try{
    tick();game.configure({bindings:{...game.getSettings().bindings,forward:'KeyE',interact:'KeyQ',run:'ControlLeft'}});game.continueGame();tick();
    renderedCamera.position.set(0,1.65,.6);
    const yaw=Math.atan2(-.92,1.05),pitch=Math.atan2(-.35,Math.hypot(.92,1.05));
    event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();
    game.interact();assert.equal(game.snapshot().story.stage,'descent');tick(16.1);
    assert.equal(game.snapshot().story.stage,'pry');assert.match(game.snapshot().objective,/Q를 길게/);assert.match(game.snapshot().message,/Q를 길게/);
  }finally{game.dispose();win.localStorage=previousStorage;}
});

test('capture beside corridor walls keeps the ghost and falling camera inside the available space',async()=>{
  const {buildWorld,canStandAt}=await import('../lib/world.ts');
  const previousStorage=win.localStorage;
  win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'lift_exit',notes:[],elapsed:0}):null,setItem(){},removeItem(){}};
  const w=buildWorld(new THREE.Scene(),'corridor');
  for(const [playerX,playerZ,ghostX,ghostZ] of [[2.3,8,2.95,8],[-3,8,-2.39,8],[2.45,8,2.45,8.63]]){
    const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
    const game=createGame(canvas,()=>{},e=>assert.fail(e));
    try{
      tick();game.continueGame();tick(.6);renderedCamera.position.set(0,1.65,-1.9);tick();renderedCamera.position.set(-2.6,1.65,16);tick(4.3);
      const ghost=renderedScene.getObjectByName('resident-remains');
      renderedCamera.position.set(playerX,1.65,playerZ);ghost.position.set(ghostX,0,ghostZ);ghost.visible=true;
      assert.ok(canStandAt(ghostX,ghostZ,w.solids,.43,w.bounds),'capture begins in a valid ghost position');
      tick(.025);assert.equal(game.snapshot().story.stage,'dying');
      for(let i=0;i<30;i++){
        assert.ok(canStandAt(ghost.position.x,ghost.position.z,w.solids,.43,w.bounds),`ghost clears the wall at attack ${i}`);
        assert.ok(canStandAt(renderedCamera.position.x,renderedCamera.position.z,w.solids,.23,w.bounds),`falling camera clears the wall at attack ${i}`);
        ghost.updateMatrixWorld(true);const point=new THREE.Vector3();
        ghost.traverse(mesh=>{if(!mesh.isMesh||mesh.isInstancedMesh)return;for(let o=mesh;o!==ghost;o=o.parent)if(!o.visible)return;const vertices=mesh.geometry.getAttribute('position');
          for(let v=0;v<vertices.count;v++){point.fromBufferAttribute(vertices,v).applyMatrix4(mesh.matrixWorld);
            for(const wall of w.solids){const c=Math.cos(wall.yaw??0),s=Math.sin(wall.yaw??0),dx=point.x-wall.x,dz=point.z-wall.z;
              assert.ok(!(Math.abs(dx*c-dz*s)<wall.w/2-.002&&Math.abs(dx*s+dz*c)<wall.d/2-.002&&Math.abs(point.y-(wall.y??1.5))<(wall.h??3)/2-.002),`${mesh.name} passes through a wall at attack ${i}: ${point.toArray()}`);
            }
          }
        });
        tick(.1);
      }
    }finally{game.dispose();}
  }
  win.localStorage=previousStorage;
});

test('the remembered drive, fatal collision, escape and sleep lead to a ringing phone three nights later',()=>{
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));tick();game.start();tick(.1);
  assert.equal(game.snapshot().story.stage,'drive');assert.match(game.snapshot().memoryText,/술을 마셨다/);
  const road=renderedScene.getObjectByName('accident-memory');assert.ok(road);assert.equal(renderedScene.getObjectByName('apartment-tv-light').parent.visible,false);
  assert.equal(road.getObjectByName('memory-cracked-glass').visible,false);
  game.interact();game.crouch();game.torch();game.key('KeyW',true);assert.equal(game.snapshot().crouched,false);assert.equal(game.snapshot().flashlight,false);assert.equal(game.snapshot().story.stage,'drive');
  game.pause();const pos=renderedCamera.position.toArray(),at=game.snapshot().elapsed;tick(10);assert.deepEqual(renderedCamera.position.toArray(),pos);assert.equal(game.snapshot().elapsed,at);game.skipMemory();assert.equal(game.snapshot().story.stage,'drive');game.pause(false);
  doc.hidden=true;event(doc,'visibilitychange',{});tick(10);assert.equal(game.snapshot().elapsed,at);assert.equal(game.snapshot().paused,false);doc.hidden=false;event(doc,'visibilitychange',{});
  tick(opening.drive.duration);assert.equal(game.snapshot().story.stage,'impact');assert.ok(soundCalls.includes('male-surprise'));assert.ok(soundCalls.includes('female-collision-scream'));assert.ok(soundCalls.includes('collision-impact'));assert.equal(road.getObjectByName('memory-cracked-glass').visible,true);
  tick(5);assert.equal(deviceLevels.phone,0,'the outside phone is not audible through a closed car');assert.match(game.snapshot().memoryText,/와이퍼/);
  game.pause();const phoneLevel=deviceLevels.phone;tick(4);assert.equal(deviceLevels.phone,phoneLevel);game.pause(false);
  tick(opening.impact.duration-5);assert.equal(game.snapshot().story.stage,'flee');assert.ok(game.snapshot().memoryText.length>0);
  tick(4.6);assert.equal(deviceLevels.phone,0,'leaving the victim fades the ringing out');tick(opening.flee.duration-4.6);assert.equal(game.snapshot().story.stage,'sleep');assert.equal(renderedScene.getObjectByName('accident-memory'),undefined);assert.equal(renderedCamera.position.y,.98);
  tick(6);assert.ok(game.snapshot().memoryFade>.95);tick(opening.sleep.duration-6);assert.equal(game.snapshot().story.stage,'wake_ring');assert.ok(game.snapshot().story.notes.includes('wake'));assert.match(game.snapshot().memoryLabel,/사흘 뒤/);assert.equal(renderedScene.getObjectByName('apartment-tv-light').intensity,0);
  tick(5);assert.equal(game.snapshot().story.stage,'light_switch');assert.equal(renderedScene.getObjectByName('apartment-lamp-0').intensity,0);
  game.start();tick();const previous=renderedScene.getObjectByName('accident-memory');game.start();tick();assert.ok(renderedScene.getObjectByName('accident-memory')===previous,'restart reuses the prepared road');
  game.skipMemory();tick();assert.equal(game.snapshot().story.stage,'wake_ring');assert.equal(renderedScene.getObjectByName('accident-memory'),undefined);assert.ok(game.snapshot().story.notes.includes('wake'));game.dispose();
});
test('desktop memory leaves the cursor available for skip, including after pause and restart',()=>{
  const previousMedia=win.matchMedia;win.matchMedia=()=>({matches:false});let locks=0;
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){},requestPointerLock(){locks++;doc.pointerLockElement=canvas;return Promise.resolve();}});
  doc.exitPointerLock=()=>{doc.pointerLockElement=null;event(doc,'pointerlockchange',{});};
  const game=createGame(canvas,()=>{},e=>assert.fail(e));
  try{
    tick();game.start();tick();assert.equal(locks,0);assert.equal(doc.pointerLockElement,null);
    game.pause();game.pause(false);assert.equal(locks,0);game.skipMemory();tick();assert.equal(locks,1);assert.equal(doc.pointerLockElement,canvas);
    game.start();tick();assert.equal(game.snapshot().story.stage,'drive');assert.equal(doc.pointerLockElement,null);assert.equal(locks,1);
  }finally{game.dispose();win.matchMedia=previousMedia;doc.pointerLockElement=null;}
});

test('the first ghost starts behind a real wall and walks continuously into view after the radio stops',async()=>{
  const {buildWorld,hasLineOfSight,canStandAt,disposeWorld}=await import('../lib/world.ts');
  const walls=buildWorld(new THREE.Scene());
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));
  try{
    tick();game.start(true);tick();renderedCamera.position.set(...home.radioStart);
    const pitch=Math.atan2(home.radio[1]-renderedCamera.position.y,1.25);
    event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});
    event(doc,'pointermove',{clientX:-(-Math.PI-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();
    game.interact();assert.equal(game.snapshot().story.stage,'listen');
    const ghost=renderedScene.getObjectByName('resident-remains'),head=ghost.getObjectByName('ghost-head');
    assert.equal(ghost.visible,true,'the ghost already occupies the hidden room instead of appearing at the reveal cue');
    const visible=()=>hasLineOfSight(renderedCamera.position,head.getWorldPosition(new THREE.Vector3()),walls.solids);
    assert.equal(visible(),false,'the utility-room wall physically hides the initial figure');
    tick(1);const waiting=ghost.position.clone();game.pause();tick(4);assert.deepEqual(ghost.position.toArray(),waiting.toArray());game.pause(false);
    let appeared=false,moved=0;
    for(let i=0;i<1000&&!appeared;i++){
      const before=ghost.position.clone();tick(.025);const step=ghost.position.distanceTo(before);moved+=step;
      assert.ok(step<.05,'a cue or stage transition must not teleport the ghost');
      assert.ok(canStandAt(ghost.position.x,ghost.position.z,walls.solids,.18,walls.bounds),'the approach respects the room walls');
      assert.ok(head.getWorldPosition(new THREE.Vector3()).y>1.5,'the initial encounter retains its walking pose');
      appeared=visible();
    }
    assert.ok(appeared&&moved>2,'the figure actually emerges from the corner into the player’s sightline');
    assert.equal(game.snapshot().story.stage,'hide');
  }finally{game.dispose();disposeWorld(walls.root);}
});

test('all pursuit areas after the first apartment render the ghost crawling, including resumed games',()=>{
  const previous=win.localStorage;
  for(const stage of ['lift_call','lift_exit','stairs_loop','resident_entry','office_record','parking_gate']){
    win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage,notes:[],elapsed:0}):null,setItem(){},removeItem(){}};
    const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
    const game=createGame(canvas,()=>{},e=>assert.fail(e));
    try{
      tick();game.continueGame();tick(.6);
      if(stage==='lift_exit'){
        renderedCamera.position.set(0,1.65,-.15);
        event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});
        event(doc,'pointermove',{clientX:renderedCamera.rotation.y/.0021,clientY:-(Math.atan2(-.35,.95)-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();
        game.key('KeyW',true);for(let i=0;i<100&&game.snapshot().story.stage==='lift_exit';i++)tick(.025);game.key('KeyW',false);assert.equal(game.snapshot().story.stage,'corridor_run');renderedCamera.position.set(-2.6,1.65,16);tick(4.3);
      }
      const ghost=renderedScene.getObjectByName('resident-remains');ghost.visible=true;game.pause();tick();
      const head=ghost.worldToLocal(ghost.getObjectByName('ghost-head').getWorldPosition(new THREE.Vector3()));
      assert.ok(head.y<.95&&head.y>.3,`${stage}: the head must remain close to the floor`);
      for(const side of [-1,1]){const hand=ghost.worldToLocal(ghost.getObjectByName(`ghost-hand-${side}`).getWorldPosition(new THREE.Vector3()));assert.ok(hand.y<.22,`${stage}: hands support the crawling body`);}
    }finally{game.dispose();win.localStorage=previous;}
  }
});

async function wardrobeFixture(){
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));tick();game.start(true);tick();
  const aim=(pos,target)=>{
    renderedCamera.position.set(...pos);const dx=target[0]-pos[0],dy=target[1]-pos[1],dz=target[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));
    event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();
  };
  aim([home.radio[0],1.65,home.radio[2]-1.25],home.radio);game.interact();tick(3);assert.equal(game.snapshot().story.stage,'hide');
  aim([home.closet[0]-.8,1.65,home.closet[2]],home.closet);const ghost=renderedScene.getObjectByName('resident-remains');ghost.position.set(0,0,0);
  return {game,ghost,home,aim};
}
test('the real capture camera keeps the opening mouth and dropped chin in view',async()=>{
  for(const reduced of [false,true])for(const crouched of [false,true]){
  const media=win.matchMedia;win.matchMedia=()=>({matches:reduced});
  const {game,ghost}=await wardrobeFixture();try{
    if(crouched)game.crouch();
    ghost.position.set(renderedCamera.position.x+.3,0,renderedCamera.position.z);tick(.025);assert.equal(game.snapshot().story.stage,'dying');
    for(let i=0;i<14;i++){
      tick(.2);const mouth=ghost.getObjectByName('ghost-attack-mouth'),jaw=ghost.getObjectByName('ghost-jaw');
      for(const mesh of [mouth.children[1],...jaw.children.filter(c=>c.isMesh)]){
        const positions=mesh.geometry.getAttribute('position');
        for(let j=0;j<positions.count;j++){
          const point=mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(positions,j)),depth=-point.clone().applyMatrix4(renderedCamera.matrixWorldInverse).z,screen=point.project(renderedCamera);
          assert.ok(depth>renderedCamera.near,`mouth/chin outside near plane at ${i}: ${depth}`);
          assert.ok(Math.abs(screen.x)<1&&Math.abs(screen.y)<1,`mouth/chin in view at ${i}: ${screen.toArray()}`);
        }
      }
    }
  }finally{game.dispose();win.matchMedia=media;}
  }
});
test('hiding never teleports the distant ghost to the wardrobe',async()=>{
  const {game,ghost}=await wardrobeFixture();try{const before=ghost.position.clone();game.interact();assert.equal(game.snapshot().story.stage,'wait');tick(.1);assert.ok(ghost.position.distanceTo(before)<.15,'approach is limited by actual walking speed');assert.ok(ghost.position.distanceTo(renderedCamera.position)>3);}finally{game.dispose();}
});
test('leaving the wardrobe into the ghost is immediately lethal',async()=>{
  const {game,ghost}=await wardrobeFixture();try{const exit=renderedCamera.position.clone();game.interact();tick();ghost.position.set(exit.x,0,exit.z);game.interact();tick();assert.equal(game.snapshot().story.stage,'dying','there is no immunity after leaving early');}finally{game.dispose();}
});
test('the bathroom distraction never disables contact detection',async()=>{
  const {game,ghost}=await wardrobeFixture();try{game.interact();for(let i=0;i<3000&&game.snapshot().story.stage==='wait';i++)tick(.025);assert.equal(game.snapshot().story.stage,'escape');game.interact();ghost.position.set(renderedCamera.position.x+.3,0,renderedCamera.position.z);tick();assert.equal(game.snapshot().story.stage,'dying');}finally{game.dispose();}
});

test('the wardrobe search stops at a distance and the apparition changes the ambience',async()=>{
  const {game,ghost}=await wardrobeFixture();try{
    assert.ok(hauntLevel>.5,'the apparition fades in ominous music');game.interact();let nearest=Infinity;
    for(let i=0;i<2400&&game.snapshot().story.stage==='wait';i++){tick(.025);nearest=Math.min(nearest,Math.hypot(ghost.position.x-renderedCamera.position.x,ghost.position.z-renderedCamera.position.z));}
    assert.equal(game.snapshot().story.stage,'escape');assert.ok(nearest>1.1,`the closed wardrobe retains a gap: ${nearest}`);
    game.start();tick();assert.equal(hauntLevel,0,'a new prologue restores the calm soundscape');
  }finally{game.dispose();}
});
test('seeing the player interrupts the bathroom route before its timer expires',async()=>{
  const {game,ghost}=await wardrobeFixture();try{
    game.interact();for(let i=0;i<3000&&game.snapshot().story.stage==='wait';i++)tick(.025);game.interact();
    renderedCamera.position.set(0,1.65,2*S);ghost.position.set(0,0,0);ghost.rotation.y=0;const before=ghost.position.clone();tick(.2);
    assert.equal(game.snapshot().story.stage,'escape');assert.ok(ghost.position.z>before.z,'the ghost turns toward the visible player, away from its bathroom destination');assert.ok(game.snapshot().threat>.5);
  }finally{game.dispose();}
});

test('continue restores an earned chapter after disposal and a new game instance',()=>{
  const previous=win.localStorage,data=new Map();win.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  let game=createGame(canvas,()=>{},e=>assert.fail(e));
  try{tick();game.start();game.skipMemory();tick(7.2);assert.equal(game.snapshot().story.stage,'light_switch');game.configure({fov:88});game.dispose();
    game=createGame(canvas,()=>{},e=>assert.fail(e));tick();assert.equal(game.snapshot().canContinue,true);game.continueGame();tick();assert.equal(game.snapshot().story.stage,'light_switch');assert.equal(game.snapshot().story.hidden,false);assert.equal(renderedCamera.fov,88);
  }finally{game.dispose();win.localStorage=previous;}
});
test('the resident return searches even when the player remains silent out of sight',async()=>{
  const previous=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'resident_entry',notes:['resident_drawer','resident_key'],elapsed:0}):null,setItem(){},removeItem(){}};
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
  function use(pos,target){renderedCamera.position.set(...pos);const dx=target[0]-pos[0],dy=target[1]-pos[1],dz=target[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();game.interact();}
  try{tick();game.continueGame();tick();use([1.6,1.65,3.65],[1.6,.3,4.8]);use([-3.8,1.65,2.2],[-3.674,.785,3.51]);use([3.8,1.65,2.8],[3.8,1.5,3.95]);tick(10);const ghost=renderedScene.getObjectByName('resident-remains'),before=ghost.position.clone();tick(2);assert.ok(ghost.position.distanceTo(before)>1,'silent players still face a searching pursuer');assert.equal(game.snapshot().story.stage,'resident_return');}
  finally{game.dispose();win.localStorage=previous;}
});

for(const replay of [false,true])test(`V65 resident message ${replay?'replays independently after collection':'earns its clue only when the tape finishes'}`,async()=>{
  const previous=win.localStorage,notes=replay?['belongings','portrait','answerphone','resident_drawer','resident_key']:['belongings','portrait'];
  win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'resident_entry',notes,elapsed:100}):null,setItem(){},removeItem(){}};
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));
  function aim(pos,target){renderedCamera.position.set(...pos);const dx=target[0]-pos[0],dy=target[1]-pos[1],dz=target[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();}
  try{
    await game.ready;tick();game.continueGame();tick(.1);voiceCalls.length=0;
    aim([-2.4,1.65,4.6],[-3.8,.82,3.52]);assert.match(game.snapshot().prompt,/녹음/);
    game.interact();assert.deepEqual(voiceCalls,['memory']);
    assert.equal(game.snapshot().story.stage,replay?'resident_return':'resident_entry','pressing PLAY cannot pre-collect an unheard message');
    assert.match(game.snapshot().objective,/재생 중/);tick(.7);game.interact();assert.deepEqual(voiceCalls,['memory'],'repeated E does not restart the same tape');
    game.pause();const at=game.snapshot().elapsed;tick(3);assert.equal(game.snapshot().elapsed,at);assert.equal(game.snapshot().story.notes.includes('answerphone'),replay);game.pause(false);
    aim([-2.4,1.65,4.6],[-2.4,1.65,5.4]);const before=renderedCamera.position.clone();game.key('KeyW',true);tick(.3);game.key('KeyW',false);assert.ok(renderedCamera.position.distanceTo(before)>.3,'the player can leave the telephone while it plays');
    tick(4.8);assert.equal(game.snapshot().story.stage,replay?'resident_return':'resident_memory');assert.equal(game.snapshot().story.notes.filter(n=>n==='answerphone').length,1);assert.doesNotMatch(game.snapshot().objective,/재생 중/);
    assert.equal(voiceCalls.filter(v=>v==='memory').length,1);
  }finally{game.dispose();win.localStorage=previous;}
});

test('V65 other clues stay usable while the message runs without ending the investigation early',async()=>{
  const previous=win.localStorage;
  win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'resident_entry',notes:['belongings'],elapsed:100}):null,setItem(){},removeItem(){}};
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
  function use(pos,target){renderedCamera.position.set(...pos);const dx=target[0]-pos[0],dy=target[1]-pos[1],dz=target[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();assert.ok(game.snapshot().prompt);game.interact();}
  try{await game.ready;tick();game.continueGame();tick();use([-2.4,1.65,4.6],[-3.8,.82,3.52]);use([3.8,1.65,2.8],[3.8,1.5,3.94]);assert.ok(game.snapshot().story.notes.includes('portrait'));assert.equal(game.snapshot().story.notes.includes('answerphone'),false);assert.notEqual(game.snapshot().story.stage,'resident_return');tick(5.5);assert.equal(game.snapshot().story.stage,'resident_memory');assert.equal(game.snapshot().story.notes.includes('resident_key'),false);}
  finally{game.dispose();win.localStorage=previous;}
});

test('continuing 1704 preserves the remaining clue or restores an already completed investigation',()=>{
  const previous=win.localStorage;
  for(const notes of [['belongings','answerphone'],['belongings','answerphone','portrait'],['resident_drawer','resident_key']]){
    win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'resident_entry',notes,elapsed:200}):null,setItem(){},removeItem(){}};
    const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
    try{tick();game.continueGame();tick();assert.deepEqual(game.snapshot().story.notes,notes);assert.match(game.snapshot().objective,/연결문|서재/);assert.equal(game.snapshot().story.stage,notes.includes('resident_key')?'resident_return':'resident_entry');}
    finally{game.dispose();win.localStorage=previous;}
  }
});

test('actual movement exhausts sprint, manual pause freezes recovery, and walls do not consume stamina',()=>{
 const previous=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'lift_call',notes:[],elapsed:0}):null,setItem(){},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{tick();game.continueGame();tick();game.key('KeyW',true);game.key('ShiftLeft',true);tick(6.7);assert.equal(game.snapshot().stamina,0);assert.equal(game.snapshot().exhausted,true);assert.ok(breathLevel>.9,'exhaustion starts the panting loop');const before=renderedCamera.position.z;tick(.5);assert.ok(Math.abs(before-renderedCamera.position.z-1)<.06,'depleted player walks at 2 m/s');assert.ok(breathLevel>.5,'panting continues while walking');
 game.pause();const frozen=game.snapshot().stamina;tick(9);assert.equal(game.snapshot().stamina,frozen);game.pause(false);game.key('KeyW',true);tick(4.5);game.key('KeyW',false);assert.ok(game.snapshot().stamina>.25);assert.equal(game.snapshot().exhausted,false);assert.ok(breathLevel>0,'breathing fades through recovery');
 game.start(true);tick();assert.equal(breathLevel,0);renderedCamera.position.set(0,1.65,-22.86);game.key('KeyW',true);game.key('ShiftLeft',true);tick(2);assert.equal(game.snapshot().stamina,1,'pushing against the area boundary is not running');
 }finally{game.dispose();win.localStorage=previous;}
});

test('resuming a previously played archive record allows replay and shows the timed revelation without opening the journal',()=>{
 const previous=win.localStorage,notes=['archive_ledger','archive_road','archive_call','archive_gate','archive_play'];
 win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'archive_reveal',notes,circuit:['archive_sequence_road','archive_sequence_call','archive_sequence_gate'],elapsed:900}):null,setItem(){},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{
  tick();game.continueGame();tick();renderedCamera.position.set(9,1.65,-18.9);const pitch=Math.atan2(1.17-1.65,.92);
  event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:0,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();game.interact();assert.equal(game.snapshot().story.stage,'archive_playback');
  tick(12.2);assert.equal(game.snapshot().message,archiveReplay[2].text);
  game.pause();const at=game.snapshot().elapsed;tick(10);assert.equal(game.snapshot().elapsed,at);game.pause(false);
  tick(2.9);assert.match(game.snapshot().message,/네 뒤에 있어/);assert.equal(game.snapshot().story.stage,'archive_playback');tick(4);assert.equal(game.snapshot().story.stage,'archive_escape');
 }finally{game.dispose();win.localStorage=previous;}
});

test('prepared areas retain geometry through a restart and reset apartment door state',async()=>{
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
 const game=createGame(canvas,()=>{},()=>{});await game.ready;tick();
 const original=renderedScene.getObjectByName('front-door');original.userData.openRequested=true;original.rotation.y=1.42;
 game.start();game.skipMemory();tick(7);
 const again=renderedScene.getObjectByName('front-door');assert.ok(again===original,'restart must reuse the GPU-prepared world');assert.equal(again.rotation.y,0,'cached doors restart closed');
 game.dispose();
});

// Load the preceding checkpoint, then cross the real threshold. Starting a test
// directly in the next room would bypass the incoming door and hide this deadlock.
for(const [from,crossing,area,newZ,activation] of [
 ['annex_departure',[1.6,1.65,-36],'courtyard',48,['court_gate','court_phone']],
 ['court_departure',[15.6,-1.15,-53],'archive',32,['archive_ledger','archive_road','archive_call','archive_gate','archive_sequence_road','archive_sequence_call','archive_sequence_gate','archive_play']],
 ['archive_departure',[1.6,1.65,-34],'plant',36,['plant_diagram','plant_valve_west']],
 ['plant_departure',[1.6,1.65,-38],'parking',22,[]],
])test(`${area}: the arriving pursuer can leave the connecting passage after its door reopens`,async()=>{
 const {buildWorld,disposeWorld,canStandAt}=await import('../lib/world.ts');
 const previousStorage=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:from,notes:[],elapsed:0}):null,setItem(){},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
 const game=createGame(canvas,()=>{},e=>assert.fail(e)),reference=buildWorld(new THREE.Scene(),area);
 try{
  tick();game.continueGame();tick();
  const departing=renderedScene.getObjectByName('resident-remains');departing.position.set(crossing[0]-3,crossing[1]-1.65,crossing[2]);departing.visible=true;
  renderedCamera.position.set(...crossing);tick();
  assert.equal(game.snapshot().story.stage,({courtyard:'court_arrival',archive:'archive_arrival',plant:'plant_arrival',parking:'parking_gate'})[area]);
  const ghost=renderedScene.getObjectByName('resident-remains'),start=ghost.position.clone();
  renderedCamera.position.set(0,1.65,newZ-4);tick(12);
  for(const id of activation){
   const target=reference.targets.find(t=>t.id===id),at=target.mesh.userData.approach;renderedCamera.position.set(at.x,1.65,at.z);
   const dx=target.point.x-at.x,dz=target.point.z-at.z,dy=target.point.y-1.65;
   const yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));
   event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();
   assert.ok(game.snapshot().prompt,`can interact with ${id}`);game.interact();tick();
  }
  if(area==='archive')tick(32.1);
  renderedCamera.position.set(0,1.65,newZ-12);tick(16);
  assert.ok(ghost.visible,'the story activates the pursuit');
  assert.ok(ghost.position.distanceTo(start)>3,`pursuer stuck at ${ghost.position.toArray()}`);
  assert.ok(ghost.position.z<newZ,'the pursuer enters the actual room');
  assert.ok(canStandAt(ghost.position.x,ghost.position.z,reference.solids,.43,reference.bounds),'the pursuing body remains outside solid geometry');
 }finally{game.dispose();disposeWorld(reference.root);win.localStorage=previousStorage;}
});

test('office pursuer is already physically waiting before the recording, rather than appearing on its final frame',()=>{
  const previous=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'office_record',notes:[],elapsed:0}):null,setItem(){},removeItem(){}};
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));
  try{tick();game.continueGame();tick();const ghost=renderedScene.getObjectByName('resident-remains');assert.equal(ghost.visible,true,'returning to the passage must reveal the existing pursuer');const waiting=ghost.position.clone();tick(4);assert.ok(ghost.position.distanceTo(waiting)<.001,'it waits behind the fire door while the records are investigated');assert.equal(game.snapshot().story.stage,'office_record');
    function use(id,pos){renderedCamera.position.set(...pos);const points={record:[-3.7,.86,1.8],fuse:[-2.1,1.17,-5.7],office_install:[5.39,1.02,-4.55],security_power:[5.415,.95,-3.45],circuit_b:[5.34,1.45,-4],circuit_a:[5.34,1.45,-4.55],circuit_c:[5.34,1.45,-3.45],tape_next:[-1.95,.9,1.8],monitor:[-2.65,1.17,1.79]},point=points[id],dx=point[0]-pos[0],dy=point[1]-pos[1],dz=point[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();assert.ok(game.snapshot().prompt,id);game.interact();tick();}
    for(const [id,pos] of [['record',[-3.7,1.65,2.8]],['fuse',[-2.1,1.65,-4.95]],['office_install',[4.55,1.65,-4.55]],['circuit_b',[4.55,1.65,-4]],['circuit_c',[4.55,1.65,-3.45]],['security_power',[4.55,1.65,-3.45]],['tape_next',[-1.95,1.65,2.6]],['monitor',[-2.65,1.65,2.6]]])use(id,pos);
    tick(13);assert.equal(game.snapshot().story.stage,'office_key');assert.ok(ghost.position.distanceTo(waiting)>1,'the pursuer must leave its waiting point after playback');assert.ok(renderedScene.getObjectByName('connection-fire-door').rotation.y<-1.4,'the waiting body must not jam the opening door');
  }
  finally{game.dispose();win.localStorage=previous;}
});

test('the lower stair door opens in place and the repeated floor begins only after walking around its corner',async()=>{
  const previous=win.localStorage;
  win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'stairs_loop',notes:[],elapsed:0}):null,setItem(){},removeItem(){}};
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));
  function aim(target){const p=renderedCamera.position,dx=target[0]-p.x,dy=target[1]-p.y,dz=target[2]-p.z;const y=Math.atan2(-dx,-dz),x=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(y-renderedCamera.rotation.y)/.0021,clientY:-(x-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();}
  try{
    await game.ready;tick();game.continueGame();tick();
    // One placement isolates the lower door; every crossing below uses physical input.
    tick(5); // The stair pursuer's authored arrival delay has elapsed.
    renderedCamera.position.set(1,-1.15,-4.8);aim([1,-1.55,-5.65]);assert.ok(game.snapshot().prompt);
    const before=renderedCamera.position.toArray(),heading=renderedCamera.rotation.y;game.interact();
    assert.deepEqual(renderedCamera.position.toArray(),before,'opening a leaf cannot relocate the player');
    assert.equal(game.snapshot().story.stage,'stairs_descent');assert.equal(renderedCamera.rotation.y,heading);
    tick(.2);game.pause();const leaf=renderedScene.getObjectByName('stairs-loop-door'),angle=leaf.rotation.y,at=renderedCamera.position.toArray();tick(3);assert.equal(leaf.rotation.y,angle);assert.deepEqual(renderedCamera.position.toArray(),at);game.pause(false);tick(.9);
    assert.ok(leaf.rotation.y>1.2);assert.equal(game.snapshot().story.stage,'stairs_descent','waiting for the door cannot complete descent');
    const repeated=renderedCamera.position.toArray();game.interact();assert.deepEqual(renderedCamera.position.toArray(),repeated,'rechecking the opened door cannot teleport either');
    const pursuitStart=renderedScene.getObjectByName('resident-remains').position.clone();
    game.key('ShiftLeft',true);
    aim([1,-1.15,-7.85]);game.key('KeyW',true);for(let i=0;i<120&&renderedCamera.position.z>-7.82;i++)tick(.025);game.key('KeyW',false);
    assert.ok(renderedCamera.position.z<-7.82,'the opened wall has a real walkable route');assert.equal(game.snapshot().story.stage,'stairs_descent');
    aim([4,-1.15,-7.85]);game.key('KeyW',true);
    for(let i=0;i<120&&renderedCamera.position.x<3.98;i++){const at=renderedCamera.position.clone();tick(.025);assert.ok(renderedCamera.position.distanceTo(at)<.09,'turning the corner cannot swap camera coordinates');}game.key('KeyW',false);
    assert.equal(game.snapshot().story.stage,'stairs_descent','the first corner leads to a real lower landing');
    aim([4,-1.15,-13]);game.key('KeyW',true);
    const ghost=renderedScene.getObjectByName('resident-remains');
    for(let i=0;i<150&&game.snapshot().story.stage==='stairs_descent';i++){const at=renderedCamera.position.clone(),enemy=ghost.position.clone();tick(.025);assert.ok(renderedCamera.position.distanceTo(at)<.09,'continuous movement onto the repeated floor');assert.ok(ghost.position.distanceTo(enemy)<.12,'the pursuer continues along the same route');assert.equal(ghost.visible,true,'no hidden waiting actor can pop into this landing');}game.key('KeyW',false);
    assert.equal(game.snapshot().story.stage,'stairs_clue');assert.ok(renderedCamera.position.x>3.9&&renderedCamera.position.z<-12);assert.ok(Math.abs(renderedCamera.position.y+1.15)<.03);
    game.key('ShiftLeft',false);
    assert.ok(game.snapshot().message.includes('23'),'the repeated floor is revealed after reaching the physical landing');
    tick(45);
    assert.ok(ghost.position.distanceTo(pursuitStart)>8,`the pursuer actually follows through the opened doorway: ${pursuitStart.toArray()} -> ${ghost.position.toArray()}`);
    assert.ok(['dying','ended'].includes(game.snapshot().story.stage),'a player waiting on the repeated landing remains catchable');
  }finally{game.dispose();win.localStorage=previous;}
});

test('the stair gallery transition waits for the visible fire door to close and allows retreat',async()=>{
  const previous=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'stairs_loop',notes:[],elapsed:0}):null,setItem(){},removeItem(){}};
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));
  function aim(target){const p=renderedCamera.position,dx=target[0]-p.x,dy=target[1]-p.y,dz=target[2]-p.z,y=Math.atan2(-dx,-dz),x=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(y-renderedCamera.rotation.y)/.0021,clientY:-(x-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();}
  try{
    await game.ready;tick();game.continueGame();tick();
    // Isolate the upper door after completing the prerequisite interactions.
    renderedCamera.position.set(1,-1.15,-4.8);aim([1,-1.55,-5.65]);game.interact();tick(1);
    renderedCamera.position.set(4,-1.15,-12.2);tick();assert.equal(game.snapshot().story.stage,'stairs_clue');
    renderedCamera.position.set(5.25,-1.15,-13.35);aim([5.25,-1.15,-12.15]);game.interact();assert.equal(game.snapshot().story.stage,'stairs_reverse');
    renderedCamera.position.set(3,1.65,-22.65);aim([3,1.25,-23.5]);game.interact();tick(1);
    const door=renderedScene.getObjectByName('stairs-passage-door');assert.ok(door.rotation.y>1.2);
    aim([3,1.65,-26]);game.key('KeyW',true);for(let i=0;i<130&&renderedCamera.position.z>-25.4;i++)tick(.025);game.key('KeyW',false);
    assert.ok(renderedCamera.position.z<-25.35,'the player physically clears the leaf sweep');
    assert.equal(game.snapshot().story.stage,'stairs_passage','crossing an open leaf does not erase the stairwell');
    game.pause();const angle=door.rotation.y,position=renderedCamera.position.toArray();tick(3);assert.equal(door.rotation.y,angle);assert.deepEqual(renderedCamera.position.toArray(),position);game.pause(false);
    aim([3,1.65,-23]);game.key('KeyW',true);for(let i=0;i<30&&renderedCamera.position.z<-24.75;i++)tick(.025);game.key('KeyW',false);tick(.8);
    assert.ok(renderedCamera.position.z>-24.8,`the door permits physical retreat before it closes: ${renderedCamera.position.toArray()}, leaf ${door.rotation.y}`);
    assert.equal(game.snapshot().story.stage,'stairs_passage');assert.ok(door.rotation.y>1.2,'retreat reopens the same physical leaf');
    aim([3,1.65,-26]);game.key('KeyW',true);for(let i=0;i<80&&renderedCamera.position.z>-25.4;i++)tick(.025);game.key('KeyW',false);
    const before=renderedCamera.position.clone(),heading=renderedCamera.rotation.y;
    for(let i=0;i<120&&game.snapshot().story.stage==='stairs_passage';i++)tick(.025);
    assert.equal(game.snapshot().story.stage,'resident_arrival',`player ${renderedCamera.position.toArray()}, leaf ${door.rotation.y}`);assert.ok(door.rotation.y<.015,'the actual door is closed before changing scenes');
    assert.ok(Math.abs(renderedCamera.position.x-(before.x-3))<.001);assert.ok(Math.abs(renderedCamera.position.z-(before.z+35.5))<.001);assert.equal(renderedCamera.rotation.y,heading);
  }finally{game.dispose();win.localStorage=previous;}
});

test('a pursuer already through the upper fire door remains visible and lethal after the gallery transition',async()=>{
  const previous=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'stairs_loop',notes:[],elapsed:0}):null,setItem(){},removeItem(){}};
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
  function aim(target){const p=renderedCamera.position,dx=target[0]-p.x,dy=target[1]-p.y,dz=target[2]-p.z,y=Math.atan2(-dx,-dz),x=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(y-renderedCamera.rotation.y)/.0021,clientY:-(x-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();}
  try{
    await game.ready;tick();game.continueGame();tick();
    renderedCamera.position.set(1,-1.15,-4.8);aim([1,-1.55,-5.65]);game.interact();tick(1);
    renderedCamera.position.set(4,-1.15,-12.2);tick();renderedCamera.position.set(5.25,-1.15,-13.35);aim([5.25,-1.15,-12.15]);game.interact();
    renderedCamera.position.set(3,1.65,-22.65);aim([3,1.25,-23.5]);game.interact();tick(6);
    const ghost=renderedScene.getObjectByName('resident-remains');ghost.position.set(3,0,-24.6);ghost.rotation.y=Math.PI;ghost.visible=true;
    renderedCamera.position.set(3,1.65,-26.7);aim([3,.65,-24.6]);game.key('KeyS',true);
    let before;
    for(let i=0;i<160&&game.snapshot().story.stage==='stairs_passage';i++){before={player:renderedCamera.position.clone(),ghost:ghost.position.clone(),heading:ghost.rotation.y,bodyY:ghost.getObjectByName('ghost-body').position.y};tick(.025);}
    game.key('KeyS',false);assert.equal(game.snapshot().story.stage,'resident_arrival');
    const current=renderedScene.getObjectByName('resident-remains'),offset=new THREE.Vector3(-3,0,35.5);
    assert.equal(current.visible,true,'the on-screen pursuer cannot disappear at the closed-door scene change');
    assert.ok(current.position.distanceTo(before.ghost.add(offset))<.06,'both actors retain the same physical relation');
    assert.ok(Math.abs(current.rotation.y-before.heading)<.08,'the pursuing body retains its travel heading');
    assert.ok(Math.abs(current.getObjectByName('ghost-body').position.y-before.bodyY)<.002,'the visible body cannot drop when stair grounding ends');
    tick(.1);assert.ok(chaseLevel>0,'pursuit music continues through the transition');tick(8);
    assert.ok(['dying','ended'].includes(game.snapshot().story.stage),'arrival cannot disable contact with the carried pursuer');
  }finally{game.dispose();win.localStorage=previous;}
});


test('the two investigation boundaries retain a moving follower and save the carried threat immediately',async()=>{
 const previous=win.localStorage;
 try{for(const c of [
  {stage:'court_departure',next:'archive_arrival',notes:['court_gate','court_confirm'],player:[15.55,-1.15,-53],ghost:[14,-2.8,-53]},
  {stage:'archive_departure',next:'plant_arrival',notes:['archive_ledger','archive_road','archive_call','archive_gate','archive_play'],player:[1.55,1.65,-34],ghost:[0,0,-34]},
 ]){
  let raw=JSON.stringify({version:2,stage:c.stage,notes:c.notes,elapsed:0,circuit:[],pursuit:false});win.localStorage={getItem:k=>k.includes('progress')?raw:null,setItem:(k,v)=>{if(k.includes('progress'))raw=v;},removeItem(){}};
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
  try{
   await game.ready;tick();game.continueGame();tick(.1);const before=renderedScene.getObjectByName('resident-remains');before.position.set(...c.ghost);before.visible=true;renderedCamera.position.set(...c.player);tick(.025);
   assert.equal(game.snapshot().story.stage,c.next);const after=renderedScene.getObjectByName('resident-remains'),at=after.position.clone();tick(.7);assert.equal(after.visible,true,'follower must emerge after its actual travel delay at '+c.next);
   tick(1);assert.ok(after.position.distanceTo(at)>.1,'follower freezes after entering '+c.next);assert.equal(JSON.parse(raw).pursuit,true,'an immediate quit cannot erase the just-carried follower');
  }finally{game.dispose();}
 }}finally{win.localStorage=previous;}
});

test('continuing a threatened archive investigation preserves conclusions and restores an entrance approach',async()=>{
 const previous=win.localStorage;let raw=JSON.stringify({version:2,stage:'archive_edit',notes:['court_confirm','archive_ledger','archive_road','archive_call','archive_gate'],circuit:['archive_sequence_road'],elapsed:480,pursuit:true});
 win.localStorage={getItem:k=>k.includes('progress')?raw:null,setItem:(k,v)=>{if(k.includes('progress'))raw=v;},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{
  await game.ready;tick();game.continueGame();tick(.1);assert.deepEqual(game.snapshot().story.circuit,['archive_sequence_road']);const g=renderedScene.getObjectByName('resident-remains'),at=g.position.clone();assert.equal(g.visible,false,'the checkpoint leaves a fair approach interval');
  tick(3.5);assert.equal(g.visible,true,'continue must not disable a previously carried hunt');assert.ok(g.position.distanceTo(at)>.05,'the restored follower must move through the actual entry route');assert.equal(game.snapshot().story.stage,'archive_edit','the player cannot be caught at spawn before the approach is announced');
 }finally{game.dispose();win.localStorage=previous;}
});

test('a threatened investigation retry preserves marked evidence and allows the follower to approach again',async()=>{
 const previous=win.localStorage;const raw=JSON.stringify({version:2,stage:'archive_edit',notes:['court_confirm','archive_ledger','archive_road','archive_call','archive_gate'],circuit:['archive_sequence_call'],elapsed:480,pursuit:true});win.localStorage={getItem:k=>k.includes('progress')?raw:null,setItem(){},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{
  await game.ready;tick();game.continueGame();tick(3.1);const g=renderedScene.getObjectByName('resident-remains');g.position.copy(renderedCamera.position);g.position.y=0;g.position.z+=.45;g.visible=true;tick(.025);assert.equal(game.snapshot().story.stage,'dying');tick(3.3);assert.equal(game.snapshot().story.stage,'ended');
  game.start(true);tick(.1);assert.equal(game.snapshot().story.stage,'archive_edit');assert.deepEqual(game.snapshot().story.circuit,['archive_sequence_call']);assert.equal(g.visible,false,'retry starts outside contact range');tick(3.1);assert.equal(g.visible,true,'retry must restore the carried follower');assert.equal(game.snapshot().story.stage,'archive_edit');assert.equal(game.snapshot().paused,false);
 }finally{game.dispose();win.localStorage=previous;}
});

test('stopping an archive recording leaves a visible nearby pursuer moving',async()=>{
 const previous=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'archive_edit',notes:['archive_ledger','archive_road','archive_call','archive_gate'],circuit:[],elapsed:0,pursuit:true}):null,setItem(){},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 function aim(p,target){renderedCamera.position.set(...p);const dx=target[0]-p[0],dy=target[1]-p[1],dz=target[2]-p[2],y=Math.atan2(-dx,-dz),x=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(y-renderedCamera.rotation.y)/.0021,clientY:-(x-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick(.025);}
 try{
  await game.ready;tick();game.continueGame();tick(2.1);const g=renderedScene.getObjectByName('resident-remains');g.position.set(6.6,0,-17.2);g.rotation.y=2.1;g.visible=true;
  aim([9,1.65,-18.6],[9,.94,-19.76]);game.interact();assert.match(game.snapshot().message,/어느 쪽/);
  aim([8.88,1.65,-18.45],[8.88,.94,-19.61]);game.interact();assert.match(game.snapshot().message,/일시정지/);const at=g.position.clone(),elapsed=game.snapshot().elapsed;tick(.35);assert.ok(g.position.distanceTo(at)>.2,'record pause must not pause the actual hunt');assert.ok(game.snapshot().elapsed>elapsed+.3);assert.equal(game.snapshot().paused,false);assert.equal(game.snapshot().story.stage,'archive_edit');
 }finally{game.dispose();win.localStorage=previous;}
});

test('an active follower still travelling offscreen is carried through the next investigation boundary',async()=>{
 const previous=win.localStorage;let raw=JSON.stringify({version:2,stage:'archive_departure',notes:['archive_ledger','archive_road','archive_call','archive_gate','archive_play'],circuit:[],elapsed:480,pursuit:true,pursuitWait:24});win.localStorage={getItem:k=>k.includes('progress')?raw:null,setItem:(k,v)=>{if(k.includes('progress'))raw=v;},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{
  await game.ready;tick();game.continueGame();tick(.1);assert.equal(renderedScene.getObjectByName('resident-remains').visible,false,'the follower is still in transit');
  renderedCamera.position.set(1.55,1.65,-34);tick(.025);assert.equal(game.snapshot().story.stage,'plant_arrival');const saved=JSON.parse(raw);assert.equal(saved.pursuit,true,'invisibility cannot cancel an existing hunt at the next boundary');assert.ok(saved.pursuitWait>=24,'the remaining old travel time must be added, not erased');
  tick(12);assert.equal(renderedScene.getObjectByName('resident-remains').visible,false,'the player cannot be overtaken by teleporting the delayed pursuer');assert.equal(game.snapshot().story.stage,'plant_arrival');
 }finally{game.dispose();win.localStorage=previous;}
});

test('continuing a distant incoming hunt respects its saved remaining travel time before approaching',async()=>{
 const previous=win.localStorage;let raw=JSON.stringify({version:2,stage:'plant_arrival',notes:['archive_play'],circuit:[],elapsed:500,pursuit:true,pursuitWait:12});win.localStorage={getItem:k=>k.includes('progress')?raw:null,setItem:(k,v)=>{if(k.includes('progress'))raw=v;},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{
  await game.ready;tick();game.continueGame();tick(3);const g=renderedScene.getObjectByName('resident-remains'),at=g.position.clone();assert.equal(g.visible,false,'continue may not turn12sec of transit into a2sec arrival');assert.equal(game.snapshot().story.stage,'plant_arrival');
  tick(10);assert.equal(g.visible,true,'the pending follower must eventually arrive');assert.ok(g.position.distanceTo(at)>.05,'the arrived follower resumes actual navigation');
 }finally{game.dispose();win.localStorage=previous;}
});

test('using a plant valve cannot reveal a pursuer that is still physically in transit',async()=>{
 const previous=win.localStorage;let raw=JSON.stringify({version:2,stage:'plant_isolate',notes:['archive_play','plant_diagram'],circuit:[],elapsed:500,pursuit:true,pursuitWait:24});win.localStorage={getItem:k=>k.includes('progress')?raw:null,setItem:(k,v)=>{if(k.includes('progress'))raw=v;},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{
  await game.ready;tick();game.continueGame();tick(.1);const ghost=renderedScene.getObjectByName('resident-remains');assert.equal(ghost.visible,false);
  renderedCamera.position.set(-8,1.65,20.1);const target=new THREE.Vector3(-8,1.22,19.32),d=target.sub(renderedCamera.position),yaw=Math.atan2(-d.x,-d.z),pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));
  event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();
  assert.match(game.snapshot().prompt,/서측/);game.interact();assert.ok(game.snapshot().story.notes.includes('plant_valve_west'));assert.equal(ghost.visible,false,'operating the valve must not teleport the delayed follower into view');
 }finally{game.dispose();win.localStorage=previous;}
});

test('continuing into the garage retains a saved distant follower instead of spawning it beside the entrance',async()=>{
 const previous=win.localStorage;const raw=JSON.stringify({version:2,stage:'parking_gate',notes:['plant_drained'],circuit:[],elapsed:1200,pursuit:true,pursuitWait:12});win.localStorage={getItem:k=>k.includes('progress')?raw:null,setItem(){},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{await game.ready;tick();game.continueGame();tick(.1);const ghost=renderedScene.getObjectByName('resident-remains');assert.equal(ghost.visible,false,'continue must retain the saved pending garage approach');tick(11);assert.equal(ghost.visible,false);tick(2);assert.equal(ghost.visible,true);}
 finally{game.dispose();win.localStorage=previous;}
});

test('a recovered parking key survives an older entry save and a death retry without another search',async()=>{
 const previous=win.localStorage;let raw=JSON.stringify({version:2,stage:'parking_gate',notes:['plant_drained','car_passenger','car_search'],circuit:[],elapsed:1200,pursuit:true,pursuitWait:12});win.localStorage={getItem:k=>k.includes('progress')?raw:null,setItem:(k,v)=>{if(k.includes('progress'))raw=v;},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{await game.ready;tick();game.continueGame();tick(.1);assert.equal(game.snapshot().story.stage,'parking_alarm');assert.equal(renderedScene.getObjectByName('garage-car-key').visible,false);
  const g=renderedScene.getObjectByName('resident-remains');g.visible=true;g.position.copy(renderedCamera.position);g.position.y=0;tick(.1);assert.equal(game.snapshot().story.stage,'dying');game.start(true);tick(.1);assert.equal(game.snapshot().story.stage,'parking_alarm');assert.equal(renderedScene.getObjectByName('garage-car-key').visible,false);
 }finally{game.dispose();win.localStorage=previous;}
});
test('a boarding checkpoint never redisplays a key that has already been recovered',async()=>{
 const previous=win.localStorage;const raw=JSON.stringify({version:2,stage:'car_departure',notes:['plant_drained','car_passenger','car_search'],circuit:[],elapsed:1300});win.localStorage={getItem:k=>k.includes('progress')?raw:null,setItem(){},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{await game.ready;tick();game.continueGame();tick(.1);assert.equal(game.snapshot().story.stage,'car_departure');const keys=[];renderedScene.traverse(o=>{if(o.name==='garage-car-key')keys.push(o);});assert.ok(keys.length);assert.ok(keys.every(k=>!k.visible),'the cinematic must reconcile recovered inventory before its early render return');}
 finally{game.dispose();win.localStorage=previous;}
});

// These scenarios exercise perception and timing through the real game loop;
// only rendering/audio device boundaries use the existing file-level doubles.
async function parkingAlarmFixture(wait=0){
 const previous=win.localStorage,raw=JSON.stringify({version:2,stage:'parking_alarm',notes:['plant_drained','car_passenger','car_search'],circuit:[],elapsed:1400,pursuit:wait>0,pursuitWait:wait});
 win.localStorage={getItem:k=>k.includes('progress')?raw:null,setItem(){},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 await game.ready;tick();game.continueGame();tick(.1);const ghost=renderedScene.getObjectByName('resident-remains');
 if(!wait){ghost.position.set(-8,0,8);ghost.rotation.y=Math.PI;}
 renderedCamera.position.set(-10.8,1.65,17.4);const d=new THREE.Vector3(-10.8,1.4,16.18).sub(renderedCamera.position),yaw=Math.atan2(-d.x,-d.z),pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));
 event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();
 assert.match(game.snapshot().prompt,/경보/);game.interact();assert.equal(game.snapshot().story.stage,'parking_run');
 return {game,ghost,close(){game.dispose();win.localStorage=previous;}};
}
test('a ringing garage alarm cannot blind the pursuer to a player in front of it',async()=>{
 const f=await parkingAlarmFixture();try{
  renderedCamera.position.set(10,1.65,-18);tick(3);f.ghost.position.set(-8,0,8);f.ghost.rotation.y=Math.PI;renderedCamera.position.set(-8,1.65,3.5);
  const before=f.ghost.position.z;tick(.5);assert.ok(f.ghost.position.z<before-.3,'seeing the player must reverse the lure and pursue immediately');assert.ok(chaseLevel>.4,'the discovered player receives the actual pursuit music state');
 }finally{f.close();}
});
test('a latched garage alarm keeps attracting an unseen pursuer after the former silent timeout',async()=>{
 const f=await parkingAlarmFixture();try{
  renderedCamera.position.set(10,1.65,-18);tick(34);assert.equal(f.game.snapshot().story.stage,'parking_run');assert.ok(Math.hypot(f.ghost.position.x+10.8,f.ghost.position.z-16.5)<.7,'the bell remains the distraction while no player has been perceived');assert.ok(deviceLevels.alarm>.05,'the actual game still requests the spatial ringing loop');
 }finally{f.close();}
});
test('operating a garage alarm preserves a pending follower arrival',async()=>{
 const f=await parkingAlarmFixture(14);try{
  renderedCamera.position.set(10,1.65,-18);tick(13);assert.equal(f.ghost.visible,false,'pressing the bell must not teleport the carried follower into view');tick(1.5);assert.equal(f.ghost.visible,true,'the carried follower eventually arrives and can investigate the bell');
 }finally{f.close();}
});

test('the garage bell masks distant footsteps while close running still reveals the player',async()=>{
 const f=await parkingAlarmFixture();try{
  renderedCamera.position.set(10,1.65,-18);tick(3);f.ghost.position.set(-8,0,8);f.ghost.rotation.y=0;renderedCamera.position.set(-8,1.65,0);
  f.game.key('KeyW',true);f.game.key('ShiftLeft',true);tick(.5);f.game.key('KeyW',false);f.game.key('ShiftLeft',false);
  assert.ok(f.ghost.position.z>8.3,'a distant runner behind the pursuer remains masked by the bell');
  f.ghost.position.set(-8,0,8);f.ghost.rotation.y=0;renderedCamera.position.set(-8,1.65,5.5);f.game.key('KeyW',true);f.game.key('ShiftLeft',true);tick(.2);f.game.key('KeyW',false);f.game.key('ShiftLeft',false);
  assert.ok(f.ghost.position.z<7.8,'a runner within a few steps must still be heard even behind the pursuer');assert.ok(chaseLevel>.4);
 }finally{f.close();}
});

test('after investigating a lost player the pursuer leaves the old sighting and returns to the bell',async()=>{
 const f=await parkingAlarmFixture();try{
  renderedCamera.position.set(10,1.65,-18);tick(3);f.ghost.position.set(-8,0,8);f.ghost.rotation.y=Math.PI;renderedCamera.position.set(-8,1.65,3.5);tick(.2);
  assert.ok(chaseLevel>.4,'the old sighting was actually perceived before the player broke contact');renderedCamera.position.set(10,1.65,-18);tick(18);
  assert.ok(f.ghost.position.z>13,`the search must be completed instead of oscillating around its remembered position: ${f.ghost.position.toArray()}`);
 }finally{f.close();}
});

test('being caught leaves the latched bell ringing until the ended screen and retry resets it',async()=>{
 const f=await parkingAlarmFixture();try{
  tick(.1);assert.ok(deviceLevels.alarm>.1);f.ghost.position.copy(renderedCamera.position);f.ghost.position.y=0;tick(.1);assert.equal(f.game.snapshot().story.stage,'dying');assert.ok(deviceLevels.alarm>.1,'the physical bell does not switch off at the contact frame');tick(3.3);assert.equal(f.game.snapshot().story.stage,'ended');assert.equal(deviceLevels.alarm,0);f.game.start(true);tick(.1);assert.equal(f.game.snapshot().story.stage,'parking_alarm');assert.equal(deviceLevels.alarm,0);assert.equal(renderedScene.getObjectByName('fire-call-button').position.z,16.117);
 }finally{f.close();}
});

async function annexDialFixture(stage='annex_unlock',wait=0,earlyNotes){
 const previous=win.localStorage,notes=earlyNotes??['annex_map','annex_fuse','annex_badge','annex_notice',...(stage==='annex_unlock'?['annex_call']:[])];
 win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage,notes,circuit:[],elapsed:700,pursuit:wait>0,pursuitWait:wait}):null,setItem(){},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));await game.ready;tick();game.continueGame();tick(.1);
 const {buildWorld,disposeWorld}=await import('../lib/world.ts'),reference=buildWorld(new THREE.Scene(),'annex');
 function use(id){const target=reference.targets.find(t=>t.id===id);assert.ok(target,`physical control ${id} exists`);const at=target.mesh.userData.approach;renderedCamera.position.set(at.x,1.65,at.z);const dx=target.point.x-at.x,dy=target.point.y-1.65,dz=target.point.z-at.z,yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();game.interact();}
 return {game,use,reference,close(){game.dispose();disposeWorld(reference.root);win.localStorage=previous;}};
}
test('V83 physical power restoration enables direct home calling before any optional records',async()=>{
 const f=await annexDialFixture('annex_restore',0,['annex_map','annex_fuse']);
 try{f.use('annex_restore');assert.equal(f.game.snapshot().story.stage,'annex_unlock');assert.equal(f.game.snapshot().story.notes.includes('annex_badge'),false);
  for(const n of '2803')f.use('annex_digit_'+n);f.use('annex_dial');assert.match(f.game.snapshot().objective,/2803호 호출 중/);tick(4.6);assert.equal(f.game.snapshot().story.stage,'annex_exit_ready');assert.ok(f.game.snapshot().story.notes.includes('annex_line_home'));
 }finally{f.close();}
});
test('V83 a legacy search can call the victim and retains her answered cry without releasing the door',async()=>{
 const f=await annexDialFixture('annex_search',0,['annex_map','annex_fuse']);
 try{voiceCalls.length=0;for(const n of '1704')f.use('annex_digit_'+n);f.use('annex_dial');tick(3);assert.deepEqual(voiceCalls,['cry']);assert.match(f.game.snapshot().message,/흐느/);tick(5.1);assert.equal(f.game.snapshot().story.stage,'annex_search');assert.ok(f.game.snapshot().story.notes.includes('annex_line_victim'));assert.equal(f.game.snapshot().story.notes.includes('annex_line_home'),false);assert.match(f.game.snapshot().message,/응답|울음|수신/);
 }finally{f.close();}
});
test('V83 the two-digit duty extension plays its recorded guidance and grants a note only after completion',async()=>{
 const f=await annexDialFixture('annex_unlock',0,['annex_map','annex_fuse']);
 try{voiceCalls.length=0;for(const n of '17')f.use('annex_digit_'+n);f.use('annex_dial');assert.match(f.game.snapshot().objective,/내선 17/);tick(3);assert.deepEqual(voiceCalls,['archive-guard']);assert.equal(f.game.snapshot().story.notes.includes('annex_line_office'),false);tick(7.8);assert.ok(f.game.snapshot().story.notes.includes('annex_line_office'));assert.equal(f.game.snapshot().story.stage,'annex_unlock');
 }finally{f.close();}
});
test('V83 external emergency numbers explain the internal-only line without inventing a connected call',async()=>{
 const f=await annexDialFixture('annex_unlock',0,['annex_map','annex_fuse']);
 try{voiceCalls.length=0;for(const n of '112')f.use('annex_digit_'+n);f.use('annex_dial');tick(1);assert.match(f.game.snapshot().message,/구내|외부 발신/);assert.deepEqual(voiceCalls,[]);assert.equal(f.game.snapshot().story.stage,'annex_unlock');assert.equal(f.game.snapshot().story.notes.includes('annex_line_home'),false);
 }finally{f.close();}
});
test('V83 restoring power awakens the local pursuer even when optional records were skipped',async()=>{
 const f=await annexDialFixture('annex_restore',0,['annex_map','annex_fuse']);
 try{f.use('annex_restore');renderedCamera.position.set(.7,1.65,-19.7);tick(11);const ghost=renderedScene.getObjectByName('resident-remains');assert.ok(ghost.visible);const point=ghost.position.clone();tick(.5);assert.ok(point.distanceTo(ghost.position)>.2,'using knowledge cannot disable pursuit');
 }finally{f.close();}
});
test('V83 completed side calls survive save/continue and describe an unlocked but still closed exit accurately',async()=>{
 const f=await annexDialFixture('annex_exit_ready',90,['annex_map','annex_fuse','annex_line_home']);
 try{for(const n of '1704')f.use('annex_digit_'+n);f.use('annex_dial');tick(8.1);assert.equal(f.game.snapshot().story.stage,'annex_exit_ready');assert.ok(f.game.snapshot().story.notes.includes('annex_line_victim'));assert.equal(renderedScene.getObjectByName('expansion-exit-door').rotation.y,0,'the actual leaf still needs opening');assert.match(f.game.snapshot().message,/잠금/);
  const {readProgress,writeProgress}=await import('../lib/preferences.ts');let raw;const storage={setItem:(_,v)=>raw=v,getItem:()=>raw};writeProgress(storage,f.game.snapshot().story,f.game.snapshot().elapsed,true,45);const restored=readProgress(storage);assert.equal(restored.stage,'annex_exit_ready');assert.ok(restored.notes.includes('annex_line_victim'));assert.ok(restored.notes.includes('annex_line_home'));
 }finally{f.close();}
});
test('V72 early annex recorder evidence requires the actual completed playback in each pre-power phase',async()=>{
 for(const stage of ['annex_arrival','annex_fuse','annex_restore']){const notes=stage==='annex_arrival'?[]:['annex_map',...(stage==='annex_restore'?['annex_fuse']:[])],f=await annexDialFixture(stage,0,notes);try{voiceCalls.length=0;f.use('annex_call');assert.equal(f.game.snapshot().story.notes.includes('annex_call'),false,stage+' cannot grant an unheard clue');assert.deepEqual(voiceCalls,['archive-guard']);tick(3);assert.equal(f.game.snapshot().story.notes.includes('annex_call'),false);tick(4.9);assert.ok(f.game.snapshot().story.notes.includes('annex_call'));assert.equal(f.game.snapshot().story.stage,stage,'listening cannot bypass the map or fuse');}finally{f.close();}}
});
test('V72 a visible incoming or locally awakened annex pursuer can catch the player before power restoration',async()=>{
 for(const [stage,wait] of [['annex_arrival',.2],['annex_fuse',.2],['annex_restore',.2],['annex_fuse',0]]){const notes=['annex_badge','annex_notice',...(stage==='annex_arrival'?[]:['annex_map']),...(stage==='annex_restore'?['annex_fuse']:[])],f=await annexDialFixture(stage,wait,notes);try{renderedCamera.position.set(0,1.65,-20);tick(wait?2.5:10.2);const ghost=renderedScene.getObjectByName('resident-remains');assert.ok(ghost.visible,'original pursuit should be active');ghost.position.set(0,0,-19.5);tick(.1);assert.equal(f.game.snapshot().story.stage,'dying',stage+' must not allow a visible pursuer through the player');}finally{f.close();}}
});
test('V66 last receiver is dialled physically and only a completed callback releases the exit',async()=>{
 const f=await annexDialFixture();try{assert.equal(renderedScene.getObjectByName('annex-intercom-phone')?.name,'annex-intercom-phone');for(const n of '2803')f.use('annex_digit_'+n);f.use('annex_dial');assert.equal(f.game.snapshot().story.stage,'annex_unlock');assert.match(f.game.snapshot().objective,/2803호 호출 중/,JSON.stringify(f.game.snapshot()));tick(.6);f.use('annex_dial');f.game.pause();const t=f.game.snapshot().elapsed;tick(4);assert.equal(f.game.snapshot().elapsed,t);f.game.pause(false);const p=renderedCamera.position.clone();f.game.key('KeyS',true);tick(.3);f.game.key('KeyS',false);assert.ok(p.distanceTo(renderedCamera.position)>.3);tick(6);assert.equal(f.game.snapshot().story.stage,'annex_exit_ready');assert.ok(f.game.snapshot().story.notes.includes('annex_line_home'));assert.equal(deviceLevels.ringback,0);}
 finally{f.close();}
});
test('V66 an unanswered call can be cancelled and corrected without completing the chapter',async()=>{
 const f=await annexDialFixture();try{for(const n of '1704')f.use('annex_digit_'+n);f.use('annex_dial');tick(1);assert.equal(f.game.snapshot().story.stage,'annex_unlock');f.use('annex_clear');assert.equal(deviceLevels.ringback,0);for(const n of '2803')f.use('annex_digit_'+n);f.use('annex_dial');assert.match(f.game.snapshot().objective,/2803호 호출 중/,JSON.stringify(f.game.snapshot()));tick(6.8);assert.equal(f.game.snapshot().story.stage,'annex_exit_ready');}
 finally{f.close();}
});
test('V66 the annex auxiliary tape is heard before it becomes an earned clue',async()=>{
 const f=await annexDialFixture('annex_search');try{voiceCalls.length=0;f.use('annex_call');assert.equal(f.game.snapshot().story.notes.includes('annex_call'),false);assert.equal(f.game.snapshot().story.stage,'annex_search');assert.deepEqual(voiceCalls,['archive-guard']);tick(3);f.use('annex_call');assert.deepEqual(voiceCalls,['archive-guard']);tick(4.9);assert.equal(f.game.snapshot().story.stage,'annex_search');}
 finally{f.close();}
});


test('V66 nearby console accepts number keys and Enter while pause rejects typing',async()=>{
 const f=await annexDialFixture();try{f.use('annex_clear');event(doc,'keydown',{code:'Digit2'});f.game.pause();event(doc,'keydown',{code:'Digit9'});f.game.pause(false);for(const n of '803'){event(doc,'keydown',{code:'Digit'+n});event(doc,'keyup',{code:'Digit'+n});}event(doc,'keydown',{code:'Enter'});assert.match(f.game.snapshot().objective,/2803호 호출 중/);tick(4.6);assert.equal(f.game.snapshot().story.stage,'annex_exit_ready');}
 finally{f.close();}
});


test('V66 a hidden caller leaves a remembered sound at the console after ringback stops',async()=>{
 const f=await annexDialFixture();try{
  renderedCamera.position.set(11,1.65,-30);tick(10.1);for(const n of '2803')f.use('annex_digit_'+n);const ghost=renderedScene.getObjectByName('resident-remains');f.use('annex_dial');ghost.position.set(0,0,-10.5);ghost.rotation.y=Math.PI;renderedCamera.position.set(11,1.65,-30);f.game.torch();
  tick(4.6);assert.equal(f.game.snapshot().story.stage,'annex_exit_ready');const z=ghost.position.z;tick(.7);assert.ok(ghost.position.z<z-.5,'the ghost continues north to the stationary console after ringback ends');tick(8);assert.equal(f.game.snapshot().story.stage,'annex_exit_ready','the caller remains occluded behind the north room wall');assert.ok(ghost.position.distanceTo(renderedCamera.position)>6);
 }finally{f.close();}
});

test('V66 retry cancels a pending call and restores the earned investigation with an empty dial',async()=>{
 const f=await annexDialFixture();try{for(const n of '2803')f.use('annex_digit_'+n);f.use('annex_dial');tick(1);f.game.start(true);tick(.1);assert.equal(f.game.snapshot().story.stage,'annex_unlock');assert.doesNotMatch(f.game.snapshot().objective,/호출 중/);assert.equal(deviceLevels.ringback,0);assert.ok(f.game.snapshot().story.notes.includes('annex_call'));for(const n of '1704')f.use('annex_digit_'+n);f.use('annex_dial');assert.match(f.game.snapshot().objective,/1704호 호출 중/);tick(8.1);assert.equal(f.game.snapshot().story.stage,'annex_unlock','the cancelled home callback cannot complete a later wrong call');}
 finally{f.close();}
});

async function courtCallFixture(notes=['court_gate','court_log','court_evidence'],wait=0,stage='court_search'){
 const previous=win.localStorage;let raw=JSON.stringify({version:2,stage,notes,circuit:[],elapsed:900,pursuit:wait>0,pursuitWait:wait});win.localStorage={getItem:k=>k.includes('progress')?raw:null,setItem:(k,v)=>{if(k.includes('progress'))raw=v;},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));await game.ready;tick();game.continueGame();tick(.1);
 const {buildWorld,disposeWorld}=await import('../lib/world.ts'),reference=buildWorld(new THREE.Scene(),'courtyard');
 function use(id,position){const t=reference.targets.find(t=>t.id===id);assert.ok(t,`physical emergency control ${id}`);const at=position??t.mesh.userData.approach;renderedCamera.position.set(at.x,1.65,at.z);const d=t.point.clone().sub(renderedCamera.position),yaw=Math.atan2(-d.x,-d.z),pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();game.interact();}
 return {game,use,close(){game.dispose();disposeWorld(reference.root);win.localStorage=previous;}};
}
test('V68 emergency call is heard before collection, repeats the own-voice recording and permits movement and pause',async()=>{
 const f=await courtCallFixture();try{voiceCalls.length=0;f.use('court_phone');assert.equal(f.game.snapshot().story.notes.includes('court_phone'),false);assert.equal(f.game.snapshot().story.stage,'court_search');assert.match(f.game.snapshot().objective,/비상전화/);tick(3);assert.deepEqual(voiceCalls,['archive-denial']);f.use('court_phone');assert.deepEqual(voiceCalls,['archive-denial'],'pressing CALL again must not restart the call');f.game.pause();const t=f.game.snapshot().elapsed;tick(4);assert.equal(f.game.snapshot().elapsed,t);f.game.pause(false);const p=renderedCamera.position.clone();f.game.key('KeyS',true);tick(.3);f.game.key('KeyS',false);assert.ok(p.distanceTo(renderedCamera.position)>.3);tick(8);assert.equal(voiceCalls.filter(x=>x==='archive-denial').length,3);assert.equal(f.game.snapshot().story.stage,'court_code');assert.ok(f.game.snapshot().story.notes.includes('court_phone'));assert.equal(deviceLevels.ringback,0);}
 finally{f.close();}
});
test('V68 emergency call cancellation and retry cannot award a partial or stale call',async()=>{
 const f=await courtCallFixture();try{f.use('court_phone');tick(1);f.use('court_hangup');assert.equal(deviceLevels.ringback,0);tick(11);assert.equal(f.game.snapshot().story.notes.includes('court_phone'),false);f.use('court_phone');tick(1);f.game.start(true);tick(.1);assert.equal(deviceLevels.ringback,0);assert.equal(f.game.snapshot().story.notes.includes('court_phone'),false);assert.doesNotMatch(f.game.snapshot().objective,/비상전화 연결 중/);f.use('court_phone');tick(11);assert.ok(f.game.snapshot().story.notes.includes('court_phone'));}
 finally{f.close();}
});


test('V68 booth sound is remembered at the station after the caller goes behind its backing',async()=>{
 const f=await courtCallFixture();try{renderedCamera.position.set(25,1.65,-34.5);tick(3.3);f.use('court_phone');const ghost=renderedScene.getObjectByName('resident-remains');ghost.position.set(25,0,-21);ghost.rotation.y=Math.PI;renderedCamera.position.set(25,1.65,-34.5);f.game.torch();tick(.7);assert.equal(f.game.snapshot().story.stage,'court_search');assert.ok(ghost.position.z<-21.8,`unseen caller leaves the sound at the booth: ${ghost.position.toArray()}`);assert.ok(ghost.position.distanceTo(renderedCamera.position)>6);}
 finally{f.close();}
});
test('V68 answering the emergency phone preserves a carried follower arrival delay',async()=>{
 const f=await courtCallFixture(undefined,14);try{f.use('court_phone');tick(11);assert.ok(f.game.snapshot().story.notes.includes('court_phone'));assert.equal(renderedScene.getObjectByName('resident-remains').visible,false,'the call cannot teleport a delayed follower into view');tick(3.2);assert.equal(renderedScene.getObjectByName('resident-remains').visible,true);}
 finally{f.close();}
});


test('V68 emergency ringback keeps one device loop while waiting for an answer',async()=>{
 const f=await courtCallFixture();try{const before=deviceStarts.ringback??0;f.use('court_phone');tick(.8);assert.equal((deviceStarts.ringback??0)-before,1,'another area must not stop and restart the courtyard tone every frame');}
 finally{f.close();}
});


test('V68 legacy annex continue also retains a pending carried follower',async()=>{
 const f=await annexDialFixture('annex_unlock',14);try{for(const n of '2803')f.use('annex_digit_'+n);f.use('annex_dial');tick(11);assert.equal(f.game.snapshot().story.stage,'annex_exit_ready');assert.equal(renderedScene.getObjectByName('resident-remains').visible,false);tick(3.2);const ghost=renderedScene.getObjectByName('resident-remains');assert.equal(ghost.visible,true);f.reference.root.updateMatrixWorld(true);const meshes=[];f.reference.root.traverse(o=>{if(o.isMesh&&!f.reference.figure.getObjectById(o.id))meshes.push(o);});const floor=new THREE.Raycaster(new THREE.Vector3(ghost.position.x,.05,ghost.position.z),new THREE.Vector3(0,-1,0),0,.1).intersectObjects(meshes,false)[0];assert.ok(floor&&floor.distance<.051,'restored follower requires real floor inside the annex');const {findPursuitPath}=await import('../lib/navigation.ts');assert.ok(findPursuitPath(ghost.position,{x:0,z:31},f.reference.solids,f.reference.bounds).length,'restored follower needs a route to the arrival spine');const at=ghost.position.clone();tick(1);assert.ok(ghost.position.distanceTo(at)>.3,'released follower actually pursues through the real annex');}
 finally{f.close();}
});


test('V69 an ongoing optional call completes into the journal after opening the exit',async()=>{
 const f=await courtCallFixture(['court_gate','court_confirm','court_key'],0,'court_unlocked');try{f.use('court_phone');tick(1);f.use('court_exit');assert.equal(f.game.snapshot().story.stage,'court_departure');tick(10);assert.ok(f.game.snapshot().story.notes.includes('court_phone'));assert.equal(f.game.snapshot().story.stage,'court_departure');}
 finally{f.close();}
});

test('V69 review: a departure call and repeated CALL require the heard recording before earning the clue',async()=>{
 const f=await courtCallFixture(['court_gate','court_confirm','court_key'],0,'court_departure');try{voiceCalls.length=0;f.use('court_phone');assert.equal(f.game.snapshot().story.notes.includes('court_phone'),false);assert.match(f.game.snapshot().objective,/비상전화 연결 중/);tick(3);assert.deepEqual(voiceCalls,['archive-denial']);f.use('court_phone');assert.equal(f.game.snapshot().story.notes.includes('court_phone'),false);tick(8);assert.ok(f.game.snapshot().story.notes.includes('court_phone'));assert.equal(f.game.snapshot().story.stage,'court_departure');}
 finally{f.close();}
});
test('V69 review: an opened safe rejects rear and side key pickup through its opaque case',async()=>{
 const f=await courtCallFixture(['court_gate','court_confirm'],0,'court_safe_open');try{tick(1.2);f.use('court_key',{x:25,z:29.2});assert.equal(f.game.snapshot().story.stage,'court_safe_open','rear steel panel blocks the key');f.use('court_key',{x:23.9,z:29.9});assert.equal(f.game.snapshot().story.stage,'court_safe_open','side steel panel blocks the key');f.use('court_key');assert.equal(f.game.snapshot().story.stage,'court_unlocked','the open front still permits physical pickup');}
 finally{f.close();}
});

test('all three supported archive conclusions through physical controls unlock the restored record',async()=>{
 const previous=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'archive_edit',notes:['archive_ledger','archive_road','archive_call','archive_gate'],circuit:[],elapsed:900,pursuit:false}):null,setItem(){},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));const {buildWorld,disposeWorld}=await import('../lib/world.ts'),reference=buildWorld(new THREE.Scene(),'archive');
 const press=code=>event(doc,'keydown',{code,repeat:false});
 function aim(id='archive_record_pause'){const t=reference.targets.find(t=>t.id===id),a=t.mesh.userData.approach;renderedCamera.position.set(a.x,1.65,a.z);const d=t.point.clone().sub(renderedCamera.position),yaw=Math.atan2(-d.x,-d.z),pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();}
 try{await game.ready;tick();game.continueGame();tick(.1);
  for(const [source,key,time,choice] of [['road','Digit1',6.1,1],['call','Digit2',12.1,0],['gate','Digit3',9.1,1]]){
   aim('archive_preview_'+source);press(key);tick(time);aim('archive_record_mark');game.interact();const count=game.snapshot().story.circuit.length;
   assert.match(game.snapshot().message,/확인한 사실|끊은 쪽|확인한 행동/);assert.equal(game.snapshot().paused,false);
   aim('archive_record_choice_'+choice);game.interact();assert.ok(game.snapshot().story.notes.includes('archive_sequence_'+source));assert.equal(game.snapshot().story.circuit.length,count+1);
  }
  assert.equal(game.snapshot().story.stage,'archive_reveal');
 }
 finally{game.dispose();disposeWorld(reference.root);win.localStorage=previous;}
});

test('V86 partial archive investigation works from the nearby monitor, checks a conclusion and keeps searching',async()=>{
 const previous=win.localStorage;let saved;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'archive_search',notes:['archive_gate'],circuit:[],elapsed:900,pursuit:false}):null,setItem:(_k,v)=>saved=v,removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));const {buildWorld,disposeWorld}=await import('../lib/world.ts'),reference=buildWorld(new THREE.Scene(),'archive');
 const press=code=>event(doc,'keydown',{code,repeat:false});
 function aim(id){const t=reference.targets.find(t=>t.id===id);assert.ok(t,'real physical target '+id);const a=t.mesh.userData.approach;renderedCamera.position.set(a.x,1.65,a.z);const d=t.point.clone().sub(renderedCamera.position),yaw=Math.atan2(-d.x,-d.z),pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();}
 try{
  await game.ready;tick();game.continueGame();tick(.1);press('Digit3');tick(9.1);press('Enter');assert.equal(game.snapshot().story.circuit.length,0,'entry corridor cannot operate a distant recorder');
  aim('archive_play');press('Digit1');assert.match(game.snapshot().message,/A실|도로.*회수/,'unrecovered sources explain where to find them');
  press('Digit3');tick(9.1);press('Enter');assert.match(game.snapshot().message,/확인한 행동/);assert.equal(game.snapshot().story.circuit.length,0,'a marked frame alone is not a conclusion');
  const at=game.snapshot().elapsed;press('Digit4');assert.match(game.snapshot().message,/맞지 않는다/);tick(3);assert.ok(game.snapshot().elapsed>at+2.9);assert.equal(game.snapshot().paused,false);
  press('Enter');aim('archive_record_choice_1');game.interact();assert.ok(game.snapshot().story.notes.includes('archive_sequence_gate'));assert.equal(game.snapshot().story.stage,'archive_search');assert.equal(game.snapshot().story.notes.includes('archive_road'),false);assert.ok(JSON.parse(saved).circuit.includes('archive_sequence_gate'));
  game.pause();press('Digit1');press('Enter');press('Digit5');assert.equal(game.snapshot().story.circuit.length,1,'paused transport/claim controls do nothing');
 }finally{game.dispose();disposeWorld(reference.root);win.localStorage=previous;}
});

async function v88Garage(stage,notes){
 const previous=win.localStorage,data=new Map([['homecoming.progress.v2',JSON.stringify({version:2,stage,notes,elapsed:1400,pursuit:false})]]);
 win.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};deviceLevels.alarm=0;deviceStarts.alarm=0;
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));await game.ready;tick();game.continueGame();tick();
 function aim(pos,target){renderedCamera.position.set(...pos);const d=new THREE.Vector3(...target).sub(renderedCamera.position),yaw=Math.atan2(-d.x,-d.z),pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();}
 return {game,data,aim,dispose(){game.dispose();win.localStorage=previous;}};
}
test('V88 real garage input finds the car first, cancels boarding and escapes without a mandatory alarm',async()=>{
 const f=await v88Garage('parking_gate',['plant_drained']),{game,aim,data}=f;
 try{
  aim([3.2,1.65,-17.8],[3.98,1.1,-17.8]);assert.ok(game.snapshot().prompt,'the player can inspect their driver door before the pedestrian exit');game.interact();assert.equal(game.snapshot().story.stage,'parking_gate');
  aim([7.1,1.65,-17.8],[6.02,1.1,-17.8]);game.interact();tick(1.1);assert.equal(game.snapshot().story.stage,'parking_key');
  aim([7.1,1.65,-17.8],[5.415,.31,-17.83]);game.interact();tick();assert.equal(game.snapshot().story.stage,'parking_alarm');assert.ok(!game.snapshot().story.notes.includes('exit'));
  aim([3.2,1.65,-17.8],[3.98,1.1,-17.8]);assert.equal(game.snapshot().holdAction,'car_board');
  game.interact();assert.equal(game.snapshot().story.stage,'parking_alarm','a tap cannot jump to cinematic immunity');
  game.key('KeyE',true);const before=game.snapshot().elapsed;tick(.25);assert.ok(game.snapshot().holdProgress>0&&game.snapshot().holdProgress<1);assert.ok(game.snapshot().elapsed>before,'preparing to board cannot pause the game');
  game.key('KeyE',false);tick();assert.equal(game.snapshot().holdProgress,0);
  game.hold(true);tick(.25);game.pause(true);assert.equal(game.snapshot().holdProgress,0);const pausedAt=game.snapshot().elapsed;tick(.2);assert.equal(game.snapshot().elapsed,pausedAt);game.pause(false);
  game.configure({bindings:{...game.getSettings().bindings,interact:'KeyQ'}});event(doc,'keydown',{code:'KeyQ',repeat:false,preventDefault(){}});tick(.95);event(doc,'keyup',{code:'KeyQ'});assert.equal(game.snapshot().story.stage,'car_departure');assert.equal(deviceStarts.alarm,0,'quiet departure must not start an unpressed bell');
  assert.ok(!game.snapshot().story.notes.includes('alarm'));assert.equal(JSON.parse(data.get('homecoming.progress.v2')).stage,'car_departure');
 }finally{f.dispose();}
});
test('V88 the player remains vulnerable during a held car boarding attempt',async()=>{
 const f=await v88Garage('parking_alarm',['plant_drained','car_search']),{game,aim}=f;
 try{
  aim([-10.8,1.65,17.4],[-10.8,1.4,16.18]);game.interact();tick();assert.equal(game.snapshot().story.stage,'parking_run');assert.ok(deviceLevels.alarm>0);
  aim([3.2,1.65,-17.8],[3.98,1.1,-17.8]);game.interact();assert.equal(game.snapshot().story.stage,'parking_run','a tap cannot jump to cinematic immunity');
  game.hold(true);tick(.25);assert.ok(game.snapshot().holdProgress>0);
  const ghost=renderedScene.getObjectByName('resident-remains');ghost.visible=true;ghost.position.set(3.2,0,-17.8);tick();assert.equal(game.snapshot().story.stage,'dying');assert.equal(game.snapshot().holdProgress,0);
 }finally{f.dispose();}
});
test('V88 a latched optional alarm restores its actual ringing and mechanism before another attempt',async()=>{
 const f=await v88Garage('parking_alarm',['plant_drained','car_search','alarm']);
 try{
  assert.ok(deviceLevels.alarm>0,'a continued latched alarm must remain audible');assert.ok(renderedScene.getObjectByName('fire-call-button').position.z<16.11);
  assert.ok(renderedScene.getObjectByName('fire-alarm-pilot').material.emissiveIntensity>.5);assert.equal(f.game.snapshot().story.stage,'parking_alarm');
 }finally{f.dispose();}
});
test('V88 real older drainage guidance does not repeat key or pump work and keeps the alarm optional',async()=>{
 const f=await v88Garage('parking_gate',['pump','car_passenger']);
 try{
  assert.equal(f.game.snapshot().story.stage,'parking_key');
  tick(1.1);f.aim([7.1,1.65,-17.8],[5.415,.31,-17.83]);f.game.interact();tick();assert.equal(f.game.snapshot().story.stage,'parking_alarm');assert.match(f.game.snapshot().message,/배수는 끝났다/);
  f.aim([0,1.65,-20.4],[0,1.2,-21.6]);f.game.interact();assert.match(f.game.snapshot().message,/열쇠는 챙겼다/);assert.equal(f.game.snapshot().story.stage,'parking_alarm');
 }finally{f.dispose();}
 const pumped=await v88Garage('parking_gate',['car_search','valve_a','valve_b']);
 try{assert.equal(pumped.game.snapshot().story.stage,'parking_pump');pumped.aim([-10.5,1.65,-15.5],[-10.5,1.3,-16.65]);pumped.game.interact();assert.equal(pumped.game.snapshot().story.stage,'parking_alarm');assert.match(pumped.game.snapshot().message,/필요하면.*경보/);}finally{pumped.dispose();}
});
test('V89 a pursuer turns toward a reversed route before moving through it backwards',async()=>{
 const f=await v88Garage('parking_alarm',['plant_drained','car_search','alarm']);
 try{
  f.aim([8,1.65,-18],[8,1,-17]);tick(3);
  const ghost=renderedScene.getObjectByName('resident-remains');ghost.position.set(0,0,15);ghost.rotation.y=Math.PI/2;const before=ghost.position.clone();tick(.025);
  const delta=ghost.position.clone().sub(before),forward=new THREE.Vector3(Math.sin(ghost.rotation.y),0,Math.cos(ghost.rotation.y));
  assert.ok(delta.length()<1e-6||delta.normalize().dot(forward)>.2,'a sharp route reversal must not translate the body backwards');
  assert.ok(Math.abs(ghost.rotation.y-Math.PI/2)>.001,'a blocked forward heading still turns toward its route');
 }finally{f.dispose();}
});
test('V89 turning in place transfers body weight into actual crawl strokes',async()=>{
 const f=await v88Garage('parking_alarm',['plant_drained','car_search','alarm']);
 try{
  f.aim([8,1.65,-18],[8,1,-17]);tick(3);const ghost=renderedScene.getObjectByName('resident-remains');ghost.position.set(0,0,15);ghost.rotation.y=Math.PI/2;tick(.025);
  const heights=[];for(let frame=0;frame<10;frame++){const before=ghost.position.clone();tick(.025);if(ghost.position.distanceTo(before)<1e-6)heights.push(ghost.getObjectByName('ghost-shoulder--1').parent.position.y);}
  assert.ok(heights.length>=3,'the reversal includes a real stationary turning interval');
  assert.ok(Math.max(...heights)-Math.min(...heights)>.0002,'the body shifts its weight while stationary feet/hands take turning steps');
 }finally{f.dispose();}
});
test('V89 a real tight-wall route reversal leaves enough time for folded hands to replant',async()=>{
 const {buildWorld,disposeWorld,canStandAt}=await import('../lib/world.ts'),{ghostStrideLength}=await import('../lib/ghost.ts'),reference=buildWorld(new THREE.Scene(),'parking');
 const f=await v88Garage('parking_alarm',['plant_drained','car_search','alarm']);
 try{
  f.aim([8,1.65,10],[8,1,11]);tick(3);const ghost=renderedScene.getObjectByName('resident-remains');ghost.position.set(8.22,0,12);ghost.rotation.y=Math.PI/2;assert.ok(canStandAt(8.22,12,reference.solids,.43,reference.bounds),'the folded pose must be navigable beside the real column');
  const stride=ghostStrideLength(ghost,reference.solids,true);assert.ok(stride<.14,'the real side wall fully folds the reach');const allowed=stride*3*.025/.25;tick(.025);const turned=Math.abs(ghost.rotation.y-Math.PI/2);
  assert.ok(turned>.001,'the pursuer actually reverses toward the alarm route');assert.ok(turned<=allowed+1e-7,`folded-hand turn exceeds its stroke budget: ${turned} > ${allowed}`);
 }finally{f.dispose();disposeWorld(reference.root);}
});

test('V94 a real contact during restored archive playback cannot pass through the player',async()=>{
 const f=await officeAgencyInput({stage:'archive_reveal',notes:['archive_road','archive_call','archive_gate'],circuit:['archive_sequence_road','archive_sequence_call','archive_sequence_gate'],elapsed:850,pursuit:false});
 try{
  f.use([9,1.65,-18.9],[9,1.157,-19.88]);assert.equal(f.game.snapshot().story.stage,'archive_playback');assert.equal(f.game.snapshot().paused,false);
  const ghost=renderedScene.getObjectByName('resident-remains');ghost.visible=true;ghost.position.set(9,0,-18.35);tick();
  assert.equal(f.game.snapshot().story.stage,'dying','the moving pursuer must remain lethal while the restored recording plays');
  assert.equal(f.game.snapshot().story.ending,'caught');assert.equal(f.game.snapshot().story.resume,'archive_reveal','retry returns before the interrupted reveal');
 }finally{f.close();}
});

test('V99 reading the new home estimate cannot restart the apparition clock and is saved without changing the mission',async()=>{
 const f=await officeAgencyInput({stage:'radio',notes:['wake'],elapsed:180});try{
  f.use([...home.radioStart],[...home.radio]);assert.equal(f.game.snapshot().story.stage,'listen');tick(1.75);
  f.use([-6.4197,1.65,5.8],[-6.4197,.8221,7.2238]);assert.ok(f.game.snapshot().story.notes.includes('home_repair'));assert.equal(f.game.snapshot().story.stage,'listen');
  assert.ok(JSON.parse(f.data.get('homecoming.progress.v2')).notes.includes('home_repair'));
  tick(1.15);assert.equal(f.game.snapshot().story.stage,'hide','the original 2.8 second apparition cue must keep its clock during optional reading');
 }finally{f.close();}
});

test('V100 real booth input delays a following ghost without trapping it or granting a safe-room loophole',async()=>{
 const f=await officeAgencyInput({stage:'archive_edit',notes:['archive_road'],circuit:['archive_sequence_road'],elapsed:500,pursuit:true,pursuitWait:0});try{
  const leaf=renderedScene.getObjectByName('archive-booth-hinge').children[0];const point=()=>leaf.localToWorld(new THREE.Vector3(.38,-.13,0)).toArray();
  f.use([6.9,1.65,-17.8],point());assert.ok(f.game.snapshot().story.circuit.includes('archive_booth_close'));assert.equal(f.game.snapshot().story.stage,'archive_edit');tick(1);
  const ghost=renderedScene.getObjectByName('resident-remains');ghost.visible=true;ghost.position.set(4.7,0,-20);ghost.rotation.y=Math.PI/2;
  renderedCamera.position.set(8,1.65,-19);const began=f.game.snapshot().elapsed;let opened=false;
  for(let i=0;i<600;i++){tick(.025);if(!f.game.snapshot().story.circuit.includes('archive_booth_close')){opened=true;break;}}
  assert.ok(opened,'original pursuit must find and push the closed door');assert.ok(f.game.snapshot().elapsed-began>1.8,'the warning buys a finite escape opportunity');assert.equal(f.game.snapshot().story.stage,'archive_edit');assert.ok(soundCalls.includes('knock'));assert.ok(f.game.snapshot().story.circuit.includes('archive_sequence_road'));
  tick(.9);f.use([8,1.65,-17.5],point());assert.equal(f.game.snapshot().story.circuit.includes('archive_booth_close'),false,'cannot repeatedly shut the door on the nearby pursuer');
  for(let i=0;i<100&&ghost.position.x<6.2;i++)tick(.025);assert.ok(ghost.position.x>6.2,'opening must actually admit the original moving body');
 }finally{f.close();}
});

test('V100 occupied forced opening cannot become an indefinite body-block refuge',async()=>{
 const f=await officeAgencyInput({stage:'archive_edit',notes:['archive_road'],circuit:['archive_sequence_road'],elapsed:500,pursuit:true,pursuitWait:0});try{
  const hinge=renderedScene.getObjectByName('archive-booth-hinge'),leaf=hinge.children[0];
  f.use([6.9,1.65,-17.8],leaf.localToWorld(new THREE.Vector3(.38,-.13,0)).toArray());tick(1);
  const ghost=renderedScene.getObjectByName('resident-remains');ghost.visible=true;ghost.position.set(4.7,0,-20);ghost.rotation.y=Math.PI/2;renderedCamera.position.set(8,1.65,-19);
  const knocks=soundCalls.filter(x=>x==='knock').length;
  for(let i=0;i<600&&soundCalls.filter(x=>x==='knock').length===knocks;i++)tick(.025);
  assert.ok(soundCalls.filter(x=>x==='knock').length>knocks,'fixture reaches the original pressure warning');
  renderedCamera.position.set(6.45,1.65,-17.2);tick(8);
  const result={angle:hinge.rotation.y,player:renderedCamera.position.toArray(),ghost:ghost.position.toArray(),stage:f.game.snapshot().story.stage};console.log('occupied force result',JSON.stringify(result));
  assert.ok(Math.abs(hinge.rotation.y)>1.35||['dying','dead'].includes(result.stage),'physical forced opening must recover from the occupied swing instead of leaving a permanent shelter');
  assert.ok(f.game.snapshot().story.circuit.includes('archive_sequence_road'),'earned findings survive the recovery');
 }finally{f.close();}
});
