import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGhost,animateGhost,animateGhostAttack,animateGhostPassenger,animateGhostEmergence} from '../lib/ghost.ts';
import garment from '../lib/assets/ghost-dress.json' with {type:'json'};

// A detached sleeve can overlap the body at rest and still open when the arm
// turns. Measure the actual posed triangle surface, welding only UV seams.
test('the nightdress sleeves remain stitched to the bodice in every animation branch',()=>{
 const figure=createGhost(new T.Group());
 const poses=[
  ()=>animateGhost(figure,3,1,.7,false,1.6,0),
  ()=>animateGhost(figure,3,1,.7,false,1.6,.5),
  ()=>animateGhost(figure,3,1,.7,false,4.8,1),
  ()=>animateGhost(figure,3,1,.7,false,2,1,undefined,[{x:0,z:.56,w:3,d:.2}]),
  ()=>animateGhostPassenger(figure,3,0,false,true),
  ()=>animateGhostPassenger(figure,3,1,false,true),
  ()=>animateGhostAttack(figure,.4,false),
  ()=>animateGhostEmergence(figure,.6,false),
 ];
 for(const [pose,apply] of poses.entries()){
  apply();figure.updateMatrixWorld(true);
  const ids=new Map(),parents=[],point=new T.Vector3(),cloth=[],used=new Set();
  figure.traverse(mesh=>{if(mesh.isMesh&&['ghost-wet-dress','ghost-fitted-sleeve'].includes(mesh.name))cloth.push(mesh);});
  const root=i=>parents[i]===i?i:(parents[i]=root(parents[i]));
  for(const mesh of cloth){
   const p=mesh.geometry.getAttribute('position'),ix=mesh.geometry.index,keys=[];
   for(let i=0;i<p.count;i++){
    point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
    const key=point.toArray().map(v=>Math.round(v*1e5)).join('/');
    if(!ids.has(key)){ids.set(key,parents.length);parents.push(parents.length);}keys.push(ids.get(key));
   }
   for(let i=0;i<ix.count;i+=3){const a=keys[ix.getX(i)];used.add(a);for(let j=1;j<3;j++){const b=keys[ix.getX(i+j)];used.add(b);parents[root(b)]=root(a);}}
  }
  assert.equal(new Set([...used].map(root)).size,1,`pose ${pose}: detached cloth surface leaves an unstitched shoulder`);
 }
});

test('the upper clavicle joins the moving neck bridge without an exposed cut edge',()=>{
 const f=createGhost(new T.Group()),chest=f.getObjectByName('ghost-clavicle-skin'),neck=f.getObjectByName('ghost-neck'),p=chest.geometry.attributes.position,v=new T.Vector3();
 const top=garment.chest.position.flatMap((_,i)=>i%3===0&&garment.chest.position[i+1]>=.392?[i/3]:[]);assert.ok(top.length>0);
 for(const pose of ['walk','crawl','passenger','attack']){
  if(pose==='passenger')animateGhostPassenger(f,3,1,false,true);else if(pose==='attack')animateGhostAttack(f,.4,false);else animateGhost(f,3,1,.7,false,1.6,pose==='crawl'?1:0);
  f.updateMatrixWorld(true);
  for(const i of top){v.fromBufferAttribute(p,i).applyMatrix4(chest.matrixWorld);neck.worldToLocal(v);assert.ok(v.length()<.995,`${pose}: exposed upper clavicle cut at vertex ${i}, radius ${v.length()}`);}
 }
});

