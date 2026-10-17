import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {buildCourtyard} from '../lib/courtyard.ts';import {disposeWorld,hasLineOfSight,canStandAt} from '../lib/world.ts';
test('courtyard photographed planting is rooted in the four existing soil beds and clears the walking paths',()=>{
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};const root=new T.Group();
 try{buildCourtyard(root);root.updateMatrixWorld(true);const planting=root.getObjectByName('courtyard-living-planting');assert.ok(planting,'replace polyhedral topiary with authored source plants');let count=0;const matrix=new T.Matrix4();
 planting.traverse(o=>{if(!o.isInstancedMesh)return;assert.equal(o.material.alphaTest,.5,'source leaf silhouettes must be cut out rather than opaque atlas rectangles');assert.equal(o.material.side,T.DoubleSide);o.geometry.computeBoundingBox();for(let i=0;i<o.count;i++){
  o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);const b=o.geometry.boundingBox.clone().applyMatrix4(matrix),center=b.getCenter(new T.Vector3());const x=center.x<0?-29:29,z=center.z<0?-18:18;
  assert.ok(b.min.x>=x-.625-.001&&b.max.x<=x+.625+.001,'new leaves stay in the existing bed width');assert.ok(b.min.z>=z-1.5-.001&&b.max.z<=z+1.5+.001,'new leaves stay in the existing bed length');assert.ok(Math.abs(b.min.y-.51)<.001,'stem geometry meets the actual soil');assert.ok(b.max.y>1&&b.max.y<1.3,'plants keep a human-scale silhouette');count++;
 }});assert.equal(count,12);
 }finally{disposeWorld(root);}
});
test('clear booth glass allows sight while blocking movement, reaching and contact',()=>{
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};const root=new T.Group();try{
  const w=buildCourtyard(root),outside={x:-29,y:1.35,z:30},inside={x:-27,y:1.65,z:30};
  assert.equal(canStandAt(-28,30,w.solids),false);assert.equal(hasLineOfSight(outside,inside,w.solids),false,'the pane still blocks physical reach/contact');assert.equal(hasLineOfSight(outside,inside,w.solids,true),true,'a transparent pane cannot hide a visible player');
  const panes=root.children.filter(o=>o.isMesh&&o.geometry.type==='BoxGeometry'&&o.material.transparent);assert.ok(panes.length>4);assert.ok(panes.every(o=>!o.castShadow),'clear panes cannot cast an opaque flashlight shadow');
 }finally{disposeWorld(root);}
});
