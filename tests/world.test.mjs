import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWorld,canStandAt} from '../lib/world.ts';
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
