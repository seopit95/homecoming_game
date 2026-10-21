import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createGhost,animateGhost} from '../lib/ghost.ts';
const point=(f,name)=>f.getObjectByName(name).getWorldPosition(new T.Vector3());
function transform(f,{reduced=false,solids=[],floor}={}){for(let i=0;i<=60;i++)animateGhost(f,3+i/60,1,.8,reduced,2+i*.07,1,floor,solids,1);f.updateMatrixWorld(true);}
test('V118 a pursuing crawler unfolds into an adult-height arched threat and exposes its dislocated jaw',()=>{
 const f=createGhost(new T.Group());animateGhost(f,3,1,.8,false,2,1);const rest=point(f,'ghost-head').y;transform(f);
 assert.ok(point(f,'ghost-head').y>1.0&&point(f,'ghost-head').y>rest+.3,'the face must rise out of the small floor-level silhouette');assert.ok(f.getObjectByName('ghost-continuous-face').userData.openness>.6);assert.equal(f.getObjectByName('ghost-attack-mouth').visible,true);assert.deepEqual(f.scale.toArray(),[1,1,1]);assert.deepEqual(f.getObjectByName('ghost-head').scale.toArray(),[.67,.68,.68]);
});
test('V118 pursuit transformation is continuous, freezes at paused time, recovers after losing pursuit and retains its silhouette with reduced motion',()=>{
 const f=createGhost(new T.Group());animateGhost(f,3,1,.8,false,2,1);let last=point(f,'ghost-head');for(let i=1;i<=60;i++){animateGhost(f,3+i/60,1,.8,false,2,1,undefined,[],1);const next=point(f,'ghost-head');assert.ok(next.distanceTo(last)<.055);last=next;}const held=last.clone();animateGhost(f,4,1,.8,false,2,1,undefined,[],1);assert.ok(held.distanceTo(point(f,'ghost-head'))<1e-8);for(let i=1;i<=120;i++)animateGhost(f,4+i/60,0,.2,false,2,1);assert.ok(point(f,'ghost-head').y<.85);const r=createGhost(new T.Group());transform(r,{reduced:true});assert.ok(point(r,'ghost-head').y>1,'reduced motion retains the threat without convulsive flicker');
});

function penetration(figure,solids){
 figure.updateMatrixWorld(true);const point=new T.Vector3();let hit;
 figure.traverse(mesh=>{
  if(hit||!mesh.isMesh||mesh.isInstancedMesh)return;
  for(let o=mesh;o!==figure;o=o.parent)if(!o.visible)return;
  const vertices=mesh.geometry.getAttribute('position');
  for(let i=0;i<vertices.count&&!hit;i++){
   point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
   for(const s of solids){const c=Math.cos(s.yaw??0),sn=Math.sin(s.yaw??0),dx=point.x-s.x,dz=point.z-s.z,x=c*dx-sn*dz,z=sn*dx+c*dz;
    if(Math.abs(x)<s.w/2-.002&&Math.abs(z)<s.d/2-.002&&Math.abs(point.y-(s.y??1.5))<(s.h??3)/2-.002){hit=`${mesh.name||mesh.parent?.name||'mesh'} at ${point.toArray().map(n=>n.toFixed(3)).join(', ')}`;break;}
   }
  }
 });return hit;
}

test('V118 the transformed body gathers before walls and keeps its planted support through a moving stroke',()=>{
 const f=createGhost(new T.Group());
 for(const angle of [0,Math.PI/4,Math.PI/2,3*Math.PI/4])for(const phase of [0,1.6,3.2,4.8]){
  const wall={x:Math.cos(angle)*.56,z:Math.sin(angle)*.56,w:.2,d:4,y:1.5,h:3,yaw:-angle};transform(f,{solids:[wall]});animateGhost(f,4.1,1,.8,false,phase,1,()=>0,[wall],1);assert.equal(penetration(f,[wall]),undefined,`transformed wall ${angle} phase ${phase}`);
 }
 const g=createGhost(new T.Group());transform(g);let planted;for(let frame=0;frame<=20;frame++){const distance=frame*.006;g.position.z=distance;animateGhost(g,4+frame/60,1,.8,false,Math.PI+distance*Math.PI*2/.82,1,()=>0,[],1);const hand=point(g,'ghost-hand--1');planted??=hand.clone();assert.ok(hand.distanceTo(planted)<.015,`raised shoulder must not pull its planted wrist ${hand.distanceTo(planted)}m`);}
});

test('V118 a raised pursuit spine retains clearance while descending a divided stair flight',()=>{
 const floor=(x,z)=>z>=0?0:(x<0?1:-1)*Math.min(2.8,-z*.7),wall={x:0,z:-3,w:.12,d:6,y:1.4,h:9};
 for(const x of [-.75,.75])for(const yaw of [0,Math.PI]){const f=createGhost(new T.Group());f.position.set(x,floor(x,-2),-2);f.rotation.y=yaw;transform(f,{floor,solids:[wall]});for(const phase of [0,2,4]){animateGhost(f,4.1,1,.8,false,phase,1,floor,[wall],1);assert.equal(penetration(f,[wall]),undefined);f.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));}}
});
