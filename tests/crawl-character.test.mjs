import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';const {createGhost,animateGhost,groundGhost}=await import(process.env.V115_GHOST_BASELINE??'../lib/ghost.ts');
test('V115 crawling has an injured asymmetric pull and lagging tilted head without a disconnected body',()=>{
 const f=createGhost(new T.Group()),head=f.getObjectByName('ghost-head'),body=head.parent;const xs=[];let tilt=0;
 for(const phase of [.7,.7+Math.PI]){animateGhost(f,3,1,.8,false,phase,1,()=>0);xs.push(body.position.x);tilt=Math.max(tilt,Math.abs(head.rotation.z));f.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));}
 assert.ok(Math.abs(xs[0]+xs[1])>.015,'two pulls must not simply mirror a mechanical crawl');assert.ok(tilt>.39&&tilt<.85,'the trailing head has a controlled injury tilt');
 animateGhost(f,5,1,.8,false,2,1,()=>0);const before=head.matrixWorld.toArray();animateGhost(f,5,1,.8,false,2,1,()=>0);assert.deepEqual(head.matrixWorld.toArray(),before,'pausing cannot keep the head moving');
});

test('V115 floor fitting preserves each authored elbow bend with and without reduced motion',()=>{
 const bend=(f,side)=>{const shoulder=f.getObjectByName(`ghost-shoulder-${side}`),elbow=shoulder.children[0],palm=elbow.children[0],origin=shoulder.getWorldPosition(new T.Vector3()),axis=palm.getWorldPosition(new T.Vector3()).sub(origin).normalize(),v=elbow.getWorldPosition(new T.Vector3()).sub(origin);return v.addScaledVector(axis,-v.dot(axis)).normalize();};
 for(const reduced of [false,true]){const f=createGhost(new T.Group());animateGhost(f,3,1,.8,reduced,.7,1);const before=[-1,1].map(side=>bend(f,side));groundGhost(f,()=>0);f.updateMatrixWorld(true);for(const [i,side] of [-1,1].entries())assert.ok(before[i].dot(bend(f,side))>.9999,'grounding must retain the elbow pole from the supported crawl');}
});
