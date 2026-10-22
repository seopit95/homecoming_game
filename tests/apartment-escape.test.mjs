import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildApartmentEscape,apartmentEscapeLayout} from '../lib/apartment-escape.ts';
import {canStandAt,hasLineOfSight,disposeWorld} from '../lib/world.ts';
import {findPath} from '../lib/navigation.ts';

const context={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const expected={annex:['annex_map','annex_badge','annex_exit'],archive:['archive_ledger','archive_road','archive_call','archive_gate','archive_play','archive_exit'],plant:['plant_exit']};
function build(area){const root=new T.Group();return {root,...buildApartmentEscape(root,area)};}
function close(w){disposeWorld(w.root);}

for(const area of Object.keys(expected))test(`V126 ${area}: small apartment stations are visible, supported and reachable by player and follower`,()=>{
 const w=build(area);try{
  assert.deepEqual(w.targets.map(t=>t.id).sort(),expected[area].toSorted());
  assert.ok(apartmentEscapeLayout[area].x<=6&&apartmentEscapeLayout[area].z<=9);
  assert.deepEqual(w.spawn.toArray(),[0,1.65,apartmentEscapeLayout[area].z-3]);
  for(const r of [.23,.43])for(const t of w.targets){
   const a=t.mesh.userData.approach;assert.ok(a,`${t.id} authors a standing side`);
   assert.ok(canStandAt(a.x,a.z,w.solids,r,w.bounds),`${t.id} standing clearance r=${r}`);
   assert.ok(findPath(w.spawn,a,w.solids,w.bounds,r).length,`${t.id} route r=${r}`);
   const eye={x:a.x,y:w.heightAt(a.x,a.z)+1.65,z:a.z};
   assert.ok(hasLineOfSight(eye,t.point,w.solids),`${t.id} clear view`);
   assert.ok(new T.Vector3(eye.x,eye.y,eye.z).distanceTo(t.point)<2.3,`${t.id} is within use distance`);
  }
  const figure=w.figure.position;
  assert.equal(w.figure.visible,false,'the room never starts a pursuit itself');
  assert.equal(hasLineOfSight(w.spawn,{x:figure.x,y:.7,z:figure.z},w.solids),false,'incoming turns hide the waiting follower');
  assert.ok(findPath(figure,w.spawn,w.solids,w.bounds,.43).length,'waiting follower can emerge');
 }finally{close(w);}
});

test('V126 management key, records and CRT physically meet their supporting desks',()=>{
 for(const area of ['annex','archive']){const w=build(area);try{
  w.root.updateMatrixWorld(true);
  const props=area==='annex'?['annex-management-key','annex-duty-ledger']:['archive-record-road','archive-record-call','archive-record-gate','archive-cctv-monitor'];
  for(const name of props){
   const prop=w.root.getObjectByName(name);assert.ok(prop,name);
   const support=w.root.getObjectByName(prop.userData.support);assert.ok(support,`${name} support`);
   const b=new T.Box3().setFromObject(prop),p=b.getCenter(new T.Vector3());
   const hit=new T.Raycaster(new T.Vector3(p.x,b.min.y+.001,p.z),new T.Vector3(0,-1,0),0,.025).intersectObject(support,true)[0];
   assert.ok(hit&&Math.abs(hit.point.y-b.min.y)<.006,`${name} actually rests on its desktop`);
  }
  if(area==='annex'){
   const glass=w.root.getObjectByName('annex-exterior-glazing'),barrier=w.root.getObjectByName('annex-fallen-work-barrier');assert.ok(glass&&barrier);
   assert.equal(glass.material.transparent,true);
   assert.equal(canStandAt(5.85,3,w.solids,.23,w.bounds),false,'closed front glazing stops walking outside');
  }else{
   assert.ok(w.root.getObjectByName('surveillance-screen')?.userData.surveillance);
   assert.equal(w.archiveReview,undefined,'three readable records need no editing controller');
   const instruction=w.root.getObjectByName('archive-reading-instructions');assert.ok(instruction);
   assert.equal(instruction.userData.text,'1 사고기록 · 2 통화기록 · 3 입차기록 / 세 기록 확인 후 CCTV 재생');
  }
 }finally{close(w);}}
});

test('V126 adjacent chapters share identical blind-turn passage geometry at their transfer plane',()=>{
 const maps=['annex','archive','plant'].map(build);
 try{
  function shape(group){return group.children.filter(o=>o.isMesh).map(o=>({position:o.position.toArray(),rotation:o.rotation.toArray(),vertices:Array.from(o.geometry.attributes.position.array)}));}
  for(let i=0;i<2;i++){
   const a=maps[i],b=maps[i+1],area=Object.keys(expected)[i],next=Object.keys(expected)[i+1];
   const out=a.root.children.find(o=>o.name==='continuous-connection'&&o.position.z===-apartmentEscapeLayout[area].z);
   const incoming=b.root.children.find(o=>o.name==='continuous-connection'&&o.position.z===apartmentEscapeLayout[next].z+6);
   assert.ok(out&&incoming);assert.equal(out.position.x,0);assert.equal(incoming.position.x,-3);assert.equal(incoming.position.y,0);
   assert.deepEqual(shape(out),shape(incoming),'both sides reuse the same passage without scaled walls');
  }
 }finally{maps.forEach(close);}
});

test('V126 wall-mounted mailboxes, boards and the CRT socket meet the plaster behind them',()=>{
 for(const [area,names] of [['annex',['annex-mailboxes','annex-route-board-backing']],['archive',['archive-usage-board','crt-wall-socket']]]){
  const w=build(area);try{
   w.root.updateMatrixWorld(true);
   for(const name of names){
    const mount=w.root.getObjectByName(name),b=new T.Box3().setFromObject(mount),p=b.getCenter(new T.Vector3()),east=name==='crt-wall-socket';p.x=east?b.max.x-.001:b.min.x+.001;
    const others=[];w.root.traverse(o=>{if(o.isMesh&&!mount.getObjectById(o.id))others.push(o);});
    const hit=new T.Raycaster(p,new T.Vector3(east?1:-1,0,0),.00001,.004).intersectObjects(others,false)[0];
    assert.ok(hit&&hit.distance<.0025,`${name} physically mounts to its wall`);
   }
  }finally{close(w);}
 }
});

for(const area of Object.keys(expected))test(`V126 ${area}: the departure leaf opens a real route and resets its collision`,()=>{
 const w=build(area);try{
  const L=apartmentEscapeLayout[area],door=w.root.getObjectByName('expansion-exit-door'),z=-L.z+.35;
  assert.ok(door);assert.equal(canStandAt(0,z,w.solids,.23,w.bounds),false);
  w.updateStory(`${area}_departure`,0,false);w.updateStory(`${area}_departure`,1.2,false);
  for(const r of [.23,.43]){
   assert.equal(canStandAt(0,z,w.solids,r,w.bounds),true,`opened aperture r=${r}`);
   assert.ok(findPath(w.spawn,{x:1.6,z:-L.z-2},w.solids,w.bounds,r).length,`physical connector access r=${r}`);
  }
  w.reset();assert.equal(canStandAt(0,z,w.solids,.23,w.bounds),false,'reset closes the actual leaf and collider');
 }finally{close(w);}
});

test('V126 emergency stair has two separate supported flights and a continuous 2.8 m descent',()=>{
 const w=build('plant');try{
  assert.equal(w.heightAt(0,8),0);assert.equal(w.heightAt(-3,14.3),0);
  assert.equal(w.heightAt(-1.35,4),0);assert.equal(w.heightAt(-1.35,2),-.7);
  assert.equal(w.heightAt(-1.35,0),-1.4);assert.equal(w.heightAt(1.35,-2),-1.4);
  assert.ok(Math.abs(w.heightAt(1.35,-4)+2.1)<1e-12);assert.equal(w.heightAt(1.35,-6),-2.8);
  assert.equal(w.heightAt(0,-8),-2.8);assert.equal(w.heightAt(3,-13.5),-2.8);
  const out=w.root.children.find(o=>o.name==='continuous-connection'&&o.position.z===-8);assert.equal(out.position.y,-2.8);
  assert.ok(w.root.getObjectByName('plant-stair-flight-upper'));assert.ok(w.root.getObjectByName('plant-stair-flight-lower'));
  w.root.updateMatrixWorld(true);
  const route=[[0,5],[-1.35,4],[-1.35,3.5],[-1.35,2],[-1.35,.5],[-1.35,-1],[1.35,-1],[1.35,-2],[1.35,-3.5],[1.35,-5.5],[1.35,-6.5],[0,-7]];
  for(const [x,z] of route){
   const h=w.heightAt(x,z),hit=new T.Raycaster(new T.Vector3(x,h+.16,z),new T.Vector3(0,-1,0),0,.33).intersectObject(w.root,true)[0];
   assert.ok(hit&&Math.abs(hit.point.y-h)<.15,`actual tread/landing below ${x},${z}`);
  }
  assert.ok(w.root.getObjectByName('plant-closed-maintenance-door'));assert.equal(w.targets.length,1,'maintenance scenery creates no machinery puzzle');
  for(const r of [.23,.43])for(const voidPoint of [{x:1.35,z:2},{x:-1.35,z:-4}])assert.equal(findPath(w.spawn,voidPoint,w.solids,w.bounds,r).length,0,'rails enclose unsupported stairwell voids');
 }finally{close(w);}
});

test('V127 connection leaves and their jambs meet the actual wall opening',()=>{
 for(const area of ['annex','archive','plant']){const w=build(area);try{const target=w.targets.find(t=>t.id===`${area}_exit`),p=target.mesh.getWorldPosition(new T.Vector3());assert.ok(Math.abs(p.z+apartmentEscapeLayout[area].z)<.12,`${area}: door floats away from wall ${p.z}`);assert.ok(w.root.getObjectByName('apartment-exit-frame-left'),'the leaf has a connected jamb');}finally{close(w);}}
});
