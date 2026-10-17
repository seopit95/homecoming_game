import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSurveillance} from '../lib/surveillance.ts';
import {disposeWorld} from '../lib/world.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};

// Mutation: omitting the observed actor or leaving it in the first-person scene
// must fail. Only the WebGL/device boundary is replaced; geometry/pose are real.
test('the live room feed shows the player at the actual floor, heading and crouch, only during that pass',()=>{
 const screen=createSurveillance(),feed=screen.userData.surveillance,scene=new T.Scene();scene.add(screen);
 const observed={position:new T.Vector3(9,1.65,-18.9),floor:0,yaw:0,pitch:-.2,crouched:false,torch:true,time:110};
 const samples=[],r={shadowMap:{autoUpdate:true},getRenderTarget:()=>null,setRenderTarget(){},render(s){
  if(s!==scene)return;const body=s.getObjectByName('observed-player');assert.ok(body,'the player is absent from their own live CCTV image');s.updateMatrixWorld(true);samples.push({body,bounds:new T.Box3().setFromObject(body,true),position:body.position.clone(),eye:body.getObjectByName('pedestrian-head').localToWorld(new T.Vector3(0,.101126,.09097)),yaw:body.rotation.y});
 }};
 try{
  feed.update('archive_playback',11,'');feed.render(r,scene,true,observed);
  const standing=samples.at(-1);assert.ok(standing.bounds.min.y>=-.002&&standing.bounds.min.y<.003,'feet rest on the real floor');assert.ok(Math.abs(standing.eye.y-1.65)<.05,'standing eyes match the first-person view height');assert.ok(standing.bounds.max.y>1.6&&standing.bounds.max.y<1.95,'human standing height');
  assert.ok(Math.hypot(standing.eye.x-9,standing.eye.z+18.9)<.003);assert.ok(Math.abs(standing.yaw-Math.PI)<1e-6);assert.equal(scene.getObjectByName('observed-player'),undefined,'the actor must not obscure the main camera or cast its shadow in the main pass');
  observed.position.set(8.7,1,-18.4);Object.assign(observed,{yaw:.7,crouched:true,time:110.2});feed.update('archive_playback',11.2,'');feed.render(r,scene,true,observed);
  const low=samples.at(-1);assert.ok(Math.min(...['memory-shoe','memory-other-shoe'].map(n=>new T.Box3().setFromObject(low.body.getObjectByName(n),true).min.y))<.003,'a crouching moving actor needs a planted shoe');assert.ok(Math.abs(low.eye.y-1)<.05,'crouched eyes match the low first-person view');assert.ok(low.bounds.max.y<1.4,'crouch bends the body instead of leaving a standing man behind');assert.ok(low.bounds.min.y>=-.002&&low.bounds.min.y<.003);assert.ok(Math.hypot(low.eye.x-8.7,low.eye.z+18.4)<.003);assert.ok(Math.abs(low.yaw-(Math.PI+.7))<1e-6);
  r.render=()=>{throw Error('device interrupted')};assert.throws(()=>feed.render(r,scene,true,observed),/device interrupted/);assert.equal(scene.getObjectByName('observed-player'),undefined,'failed render must also restore the main scene');
 }finally{disposeWorld(screen);}
});

test('the live actor is compiled before play and its separate resources are released once',async()=>{
 const screen=createSurveillance(),feed=screen.userData.surveillance,scene=new T.Scene();scene.add(screen);let actor;
 const r={shadowMap:{autoUpdate:true},getRenderTarget:()=>null,setRenderTarget(){},render(){},async compileAsync(s){if(s===scene){actor=s.getObjectByName('observed-player');assert.ok(actor,'first live frame must not compile a new character');}}};
 await feed.prepare(r,scene);assert.ok(actor);assert.equal(scene.getObjectByName('observed-player'),undefined);
 const resources=new Set();actor.traverse(o=>{if(!o.isMesh)return;resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.add(v);}});
 const counts=new Map();for(const res of resources)res.addEventListener('dispose',()=>counts.set(res,(counts.get(res)??0)+1));
 disposeWorld(screen);assert.equal(counts.size,resources.size,'detached live actor resources must not leak');assert.ok([...counts.values()].every(n=>n===1));feed.dispose();assert.ok([...counts.values()].every(n=>n===1));
});

