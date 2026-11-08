import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createViewmodel} from '../lib/viewmodel.ts';

const pose={time:2,moving:false,running:false,crouched:false,torch:true,visible:true,reducedMotion:false,aspect:16/9,fov:72};
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
