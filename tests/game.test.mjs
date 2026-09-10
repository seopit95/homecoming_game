import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Only device boundaries are replaced. Scene geometry, navigation, input,
// simulation timers, ray targets and story transitions run unchanged.
let renderedCamera,renderedScene;
class Renderer{shadowMap={};setPixelRatio(){}setSize(){}render(scene,camera){renderedCamera=camera;renderedScene=scene;}dispose(){}}
mock.module('three',{namedExports:{...THREE,WebGLRenderer:Renderer}});
mock.module('../lib/audio.ts',{namedExports:{HorrorAudio:class{start(){}voice(){}stopVoices(){}setTV(){}setVolume(){}pause(){}resume(){}sound(){}dispose(){}}}});
let nextFrame,clock=0;
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
const doc=new EventTarget();Object.assign(doc,{createElement:()=>({width:0,height:0,getContext:()=>context}),pointerLockElement:null,hidden:false});
Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
const win=new EventTarget();Object.assign(win,{devicePixelRatio:1,matchMedia:()=>({matches:true})});Object.defineProperty(globalThis,'window',{value:win,configurable:true});
Object.assign(globalThis,{ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:fn=>{nextFrame=fn;return 1;},cancelAnimationFrame:()=>{nextFrame=undefined;}});
const {createGame}=await import('../lib/game.ts');
const event=(target,type,properties)=>{const e=new Event(type);Object.assign(e,properties);target.dispatchEvent(e);};
function tick(seconds=.05){for(let left=seconds;left>0;left-=.025){clock+=Math.min(.025,left)*1000;nextFrame(clock);}}

test('real interaction loop reaches the ending, requires a held pry, and freezes on pause',()=>{
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const errors=[];const game=createGame(canvas,()=>{},e=>errors.push(e));tick();game.start();tick();
  event(win,'blur',{});event(doc,'pointerlockchange',{});assert.equal(game.snapshot().paused,false,'losing focus or pointer lock must not open a pause menu');
  doc.hidden=true;event(doc,'visibilitychange',{});const backgroundAt=game.snapshot().elapsed;tick(5);assert.equal(game.snapshot().paused,false);assert.equal(game.snapshot().elapsed,backgroundAt);doc.hidden=false;event(doc,'visibilitychange',{});
  assert.equal(game.snapshot().story.stage,'tv');assert.ok(renderedScene.getObjectByName('apartment-tv-light').intensity>0);
  const screenUV=renderedScene.getObjectByName('apartment-tv-screen').geometry.getAttribute('uv');assert.deepEqual(new Set(screenUV.array),new Set([0,1]),'broadcast uses the full screen texture without world-space clamping');
  const seated=renderedCamera.position.toArray();game.key('KeyW',true);tick(1);game.key('KeyW',false);assert.deepEqual(renderedCamera.position.toArray(),seated,'opening stays seated');
  game.pause();tick(10);assert.equal(game.snapshot().story.stage,'tv','pause must freeze the scheduled blackout');game.pause(false);
  tick(7);assert.equal(game.snapshot().story.stage,'power');assert.equal(renderedScene.getObjectByName('apartment-tv-light').intensity,0);assert.equal(renderedScene.getObjectByName('apartment-lamp-0').intensity,0);
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
  function runTo(x,z){const pos=renderedCamera.position.toArray(),distance=Math.hypot(x-pos[0],z-pos[2]);aim(pos,[x,pos[1],z],false);game.key('KeyW',true);game.key('ShiftLeft',true);tick(distance/3.5);game.key('KeyW',false);game.key('ShiftLeft',false);assert.notEqual(game.snapshot().story.stage,'ended',`survive route to ${x},${z}`);assert.ok(Math.hypot(renderedCamera.position.x-x,renderedCamera.position.z-z)<.15,`walkable route to ${x},${z}`);}

  use([-5.3,1.65,-5.35],[-6.6,1.6,-5.35],'phone');
  assert.equal(renderedScene.getObjectByName('apartment-lamp-0').intensity,0,'the broken breaker must not restore apartment lighting');
  use([-2.8,1.65,5.1],[-3.82,.58,5.02],'shoes');
  use([0,1.65,-6],[0,.2,-7.3],'radio');
  use([2.62,1.65,6.6],[2.62,1.1,7.8],'listen');
  tick(1);assert.equal(game.snapshot().story.stage,'listen','there is a silence after turning the radio off');
  game.pause();tick(5);assert.equal(game.snapshot().story.stage,'listen');game.pause(false);
  tick(2);assert.equal(game.snapshot().story.stage,'hide');assert.match(game.snapshot().objective,/장롱/);
  assert.equal(renderedScene.getObjectByName('apartment-lamp-0').intensity,0,'the apartment stays dark throughout the encounter');
  use([5,1.65,2.15],[5.82,1.25,2.15],'wait');
  tick(1.4);assert.match(game.snapshot().whisper,/어디 있지/);game.pause();tick(4);assert.match(game.snapshot().whisper,/어디 있지/);game.pause(false);
  tick(33.6);assert.equal(game.snapshot().story.stage,'escape','ghost patrol must reach the other room');
  game.interact();assert.equal(game.snapshot().story.hidden,false);
  use([0,1.65,-7.2],[0,1.2,-8.6],'lift_call');
  runTo(0,-18.2);use([1.48,1.65,-18.2],[1.48,1.35,-19.4],'lift_wait');
  tick(8);assert.equal(game.snapshot().story.stage,'lift_enter');
  use([0,1.65,-18.2],[0,1.3,-19.35],'lift_button');
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
  use([0,1.65,-14.3],[0,1.25,-15.5],'parking_gate');
  runTo(2,40);runTo(2,-41);
  use([0,1.65,-41],[0,1.25,-42.48],'parking_alarm');
  runTo(-22,-40);runTo(-22,32);
  use([-23.3,1.65,31.7],[-23.3,1.4,30.3],'parking_run');
  runTo(-23.3,-40);runTo(0,-40);
  use([0,1.65,-41],[0,1.25,-42.48],'ended');
  assert.equal(game.snapshot().story.ending,'escaped');assert.deepEqual(errors,[]);
  game.start();tick(.2);assert.equal(game.snapshot().story.stage,'tv');assert.ok(game.snapshot().elapsed<.3,'fresh restart resets elapsed time');
  tick(7.1);game.key('KeyW',true);tick(.5);game.key('KeyW',false);assert.ok(renderedCamera.position.distanceTo(new THREE.Vector3(-5.05,1.65,7.35))>.5,'the player can walk away from the sofa after the blackout');game.dispose();
});
