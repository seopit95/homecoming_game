import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {existsSync} from 'node:fs';
import hints from '../lib/visual-preloads.json' with {type:'json'};
const requested=[];
mock.module('../lib/texture-loader.ts',{namedExports:{loadTexture:async url=>{requested.push(url);return new T.Texture({width:1,height:1});}}});
test('early visual hints cover exactly the real startup fetches, including facility models',async()=>{
 const {prepareVisuals}=await import('../lib/materials.ts');await prepareVisuals();
 assert.deepEqual([...new Set(hints)].sort(),[...new Set(requested)].sort());
 assert.equal(hints.length,new Set(hints).size);
 for(const url of hints)assert.ok(existsSync(new URL('../public'+url,import.meta.url)),url);
});
