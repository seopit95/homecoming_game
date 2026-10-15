import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,canStandAt,hasLineOfSight} from '../lib/world.ts';
import {findPath,clearPath} from '../lib/navigation.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};

test('the editing cubicle has one real doorway, a low observation window, and reachable controls',()=>{
 const w=buildWorld(new T.Scene(),'archive');
 assert.equal(clearPath({x:5,z:-20},{x:6.6,z:-20},w.solids,w.bounds,.23),false,'the window sill must stop walking through it');
 assert.equal(hasLineOfSight({x:5,y:1.65,z:-20},{x:6.6,y:1.65,z:-20},w.solids),true,'the open service window must allow a real view');
 assert.equal(clearPath({x:5,z:-17.2},{x:6.6,z:-17.2},w.solids,w.bounds,.43),true,'the opening must admit the crawling pursuer');
 for(const t of w.targets.filter(t=>t.id.startsWith('archive_preview_')||t.id.startsWith('archive_record_'))){
  const p=t.mesh.userData.approach;
  for(const r of [.23,.43]){assert.ok(canStandAt(p.x,p.z,w.solids,r,w.bounds),t.id+' has an occupied approach');assert.ok(findPath(w.spawn,p,w.solids,w.bounds,r).length,t.id+' has no route through the entrance');}
  assert.ok(hasLineOfSight({x:p.x,y:1.65,z:p.z},t.point,w.solids),t.id+' cannot be operated');
  assert.ok(findPath(p,{x:0,z:-30.5},w.solids,w.bounds,.23).length,'the desk must not trap the player');
 }
 const camera=w.root.getObjectByName('archive-cctv-camera');w.root.updateMatrixWorld(true);
 assert.ok(camera.position.z<-23&&camera.position.x<13.3,'the real camera must actually be mounted inside the new editing cubicle');
 const forward=new T.Vector3(0,0,1).transformDirection(camera.matrixWorld),toward=new T.Vector3(9,1.1,-19).sub(camera.position).normalize();assert.ok(forward.dot(toward)>.98,'the actual housing lens must face its subject');
});


test('the real crawling mesh clears the new booth sill, entrance jambs and desk turn in finite changed-room poses',async()=>{
 const {animateGhost}=await import('../lib/ghost.ts'),w=buildWorld(new T.Scene(),'archive'),f=w.figure,p=new T.Vector3();
 const cases=[[5.8,-17.2,Math.PI/2],[6.6,-17.2,Math.PI],[6.6,-18,Math.PI],[7.6,-18.45,Math.PI/2],[5.2,-20,Math.PI]];
 for(const [x,z,yaw] of cases)for(const phase of [0,2,4]){
  f.position.set(x,0,z);f.rotation.y=yaw;animateGhost(f,3,1,.7,false,phase,1,undefined,w.solids);f.updateMatrixWorld(true);let hit;
  f.traverse(m=>{if(hit||!m.isMesh||m.isInstancedMesh)return;for(let o=m;o!==f;o=o.parent)if(!o.visible)return;const v=m.geometry.getAttribute('position');for(let i=0;i<v.count&&!hit;i++){p.fromBufferAttribute(v,i).applyMatrix4(m.matrixWorld);for(const s of w.solids){if(Math.abs(p.x-s.x)<s.w/2-.002&&Math.abs(p.z-s.z)<s.d/2-.002&&Math.abs(p.y-(s.y??1.5))<(s.h??3)/2-.002){hit={mesh:m.name||m.parent.name,at:p.toArray(),solid:s};break;}}}});
  assert.equal(hit,undefined,JSON.stringify({x,z,yaw,phase,hit}));
 }
});

test('the recording keys fit a human-scale editing panel and physically meet their base',()=>{
 const w=buildWorld(new T.Scene(),'archive');w.root.updateMatrixWorld(true);const controls=w.targets.filter(t=>t.id.startsWith('archive_preview_')||t.id.startsWith('archive_record_')),all=new T.Box3();for(const t of controls)all.union(new T.Box3().setFromObject(t.mesh,true));assert.ok(all.max.x-all.min.x<=1.05,'the controls cannot be half-metre blocks across a three-metre console');
 const base=w.root.getObjectByName('archive-review-deck');assert.ok(base);const b=new T.Box3().setFromObject(base,true);for(const t of controls){const key=new T.Box3().setFromObject(t.mesh,true);assert.ok(Math.abs(key.min.y-b.max.y)<.002,'button floats above its panel');assert.ok(key.min.x>=b.min.x&&key.max.x<=b.max.x&&key.min.z>=b.min.z&&key.max.z<=b.max.z,'button overhangs its panel');}
});

test('the current-room optical camera starts outside its own physical housing and lens',()=>{
 const scene=new T.Scene(),w=buildWorld(scene,'archive');let camera;const r={shadowMap:{autoUpdate:true},getRenderTarget:()=>null,setRenderTarget(){},render(_s,c){camera=c;}};
 w.updateStory('archive_playback',100,false);w.updateStory('archive_playback',111,false);w.surveillance.render(r,scene);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 for(const [x,y] of [[0,0],[-.8,0],[.8,0],[0,.8],[0,-.8]]){const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(x,y),camera);ray.near=.001;ray.far=.5;assert.equal(ray.intersectObject(w.root.getObjectByName('archive-cctv-camera'),true).length,0,'the live feed is covered by its own lens');}
});
