import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {opening,finale} from '../lib/story.ts';
import {accidentCar} from '../lib/chapters.ts';
import {apartment as home,homePosition as H,apartmentScale as S} from '../lib/apartment-layout.ts';

// Only device boundaries are replaced. Scene geometry, navigation, input,
// simulation timers, ray targets and story transitions run unchanged.
let renderedCamera,renderedScene;const voiceCalls=[],soundCalls=[];let hauntLevel=0,chaseLevel=0;const deviceLevels={phone:0,radio:0};
class Renderer{shadowMap={};getRenderTarget(){return null;}setRenderTarget(){}setPixelRatio(){}setSize(){}clearDepth(){}render(scene,camera){if(scene.name!=='first-person-hands'){renderedCamera=camera;renderedScene=scene;}}dispose(){}}
mock.module('three',{namedExports:{...THREE,WebGLRenderer:Renderer}});
mock.module('../lib/audio.ts',{namedExports:{HorrorAudio:class{start(){}voice(line){voiceCalls.push(line);}stopVoices(){}setTV(){}setDrive(){}setDevice(device,level){deviceLevels[device]=level;}recorded(clip){soundCalls.push(clip);}setHaunt(value){hauntLevel=value;}setChase(value){chaseLevel=value;}setVolume(){}mix(){}recording(){}footstep(kind){soundCalls.push(kind);}pause(){}resume(){}sound(kind){soundCalls.push(kind);}dispose(){}}}});
let nextFrame,clock=0;
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
const doc=new EventTarget();Object.assign(doc,{createElement:()=>({width:0,height:0,getContext:()=>context}),pointerLockElement:null,hidden:false});
Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
const win=new EventTarget();Object.assign(win,{devicePixelRatio:1,matchMedia:()=>({matches:true})});Object.defineProperty(globalThis,'window',{value:win,configurable:true});
Object.assign(globalThis,{ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:fn=>{nextFrame=fn;return 1;},cancelAnimationFrame:()=>{nextFrame=undefined;}});
const {createGame}=await import('../lib/game.ts');
const event=(target,type,properties)=>{const e=new Event(type);Object.assign(e,properties);target.dispatchEvent(e);};
function tick(seconds=.05){for(let left=seconds;left>0;left-=.025){clock+=Math.min(.025,left)*1000;nextFrame(clock);}}

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

