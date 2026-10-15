import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {initialStory,transition,objectiveFor} from '../lib/story.ts';
import {readProgress,writeProgress} from '../lib/preferences.ts';
import {buildWorld,canStandAt,hasLineOfSight,disposeWorld} from '../lib/world.ts';
import {findPath} from '../lib/navigation.ts';
import {plantProblem} from '../lib/expansion-story.ts';
const ctx={fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const base=()=>({...initialStory(),stage:'plant_power',notes:['plant_diagram','plant_valve_west','plant_valve_east'],circuit:['plant_circuit_pump','plant_circuit_air']});
const act=(s,...actions)=>actions.reduce(transition,s);

test('an unpowered pump reports its missing power before simulating hydraulic trouble',()=>{
 const s={...base(),circuit:[]};assert.equal(plantProblem(s),'pump');
 assert.equal(plantProblem({...s,circuit:['plant_circuit_pump']}),'air');
});

test('a configured electrical panel cannot drain a blocked or recirculating pump',()=>{
 let s=base();assert.equal(transition(s,'plant_start').stage,'plant_power','the intake is still blocked');
 s=transition(s,'plant_filter');assert.ok(s.notes.includes('plant_filter'));
 assert.equal(transition(s,'plant_start').stage,'plant_power','water is still routed back to the sump');
 s=act(s,'plant_route','plant_route');assert.ok(s.circuit.includes('plant_route_drain'));
 assert.equal(transition(s,'plant_start').stage,'plant_drain');
});

test('the discharge selector cycles through return, closed and external drain and survives save',()=>{
 let s=act(base(),'plant_filter','plant_route');assert.ok(s.circuit.includes('plant_route_closed'));
 assert.equal(transition(s,'plant_start').stage,'plant_power','closed discharge cannot start drainage');
 s=transition(s,'plant_route');assert.ok(s.circuit.includes('plant_route_drain'));assert.ok(!s.circuit.includes('plant_route_closed'));
 const storage={value:null,getItem(){return this.value;},setItem(_,v){this.value=v;}};writeProgress(storage,s,900,true,18);
 const saved=readProgress(storage);assert.ok(saved.notes.includes('plant_filter'));assert.ok(saved.circuit.includes('plant_route_drain'));assert.ok(saved.circuit.includes('plant_circuit_air'));assert.equal(saved.pursuitWait,18);
 assert.match(objectiveFor(s),/외부배수/);s=transition(s,'plant_route');assert.ok(!s.circuit.some(a=>a.startsWith('plant_route_')));
});

test('the wet lighting fault actually trips the pump and lighting switches',()=>{
 const s=act(base(),'plant_filter','plant_route','plant_route','plant_circuit_lights'),tripped=transition(s,'plant_start');
 assert.equal(tripped.stage,'plant_power');assert.ok(!tripped.circuit.includes('plant_circuit_pump'),'pump breaker is off');
 assert.ok(!tripped.circuit.includes('plant_circuit_lights'),'faulted branch is off');assert.ok(tripped.circuit.includes('plant_circuit_air'),'unaffected ventilation is retained');
 assert.ok(tripped.circuit.includes('plant_route_drain'),'a trip cannot rotate the mechanical discharge selector');
 assert.equal(act(tripped,'plant_circuit_pump','plant_start').stage,'plant_drain');
});

test('the plant flood surface descends toward the real floor as the pump drains it',()=>{
 const world=buildWorld(new T.Scene(),'plant');try{
  const water=world.root.children.find(o=>o.isMesh&&o.geometry.type==='PlaneGeometry'&&Math.abs(o.position.y-.075)<.001);assert.ok(water);
  const s={...base(),stage:'plant_drain'};world.updateStory(s.stage,0,false,s);world.updateStory(s.stage,12,false,s);
  assert.ok(water.position.y<.012,'scaling a horizontal plane does not lower its water line');assert.ok(water.position.y>=.005,'the wet surface remains above the floor');
 }finally{disposeWorld(world.root);}
});

test('new filter and discharge controls have real reachable visible interaction sides',()=>{
 const world=buildWorld(new T.Scene(),'plant');try{
  for(const id of ['plant_filter','plant_route']){
   const target=world.targets.find(t=>t.id===id);assert.ok(target,`${id} exists on the real machinery`);
   const p=target.mesh.userData.approach;assert.ok(p&&canStandAt(p.x,p.z,world.solids,.23,world.bounds));
   assert.ok(hasLineOfSight({...p,y:1.65},target.point,world.solids));assert.ok(findPath(world.spawn,p,world.solids,world.bounds,.23).length);
   assert.ok(new T.Vector3(p.x,1.65,p.z).distanceTo(target.point)<2.3);
  }
 }finally{disposeWorld(world.root);}
});

test('visible plant diagnosis follows the filter, routing, ventilation and legacy drainage states',()=>{
 const world=buildWorld(new T.Scene(),'plant');try{
  let s=base();world.updateStory(s.stage,0,false,s);world.plantAttempt(0,s);world.updateStory(s.stage,.7,false,s);
  const cloth=world.root.getObjectByName('plant-blocked-filter'),suction=world.root.getObjectByName('plant-suction-needle'),pressure=world.root.getObjectByName('plant-pressure-needle'),fan=world.root.getObjectByName('plant-fan-rotor');
  assert.equal(cloth.visible,true);assert.ok(suction.rotation.z<-1.9,'blocked intake visibly pulls into the warning range');assert.ok(pressure.rotation.z>1.7,'recirculation cannot pretend to build external discharge pressure');assert.notEqual(fan.rotation.z,0);
  s=act(s,'plant_filter','plant_route');world.updateStory(s.stage,.7,false,s);assert.equal(cloth.visible,false);assert.ok(suction.rotation.z>1,'cleared intake is no longer in the warning range');assert.ok(pressure.rotation.z<-1.9,'closed discharge shows excess pressure');
  world.updateStory(s.stage,2,false,s);assert.equal(pressure.rotation.z,2.4,'failed test run stops');
  world.updateStory('plant_drain',3,false,{...s,stage:'plant_drain',notes:[],circuit:[]});assert.equal(cloth.visible,false,'accepted legacy drainage stays complete');assert.ok(pressure.rotation.z<0);assert.ok(world.root.getObjectByName('plant-route-handle').rotation.z<0);
 }finally{disposeWorld(world.root);}
});

test('a remote failed pump test leaves readable pressure witnesses after walking back to the pump room',()=>{
 const world=buildWorld(new T.Scene(),'plant');try{
  const blocked=base();world.updateStory(blocked.stage,0,false,blocked);world.plantAttempt(0,blocked);world.updateStory(blocked.stage,.1,false,blocked);world.updateStory(blocked.stage,25,false,blocked);
  const suction=world.root.getObjectByName('plant-suction-last-test'),pressure=world.root.getObjectByName('plant-pressure-last-test');
  assert.ok(suction?.visible&&pressure?.visible,'stored readings remain visible beyond the remote walking time');assert.ok(suction.rotation.z<-1.9,'the blocked intake leaves a warning witness');assert.ok(pressure.rotation.z>1.7,'recirculation leaves a low-pressure witness');assert.equal(world.root.getObjectByName('plant-pressure-needle').rotation.z,2.4,'live pressure is zero after the stopped trial');
  const closed=act(blocked,'plant_filter','plant_route');world.updateStory(closed.stage,25.1,false,closed);assert.ok(suction.rotation.z<-1.9,'changing controls cannot rewrite the previous test');world.plantAttempt(26,closed);world.updateStory(closed.stage,26.1,false,closed);world.updateStory(closed.stage,55,false,closed);assert.ok(suction.rotation.z>1);assert.ok(pressure.rotation.z<-1.9,'the next test replaces the stored reading with closed-discharge pressure');
 }finally{disposeWorld(world.root);}
});
