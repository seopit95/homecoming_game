import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {buildWorld,disposeWorld,canStandAt} from '../lib/world.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}})})};
// The removed seventeen footprints must become real walkable floor, including
// after a cached world's reset. Quest safes are not hiding cabinets.
const removed={corridor:[[2.8,0],[-2.8,17]],stairs:[[-.5,-4.6]],resident:[[3.75,-1.2]],office:[[-5.1,4.8],[5.1,-6]],annex:[[-16.25,4],[16.25,-13]],courtyard:[[-30.7,12],[30.7,-12]],archive:[[-14.25,3],[14.25,-14]],plant:[[-16.25,3],[16.25,-14]],parking:[[-11.2,7],[11.2,-6],[-11.2,-20]]};
for(const [area,footprints] of Object.entries(removed))test(`V119 ${area} has no hiding cabinet, prompt or invisible shell after build/reset`,()=>{
 const w=buildWorld(new T.Scene(),area);try{for(const reset of [false,true]){if(reset)w.reset();assert.equal(w.hidingPlaces.length,0);assert.ok(!w.targets.some(t=>t.id==='shelter'));w.root.traverse(o=>{assert.ok(!o.name.startsWith('shelter-')&&!o.userData.shelter,'the cabinet geometry must also be removed');});for(const [x,z] of footprints)assert.ok(canStandAt(x,z,w.solids,.23,w.bounds),`${area}: removed shell still blocks ${x},${z}`);}}finally{disposeWorld(w.root);}
});