test('real interaction loop reaches the ending, requires a held pry, and freezes on pause',()=>{
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const media=win.matchMedia;win.matchMedia=query=>({matches:query.includes('pointer:coarse')});
  const errors=[];const game=createGame(canvas,()=>{},e=>errors.push(e));win.matchMedia=media;tick();game.start();game.skipMemory();tick();
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
  function runTo(x,z){const pos=renderedCamera.position.toArray();aim(pos,[x,pos[1],z],false);game.key('KeyW',true);game.key('ShiftLeft',true);let i=0;while(Math.hypot(renderedCamera.position.x-x,renderedCamera.position.z-z)>.09&&i++<4000&&!['dying','ended'].includes(game.snapshot().story.stage))tick(.025);game.key('KeyW',false);game.key('ShiftLeft',false);assert.ok(!['dying','ended'].includes(game.snapshot().story.stage),`survive route to ${x},${z}`);assert.ok(Math.hypot(renderedCamera.position.x-x,renderedCamera.position.z-z)<.15,`walkable route to ${x},${z}, actual ${renderedCamera.position.toArray()}`);}


  const runHome=(x,z)=>runTo(x*S,z*S),useHome=(pos,target,stage)=>use(H(...pos),H(...target),stage);
  use([home.switch[0]+.9,1.65,home.switch[2]],home.switch,'find_torch');
  use([home.flashlight[0],1.65,home.flashlight[2]-1],home.flashlight,'power');assert.equal(game.snapshot().flashlight,true);
  runHome(3.65,1.8);runHome(0,1.8);
  runHome(0,-1.4);runHome(2.9,-1.4);runHome(2.9,-4.1);
  useHome([3,1.65,-4.3],[2.05,1.6,-4.75],'phone');
  assert.equal(renderedScene.getObjectByName('apartment-lamp-0').intensity,0,'the broken breaker must not restore apartment lighting');
  runHome(2.9,-1.4);runHome(0,-1.4);runHome(-2.1,0);runHome(-2.1,2.4);
  useHome([-2.1,1.65,2.4],[-3.15,.58,2.4],'shoes');
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
  tick(2.8);assert.equal(renderedScene.getObjectByName('lift-door-hand')?.visible,true,'the described fingers are rendered');
  const hand=renderedScene.getObjectByName('lift-door-hand'),finger=hand.children[0];game.pause();const pose=finger.rotation.toArray();tick(4);assert.deepEqual(finger.rotation.toArray(),pose);game.pause(false);
  tick(5.3);assert.equal(game.snapshot().story.stage,'pry');assert.equal(game.snapshot().liftFloor,24);
  aim([0,1.65,-.15],[0,1.3,-1.13]);game.interact();assert.equal(game.snapshot().story.stage,'pry','click alone must not pry the door');
  game.key('KeyE',true);tick(1);assert.ok(game.snapshot().holdProgress>.3&&game.snapshot().holdProgress<.4);
  game.pause();tick(4);assert.equal(game.snapshot().story.stage,'pry');assert.equal(game.snapshot().holdProgress,0);game.pause(false);
  game.hold(true);tick(3.1);game.hold(false);assert.equal(game.snapshot().story.stage,'lift_exit');tick(1);
  use([0,1.65,-.15],[0,1.3,-1.1],'corridor_run');
  runTo(-2.6,16);runTo(-2.6,-16);runTo(0,-18.5);
  use([0,1.65,-18.5],[0,1.25,-19.68],'stairs_loop');
  use([1,-1.15,-4.8],[1,-1.55,-5.65],'stairs_clue');
  use([0,1.65,4.5],[0,1.65,5.7],'stairs_reverse');
  use([-1,4.45,-4.8],[-1,4.05,-5.65],'stairs_passage');
  assert.equal(renderedScene.getObjectByName('resident-1704'),undefined,'opening the stair door does not teleport into a home');
  tick(1);aim(renderedCamera.position.toArray(),[-1,4.45,-7],false);game.key('KeyW',true);for(let i=0;i<100&&game.snapshot().story.stage==='stairs_passage';i++)tick(.025);game.key('KeyW',false);
  assert.equal(game.snapshot().story.stage,'resident_arrival');assert.ok(renderedCamera.position.z>6,'arrive outside 1704');assert.ok(deviceLevels.phone>0);
  runTo(0,7.25);use([0,1.65,7.25],[0,1.25,6.12],'resident_entry');tick(1);runTo(0,4.05);
  assert.equal(game.snapshot().threat,0,'the resident first visit leaves time to investigate');assert.equal(chaseLevel,0);assert.match(game.snapshot().objective,/0\/3/);
  runTo(1.6,4.05);use([1.6,1.65,4.05],[1.6,.15,4.8],'resident_memory');assert.match(game.snapshot().objective,/1\/3.*자동응답기/);
  runTo(0,4.05);runTo(-1.65,4.05);runTo(-3.8,2.8);use([-3.8,1.65,2.8],[-3.8,.94,3.3],'resident_memory');assert.match(game.snapshot().objective,/2\/3.*냉장고/);assert.equal(deviceLevels.phone,0);
  runTo(-1.6,3.15);runTo(0,3.15);runTo(3.8,3.15);use([3.8,1.65,3.15],[3.8,1.5,3.94],'resident_return');assert.match(game.snapshot().objective,/조사 완료/);
  runTo(0,3.15);runTo(0,-4.65);use([0,1.65,-4.65],[0,1.25,-5.65],'resident_departure');tick(1);
  aim(renderedCamera.position.toArray(),[0,1.65,-7],false);game.key('KeyW',true);for(let i=0;i<100&&game.snapshot().story.stage==='resident_departure';i++)tick(.025);game.key('KeyW',false);assert.equal(game.snapshot().story.stage,'office_record');
  renderedScene.getObjectByName('resident-remains').visible=true;
  renderedScene.getObjectByName('resident-remains').position.set(0,0,-5);aim([-2.5,1.65,-5],[-2.5,1.65,-7],false);
  game.key('ShiftLeft',true);tick(6.1);assert.ok(game.snapshot().threat<.2,'holding Shift behind a wall is silent');
  game.key('KeyW',true);tick(.3);game.key('KeyW',false);game.key('ShiftLeft',false);assert.ok(game.snapshot().threat>.5,'actual running behind the wall attracts the ghost');
  use([-3.7,1.65,2.8],[-3.7,.86,1.8],'office_fuse');
  use([-2.1,1.65,-4.5],[-2.1,1.38,-5.37],'office_power');
  use([3.8,1.65,-4],[5.34,1.45,-4],'office_power');
  use([3.8,1.65,-4.55],[5.34,1.45,-4.55],'office_power');
  use([3.8,1.65,-3.45],[5.34,1.45,-3.45],'office_tape');
  use([-1.95,1.65,2.6],[-1.95,.9,1.8],'office_tape');
  use([-2.65,1.65,2.6],[-2.65,1.17,1.79],'office_leave');
  use([0,1.65,-6.3],[0,1.25,-7.48],'parking_gate');
  runTo(2,20);runTo(2,-20.3);
  use([0,1.65,-20.3],[0,1.25,-21.68],'parking_key');
  use([7.1,1.65,-17.8],[6.02,1.1,-17.8],'parking_pump');
  use([9.8,1.65,-7.2],[10.8,1.2,-7.8],'parking_pump');
  use([-9.8,1.65,1.8],[-10.8,1.2,1.2],'parking_pump');
  use([-10.5,1.65,-15.4],[-10.5,1.3,-16.65],'parking_alarm');
  use([-10.8,1.65,17.4],[-10.8,1.4,16.18],'parking_run');
  const lured=renderedScene.getObjectByName('resident-remains'),beforeLure=lured.position.clone();tick(1);assert.ok(lured.position.distanceTo(beforeLure)>.8,'the apparition actually follows the alarm around the mounting wall');
  runTo(-2.2,17.4);runTo(-2.2,-20);runTo(0,-20);
  aim([0,1.65,-20.3],[0,1.25,-21.68]);game.interact();assert.equal(game.snapshot().story.stage,'parking_run','the pedestrian door cannot trigger the new ending');
  runTo(3,-20);runTo(3,-17.8);
  use([3,1.65,-17.8],[3.98,1.1,-17.8],'car_escape');
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
  tick(5);assert.ok(deviceLevels.phone>.3,'the victim phone rings while the driver stays stopped');assert.match(game.snapshot().memoryText,/전화/);
  game.pause();const phoneLevel=deviceLevels.phone;tick(4);assert.equal(deviceLevels.phone,phoneLevel);game.pause(false);
  tick(opening.impact.duration-5);assert.equal(game.snapshot().story.stage,'flee');assert.ok(game.snapshot().memoryText.length>0);
  tick(4.6);assert.equal(deviceLevels.phone,0,'leaving the victim fades the ringing out');tick(opening.flee.duration-4.6);assert.equal(game.snapshot().story.stage,'sleep');assert.equal(renderedScene.getObjectByName('accident-memory'),undefined);assert.equal(renderedCamera.position.y,.98);
  tick(6);assert.ok(game.snapshot().memoryFade>.95);tick(opening.sleep.duration-6);assert.equal(game.snapshot().story.stage,'wake_ring');assert.ok(game.snapshot().story.notes.includes('wake'));assert.match(game.snapshot().memoryLabel,/사흘 뒤/);assert.equal(renderedScene.getObjectByName('apartment-tv-light').intensity,0);
  tick(5);assert.equal(game.snapshot().story.stage,'light_switch');assert.equal(renderedScene.getObjectByName('apartment-lamp-0').intensity,0);
  game.start();tick();const previous=renderedScene.getObjectByName('accident-memory');game.start();tick();assert.notEqual(renderedScene.getObjectByName('accident-memory'),previous);assert.equal(previous.parent,null,'restart disposes the old memory');
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

test('the exterior fall plays once on the way to the elevator, without stopping pursuit or player control',()=>{
  const fallsBefore=soundCalls.filter(s=>s==='fall').length;
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));
  try{
    tick();game.start(true);tick();game.interact();tick(3);renderedCamera.position.set(0,1.65,home.door[2]+1.16);
    event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});
    event(doc,'pointermove',{clientX:renderedCamera.rotation.y/.0021,clientY:-(Math.atan2(-.45,1.16)-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();game.key('KeyW',true);for(let i=0;i<60&&game.snapshot().story.stage==='hide';i++)tick(.025);tick(.56);game.key('KeyW',false);
    event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:renderedCamera.rotation.y/.0021,clientY:renderedCamera.rotation.x/.0021});event(doc,'pointerup',{});tick();
    const falling=renderedScene.getObjectByName('falling-apparition');assert.ok(falling,'a separate exterior apparition exists');assert.equal(falling.visible,false);
    game.key('KeyW',true);game.key('ShiftLeft',true);
    for(let i=0;i<600&&!falling.visible;i++)tick(.025);
    assert.equal(falling.visible,true);assert.equal(game.snapshot().story.stage,'lift_call');assert.equal(game.snapshot().paused,false);assert.equal(soundCalls.filter(s=>s==='fall').length,fallsBefore+1);
    tick(.35);const ghost=renderedScene.getObjectByName('resident-remains'),ghostBefore=ghost.position.clone(),playerBefore=renderedCamera.position.clone(),high=falling.position.y;
    tick(.3);assert.ok(falling.position.y<high-.4,'the body accelerates downwards');assert.ok(renderedCamera.position.distanceTo(playerBefore)>.8,'movement remains available');assert.ok(ghost.position.distanceTo(ghostBefore)>.3,'the pursuer continues walking');
    tick(.4);const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(renderedCamera.projectionMatrix,renderedCamera.matrixWorldInverse));
    assert.ok(frustum.intersectsBox(new THREE.Box3().setFromObject(falling)),'a player running toward the lift can see the falling body ahead');
    game.pause();const frozen=falling.position.toArray();tick(5);assert.deepEqual(falling.position.toArray(),frozen);game.pause(false);
    tick(4);assert.equal(falling.visible,false);assert.equal(game.snapshot().story.stage,'lift_call');
    renderedCamera.position.set(0,1.65,10);tick(.05);renderedCamera.position.z=7;tick(1);assert.equal(falling.visible,false,'crossing the trigger again cannot replay the fall');
    assert.equal(soundCalls.filter(s=>s==='fall').length,fallsBefore+1,'the falling sound plays exactly once');
  }finally{game.dispose();}
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
        game.interact();assert.equal(game.snapshot().story.stage,'corridor_run');tick();
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
  const previous=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'resident_entry',notes:[],elapsed:0}):null,setItem(){},removeItem(){}};
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
  function use(pos,target){renderedCamera.position.set(...pos);const dx=target[0]-pos[0],dy=target[1]-pos[1],dz=target[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();game.interact();}
  try{tick();game.continueGame();tick();use([1.6,1.65,3.65],[1.6,.3,4.8]);use([-3.8,1.65,2.2],[-3.8,.94,3.3]);use([3.8,1.65,2.8],[3.8,1.5,3.95]);tick(4.5);const ghost=renderedScene.getObjectByName('resident-remains'),before=ghost.position.clone();tick(2);assert.ok(ghost.position.distanceTo(before)>1,'silent players still face a searching pursuer');assert.equal(game.snapshot().story.stage,'resident_return');}
  finally{game.dispose();win.localStorage=previous;}
});

