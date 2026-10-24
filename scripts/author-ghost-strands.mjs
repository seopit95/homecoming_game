// Original dense fine fibers fitted to the existing CC0 skull.
// node --experimental-strip-types scripts/author-ghost-strands.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFace,poseFace} from '../lib/ghost-face.ts';

const rig=createFace(new T.Group(),new T.MeshStandardMaterial()),mesh=rig.face,g=mesh.geometry;
const base=g.attributes.position.array.slice();poseFace(rig,1);const gape=g.attributes.position.array.slice();poseFace(rig,0);mesh.updateMatrixWorld(true);
const ray=new T.Raycaster(),radial=new T.Vector3(),normal=new T.Vector3(),bary=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
const random=n=>{const x=Math.sin(n*127.1+31.7)*43758.5453;return x-Math.floor(x);};
function fittedHit(hit,inside=false){
 const ids=[hit.face.a,hit.face.b,hit.face.c];a.fromArray(base,ids[0]*3);b.fromArray(base,ids[1]*3);c.fromArray(base,ids[2]*3);new T.Triangle(a,b,c).getBarycoord(hit.point,bary);
 normal.copy(hit.normal).normalize();if(inside&&normal.dot(radial)<0)normal.negate();
 const weights=bary.toArray(),delta=[0,1,2].map(axis=>ids.reduce((sum,id,k)=>sum+(gape[id*3+axis]-base[id*3+axis])*weights[k],0));
 return {p:hit.point.clone(),n:normal.clone(),delta};
}
function rawSample(angle,y,x){
 if(x===undefined){radial.set(Math.sin(angle),0,Math.cos(angle));ray.set(new T.Vector3(0,y,.02),radial);}
 else ray.set(new T.Vector3(x,y,1),new T.Vector3(0,0,-1));
 const hit=ray.intersectObject(mesh).at(x===undefined?-1:0);
 if(!hit&&x!==undefined)return rawSample(angle,y);
 assert.ok(hit,`missing skull at ${angle},${y},${x}`);
 return fittedHit(hit,x===undefined);
}
function topSample(x,z){
 ray.set(new T.Vector3(x,1,z),new T.Vector3(0,-1,0));let hit=ray.intersectObject(mesh).at(0);
 for(let i=1;!hit&&i<=7;i++){const fit=1-i*.035;ray.set(new T.Vector3(x*fit,1,T.MathUtils.lerp(.02,z,fit)),new T.Vector3(0,-1,0));hit=ray.intersectObject(mesh).at(0);}
 assert.ok(hit,`missing crown at ${x},${z}`);return fittedHit(hit);
}
function partRoot(seed,right){
 const z=-.065+random(seed+22)*.173,part=.026+.003*Math.sin(z*41)+.0015*Math.sin(z*87);
 return topSample(part+(right?1:-1)*(.0033+random(seed+23)*.0018),z);
}

// Interpolating a small actual-skull sampling grid keeps authoring cheap;
// individual fibers have independent continuous angles/roots, not grid paths.
const cache=new Map(),angles=80,stepY=.007;
function node(ai,yi){
 ai=T.MathUtils.euclideanModulo(ai,angles);const key=ai+yi*angles;
 if(!cache.has(key))cache.set(key,rawSample(ai/angles*Math.PI*2,yi*stepY));return cache.get(key);
}
function sample(angle,y,x){
 if(x!==undefined)return rawSample(angle,y,x);
 const u=T.MathUtils.euclideanModulo(angle,Math.PI*2)/(Math.PI*2)*angles,v=y/stepY,ai=Math.floor(u),yi=Math.floor(v),s=u-ai,t=v-yi;
 const cells=[node(ai,yi),node(ai+1,yi),node(ai,yi+1),node(ai+1,yi+1)],weights=[(1-s)*(1-t),s*(1-t),(1-s)*t,s*t],p=new T.Vector3(),n=new T.Vector3(),delta=[0,0,0];
 for(let i=0;i<4;i++){p.addScaledVector(cells[i].p,weights[i]);n.addScaledVector(cells[i].n,weights[i]);for(let axis=0;axis<3;axis++)delta[axis]+=cells[i].delta[axis]*weights[i];}
 return {p,n:n.normalize(),delta};
}

