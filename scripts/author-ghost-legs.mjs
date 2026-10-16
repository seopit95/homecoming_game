// node scripts/author-ghost-legs.mjs <pinned-body-directory> <pinned-rig-directory>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {sourceRigWeights} from './source-rig-weights.mjs';
const [dir,rigDir]=process.argv.slice(2),source=JSON.parse(fs.readFileSync(new URL('../lib/assets/pedestrian-head.json',import.meta.url)));
const texts=['base.obj','asian-female-young.target'].map(n=>fs.readFileSync(path.join(dir,n),'utf8'));
texts.forEach((s,i)=>assert.equal(crypto.createHash('sha256').update(s).digest('hex'),source.metadata.sources[i].sha256));
const base=[],faces=[];let group='';
for(const line of texts[0].split(/\r?\n/)){const a=line.trim().split(/\s+/);if(a[0]==='v')base.push(new T.Vector3(...a.slice(1,4).map(Number)));if(a[0]==='g')group=a[1];if(a[0]==='f'&&group==='body')faces.push(a.slice(1).map(s=>+s.split('/')[0]-1));}
for(const line of texts[1].split(/\r?\n/)){if(!/^\d+\s/.test(line))continue;const [i,x,y,z]=line.split(/\s+/).map(Number);base[i].add(new T.Vector3(x,y,z));}
const weights=sourceRigWeights(rigDir,base.length),joint=name=>weights.rig.joints[name].reduce((p,i)=>p.add(base[i]),new T.Vector3()).divideScalar(weights.rig.joints[name].length);
function clip(poly,distance){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a),db=distance(b);if(da>=-1e-10)out.push(a);if(da*db<0)out.push(a.clone().lerp(b,da/(da-db)));}return out;}
function boundaries(position,index){
 const edges=new Map();for(let k=0;k<index.length;k+=3)for(let j=0;j<3;j++){const a=index[k+j],b=index[k+(j+1)%3],key=[a,b].sort((a,b)=>a-b).join('/');edges.set(key,(edges.get(key)??0)+1);}
 const links=new Map();for(const [key,n] of edges)if(n===1){const [a,b]=key.split('/').map(Number);links.set(a,[...(links.get(a)??[]),b]);links.set(b,[...(links.get(b)??[]),a]);}assert.ok([...links.values()].every(v=>v.length===2),'clean native limb boundaries');
 const loops=[];while(links.size){const start=links.keys().next().value,loop=[start];let previous=-1;while(true){const current=loop.at(-1),next=links.get(current).find(i=>i!==previous);links.delete(current);if(next===start)break;loop.push(next);previous=current;}loops.push(loop);}
 assert.equal(loops.length,2,'only thigh root and ankle may be open');loops.sort((a,b)=>a.reduce((s,i)=>s+position[i*3+1],0)/a.length-b.reduce((s,i)=>s+position[i*3+1],0)/b.length);
 const wrist=loops[0],area=wrist.reduce((s,a,i)=>{const b=wrist[(i+1)%wrist.length];return s+position[a*3]*position[b*3+2]-position[b*3]*position[a*3+2];},0);if(area<0)wrist.reverse();const start=wrist.reduce((best,id,i)=>position[id*3]>position[wrist[best]*3]?i:best,0);
 return {root:loops[1],wrist:[...wrist.slice(start),...wrist.slice(0,start)]};
}
const output={};for(const [side,key] of [[-1,'r'],[1,'l']]){
 const suffix=side<0?'R':'L',a=joint(weights.rig.bones['upperleg01.'+suffix].head),b=joint(weights.rig.bones['upperleg02.'+suffix].tail),c=joint(weights.rig.bones['lowerleg02.'+suffix].tail),ab=b.clone().sub(a),bc=c.clone().sub(b),l1=ab.length(),l2=bc.length();ab.normalize();bc.normalize();
 const inverse=[ab,bc].map(axis=>new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),axis).invert()),position=[],index=[],uv=[],lowerWeight=[],wristWeight=[],lookup=new Map();
 for(const face of faces){
  if(face.every(i=>side*base[i].x<=0))continue;
  let poly=face.map(i=>base[i]);poly=clip(poly,p=>p.clone().sub(a).dot(ab)-l1*.20);poly=clip(poly,p=>-p.clone().sub(c).dot(bc)-.012/source.metadata.sourceScale);if(poly.length<3)continue;
  const ids=poly.map(p=>{
   const key=p.toArray().map(v=>v.toFixed(8)).join('/');if(lookup.has(key))return lookup.get(key);
   const u=T.MathUtils.clamp(p.clone().sub(a).dot(ab)/l1,0,1),v=T.MathUtils.clamp(p.clone().sub(b).dot(bc)/l2,0,1),du=p.distanceToSquared(a.clone().addScaledVector(ab,u*l1)),dl=p.distanceToSquared(b.clone().addScaledVector(bc,v*l2)),blend=T.MathUtils.smoothstep(dl<du?1+v:u,.72,1.28);
   const upper=p.clone().sub(a).multiplyScalar(source.metadata.sourceScale).applyQuaternion(inverse[0]),lower=p.clone().sub(b).multiplyScalar(source.metadata.sourceScale).applyQuaternion(inverse[1]);upper.y*=.42/(l1*source.metadata.sourceScale);lower.y=lower.y*.42/(l2*source.metadata.sourceScale)-.42;upper.lerp(lower,blend);
   const id=position.length/3;lookup.set(key,id);position.push(...upper.toArray());uv.push((upper.x+.12)/.24,(-.84-upper.y)/.3);lowerWeight.push(T.MathUtils.smoothstep(-upper.y,.29,.55));wristWeight.push(T.MathUtils.smoothstep(-upper.y,.75,.828));return id;
  });for(let j=1;j<ids.length-1;j++)if(new Set([ids[0],ids[j],ids[j+1]]).size===3)index.push(ids[0],ids[j],ids[j+1]);
 }
 const rings=boundaries(position,index);assert.ok(position.length/3>300&&position.every(Number.isFinite));output[key]={position,uv,index,lowerWeight,wristWeight,...rings};for(const name of ['position','uv','lowerWeight','wristWeight'])output[key][name]=output[key][name].map(v=>+v.toFixed(9));
}
output.metadata={license:'CC0-1.0',sources:source.metadata.sources.slice(0,2),rig:weights.metadata,credits:source.metadata.credits,construction:'Original adult female thigh, kneecap, shin and calf radial anatomy. Native quads clipped at the same20%femur plane as the connected body and12mm before source ankle, axial lengths fitted to42cm/42cm. Original two clean source boundaries; thigh root welded to source body and short ankle bridge to retained anatomical feet. Shared-knee quaternion bend; no lathe, knee sphere or independent calf primitive.'};
fs.writeFileSync(new URL('../lib/assets/ghost-legs.json',import.meta.url),JSON.stringify(output)+'\n');console.log(Object.fromEntries(['r','l'].map(s=>[s,{vertices:output[s].position.length/3,triangles:output[s].index.length/3,root:output[s].root.length,ankle:output[s].wrist.length}])));
