import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {facilityModel} from '../lib/facility-models.ts';
import assets from '../lib/assets/facility-models.json' with {type:'json'};

// Replace browser decode/file I/O only; the real preload, materials, clones,
// ownership and failure cleanup execute unchanged.
test('visual preloading decodes upload-ready bitmaps with the authored surface and facility orientation',async()=>{
 const html=T.TextureLoader.prototype.loadAsync,fetch=globalThis.fetch,previous=globalThis.createImageBitmap,images=[];
 globalThis.fetch=async url=>({ok:true,blob:async()=>({url})});T.TextureLoader.prototype.loadAsync=async url=>new T.Texture({html:url});
 globalThis.createImageBitmap=async(blob,options)=>{const image={url:blob.url,options:{...options},width:2,height:2};images.push(image);return image;};
 try{
  const m=await import('../lib/materials.ts?bitmap-first');await m.prepareVisuals();const wood=m.surface('wood');
  assert.equal(wood.map.image.options?.imageOrientation,'flipY','surface images must be oriented before their first upload');assert.equal(wood.map.image.options?.premultiplyAlpha,'none');assert.equal(wood.map.flipY,false,'an already-oriented bitmap must not request a second flip');assert.equal(wood.map.colorSpace,T.SRGBColorSpace);assert.equal(wood.normalMap.colorSpace,T.NoColorSpace);
  const prop=facilityModel(Object.keys(assets.models)[0]);let map;prop.traverse(o=>{if(o.isMesh&&o.material.map)map=o.material.map;});assert.equal(map.image.options?.imageOrientation,'none','source-authored facility UVs keep their existing unflipped image orientation');assert.equal(map.flipY,false);
 }finally{T.TextureLoader.prototype.loadAsync=html;globalThis.fetch=fetch;globalThis.createImageBitmap=previous;}
});
test('failed bitmap preparation closes unpublished images and a retry owns live images',async()=>{
 const html=T.TextureLoader.prototype.loadAsync,fetch=globalThis.fetch,previous=globalThis.createImageBitmap,images=[];let fail=true;
 globalThis.fetch=async url=>({ok:!(fail&&/\/wood-normal\.(jpg|webp)$/.test(url)),status:404,blob:async()=>({url})});T.TextureLoader.prototype.loadAsync=async url=>{if(fail&&/\/wood-normal\.(jpg|webp)$/.test(url))throw Error('missing map');return new T.Texture({html:url});};
 globalThis.createImageBitmap=async()=>{const image={width:2,height:2,closed:false,close(){this.closed=true;}};images.push(image);return image;};
 try{
  const m=await import('../lib/materials.ts?bitmap-retry');await assert.rejects(m.prepareVisuals(),/Visual asset loading failed/);assert.ok(images.length>0);assert.ok(images.every(i=>i.closed),'failed preparation must release all successful unpublished bitmaps');
  fail=false;const start=images.length;await m.prepareVisuals();assert.ok(images.slice(start).every(i=>!i.closed));assert.equal(m.surface('wood').map.image.closed,false,'the successful source stays alive for world clones and context restoration');
 }finally{T.TextureLoader.prototype.loadAsync=html;globalThis.fetch=fetch;globalThis.createImageBitmap=previous;}
});

test('a browser without bitmap decoding keeps the legacy upload orientation for both UV conventions',async()=>{
 const previous=globalThis.createImageBitmap,load=T.TextureLoader.prototype.loadAsync;globalThis.createImageBitmap=undefined;T.TextureLoader.prototype.loadAsync=async()=>new T.Texture({width:2,height:2});
 try{const {loadTexture}=await import('../lib/texture-loader.ts');const surface=await loadTexture('/fallback-surface.png'),facility=await loadTexture('/fallback-facility.png',false);assert.equal(surface.flipY,true);assert.equal(facility.flipY,false);assert.equal(surface.image.width,2);}
 finally{globalThis.createImageBitmap=previous;T.TextureLoader.prototype.loadAsync=load;}
});
