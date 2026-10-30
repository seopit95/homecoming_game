import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld} from '../lib/world.ts';
import {initialStory} from '../lib/story.ts';
import {archiveReplay} from '../lib/expansion-story.ts';

globalThis.document={createElement:()=>{const text=[],context={fillRect(){},fillText(value){text.push(value);},beginPath(){},moveTo(){},lineTo(){},stroke(){}};return {width:0,height:0,text,getContext:()=>context};}};
function renderer(){return {target:null,shadowMap:{autoUpdate:true},calls:[],getRenderTarget(){return this.target;},setRenderTarget(value){this.target=value;},render(scene,camera){this.calls.push({scene,camera,target:this.target});}};}

test('V142 archive replay presents road, both call sides and all nine gate seconds before the real room',()=>{
  const scene=new T.Scene(),world=buildWorld(scene,'archive'),r=renderer();
  try{
    assert.ok(world.surveillance,'the archive monitor must show footage');
    world.updateStory('archive_playback',100,false);world.surveillance.render(r,scene);
    assert.notEqual(r.calls[0].scene,scene,'recorded footage must not show the current room');
    const recorded=r.calls[0].scene,car=recorded.getObjectByName('cctv-car'),first=car.position.clone();
    world.updateStory('archive_playback',100.03,false);world.surveillance.render(r,scene);assert.equal(r.calls.length,1,'paused or sub-frame updates do not upload/redraw footage');
    const survivor=recorded.getObjectByName('cctv-surviving-victim');assert.equal(survivor.visible,false);const signal=recorded.getObjectByName('cctv-walk-signal');assert.ok(signal.parent.visible,'the road original is actually shown first');
    const overlay=world.root.getObjectByName('surveillance-screen').children.find(m=>m.material.transparent),words=overlay.material.map.image.text;
    world.updateStory('archive_playback',106,false);assert.ok(words.some(v=>String(v).includes('양방향 통화 원본')));
    world.updateStory('archive_playback',114.2,false);assert.ok(words.some(v=>String(v).includes('잘못 거셨어요')));
    world.updateStory('archive_playback',115.8,false);assert.ok(words.some(v=>String(v).includes('수신자 통화 종료')));
    world.updateStory('archive_playback',120,false);world.surveillance.render(r,scene);assert.equal(survivor.visible,true,'the restored interval reveals the living victim outside the passenger pane');recorded.updateMatrixWorld(true);assert.ok(new T.Box3().setFromObject(survivor,true).min.y>=-.001,'the living victim remains grounded');
    world.updateStory('archive_playback',126.9,false);world.surveillance.render(r,scene);assert.equal(r.calls.at(-1).scene,recorded,'the complete nine-second parking interval remains on screen');
    world.updateStory('archive_playback',127,false);world.surveillance.render(r,scene);assert.equal(r.calls.at(-1).scene,scene,'the last feed is this physical room');
    world.updateStory('archive_playback',136.9,false);assert.match(words.filter(v=>String(v).startsWith('LIVE')).at(-1),/03:17:09/);
    const beforeEscape=r.calls.length;world.updateStory('archive_escape',137,false);world.surveillance.render(r,scene);assert.equal(r.calls.length,beforeEscape+1,'the current-room warning remains on the monitor when the chase starts');assert.equal(r.calls.at(-1).scene,scene);assert.match(words.filter(v=>String(v).startsWith('LIVE')).at(-1),/03:17:10/);
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


test('office footage shows arrival, the missing interval and a lone walking driver, then rewinds on retry',()=>{
  const scene=new T.Scene(),world=buildWorld(scene,'office'),r=renderer(),powered={...initialStory(),stage:'office_playback',notes:['fuse','office_install'],circuit:['circuit_b','circuit_c'],officeSupply:true};
  try{
    assert.ok(world.surveillance,'office CCTV must show the actual recording');
    world.updateStory('office_playback',100,false,powered);world.surveillance.render(r,scene);
    const footage=r.calls.at(-1).scene,car=footage.getObjectByName('cctv-car'),driver=footage.getObjectByName('cctv-driver'),first=car.position.clone();
    assert.equal(driver.visible,false,'driver is still seated before the missing interval');
    world.updateStory('office_playback',101.5,false,powered);world.surveillance.render(r,scene);assert.ok(car.position.distanceTo(first)>.5);
    world.updateStory('office_playback',103.3,false,powered);world.surveillance.render(r,scene);assert.equal(driver.visible,true,'the cut reveals the driver already outside the closed door');const steppedOut=driver.position.clone();
    world.updateStory('office_playback',107,false,powered);world.surveillance.render(r,scene);assert.ok(driver.position.distanceTo(steppedOut)>1,'the driver walks away rather than remaining a standing mannequin');
    const last=driver.position.clone();world.updateStory('office_leave',111,false,powered);world.surveillance.render(r,scene);world.updateStory('office_leave',120,false,powered);world.surveillance.render(r,scene);assert.ok(driver.position.distanceTo(last)<.001,'the evidence freezes on its last frame');
    world.reset();world.updateStory('office_playback',200,false,powered);world.surveillance.render(r,scene);assert.equal(driver.visible,false);assert.ok(car.position.distanceTo(first)<.0001);
  }finally{disposeWorld(world.root);}
});

test('the chosen road original has a walking approach, late brake lamps, continuous contact and a grounded aftermath',()=>{
 const scene=new T.Scene(),world=buildWorld(scene,'archive'),r=renderer();
 try{
  world.archiveReview.operate('archive_preview_road',0);
  function at(t){world.updateStory('archive_edit',t,false);world.surveillance.render(r,scene);const recording=r.calls.at(-1).scene;recording.updateMatrixWorld(true);return {intact:recording.getObjectByName('cctv-intact-car'),car:recording.getObjectByName('cctv-car'),victim:recording.getObjectByName('memory-pedestrian')};}
  const first=at(3.7),start=first.victim.position.clone();assert.equal(first.intact.visible,true);assert.equal(first.car.visible,false);
  const lamp=first.intact.children.map(m=>m.material).find(m=>m?.name==='sedan-tail-lamps');assert.equal(lamp.emissiveIntensity,0,'no braking in the earlier approach');
  const before=at(4.199),last=before.victim.position.clone();assert.ok(last.x-start.x>.5,'the woman really crosses the road');assert.ok(lamp.emissiveIntensity>0,'late braking is visible before contact');
  const contact=at(4.2);assert.ok(contact.victim.position.distanceTo(last)<.02,'the impact may not teleport the pedestrian');assert.equal(contact.car.visible,true);assert.equal(contact.intact.visible,false);
  const bumper=new T.Box3().setFromObject(contact.car,true),body=new T.Box3().setFromObject(contact.victim,true);assert.ok(bumper.intersectsBox(body),'the actual car and pedestrian must touch when impact begins');
  const after=at(6);assert.ok(new T.Box3().setFromObject(after.victim,true).min.y>=-.002,'recorded victim may not sink under the road');
 }finally{disposeWorld(world.root);}
});

test('recording pause updates its icon even when the same video frame stays on screen',()=>{
 const scene=new T.Scene(),w=buildWorld(scene,'archive');
 try{
  w.archiveReview.operate('archive_preview_call',100);w.updateStory('archive_edit',101,false);
  const overlay=w.root.getObjectByName('surveillance-screen').children.find(m=>m.material.transparent),text=overlay.material.map.image.text;
  assert.ok(text.at(-1).startsWith('▶'),'recording begins playing');
  w.archiveReview.operate('archive_record_pause',101);w.updateStory('archive_edit',101,false);
  assert.ok(text.at(-1).startsWith('Ⅱ'),'same-frame pause must not retain a playing indicator');
 }finally{disposeWorld(w.root);}
});
