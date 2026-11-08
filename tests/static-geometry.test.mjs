import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {batchStaticGeometry} from '../lib/static-geometry.ts';
test('batching reduces submissions while preserving surfaces and interactive meshes',()=>{
 const root=new T.Group(),material=new T.MeshStandardMaterial(),geometry=new T.BoxGeometry(.6,1,.6),interactive=new T.Mesh(geometry,material);interactive.position.set(3,.5,0);root.add(interactive);
 for(let x=0;x<3;x++){const mesh=new T.Mesh(geometry,material);mesh.position.set(x,.5,0);mesh.castShadow=true;root.add(mesh);}
 root.updateMatrixWorld(true);
 const distances=()=>[0,1,2,3].map(x=>new T.Raycaster(new T.Vector3(x,.5,3),new T.Vector3(0,0,-1)).intersectObject(root,true)[0]?.distance);
 const before=distances();batchStaticGeometry(root,[interactive]);root.updateMatrixWorld(true);
 assert.deepEqual(distances(),before);assert.equal(interactive.parent,root);assert.equal(root.children.length,2);assert.ok(root.children.find(m=>m!==interactive).castShadow);
});
test('mixed indexed and non-indexed meshes batch independently without losing geometry',()=>{
 const root=new T.Group(),mat=new T.MeshStandardMaterial();
 for(let i=0;i<6;i++){const g=new T.BoxGeometry(1,1,1),mesh=new T.Mesh(i%2?g.toNonIndexed():g,mat);mesh.position.x=i;root.add(mesh);}
 batchStaticGeometry(root,[]);assert.equal(root.children.length,2);
 assert.equal(root.children.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count),0),6*36);
});
