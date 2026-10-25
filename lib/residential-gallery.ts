import * as T from 'three';
import {surface,boxUV,softBox,sharePrintedTexture} from './materials.ts';
import {createGhost} from './ghost.ts';
import {galleryDoor,galleryPaint,dressCommonGallery} from './common-gallery.ts';
import {roundPipe} from './props.ts';
import {buildStairDoor,setDoorAngle} from './passage.ts';
import {createApartmentPlaque} from './apartment-signage.ts';
import {nightWindow} from './japan.ts';
import {residentialRoute as R,isTransferStage} from './residential-route.ts';
import {createLiftClimb} from './lift-climb.ts';
import {buildGroundSupport} from './ground-support.ts';
import {apartmentEscapeLayout} from './escape-layout.ts';
import type{Solid,Target}from'./world.ts';import type{Action,Stage,Story}from'./story.ts';import type{Occupant}from'./collision.ts';

function tools(root:T.Group,solids:Solid[],lamps:T.PointLight[]){
 const floor=surface('oldTile','#b0b1a4',{roughness:.68}),wall=surface('decayWall','#aab0a2'),concrete=surface('castConcrete','#8f9690'),steel=surface('steel','#7f8884',{roughness:.55,metalness:.4}),dark=new T.MeshStandardMaterial({color:'#101818',roughness:.9});
 function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false,parent:T.Object3D=root){const o=new T.Mesh(boxUV(softBox(w,h,d),x,y,z),m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);if(solid)solids.push({x,y,z,w,h,d});return o;}
 function light(x:number,y:number,z:number,power=3){const l=new T.PointLight('#91a69a',power,7);l.position.set(x,y,z);l.userData.base=power;l.userData.moodSeed=Math.abs(Math.round((root.userData.floorNo??0)*71+x*11+z*17));root.add(l);lamps.push(l);return l;}
 function display(x:number,y:number,z:number,text:string){const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d')!,map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map}),o=new T.Mesh(new T.PlaneGeometry(.38,.17),m);o.position.set(x,y,z);root.add(o);return{mesh:o,update(t:string){ctx.fillStyle='#0a1010';ctx.fillRect(0,0,256,128);ctx.fillStyle='#b88161';ctx.font='70px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,128,70);map.needsUpdate=true;},init(){this.update(text);}};}
 return{floor,wall,concrete,steel,dark,box,light,display};
}

