import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld,canStandAt} from '../lib/world.ts';
import {findPath} from '../lib/navigation.ts';
import {buildBuilding} from '../lib/building.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}})})};

test('V107 outdoor shelters have supported bodies, free exits and reachable approaches',()=>{
 for(const area of ['landing','corridor','stairs','resident','office','annex','courtyard','archive','plant','parking']){
  const w=buildWorld(new T.Scene(),area);try{
   assert.ok(w.hidingPlaces?.length,area+' needs a real hiding place');
   for(const s of w.hidingPlaces){
    assert.ok(s.root.getObjectByName('shelter-peek-slats'),'a real slatted view must be visible');
    assert.ok(canStandAt(s.exit.x,s.exit.z,w.solids,.23,w.bounds),area+' player exit');
    assert.ok(canStandAt(s.approach.x,s.approach.z,w.solids,.43,w.bounds),area+' pursuer approach');
    assert.ok(canStandAt(s.eye.x,s.eye.z,w.solids,.23,w.bounds),area+' body fits inside the shell');
    assert.ok(findPath(w.spawn,s.exit,w.solids,w.bounds,.23).length,area+' approach is reachable');
    assert.ok(Math.abs(s.eye.y-(w.heightAt(s.eye.x,s.eye.z)+1.25))<.08,area+' rests on this floor');
   }
  }finally{disposeWorld(w.root);}
 }
});

function overlap(a,b){
 if(a.y-a.h/2>=(b.y??1.5)+(b.h??3)/2-.002||a.y+a.h/2<=(b.y??1.5)-(b.h??3)/2+.002)return false;
 const corners=o=>{const c=Math.cos(o.yaw??0),s=Math.sin(o.yaw??0);return [-1,1].flatMap(i=>[-1,1].map(j=>[o.x+i*o.w/2*c+j*o.d/2*s,o.z-i*o.w/2*s+j*o.d/2*c]));},aa=corners(a),bb=corners(b);
 for(const angle of [a.yaw??0,b.yaw??0])for(const axis of [[Math.cos(angle),-Math.sin(angle)],[Math.sin(angle),Math.cos(angle)]]){const av=aa.map(p=>p[0]*axis[0]+p[1]*axis[1]),bv=bb.map(p=>p[0]*axis[0]+p[1]*axis[1]);if(Math.max(...av)<=Math.min(...bv)+.002||Math.max(...bv)<=Math.min(...av)+.002)return false;}
 return true;
}
test('V107 cabinets do not intersect existing solid furniture or obstruct previously usable controls',()=>{
 const failures=[];
 for(const area of ['landing','corridor','stairs','resident','office','annex','courtyard','archive','plant','parking']){
  const w=buildWorld(new T.Scene(),area),baseRoot=new T.Group(),base=buildBuilding(baseRoot,area);try{
   for(const s of w.hidingPlaces){const a={x:s.root.position.x,z:s.root.position.z,y:s.root.position.y+1.04,w:1.12,d:.86,h:2.08,yaw:s.root.rotation.y};for(const b of base.solids)if(overlap(a,b))failures.push({area,place:s.root.name,solid:b});assert.ok(s.pass.distanceTo(s.exit)>3,'the pursuer needs a real pass-by route');}
   for(const t of base.targets){const p=t.mesh.userData.approach;if(p&&canStandAt(p.x,p.z,base.solids,.23,base.bounds)&&!canStandAt(p.x,p.z,w.solids,.23,w.bounds))failures.push({area,blockedControl:t.id});}
  }finally{disposeWorld(w.root);disposeWorld(baseRoot);}
 }
 assert.deepEqual(failures,[]);
});
