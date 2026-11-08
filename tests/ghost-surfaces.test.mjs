import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGhost,animateGhost,animateGhostAttack,animateGhostPassenger} from '../lib/ghost.ts';
import {createFace,poseFace} from '../lib/ghost-face.ts';
import {extremity} from '../lib/ghost-anatomy.ts';

test('capture arms leave the eyes and nose visible from the actual falling-player viewpoint',()=>{
 const figure=createGhost(new T.Group()),ray=new T.Raycaster(),limbs=[];
 figure.traverse(mesh=>{if(mesh.isMesh&&(mesh.name==='ghost-continuous-arm'||mesh.name==='ghost-fitted-sleeve'||mesh.name.startsWith('ghost-hand-')||mesh.name==='ghost-long-nail'))limbs.push(mesh);});
 const cases=[{name:'open',solids:[]},...[-1,1].map(side=>({name:`side wall ${side}`,solids:[{x:side*.531,z:0,w:.2,d:4,y:1.5,h:3}]})),
  {name:'resident door behind player',solids:[{x:0,z:1.1335,w:1.2,d:.1,y:1.15,h:2.3}]}];
 for(const eye of [1,1.65])for(const reduced of [false,true])for(const {name,solids} of cases)for(const time of [.35,.55,.75,1,1.4,1.8,2.6]){
  animateGhostAttack(figure,time,reduced,eye,solids);figure.updateMatrixWorld(true);
  const fall=T.MathUtils.smoothstep(time,1.05,2.55),camera=new T.Vector3(0,T.MathUtils.lerp(eye,.27,fall),name==='resident door behind player'?Math.min(.8535,.85+fall*.2):.85+fall*.2);
  const face=figure.getObjectByName('ghost-continuous-face'),positions=face.geometry.getAttribute('position');
  for(const [x,y] of [[-.075,.245],[.075,.245],[0,.13],[0,.30]]){
   let closest=Infinity,index=0;for(let i=0;i<positions.count;i++){const distance=(positions.getX(i)-x)**2+(positions.getY(i)-y)**2;if(distance<closest){closest=distance;index=i;}}
   const point=new T.Vector3().fromBufferAttribute(positions,index).applyMatrix4(face.matrixWorld);
   ray.set(camera,point.clone().sub(camera).normalize());ray.far=camera.distanceTo(point)-.005;
   assert.equal(ray.intersectObjects(limbs,false).length,0,`limb obscures face (${x}, ${y}) at ${time}s, eye ${eye}, reduced ${reduced}, ${name}`);
  }
 }
});

test('visible leg skin connects each hip to its knee in standing, crawling and folded poses',()=>{
 const f=createGhost(new T.Group()),ray=new T.Raycaster(),center=new T.Vector3(),out=new T.Vector3();
 for(const pose of ['walk','crawl','fold','passenger','attack'])for(const time of [0,.4,1.5]){
  f.position.set(3,0,-4);f.rotation.y=.8;
  if(pose==='attack')animateGhostAttack(f,time,false);else if(pose==='passenger')animateGhostPassenger(f,time,1,false);else animateGhost(f,time,1,.8,false,time*3,pose==='walk'?0:1,undefined,pose==='fold'?[{x:3,z:-3.4,w:4,d:.2},{x:3,z:-4.6,w:4,d:.2}]:[]);
  f.updateMatrixWorld(true);
  for(const side of [-1,1])for(const along of [.1,.2,.3,.405])for(const direction of [-1,1]){
   const hip=f.getObjectByName(`ghost-hip-${side}`);center.set(0,-along,0).applyMatrix4(hip.matrixWorld);out.set(direction,0,0).transformDirection(hip.matrixWorld);
   ray.set(center.clone().addScaledVector(out,.16),out.clone().negate());ray.far=.16;
   const hit=ray.intersectObject(hip,true)[0];
   assert.ok(hit&&hit.distance<.145,`${pose}, side ${side}, ${along} m below hip: missing exterior thigh skin`);
  }
 }
});

