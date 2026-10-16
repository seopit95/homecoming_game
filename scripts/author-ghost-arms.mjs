// node scripts/author-ghost-arms.mjs <pinned-base-and-target-directory>
// Retain the source elbow, ulna and forearm volume; lengthen the bone axes only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
const dir=process.argv[2];assert.ok(dir);
const head=JSON.parse(fs.readFileSync(new URL('../lib/assets/pedestrian-head.json',import.meta.url))),base=[],groups=new Map(),faces=[];let group='';
const texts=['base.obj','asian-female-young.target'].map(name=>fs.readFileSync(path.join(dir,name),'utf8'));
texts.forEach((s,i)=>assert.equal(crypto.createHash('sha256').update(s).digest('hex'),head.metadata.sources[i].sha256));
for(const line of texts[0].split(/\r?\n/)){
 const a=line.trim().split(/\s+/);
 if(a[0]==='v')base.push(a.slice(1,4).map(Number));
 if(a[0]==='g'){group=a[1];groups.set(group,new Set());}
 if(a[0]==='f'){const f=a.slice(1).map(s=>+s.split('/')[0]-1);f.forEach(i=>groups.get(group).add(i));if(group==='body')faces.push(f);}
}
for(const line of texts[1].split(/\r?\n/)){if(!/^\d+\s/.test(line))continue;const [i,...d]=line.split(/\s+/).map(Number);for(let a=0;a<3;a++)base[i][a]+=d[a];}
const source=base.map(p=>new T.Vector3(...p).multiplyScalar(head.metadata.sourceScale));
const joint=name=>{const ids=[...groups.get(name)];return ids.reduce((p,i)=>p.add(source[i]),new T.Vector3()).divideScalar(ids.length);};
function clip(poly,distance){
 const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a),db=distance(b);if(da>=-1e-10)out.push(a);if(da*db<0)out.push(a.clone().lerp(b,da/(da-db)));}return out;
}
function boundary(position,index){
 const edges=new Map();for(let i=0;i<index.length;i+=3)for(let j=0;j<3;j++){const a=index[i+j],b=index[i+(j+1)%3],key=a<b?`${a}/${b}`:`${b}/${a}`;if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}
 const adjacent=new Map();for(const [a,b] of edges.values()){adjacent.set(a,[...(adjacent.get(a)??[]),b]);adjacent.set(b,[...(adjacent.get(b)??[]),a]);}
 assert.ok([...adjacent.values()].every(a=>a.length===2),'source limb must have clean closed boundaries');
 const loops=[];while(adjacent.size){const start=adjacent.keys().next().value,loop=[start];let prior=-1;
  while(true){const current=loop.at(-1),next=adjacent.get(current).find(i=>i!==prior);adjacent.delete(current);if(next===start)break;loop.push(next);prior=current;}
  loops.push(loop);
 }assert.equal(loops.length,2,'only sleeve root and wrist may be open: '+JSON.stringify(loops.map(ids=>({vertices:ids.length,center:[0,1,2].map(a=>ids.reduce((s,i)=>s+position[i*3+a],0)/ids.length)}))));
 const wrist=loops.sort((a,b)=>a.reduce((s,i)=>s+position[i*3+1],0)/a.length-b.reduce((s,i)=>s+position[i*3+1],0)/b.length)[0];
 // Consistent x/z winding and start allow a short, untwisted bridge to the hand.
 const area=wrist.reduce((s,a,i)=>{const b=wrist[(i+1)%wrist.length];return s+position[a*3]*position[b*3+2]-position[b*3]*position[a*3+2];},0);if(area<0)wrist.reverse();
 const start=wrist.reduce((best,i,j)=>position[i*3]>position[wrist[best]*3]?j:best,0);return [...wrist.slice(start),...wrist.slice(0,start)];
}
const output={};
for(const [side,name] of [[-1,'r'],[1,'l']]){
 const a=joint(`joint-${name}-shoulder`),b=joint(`joint-${name}-elbow`),c=joint(`joint-${name}-hand`),ab=b.clone().sub(a),bc=c.clone().sub(b),l1=ab.length(),l2=bc.length();ab.normalize();bc.normalize();
 const inverse=[ab,bc].map(axis=>new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),axis).invert());
 const position=[],lowerWeight=[],wristWeight=[],uv=[],index=[],lookup=new Map(),segments=[new T.Line3(a,b),new T.Line3(b,c)],near=new T.Vector3();
 for(const face of faces){
  // The side plane also cuts a separate patch of the hip. It is outside both
  // arm segments; discard that distant component before clipping the limb.
  if(face.every(i=>segments.every(line=>line.closestPointToPoint(source[i],true,near).distanceTo(source[i])>.095)))continue;
  let poly=face.map(i=>source[i]);
  // The opaque sleeve ends around36cm from the shoulder. Start hidden skin
  // at29cm, leaving an overlap without an exposed cut near the armpit.
  poly=clip(poly,p=>p.clone().sub(a).dot(ab)-l1*.64);
  poly=clip(poly,p=>side*(p.x-a.x)-.025);
  poly=clip(poly,p=>-p.clone().sub(c).dot(bc)-.012);
  if(poly.length<3)continue;
  const ids=poly.map(p=>{
   const key=p.toArray().map(v=>v.toFixed(7)).join('/');if(lookup.has(key))return lookup.get(key);
   const u=T.MathUtils.clamp(p.clone().sub(a).dot(ab)/l1,0,1),v=T.MathUtils.clamp(p.clone().sub(b).dot(bc)/l2,0,1);
   const nearUpper=p.distanceToSquared(a.clone().addScaledVector(ab,u*l1)),nearLower=p.distanceToSquared(b.clone().addScaledVector(bc,v*l2));
   const w=T.MathUtils.smoothstep(nearLower<nearUpper?1+v:u,.72,1.28);
   const upper=p.clone().sub(a).applyQuaternion(inverse[0]),lower=p.clone().sub(b).applyQuaternion(inverse[1]);upper.y*=.46/l1;lower.y=lower.y*.49/l2-.46;upper.lerp(lower,w);
   const id=position.length/3;lookup.set(key,id);position.push(...upper.toArray());lowerWeight.push(T.MathUtils.smoothstep(-upper.y,.30,.62));wristWeight.push(T.MathUtils.smoothstep(-upper.y,.85,.93));uv.push((upper.x+.12)/.24,(-.935-upper.y)/.3);return id;
  });for(let j=1;j<ids.length-1;j++)if(new Set([ids[0],ids[j],ids[j+1]]).size===3)index.push(ids[0],ids[j],ids[j+1]);
 }
 const wrist=boundary(position,index);assert.ok(position.length/3>100&&position.every(Number.isFinite));
 output[name]={position:position.map(n=>+n.toFixed(7)),uv:uv.map(n=>+n.toFixed(7)),index,lowerWeight:lowerWeight.map(n=>+n.toFixed(7)),wristWeight:wristWeight.map(n=>+n.toFixed(7)),wrist};
}
output.metadata={license:'CC0-1.0',sources:head.metadata.sources.slice(0,2),sourceCommit:head.metadata.sourceCommit,credits:head.metadata.credits,construction:'Adult female source arm surfaces clipped beneath the sleeve and12mm before the source wrist. Original anatomical radial shape retained, only longitudinal axes fitted to46cm/49cm horror rig. Continuous native source topology, two open boundaries. Bone and wrist weights baked once; live hand boundary is stitched at runtime. Source torso and hands excluded.'};
fs.writeFileSync(new URL('../lib/assets/ghost-arms.json',import.meta.url),JSON.stringify(output)+'\n');
console.log(JSON.stringify(Object.fromEntries(['r','l'].map(s=>[s,{vertices:output[s].position.length/3,triangles:output[s].index.length/3,wrist:output[s].wrist.length}]))));
