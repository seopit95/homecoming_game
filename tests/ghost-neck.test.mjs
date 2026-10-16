import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGhost,animateGhost,animateGhostAttack,animateGhostPassenger,animateGhostEmergence} from '../lib/ghost.ts';
import neckData from '../lib/assets/ghost-neck.json' with {type:'json'};

function neckBoundary(face){
 const p=face.geometry.attributes.position,ix=face.geometry.index,edges=new Map();
 for(let k=0;k<ix.count;k+=3)for(let j=0;j<3;j++){
  const a=ix.getX(k+j),b=ix.getX(k+(j+1)%3),key=[a,b].sort((x,y)=>x-y).join('/');const e=edges.get(key);edges.set(key,{a,b,n:(e?.n??0)+1});
 }
 const links=new Map();for(const {a,b,n} of edges.values())if(n===1){links.set(a,[...(links.get(a)??[]),b]);links.set(b,[...(links.get(b)??[]),a]);}
 const components=[];while(links.size){const todo=[links.keys().next().value],ids=[];while(todo.length){const id=todo.pop(),next=links.get(id);if(!next)continue;links.delete(id);ids.push(id);todo.push(...next);}components.push(ids);}
 const ring=components.find(ids=>ids.length===52);assert.ok(ring,'retain the original 52-edge anatomical cut, independent of its pose');return ring;
}

test('turning the head keeps the source skeletal cervical joint fixed in the torso',()=>{
 const f=createGhost(new T.Group()),head=f.getObjectByName('ghost-head'),torso=head.parent;let reference;
 for(const [time,crawl] of [[0,0],[3,0],[3,1],[7,.5],[12,1]]){
  animateGhost(f,time,1,.7,false,time*2,crawl);f.updateMatrixWorld(true);
  const joint=torso.worldToLocal(head.localToWorld(new T.Vector3().fromArray(neckData.headPivot)));
  if(!reference)reference=joint;else assert.ok(joint.distanceTo(reference)<.000002,`head rotation drags the source cervical joint ${joint.distanceTo(reference)}m through the torso`);
 }
});

test('the complete lower head joins the neck skin with continuous position and lighting through every pose branch',()=>{
 const f=createGhost(new T.Group()),face=f.getObjectByName('ghost-continuous-face'),ring=neckBoundary(face);assert.ok(ring.length>30);
 const skins=[];f.traverse(m=>{if(m.isMesh&&['ghost-neck','ghost-clavicle-skin','ghost-collar-skin'].includes(m.name))skins.push(m);});assert.ok(skins.length);
 const poses=[
  ()=>animateGhost(f,3,1,.7,false,1.6,0),
  ()=>animateGhost(f,3,1,.7,false,1.6,.5),
  ()=>animateGhost(f,3,1,.7,false,4.8,1),
  ()=>animateGhostAttack(f,.4,false),
  ()=>animateGhostAttack(f,1.8,true,1),
  ()=>animateGhostPassenger(f,3,0,false,true),
  ()=>animateGhostPassenger(f,3,1,false,true),
  ()=>animateGhostEmergence(f,.6,false),
 ];
 for(const [pose,apply] of poses.entries()){
  apply();f.updateMatrixWorld(true);const fp=face.geometry.attributes.position,fn=face.geometry.attributes.normal,faceNormal=new T.Matrix3().getNormalMatrix(face.matrixWorld);
  for(const id of ring){
   const point=new T.Vector3().fromBufferAttribute(fp,id).applyMatrix4(face.matrixWorld),normal=new T.Vector3().fromBufferAttribute(fn,id).applyMatrix3(faceNormal).normalize();let closest=Infinity,match;
   for(const skin of skins){const p=skin.geometry.attributes.position,n=skin.geometry.attributes.normal,toWorld=new T.Matrix3().getNormalMatrix(skin.matrixWorld);
    for(let i=0;i<p.count;i++){const d=point.distanceTo(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(skin.matrixWorld));if(d<closest){closest=d;match=new T.Vector3().fromBufferAttribute(n,i).applyMatrix3(toWorld).normalize();}}
   }
   assert.ok(closest<.000002,`pose ${pose}: lower-head cut ${id} is ${closest}m from connected neck skin`);
   assert.ok(normal.dot(match)>.999,`pose ${pose}: hard lighting seam at lower-head cut ${id}`);
  }
 }
});

