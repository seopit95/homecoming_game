import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld} from '../lib/world.ts';
import {clearPath,pursuerRadius} from '../lib/navigation.ts';
import {createGhost,animateGhost,animateGhostAttack} from '../lib/ghost.ts';

// Canvas text is unrelated to the resident solids and articulated figure.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
const times=[.35,.7,1.8,2.6];
function fixture(z,eye,reduced){
 const world=buildWorld(new T.Scene(),'resident'),figure=world.figure,origin=new T.Vector3(-.0054404768319309404,eye,z);
 const direction=new T.Vector3(.011377094494760205,0,.9999352787675545),from=origin.clone().addScaledVector(direction,.61);from.y=0;figure.visible=true;
 const camera=origin.clone(),wanted=new T.Vector3();
 function place(out,a,b,r){out.copy(b);if(clearPath(a,b,world.solids,world.bounds,r))return;let lo=0,hi=1;for(let j=0;j<12;j++){out.copy(a).lerp(b,(lo+hi)/2);if(clearPath(a,out,world.solids,world.bounds,r))lo=(lo+hi)/2;else hi=(lo+hi)/2;}out.copy(a).lerp(b,lo);}
 function pose(time){
  const fall=T.MathUtils.smoothstep(time,1.05,2.55),lunge=T.MathUtils.smoothstep(time,0,.32);
  wanted.copy(origin).addScaledVector(direction,T.MathUtils.lerp(1.03,.85,lunge));place(figure.position,from,wanted,pursuerRadius);figure.position.y=world.heightAt(figure.position.x,figure.position.z);
  figure.rotation.set(0,Math.atan2(-direction.x,-direction.z),0,'YXZ');
  wanted.copy(origin).addScaledVector(direction,-fall*.2);place(camera,origin,wanted,.23);camera.y=T.MathUtils.lerp(eye,.27,fall);
  world.updateStory('dying',time,reduced,undefined,[{x:camera.x,z:camera.z,r:.23},{x:figure.position.x,z:figure.position.z,r:pursuerRadius}]);
  animateGhostAttack(figure,time,reduced,eye,world.solids);figure.updateMatrixWorld(true);
 }
 return {world,figure,camera,pose};
}
function visible(mesh,figure){for(let o=mesh;o!==figure;o=o.parent)if(!o.visible)return false;return true;}
function meshesUnder(root){const meshes=[];root.traverse(m=>{if(m.isMesh&&!m.isInstancedMesh)meshes.push(m);});return meshes;}

test('resident capture body cannot precede oral tissue through the visible mouth aperture',()=>{
 const ray=new T.Raycaster(),point=new T.Vector3();
 for(const z of [6.233605619386225,0])for(const eye of [1,1.65])for(const reduced of [false,true]){
  const {world,figure,camera,pose}=fixture(z,eye,reduced),head=figure.getObjectByName('ghost-head'),face=figure.getObjectByName('ghost-continuous-face'),oral=meshesUnder(head),body=meshesUnder(figure).filter(m=>!oral.includes(m));
  try{for(const time of times){
   pose(time);const p=face.geometry.getAttribute('position'),border=Array.from({length:64},(_,i)=>new T.Vector3().fromBufferAttribute(p,i)),center=border.reduce((a,b)=>a.add(b),new T.Vector3()).divideScalar(64);let checked=0;
   // Interior points of the actual deformed lip, including the lower aperture
   // missed by the eyes/nose ray regression. Runtime material sides stay intact.
   for(let i=0;i<64;i+=4)for(const radial of [.25,.5,.75]){
    point.copy(center).lerp(border[i],radial).applyMatrix4(head.matrixWorld);ray.set(camera,point.clone().sub(camera).normalize());ray.far=2;
    const tissue=ray.intersectObjects(oral.filter(m=>visible(m,figure)),false)[0];
    if(!tissue||tissue.object===face||tissue.object.name==='ghost-scalp-cap'||tissue.object.name.includes('hair'))continue;
    checked++;ray.far=tissue.distance-.0001;
    const blocker=ray.intersectObjects(body.filter(m=>visible(m,figure)),false)[0];
    assert.ok(!blocker,`${blocker?.object.name} precedes ${tissue.object.name} by ${blocker?(tissue.distance-blocker.distance)*1000:0} mm: z ${z}, eye ${eye}, reduced ${reduced}, time ${time}, aperture ${i}/${radial}`);
   }
   assert.ok(checked>=12,`fixture must trace visible oral surfaces: ${checked}, eye ${eye}, reduced ${reduced}, time ${time}`);
  }}finally{disposeWorld(world.root);}
 }
});