test('the open neckline exposes chest skin instead of a hollow garment interior',()=>{
 const f=createGhost(new T.Group());animateGhost(f,3,0,.7,false);f.updateMatrixWorld(true);
 const gown=f.getObjectByName('ghost-wet-dress'),targets=[gown,f.getObjectByName('ghost-neck'),f.getObjectByName('ghost-clavicle-skin')].filter(Boolean),ray=new T.Raycaster();
 for(const x of [-.055,.055])for(const y of [.35,.37]){
  const from=gown.localToWorld(new T.Vector3(x,y,1)),direction=new T.Vector3(0,0,-1).transformDirection(gown.matrixWorld);ray.set(from,direction);ray.far=2;
  const hit=ray.intersectObjects(targets,false)[0];
  // The raised right collar covers one probe; an outside cloth hit is valid.
  // The left opening must expose actual skin, not the inside back of the dress.
  const skin=hit?.object.material.name==='surface-skin';
  assert.ok(hit&&(skin||gown.worldToLocal(hit.point.clone()).z>.015)&&(x>0||skin),`hollow neckline at ${x}, ${y}: ${hit?.object.name}`);
 }
});

test('the authored garment clears the stair divider and rendered treads during crawl turns',()=>{
 const f=createGhost(new T.Group()),gown=f.getObjectByName('ghost-wet-dress'),p=gown.geometry.attributes.position,ix=gown.geometry.index,tri=new T.Triangle(),point=new T.Vector3();
 const solids=[{x:0,z:-3,w:.12,d:6,y:1.4,h:9}],box=new T.Box3(new T.Vector3(-.058,-3.098,-5.998),new T.Vector3(.058,5.898,-.002));
 const floor=(x,z)=>z>=0?0:(x<0?1:-1)*Math.min(2.8,-z*.7);
 const tread=(x,z)=>z>=0||z<=-4?floor(x,z):(x<0?1:-1)*(Math.floor(-z*17/4)+.5)*2.8/17;
 for(const x of [-1,-.75,-.5,.5,.75,1])for(const z of [-3,-.1,.5])for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const phase of [0,2,4]){
  f.position.set(x,floor(x,z),z);f.rotation.y=yaw;animateGhost(f,3,1,.7,false,phase,1,floor,solids);f.updateMatrixWorld(true);
  for(let i=0;i<ix.count;i+=3){
   for(let j=0;j<3;j++){const v=tri[['a','b','c'][j]];v.fromBufferAttribute(p,ix.getX(i+j)).applyMatrix4(gown.matrixWorld);assert.ok(v.y-tread(v.x,v.z)>-.01,`garment vertex cuts tread at ${x}, ${z}, yaw ${yaw}, phase ${phase}`);}
   assert.ok(!box.intersectsTriangle(tri),`garment cuts divider at ${x}, ${z}, yaw ${yaw}, phase ${phase}`);
   tri.getMidpoint(point);assert.ok(point.y-tread(point.x,point.z)>-.01,`garment triangle spans through tread at ${x}, ${z}, yaw ${yaw}, phase ${phase}`);
  }
 }
});

test('the new garment surface clears close walls and door leaves across walk-crawl blends',()=>{
 const f=createGhost(new T.Group()),gown=f.getObjectByName('ghost-wet-dress'),p=gown.geometry.attributes.position,ix=gown.geometry.index,point=new T.Vector3(),tri=new T.Triangle(),box=new T.Box3();
 const cases=[
  [{x:-1.1,z:0,w:1.2,d:.2},{x:1.1,z:0,w:1.2,d:.2}],
  [{x:.73,z:.2,w:.08,d:1.8,y:1.15,h:2.3,yaw:.55}],
  ...Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return [{x:Math.cos(a)*.531,z:Math.sin(a)*.531,w:.2,d:4,yaw:-a,y:1.5,h:3}];}),
 ];
 for(const [fixture,solids] of cases.entries())for(const yaw of [0,.717])for(const phase of [0,1.6,3.2,4.8])for(const crawl of [0,.5,1]){
  f.rotation.y=yaw;animateGhost(f,3,1,.7,false,phase,crawl,undefined,solids);f.updateMatrixWorld(true);
  for(const s of solids){
   const matrix=new T.Matrix4().makeRotationY(-(s.yaw??0)).multiply(new T.Matrix4().makeTranslation(-s.x,-(s.y??1.5),-s.z)).multiply(gown.matrixWorld);
   box.set(new T.Vector3(-s.w/2+.002,-(s.h??3)/2+.002,-s.d/2+.002),new T.Vector3(s.w/2-.002,(s.h??3)/2-.002,s.d/2-.002));
   for(let i=0;i<ix.count;i+=3){for(let j=0;j<3;j++)tri[['a','b','c'][j]].fromBufferAttribute(p,ix.getX(i+j)).applyMatrix4(matrix);
    assert.ok(!box.intersectsTriangle(tri),`garment cuts fixture ${fixture}, yaw ${yaw}, phase ${phase}, crawl ${crawl}, triangle ${i/3}`);
   }
  }
  for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(gown.matrixWorld);assert.ok(point.y>=.018,`garment below floor in fixture ${fixture}, phase ${phase}, crawl ${crawl}`);}
 }
});

