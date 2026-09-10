import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWorld,canStandAt,hasLineOfSight} from '../lib/world.ts';
// Canvas texturing is irrelevant to this geometry test; no renderer is mocked.
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({width:0,height:0,getContext:()=>context})},configurable:true});
test('every required interaction has a reachable position inside the apartment',()=>{
  const {solids,targets}=buildWorld(new THREE.Scene());
  assert.equal(canStandAt(0,7.5,solids),true);
  assert.equal(canStandAt(0,-9,solids),false);
  const queue=[[0,30]],seen=new Set(['0,30']);
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