const center=[],skinDelta=[],radius=[],strands=[],freeLengthScales=[],finalRadiusScale=.6;
function strand(points,release,width,seed){
 const start=radius.length;
 for(let j=0;j<points.length;j++){
  const t=j/(points.length-1),q=points[j],taper=.035+.965*Math.pow(1-t,.35),r=width*taper*(1+.05*Math.sin(seed+j*.9))*finalRadiusScale;
  center.push(...q.p.toArray());skinDelta.push(...q.delta);radius.push(r);
 }
 strands.push([start,points.length,release,.48+random(seed+170)*.72,3]);
}

// Dense side/back mass is made entirely of individual fine fibers. Roots,
// layer depths, curvature and tips are independently sampled for every fiber.
for(let id=0;id<3000;id++){
 const front=id>=2960,left=id<2988,seed=id*31+11,parted=id<800||id>=2700&&id<2960,right=parted?random(seed+21)>.68:!left;
 const angle=parted?(right?1.04+random(seed+1)*1.4:-(1.04+random(seed+1)*1.4)):(front?(left?-.94+random(seed+1)*.76:.85+random(seed+1)*.29):1.01+random(seed+1)*4.26);
 const rootY=.305+random(seed+2)*.039,releaseY=front?(left?.052+random(seed+3)*.03:.12+random(seed+3)*.025):.105+random(seed+3)*.06;
 const endY=-(front?.50+random(seed+4)*.60:.78+random(seed+4)*.67),phase=random(seed+5)*Math.PI*2,freeScale=.78+random(seed+24)*.14;freeLengthScales.push(freeScale);
 const lift=front?.002+random(seed+6)*.013:.008+random(seed+6)**.7*.051,twist=(random(seed+7)-.5)*(front?.17:.27),points=[];
 const root=parted?partRoot(seed,right):sample(angle,rootY),cheekX=left?-.119+random(seed+8)*.055:.111+random(seed+8)*.031,target=parted?sample(angle,releaseY):undefined;
 let last;
 for(let j=0;j<24;j++){
  if(j<=9){
   const t=j/9,y=T.MathUtils.lerp(rootY,releaseY,t),sweep=T.MathUtils.smoothstep(t,.03,.76),theta=angle+twist*Math.sin(t*Math.PI*.9)+Math.sin(t*3.7+phase)*.025*t;
   const x=front?T.MathUtils.lerp(root.p.x,cheekX,sweep):undefined,q=parted?topSample(T.MathUtils.lerp(root.p.x,target.p.x,sweep),T.MathUtils.lerp(root.p.z,target.p.z,sweep)):sample(theta,y,x);
   if(parted)q.p.addScaledVector(new T.Vector3(Math.cos(angle),0,-Math.sin(angle)),Math.sin(t*Math.PI)*.003*Math.sin(phase+t*4));
   const volume=.0009+lift*Math.pow(Math.sin(t*Math.PI*.76),1.12);
   q.p.addScaledVector(q.n,volume);last=q;points.push(q);
  }else{
   const t=(j-9)/14,loose=T.MathUtils.smoothstep(t,0,.22),frequency=3.3+random(seed+10)*4.4,amplitude=.004+random(seed+11)*.030;
   const p=last.p.clone();p.y=T.MathUtils.lerp(last.p.y,endY,t);
   p.x+=(Math.sin(t*frequency+phase)-Math.sin(phase))*amplitude*loose;
   p.z+=(Math.cos(t*(frequency*.83)+phase)-Math.cos(phase))*amplitude*(.45+random(seed+12)*.5)*loose;
   p.x+=Math.sin(t*14+phase)*.0012*loose;p.z+=Math.sin(t*11+phase*.7)*.0009*loose;
   p.sub(last.p).multiplyScalar(freeScale).add(last.p);
   points.push({p,n:last.n,delta:last.delta.map(v=>v*(1-T.MathUtils.smoothstep(t,0,.20)))});
  }
 }
 strand(points,9,.00034+random(seed+17)*.00040,seed);
}

