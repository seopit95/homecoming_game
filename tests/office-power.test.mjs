import test from 'node:test';import assert from 'node:assert/strict';
import * as S from '../lib/story.ts';
import * as T from 'three';
import {buildWorld,disposeWorld,canStandAt,hasLineOfSight} from '../lib/world.ts';
import {writeProgress,readProgress} from '../lib/preferences.ts';
import {buildBuilding} from '../lib/building.ts';
const state=()=>({...S.initialStory(),stage:'office_fuse'});
const take=()=>S.transition(state(),'fuse');
const install=()=>S.transition(take(),'office_install');
test('V77 finding a spare fuse is distinct from installing it into the backup panel',()=>{
 const taken=take();assert.ok(taken.notes.includes('fuse'),'the actual spare must enter inventory');assert.equal(taken.stage,'office_power');assert.ok(!taken.notes.includes('office_install'));
 assert.equal(S.transition(taken,'circuit_b'),taken,'unpowered circuits cannot silently grant power');assert.equal(S.transition(taken,'security_power'),taken);
 const ready=S.transition(taken,'office_install');assert.ok(ready.notes.includes('office_install'));assert.equal(S.transition(ready,'office_install'),ready);
 assert.equal(S.transition({...S.initialStory(),stage:'office_power'},'office_install').notes.includes('office_install'),false,'an empty hand cannot install a fuse');
});
test('V77 independent branch toggles can be corrected and either CCTV/lift selection order works',()=>{
 for(const order of [['circuit_b','circuit_c'],['circuit_c','circuit_b']]){let s=install();for(const a of order)s=S.transition(s,a);assert.equal(s.stage,'office_power','choosing branches is not pressing the main relay');assert.equal(S.transition(s,'security_power').stage,'office_tape');}
 let s=install();s=S.transition(s,'circuit_b');s=S.transition(s,'circuit_b');assert.deepEqual(s.circuit,[],'a branch is an actual on/off switch');
});
test('V77 overload trips the relay but retains the installed fuse and supports a deliberate recovery',()=>{
 let s=install();for(const a of ['circuit_a','circuit_b','circuit_c'])s=S.transition(s,a);assert.equal(typeof S.officePowerProblem,'function');assert.equal(S.officePowerProblem(s),'overload');
 s=S.transition(s,'security_power');assert.equal(s.stage,'office_power');assert.deepEqual(s.circuit,[]);assert.ok(s.notes.includes('office_install'),'a protective relay trip does not invent another fuse fetch');
 s=S.transition(S.transition(s,'circuit_c'),'circuit_b');assert.equal(S.transition(s,'security_power').stage,'office_tape');
});
test('V77 the capacity budget distinguishes a valid load from missing essential equipment',()=>{
 assert.equal(typeof S.officePowerProblem,'function');let s=install();assert.equal(S.officePowerProblem(s),'monitor');s=S.transition(s,'circuit_b');assert.equal(S.officePowerProblem(s),'lift');s=S.transition(s,'circuit_a');assert.equal(S.officePowerProblem(s),'lift','lighting plus CCTV fits6A but cannot run the service lift');
 assert.equal(S.transition(s,'security_power'),s);assert.match(S.objectiveFor(take()),/퓨즈.*설치/);assert.match(S.objectiveFor(install()),/6A/);
});
test('V77 the actual office has a reachable fuse holder and shows the installed fuse only after placement',()=>{
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
 const w=buildWorld(new T.Scene(),'office');try{
  const target=w.targets.find(t=>t.id==='office_install');assert.ok(target,'finding a fuse must lead to a physical installation interaction');
  const loose=w.targets.find(t=>t.id==='fuse').mesh,installed=w.root.getObjectByName('office-fuse-installed');assert.ok(installed,'the fuse cannot just disappear from the story');
  const taken=take(),ready=install();w.updateStory(taken.stage,10,false,taken);assert.equal(loose.visible,false);assert.equal(installed.visible,false);w.updateStory(ready.stage,11,false,ready);assert.equal(installed.visible,true);
  const p=target.mesh.userData.approach;assert.ok(p&&canStandAt(p.x,p.z,w.solids,.23,w.bounds));assert.ok(hasLineOfSight({x:p.x,y:1.65,z:p.z},target.point,w.solids));
 }finally{disposeWorld(w.root);}
});
test('V77 saving and continuing retains the installed fuse and partial branch selection',()=>{
 let stored='';const storage={getItem:()=>stored,setItem:(_k,v)=>stored=v};const s=S.transition(install(),'circuit_b');assert.ok(writeProgress(storage,s,510,false));const restored=readProgress(storage);assert.ok(restored);assert.equal(restored.stage,'office_power');assert.ok(restored.notes.includes('office_install'));assert.deepEqual(restored.circuit,['circuit_b']);
 assert.equal(S.checkpoint({...s,stage:'dying',resume:'office_record'}).stage,'office_power');
});
test('V77 legacy completed CCTV saves retain earned progress and an overload retry does not refetch a fuse',()=>{
 const old=readProgress({getItem:()=>JSON.stringify({version:2,stage:'office_record',notes:['record','monitor'],elapsed:500})});assert.equal(old.stage,'office_key');
 let s=install();for(const a of ['circuit_a','circuit_b','circuit_c'])s=S.transition(s,a);s=S.transition(s,'security_power');const recovered=S.checkpoint(s);assert.equal(recovered.stage,'office_power');assert.ok(recovered.notes.includes('office_install'));assert.deepEqual(recovered.circuit,[]);
});
test('V77 restored legacy CCTV power matches the actual installed fuse and essential switch positions',()=>{
 const restored=readProgress({getItem:()=>JSON.stringify({version:2,stage:'office_record',notes:['record','monitor'],elapsed:500})});assert.equal(S.officePowerLoad(restored),6,'a restored running CCTV/lift cannot claim zero selected load');
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};const w=buildWorld(new T.Scene(),'office');try{w.updateStory(restored.stage,1,false,restored);assert.equal(w.root.getObjectByName('office-fuse-installed').visible,true);assert.ok(w.root.getObjectByName('office-branch-a').rotation.z>0);for(const id of ['b','c'])assert.ok(w.root.getObjectByName('office-branch-'+id).rotation.z<0);}finally{disposeWorld(w.root);}
});
test('V77 the relay and toggle levers have actual connected physical mounts',()=>{
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};const w=buildWorld(new T.Scene(),'office');try{w.root.updateMatrixWorld(true);const button=w.root.getObjectByName('office-main-relay'),mount=w.root.getObjectByName('office-relay-mount');assert.ok(mount,'the relay button cannot hang in front of its backing plate');const a=new T.Box3().setFromObject(button),b=new T.Box3().setFromObject(mount);assert.ok(a.intersectsBox(b));assert.ok(b.max.x>5.47,'the mount reaches the actual backing');for(const id of ['a','b','c']){const lever=w.root.getObjectByName('office-branch-'+id),axle=w.root.getObjectByName('office-lever-axle-'+id);assert.ok(axle);assert.ok(new T.Box3().setFromObject(axle).containsPoint(lever.getWorldPosition(new T.Vector3())),'the actual axle must enter the lever pivot');}}finally{disposeWorld(w.root);}
});
test('V77 the office investigation stations remain connected for player and pursuer',async()=>{
 const {findPath}=await import('../lib/navigation.ts');globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};const w=buildWorld(new T.Scene(),'office');try{for(const [x,z] of [[-3.7,2.6],[-2.1,-4.95],[4.55,-4.55],[4.55,-3.45]])for(const r of [.23,.43]){assert.ok(canStandAt(x,z,w.solids,r,w.bounds));assert.ok(findPath(w.spawn,{x,z},w.solids,w.bounds,r).length,`station ${x},${z}, radius${r} must remain reachable`);}}finally{disposeWorld(w.root);}
});
test('V77 the small loose cartridge rests on its paper card and the installed cartridge meets both clips',()=>{
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};const root=new T.Group();buildBuilding(root,'office');try{root.updateMatrixWorld(true);const loose=new T.Box3().setFromObject(root.getObjectByName('office-fuse-pickup')),placed=new T.Box3().setFromObject(root.getObjectByName('office-fuse-installed'));assert.ok(Math.abs(loose.min.y-1.162)<.0001,'the actual metal cap contacts the paper card');assert.ok(loose.max.x-loose.min.x<.04,'the spare is a small cartridge, not a giant prop');for(const y of [.997,1.043]){const clip=root.children.find(o=>o.isMesh&&Math.abs(o.position.x-5.475)<1e-7&&Math.abs(o.position.y-y)<1e-7&&Math.abs(o.position.z+4.55)<1e-7);assert.ok(clip);assert.ok(placed.intersectsBox(new T.Box3().setFromObject(clip)),'each clip supports the installed cartridge');}}finally{disposeWorld(root);}
});
test('V77 the rendered crawling body clears the new cabinet and protruding controls at navigation clearance',async()=>{
 const {animateGhost}=await import('../lib/ghost.ts');globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};const w=buildWorld(new T.Scene(),'office');try{const parts=w.solids.filter(s=>s.x>5.3&&s.z>=-4.6&&s.z<=-3.4&&s.w<.25),p=new T.Vector3();assert.ok(parts.length>=6,'actual cabinet and added protrusion volumes');for(const z of [-4.55,-4,-3.45])for(const phase of [0,2,4]){w.figure.position.set(4.93,0,z);w.figure.rotation.set(0,Math.PI/2,0);animateGhost(w.figure,3,1,.7,false,phase,1,w.heightAt,w.solids);w.figure.updateMatrixWorld(true);w.figure.traverse(mesh=>{if(!mesh.isMesh||mesh.isInstancedMesh)return;for(let o=mesh;o!==w.figure;o=o.parent)if(!o.visible)return;const a=mesh.geometry.getAttribute('position');for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);for(const s of parts)assert.ok(!(Math.abs(p.x-s.x)<s.w/2-.002&&Math.abs(p.z-s.z)<s.d/2-.002&&Math.abs(p.y-(s.y??1.5))<(s.h??3)/2-.002),`body ${mesh.name||mesh.parent?.name} meets cabinet/control at z${z},phase${phase}: ${p.toArray()}`);}});}}finally{disposeWorld(w.root);}
});
