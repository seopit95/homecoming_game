import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTexture} from '../lib/texture-loader.ts';
const bytes=new Uint8Array([1,2,3,4]),url='/textures/test-original.jpg';
function fixture(fetcher){const fetch=globalThis.fetch,bitmap=globalThis.createImageBitmap;globalThis.fetch=fetcher;globalThis.createImageBitmap=async(blob,options)=>({width:2,height:2,options,bytes:new Uint8Array(await blob.arrayBuffer())});return()=>{globalThis.fetch=fetch;globalThis.createImageBitmap=bitmap;};}
test('a failed response body gets exactly one fresh transfer and keeps the decoded bytes',async()=>{
 const requests=[],restore=fixture(async(url,options)=>{requests.push({url,options});if(requests.length===1)return {ok:true,blob:async()=>{throw new TypeError('Failed to fetch');}};return new Response(bytes);});
 try{const texture=await loadTexture(url);assert.deepEqual(texture.image.bytes,bytes);assert.equal(requests.length,2);assert.equal(requests[1].options.cache,'reload');assert.equal(texture.image.options.imageOrientation,'flipY');assert.equal(texture.flipY,false);}finally{restore();}
});
test('missing images fail without a retry',async()=>{let calls=0;const restore=fixture(async()=>{calls++;return new Response('missing',{status:404});});try{await assert.rejects(loadTexture(url),/404/);assert.equal(calls,1);}finally{restore();}});
test('a second transfer failure is surfaced instead of causing an endless retry',async()=>{let calls=0;const restore=fixture(async()=>{calls++;throw new TypeError('offline');});try{await assert.rejects(loadTexture(url),/offline/);assert.equal(calls,2);}finally{restore();}});
test('invalid decoded content is reported without another network transfer',async()=>{let calls=0;const restore=fixture(async()=>{calls++;return new Response(bytes);});globalThis.createImageBitmap=async()=>{throw new TypeError('invalid image');};try{await assert.rejects(loadTexture(url),/invalid image/);assert.equal(calls,1);}finally{restore();}});


test('compact runtime textures retain orientation and recover from a missing derivative using the source',async()=>{
 const previousFetch=globalThis.fetch,previousBitmap=globalThis.createImageBitmap,requests=[];let absent=false;
 globalThis.fetch=async url=>{requests.push(url);return {ok:!(absent&&url.includes('/runtime/')),status:404,blob:async()=>({url})};};
 globalThis.createImageBitmap=async(blob,options)=>({url:blob.url,options,width:1024,height:1024});
 try{
  const {loadTexture}=await import('../lib/texture-loader.ts');
  let t=await loadTexture('/textures/pbr/asphalt-color.jpg',false);
  assert.equal(t.image.url,'/textures/runtime/pbr/asphalt-color.webp');assert.equal(t.image.options.imageOrientation,'none');assert.equal(t.flipY,false);
  requests.length=0;absent=true;t=await loadTexture('/textures/pbr/asphalt-color.jpg');
  assert.deepEqual(requests,['/textures/runtime/pbr/asphalt-color.webp','/textures/pbr/asphalt-color.jpg']);
  assert.equal(t.image.url,'/textures/pbr/asphalt-color.jpg');assert.equal(t.image.options.imageOrientation,'flipY');
  requests.length=0;globalThis.fetch=async url=>{requests.push(url);throw new TypeError('offline');};
  await assert.rejects(loadTexture('/textures/pbr/asphalt-color.jpg'),/offline/);assert.equal(requests.length,4,'both files retain one bounded transfer retry');
 }finally{globalThis.fetch=previousFetch;globalThis.createImageBitmap=previousBitmap;}
});