test('the skirt covers the upper legs while walking, crawling, folding and sitting',()=>{
 const f=createGhost(new T.Group()),ray=new T.Raycaster(),center=new T.Vector3();
 for(const pose of ['walk','crawl','fold','passenger'])for(const phase of [0,1.6,3.2,4.8]){
  if(pose==='passenger')animateGhostPassenger(f,phase,1,false);else animateGhost(f,3,1,.7,false,phase,pose==='walk'?0:1,undefined,pose==='fold'?[{x:0,z:-.56,w:4,d:.2},{x:0,z:.56,w:4,d:.2}]:[]);f.updateMatrixWorld(true);
  const gown=f.getObjectByName('ghost-wet-dress');
  for(const side of [-1,1])for(const along of [.05,.15,.25,.35])for(const direction of [[side,0,0],[0,.5,1],[side,.5,-1]]){
   const hip=f.getObjectByName(`ghost-hip-${side}`);center.set(0,-along,0).applyMatrix4(hip.matrixWorld);
   const out=new T.Vector3(...direction).normalize();ray.set(center.clone().addScaledVector(out,.8),out.negate());ray.far=1.2;
   const hit=ray.intersectObjects([gown,hip],true)[0];
   assert.ok(hit?.object===gown,`upper leg emerges through unbroken cloth: pose ${pose}, phase ${phase}, side ${side}, ${along} m`);
  }
 }
});

test('gathering the skirt beside a wall never intersects the thigh skin',()=>{
 const f=createGhost(new T.Group()),ray=new T.Raycaster(),a=new T.Vector3(),b=new T.Vector3();f.rotation.y=.717;
 const angle=7*Math.PI/4,wall={x:Math.cos(angle)*.531,z:Math.sin(angle)*.531,w:.2,d:4,yaw:-angle,y:1.5,h:3};
 for(const phase of [0,1.5,3,4.5]){
  animateGhost(f,3,1,.8,false,phase,1,undefined,[wall]);f.updateMatrixWorld(true);
  const gown=f.getObjectByName('ghost-wet-dress');
  for(const side of [-1,1]){
   const thigh=f.getObjectByName(`ghost-hip-${side}`).getObjectByName('ghost-thigh'),p=thigh.geometry.getAttribute('position'),idx=thigh.geometry.index,edges=new Set();
   for(let i=0;i<idx.count;i+=3)for(const [j,k] of [[i,i+1],[i+1,i+2],[i+2,i]]){
    const n=idx.getX(j),m=idx.getX(k),key=[Math.min(n,m),Math.max(n,m)].join(',');if(edges.has(key))continue;edges.add(key);
    a.fromBufferAttribute(p,n).applyMatrix4(thigh.matrixWorld);b.fromBufferAttribute(p,m).applyMatrix4(thigh.matrixWorld);
    ray.set(a,b.clone().sub(a).normalize());ray.near=.00001;ray.far=a.distanceTo(b)-.00001;
    assert.equal(ray.intersectObject(gown,false).length,0,`skin cuts through intact cloth: phase ${phase}, side ${side}`);
   }
  }
 }
});

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
test('the recessed oral surface closes without collapsed center triangles',()=>{
 const r=createFace(new T.Group(),new T.MeshStandardMaterial()),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(const open of [.021,.1,.3,.6,1]){
  poseFace(r,open);const geometry=r.throat.geometry,positions=geometry.getAttribute('position'),indices=geometry.index;
  for(let i=0;i<indices.count;i+=3){
   a.fromBufferAttribute(positions,indices.getX(i));b.fromBufferAttribute(positions,indices.getX(i+1));c.fromBufferAttribute(positions,indices.getX(i+2));
   assert.ok(b.sub(a).cross(c.sub(a)).length()>1e-10,`collapsed oral triangle ${i/3} at openness ${open}`);
  }
 }
});

