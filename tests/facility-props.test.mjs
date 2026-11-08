import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld,canStandAt} from '../lib/world.ts';
const ctx={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
// Moving a paper upward, removing its backing, or narrowing the support must fail.
for(const area of ['annex','archive'])test(`${area}: evidence sheets contact a real support across their face`,()=>{
 const world=buildWorld(new T.Scene(),area);world.root.updateMatrixWorld(true);
 try{
  const sheets=world.targets.filter(t=>t.mesh.isMesh&&t.mesh.geometry.type==='PlaneGeometry'&&new T.Vector3(0,0,1).transformDirection(t.mesh.matrixWorld).y>.99);
  assert.ok(sheets.length);
  const meshes=[];world.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const {id,mesh} of sheets)for(const u of [-.4,0,.4])for(const v of [-.4,0,.4]){
   const {width,height}=mesh.geometry.parameters,p=new T.Vector3(width*u,height*v,0).applyMatrix4(mesh.matrixWorld);
   const hit=new T.Raycaster(p.clone().add(new T.Vector3(0,.0001,0)),new T.Vector3(0,-1,0),0,.02).intersectObjects(meshes.filter(m=>m!==mesh),false)[0];
   assert.ok(hit&&hit.distance<=.0011,`${id} unsupported at ${u},${v}: ${hit?.distance??'no support'}m`);
  }
 }finally{disposeWorld(world.root);}
});

// Check the actual batched assemblies; omitted feet, detached pipes and a solid washer
// front would all regress these finite intersections even if object names survived.
for(const area of ['annex','archive','plant','office','parking'])test(`${area}: installed floor assemblies meet the real slab`,()=>{
 const w=buildWorld(new T.Scene(),area);w.root.updateMatrixWorld(true);
 try{
  for(const prop of w.root.children.filter(o=>o.userData.floorProp)){
   const b=new T.Box3().setFromObject(prop);assert.ok(Math.abs(b.min.y)<.001,`${prop.name} bottom ${b.min.y}`);
   const meshes=[];w.root.traverse(o=>{if(o.isMesh&&!prop.getObjectById(o.id))meshes.push(o);});
   const p=b.getCenter(new T.Vector3());p.y=b.min.y+.0001;
   assert.ok(new T.Raycaster(p,new T.Vector3(0,-1,0),0,.0011).intersectObjects(meshes,false).length,`${prop.name} must have a slab below it`);
  }
 }finally{disposeWorld(w.root);}
});

test('annex: washer has a recessed drum and load-bearing plinth, garment shoulders meet hangers connected to rail',()=>{
 const w=buildWorld(new T.Scene(),'annex');w.root.updateMatrixWorld(true);
 try{
  const washer=w.root.getObjectByName('grounded-laundry-machine');assert.ok(washer);
  const p=washer.position;
  const front=new T.Raycaster(new T.Vector3(p.x,.515,p.z+.50),new T.Vector3(0,0,-1),0,1).intersectObject(washer,true);
  assert.ok(front.some(h=>h.point.z<p.z+.1),'drum back must be inset behind the loading door');
  assert.ok(!front.some(h=>h.point.z>p.z+.1&&h.point.z<p.z+.4),'loading opening cannot have a solid box face behind the glass');
  for(const dx of [-.3,.3])for(const y of [.002,.05,.095])assert.ok(new T.Raycaster(new T.Vector3(p.x+dx,y,p.z+.5),new T.Vector3(0,0,-1),0,1).intersectObject(washer,true).length,'foot joins plinth');
  const rail=w.root.getObjectByName('ceiling-fixed-drying-rail');assert.ok(rail);
  // At the actual wire shoulder cross-section, a forward ray hits cloth and wire
  // within its 18 mm physical thickness; then sample the stem and enclosing hook.
  for(let i=0;i<5;i++){
   const x=-13+i*.85;
   const shoulder=new T.Raycaster(new T.Vector3(x+.18,1.96,-5.95),new T.Vector3(0,0,-1),0,.10).intersectObject(rail,true);
   assert.ok(shoulder.length>=2,`garment ${i} has real shoulder contact`);
   for(const y of [2.07,2.13,2.15])assert.ok(new T.Raycaster(new T.Vector3(x-.05,y,-6),new T.Vector3(1,0,0),0,.1).intersectObject(rail,true).length,`hanger ${i} connects to rail at ${y}`);
  }
  for(const x of [-13.8,-8.2])for(const y of [2.2,2.5,2.78])assert.ok(new T.Raycaster(new T.Vector3(x-.03,y,-6),new T.Vector3(1,0,0),0,.06).intersectObject(rail,true).length,'rail fixing reaches ceiling');
 }finally{disposeWorld(w.root);}
});

