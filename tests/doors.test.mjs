import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld,canStandAt,hasLineOfSight,clampLightOrigin} from '../lib/world.ts';
import {clearPath} from '../lib/navigation.ts';

// Canvas text is the only platform boundary; all door geometry and collision are real.
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const doors=[['apartment','escape','front-door'],['corridor','corridor_departure','corridor-stair-door'],['stairs','stairs_passage','stairs-passage-door'],['office','office_departure','office-service-door'],['resident','resident_entry','resident-front-door'],['resident','resident_departure','resident-service-door'],['annex','annex_departure','expansion-exit-door'],['archive','archive_departure','expansion-exit-door'],['plant','plant_departure','expansion-exit-door'],['courtyard','court_departure','expansion-exit-door']];
for(const [area,stage,name] of doors)test(`${area}: the visible door blocks bodies throughout opening and after reset`,()=>{
  const w=buildWorld(new T.Scene(),area),hinge=w.root.getObjectByName(name),leaf=hinge.children.find(o=>o.isMesh);
  for(let pass=0;pass<2;pass++){
    if(area==='apartment')hinge.userData.openRequested=true;
    for(const time of [0,.25,.5,1,2]){
      w.updateStory(stage,time,false);w.root.updateMatrixWorld(true);
      const p=leaf.getWorldPosition(new T.Vector3());
      assert.equal(canStandAt(p.x,p.z,w.solids,.23,w.bounds),false,`player inside visible leaf at ${time}s`);
      assert.equal(canStandAt(p.x,p.z,w.solids,.38,w.bounds),false,`ghost inside visible leaf at ${time}s`);
    }
    w.reset();
    w.root.updateMatrixWorld(true);
    for(const x of [-.4,.4]){
      const p=leaf.localToWorld(new T.Vector3(x,0,0));
      assert.equal(canStandAt(p.x,p.z,w.solids,.02,w.bounds),false,'reset immediately restores the closed leaf collision before any story update');
    }
  }
});

test('a rotated leaf blocks the crossing but leaves its empty bounding-box corners walkable',()=>{
  const solids=[{x:0,z:0,w:2,d:.08,y:1,h:2,yaw:Math.PI/4}],bounds={x:5,z:5};
  assert.equal(canStandAt(.6,-.6,solids,.1,bounds),false,'point on the diagonal leaf');
  assert.equal(canStandAt(.65,.65,solids,.1,bounds),true,'empty corner beside the leaf');
  assert.equal(clearPath({x:-1,z:-.6},{x:1,z:-.6},solids,bounds,.1),false,'route crosses the rotated leaf');
  assert.equal(hasLineOfSight({x:-1,y:1,z:-.6},{x:1,y:1,z:-.6},solids),false,'cannot see through the rotated leaf');
});

test('the flashlight cannot start beyond a rotated door when the eye is beside it',()=>{
  const solid={x:0,z:0,w:2,d:.08,y:1,h:2,yaw:Math.PI/4};
  const eye=new T.Vector3(.45,1,-.85),lens=new T.Vector3(.85,1,-.45);
  assert.equal(clampLightOrigin(eye,lens,[solid]),true);
  assert.ok(lens.x+lens.z<-.05,'light stays on the camera side of the diagonal leaf');
});

test('opening a corridor door stops at an occupant instead of sweeping through them',()=>{
  const w=buildWorld(new T.Scene(),'corridor'),hinge=w.root.getObjectByName('corridor-stair-door');
  const actor={x:-.03,z:-20.36,r:.23};
  w.updateStory('corridor_departure',0,false,undefined,[actor]);
  w.updateStory('corridor_departure',2,false,undefined,[actor]);
  assert.equal(canStandAt(actor.x,actor.z,w.solids,actor.r,w.bounds),true,'swept leaf must not trap player');
  assert.ok(hinge.rotation.y<.9,'opening pauses before touching the player');
  w.updateStory('corridor_departure',3,false,undefined,[]);
  assert.ok(hinge.rotation.y>1.4,'opening resumes once the player steps away');
});

test('incoming passages support the crawling pursuer while it waits behind the door sweep',async()=>{
 const {animateGhost}=await import('../lib/ghost.ts');
 for(const [area,z]of [['courtyard',48],['archive',32],['plant',36],['parking',22]]){
  const w=buildWorld(new T.Scene(),area),f=w.figure;f.visible=true;f.position.set(-2.95,0,z+5.55);f.rotation.y=Math.PI;animateGhost(f,12,0,.2,false,0,1,undefined,w.solids);w.root.updateMatrixWorld(true);
  for(const side of [-1,1]){
   const foot=f.getObjectByName(`ghost-foot-${side}`),vertices=foot.geometry.getAttribute('position');let toe=new T.Vector3(0,0,-Infinity);
   for(let i=0;i<vertices.count;i++){const p=new T.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(foot.matrixWorld);if(p.z>toe.z)toe=p;}
   const ray=new T.Raycaster(new T.Vector3(toe.x,.25,toe.z),new T.Vector3(0,-1,0),0,.3),hits=ray.intersectObject(w.root).filter(hit=>{for(let o=hit.object;o;o=o.parent)if(o===f)return false;return true;});
   assert.ok(hits.some(h=>h.point.y>=-.01),`${area}: the trailing toe at ${toe.toArray()} has a floor beneath it`);
  }
 }
});

test('V120 surface targeting ignores only the leaf thickness and still blocks an adjacent intervening wall',()=>{
 const from={x:0,y:1.65,z:1},face={x:0,y:1.65,z:.04};assert.equal(hasLineOfSight(from,face,[{x:0,z:.12,w:2,d:.08,y:1.4,h:2.8}],false,.04),false);assert.equal(hasLineOfSight(from,face,[{x:0,z:0,w:1.2,d:.12,y:1.15,h:2.3}],false,.04),true);
});

test('V120 non-route stair exits are visibly closed without boarding the actual progression doors',()=>{
 const w=buildWorld(new T.Scene(),'stairs');try{const upper=w.root.getObjectByName('stairs-upper-closure-notice'),lower=w.root.getObjectByName('stairs-lower-closure-notice');assert.ok(upper&&lower);assert.equal(w.root.getObjectByName('repeated-stair-well').getObjectByName('stairs-lower-direction').visible,false);assert.ok(w.targets.find(t=>t.id==='up').point.x>2.9);assert.ok(w.targets.find(t=>t.id==='down').point.x<1.1);w.reset();assert.equal(upper.visible,true);assert.equal(lower.visible,true);}finally{disposeWorld(w.root);}
});
