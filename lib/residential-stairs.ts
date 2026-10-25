import * as T from 'three';
import {surface,boxUV} from './materials.ts';
import {roundPipe} from './props.ts';
import {buildStairDoor,setDoorAngle} from './passage.ts';
import {createApartmentPlaque} from './apartment-signage.ts';
import {createGhost} from './ghost.ts';
import {buildResidentialGallery} from './residential-gallery.ts';
import type {Bounds,Solid,Target} from './world.ts';
import type {Stage,Story} from './story.ts';
import type {Occupant} from './collision.ts';

type Position={x:number;y:number;z:number};
export type StairRoute={
 /** Both the reference and the result are ground heights, not eye heights. */
 heightAt(x:number,z:number,referenceY?:number):number;
 navigationSolids(groundY:number):Solid[];
 chaseTarget(ghost:Position,player:Position):Position;
 /** Remaining 3D centreline distance after projecting a grounded actor. */
 remainingToExit(p:Position):number;
 floorAt(groundY:number):number;
 exit:Position;
};

/** One physical shaft: every storey shares the same XZ footprint. */
export function buildResidentialStairs(root:T.Group,preview=false){
 const solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[],walkSurfaces=new Set<Solid>();
 const wall=surface('decayWall','#b2b0a1'),lower=surface('wall','#738379'),concrete=surface('castConcrete','#9b9e92'),tile=surface('oldTile','#a9aa98',{roughness:.73}),steel=surface('paintedMetal','#65736c',{metalness:.4,roughness:.62});
 function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:T.Material,solid=false,walkSurface=false){
  const mesh=new T.Mesh(boxUV(new T.BoxGeometry(w,h,d),x,y,z),material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  if(solid){const block={x,y,z,w,h,d};solids.push(block);if(walkSurface)walkSurfaces.add(block);}return mesh;
 }
 function slab(name:string,x:number,top:number,z:number,w:number,d:number){return box(name,x,top-.11,z,w,.22,d,tile,true,true);}
 function lamp(x:number,y:number,z:number,color:string,intensity:number,range=4.5){
  const light=new T.PointLight(color,intensity,range,2);light.position.set(x,y,z);light.userData.base=intensity;root.add(light);lamps.push(light);return light;
 }
 const low=-11.42,high=2.8,middle=(low+high)/2,height=high-low;
 for(const side of [-1,1]){
  box('stair-side-wall',side*2.1,middle,1.5,.2,height,6.4,wall,true);
  box('stair-front-pier',side*1.39,middle,-1.67,1.42,height,.2,wall,true);
 }
 box('stair-back-wall',0,middle,4.7,4.4,height,.2,wall,true);
 box('stair-central-spine',0,middle,1.6,.4,height,3.2,wall,true);
 box('stair-roof',0,2.89,1.5,4.4,.18,6.4,concrete,true,true);

 const doors=new Map<number,ReturnType<typeof buildStairDoor>>();
 for(let k=0;k<=4;k++){
  const base=-k*2.8,floor=24-k;
  slab(`stair-front-landing-${floor}`,0,base,-.8,4,1.6);
  box('stair-door-header',0,base+2.54,-1.67,1.36,.52,.2,wall,true);
  for(const side of [-1,1]){
   box('stair-landing-dado',side*2.005,base+.45,-.8,.018,.9,1.6,lower);
   roundPipe(root,[side*1.86,base+.9,-1.4],[side*1.86,base+.9,0],.025,steel);
  }
  const door=buildStairDoor(root,solids,0,base,-1.67,`residential-stair-door-${floor}`);doors.set(floor,door);
  setDoorAngle(door.hinge,door.block,floor===24?1.55:floor===20?.55:0,.55);
  createApartmentPlaque(root,{text:`${floor}층`,subtitle:'비상계단',position:[1.35,base+1.65,-1.5695],width:.68,height:.29,name:`residential-stair-floor-${floor}`});
  box('stair-landing-fixture',1.58,base+2.58,-.65,.45,.07,.16,steel);
  lamp(1.58,base+2.49,-.65,'#87998b',.46);
  if(k===4)continue;
  slab(`stair-mid-landing-${floor}`,0,base-1.4,3.9,4,1.4);
  // Ten 140 mm risers / 320 mm treads per half flight. The analytical walking
  // ramp joins their nosings smoothly; actual tread tops remain below it.
  for(let step=0;step<10;step++)for(const side of [-1,1]){
   const z=side>0?(step+.5)*.32:3.2-(step+.5)*.32,top=base-(side>0?0:1.4)-(step+1)*.14;
   box(`stair-tread-${floor}-${side}-${step}`,side*1.1,top-.11,z,1.8,.22,.32,tile,true,true);
   box('stair-tread-nosing',side*1.1,top+.002,z+(side>0?-.145:.145),1.8,.006,.025,steel);
  }
  // The cast-concrete underflight joins every tread; these are not suspended
  // individual boards. Existing tread solids still provide occlusion/contact.
  for(const side of [-1,1]){
   const soffit=box('stair-concrete-underflight',side*1.1,base-(side>0?1.06:2.46),1.6,1.8,.18,3.2/Math.cos(Math.atan(.4375)),concrete);
   soffit.rotation.x=side*Math.atan(.4375);
  }
  for(const side of [-1,1]){
   const a=side>0?base:base-2.8,b=base-1.4;
   for(const x of [side*.3,side*1.86]){
    roundPipe(root,[x,a+.92,0],[x,b+.92,3.2],.026,steel);
    for(const z of [.3,1.6,2.9]){
     const y=side>0?base-.4375*z:base-2.8+.4375*z;
     roundPipe(root,[x,y+.92,z],[x+(Math.abs(x)>1?side*.13:-side*.1),y+.82,z],.011,steel);
    }
   }
   const angle=Math.atan(.4375),dado=box('stair-flight-dado',side*2.005,base+(side>0?-.25:-1.65),1.6,.018,.9,3.2/Math.cos(angle),lower);dado.rotation.x=side*angle;
  }
  roundPipe(root,[-1.86,base-.48,4.5],[1.86,base-.48,4.5],.025,steel);
  lamp(-1.65,base+.95,4.45,'#819084',.28,3.8);
 }
 // The bounded shaft ends here; a wrong turn cannot step onto the other
 // storey's flight where an upper/lower continuation has not been built.
 for(const [x,base] of [[-1.1,0],[1.1,-11.2]]){
  box('stair-end-parapet',x,base+.36,.05,1.8,.72,.12,concrete,true);
  roundPipe(root,[x-.9,base+.96,.05],[x+.9,base+.96,.05],.027,steel);
  for(const side of [-1,1])roundPipe(root,[x+side*.8,base+.71,.05],[x+side*.8,base+.96,.05],.018,steel);
 }
 // Both sides of each crossing render the same gallery, not a blank wall
 // replaced by a corridor as soon as the camera passes the door.
 for(const base of [0,-11.2]){
  slab('stair-receiving-floor',0,base-.01,-2.55,2.4,1.9);
  if(preview)continue;
  const galleryRoot=new T.Group();galleryRoot.name=base===0?'stair-24F-gallery-preview':'stair-20F-gallery-preview';galleryRoot.position.set(0,base,-24.71);root.add(galleryRoot);
  const gallery=buildResidentialGallery(galleryRoot,base===0?'corridor':'transfer',true);
  galleryRoot.getObjectByName('gallery-stair-door')?.parent?.removeFromParent();
  galleryRoot.getObjectByName('gallery-stair-vestibule')?.removeFromParent();
  lamps.push(...gallery.lamps);
  if(base===0){gallery.liftDoors.left.position.x=-.955;gallery.liftDoors.right.position.x=.955;}
 }
 box('20f-vestibule-light',.35,-8.59,-2.45,.55,.06,.2,steel);
 box('20f-vestibule-diffuser',.35,-8.627,-2.45,.45,.015,.15,new T.MeshStandardMaterial({color:'#9eb6cb',emissive:'#8cacc7',emissiveIntensity:.5}));
 lamp(.35,-8.72,-2.45,'#8cacc7',2.2,6);
 const exitDoor=doors.get(20)!,target:Target={id:'up',label:'20층 복도문 · 밀어서 열기',mesh:exitDoor.leaf,point:new T.Vector3()};
 exitDoor.leaf.userData.approach={x:.18,z:-.8};targets.push(target);
 function targetPosition(){exitDoor.leaf.updateWorldMatrix(true,false);target.point.copy(exitDoor.leaf.position).applyMatrix4(exitDoor.hinge.matrixWorld);target.point.y=-10;}
 targetPosition();

 const route:Position[]=[{x:0,y:0,z:-2.9},{x:0,y:0,z:-.8},{x:1,y:0,z:-.8}];
 for(let k=0;k<4;k++){
  const y=-k*2.8;
  route.push({x:1,y,z:0},{x:1,y:y-1.4,z:3.2},{x:1,y:y-1.4,z:3.9},{x:-1,y:y-1.4,z:3.9},{x:-1,y:y-1.4,z:3.2},{x:-1,y:y-2.8,z:0},{x:-1,y:y-2.8,z:-.8});
  if(k<3)route.push({x:1,y:y-2.8,z:-.8});
 }
 route.push({x:0,y:-11.2,z:-.8},{x:0,y:-11.2,z:-2.9});
 const lengths=route.slice(1).map((p,i)=>Math.hypot(p.x-route[i].x,p.y-route[i].y,p.z-route[i].z)),progress=[0];for(const length of lengths)progress.push(progress.at(-1)!+length);
 function nearest(p:Position){
  let distance=Infinity,index=0,along=0;
  for(let i=0;i<route.length-1;i++){
   const a=route[i],b=route[i+1],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,t=T.MathUtils.clamp(((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/(lengths[i]*lengths[i]),0,1),d=Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t,p.z-a.z-dz*t);
   if(d<distance){distance=d;index=i;along=progress[i]+lengths[i]*t;}
  }
  return {index,along};
 }
 const exit={x:0,y:-11.2,z:-1.8},exitProgress=nearest(exit).along;
 const stairRoute:StairRoute={
  heightAt(x,z,referenceY=0){
   const candidates:number[]=[];
   if(z>=-1.6&&z<=0)for(let k=0;k<=4;k++)candidates.push(-k*2.8);
   else if(z>=3.2&&z<=4.6)for(let k=0;k<4;k++)candidates.push(-k*2.8-1.4);
   else if(z>=0&&z<=3.2&&Math.abs(x)>=.2)for(let k=0;k<4;k++)candidates.push(-k*2.8-(x>0?.4375*z:2.8-.4375*z));
   else if(z>=-3.5&&z<-1.6&&Math.abs(x)<=1.2)candidates.push(0,-11.2);
   return candidates.reduce((best,y)=>Math.abs(y-referenceY)<Math.abs(best-referenceY)?y:best,candidates[0]??referenceY);
  },
  navigationSolids(groundY){return solids.filter(s=>!walkSurfaces.has(s)&&(s.y??1.5)+(s.h??3)/2>groundY+.06&&(s.y??1.5)-(s.h??3)/2<groundY+1.9);},
  chaseTarget(ghost,player){
   const from=nearest(ghost),to=nearest(player),direction=to.along>=from.along?1:-1;let next=from.index+(direction>0?1:0);
   while(next>=0&&next<route.length&&Math.hypot(route[next].x-ghost.x,route[next].z-ghost.z)<.18&&Math.abs(route[next].y-ghost.y)<.18)next+=direction;
   const direct=next<0||next>=route.length||direction*(to.along-progress[next])<=0,goal=direct?player:route[next],end=direct?to.along:progress[next];
   // A 2D path computed at the current height must not plan a whole flight
   // through an obstacle that will be safely overhead after descending.
   if(Math.abs(goal.y-ghost.y)>.35){
    const along=from.along+direction*Math.min(.8,Math.abs(end-from.along));let i=0;
    while(i<lengths.length-1&&progress[i+1]<along)i++;
    const t=T.MathUtils.clamp((along-progress[i])/lengths[i],0,1),a=route[i],b=route[i+1];return {x:T.MathUtils.lerp(a.x,b.x,t),y:T.MathUtils.lerp(a.y,b.y,t),z:T.MathUtils.lerp(a.z,b.z,t)};
   }
   return {...goal};
  },
  remainingToExit(p){return Math.max(0,exitProgress-nearest(p).along);},
  floorAt(groundY){return 24-T.MathUtils.clamp(Math.round(-groundY/2.8),0,4);},
  exit,
 };
 let openedAt=-1;
 function updateStory(stage:Stage,time:number,reduced=false,_story?:Story,occupants:(Occupant&{y?:number})[]=[]){
  if(stage==='stairs_passage'&&openedAt<0)openedAt=time;
  if(openedAt>=0){setDoorAngle(exitDoor.hinge,exitDoor.block,.55+T.MathUtils.smoothstep(time-openedAt,0,reduced?.2:.75),.55,0,occupants.filter(o=>o.y===undefined||Math.abs(o.y+11.2)<2));targetPosition();}
 }
 function reset(){openedAt=-1;setDoorAngle(exitDoor.hinge,exitDoor.block,.55,.55);setDoorAngle(doors.get(24)!.hinge,doors.get(24)!.block,1.55,.55);targetPosition();}
 const figure=preview?new T.Group():createGhost(root);figure.position.set(.7,0,-2.9);figure.rotation.y=Math.PI;figure.visible=false;
 const bounds:Bounds={x:2.12,z:4.72};
 return {solids,targets,lamps,shoes:new T.Group(),figure,phoneGlow:new T.PointLight(),radioLight:new T.PointLight(),bounds,spawn:new T.Vector3(1,1.65,-.8),heading:Math.PI,heightAt:stairRoute.heightAt,liftDoors:undefined,setDisplay:undefined,fallingFigure:undefined,updateStory,reset,carDeparture:undefined,stairRoute};
}
