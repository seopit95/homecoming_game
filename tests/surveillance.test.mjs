import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld} from '../lib/world.ts';

globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
function renderer(){return {target:null,shadowMap:{autoUpdate:true},calls:[],getRenderTarget(){return this.target;},setRenderTarget(value){this.target=value;},render(scene,camera){this.calls.push({scene,camera,target:this.target});}};}

test('archive replay renders the restored nine seconds before switching to the real room and resets on retry',()=>{
  const scene=new T.Scene(),world=buildWorld(scene,'archive'),r=renderer();
  try{
    assert.ok(world.surveillance,'the archive monitor must show footage');
    world.updateStory('archive_playback',100,false);world.surveillance.render(r,scene);
    assert.notEqual(r.calls[0].scene,scene,'recorded footage must not show the current room');
    const recorded=r.calls[0].scene,car=recorded.getObjectByName('cctv-car'),first=car.position.clone();
    world.updateStory('archive_playback',100.03,false);world.surveillance.render(r,scene);assert.equal(r.calls.length,1,'paused or sub-frame updates do not upload/redraw footage');
    world.updateStory('archive_playback',101,false);world.surveillance.render(r,scene);assert.ok(car.position.distanceTo(first)>.1,'road footage actually moves');
    world.updateStory('archive_playback',112,false);world.surveillance.render(r,scene);
    world.updateStory('archive_playback',120.9,false);world.surveillance.render(r,scene);assert.equal(r.calls.at(-1).scene,recorded,'the complete nine-second parking interval remains on screen');
    world.updateStory('archive_playback',121,false);world.surveillance.render(r,scene);assert.equal(r.calls.at(-1).scene,scene,'the last feed is this physical room');
    const beforeEscape=r.calls.length;world.updateStory('archive_escape',132,false);world.surveillance.render(r,scene);assert.equal(r.calls.length,beforeEscape+1,'the current-room warning remains on the monitor when the chase starts');assert.equal(r.calls.at(-1).scene,scene);
    world.reset();world.updateStory('archive_playback',200,false);world.surveillance.render(r,scene);assert.equal(r.calls.at(-1).scene,recorded);assert.ok(car.position.distanceTo(first)<.0001,'retry starts at the first recorded frame');
  }finally{disposeWorld(world.root);}
});

test('CCTV render restores the caller target and shadow state even if rendering fails',()=>{
  const scene=new T.Scene(),world=buildWorld(scene,'archive'),r=renderer(),prior=new T.WebGLRenderTarget(16,16);
  try{
    assert.ok(world.surveillance);world.updateStory('archive_playback',0,false);r.target=prior;r.render=()=>{throw Error('device interrupted');};
    assert.throws(()=>world.surveillance.render(r,scene),/device interrupted/);
    assert.equal(r.target,prior);assert.equal(r.shadowMap.autoUpdate,true);
    assert.equal(world.root.visible,true);
  }finally{disposeWorld(world.root);prior.dispose();}
});

test('disposing an archive releases the private recording scene and render target exactly once',()=>{
  const scene=new T.Scene(),world=buildWorld(scene,'archive'),r=renderer();
  assert.ok(world.surveillance);world.updateStory('archive_playback',0,false);world.surveillance.render(r,scene);
  const resources=new Set([r.calls[0].target]);r.calls[0].scene.traverse(o=>{if(!o.isMesh)return;resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.add(v);}});
  const counts=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>counts.set(resource,(counts.get(resource)??0)+1));
  disposeWorld(world.root);assert.equal(counts.size,resources.size);assert.ok([...counts.values()].every(n=>n===1));
});
