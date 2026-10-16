import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGhost,animateGhost,animateGhostAttack,animateGhostPassenger} from '../lib/ghost.ts';
import armAsset from '../lib/assets/ghost-arms.json' with {type:'json'};

// A long arm must still surround its articulated forearm. The old full-arm
// spline could drift off the bone near the wrist, leaving an empty section.
test('exposed forearm skin surrounds the bone instead of curving away before the wrist',()=>{
 const f=createGhost(new T.Group()),arms=[];
 f.traverse(m=>{if(m.name==='ghost-continuous-arm')arms.push(m);});
 const poses=[()=>animateGhost(f,3,0,.7,false,0,1),()=>animateGhost(f,3,1,.7,false,2,0),()=>animateGhostAttack(f,.4,false),()=>animateGhostPassenger(f,3,1,false,true)];
 for(const [pose,apply] of poses.entries()){
  apply();f.updateMatrixWorld(true);
  for(let side=0;side<2;side++){
   const lower=f.getObjectByName(`ghost-hand-${side===0?-1:1}`).parent.parent;
   for(const along of [.12,.25,.35])for(const axis of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]){
    const center=lower.localToWorld(new T.Vector3(0,-along,0)),out=new T.Vector3(...axis).transformDirection(lower.matrixWorld);
    const ray=new T.Raycaster(center.clone().addScaledVector(out,.12),out.negate(),0,.12),hit=ray.intersectObject(arms[side],false)[0];
    assert.ok(hit,`pose ${pose}, side ${side}, forearm ${along}, axis ${axis}: bone has no surrounding skin`);
    const radius=.12-hit.distance;
    assert.ok(radius>.008&&radius<.07,`pose ${pose}, side ${side}, forearm ${along}: skin drifts ${radius}m from bone`);
   }
  }
 }
});

test('the replaced arm triangles clear close oblique walls through walk, crawl and capture',()=>{
 const f=createGhost(new T.Group()),meshes=[];f.rotation.y=.717;
 f.traverse(m=>{if(['ghost-continuous-arm','ghost-wrist-skin'].includes(m.name))meshes.push(m);});
 const triangle=new T.Triangle(),box=new T.Box3(new T.Vector3(-.098,.002,-1.998),new T.Vector3(.098,2.998,1.998));
 for(let angle=0;angle<Math.PI*2;angle+=Math.PI/8){
  const wall={x:Math.cos(angle)*.531,z:Math.sin(angle)*.531,w:.2,d:4,yaw:-angle,y:1.5,h:3};
  const wallInverse=new T.Matrix4().makeRotationY(wall.yaw).setPosition(wall.x,0,wall.z).invert();
  for(const pose of ['walk','blend','crawl','attack-low','attack'])for(const phase of [0,.4,1.6,2.8]){
   if(pose.startsWith('attack'))animateGhostAttack(f,phase,false,pose==='attack-low'?1:1.65,[wall]);else animateGhost(f,3,1,.7,false,phase,pose==='walk'?0:pose==='blend'?.5:1,undefined,[wall]);
   f.updateMatrixWorld(true);
   for(const m of meshes){const p=m.geometry.attributes.position,ix=m.geometry.index,transform=wallInverse.clone().multiply(m.matrixWorld);
    for(let i=0;i<ix.count;i+=3){triangle.a.fromBufferAttribute(p,ix.getX(i)).applyMatrix4(transform);triangle.b.fromBufferAttribute(p,ix.getX(i+1)).applyMatrix4(transform);triangle.c.fromBufferAttribute(p,ix.getX(i+2)).applyMatrix4(transform);
     assert.ok(!box.intersectsTriangle(triangle),`${m.name}: ${pose}, phase ${phase}, wall ${angle}: skin enters wall`);
    }
   }
  }
 }
});

test('the open upper-arm skin boundary stays hidden inside the opaque sleeve',()=>{
 const f=createGhost(new T.Group()),arms=[];f.traverse(m=>{if(m.name==='ghost-continuous-arm')arms.push(m);});
 const gown=f.getObjectByName('ghost-wet-dress');
 for(const pose of ['walk','crawl','attack','passenger']){
  if(pose==='attack')animateGhostAttack(f,.4,false);else if(pose==='passenger')animateGhostPassenger(f,3,1,false,true);else animateGhost(f,3,1,.7,false,1.6,pose==='crawl'?1:0);
  f.updateMatrixWorld(true);
  for(let side=0;side<2;side++){
   const mesh=arms[side],p=mesh.geometry.attributes.position,ix=mesh.geometry.index,edges=new Map(),upper=f.getObjectByName(`ghost-hand-${side===0?-1:1}`).parent.parent.parent;
   for(let i=0;i<ix.count;i+=3)for(let j=0;j<3;j++){const a=ix.getX(i+j),b=ix.getX(i+(j+1)%3),key=a<b?`${a}/${b}`:`${b}/${a}`;const e=edges.get(key);edges.set(key,{a,b,n:(e?.n??0)+1});}
   const rest=armAsset[side===0?'r':'l'].position;
   for(const {a,b,n} of edges.values())if(n===1&&rest[a*3+1]>-.45&&rest[b*3+1]>-.45){
    const point=new T.Vector3().fromBufferAttribute(p,a).lerp(new T.Vector3().fromBufferAttribute(p,b),.5).applyMatrix4(mesh.matrixWorld),local=upper.worldToLocal(point.clone());
    const out=new T.Vector3(local.x,0,local.z).normalize().transformDirection(upper.matrixWorld),ray=new T.Raycaster(point.clone().addScaledVector(out,.16),out.negate(),0,.1599);
    assert.ok(ray.intersectObject(gown,false).length,`${pose}, side ${side}: exposed cut edge at ${local.toArray()}`);
   }
  }
 }
});

test('the new forearm surface stays above the rendered stair treads during turns',()=>{
 const f=createGhost(new T.Group()),meshes=[];f.traverse(m=>{if(['ghost-continuous-arm','ghost-wrist-skin'].includes(m.name))meshes.push(m);});
 const floor=(x,z)=>z>=0?0:(x<0?1:-1)*Math.min(2.8,-z*.7),point=new T.Vector3();
 for(const side of [-1,1])for(const z of [-3.9,-1.5,-.1])for(const yaw of [0,.6,Math.PI,Math.PI+.6])for(const phase of [0,2,4]){
  f.position.set(side*.75,floor(side,z),z);f.rotation.y=yaw;animateGhost(f,3,1,.7,false,phase,1,floor,[{x:0,z:-3,w:.12,d:6,y:1.4,h:9}]);f.updateMatrixWorld(true);
  for(const m of meshes){const p=m.geometry.attributes.position;
   for(let i=0;i<p.count;i++){
    point.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);
    const tread=point.z>=0||point.z<=-4?floor(point.x,point.z):(point.x<0?1:-1)*(Math.floor(-point.z*17/4)+.5)*2.8/17;
    assert.ok(point.y-tread>-.01,`${m.name}, flight ${side}, z ${z}, yaw ${yaw}, phase ${phase}: skin enters tread by ${tread-point.y}m`);
   }
  }
 }
});
