import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {bed,sofa} from '../lib/props.ts';
import {prepareVisuals,cottonUpholstery as upholstery} from '../lib/materials.ts';
import {buildWorld,disposeWorld,canStandAt} from '../lib/world.ts';
import {animateGhost} from '../lib/ghost.ts';
import {dressApartment} from '../lib/japan.ts';

const wood=new T.MeshStandardMaterial(),linen=new T.MeshStandardMaterial(),cloth=new T.MeshStandardMaterial();
function ray(root,x,z,y=2){root.updateMatrixWorld(true);return new T.Raycaster(new T.Vector3(x,y,z),new T.Vector3(0,-1,0),0,3).intersectObject(root,true)[0];}
// Flat boxed cushions, air below the cloth, inset hanging slabs, an open shell,
// or routing upholstery back through the old atlas must break these conditions.
test('V76 bed pillows are closed inflated cloth volumes with a real mattress contact patch',()=>{
 for(const [w,d,h] of [[2.3,2.5,.715],[2,3.1,.505]]){
  const root=bed(w,d,h,wood,linen,cloth),p=root.getObjectByName('bed-pillow-left');root.updateMatrixWorld(true);
  const c=new T.Box3().setFromObject(p).getCenter(new T.Vector3());
  const centre=ray(p,c.x,c.z).point.y,off=ray(p,c.x+w*.12,c.z+.10).point.y;
  assert.ok(centre-off>.012,'the crown curves into its seam rather than keeping a box top');
  const under=new T.Raycaster(new T.Vector3(c.x,h-.01,c.z),new T.Vector3(0,1,0),0,.03).intersectObject(p,true)[0];
  assert.ok(under&&Math.abs(under.point.y-h)<.0001,'the actual underside touches the existing mattress');
  const geometry=p.geometry,positions=geometry.getAttribute('position'),idx=geometry.index,edges=new Map();
  const key=i=>[positions.getX(i),positions.getY(i),positions.getZ(i)].map(n=>n.toFixed(5)).join(',');
  for(let i=0;i<(idx?.count??positions.count);i+=3){const ids=[0,1,2].map(j=>idx?idx.getX(i+j):i+j);for(let j=0;j<3;j++){const a=key(ids[j]),b=key(ids[(j+1)%3]);if(a===b)continue;const edge=[a,b].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1);}}
  assert.ok([...edges.values()].every(n=>n===2),'the cushion has no open edge or duplicate face');
 }
});
test('V76 the quilt bends continuously over each bed side and its underside rests on the mattress',()=>{
 for(const [w,d,h] of [[2.3,2.5,.715],[2,3.1,.505]]){
  const root=bed(w,d,h,wood,linen,cloth),q=root.getObjectByName('bed-blanket');root.updateMatrixWorld(true);
  const heights=[-.64,-.47,-.23,.04,.25].map(x=>ray(q,x,-d*.17).point.y);
  assert.ok(Math.max(...heights)-Math.min(...heights)>.009,'the upper quilt is not a flat rectangular slab');
  const contact=new T.Raycaster(new T.Vector3(0,h-.01,-d*.17),new T.Vector3(0,1,0),0,.03).intersectObject(q,true)[0];assert.ok(contact&&Math.abs(contact.point.y-h)<.0001);
  for(const side of [-1,1]){
   const hit=new T.Raycaster(new T.Vector3(side*(w/2+.1),h-.17,-d*.17),new T.Vector3(-side,0,0),0,.15).intersectObject(q,true)[0];
   assert.ok(hit&&side*hit.point.x>w/2+.006,'the real hanging cloth clears the wood side rail');
  }
  const b=new T.Box3().setFromObject(q);assert.ok(b.min.y>.15&&b.min.y<h-.20,'the hem hangs above the floor');
 }
});
test('V76 sofa cushions compress smoothly into their supporting seat while retaining human scale',()=>{
 const root=sofa(3.2,1.1,wood,linen),centre=ray(root,0,.1),edge=ray(root,.36,.32);
 assert.ok(centre&&edge);assert.ok(centre.point.y>=.48&&centre.point.y<=.52);
 assert.ok(centre.point.y-edge.point.y>.008,'the cushion must curve towards the edge seam');
 for(const name of ['sofa-pillow-left','sofa-pillow-right']){const p=root.getObjectByName(name),b=new T.Box3().setFromObject(p),c=b.getCenter(new T.Vector3());
  const support=new T.Raycaster(new T.Vector3(c.x,b.min.y+.001,c.z),new T.Vector3(0,-1,0),0,.008).intersectObject(root,true).find(h=>h.object!==p);assert.ok(support,'the loose pillow cannot float over the seat');}
});
test('V76 prepared upholstery owns real cotton channels and disposes them independently',async()=>{
 const original=T.TextureLoader.prototype.loadAsync;T.TextureLoader.prototype.loadAsync=async url=>{const t=new T.Texture();t.name=url;return t;};
 try{await prepareVisuals();const m=upholstery('#69746c'),n=upholstery('#69746c');
  assert.ok(m.normalMap&&m.roughnessMap&&m.aoMap,'photographic cotton channels must replace the atlas');
  assert.equal(m.map.name,'/textures/pbr/cotton-color.jpg');assert.equal(m.map.colorSpace,T.SRGBColorSpace);assert.equal(m.normalMap.colorSpace,T.NoColorSpace);assert.equal(m.roughnessMap.colorSpace,T.NoColorSpace);
  assert.equal(m.onBeforeCompile,T.Material.prototype.onBeforeCompile);assert.equal(m.bumpMap,null);assert.ok(m.normalScale.x>0&&m.normalScale.x<=.3);
  for(const k of ['map','normalMap','roughnessMap']){assert.notEqual(m[k],n[k]);assert.equal(m[k].repeat.x,6);assert.equal(m[k].repeat.y,6);}
  const disposed=new Set();for(const t of [m.map,m.normalMap,m.roughnessMap])t.addEventListener('dispose',()=>disposed.add(t));const root=new T.Group();root.add(new T.Mesh(new T.BoxGeometry(1,1,1),m));disposeWorld(root);assert.equal(disposed.size,3);assert.ok(!disposed.has(n.map));
 }finally{T.TextureLoader.prototype.loadAsync=original;}
});
test('V76 a missing cotton normal rejects preparation and releases unpublished decodes before retry',async()=>{
 const original=T.TextureLoader.prototype.loadAsync,dispose=T.Texture.prototype.dispose,decoded=[],disposed=new Set();let fail=true;
 T.TextureLoader.prototype.loadAsync=async url=>{if(fail&&url==='/textures/pbr/cotton-normal.jpg')throw Error('missing cotton normal');const t=new T.Texture();if(url.startsWith('/textures/'))decoded.push(t);return t;};T.Texture.prototype.dispose=function(){disposed.add(this);dispose.call(this);};
 try{const m=await import('../lib/materials.ts?cotton-retry');await assert.rejects(m.prepareVisuals(),/Visual asset loading failed/);assert.equal(disposed.size,decoded.length);fail=false;await m.prepareVisuals();assert.ok(m.cottonUpholstery('#ffffff').normalMap);}
 finally{T.TextureLoader.prototype.loadAsync=original;T.Texture.prototype.dispose=dispose;}
});
test('V76 normalized-UV curtains retain their material while metre-UV bedding explicitly uses cotton',async()=>{
 const original=T.TextureLoader.prototype.loadAsync;T.TextureLoader.prototype.loadAsync=async url=>{const t=new T.Texture();t.name=url;return t;};
 try{await prepareVisuals();const seed=room('resident');disposeWorld(seed.root);const root=new T.Group();dressApartment(root,'apartment');const curtains=[];root.traverse(m=>{if(m.isMesh&&m.geometry.parameters?.width===.47&&m.geometry.parameters?.height===2.04)curtains.push(m);});assert.equal(curtains.length,4);
  for(const m of curtains){assert.equal(m.material.map.name,'/textures/environment-v3.png','a normalized curtain must not inherit the metre-UV cotton contract');assert.equal(m.material.normalMap,null);}
  for(const [area,name] of [['apartment','home-bed'],['apartment','home-sofa'],['resident','resident-bed']]){const w=room(area);try{let found=0;w.root.getObjectByName(name).traverse(m=>{if(m.isMesh&&m.material.normalMap?.name==='/textures/pbr/cotton-normal.jpg'){assert.equal(m.material.map.repeat.x,6);assert.equal(m.material.map.repeat.y,6);found++;}});assert.ok(found>=3,'the actual new furniture must opt into the correctly scaled material');}finally{disposeWorld(w.root);}}
  disposeWorld(root);
 }finally{T.TextureLoader.prototype.loadAsync=original;}
});
test('V76 pillow piping maps real cloth length and circumference instead of normalized tube UVs',()=>{
 const root=bed(2.3,2.5,.715,wood,linen,cloth),seam=root.getObjectByName('bed-pillow-left').children.find(m=>m.isMesh),g=seam.geometry,p=g.attributes.position,uv=g.attributes.uv,centres=[];
 for(let i=0;i<=128;i++){const c=new T.Vector3();for(let j=0;j<5;j++)c.add(new T.Vector3().fromBufferAttribute(p,i*6+j));centres.push(c.multiplyScalar(.2));}
 let length=0;for(let i=1;i<centres.length;i++)length+=centres[i].distanceTo(centres[i-1]);
 const along=uv.getX(128*6)-uv.getX(0),around=uv.getY(5)-uv.getY(0);
 assert.ok(Math.abs(along*1.8-length)<.01,'the seam must share the surrounding cloth metre-UV contract');
 assert.ok(around*1.8>.008&&around*1.8<.011,'the tiny stitch circumference must not repeat metres of cloth');
});
function room(area){globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};return buildWorld(new T.Scene(),area);}
test('V76 the moved jacket underside contacts the new seat instead of floating over its crown',()=>{
 const w=room('apartment');try{w.root.updateMatrixWorld(true);const sofa=w.root.getObjectByName('home-sofa'),traces=w.root.getObjectByName('apartment-living-traces'),inverse=sofa.matrixWorld.clone().invert(),p=traces.geometry.attributes.position,v=new T.Vector3();let checked=0;
  const normals=traces.geometry.attributes.normal;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(traces.matrixWorld).applyMatrix4(inverse);if(v.y<.44||v.y>.501||normals.getY(i)>-.8||Math.abs(v.x)>.26||Math.abs(v.z-.07)>.27)continue;
   const origin=sofa.localToWorld(v.clone().add(new T.Vector3(0,.002,0))),hit=new T.Raycaster(origin,new T.Vector3(0,-1,0),0,.003).intersectObject(sofa,true)[0];assert.ok(hit,'actual lower jacket vertex lacks seat contact at '+v.toArray());checked++;}
  assert.ok(checked>500,'inspect the actual folded jacket lower surface');
 }finally{disposeWorld(w.root);}
});
function clothTriangles(root){
 const grid=new Map(),step=.16,ray=new T.Ray(),direction=new T.Vector3(),point=new T.Vector3();
 function cells(box,visit){for(let x=Math.floor(box.min.x/step);x<=Math.floor(box.max.x/step);x++)for(let y=Math.floor(box.min.y/step);y<=Math.floor(box.max.y/step);y++)for(let z=Math.floor(box.min.z/step);z<=Math.floor(box.max.z/step);z++)visit(`${x},${y},${z}`);}
 root.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,ix=m.geometry.index;for(let i=0;i<(ix?.count??p.count);i+=3){const tri=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(m.matrixWorld))),box=new T.Box3().setFromPoints([tri.a,tri.b,tri.c]),item={tri,box};cells(box,key=>{const list=grid.get(key)??[];list.push(item);grid.set(key,list);});}});
 function edges(a,b){for(const [v,w] of [[a.a,a.b],[a.b,a.c],[a.c,a.a]]){direction.subVectors(w,v);const length=direction.length();if(length<1e-9)continue;ray.set(v,direction.divideScalar(length));if(ray.intersectTriangle(b.a,b.b,b.c,false,point)&&point.distanceTo(v)<=length-1e-7)return point.clone();}return null;}
 return tri=>{const box=new T.Box3().setFromPoints([tri.a,tri.b,tri.c]),candidates=new Set();cells(box,k=>{for(const item of grid.get(k)??[])candidates.add(item);});for(const item of candidates)if(box.intersectsBox(item.box)){const hit=edges(tri,item.tri)||edges(item.tri,tri);if(hit)return hit.toArray();}return null;};
}
for(const [area,name,poses] of [
 ['apartment','home-bed',[[8.42,6.2,-Math.PI/2],[6.79,4.78,Math.PI]]],
 ['apartment','home-sofa',[[-2.75,3.54,-Math.PI/2],[-2.75,4.05,-Math.PI/2]]],
 ['resident','resident-bed',[[-1.42,-3.0,-Math.PI/2],[-2.9,-1.37,0]]]
])test(`V76 finite actual ${area} body poses clear the changed ${name} cloth`,()=>{
 const w=room(area),f=w.figure;try{w.root.updateMatrixWorld(true);const hit=clothTriangles(w.root.getObjectByName(name));f.visible=true;for(const [x,z,yaw] of poses)for(const phase of [0,2,4]){
  assert.ok(canStandAt(x,z,w.solids,.43,w.bounds),'body sample must be on a real usable floor');f.position.set(x,0,z);f.rotation.y=yaw;animateGhost(f,3,1,.7,false,phase,area==='resident'?1:0,undefined,w.solids);f.updateMatrixWorld(true);let collision;
  f.traverse(m=>{if(collision||!m.isMesh||m.isInstancedMesh)return;for(let o=m;o!==f;o=o.parent)if(!o.visible)return;const p=m.geometry.attributes.position,ix=m.geometry.index;for(let i=0;i<(ix?.count??p.count)&&!collision;i+=3){const tri=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(m.matrixWorld))),at=hit(tri);if(at)collision={at,mesh:m.name||m.parent.name};}});
  assert.equal(collision,undefined,JSON.stringify({x,z,phase,collision}));
 }}finally{disposeWorld(w.root);}
});
