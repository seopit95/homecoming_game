import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGhost,animateGhostAttack} from '../lib/ghost.ts';
import {createCaptureScene} from '../lib/capture-scene.ts';

test('V109 capture fills the viewport with the same animated face and lunges into the open mouth',()=>{
 const ghost=createGhost(new T.Group()),source=ghost.getObjectByName('ghost-head'),capture=createCaptureScene(source);
 for(const aspect of [16/9,9/16])for(const reduced of [false,true]){
  animateGhostAttack(ghost,.65,reduced);capture.pose(source,.65,reduced,aspect);const face=capture.scene.getObjectByName('ghost-continuous-face');
  assert.equal(face.geometry,source.getObjectByName('ghost-continuous-face').geometry,'reuse the real apparition, not an unrelated image');
  const projected=()=>{capture.scene.updateMatrixWorld(true);capture.camera.updateMatrixWorld(true);const a=face.geometry.getAttribute('position'),points=[];for(let i=0;i<a.count;i++)points.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(face.matrixWorld).project(capture.camera));return new T.Box3().setFromPoints(points);};
  const early=projected();assert.ok(early.max.y-early.min.y>=1.6,'face must fill the viewport height');
  animateGhostAttack(ghost,1.3,reduced);capture.pose(source,1.3,reduced,aspect);const late=projected();assert.ok(late.max.x-late.min.x>=2,'the lunge must fill the screen width');
  assert.ok(capture.camera.position.toArray().every(Number.isFinite));assert.ok(source.getObjectByName('ghost-jaw').rotation.x>.7);
 }
});
