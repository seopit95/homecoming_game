import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createViewmodel} from '../lib/viewmodel.ts';

const pose={time:2,moving:false,running:false,crouched:false,torch:true,visible:true,reducedMotion:false,aspect:16/9,fov:72};
test('V114 near-limit tremor moves the whole lowered grip subtly and respects reduced motion',()=>{
 const rig=createViewmodel(),p={...pose,torch:false,stepAmount:0,strain:1};rig.update({...p,time:1});const one=rig.root.position.clone(),matrix=rig.root.matrixWorld.toArray();rig.update({...p,time:1.07});assert.notDeepEqual(rig.root.matrixWorld.toArray(),matrix);assert.ok(rig.root.position.distanceTo(one)<.006,'grip tremor must stay millimetric');assert.equal(rig.lens.material.emissiveIntensity,0);
 rig.update({...p,strain:0,time:1});const calm=rig.root.matrixWorld.toArray();rig.update({...p,strain:.2,time:2});assert.deepEqual(rig.root.matrixWorld.toArray(),calm,'early holding cannot shake the hand');rig.update({...p,reducedMotion:true,time:3});const reduced=rig.root.matrixWorld.toArray();rig.update({...p,reducedMotion:true,time:4});assert.deepEqual(rig.root.matrixWorld.toArray(),reduced);
});
test('V110 the handheld torch follows the shared foot phase and settles with its amplitude',()=>{
 const rig=createViewmodel();rig.update({...pose,moving:true,stepPhase:Math.PI/2,stepAmount:1});const first=rig.root.matrixWorld.toArray();
 rig.update({...pose,time:100,moving:true,running:true,stepPhase:Math.PI/2,stepAmount:1});assert.deepEqual(rig.root.matrixWorld.toArray(),first,'elapsed time or sprint toggles cannot reset the shared stride');
 rig.update({...pose,moving:true,stepPhase:3*Math.PI/2,stepAmount:1});assert.notDeepEqual(rig.root.matrixWorld.toArray(),first);
 rig.update({...pose,stepPhase:1,stepAmount:0});const stopped=rig.root.matrixWorld.toArray();rig.update({...pose,time:200,stepPhase:2,stepAmount:0});assert.deepEqual(rig.root.matrixWorld.toArray(),stopped);
});
test('the held torch stays below the aiming point at supported fields of view',()=>{
  const rig=createViewmodel();
  for(const aspect of [390/844,16/9])for(const fov of [58,72,95]){rig.update({...pose,fov,aspect});
    const screen=rig.beamOrigin.clone().project(rig.camera);
    assert.ok(screen.x>.05&&screen.x<.95&&screen.y<-.05&&screen.y>-.95);
    assert.ok(rig.root.getObjectByName('right-hand'));
    assert.ok(rig.root.getObjectByName('right-forearm'));
    const hand=rig.root.getObjectByName('right-hand'),box=new T.Box3().setFromObject(hand);
    assert.ok(box.getCenter(new T.Vector3()).project(rig.camera).x<.85,'the grip stays inside a portrait screen');
  }
});
test('the grip and beam pose freeze with simulation time and hide for scripted scenes',()=>{
  const rig=createViewmodel();rig.update({...pose,moving:true,running:true});const held=rig.root.matrixWorld.toArray();
  rig.update({...pose,moving:true,running:true});assert.deepEqual(rig.root.matrixWorld.toArray(),held);
  rig.update({...pose,visible:false});assert.equal(rig.root.visible,false);
  rig.update({...pose,torch:false});assert.equal(rig.root.visible,true);assert.equal(rig.lens.material.emissiveIntensity,0);
  rig.update({...pose,time:100,moving:true,reducedMotion:true});const still=rig.root.matrixWorld.toArray();
  rig.update({...pose,time:101,moving:true,reducedMotion:true});assert.deepEqual(rig.root.matrixWorld.toArray(),still);
});
