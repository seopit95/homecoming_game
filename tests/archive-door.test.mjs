import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {buildWorld,disposeWorld,canStandAt,hasLineOfSight} from '../lib/world.ts';
import {clearPath} from '../lib/navigation.ts';import {initialStory,transition} from '../lib/story.ts';import {readProgress,writeProgress} from '../lib/preferences.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}})})};
const initial=()=>({...initialStory(),stage:'archive_edit',notes:['archive_road'],circuit:['archive_sequence_road']});
function stateDoor(s,occupants=[]){const w=buildWorld(new T.Scene(),'archive');assert.ok(w.archiveDoor,'the editing room needs a physical usable door');for(let i=0;i<61;i++)w.updateStory(s.stage,i/60,false,s,occupants);w.root.updateMatrixWorld(true);return w;}
test('V100 booth door changes physical access and sight while its existing observation window remains usable',()=>{
 let s=initial(),w=stateDoor(s);try{
  assert.ok(clearPath({x:5,z:-17.2},{x:6.6,z:-17.2},w.solids,w.bounds,.43));s=transition(s,'archive_booth_close');for(let i=61;i<130;i++)w.updateStory(s.stage,i/60,false,s,[]);
  assert.equal(clearPath({x:5,z:-17.2},{x:6.6,z:-17.2},w.solids,w.bounds,.23),false);assert.equal(hasLineOfSight({x:5,y:1.65,z:-17.2},{x:6.6,y:1.65,z:-17.2},w.solids),false);
  assert.equal(hasLineOfSight({x:5,y:1.65,z:-20},{x:6.6,y:1.65,z:-20},w.solids),true);
  const t=w.targets.find(t=>t.id==='archive_booth_door');assert.ok(t&&new T.Box3().setFromObject(t.mesh).distanceToPoint(t.point)<.01,'usable point follows moving leaf');
 }finally{disposeWorld(w.root);}
});
test('V100 door state is saved with partial findings and never advances or erases evidence',()=>{
 const s=initial(),closed=transition(s,'archive_booth_close');assert.equal(closed.stage,'archive_edit');assert.ok(closed.circuit.includes('archive_booth_close'));assert.ok(closed.circuit.includes('archive_sequence_road'));assert.deepEqual(closed.notes,s.notes);
 let raw;const storage={setItem(_k,v){raw=v;},getItem(){return raw;}};assert.ok(writeProgress(storage,closed,400,true));assert.ok(readProgress(storage).circuit.includes('archive_booth_close'));
 const opened=transition(closed,'archive_booth_open_out');assert.ok(opened.circuit.includes('archive_booth_open_out'));assert.ok(!opened.circuit.includes('archive_booth_close'));assert.equal(opened.stage,'archive_edit');
 assert.equal(transition({...s,stage:'plant_power'},'archive_booth_close').circuit.includes('archive_booth_close'),false);
});
test('V100 a following pursuer pushes from either side after a finite warning, unrelated patrols do not open the door',()=>{
 const s=transition(initial(),'archive_booth_close'),w=stateDoor(s);try{const d=w.archiveDoor;
  assert.equal(d.press({x:4.7,z:-17.2},{x:4,z:-20},3,s),null);
  let force,knocks=0;for(let i=0;i<100;i++){const cue=d.press({x:4.7,z:-17.2},{x:6.8,z:-17.2},4+i*.025,s);if(cue?.cue==='knock')knocks++;if(cue?.action){force=cue.action;assert.ok(i*.025>=1.7);break;}}
  assert.equal(knocks,1);assert.equal(force,'archive_booth_open_in');d.reset();
  for(let i=0;i<100;i++){const cue=d.press({x:6.9,z:-17.2},{x:4.5,z:-17.2},10+i*.025,s);if(cue?.action){force=cue.action;break;}}assert.equal(force,'archive_booth_open_out');
 }finally{disposeWorld(w.root);}
});
test('V100 occupied doorway cannot crush an actor when the leaf closes',()=>{
 const w=stateDoor(initial());try{const actor={x:5.8,z:-17.2,r:.43},s=transition(initial(),'archive_booth_close');for(let i=61;i<160;i++)w.updateStory(s.stage,i/60,false,s,[actor]);assert.ok(canStandAt(actor.x,actor.z,w.solids,actor.r,w.bounds));assert.ok(Math.abs(w.archiveDoor.hinge.rotation.y)>.2);
 }finally{disposeWorld(w.root);}
});
test('V100 door hardware does not duplicate visible mesh surfaces on its two faces',()=>{
 const w=stateDoor(initial());try{const seen=new Set();w.archiveDoor.leaf.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,v=new T.Vector3(),points=[];for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);points.push(v.toArray().map(x=>x.toFixed(6)).join(','));}const key=points.join('|');assert.ok(!seen.has(key),'duplicated hinge/closer meshes flicker in the torch');seen.add(key);});}finally{disposeWorld(w.root);}
});

