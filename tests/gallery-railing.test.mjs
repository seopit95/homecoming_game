import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildResidentialGallery} from '../lib/residential-gallery.ts';
import {residentialRoute as R} from '../lib/residential-route.ts';
import {solidContainsPoint} from '../lib/collision.ts';
const ctx={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},arc(){},fill(){}};
// The minimal canvas factory is a test stub, not a deprecated browser call.
// oxlint-disable-next-line typescript/no-deprecated
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
for(const area of ['landing','corridor','transfer'])test(`${area}: exterior guardrail reaches the elevator bank without blocking either doorway`,()=>{
 const root=new T.Group(),w=buildResidentialGallery(root,area,true);root.updateMatrixWorld(true);
 // A transverse ray must hit both the parapet and each rail throughout the
 // previously missing 1.75m between the long corridor and the elevator bank.
 for(const z of [-22.65,-22.2,-21.5,-21,-20.8])for(const y of [.44,.95,1.14]){
  const hits=new T.Raycaster(new T.Vector3(-.9,y,z),new T.Vector3(-1,0,0),0,.6).intersectObject(root,true);
  assert.ok(hits.length,`guardrail missing at y=${y}, z=${z}`);
 }
 for(const z of [-22.65,-22.2,-21.5])assert.ok(w.solids.some(s=>s.h===.88&&solidContainsPoint(s,-1.3,z)),'visible parapet has matching edge collision');
 assert.equal(w.bounds.minX,-1.17,'existing outer movement limit stays unchanged');
 for(const x of [0,R.gallery.secondLiftX])for(const z of [-21.4,-22.1])assert.ok(!w.solids.some(s=>solidContainsPoint(s,x,z,.23)),`lift approach ${x},${z} remains clear`);
 for(const x of [0,R.gallery.secondLiftX]){
  const fixed=w.solids.filter(s=>s.d!==.06);
  assert.ok(!fixed.some(s=>solidContainsPoint(s,x,R.gallery.liftZ,.23)),'open lift aperture remains clear');
 }
});
