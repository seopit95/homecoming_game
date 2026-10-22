import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHair,settleHair} from '../lib/ghost-hair.ts';

function fixture(){
 const figure=new T.Group(),head=new T.Group();figure.add(head);head.position.y=1.4;
 const {hair,tails}=createHair(head);return {figure,head,hair,tails,mesh:tails.children[0]};
}

// A return to cards, individual strand meshes, or a thick connected curtain
// must fail on actual topology/width, independently of generator metadata.
test('hair has hundreds of thin closed 3D strands in at most two bounded batches',()=>{
 const {head,mesh}=fixture(),g=mesh.geometry,p=g.attributes.position,ix=g.index;
 let meshes=0,vertices=0;head.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;}});
 assert.ok(meshes<=2,`${meshes} hair draw batches`);assert.ok(vertices<=80000,`${vertices} visible hair vertices`);
 const parent=Array.from({length:p.count},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},edges=new Map();
 for(let i=0;i<ix.count;i+=3){const a=ix.getX(i),b=ix.getX(i+1),c=ix.getX(i+2);parent[find(b)]=find(a);parent[find(c)]=find(a);for(const [u,v] of [[a,b],[b,c],[c,a]]){const key=u<v?`${u},${v}`:`${v},${u}`;edges.set(key,(edges.get(key)??0)+1);}}
 const components=new Map();for(let i=0;i<p.count;i++){const root=find(i);if(!components.has(root))components.set(root,[]);components.get(root).push(i);}
 assert.ok(components.size>=400,`${components.size} independent strands; broad curtains are not strands`);
 assert.ok([...edges.values()].every(n=>n===2),'each strand is a closed tube, including its root and tapered tip');
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let largestTriangle=0;
 for(let i=0;i<ix.count;i+=3){a.fromBufferAttribute(p,ix.getX(i));b.fromBufferAttribute(p,ix.getX(i+1)).sub(a);c.fromBufferAttribute(p,ix.getX(i+2)).sub(a);largestTriangle=Math.max(largestTriangle,b.cross(c).length()/2);}
 assert.ok(largestTriangle<.0008,`a hair surface triangle spans ${largestTriangle}m²`);
 for(const ids of components.values()){
  assert.ok(ids.length>=18&&ids.length<=192,'a curve has enough rings without unbounded subdivisions');
  const at=ids.filter(i=>p.getY(i)<-.3&&p.getY(i)>-.34);
  if(at.length>2){const box=new T.Box3().setFromPoints(at.map(i=>new T.Vector3().fromBufferAttribute(p,i)));assert.ok(Math.hypot(box.max.x-box.min.x,box.max.z-box.min.z)<.045,'a single wet bundle cannot become an opaque plate');}
 }
});

test('layered wet strands give the sides visible volume at passenger camera scale',()=>{
 const {head,tails}=fixture();head.updateMatrixWorld(true);const ray=new T.Raycaster();let covered=0,total=0;
 for(const y of [.18,.20,.22,.24])for(const z of [-.055,-.025,.005,.035,.065,.095]){
  ray.set(new T.Vector3(1,1.4+y,z),new T.Vector3(-1,0,0));total++;
  if(ray.intersectObject(tails,true).some(h=>h.point.x>.18))covered++;
 }
 assert.ok(covered/total>=.50,`only ${covered}/${total} temple rays see actual hair volume`);
});

test('irregular wet fringe leaves visible facial gaps and a central mouth opening',()=>{
 const {head,tails}=fixture();head.updateMatrixWorld(true);const ray=new T.Raycaster();
 const covered=(x,y)=>{ray.set(new T.Vector3(x,y+1.4,1),new T.Vector3(0,0,-1));return ray.intersectObject(tails,true).some(h=>h.point.z>.13);};
 let gaps=0,total=0,fringe=0;
 for(const x of [-.10,-.08,-.06,-.04,-.02,0,.02,.04,.06,.08,.10])for(const y of [.08,.11,.14,.17,.20]){total++;if(!covered(x,y))gaps++;else fringe++;}
 assert.ok(gaps/total>.58,'skin and eyes need real gaps between tubes');assert.ok(fringe>1,'the fringe still crosses part of the forehead and cheek');
 for(const y of [.005,.025,.045])assert.equal(covered(0,y),false,'central mouth silhouette remains visible');
});

test('strand poses retain skull roots, shorten loose seated ends, and freeze deterministically in reused buffers',()=>{
 const {figure,head,tails,mesh}=fixture(),p=mesh.geometry.attributes.position,rest=mesh.userData.rest,buffer=p.array;
 const roots=[];for(let i=0;i<p.count;i++)if(rest[i*3+1]>.27)roots.push(i);
 assert.ok(roots.length>100);const v=new T.Vector3();
 const pose=()=>{settleHair(tails,figure,3,.02);head.updateMatrixWorld(true);return roots.map(i=>head.worldToLocal(v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld)).clone());};
 const before=pose();tails.scale.y=.68;const seated=pose();for(let i=0;i<roots.length;i++)assert.ok(before[i].distanceTo(seated[i])<1e-5,'shortened loose hair cannot move its scalp roots');
 for(const tilt of [.7,1.25]){head.rotation.set(tilt,-.4,.35);settleHair(tails,figure,3,.02);head.updateMatrixWorld(true);
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);assert.ok(Number.isFinite(v.x+v.y+v.z));assert.ok(v.y>=.0199,'hair may touch but cannot cross the supporting floor');}
  const normal=mesh.geometry.attributes.normal,normalBuffer=normal.array,snapshot=buffer.slice();settleHair(tails,figure,3,.02);assert.equal(p.array,buffer);assert.equal(normal.array,normalBuffer);assert.deepEqual(buffer,snapshot);
 }
});