function surfaceIntersections(root){
 const grid=new Map(),step=.18,ray=new T.Ray(),direction=new T.Vector3(),point=new T.Vector3();
 function cells(b,visit){for(let x=Math.floor(b.min.x/step);x<=Math.floor(b.max.x/step);x++)for(let y=Math.floor(b.min.y/step);y<=Math.floor(b.max.y/step);y++)for(let z=Math.floor(b.min.z/step);z<=Math.floor(b.max.z/step);z++)visit(`${x},${y},${z}`);}
 root.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,ix=m.geometry.index;for(let i=0;i<(ix?.count??p.count);i+=3){const tri=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(m.matrixWorld))),b=new T.Box3().setFromPoints([tri.a,tri.b,tri.c]),item={tri,b};cells(b,key=>{const list=grid.get(key)??[];list.push(item);grid.set(key,list);});}});
 function edges(a,b){for(const [v,w] of [[a.a,a.b],[a.b,a.c],[a.c,a.a]]){direction.subVectors(w,v);const length=direction.length();if(length<1e-9)continue;ray.set(v,direction.divideScalar(length));if(ray.intersectTriangle(b.a,b.b,b.c,false,point)&&point.distanceTo(v)<length-1e-7)return point.clone();}return null;}
 return tri=>{const b=new T.Box3().setFromPoints([tri.a,tri.b,tri.c]),candidates=new Set();cells(b,k=>{for(const item of grid.get(k)??[])candidates.add(item);});for(const item of candidates)if(b.intersectsBox(item.b)){const hit=edges(tri,item.tri)||edges(item.tri,tri);if(hit)return hit.toArray();}return null;};
}

test('V100 finite actual crawl poses clear the new closed and both open leaf positions',async()=>{
 const {animateGhost}=await import('../lib/ghost.ts');
 for(const [action,poses] of [
  ['archive_booth_close',[[5.25,-17.2,Math.PI/2],[6.35,-17.2,-Math.PI/2]]],
  ['archive_booth_open_in',[[5.8,-17.2,Math.PI/2],[6.6,-17.2,Math.PI/2]]],
  ['archive_booth_open_out',[[5,-17.2,Math.PI/2],[5.8,-17.2,Math.PI/2],[6.5,-17.2,-Math.PI/2]]],
 ]){const w=stateDoor(transition(initial(),action));try{const f=w.figure,hit=surfaceIntersections(w.archiveDoor.leaf);f.visible=true;
  for(const [x,z,yaw] of poses)for(const phase of [0,2,4]){assert.ok(canStandAt(x,z,w.solids,.43,w.bounds),'sample must use actual navigable floor');f.position.set(x,0,z);f.rotation.y=yaw;animateGhost(f,3,1,.7,false,phase,1,undefined,w.solids);f.updateMatrixWorld(true);let collision;
   f.traverse(m=>{if(collision||!m.isMesh||m.isInstancedMesh)return;for(let o=m;o!==f;o=o.parent)if(!o.visible)return;const p=m.geometry.attributes.position,ix=m.geometry.index;for(let i=0;i<(ix?.count??p.count)&&!collision;i+=3){const tri=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(m.matrixWorld))),at=hit(tri);if(at)collision={at,mesh:m.name||m.parent.name};}});assert.equal(collision,undefined,JSON.stringify({action,x,z,phase,collision}));
  }
 }finally{disposeWorld(w.root);}}
});

test('V100 both occupied forced swings overcome a running body block without crossing physical solids',()=>{
 for(const side of [-1,1]){
  let s=transition(initial(),'archive_booth_close');const w=stateDoor(s);try{
   const d=w.archiveDoor,player={x:5.8-side*.65,z:-17.2,r:.23},pusher={x:5.8+side*1.1,z:-17.2,r:.43};
   for(let i=0;i<100;i++){const cue=d.press(pusher,player,4+i*.025,s);if(cue?.action){s=transition(s,cue.action);break;}}
   assert.ok(!s.circuit.includes('archive_booth_close'));
   const move=dx=>{for(let left=Math.abs(dx);left>0;left-=.05){const step=Math.sign(dx)*Math.min(.05,left);if(canStandAt(player.x+step,player.z,w.solids,player.r,w.bounds))player.x+=step;}};
   let opened=false;
   for(let i=0;i<180;i++){
    move(side*3.5*.05);move(d.pushAside(player,.05));w.updateStory(s.stage,10+i*.05,false,s,[player,pusher]);
    assert.ok(canStandAt(player.x,player.z,w.solids,player.r,w.bounds),'shove and swing may never leave the actor inside a leaf or wall');
    if(Math.abs(d.hinge.rotation.y)>1.49){opened=true;break;}
   }
   console.log("forced physical",JSON.stringify({side,angle:d.hinge.rotation.y,player,push:d.pushAside(player,.05)}));assert.ok(opened,`occupied forced swing ${side} must finish despite sprinting into it`);
   d.reset();assert.equal(d.pushAside(player,.05),0,'reset must not retain an invisible shove');
  }finally{disposeWorld(w.root);}
 }
});
