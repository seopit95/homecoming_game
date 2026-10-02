import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGhost,animateGhost} from '../lib/ghost.ts';

function treadClearance(figure,floor){
 figure.updateMatrixWorld(true);const point=new T.Vector3();let lowest=Infinity;
 figure.traverse(mesh=>{if(!mesh.isMesh||mesh.isInstancedMesh)return;for(let o=mesh;o!==figure;o=o.parent)if(!o.visible)return;const vertices=mesh.geometry.getAttribute('position');
  for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);const tread=point.z>=0||point.z<=-4?floor(point.x,point.z):(point.x<0?1:-1)*(Math.floor(-point.z*17/4)+.5)*2.8/17;lowest=Math.min(lowest,point.y-tread);}
 });return lowest;
}

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

test('the posed crawling body clears narrow door frames, blind corners and a rotated door leaf',()=>{
 const figure=createGhost(new T.Group());
 const cases=[
  {name:'door frame',at:[0,0,0],solids:[{x:-1.1,z:0,w:1.2,d:.2},{x:1.1,z:0,w:1.2,d:.2}]},
  {name:'corridor core corner',at:[-2.5,0,14.5],solids:[{x:0,z:8,w:3.8,d:12}]},
  {name:'stair divider turn',at:[.5,0,.5],solids:[{x:0,z:-3,w:.12,d:6,y:1.4,h:9}]},
  {name:'rotated leaf',at:[0,0,0],solids:[{x:.73,z:.2,w:.08,d:1.8,y:1.15,h:2.3,yaw:.55}]}
 ];
 for(const c of cases)for(let yaw=0;yaw<Math.PI*2;yaw+=Math.PI/6)for(const phase of [0,1.6,3.2,4.8]){
  figure.position.set(...c.at);figure.rotation.set(0,yaw,0);animateGhost(figure,3,1,.7,false,phase,1,undefined,c.solids);
  assert.equal(penetration(figure,c.solids),undefined,`${c.name}, yaw ${yaw}, phase ${phase}`);
  for(const side of [-1,1]){const palm=figure.getObjectByName(`ghost-hand-${side}`).parent;assert.equal(palm.position.y,-.49,'forearm length stays anatomical');assert.equal(palm.parent.position.y,-.46,'upper arm length stays anatomical');}
  assert.deepEqual(figure.position.toArray(),c.at,'pose adaptation never moves navigation root');
 }
});

test('open space keeps the authored long crawl and restores it after squeezing through a doorway',()=>{
 const f=createGhost(new T.Group()),head=f.getObjectByName('ghost-head');
 animateGhost(f,3,1,.7,false,2,1);f.updateMatrixWorld(true);const original=new T.Box3().setFromObject(f,true),position=head.getWorldPosition(new T.Vector3());
 animateGhost(f,3,1,.7,false,2,1,undefined,[{x:.6,z:0,w:.2,d:3}]);
 animateGhost(f,3,1,.7,false,2,1,undefined,[]);f.updateMatrixWorld(true);
 assert.ok(head.getWorldPosition(new T.Vector3()).distanceTo(position)<1e-9);
 assert.ok(new T.Box3().setFromObject(f,true).equals(original));
 assert.ok(original.max.z-original.min.z>2,'full crawl keeps the long hands and trailing gown');
});

test('stair grounding preserves wall clearance through each crawl turn',()=>{
 const f=createGhost(new T.Group()),solids=[{x:0,z:-3,w:.12,d:6,y:1.4,h:9}],floor=(x,z)=>z>=0?0:(x<0?1:-1)*Math.min(2.8,-z*.7);
 for(const x of [-1,-.75,-.5,.5,.75,1])for(const z of [-3,-.1,.5])for(let yaw=0;yaw<Math.PI*2;yaw+=Math.PI/6)for(const phase of [0,2,4]){
  f.position.set(x,floor(x,z),z);f.rotation.set(0,yaw,0);animateGhost(f,3,1,.7,false,phase,1,floor,solids);
  assert.equal(penetration(f,solids),undefined,`flight ${x}, z ${z}, yaw ${yaw}, phase ${phase}`);
  assert.ok(treadClearance(f,floor)>-.01,`floor contact at flight ${x}, z ${z}, yaw ${yaw}, phase ${phase}`);
 }
});

test('the inward sleeve clears the stair divider while climbing back toward the landing',()=>{
 const f=createGhost(new T.Group()),solids=[{x:0,z:-3,w:.12,d:6,y:1.4,h:9}],floor=(x,z)=>z>=0?0:(x<0?1:-1)*Math.min(2.8,-z*.7);
 f.position.set(.7446534069791033,-1.5349466510251715,-2.1927809300359593);f.rotation.y=-.090606532428769;
 animateGhost(f,7.6,.68,.5,false,98.9984806936103,1,floor,solids);
 assert.equal(penetration(f,solids),undefined);
});

test('walking hands fold down beside the body when a wall blocks their normal reach',()=>{
 const f=createGhost(new T.Group()),solids=[{x:0,z:.59,w:3,d:.18}];
 for(const phase of [0,1.6,3.2,4.8]){animateGhost(f,3,1,.7,false,phase,0,undefined,solids);assert.equal(penetration(f,solids),undefined);}
});

test('the crawl dress follows a continuous back over the waist and hips',()=>{
 const f=createGhost(new T.Group());animateGhost(f,3,1,.7,false,2,1);f.updateMatrixWorld(true);
 const gown=f.getObjectByName('ghost-wet-dress'),a=gown.geometry.getAttribute('position'),p=new T.Vector3();let waist=-Infinity;
 for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(gown.matrixWorld);if(Math.abs(p.x)<.05&&Math.abs(p.z+.45)<.04)waist=Math.max(waist,p.y);}
 assert.ok(waist>.54,`the waist must not collapse below the shoulder and hip line: ${waist}`);
});

test('short crawl strokes keep a supporting wrist planted and parallel walls preserve full stride',async()=>{
 const {ghostStrideLength}=await import('../lib/ghost.ts');assert.equal(typeof ghostStrideLength,'function');
 const f=createGhost(new T.Group()),front=[{x:0,z:.56,w:3,d:.2}],sideWall=[{x:.55,z:0,w:.2,d:10}];
 assert.equal(ghostStrideLength(f,sideWall,true),.82,'a wall beside the body only folds elbows inward');
 for(const side of [-1,1]){let planted;
  for(let u=.37;u<.49;u+=.02){
   f.position.z=0;const stride=ghostStrideLength(f,front,true);assert.ok(stride<.2);
   f.position.z=stride*(u-.37);const phase=(u-(side===-1?0:.5))*Math.PI*2;
   animateGhost(f,3,1,.7,false,phase,1,undefined,front);f.updateMatrixWorld(true);
   const wrist=f.getObjectByName(`ghost-hand-${side}`).getWorldPosition(new T.Vector3());planted??=wrist.clone();
   assert.ok(wrist.distanceTo(planted)<.005,`supporting wrist cannot skate during a short stroke: ${wrist.distanceTo(planted)}`);
  }
 }
});
