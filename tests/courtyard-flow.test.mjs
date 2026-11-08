import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld,canStandAt} from '../lib/world.ts';
import {initialStory} from '../lib/story.ts';
import * as expansion from '../lib/expansion-story.ts';
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};

// Moving the only route instructions back across the yard fails reachability;
// removing a backing, post, foot or approach clearance fails actual geometry.
test('arrival route notice is nearby, supported, and reachable before choosing a perimeter',()=>{
 const w=buildWorld(new T.Scene(),'courtyard');
 try{
  w.root.updateMatrixWorld(true);
  const notice=w.targets.find(t=>t.id==='court_gate'),at=notice.mesh.userData.approach;
  assert.ok(Math.hypot(at.x-w.spawn.x,at.z-w.spawn.z)<8,'route instructions must be reachable near arrival');
  for(let t=0;t<=1;t+=.05)assert.ok(canStandAt(T.MathUtils.lerp(w.spawn.x,at.x,t),T.MathUtils.lerp(w.spawn.z,at.z,t),w.solids,.23,w.bounds),'clear arrival approach');
  const meshes=[];w.root.traverse(o=>{if(o.isMesh&&o!==notice.mesh&&!w.figure.getObjectById(o.id))meshes.push(o);});
  const normal=new T.Vector3(0,0,-1).transformDirection(notice.mesh.matrixWorld),vertices=notice.mesh.geometry.getAttribute('position');
  for(let i=0;i<vertices.count;i++){
   const p=new T.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(notice.mesh.matrixWorld);
   const hit=new T.Raycaster(p,normal,.000001,.015).intersectObjects(meshes,false)[0];
   assert.ok(hit&&hit.distance<.005,`notice corner ${i} has real backing`);
  }
  for(const x of [-5.05,-2.95]){
   for(let y=.03;y<1.4;y+=.07)assert.ok(new T.Raycaster(new T.Vector3(x,y,42.8),new T.Vector3(0,0,-1),0,.4).intersectObjects(meshes,false)[0],'continuous grounded post');
   const floor=new T.Raycaster(new T.Vector3(x,.001,42.5),new T.Vector3(0,-1,0),0,.01).intersectObjects(meshes,false)[0];
   assert.ok(floor&&floor.distance<.002,'post contacts yard floor');
   assert.equal(canStandAt(x,42.5,w.solids,.23,w.bounds),false,'post foot blocks walking');
  }
 }finally{disposeWorld(w.root);}
});

test('courtyard threat persists when carried and starts with first investigation on a checkpoint',()=>{
 assert.equal(typeof expansion.courtyardPursuitActive,'function','actual game needs one shared court activation policy');
 const arrival={...initialStory(),stage:'court_arrival'};
 assert.equal(expansion.courtyardPursuitActive(arrival,false),false);
 assert.equal(expansion.courtyardPursuitActive(arrival,true),true);
 const investigated=expansion.expansionTransition(arrival,'court_gate');
 assert.equal(expansion.courtyardPursuitActive(investigated,false),true);
 for(const clue of ['court_log','court_phone','court_evidence'])assert.equal(expansion.courtyardPursuitActive({...investigated,notes:[clue]},false),true);
 assert.equal(expansion.courtyardPursuitActive({...arrival,notes:['annex_badge','annex_notice']},false),false);
});
