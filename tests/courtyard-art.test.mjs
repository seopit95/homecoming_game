import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld,canStandAt} from '../lib/world.ts';
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};

// Moving either clue above its actual worktop breaks this regression, even if
// the target point or support metadata still claims the old contact height.
for(const id of ['court_log','court_evidence'])test(`${id}: actual sheet vertices meet their backing within 1 mm`,()=>{
 const w=buildWorld(new T.Scene(),'courtyard');
 try{
  w.root.updateMatrixWorld(true);
  const sheet=w.targets.find(t=>t.id===id).mesh,meshes=[];
  w.root.traverse(o=>{if(o.isMesh&&o!==sheet&&!w.figure.getObjectById(o.id))meshes.push(o);});
  const positions=sheet.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){
   const p=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(sheet.matrixWorld);
   const hit=new T.Raycaster(p,id==='court_log'?new T.Vector3(0,0,-1):new T.Vector3(0,-1,0),.000001,.1).intersectObjects(meshes,false)[0];
   assert.ok(hit&&hit.distance<=.001,`${id} vertex ${i}: support gap ${hit?.distance??'missing'} m`);
  }
 }finally{disposeWorld(w.root);}
});

test('repair enclosure has visible grounded boundary and clear perimeter crossovers',()=>{
 const w=buildWorld(new T.Scene(),'courtyard');
 try{
  w.root.updateMatrixWorld(true);
  // Foot and panel are actual geometry, not a collider over an empty opening.
  for(const x of [-18,18])for(const z of [-20,0,20]){
   for(const y of [.025,.7,1.3]){
    const hit=new T.Raycaster(new T.Vector3(x+Math.sign(x),y,z),new T.Vector3(-Math.sign(x),0,0),0,1.15).intersectObject(w.root,true)[0];
    assert.ok(hit,`boundary has physical construction at ${x},${y},${z}`);
   }
   assert.equal(canStandAt(x,z,w.solids,.23,w.bounds),false);
  }
  for(const z of [-26,26])for(let x=-25;x<=25;x+=2.5)assert.ok(canStandAt(x,z,w.solids,.23,w.bounds),`crossover ${x},${z}`);
  for(const x of [-21,21])for(let z=-40;z<=40;z+=2)assert.ok(canStandAt(x,z,w.solids,.23,w.bounds),`perimeter ${x},${z}`);
 }finally{disposeWorld(w.root);}
});

test('recovered headlamp pieces have thin sections and physically rest on the bench',()=>{
 const w=buildWorld(new T.Scene(),'courtyard');
 try{
  w.root.updateMatrixWorld(true);
  const lens=w.root.getObjectByName('recovered-headlamp-pieces');
  assert.ok(lens,'recovered pieces are available for actual geometry sampling');
  const meshes=[];w.root.traverse(o=>{if(o.isMesh&&o!==lens&&!w.figure.getObjectById(o.id))meshes.push(o);});
  const p=lens.geometry.getAttribute('position'),bounds=new T.Box3().setFromObject(lens);
  assert.ok(bounds.max.y-bounds.min.y<=.006,'a broken lens has a thin section');
  let checked=0;
  for(let i=0;i<p.count;i++){
   const point=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(lens.matrixWorld);
   if(point.y>bounds.min.y+.00001)continue;
   point.y+=.0001;
   const hit=new T.Raycaster(point,new T.Vector3(0,-1,0),0,.01).intersectObjects(meshes,false)[0];
   assert.ok(hit&&Math.abs(hit.distance-.0001)<=.001,`lens underside ${i} contacts its bench`);checked++;
  }
  assert.ok(checked>=21);
 }finally{disposeWorld(w.root);}
});

test('booth desks, chairs and repair-stock pallets have continuous physical supports',()=>{
 const w=buildWorld(new T.Scene(),'courtyard');
 try{
  w.root.updateMatrixWorld(true);
  // Cross-sections through the legs test actual batched triangles. Removing a
  // leg or moving its seat clear of it must fail, regardless of prop metadata.
  for(const x of [-25,25])for(const dx of [-1,1])for(const dz of [-.3,.3]){
   for(let y=.015;y<.68;y+=.025){
    const hit=new T.Raycaster(new T.Vector3(x+dx-.1,y,30+dz),new T.Vector3(1,0,0),0,.2).intersectObject(w.root,true)[0];
    assert.ok(hit,`booth desk leg at ${x+dx},${y},${30+dz}`);
   }
   // Above the leg the horizontal origin is inside the broad tabletop. A
   // downward ray instead checks the joint, with the same 1 mm contact limit.
   const joint=new T.Raycaster(new T.Vector3(x+dx,.6905,30+dz),new T.Vector3(0,-1,0),0,.01).intersectObject(w.root,true)[0];
   assert.ok(joint&&joint.distance<=.001,`desk underside meets leg at ${x+dx},${30+dz}`);
  }
  for(const x of [-25,25])for(const dx of [-.25,.25])for(const dz of [-.25,.25])for(let y=.015;y<.43;y+=.025){
   const hit=new T.Raycaster(new T.Vector3(x+dx-.08,y,28.7+dz),new T.Vector3(1,0,0),0,.16).intersectObject(w.root,true)[0];
   assert.ok(hit,`booth chair leg at ${x+dx},${y},${28.7+dz}`);
  }
  for(const [x,z] of [[-13,18],[12,17],[-12,-17]])for(const dz of [-.7,.7])for(let y=.01;y<.18;y+=.02){
   const hit=new T.Raycaster(new T.Vector3(x,y,z+dz-.2),new T.Vector3(0,0,1),0,.4).intersectObject(w.root,true)[0];
   assert.ok(hit,`pallet support at ${x},${y},${z+dz}`);
  }
 }finally{disposeWorld(w.root);}
});