test('all native body cuts have complete declared anatomical joins',()=>{
 const f=createGhost(new T.Group()),skin=f.getObjectByName('ghost-collar-skin'),ix=skin.geometry.index,edges=new Map();
 const rings=[neckData.neckRing,...['r','l'].flatMap(key=>[neckData.armRings[key].body,neckData.legRings[key].body])].map(ids=>new Set(ids));
 for(let k=0;k<ix.count;k+=3)for(let j=0;j<3;j++){const a=ix.getX(k+j),b=ix.getX(k+(j+1)%3),key=[a,b].sort((a,b)=>a-b).join('/');edges.set(key,(edges.get(key)??0)+1);}
 let checked=0;for(const [key,n] of edges)if(n===1){const [a,b]=key.split('/').map(Number);assert.ok(rings.some(ring=>ring.has(a)&&ring.has(b)),'unpaired source skin boundary '+key);checked++;}
 assert.equal(checked,rings.reduce((n,ring)=>n+ring.size,0),'each source boundary edge is paired, without relying on clothing to hide a cut');
});

test('the head retains adult cervical breadth rather than a pinched mannequin attachment',()=>{
 const f=createGhost(new T.Group()),face=f.getObjectByName('ghost-continuous-face'),ring=neckBoundary(face),p=face.geometry.attributes.position;
 const x=ring.map(i=>p.getX(i)*face.parent.scale.x),width=Math.max(...x)-Math.min(...x);
 assert.ok(width>.11&&width<.15,`adult source neck breadth collapsed to ${width}m`);
});

test('the upper thorax keeps its own rigid frame when the complete torso tilts',async()=>{
 const {createDress,poseDress}=await import('../lib/ghost-dress.ts'),{default:dress}=await import('../lib/assets/ghost-dress.json',{with:{type:'json'}});
 const torso=new T.Group();torso.position.set(.04,.6,.03);torso.rotation.set(1.2,.1,.3);
 const {gown,hem}=createDress(torso,new T.MeshBasicMaterial()),hips=[-1,1].map(side=>{const hip=new T.Group(),knee=new T.Group();hip.position.set(side*.1,.47,-.3);knee.position.set(0,-.42,0);hip.add(knee);return knee;});
 poseDress(gown,hem,torso,hips,1);const p=gown.geometry.attributes.position;let checked=0;
 for(let i=0;i<p.count;i++)if(dress.position[i*3+1]>.32){
  const delta=new T.Vector3().fromBufferAttribute(p,i).distanceTo(new T.Vector3().fromArray(dress.position,i*3));checked++;assert.ok(delta<.000001,`rigid thorax vertex ${i} drifts ${delta}m in its own frame`);
 }assert.ok(checked>20);
});

function skinContact(a,b){
 const eps=1e-6,shared=a.ids.filter(id=>b.ids.includes(id)).map(id=>a.points[a.ids.indexOf(id)]),na=a.triangle.getNormal(new T.Vector3()),nb=b.triangle.getNormal(new T.Vector3()),point=new T.Vector3(),ray=new T.Ray(),direction=new T.Vector3();
 const expected=p=>shared.some(v=>v.distanceToSquared(p)<eps*eps)||(shared.length===2&&new T.Line3(shared[0],shared[1]).closestPointToPoint(p,true,new T.Vector3()).distanceToSquared(p)<eps*eps);
 if(shared.length===3)return a.triangle.getMidpoint(point); // Duplicate rendered faces.
 for(const [x,y] of [[a,b],[b,a]])for(let i=0;i<3;i++){
  const start=x.points[i],end=x.points[(i+1)%3],length=direction.subVectors(end,start).length();if(length<eps)continue;
  ray.set(start,direction.divideScalar(length));const hit=ray.intersectTriangle(y.points[0],y.points[1],y.points[2],false,point);
  if(hit&&point.distanceTo(start)<=length+eps&&!expected(point))return point.clone();
 }
 if(Math.abs(na.dot(nb))<1-1e-6||Math.abs(na.dot(direction.subVectors(b.points[0],a.points[0])))>eps)return null;
 // Coplanar overlap also counts; a ray test alone cannot detect it.
 for(const [x,y] of [[a,b],[b,a]])for(const p of x.points){const bary=y.triangle.getBarycoord(p,new T.Vector3());if(bary&&Math.min(bary.x,bary.y,bary.z)>1e-6&&!expected(p))return p.clone();}
 const drop=Math.abs(na.x)>Math.abs(na.y)?(Math.abs(na.x)>Math.abs(na.z)?0:2):(Math.abs(na.y)>Math.abs(na.z)?1:2),axes=[0,1,2].filter(i=>i!==drop),cross=(x,y)=>x[0]*y[1]-x[1]*y[0];
 for(let i=0;i<3;i++)for(let j=0;j<3;j++){
  const start=a.points[i],end=a.points[(i+1)%3],other=b.points[j],last=b.points[(j+1)%3],u=axes.map(k=>end.getComponent(k)-start.getComponent(k)),v=axes.map(k=>last.getComponent(k)-other.getComponent(k)),offset=axes.map(k=>other.getComponent(k)-start.getComponent(k)),den=cross(u,v);
  if(Math.abs(den)<1e-14)continue;const t=cross(offset,v)/den,s=cross(offset,u)/den;if(t>=-1e-7&&t<=1+1e-7&&s>=-1e-7&&s<=1+1e-7){point.copy(start).lerp(end,t);if(!expected(point))return point.clone();}
 }return null;
}