test('the oral floor follows the dropped jaw and is occluded outside the lip',()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial());poseFace(r,.3);head.updateMatrixWorld(true);
 const floor=head.getObjectByName('ghost-tongue');assert.ok(floor,'the lower mouth needs a sculpted oral floor');
 const start=floor.getWorldPosition(new T.Vector3()),jaw=r.jaw.getWorldPosition(new T.Vector3());
 for(const open of [.3,.6,1]){
  poseFace(r,open);head.updateMatrixWorld(true);
  const offset=floor.getWorldPosition(new T.Vector3()).sub(start),dropped=r.jaw.getWorldPosition(new T.Vector3()).sub(jaw);
  assert.ok(offset.distanceTo(dropped)<.00001,'the oral floor cannot float independently from the lower jaw');
  const border=r.face.userData.mouthBorder.map(i=>new T.Vector3().fromBufferAttribute(r.face.geometry.getAttribute('position'),i));
  const vertices=floor.geometry.getAttribute('position');
  for(let i=0;i<vertices.count;i++){
   const p=new T.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(floor.matrixWorld);if(inside(p,border))continue;
   const hit=new T.Raycaster(new T.Vector3(p.x,p.y,1),new T.Vector3(0,0,-1)).intersectObjects([r.face,floor],false)[0];
   assert.equal(hit?.object,r.face,`oral floor protrudes past the skin at openness ${open}`);
  }
 }
 poseFace(r,0);assert.equal(floor.visible,false,'no oral prop should appear through the closed resting lips');
});

function oralCrossings(source,target){
 const p=source.geometry.getAttribute('position'),indices=source.geometry.index,edges=new Set(),a=new T.Vector3(),b=new T.Vector3(),ray=new T.Raycaster();
 for(let i=0;i<indices.count;i+=3)for(let j=0;j<3;j++){
  const u=indices.getX(i+j),v=indices.getX(i+(j+1)%3),key=[Math.min(u,v),Math.max(u,v)].join('/');if(edges.has(key))continue;edges.add(key);
  a.fromBufferAttribute(p,u).applyMatrix4(source.matrixWorld);b.fromBufferAttribute(p,v).applyMatrix4(source.matrixWorld);const length=a.distanceTo(b);if(length<1e-8)continue;
  ray.set(a,b.clone().sub(a).normalize());ray.near=1e-7;ray.far=length-1e-7;
  if(ray.intersectObject(target,false).length)return true;
 }
 return false;
}

test('the deformed tongue preserves outward triangle winding throughout visible opening',()=>{
 const r=createFace(new T.Group(),new T.MeshStandardMaterial()),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 assert.equal(r.tongue.material.side,T.FrontSide,'the oral surface must render its outward face with the runtime material');
 for(const open of [.220001,.225,.3,.6,1,1.025]){
  poseFace(r,open);const p=r.tongue.geometry.getAttribute('position'),indices=r.tongue.geometry.index;let volume=0;
  for(let i=0;i<indices.count;i+=3){a.fromBufferAttribute(p,indices.getX(i));b.fromBufferAttribute(p,indices.getX(i+1));c.fromBufferAttribute(p,indices.getX(i+2));volume+=a.dot(b.cross(c))/6;}
  assert.ok(volume>1e-8,`tongue triangles must face outwards at ${open}: signed volume ${volume}`);
 }
});

test('the runtime tongue exterior is visible above the floor with upward outward normals',()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial()),ray=new T.Raycaster();
 assert.equal(r.tongue.material.side,T.FrontSide);
 for(const open of [.220001,.225,.3,.6,1,1.025]){
  poseFace(r,open);head.updateMatrixWorld(true);
  for(const dz of [-.02,-.01,0]){
   ray.set(new T.Vector3(r.jaw.position.x+.0073,r.jaw.position.y+.1,r.jaw.position.z+.128+dz+.00031),new T.Vector3(0,-1,0));ray.far=.5;
   const floor=ray.intersectObject(r.throat,false).at(-1);assert.ok(floor);
   // Start inside the mouth, above the tongue but below the cavity roof.
   ray.set(floor.point.clone().add(new T.Vector3(0,.02,0)),new T.Vector3(0,-1,0));
   const hit=ray.intersectObjects([r.throat,r.tongue],false)[0];
   assert.ok(hit?.object===r.tongue&&hit.point.y>floor.point.y+.001,`the runtime tongue exterior must be raised above the floor at ${open}, dz ${dz}`);
   assert.ok(hit.face.normal.y>.2,`tongue exterior must have an upward outward normal at ${open}, dz ${dz}`);
  }
 }
});

