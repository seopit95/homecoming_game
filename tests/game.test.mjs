import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Only device boundaries are replaced. Scene geometry, navigation, input,
// simulation timers, ray targets and story transitions run unchanged.
let renderedCamera;
class Renderer{shadowMap={};setPixelRatio(){}setSize(){}render(_scene,camera){renderedCamera=camera;}dispose(){}}
mock.module('three',{namedExports:{...THREE,WebGLRenderer:Renderer}});
mock.module('../lib/audio.ts',{namedExports:{HorrorAudio:class{start(){}setVolume(){}pause(){}resume(){}sound(){}dispose(){}}}});
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
  use([-2.8,1.65,5.1],[-3.82,.58,5.02],'power');
  use([-5.3,1.65,-5.35],[-6.6,1.6,-5.35],'shoes');
  use([0,1.65,-6],[0,.2,-7.3],'radio');
  use([2.62,1.65,6.6],[2.62,1.1,7.8],'hide');
  use([5,1.65,2.15],[5.82,1.25,2.15],'wait');
  tick(35);assert.equal(game.snapshot().story.stage,'escape','ghost patrol must reach the other room');
  game.interact();assert.equal(game.snapshot().story.hidden,false);
  use([0,1.65,-7.2],[0,1.2,-8.6],'lift_call');
  use([1.48,1.65,-7.2],[1.48,1.35,-8.4],'lift_wait');
  tick(8);assert.equal(game.snapshot().story.stage,'lift_enter');
  use([0,1.65,-7.2],[0,1.3,-8.35],'lift_button');
  use([.5,1.65,-1.2],[1.5,1.5,-1.2],'descent');
  tick(8);assert.equal(game.snapshot().liftFloor,26);
  const pausedAt=game.snapshot().elapsed;game.pause();tick(3);assert.equal(game.snapshot().elapsed,pausedAt);game.pause(false);
  tick(8.1);assert.equal(game.snapshot().story.stage,'pry');assert.equal(game.snapshot().liftFloor,24);
  aim([0,1.65,-1.3],[0,1.4,-2.45]);game.interact();assert.equal(game.snapshot().story.stage,'pry','click alone must not pry the door');
  game.key('KeyE',true);tick(1);assert.ok(game.snapshot().holdProgress>.3&&game.snapshot().holdProgress<.4);
  game.pause();tick(4);assert.equal(game.snapshot().story.stage,'pry');assert.equal(game.snapshot().holdProgress,0);game.pause(false);
  game.hold(true);tick(3.1);game.hold(false);assert.equal(game.snapshot().story.stage,'lift_exit');tick(1);
  use([0,1.65,-1.3],[0,1.3,-2.35],'corridor_run');
  game.key('KeyW',true);game.key('ShiftLeft',true);tick(14);game.key('KeyW',false);game.key('ShiftLeft',false);
  assert.equal(game.snapshot().story.stage,'corridor_run','sprinting down the corridor must outrun the ghost');assert.ok(renderedCamera.position.z< -24,'corridor movement reaches the stair door');
  use([0,1.65,-25],[0,1.25,-26.48],'stairs_loop');
  use([3.5,-1.15,-7.4],[3.5,-1.55,-8.5],'stairs_clue');
  use([0,1.65,7.2],[0,1.65,8.55],'stairs_reverse');
  use([-3.5,4.45,-7.3],[-3.5,4.05,-8.5],'office_record');
  use([-4.8,1.65,5.9],[-4.8,1.5,4.7],'office_fuse');
  use([-2.5,1.65,-6.4],[-2.5,1.4,-7.4],'office_power');
  use([5.3,1.65,-5],[6.52,1.5,-5],'office_tape');
  use([-3.65,1.65,5.8],[-3.65,1.8,4.7],'office_leave');
  use([0,1.65,-7.3],[0,1.25,-8.5],'parking_gate');
  use([0,1.65,-23],[0,1.25,-24.48],'parking_alarm');
  use([-13.3,1.65,17.7],[-13.3,1.4,16.3],'parking_run');
  game.key('KeyW',true);game.key('ShiftLeft',true);tick(11.6);game.key('KeyW',false);game.key('ShiftLeft',false);
  assert.equal(game.snapshot().story.stage,'parking_run');assert.ok(renderedCamera.position.z< -22,'the left lane is a usable escape route');
  aim(renderedCamera.position.toArray(),[0,1.65,renderedCamera.position.z],false);
  game.key('KeyW',true);game.key('ShiftLeft',true);tick(3.8);game.key('KeyW',false);game.key('ShiftLeft',false);
  assert.equal(game.snapshot().story.stage,'parking_run','the alarm provides enough time for the real sprint route');assert.ok(Math.abs(renderedCamera.position.x)<.5);
  use([0,1.65,-23],[0,1.25,-24.48],'ended');
  assert.equal(game.snapshot().story.ending,'escaped');assert.deepEqual(errors,[]);
  game.start();tick(.2);assert.equal(game.snapshot().story.stage,'phone');assert.ok(game.snapshot().elapsed<.3,'fresh restart resets elapsed time');game.dispose();
});
