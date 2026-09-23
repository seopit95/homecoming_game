import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeFigure} from '../lib/building.ts';

test('the elongated arms retain connected shoulders, elbows and wrists',()=>{
  const figure=makeFigure(new T.Group());
  for(const side of [-1,1]){
    const wrist=figure.getObjectByName(`ghost-hand-${side}`).parent;
    const elbow=wrist.parent;
    const length=wrist.position.length()+elbow.position.length();
    assert.ok(length>.9&&length<1.05,`elongated shoulder-to-wrist length is ${length}`);
    assert.ok(wrist.position.length()/elbow.position.length()<1.2,'forearm and upper arm have comparable lengths');
  }
});

test('each planted hand bears weight through the full crawl pull without skating or lifting',async()=>{
  const {animateGhost}=await import('../lib/ghost.ts'),figure=makeFigure(new T.Group());
  for(const side of [0,1]){
    let planted;
    for(let u=.37;u<.99;u+=.025){
      const phase=(u-side*.5)*Math.PI*2;figure.position.z=.82*phase/(Math.PI*2);
      animateGhost(figure,1,.8,.8,false,phase,1);
      const hand=figure.getObjectByName(`ghost-hand-${side===0?-1:1}`).getWorldPosition(new T.Vector3());
      planted??=hand.clone();
      assert.ok(Math.abs(hand.y-planted.y)<.003,'the supporting hand cannot float when its reach is exhausted');
      assert.ok(Math.abs(hand.z-planted.z)<.003,'the body advances over the planted hand');
    }
  }
});

test('a crawling ghost follows both stair-flight slopes without changing its navigation root',async()=>{
  const {animateGhost,groundGhost}=await import('../lib/ghost.ts'),figure=makeFigure(new T.Group());
  const floor=(x,z)=>z>=0?0:(x<0?1:-1)*Math.min(2.8,-z*.7);
  for(const side of [-1,1])for(const z of [-5,-4.1,-3,-1,-.1,.8])for(const yaw of [0,Math.PI]){
    figure.position.set(side,floor(side,z),z);figure.rotation.set(0,yaw,0);const origin=figure.position.toArray();
    animateGhost(figure,3,1,.7,false,2,1);groundGhost(figure,floor);
    const palm=figure.getObjectByName('ghost-hand-1').getWorldPosition(new T.Vector3());
    assert.ok(palm.y-floor(palm.x,palm.z)>.02,'the grounded palm clears the step surface');
    assert.ok(palm.y-floor(palm.x,palm.z)<.4,'the wrist can reach across to the next higher tread');
    figure.updateMatrixWorld(true);const point=new T.Vector3();
    figure.traverse(mesh=>{if(!mesh.isMesh)return;const vertices=mesh.geometry.getAttribute('position');for(let i=0;i<vertices.count;i++){
      point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
      const tread=point.z>=0||point.z<=-4?floor(point.x,point.z):(point.x<0?1:-1)*(Math.floor(-point.z*17/4)+.5)*2.8/17;
      assert.ok(point.y-tread>-.01,'dress, fingers and toes clear the actual stepped surface');
    }});
    assert.deepEqual(figure.position.toArray(),origin);assert.equal(figure.rotation.y,yaw);
    const frozen=figure.getObjectByName('ghost-head').getWorldPosition(new T.Vector3()).toArray();
    animateGhost(figure,3,1,.7,false,2,1);groundGhost(figure,floor);assert.deepEqual(figure.getObjectByName('ghost-head').getWorldPosition(new T.Vector3()).toArray(),frozen);
  }
  for(const side of [-1,1])for(const z of [-4.8,-2,-.1])for(let yaw=0;yaw<Math.PI*2;yaw+=Math.PI/8){
    figure.position.set(side,floor(side,z),z);figure.rotation.set(0,yaw,0);
    animateGhost(figure,3,1,.7,false,2,1);groundGhost(figure,floor);
    assert.ok(figure.getObjectByName('ghost-body').position.y<.65,'turning must not lift the body onto the flight across the divider');
  }
});

