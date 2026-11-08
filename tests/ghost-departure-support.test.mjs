import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {ExteriorCrawl} from '../lib/ghost-exterior.ts';
import {createGhost,animateGhost} from '../lib/ghost.ts';
import {movePursuer} from '../lib/navigation.ts';
const game=readFileSync(new URL('../lib/game.ts',import.meta.url),'utf8');
test('the protected car departure keeps stepping and rendering the existing wall support',()=>{
 const render=game.slice(game.indexOf('  function renderWorld('));
 const branch=render.slice(render.indexOf("if(story.stage==='car_departure')"),render.indexOf('    if(road)'));
 assert.match(branch,/animateGhost\([^;]*exteriorCrawl\.step\(/);
 assert.match(branch,/enabled:false/);
 assert.doesNotMatch(branch,/exteriorCrawl\.reset\(/,'boarding must not snap attached body to floor');
});
test('boarding during climb or full wall pose descends continuously then releases scripted pursuit',()=>{
 const wall={x:1.3,z:0,w:.18,d:40,y:1.4,h:2.8},bounds={x:5,z:30};
 for(const boardFrame of [150,240]){
  const f=createGhost(new T.Group()),crawl=new ExteriorCrawl();f.scale.setScalar(1.15);
  const input=(frame,enabled)=>({time:frame/60,position:f.position,heading:0,moving:1,solids:[wall],enabled});
  let support;
  for(let frame=0;frame<=boardFrame;frame++)support=crawl.step(input(frame,true));
  assert.ok(support.blend>.05,'boarding starts while attached');
  animateGhost(f,boardFrame/60,0,.5,true,2,1,undefined,[wall],0,support);
  let head=f.getObjectByName('ghost-head').getWorldPosition(new T.Vector3()),previous=support.blend,resumed=false;
  for(let frame=boardFrame+1;frame<=boardFrame+100;frame++){
   const before=f.position.clone();
   if(crawl.canAdvance&&!crawl.attached){assert.ok(movePursuer(f.position,0,.025,[wall],bounds));resumed=true;}
   support=crawl.step(input(frame,false));
   assert.ok(support.blend<=previous&&previous-support.blend<.035,'support decays continuously');
   if(crawl.attached)assert.deepEqual(f.position.toArray(),before.toArray(),'descent does not teleport navigation root');
   animateGhost(f,frame/60,resumed?1:0,0,true,2,1,undefined,[wall],0,support);
   const next=f.getObjectByName('ghost-head').getWorldPosition(new T.Vector3());assert.ok(next.distanceTo(head)<.12,'body does not snap to floor on boarding');head=next;previous=support.blend;
  }
  assert.equal(crawl.attached,false);assert.equal(crawl.canAdvance,true);assert.ok(resumed&&f.position.z>.2,'scripted pursuit resumes after descent');
 }
});
