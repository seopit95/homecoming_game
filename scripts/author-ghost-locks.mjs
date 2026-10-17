// node scripts/author-ghost-locks.mjs /path/to/pinned-v59-ghost-hair.json
// Keep a fitted crown underlay; author continuous damp clumps from root to tip.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFace,poseFace} from '../lib/ghost-face.ts';
const input=fs.readFileSync(process.argv[2]),source=JSON.parse(input),cut=.11;
const out={position:[],uv:[],anchor:[],skinDelta:[],index:[],groups:[]},lookup=new Map();
const channels={position:3,uv:2,anchor:3,skinDelta:3};
const vertex=i=>Object.fromEntries(Object.entries(channels).map(([key,size])=>[key,source[key].slice(i*size,(i+1)*size)]));
function add(v){
 const key=JSON.stringify(v);if(lookup.has(key))return lookup.get(key);const i=out.position.length/3;lookup.set(key,i);
 for(const key in channels)out[key].push(...v[key]);return i;
}
for(let i=0;i<source.index.length;i+=3){
 const triangle=source.index.slice(i,i+3).map(vertex),polygon=[];
 for(let j=0;j<3;j++){
  const a=triangle[j],b=triangle[(j+1)%3],inside=a.position[1]>=cut,next=b.position[1]>=cut;
  if(inside)polygon.push(a);
  if(inside!==next){const t=(cut-a.position[1])/(b.position[1]-a.position[1]);polygon.push(Object.fromEntries(Object.keys(channels).map(key=>[key,a[key].map((n,k)=>T.MathUtils.lerp(n,b[key][k],t))])));}
 }
 for(let j=1;j<polygon.length-1;j++)out.index.push(...[polygon[0],polygon[j],polygon[j+1]].map(add));
}
out.groups.push({start:0,count:out.index.length,materialIndex:0});
const scalpVertices=out.position.length/3,scalpIndices=out.index.length;
// Sample the same damp strand texture over the crown instead of a flat cap.
for(let i=0;i<scalpVertices;i++){
 const x=out.position[i*3],y=out.position[i*3+1],z=out.position[i*3+2];
 out.uv[i*2]=.38+.24*(Math.atan2(x,z)/(Math.PI*2)+.5);out.uv[i*2+1]=.98-(.36-y)*.8;
}
const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(source.position,3));geometry.setIndex(source.index);
const model=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide})),ray=new T.Raycaster();model.updateMatrixWorld(true);
function attach(angle,y){
 const radial=new T.Vector3(Math.sin(angle),0,Math.cos(angle));ray.set(new T.Vector3(0,y,0),radial);ray.far=.35;
 const hit=ray.intersectObject(model).at(-1);assert.ok(hit,`missing scalp attachment at ${angle}, ${y}`);return hit;
}
function morphAt(hit){
 const ids=[hit.face.a,hit.face.b,hit.face.c],points=ids.map(i=>new T.Vector3().fromArray(source.position,i*3));
 const bary=new T.Triangle(...points).getBarycoord(hit.point,new T.Vector3()).toArray();
 return [0,1,2].map(axis=>ids.reduce((sum,i,j)=>sum+source.skinDelta[i*3+axis]*bary[j],0));
}
// Each long card now starts on the crown and follows the actual fitted scalp
// all the way to its own loose guide. There is no separate mid-head bob edge.
for(let lock=0;lock<36;lock++){
 const angle=(74+lock*212/35)*Math.PI/180+Math.sin(lock*1.2)*.018,y=-.075,hit=attach(angle,y),root=hit.point,delta=morphAt(hit);
 const start=out.position.length/3,startY=.346+.009*Math.sin(lock*1.4),length=.85+.44*(.5+.5*Math.sin(lock*2.3)),width=.055+.023*(.5+.5*Math.sin(lock*1.9));
 for(let row=0;row<=36;row++)for(let column=0;column<3;column++){
  const level=row<=12?T.MathUtils.lerp(startY,y,row/12):T.MathUtils.lerp(y,-length,(row-12)/24),t=(startY-level)/(startY+length),s=column/2-.5,twist=angle+.3*Math.sin(t*5+lock),taper=1-.4*t;
  let point,skinDelta;
  if(level>=y){
   const a=T.MathUtils.clamp(angle+s*.30+.06*Math.sin(lock*.7+level*5)*T.MathUtils.smoothstep(level,0,.3),70*Math.PI/180,290*Math.PI/180),sample=attach(a,level);
   point=sample.point.clone().add(new T.Vector3(Math.sin(a),0,Math.cos(a)).multiplyScalar(.0045+.0015*Math.sin(lock)));skinDelta=morphAt(sample);
  }else{
   const loose=T.MathUtils.smoothstep(y-level,0,.28),x=root.x+Math.sin(lock*1.7+t*5)*.028*loose+Math.cos(twist)*s*width*taper;
   const z=root.z+Math.cos(lock*.73+t*4)*.03*loose-Math.sin(twist)*s*width*taper;
   point=new T.Vector3(T.MathUtils.clamp(x,-.249,.249),level,T.MathUtils.clamp(z,-.202,.158));skinDelta=delta.map(n=>n*Math.max(0,1-(y-level)/.25));
  }
  add({position:point.toArray(),uv:[.33+column*.17,1-t],anchor:root.toArray(),skinDelta});
 }
 for(let row=0;row<36;row++)for(let column=0;column<2;column++){const a=start+row*3+column,b=a+3;out.index.push(a,b,a+1,b,b+1,a+1);}
}
// Uneven face-framing curtains replace the blunt cropped fringe. Follow the
// actual brow and cheek skin, then let the ends hang beyond the jaw.
const faceRig=createFace(new T.Group(),new T.MeshStandardMaterial()),skin=faceRig.face.geometry.attributes.position.array.slice();
poseFace(faceRig,1);const gape=faceRig.face.geometry.attributes.position.array.slice();poseFace(faceRig,0);faceRig.face.updateMatrixWorld(true);
const skinRay=new T.Raycaster(),skinDirection=new T.Vector3(0,0,-1);
function facialPoint(x,y){
 skinRay.set(new T.Vector3(x,y,1),skinDirection);
 const hit=skinRay.intersectObject(faceRig.face).at(0);if(!hit)return undefined;
 const ids=[hit.face.a,hit.face.b,hit.face.c],points=ids.map(i=>new T.Vector3().fromArray(skin,i*3));
 const bary=new T.Triangle(...points).getBarycoord(hit.point,new T.Vector3()).toArray();
 return {z:hit.point.z+.012,delta:[0,1,2].map(axis=>ids.reduce((sum,i,j)=>sum+(gape[i*3+axis]-skin[i*3+axis])*bary[j],0))};
}
for(let lock=0;lock<17;lock++){
 const left=lock<13,k=left?lock:lock-13,count=left?13:4,angle=(left?-64+k*68/(count-1):43+k*25/(count-1))*Math.PI/180;
 const root=attach(angle,.285).point,base=out.position.length/3,length=.48+.28*(.5+.5*Math.sin(lock*2.3)),width=.022+.010*(.5+.5*Math.cos(lock*1.7)),cheekX=left?-.132+k*.0052:.12+k*.012;
 const low=facialPoint(cheekX,-.075);
 for(let row=0;row<=40;row++)for(let column=0;column<3;column++){
  const y=row<=10?T.MathUtils.lerp(.35,.285,row/10):T.MathUtils.lerp(.285,-length,(row-10)/30),t=(.35-y)/(.35+length),s=column/2-.5;
  let point,skinDelta;
  if(y>=.285){
   const a=angle+s*.19,sample=attach(a,y);point=sample.point.clone().add(new T.Vector3(Math.sin(a),0,Math.cos(a)).multiplyScalar(.006));skinDelta=morphAt(sample);
  }else{
   const sweep=T.MathUtils.smoothstep(.285-y,0,.31),loose=T.MathUtils.smoothstep(-.075-y,0,.25),x=T.MathUtils.lerp(root.x,cheekX,sweep)+s*width*(1-.6*t)+Math.sin(t*8+lock)*.004*loose;
   const skin=facialPoint(x,Math.max(-.075,y)),freeFall=T.MathUtils.lerp(root.z+.008,.151,T.MathUtils.smoothstep(.285-y,0,.14)),z=Math.max(freeFall,skin?.z??freeFall);
   point=new T.Vector3(x,y,z+Math.sin(t*5+lock)*.009*loose);
   skinDelta=(y>=-.075?skin?.delta:low?.delta)?.map(n=>n*(1-loose))??[0,0,0];
  }
  add({position:point.toArray(),uv:[.33+column*.17,1-t],anchor:root.toArray(),skinDelta});
 }
 for(let row=0;row<40;row++)for(let column=0;column<2;column++){const a=base+row*3+column,b=a+3;out.index.push(a,b,a+1,b,b+1,a+1);}
}
out.groups.push({start:scalpIndices,count:out.index.length-scalpIndices,materialIndex:1});
for(const key in channels)out[key]=out[key].map(n=>+n.toFixed(7));
out.metadata={...source.metadata,name:'Fitted wet scalp with long asymmetrical face curtains',parentSHA256:crypto.createHash('sha256').update(input).digest('hex'),scalpCut:cut,scalpFadeStart:.255,scalpFade:.055,scalpVertices,looseLocks:36,crownLayers:0,frontalCurtains:17,vertices:out.position.length/3,triangles:out.index.length/3,looseTexture:'ghost-hair-locks-v1.webp',authoring:'CC0 scalp with damp-strand crown UV;36 crown-to-tip clumps and17 asymmetrical face curtains. Brow/cheek fitting transfers barycentric jaw motion; continuous free-fall depth avoids edge-ray folds. Existing RGBA strand texture.'};
out.metadata.sourceComponents=source.metadata.components;delete out.metadata.components;
assert.ok(out.position.every(Number.isFinite)&&out.index.every(i=>i<out.position.length/3));
fs.writeFileSync(new URL('../lib/assets/ghost-hair.json',import.meta.url),JSON.stringify(out)+'\n');console.log(out.metadata);
