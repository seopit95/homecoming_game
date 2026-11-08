import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {apartment as home,homePosition as H,apartmentScale as S} from '../lib/apartment-layout.ts';

// Only device boundaries are replaced. Scene geometry, navigation, input,
// simulation timers, ray targets and story transitions run unchanged.
let renderedCamera,renderedScene;const voiceCalls=[],soundCalls=[];let hauntLevel=0;
class Renderer{shadowMap={};setPixelRatio(){}setSize(){}render(scene,camera){renderedCamera=camera;renderedScene=scene;}dispose(){}}
mock.module('three',{namedExports:{...THREE,WebGLRenderer:Renderer}});
mock.module('../lib/audio.ts',{namedExports:{HorrorAudio:class{start(){}voice(line){voiceCalls.push(line);}stopVoices(){}setTV(){}setHaunt(value){hauntLevel=value;}setVolume(){}pause(){}resume(){}sound(kind){soundCalls.push(kind);}dispose(){}}}});
let nextFrame,clock=0;
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
const doc=new EventTarget();Object.assign(doc,{createElement:()=>({width:0,height:0,getContext:()=>context}),pointerLockElement:null,hidden:false});
Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
const win=new EventTarget();Object.assign(win,{devicePixelRatio:1,matchMedia:()=>({matches:true})});Object.defineProperty(globalThis,'window',{value:win,configurable:true});
Object.assign(globalThis,{ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:fn=>{nextFrame=fn;return 1;},cancelAnimationFrame:()=>{nextFrame=undefined;}});
const {createGame}=await import('../lib/game.ts');
const event=(target,type,properties)=>{const e=new Event(type);Object.assign(e,properties);target.dispatchEvent(e);};
function tick(seconds=.05){for(let left=seconds;left>0;left-=.025){clock+=Math.min(.025,left)*1000;nextFrame(clock);}}

function readyRetry(game,canvas){
  game.start();game.skipMemory();tick(7.1);
  const pos=H(-2.1,1.65,1.93),target=H(-3.15,.64,1.93);renderedCamera.position.set(...pos);
  const yaw=Math.atan2(pos[0]-target[0],pos[2]-target[2]),pitch=Math.atan2(target[1]-pos[1],Math.hypot(target[0]-pos[0],target[2]-pos[2]));
  event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});
  event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});
  event(doc,'pointerup',{});tick();game.interact();
  assert.equal(game.snapshot().story.hasCarKeys,true);game.start(true);
}