// The same footprint, windows, door spacing, lifts and materials are used on
//28F,24F and20F. Only floor numbers and actual door states vary.
export function buildResidentialGallery(root:T.Group,area:'landing'|'corridor'|'transfer',preview=false){
 const G=R.gallery,floorNo=area==='landing'?28:area==='transfer'?20:24,solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[],a=tools(root,solids,lamps),{box}=a;
 root.name=`residential-gallery-${floorNo}`;root.userData.floorNo=floorNo;
 box('residential-gallery-floor',0,-.1,1,2.6,.2,44,a.floor);box('residential-gallery-ceiling',0,2.88,1,2.6,.16,44,a.concrete);
 box('gallery-lift-lobby-floor',1.15,-.1,-22.2,4.9,.2,4.4,a.floor);box('gallery-lift-lobby-ceiling',1.15,2.88,-22.2,4.9,.16,4.4,a.concrete);
 for(const [lo,hi]of[[-20.1,19.75],[21.25,23]])box('',1.3,1.4,(lo+hi)/2,.18,2.8,hi-lo,a.wall,true);
 box('',1.3,2.64,20.5,.18,.32,1.5,a.wall);box('',3.6,1.4,-22.1,.18,2.8,4.6,a.wall,true);box('',2.45,1.4,-20.05,2.3,2.8,.18,a.wall,true);
 box('',-1.3,.44,1,.14,.88,44,a.concrete,true);
 for(const y of[.95,1.14])roundPipe(root,[-1.3,y,-21],[-1.3,y,23],.022,a.steel);
 for(let z=-20;z<=22;z+=5.5){box('',-1.3,1.4,z,.18,2.8,.22,a.concrete,true);box('',.15,2.74,z,.2,.12,1.05,a.steel);a.light(.15,2.6,z,z===2?.5:3.6);}
 const paint=galleryPaint();for(const [z,n]of[[-12,1],[4,2],[20.5,3]] as const){
  if(n!==3)galleryDoor(root,1.18,z,`${floorNo}0${n}`,paint,a.steel,a.dark);
 }
 // The same third-flat recess exists on every floor; only2803 is open.
 box('',2.75,-.1,20.5,3,.2,2.9,a.floor);box('',2.75,2.88,20.5,3,.16,2.9,a.concrete);
 for(const z of[19.05,21.95])box('',2.75,1.4,z,3,2.8,.15,a.wall,true);box('',4.25,1.4,20.5,.15,2.8,2.9,a.wall,true);
 if(area==='landing'){const leaf=box('2803-open-door',.583,1.22,21.14,1.45,2.44,.13,paint);leaf.rotation.y=1.42+Math.PI/2;solids.push({x:leaf.position.x,z:leaf.position.z,y:1.22,w:1.45,h:2.44,d:.13,yaw:leaf.rotation.y});}
 else{box('',1.3,1.15,20.5,.1,2.3,1.45,a.wall,true);galleryDoor(root,1.18,20.5,`${floorNo}03`,paint,a.steel,a.dark);}
 const dressing=dressCommonGallery(root,'landing',1.3,23);root.getObjectByName('gallery-service-notice')?.removeFromParent();
 const skyline=new T.Mesh(new T.PlaneGeometry(100,90),nightWindow());skyline.position.set(-28,-26,-2);skyline.rotation.y=Math.PI/2;root.add(skyline);
 for(const y of[-2.8,-5.6,2.8,5.6]){box('',0,y-.1,1,2.6,.2,44,a.concrete);box('',-1.3,y+.44,1,.14,.88,44,a.concrete);}
 const banks=[0,G.secondLiftX].map((x,index)=>{
  const group=new T.Group();group.name=`gallery-lift-${index?'B':'A'}`;root.add(group);
  // Piers leave two complete, independent openings in the bank wall.
  for(const dx of[-.7,.7])box('',x+dx,1.18,G.liftZ,.12,2.36,.18,a.steel,true);
  box('',x,2.57,G.liftZ,1.28,.62,.18,a.wall);box('',x,-.09,G.liftZ-1.35,2.04,.18,2.7,a.floor,false,group);
  box('',x,2.8,G.liftZ-1.35,2.04,.1,2.7,a.steel,false,group);box('',x,1.4,G.liftZ-2.7,2.04,2.8,.12,a.steel,true,group);
  for(const dx of[-1.02,1.02])box('',x+dx,1.4,G.liftZ-1.35,.12,2.8,2.7,a.steel,true,group);
  const left=box(`lift-${index?'B':'A'}-left`,x-.315,1.14,G.liftZ,.62,2.28,.06,a.steel),right=box(`lift-${index?'B':'A'}-right`,x+.315,1.14,G.liftZ,.62,2.28,.06,a.steel);
  left.userData.closedX=x-.315;right.userData.closedX=x+.315;
  const blocks=[{x:x-.315,y:1.14,z:G.liftZ,w:.62,h:2.28,d:.06},{x:x+.315,y:1.14,z:G.liftZ,w:.62,h:2.28,d:.06}];solids.push(...blocks);
  const display=a.display(x,2.54,G.liftZ+.115,index===0&&area==='transfer'?'정지':index===1?'—':`${floorNo}`);display.init();
  createApartmentPlaque(root,{text:`${index+1}호기`,width:.36,height:.16,position:[x,2.8,G.liftZ+.095]});a.light(x,2.5,G.liftZ-1.3,1.8);
  const call=box(index?'second-lift-call-panel':'mounted-lift-call-panel',x+.9,1.25,G.liftZ+.01,.18,.34,.07,a.steel);const lit=new T.MeshStandardMaterial({color:'#533b2c',emissive:'#c37641',emissiveIntensity:.04});box('',x+.9,1.27,G.liftZ+.055,.07,.08,.012,lit);
  return{group,left,right,blocks,display,call,lit};
 });
 // Fill the bank between the two frames, never across their apertures.
 box('',1.1,1.4,G.liftZ,.7,2.8,.18,a.wall,true);box('',-1.03,1.4,G.liftZ,.54,2.8,.18,a.wall,true);box('',3.25,1.4,G.liftZ,.7,2.8,.18,a.wall,true);
 const active=area==='transfer'?1:0,bank=banks[active],liftDoors={left:bank.left,right:bank.right,blocks:bank.blocks};
 if(area==='landing'||area==='transfer')targets.push({id:'call',label:`${active+1}호기 호출`,mesh:bank.call,point:bank.call.position.clone()});
 for(const dx of[-.99,.99])box('',dx,1.15,23, .62,2.3,.18,a.wall,true);box('',0,2.55,23,1.36,.5,.18,a.wall);
 const stair=buildStairDoor(root,solids,0,0,23.04,'gallery-stair-door');
 createApartmentPlaque(root,{text:'비상계단',code:`${floorNo}F`,width:1.04,height:.26,position:[0,2.55,22.94],rotationY:Math.PI});
 const vestibule=new T.Group();vestibule.name='gallery-stair-vestibule';root.add(vestibule);
 box('',0,-.1,24.6,4.2,.2,3.2,a.floor,false,vestibule);for(const x of[-2.1,2.1])box('',x,1.4,24.6,.16,2.8,3.2,a.wall,true,vestibule);box('',0,1.4,26.2,4.2,2.8,.16,a.wall,true,vestibule);
 if(area==='corridor')targets.push({id:'stairs',label:'비상계단 문 열기',mesh:stair.leaf,point:new T.Vector3(0,1.2,22.95)});
 const figure=preview?new T.Group():createGhost(root);figure.visible=false;
 let first=-1,last=-1;function updateStory(stage:Stage,time:number,_reduced:boolean,_story?:Story,occupants:Occupant[]=[]){
  if(first<0)first=time;const dt=last<0?0:Math.min(.1,Math.max(0,time-last));last=time;
  bank.lit.emissiveIntensity=['lift_wait','lift_enter','transfer_wait','transfer_enter'].includes(stage)?1:.04;
  const opening=area==='corridor'&&stage==='corridor_departure';
  const transfer=area==='transfer',closed=transfer&&time-first>1.1&&occupants[0]?.z<21.8;
  const breached=transfer&&time-first>(root.userData.pursuitWait??0)+3.1;const wanted=opening||transfer&&(!closed||breached)?1.55:0;setDoorAngle(stair.hinge,stair.block,T.MathUtils.damp(stair.hinge.rotation.y,wanted,5,dt),.55,0,occupants);
 }
 function reset(){first=last=-1;root.userData.pursuitWait=0;setDoorAngle(stair.hinge,stair.block,area==='transfer'?1.55:0,.55);}
 reset();
 return{solids,targets,lamps,shoes:new T.Group(),figure,phoneGlow:new T.PointLight(),radioLight:new T.PointLight(),bounds:{x:4.2,z:26.35,minX:-1.17},spawn:new T.Vector3(0,1.65,area==='landing'?20.5:area==='transfer'?22.2:-21.7),heading:area==='corridor'?Math.PI:0,heightAt:(_x:number,_z:number)=>0,liftDoors,setDisplay:(s:string)=>bank.display.update(s),fallingFigure:undefined,carDeparture:undefined,updateStory,reset};
}

