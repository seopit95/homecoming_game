import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import * as materials from '../lib/materials.ts';

// Supply decoded fabric pixels at the material boundary; procedural sedan
// construction, cloning, deformation and disposal stay real.
const fabric=new T.DataTexture(new Uint8Array([80,90,85,255]),1,1);
const fabricShader=shader=>{shader.fragmentShader+='\n// sedan fabric';};
await mock.module('../lib/materials.ts',{namedExports:{...materials,upholstery(color){
 const material=new T.MeshStandardMaterial({color,map:fabric.clone(),roughness:.86});
 material.onBeforeCompile=fabricShader;material.customProgramCacheKey=()=> 'sedan-fabric-test';return material;
}}});
const {createSedan}=await import('../lib/sedan.ts');
const {createVehicleWreck}=await import('../lib/vehicle-wreck.ts');

function meshes(root){const result=[];root.traverse(o=>{if(o.isMesh)result.push(o);});return result;}
function dispose(root){const geometries=new Set(),materials=new Set(),textures=new Set();for(const mesh of meshes(root)){geometries.add(mesh.geometry);for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}}for(const item of [...geometries,...materials,...textures])item.dispose();}
function equalShape(a,b){
 const aa=[],bb=[];a.traverse(o=>aa.push(o));b.traverse(o=>bb.push(o));assert.equal(aa.length,bb.length);
 for(let i=0;i<aa.length;i++){
  const x=aa[i],y=bb[i];assert.equal(x.name,y.name);assert.equal(x.type,y.type);assert.deepEqual(x.position.toArray(),y.position.toArray());assert.deepEqual(x.quaternion.toArray(),y.quaternion.toArray());assert.deepEqual(x.scale.toArray(),y.scale.toArray());assert.equal(x.visible,y.visible);assert.equal(x.castShadow,y.castShadow);assert.equal(x.receiveShadow,y.receiveShadow);
  if(!x.isMesh)continue;
  assert.notEqual(x.geometry,y.geometry);assert.deepEqual(Object.keys(x.geometry.attributes),Object.keys(y.geometry.attributes));assert.deepEqual(x.geometry.groups,y.geometry.groups);
  assert.deepEqual(x.geometry.index?.array,y.geometry.index?.array);
  for(const key of Object.keys(x.geometry.attributes)){assert.deepEqual(x.geometry.attributes[key].array,y.geometry.attributes[key].array);assert.notEqual(x.geometry.attributes[key].array,y.geometry.attributes[key].array);}
 }
}

test('all eight sedan variants reuse procedural construction independently of paint color',t=>{
 // oxlint-disable-next-line typescript/unbound-method -- The instrumentation calls the saved method with its original receiver.
 const compute=T.BufferGeometry.prototype.computeVertexNormals;let calls=0;
 T.BufferGeometry.prototype.computeVertexNormals=function(){calls++;return compute.call(this);};
 try{for(const damaged of [false,true])for(const driving of [false,true])for(const passengerAccess of [false,true]){
  calls=0;const start=performance.now(),a=createSedan('#566468',damaged,driving,passengerAccess),firstMs=performance.now()-start,firstCalls=calls;
  calls=0;const secondStart=performance.now(),b=createSedan('#945139',damaged,driving,passengerAccess),secondMs=performance.now()-secondStart;
  try{
   assert.ok(firstCalls>0,'each uncached variant constructs its own geometry');
   assert.equal(calls,0,`cached ${damaged}/${driving}/${passengerAccess} must not recompute geometry normals`);
   equalShape(a,b);assert.equal(a.name,damaged?'hit-and-run-car':'parked-sedan');
   assert.equal(Boolean(a.getObjectByName('hero-driver-door')),driving);assert.equal(Boolean(a.getObjectByName('hero-passenger-door')),driving&&passengerAccess);assert.equal(Boolean(a.getObjectByName('hero-hood')),driving);
   for(const mesh of meshes(b)){if(mesh.material.vertexColors)assert.equal(mesh.material.color.getHexString(),'945139');}
   t.diagnostic(`${damaged}/${driving}/${passengerAccess}: normals ${firstCalls} -> ${calls}; constructor ${firstMs.toFixed(1)} -> ${secondMs.toFixed(1)} ms (one in-process sample)`);
  }finally{dispose(a);dispose(b);}
 }}finally{T.BufferGeometry.prototype.computeVertexNormals=compute;}
});

test('doors, wreck deformation, materials, textures and disposal cannot alter another car or its template',()=>{
 const a=createSedan('#567890',true,true,true),b=createSedan('#567890',true,true,true),expected=createSedan('#567890',true,true,true);
 let wreck;
 try{
  const aa=meshes(a),bb=meshes(b);assert.equal(aa.length,bb.length);
  for(let i=0;i<aa.length;i++){
   assert.notEqual(aa[i].material,bb[i].material);
   if(aa[i].material.map){assert.notEqual(aa[i].material.map,bb[i].material.map);assert.equal(aa[i].material.onBeforeCompile,fabricShader);assert.equal(aa[i].material.customProgramCacheKey(),'sedan-fabric-test');aa[i].material.map.offset.x=99;assert.notEqual(bb[i].material.map.offset.x,99);}
  }
  a.getObjectByName('hero-driver-door').rotation.y=1.1;a.getObjectByName('hero-passenger-door').rotation.y=-.8;
  wreck=createVehicleWreck(a);wreck.pose(1);
  aa[0].material.color.set('#ffffff');aa[0].geometry.attributes.position.setX(0,999);
  equalShape(b,expected);wreck.dispose();wreck=undefined;dispose(a);
  const after=createSedan('#567890',true,true,true);try{equalShape(after,expected);}finally{dispose(after);}
 }finally{wreck?.dispose();dispose(b);dispose(expected);}
});