test('real interaction loop reaches the ending, requires a held pry, and freezes on pause',()=>{
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const errors=[];const game=createGame(canvas,()=>{},e=>errors.push(e));tick();game.start();game.skipMemory();tick();
  event(win,'blur',{});event(doc,'pointerlockchange',{});assert.equal(game.snapshot().paused,false,'losing focus or pointer lock must not open a pause menu');
  doc.hidden=true;event(doc,'visibilitychange',{});const backgroundAt=game.snapshot().elapsed;tick(5);assert.equal(game.snapshot().paused,false);assert.equal(game.snapshot().elapsed,backgroundAt);doc.hidden=false;event(doc,'visibilitychange',{});
  assert.equal(game.snapshot().story.stage,'tv');assert.ok(renderedScene.getObjectByName('apartment-tv-light').intensity>0);
  const screenUV=renderedScene.getObjectByName('apartment-tv-screen').geometry.getAttribute('uv');assert.deepEqual(new Set(screenUV.array),new Set([0,1]),'broadcast uses the full screen texture without world-space clamping');
  const seated=renderedCamera.position.toArray();game.key('KeyW',true);tick(1);game.key('KeyW',false);assert.deepEqual(renderedCamera.position.toArray(),seated,'opening stays seated');
  game.pause();tick(10);assert.equal(game.snapshot().story.stage,'tv','pause must freeze the scheduled blackout');game.pause(false);
  tick(7);assert.equal(game.snapshot().story.stage,'keys');assert.equal(renderedScene.getObjectByName('apartment-tv-light').intensity,0);assert.equal(renderedScene.getObjectByName('apartment-lamp-0').intensity,0);
  assert.equal(renderedCamera.position.y,1.65,'blackout stands the player up');
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
  function runTo(x,z){const pos=renderedCamera.position.toArray(),distance=Math.hypot(x-pos[0],z-pos[2]);aim(pos,[x,pos[1],z],false);game.key('KeyW',true);game.key('ShiftLeft',true);for(let i=0;i<(distance/1.8+10)*40&&Math.hypot(renderedCamera.position.x-x,renderedCamera.position.z-z)>.09&&game.snapshot().story.stage!=='dying';i++)tick(.025);game.key('KeyW',false);game.key('ShiftLeft',false);assert.ok(!['dying','ended'].includes(game.snapshot().story.stage),`survive route to ${x},${z}; at ${renderedCamera.position.toArray()} stamina ${game.snapshot().stamina} ghost ${renderedScene.getObjectByName('resident-remains').position.toArray()}`);assert.ok(Math.hypot(renderedCamera.position.x-x,renderedCamera.position.z-z)<.15,`walkable route to ${x},${z}`);}

  use(H(-2.1,1.65,1.93),H(-3.15,.64,1.93),'power');
  const runHome=(x,z)=>runTo(x*S,z*S),useHome=(pos,target,stage)=>use(H(...pos),H(...target),stage);
  runHome(-2.1,0);runHome(0,0);runHome(0,-1.4);runHome(2.9,-1.4);runHome(2.9,-4.1);
  useHome([3,1.65,-4.3],[2.05,1.6,-4.75],'phone');
  assert.equal(renderedScene.getObjectByName('apartment-lamp-0').intensity,0,'the broken breaker must not restore apartment lighting');
  runHome(2.9,-1.4);runHome(0,-1.4);runHome(-2.1,0);runHome(-2.1,2.4);
  useHome([-2.1,1.65,2.4],[-3.15,.58,2.4],'shoes');
  runHome(-2.1,0);runHome(0,0);runHome(0,-3.5);
  useHome([0,1.65,-3.5],[0,.2,-4.65],'radio');
  runHome(0,2);runHome(2.75,2);runHome(2.75,3.9);
  useHome([2.75,1.65,3.9],[2.75,1.1,5.15],'listen');
  tick(1);assert.equal(game.snapshot().story.stage,'listen','there is a silence after turning the radio off');
  game.pause();tick(5);assert.equal(game.snapshot().story.stage,'listen');game.pause(false);
  tick(2);assert.equal(game.snapshot().story.stage,'hide');assert.match(game.snapshot().objective,/장롱/);
  assert.equal(renderedScene.getObjectByName('apartment-lamp-0').intensity,0,'the apartment stays dark throughout the encounter');
  runHome(2.75,2);runHome(4.65,1.55);
  useHome([4.65,1.65,1.55],[5.43,1.25,1.55],'wait');
  for(let i=0;i<1600&&!/어디 있지/.test(game.snapshot().whisper);i++)tick(.025);assert.match(game.snapshot().whisper,/어디 있지/);game.pause();tick(4);assert.match(game.snapshot().whisper,/어디 있지/);game.pause(false);
  for(let i=0;i<2400&&game.snapshot().story.stage==='wait';i++)tick(.025);assert.equal(game.snapshot().story.stage,'escape','ghost patrol must reach the other room');
  game.interact();assert.equal(game.snapshot().story.hidden,false);
  runHome(0,1.55);runHome(0,-4.7);
  useHome([0,1.65,-4.7],[0,1.2,-5.86],'lift_call');
  runTo(0,-30.2);use([1.48,1.65,-30.2],[1.48,1.35,-31.4],'lift_wait');
  tick(8);assert.equal(game.snapshot().story.stage,'lift_enter');
  use([0,1.65,-30.2],[0,1.3,-31.35],'lift_button');
  use([.5,1.65,-1.2],[1.5,1.5,-1.2],'descent');
  tick(8);assert.equal(game.snapshot().liftFloor,26);
  const pausedAt=game.snapshot().elapsed;game.pause();tick(3);assert.equal(game.snapshot().elapsed,pausedAt);game.pause(false);
  tick(8.1);assert.equal(game.snapshot().story.stage,'pry');assert.equal(game.snapshot().liftFloor,24);
  aim([0,1.65,-1.3],[0,1.4,-2.45]);game.interact();assert.equal(game.snapshot().story.stage,'pry','click alone must not pry the door');
  game.key('KeyE',true);tick(1);assert.ok(game.snapshot().holdProgress>.3&&game.snapshot().holdProgress<.4);
  game.pause();tick(4);assert.equal(game.snapshot().story.stage,'pry');assert.equal(game.snapshot().holdProgress,0);game.pause(false);
  game.hold(true);tick(3.1);game.hold(false);assert.equal(game.snapshot().story.stage,'lift_exit');tick(1);
  use([0,1.65,-1.3],[0,1.3,-2.35],'corridor_run');
  runTo(-10,32);runTo(-10,-32);runTo(0,-37);
  use([0,1.65,-37],[0,1.25,-38.48],'stairs_loop');
  use([3.5,-1.15,-7.4],[3.5,-1.55,-8.5],'stairs_clue');
  use([0,1.65,7.2],[0,1.65,8.55],'stairs_reverse');
  use([-3.5,4.45,-7.3],[-3.5,4.05,-8.5],'office_record');
  renderedScene.getObjectByName('resident-remains').position.set(0,0,-5);aim([-2.5,1.65,-5],[-2.5,1.65,-7],false);
  game.key('ShiftLeft',true);tick(6.1);assert.ok(game.snapshot().threat<.2,'holding Shift behind a wall is silent');
  game.key('KeyW',true);tick(.3);game.key('KeyW',false);game.key('ShiftLeft',false);assert.ok(game.snapshot().threat>.5,'actual running behind the wall attracts the ghost');
  use([-4.8,1.65,5.9],[-4.8,1.5,4.7],'office_fuse');
  use([-2.5,1.65,-6.4],[-2.5,1.4,-7.4],'office_power');
  use([5.3,1.65,-5],[6.52,1.5,-5],'office_tape');
  use([-3.65,1.65,5.8],[-3.65,1.8,4.7],'office_leave');
  use([0,1.65,-14.3],[0,1.25,-15.5],'parking_car');
  runTo(2,40);runTo(2,-38);
  use([4.6,1.65,-37.3],[5.7,1.15,-37.3],'parking_gate');
  use([-1.7,1.65,-39.5],[-1.85,1.2,-40.8],'parking_power');
  runTo(-24.2,-39);runTo(-24.2,40.5);runTo(-22,40.5);
  use([-22,1.65,38.8],[-23.1,1.4,38.8],'parking_alarm');
  use([-23.3,1.65,31.7],[-23.3,1.4,30.3],'parking_run');
  runTo(-22,32);runTo(-22,-38);runTo(4.6,-38);
  use([4.6,1.65,-37.3],[5.7,1.15,-37.3],'escape_drive');
  assert.ok(renderedScene.getObjectByName('storm-escape'));
  game.pause();const escapeAt=game.snapshot().elapsed;tick(5);assert.equal(game.snapshot().elapsed,escapeAt);game.pause(false);
  tick(13.1);assert.equal(game.snapshot().story.stage,'passenger_reveal');
  assert.equal(renderedScene.getObjectByName('passenger-apparition').visible,true);
  game.interact();game.skipMemory();assert.equal(game.snapshot().story.stage,'passenger_reveal');
  tick(3.3);assert.equal(game.snapshot().story.stage,'car_crash');
  tick(4.6);assert.equal(game.snapshot().story.stage,'ended');
  assert.equal(game.snapshot().story.ending,'fatal');assert.deepEqual(errors,[]);
  game.start();tick(.2);assert.equal(game.snapshot().story.stage,'drive');game.skipMemory();assert.ok(game.snapshot().elapsed<.3,'fresh restart resets elapsed time');
  tick(7.1);game.key('KeyW',true);tick(.5);game.key('KeyW',false);assert.ok(renderedCamera.position.distanceTo(new THREE.Vector3(...home.stand))>.5,'the player can walk away from the sofa after the blackout');game.dispose();
});

