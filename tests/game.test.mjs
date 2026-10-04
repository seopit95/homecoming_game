import {archiveReplay} from '../lib/expansion-story.ts';
import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {opening,finale} from '../lib/story.ts';
import {accidentCar} from '../lib/chapters.ts';
import {apartment as home,homePosition as H,apartmentScale as S} from '../lib/apartment-layout.ts';

// Only device boundaries are replaced. Scene geometry, navigation, input,
// simulation timers, ray targets and story transitions run unchanged.
let renderedCamera,renderedScene;const voiceCalls=[],soundCalls=[];let hauntLevel=0,chaseLevel=0,breathLevel=0;const deviceLevels={phone:0,radio:0};
let pendingCompiles=null,rendererDisposals=0;
class Renderer{shadowMap={};getRenderTarget(){return null;}setRenderTarget(){}setPixelRatio(){}setSize(){}clearDepth(){}compileAsync(){return pendingCompiles?new Promise(resolve=>pendingCompiles.push(resolve)):Promise.resolve();}render(scene,camera){if(scene.name!=='first-person-hands'){renderedCamera=camera;renderedScene=scene;}}dispose(){rendererDisposals++;}}
mock.module('three',{namedExports:{...THREE,WebGLRenderer:Renderer}});
mock.module('../lib/lighting.ts',{namedExports:{roomReflections:()=>({dispose(){}})}});
mock.module('../lib/audio.ts',{namedExports:{HorrorAudio:class{prepare(){}start(){}voice(line){voiceCalls.push(line);}stopVoices(){}setTV(){}setDrive(){}setDevice(device,level){deviceLevels[device]=level;}recorded(clip){soundCalls.push(clip);}setHaunt(value){hauntLevel=value;}setChase(value){chaseLevel=value;}setExertion(value){breathLevel=value;}setVolume(){}mix(){}recording(){voiceCalls.push('memory');}footstep(kind){soundCalls.push(kind);}pause(){}resume(){}sound(kind){soundCalls.push(kind);}dispose(){}}}});
let nextFrame,clock=0;
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
const doc=new EventTarget();Object.assign(doc,{createElement:()=>({width:0,height:0,getContext:()=>context}),pointerLockElement:null,hidden:false});
Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
const win=new EventTarget();Object.assign(win,{devicePixelRatio:1,matchMedia:()=>({matches:true})});Object.defineProperty(globalThis,'window',{value:win,configurable:true});
Object.assign(globalThis,{ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:fn=>{nextFrame=fn;return 1;},cancelAnimationFrame:()=>{nextFrame=undefined;}});
const {createGame}=await import('../lib/game.ts');
const event=(target,type,properties)=>{const e=new Event(type);Object.assign(e,properties);target.dispatchEvent(e);};
function tick(seconds=.05){for(let left=seconds;left>0;left-=.025){clock+=Math.min(.025,left)*1000;nextFrame(clock);}}

