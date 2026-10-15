// CC0 long01 hair, fitted through its supplied hm08 barycentric bindings.
// node scripts/author-ghost-hair.mjs /path/to/long01 /path/to/base-and-target
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFace,poseFace} from '../lib/ghost-face.ts';
const [hairDir,bodyDir]=process.argv.slice(2);
if(!hairDir||!bodyDir)throw Error('Supply long01 and pinned base/target directories.');
const read=(dir,file)=>fs.readFileSync(path.join(dir,file),'utf8');
const obj=read(hairDir,'long01.obj'),binding=read(hairDir,'long01.mhclo'),body=read(bodyDir,'base.obj'),target=read(bodyDir,'asian-female-young.target');
assert.match(binding,/explicitly released as CC0/);
const source=JSON.parse(fs.readFileSync(new URL('../lib/assets/pedestrian-head.json',import.meta.url)));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
assert.equal(hash(body),source.metadata.sources[0].sha256);assert.equal(hash(target),source.metadata.sources[1].sha256);
const base=body.split(/\r?\n/).filter(s=>s.startsWith('v ')).map(s=>s.split(/\s+/).slice(1,4).map(Number));
for(const line of target.split(/\r?\n/)){if(!/^\d+\s/.test(line))continue;const [i,...delta]=line.split(/\s+/).map(Number);for(let a=0;a<3;a++)base[i][a]+=delta[a];}
const scales=[0,1,2].map(a=>{const line=binding.split(/\r?\n/).find(s=>s.startsWith('xyz'[a]+'_scale ')),[,i,j,d]=line.split(/\s+/);return Math.abs(base[+i][a]-base[+j][a])/+d;});
const weights=binding.split(/\r?\n/).filter(s=>/^\d+\s/.test(s)).map(s=>s.trim().split(/\s+/).map(Number));
const vertices=weights.map(w=>[0,1,2].map(a=>w.slice(0,3).reduce((sum,i,j)=>sum+base[i][a]*w[j+3],0)+w[a+6]*scales[a]));
const scale=source.metadata.sourceScale,origin=source.metadata.sourceOrigin;
for(const v of vertices){v[0]=(v[0]-origin[0])*scale*1.9;v[1]=(v[1]-origin[1])*scale*2-.069;v[2]=(v[2]-origin[2])*scale*1.55-.012;}
// Bind nearby hair to the existing face morph, as a surface-deform authoring
// step. Runtime hair needs no front-only projection over a complete 3D scalp.
const rig=createFace(new T.Group(),new T.MeshStandardMaterial()),skin=rig.face.geometry.attributes.position.array.slice(),skinIndex=rig.face.geometry.index;
poseFace(rig,1);const gape=rig.face.geometry.attributes.position.array,morph=vertices.map(()=>[0,0,0]);
const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),point=new T.Vector3(),closest=new T.Vector3(),best=new T.Vector3(),tri=new T.Triangle(),normal=new T.Vector3(),bary=new T.Vector3();
for(let i=0;i<vertices.length;i++){
 const v=vertices[i];if(v[1]<-.16)continue;point.fromArray(v);let distance=Infinity,selected=[];
 for(let t=0;t<skinIndex.count;t+=3){
  const ids=[skinIndex.getX(t),skinIndex.getX(t+1),skinIndex.getX(t+2)];a.fromArray(skin,ids[0]*3);b.fromArray(skin,ids[1]*3);c.fromArray(skin,ids[2]*3);tri.set(a,b,c).closestPointToPoint(point,closest);
  const d=point.distanceToSquared(closest);if(d<distance){distance=d;best.copy(closest);selected=ids;}
 }
 if(distance>.12**2)continue;
 a.fromArray(skin,selected[0]*3);b.fromArray(skin,selected[1]*3);c.fromArray(skin,selected[2]*3);tri.set(a,b,c);tri.getNormal(normal);tri.getBarycoord(best,bary);
 const signed=point.clone().sub(best).dot(normal);if(signed<.012)point.addScaledVector(normal,.012-signed);vertices[i]=point.toArray();
 const influence=1-T.MathUtils.smoothstep(Math.sqrt(distance),.04,.12);
 morph[i]=[0,1,2].map(axis=>selected.reduce((sum,j,k)=>sum+(gape[j*3+axis]-skin[j*3+axis])*bary.getComponent(k),0)*influence);
}
const uv=[],faces=[];
for(const line of obj.split(/\r?\n/)){
 const a=line.trim().split(/\s+/);
 if(a[0]==='vt')uv.push(a.slice(1,3).map(Number));
 if(a[0]==='f'){const face=a.slice(1).map(s=>s.split('/').map(n=>+n-1));for(let i=1;i<face.length-1;i++)faces.push([face[0],face[i],face[i+1]]);}
}
const neighbours=vertices.map(()=>new Set());for(const f of faces)for(const [a] of f)for(const [b] of f)neighbours[a].add(b);
const seen=new Set(),anchors=new Map();let components=0;
for(let i=0;i<vertices.length;i++){
 if(seen.has(i))continue;const stack=[i],component=[];
 while(stack.length){const j=stack.pop();if(seen.has(j))continue;seen.add(j);component.push(j);stack.push(...[...neighbours[j]].filter(k=>!seen.has(k)));}
 components++;const top=Math.max(...component.map(j=>vertices[j][1])),level=Math.min(-.145,top-.035);
 let roots=component.filter(j=>vertices[j][1]>=level&&vertices[j][1]<=level+.055);
 if(!roots.length)roots=component.filter(j=>vertices[j][1]>top-.035);
 for(const j of component){const p=vertices[j];let closest=roots[0],distance=Infinity;for(const k of roots){const q=vertices[k],d=(p[0]-q[0])**2+(p[2]-q[2])**2;if(d<distance){distance=d;closest=k;}}anchors.set(j,vertices[closest]);}
}
const position=[],texcoord=[],anchor=[],skinDelta=[],index=[],lookup=new Map();
for(const face of faces)for(const [v,t] of face){const key=v+'/'+t;if(!lookup.has(key)){lookup.set(key,position.length/3);position.push(...vertices[v]);texcoord.push(...uv[t]);anchor.push(...anchors.get(v));skinDelta.push(...morph[v]);}index.push(lookup.get(key));}
assert.ok(position.every(Number.isFinite)&&anchor.every(Number.isFinite));
const output={position,uv:texcoord,anchor,skinDelta,index,metadata:{name:'CC0 long01 fitted to existing adult female ghost head',license:'CC0-1.0',sourceURL:'https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip',licenseURL:'https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html',sourceHashes:{obj:hash(obj),binding:hash(binding),base:hash(body),target:hash(target),diffuse:hash(fs.readFileSync(path.join(hairDir,'long01_diffuse.png')))},components,vertices:position.length/3,triangles:index.length/3,credits:['MakeHuman Team','Data Collection AB','Joel Palmius','Jonas Hauquier']}};
for(const key of ['position','uv','anchor','skinDelta'])output[key]=output[key].map(n=>+n.toFixed(7));
fs.writeFileSync(new URL('../lib/assets/ghost-hair.json',import.meta.url),JSON.stringify(output)+'\n');
console.log(JSON.stringify({...output.metadata,bounds:[0,1,2].map(a=>[Math.min(...vertices.map(p=>p[a])),Math.max(...vertices.map(p=>p[a]))])},null,2));
