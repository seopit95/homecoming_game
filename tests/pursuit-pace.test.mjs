import test from 'node:test';
import assert from 'node:assert/strict';
import {pursuitPace} from '../lib/pursuit.ts';
import {ghostStep} from '../lib/ghost.ts';
import {residentialRoute} from '../lib/residential-route.ts';
import {freshStamina,canSprint,stepStamina} from '../lib/stamina.ts';

const routes=[['landing',2.8],['corridor',3.4],['transfer',3.35],['stairs',3.2],['archive',3.3],['plant',3.3],['parking',2.7],['parking',4.4]];
test('ordinary route pursuit threatens walking but gives sprinting a usable margin, including alarm escalation',()=>{
 for(const [area,base] of routes){
  const pace=pursuitPace(area,base,0,8);
  assert.ok(ghostStep(0,pace.speed,1,10,true).distance>2,`${area}: walking cannot escape forever`);
  assert.ok(ghostStep(0,pace.speed,1,10,true).distance<3.5,`${area}: ordinary pursuit must leave sprint margin`);
  assert.equal(pace.burst,false);
 }
});
test('brief surges can close on sprinting, but stop at contact distance and leave recovery time',()=>{
 for(const [area,base] of routes){
  assert.ok(ghostStep(0,pursuitPace(area,base,1.2,8).speed,1,10,true).distance>3.5,area);
  assert.equal(pursuitPace(area,base,.79,8).burst,false);
  assert.equal(pursuitPace(area,base,.8,8).burst,true);
  assert.equal(pursuitPace(area,base,2.2,8).burst,false);
  assert.equal(pursuitPace(area,base,8.5,8).burst,false);
  assert.equal(pursuitPace(area,base,1.2,1.8).burst,false);
 }
});
// Unobstructed straight-line pursuit through the real movement multiplier.
// Generous stride budget removes incidental geometry/turning savings.
// Actual galleries span 44–46m; a fresh runner must reach the lift with enough
// separation for a short door interaction rather than a frame-perfect arrival.
test('full gallery crossing retains space for a three-second lift interaction',()=>{
 for(const [area,base] of routes.filter(([a])=>['landing','corridor','transfer'].includes(a))){
  const distance=(area==='landing'?residentialRoute.gallery.spawnZ:22.2)-residentialRoute.gallery.boardZ;
  let stamina=freshStamina(),travel=0,gap=5.2,t=0;
  const dt=.01;
  while(travel<distance){
   assert.ok(canSprint(stamina),`${area}: crossing exceeds stamina`);
   travel+=3.5*dt;gap+=3.5*dt-ghostStep(0,pursuitPace(area,base,t,gap).speed,dt,10,true).distance;
   stamina=stepStamina(stamina,dt,true,true);t+=dt;
   assert.ok(gap>.67,`${area}: caught during crossing`);
  }
  for(let wait=0;wait<3;wait+=dt,t+=dt){gap-=ghostStep(0,pursuitPace(area,base,t,gap).speed,dt,10,true).distance;assert.ok(gap>.67,`${area}: no time to operate lift`);}
 }
});
test('parking sprint gains separation over a full tank even after the optional alarm',()=>{
 for(const base of [2.7,4.4]){
  let gap=5.2;
  for(let t=0;t<15;t+=.01)gap+=3.5*.01-ghostStep(0,pursuitPace('parking',base,t,gap).speed,.01,10,true).distance;
  assert.ok(gap>7.5,'burst budget must not erase the sprint escape margin');
 }
});
test('domestic pursuit keeps its existing close-range pressure',()=>{
 assert.ok(Math.abs(pursuitPace('apartment',2.65,0,8).speed-3.02)<1e-8);
 assert.ok(Math.abs(pursuitPace('resident',1.4,0,8).speed-3.44)<1e-8);
});

// A complete stamina tank should still buy room, but not thirteen metres of
// effortless extra separation. This catches route caps that ignore tuning.
test('a full stamina tank keeps exterior pursuit within a recoverable chase distance',()=>{
 for(const [area,base] of routes){
  let gap=5.2;
  for(let i=0;i<1500;i++)gap+=3.5*.01-ghostStep(0,pursuitPace(area,base,i*.01,gap).speed,.01,.82*1.15,true).distance;
  assert.ok(gap>7.5,`${area}: sprint still earns a useful escape margin: ${gap}`);
  assert.ok(gap<14,`${area}: pursuer falls too far behind: ${gap}`);
 }
});
// Ideal straight line, no corners/occlusion: stamina management alone must not
// outrun a visible pursuer forever. The real game still permits losing sight,
// doors, distractions and safe areas; this is not a live-game capture timer.
test('repeated stamina refill cycles cannot outrun exterior pursuit indefinitely',()=>{
 for(const mode of ['held-shift','full-refill']){
  let stamina=freshStamina(),gap=5.2,resting=false,caught=false;
  for(let i=0;i<10000;i++){
   const t=i*.01;
   if(mode==='full-refill'){if(stamina.exhausted)resting=true;if(stamina.value===1)resting=false;}
   const running=canSprint(stamina)&&!resting;
   gap+=(running?3.5:2)*.01-ghostStep(0,pursuitPace('landing',2.8,t,gap).speed,.01,.82*1.15,true).distance;
   stamina=stepStamina(stamina,.01,running,true);
   if(gap<=.67){caught=true;break;}
  }
  assert.ok(caught,`${mode}: straight-line stamina cycling leaves ${gap}m after 100s`);
 }
});
