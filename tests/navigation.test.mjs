import test from 'node:test';
import assert from 'node:assert/strict';
import {findPath} from '../lib/navigation.ts';
import {canStandAt} from '../lib/world.ts';
test('the pursuer detours around a wall instead of crossing it',()=>{
  const obstacles=[{x:0,z:0,w:.5,d:5}],bounds={x:5,z:5};
  const path=findPath({x:-3,z:0},{x:3,z:0},obstacles,bounds);
  assert.ok(path.length>2);assert.ok(path.some(p=>Math.abs(p.z)>2.7));
  let from={x:-3,z:0};for(const p of path){for(let t=0;t<=1;t+=.05)assert.ok(canStandAt(from.x+(p.x-from.x)*t,from.z+(p.z-from.z)*t,obstacles,.18,bounds));from=p;}
  assert.ok(Math.hypot(from.x-3,from.z)<.1);
});
test('a sealed wall cannot be crossed by pathfinding',()=>{
  assert.deepEqual(findPath({x:-3,z:0},{x:3,z:0},[{x:0,z:0,w:.5,d:10}],{x:5,z:5}),[]);
});
test('a detour contains only useful visible corners, never a rounded start behind the pursuer',()=>{
  const wall=[{x:0,z:0,w:.5,d:5}],bounds={x:5,z:5},start={x:-3.17,z:.19};
  const path=findPath(start,{x:3,z:0},wall,bounds);
  assert.ok(path.length<=4,`a single wall needs at most three corners, got ${path.length}`);
  assert.ok(Math.hypot(path[0].x-start.x,path[0].z-start.z)>1,'no tiny snapped-start step');
});