test('opaque sleeves cover shoulder skin while both forearms retain visible exterior skin',()=>{
 const f=createGhost(new T.Group()),gown=f.getObjectByName('ghost-wet-dress'),skin=[],ray=new T.Raycaster();f.traverse(m=>{if(m.name==='ghost-continuous-arm')skin.push(m);});
 for(const crawl of [0,.5,1]){
  animateGhost(f,3,1,.7,false,1.6,crawl);f.updateMatrixWorld(true);
  for(const side of [-1,1]){
   const hand=f.getObjectByName(`ghost-hand-${side}`),lower=hand.parent.parent,upper=lower.parent;
   for(const along of [.02,.06,.1])for(const dz of [-1,1]){
    const center=upper.localToWorld(new T.Vector3(0,-along,0)),out=new T.Vector3(side,0,dz).normalize().transformDirection(upper.matrixWorld);
    ray.set(center.clone().addScaledVector(out,.3),out.negate());ray.far=.3;
    const hit=ray.intersectObjects([gown,...skin],false)[0];assert.ok(hit?.object===gown,`shoulder cloth exterior missing: crawl ${crawl}, side ${side}, along ${along}, dz ${dz}`);
   }
   for(const dz of [-1,1]){
    const center=lower.localToWorld(new T.Vector3(0,-.18,0)),out=new T.Vector3(0,0,dz).transformDirection(lower.matrixWorld);
    ray.set(center.clone().addScaledVector(out,.12),out.negate());ray.far=.24;
    assert.ok(ray.intersectObjects(skin,false).length,`forearm exterior missing: crawl ${crawl}, side ${side}, dz ${dz}`);
   }
  }
 }
});

test('sleeve cloth follows the upper arm instead of standing out as rigid fins',()=>{
 const f=createGhost(new T.Group()),gown=f.getObjectByName('ghost-wet-dress'),p=gown.geometry.getAttribute('position'),v=new T.Vector3();
 for(const pose of ['walk','crawl','passenger','attack']){
  if(pose==='passenger')animateGhostPassenger(f,3,1,false,true);else if(pose==='attack')animateGhostAttack(f,.4,false);else animateGhost(f,3,1,.7,false,1.6,pose==='crawl'?1:0);
  f.updateMatrixWorld(true);
  for(const side of [-1,1]){
   const arm=f.getObjectByName(`ghost-hand-${side}`).parent.parent.parent,inverse=arm.matrixWorld.clone().invert().multiply(gown.matrixWorld);
   for(let i=0;i<p.count;i++){
    const x=garment.position[i*3],y=garment.position[i*3+1];if(x*side<.25||y<-.02)continue;
    v.fromBufferAttribute(p,i).applyMatrix4(inverse);
    assert.ok(Math.hypot(v.x,v.z)<.115,`${pose}, side ${side}: sleeve vertex ${i} stands ${Math.hypot(v.x,v.z)}m out from the upper arm`);
   }
  }
 }
});
