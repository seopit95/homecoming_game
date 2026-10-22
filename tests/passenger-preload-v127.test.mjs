import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
let failBase=false,portraitAttempts=0;
mock.module('../lib/texture-loader.ts',{namedExports:{loadTexture:async url=>{
 if(url==='/textures/ghost-passenger-v127.webp'){portraitAttempts++;throw new Error('portrait unavailable');}
 if(failBase&&url.endsWith('/environment-v3.webp'))throw new Error('required surface unavailable');
 return new T.Texture();
}}});
mock.module('../lib/facility-models.ts',{namedExports:{prepareFacilityModels:async()=>{}}});
test('V127 missing optional passenger portrait allows the old head fallback without masking required asset errors',async()=>{
 const {prepareVisuals}=await import('../lib/materials.ts');
 await assert.doesNotReject(prepareVisuals());assert.equal(portraitAttempts,1,'the optional preload is attempted and awaited');
 const {createPassengerPortrait}=await import('../lib/passenger-portrait.ts');
 const figure=new T.Group(),head=new T.Group();head.name='ghost-head';figure.add(head);
 const collar=new T.Mesh(new T.PlaneGeometry(),new T.MeshStandardMaterial());collar.name='ghost-collar-skin';figure.add(collar);
 const portrait=createPassengerPortrait(figure);portrait.pose(new T.PerspectiveCamera(),0,true);
 assert.equal(head.visible,true);assert.equal(portrait.mesh.visible,false,'failed portrait leaves the complete native head visible');
 failBase=true;const required=await import('../lib/materials.ts?v127-required-error');
 await assert.rejects(required.prepareVisuals(),/Visual asset loading failed/,'required textures must still stop preparation');
});