for(const pose of ['walk','crawl','attack','passenger-rest','passenger-transition','passenger'])test('posed native neck and lower-head surfaces: '+pose,async()=>{
 const {default:headData}=await import('../lib/assets/ghost-head.json',{with:{type:'json'}});
 let f,car,camera;
 if(pose.startsWith('passenger')){
  const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
  Object.defineProperty(globalThis,'document',{value:{createElement:()=>({width:0,height:0,getContext:()=>context})},configurable:true});
  const {buildRoad}=await import('../lib/prologue.ts'),road=buildRoad(new T.Scene(),true);camera=new T.PerspectiveCamera(68,16/9,.06,160);road.pose('car_crash',pose==='passenger-rest'?0:pose==='passenger-transition'?.125:.4,camera,false);road.root.updateMatrixWorld(true);f=road.root.getObjectByName('finale-passenger');car=road.root.getObjectByName('hero-sedan');
 }else{f=createGhost(new T.Group());if(pose==='attack')animateGhostAttack(f,.65,false);else animateGhost(f,3,1,.7,false,1.6,pose==='crawl'?1:0);f.updateMatrixWorld(true);}
 const skin=f.getObjectByName('ghost-collar-skin'),face=f.getObjectByName('ghost-continuous-face'),head=face.parent,cut=new Map(neckData.headRing.map((id,i)=>[id,neckData.neckRing[i]]));
 // Seated flesh compresses against actual opaque cushions. Include that
 // physical support and the real driver view; a floating chairless seated
 // figure invents an impossible player view through the cushion underside.
 const occluders=[];for(const root of car?[f,car]:[f])root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isInstancedMesh)return;const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  if(materials.some(m=>m.transparent||m.alphaTest>0))return;
  for(let o=mesh;o!==root;o=o.parent)if(!o.visible)return;if(!occluders.includes(mesh))occluders.push(mesh);
 });
  const triangles=[],inverse=skin.matrixWorld.clone().invert();
  for(const mesh of [skin,face]){
   const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,matrix=inverse.clone().multiply(mesh.matrixWorld),native=mesh===skin;
   for(let k=0;k<ix.count;k+=3){
    const vertices=[0,1,2].map(j=>ix.getX(k+j)),points=vertices.map(i=>new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix)),triangle=new T.Triangle(...points),changed=native||vertices.some(i=>neckData.headNeckWeight[i]<.999999||neckData.headArmWeight[i]>1e-7);
    const ids=vertices.map(i=>native?'body:'+i:cut.has(i)?'body:'+cut.get(i):'head:'+i);
    if(changed){
     const rest=new T.Triangle(...vertices.map(i=>native?new T.Vector3().fromArray(neckData.position,i*3):new T.Vector3().fromArray(headData.position,i*3).multiply(head.scale)));
     assert.ok(triangle.getArea()>1e-12&&triangle.getArea()/rest.getArea()>.01,pose+': collapsed '+mesh.name+' triangle '+k/3);
    }
    triangles.push({name:mesh.name,index:k/3,ids,points,triangle,changed,box:new T.Box3().setFromPoints(points)});
   }
  }
  for(let i=0;i<triangles.length;i++)for(let j=i+1;j<triangles.length;j++){
   const a=triangles[i],b=triangles[j];if(!(a.changed||b.changed)||!a.box.intersectsBox(b.box))continue;const contact=skinContact(a,b);
   if(!contact)continue;
   // Original source skin can compress beneath opaque cloth. Classify actual
   // visibility from exterior player-height views rather than normal proxies.
   const point=skin.localToWorld(contact.clone());let visibleFrom;
   const origins=camera?[camera.position.clone()]:[];
   // road.pose owns the locked driver camera. Views outside/under the moving
   // sedan cannot be reached in this scene. Ordinary encounters retain the
   // full32 exterior samples at player/death heights.
   if(!camera)for(const height of [.25,.9,1.65,2])for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4){const from=point.clone().add(new T.Vector3(Math.sin(angle)*1.1,0,Math.cos(angle)*1.1));from.y=f.position.y+height;origins.push(from);}
   for(const from of origins){
    const direction=point.clone().sub(from),distance=direction.length(),ray=new T.Raycaster(from,direction.divideScalar(distance),0,distance-.0002);
    if(!ray.intersectObjects(occluders,false).length)visibleFrom=from;
   }
   assert.ok(!visibleFrom,pose+': visible '+a.name+' triangle '+a.index+' intersects '+b.name+' triangle '+b.index+' at '+contact.toArray()+', observed from '+visibleFrom?.toArray());
  }
});

