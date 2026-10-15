import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,canStandAt,hasLineOfSight} from '../lib/world.ts';
import {initialStory,transition} from '../lib/story.ts';
import {expansionTargetActive} from '../lib/expansion-story.ts';

globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};

test('the loose fuse moves from the maintenance desk into the restored power cabinet',()=>{
 const world=buildWorld(new T.Scene(),'annex'),loose=world.root.getObjectByName('annex-fuse-pickup'),installed=world.root.getObjectByName('annex-fuse-installed');
 assert.ok(loose&&installed,'the mission needs an actual loose fuse and an actual installed fuse');
 const before={...initialStory(),stage:'annex_fuse'},taken=transition(before,'annex_fuse'),restored=transition(taken,'annex_restore');
 const update=s=>world.updateStory(s.stage,10,true,s);
 update(before);assert.equal(loose.visible,true);assert.equal(installed.visible,false);
 world.root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(loose,true);
 assert.ok(bounds.min.y>=.82&&bounds.min.y<.824,'the loose fuse must rest on the actual desk');
 update(taken);assert.equal(loose.visible,false);assert.equal(installed.visible,false);
 update(restored);assert.equal(loose.visible,false);assert.equal(installed.visible,true);
 update(before);assert.equal(loose.visible,true);assert.equal(installed.visible,false,'reset must not leave an installed copy');
});

test('a collected physical clue cannot leave an interaction prompt over its empty place',()=>{
 for(const [stage,id] of [['annex_fuse','annex_fuse'],['annex_search','annex_badge'],['archive_search','archive_road'],['archive_search','archive_call'],['archive_search','archive_gate']]){
  const before={...initialStory(),stage};assert.equal(expansionTargetActive(before,id),true);
  assert.equal(expansionTargetActive(transition(before,id),id),false,'hidden '+id+' still accepts interaction');
 }
});

test('a restored cabinet no longer asks the player to install the same fuse again',()=>{
 const ready={...initialStory(),stage:'annex_restore',notes:['annex_fuse']};
 assert.equal(expansionTargetActive(ready,'annex_restore'),true);
 assert.equal(expansionTargetActive(transition(ready,'annex_restore'),'annex_restore'),false);
});

test('the open power cabinet does not block its own reachable fuse interaction',()=>{
 const world=buildWorld(new T.Scene(),'annex'),target=world.targets.find(t=>t.id==='annex_restore'),p=target.mesh.userData.approach;
 assert.equal(canStandAt(p.x,p.z,world.solids,.23,world.bounds),true);
 assert.equal(hasLineOfSight({x:p.x,y:1.65,z:p.z},target.point,world.solids),true,'a cabinet collider must not make the fuse socket impossible to reach');
});

test('collected archive originals leave their desks through the actual story transitions',()=>{
 const world=buildWorld(new T.Scene(),'archive');let story={...initialStory(),stage:'archive_search'};
 for(const id of ['archive_road','archive_call','archive_gate']){
  const object=world.targets.find(t=>t.id===id).mesh;
  assert.ok(object.userData.recording,'the player must collect a physical recording, not its paper caption');
  world.updateStory(story.stage,10,true,story);assert.equal(object.visible,true);
  world.root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(object,true);assert.ok(b.min.y>=.82&&b.min.y<.822,'recording rests on desk');
  story=transition(story,id);world.updateStory(story.stage,11,true,story);assert.equal(object.visible,false);
 }
 assert.equal(story.stage,'archive_edit');
});

test('the changed clue approaches remain connected at player and pursuer width',async()=>{
 const {findPath}=await import('../lib/navigation.ts');
 for(const area of ['annex','archive']){
  const world=buildWorld(new T.Scene(),area);
  for(const t of world.targets.filter(t=>['annex_fuse','annex_badge','annex_call','annex_restore','archive_road','archive_call','archive_gate'].includes(t.id))){
   const p=t.mesh.userData.approach;
   for(const radius of [.23,.43]){
    assert.equal(canStandAt(p.x,p.z,world.solids,radius,world.bounds),true,t.id+' approach at radius '+radius);
    assert.ok(findPath(world.spawn,p,world.solids,world.bounds,radius).length,t.id+' is disconnected from the entrance');
   }
  }
 }
});

test('a chair at an authored evidence desk has knee room instead of facing a drawer pedestal',()=>{
 const world=buildWorld(new T.Scene(),'annex');world.root.updateMatrixWorld(true);
 const desk=world.root.getObjectByName('grounded-worktable'),chair=world.root.getObjectByName('grounded-desk-chair');
 for(const x of [-.13,.13]){
  const knee=chair.localToWorld(new T.Vector3(x,.58,.2)),forward=new T.Vector3(0,0,1).transformDirection(chair.matrixWorld);
  assert.equal(new T.Raycaster(knee,forward,0,.65).intersectObject(desk,true).length,0,'the seated knees intersect the actual drawer/body geometry');
 }
});
