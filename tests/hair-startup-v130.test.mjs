import test,{mock}from'node:test';import assert from'node:assert/strict';import*as T from'three';
const requested=[];mock.module('../lib/texture-loader.ts',{namedExports:{loadTexture:async url=>{requested.push(url);return new T.Texture({width:1,height:1});}}});
// Obsolete card textures must not delay entering a game that renders real strands.
test('V130 strand hair starts without downloading the retired hair-card images',async()=>{
 const{prepareVisuals}=await import('../lib/materials.ts');await prepareVisuals();assert.ok(requested.includes('/textures/ghost-face-v4.webp'),'normal character art still prepares');assert.equal(requested.some(url=>/ghost-hair-(long01|locks)/.test(url)),false,'unused cutout images cannot block startup');
});
