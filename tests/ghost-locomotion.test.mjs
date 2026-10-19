import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGhost,animateGhost,ghostStrideLength} from '../lib/ghost.ts';

const tip=(figure,name)=>figure.getObjectByName(name).getWorldPosition(new T.Vector3());
const flatDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

test('V89 a slow walking stance holds its sole on the floor instead of skating with the root',()=>{
 const figure=createGhost(new T.Group());let planted;
 for(let frame=0;frame<=60;frame++){
  const distance=frame*.01;figure.position.z=distance;
  animateGhost(figure,3+distance/.6,.24,.5,false,Math.PI*1.15+distance*Math.PI*2/1.56,0);figure.updateMatrixWorld(true);
  const foot=tip(figure,'ghost-foot--1');planted??=foot.clone();
  assert.ok(flatDistance(foot,planted)<.008,`planted walking foot skates ${flatDistance(foot,planted)}m`);
  const mesh=figure.getObjectByName('ghost-foot--1'),a=mesh.geometry.getAttribute('position'),p=new T.Vector3();let low=Infinity;
  for(let i=0;i<a.count;i++)low=Math.min(low,p.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld).y);
  assert.ok(low>=-.003&&low<.018,`supporting sole floats or penetrates: ${low}m`);
 }
});

test('V89 a crawling support hand stays planted while the actual body follows a curve',()=>{
 const figure=createGhost(new T.Group());let planted;
 for(let frame=0;frame<=55;frame++){
  const distance=frame*.006,angle=distance/2;figure.position.set(2*(1-Math.cos(angle)),0,2*Math.sin(angle));figure.rotation.y=angle;
  animateGhost(figure,3+distance/1.1,.44,.5,false,Math.PI+distance*Math.PI*2/.82,1);figure.updateMatrixWorld(true);
  const hand=tip(figure,'ghost-hand--1');planted??=hand.clone();
  assert.ok(flatDistance(hand,planted)<.008,`supporting hand slides ${flatDistance(hand,planted)}m during a turn`);
 }
});

test('V89 stopping a walking body cannot teleport its planted foot back under the hip',()=>{
 const figure=createGhost(new T.Group());let phase=Math.PI*1.12;
 animateGhost(figure,3,.24,.5,false,phase,0);figure.position.z=.01;phase+=.01*Math.PI*2/1.56;
 animateGhost(figure,3+.01/.6,.24,.5,false,phase,0);figure.updateMatrixWorld(true);
 const before=tip(figure,'ghost-foot--1');
 animateGhost(figure,3+.01/.6+1/60,0,.5,false,phase,0);figure.updateMatrixWorld(true);
 assert.ok(tip(figure,'ghost-foot--1').distanceTo(before)<.01,'a stop retains the supporting foot contact');
});
test('V89 a lifted foot settles over frames when walking stops',()=>{
 const figure=createGhost(new T.Group());let phase=.7;
 animateGhost(figure,3,.3,.5,false,phase,0);figure.position.z=.01;phase+=.01*Math.PI*2/1.56;animateGhost(figure,3+1/60,.3,.5,false,phase,0);figure.updateMatrixWorld(true);
 const before=tip(figure,'ghost-foot--1');animateGhost(figure,3+2/60,0,.5,false,phase,0);figure.updateMatrixWorld(true);const after=tip(figure,'ghost-foot--1');
 assert.ok(after.distanceTo(before)<.012,'an airborne foot must settle instead of snapping to the floor');
});
test('V89 stand-to-crawl blending cannot carry a foot contact into a hand support',()=>{
 const figure=createGhost(new T.Group());
 for(let frame=0;frame<=10;frame++){figure.position.z=frame*.006;animateGhost(figure,3+frame/60,.4,.5,false,2.5,frame/10);}
 figure.updateMatrixWorld(true);
 for(const side of [-1,1])assert.ok(tip(figure,`ghost-hand-${side}`).z-figure.position.z>.25,'both hands must reach in front of the crawling body');
});
test('V89 a supporting hand counter-rotates against a turn in place',()=>{
 const figure=createGhost(new T.Group());let planted;
 for(let frame=0;frame<=12;frame++){
  const angle=frame*.012;figure.rotation.y=angle;animateGhost(figure,3+frame/60,.24,.5,false,Math.PI+angle*.25*Math.PI*2/.82,1);figure.updateMatrixWorld(true);
  const hand=tip(figure,'ghost-hand--1');planted??=hand.clone();assert.ok(flatDistance(hand,planted)<.008,'rotation must not sweep a planted palm across the floor');
 }
});

