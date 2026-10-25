import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {findPath} from '../lib/navigation.ts';
import {solidContainsPoint} from '../lib/collision.ts';
import {apartmentEscapeLayout as layout} from '../lib/escape-layout.ts';

globalThis.document={createElement:()=>{const canvas={width:0,height:0,texts:[]};const ink=new Proxy({measureText:text=>({width:String(text).length*24}),fillText:text=>canvas.texts.push(text),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});canvas.getContext=()=>ink;return canvas;}};
const module=await import('../lib/ground-support.ts').catch(()=>({}));
function build(area){assert.equal(typeof module.buildGroundSupport,'function','compact ground support builder is required');const root=new T.Group();return {root,...module.buildGroundSupport(root,area,true)};}
const stand=(w,x,z,r=.23)=>x>-w.bounds.x&&x<w.bounds.x&&Math.abs(z)<w.bounds.z&&!w.solids.some(s=>solidContainsPoint(s,x,z,r));
function close(w){w.root.traverse(o=>o.userData.surveillance?.dispose());const geometry=new Set(),materials=new Set();w.root.traverse(o=>{if(o.isMesh){geometry.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:[o.material]))materials.add(m);}});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
function texts(group){const result=[];group.traverse(o=>{if(o.material?.map?.image?.texts)result.push(...o.material.map.image.texts);});return result;}

test('V133 compact foyer receives the open B lift while A and the repaired street exit stay physically closed',()=>{
 const w=build('annex');try{
  assert.deepEqual([layout.annex.x,layout.annex.z],[4.2,5.5]);assert.deepEqual(w.spawn.toArray(),[0,1.65,5.2]);assert.equal(w.heading,0);
  const a=w.root.getObjectByName('ground-lift-A'),b=w.root.getObjectByName('ground-lift-B'),cab=w.root.getObjectByName('ground-lift-cab-B');assert.ok(a&&b&&cab);
  assert.equal(a.position.x,-2.2);assert.equal(b.position.x,0);assert.equal(b.position.z,5.5);assert.equal(cab.position.z,6.85);
  assert.equal(stand(w,-2.2,5.5),false,'out-of-service A has a real closed leaf');assert.equal(stand(w,0,5.35),true);assert.equal(stand(w,0,5.75),true,'B aperture and threshold stay clear');
  w.root.updateMatrixWorld(true);const floor=new T.Raycaster(new T.Vector3(0,.2,5.75),new T.Vector3(0,-1,0),0,.25).intersectObject(cab,true)[0];assert.ok(floor&&Math.abs(floor.point.y)<.002,'the look-back B cabin has a supported floor');
  assert.equal(texts(b).some(t=>t.includes('B1')),false,'this lift serves1F and upper floors only');assert.ok(texts(a).some(t=>t.includes('운행 중지')));
  assert.ok(w.root.getObjectByName('annex-exterior-glazing')&&w.root.getObjectByName('annex-fallen-work-barrier'));assert.equal(stand(w,4.13,.5),false,'the street repair exit cannot be walked through');
 }finally{close(w);}
});

test('V133 compact desks, records and CRT are supported and every existing target remains reachable',()=>{
 for(const area of ['annex','archive']){const w=build(area);try{
  assert.deepEqual(w.targets.map(t=>t.id).sort(),(area==='annex'?['annex_badge','annex_exit','annex_map']:['archive_call','archive_exit','archive_gate','archive_ledger','archive_play','archive_road']).sort());
  if(area==='archive')assert.deepEqual([layout.archive.x,layout.archive.z],[3.2,4.5]);
  for(const t of w.targets){const a=t.mesh.userData.approach;assert.ok(a,`${t.id} standing approach`);assert.ok(Math.abs(a.x)<layout[area].x&&Math.abs(a.z)<layout[area].z,`${t.id} approach is inside its actual room`);
   for(const r of [.23,.43]){assert.ok(stand(w,a.x,a.z,r),`${t.id} standing radius${r}`);assert.ok(findPath(w.spawn,a,w.solids,w.bounds,r).length,`${t.id} reachable radius${r}`);}
   assert.ok(new T.Vector3(a.x,1.65,a.z).distanceTo(t.point)<2.3,`${t.id} use distance`);
  }
  w.root.updateMatrixWorld(true);
  for(const name of(area==='annex'?['annex-management-key','annex-duty-ledger']:['archive-record-road','archive-record-call','archive-record-gate','archive-cctv-monitor'])){
   const prop=w.root.getObjectByName(name),support=w.root.getObjectByName(prop?.userData.support);assert.ok(prop&&support,`${name} names its actual support`);
   const box=new T.Box3().setFromObject(prop),p=box.getCenter(new T.Vector3()),hit=new T.Raycaster(new T.Vector3(p.x,box.min.y+.002,p.z),new T.Vector3(0,-1,0),0,.025).intersectObject(support,true)[0];assert.ok(hit&&Math.abs(hit.point.y-box.min.y)<.006,`${name} touches its desktop`);
  }
  if(area==='archive')assert.ok(w.root.getObjectByName('surveillance-screen')?.userData.surveillance,'the existing CCTV feed is attached to the CRT');
 }finally{close(w);}}
});

test('V133 real exit apertures and normalized receiving passages agree with the 1F route diagram',()=>{
 const a=build('annex'),b=build('archive');try{
  const out=a.root.children.find(o=>o.name==='continuous-connection'&&o.position.z===-5.5),incoming=b.root.children.find(o=>o.name==='continuous-connection'&&o.position.z===10.5);assert.ok(out&&incoming);assert.deepEqual(out.position.toArray(),[0,0,-5.5]);assert.deepEqual(incoming.position.toArray(),[-3,0,10.5]);assert.ok(incoming.getObjectByName('entry-connection-door'));
  for(const w of[a,b]){const area=w===a?'annex':'archive',bz=layout[area].z;assert.equal(stand(w,0,-bz+.2),false,'the closed leaf blocks the real aperture');w.updateStory(`${area}_departure`,0,false);w.updateStory(`${area}_departure`,1.2,false);assert.equal(stand(w,0,-bz+.2,.43),true,'departure opens a follower-width route');assert.ok(findPath(w.spawn,{x:1.6,z:-bz-2},w.solids,w.bounds,.23).length,'the open leaf reaches a real connector');w.reset();assert.equal(stand(w,0,-bz+.2),false,'reset restores the leaf collision');}
  const map=a.root.getObjectByName('annex-floor-plan'),labels=map.material.map.image.texts;for(const text of ['1층 피난안내도','공동현관','경비실','관리사무소','B1 비상계단','B1 주차장','현위치','B호기','A호기 · 운행 중지'])assert.ok(labels.includes(text),`${text} accurately labels the diagram`);
  assert.equal(labels.some(t=>t.includes('관리문서 보관실')),false,'the compact office is not labelled as a huge archive');assert.equal(b.root.getObjectByName('archive-exit-plaque-face').userData.text,'B1 비상계단');assert.equal(a.root.getObjectByName('annex-exit-plaque-face').userData.text,'관리사무소');
 }finally{close(a);close(b);}
});