test('crawling lowers the body, plants hands and restores the walking rig without moving the navigation root',async()=>{
  const {animateGhost}=await import('../lib/ghost.ts'),figure=makeFigure(new T.Group());
  const rootPose=figure.position.toArray();
  for(const phase of [0,2,4])for(const blend of [.15,.4,.55,.7,.725,.9]){animateGhost(figure,3,1,.7,false,phase,blend);assert.ok(new T.Box3().setFromObject(figure,true).min.y>-.01,`lowering blend ${blend} stays above the floor`);}
  for(const phase of [0,.8,2,3.5,5]){
    animateGhost(figure,3,1,.7,false,phase,1);figure.updateMatrixWorld(true);
    const head=figure.getObjectByName('ghost-head').getWorldPosition(new T.Vector3());
    assert.ok(head.y<.95&&head.y>.3,'the crawling face stays near the floor');
    const bounds=new T.Box3().setFromObject(figure,true);assert.ok(bounds.min.y>-.002,'dress and limbs must not pass through the floor');
    const hands=[-1,1].map(side=>figure.getObjectByName(`ghost-hand-${side}`).getWorldPosition(new T.Vector3()));
    assert.ok(Math.min(...hands.map(p=>p.y))<.11,'one palm remains close to the ground');
    assert.deepEqual(figure.position.toArray(),rootPose);
  }
  animateGhost(figure,3,1,.7,false,2,1);const pose=figure.getObjectByName('ghost-head').getWorldPosition(new T.Vector3()).toArray();
  animateGhost(figure,3,1,.7,false,2,1);assert.deepEqual(figure.getObjectByName('ghost-head').getWorldPosition(new T.Vector3()).toArray(),pose);
  animateGhost(figure,3,.65,.7,false,4,1);const planted=figure.getObjectByName('ghost-hand--1').getWorldPosition(new T.Vector3());
  figure.position.z+=.82*.5/(Math.PI*2);animateGhost(figure,3,.65,.7,false,4.5,1);const next=figure.getObjectByName('ghost-hand--1').getWorldPosition(new T.Vector3());
  assert.ok(Math.abs(next.z-planted.z)<.008,'a grounded palm stays planted as the body crawls over it');
  animateGhost(figure,3,1,.7,false,2,0);assert.ok(figure.getObjectByName('ghost-head').getWorldPosition(new T.Vector3()).y>1.5);
});

test('ghost animation preserves its navigation root and remains finite at every pose',async()=>{
  const {animateGhost}=await import('../lib/ghost.ts');
  const root=new T.Group(),figure=makeFigure(root);figure.position.set(3,0,-4);figure.rotation.y=.7;
  const before=figure.position.toArray();
  for(const t of [0,.2,1,2.5,9,100,10000]){
    animateGhost(figure,t,1,.8,false);figure.updateMatrixWorld(true);
    assert.deepEqual(figure.position.toArray(),before);assert.equal(figure.rotation.y,.7);
    const bounds=new T.Box3().setFromObject(figure);assert.ok(bounds.min.toArray().concat(bounds.max.toArray()).every(Number.isFinite));
    assert.ok(bounds.max.y-bounds.min.y<2.7,'animation must stay within human-scale room clearances');
  }
});
test('repeating the same paused time produces exactly the same pose',async()=>{
  const {animateGhost}=await import('../lib/ghost.ts'),figure=makeFigure(new T.Group());
  const pose=()=>{figure.updateMatrixWorld(true);const result=[];figure.traverse(o=>result.push(...o.matrix.elements));return result;};
  animateGhost(figure,5,1,.8,false);const before=pose();animateGhost(figure,5,1,.8,false);assert.deepEqual(pose(),before);
});
test('the travelled walk phase articulates knees and ankles while idle feet stay planted',async()=>{
  const {animateGhost}=await import('../lib/ghost.ts'),figure=makeFigure(new T.Group());
  const joints=()=>[-1,1].flatMap(s=>['knee','ankle'].map(j=>figure.getObjectByName(`ghost-${j}-${s}`).rotation.x));
  animateGhost(figure,1,1,.2,false,.1);const first=joints();animateGhost(figure,1,1,.2,false,2);assert.notDeepEqual(joints(),first);
  animateGhost(figure,1,0,.2,false,2);const idle=joints();animateGhost(figure,9,0,.2,false,2);assert.deepEqual(joints(),idle);
});
test('turning toward the player never leaves the navigation root upside down',()=>{
  const figure=makeFigure(new T.Group());figure.lookAt(0,0,-3);
  assert.ok(Math.abs(figure.rotation.x)<.001&&Math.abs(figure.rotation.z)<.001);
  figure.rotation.y=Math.PI*.9;const forward=new T.Vector3();figure.getWorldDirection(forward);assert.ok(forward.z<-.9);
});

