// Offline fit of WDG's continuous tunic from the official dress01 CC0 pack.
// node scripts/author-ghost-dress.mjs <tunic-dir> <pinned-base-and-target-dir>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {sourceRigWeights} from './source-rig-weights.mjs';
const [assetDir,bodyDir,rigDir]=process.argv.slice(2);
assert.ok(assetDir&&bodyDir&&rigDir,'Supply tunic and pinned body directories');
const read=(dir,file)=>fs.readFileSync(path.join(dir,file),'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const obj=read(assetDir,'mycenaean_tunic.obj'),binding=read(assetDir,'wdg_mycenaean_tunic.mhclo'),body=read(bodyDir,'base.obj'),target=read(bodyDir,'asian-female-young.target');
const pins=JSON.parse(fs.readFileSync(new URL('../lib/assets/pedestrian-head.json',import.meta.url))).metadata.sources;
assert.equal(hash(body),pins[0].sha256);assert.equal(hash(target),pins[1].sha256);
assert.equal(hash(obj),'ae29b7229deda4fb2facf82f9ad8278178bb9cc9a0b8a83e43f778339ad18f9f');
assert.equal(hash(binding),'08cbe26da9933317eea77d34ae1cf781be94896025091d8f14db36a4a4f00c29');
const base=body.split(/\r?\n/).filter(s=>s.startsWith('v ')).map(s=>s.split(/\s+/).slice(1,4).map(Number));
for(const line of target.split(/\r?\n/)){if(!/^\d+\s/.test(line))continue;const [i,...delta]=line.split(/\s+/).map(Number);for(let a=0;a<3;a++)base[i][a]+=delta[a];}
const scales=[0,1,2].map(a=>{const [,i,j,d]=binding.split(/\r?\n/).find(s=>s.startsWith('xyz'[a]+'_scale ')).split(/\s+/);return Math.abs(base[+i][a]-base[+j][a])/+d;});
const entries=binding.split(/\r?\nverts 0\r?\n/)[1].split(/\r?\ndelete_verts/)[0].split(/\r?\n/).filter(s=>/^\d/.test(s)).map(s=>s.trim().split(/\s+/).map(Number));
const source=entries.map(w=>{assert.ok(w.length===1||w.length===9);return w.length===1?base[w[0]].slice():[0,1,2].map(a=>w.slice(0,3).reduce((sum,i,j)=>sum+base[i][a]*w[j+3],0)+w[a+6]*scales[a]);});
const tex=[],quads=[];
for(const line of obj.split(/\r?\n/)){const a=line.trim().split(/\s+/);if(a[0]==='vt')tex.push(a.slice(1,3).map(Number));if(a[0]==='f')quads.push(a.slice(1).map(s=>s.split('/').map(n=>+n-1)));}
const adjacent=source.map(()=>new Set()),edges=new Map();
for(const f of quads)for(let i=0;i<f.length;i++){const a=f[i][0],b=f[(i+1)%f.length][0],key=[Math.min(a,b),Math.max(a,b)].join('/');adjacent[a].add(b);adjacent[b].add(a);const edge=edges.get(key);edges.set(key,{a,b,n:(edge?.n??0)+1});}
const boundary=[...edges.values()].filter(e=>e.n===1).flatMap(e=>[e.a,e.b]),cuffs=new Set(boundary.filter(i=>Math.abs(source[i][0])>2.2)),neck=new Set(boundary.filter(i=>source[i][1]>3.4));
const p=source.map(([x,y,z])=>[x*.13,y*(y<0?.21:.14)-.23,(z-.28)*.11]);
const skeletal=sourceRigWeights(rigDir,base.length),bound=values=>entries.map(w=>{
 const value=w.length===1?values[w[0]]:w.slice(0,3).reduce((sum,i,j)=>sum+values[i]*w[j+3],0);
 // MHCLO position binding permits tiny extrapolation. Skeletal influences
 // remain convex even where that geometric fit extends beyond a body triangle.
 assert.ok(value>=-.001&&value<=1.001);return T.MathUtils.clamp(value,0,1);
});
const weights=bound(skeletal.arm),cervicalWeights=bound(skeletal.neck);
// Extend the source's adult arm direction to the existing deliberately long
// upper-arm rig. Keep the authored shoulder/cuff topology and cloth allowance.
for(let i=0;i<p.length;i++){
 const side=Math.sign(p[i][0])||1,axis=new T.Vector3(side*.68,-.733212,0).normalize(),pivot=new T.Vector3(side*.18,.308,0),v=new T.Vector3(...p[i]).sub(pivot),along=v.dot(axis),radial=v.clone().addScaledVector(axis,-along);
 if(along>0){v.addScaledVector(axis,along*.32*weights[i]);if(radial.length()>.001)v.addScaledVector(radial,.012*weights[i]/radial.length());}
 p[i]=v.add(pivot).toArray();
 const lower=T.MathUtils.smoothstep(-p[i][1],.12,.70);p[i][0]*=1+lower*.18;p[i][2]*=1+lower*.65;
}
const position=[],uv=[],armWeight=[],neckWeight=[],index=[],lookup=new Map();
for(const f of quads)for(let j=1;j<f.length-1;j++)for(const [v,t] of [f[0],f[j],f[j+1]]){
 const key=v+'/'+t;if(!lookup.has(key)){lookup.set(key,position.length/3);position.push(...p[v]);uv.push(...tex[t]);armWeight.push(weights[v]);neckWeight.push(cervicalWeights[v]);}index.push(lookup.get(key));
}
// Preserve the same adult body's actual clavicle/neck skin beneath the newly
// open collar. The rest of the torso remains covered by opaque garment cloth.
const collarEdges=[...edges.values()].filter(e=>e.n===1&&neck.has(e.a)&&neck.has(e.b)),collarLinks=new Map();
for(const {a,b} of collarEdges){collarLinks.set(a,[...(collarLinks.get(a)??[]),b]);collarLinks.set(b,[...(collarLinks.get(b)??[]),a]);}
const collar=[collarEdges[0].a];let previous=-1;
while(collar.length<collarLinks.size){const current=collar.at(-1),next=collarLinks.get(current).find(i=>i!==previous);collar.push(next);previous=current;}
const outline=collar.map(i=>[p[i][0],p[i][2]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const hull=[];for(const points of [outline,outline.slice().reverse()]){const half=[];for(const v of points){while(half.length>1&&cross(half.at(-2),half.at(-1),v)<=0)half.pop();half.push(v);}hull.push(...half.slice(0,-1));}
function clipCollar(polygon){
 for(let i=0;i<hull.length&&polygon.length;i++){
  const a=hull[i],b=hull[(i+1)%hull.length],margin=.005*Math.hypot(b[0]-a[0],b[1]-a[1]);
  const distance=v=>cross(a,b,[v[0],v[2]])+margin,out=[];
  for(let j=0;j<polygon.length;j++){
   const v=polygon[j],w=polygon[(j+1)%polygon.length],dv=distance(v),dw=distance(w);
   if(dv>=0)out.push(v);if((dv>=0)!==(dw>=0)){const t=dv/(dv-dw);out.push(v.map((x,k)=>x+(w[k]-x)*t));}
  }
  polygon=out;
 }
 return polygon;
}
const chest={position:[],uv:[],index:[]},bodyLookup=new Map();let group='';
for(const line of body.split(/\r?\n/)){
 const parts=line.split(/\s+/);if(parts[0]==='g')group=parts[1];if(parts[0]!=='f'||group!=='body')continue;
 const face=parts.slice(1).map(s=>+s.split('/')[0]-1);
 if(!face.every(i=>base[i][1]>=3.2&&base[i][1]<=4.55))continue;
 for(let j=1;j<face.length-1;j++){
  const polygon=clipCollar([face[0],face[j],face[j+1]].map(i=>{const [x,y,z]=base[i];return [x*.13,y*.14-.23,(z-.28)*.11];}));
  const ids=polygon.map(v=>{const key=v.map(n=>Math.round(n*1e7)).join('/');if(!bodyLookup.has(key)){bodyLookup.set(key,chest.position.length/3);chest.position.push(...v);chest.uv.push(.5+v[0]/.13*.1,.5+(v[1]+.23)/.14*.08);}return bodyLookup.get(key);});
  for(let k=1;k<ids.length-1;k++)if(new T.Triangle(...[ids[0],ids[k],ids[k+1]].map(i=>new T.Vector3().fromArray(chest.position,i*3))).getArea()>1e-10)chest.index.push(ids[0],ids[k],ids[k+1]);
 }
}
for(const key of ['position','uv'])chest[key]=chest[key].map(n=>+n.toFixed(7));assert.ok(chest.index.length>0);
assert.equal(source.length,1371);assert.ok(position.every(Number.isFinite)&&armWeight.every(w=>w>=0&&w<=1),JSON.stringify({finite:position.every(Number.isFinite),min:Math.min(...armWeight),max:Math.max(...armWeight)}));
const output={position,uv,armWeight,neckWeight,index,chest,metadata:{name:'WDG Mycenaean Tunic, fitted and extended as the ghost nightdress',author:'WDG; clavicle skin from MakeHuman Team / Data Collection AB / Joel Palmius / Jonas Hauquier',license:'CC0-1.0',licenseBasis:'Official current dress01 pack catalog explicitly lists wdg_mycenaean_tunic as CC0. The original legacy MHCLO header says AGPL3; retained in external source provenance, not rewritten. Body source explicitly released CC0 in September2020.',sourceURL:'https://files2.makehumancommunity.org/asset_packs/dress01/dress01_cc0.zip',licenseURL:'https://static.makehumancommunity.org/assets/assetpacks/dress01.html',sourceHashes:{obj:hash(obj),binding:hash(binding),base:hash(body),target:hash(target)},rig:skeletal.metadata,sourceVertices:source.length,triangles:index.length/3,construction:'Supplied hm08 single/barycentric fit to pinned adult Asian female. Body scale x .13,y .14 above pelvis/.21 below,z .11. Extend upper-arm length32% and12mm cloth ease with original authored skeletal weights transferred through the supplied vertex/barycentric binding; lower skirt gains18% side/65% depth allowance. Original connected garment topology and authored UV seams retained. Clavicle skin excerpt from the same body group: source y3.2..4.55 clipped in XZ to the collar convex aperture plus5mm overlap; boundaries stay beneath opaque clothing.'}};
for(const key of ['position','uv','armWeight','neckWeight'])output[key]=output[key].map(n=>+n.toFixed(7));
fs.writeFileSync(new URL('../lib/assets/ghost-dress.json',import.meta.url),JSON.stringify(output)+'\n');console.log({vertices:position.length/3,triangles:index.length/3,weighted:armWeight.filter(w=>w>.001).length,bounds:[0,1,2].map(a=>[Math.min(...p.map(v=>v[a])),Math.max(...p.map(v=>v[a]))])});
