import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {disposeWorld} from '../lib/world.ts';

test('scene disposal releases the instanced mesh buffers as well as its shared geometry',()=>{
 const root=new T.Group(),mesh=new T.InstancedMesh(new T.BoxGeometry(),new T.MeshStandardMaterial(),2);root.add(mesh);
 let instances=0,geometry=0;mesh.addEventListener('dispose',()=>instances++);mesh.geometry.addEventListener('dispose',()=>geometry++);
 disposeWorld(root);assert.equal(instances,1,'Three must receive the instance-buffer disposal event');assert.equal(geometry,1);
});
