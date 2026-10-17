import * as T from 'three';
import {createPedestrian} from './pedestrian.ts';
import {solidContainsPoint} from './collision.ts';
import type {Solid} from './world.ts';

export type ObservedPlayer={position:T.Vector3;floor:number;yaw:number;pitch:number;crouched:boolean;torch:boolean;time:number;solids?:Solid[]};

// The same protagonist seen in the parking recording, drawn only by CAM-08.
export function createObservedPlayer(){
 const holder=new T.Group(),actor=createPedestrian(holder,'driver');actor.root.name='observed-player';actor.root.scale.x=1;
 const wrist=actor.root.getObjectByName('pedestrian-carry-hand')!,hand=wrist.children[0] as T.Mesh;
 const fingers=hand.geometry.getAttribute('position');
 for(let i=0;i<fingers.count;i++){
  const y=fingers.getY(i);if(y>=-.055)continue;
  const angle=Math.min(2.8,(-y-.055)/.035);fingers.setXYZ(i,fingers.getX(i),-.055-.035*Math.sin(angle),fingers.getZ(i)+.035*(1-Math.cos(angle)));
 }
 hand.geometry.computeVertexNormals();
 const grip=new T.Group();grip.name='observed-held-flashlight';grip.position.set(0,-.088,.025);wrist.add(grip);
 const metal=new T.MeshStandardMaterial({color:'#242b2c',roughness:.4,metalness:.7});
 for(const [x,length,radius] of [[0,.19,.025],[.115,.065,.039]] as const){const m=new T.Mesh(new T.CylinderGeometry(radius,radius,length,20),metal);m.rotation.z=-Math.PI/2;m.position.x=x;m.castShadow=true;grip.add(m);}
 const lens=new T.Mesh(new T.CircleGeometry(.032,24),new T.MeshStandardMaterial({color:'#a8b9b5',emissive:'#e5e5ce',emissiveIntensity:.7}));lens.rotation.y=Math.PI/2;lens.position.x=.149;grip.add(lens);
 const previous=new T.Vector3(),bounds=new T.Box3(),eye=new T.Vector3(),point=new T.Vector3(),head=actor.root.getObjectByName('pedestrian-head')!;
 const meshes:T.Mesh[]=[];actor.root.traverse(o=>{if(o instanceof T.Mesh)meshes.push(o);});
 // ponytail: finite spine poses for this fixed CCTV room; use limb IK if the room or rig expands.
 const leans=[[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3],[.55,0],[-.55,0],[0,.55],[0,-.55],[.35,.35],[.35,-.35],[-.35,.35],[-.35,-.35]];
 let distance=0,lastTime=-1;
 function update(p:ObservedPlayer){
  const dt=p.time-lastTime,step=Math.hypot(p.position.x-previous.x,p.position.z-previous.z),travel=lastTime>=0&&dt>0&&dt<1&&step<=dt*4?step:0;
  distance+=travel;previous.copy(p.position);lastTime=p.time;
  const near=(p.solids??[]).filter(s=>{const c=Math.abs(Math.cos(s.yaw??0)),n=Math.abs(Math.sin(s.yaw??0));return Math.abs(p.position.x-s.x)<(s.w*c+s.d*n)/2+1.2&&Math.abs(p.position.z-s.z)<(s.w*n+s.d*c)/2+1.2;});
  for(const [leanX,leanZ] of leans){
   actor.root.position.set(p.position.x,p.floor,p.position.z);actor.root.rotation.y=p.yaw+Math.PI;
   actor.pose(distance/1.37,null,travel>.001?1.37:0,{crouched:p.crouched,pitch:p.pitch,leanX,leanZ});
   actor.root.updateMatrixWorld(true);head.localToWorld(eye.set(0,.101126,.09097));actor.root.position.x+=p.position.x-eye.x;actor.root.position.z+=p.position.z-eye.z;
   actor.root.updateMatrixWorld(true);bounds.setFromObject(actor.root,true);actor.root.position.y+=p.floor-bounds.min.y;actor.root.updateMatrixWorld(true);
   let blocked=false;
   for(const mesh of meshes){const vertices=mesh.geometry.getAttribute('position');for(let i=0;i<vertices.count&&!blocked;i++){
    point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
    for(const s of near)if(point.y>(s.y??1.5)-(s.h??3)/2+.002&&point.y<(s.y??1.5)+(s.h??3)/2-.002&&solidContainsPoint(s,point.x,point.z,-.002)){blocked=true;break;}
   }if(blocked)break;}
   if(!blocked)break;
  }
  (lens.material as T.MeshStandardMaterial).emissiveIntensity=p.torch?.7:0;
 }
 update({position:new T.Vector3(9,1.65,-18.9),floor:0,yaw:0,pitch:0,crouched:false,torch:true,time:0});
 return {root:actor.root,resources:holder,update};
}