test('V89 moving contacts keep visible body triangles outside adjacent walls and floor',()=>{
 const floor=(x,z)=>z>=0?0:(x<0?1:-1)*Math.min(2.8,-z*.7),cases=[
  {name:'walking beside wall',solids:[{x:.55,z:0,w:.2,d:6}],at:i=>[0,0,i*.008,0,0],phase:i=>3.6+i*.008*Math.PI*2/1.56},
  {name:'crawl turn at front wall',solids:[{x:0,z:.56,w:3,d:.2}],at:i=>[0,0,0,i*.025,1],phase:i=>2.5+i*.15},
  {name:'doorway crawl transition',solids:[{x:-.55,z:0,w:.2,d:.25},{x:.55,z:0,w:.2,d:.25}],at:i=>[0,0,-.3+i*.02,0,i/30],phase:i=>1+i*.1},
  {name:'moving stair contact',solids:[{x:0,z:-3,w:.12,d:6,y:1.4,h:9}],at:i=>[.55,floor(.55,-.3-i*.012),-.3-i*.012,Math.PI,1],phase:i=>2+i*.13,floor},
 ];
 for(const c of cases){
  const figure=createGhost(new T.Group());
  for(let frame=0;frame<=30;frame++){
   const [x,y,z,yaw,crawl]=c.at(frame);figure.position.set(x,y,z);figure.rotation.y=yaw;animateGhost(figure,3+frame/60,.4,.6,false,c.phase(frame),crawl,c.floor,c.solids);if(frame%3)continue;figure.updateMatrixWorld(true);
   const p=new T.Vector3();let hit;
   figure.traverse(mesh=>{
    if(hit||!mesh.isMesh||mesh.isInstancedMesh)return;for(let o=mesh;o!==figure;o=o.parent)if(!o.visible)return;
    const vertices=mesh.geometry.getAttribute('position');for(let i=0;i<vertices.count&&!hit;i++){
     p.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
     for(const s of c.solids){const a=Math.cos(s.yaw??0),b=Math.sin(s.yaw??0),dx=p.x-s.x,dz=p.z-s.z;if(Math.abs(a*dx-b*dz)<s.w/2-.002&&Math.abs(b*dx+a*dz)<s.d/2-.002&&Math.abs(p.y-(s.y??1.5))<(s.h??3)/2-.002)hit=`${mesh.name} enters wall at ${p.toArray()}`;}
     if(!c.floor&&p.y<-.01)hit=`${mesh.name} enters floor at ${p.y}`;
    }
   });
   assert.equal(hit,undefined,`${c.name}, frame ${frame}: ${hit}`);
  }
 }
});
test('V89 live stair supports do not drive visible skin below a tread',()=>{
 const figure=createGhost(new T.Group()),floor=(x,z)=>z>=0?0:(x<0?1:-1)*Math.min(2.8,-z*.7),solids=[{x:0,z:-3,w:.12,d:6,y:1.4,h:9}];
 for(let frame=0;frame<=30;frame++){
  const z=-.3-frame*.012;figure.position.set(.55,floor(.55,z),z);figure.rotation.y=Math.PI;animateGhost(figure,3+frame/60,.4,.6,false,2+frame*.13,1,floor,solids);if(frame%3)continue;figure.updateMatrixWorld(true);
  const p=new T.Vector3();let low=Infinity,part='';figure.traverse(mesh=>{if(!mesh.isMesh||mesh.isInstancedMesh)return;for(let o=mesh;o!==figure;o=o.parent)if(!o.visible)return;const a=mesh.geometry.getAttribute('position');for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);const tread=p.z>=0||p.z<=-4?floor(p.x,p.z):(p.x<0?1:-1)*(Math.floor(-p.z*17/4)+.5)*2.8/17;if(p.y-tread<low){low=p.y-tread;part=mesh.name;}}});
  assert.ok(low>-.01,`${part} cuts into the tread by ${-low}m at frame ${frame}`);
 }
});
test('V89 turning and translation share one clearance-limited stroke budget',async()=>{
 const {ghostStep}=await import('../lib/ghost.ts');assert.equal(typeof ghostStep,'function');
 for(const [stride,crawl,cycles] of [[.1148,true,5.2],[.82,true,5.2],[.546,false,1.3],[1.56,false,1.3]])for(const angle of [0,.08,1,Math.PI,-Math.PI])for(const dt of [1/60,.05]){
  const step=ghostStep(angle,3.8,dt,stride,crawl);
  assert.ok(step.distance+Math.abs(step.turn)*.25<=stride*cycles*dt+1e-9,'turning cannot be added on top of the complete translation budget');
  assert.ok(Math.abs(step.turn)<=2.4*dt+1e-9);assert.ok(step.distance>=0);
  if(Math.abs(angle)>Math.PI/2)assert.equal(step.distance,0,'reversing still turns before translating');
 }
});
test('V89 a planted hand withdraws continuously before a closing lift leaf reaches it',()=>{
 const f=createGhost(new T.Group()),solids=[{x:-.955,z:0,w:.62,d:.06,y:1.14,h:2.28},{x:.955,z:0,w:.62,d:.06,y:1.14,h:2.28}];let phase=2.5,previous;
 for(let i=0;i<4;i++){f.position.set(0,0,.82-i*.06);f.rotation.y=Math.PI;if(i)phase+=.06*Math.PI*2/ghostStrideLength(f,solids,true);animateGhost(f,3+i/60,.4,.5,false,phase,1,undefined,solids);}
 for(let frame=0;frame<=40;frame++){
  const open=1-frame/40;solids[0].x=-.315-open*.64;solids[1].x=.315+open*.64;animateGhost(f,3.1+frame/60,0,.5,false,phase,1,undefined,solids);f.updateMatrixWorld(true);
  const hands=[-1,1].map(side=>tip(f,`ghost-hand-${side}`));if(previous)for(let i=0;i<2;i++)assert.ok(hands[i].distanceTo(previous[i])<.035,`withdrawing support jumps ${hands[i].distanceTo(previous[i])}m at frame ${frame}`);previous=hands;
  const p=new T.Vector3();let hit;f.traverse(mesh=>{if(hit||!mesh.isMesh||mesh.isInstancedMesh)return;for(let o=mesh;o!==f;o=o.parent)if(!o.visible)return;const a=mesh.geometry.getAttribute('position');for(let i=0;i<a.count&&!hit;i++){p.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);for(const s of solids)if(Math.abs(p.x-s.x)<s.w/2-.002&&Math.abs(p.z)<s.d/2-.002&&Math.abs(p.y-s.y)<s.h/2-.002){hit=mesh.name;break;}}});
  assert.equal(hit,undefined,`${hit} enters a moving lift panel at frame ${frame}`);
 }
});

