// node scripts/author-ghost-teeth.mjs <teeth_base-directory> <pinned-base-and-target-directory>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const [dir,bodyDir]=process.argv.slice(2);assert.ok(dir&&bodyDir);
const source=JSON.parse(fs.readFileSync(new URL('../lib/assets/pedestrian-head.json',import.meta.url))),read=(d,n)=>fs.readFileSync(path.join(d,n),'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const obj=read(dir,'teeth_base.obj'),binding=read(dir,'teeth_base.mhclo'),body=read(bodyDir,'base.obj'),target=read(bodyDir,'asian-female-young.target');
assert.match(obj,/explicitly released as CC0/);assert.match(binding,/explicitly released as CC0/);
assert.equal(hash(body),source.metadata.sources[0].sha256);assert.equal(hash(target),source.metadata.sources[1].sha256);
const base=body.split(/\r?\n/).filter(s=>s.startsWith('v ')).map(s=>s.split(/\s+/).slice(1,4).map(Number));
for(const line of target.split(/\r?\n/)){if(!/^\d+\s/.test(line))continue;const [i,...d]=line.split(/\s+/).map(Number);for(let a=0;a<3;a++)base[i][a]+=d[a];}
const scales=[0,1,2].map(a=>{const [,i,j,d]=binding.split(/\r?\n/).find(s=>s.startsWith('xyz'[a]+'_scale ')).split(/\s+/);return Math.abs(base[+i][a]-base[+j][a])/+d;});
const weights=binding.split(/\r?\n/).filter(s=>/^\d+\s/.test(s)&&s.trim().split(/\s+/).length===9).map(s=>s.trim().split(/\s+/).map(Number));
const vertices=weights.map(w=>[0,1,2].map(a=>w.slice(0,3).reduce((sum,i,j)=>sum+base[i][a]*w[j+3],0)+w[a+6]*scales[a]));
const {sourceOrigin:origin,sourceScale:scale}=source.metadata;
for(const p of vertices){p[0]=(p[0]-origin[0])*scale*1.9;p[1]=(p[1]-origin[1])*scale*2-.069;p[2]=(p[2]-origin[2])*scale*1.55-.012;}
const faces=[],uv=[];for(const line of obj.split(/\r?\n/)){
 const a=line.trim().split(/\s+/);if(a[0]==='vt')uv.push(a.slice(1,3).map(Number));
 if(a[0]==='f'){const p=a.slice(1).map(s=>s.split('/').map(v=>+v-1));for(let i=1;i<p.length-1;i++)faces.push([p[0],p[i],p[i+1]]);}
}
const adjacent=vertices.map(()=>new Set());for(const f of faces)for(const [a] of f)for(const [b] of f)adjacent[a].add(b);
const components=[],seen=new Set();for(let i=0;i<vertices.length;i++){
 if(seen.has(i))continue;const ids=[],stack=[i];while(stack.length){const j=stack.pop();if(seen.has(j))continue;seen.add(j);ids.push(j);stack.push(...[...adjacent[j]].filter(k=>!seen.has(k)));}components.push(ids);
}
// The large connected oral lining is replaced by the existing supported
// cavity. The 32 independent source crowns keep incisor, canine and molar form.
const crowns=components.filter(c=>c.length<100);assert.equal(crowns.length,32);
const output={upper:[],lower:[]};
for(const ids of crowns){
 const center=[0,1,2].map(a=>ids.reduce((s,i)=>s+vertices[i][a],0)/ids.length),upper=center[1]>.003+(.145-center[2])*.15,part=upper?'upper':'lower',set=new Set(ids);
 const points=vertices.map(p=>p.slice());for(const i of ids)points[i][1]-=upper?.014:0;
 const min=[0,1,2].map(a=>Math.min(...ids.map(i=>points[i][a]))),max=[0,1,2].map(a=>Math.max(...ids.map(i=>points[i][a]))),anchor=min.map((v,a)=>(v+max[a])*.5),size=min.map((v,a)=>(max[a]-v)*.5);
 const position=[],texcoord=[],index=[],lookup=new Map();
 for(const f of faces){if(!set.has(f[0][0]))continue;for(const [v,t] of f){const key=v+'/'+t;if(!lookup.has(key)){lookup.set(key,position.length/3);position.push(...points[v].map((p,a)=>(p-anchor[a])/size[a]));texcoord.push(...uv[t]);}index.push(lookup.get(key));}}
 output[part].push({position,uv:texcoord,index,anchor,scale:size});
}
for(const part of ['upper','lower']){
 assert.equal(output[part].length,16);const all=output[part].sort((a,b)=>b.anchor[2]-a.anchor[2]),front=all.slice(0,8).sort((a,b)=>a.anchor[0]-b.anchor[0]);output[part]=[...front,...all.slice(8)];
 for(const tooth of output[part])for(const key of ['position','uv','anchor','scale'])tooth[key]=tooth[key].map(v=>+v.toFixed(7));
}
output.metadata={license:'CC0-1.0',sourceURL:'https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip',sourceHashes:{obj:hash(obj),binding:hash(binding),diffuse:hash(fs.readFileSync(path.join(dir,'teeth.png'))),base:hash(body),target:hash(target)},sourceCommit:source.metadata.sourceCommit,credits:source.metadata.credits,construction:'32 authored teeth_base crowns fitted through hm08 bindings to the pinned adult female shape and existing head transform. Source oral lining omitted; crown roots are recessed in the existing posed cavity. Upper arch fixed, lower arch turns with the existing mandible. Normalized per-crown geometry retains original radial/occlusal form and source UVs.'};
fs.writeFileSync(new URL('../lib/assets/ghost-teeth.json',import.meta.url),JSON.stringify(output)+'\n');console.log({upper:output.upper.length,lower:output.lower.length,vertices:[...output.upper,...output.lower].reduce((s,t)=>s+t.position.length/3,0)});
