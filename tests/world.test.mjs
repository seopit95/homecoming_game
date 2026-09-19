import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWorld,canStandAt,hasLineOfSight} from '../lib/world.ts';
import {accidentCar} from '../lib/chapters.ts';

test('1704 has a clear standing approach to its fridge clue and a shaped leather shoe',()=>{
  const w=buildWorld(new THREE.Scene(),'resident');
  assert.ok(canStandAt(3.8,3.15,w.solids,.23,w.bounds),'the fridge clue must not require standing inside the kitchen counter');
  const note=w.targets.find(t=>t.id==='portrait');
  assert.ok(hasLineOfSight({x:3.8,y:1.65,z:3.15},note.point,w.solids));
  const shoe=w.root.getObjectByName('resident-leather-shoe');assert.ok(shoe);
  const size=new THREE.Box3().setFromObject(shoe).getSize(new THREE.Vector3());
  assert.ok(size.z>.2&&size.z<.4&&size.y<.15,'the shoe has human footwear dimensions');
  assert.ok(Math.abs(new THREE.Box3().setFromObject(shoe).min.y)<.012,'the shoe rests on the floor');
  const cup=new THREE.Box3().setFromObject(w.root.getObjectByName('resident-teacup'));
  assert.ok(cup.min.y>=.45&&cup.min.y<.46,'the cup and saucer rest on the low table');
  const phone=new THREE.Box3().setFromObject(w.root.getObjectByName('resident-answering-machine'));
  assert.ok(Math.abs(phone.min.y-.7)<.005,'the answering machine rests on its cabinet');
});

