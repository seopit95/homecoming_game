// CC0 anatomical head derivative. Run with Node; no additional authoring dependencies.
import fs from 'node:fs';
import * as T from 'three';
import crypto from 'node:crypto';
const path=new URL('../lib/assets/pedestrian-head.json',import.meta.url),raw=fs.readFileSync(path),source=JSON.parse(raw),vertices=[],lookup=new Map(),remap=[];
for(let i=0;i<source.position.length;i+=3){const p=source.position.slice(i,i+3),key=p.join(',');if(!lookup.has(key)){lookup.set(key,vertices.length);vertices.push(p);}remap.push(lookup.get(key));}
let faces=[];const cut=new Set(vertices.flatMap(([x,y,z],i)=>(x/.035)**2+((y-.032)/.012)**2<1&&z>.095?[i]:[]));
for(let i=0;i<source.index.length;i+=3){const f=source.index.slice(i,i+3).map(j=>remap[j]);if(!f.some(j=>cut.has(j)))faces.push(f);}
// Removing the small oral patch separates the original sealed internal oral
// shell. Retain the complete outside skull; replace only that oral shell.
const adj=new Map();for(const f of faces)for(const a of f){if(!adj.has(a))adj.set(a,new Set());for(const b of f)adj.get(a).add(b);}
const seen=new Set(),components=[];for(const a of adj.keys()){if(seen.has(a))continue;const todo=[a],c=new Set();while(todo.length){const i=todo.pop();if(seen.has(i))continue;seen.add(i);c.add(i);todo.push(...[...adj.get(i)].filter(j=>!seen.has(j)));}components.push(c);}
const outer=components.sort((a,b)=>b.size-a.size)[0];faces=faces.filter(f=>outer.has(f[0]));
const edges=new Map();for(const [a,b,c] of faces)for(const [u,v] of [[a,b],[b,c],[c,a]]){const k=[u,v].sort((a,b)=>a-b).join('/');edges.set(k,{u,v,n:(edges.get(k)?.n??0)+1});}
const ringEdges=[...edges.values()].filter(e=>e.n===1&&vertices[e.u][1]>0),links=new Map();for(const e of ringEdges)for(const [a,b] of [[e.u,e.v],[e.v,e.u]]){if(!links.has(a))links.set(a,[]);links.get(a).push(b);}
let first=[...links.keys()].sort((a,b)=>vertices[b][0]-vertices[a][0])[0],prev=-1,current=first;const border=[];
do{border.push(current);const next=links.get(current).find(i=>i!==prev);prev=current;current=next;}while(current!==first);
let area=0;for(let i=0;i<border.length;i++){const a=vertices[border[i]],b=vertices[border[(i+1)%border.length]];area+=a[0]*b[1]-b[0]*a[1];}if(area<0)border.splice(1,border.length-1,...border.slice(1).reverse());
const angles=new Map(),angle=i=>angles.get(i);
const used=[...outer],map=new Map(used.map((j,i)=>[j,i])),position=used.flatMap(i=>{const [x,y,z]=vertices[i];return [x*1.9,y*2-.069,z*1.55-.012];}),index=faces.flatMap(f=>f.map(i=>map.get(i)));
// Keep the original cervical surface. Its 52 source cut edges are shared with
// the anatomical chest; the obsolete ellipsoid attachment no longer fits it.
const N=64,rows=8,mouthBorder=[];
function lip(a){const c=Math.cos(a),s=Math.sin(a);return [c*.049,-.006+s*.0025,.164-Math.abs(c)*.011];}
const skinCount=position.length/3,neighbours=Array.from({length:skinCount},()=>new Set());for(let k=0;k<index.length;k+=3){const f=index.slice(k,k+3);for(const i of f)for(const j of f)if(i!==j)neighbours[i].add(j);}
function harmonic(fixed){let d=Array.from({length:skinCount},(_,i)=>fixed.get(i)?.slice()??[0,0,0]);for(let iteration=0;iteration<180;iteration++){const next=d.map((v,i)=>fixed.has(i)?v:[0,1,2].map(axis=>[...neighbours[i]].reduce((sum,j)=>sum+d[j][axis],0)/neighbours[i].size));d=next;}return d;}
// Smooth the irregular excision along the source face. A prescribed tall
// ellipse pulls the philtrum/cheeks into straight ridges even at rest.
let oralBorder=border.map(id=>position.slice(map.get(id)*3,map.get(id)*3+3));
for(let pass=0;pass<6;pass++)oralBorder=oralBorder.map((v,i)=>v.map((x,a)=>x*.5+(oralBorder[(i+border.length-1)%border.length][a]+oralBorder[(i+1)%border.length][a])*.25));
// Match polar directions at the slit and its surrounding skin. Arc length on
// the jagged original excision mismatches those directions at the corners.
for(let i=0;i<border.length;i++)angles.set(border[i],(Math.atan2((oralBorder[i][1]+.006)/.03,oralBorder[i][0]/.066)+Math.PI*2)%(Math.PI*2));
const restFixed=new Map();for(let i=0;i<skinCount;i++)if(position[i*3+1]>.044||position[i*3+1]<-.08||position[i*3+2]<.10||Math.abs(position[i*3])>.09)restFixed.set(i,[0,0,0]);
for(let i=0;i<border.length;i++){const k=map.get(border[i]);restFixed.set(k,oralBorder[i].map((v,a)=>v-position[k*3+a]));}
const restDelta=harmonic(restFixed);for(let i=0;i<skinCount;i++)for(let axis=0;axis<3;axis++)position[i*3+axis]+=restDelta[i][axis];
const smooth=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// The mandibular skin follows a rotating jaw. Fade into the fixed posterior
// neck and upper skull; the anterior chin keeps its volume with full weight.
function boundary(a,values=position){let k=border.findIndex(i=>angle(i)>a);if(k<0)k=0;const b=border[k],c=border[(k+border.length-1)%border.length];let hi=angle(b),lo=angle(c);if(hi<lo)hi+=Math.PI*2;if(a<lo)a+=Math.PI*2;const t=(a-lo)/(hi-lo);return [0,1,2].map(j=>values[map.get(c)*3+j]*(1-t)+values[map.get(b)*3+j]*t);}
const skinIndices=index.length,patchStart=position.length/3;
for(let row=0;row<rows;row++)for(let i=0;i<N;i++){const a=i/N*Math.PI*2,l=lip(a),b=boundary(a),t=row/rows;const id=position.length/3;if(row===0)mouthBorder.push(id);position.push(...l.map((v,j)=>v*(1-t)+b[j]*t));if(row>0){const a=patchStart+(row-1)*N+i,b=patchStart+(row-1)*N+(i+1)%N,c=patchStart+row*N+i,d=patchStart+row*N+(i+1)%N;index.push(a,b,c,b,d,c);}}
// Zipper triangulation joins the original irregular boundary to the sampled lip
// annulus without disconnected rings or the old whole-face radial sheet.
const events=[...border.map(i=>({a:angle(i),outer:true,id:map.get(i)})),...Array.from({length:N},(_,i)=>({a:i/N*Math.PI*2,outer:false,id:patchStart+(rows-1)*N+i}))].sort((a,b)=>a.a-b.a);
let out=map.get(border.at(-1)),inside=patchStart+rows*N-1;
for(const e of events){if(e.outer){index.push(inside,e.id,out);out=e.id;}else{index.push(inside,e.id,out);inside=e.id;}}
for(let i=skinIndices;i<index.length;i+=3){const b=index[i+1];index[i+1]=index[i+2];index[i+2]=b;}

