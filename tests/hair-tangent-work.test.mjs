import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import * as hair from '../lib/ghost-hair.ts';import {createGhost,animateGhost,animateGhostAttack} from '../lib/ghost.ts';
test('V78 reusable hair tangent work preserves the installed Three.js output on actual animated hair',()=>{
 assert.equal(typeof hair.updateHairTangents,'function','deforming hair needs reusable tangent work');
 const f=createGhost(new T.Group());for(const [time,crawl,attack,solids] of [[1,0,0,[]],[2,1,0,[]],[3,.5,0,[{x:.6,z:0,w:.2,d:4}]],[4,1,.7,[]]]){
  if(attack)animateGhostAttack(f,attack,false,1.65,solids);else animateGhost(f,time,1,.7,false,time*2,crawl,()=>0,solids);
  const g=f.getObjectByName('ghost-authored-long-hair').geometry,reference=g.clone();reference.computeTangents();const position=g.getAttribute('position').array.slice(),normal=g.getAttribute('normal').array.slice(),index=g.index.array.slice(),uv=g.getAttribute('uv').array.slice(),attribute=g.getAttribute('tangent');
  hair.updateHairTangents(g);assert.deepEqual(g.getAttribute('tangent').array,reference.getAttribute('tangent').array,`bit-identical tangent directions at ${time}`);assert.equal(g.getAttribute('tangent'),attribute,'steady updates retain the GPU attribute');assert.deepEqual(g.getAttribute('position').array,position);assert.deepEqual(g.getAttribute('normal').array,normal);assert.deepEqual(g.index.array,index);assert.deepEqual(g.getAttribute('uv').array,uv);reference.dispose();
 }
});
test('V78 reused work handles degenerate UVs, overlapping groups and alternating independent geometry',()=>{
 assert.equal(typeof hair.updateHairTangents,'function');const a=new T.PlaneGeometry(1,1,2,2),b=new T.SphereGeometry(.3,12,8);a.clearGroups();a.addGroup(0,a.index.count,0);a.addGroup(0,6,1);a.getAttribute('uv').setXY(0,0,0);a.getAttribute('uv').setXY(1,0,0);a.getAttribute('uv').setXY(2,0,0);
 for(let n=0;n<4;n++)for(const g of [a,b]){g.getAttribute('position').setZ(3,n*.013);g.computeVertexNormals();const reference=g.clone();reference.computeTangents();hair.updateHairTangents(g);assert.deepEqual(g.getAttribute('tangent').array,reference.getAttribute('tangent').array);assert.ok([...g.getAttribute('tangent').array].every(Number.isFinite));reference.dispose();}a.dispose();b.dispose();
});
test('V78 independent prepared models share a bounded synchronous tangent workspace',()=>{
 const geometries=Array.from({length:8},(_,i)=>new T.SphereGeometry(.2,12+i,8)).sort((a,b)=>b.getAttribute('position').count-a.getAttribute('position').count),Native=globalThis.Float64Array;let allocated=0;
 try{globalThis.Float64Array=class extends Native{constructor(...args){super(...args);allocated+=this.byteLength;}};for(const g of geometries){const reference=g.clone();reference.computeTangents();hair.updateHairTangents(g);assert.deepEqual(g.getAttribute('tangent').array,reference.getAttribute('tangent').array,'shared work cannot carry a previous mesh into the next');reference.dispose();}const largest=Math.max(...geometries.map(g=>g.getAttribute('position').count));assert.ok(allocated<=largest*3*8*2,`scratch must fit one largest mesh, allocated ${allocated} bytes`);}finally{globalThis.Float64Array=Native;geometries.forEach(g=>g.dispose());}
});