test('the native body is connected through the torso and crotch with only its head and four hidden limb cuts open',()=>{
 const adjacency=Array.from({length:neckData.position.length/3},()=>new Set()),edges=new Map();
 for(let k=0;k<neckData.index.length;k+=3)for(let j=0;j<3;j++){const a=neckData.index[k+j],b=neckData.index[k+(j+1)%3],key=[a,b].sort((x,y)=>x-y).join('/');adjacency[a].add(b);adjacency[b].add(a);edges.set(key,(edges.get(key)??0)+1);}
 const seen=new Set(),todo=[0];while(todo.length){const i=todo.pop();if(seen.has(i))continue;seen.add(i);todo.push(...adjacency[i]);}
 assert.equal(seen.size,adjacency.length,'skin cannot be disconnected patches inside the dress');
 const boundary=new Map();for(const [key,n] of edges)if(n===1){const [a,b]=key.split('/').map(Number);boundary.set(a,[...(boundary.get(a)??[]),b]);boundary.set(b,[...(boundary.get(b)??[]),a]);}
 assert.ok([...boundary.values()].every(ids=>ids.length===2),'body cuts must be clean closed rings');let loops=0;
 while(boundary.size){loops++;const queue=[boundary.keys().next().value];while(queue.length){const i=queue.pop(),next=boundary.get(i);if(!next)continue;boundary.delete(i);queue.push(...next);}}
 assert.equal(loops,5,'only the actual neck, two arms and two thigh connections may be open');
});

test('the complete upper body shares the actual anatomical arm roots through every pose branch',()=>{
 const f=createGhost(new T.Group()),skin=f.getObjectByName('ghost-collar-skin'),arms=[];f.position.set(2,1,-3);f.rotation.y=.6;f.traverse(m=>{if(m.name==='ghost-continuous-arm')arms.push(m);});assert.equal(arms.length,2);
 const poses=[()=>animateGhost(f,3,1,.7,false,1.6,0),()=>animateGhost(f,3,1,.7,false,1.6,.5),()=>animateGhost(f,3,1,.7,false,4.8,1),()=>animateGhostAttack(f,.4,false),()=>animateGhostAttack(f,1.8,true,1),()=>animateGhostPassenger(f,3,0,false,true),()=>animateGhostPassenger(f,3,1,false,true),()=>animateGhostEmergence(f,.6,false)];
 for(const [pose,apply] of poses.entries()){apply();f.updateMatrixWorld(true);const p=skin.geometry.attributes.position,n=skin.geometry.attributes.normal,matrix=new T.Matrix3().getNormalMatrix(skin.matrixWorld);
  for(const [side,key] of ['r','l'].entries()){const ring=neckData.armRings[key],arm=arms[side],ap=arm.geometry.attributes.position,an=arm.geometry.attributes.normal,am=new T.Matrix3().getNormalMatrix(arm.matrixWorld);assert.ok(ring.body.length>20);
   for(let i=0;i<ring.body.length;i++){const a=new T.Vector3().fromBufferAttribute(p,ring.body[i]).applyMatrix4(skin.matrixWorld),b=new T.Vector3().fromBufferAttribute(ap,ring.arm[i]).applyMatrix4(arm.matrixWorld);assert.ok(a.distanceTo(b)<.000002,`pose ${pose}: body detaches from arm ${side}`);
    a.fromBufferAttribute(n,ring.body[i]).applyMatrix3(matrix).normalize();b.fromBufferAttribute(an,ring.arm[i]).applyMatrix3(am).normalize();assert.ok(a.dot(b)>.999,'arm root lighting must also be continuous');
   }
  }
 }
});
