import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld,canStandAt} from '../lib/world.ts';
import {findPath} from '../lib/navigation.ts';
import {initialStory,transition,checkpoint} from '../lib/story.ts';
import {investigation} from '../lib/investigation.ts';
import {animateGhost} from '../lib/ghost.ts';

globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
function world(area){const w=buildWorld(new T.Scene(),area);w.root.updateMatrixWorld(true);return w;}
// Detached upper units, a sink covered by a solid worktop, or a rotated installation
// whose collider stays behind must break these physical installation contracts.
test('V99 both installed kitchens have real wall backing and a recessed usable sink',()=>{
 for(const area of ['apartment','resident']){const w=world(area);try{
  const k=w.root.getObjectByName(`${area}-kitchen`);assert.ok(k,'replace the disconnected kitchen blocks as one installed assembly');
  const back=k.getObjectByName('kitchen-backsplash'),upper=k.getObjectByName('kitchen-upper-units');assert.ok(back&&upper);
  const local=new T.Vector3(0,1.9,-.446),origin=k.localToWorld(local),direction=k.localToWorld(new T.Vector3(0,1.9,-1)).sub(origin).normalize();
  const hits=new T.Raycaster(origin,direction,0,.04).intersectObject(w.root,true).filter(h=>!k.getObjectById(h.object.id));
  assert.ok(hits.length,'upper cabinet rear must meet actual architecture, including the rotated resident kitchen');
  const basin=k.getObjectByName('recessed-steel-sink');assert.ok(basin);
  const centre=basin.getWorldPosition(new T.Vector3()),down=new T.Raycaster(centre.clone().add(new T.Vector3(0,.02,0)),new T.Vector3(0,-1,0),0,.4).intersectObject(k,true)[0];
  assert.ok(down&&down.point.y<centre.y-.12,'the bowl opening must not be sealed by a cabinet roof or countertop');
  let meshes=0;k.traverse(m=>{if(m.isMesh)meshes++;});assert.ok(meshes<=24,'small metalwork must batch, rather than add hundreds of room draw calls');
 }finally{disposeWorld(w.root);}}
});
test('V99 refrigerator feet and new dining chairs touch the floor; table clutter is supported',()=>{
 for(const area of ['apartment','resident']){const w=world(area);try{
  const fridge=w.root.getObjectByName(`${area}-refrigerator`);assert.ok(fridge);const feet=fridge.getObjectByName('refrigerator-feet');assert.ok(feet);
  assert.ok(Math.abs(new T.Box3().setFromObject(feet).min.y)<.0001);
  const k=w.root.getObjectByName(`${area}-kitchen`),rack=k.getObjectByName('kitchen-draining-rack');assert.ok(rack);
  const b=new T.Box3().setFromObject(rack),c=b.getCenter(new T.Vector3());
  const hit=new T.Raycaster(new T.Vector3(c.x,b.min.y+.001,c.z),new T.Vector3(0,-1,0),0,.015).intersectObject(k,true).find(h=>!rack.getObjectById(h.object.id));assert.ok(hit,'rack rubber feet must contact the counter');
  if(area==='apartment'){
   const dining=w.root.getObjectByName('home-dining-set');assert.ok(dining);const chairs=dining.children.filter(o=>o.name==='dining-chair');assert.equal(chairs.length,4);
   for(const chair of chairs)assert.ok(Math.abs(new T.Box3().setFromObject(chair).min.y)<.0001);
   const note=w.targets.find(t=>t.id==='home_repair');assert.ok(note);const p=note.point;
   assert.ok(new T.Raycaster(new T.Vector3(p.x,p.y-.001,p.z),new T.Vector3(0,-1,0),0,.012).intersectObject(dining,true).length,'repair estimate rests on the actual dining table');
  }
 }finally{disposeWorld(w.root);}}
});
test('V99 remodeled occupied footprints preserve investigation and pursuit approaches',()=>{
 for(const [area,start,ends] of [
  ['apartment',{x:0,z:4},[{x:-5.2,z:-1.65},{x:-5.94,z:5.75}]],
  ['resident',{x:0,z:4.9},[{x:3.1,z:4.3},{x:3,z:-3.1},{x:0,z:-4.8}]]
 ]){const w=world(area);try{
  for(const r of [.23,.43])for(const end of ends){assert.ok(canStandAt(end.x,end.z,w.solids,r,w.bounds),`${area} ${r} destination is occupied`);assert.ok(findPath(start,end,w.solids,w.bounds,r).length,`${area} route blocked`);}
  const k=w.root.getObjectByName(`${area}-kitchen`),front=k.localToWorld(new T.Vector3(0,0,.2));assert.equal(canStandAt(front.x,front.z,w.solids,.23,w.bounds),false,'new kitchen cannot be walked through');
 }finally{disposeWorld(w.root);}}
});
test('V99 optional repair estimate is earned, retained and never advances the home mission or reveals later evidence',()=>{
 const s={...initialStory(),stage:'power',notes:['wake']},next=transition(s,'home_repair');assert.ok(next.notes.includes('home_repair'));assert.equal(next.stage,'power');assert.equal(transition(next,'home_repair'),next);
 assert.ok(checkpoint(next).notes.includes('home_repair'));const before=investigation(s),after=investigation(next);
 assert.ok(!before.sections.some(x=>x.records.some(r=>r.id==='home_repair')));assert.ok(after.sections.find(x=>x.id==='home')?.records.some(r=>r.id==='home_repair'));
 assert.equal(after.timeline.length,before.timeline.length);assert.equal(after.pattern,null);assert.equal(transition(initialStory(),'home_repair').notes.includes('home_repair'),false);
});
test('V99 no base-unit partition pierces the actual sink bowl',()=>{
 for(const area of ['apartment','resident']){const w=world(area);try{const k=w.root.getObjectByName(`${area}-kitchen`),basin=k.getObjectByName('recessed-steel-sink'),inverse=basin.matrixWorld.clone().invert();
  for(const x of [-.18,-.08,0,.08,.18])for(const z of [-.08,0,.08]){
   const origin=basin.localToWorld(new T.Vector3(x,.05,z)),hit=new T.Raycaster(origin,new T.Vector3(0,-1,0),0,.4).intersectObject(k,true)[0];
   assert.ok(hit&&hit.point.clone().applyMatrix4(inverse).y<-.04,`${area} divider seals bowl at ${x},${z}`);
  }
 }finally{disposeWorld(w.root);}}
});
test('V99 replacement timer keeps its visible dial at the usable target and rests on the table',()=>{
 const w=world('apartment');try{const timer=w.root.getObjectByName('home-mechanical-timer'),b=new T.Box3().setFromObject(timer),target=w.targets.find(t=>t.id==='lure');assert.ok(timer&&target);
  assert.ok(Math.abs(b.min.y-.82)<.0001);assert.ok(b.max.x-b.min.x<.15,'mechanical timer must stay palm sized');assert.ok(b.distanceToPoint(target.point)<.002,'interaction point follows the visible dial rather than its removed predecessor');
 }finally{disposeWorld(w.root);}
});
test('V99 countertop cutout clears the oval sink edge rather than leaving a white shelf in the bowl',()=>{
 for(const [area,name,width,depth] of [['apartment','apartment-kitchen',.71,.49],['resident','resident-kitchen',.71,.49],['office','office-retained-kitchen',.55,.4]]){const w=world(area);try{const k=w.root.getObjectByName(name),basin=k.getObjectByName('recessed-steel-sink');
  for(const [x,z] of [[0,-depth*.476],[0,depth*.476],[-width*.479,0],[width*.479,0]]){const origin=basin.localToWorld(new T.Vector3(x,.04,z)),hit=new T.Raycaster(origin,new T.Vector3(0,-1,0),0,.3).intersectObject(k,true)[0];assert.ok(hit&&hit.point.y<origin.y-.046,`${area}: a shared rectangular cutout cannot project into the oval bowl`);}
 }finally{disposeWorld(w.root);}}
});
// The occupied footprints are conservative, but actual long limbs must also
// clear these new installations in the game's existing walk/crawl poses.
function surfaceIntersections(root){
 const grid=new Map(),step=.18,ray=new T.Ray(),direction=new T.Vector3(),point=new T.Vector3();
 function cells(b,visit){for(let x=Math.floor(b.min.x/step);x<=Math.floor(b.max.x/step);x++)for(let y=Math.floor(b.min.y/step);y<=Math.floor(b.max.y/step);y++)for(let z=Math.floor(b.min.z/step);z<=Math.floor(b.max.z/step);z++)visit(`${x},${y},${z}`);}
 root.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,ix=m.geometry.index;for(let i=0;i<(ix?.count??p.count);i+=3){const tri=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(m.matrixWorld))),b=new T.Box3().setFromPoints([tri.a,tri.b,tri.c]),item={tri,b};cells(b,key=>{const list=grid.get(key)??[];list.push(item);grid.set(key,list);});}});
 function edges(a,b){for(const [v,w] of [[a.a,a.b],[a.b,a.c],[a.c,a.a]]){direction.subVectors(w,v);const length=direction.length();if(length<1e-9)continue;ray.set(v,direction.divideScalar(length));if(ray.intersectTriangle(b.a,b.b,b.c,false,point)&&point.distanceTo(v)<length-1e-7)return point.clone();}return null;}
 return tri=>{const b=new T.Box3().setFromPoints([tri.a,tri.b,tri.c]),candidates=new Set();cells(b,k=>{for(const item of grid.get(k)??[])candidates.add(item);});for(const item of candidates)if(b.intersectsBox(item.b)){const hit=edges(tri,item.tri)||edges(item.tri,tri);if(hit)return hit.toArray();}return null;};
}
test('V99 finite original walk/crawl poses clear newly installed kitchen, fridge and dining surfaces',()=>{
 for(const [area,name,positions] of [
  ['apartment','apartment-kitchen',[[-6.36,-1.65,Math.PI],[-5.2,-1.65,Math.PI]]],
  ['apartment','home-dining-set',[[-5.94,5.75,0]]],
  ['resident','resident-kitchen',[[3.1,1.85,-Math.PI/2]]],
  ['resident','resident-refrigerator',[[3.1,4.3,-Math.PI/2]]],
 ]){const w=world(area);try{const f=w.figure,hit=surfaceIntersections(w.root.getObjectByName(name));f.visible=true;
  for(const [x,z,yaw] of positions)for(const phase of [0,2,4]){assert.ok(canStandAt(x,z,w.solids,.43,w.bounds));f.position.set(x,0,z);f.rotation.y=yaw;animateGhost(f,3,1,.7,false,phase,area==='resident'?1:0,undefined,w.solids);f.updateMatrixWorld(true);let collision;
   f.traverse(m=>{if(collision||!m.isMesh||m.isInstancedMesh)return;for(let o=m;o!==f;o=o.parent)if(!o.visible)return;const p=m.geometry.attributes.position,ix=m.geometry.index;for(let i=0;i<(ix?.count??p.count)&&!collision;i+=3){const tri=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(m.matrixWorld))),at=hit(tri);if(at)collision={at,mesh:m.name||m.parent.name};}});assert.equal(collision,undefined,JSON.stringify({area,name,x,z,phase,collision}));
  }
 }finally{disposeWorld(w.root);}}
});