test('plant: tank feet bridge plinth and curved vessel, pump has connected motor feet and discharge',()=>{
 const w=buildWorld(new T.Scene(),'plant');w.root.updateMatrixWorld(true);
 try{
  const tank=w.root.getObjectByName('grounded-water-tank'),p=tank.position;
  for(const dx of [-.85,.85])for(const dz of [-.65,.65])for(const y of [.10,.15,.22,.28])assert.ok(new T.Raycaster(new T.Vector3(p.x+dx-.15,y,p.z+dz),new T.Vector3(1,0,0),0,.3).intersectObject(tank,true).length,`tank foot lacks support at ${y}`);
  const pump=w.root.getObjectByName('grounded-pump-skid'),q=pump.position;
  for(const y of [.10,.20,.30,.44])assert.ok(new T.Raycaster(new T.Vector3(q.x-.27,y,q.z+.7),new T.Vector3(0,0,-1),0,1.4).intersectObject(pump,true).length,`motor support fails at ${y}`);
  for(const dx of [.10,.13,.16,.19])assert.ok(new T.Raycaster(new T.Vector3(q.x+dx,.45,q.z+.2),new T.Vector3(0,0,-1),0,.4).intersectObject(pump,true).length,'motor coupling meets the pump shaft without a gap');
  for(const y of [.68,.78,.9,.98])assert.ok(new T.Raycaster(new T.Vector3(q.x+.4-.2,y,q.z),new T.Vector3(1,0,0),0,.4).intersectObject(pump,true).length,'pump outlet is continuous');
 }finally{disposeWorld(w.root);}
});

test('plant: pump skids occupy their own service bay rather than intersecting storage tanks',()=>{
 const w=buildWorld(new T.Scene(),'plant');w.root.updateMatrixWorld(true);
 try{
  const equipment=w.root.children.filter(o=>['grounded-water-tank','grounded-pump-skid'].includes(o.name));
  for(let i=0;i<equipment.length;i++)for(let j=i+1;j<equipment.length;j++)assert.ok(!new T.Box3().setFromObject(equipment[i]).intersectsBox(new T.Box3().setFromObject(equipment[j])),`${equipment[i].name} intersects ${equipment[j].name}`);
 }finally{disposeWorld(w.root);}
});

test('archive: shelving leaves every authored pursuer patrol waypoint and leg usable',async()=>{
 const {expansionLayout}=await import('../lib/expansion-world.ts'),{findPath}=await import('../lib/navigation.ts');
 const w=buildWorld(new T.Scene(),'archive'),patrol=expansionLayout.archive.patrol;
 try{for(let i=0;i<patrol.length;i++)assert.ok(findPath(patrol[i],patrol[(i+1)%patrol.length],w.solids,w.bounds,.43).length,`archive patrol segment ${i} must remain usable at pursuer radius`);}
 finally{disposeWorld(w.root);}
});

// Installation bounds include the low pipe return, so neither player nor pursuer
// can walk through visible pipework while all required service approaches survive.
test('parking: pump pipework blocks its installed volume and service approaches remain connected',async()=>{
 const {findPath}=await import('../lib/navigation.ts');const w=buildWorld(new T.Scene(),'parking');
 try{
  assert.equal(canStandAt(-11.55,-17.42,w.solids,.23,w.bounds),false);
  for(const [x,z] of [[-10.8,16.5],[-10.8,2],[10.8,-7],[-10.5,-15.8],[6.6,-17.8],[3.4,-17.8],[0,-20.8]]){
   assert.ok(canStandAt(x,z,w.solids,.43,w.bounds),`service approach ${x},${z}`);assert.ok(findPath(w.spawn,{x,z},w.solids,w.bounds,.43).length,`service path ${x},${z}`);
  }
 }finally{disposeWorld(w.root);}
});