// Overlapping growth sweeps out of a narrow, irregular off-center part.
// Only sparse individual wisps continue across the face; no central tongue.
for(let id=0;id<360;id++){
 const seed=id*41+99001,parted=id>=140,right=random(seed+21)>.68,angle=parted?(right?.92+random(seed+1)*1.0:-(.92+random(seed+1)*1.0)):1.0+random(seed+1)*4.28,top=.328+random(seed+2)*.017,bottom=parted?.19+random(seed+3)*.085:.18+random(seed+3)*.12,phase=random(seed+4)*Math.PI*2,points=[],root=parted?partRoot(seed,right):undefined,target=parted?sample(angle,bottom):undefined;
 for(let j=0;j<16;j++){
  const t=j/15,theta=angle+(random(seed+5)-.5)*.32*t+.045*Math.sin(t*4+phase)*t,sweep=T.MathUtils.smoothstep(t,0,1),q=parted?topSample(T.MathUtils.lerp(root.p.x,target.p.x,sweep),T.MathUtils.lerp(root.p.z,target.p.z,sweep)):sample(theta,T.MathUtils.lerp(top,bottom,t));
  q.p.addScaledVector(q.n,.001+(.004+random(seed+6)*.036)*Math.sin(t*Math.PI*.86));points.push(q);
 }
 strand(points,16,.00030+random(seed+17)*.00033,seed);
}

for(let id=0;id<48;id++){
 const seed=id*53+130001,angle=.91+random(seed+1)*4.43,top=.319+random(seed+2)*.025,bottom=.18+random(seed+3)*.12,points=[];
 for(let j=0;j<20;j++){
  const t=j/19,q=sample(angle+(random(seed+4)-.5)*.42*t,T.MathUtils.lerp(top,bottom,t));
  q.p.addScaledVector(q.n,.001+(.040+random(seed+5)*.044)*Math.sin(t*Math.PI*.79));points.push(q);
 }
 strand(points,20,.00019+random(seed+17)*.00017,seed);
}

// The backing is a small actual posterior/crown skull surface, inside the
// dense fibers. No frontal painted shell or hard forehead hairline survives.
const scalp={position:[],normal:[],index:[]},lookup=new Map(),sourceNormal=g.attributes.normal;
const inside=i=>{const x=base[i*3],y=base[i*3+1],z=base[i*3+2],angle=Math.atan2(x,z+.015);return z<.035&&y>.17+.015*Math.sin(angle*11)||y>.334;};
function scalpVertex(i){
 if(lookup.has(i))return lookup.get(i);const id=scalp.position.length/3,n=new T.Vector3().fromBufferAttribute(sourceNormal,i);
 scalp.position.push(base[i*3]+n.x*.0006,base[i*3+1]+n.y*.0006,base[i*3+2]+n.z*.0006);scalp.normal.push(...n.toArray());lookup.set(i,id);return id;
}
for(let j=0;j<g.index.count;j+=3){const ids=[g.index.getX(j),g.index.getX(j+1),g.index.getX(j+2)];if(ids.every(inside))scalp.index.push(...ids.map(scalpVertex));}
const round=values=>values.map(v=>+v.toFixed(7)),strandVertices=radius.length*3;
const headRadiusScale=Math.sqrt((.526315789**2+.5**2+.64516129**2)/3),meanLocalRadius=radius.reduce((sum,r)=>sum+r,0)/radius.length;
const out={center:round(center),skinDelta:round(skinDelta),radius:round(radius),strands:strands.map(s=>s.map(v=>+v.toFixed(7))),scalp:{position:round(scalp.position),normal:round(scalp.normal),index:scalp.index},metadata:{name:'V131 preview: dense independent fine 3D fibers; no thick cores',strandCount:strands.length,strandVertices,vertices:strandVertices+scalp.position.length/3,construction:'3000 independently curved long fine closed fibers,360 crown fibers,48 subtle flyaways. All three-sided tapered tubes. Small posterior skull backing only; no cards, portraits or textures.',maxLocalRadius:Math.max(...radius),polish:{radiusScale:finalRadiusScale,maxWorldDiameter:Math.max(...radius)*headRadiusScale*2,meanWorldDiameter:meanLocalRadius*headRadiusScale*2,freeLengthScaleRange:[.78,.92],meanFreeLengthScale:freeLengthScales.reduce((sum,s)=>sum+s,0)/freeLengthScales.length,rootShape:'Unchanged narrow irregular off-center part and swept grooming.'},skullLicense:'CC0-1.0',skullSource:'Existing ghost-head.json (MakeHuman Team and contributors)'}};
assert.ok(out.metadata.vertices<250000);assert.ok(out.metadata.maxLocalRadius<.0008);assert.ok(center.every(Number.isFinite));
fs.writeFileSync(new URL('../lib/assets/ghost-strands.json',import.meta.url),JSON.stringify(out)+'\n');
console.log(JSON.stringify({strands:strands.length,vertices:out.metadata.vertices,scalpVertices:scalp.position.length/3,maxLocalRadius:out.metadata.maxLocalRadius,cachedSkullSamples:cache.size}));