test('the stair, 1704 front door and service connection expose walkable openings after the leaves clear',()=>{
  const stairs=buildWorld(new THREE.Scene(),'stairs');assert.equal(canStandAt(-1,-5.85,stairs.solids,.23,stairs.bounds),false);
  stairs.updateStory('stairs_passage',0,false);assert.equal(canStandAt(-1,-5.85,stairs.solids,.23,stairs.bounds),false);
  stairs.updateStory('stairs_passage',1,false);assert.ok(canStandAt(-1,-6.2,stairs.solids,.23,stairs.bounds));
  assert.ok(hasLineOfSight({x:-1,y:4.45,z:-5},{x:-1,y:4.45,z:-7.5},stairs.solids));
  const room=buildWorld(new THREE.Scene(),'resident');room.updateStory('resident_arrival',0,false);
  assert.equal(canStandAt(0,5.95,room.solids,.23,room.bounds),false);
  room.updateStory('resident_entry',1,false);room.updateStory('resident_entry',2,false);
  assert.ok(canStandAt(0,5.95,room.solids,.23,room.bounds));assert.ok(hasLineOfSight({x:0,y:1.65,z:7},{x:0,y:1.65,z:4},room.solids));
  assert.equal(canStandAt(0,-5.95,room.solids,.23,room.bounds),false);
  room.updateStory('resident_departure',3,false);room.updateStory('resident_departure',4,false);
  assert.ok(canStandAt(0,-6.2,room.solids,.23,room.bounds));assert.ok(hasLineOfSight({x:0,y:1.65,z:-5},{x:0,y:1.65,z:-7.5},room.solids));
});
test('walking out of the stairs preserves the visible 1704 gallery geometry',()=>{
  const stairs=buildWorld(new THREE.Scene(),'stairs'),room=buildWorld(new THREE.Scene(),'resident');
  stairs.updateStory('stairs_passage',0);stairs.updateStory('stairs_passage',1);
  stairs.root.updateMatrixWorld(true);room.root.updateMatrixWorld(true);
  const offset=new THREE.Vector3(-1,2.8,-17.65),eye=new THREE.Vector3(0,1.65,11.43);
  const visible=hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return true;};
  for(const direction of [[0,0,-1],[.2,0,-1],[-.2,0,-1],[.7,0,-1],[-.7,0,-1],[0,.2,-1],[0,-.3,-1]]){
    const dir=new THREE.Vector3(...direction).normalize();
    const before=new THREE.Raycaster(eye.clone().add(offset),dir).intersectObjects(stairs.root.children,true).find(visible);
    const after=new THREE.Raycaster(eye,dir).intersectObjects(room.root.children,true).find(visible);
    assert.ok(before&&after);
    assert.ok(Math.abs(before.distance-after.distance)<.015,`visible surfaces must not pop at the stair threshold: ${direction}: ${before.distance} -> ${after.distance}`);
  }
});
// Canvas texturing is irrelevant to this geometry test; no renderer is mocked.
const context={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
Object.defineProperty(globalThis,'document',{value:{createElement:()=>({width:0,height:0,getContext:()=>context})},configurable:true});
test('every required interaction has a reachable position inside the apartment',()=>{
  const {solids,targets}=buildWorld(new THREE.Scene());
  assert.equal(canStandAt(0,4.8,solids),true);
  assert.equal(canStandAt(0,-9,solids),false);
  const queue=[[0,19]],seen=new Set(['0,19']);
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];
    for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){
      const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;
      if(seen.has(key)||!canStandAt(nx/4,nz/4,solids))continue;
      seen.add(key);queue.push([nx,nz]);
    }
  }
  for(const target of targets){assert.ok(queue.some(([x,z])=>Math.hypot(x/4-target.point.x,z/4-target.point.z)<1.25),`${target.id} must be reachable without walking through walls`);}
});
for(const area of ['landing','lift','corridor','stairs','resident','office','parking','aftermath'])test(`${area}: all required interactions are reachable from the spawn`,()=>{
  const world=buildWorld(new THREE.Scene(),area);assert.ok(world.bounds,`${area} must provide its own walkable area`);
  const {solids,targets,bounds,spawn,heightAt}=world;
  const start=[Math.round(spawn.x*4),Math.round(spawn.z*4)];
  const queue=[start],seen=new Set([start.join(',')]);
  assert.ok(canStandAt(spawn.x,spawn.z,solids,.23,bounds),'spawn must be free');
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;if(seen.has(key)||!canStandAt(nx/4,nz/4,solids,.23,bounds))continue;seen.add(key);queue.push([nx,nz]);}
  }
  assert.ok(targets.length>0);
  for(const t of targets)assert.ok(queue.some(([x,z])=>Math.hypot(x/4-t.point.x,z/4-t.point.z)<1.45&&Math.abs(heightAt(x/4,z/4)+1.65-t.point.y)<1.65&&hasLineOfSight({x:x/4,y:heightAt(x/4,z/4)+1.65,z:z/4},t.point,solids)),`${area}/${t.id} must be reachable at the correct elevation`);
});
test('interaction rays respect wall height while allowing a tabletop object',async()=>{
  const {hasLineOfSight}=await import('../lib/world.ts');assert.equal(typeof hasLineOfSight,'function');
  assert.equal(hasLineOfSight({x:0,y:1.65,z:2},{x:0,y:1.3,z:-2},[{x:0,z:0,w:4,d:.2,y:1.5,h:3}]),false);
  assert.equal(hasLineOfSight({x:0,y:1.65,z:2},{x:0,y:.9,z:0},[{x:0,z:0,w:1,d:1,y:.4,h:.8}]),true);
});
test('a held light cannot cross a reachable divider or originate inside its wall',async()=>{
  const {clampLightOrigin}=await import('../lib/world.ts'),world=buildWorld(new THREE.Scene());
  const eye=new THREE.Vector3(2.220584,1.65,0),lens=new THREE.Vector3(2.839783,1.462685,.192659);
  assert.ok(canStandAt(eye.x,eye.z,world.solids));assert.equal(clampLightOrigin(eye,lens,world.solids),true);
  assert.ok(lens.x<2.46,'origin remains on the player side of the wall');assert.ok(hasLineOfSight(eye,lens,world.solids));
  const clear=new THREE.Vector3(0,1.5,3),before=clear.clone();assert.equal(clampLightOrigin(new THREE.Vector3(0,1.65,4),clear,[]),false);assert.deepEqual(clear.toArray(),before.toArray());
});
test('after leaving the accident car, its body blocks movement and the road stays reachable',async()=>{
  const {findPath}=await import('../lib/navigation.ts'),world=buildWorld(new THREE.Scene(),'aftermath');
  world.updateStory('road_exit',0);assert.ok(canStandAt(world.spawn.x,world.spawn.z,world.solids,.23,world.bounds));
  world.updateStory('road_evidence',1);
  assert.equal(canStandAt(accidentCar.x,accidentCar.z,world.solids,.23,world.bounds),false);
  assert.ok(canStandAt(accidentCar.exitX,accidentCar.exitZ,world.solids,.23,world.bounds));
  assert.ok(findPath({x:accidentCar.exitX,z:accidentCar.exitZ},{x:.8,z:-2},world.solids,world.bounds).length>0);
});
test('the collectible fuse is visible outside its opaque cabinet',()=>{
  const world=buildWorld(new THREE.Scene(),'office'),fuse=world.targets.find(t=>t.id==='fuse');
  const bounds=new THREE.Box3().setFromObject(fuse.mesh);
  assert.equal(world.solids.some(s=>bounds.min.x>=s.x-s.w/2&&bounds.max.x<=s.x+s.w/2&&bounds.min.z>=s.z-s.d/2&&bounds.max.z<=s.z+s.d/2&&bounds.min.y>=(s.y??1.5)-(s.h??3)/2&&bounds.max.y<=(s.y??1.5)+(s.h??3)/2),false,'the pickup must not be completely enclosed in opaque geometry');
});
test('the large apartment floor offers two connected routes around its service cores',async()=>{
  const {findPath}=await import('../lib/navigation.ts'),w=buildWorld(new THREE.Scene(),'corridor');
  assert.ok(w.bounds.x<3.6&&w.bounds.z>=19);
  for(const x of [-2.6,2.6]){const path=findPath(w.spawn,{x,z:-17},w.solids,w.bounds);assert.ok(path.length>0);assert.ok(path.some(p=>Math.abs(p.x)>2));}
  assert.ok(findPath({x:-2.6,z:0},{x:2.6,z:0},w.solids,w.bounds).length>0,'the middle passage connects the wings');
});
test('crouching behind a desk breaks the ghost sightline',()=>{
  const cover=[{x:0,z:0,w:3,d:1,y:.7,h:1.4}],ghost={x:0,y:1.55,z:-2};
  assert.equal(hasLineOfSight(ghost,{x:0,y:1.65,z:1},cover),true);
  assert.equal(hasLineOfSight(ghost,{x:0,y:1,z:1},cover),false);
});
test('the home has a 330 square metre footprint and a broad connected living area',()=>{
  const w=buildWorld(new THREE.Scene()),floor=w.root.getObjectByName('apartment-floor');assert.ok(floor);
  const size=new THREE.Box3().setFromObject(floor).getSize(new THREE.Vector3());assert.ok(Math.abs(size.x*size.z-330)<.1);
  for(const [x,z] of [[0,4.8],[0,0],[0,-4],[1,2],[2.6,2],[-2,0],[-4,0]])assert.ok(canStandAt(x,z,w.solids,.4,w.bounds),`wide passage at ${x},${z}`);
});
test('the exterior apartment gallery has a long clear route and an open view above its guardrail',()=>{
  const w=buildWorld(new THREE.Scene(),'landing'),call=w.targets.find(t=>t.id==='call');
  assert.ok(w.spawn.distanceTo(call.point)>40,'the elevator is at the far end of a long gallery');
  for(let z=-21;z<=21;z++)assert.ok(canStandAt(0,z,w.solids,.4,w.bounds),`clear route at ${z}`);
  assert.equal(hasLineOfSight({x:0,y:1.65,z:5},{x:-4,y:1.8,z:0},w.solids),true,'the falling shape can be seen outside');
  assert.equal(canStandAt(-1.6,0,w.solids,.23,w.bounds),false,'the player cannot walk off the balcony');
  assert.equal(hasLineOfSight({x:0,y:.7,z:0},{x:-4,y:.7,z:0},w.solids),false,'the solid lower guardrail remains');
});
test('memory rain and windshield lines release their GPU resources on teardown',async()=>{
  const {buildRoad}=await import('../lib/prologue.ts'),{disposeWorld}=await import('../lib/world.ts');
  const road=buildRoad(new THREE.Scene());let expected=0,disposed=0;
  road.root.traverse(o=>{if(o instanceof THREE.Line){for(const resource of [o.geometry,o.material]){expected++;resource.addEventListener('dispose',()=>disposed++);}}});
  assert.ok(expected>=4);disposeWorld(road.root);assert.equal(disposed,expected);assert.equal(road.root.parent,null);
});

