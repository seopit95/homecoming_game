import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {buildCourtyard} from '../lib/courtyard.ts';import {hasLineOfSight,disposeWorld} from '../lib/world.ts';
test('closed booth panes block physical rays at every small translation while retaining visual glass passage',()=>{
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};const root=new T.Group();
 try{const w=buildCourtyard(root);root.updateMatrixWorld(true);const pane=root.children.find(o=>o.isMesh&&o.position.x===-28&&o.position.y===1.52&&o.position.z===30);assert.ok(pane);
  for(let i=0;i<20;i++){const offset=i*.005,from=new T.Vector3(-29+offset,1.35,30),to=new T.Vector3(-27+offset,1.65,30),d=to.clone().sub(from);assert.ok(new T.Raycaster(from,d.clone().normalize(),.1,d.length()-.15).intersectObject(pane).length,'the actual rendered pane obstructs this segment');assert.equal(hasLineOfSight(from,to,w.solids),false,'physical obstruction at offset '+offset);assert.equal(hasLineOfSight(from,to,w.solids,true),true,'glass remains visually transparent');}
 }finally{disposeWorld(root);}
});
test('thin opaque rotated leaves agree with rendered geometry for crossing and clear rays',()=>{
 const material=new T.MeshBasicMaterial({side:T.DoubleSide});
 try{for(const yaw of [0,Math.PI/4,Math.PI/2,2.23]){
  const solid={x:.055,z:0,y:1.4,w:.01,h:2.8,d:2,yaw},mesh=new T.Mesh(new T.BoxGeometry(solid.w,solid.h,solid.d),material);mesh.position.set(solid.x,solid.y,solid.z);mesh.rotation.y=yaw;mesh.updateMatrixWorld(true);
  try{for(let i=0;i<20;i++){const z=i*.005,from=new T.Vector3(-3,1.3,z),to=new T.Vector3(3,1.7,z),d=to.clone().sub(from);const expected=!new T.Raycaster(from,d.clone().normalize(),.1,d.length()-.15).intersectObject(mesh).length;assert.equal(hasLineOfSight(from,to,[solid]),expected,`yaw${yaw} offset${z}`);assert.equal(hasLineOfSight(from,to,[solid],true),expected,'opaque leaves never become visual glass');}
   for(const y of [-.1,3.1])assert.equal(hasLineOfSight({x:-3,y,z:0},{x:3,y,z:0},[solid]),true,'clearance above/below the actual leaf');
  }finally{mesh.geometry.dispose();}
 }}finally{material.dispose();}
});
test('continuous rays preserve interaction endpoint margins and open-volume boundaries',()=>{
 const from={x:0,y:1.5,z:0},to={x:2,y:1.5,z:0},box={x:1,z:0,y:1.5,w:.02,h:3,d:1};
 assert.equal(hasLineOfSight(from,to,[{...box,x:.05}]),true,'original10cm eye clearance');assert.equal(hasLineOfSight(from,to,[{...box,x:1.94}]),true,'original15cm target clearance');assert.equal(hasLineOfSight(from,to,[{...box,x:1.7}]),false,'an intervening face before the target margin still blocks');
 assert.equal(hasLineOfSight({x:0,y:3,z:0},{x:2,y:3,z:0},[box]),true,'grazing the top surface is not crossing the volume');
 for(const key of ['w','h','d'])assert.equal(hasLineOfSight(from,to,[{...box,[key]:0}]),true,'opened zero-volume collider');assert.equal(hasLineOfSight(from,from,[box]),true);
});
