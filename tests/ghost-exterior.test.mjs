import test from 'node:test';
import assert from 'node:assert/strict';
import {exteriorGhostScale,ExteriorCrawl} from '../lib/ghost-exterior.ts';
const wall={x:1.3,z:0,w:.18,d:40,y:1.4,h:2.8};
const input=(time,extra={})=>({time,position:{x:0,y:0,z:0},heading:0,moving:1,solids:[wall],enabled:true,...extra});
test('only the exterior pursuer grows, including legacy home exclusion',()=>{assert.equal(exteriorGhostScale('apartment'),1);assert.equal(exteriorGhostScale('resident'),1);assert.equal(exteriorGhostScale('landing'),1.15);});
test('floor and real wall alternate continuously and reset starts grounded',()=>{const crawl=new ExteriorCrawl();let previous=0,max=0,returned=false;for(let i=0;i<1000;i++){const f=crawl.step(input(i/60));assert.ok(Math.abs(f.blend-previous)<.035);max=Math.max(max,f.blend);if(max>.99&&f.blend<.01)returned=true;previous=f.blend;}assert.ok(max>.99&&returned);crawl.reset();assert.equal(crawl.step(input(20)).blend,0);});
test('no wall pose on stairs, short obstacles, glass, doorway ends or cross-heading',()=>{for(const extra of [{enabled:false},{solids:[{...wall,d:2}]},{solids:[{...wall,seeThrough:true}]},{position:{x:0,y:0,z:18}},{heading:Math.PI/2},{solids:[wall,{x:.6,z:.5,w:.1,d:1,y:1,h:2}]}]){const crawl=new ExteriorCrawl();for(let i=0;i<400;i++)assert.equal(crawl.step(input(i/60,extra)).blend,0);}});

import * as T from 'three';
import {createGhost,animateGhost} from '../lib/ghost.ts';
test('enlarged surface pose clears floor and masonry throughout the transition',()=>{
 const f=createGhost(new T.Group());f.scale.setScalar(1.15);
 for(const pursuit of [0,1]){for(let i=0;i<120;i++)animateGhost(f,i/60,1,.5,true,0,1,undefined,[wall],pursuit);
 for(const blend of [0,.1,.25,.5,.75,.9,1])for(const phase of [0,2,4]){
  animateGhost(f,3,1,.5,true,phase,1,undefined,[wall],pursuit,{wall,nx:-1,nz:0,distance:1.21,blend});f.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(f,true);
  assert.ok(box.min.y>-.015,`floor blend ${blend}: ${box.min.y}`);
  assert.ok(box.max.x<1.225,`wall blend ${blend}: ${box.max.x}`);
  assert.ok(box.max.y<2.78,`ceiling blend ${blend}: ${box.max.y}`);
  if(blend===1){const palms=[-1,1].map(side=>f.getObjectByName(`ghost-hand-${side}`).getWorldPosition(new T.Vector3()));assert.ok(palms.some(p=>Math.abs(p.x-1.21)<.13),'a supporting palm must meet real masonry');}
 }}
});

import {buildResidentialGallery} from '../lib/residential-gallery.ts';
import {movePursuer} from '../lib/navigation.ts';
test('actual gallery masonry supports a moving enlarged pursuer without crossing its rail, floor or ceiling',()=>{
 const ctx={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},arc(){},fill(){}};Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>ctx})}});
 const world=buildResidentialGallery(new T.Group(),'corridor'),f=world.figure??createGhost(new T.Group()),crawl=new ExteriorCrawl();f.scale.setScalar(1.15);f.position.set(0,0,12);f.rotation.y=Math.PI;let wallFrames=0,last;
 for(let i=0;i<600;i++){
  assert.ok(movePursuer(f.position,Math.PI,.025,world.solids,world.bounds));
  const support=crawl.step(input(i/60,{position:f.position,heading:Math.PI,solids:world.solids}));
  animateGhost(f,i/60,1,.5,true,i*.025/(.82*1.15)*Math.PI*2,1,undefined,world.solids,0,support);
  if(support.blend>.99)wallFrames++;
  if(i%6===0){const box=new T.Box3().setFromObject(f,true);assert.ok(box.min.y>-.015&&box.max.y<2.78);assert.ok(box.max.x<1.225&&box.min.x> -1.225);const head=f.getObjectByName('ghost-head').getWorldPosition(new T.Vector3());if(last)assert.ok(head.distanceTo(last)<.35,'continuous body travel');last=head;}
 }
 assert.ok(wallFrames>90,'actual route reaches a full wall-supported stroke');
});

test('losing the continuous wall stops root advance until the supported descent finishes',()=>{
 const crawl=new ExteriorCrawl();for(let i=0;i<240;i++)crawl.step(input(i/60));assert.ok(crawl.attached);
 crawl.step(input(4,{position:{x:0,y:0,z:16}}));assert.equal(crawl.canAdvance,false);
 for(let i=1;i<80;i++)crawl.step(input(4+i/60,{position:{x:0,y:0,z:16},moving:0}));assert.equal(crawl.attached,false);assert.equal(crawl.canAdvance,true);
});

import {findPursuitPath,clearPath,pursuerRadius} from '../lib/navigation.ts';
import {ghostStep,ghostStrideLength} from '../lib/ghost.ts';
test('the real 28F escape spawn and lift target enter wall pursuit with the game steering rules',(t)=>{
 const ctx={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},arc(){},fill(){}};Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>ctx})}});
 const world=buildResidentialGallery(new T.Group(),'landing'),f=world.figure,crawl=new ExteriorCrawl(),goal={x:0,z:-21};f.scale.setScalar(1.15);f.position.set(3.7,0,20.5);f.rotation.y=Math.atan2(goal.x-f.position.x,goal.z-f.position.z);
 const path=findPursuitPath(f.position,goal,world.solids,world.bounds);let wallFrames=0,reached=false,descents=0,wasWall=false;
 for(let i=0;i<3000;i++){
  const p=f.position;
  while(path.length&&Math.hypot(p.x-path[0].x,p.z-path[0].z)<.12&&(path.length===1||clearPath(p,path[1],world.solids,world.bounds,pursuerRadius)))path.shift();
  if(path.length>1&&clearPath(p,path[1],world.solids,world.bounds,pursuerRadius))path.shift();
  const next=path[0];if(!next){reached=true;break;}
  const dx=next.x-p.x,dz=next.z-p.z,distance=Math.hypot(dx,dz),turn=T.MathUtils.euclideanModulo(Math.atan2(dx,dz)-f.rotation.y+Math.PI,Math.PI*2)-Math.PI,allowed=Math.abs(turn)<.1&&distance>4;
  let moving=0;
  if(!((!allowed||!crawl.canAdvance)&&crawl.attached)){const step=ghostStep(turn,2.8,1/60,ghostStrideLength(f,world.solids,true),true);f.rotation.y+=step.turn;moving=movePursuer(p,f.rotation.y,Math.min(step.distance,distance),world.solids,world.bounds)?1:0;}
  const support=crawl.step(input(i/60,{position:p,heading:f.rotation.y,moving,solids:world.solids,enabled:allowed}));if(support.blend>.99){wallFrames++;wasWall=true;}if(wasWall&&!support.blend){descents++;wasWall=false;}
 }
 t.diagnostic(`Actual 28F route: ${wallFrames} full wall frames, ${descents} descents, reached lift=${reached}`);
 assert.ok(reached,'actual escape path reaches lift approach');assert.ok(wallFrames>30,`normal route wall frames ${wallFrames}`);assert.ok(descents>0,'returns from the wall before boarding');
});
