import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld} from '../lib/world.ts';

const context={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};

for(const area of ['annex','archive','plant'])test(`${area}: detailed shelving stays grounded, inside collision and within six draws per rack`,()=>{
  const world=buildWorld(new T.Scene(),area);world.root.updateMatrixWorld(true);
  try{
    const racks=world.root.children.filter(o=>o.name==='grounded-shelving');assert.ok(racks.length);
    for(const rack of racks){
      const solid=world.solids.find(s=>s.x===rack.position.x&&s.z===rack.position.z&&s.h===2.06);assert.ok(solid);
      let draws=0;
      rack.traverse(o=>{if(!o.isMesh)return;draws+=Array.isArray(o.material)?o.geometry.groups.length:1;
        for(const name of ['position','normal','uv'])assert.ok(Array.from(o.geometry.getAttribute(name).array).every(Number.isFinite));
        const positions=o.geometry.getAttribute('position'),p=new T.Vector3();
        for(let i=0;i<positions.count;i++){
          p.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);
          assert.ok(Math.abs(p.x-solid.x)<=solid.w/2+.002&&Math.abs(p.z-solid.z)<=solid.d/2+.002,`${area}: storage protrudes into its walkable aisle`);
          assert.ok(p.y>=-.002&&p.y<=2.062,'storage remains between floor and rack top');
        }
      });
      for(const sx of [-1,1])for(const sz of [-1,1]){
        const origin=new T.Vector3(solid.x+sx*(solid.w/2-.025),-.015,solid.z+sz*(solid.d/2-.025));
        const hit=new T.Raycaster(origin,new T.Vector3(0,1,0),0,.03).intersectObject(rack,true)[0];
        assert.ok(hit&&hit.point.y<.005,'each shelf upright must meet the floor');
      }
      assert.ok(draws<=6,`${draws} draws on one rack multiply across the archive`);
    }
  }finally{disposeWorld(world.root);}
});

test('rebuilding storage does not reuse disposed scene materials or textures',()=>{
  const first=buildWorld(new T.Scene(),'archive'),materials=new Set(),textures=new Set();
  first.root.children.filter(o=>o.name==='grounded-shelving').forEach(r=>r.traverse(o=>{if(o.isMesh){materials.add(o.material);for(const v of Object.values(o.material))if(v?.isTexture)textures.add(v);}}));
  const disposed=new Set();for(const resource of [...materials,...textures])resource.addEventListener('dispose',()=>disposed.add(resource));
  disposeWorld(first.root);assert.equal(disposed.size,materials.size+textures.size);
  const next=buildWorld(new T.Scene(),'archive');
  try{next.root.children.filter(o=>o.name==='grounded-shelving').forEach(r=>r.traverse(o=>{if(o.isMesh){assert.ok(!disposed.has(o.material));for(const v of Object.values(o.material))if(v?.isTexture)assert.ok(!disposed.has(v));}}));}
  finally{disposeWorld(next.root);}
});
