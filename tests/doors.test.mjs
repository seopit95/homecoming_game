import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,canStandAt,hasLineOfSight,clampLightOrigin} from '../lib/world.ts';
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
