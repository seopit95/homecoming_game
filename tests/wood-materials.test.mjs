import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {prepareVisuals,surface} from '../lib/materials.ts';
import {disposeWorld} from '../lib/world.ts';

// Losing the physical branch, channel decoding, scale or clone ownership must fail.
// Only browser image loading is replaced; textures/materials/disposal stay real.
test('prepared wood surfaces own photographic PBR maps at their source scale',async()=>{
  const load=T.TextureLoader.prototype.loadAsync,decoded=new Map();
  T.TextureLoader.prototype.loadAsync=async function(url){const texture=new T.Texture();texture.name=url;decoded.set(url,texture);return texture;};
  try{
    await prepareVisuals();
    for(const [kind,prefix,repeat] of [['wood','wood',.9],['woodFloor','wood-floor',.8866995073891626]]){
      const m=surface(kind),n=surface(kind),root=new T.Group();root.add(new T.Mesh(new T.BoxGeometry(1,1,1),m));
      assert.ok(m.normalMap&&m.roughnessMap&&m.aoMap,`${kind}: physical maps are required`);
      assert.equal(m.map.name,`/textures/pbr/${prefix}-color.jpg`);
      assert.equal(m.map.colorSpace,T.SRGBColorSpace);
      assert.equal(m.normalMap.colorSpace,T.NoColorSpace);
      assert.equal(m.roughnessMap.colorSpace,T.NoColorSpace);
      assert.equal(m.roughnessMap,m.aoMap,'one owned ARM clone serves roughness and occlusion');
      assert.equal(m.bumpMap,null);
      assert.equal(m.onBeforeCompile,T.Material.prototype.onBeforeCompile,'the atlas and board-joint callbacks are absent');
      assert.ok(m.normalScale.x>0&&m.normalScale.x<=.3&&m.normalScale.y===m.normalScale.x,'wood relief stays shallow');
      for(const channel of ['map','normalMap','roughnessMap']){
        assert.notEqual(m[channel],n[channel]);assert.notEqual(m[channel],decoded.get(m[channel].name));
        assert.equal(m[channel].wrapS,T.RepeatWrapping);assert.equal(m[channel].wrapT,T.RepeatWrapping);
        assert.ok(Math.abs(m[channel].repeat.x-repeat)<1e-12);assert.ok(Math.abs(m[channel].repeat.y-repeat)<1e-12);
      }
      const disposed=new Set();for(const map of [m.map,m.normalMap,m.roughnessMap])map.addEventListener('dispose',()=>disposed.add(map));
      disposeWorld(root);assert.equal(disposed.size,3);
      assert.ok(!disposed.has(n.map)&&!disposed.has(n.normalMap)&&!disposed.has(n.roughnessMap));
      const styled=surface(kind,'#78644f',{roughness:.61,normalScale:new T.Vector2(.1,.12),aoMapIntensity:.2});
      assert.equal(styled.color.getHexString(),'78644f');assert.equal(styled.roughness,.61);assert.deepEqual(styled.normalScale.toArray(),[.1,.12]);assert.equal(styled.aoMapIntensity,.2);
    }
  }finally{T.TextureLoader.prototype.loadAsync=load;}
});

test('a missing wood channel rejects preparation, disposes successful decodes and permits retry',async()=>{
  const load=T.TextureLoader.prototype.loadAsync,decoded=[],module=await import('../lib/materials.ts?wood-load-retry');
  let fail=true;T.TextureLoader.prototype.loadAsync=async function(url){if(fail&&url==='/textures/pbr/wood-normal.jpg')throw Error('missing image');const texture=new T.Texture();decoded.push(texture);return texture;};
  try{
    const disposed=new Set();const original=T.Texture.prototype.dispose;T.Texture.prototype.dispose=function(){disposed.add(this);original.call(this);};
    try{await assert.rejects(module.prepareVisuals(),/Visual asset loading failed/);assert.equal(disposed.size,decoded.length);}finally{T.Texture.prototype.dispose=original;}
    fail=false;await module.prepareVisuals();assert.ok(module.surface('wood').normalMap);
  }finally{T.TextureLoader.prototype.loadAsync=load;}
});
