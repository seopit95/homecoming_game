import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createCRT,crtScreenGeometry} from '../lib/crt-monitor.ts';import {buildWorld,disposeWorld,hasLineOfSight} from '../lib/world.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
test('V67 CRT is human-scale with a real open bezel and four supported feet',()=>{
 const c=createCRT();c.root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(c.root),size=b.getSize(new T.Vector3());assert.ok(size.x>.5&&size.x<.65&&size.y>.45&&size.y<.65&&size.z>.45&&size.z<.65);let feet=0;c.root.traverse(o=>{if(o.name==='crt-rubber-foot'){feet++;assert.ok(Math.abs(new T.Box3().setFromObject(o).min.y)<.001);}});assert.equal(feet,4);
 const center=c.screenMount.getWorldPosition(new T.Vector3());for(const [dx,dy] of [[0,0],[-.12,0],[.12,0],[0,-.08],[0,.08]]){const hits=new T.Raycaster(center.clone().add(new T.Vector3(dx,dy,1)),new T.Vector3(0,0,-1)).intersectObject(c.root,true);assert.ok(hits.every(h=>h.point.z<center.z-.0005),'a solid box must not hide the display through the bezel opening');}
});
test('V67 convex raster surface keeps the original full rectangular UV image',()=>{
 const g=crtScreenGeometry(.72,.54),p=g.getAttribute('position'),uv=g.getAttribute('uv');let peak=0;for(let i=0;i<p.count;i++){peak=Math.max(peak,p.getZ(i));assert.ok(uv.getX(i)>=0&&uv.getX(i)<=1&&uv.getY(i)>=0&&uv.getY(i)<=1);if(uv.getX(i)===0||uv.getX(i)===1||uv.getY(i)===0||uv.getY(i)===1)assert.ok(Math.abs(p.getZ(i))<.0001);}assert.ok(peak>.01&&peak<.02);assert.ok(Math.abs(new T.Box3().setFromBufferAttribute(p).getSize(new T.Vector3()).x/.72-1)<.0001);
});
for(const [area,y,id] of [['office',.8,'monitor'],['annex',.82,'annex_dial'],['archive',.82,'archive_play']])test(`V67 ${area} workstation places its CRT feet on the desk and keeps a readable target`,()=>{
 const w=buildWorld(new T.Scene(),area);try{w.root.updateMatrixWorld(true);const crt=w.root.getObjectByName(area+'-crt-monitor');assert.ok(crt);let count=0;crt.traverse(o=>{if(o.name==='crt-rubber-foot'){count++;assert.ok(Math.abs(new T.Box3().setFromObject(o).min.y-y)<.001);}});assert.equal(count,4);const t=w.targets.find(t=>t.id===id);assert.ok(t);const approach=area==='office'?{x:-2.65,y:1.65,z:2.45}:area==='annex'?{x:.7,y:1.65,z:-19.7}:{x:9,y:1.65,z:-18.9};assert.ok(hasLineOfSight(approach,t.point,w.solids));}finally{disposeWorld(w.root);}
});

test('V67 real approach keeps top and bottom CCTV caption glyphs clear of the bezel',()=>{
 const c=createCRT();c.root.position.set(-2.65,.8,1.76);c.root.updateMatrixWorld(true);const eye=new T.Vector3(-2.65,1.65,2.45);
 for(const x of [-.33,0,.33])for(const y of [-.255,.258]){
  const z=.013*(1-(x/.36)**2)*(1-(y/.27)**2),point=c.screenMount.localToWorld(new T.Vector3(x,y,z)),ray=new T.Raycaster(eye,point.clone().sub(eye).normalize(),0,eye.distanceTo(point)-.0001);
  const blockers=ray.intersectObject(c.root,true).filter(h=>h.object.name==='crt-open-bezel'||h.object.name==='crt-rear-housing');assert.equal(blockers.length,0,`caption ${x},${y} hidden by bezel at actual standing approach`);
 }
});