export function buildResidentialLift(root:T.Group){
 const solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[],a=tools(root,solids,lamps),{box}=a;
 box('',0,-.1,0,2.2,.2,2.8,a.steel);box('',0,2.85,0,2.2,.1,2.8,a.steel);box('',0,1.4,1.4,2.2,2.8,.12,a.steel,true);for(const x of[-1.1,1.1])box('',x,1.4,0,.12,2.8,2.8,a.steel,true);
 const left=box('lift-door-left',-.315,1.14,-1.35,.62,2.28,.06,a.steel),right=box('lift-door-right',.315,1.14,-1.35,.62,2.28,.06,a.steel),blocks=[{x:-.315,y:1.14,z:-1.35,w:.62,h:2.28,d:.06},{x:.315,y:1.14,z:-1.35,w:.62,h:2.28,d:.06}];solids.push(...blocks);
 for(const x of[-.72,.72])box('',x,1.25,-1.35,.14,2.5,.2,a.steel,true);box('',0,2.52,-1.35,1.6,.2,.2,a.steel);
 const ledge=box('lift-offset-ledge',0,R.liftOffset/2,-1.47,1.4,R.liftOffset,.22,a.concrete,true),ledgeBlock=solids.at(-1)!;
 const galleryRoot=new T.Group();galleryRoot.position.set(0,R.liftOffset,-24.1);galleryRoot.rotation.y=Math.PI;root.add(galleryRoot);
 const gallery=buildResidentialGallery(galleryRoot,'corridor',true);galleryRoot.getObjectByName('gallery-lift-A')?.removeFromParent();gallery.lamps.forEach(l=>lamps.push(l));
 const groundRoot=new T.Group();groundRoot.position.z=-apartmentEscapeLayout.annex.z-1.35;root.add(groundRoot);
 const ground=buildGroundSupport(groundRoot,'annex',true);ground.figure.removeFromParent();groundRoot.getObjectByName('ground-lift-cab-B')?.removeFromParent();ground.lamps.forEach(l=>lamps.push(l));groundRoot.visible=false;
 const shaft=box('lift-shaft-darkness',0,1.4,-1.59,2.1,2.8,.025,a.dark);
 const panel=box('residential-lift-panel',.99,1.35,-.45,.04,.85,.24,a.steel);targets.push({id:'panel',label:'1층 누르기',mesh:panel,point:new T.Vector3(.92,1.3,-.45)},{id:'pry',label:'길게 눌러 문 벌리기',mesh:left,point:new T.Vector3(0,1.3,-1.18)});
 createApartmentPlaque(root,{text:'1',width:.12,height:.14,position:[.961,1.3,-.45],rotationY:-Math.PI/2});createApartmentPlaque(root,{text:'운행층 1–28',subtitle:'지하주차장: 1층 계단 이용',width:1.4,height:.24,position:[0,2,1.329],rotationY:Math.PI});
 a.light(0,2.6,0,3);const display=a.display(0,2.54,-1.235,'28');display.init();
 const climb=createLiftClimb(root),figure=createGhost(root);figure.visible=false;const bounds={x:.98,z:1.28};
 function updateStory(stage:Stage,_time:number,_reduced:boolean){const transfer=isTransferStage(stage),opened=['lift_exit','lift_climb','transfer_exit'].includes(stage);groundRoot.visible=transfer;galleryRoot.visible=!transfer;ledge.visible=!transfer;const ledgeIndex=solids.indexOf(ledgeBlock);if(transfer&&ledgeIndex>=0)solids.splice(ledgeIndex,1);else if(!transfer&&ledgeIndex<0)solids.push(ledgeBlock);shaft.visible=!opened;const fraction=T.MathUtils.clamp((-.315-left.position.x)/.64,0,1);gallery.liftDoors.left.position.x=-.315-fraction*.64;gallery.liftDoors.right.position.x=.315+fraction*.64;bounds.z=opened?3.3:1.28;climb.root.visible=stage==='lift_climb';}
 return{solids,targets,lamps,shoes:new T.Group(),figure,phoneGlow:new T.PointLight(),radioLight:new T.PointLight(),bounds,spawn:new T.Vector3(0,1.65,.7),heading:0,heightAt:(_x:number,_z:number)=>0,liftDoors:{left,right,blocks},setDisplay:display.update,fallingFigure:undefined,carDeparture:undefined,climb,updateStory,reset(){climb.reset();}};
}
