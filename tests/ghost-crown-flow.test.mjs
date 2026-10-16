import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHair} from '../lib/ghost-hair.ts';

test('visible wet clumps continue from the crown into the hanging lengths',()=>{
 const {tails}=createHair(new T.Group()),g=tails.children[0].geometry,p=g.attributes.position,ix=g.index,adj=new Map();
 for(const group of g.groups.filter(g=>g.materialIndex===1))for(let i=group.start;i<group.start+group.count;i+=3){
  const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];for(const a of ids){if(!adj.has(a))adj.set(a,new Set());for(const b of ids)adj.get(a).add(b);}
 }
 const seen=new Set(),long=[];
 for(const start of adj.keys()){
  if(seen.has(start))continue;const stack=[start],vertices=[];
  while(stack.length){const i=stack.pop();if(seen.has(i))continue;seen.add(i);vertices.push(i);stack.push(...adj.get(i));}
  if(Math.min(...vertices.map(i=>p.getY(i)))<-.8)long.push(vertices);
 }
 assert.ok(long.length>=18,'the hanging hair needs several separate wet clumps');
 assert.ok(long.filter(v=>Math.max(...v.map(i=>p.getY(i)))>.31).length>=18,'hanging clumps stop below the crown, leaving the smooth cap exposed');
 for(const v of long){const band=v.filter(i=>Math.abs(p.getY(i)+.5)<.07);if(band.length<2)continue;const xs=band.map(i=>p.getX(i)),zs=band.map(i=>p.getZ(i));assert.ok(Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))<.12,'a wet clump becomes a broad flat curtain');}
});

test('the opaque scalp underlay stops above the temples instead of forming a short bob',()=>{
 const {tails}=createHair(new T.Group()),g=tails.children[0].geometry,p=g.attributes.position,ix=g.index;
 const vertices=new Set();for(const group of g.groups.filter(g=>g.materialIndex===0))for(let i=group.start;i<group.start+group.count;i++)vertices.add(ix.getX(i));
 assert.ok(Math.min(...[...vertices].map(i=>p.getY(i)))>=.109,'the broad opaque shell extends down beside the face');
});

test('wet hair keeps submillimetre relief along its vertical strands',async()=>{
 const {ghostHairMaterials}=await import('../lib/materials.ts');const [scalp,loose]=ghostHairMaterials();
 assert.ok(loose.bumpScale>0&&loose.bumpScale<=.001,'photographic strands must not displace normals at metre scale');
 assert.equal(loose.anisotropyRotation,Math.PI/2,'strand reflections follow the established vertical UV flow');
 scalp.dispose();loose.dispose();
});

test('the underlay below the frontal roots samples transparent scalp fade',()=>{
 const {tails}=createHair(new T.Group()),g=tails.children[0].geometry,p=g.attributes.position,fade=g.attributes.uv1,ix=g.index;let checked=0;
 for(const group of g.groups.filter(g=>g.materialIndex===0))for(let j=group.start;j<group.start+group.count;j++){
  const i=ix.getX(j);if(p.getY(i)>=.255)continue;checked++;assert.ok(fade.getY(i)<=.25,'a smooth opaque band is exposed below the frontal wet roots');
 }
 assert.ok(checked>100,'actual lower scalp triangles must be checked');
});
