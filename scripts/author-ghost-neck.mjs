// node scripts/author-ghost-neck.mjs <pinned-body-directory> <pinned-rig-directory>
// Native connected chest/neck with the original artist's skeletal influences.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {sourceRigWeights} from './source-rig-weights.mjs';
const [dir,rigDir]=process.argv.slice(2);assert.ok(dir);
const read=n=>fs.readFileSync(new URL('../lib/assets/'+n,import.meta.url),'utf8'),headText=read('ghost-head.json'),head=JSON.parse(headText),source=JSON.parse(read('pedestrian-head.json')),hash=s=>crypto.createHash('sha256').update(s).digest('hex'),armText=read('ghost-arms.json'),armAssets=JSON.parse(armText),legText=read('ghost-legs.json'),legAssets=JSON.parse(legText);
const texts=['base.obj','asian-female-young.target'].map(n=>fs.readFileSync(path.join(dir,n),'utf8'));texts.forEach((s,i)=>assert.equal(hash(s),source.metadata.sources[i].sha256));
const base=[],faces=[],neckJoint=new Set();let group='';
for(const line of texts[0].split(/\r?\n/)){const a=line.trim().split(/\s+/);if(a[0]==='v')base.push(new T.Vector3(...a.slice(1,4).map(Number)));if(a[0]==='g')group=a[1];if(a[0]==='f'&&group==='body')faces.push(a.slice(1).map(s=>+s.split('/')[0]-1));if(a[0]==='f'&&group==='joint-neck')a.slice(1).forEach(s=>neckJoint.add(+s.split('/')[0]-1));}
for(const line of texts[1].split(/\r?\n/)){if(!/^\d+\s/.test(line))continue;const [i,x,y,z]=line.split(/\s+/).map(Number);base[i].add(new T.Vector3(x,y,z));}
const weights=sourceRigWeights(rigDir,base.length),toBody=p=>new T.Vector3(p.x*.13,p.y*(p.y<0?.21:.14)-.23,(p.z-.28)*.11),toHead=p=>p.clone().sub(new T.Vector3(...source.metadata.sourceOrigin)).multiplyScalar(source.metadata.sourceScale).multiply(new T.Vector3(1.9,2,1.55)).add(new T.Vector3(0,-.069,-.012));
// Keep the entire native torso and crotch. Terminate each limb within the
// existing limb skin instead of cutting through shoulders at a flat Y band.
const joint=name=>weights.rig.joints[name].reduce((v,i)=>v.add(base[i]),new T.Vector3()).divideScalar(weights.rig.joints[name].length),limb=(first,last)=>{
 const a=joint(weights.rig.bones[first].head),b=joint(weights.rig.bones[last].tail),axis=b.clone().sub(a),length=axis.length();return {a,axis:axis.divideScalar(length),length};
};
const arms={},legs={};for(const side of ['L','R']){arms[side]=limb('upperarm01.'+side,'upperarm02.'+side);legs[side]=limb('upperleg01.'+side,'upperleg02.'+side);}
const cap=(v,limbs,key,along)=>{const bone=limbs[v.p.x>=0?'L':'R'],influence=v[key];const distance=bone.length*along-v.p.clone().sub(bone.a).dot(bone.axis);return key==='leg'||influence>.5?distance:bone.length;};
function fitArm(p,w){
 const body=toBody(p);if(w<=0)return body;const side=p.x>=0?1:-1,bone=arms[side>0?'L':'R'],inverse=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),bone.axis).invert(),bind=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),new T.Vector3(side*.68,-.733212,0).normalize());
 const fitted=p.clone().sub(bone.a).multiplyScalar(source.metadata.sourceScale).applyQuaternion(inverse);fitted.y*=.46/(bone.length*source.metadata.sourceScale);fitted.applyQuaternion(bind).add(new T.Vector3(side*.18,.308,0));return body.lerp(fitted,w);
}
const edges=new Map();for(let k=0;k<head.index.length;k+=3)for(let j=0;j<3;j++){const a=head.index[k+j],b=head.index[k+(j+1)%3],key=[a,b].sort((x,y)=>x-y).join('/');const e=edges.get(key);edges.set(key,{a,b,n:(e?.n??0)+1});}
const headCut=[...new Set([...edges.values()].filter(e=>e.n===1&&head.position[e.a*3+1]<-.1&&head.position[e.b*3+1]<-.1).flatMap(e=>[e.a,e.b]))];assert.equal(headCut.length,52);
const armRoots={},armRings={r:{body:[],arm:[]},l:{body:[],arm:[]}},legRings={r:{body:[],leg:[]},l:{body:[],leg:[]}};
for(const key of ['r','l']){
 const data=armAssets[key],edges=new Map();for(let k=0;k<data.index.length;k+=3)for(let j=0;j<3;j++){const a=data.index[k+j],b=data.index[k+(j+1)%3],id=[a,b].sort((a,b)=>a-b).join('/');edges.set(id,(edges.get(id)??0)+1);}
 armRoots[key]=[...new Set([...edges].filter(([e,n])=>n===1).flatMap(([e])=>e.split('/').map(Number)))].filter(i=>data.position[i*3+1]>-.4);
}
const headScale=new T.Vector3(.67,.68,.68),headRestOrigin=new T.Vector3(0,.502,.00816),position=[],sourcePoint=[],uv=[],faceBlend=[],neckWeight=[],armWeight=[],legWeight=[],legLeftWeight=[],legRightWeight=[],legLocalLeft=[],legLocalRight=[],index=[],sourceFaces=[],lookup=new Map(),headRing=[],neckRing=[];
function clip(poly,distance){
 const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a),db=distance(b);if(da>=-1e-10)out.push(a);if(da*db<0){const t=da/(da-db);out.push({p:a.p.clone().lerp(b.p,t),neck:T.MathUtils.lerp(a.neck,b.neck,t),arm:T.MathUtils.lerp(a.arm,b.arm,t),leg:T.MathUtils.lerp(a.leg,b.leg,t),legLeft:T.MathUtils.lerp(a.legLeft,b.legLeft,t),legRight:T.MathUtils.lerp(a.legRight,b.legRight,t)});}}return out;
}
for(const [sourceFace,face] of faces.entries()){
 let poly=face.map(i=>({p:base[i],neck:weights.neck[i],arm:weights.arm[i],leg:weights.leg[i],legLeft:weights.legLeft[i],legRight:weights.legRight[i]}));
 for(const distance of [v=>4.7-v.p.y,v=>cap(v,arms,'arm',.64),v=>cap(v,legs,'leg',.20)])poly=clip(poly,distance);
 if(poly.length<3)continue;
 const ids=poly.map(({p,neck,arm,leg,legLeft,legRight})=>{
  const key=p.toArray().map(v=>v.toFixed(8)).join('/');if(lookup.has(key))return lookup.get(key);const id=position.length/3;lookup.set(key,id);
  const body=fitArm(p,arm),local=toHead(p),fit=T.MathUtils.smoothstep(body.y,.36,.428),fitted=body.clone().lerp(local.clone().multiply(headScale).add(headRestOrigin),fit);
  if(Math.abs(p.y-4.7)<1e-8){
   let closest=-1,distance=Infinity;for(const h of headCut){const d=local.distanceToSquared(new T.Vector3().fromArray(head.position,h*3));if(d<distance){distance=d;closest=h;}}
   assert.ok(distance<2e-11);assert.ok(!headRing.includes(closest));headRing.push(closest);neckRing.push(id);fitted.fromArray(head.position,closest*3).multiply(headScale).add(headRestOrigin);
  }
  const side=p.x>=0?1:-1,armKey=side>0?'l':'r',bone=arms[side>0?'L':'R'],along=p.clone().sub(bone.a).dot(bone.axis)/bone.length;
  if(arm>.5&&Math.abs(along-.64)<1e-7){
   const local=p.clone().sub(bone.a).multiplyScalar(source.metadata.sourceScale).applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),bone.axis).invert());local.y*=.46/(bone.length*source.metadata.sourceScale);
   const data=armAssets[armKey];let nearest=-1,distance=Infinity;for(const i of armRoots[armKey]){const d=local.distanceToSquared(new T.Vector3().fromArray(data.position,i*3));if(d<distance){distance=d;nearest=i;}}
   assert.ok(distance<2e-12,'native source arm-root correspondence');armRings[armKey].body.push(id);armRings[armKey].arm.push(nearest);
   const bind=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),new T.Vector3(side*.68,-.733212,0).normalize());body.fromArray(data.position,nearest*3).applyQuaternion(bind).add(new T.Vector3(side*.18,.308,0));fitted.copy(body);
  }
  sourcePoint.push(...body.toArray());position.push(...fitted.toArray());neckWeight.push(neck);armWeight.push(arm);legWeight.push(leg);legLeftWeight.push(legLeft);legRightWeight.push(legRight);
  for(const side of ['L','R']){const b=legs[side],local=p.clone().sub(b.a).multiplyScalar(source.metadata.sourceScale).applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),b.axis).invert());local.y*=.42/(b.length*source.metadata.sourceScale);(side==='L'?legLocalLeft:legLocalRight).push(...local.toArray());
   if((p.x>=0?side==='L':side==='R')&&Math.abs(p.clone().sub(b.a).dot(b.axis)/b.length-.20)<1e-7){const key=side==='L'?'l':'r',data=legAssets[key];let nearest=-1,distance=Infinity;for(const i of data.root){const d=local.distanceToSquared(new T.Vector3().fromArray(data.position,i*3));if(d<distance){distance=d;nearest=i;}}assert.ok(distance<2e-12,'native source thigh-root correspondence');legRings[key].body.push(id);legRings[key].leg.push(nearest);}
  }
  const v=local.y<.059?.255+(local.y+.006)*2.31:local.y<.133?.405+(local.y-.059)*3.78:.685+(local.y-.133)*1.5;
  uv.push(.5+local.x*(2.65+.6*T.MathUtils.smoothstep(local.y,0,.12)),v);faceBlend.push(T.MathUtils.smoothstep(local.z,.025,.105));return id;
 });
 for(let j=1;j<ids.length-1;j++)if(new Set([ids[0],ids[j],ids[j+1]]).size===3){index.push(ids[0],ids[j],ids[j+1]);sourceFaces.push(sourceFace);}
}
assert.equal(neckRing.length,52);assert.equal(new Set(headRing).size,52);for(const key of ['r','l']){assert.equal(armRings[key].body.length,armRoots[key].length);assert.equal(new Set(armRings[key].arm).size,armRoots[key].length);assert.equal(legRings[key].body.length,legAssets[key].root.length);assert.equal(new Set(legRings[key].leg).size,legAssets[key].root.length);}
// The cut lies within the cervical chain. Its artist weights are not all 1:
// transfer them onto the retained lower head instead of forcing a rigid seam.
const headTriangles=[];for(const f of faces)if(f.some(i=>base[i].y>=4.65))for(let j=1;j<f.length-1;j++){const ids=[f[0],f[j],f[j+1]];headTriangles.push({triangle:new T.Triangle(...ids.map(i=>base[i])),ids});}
const near=new T.Vector3(),bary=new T.Vector3(),headNeckWeight=[],headArmWeight=[],headSourcePoint=[];
for(let i=0;i<head.position.length;i+=3){
 const raw=new T.Vector3(head.position[i]/1.9,(head.position[i+1]+.069)/2,(head.position[i+2]+.012)/1.55).divideScalar(source.metadata.sourceScale).add(new T.Vector3(...source.metadata.sourceOrigin));
 if(raw.y>=5.6){headSourcePoint.push(...toBody(raw).toArray());headNeckWeight.push(1);headArmWeight.push(0);continue;}
 let best=Infinity,w=1,a=0;for(const {triangle,ids} of headTriangles){triangle.closestPointToPoint(raw,near);const distance=raw.distanceToSquared(near);if(distance<best){best=distance;triangle.getBarycoord(near,bary);w=ids.reduce((s,id,j)=>s+weights.neck[id]*bary.getComponent(j),0);a=ids.reduce((s,id,j)=>s+weights.arm[id]*bary.getComponent(j),0);}}headNeckWeight.push(T.MathUtils.clamp(w,0,1));headArmWeight.push(T.MathUtils.clamp(a,0,1));headSourcePoint.push(...fitArm(raw,T.MathUtils.clamp(a,0,1)).toArray());
}
headRing.forEach((h,i)=>{const n=neckRing[i];headNeckWeight[h]=neckWeight[n];headArmWeight[h]=armWeight[n];headSourcePoint.splice(h*3,3,...sourcePoint.slice(n*3,n*3+3));});
const neckPivot=[...neckJoint].reduce((v,i)=>v.add(toBody(base[i])),new T.Vector3()).divideScalar(neckJoint.size),headPivot=neckPivot.clone().sub(headRestOrigin).divide(headScale);
const out={position,sourcePoint,index,uv,faceBlend,neckWeight,armWeight,legWeight,legLeftWeight,legRightWeight,legLocalLeft,legLocalRight,headNeckWeight,headArmWeight,headSourcePoint,neckPivot:neckPivot.toArray(),headPivot:headPivot.toArray(),headRestOrigin:headRestOrigin.toArray(),headRing,neckRing,armRings,legRings,sourceFaces,metadata:{license:'CC0-1.0',sources:source.metadata.sources.slice(0,2),rig:weights.metadata,headSha256:hash(headText),armSha256:hash(armText),legSha256:hash(legText),credits:source.metadata.credits,construction:'Connected native torso, pelvis/crotch and proximal limbs. Original quads clipped at rawY4.7 and exact original64%humerus roots and exact20%femur caps; torso protected by original non-limb influences. Upper-arm bind fitting matches the existing46cm anatomical arm, retaining its radial shape and stitching its original29.44cm hidden root one-to-one at runtime. Both exact20%femur boundaries weld to original anatomical leg roots. Original52cut-edge identities retained. Original authored cervical/shoulder/left+right thigh influences interpolated with each exact clip; no harmonic fit, nearest cloth weights or triangle offsets. Lower retained head uses the same cervical family so the anatomical seam bends continuously. Symmetric bind fitting and one source cervical pivot shared by head, skin and source-bound clothing.'}};
for(const key of ['position','sourcePoint','uv','faceBlend','neckWeight','armWeight','legWeight','legLeftWeight','legRightWeight','legLocalLeft','legLocalRight','headNeckWeight','headArmWeight','headSourcePoint','neckPivot','headPivot','headRestOrigin'])out[key]=out[key].map(v=>+v.toFixed(9));
fs.writeFileSync(new URL('../lib/assets/ghost-neck.json',import.meta.url),JSON.stringify(out)+'\n');console.log({vertices:position.length/3,triangles:index.length/3,headBoundary:headRing.length,headBlendVertices:headNeckWeight.filter(w=>w<.999).length});
