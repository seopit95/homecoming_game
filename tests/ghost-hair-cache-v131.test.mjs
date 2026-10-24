import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHair,settleHair} from '../lib/ghost-hair.ts';
import authored from '../lib/assets/ghost-strands.json' with {type:'json'};
import {createGhost,animateGhost,animateGhostAttack} from '../lib/ghost.ts';

function fixture(y=1.4){
 const figure=new T.Group(),head=new T.Group();figure.add(head);head.position.y=y;head.scale.set(1/1.9,1/2,1/1.55);
 const {tails}=createHair(head),mesh=tails.children[0];return {figure,head,tails,mesh};
}

// Reintroducing full vertex uploads on every stable/subtle animation frame
// must fail, as must caching by freezing the head attachment in world space.
test('V131 fine hair reuses safe poses between bounded updates while roots follow the current head',()=>{
 const {figure,head,tails,mesh}=fixture(),p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,buffer=p.array;
 settleHair(tails,figure,10,.02);const version=n.version;
 settleHair(tails,figure,10.01,.02);assert.equal(n.version,version,'a stable intervening frame does not rebuild/upload236k vertices');
 head.rotation.z=.008;settleHair(tails,figure,10.02,.02);assert.equal(n.version,version,'a small safe head motion uses the bounded cached pose');
 head.updateMatrixWorld(true);const center=new T.Vector3();for(let i=0;i<3;i++)center.add(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));center.divideScalar(3);
 const root=new T.Vector3().fromArray(authored.center,authored.strands[0][0]*3).applyMatrix4(head.matrixWorld);
 assert.ok(center.distanceTo(root)<1e-6,`cached root detached by ${center.distanceTo(root)}m`);
 settleHair(tails,figure,10.06,.02);assert.ok(n.version>version,'a fresh pose is uploaded within60ms');assert.equal(p.array,buffer);
 const after=n.version;settleHair(tails,figure,10.06,.02);assert.equal(n.version,after,'a paused pose is retained');
});

test('V131 a cached hair pose refreshes before floor contact or seated scale can invalidate its roots',()=>{
 const {figure,head,tails,mesh}=fixture(.4),p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,v=new T.Vector3();
 settleHair(tails,figure,10,.02);let version=n.version;head.position.y-=.008;settleHair(tails,figure,10.01,.02);
 assert.ok(n.version>version,'floorward head motion must bypass the normal hair cadence');head.updateMatrixWorld(true);
 for(let i=0;i<p.count;i++)assert.ok(v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).y>=.0199,'cached hair cannot cross the floor');
 version=n.version;tails.scale.y=.68;settleHair(tails,figure,10.02,.02);assert.ok(n.version>version,'passenger length changes must refresh immediately');
});

test('V131 capture morphs refresh shared fine hair immediately and reset back to the walking rig',()=>{
 const figure=createGhost(new T.Group()),mesh=figure.getObjectByName('ghost-authored-long-hair'),face=figure.getObjectByName('ghost-continuous-face'),p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,buffer=p.array,v=new T.Vector3();
 animateGhostAttack(figure,.18,false);const version=n.version,opening=face.userData.openness;
 animateGhostAttack(figure,.19,false);assert.notEqual(face.userData.openness,opening);assert.ok(n.version>version,'a capture jaw change cannot wait for the normal hair cadence');
 for(const time of [.65,1.3,2.6]){animateGhostAttack(figure,time,false);figure.updateMatrixWorld(true);
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);assert.ok(Number.isFinite(v.x+v.y+v.z)&&v.y>=-.0001,'capture hair must remain finite and above the floor');}
 }
 animateGhost(figure,4,0,0,true,0,0);assert.equal(face.userData.openness,0);assert.equal(figure.getObjectByName('ghost-authored-long-hair'),mesh);assert.equal(p.array,buffer,'capture and roaming use the same retained hair buffers');
});