test('the exposed tongue never cuts through either dental crown arch during continuous opening',()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial());r.tongue.material.side=T.DoubleSide;
 for(const open of [.220001,.225,.3,.6,1,1.025,...Array.from({length:33},(_,i)=>(i+9)/40)]){
  poseFace(r,open);head.updateMatrixWorld(true);assert.ok(r.tongue.visible,`tongue must remain visible at ${open}`);
  for(const tooth of [...r.teeth.children,...r.lower.children]){
   const side=tooth.material.side;tooth.material.side=T.DoubleSide;
   assert.ok(!oralCrossings(tooth,r.tongue)&&!oralCrossings(r.tongue,tooth),`${tooth.name} pierces the tongue at ${open}`);tooth.material.side=side;
  }
 }
});

for(const open of [.220001,.225,.3,.6,1,1.025])test(`the tongue underside is planted on the oral floor at openness ${open}`,()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial()),ray=new T.Raycaster();r.tongue.material.side=T.DoubleSide;
 {
  poseFace(r,open);head.updateMatrixWorld(true);
  for(const dz of [-.025,-.02,-.01,0,.01,.02,.025]){
   ray.set(new T.Vector3(r.jaw.position.x+.0073,r.jaw.position.y+.1,r.jaw.position.z+.128+dz+.00031),new T.Vector3(0,-1,0));ray.far=.5;
   const tongue=ray.intersectObject(r.tongue,false),floor=ray.intersectObject(r.throat,false);
   assert.ok(tongue.length>=2&&floor.length,`missing supported tongue section at ${open}, dz ${dz}`);
   const gap=tongue.at(-1).point.y-floor.at(-1).point.y;
   assert.ok(gap<=.001&&gap>=-.002,`tongue underside must meet floor at ${open}, dz ${dz}: gap ${gap}`);
  }
 }
});

test('tooth crowns are recessed and the cheeks occlude teeth outside the mouth opening',()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial());
 for(const open of [.3,.6,1]){
  poseFace(r,open);head.updateMatrixWorld(true);const positions=r.face.geometry.getAttribute('position'),border=r.face.userData.mouthBorder.map(i=>new T.Vector3().fromBufferAttribute(positions,i));
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

test('the scalp hairline has a continuous final band without triangular missing patches',async()=>{
  const {createHair}=await import('../lib/ghost-hair.ts'),{hair}=createHair(new T.Group()),cap=hair.children[0],p=cap.geometry.getAttribute('position');
  cap.updateMatrixWorld(true);
  // The open hairline is a ring, not a collapsed sphere pole. Each final
  // surface patch must be present when viewed from immediately outside it.
  const width=cap.geometry.parameters.widthSegments,rows=cap.geometry.parameters.heightSegments;
  for(let i=0;i<width;i++){
    const b=new T.Vector3().fromBufferAttribute(p,(rows-1)*(width+1)+i),c=new T.Vector3().fromBufferAttribute(p,rows*(width+1)+i),d=new T.Vector3().fromBufferAttribute(p,rows*(width+1)+i+1);
    const normal=new T.Vector3().subVectors(c,b).cross(new T.Vector3().subVectors(d,b)).normalize(),point=b.clone().add(c).add(d).multiplyScalar(1/3);
    const expected=[(rows-1)*(width+1)+i,rows*(width+1)+i,rows*(width+1)+i+1];
    // Temple folds can cover a boundary facet; test that very facet rather
    // than mistaking a nearer opaque fold for a missing perimeter patch.
    const hit=new T.Raycaster(point.clone().addScaledVector(normal,.01),normal.clone().negate(),0,.012).intersectObject(cap).find(h=>h.face&&[h.face.a,h.face.b,h.face.c].every(index=>expected.includes(index)));
    assert.ok(hit,`hairline patch ${i} cannot disappear as a triangular notch`);
    assert.ok(hit.point.distanceTo(point)<.0001,'the hairline surface meets its actual perimeter');
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
