import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSedan} from '../lib/props.ts';
import {buildWorld,disposeWorld,canStandAt} from '../lib/world.ts';
import {solidContainsPoint} from '../lib/collision.ts';

test('parking sedans keep detailed geometry within a 14-mesh prop budget',()=>{
  for(const damaged of [false,true]){
    const car=createSedan('#566468',damaged);let draws=0;
    car.traverse(o=>{if(o.isMesh)draws+=Array.isArray(o.material)?o.geometry.groups.length:1;});
    assert.ok(draws<=14,`${draws} mesh submissions per car multiply across the nine-car parking room`);
    disposeWorld(car);
  }
});

test('all four sedan tires touch the floor and generated surfaces remain finite',()=>{
  const car=createSedan('#566468',true);car.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(car);assert.ok(bounds.min.y>=-.005);
  for(const x of [-.86,.86])for(const z of [-1.35,1.35]){
    const hit=new T.Raycaster(new T.Vector3(x,-.1,z),new T.Vector3(0,1,0),0,.2).intersectObject(car,true)[0];
    assert.ok(hit&&hit.point.y<=.012,`floating tire at ${x},${z}`);
  }
  car.traverse(o=>{if(o.isMesh)for(const key of ['position','normal'])assert.ok(Array.from(o.geometry.getAttribute(key).array).every(Number.isFinite));});
  disposeWorld(car);
});

const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
for(const [area,x,z] of [['parking',5,-18],['courtyard',-25,-15]])test(`${area}: the car mirrors block the actor without filling the whole side aisle`,()=>{
  const world=buildWorld(new T.Scene(),area);
  for(const side of [-1,1]){
    assert.equal(canStandAt(x+side*1.04,z+.65,world.solids,.01,world.bounds),false,'visible mirror must have collision');
    assert.equal(canStandAt(x+side*1.06,z-.6,world.solids,.02,world.bounds),true,'the narrower body leaves space behind the mirror');
  }
  world.root.updateMatrixWorld(true);
  const car=area==='parking'?world.root.getObjectByName('hit-and-run-car'):world.root.getObjectByName('parked-sedan');
  const nearby=world.solids.filter(s=>Math.abs(s.x-x)<1.5&&Math.abs(s.z-z)<2.5),v=new T.Vector3();
  car.traverse(o=>{if(o.isMesh){const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
    assert.ok(nearby.some(s=>solidContainsPoint(s,v.x,v.z,.002)),`unprotected car surface at ${v.toArray()}`);
  }}});
  disposeWorld(world.root);
});
