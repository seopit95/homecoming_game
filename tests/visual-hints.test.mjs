import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {existsSync} from 'node:fs';
import hints from '../lib/visual-preloads.json' with {type:'json'};
const requested=[];
mock.module('../lib/texture-loader.ts',{namedExports:{loadTexture:async url=>{requested.push(url);return new T.Texture({width:1,height:1});}}});
test('early visual hints use a small budget and match real startup fetches',async()=>{
 const {prepareVisuals}=await import('../lib/materials.ts');await prepareVisuals();
 assert.ok(hints.length>0&&hints.length<=3,'early hints must leave room for bootstrap scripts');
 for(const url of hints)assert.ok(requested.includes(url),url);
 assert.equal(hints.length,new Set(hints).size);
 for(const url of hints)assert.ok(existsSync(new URL('../public'+url,import.meta.url)),url);
});