test('V106 a crawling hand replants beside a wall at the new surge speed',()=>{
 const f=createGhost(new T.Group()),solids=[{x:.95,z:5,w:.2,d:30}],dt=1/60;let phase=2.5,previous,checked=0;
 for(let frame=0;frame<=100;frame++){
  const x=Math.min(frame,20)*.02,z=frame*4.1*dt;
  if(frame){const distance=Math.hypot(x-f.position.x,z-f.position.z);phase+=distance*Math.PI*2/ghostStrideLength(f,solids,true);}
  f.position.set(x,0,z);animateGhost(f,3+frame*dt,1,.5,false,phase,1,undefined,solids);f.updateMatrixWorld(true);
  const hands=[-1,1].map(side=>tip(f,`ghost-hand-${side}`)),stance=[0,1].map(i=>T.MathUtils.euclideanModulo(phase+i*Math.PI,Math.PI*2)/(Math.PI*2)>=.36);
  if(frame>40&&previous)for(let i=0;i<2;i++)if(stance[i]&&previous.stance[i]){
   assert.ok(flatDistance(hands[i],previous.hands[i])<.008,`after clearance stops changing, supporting hand still skates ${flatDistance(hands[i],previous.hands[i])}m at frame ${frame}`);checked++;
  }
  if(frame>=20&&frame%5===0){
   const p=new T.Vector3();let hit;
   f.traverse(mesh=>{if(hit||!mesh.isMesh||mesh.isInstancedMesh)return;for(let o=mesh;o!==f;o=o.parent)if(!o.visible)return;const a=mesh.geometry.getAttribute('position');for(let i=0;i<a.count&&!hit;i++){
    p.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);if(p.y<-.01||p.x>.852&&p.x<1.048&&Math.abs(p.z-5)<14.998&&p.y>.002&&p.y<2.998)hit=mesh.name;
   }});
   assert.equal(hit,undefined,`replanting drives ${hit} into the side wall or floor at frame ${frame}`);
  }
  previous={hands,stance};
 }
 assert.ok(checked>40,'observe multiple complete support intervals after the clearance transition');
});
