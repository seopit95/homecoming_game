import test from 'node:test';
import assert from 'node:assert/strict';
import {apartment as home} from '../lib/apartment-layout.ts';

const search=await import('../lib/home-search.ts').catch(error=>{
 if(error.code==='ERR_MODULE_NOT_FOUND')return {};
 throw error;
});
const api=()=>{assert.equal(typeof search.createHomeSearch,'function','home search must remember whether entry was witnessed');assert.equal(typeof search.stepHomeSearch,'function');return search;};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// Replacing knowledge of the witnessed door with the old generic search must fail.
test('V133 witnessed home hiding approaches the known door and uses only nonverbal cues',()=>{
 const {createHomeSearch,stepHomeSearch}=api(),s=createHomeSearch(true),p={x:home.bath.x,z:home.bath.z};
 const doorPlane=6.08*Math.SQRT2-.49;
 assert.ok(doorPlane-s.goal.x>.9&&doorPlane-s.goal.x<1.2,'stop outside the real wardrobe instead of inside its surface');
 assert.ok(Math.abs(s.goal.z-home.closet[2])<.05);
 const cues=[];let lastCue=0,previousPhase=0,travel=0;
 for(let i=0;i<2400&&!s.done;i++){
  const before={...p},d=distance(p,s.goal),stride=Math.min(d,s.speed*.05);
  if(d>0){p.x+=(s.goal.x-p.x)*stride/d;p.z+=(s.goal.z-p.z)*stride/d;}travel+=distance(before,p);
  assert.equal(stepHomeSearch(s,p,.05),s,'reuse the search state across frames');
  assert.ok(s.phase>=previousPhase&&s.phase<=previousPhase+1);previousPhase=s.phase;
  assert.ok(Number.isFinite(s.goal.x+s.goal.z+s.lookAt.x+s.lookAt.z+s.speed));
  if(s.cueId!==lastCue){lastCue=s.cueId;cues.push(s.cue);}
 }
 assert.equal(s.done,true);assert.ok(travel>7);assert.ok(distance(p,home.bath)<.5);
 assert.ok(cues.length>=2&&cues.every(cue=>['breath','cry','drag'].includes(cue)),'known hiding cannot produce where/here/come or an unanimated knock');
});

// Forgetting the supplied evidence would give the unseen ghost supernatural knowledge.
test('V133 unseen home hiding investigates its real last-known position or the radio first',()=>{
 const {createHomeSearch}=api(),interest={x:2.6,z:-1.4},s=createHomeSearch(false,interest),radio=createHomeSearch(false);
 assert.deepEqual(s.goal,interest);assert.notEqual(s.goal,interest,'snapshot evidence once per entry');
 assert.ok(distance(s.lookAt,{x:home.closet[0],z:home.closet[2]})>1);
 assert.deepEqual(radio.goal,{x:home.radioStart[0],z:home.radioStart[2]});
 assert.ok(distance(radio.goal,{x:home.search[0],z:home.search[2]})>2);
});

// A timer must not finish the scene while pathfinding is blocked or after a reset at the bathroom.
test('V133 search completion requires route progression and a physical retreat to the bathroom',()=>{
 const {createHomeSearch,stepHomeSearch}=api();
 for(const witnessed of [false,true]){
  const s=createHomeSearch(witnessed),p={x:home.bath.x,z:home.bath.z};
  for(let i=0;i<100;i++)stepHomeSearch(s,p,1);
  assert.equal(s.phase,0);assert.equal(s.done,false,'starting in the bathroom cannot skip the search');
  let foundRetreat=false;
  for(let i=0;i<2400&&!foundRetreat;i++){
   const d=distance(p,s.goal),stride=Math.min(d,s.speed*.05);
   if(d>0){p.x+=(s.goal.x-p.x)*stride/d;p.z+=(s.goal.z-p.z)*stride/d;}
   stepHomeSearch(s,p,.05);foundRetreat=distance(s.goal,home.bath)<.01;
  }
  assert.equal(foundRetreat,true);assert.equal(s.done,false);
  for(let i=0;i<100;i++)stepHomeSearch(s,p,1);
  assert.equal(s.done,false,'elapsed time cannot replace actual retreat movement');
  assert.equal(s.retreating,false,'departure is not announced before the figure moves');
 }
});
