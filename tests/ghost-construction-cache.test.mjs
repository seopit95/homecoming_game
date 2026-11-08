import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHair} from '../lib/ghost-hair.ts';
import {createFace} from '../lib/ghost-face.ts';
import {createGhostTears,poseGhostTears} from '../lib/ghost-tears.ts';

test('identical hair construction reuses authored topology but owns deforming buffers',()=>{
 // Intentional spy: restore the same prototype function after invoking it with the original receiver.
 // eslint-disable-next-line typescript/unbound-method
 const normalize=T.Vector3.prototype.normalize;let work=0;
 T.Vector3.prototype.normalize=function(){work++;return normalize.call(this);};
 let first,second,firstWork,secondWork;
 try{first=createHair(new T.Group());firstWork=work;work=0;second=createHair(new T.Group());secondWork=work;}finally{T.Vector3.prototype.normalize=normalize;}
 const a=first.tails.children[0],b=second.tails.children[0];
 assert.deepEqual(a.geometry.attributes.position.array,b.geometry.attributes.position.array);
 assert.notEqual(a.geometry.attributes.position.array,b.geometry.attributes.position.array);
 assert.notEqual(a.userData.strands.posed,b.userData.strands.posed);
 assert.ok(secondWork<firstWork/10,`second hair must reuse rest derivation (${firstWork} vs ${secondWork})`);
 const before=b.geometry.attributes.position.array.slice();a.geometry.attributes.position.setX(0,999);assert.deepEqual(b.geometry.attributes.position.array,before);
});

test('identical faces reuse cheek attachments without sharing moving tear geometry',()=>{
 const a=createFace(new T.Group(),new T.MeshStandardMaterial()).face,b=createFace(new T.Group(),new T.MeshStandardMaterial()).face;
 // Intentional static-method spy, restored in finally.
 // eslint-disable-next-line typescript/unbound-method
 const bary=T.Triangle.getBarycoord;let work=0;
 T.Triangle.getBarycoord=function(...args){work++;return bary(...args);};
 let x,y,firstWork,secondWork;
 try{x=createGhostTears(a);firstWork=work;work=0;y=createGhostTears(b);secondWork=work;}finally{T.Triangle.getBarycoord=bary;}
 assert.ok(firstWork>0);assert.equal(secondWork,0,'same anatomy must not scan all face triangles again');
 assert.deepEqual(x.geometry.attributes.position.array,y.geometry.attributes.position.array);assert.notEqual(x.geometry.attributes.position.array,y.geometry.attributes.position.array);
 const before=y.geometry.attributes.position.array.slice();a.geometry.attributes.position.setZ(0,99);poseGhostTears(x,a);assert.deepEqual(y.geometry.attributes.position.array,before);
});


test('changed face topology cannot reuse stale cheek bindings',()=>{
 const a=createFace(new T.Group(),new T.MeshStandardMaterial()).face;createGhostTears(a);
 const b=createFace(new T.Group(),new T.MeshStandardMaterial()).face;b.geometry.attributes.position.setZ(0,b.geometry.attributes.position.getZ(0)+.0001);
 // Intentional static-method spy, restored in finally.
 // eslint-disable-next-line typescript/unbound-method
 const bary=T.Triangle.getBarycoord;let scans=0;T.Triangle.getBarycoord=function(...args){scans++;return bary(...args);};
 try{createGhostTears(b);}finally{T.Triangle.getBarycoord=bary;}
 assert.ok(scans>0,'changed rest shape requires fresh attachments');
});
