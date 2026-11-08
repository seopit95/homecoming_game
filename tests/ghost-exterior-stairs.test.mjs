import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildResidentialStairs} from '../lib/residential-stairs.ts';
import {buildResidentialGallery} from '../lib/residential-gallery.ts';
import {disposeWorld} from '../lib/world.ts';
import {findPursuitPath,pursuerRadius} from '../lib/navigation.ts';
import {createGhost,animateGhost} from '../lib/ghost.ts';
import {exteriorGhostScale} from '../lib/ghost-exterior.ts';

const context={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}};
Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>context})}});
function penetration(figure,solids){
 figure.updateMatrixWorld(true);const p=new T.Vector3();let hit;
 figure.traverse(mesh=>{
  if(hit||!mesh.isMesh||mesh.isInstancedMesh)return;
  for(let o=mesh;o!==figure;o=o.parent)if(!o.visible)return;
  const a=mesh.geometry.attributes.position;
  for(let i=0;i<a.count&&!hit;i++){
   p.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);
   for(const s of solids){const c=Math.cos(s.yaw??0),n=Math.sin(s.yaw??0),dx=p.x-s.x,dz=p.z-s.z;
    if(Math.abs(c*dx-n*dz)<s.w/2-.003&&Math.abs(n*dx+c*dz)<s.d/2-.003&&Math.abs(p.y-(s.y??1.5))<(s.h??3)/2-.003){hit={part:mesh.name||mesh.parent.name,point:p.toArray(),solid:s};break;}
   }
  }
 });return hit;
}

// This uses tangent-following geometric steps, not game.ts turning physics.
// Actual stacked treads/slabs are provided to grounding; penetration checks
// cover navigation walls/doors, not interpolated ramp versus tread heights.
test('enlarged stair ghost traverses four real floors with original squeeze envelope',()=>{
 const root=new T.Group(),w=buildResidentialStairs(root,true),r=w.stairRoute,f=createGhost(root);
 f.scale.setScalar(exteriorGhostScale('stairs'));f.visible=true;
 const goal={x:-1,y:-11.2,z:-.8},g={x:.7,y:0,z:-2.9};let checked=0;
 try{
  for(let frame=0;frame<2500&&Math.hypot(g.x-goal.x,g.y-goal.y,g.z-goal.z)>.12;frame++){
   const target=r.chaseTarget(g,goal),solids=r.navigationSolids(g.y),path=findPursuitPath(g,target,solids,w.bounds,pursuerRadius);
   assert.ok(path.length,JSON.stringify({frame,g,target}));
   const next=path.find(p=>Math.hypot(p.x-g.x,p.z-g.z)>.04)??target,dx=next.x-g.x,dz=next.z-g.z,d=Math.hypot(dx,dz),step=Math.min(.065,d);
   assert.ok(d>.001);g.x+=dx/d*step;g.z+=dz/d*step;g.y=r.heightAt(g.x,g.z,g.y);
   if(frame%8)continue;
   f.position.set(g.x,g.y,g.z);f.rotation.y=Math.atan2(dx,dz);
   animateGhost(f,3+frame*.05,1,.7,false,frame*.5,1,(x,z)=>r.heightAt(x,z,g.y),w.solids);
   assert.equal(penetration(f,r.navigationSolids(g.y)),undefined,JSON.stringify({frame,g}));checked++;
  }
  assert.ok(Math.hypot(g.x-goal.x,g.y-goal.y,g.z-goal.z)<.12);assert.ok(checked>=100);
 }finally{disposeWorld(root);}
});

test('enlarged gallery ghost retains landing and transfer doorway routes and turning clearance',()=>{
 for(const [area,start,goal] of [['landing',{x:3.7,z:20.5},{x:0,z:-21}],['transfer',{x:-.7,z:24.1},{x:2.2,z:-21}]]){
  const root=new T.Group(),w=buildResidentialGallery(root,area),f=w.figure;
  f.scale.setScalar(exteriorGhostScale(area));f.visible=true;
  try{
   const path=findPursuitPath(start,goal,w.solids,w.bounds,pursuerRadius);assert.ok(path.length,area);
   // Discrete authored turning poses at each path corner, including the narrow
   // entry throat. This is not a claim about continuous steering convergence.
   for(const point of [start,...path])for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4)for(const phase of [0,2,4]){
    f.position.set(point.x,0,point.z);f.rotation.y=angle;
    animateGhost(f,3,1,.7,false,phase,1,undefined,w.solids);
    assert.equal(penetration(f,w.solids),undefined,JSON.stringify({area,point,angle,phase}));
   }
  }finally{disposeWorld(root);}
 }
});