test('lowered capture keeps the skirt over connected thighs and all visible body vertices outside resident solids and floor',()=>{
 const ray=new T.Raycaster(),point=new T.Vector3();
 for(const eye of [1,1.65])for(const reduced of [false,true]){
  const {world,figure,pose}=fixture(6.233605619386225,eye,reduced),gown=figure.getObjectByName('ghost-wet-dress');
  try{for(const time of [...new Set([...times,...Array.from({length:33},(_,i)=>i/10)])]){
   pose(time);
   for(const side of [-1,1])for(const along of [.05,.15,.25,.35])for(const direction of [[side,0,0],[0,.5,1],[side,.5,-1]]){
    const hip=figure.getObjectByName(`ghost-hip-${side}`),out=new T.Vector3(...direction).normalize().transformDirection(figure.matrixWorld);
    point.set(0,-along,0).applyMatrix4(hip.matrixWorld);ray.set(point.clone().addScaledVector(out,.8),out.clone().negate());ray.near=0;ray.far=1.2;
    assert.ok(ray.intersectObjects([gown,hip],true)[0]?.object===gown,`thigh emerges through cloth: ${eye}, ${reduced}, ${time}, ${side}, ${along}`);
    const radial=new T.Vector3(side,0,0).transformDirection(hip.matrixWorld);
    ray.set(point.clone().addScaledVector(radial,.16),radial.negate());ray.far=.16;
    assert.ok(ray.intersectObject(hip,true)[0]?.distance<.145,`missing thigh skin at ${time}/${along}`);
   }
   const near=world.solids.filter(s=>Math.hypot(s.x-figure.position.x,s.z-figure.position.z)<Math.hypot(s.w,s.d)/2+1.6);
   for(const m of meshesUnder(figure).filter(m=>visible(m,figure))){const p=m.geometry.getAttribute('position');for(let i=0;i<p.count;i++){
    point.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);assert.ok(point.y>=-.002,`${m.name} below floor at ${eye}/${time}: ${point.y}`);
    for(const s of near){const c=Math.cos(s.yaw??0),sn=Math.sin(s.yaw??0),dx=point.x-s.x,dz=point.z-s.z;
     const depth=Math.min(s.w/2-Math.abs(c*dx-sn*dz),s.d/2-Math.abs(sn*dx+c*dz),(s.h??3)/2-Math.abs(point.y-(s.y??1.5)));
     assert.ok(depth<=.002,`${m.name} penetrates resident solid by ${depth} at ${eye}/${time}`);
    }
   }}
  }}finally{disposeWorld(world.root);}
 }
});

test('capture posing resets to ordinary walking and crawling surfaces',()=>{
 const {world,figure,pose}=fixture(6.233605619386225,1,false),control=createGhost(new T.Group());
 const snapshot=f=>{f.updateMatrixWorld(true);return meshesUnder(f).map(m=>({name:m.name,matrix:m.matrixWorld.toArray(),positions:Array.from(m.geometry.getAttribute('position').array),visible:m.visible}));};
 try{for(const crawl of [0,1]){
  for(const time of times)pose(time);
  control.position.copy(figure.position);control.quaternion.copy(figure.quaternion);
  for(const f of [figure,control])animateGhost(f,3,1,.7,false,2,crawl,undefined,world.solids);
  assert.deepEqual(snapshot(figure),snapshot(control),'capture state cannot leak into the gait');
  assert.equal(figure.getObjectByName('ghost-attack-mouth').visible,false);
 }}finally{disposeWorld(world.root);disposeWorld(control);}
});


test('capture crouch supports planted feet and changes the leg and gown surfaces continuously through the fall',()=>{
 const figure=createGhost(new T.Group()),point=new T.Vector3();
 for(const eye of [1,1.65])for(const reduced of [false,true]){
  let previous,feet,previousKnees;
  for(let i=0;i<=160;i++){
   const time=i*.02;animateGhostAttack(figure,time,reduced,eye);figure.updateMatrixWorld(true);
   const hips=[-1,1].map(side=>figure.getObjectByName(`ghost-hip-${side}`)),ankles=[-1,1].map(side=>figure.getObjectByName(`ghost-ankle-${side}`));
   const current=ankles.map(a=>({point:a.getWorldPosition(new T.Vector3()),rotation:a.getWorldQuaternion(new T.Quaternion())}));feet??=current;
   for(let j=0;j<2;j++){
    assert.ok(current[j].point.distanceTo(feet[j].point)<1e-7,'the squat retains the planted ankle contact');
    assert.ok(current[j].rotation.angleTo(feet[j].rotation)<1e-7,'feet retain their supported orientation');
    const torso=figure.getObjectByName('ghost-head').parent,waist=torso.localToWorld(new T.Vector3(0,.055,0)),hip=hips[j].getWorldPosition(new T.Vector3()),knee=figure.getObjectByName(`ghost-knee-${j===0?-1:1}`).getWorldPosition(new T.Vector3());
    assert.ok(waist.y>hip.y+.025&&hip.y>knee.y,'waist, pelvis and knee guides retain their descending order');
   }
   const knees=[-1,1].map(side=>figure.getObjectByName(`ghost-knee-${side}`).getWorldPosition(new T.Vector3()));
   if(previousKnees)for(let j=0;j<2;j++)assert.ok(knees[j].distanceTo(previousKnees[j])<.025,'the crouch keeps the standing knee bend branch');
   previousKnees=knees;
   const gown=figure.getObjectByName('ghost-wet-dress'),p=gown.geometry.getAttribute('position'),surface=[];
   for(let j=0;j<p.count;j++){point.fromBufferAttribute(p,j).applyMatrix4(gown.matrixWorld);surface.push(point.clone());}
   if(previous)for(let j=0;j<surface.length;j++)assert.ok(surface[j].distanceTo(previous[j])<.04,`gown jumps through the fall at ${time}: ${surface[j].distanceTo(previous[j])}`);
   previous=surface;
  }
 }
 disposeWorld(figure);
});
