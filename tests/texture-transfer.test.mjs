import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTexture} from '../lib/texture-loader.ts';
const bytes=new Uint8Array([1,2,3,4]),url='/textures/pbr/terrazzo-color.jpg';
function fixture(fetcher){const fetch=globalThis.fetch,bitmap=globalThis.createImageBitmap;globalThis.fetch=fetcher;globalThis.createImageBitmap=async(blob,options)=>({width:2,height:2,options,bytes:new Uint8Array(await blob.arrayBuffer())});return()=>{globalThis.fetch=fetch;globalThis.createImageBitmap=bitmap;};}
test('a failed response body gets exactly one fresh transfer and keeps the decoded bytes',async()=>{
 const requests=[],restore=fixture(async(url,options)=>{requests.push({url,options});if(requests.length===1)return {ok:true,blob:async()=>{throw new TypeError('Failed to fetch');}};return new Response(bytes);});
 try{const texture=await loadTexture(url);assert.deepEqual(texture.image.bytes,bytes);assert.equal(requests.length,2);assert.equal(requests[1].options.cache,'reload');assert.equal(texture.image.options.imageOrientation,'flipY');assert.equal(texture.flipY,false);}finally{restore();}
});
test('missing images fail without a retry',async()=>{let calls=0;const restore=fixture(async()=>{calls++;return new Response('missing',{status:404});});try{await assert.rejects(loadTexture(url),/404/);assert.equal(calls,1);}finally{restore();}});
test('a second transfer failure is surfaced instead of causing an endless retry',async()=>{let calls=0;const restore=fixture(async()=>{calls++;throw new TypeError('offline');});try{await assert.rejects(loadTexture(url),/offline/);assert.equal(calls,2);}finally{restore();}});
test('invalid decoded content is reported without another network transfer',async()=>{let calls=0;const restore=fixture(async()=>{calls++;return new Response(bytes);});globalThis.createImageBitmap=async()=>{throw new TypeError('invalid image');};try{await assert.rejects(loadTexture(url),/invalid image/);assert.equal(calls,1);}finally{restore();}});
