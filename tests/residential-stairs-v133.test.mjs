import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {canStandAt,hasLineOfSight,disposeWorld} from '../lib/world.ts';
import {findPursuitPath,clearPath} from '../lib/navigation.ts';

globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){},clearRect(){}})})};
let fixture;
async function stairs(){
 if(!fixture){const {buildResidentialStairs}=await import('../lib/residential-stairs.ts'),root=new T.Group();fixture={root,...buildResidentialStairs(root)};}
 fixture.reset();return fixture;
}
after(()=>{if(fixture)disposeWorld(fixture.root);});

// Break caught: repeated XY coordinates select an adjacent storey instead of
// following the caller's grounded ramp continuously through every real turn.
test('V133 the full stacked descent keeps its support reference through all eight flights',async()=>{
 const w=await stairs(),route=w.stairRoute;
 const points=[[1,0,-.8],[1,0,0],[1,-1.4,3.2],[1,-1.4,3.9],[-1,-1.4,3.9],[-1,-1.4,3.2],[-1,-2.8,0],[-1,-2.8,-.8],[1,-2.8,-.8],
  [1,-2.8,0],[1,-4.2,3.2],[1,-4.2,3.9],[-1,-4.2,3.9],[-1,-4.2,3.2],[-1,-5.6,0],[-1,-5.6,-.8],[1,-5.6,-.8],
  [1,-5.6,0],[1,-7,3.2],[1,-7,3.9],[-1,-7,3.9],[-1,-7,3.2],[-1,-8.4,0],[-1,-8.4,-.8],[1,-8.4,-.8],
  [1,-8.4,0],[1,-9.8,3.2],[1,-9.8,3.9],[-1,-9.8,3.9],[-1,-9.8,3.2],[-1,-11.2,0],[-1,-11.2,-.8],[0,-11.2,-.8]];
 let ground=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.04);
  for(let j=1;j<=n;j++){
   const t=j/n,x=T.MathUtils.lerp(a[0],b[0],t),z=T.MathUtils.lerp(a[2],b[2],t),next=route.heightAt(x,z,ground),want=T.MathUtils.lerp(a[1],b[1],t);
   assert.ok(Math.abs(next-want)<1e-7,JSON.stringify({i,x,z,next,want}));
   assert.ok(Math.abs(next-ground)<.025,'support cannot jump a storey');
   assert.ok(canStandAt(x,z,route.navigationSolids(next),.43,w.bounds),'the route must fit a real pursuer body');ground=next;
  }
 }
 assert.ok(Math.abs(ground+11.2)<1e-8);
 for(const [height,floor] of [[0,24],[-2.8,23],[-5.6,22],[-8.4,21],[-11.2,20]]){assert.equal(route.floorAt(height),floor);assert.ok(Math.abs(w.heightAt(1,-.8,height)-height)<1e-8);}
 assert.equal(w.heightAt(.7,-2.9,0),0);assert.equal(w.heightAt(.7,-2.9,-11.2),-11.2);
});

// Break caught: a mathematical ramp without actual treads/slabs leaves the
// player unsupported, or lets sight rays see straight through stacked floors.
test('V133 real tread and landing meshes support the route and slabs occlude other levels',async()=>{
 const w=await stairs();w.root.updateMatrixWorld(true);const meshes=[];
 w.root.traverse(o=>{if(o.isMesh&&!w.figure.getObjectById(o.id))meshes.push(o);});
 for(let floor=0;floor<4;floor++)for(let tread=0;tread<10;tread++)for(const side of [-1,1]){
  const z=(tread+.5)*.32,ref=-floor*2.8-(side>0?.4375*z:2.8-.4375*z),ground=w.heightAt(side,z,ref);
  const hit=new T.Raycaster(new T.Vector3(side,ground+.25,z),new T.Vector3(0,-1,0),0,.5).intersectObjects(meshes,false)[0];
  assert.ok(hit&&hit.point.y<=ground+.002&&ground-hit.point.y<.145,'each foot needs the actual tread directly below its ramp support');
 }
 for(const y of [0,-2.8,-5.6,-8.4])assert.equal(hasLineOfSight({x:1,y:y+1.65,z:-.8},{x:1,y:y-1.15,z:-.8},w.solids),false,'landing slabs separate storeys');
 assert.equal(hasLineOfSight({x:1,y:-4.2,z:1.6},{x:-1,y:-4.2,z:1.6},w.solids),false,'central spine separates the real flights');
});

// Break caught: flattening all vertical colliders closes every route, while
// dropping structural solids allows cross-spine shortcuts or locked exits.
test('V133 navigation keeps height-relevant walls and doors while omitting tread risers',async()=>{
 const w=await stairs(),r=w.stairRoute;
 assert.equal(canStandAt(0,1.6,r.navigationSolids(-5.6),.23,w.bounds),false);
 assert.equal(canStandAt(2.08,2,r.navigationSolids(-5.6),.23,w.bounds),false);
 assert.ok(findPursuitPath({x:.7,z:-2.9},{x:1,z:-.8},r.navigationSolids(0),w.bounds).length,'the receiving vestibule feeds the open 24F door');
 for(const y of [-2.8,-5.6,-8.4])assert.equal(canStandAt(0,-1.67,r.navigationSolids(y),.23,w.bounds),false,'intermediate closed doors cannot be walked through');
 assert.equal(canStandAt(r.exit.x,r.exit.z,r.navigationSolids(-11.2),.23,w.bounds),false,'the actual ajar 20F leaf still blocks the exit crossing');
 assert.ok(r.navigationSolids(0).length<w.solids.length,'actual floor/tread solids remain available to LOS without blocking 2D navigation');
});

