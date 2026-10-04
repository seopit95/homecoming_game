import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld} from '../lib/world.ts';

// Retain printed text only to identify the real scene's signage in diagnostics.
globalThis.document={createElement:()=>{
  const canvas={width:0,height:0,texts:[]};
  canvas.getContext=()=>({fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(text){canvas.texts.push(text);}});
  return canvas;
}};

for(const area of ['apartment','landing','lift','corridor','stairs','resident','office','annex','courtyard','archive','plant','parking'])test(`${area}: printed vertical signs are supported and unobstructed across their face`,()=>{
  const world=buildWorld(new T.Scene(),area);world.root.updateMatrixWorld(true);
  try{
    const signs=[],supports=[];
    world.root.traverse(o=>{
      if(!o.isMesh)return;
      for(let p=o;p;p=p.parent)if(p===world.figure)return;
      if(o.geometry.type==='PlaneGeometry'&&o.material?.map?.image?.texts?.length&&!o.material.transparent)signs.push(o);
      else if(o.geometry.type!=='PlaneGeometry')supports.push(o);
    });
    const failures=[];
    const check=(state)=>{world.root.updateMatrixWorld(true);for(const sign of signs){
      const normal=new T.Vector3(0,0,1).transformDirection(sign.matrixWorld);
      if(Math.abs(normal.y)>.8)continue; // A horizontal document rests on its table.
      const {width,height}=sign.geometry.parameters;
      const samples=[-.4,-.3,-.2,-.1,0,.1,.2,.3,.4];
      for(const [u,v] of samples.flatMap(u=>samples.map(v=>[u,v]))){
        const origin=new T.Vector3(width*u,height*v,.002).applyMatrix4(sign.matrixWorld);
        const hit=new T.Raycaster(origin,normal.clone().negate(),0,.032).intersectObjects(supports,false)[0];
        if(!hit){failures.push(`${state}: ${sign.material.map.image.texts.join(' / ')} at ${sign.position.toArray()} has no backing at ${u},${v}`);break;}
        const face=origin.clone().addScaledVector(normal,.098);
        const obstruction=new T.Raycaster(face,normal.clone().negate(),0,.0995).intersectObjects(supports,false)[0];
        if(obstruction){failures.push(`${state}: ${sign.material.map.image.texts.join(' / ')} is obscured ${.1-obstruction.distance}m in front of its face at ${u},${v}`);break;}
      }
    }};
    check('closed');
    const stages={apartment:['escape'],corridor:['corridor_departure'],stairs:['stairs_passage'],resident:['resident_entry','resident_departure'],office:['office_departure'],annex:['annex_departure'],archive:['archive_departure'],plant:['plant_departure'],courtyard:['court_departure']}[area]??[];
    if(area==='apartment')world.root.getObjectByName('front-door').userData.openRequested=true;
    for(const stage of stages){world.updateStory(stage,0,false);world.updateStory(stage,2,false);check(stage);}
    assert.deepEqual(failures,[],'signs must be attached to a wall, case, frame or supported board');
  }finally{disposeWorld(world.root);}
});

test('landing floor number is readable from the corridor and call-button approach',()=>{
  const world=buildWorld(new T.Scene(),'landing');world.root.updateMatrixWorld(true);
  try{
    let sign;const meshes=[];world.root.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(p===world.figure)return;meshes.push(o);if(o.material?.map?.image?.texts?.includes('28층'))sign=o;});
    assert.ok(sign,'floor number exists');const {width,height}=sign.geometry.parameters;
    for(const eye of [[-.5,1.65,-20.7],[0,1.65,-20.7],[.55,1.65,-20.7],[.95,1.65,-21.2]])for(const u of [-.4,0,.4])for(const v of [-.4,0,.4]){
      const point=new T.Vector3(width*u,height*v,0).applyMatrix4(sign.matrixWorld),origin=new T.Vector3(...eye),direction=point.clone().sub(origin),distance=direction.length();
      const first=new T.Raycaster(origin,direction.normalize(),0,distance+.001).intersectObjects(meshes,false)[0];
      assert.ok(first?.object===sign,`floor number is hidden from ${eye} at ${u},${v}`);
    }
  }finally{disposeWorld(world.root);}
});