test('leaving while shaders compile stops frames and defers GPU disposal until both scenes finish',async()=>{
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  pendingCompiles=[];const game=createGame(canvas,()=>{},()=>{}),jobs=pendingCompiles;pendingCompiles=null;
  const before=rendererDisposals;assert.equal(jobs.length,2);game.dispose();game.dispose();
  assert.equal(nextFrame,undefined);assert.equal(rendererDisposals,before);
  jobs[0]();await Promise.resolve();assert.equal(rendererDisposals,before,'hands compilation still owns its materials');
  jobs[1]();await game.ready;await Promise.resolve();assert.equal(rendererDisposals,before+1);
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
  use([1,-1.15,-4.8],[1,-1.55,-5.65],'stairs_clue');
  use([1.25,1.65,4.5],[1.25,1.65,5.7],'stairs_reverse');
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
  runTo(0,-7.95);aim(renderedCamera.position.toArray(),[3,1.65,-7.95],false);game.key('KeyW',true);for(let i=0;i<150&&game.snapshot().story.stage==='resident_departure';i++)tick(.025);game.key('KeyW',false);assert.equal(game.snapshot().story.stage,'office_record');runTo(0,11.8);runTo(0,6.5);
  use([-3.7,1.65,2.8],[-3.7,.86,1.8],'office_fuse');
  use([-2.1,1.65,-4.5],[-2.1,1.38,-5.37],'office_power');
  use([3.8,1.65,-4],[5.34,1.45,-4],'office_power');
  use([3.8,1.65,-4.55],[5.34,1.45,-4.55],'office_power');
  use([3.8,1.65,-3.45],[5.34,1.45,-3.45],'office_tape');
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
   ['annex',[['annex_map','annex_fuse'],['annex_fuse','annex_restore'],['annex_restore','annex_search'],['annex_badge','annex_search'],['annex_notice','annex_search'],['annex_call','annex_unlock'],['annex_line_home','annex_exit_ready'],['annex_exit','annex_departure']],'court_arrival'],
   ['courtyard',[['court_gate','court_search'],['court_log','court_search'],['court_evidence','court_search'],['court_phone','court_code'],...Array.from('2617').flatMap((n,i)=>Array.from({length:Number(n)},()=>[`court_digit_${i}`,'court_code'])),['court_confirm','court_unlocked'],['court_exit','court_departure']],'archive_arrival'],
   ['archive',[['archive_ledger','archive_search'],['archive_road','archive_search'],['archive_call','archive_search'],['archive_gate','archive_edit'],['archive_sequence_road','archive_edit'],['archive_sequence_call','archive_edit'],['archive_sequence_gate','archive_reveal'],['archive_play','archive_playback'],['archive_exit','archive_departure']],'plant_arrival'],
   ['plant',[['plant_diagram','plant_isolate'],['plant_valve_west','plant_isolate'],['plant_valve_east','plant_power'],['plant_circuit_pump','plant_power'],['plant_circuit_air','plant_power'],['plant_start','plant_drain'],['plant_exit','plant_departure']],'parking_gate'],
  ]){
   const reference=buildWorld(new THREE.Scene(),area);
   try{
    for(const [id,want] of actions){
     const t=reference.targets.find(t=>t.id===id),at=t.mesh.userData.approach;
     const path=findPath(renderedCamera.position,at,reference.solids,reference.bounds,.26);assert.ok(path.length,`route to ${id} from ${renderedCamera.position.toArray()} to ${JSON.stringify(at)}`);for(const p of path)runTo(p.x,p.z);
     if(id==='plant_exit'&&game.snapshot().story.stage==='plant_drain'){game.key('KeyW',true);tick(.05);game.key('KeyW',false);tick(12);}
     aim(renderedCamera.position.toArray(),t.point.toArray());game.interact();assert.equal(game.snapshot().story.stage,want,id);tick();
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
  use([7.1,1.65,-17.8],[6.02,1.1,-17.8],'parking_alarm');
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
  const previous=win.localStorage;win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'resident_entry',notes:[],elapsed:0}):null,setItem(){},removeItem(){}};
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});const game=createGame(canvas,()=>{},e=>assert.fail(e));
  function use(pos,target){renderedCamera.position.set(...pos);const dx=target[0]-pos[0],dy=target[1]-pos[1],dz=target[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();game.interact();}
  try{tick();game.continueGame();tick();use([1.6,1.65,3.65],[1.6,.3,4.8]);use([-3.8,1.65,2.2],[-3.8,.94,3.3]);use([3.8,1.65,2.8],[3.8,1.5,3.95]);tick(4.5);const ghost=renderedScene.getObjectByName('resident-remains'),before=ghost.position.clone();tick(2);assert.ok(ghost.position.distanceTo(before)>1,'silent players still face a searching pursuer');assert.equal(game.snapshot().story.stage,'resident_return');}
  finally{game.dispose();win.localStorage=previous;}
});