test('contact screams once, locks controls and falls before death; manual pause freezes it',()=>{
  const screamsBefore=voiceCalls.filter(l=>l==='scream').length;
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));tick();readyRetry(game,canvas);tick();
  // Leave via the already open door, then allow the actual pursuit to catch the player.
  renderedCamera.position.set(0,1.65,home.door[2]+1.16);
  event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});
  const desiredPitch=Math.atan2(-.45,1.16);
  event(doc,'pointermove',{clientX:renderedCamera.rotation.y/.0021,clientY:-(desiredPitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();game.interact();
  assert.equal(game.snapshot().story.stage,'lift_call');
  for(let i=0;i<300&&game.snapshot().story.stage!=='dying';i++)tick(.025);
  assert.equal(game.snapshot().story.stage,'dying');assert.equal(game.snapshot().paused,false);assert.equal(voiceCalls.filter(l=>l==='scream').length,screamsBefore+1);
  const root=renderedScene.getObjectByName('resident-remains'),initialY=renderedCamera.position.y;
  assert.ok(root.getObjectByName('ghost-attack-mouth').visible);const progress=game.snapshot().deathProgress;
  const torch=game.snapshot().flashlight;game.torch();game.crouch();game.interact();game.key('KeyW',true);assert.equal(game.snapshot().flashlight,torch);assert.equal(game.snapshot().crouched,false);
  game.pause();const pose=renderedCamera.matrixWorld.toArray();tick(5);assert.equal(game.snapshot().deathProgress,progress);assert.deepEqual(renderedCamera.matrixWorld.toArray(),pose);game.pause(false);
  tick(2.6);assert.equal(game.snapshot().story.stage,'dying');assert.ok(renderedCamera.position.y<initialY-1);assert.ok(game.snapshot().deathProgress>.8);assert.equal(renderedScene.getObjectByName('resident-remains'),root,'death stays in the place of contact');
  tick(.7);assert.equal(game.snapshot().story.stage,'ended');assert.equal(game.snapshot().story.ending,'caught');
  game.start(true);tick();assert.equal(game.snapshot().story.stage,'lift_call');assert.equal(game.snapshot().deathProgress,0);assert.equal(renderedCamera.position.y,1.65);game.dispose();
});

test('the remembered drive, fatal collision, escape and sleep lead to TV three nights later',()=>{
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));tick();game.start();tick(.1);
  assert.equal(game.snapshot().story.stage,'drive');assert.match(game.snapshot().memoryText,/술을 마셨다/);
  const road=renderedScene.getObjectByName('accident-memory');assert.ok(road);assert.equal(renderedScene.getObjectByName('apartment-tv-light').parent.visible,false);
  assert.equal(road.getObjectByName('memory-cracked-glass').visible,false);
  game.interact();game.crouch();game.torch();game.key('KeyW',true);assert.equal(game.snapshot().crouched,false);assert.equal(game.snapshot().flashlight,false);assert.equal(game.snapshot().story.stage,'drive');
  game.pause();const pos=renderedCamera.position.toArray(),at=game.snapshot().elapsed;tick(10);assert.deepEqual(renderedCamera.position.toArray(),pos);assert.equal(game.snapshot().elapsed,at);game.skipMemory();assert.equal(game.snapshot().story.stage,'drive');game.pause(false);
  doc.hidden=true;event(doc,'visibilitychange',{});tick(10);assert.equal(game.snapshot().elapsed,at);assert.equal(game.snapshot().paused,false);doc.hidden=false;event(doc,'visibilitychange',{});
  tick(8);assert.equal(game.snapshot().story.stage,'impact');assert.equal(road.getObjectByName('memory-cracked-glass').visible,true);
  tick(2.5);assert.equal(game.snapshot().story.stage,'flee');assert.match(game.snapshot().memoryText,/사람을 치어 죽였다/);
  tick(6);assert.equal(game.snapshot().story.stage,'sleep');assert.equal(renderedScene.getObjectByName('accident-memory'),undefined);assert.equal(renderedCamera.position.y,.98);
  tick(4.5);assert.ok(game.snapshot().memoryFade>.8);tick(1.5);assert.equal(game.snapshot().story.stage,'tv');assert.ok(game.snapshot().story.notes.includes('wake'));assert.match(game.snapshot().memoryLabel,/사흘 뒤/);assert.ok(renderedScene.getObjectByName('apartment-tv-light').intensity>0);
  tick(7);assert.equal(game.snapshot().story.stage,'keys');assert.equal(renderedScene.getObjectByName('apartment-lamp-0').intensity,0);
  game.start();tick();const previous=renderedScene.getObjectByName('accident-memory');game.start();tick();assert.notEqual(renderedScene.getObjectByName('accident-memory'),previous);assert.equal(previous.parent,null,'restart disposes the old memory');
  game.skipMemory();tick();assert.equal(game.snapshot().story.stage,'tv');assert.equal(renderedScene.getObjectByName('accident-memory'),undefined);assert.ok(game.snapshot().story.notes.includes('wake'));game.dispose();
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
    tick();readyRetry(game,canvas);tick();renderedCamera.position.set(0,1.65,home.door[2]+1.16);
    event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});
    event(doc,'pointermove',{clientX:renderedCamera.rotation.y/.0021,clientY:-(Math.atan2(-.45,1.16)-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();game.interact();tick();
    const falling=renderedScene.getObjectByName('falling-apparition');assert.ok(falling,'a separate exterior apparition exists');assert.equal(falling.visible,false);
    game.key('KeyW',true);game.key('ShiftLeft',true);
    for(let i=0;i<600&&!falling.visible;i++)tick(.025);
    assert.equal(falling.visible,true);assert.equal(game.snapshot().story.stage,'lift_call');assert.equal(game.snapshot().paused,false);assert.equal(soundCalls.filter(s=>s==='fall').length,fallsBefore+1);
    const ghost=renderedScene.getObjectByName('resident-remains'),ghostBefore=ghost.position.clone(),playerBefore=renderedCamera.position.clone(),high=falling.position.y;
    tick(.3);assert.ok(falling.position.y<high-.4,'the body accelerates downwards');assert.ok(renderedCamera.position.distanceTo(playerBefore)>.45,'walking remains available even when exhausted');assert.ok(ghost.position.distanceTo(ghostBefore)>.3,'the pursuer continues walking');
    tick(.4);const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(renderedCamera.projectionMatrix,renderedCamera.matrixWorldInverse));
    assert.ok(frustum.intersectsBox(new THREE.Box3().setFromObject(falling)),'a player running toward the lift can see the falling body ahead');
    game.pause();const frozen=falling.position.toArray();tick(5);assert.deepEqual(falling.position.toArray(),frozen);game.pause(false);
    tick(4);assert.equal(falling.visible,false);assert.equal(game.snapshot().story.stage,'lift_call');
    renderedCamera.position.set(0,1.65,10);tick(.05);renderedCamera.position.z=7;tick(1);assert.equal(falling.visible,false,'crossing the trigger again cannot replay the fall');
    assert.equal(soundCalls.filter(s=>s==='fall').length,fallsBefore+1,'the falling sound plays exactly once');
  }finally{game.dispose();}
});

async function wardrobeFixture(){
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));tick();readyRetry(game,canvas);tick();
  const aim=(pos,target)=>{
    renderedCamera.position.set(...pos);const dx=target[0]-pos[0],dy=target[1]-pos[1],dz=target[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));
    event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();
  };
  aim([home.radio[0],1.65,home.radio[2]-1.25],home.radio);game.interact();tick(3);assert.equal(game.snapshot().story.stage,'hide');
  aim([home.closet[0]-.8,1.65,home.closet[2]],home.closet);const ghost=renderedScene.getObjectByName('resident-remains');ghost.position.set(0,0,0);
  return {game,ghost,home,aim};
}
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
    renderedCamera.position.set(0,1.65,2*S);ghost.position.set(0,0,0);const before=ghost.position.clone();tick(.2);
    assert.equal(game.snapshot().story.stage,'escape');assert.ok(ghost.position.z>before.z,'the ghost turns toward the visible player, away from its bathroom destination');assert.ok(game.snapshot().threat>.5);
  }finally{game.dispose();}
});
