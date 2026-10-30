import test from 'node:test';
import assert from 'node:assert/strict';
import {assetUrl} from '../lib/asset-url.ts';

test('static hosting resolves packaged game assets relative to the entry document',()=>{
 assert.equal(assetUrl('/audio/ghost-v136/female-sob.wav','./'),'./audio/ghost-v136/female-sob.wav');
 assert.equal(assetUrl('/models/facility/desk.webp','./'),'./models/facility/desk.webp');
 assert.equal(assetUrl('/textures/pbr/plaster-color.jpg','/game/'),'/game/textures/pbr/plaster-color.jpg');
});
test('the existing root deployment and external or already-relative URLs retain their meaning',()=>{
 assert.equal(assetUrl('/audio/test.wav'),'/audio/test.wav');
 for(const url of ['https://example.com/asset.jpg','//example.com/a.jpg','blob:local-id','data:image/png;base64,x','./texture.webp'])assert.equal(assetUrl(url,'./'),url);
});
