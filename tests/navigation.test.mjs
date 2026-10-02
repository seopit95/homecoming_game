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

test('a body-sized pursuer approaches a player standing closer to the wall without losing its route',async()=>{
  const navigation=await import('../lib/navigation.ts');
  assert.equal(typeof navigation.findPursuitPath,'function');
  const wall=[{x:2,z:0,w:.2,d:10}],bounds={x:6,z:6},player={x:1.65,z:0};
  assert.ok(canStandAt(player.x,player.z,wall,.23,bounds));
  assert.equal(canStandAt(player.x,player.z,wall,.43,bounds),false);
  const path=navigation.findPursuitPath({x:-2,z:0},player,wall,bounds);
  assert.ok(path.length,'a player against a wall must remain catchable');
  const end=path.at(-1);assert.ok(canStandAt(end.x,end.z,wall,.43,bounds));
  assert.ok(Math.hypot(end.x-player.x,end.z-player.z)<.67,'the approach remains within capture range');
});

test('the full-sized pursuer can leave the archive entrance and reach every evidence station',async()=>{
  const T=await import('three'),{buildWorld,disposeWorld}=await import('../lib/world.ts'),{findPursuitPath,pursuerRadius,clearPath}=await import('../lib/navigation.ts');
  const original=globalThis.document,context={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
  const world=buildWorld(new T.Scene(),'archive');
  try{
    for(const target of world.targets){
      const goal=target.mesh.userData.approach;if(!goal)continue;
      const path=findPursuitPath(world.figure.position,goal,world.solids,world.bounds);
      assert.ok(path.length,`a clear route must reach ${target.id}`);
      let from=world.figure.position;for(const point of path){assert.ok(clearPath(from,point,world.solids,world.bounds,pursuerRadius));from=point;}
      assert.ok(Math.hypot(from.x-goal.x,from.z-goal.z)<.67,'the player remains within contact distance');
    }
  }finally{disposeWorld(world.root);globalThis.document=original;}
});
