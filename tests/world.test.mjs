import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWorld,canStandAt,hasLineOfSight} from '../lib/world.ts';
// Canvas texturing is irrelevant to this geometry test; no renderer is mocked.
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({width:0,height:0,getContext:()=>context})},configurable:true});
test('every required interaction has a reachable position inside the apartment',()=>{
  const {solids,targets}=buildWorld(new THREE.Scene());
  assert.equal(canStandAt(0,4.8,solids),true);
  assert.equal(canStandAt(0,-9,solids),false);
  const queue=[[0,19]],seen=new Set(['0,19']);
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];
    for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){
      const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;
      if(seen.has(key)||!canStandAt(nx/4,nz/4,solids))continue;
      seen.add(key);queue.push([nx,nz]);
    }
  }
  for(const target of targets){assert.ok(queue.some(([x,z])=>Math.hypot(x/4-target.point.x,z/4-target.point.z)<1.25),`${target.id} must be reachable without walking through walls`);}
});
for(const area of ['landing','lift','corridor','stairs','office','parking'])test(`${area}: all required interactions are reachable from the spawn`,()=>{
  const world=buildWorld(new THREE.Scene(),area);assert.ok(world.bounds,`${area} must provide its own walkable area`);
  const {solids,targets,bounds,spawn,heightAt}=world;
  const start=[Math.round(spawn.x*4),Math.round(spawn.z*4)];
  const queue=[start],seen=new Set([start.join(',')]);
  assert.ok(canStandAt(spawn.x,spawn.z,solids,.23,bounds),'spawn must be free');
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;if(seen.has(key)||!canStandAt(nx/4,nz/4,solids,.23,bounds))continue;seen.add(key);queue.push([nx,nz]);}
  }
  assert.ok(targets.length>0);
  for(const t of targets)assert.ok(queue.some(([x,z])=>Math.hypot(x/4-t.point.x,z/4-t.point.z)<1.45&&Math.abs(heightAt(x/4,z/4)+1.65-t.point.y)<1.65&&hasLineOfSight({x:x/4,y:heightAt(x/4,z/4)+1.65,z:z/4},t.point,solids)),`${area}/${t.id} must be reachable at the correct elevation`);
});
test('interaction rays respect wall height while allowing a tabletop object',async()=>{
  const {hasLineOfSight}=await import('../lib/world.ts');assert.equal(typeof hasLineOfSight,'function');
  assert.equal(hasLineOfSight({x:0,y:1.65,z:2},{x:0,y:1.3,z:-2},[{x:0,z:0,w:4,d:.2,y:1.5,h:3}]),false);
  assert.equal(hasLineOfSight({x:0,y:1.65,z:2},{x:0,y:.9,z:0},[{x:0,z:0,w:1,d:1,y:.4,h:.8}]),true);
});
test('the collectible fuse is visible outside its opaque cabinet',()=>{
  const world=buildWorld(new THREE.Scene(),'office'),fuse=world.targets.find(t=>t.id==='fuse');
  const bounds=new THREE.Box3().setFromObject(fuse.mesh);
  assert.equal(world.solids.some(s=>bounds.min.x>=s.x-s.w/2&&bounds.max.x<=s.x+s.w/2&&bounds.min.z>=s.z-s.d/2&&bounds.max.z<=s.z+s.d/2&&bounds.min.y>=(s.y??1.5)-(s.h??3)/2&&bounds.max.y<=(s.y??1.5)+(s.h??3)/2),false,'the pickup must not be completely enclosed in opaque geometry');
});
test('the large apartment floor offers two connected routes around its service cores',async()=>{
  const {findPath}=await import('../lib/navigation.ts'),w=buildWorld(new THREE.Scene(),'corridor');
  assert.ok(w.bounds.x>=14&&w.bounds.z>=38);
  for(const x of [-10,10]){const path=findPath(w.spawn,{x,z:-32},w.solids,w.bounds);assert.ok(path.length>0);assert.ok(path.some(p=>Math.abs(p.x)>6));}
  assert.ok(findPath({x:-10,z:0},{x:10,z:0},w.solids,w.bounds).length>0,'the middle passage connects the wings');
});
test('crouching behind a desk breaks the ghost sightline',()=>{
  const cover=[{x:0,z:0,w:3,d:1,y:.7,h:1.4}],ghost={x:0,y:1.55,z:-2};
  assert.equal(hasLineOfSight(ghost,{x:0,y:1.65,z:1},cover),true);
  assert.equal(hasLineOfSight(ghost,{x:0,y:1,z:1},cover),false);
});
test('the home has a 330 square metre footprint and a broad connected living area',()=>{
  const w=buildWorld(new THREE.Scene()),floor=w.root.getObjectByName('apartment-floor');assert.ok(floor);
  const size=new THREE.Box3().setFromObject(floor).getSize(new THREE.Vector3());assert.ok(Math.abs(size.x*size.z-330)<.1);
  for(const [x,z] of [[0,4.8],[0,0],[0,-4],[1,2],[2.6,2],[-2,0],[-4,0]])assert.ok(canStandAt(x,z,w.solids,.4,w.bounds),`wide passage at ${x},${z}`);
});
test('the exterior apartment gallery has a long clear route and an open view above its guardrail',()=>{
  const w=buildWorld(new THREE.Scene(),'landing'),call=w.targets.find(t=>t.id==='call');
  assert.ok(w.spawn.distanceTo(call.point)>55,'the elevator is at the far end of a long gallery');
  for(let z=-30;z<=29;z++)assert.ok(canStandAt(0,z,w.solids,.4,w.bounds),`clear route at ${z}`);
  assert.equal(hasLineOfSight({x:0,y:1.65,z:5},{x:-4,y:1.8,z:0},w.solids),true,'the falling shape can be seen outside');
  assert.equal(canStandAt(-3.4,0,w.solids,.23,w.bounds),false,'the player cannot walk off the balcony');
  assert.equal(hasLineOfSight({x:0,y:.7,z:0},{x:-4,y:.7,z:0},w.solids),false,'the solid lower guardrail remains');
});
test('memory rain and windshield lines release their GPU resources on teardown',async()=>{
  const {buildRoad}=await import('../lib/prologue.ts'),{disposeWorld}=await import('../lib/world.ts');
  const road=buildRoad(new THREE.Scene());let expected=0,disposed=0;
  road.root.traverse(o=>{if(o instanceof THREE.Line){for(const resource of [o.geometry,o.material]){expected++;resource.addEventListener('dispose',()=>disposed++);}}});
  assert.ok(expected>=4);disposeWorld(road.root);assert.equal(disposed,expected);assert.equal(road.root.parent,null);
});