const uv=[];for(let i=0;i<position.length;i+=3){const x=position[i],y=position[i+1];const v=y<.059?.255+(y+.006)*2.31:y<.133?.405+(y-.059)*3.78:.685+(y-.133)*1.5;uv.push(.5+x*(2.65+.6*smooth(y,0,.12)),v);}
const jawFixed=new Map();
for(let i=0;i<skinCount;i++){const [,y,z]=position.slice(i*3,i*3+3);if(y>.03||y<-.108||z<.025)jawFixed.set(i,[0,0,0]);else if(y<-.045&&y>-.08&&z>.10)jawFixed.set(i,[1,0,0]);}
for(const id of border)jawFixed.set(map.get(id),[(1-Math.sin(angle(id)))*.5,0,0]);
const skinWeights=harmonic(jawFixed),jawWeights=skinWeights.map(v=>v[0]),weightField=skinWeights.flat();
for(let row=0;row<rows;row++)for(let i=0;i<N;i++){const a=i/N*Math.PI*2,t=row/rows;jawWeights[patchStart+row*N+i]=(1-Math.sin(a))*.5*(1-t)+boundary(a,weightField)[0]*t;}
// Ray/barycentric rasterisation is authoring only, never a runtime portrait mesh.
const width=73,height=99,depth=[];for(let j=0;j<height;j++)for(let i=0;i<width;i++){const x=-.18+i/(width-1)*.36,y=-.12+j/(height-1)*.49;let z=0;for(let k=0;k<index.length;k+=3){const a=index[k]*3,b=index[k+1]*3,c=index[k+2]*3,ax=position[a],ay=position[a+1],bx=position[b],by=position[b+1],cx=position[c],cy=position[c+1],den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<1e-12)continue;const u=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/den,v=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/den;if(u>=0&&v>=0&&u+v<=1)z=Math.max(z,u*position[a+2]+v*position[b+2]+(1-u-v)*position[c+2]);}depth.push(Math.round(z*1e6)/1e6);}
const envelope={width,height,depth};
const scalpGeometry=new T.BufferGeometry();scalpGeometry.setAttribute('position',new T.Float32BufferAttribute(position,3));scalpGeometry.setIndex(index);const scalpMesh=new T.Mesh(scalpGeometry,new T.MeshBasicMaterial({side:T.DoubleSide})),ray=new T.Raycaster(),center=new T.Vector3(0,.12,-.02),direction=new T.Vector3(),scalp=[];
for(let row=0;row<=48;row++)for(let col=0;col<=96;col++){const a=col/96*Math.PI*2+.0001,theta=row/48*2.7;direction.set(Math.cos(a)*Math.sin(theta)*.18,Math.cos(theta)*.24,Math.sin(a)*Math.sin(theta)*.16).normalize();ray.set(center.clone().addScaledVector(direction,1),direction.clone().negate());const hit=ray.intersectObject(scalpMesh)[0];const p=hit?hit.point:center.clone().addScaledVector(direction,.12);p.addScaledVector(direction,.006);scalp.push(...p.toArray());}
// Smooth reduction facets in the hair envelope; the skin remains unmodified.
for(let pass=0;pass<4;pass++){const copy=scalp.slice();for(let row=1;row<48;row++)for(let col=0;col<=96;col++)for(let axis=0;axis<3;axis++){const k=(row*97+col)*3+axis;scalp[k]=(copy[k-97*3]+copy[k]*2+copy[k+97*3])/4;}}
scalpGeometry.dispose();scalpMesh.material.dispose();
const eyes={};for(const [side,eye] of Object.entries(source.eyes))eyes[side]={...eye,position:eye.position.map((v,i)=>i%3===0?v*1.9:i%3===1?v*2-.069:v*1.55-.012),center:eye.center.map((v,i)=>i===0?v*1.9:i===1?v*2-.069:v*1.55-.012)};
const result={position,index,uv,envelope,scalp,jawWeights,mouthBorder,patchStart,patchRows:rows,sourceBoundary:border.map(i=>map.get(i)),eyes,metadata:{license:'CC0-1.0',sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),source:'pedestrian-head.json',sourceMetadata:source.metadata,transform:'x=1.9*x; y=2*y-.069; z=1.55*z-.012',construction:'Weld coincident source vertices. Retain the original cervical surface and shared source cut. Six local boundary smoothing passes with harmonic displacement, retaining the source perioral form; rotating-mandible skin weights; upper skull/lids/nose fixed. Bake triangle-ray forehead and scalp envelopes with seam-safe samples and four smoothing passes. Excise local oral ellipse (x/.035)^2+((y-.032)/.012)^2<1,z>.095; discard disconnected sealed internal mouth shell. Keep full anatomical skull, lids, nose, ears and jaw. Stitch original 32-vertex oral boundary to 64-vertex lip with 8 rings and zipper triangles. Separate source eye meshes retained.'}};
fs.writeFileSync(new URL('../lib/assets/ghost-head.json',import.meta.url),JSON.stringify(result));console.log({vertices:position.length/3,triangles:index.length/3,border:border.length});