test('continuing 1704 preserves the remaining clue or restores an already completed investigation',()=>{
  const previous=win.localStorage;
  for(const notes of [['belongings','answerphone'],['belongings','answerphone','portrait']]){
    win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'resident_entry',notes,elapsed:200}):null,setItem(){},removeItem(){}};
    const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
    try{tick();game.continueGame();tick();assert.deepEqual(game.snapshot().story.notes,notes);assert.match(game.snapshot().objective,notes.length===2?/2\/3.*냉장고/:/조사 완료/);assert.equal(game.snapshot().story.stage,notes.length===2?'resident_entry':'resident_return');}
    finally{game.dispose();win.localStorage=previous;}
  }
});

test('actual movement exhausts sprint, manual pause freezes recovery, and walls do not consume stamina',()=>{
 const previous=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'lift_call',notes:[],elapsed:0}):null,setItem(){},removeItem(){}};
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{tick();game.continueGame();tick();game.key('KeyW',true);game.key('ShiftLeft',true);tick(6.7);assert.equal(game.snapshot().stamina,0);assert.equal(game.snapshot().exhausted,true);const before=renderedCamera.position.z;tick(.5);assert.ok(Math.abs(before-renderedCamera.position.z-1)<.06,'depleted player walks at 2 m/s');
 game.pause();const frozen=game.snapshot().stamina;tick(9);assert.equal(game.snapshot().stamina,frozen);game.pause(false);game.key('KeyW',true);tick(4.5);game.key('KeyW',false);assert.ok(game.snapshot().stamina>.25);assert.equal(game.snapshot().exhausted,false);
 game.start(true);tick();renderedCamera.position.set(0,1.65,-22.86);game.key('KeyW',true);game.key('ShiftLeft',true);tick(2);assert.equal(game.snapshot().stamina,1,'pushing against the area boundary is not running');
 }finally{game.dispose();win.localStorage=previous;}
});