test('the observed body clears actual booth walls, sill and desk at valid player positions',async()=>{
 const {createObservedPlayer}=await import('../lib/observed-player.ts'),{buildWorld,canStandAt}=await import('../lib/world.ts'),{solidContainsPoint}=await import('../lib/collision.ts');
 const w=buildWorld(new T.Scene(),'archive'),a=createObservedPlayer(),p=new T.Vector3();let clock=0;
 try{
  for(const [x,z] of [[6.11,-20],[12.88,-22],[8,-23.67],[8,-16.33],[7.2,-19.1]])for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const crouched of [false,true]){
   assert.ok(canStandAt(x,z,w.solids,.23,w.bounds),'fixture must be a legal player position');
   a.update({position:new T.Vector3(x,crouched?1:1.65,z),floor:0,yaw,pitch:-.3,crouched,torch:true,time:clock+=2,solids:w.solids});a.root.updateMatrixWorld(true);
   const near=w.solids.filter(s=>Math.abs(x-s.x)<s.w/2+1.5&&Math.abs(z-s.z)<s.d/2+1.5);let hit;
   a.root.traverse(o=>{if(hit||!o.isMesh)return;const v=o.geometry.getAttribute('position');for(let i=0;i<v.count&&!hit;i++){p.fromBufferAttribute(v,i).applyMatrix4(o.matrixWorld);for(const s of near)if(p.y>(s.y??1.5)-(s.h??3)/2+.002&&p.y<(s.y??1.5)+(s.h??3)/2-.002&&solidContainsPoint(s,p.x,p.z,-.002)){hit={mesh:o.name||o.parent.name,at:p.toArray(),solid:s};break;}}});
   assert.equal(hit,undefined,JSON.stringify({x,z,yaw,crouched,hit}));
  }
 }finally{disposeWorld(a.resources);disposeWorld(w.root);}
});

test('stopping the observed player settles both shoes on the actual floor',async()=>{
 const {createObservedPlayer}=await import('../lib/observed-player.ts'),a=createObservedPlayer();
 try{
  const p={position:new T.Vector3(9,1.65,-18.9),floor:0,yaw:0,pitch:-.3,crouched:false,torch:true,time:10};a.update(p);
  p.time=10.3;p.position.x+=.55;a.update(p);p.time=10.5;a.update(p);a.root.updateMatrixWorld(true);
  for(const name of ['memory-shoe','memory-other-shoe'])assert.ok(Math.abs(new T.Box3().setFromObject(a.root.getObjectByName(name),true).min.y)<.003,'a stopped actor must not keep a swing foot in the air');
 }finally{disposeWorld(a.resources);}
});

test('the observed body fits booth corners with eyes anchored to the live player',async()=>{
 const {createObservedPlayer}=await import('../lib/observed-player.ts'),{buildWorld,canStandAt}=await import('../lib/world.ts'),{solidContainsPoint}=await import('../lib/collision.ts');
 const w=buildWorld(new T.Scene(),'archive'),a=createObservedPlayer(),p=new T.Vector3();let clock=0;
 try{
  for(const [x,z] of [[6.12,-23.67],[12.88,-23.67],[12.88,-16.33],[6.12,-16.33]])for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const crouched of [false,true]){
   assert.ok(canStandAt(x,z,w.solids,.23,w.bounds));a.update({position:new T.Vector3(x,crouched?1:1.65,z),floor:0,yaw,pitch:-.3,crouched,torch:true,time:clock+=2,solids:w.solids});a.root.updateMatrixWorld(true);
   const eye=a.root.getObjectByName('pedestrian-head').localToWorld(new T.Vector3(0,.101126,.09097));assert.ok(Math.hypot(eye.x-x,eye.z-z)<.001,'body lean must not relocate the player eye position');
   let hit;a.root.traverse(o=>{if(hit||!o.isMesh)return;const v=o.geometry.getAttribute('position');for(let i=0;i<v.count&&!hit;i++){p.fromBufferAttribute(v,i).applyMatrix4(o.matrixWorld);for(const s of w.solids)if(p.y>(s.y??1.5)-(s.h??3)/2+.002&&p.y<(s.y??1.5)+(s.h??3)/2-.002&&solidContainsPoint(s,p.x,p.z,-.002)){hit={mesh:o.name||o.parent.name,at:p.toArray(),solid:s};break;}}});
   assert.equal(hit,undefined,JSON.stringify({x,z,yaw,crouched,hit}));
  }
 }finally{disposeWorld(a.resources);disposeWorld(w.root);}
});

test('CAM08 keeps showing player movement immediately after the restored recording ends',async()=>{
 const {buildWorld}=await import('../lib/world.ts'),scene=new T.Scene(),w=buildWorld(scene,'archive'),positions=[];
 const p={position:new T.Vector3(9,1.65,-18.9),floor:0,yaw:0,pitch:-.3,crouched:false,torch:true,time:119,solids:w.solids};
 const r={shadowMap:{autoUpdate:true},getRenderTarget:()=>null,setRenderTarget(){},render(s){if(s===scene){s.updateMatrixWorld(true);positions.push(s.getObjectByName('observed-player').getObjectByName('pedestrian-head').localToWorld(new T.Vector3(0,.101126,.09097)).x);}}};
 try{
  w.updateStory('archive_playback',100,false);w.updateStory('archive_escape',119,false);w.surveillance.render(r,scene,false,p);
  p.time=119.2;p.position.x=9.3;w.updateStory('archive_escape',119.2,false);w.surveillance.render(r,scene,false,p);
  assert.equal(positions.length,2,'the live feed must not freeze for eight seconds when the pursuit starts');assert.ok(Math.abs(positions[1]-9.3)<.001);
 }finally{disposeWorld(w.root);}
});