test('attack framing stays finite for crouching, standing and reduced motion without changing head scale',async()=>{
  const {animateGhostAttack,animateGhost}=await import('../lib/ghost.ts');
  for(const reduced of [false,true])for(const eye of [1,1.65]){
    const figure=makeFigure(new T.Group()),head=figure.getObjectByName('ghost-head'),scale=head.scale.toArray();figure.position.set(0,0,-.49);figure.rotation.y=0;
    for(const t of [0,.1,.4,1,1.7,2.8,3.2]){
      animateGhostAttack(figure,t,reduced,eye);figure.updateMatrixWorld(true);
      assert.deepEqual(head.scale.toArray(),scale);assert.ok(figure.getObjectByName('ghost-attack-mouth').visible);
      const face=head.localToWorld(new T.Vector3(0,.13,.16));assert.ok(face.toArray().every(Number.isFinite));assert.ok(face.z<-.12,'face remains beyond the near clipping plane');
      assert.deepEqual(figure.position.toArray(),[0,0,-.49]);
    }
    animateGhost(figure,0,0,0,reduced);assert.equal(figure.getObjectByName('ghost-attack-mouth').visible,false);
  }
});

test('the attack drops the jaw and opens a recessed mouth, then restores the resting face',async()=>{
  const {animateGhostAttack,animateGhost}=await import('../lib/ghost.ts');
  const figure=makeFigure(new T.Group()),jaw=figure.getObjectByName('ghost-jaw');
  assert.ok(jaw,'the lower jaw must move independently');
  const rest=jaw.position.y;animateGhostAttack(figure,.08,false);const first=jaw.position.y;
  animateGhostAttack(figure,.65,false);assert.ok(jaw.position.y<first-.18,'the jaw descends when the mouth tears open');
  const mouth=figure.getObjectByName('ghost-attack-mouth');assert.ok(mouth.visible);
  const size=new T.Box3().setFromObject(mouth).getSize(new T.Vector3());assert.ok(size.z>.04,'the mouth has depth instead of a flat sticker');
  const cavity=mouth.children[0],rim=mouth.children[1];cavity.geometry.computeBoundingBox();rim.geometry.computeBoundingBox();
  figure.updateMatrixWorld(true);
  const ray=new T.Raycaster(mouth.localToWorld(new T.Vector3(0,-.105,1)),new T.Vector3(0,0,-1).applyQuaternion(mouth.getWorldQuaternion(new T.Quaternion())));
  const hit=ray.intersectObject(cavity)[0];assert.ok(hit);assert.ok(mouth.worldToLocal(hit.point.clone()).z<rim.geometry.boundingBox.max.z-.04,'the throat must recede behind the lip');
  animateGhost(figure,0,0,0,false);assert.equal(jaw.position.y,rest);assert.equal(mouth.visible,false);
});
test('loose hair remains anchored to the scalp and freezes with simulation time',async()=>{
 const {animateGhost}=await import('../lib/ghost.ts'),figure=makeFigure(new T.Group()),hair=figure.getObjectByName('ghost-long-hair');
 const pose=()=>hair.children.flatMap(m=>Array.from(m.geometry.getAttribute('position').array));
 animateGhost(figure,1,1,.8,false);const initial=pose();animateGhost(figure,1.2,1,.8,false);assert.notDeepEqual(pose(),initial);
 const stopped=pose();animateGhost(figure,1.2,1,.8,false);assert.deepEqual(pose(),stopped);
});

test('the seated passenger stays above the cabin floor and resets to a full walking silhouette',async()=>{
 const {animateGhostPassenger,animateGhost}=await import('../lib/ghost.ts'),figure=makeFigure(new T.Group());
 for(const scare of [0,.4,1]){animateGhostPassenger(figure,13,scare,false);assert.ok(new T.Box3().setFromObject(figure,true).min.y>=.22,'seated cloth, hair and feet clear the floorpan');}
 animateGhost(figure,2,1,.5,false);assert.equal(figure.getObjectByName('ghost-long-hair').scale.y,1);
});