for(const replay of [false,true])test(`resident recording ${replay?'replays after collection':'finishes before routine ghost chatter'}`,async()=>{
  const previous=win.localStorage;
  win.localStorage={getItem:k=>k.includes('progress')?JSON.stringify({version:2,stage:'resident_entry',notes:['belongings','portrait'],elapsed:100}):null,setItem(){},removeItem(){}};
  const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720,setPointerCapture(){}});
  const game=createGame(canvas,()=>{},e=>assert.fail(e));
  function aim(target){const p=renderedCamera.position,dx=target[0]-p.x,dy=target[1]-p.y,dz=target[2]-p.z,yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();}
  try{
    await game.ready;tick();game.continueGame();tick(2);voiceCalls.length=0;
    renderedCamera.position.set(-2.4,1.65,4.6);aim([-3.8,.94,3.3]);assert.match(game.snapshot().prompt,/녹음/);
    game.interact();assert.equal(game.snapshot().story.stage,'resident_return');assert.deepEqual(voiceCalls,['memory']);
    if(replay){tick(.05);game.interact();assert.deepEqual(voiceCalls,['memory','memory'],'collecting the clue must not disable its playback');}
    const startedAt=game.snapshot().elapsed,voices=voiceCalls.length,ghost=renderedScene.getObjectByName('resident-remains'),before=ghost.position.clone();
    aim([0,1.65,4.2]);game.key('KeyW',true);tick(Math.hypot(2.4,.4)/2);game.key('KeyW',false);
    aim([0,1.65,5.5]);game.key('KeyW',true);tick(.65);game.key('KeyW',false);aim([0,1.65,10]);
    tick(5.37-(game.snapshot().elapsed-startedAt));
    assert.equal(voiceCalls.length,voices,'the 5.362-second memory must finish before routine chatter replaces it');
    assert.ok(ghost.position.distanceTo(before)>.5,'listening does not freeze the pursuer');assert.equal(game.snapshot().story.stage,'resident_return');
  }finally{game.dispose();win.localStorage=previous;}
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
  tick(15);assert.match(game.snapshot().message,/네 뒤에 있어/);assert.equal(game.snapshot().story.stage,'archive_playback');tick(5);assert.equal(game.snapshot().story.stage,'archive_escape');
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
    function use(id,pos){renderedCamera.position.set(...pos);const points={record:[-3.7,.86,1.8],fuse:[-2.1,1.38,-5.37],circuit_b:[5.34,1.45,-4],circuit_a:[5.34,1.45,-4.55],circuit_c:[5.34,1.45,-3.45],tape_next:[-1.95,.9,1.8],monitor:[-2.65,1.17,1.79]},point=points[id],dx=point[0]-pos[0],dy=point[1]-pos[1],dz=point[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));event(canvas,'pointerdown',{clientX:0,clientY:0,pointerType:'touch',pointerId:1});event(doc,'pointermove',{clientX:-(yaw-renderedCamera.rotation.y)/.0021,clientY:-(pitch-renderedCamera.rotation.x)/.0021});event(doc,'pointerup',{});tick();assert.ok(game.snapshot().prompt,id);game.interact();tick();}
    for(const [id,pos] of [['record',[-3.7,1.65,2.8]],['fuse',[-2.1,1.65,-4.5]],['circuit_b',[3.8,1.65,-4]],['circuit_a',[3.8,1.65,-4.55]],['circuit_c',[3.8,1.65,-3.45]],['tape_next',[-1.95,1.65,2.6]],['monitor',[-2.65,1.65,2.6]]])use(id,pos);
    tick(13);assert.equal(game.snapshot().story.stage,'office_key');assert.ok(ghost.position.distanceTo(waiting)>1,'the pursuer must leave its waiting point after playback');assert.ok(renderedScene.getObjectByName('connection-fire-door').rotation.y<-1.4,'the waiting body must not jam the opening door');
  }
  finally{game.dispose();win.localStorage=previous;}
});
