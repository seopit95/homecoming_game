// Fit the official CC0 blouse, bob hair and upper-neck skin to the existing adult head.
// node scripts/author-pedestrian-art.mjs <extracted-system-assets> <pinned-body-dir>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
const [assetDir,bodyDir]=process.argv.slice(2);assert.ok(assetDir&&bodyDir);
const read=(dir,name)=>fs.readFileSync(path.join(dir,name),'utf8'),hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const bodyText=read(bodyDir,'base.obj'),targetText=read(bodyDir,'asian-female-young.target'),head=JSON.parse(fs.readFileSync(new URL('../lib/assets/pedestrian-head.json',import.meta.url)));
assert.equal(hash(bodyText),head.metadata.sources[0].sha256);assert.equal(hash(targetText),head.metadata.sources[1].sha256);
const base=[],bodyUv=[],bodyFaces=[],groups=new Map();let group='';
for(const line of bodyText.split(/\r?\n/)){
 const a=line.trim().split(/\s+/);
 if(a[0]==='v')base.push(a.slice(1,4).map(Number));
 if(a[0]==='vt')bodyUv.push(a.slice(1,3).map(Number));
 if(a[0]==='g'){group=a[1];groups.set(group,[]);}
 if(a[0]==='f'){const f=a.slice(1).map(v=>v.split('/').map(n=>+n-1));groups.get(group)?.push(...f.map(v=>v[0]));if(group==='body')bodyFaces.push(f);}
}
for(const line of targetText.split(/\r?\n/)){if(!/^\d+\s/.test(line))continue;const [i,...d]=line.split(/\s+/).map(Number);for(let a=0;a<3;a++)base[i][a]+=d[a];}
const scale=head.metadata.sourceScale,origin=head.metadata.sourceOrigin;
const local=(p,headLocal=false)=>p.map((v,a)=>(v-origin[a])*scale+(a===1&&!headLocal ? .565 : 0));
const joint=name=>{const ids=[...new Set(groups.get(name))];return local([0,1,2].map(a=>ids.reduce((s,i)=>s+base[i][a],0)/ids.length));};
function fitted(folder,name,headLocal=false){
 const dir=path.join(assetDir,folder),obj=read(dir,name+'.obj'),binding=read(dir,name+'.mhclo');
 assert.match(binding,/explicitly released as CC0/);
 const axisScale=[0,1,2].map(a=>{const [,i,j,d]=binding.split(/\r?\n/).find(l=>l.startsWith('xyz'[a]+'_scale ')).split(/\s+/);return Math.abs(base[+i][a]-base[+j][a])/+d;});
 const entries=binding.split(/\r?\nverts 0\r?\n/)[1].split(/\r?\n(?:delete_verts|vertexboneweights_file)/)[0].split(/\r?\n/).map(l=>l.trim()).filter(l=>/^\d/.test(l)).map(l=>l.split(/\s+/).map(Number));
 const vertices=entries.map(w=>{assert.ok(w.length===1||w.length===9);return local(w.length===1?base[w[0]]:[0,1,2].map(a=>w.slice(0,3).reduce((s,i,j)=>s+base[i][a]*w[j+3],0)+w[a+6]*axisScale[a]),headLocal);});
 const uv=[],faces=[];for(const line of obj.split(/\r?\n/)){const a=line.trim().split(/\s+/);if(a[0]==='vt')uv.push(a.slice(1,3).map(Number));if(a[0]==='f')faces.push(a.slice(1).map(v=>v.split('/').map(n=>+n-1)));}
 return {vertices,uv,faces,hashes:{obj:hash(obj),binding:hash(binding)}};
}
function pack(vertices,uv,faces,extra={}){
 const position=[],tex=[],index=[],source=[],lookup=new Map();
 for(const f of faces)for(let j=1;j<f.length-1;j++)for(const [v,t] of [f[0],f[j],f[j+1]]){
  const key=v+'/'+t;if(!lookup.has(key)){lookup.set(key,position.length/3);position.push(...vertices[v]);tex.push(...uv[t]);source.push(v);}index.push(lookup.get(key));
 }
 assert.ok(position.every(Number.isFinite));
 return {position:position.map(n=>+n.toFixed(7)),uv:tex.map(n=>+n.toFixed(7)),index,...Object.fromEntries(Object.entries(extra).map(([key,values])=>[key,source.map(i=>+values[i].toFixed(7))]))};
}
const blouse=fitted('clothes/female_elegantsuit01','female_elegantsuit01');
const adjacent=blouse.vertices.map(()=>new Set());
for(const f of blouse.faces)for(let i=0;i<f.length;i++){const a=f[i][0],b=f[(i+1)%f.length][0];adjacent[a].add(b);adjacent[b].add(a);}
// The source has a separate skirt. Keep the connected long-sleeve shirt and its collar.
let top=0;for(let i=1;i<blouse.vertices.length;i++)if(blouse.vertices[i][1]>blouse.vertices[top][1])top=i;
const shirtIds=new Set(),stack=[top];while(stack.length){const i=stack.pop();if(shirtIds.has(i))continue;shirtIds.add(i);stack.push(...[...adjacent[i]].filter(j=>!shirtIds.has(j)));}
const faces=blouse.faces.filter(f=>f.every(([i])=>shirtIds.has(i)));
const references=[['r','l'].map(s=>joint('joint-'+s+'-shoulder')),['r','l'].map(s=>joint('joint-'+s+'-elbow')),['r','l'].map(s=>joint('joint-'+s+'-hand'))];
const fixed=new Map();
for(const i of shirtIds){const [x,y]=blouse.vertices[i];if(Math.abs(x)>.27)fixed.set(i,1);else if(Math.abs(x)<.105||y<.18&&Math.abs(x)<.21||y>.49)fixed.set(i,0);}
let armWeight=blouse.vertices.map((_,i)=>fixed.get(i)??.5);
for(let pass=0;pass<100;pass++)armWeight=armWeight.map((w,i)=>!shirtIds.has(i)?0:fixed.get(i)??[...adjacent[i]].reduce((s,j)=>s+armWeight[j],0)/adjacent[i].size);
const lowerWeight=blouse.vertices.map(p=>{
 const side=p[0]<0?0:1,v=new T.Vector3(...p),a=new T.Vector3(...references[0][side]),b=new T.Vector3(...references[1][side]),c=new T.Vector3(...references[2][side]);
 const ab=b.clone().sub(a),bc=c.clone().sub(b),u=T.MathUtils.clamp(v.clone().sub(a).dot(ab)/ab.lengthSq(),0,1),w=T.MathUtils.clamp(v.clone().sub(b).dot(bc)/bc.lengthSq(),0,1);
 const upper=v.distanceToSquared(a.addScaledVector(ab,u)),lower=v.distanceToSquared(b.addScaledVector(bc,w));
 return T.MathUtils.smoothstep(lower<upper?1+w:u,.75,1.25);
});
const shirt=pack(blouse.vertices,blouse.uv,faces,{armWeight,lowerWeight});
const hairSource=fitted('hair/bob02','bob02',true),hair=pack(hairSource.vertices,hairSource.uv,hairSource.faces);
// Clip the actual neck continuously, with 2 mm of overlap inside the head attachment.
function clip(poly,axis,limit,sign){
 const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=(a[axis]-limit)*sign,db=(b[axis]-limit)*sign;if(da>=0)out.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push(a.map((v,k)=>v+(b[k]-v)*t));}}return out;
}
const chestPoints=[],chestUv=[],chestFaces=[],chestLookup=new Map(),topY=.565+head.metadata.neckRingY+.002;
for(const f of bodyFaces){
 let poly=f.map(([i,t])=>[...local(base[i]),...bodyUv[t]]);
 for(const [axis,limit,sign] of [[1,.37,1],[1,topY,-1],[0,-.16,1],[0,.16,-1]])poly=clip(poly,axis,limit,sign);
 if(poly.length<3)continue;
 const ids=poly.map(v=>{const key=v.map(n=>n.toFixed(7)).join('/');if(!chestLookup.has(key)){chestLookup.set(key,chestPoints.length);chestPoints.push(v.slice(0,3));chestUv.push(v.slice(3,5));}const i=chestLookup.get(key);return [i,i];});
 chestFaces.push(ids);
}
const chest=pack(chestPoints,chestUv,chestFaces);
// A clothed anatomical seat joins the blouse to the existing articulated trouser legs.
const seatPoints=[],seatUv=[],seatFaces=[],seatLookup=new Map();
for(const f of bodyFaces){
 let poly=f.map(([i,t])=>[...local(base[i]),...bodyUv[t]]);
 for(const [axis,limit,sign] of [[1,-.18,1],[1,.035,-1],[0,-.23,1],[0,.23,-1]])poly=clip(poly,axis,limit,sign);
 if(poly.length<3)continue;
 const ids=poly.map(v=>{const key=v.map(n=>n.toFixed(7)).join('/');if(!seatLookup.has(key)){seatLookup.set(key,seatPoints.length);seatPoints.push([v[0]*1.015,v[1],v[2]*1.015]);seatUv.push(v.slice(3,5));}const i=seatLookup.get(key);return [i,i];});seatFaces.push(ids);
}
const seat=pack(seatPoints,seatUv,seatFaces);
// Retain the source head's actual face topology and UVs, without the old head-only reduction.
const headPoints=[],headUv=[],headFaces=[],headLookup=new Map();
for(const f of bodyFaces){
 const poly=clip(f.map(([i,t])=>[...local(base[i]),...bodyUv[t]]),1,.565+head.metadata.neckRingY,1);
 if(poly.length<3)continue;
 const ids=poly.map(v=>{const key=v.map(n=>n.toFixed(7)).join('/');if(!headLookup.has(key)){headLookup.set(key,headPoints.length);headPoints.push([v[0],v[1]-.565,v[2]]);headUv.push(v.slice(3,5));}const i=headLookup.get(key);return [i,i];});headFaces.push(ids);
}
const livingHead=pack(headPoints,headUv,headFaces),geometry=new T.BufferGeometry();
geometry.setAttribute('position',new T.Float32BufferAttribute(livingHead.position,3));geometry.setIndex(livingHead.index);geometry.computeVertexNormals();
const normals=geometry.attributes.normal,seams=new Map();
for(let i=0;i<livingHead.position.length/3;i++){const key=livingHead.position.slice(i*3,i*3+3).join('/');seams.set(key,[...(seams.get(key)??[]),i]);}
for(const ids of seams.values()){const n=new T.Vector3();for(const i of ids)n.add(new T.Vector3().fromBufferAttribute(normals,i));n.normalize();for(const i of ids)normals.setXYZ(i,n.x,n.y,n.z);}
livingHead.normal=Array.from(normals.array,n=>+n.toFixed(7));geometry.dispose();
const output={shirt,hair,chest,seat,head:livingHead,references,metadata:{name:'Living adult pedestrian: fitted official long-sleeve blouse and bob02 hair',license:'CC0-1.0',sourceURL:'https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip',licenseURL:'https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html',sourceHashes:{body:hash(bodyText),target:hash(targetText),shirt:blouse.hashes,hair:hairSource.hashes},construction:'Official hm08 bindings to the pinned adult Asian female; original head scale/origin, shirt in torso coordinates, hair in head coordinates. Separate source skirt omitted. Harmonic shoulder weights and forearm weights retain the authored connected collar/bodice/sleeves. Precisely clipped neck overlaps the moving complete source head by2mm; original head topology and UVs, averaged normals at UV seams. A clothed anatomical trouser seat overlaps both blouse and thigh tubes. Only clothed upper chest and head skin retained.',credits:['MakeHuman Team','Data Collection AB','Joel Palmius','Jonas Hauquier']}};
assert.ok(shirt.index.length>0&&hair.index.length>0&&chest.index.length>0);
fs.writeFileSync(new URL('../lib/assets/pedestrian-art.json',import.meta.url),JSON.stringify(output)+'\n');
console.log(JSON.stringify({shirtVertices:shirt.position.length/3,shirtTriangles:shirt.index.length/3,hairVertices:hair.position.length/3,hairTriangles:hair.index.length/3,references,shirtBounds:[0,1,2].map(a=>[Math.min(...shirtIds.values().map(i=>blouse.vertices[i][a])),Math.max(...shirtIds.values().map(i=>blouse.vertices[i][a]))])}));
