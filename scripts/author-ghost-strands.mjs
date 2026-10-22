// Original, deterministic tube centerlines fitted to the existing CC0 skull.
// node --experimental-strip-types scripts/author-ghost-strands.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFace,poseFace} from '../lib/ghost-face.ts';

const rig=createFace(new T.Group(),new T.MeshStandardMaterial()),mesh=rig.face,g=mesh.geometry;
const base=g.attributes.position.array.slice();poseFace(rig,1);const gape=g.attributes.position.array.slice();poseFace(rig,0);mesh.updateMatrixWorld(true);
const ray=new T.Raycaster(),radial=new T.Vector3(),normal=new T.Vector3(),bary=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
const random=n=>{const x=Math.sin(n*127.1+31.7)*43758.5453;return x-Math.floor(x);};
function sample(angle,y,x){
 if(x===undefined){radial.set(Math.sin(angle),0,Math.cos(angle));ray.set(new T.Vector3(0,y,.02),radial);}
 else ray.set(new T.Vector3(x,y,1),new T.Vector3(0,0,-1));
 const hit=ray.intersectObject(mesh).at(x===undefined?-1:0);assert.ok(hit,`missing skull at ${angle}, ${y}, ${x}`);
 const ids=[hit.face.a,hit.face.b,hit.face.c];a.fromArray(base,ids[0]*3);b.fromArray(base,ids[1]*3);c.fromArray(base,ids[2]*3);new T.Triangle(a,b,c).getBarycoord(hit.point,bary);
 normal.copy(hit.normal).normalize();if(normal.dot(radial)<0&&x===undefined)normal.negate();
 const weights=bary.toArray(),delta=[0,1,2].map(axis=>ids.reduce((sum,id,k)=>sum+(gape[id*3+axis]-base[id*3+axis])*weights[k],0));
 return {p:hit.point.clone(),n:normal.clone(),delta};
}

const center=[],skinDelta=[],radius=[],strands=[];
function strand(points,release,width,seed,sides=3){
 const start=radius.length;
 for(let j=0;j<points.length;j++){
  const t=j/(points.length-1),q=points[j],tip=Math.pow(1-t, .48),tipWidth=sides>3?.025:.14,r=width*(tipWidth+(1-tipWidth)*tip)*(1+.08*Math.sin(seed+j*.8));
  center.push(...q.p.toArray());skinDelta.push(...q.delta);radius.push(r);
 }
 strands.push([start,points.length,release,.58+random(seed+31)*.62,sides]);
}

// Forty small bundles, each surrounded by sixteen separate tapered fibers.
// Most go around the sides/back; the left fringe crosses the brow in narrow
// separated wisps while the opposite eye and the mouth remain exposed.
for(let lock=0;lock<40;lock++){
 const front=lock>=32,left=lock<38,angle=front?(left?-.90+(lock-32)*.13:.76+(lock-38)*.20):.98+lock*4.32/31;
 const rootY=.337+random(lock+5)*.009,releaseY=front?.075:.13,cheekX=left?-.112+(lock-32)*.012:.110+(lock-38)*.013;
 const endY=-(front?.53+random(lock+1)*.30:.84+random(lock+1)*.42),guide=[];
 let last;
 for(let j=0;j<24;j++){
  if(j<=10){
   const t=j/10,y=T.MathUtils.lerp(rootY,releaseY,t),sweep=T.MathUtils.smoothstep(t,0,.64);
   const root=front?sample(angle,rootY):undefined,x=front?T.MathUtils.lerp(root.p.x,cheekX,sweep):undefined;
   last=sample(angle+.04*Math.sin(t*3+lock),y,x);last.p.addScaledVector(last.n,.0024+Math.sin(t*Math.PI*.73)*(front?.016:.054+random(lock+2)*.022));guide.push(last);
  }else{
   const t=(j-10)/13,loose=T.MathUtils.smoothstep(t,0,.24),phase=lock*1.81;
   const amplitude=.030+random(lock+113)*.018,frequency=5.5+random(lock+114)*3.5;
   const p=last.p.clone();p.y=T.MathUtils.lerp(releaseY,endY,t);p.x+=(Math.sin(t*frequency+phase)-Math.sin(phase))*amplitude*loose;p.z+=(Math.cos(t*(frequency-.8)+phase)-Math.cos(phase))*amplitude*.8*loose;
   guide.push({p,n:last.n,delta:last.delta.map(v=>v*(1-T.MathUtils.smoothstep(t,0,.22)))});
  }
 }
 for(let fiber=0;fiber<16;fiber++){
  const seed=lock*37+fiber,spread=(fiber-7.5)*.00074,tangent=new T.Vector3(Math.cos(angle),0,-Math.sin(angle)),phase=random(seed+71)*Math.PI*2,shellAngle=fiber*2.399963+lock*.71,shell=front?.002:.009+random(seed+76)*.004;
  const points=guide.map((q,j)=>{
   const t=j/23,free=T.MathUtils.smoothstep(t,.40,.75),separate=1+free*(.7+random(seed+93));
   const growth=T.MathUtils.smoothstep(t,0,.18),p=q.p.clone().addScaledVector(tangent,spread*separate+.00045*Math.sin(t*13+phase)+Math.sin(shellAngle)*shell*growth);p.addScaledVector(q.n,.00015+random(seed+8)*.0007+Math.cos(shellAngle)*shell*growth);
   p.x+=Math.sin(t*17+phase)*.0018*free;p.z+=Math.cos(t*13+phase)*.0014*free;
   p.y-=(.025+random(seed+79)*.11)*T.MathUtils.smoothstep(t,.48,1);
   return {...q,p};
  });
  strand(points,10,(fiber===3?.0011:.00040+random(seed+17)*.00038),seed);
 }
 // Rounded wet bundle cores provide visible density at the actual cabin
 // camera scale. Fine fibers remain separate around each irregular core.
 for(let layer=0;layer<(front?1:2);layer++){
  const seed=lock*43+layer+3000,tangent=new T.Vector3(Math.cos(angle),0,-Math.sin(angle)),spread=front?-.001:(layer-.5)*.006;
  const points=guide.map((q,j)=>{const t=j/23,p=q.p.clone().addScaledVector(tangent,spread*(.5+Math.sin(t*Math.PI)*.6));p.addScaledVector(q.n,.001+layer*.004*Math.sin(t*Math.PI));return {...q,p};});
  strand(points,10,(front?.0024:.0070)+random(seed+5)*(front?.0012:.0040),seed,7);
 }
}