// Break caught: walking toward an unbuilt continuation at the first/last
// landing selects a neighbour's overlapping flight and jumps one storey.
test('V133 end guards block the absent 24F upper flight and 20F lower flight',async()=>{
 const w=await stairs(),r=w.stairRoute;
 for(const [x,y] of [[-1,0],[1,-11.2]])assert.equal(clearPath({x,z:-.8},{x,z:.2},r.navigationSolids(y),w.bounds,.23),false,'an absent continuation needs a physical end guard');
 for(const [x,y] of [[1,0],[-1,-11.2]])assert.equal(clearPath({x,z:-.8},{x,z:.2},r.navigationSolids(y),w.bounds,.23),true,'the actual connecting flight must remain clear');
});

// Break caught: straight-line distance or XZ projection loses the remaining
// descent when the actor occupies the same footprint several storeys above.
test('V133 remaining pursuit distance follows stacked route progress to the actual exit',async()=>{
 const w=await stairs(),r=w.stairRoute,upper=r.remainingToExit({x:0,y:0,z:-.8}),lower=r.remainingToExit({x:0,y:-2.8,z:-.8});
 assert.ok(upper>55&&upper<58,'four real U-flights require the full ordered route distance');
 assert.ok(lower>40&&lower<44&&lower<upper,'the same XY one floor lower retains only the remaining descent');
 assert.ok(Math.abs(r.remainingToExit({x:0,y:-11.2,z:-.8})-1)<1e-8,'the last landing is one metre from the crossing');
 assert.ok(Math.abs(r.remainingToExit({x:0,y:-11.2,z:-1.7})-.1)<1e-8);
 assert.equal(r.remainingToExit(r.exit),0);assert.equal(r.remainingToExit({x:0,y:-11.2,z:-2.2}),0,'already crossed actors cannot acquire negative travel time');
});

// Break caught: using only XZ distance targets the lower player's coordinates
// immediately and skips a floor, or a corner target never advances.
test('V133 pursuit follows physical 3D descent corners instead of identical XY on another floor',async()=>{
 const w=await stairs(),r=w.stairRoute,p={x:-1,y:-11.2,z:-.8},g={x:.7,y:0,z:-2.9};let distance=0;
 for(let i=0;i<2500&&Math.hypot(g.x-p.x,g.y-p.y,g.z-p.z)>.12;i++){
  const goal=r.chaseTarget(g,p);assert.ok(Math.abs(goal.y-g.y)<1.65,'next target cannot skip an entire storey');
  const path=findPursuitPath(g,goal,r.navigationSolids(g.y),w.bounds);assert.ok(path.length,JSON.stringify({g,goal}));
  const next=path.find(v=>Math.hypot(v.x-g.x,v.z-g.z)>.04)??goal,dx=next.x-g.x,dz=next.z-g.z,d=Math.hypot(dx,dz),step=Math.min(.065,d);
  assert.ok(d>.001,'a reached 3D corner must advance');
  const before={...g};g.x+=dx/d*step;g.z+=dz/d*step;g.y=r.heightAt(g.x,g.z,g.y);
  assert.ok(clearPath(before,g,r.navigationSolids(before.y),w.bounds,.43),'each actual motion stroke respects the central spine/door');
  assert.ok(Math.abs(g.y-before.y)<.04,'pursuit remains grounded during the step');distance+=step;
 }
 assert.ok(Math.hypot(g.x-p.x,g.y-p.y,g.z-p.z)<.12,JSON.stringify(g));assert.ok(distance>40,'four floors must be traversed, not teleported');
 const reverse=r.chaseTarget({x:1,y:-8.4,z:-.8},{x:1,y:0,z:-.8});assert.ok(Math.abs(reverse.y+8.4)<1.5,'uphill pursuit also starts on the current storey');
});

// Break caught: creating intermediate tasks, opening the wrong storey's door,
// or retaining a fully opened exit after the cached world resets.
test('V133 only the ajar 20F door is interactive and physical passage opens then resets',async()=>{
 const w=await stairs(),r=w.stairRoute;
 assert.deepEqual(w.targets.map(t=>t.id),['up']);const target=w.targets[0];assert.ok(target.point.y<-9&&target.point.z<-1.6);assert.match(target.label,/20|밀|열/);
 const entry=w.root.getObjectByName('residential-stair-door-24'),exit=w.root.getObjectByName('residential-stair-door-20');assert.ok(entry.rotation.y>1.5);assert.ok(Math.abs(exit.rotation.y-.55)<1e-8);
 w.updateStory('stairs_reverse',0,false);assert.ok(Math.abs(exit.rotation.y-.55)<1e-8);
 w.updateStory('stairs_passage',0,false);w.updateStory('stairs_passage',1,false);
 assert.ok(exit.rotation.y>1.5);assert.equal(canStandAt(r.exit.x,r.exit.z,r.navigationSolids(-11.2),.23,w.bounds),true);assert.ok(findPursuitPath({x:-1,z:-.8},r.exit,r.navigationSolids(-11.2),w.bounds).length,'opened exit leads onto a real receiving floor');
 w.reset();assert.ok(Math.abs(exit.rotation.y-.55)<1e-8);assert.ok(entry.rotation.y>1.5);
 let ghosts=0;w.root.traverse(o=>{if(o.name==='resident-remains')ghosts++;});assert.equal(ghosts,1);
});