test('opened home and elevator portals expose their adjoining spaces',()=>{
 const home=buildWorld(new THREE.Scene()),door=home.root.getObjectByName('front-door'),z=door.position.z;
 const a={x:0,y:1.6,z:z+1},b={x:0,y:1.6,z:z-3};
 home.updateStory('light_switch',0,false);assert.equal(hasLineOfSight(a,b,home.solids),false);
 home.updateStory('hide',1,false);home.updateStory('hide',3,false);assert.ok(door.rotation.y>1.3);assert.equal(hasLineOfSight(a,b,home.solids),true);
 for(const area of ['lift','landing']){const w=buildWorld(new THREE.Scene(),area),dz=w.liftDoors.left.position.z;w.liftDoors.blocks[0].x=-.955;w.liftDoors.blocks[1].x=.955;assert.equal(hasLineOfSight({x:0,y:1.6,z:dz+.7},{x:0,y:1.6,z:dz-2},w.solids),true,`${area} opening is not filled by the building enclosure`);}
});

test('the pursuer can enter the electrical room and reach every office patrol destination',async()=>{
 const {findPath}=await import('../lib/navigation.ts'),w=buildWorld(new THREE.Scene(),'office');
 for(const target of [{x:3.8,z:-4},{x:0,z:0},{x:0,z:-6},{x:3,z:5.6},{x:-3,z:4}])assert.ok(findPath(w.spawn,target,w.solids,w.bounds).length,`enemy route to ${JSON.stringify(target)}`);
});

