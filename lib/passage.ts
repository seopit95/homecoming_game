import * as T from 'three';
import {surface,boxUV} from './materials.ts';
import type {Solid} from './world.ts';
import {solidContainsPoint,type Occupant} from './collision.ts';

const doorCenter=new T.Vector3(),doorRotation=new T.Quaternion();
export function setDoorAngle(hinge:T.Object3D,block:Solid,angle:number,centerX:number,centerZ=0,occupants:Occupant[]=[]){
 const start=hinge.rotation.y,steps=Math.max(1,Math.ceil(Math.abs(angle-start)/.025));
 for(let i=1;i<=steps;i++){
  const previous=hinge.rotation.y,x=block.x,z=block.z,yaw=block.yaw;
  hinge.rotation.y=T.MathUtils.lerp(start,angle,i/steps);hinge.updateWorldMatrix(true,false);
  doorCenter.set(centerX,0,centerZ).applyMatrix4(hinge.matrixWorld);hinge.getWorldQuaternion(doorRotation);
  block.x=doorCenter.x;block.z=doorCenter.z;block.yaw=2*Math.atan2(doorRotation.y,doorRotation.w);
  if(occupants.some(actor=>solidContainsPoint(block,actor.x,actor.z,actor.r))){
   hinge.rotation.y=previous;block.x=x;block.z=z;block.yaw=yaw;break;
  }
 }
}

// Two right-angle turns hide distant rooms, while both chapter scenes contain
// precisely the same landing, lights and walls at the crossing plane (local x=1.5).
export function connectionPassage(root:T.Group,solids:Solid[],lamps:T.PointLight[],x:number,z:number,y=0){
 const group=new T.Group();group.name='continuous-connection';group.position.set(x,y,z);root.add(group);
 const wall=surface('decayWall','#a6ada0'),floor=surface('oldTile','#929d94'),steel=surface('steel','#747f79',{metalness:.35});
 function box(px:number,py:number,pz:number,w:number,h:number,d:number,material:T.Material,solid=false){const mesh=new T.Mesh(boxUV(new T.BoxGeometry(w,h,d),px,py,pz),material);mesh.position.set(px,py,pz);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);if(solid)solids.push({x:x+px,y:y+py,z:z+pz,w,h,d});return mesh;}
 // Entrance south; turn east across the landing; turn north into the next room.
 for(const [px,pz,w,d] of [[0,-1,2,2],[1.5,-2,5,2],[3,-4.5,2,3]]){box(px,-.1,pz,w,.2,d,floor);box(px,2.86,pz,w,.12,d,wall);}
 for(const [px,pz,w,d] of [[-1.08,-1.5,.16,3],[1.08,-.5,.16,1],[2.5,-.92,3,.16],[.5,-3.08,3,.16],[4.08,-3.5,.16,5],[1.92,-4.5,.16,3]]){
  box(px,1.4,pz,w,2.8,d,wall,true);box(px,.075,pz,w+.012,.15,d+.012,steel);
 }
 for(const [px,pz] of [[0,-1.1],[2.9,-2.2],[3,-5.1]]){box(px,2.71,pz,.55,.07,.16,steel);const light=new T.PointLight('#91a599',1.1,4.5,2);light.position.set(x+px,y+2.55,z+pz);light.userData.base=1.1;root.add(light);lamps.push(light);}
 // A grounded drain and directional strip continue through the shared blind corner.
 for(let px=0;px<3.3;px+=.45)box(px,.008,-2,.23,.012,.035,new T.MeshStandardMaterial({color:'#b1b795',roughness:.8}));
 // A hydraulic fire door is shared by the outgoing and incoming copies.
 const leaf=box(.85,1.15,-3,.08,2.3,1.92,steel);leaf.name='connection-fire-door';leaf.geometry.translate(0,0,.96);leaf.rotation.y=-Math.PI/2;
 const block={x:x-.11,y:y+1.15,z:z-3,w:.08,h:2.3,d:1.92,yaw:-Math.PI/2};solids.push(block);leaf.userData.block=block;
 return group;
}

export function setConnectionDoor(door:T.Object3D,openness:number,occupants:Occupant[]=[]){
 setDoorAngle(door,door.userData.block,-Math.PI/2*T.MathUtils.clamp(openness,0,1),0,.96,occupants);
}
