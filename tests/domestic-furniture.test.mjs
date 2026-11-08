import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import * as props from '../lib/props.ts';
import {buildWorld,canStandAt,hasLineOfSight} from '../lib/world.ts';
import {apartmentScale as S} from '../lib/apartment-layout.ts';
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({getContext:()=>({fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}})})},configurable:true});
const wood=new T.MeshStandardMaterial(),fabric=new T.MeshStandardMaterial();
const hit=(root,p,dir=[0,-1,0],far=.02)=>{root.updateMatrixWorld(true);return new T.Raycaster(new T.Vector3(...p),new T.Vector3(...dir),0,far).intersectObject(root,true)[0];};
// Missing leg/carcass/top, too-high seat, floating linen and chunky books are the production mutations guarded below.
for(const name of ['sofa','drawerUnit','writingTable','bed','bookcase'])test(`${name} provides a native constructed assembly`,()=>{assert.equal(typeof props[name],'function');});
test('writing table legs run from floor through the underside and the top supports devices',()=>{
 assert.equal(typeof props.writingTable,'function');const root=props.writingTable(2.1,.8,.8,wood);
 for(const x of [-.88,.88])for(const z of [-.26,.26])for(let y=.015;y<.68;y+=.025)assert.ok(hit(root,[x-.08,y,z],[1,0,0],.16));
 assert.ok(Math.abs(hit(root,[0,.802,0]).point.y-.8)<.0001);
});
test('drawer unit has connected floor base, side carcass and a full physical top',()=>{
 assert.equal(typeof props.drawerUnit,'function');const root=props.drawerUnit(.8,.7,.62,wood);
 for(const y of [.015,.1,.3,.65])assert.ok(hit(root,[-.42,y,0],[1,0,0],.08));
 for(const x of [-.36,0,.36])assert.ok(Math.abs(hit(root,[x,.702,0]).point.y-.7)<.0001);
});
test('sofa seat is human-height and pillows touch its cushion',()=>{
 assert.equal(typeof props.sofa,'function');const root=props.sofa(3.2,1.1,wood,fabric);
 const seat=hit(root,[0,.55,0],[0,-1,0],.12);assert.ok(seat&&seat.point.y>=.48&&seat.point.y<=.52);
 for(const name of ['sofa-pillow-left','sofa-pillow-right']){const p=root.getObjectByName(name);assert.ok(p);const b=new T.Box3().setFromObject(p),c=b.getCenter(new T.Vector3());p.visible=false;const support=hit(root,[c.x,b.min.y+.001,c.z],[0,-1,0],.008);assert.ok(support&&support.object!==p);p.visible=true;}
});
test('bed pillows and thin blanket meet the mattress without duplicate floating stacks',()=>{
 assert.equal(typeof props.bed,'function');const root=props.bed(2.3,2.5,.715,wood,fabric,fabric);
 for(const name of ['bed-pillow-left','bed-pillow-right','bed-blanket']){const p=root.getObjectByName(name);assert.ok(p);const b=new T.Box3().setFromObject(p);assert.ok(b.min.y>=.714&&b.min.y<=.72,`${name} bottom ${b.min.y}`);}
 assert.ok(Math.abs(hit(root,[0,.717,.3]).point.y-.715)<.003);
});
test('bookcase has thin covered page blocks resting on shelves and closed back/sides',()=>{
 assert.equal(typeof props.bookcase,'function');const root=props.bookcase(1.4,2.3,.65,wood);root.updateMatrixWorld(true);
 const covers=[],pages=[];root.traverse(o=>{if(o.isMesh&&o.material.name==='book-cover')covers.push(o);if(o.isMesh&&o.material.name==='book-pages')pages.push(o);});assert.ok(covers.length&&pages.length);
 const spine=hit(root,[-.54,.35,.4],[0,0,-1],.6);assert.ok(spine&&spine.object.material.name==='book-cover');
 const page=hit(root,[-.548,.35,.04],[0,0,1],.1);assert.ok(page&&page.object.material.name==='book-pages');
 const left=hit(root,[-.58,.35,.18],[1,0,0],.1),right=hit(root,[-.53,.35,.18],[-1,0,0],.1);assert.ok(Math.abs(right.point.x-left.point.x-.025)<.001,'first book is 25 mm thick including its covers');
 assert.ok(Math.abs(hit(root,[-.548,.219,.18]).point.y-.2175)<.001,'book bottom rests on the first shelf');
 for(const y of [.04,.4,1.4,2.2])assert.ok(hit(root,[-.73,y,0],[1,0,0],.06));
});
for(const [area,rows] of [['apartment',[['home-phone-table',-3.15*S,2.4*S,.535],['home-study-desk',-5.3*S,-5.6*S,.8],['home-nightstand',3.75*S,5.43*S,.68]]],['resident',[['resident-low-table',-2.6,2.2,.45],['resident-study-desk',3,-4.65,.81],['resident-device-cabinet',-3.8,3.6,.7]]]])test(`${area} batched assemblies preserve measured support and reachable clues`,()=>{
 const w=buildWorld(new T.Scene(),area);w.figure.visible=false;w.root.updateMatrixWorld(true);
 for(const [name,x,z,y] of rows){const root=w.root.getObjectByName(name);assert.ok(root,`${name} exists after batching`);const support=hit(root,[x,y+.002,z]);assert.ok(support&&Math.abs(support.point.y-y)<.001,`${name} top ${y}`);}
 const ids=area==='apartment'?['phone','radio','flashlight']:['answerphone','portrait','belongings'];for(const id of ids){const target=w.targets.find(t=>t.id===id);assert.ok(target);}
 for(const id of (area==='apartment'?['phone','radio','flashlight']:['answerphone'])){const target=w.targets.find(t=>t.id===id),b=new T.Box3().setFromObject(target.mesh),c=b.getCenter(new T.Vector3()),meshes=[];w.root.traverse(o=>{if(o.isMesh&&o!==target.mesh&&!target.mesh.getObjectById(o.id))meshes.push(o);});const support=new T.Raycaster(new T.Vector3(c.x,b.min.y+.015,c.z),new T.Vector3(0,-1,0),0,.04).intersectObjects(meshes,false)[0];assert.ok(support&&b.min.y-support.point.y<.0001,`${id} has no air gap above its physical support`);}
 const p=area==='apartment'?[-3.15*S,1.65,2.4*S-1.25]:[-3.8,1.65,2.8];assert.ok(canStandAt(p[0],p[2],w.solids,.23,w.bounds));assert.ok(hasLineOfSight({x:p[0],y:p[1],z:p[2]},w.targets.find(t=>t.id===ids[0]).point,w.solids));
});
test('blanket hem hangs outside the mattress and frame instead of being buried inside them',()=>{
 const cloth=new T.MeshStandardMaterial(),root=props.bed(2.3,2.5,.715,wood,fabric,cloth);
 for(const side of [-1,1]){const surface=hit(root,[side*1.20,.565,-.425],[-side,0,0],.15);assert.ok(surface&&surface.object.material===cloth,'the visible side is thin blanket cloth');}
});

for(const [id,name,point] of [['phone','home-phone-table',[-3.15*S,.58,2.4*S]],['flashlight','home-nightstand',[3.75*S,.75,5.43*S]]])test(`${id} base contacts its exact supporting top while interaction point stays fixed`,()=>{
 const w=buildWorld(new T.Scene(),'apartment');w.root.updateMatrixWorld(true);const target=w.targets.find(t=>t.id===id),b=new T.Box3().setFromObject(target.mesh),c=b.getCenter(new T.Vector3()),surface=hit(w.root.getObjectByName(name),[c.x,b.min.y+.002,c.z]);
 assert.ok(surface&&Math.abs(b.min.y-surface.point.y)<.0001,`${id} contact gap ${surface?b.min.y-surface.point.y:'missing support'}`);assert.deepEqual(target.point.toArray(),point);
});