test('the parking alarm has a clear approach for the distracted pursuer',async()=>{
 const {findPath}=await import('../lib/navigation.ts'),{buildingLayout}=await import('../lib/building.ts'),w=buildWorld(new THREE.Scene(),'parking');
 const goal=buildingLayout.parking.alarmApproach;
 assert.ok(canStandAt(goal.x,goal.z,w.solids,.23,w.bounds),'the attraction point cannot be inside the new mounting wall');
 assert.ok(findPath(w.figure.position,goal,w.solids,w.bounds).length>0);
});

test('the home threshold, 2803 entrance and elevator cab have connected walkable openings',async()=>{
  const {findPath}=await import('../lib/navigation.ts'),{landing}=await import('../lib/building.ts'),{apartment}=await import('../lib/apartment-layout.ts');
  const home=buildWorld(new THREE.Scene());
  assert.equal(canStandAt(0,apartment.doorZ,home.solids,.23,home.bounds),false);
  home.updateStory('hide',1,false);home.updateStory('hide',3,false);
  assert.ok(canStandAt(0,apartment.doorZ-.2,home.solids,.23,home.bounds));
  const w=buildWorld(new THREE.Scene(),'landing');
  const leaf=w.root.getObjectByName('2803-open-door'),original=home.root.getObjectByName('front-door').children[0];home.root.updateMatrixWorld(true);const center=original.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(leaf.position.x-(landing.homeX+center.z-apartment.doorZ))<.001);assert.ok(Math.abs(leaf.position.z-(landing.homeZ-center.x))<.001);
  assert.ok(findPath({x:3.7,z:landing.homeZ},{x:0,z:19},w.solids,w.bounds).length,'ghost walks out of 2803');
  assert.equal(canStandAt(0,landing.liftZ,w.solids,.23,w.bounds),false,'closed leaves block walking');
  w.liftDoors.blocks[0].x=-.955;w.liftDoors.blocks[1].x=.955;
  assert.ok(findPath({x:0,z:landing.liftZ+1},{x:0,z:landing.boardZ-.5},w.solids,w.bounds).length,'open leaves admit a player fully into the cab');
  assert.equal(canStandAt(1.1,landing.boardZ,w.solids,.23,w.bounds),false,'cab side walls remain solid');
});

test('entry shoes have human dimensions and rest on the tile, with no box-shaped footwear',()=>{
  const w=buildWorld(new THREE.Scene()),shoes=[];w.root.traverse(o=>{if(o.name==='wet-leather-shoe')shoes.push(o);});assert.equal(shoes.length,4);
  for(const shoe of shoes){const b=new THREE.Box3().setFromObject(shoe),s=b.getSize(new THREE.Vector3());assert.ok(s.z>.22&&s.z<.30);assert.ok(s.y>.06&&s.y<.09);assert.ok(Math.abs(b.min.y-.014)<.003,'sole meets tile');}
});
