import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeFigure} from '../lib/building.ts';

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
