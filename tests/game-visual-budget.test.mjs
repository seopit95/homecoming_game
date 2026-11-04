import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
const requested=[];let failedURL;
mock.module('../lib/texture-loader.ts',{namedExports:{loadTexture:async url=>{requested.push(url);if(url===failedURL)throw Error('unavailable map');const texture=new T.Texture({width:1,height:1});texture.name=url;return texture;}}});
const {prepareVisuals,surface,livingMaterial,residentPhotoMaterial}=await import('../lib/materials.ts');
const {facilityModel}=await import('../lib/facility-models.ts');
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}})})};
const {buildWorld,disposeWorld}=await import('../lib/world.ts'),{buildRoad}=await import('../lib/prologue.ts'),{createViewmodel}=await import('../lib/viewmodel.ts');
function campaignMaterials(areas=['apartment','landing','lift','corridor','transfer','stairs','annex','archive','plant','parking','aftermath','opening-road','ending-road','hands']){
 const result={};
 for(const area of areas){
  const scene=new T.Scene(),world=area==='hands'?createViewmodel():area.endsWith('-road')?buildRoad(scene,area==='ending-road'):buildWorld(scene,area),root=area==='hands'?world.scene:world.root,materials=[];
  root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.push({name:m.name,type:m.type,color:m.color?.getHexString(),roughness:m.roughness,metalness:m.metalness,maps:Object.fromEntries(Object.entries(m).filter(([,v])=>v?.isTexture).map(([key,v])=>[key,v.name]))});});
  result[area]=materials;disposeWorld(root);
 }return result;
}

test('initial preparation contains the first apartment and opening but defers distant-only images',async()=>{
 await prepareVisuals('initial');
 assert.equal(requested.some(url=>/cast-concrete|bag-leather|metal_office_desk/.test(url)),false,'later rooms must not block the first apartment');
 const first=campaignMaterials(['apartment','opening-road','hands']);
 for(const area of ['landing','lift','corridor','stairs','transfer','annex','archive','plant','parking','aftermath','ending-road']){await prepareVisuals(area);Object.assign(first,campaignMaterials([area]));}
 await prepareVisuals('game');
 assert.deepEqual(campaignMaterials(),first,'each staged room retains every original material and map');
});

test('game preparation excludes retired photos, soil and facility models while retaining current materials',async()=>{
 await prepareVisuals('game');
 assert.equal(requested.some(url=>/resident-memory-photo|pedestrian-shirt-v1|\/soil-|cassette_player|power_box|shrub_02/.test(url)),false,'retired-only images must not block the playable campaign');
 for(const url of ['/textures/smartphone-hand-v1.webp','/textures/pedestrian-shirt-normal-v1.webp','/textures/ghost-face-v4.webp','/textures/pbr/terrazzo-color.jpg'])assert.ok(requested.includes(url),url);
 assert.equal(surface('oldTile').map.name,'/textures/pbr/terrazzo-color.jpg');
 const desk=facilityModel('metal_office_desk');let mapped=false;desk.traverse(o=>{if(o.isMesh&&o.material.map)mapped=true;});assert.ok(mapped,'current desks retain the source textures');
 const current=campaignMaterials();
 const count=requested.length;await prepareVisuals('game');assert.equal(requested.length,count,'repeated game preparation cannot redownload images');
 await prepareVisuals();
 assert.deepEqual(campaignMaterials(),current,'every prepared map, both road sequences and held hands retain the same materials and image URLs');
 assert.equal(surface('soil').map.name,'/textures/pbr/soil-color.jpg');assert.equal(livingMaterial('shirt').map.name,'/textures/pedestrian-shirt-v1.webp');assert.equal(residentPhotoMaterial().map.name,'/textures/resident-memory-photo-v1.webp');
 const shrub=facilityModel('shrub_02_a');let image;shrub.traverse(o=>{if(o.isMesh&&o.material.map)image=o.material.map.name;});assert.match(image,/shrub_02_diff/,'legacy authoring preparation still restores retired-area photographs');
});

test('concurrent game and full preparations fetch each core photograph only once',async()=>{
 const {prepareVisuals}=await import('../lib/materials.ts?scope-concurrency'),start=requested.length;
 await Promise.all([prepareVisuals('all'),prepareVisuals('game')]);
 const calls=requested.slice(start);assert.equal(calls.filter(url=>url==='/textures/ghost-face-v4.webp').length,1);assert.equal(calls.filter(url=>url==='/textures/pbr/soil-color.jpg').length,1);
});

test('concurrent facility failures retry only the missing image and retain successful source maps',async()=>{
 const m=await import('../lib/facility-models.ts?partial-retry'),start=requested.length;
 failedURL='/models/facility/metal_office_desk_nor_gl_1k.webp';
 try{const result=await Promise.allSettled([m.prepareFacilityModels(['metal_office_desk']),m.prepareFacilityModels(['metal_office_desk'])]);assert.ok(result.every(r=>r.status==='rejected'));assert.equal(requested.slice(start).filter(url=>url===failedURL).length,1);}
 finally{failedURL=undefined;}
 const retry=requested.length;await m.prepareFacilityModels(['metal_office_desk']);assert.deepEqual(requested.slice(retry),['/models/facility/metal_office_desk_nor_gl_1k.webp']);
 const desk=m.facilityModel('metal_office_desk');desk.traverse(o=>{if(o.isMesh)assert.ok(o.material.map&&o.material.normalMap&&o.material.roughnessMap);});
});