// Fine crown growth breaks the cap's edge. A few longer, lifted flyaways
// interrupt the silhouette; all seeds are static, so no hairstyle flicker.
for(let id=0;id<120;id++){
 const fly=id>=96,angle=.95+random(id+3)*4.38,count=fly?14:12,top=.337+random(id+11)*.009,bottom=(fly?.20:.17)+random(id+17)*.12,points=[];
 for(let j=0;j<count;j++){
  const t=j/(count-1),q=sample(angle+.09*Math.sin(t*3+id),T.MathUtils.lerp(top,bottom,t));
  q.p.addScaledVector(q.n,.0028+(fly?.050+random(id+12)*.030:.014+random(id+14)*.015)*Math.sin(t*Math.PI*.88));points.push(q);
 }
 strand(points,count,(fly?.00026:.00046)+random(id+37)*.00024,id+1800);
}

// A small actual skull surface fills only the inner crown. The irregular
// boundary sits inside the fine growth, rather than outlining a solid bob.
const scalp={position:[],normal:[],index:[]},lookup=new Map(),sourceNormal=g.attributes.normal;
const inside=i=>{const x=base[i*3],y=base[i*3+1],z=base[i*3+2],angle=Math.atan2(x,z+.015),front=T.MathUtils.smoothstep(z,.03,.12)*(1-T.MathUtils.smoothstep(Math.abs(x),.07,.14));return y>.122+.196*front+.014*Math.sin(angle*9)+.009*Math.sin(angle*19);};
function scalpVertex(i){
 if(lookup.has(i))return lookup.get(i);const id=scalp.position.length/3,n=new T.Vector3().fromBufferAttribute(sourceNormal,i);
 scalp.position.push(base[i*3]+n.x*.0011,base[i*3+1]+n.y*.0011,base[i*3+2]+n.z*.0011);scalp.normal.push(...n.toArray());lookup.set(i,id);return id;
}
for(let j=0;j<g.index.count;j+=3){const ids=[g.index.getX(j),g.index.getX(j+1),g.index.getX(j+2)];if(ids.every(inside))scalp.index.push(...ids.map(scalpVertex));}
const round=values=>values.map(v=>+v.toFixed(7));
const strandVertices=strands.reduce((sum,s)=>sum+s[1]*s[4],0);
const out={center:round(center),skinDelta:round(skinDelta),radius:round(radius),strands:strands.map(s=>s.map(v=>+v.toFixed(7))),scalp:{position:round(scalp.position),normal:round(scalp.normal),index:scalp.index},metadata:{name:'Original layered wet 3D strand hair fitted to the existing adult skull',strandCount:strands.length,strandVertices,vertices:strandVertices+scalp.position.length/3,construction:'Closed tapered triangular fine fibers and seven-sided rounded wet bundle cores,40 irregular layered locks,96 fine crown strands and24 lifted flyaways. Skull-fitting inner underlay; no card, portrait, billboard or texture.',skullLicense:'CC0-1.0',skullSource:'Existing ghost-head.json (MakeHuman Team and contributors)'}};
assert.ok(out.metadata.vertices<=80000);assert.ok(center.every(Number.isFinite));
fs.writeFileSync(new URL('../lib/assets/ghost-strands.json',import.meta.url),JSON.stringify(out)+'\n');
console.log(JSON.stringify({strands:strands.length,centerlinePoints:radius.length,vertices:out.metadata.vertices,scalpVertices:scalp.position.length/3,scalpTriangles:scalp.index.length/3}));
