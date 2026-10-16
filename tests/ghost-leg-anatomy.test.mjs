import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGhost,animateGhost,animateGhostAttack,animateGhostPassenger,animateGhostEmergence} from '../lib/ghost.ts';

test('native legs join the complete body and feet without open cuts through the actual pose branches',async()=>{
 const f=createGhost(new T.Group()),legs=[];f.position.set(2,1,-3);f.rotation.y=.6;
 f.traverse(m=>{if(m.name==='ghost-continuous-leg')legs.push(m);});
 assert.equal(legs.length,2,'replace the lathe thigh, knee sphere and tapered calf with source anatomy');
 const {default:body}=await import('../lib/assets/ghost-neck.json',{with:{type:'json'}}),skin=f.getObjectByName('ghost-collar-skin');
 const poses=[()=>animateGhost(f,3,1,.7,false,1.6,0),()=>animateGhost(f,3,1,.7,false,1.6,.5),()=>animateGhost(f,3,1,.7,false,4.8,1),()=>animateGhostAttack(f,.4,false),()=>animateGhostAttack(f,1.8,true,1),()=>animateGhostPassenger(f,3,0,false,true),()=>animateGhostPassenger(f,3,1,false,true),()=>animateGhostEmergence(f,.6,false)];
 for(const [pose,apply] of poses.entries()){
  apply();f.updateMatrixWorld(true);
  for(const [side,key] of ['r','l'].entries()){
   const leg=legs[side],ring=body.legRings[key],bp=skin.geometry.attributes.position,lp=leg.geometry.attributes.position,bn=skin.geometry.attributes.normal,ln=leg.geometry.attributes.normal;
   assert.ok(ring.body.length>=20,'retain the complete source femur cut');
   const bm=new T.Matrix3().getNormalMatrix(skin.matrixWorld),lm=new T.Matrix3().getNormalMatrix(leg.matrixWorld);
   for(let i=0;i<ring.body.length;i++){
    const a=new T.Vector3().fromBufferAttribute(bp,ring.body[i]).applyMatrix4(skin.matrixWorld),b=new T.Vector3().fromBufferAttribute(lp,ring.leg[i]).applyMatrix4(leg.matrixWorld);
    assert.ok(a.distanceTo(b)<.000002,`pose ${pose}: open thigh cut ${side}/${i}`);
    a.fromBufferAttribute(bn,ring.body[i]).applyMatrix3(bm).normalize();b.fromBufferAttribute(ln,ring.leg[i]).applyMatrix3(lm).normalize();assert.ok(a.dot(b)>.999,'thigh lighting is continuous');
   }
   const seam=leg.getObjectByName('ghost-ankle-skin'),foot=f.getObjectByName('ghost-foot-'+(side===0?-1:1)),sp=seam.geometry.attributes.position,fp=foot.geometry.attributes.position;
   for(const mesh of [leg,seam])assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite),'articulated skin stays finite');
   for(let i=0;i<sp.count;i++){
    const a=new T.Vector3().fromBufferAttribute(sp,i).applyMatrix4(seam.matrixWorld);let closest=Infinity;
    for(const mesh of [leg,foot]){const p=mesh.geometry.attributes.position;for(let j=0;j<p.count;j++)closest=Math.min(closest,a.distanceTo(new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(mesh.matrixWorld)));}
    assert.ok(closest<.000002,`pose ${pose}: ankle bridge detaches from skin`);
   }
  }
 }
});
