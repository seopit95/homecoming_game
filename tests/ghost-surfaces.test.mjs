import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGhost,animateGhost,animateGhostAttack,animateGhostPassenger} from '../lib/ghost.ts';
import {createFace,poseFace} from '../lib/ghost-face.ts';
import {extremity} from '../lib/ghost-anatomy.ts';

function openWristEdges(arm,hand){
 const vertices=[],edges=new Map(),p=new T.Vector3(),inverse=hand.matrixWorld.clone().invert(),local=new T.Matrix4();
 for(const mesh of [arm,...arm.children,hand]){
  if(!mesh.isMesh)continue;local.multiplyMatrices(inverse,mesh.matrixWorld);
  const g=mesh.geometry,v=g.getAttribute('position'),ix=g.index,points=[];
  for(let i=0;i<v.count;i++){p.fromBufferAttribute(v,i).applyMatrix4(local);let key=-1;if(p.length()<.08&&p.y>-.05){key=vertices.findIndex(v=>v.distanceToSquared(p)<1e-12);if(key<0){key=vertices.length;vertices.push(p.clone());}}points.push({key,point:p.clone()});}
  for(let i=0;i<ix.count;i+=3)for(let j=0;j<3;j++){
   const a=points[ix.getX(i+j)],b=points[ix.getX(i+(j+1)%3)];if(a.key<0||b.key<0||a.key===b.key)continue;
   const key=[a.key,b.key].sort().join('/'),at=a.point.clone().add(b.point).multiplyScalar(.5);const prior=edges.get(key);edges.set(key,{count:(prior?.count??0)+1,at});
  }
 }
 return [...edges.values()].filter(e=>e.count===1&&e.at.length()<.055&&e.at.y>-.025);
}
test('arm and hand skin have no open wrist seam while reaching, folding and crawling',()=>{
 const f=createGhost(new T.Group()),arms=[];f.traverse(m=>{if(m.name==='ghost-continuous-arm')arms.push(m);});
 for(const pose of ['walk','crawl','attack','fold','passenger'])for(const time of [0,.4,1.5]){
  f.position.set(time*3,0,-4);f.rotation.y=.8*time;
  if(pose==='attack'||pose==='fold')animateGhostAttack(f,time,false,1.65,pose==='fold'?[{x:f.position.x+.55,z:f.position.z,w:.2,d:4}]:[]);else if(pose==='passenger')animateGhostPassenger(f,time,1,false);else animateGhost(f,time,1,.8,false,time*3,pose==='crawl'?1:0);
  f.updateMatrixWorld(true);
  for(let i=0;i<2;i++){const hand=f.getObjectByName(`ghost-hand-${i===0?-1:1}`);assert.equal(openWristEdges(arms[i],hand).length,0,`${pose} ${time} side ${i}: unstitched skin boundary at the wrist`);}
 }
});

function inside(p,polygon){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
test('tooth crowns are recessed and the cheeks occlude teeth outside the mouth opening',()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial());
 for(const open of [.3,.6,1]){
  poseFace(r,open);head.updateMatrixWorld(true);const positions=r.face.geometry.getAttribute('position'),border=Array.from({length:64},(_,i)=>new T.Vector3().fromBufferAttribute(positions,i));
  for(const row of [r.teeth,r.lower])for(const tooth of row.children){
   const center=tooth.getWorldPosition(new T.Vector3());
   if(!inside(center,border)){const ray=new T.Raycaster(new T.Vector3(center.x,center.y,1),new T.Vector3(0,0,-1));const hit=ray.intersectObjects([r.face,tooth],false)[0];assert.equal(hit?.object,r.face,`tooth at ${open} is visible outside the lip`);}
   let nearest=border[0];for(const point of border)if(point.distanceToSquared(center)<nearest.distanceToSquared(center))nearest=point;
   const front=center.z+tooth.scale.z;assert.ok(front<nearest.z-.001,'enamel must be recessed behind the lip');
  }
 }
});

test('both hands render their outer palm and back instead of the inside surface',()=>{
 for(const side of [-1,1])for(const elongated of [false,true]){
  const hand=extremity('hand',side,new T.MeshStandardMaterial(),elongated);hand.updateMatrixWorld(true);
  for(const face of [-1,1]){
   const ray=new T.Raycaster(new T.Vector3(0,-.035,face*.08),new T.Vector3(0,0,-face),0,.16),hit=ray.intersectObject(hand,false)[0];
   assert.ok(hit,`hand ${side} must be visible from face ${face}`);assert.ok(hit.distance<.08,`hand ${side}, face ${face}: first visible skin is on the far inside surface (${hit.distance})`);
  }
 }
});

test('hair cards expose spaces between wet strands, not only at their outer edges',async()=>{
 const {createHair}=await import('../lib/ghost-hair.ts');const {tails}=createHair(new T.Group()),material=tails.children[0].material,{data,width}=material.alphaMap.image;
 for(const row of [80,160]){
  let gaps=0,strands=0;for(let col=24;col<104;col++){if(data[(row*width+col)*4+1]/255<material.alphaTest)gaps++;else strands++;}
  assert.ok(gaps>0&&strands>0,'the inside of a hair card must resolve into individual strands');
 }
});

test('partially opening the mouth never reverses or interpenetrates exposed tooth rows',()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial());
 for(const open of [.021,.05,.1,.13,.2,.220001,.4,1]){
  poseFace(r,open);head.updateMatrixWorld(true);if(!r.teeth.visible||!r.lower.visible)continue;
  const upper=new T.Box3().setFromObject(r.teeth),lower=new T.Box3().setFromObject(r.lower);
  assert.ok(upper.min.y>lower.max.y,`tooth rows cross at mouth openness ${open}`);
 }
});

test('central upper and lower crowns remain visible ahead of the throat in an open mouth',()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial());
 for(const open of [.3,.6,1]){
  poseFace(r,open);head.updateMatrixWorld(true);
  for(const row of [r.teeth,r.lower])for(const i of [3,4]){
   const tooth=row.children[i],point=tooth.getWorldPosition(new T.Vector3()),ray=new T.Raycaster(new T.Vector3(point.x,point.y,1),new T.Vector3(0,0,-1));
   const hit=ray.intersectObjects([r.face,r.lip,r.throat,...r.gums,...r.teeth.children,...r.lower.children],false)[0];
   assert.equal(hit?.object.name,tooth.name,`central crown buried behind oral surface at ${open}`);
  }
 }
});
