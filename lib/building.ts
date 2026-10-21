import {buildGarageStructure,garageMarking} from './garage-structure.ts';
import * as T from 'three';
import {buildCarDeparture,type CarDeparture} from './car-departure.ts';
import {createCRT,crtCable,createCrtSocket} from './crt-monitor.ts';
import {createSurveillance,type Surveillance} from './surveillance.ts';
import {tapeTimes,officePowerLoad,officeCanWatch,parkingDrained,parkingAlarmActive} from './story.ts';
import {connectionPassage,setDoorAngle,buildStairDoor} from './passage.ts';
import type {Occupant} from './collision.ts';
import {buildCourtyard} from './courtyard.ts';
import {buildExpansion} from './expansion-world.ts';
import type {Area,Action,Stage,Story} from './story';
import type {Bounds,Solid,Target} from './world';
import {sharePrintedTexture,surface,boxUV,softBox} from './materials.ts';
import {roundPipe,doorHardware,createSedan,sedanSolids} from './props.ts';
import {wetTexture} from './entry-props.ts';
import {nightWindow} from './japan.ts';
import {buildStoryRoom,buildResidentGallery} from './chapters.ts';
import {facilityChair} from './facility-props.ts';
import {storageMaterials,storageShelf} from './storage.ts';
import {galleryDoor,galleryPaint,dressCommonGallery} from './common-gallery.ts';
import {officeDesk,dressOffice} from './office-dressing.ts';
export {createGhost as makeFigure} from './ghost.ts';
import {createGhost as makeFigure} from './ghost.ts';

export const landing={halfWidth:1.3,halfLength:23,spawnZ:20.5,homeZ:20.5,homeX:1.3,liftZ:-22.75,boardZ:-23.25,fallTriggerZ:8,fallZ:1} as const;
export const buildingLayout={corridor:{x:3.5,z:20,spawnZ:18},lift:{x:1.1,z:1.45,spawnZ:.7},stairs:{x:2,z:6,flightX:1,run:4,spawnZ:3.8},office:{x:5.8,z:7.8,spawnZ:6.5},parking:{x:12,z:22,spawnZ:20,alarm:{x:-10.8,z:16},alarmApproach:{x:-10.8,z:16.5},car:{x:5,z:-18}}} as const;
export function buildBuilding(root:T.Group,area:Exclude<Area,'apartment'>){
  if(area==='courtyard')return {...buildCourtyard(root),carDeparture:undefined};
  if(area==='annex'||area==='archive'||area==='plant')return {...buildExpansion(root,area),carDeparture:undefined};
  if(area==='resident'||area==='aftermath')return {...buildStoryRoom(root,area),carDeparture:undefined};
  const solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[];
  const size=area==='landing'?{x:landing.halfWidth,z:landing.halfLength}:buildingLayout[area];
  const bx=size.x,bz=size.z,bounds:Bounds=area==='landing'?{x:4.2,z:25.45,minX:-1.17}:{x:bx-.13,z:bz-.13},ceiling=area==='parking'?2.7:2.8;
  const mat=(color:string,extra:object={})=>new T.MeshStandardMaterial({color,roughness:.85,...extra});
  const plaster=surface('decayWall','#b5b6a6'),concrete=surface('castConcrete','#a2a9a3'),floorMat=surface(area==='parking'?'wornConcrete':area==='office'?'woodFloor':'oldTile',area==='office'?'#a19b8b':'#b0b1a4',{roughness:.62}),metal=surface(area==='lift'?'paintedMetal':'steel','#878d8b',{metalness:.55,roughness:.48}),dark=mat('#141b1c'),rust=mat('#523b29'),wood=surface('wood','#807668'),paint=surface('decayWall','#a7b0a0',{roughness:.79}),white=mat('#a7ab94'),red=mat('#802b20'),wallMat=area==='parking'?concrete:area==='lift'?metal:plaster;
  const parkingLower=area==='parking'?surface('wall','#84968b',{roughness:.86}):paint;
  if(area==='lift'){metal.map?.dispose();metal.map=null;metal.metalnessMap=null;metal.metalness=.68;metal.normalScale.setScalar(.12);}
  if(area==='parking'){floorMat.normalScale.setScalar(.28);floorMat.roughness=.72;}
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false){const mesh=new T.Mesh(boxUV(softBox(w,h,d),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);if(solid)solids.push({x,z,w,d,y,h});return mesh;}
  function wall(x:number,z:number,w:number,d:number,y=ceiling/2,h=ceiling){const mesh=box(x,y,z,w,h,d,wallMat,true);box(x,y-h/2+.46,z,w+.012,.9,d+.012,area==='lift'?metal:parkingLower);return mesh;}
  function label(text:string,x:number,y:number,z:number,ry=0,w=1.1,h=.26,color='#c9ceaf',background='#25372f',lit=false,dynamic=false){
    let c=document.createElement('canvas');c.width=768;c.height=Math.round(768*h/w);let ctx=c.getContext('2d')!;const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;let shared=false;
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),lit?new T.MeshBasicMaterial({map:texture}):new T.MeshStandardMaterial({map:texture,roughness:.9}));mesh.position.set(x,y,z);mesh.rotation.y=ry;root.add(mesh);
    const update=(text:string)=>{
      if(shared){const width=c.width,height=c.height;texture.dispose();c=document.createElement('canvas');c.width=width;c.height=height;ctx=c.getContext('2d')!;texture.source=new T.Source(c);shared=false;}
      const lines=text.split('\n'),font=Math.min(lines.length===1?c.height*.56:c.height/(lines.length*1.55),700/Math.max(1,...lines.map(line=>[...line].length)));
      ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height);
      if(lines.length>1){
        // Small, fixed flecks give the paper a worn surface without another asset.
        ctx.fillStyle='#887b6112';for(let i=0;i<900;i++)ctx.fillRect((i*197)%c.width,(i*263)%c.height,2+(i%3),1+(i%2));
        ctx.strokeStyle='#665f4955';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(30,60);ctx.lineTo(c.width-30,60);ctx.moveTo(30,c.height-60);ctx.lineTo(c.width-30,c.height-60);ctx.stroke();
      }
      ctx.fillStyle=color;ctx.font=`${font}px "Apple SD Gothic Neo",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      lines.forEach((line,i)=>ctx.fillText(line,c.width/2,c.height/2+(i-(lines.length-1)/2)*font*1.35));texture.needsUpdate=true;
    };update(text);if(!dynamic){sharePrintedTexture(texture,['building-label-v1',text,color,background]);shared=true;}return {mesh,update};
  }
  function light(x:number,y:number,z:number,color='#a4b7a7',intensity=4,range=8){const l=new T.PointLight(color,intensity,range,2);l.position.set(x,y,z);l.userData.base=intensity;root.add(l);lamps.push(l);return l;}
  function fixture(x:number,z:number,on=true,y=ceiling-.08){box(x,y+.04,z,.14,.08,.9,metal);box(x,y,z,.22,.08,1.1,metal);box(x,y-.048,z,.09,.018,.92,mat('#bec5b0',{emissive:'#a0b09d',emissiveIntensity:on?.6:0}));if(on)light(x,y-.12,z);}
  function target(id:Action,text:string,mesh:T.Object3D,x:number,y:number,z:number){targets.push({id,label:text,mesh,point:new T.Vector3(x,y,z)});}
  function door(id:Action,text:string,x:number,z:number,y=0,w=1.05){const mesh=box(x,y+1.1,z,w,2.2,.09,paint);doorHardware(mesh,w);box(x-w/2-.055,y+1.13,z,.09,2.26,.18,metal);box(x+w/2+.055,y+1.13,z,.09,2.26,.18,metal);box(x,y+2.38,z,w+.2,.24,.18,metal);label(text,x,y+2.38,z+.094,0,Math.min(1.1,w+.14),.2);target(id,text,mesh,x,y+1.25,z+.2);return mesh;}
  function pipe(x:number,y:number,z:number,length:number,along:'x'|'z'='z',m:T.Material=rust){roundPipe(root,[x-(along==='x'?length/2:0),y,z-(along==='z'?length/2:0)],[x+(along==='x'?length/2:0),y,z+(along==='z'?length/2:0)],.0325,m);for(let n=-length/2+.5;n<length/2;n+=2.5){const px=x+(along==='x'?n:0),pz=z+(along==='z'?n:0);box(px,y,pz,.12,.1,.12,metal);roundPipe(root,[px,y,pz],[px,ceiling,pz],.009,metal);box(px,ceiling-.015,pz,.16,.03,.16,metal);}}
  function puddle(x:number,z:number,sx:number,sz:number){const m=new T.Mesh(new T.PlaneGeometry(2,2),mat('#7c8885',{map:wetTexture(false,Math.round((x+31)*17+z)),roughness:.07,metalness:.22,transparent:true,opacity:.42,depthWrite:false}));m.rotation.x=-Math.PI/2;m.scale.set(sx,sz,1);m.position.set(x,.018,z);root.add(m);return m;}
  let unitPaint:T.MeshStandardMaterial|undefined;
  function unit(x:number,z:number,no:string){return galleryDoor(root,x+Math.sign(x)*.03,z,no,unitPaint??=galleryPaint(),metal,dark);}
  // Openings use separate piers and lintels. No wall is left behind the sliding leaves.
  function portal(z:number,half=.66){const w=bx-half;wall(-(bx+half)/2,z,w,.18);wall((bx+half)/2,z,w,.18);box(0,2.56,z,half*2,.48,.18,wallMat);}
  const spawn=new T.Vector3(0,1.65,('spawnZ' in size?size.spawnZ:landing.spawnZ));const heading=0;let heightAt:((x:number,z:number)=>number)=()=>0;
  let liftDoors:{left:T.Mesh;right:T.Mesh;blocks:Solid[]}|undefined,setDisplay:((text:string)=>void)|undefined,fallingFigure:T.Group|undefined;
  let reset=()=>{};let carDeparture:CarDeparture|undefined;
  let updateStory:((stage:Stage,time:number,reduced:boolean,story?:Story,occupants?:Occupant[])=>void)|undefined;
  const figure=makeFigure(root),shoes=new T.Group(),phoneGlow=new T.PointLight(),radioLight=new T.PointLight();
  if(area!=='stairs'){
    box(0,-.1,0,bx*2,.2,bz*2,floorMat);box(0,ceiling+.08,0,bx*2,.16,bz*2,area==='lift'?metal:concrete);
    if(area!=='landing'){wall(-bx,0,.18,bz*2);wall(bx,0,.18,bz*2);}else{
      // The 2803 opening is cut out of the right-hand wall; the pursuer walks through it.
      const lo=landing.homeZ-.75,hi=landing.homeZ+.75;
      wall(bx,(-bz+lo)/2,.18,lo+bz);wall(bx,(hi+bz)/2,.18,bz-hi);
      box(bx,2.65,landing.homeZ,.18,.3,1.5,plaster);
      box(2.7,-.09,landing.homeZ,3,.18,2.9,floorMat);box(2.7,2.88,landing.homeZ,3,.16,2.9,plaster);
      for(const z of [landing.homeZ-1.45,landing.homeZ+1.45])wall(2.75,z,3,.15);
      wall(4.25,landing.homeZ,.15,2.9);
      const leaf=box(1.3-Math.sin(1.42)*.725,1.22,landing.homeZ+.75-Math.cos(1.42)*.725,1.45,2.44,.13,paint);
      leaf.rotation.y=1.42+Math.PI/2;leaf.name='2803-open-door';
      solids.push({x:leaf.position.x,z:leaf.position.z,w:1.45,d:.13,y:1.22,h:2.44,yaw:leaf.rotation.y});
      const inset=new T.Mesh(new T.BoxGeometry(1.2,1.7,.045),mat('#394740'));inset.position.z=-.083;leaf.add(inset);
      const handle=new T.Mesh(new T.BoxGeometry(.18,.055,.15),metal);handle.position.set(.495,-.2,-.17);leaf.add(handle);
      for(const z of [landing.homeZ-.81,landing.homeZ+.81])box(1.24,1.25,z,.16,2.5,.1,metal);
      label('2803',1.188,2.05,landing.homeZ+1,-Math.PI/2,.34,.14);
      box(2.95,.65,landing.homeZ+1.12,1.3,1.3,.5,wood,true);light(2.2,2.3,landing.homeZ,'#6c8c8a',.8,3);
    }if(area==='corridor'||area==='parking'||area==='office')portal(bz);else wall(0,bz,bx*2,.18);
    if(area==='lift'||area==='landing'||area==='office'||area==='corridor')portal(-bz);else if(area==='parking'){wall(-4.475,-bz,15.05,.18);wall(10.275,-bz,3.45,.18);box(5.8,2.75,-bz,5.5,.1,.18,wallMat);}else wall(0,-bz,bx*2,.18);
    if(area!=='parking')for(let z=-bz+2;z<bz;z+=5){box(0,ceiling-.08,z,bx*2,.15,.25,area==='lift'?metal:concrete);pipe(bx-.21,ceiling-.18,z,4.9);}
  }
  if(area==='landing'||area==='lift'){
    const dz=area==='landing'?landing.liftZ:-1.35;
    const left=box(-.315,1.14,dz,.62,2.28,.06,metal),right=box(.315,1.14,dz,.62,2.28,.06,metal);left.name='lift-door-left';right.name='lift-door-right';const blocks:Solid[]=[{x:-.315,z:dz,w:.62,d:.06,y:1.14,h:2.28},{x:.315,z:dz,w:.62,d:.06,y:1.14,h:2.28}];solids.push(...blocks);liftDoors={left,right,blocks};
    for(const x of [-.7,.7])box(x,1.18,dz,.12,2.36,.16,dark);box(0,2.38,dz,1.52,.12,.16,metal);
    box(0,2.54,-bz+.107,.44,.22,.034,dark);
    const display=label('28',0,2.54,-bz+.127,0,.36,.15,'#cb6f3e','#111510',true,true);setDisplay=display.update;
    box(0,.012,dz,1.35,.023,.22,metal);
    for(const x of [-.3,-.1,.1,.3])box(x,.026,dz,.012,.006,.22,dark);
    if(area==='landing'){
      const call=box(.95,1.25,-22.874,.18,.34,.07,metal);call.name='mounted-lift-call-panel';
      const callLight=mat('#b8864b',{emissive:'#eab471',emissiveIntensity:.25,roughness:.4});
      const button=new T.Mesh(new T.CylinderGeometry(.052,.052,.014,24),callLight);button.name='landing-call-button';button.rotation.x=Math.PI/2;button.position.set(.95,1.25,-22.826);root.add(button);
      label('▽',.95,1.25,-22.815,0,.075,.08,'#231e16');target('call','승강기 호출 버튼 누르기',call,.95,1.25,dz+.2);
      updateStory=stage=>{callLight.emissiveIntensity=stage==='lift_call'?.25:1.5;};
      label('28층',-.9,2.65,-bz+.094,0,.25,.17);
      // A complete cab behind the threshold is visible while the doors open.
      box(0,-.09,dz-1.45,2.18,.18,2.7,floorMat);box(0,2.8,dz-1.45,2.2,.1,2.7,metal);
      box(0,1.4,dz-2.8,2.2,2.8,.12,metal,true);for(const x of [-1.1,1.1])box(x,1.4,dz-1.45,.12,2.8,2.7,metal,true);
      box(0,1.02,dz-2.65,1.8,.05,.06,metal);for(const x of [-.7,.7])box(x,1.02,dz-2.71,.04,.04,.12,metal);light(0,2.5,dz-1.4,'#b4b6a0',4,4);
      box(-bx,.44,0,.13,.88,bz*2,concrete,true).name='landing-parapet';
      for(const y of [.93,1.13])roundPipe(root,[-bx,y,-bz],[-bx,y,bz],.021,rust);
      for(let z=-bz+.1;z<bz;z+=.75)roundPipe(root,[-bx,.91,z],[-bx,1.15,z],.0125,rust);
      box(-bx+.12,.005,0,.15,.015,bz*2,dark);
      unit(bx-.12,-12,'2801');unit(bx-.12,4,'2802');const lastUnit=unit(bx-.12,0,'2804');lastUnit.position.set(0,0,bz-.091);lastUnit.rotation.y=Math.PI;
      for(let z=-20;z<=21;z+=5.5){box(-bx,1.4,z,.17,2.8,.22,concrete,true);fixture(.25,z,z!==2);}
      const gallery=dressCommonGallery(root,'landing',bx,bz);target('gallery_notice','시설 방문 안내문',gallery.notice,gallery.point.x,gallery.point.y,gallery.point.z);
      for(const z of [-14,2,13])puddle(-.85,z,.3,1.6);
      for(let y=-3;y>-83;y-=3){box(0,y-.1,0,bx*2,.2,bz*2,concrete);box(-bx,y+.44,0,.13,.88,bz*2,concrete);}
      for(const y of [3,6]){box(0,y+2.8,0,bx*2,.16,bz*2,concrete);box(-bx,y+.44,0,.13,.88,bz*2,concrete);}
      const skyline=new T.Mesh(new T.PlaneGeometry(100,90),nightWindow());skyline.position.set(-28,-26,-2);skyline.rotation.y=Math.PI/2;root.add(skyline);
      label('백로아파트 · 1994년 준공',0,2.5,bz-.11,Math.PI,1.45,.2);
    }else{
      const shaft=box(0,1.35,-1.57,2.1,2.7,.025,mat('#030505'));shaft.name='lift-shaft-darkness';
      let regularPreview:T.Object3D[]=[],servicePreview:T.Object3D[]=[];
      updateStory=stage=>{const service=stage==='service_ride'||stage==='service_open';shaft.visible=stage==='descent'||stage==='service_ride';bounds.z=stage==='service_open'||stage==='lift_exit'?3.8:bz-.13;for(const mesh of regularPreview)mesh.visible=!service;for(const mesh of servicePreview)mesh.visible=service;};
      fixture(0,.1,true);for(const x of [-.98,.98]){roundPipe(root,[x,1,-1.1],[x,1,1.1],.022,metal);for(const z of [-.8,.8])roundPipe(root,[x,1,z],[Math.sign(x)*1.04,1,z],.013,metal);}
      const panel=box(.99,1.35,-.45,.035,.85,.24,metal);label('1',.966,1.3,-.45,-Math.PI/2,.15,.12,'#d7ad65');target('panel','1층 누르기',panel,.92,1.3,-.45);
      for(let i=0;i<6;i++){const button=new T.Mesh(new T.CylinderGeometry(.019,.019,.018,20),white);button.rotation.z=Math.PI/2;button.position.set(.962,1.45+i*.065,-.42);root.add(button);}
      target('pry','길게 눌러 문 벌리기',left,0,1.3,dz+.22);
      label('정원 9명 · 600kg',0,2,bz-.11,Math.PI,.85,.17);label('승강기 검사 유효기간 경과',0,1.75,bz-.11,Math.PI,.95,.14,'#877954','#c2b790');
      // The elevator opens onto the actual type of landing for this floor.
      const previewStart=root.children.length;
      const upperFloor=box(0,-.1,dz-8,7,.2,16,floorMat);boxUV(upperFloor.geometry,0,-.1,dz-8+21.35);box(0,2.88,dz-2,7,.16,4,concrete);
      box(0,1.4,dz-12,3.8,2.8,12,plaster);box(0,2.88,dz-7,7,.16,14,concrete);for(const x of [-3.5,3.5])box(x,1.4,dz-7,.18,2.8,14,plaster);
      unit(-3.38,12-21.35,'2404');unit(3.38,12-21.35,'2401');
      for(const x of [-2.65,2.65])fixture(x,16-21.35,true);
      const signZ=17-21.35;box(0,2.4,signZ-.02,1.58,.27,.05,metal);for(const x of [-.55,.55])box(x,2.67,signZ-.02,.013,.27,.013,metal);label('복도 끝 비상계단',0,2.4,signZ+.012,0,1.5,.2);light(0,2.5,signZ,'#738877',3);
      regularPreview=root.children.slice(previewStart);regularPreview.forEach((mesh,i)=>{mesh.name=`lift-preview-24-${i}`;});
      const serviceStart=root.children.length,annexFloor=surface('oldTile','#aaa897',{roughness:.63}),annexWall=surface('decayWall','#b2b09b'),lower=surface('wall','#4b6054');
      const groundFloor=box(0,-.12,dz-8,4,.24,16,annexFloor);boxUV(groundFloor.geometry,0,-.12,dz-8+35.35);box(0,2.91,dz-8,4,.22,16,annexWall);
      for(const x of [-2,2])for(const [a,b] of [[28,34],[17,25]]){const z=(a+b)/2-35.35;box(x,1.4,z,.15,2.8,b-a,annexWall);box(x,.43,z,.165,.86,b-a,lower);}
      for(const z of [dz-4,dz-16]){box(0,2.69,z,.19,.1,1.12,metal);box(0,2.635,z,.1,.013,.95,white);}
      servicePreview=root.children.slice(serviceStart);servicePreview.forEach((mesh,i)=>{mesh.name=`lift-preview-1-${i}`;mesh.visible=false;});
      light(0,2.5,dz-4,'#a4b6a3',2.8);
    }
  }
  if(area==='corridor'){
    const stairLeaf=door('stairs','비상계단',0,-bz+.12);
    const stairHinge=new T.Group();stairHinge.name='corridor-stair-door';stairHinge.position.set(-.525,0,-bz+.12);root.add(stairHinge);stairHinge.attach(stairLeaf);
    const stairBlock={x:0,z:-bz+.12,w:1.05,d:.12,y:1.1,h:2.2};solids.push(stairBlock);bounds.z=26.2;bounds.x=4.3;
    connectionPassage(root,solids,lamps,0,-bz);
    let stairAt=-1;reset=()=>{stairAt=-1;};updateStory=(stage,time,_reduced,_story,occupants)=>{if(stage==='corridor_departure'&&stairAt<0)stairAt=time;if(stairAt>=0)setDoorAngle(stairHinge,stairBlock,1.5*T.MathUtils.smoothstep(time-stairAt,0,.75),.525,0,occupants);};
    label('24층 · 연결 복도',0,2.57,bz-.094,Math.PI,1.5,.22);
    for(const z of [-8,8]){box(0,1.4,z,3.8,2.8,12,plaster,true);for(const x of [-1.94,1.94]){label(z<0?'공동 배관실':'전기 설비실',Math.sign(x)*1.904,2,z,x<0?-Math.PI/2:Math.PI/2,.85,.18);box(x,1.02,z,.045,1.66,.79,metal);for(let i=0;i<7;i++)box(x+Math.sign(x)*.026,.54+i*.052,z,.012,.014,.55,dark);roundPipe(root,[x,2.36,z-5.8],[x,2.36,z+5.8],.017,metal);}}
    unit(-bx+.12,12,'2404');unit(-bx+.12,-12,'2403');unit(bx-.12,12,'2401');unit(bx-.12,-12,'2402');
    const gallery=dressCommonGallery(root,'corridor',bx,bz);target('core_notice','공용부 설비 점검표',gallery.notice,gallery.point.x,gallery.point.y,gallery.point.z);
    for(const x of [-2.65,2.65])for(const z of [-16,-5,5,16])fixture(x,z,z!==5);
    for(const z of [-17,0,17]){box(0,2.4,z-.02,1.58,.27,.05,metal);for(const x of [-.55,.55])box(x,2.67,z-.02,.013,.27,.013,metal);label('복도 끝 비상계단',0,2.4,z+.012,0,1.5,.2);light(0,2.5,z,'#738877',3);}
    for(const x of [-2.65,2.65])for(let z=-18;z<19;z+=3)box(x,.015,z,.06,.02,.55,mat('#92a68a',{emissive:'#455c3d',emissiveIntensity:.2}));
    box(-3.17,.38,2,.42,.76,.62,wood,true);box(3.18,.5,-3,.35,1,.6,metal,true);puddle(-2.6,-8,.3,2);
    // The cab remains physically behind the player after crossing the open lift sill.
    box(0,-.1,bz+1.35,2.2,.2,2.7,floorMat);box(0,1.4,bz+2.7,2.2,2.8,.12,metal,true);
    for(const x of [-1.1,1.1])box(x,1.4,bz+1.35,.12,2.8,2.7,metal,true);
    for(const x of [-.78,.78])box(x,2.81,bz+1.35,.64,.08,2.7,metal);
    box(0,2.81,bz+2.25,.9,.08,.9,metal);box(0,2.81,bz+.18,.9,.08,.36,metal);
    const hatch=box(.46,2.95,bz+.8,.85,.04,1.2,metal);hatch.rotation.z=-.72;hatch.name='lift-ceiling-hatch';
    box(0,3.4,bz+1.0,1.05,.08,1.5,dark);light(0,2.2,bz+1.2,'#899b9b',1.8,4);
    for(const x of [-.7,.7])box(x,1.18,bz,.12,2.36,.16,dark);
    box(0,.012,bz,1.35,.023,.22,metal);
  }
  if(area==='stairs'){
    const roomStart=new Set(root.children),solidStart=solids.length;
    heightAt=(x,z)=>{const second=z<-11.85,lx=second?x-4:x,lz=second?z+17.85:z;return (second?-2.8:0)+(lz>=0?0:(lx<0?1:-1)*Math.min(2.8,-lz*2.8/4));};
    box(0,-.15,3,4,.3,6,floorMat);box(-1,2.65,-5,2,.3,2,floorMat).name='stairs-upper-landing';box(1,-2.95,-5,2,.3,2,floorMat);
    wall(-2,0,.18,12,1.4,9);wall(2,0,.18,12,1.4,9);wall(-1.81,-6,.38,.18,1.4,9);wall(0,-6,.76,.18,1.4,9);wall(1.81,-6,.38,.18,1.4,9);box(-1,-.15,-6,1.24,5.9,.18,wallMat).name='stairs-upper-foundation';box(-1,5.52,-6,1.24,.76,.18,wallMat).name='stairs-upper-header';box(1,2.65,-6,1.24,6.5,.18,wallMat);box(1,-2.95,-6,1.24,.3,.18,wallMat);wall(-1.34,6,1.32,.18,1.4,9);wall(1.34,6,1.32,.18,1.4,9);box(0,4.1,6,1.36,3.6,.18,wallMat);box(0,-1.5,6,1.36,3,.18,wallMat);
    wall(0,-3,.12,6,1.4,9);
    box(0,6,0,4,.2,12,concrete);
    for(let i=0;i<17;i++)for(const side of [-1,1]){const z=-(i+.5)*4/17,y=-side*(i+.5)*2.8/17;box(side,y-.082,z,1.82,.164,4/17,floorMat);box(side,y+.005,z-.09,1.72,.01,.025,metal);roundPipe(root,[side*.16,y,z],[side*.16,y+.9,z],.0125,rust);}
    // Continuous sloped handrails over the open newel side.
    for(const side of [-1,1]){roundPipe(root,[side*.16,.92,0],[side*.16,.92-side*2.8,-4],.023,rust);}
    bounds.z=29.75;bounds.x=6.3;
    const {hinge,leaf,block:closed}=buildStairDoor(root,solids,-1,2.8,-5.85,'stairs-first-upper-door');leaf.name='stairs-upper-leaf';
    const firstUpperLabel=label('연결 복도',-1,5.26,-5.906,0,.9,.18);target('up','방화문 열기',leaf,-1,4.05,-5.65);
    const {hinge:lowerHinge,leaf:lowerLeaf,block:lowerClosed}=buildStairDoor(root,solids,1,-2.8,-5.85,'stairs-loop-door');
    const lowerLabel=label('아래층',1,-.32,-5.906,0,.9,.18);lowerLabel.mesh.name='stairs-lower-direction';target('down','아래층 방화문 열기',lowerLeaf,1,-1.55,-5.65);
    box(1.25,1.65,5.907,.325,.455,.002,mat('#a59b83'));
    const note=label('백로아파트 · 시설 연락 메모\n\n같은 층으로 돌아왔다면\n계단 표지 아래를 확인하세요.\n\n17층 외벽 공사 / 임시 관리실 1703호\n야간 당직 한서연 · 내선 17\n부재 시 1704호로 연락 바랍니다.\n\n28 가 0317   /   03:17\n03:17   03:17   03:17\n\n그때 멈췄어야지.',1.25,1.65,5.904,Math.PI,.297,.42,'#34392e','#c6bfa6');note.mesh.name='stairs-clue-panel';
    for(const x of [1.14,1.36])box(x,1.865,5.903,.026,.02,.014,metal);
    target('stair_note','계단 점검 메모 읽기',note.mesh,1.25,1.65,5.7);
    const floorLabel=label('23층',-1.89,2,3,Math.PI/2,.9,.55,undefined,undefined,false,true);label('↓ 아래층',1.906,1.35,3,-Math.PI/2,.65,.2);
    light(0,3.2,3,'#8f9c83',5);light(-1,5.3,-4.8,'#b0a17b',3);light(1,-.3,-4.8,'#769789',3);
    // A physically connected second well makes the repeated floor believable
    // even when the player looks back. Neither actor changes coordinate space.
    const offset=new T.Vector3(4,-2.8,-17.85),repeated=new T.Group();repeated.name='repeated-stair-well';repeated.position.copy(offset);root.add(repeated);
    for(const part of root.children.filter(o=>o!==repeated&&!roomStart.has(o)))repeated.add(part.clone(true));
    // The shared gallery owns these finishes; duplicate coplanar meshes would
    // flicker or expose a different texture phase when the scene changes.
    for(const name of ['stairs-upper-landing','stairs-upper-header'])repeated.getObjectByName(name)!.removeFromParent();
    const foundation=repeated.getObjectByName('stairs-upper-foundation')!;foundation.position.y-=.01;foundation.scale.y*=5.88/5.9;
    const repeatSolids=solids.slice(solidStart).map(s=>({...s,x:s.x+4,y:(s.y??1.5)-2.8,z:s.z-17.85}));
    const repeatClosed=repeatSolids[solids.indexOf(closed)-solidStart];solids.push(...repeatSolids);
    const repeatHinge=repeated.getObjectByName('stairs-first-upper-door')!;repeatHinge.name='stairs-passage-door';repeated.getObjectByName('stairs-loop-door')!.name='stairs-repeat-lower-door';
    for(const id of ['up','stair_note'] as const){const t=targets.find(t=>t.id===id)!;t.point.add(offset);t.mesh=repeated.getObjectByName(id==='up'?'stairs-upper-leaf':'stairs-clue-panel')!;}
    // These two decorative exits have no receiving corridor. Mark them only
    // after cloning so the real lower and repeated upper route stay unobstructed.
    firstUpperLabel.mesh.visible=false;repeated.getObjectByName('stairs-lower-direction')!.visible=false;
    function closedExit(x:number,y:number,z:number,text:string,name:string){
      for(const offset of [.75,1.35,1.95]){const brace=box(x,y+offset,z+.09,1.27,.12,.045,wood);brace.rotation.z=.12;brace.name='stairs-construction-brace';}
      const notice=label(text,x,y+1.5,z+.126,0,.84,.37,'#080908','#b3a88b');notice.mesh.name=name;
      const paper=notice.mesh.material as T.MeshStandardMaterial;(notice.mesh as T.Mesh).material=new T.MeshLambertMaterial({map:paper.map});paper.dispose();
    }
    closedExit(-1,2.8,-5.85,'외벽 공사로 폐쇄\n아래층 계단 이용 ↓','stairs-upper-closure-notice');
    closedExit(5,-5.6,-23.7,'하부층 침수로 폐쇄\n위층 연결 복도 이용 ↑','stairs-lower-closure-notice');
    repeated.traverse(o=>{if(o instanceof T.PointLight)lamps.push(o);});
    connectionPassage(root,solids,lamps,-3,12);connectionPassage(root,solids,lamps,1,-5.85,-2.8);
    const galleryRoot=new T.Group();galleryRoot.position.set(3,0,-35.5);root.add(galleryRoot);
    const gallery=buildResidentGallery(galleryRoot,false);lamps.push(...gallery.lamps);
    solids.push(...gallery.solids.map(s=>({...s,x:s.x+3,y:s.y??1.5,z:s.z-35.5})));
    let opened=-1,lowerOpened=-1,updated=-1,shown='23층';reset=()=>{opened=lowerOpened=updated=-1;shown='';setDoorAngle(repeatHinge,repeatClosed,0,.55);setDoorAngle(lowerHinge,lowerClosed,0,.55);};updateStory=(stage,time,_reduced,_story,occupants)=>{
      const dt=updated<0?0:Math.max(0,time-updated);updated=time;
      const text=stage==='stairs_reverse'||stage==='stairs_passage'?'17층':'23층';if(text!==shown){floorLabel.update(text);shown=text;}
      if(stage==='stairs_passage'&&opened<0)opened=time;
      if(opened>=0){const player=occupants?.[0],cleared=player&&player.z<-25.35&&Math.abs(player.x-3)<1.1,angle=cleared?0:1.55*T.MathUtils.smoothstep(time-opened,0,.85);setDoorAngle(repeatHinge,repeatClosed,T.MathUtils.damp(repeatHinge.rotation.y,angle,7,dt),.55,0,occupants);}
      if(['stairs_descent','stairs_clue','stairs_reverse','stairs_passage'].includes(stage)&&lowerOpened<0)lowerOpened=time;
      if(lowerOpened>=0)setDoorAngle(lowerHinge,lowerClosed,1.55*T.MathUtils.smoothstep(time-lowerOpened,0,.85),.55,0,occupants);
    };
  }
  if(area==='office'){
    connectionPassage(root,solids,lamps,-3,bz+6,0,.9);bounds.z=bz+6.2;
    for(const x of [-.95,.95]){wall(x,-4.9,.13,5.5);wall(x,3.8,.13,1.8);}
    wall(-4,-1.6,3.4,.13);wall(4,-1.6,3.4,.13);
    const desk=officeDesk(root);solids.push({x:-3,z:1.5,w:2.5,d:.95,y:.4,h:.8});
    box(-3.7,.809,1.58,.42,.018,.31,white);
    const log=label('백로아파트 · 사고 다음 날 06:40 인계\n\n작성: 박정호 / 전임 야간 당직: 한서연\n03:17  정문 횡단보도 보행자 사망 / 검은 차량 이탈\n03:26  파손 차량 입차 / 정차 직후 영상 9초 누락\n누락 구간은 지하 기록보관실 원본과 대조할 것.\n\n감시 설비 정전 시: 서고 예비 퓨즈 사용\n비상 공급 6A / 구역등 4A · CCTV 2A · 승강기 제어 4A\n퓨즈를 홀더에 설치하고 필요한 부하만 선택 후 전원 투입\n승강기 C 4A / CCTV 열람은 B 2A 선택 연결\n승강기 열쇠 보관: CCTV 오른쪽 책상',-3.7,.8182,1.58,0,.4,.28,'#292b27','#c6bfa6');log.mesh.rotation.x=-Math.PI/2;log.mesh.name='office-duty-log';target('record','야간 근무일지 읽기',desk,-3.7,.86,1.8);
    const crt=createCRT();crt.root.name='office-crt-monitor';crt.root.position.set(-2.65,.8,1.76);root.add(crt.root);
    const screen=createSurveillance('office');crt.screenMount.add(screen);const surveillance=screen.userData.surveillance as Surveillance;target('monitor','선택한 CCTV 기록 재생',crt.root,-2.65,1.137,1.80);
    const socket=createCrtSocket();socket.root.position.set(-bx+.09,.27,1.05);socket.root.rotation.y=Math.PI/2;root.add(socket.root);root.updateMatrixWorld(true);
    const power=crt.powerPort.clone().applyMatrix4(crt.root.matrixWorld),lead=socket.lead.clone().applyMatrix4(socket.root.matrixWorld);
    crtCable(root,[power,new T.Vector3(power.x,.85,1),new T.Vector3(power.x,.0035,1),new T.Vector3(lead.x,.0035,lead.z),lead]);
    const dial=box(-1.95,.8375,1.68,.2,.075,.18,metal);const selector=new T.Mesh(new T.CylinderGeometry(.048,.05,.025,24),dark);selector.position.set(-1.95,.8875,1.63);root.add(selector);box(-1.95,.901,1.608,.005,.002,.022,white);target('tape_next','CCTV 시간 선택',dial,-1.95,.9,1.8);const dialLabel=label('시간 선택',-1.95,.877,1.74,0,.18,.08,'#292b27','#bcb79b');dialLabel.mesh.rotation.x=-Math.PI/2;
    const exitKey=new T.Group();exitKey.name='office-exit-key';root.add(exitKey);
    const keyRing=new T.Mesh(new T.TorusGeometry(.035,.006,6,14),metal);keyRing.rotation.x=-Math.PI/2;keyRing.position.set(-2.13,.807,1.16);exitKey.add(keyRing);
    const keyStem=box(-2.13,.806,1.24,.023,.012,.1,metal);exitKey.attach(keyStem);const keyTooth=box(-2.105,.806,1.28,.07,.012,.025,metal);exitKey.attach(keyTooth);target('service_key','관리용 승강기 열쇠 챙기기',exitKey,-2.13,.82,1.28);
    function fuseCartridge(name:string,x:number,y:number,z:number,horizontal=false){
      const group=new T.Group();group.name=name;group.position.set(x,y,z);if(horizontal)group.rotation.z=Math.PI/2;root.add(group);
      const body=new T.Mesh(new T.CylinderGeometry(.0055,.0055,.032,16),white);group.add(body);
      for(const y of [-.016,.016]){const cap=new T.Mesh(new T.CylinderGeometry(.0065,.0065,.004,16),metal);cap.position.y=y;group.add(cap);}
      group.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=o.receiveShadow=true;});return group;
    }
    box(-2.1,.58,-5.7,.8,1.16,.5,wood,true);box(-2.1,1.161,-5.7,.08,.002,.055,white);
    const fuse=fuseCartridge('office-fuse-pickup',-2.1,1.1685,-5.7,true);target('fuse','예비 제어 퓨즈 챙기기',fuse,-2.1,1.17,-5.7);fuse.userData.approach={x:-2.1,z:-4.95};
    const records=storageMaterials();for(const x of [-4.8,-3.6]){const shelf=storageShelf(3.1,.64,metal,records,Math.round(-x*10));shelf.rotation.y=Math.PI/2;shelf.position.set(x,0,-4.4);root.add(shelf);solids.push({x,z:-4.4,w:.64,d:3.1,y:1.1,h:2.2});}
    label('예비 퓨즈',-2.1,.91,-5.442,0,.65,.17,'#473e2d','#b2ab8b');
    const cabinet=surface('paintedMetal','#8e9990',{roughness:.7,normalScale:new T.Vector2(.12,.12)});
    cabinet.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;','diffuseColor *= mix(vec4(1.0), sampledDiffuseColor, .16);'));};cabinet.customProgramCacheKey=()=> 'office-enamel-v77';
    const caseMesh=box(5.61,1.4,-4,.2,1.55,1.8,cabinet,true);caseMesh.name='office-backup-panel';
    label('비상전원 6A · 필요한 부하만 선택',5.5097,2.05,-4,-Math.PI/2,1.58,.18);
    for(const z of [-4.65,-3.35])box(5.674,2.48,z,.055,.64,.055,metal);
    const branches:{id:Action;handle:T.Mesh;lamp:T.MeshStandardMaterial}[]=[];
    for(const [i,id] of (['circuit_a','circuit_b','circuit_c'] as const).entries()){
      const z=-4.55+i*.55;box(5.49,1.45,z,.04,.27,.19,dark);const axle=roundPipe(root,[5.435,1.45,z],[5.52,1.45,z],.014,metal);axle.name='office-lever-axle-'+id.at(-1);solids.push({x:5.46,z,w:.14,d:.19,y:1.45,h:.30});
      const handle=box(5.445,1.45,z,.035,.14,.07,white);handle.name='office-branch-'+id.at(-1);handle.rotation.z=.55;
      label(['A 구역등 4A','B CCTV 2A','C 승강기 4A'][i],5.5097,1.85,z,-Math.PI/2,.48,.16);
      const lamp=new T.MeshStandardMaterial({color:'#333c31',emissive:'#b89447',emissiveIntensity:0});box(5.492,1.69,z,.025,.035,.06,lamp);
      target(id,['구역 조명 회로 · 4A','CCTV 기록장치 · 2A','승강기 제어 회로 · 4A'][i],handle,5.34,1.45,z);targets.at(-1)!.precise=true;handle.userData.approach={x:4.55,z};branches.push({id,handle,lamp});
    }
    const holder=box(5.49,1.02,-4.55,.04,.15,.17,dark);holder.name='office-fuse-holder';
    for(const y of [.997,1.043])box(5.475,y,-4.55,.05,.012,.045,metal);
    const installedFuse=fuseCartridge('office-fuse-installed',5.45,1.02,-4.55);installedFuse.visible=false;solids.push({x:5.465,z:-4.55,w:.07,d:.17,y:1.02,h:.15});
    label('퓨즈 홀더',5.5097,1.21,-4.55,-Math.PI/2,.38,.12);target('office_install','가져온 퓨즈 설치',holder,5.39,1.02,-4.55);targets.at(-1)!.precise=true;holder.userData.approach={x:4.55,z:-4.55};
    box(5.49,.95,-3.45,.04,.19,.19,dark);
    const relayMount=box(5.475,.95,-3.45,.035,.04,.04,metal);relayMount.name='office-relay-mount';solids.push({x:5.46,z:-3.45,w:.08,d:.19,y:.95,h:.19});
    const mainRelay=new T.Mesh(new T.CylinderGeometry(.04,.04,.035,24),red);mainRelay.rotation.z=Math.PI/2;mainRelay.position.set(5.445,.95,-3.45);mainRelay.name='office-main-relay';root.add(mainRelay);
    target('security_power','선택한 회로에 비상전원 투입',mainRelay,5.415,.95,-3.45);targets.at(-1)!.precise=true;mainRelay.userData.approach={x:4.55,z:-3.45};
    label('전원 투입',5.5097,1.15,-3.45,-Math.PI/2,.4,.12);
    const loadDisplay=label('퓨즈 없음',5.5097,.76,-4,-Math.PI/2,1.15,.15,undefined,undefined,false,true);let powerCaption='';
    label('서고',-3,2.3,-1.531,0,.65,.2);label('배전반',3,2.3,-1.531,0,.8,.2);
    box(3.8,.75,3.8,2.1,.1,1.25,wood,true);for(const x of [2.9,4.7])for(const z of [3.3,4.3])box(x,.35,z,.07,.7,.07,metal);box(3.8,.48,3.3,1.9,.4,.05,wood);
    dressOffice(root);solids.push({x:5.4,z:4.3,w:.66,d:3.3,y:.435,h:.87});
    const dutyChair=facilityChair(wood,metal);dutyChair.position.set(-2.7,0,.45);root.add(dutyChair);solids.push({x:-2.7,z:.45,w:.5,d:.5,y:.44,h:.88});
    const breakChair=facilityChair(wood,metal);breakChair.position.set(3.8,0,2.65);breakChair.rotation.y=Math.PI;root.add(breakChair);solids.push({x:3.8,z:2.65,w:.5,d:.5,y:.44,h:.88});
    box(3.8,.801,3.8,.55,.002,.34,white);
    box(5.68,.3125,-4,.12,.625,1.65,cabinet,true);
    const zoneLightStart=lamps.length;fixture(0,4);fixture(0,-4,false);light(-3,2.5,1,'#b49f7d',4);light(-3,2.5,-4,'#8b9b85',3);light(3.5,2.5,-4,'#839c96',3);const zoneLights=lamps.slice(zoneLightStart).map(l=>({light:l,base:l.intensity}));
    const serviceHinge=new T.Group();serviceHinge.name='office-service-door';serviceHinge.position.set(-.6,0,-bz+.12);root.add(serviceHinge);
    const serviceLeaf=box(0,1.1,-bz+.12,1.18,2.2,.09,metal);serviceHinge.attach(serviceLeaf);doorHardware(serviceLeaf,1.18);target('service_exit','관리용 승강기 열기',serviceLeaf,0,1.25,-bz+.32);
    const serviceBlock={x:0,z:-bz+.12,w:1.2,d:.12,y:1.1,h:2.2};solids.push(serviceBlock);let serviceAt=-1,playAt=-1;reset=()=>{serviceAt=-1;playAt=-1;};bounds.z=bz+6.2;
    box(0,-.09,-bz-1.35,2.2,.18,2.7,floorMat);box(0,2.8,-bz-1.35,2.2,.12,2.7,metal);for(const x of [-1.1,1.1])box(x,1.4,-bz-1.35,.12,2.8,2.7,metal,true);box(0,1.4,-bz-2.7,2.2,2.8,.12,metal,true);light(0,2.5,-bz-1.3,'#98ad9b',3,4);label('관리용 승강기 · 1F',0,2.5,-bz+.094,0,1.8,.2);
    label('17층 · 구 관리사무소',0,2.57,bz-.094,Math.PI,1.65,.2);puddle(2.6,5,.45,1);
    updateStory=(stage,time,_reduced,story,occupants)=>{
      const state:Pick<Story,'notes'|'circuit'|'officeSupply'>=story??{notes:[],circuit:[],officeSupply:false};const supply=state.officeSupply,watch=officeCanWatch(state),installed=state.notes.includes('office_install');
      if(stage!=='office_playback')playAt=-1;else if(playAt<0)playAt=time;
      surveillance.update(watch?stage:'office_power',playAt<0?0:time-playAt,watch?'기록 선택 · '+tapeTimes[story?.tapeIndex??0]:'전원 없음 · B CCTV 2A');
      fuse.visible=!state.notes.includes('fuse');installedFuse.visible=installed;
      for(const b of branches){const on=state.circuit.includes(b.id);b.handle.rotation.z=on?-.55:.55;b.lamp.emissiveIntensity=supply&&on?.65:0;}
      for(const {light,base} of zoneLights)light.userData.base=base*(supply&&state.circuit.includes('circuit_a')?1:.3);
      const caption=installed?`선택 ${officePowerLoad(state)} / 6A · ${supply?'공급 중':'전원 대기'}`:'퓨즈 없음';if(caption!==powerCaption){loadDisplay.update(caption);powerCaption=caption;}
      exitKey.visible=!state.notes.includes('service_key');
      if(stage==='office_departure'&&serviceAt<0)serviceAt=time;if(serviceAt>=0)setDoorAngle(serviceHinge,serviceBlock,1.5*T.MathUtils.smoothstep(time-serviceAt,0,.85),.6,0,occupants);
    };
  }
  if(area==='parking'){
    bounds.z=bz+6.8;connectionPassage(root,solids,lamps,-3,bz+6,0,.9);
    const L=buildingLayout.parking;const garage=buildGarageStructure(root);
    door('exit','보행자 출구',0,-bz+.12);label('백로아파트  B1',0,2.57,bz-.094,Math.PI,2,.3);light(0,2.4,-21,'#74af8b',4);
    for(const x of [-9,0,9])for(const z of [-12,0,12]){box(x,1.35,z,.55,2.7,.55,concrete);solids.push({x,z,w:.66,d:.66,y:1.35,h:2.7});box(x,.055,z,.66,.11,.66,concrete);for(const dx of [-.3,.3])for(const dz of [-.3,.3])box(x+dx,.6,z+dz,.045,1.05,.045,metal);box(x,.66,z,.58,.85,.58,mat('#aa8f3f'));for(const y of [.35,.65,.95])box(x,y,z,.59,.11,.59,dark);label('B1',x,1.75,z+.2755,0,.4,.18);box(x,2.42,z,.9,.22,.9,concrete);}
    function car(x:number,z:number,color:string,own=false){
      const chassis=createSedan(color,own);chassis.position.set(x,0,z);root.add(chassis);solids.push(...sedanSolids(x,z));
      for(const end of [-1,1])label(own?'28 가 0317':`${37+Math.round(x)} 나 ${4200+Math.round(z*13)}`,x,.548,z+end*2.263,end>0?0:Math.PI,.47,.11,'#2b3027','#a6ad9a');
      for(const dx of [-1.27,1.27])garageMarking(root,x+dx,z,.055,4.85,garage.floorPaint);garageMarking(root,x,z-2.45,2.59,.055,garage.floorPaint);for(const dx of [-.55,.55]){box(x+dx,.07,z-1.7,.55,.14,.16,dark);for(const ox of [-.17,.17]){box(x+dx+ox,.141,z-1.7,.055,.002,.12,white);const anchor=new T.Mesh(new T.CylinderGeometry(.012,.012,.009,8),metal);anchor.position.set(x+dx+ox,.145,z-1.7);root.add(anchor);}}
      return chassis;
    }
    for(const x of [-5.2,5.2])for(const z of [-10,-3,4,11])car(x,z,(Math.round(z)%3===0?'#8b8e87':x<0?'#354044':'#6c655d'));
    carDeparture=buildCarDeparture(root,solids);const own=carDeparture.car;
    for(const dx of [-1.27,1.27])garageMarking(root,L.car.x+dx,L.car.z,.055,4.85,garage.floorPaint);garageMarking(root,L.car.x,L.car.z+2.45,2.59,.055,garage.floorPaint);
    for(const dx of [-.55,.55])box(L.car.x+dx,.07,L.car.z+2.45,.55,.14,.16,dark);
    target('car_passenger','조수석 문 열기',carDeparture.passengerDoor,6.02,1.1,-17.8);carDeparture.passengerDoor.userData.approach={x:7.1,z:-17.8};
    target('car_search','가방에서 열쇠 꺼내기',carDeparture.key,5.415,.31,-17.83);carDeparture.key.userData.approach={x:7.1,z:-17.8};target('car_board','운전석 문 열고 탑승',own,3.98,1.1,-17.8);
    box(-11.3,1.35,15.82,1.4,2.7,.24,concrete,true);
    const cabinet=box(L.alarm.x,1.25,15.96,.55,1.85,.12,metal);cabinet.name='fire-alarm-cabinet';
    const enamel=surface('steel','#8e3c31',{roughness:.68});
    box(L.alarm.x,1.25,16.032,.5,1.76,.024,enamel);
    const hose=box(L.alarm.x,.81,16.052,.455,.79,.016,enamel);hose.name='fire-hose-cabinet-door';
    for(const y of [.5,1.1]){box(L.alarm.x-.222,y,16.066,.025,.085,.024,metal);roundPipe(root,[L.alarm.x-.222,y-.047,16.076],[L.alarm.x-.222,y+.047,16.076],.009,metal);}
    box(L.alarm.x+.17,.82,16.068,.028,.09,.018,metal);label('소\n화\n전',L.alarm.x,.82,16.062,0,.12,.43,'#c4c0ac','#813a31');
    for(const x of [-.215,.215])for(const y of [.415,2.085]){const screw=new T.Mesh(new T.CylinderGeometry(.008,.008,.005,8),metal);screw.rotation.x=Math.PI/2;screw.position.set(L.alarm.x+x,y,16.047);root.add(screw);}
    for(let i=0;i<4;i++)box(L.alarm.x,.49+i*.023,16.064,.22,.007,.003,dark);
    const bell=new T.Mesh(new T.SphereGeometry(.145,28,16,0,Math.PI*2,0,Math.PI/2),enamel);bell.rotation.x=Math.PI/2;bell.position.set(L.alarm.x,1.92,16.046);bell.castShadow=true;root.add(bell);
    const bellRim=new T.Mesh(new T.TorusGeometry(.143,.009,8,32),metal);bellRim.position.set(L.alarm.x,1.92,16.048);root.add(bellRim);
    const bellBolt=new T.Mesh(new T.SphereGeometry(.009,12,8),metal);bellBolt.position.set(L.alarm.x,1.92,16.192);root.add(bellBolt);
    const callBase=new T.Mesh(new T.CylinderGeometry(.108,.108,.06,28),dark);callBase.rotation.x=Math.PI/2;callBase.position.set(L.alarm.x,1.4,16.074);root.add(callBase);
    const bezel=new T.Mesh(new T.TorusGeometry(.1,.012,8,32),metal);bezel.position.set(L.alarm.x,1.4,16.1);root.add(bezel);
    const push=new T.Mesh(new T.CylinderGeometry(.086,.086,.026,28),enamel);push.rotation.x=Math.PI/2;push.position.set(L.alarm.x,1.4,16.117);push.name='fire-call-button';root.add(push);target('alarm','화재경보기 작동',push,L.alarm.x,1.4,16.18);
    const pushLabel=label('누름',L.alarm.x,1.4,16.131,0,.11,.055,'#c8bdb1','#813a31').mesh;push.attach(pushLabel);
    label('발신기',L.alarm.x,1.6,16.046,0,.25,.085,'#c8bdb1','#813a31');
    const pilotMaterial=mat('#8e2520',{emissive:'#ec301e',emissiveIntensity:.08,roughness:.24});
    const pilot=new T.Mesh(new T.SphereGeometry(.027,20,12),pilotMaterial);pilot.position.set(L.alarm.x,2.12,16.07);pilot.name='fire-alarm-pilot';root.add(pilot);
    const pilotBezel=new T.Mesh(new T.TorusGeometry(.028,.006,6,20),metal);pilotBezel.position.set(L.alarm.x,2.12,16.047);root.add(pilotBezel);
    const alarmLamp=light(L.alarm.x,2.12,16.13,'#c93d2a',.04,1.7);
    function setAlarm(active:boolean){push.position.z=active?16.104:16.117;pilotMaterial.emissiveIntensity=active?.9:.08;alarmLamp.userData.base=active?.8:.04;}
    reset=()=>{carDeparture!.reset();setAlarm(false);};
    for(const [x,z,id] of [[-10.8,1,'valve_a'],[10.8,-8,'valve_b']] as const){roundPipe(root,[x,0,z],[x,2.7,z],.0425,rust);box(x,1.2,z+.085,.055,.055,.17,metal);const wheel=new T.Mesh(new T.TorusGeometry(.19,.025,6,16),red);wheel.position.set(x,1.2,z+.14);root.add(wheel);box(x,1.2,z+.14,.36,.025,.025,red);target(id,id==='valve_a'?'서측 급수 밸브 잠그기':'동측 급수 밸브 잠그기',wheel,x,1.2,z+.2);box(x,1.85,z+.045,.66,.21,.035,metal);label(id==='valve_a'?'서측 급수':'동측 급수',x,1.85,z+.0665,0,.6,.16);for(const y of [.2,2.5]){box(x,y,z,.15,.1,.15,metal);box((x+Math.sign(x)*11.9)/2,y,z,11.9-Math.abs(x),.035,.035,metal);}}
    const pump=box(-10.5,.08,-17,.9,.16,1.1,metal,true);box(-10.5,.57,-17,.15,.78,.14,metal);box(-10.5,1.16,-17,.45,.4,.3,metal).name='parking-pump-control';target('pump','배수 펌프 가동',pump,-10.5,1.3,-16.65);label('배수 설비',-10.5,1.23,-16.843,0,.4,.11);
    const motor=new T.Mesh(new T.CylinderGeometry(.22,.22,.66,22),paint);motor.rotation.x=Math.PI/2;motor.position.set(-10.5,.38,-16.94);root.add(motor);
    for(let i=0;i<7;i++){const fin=new T.Mesh(new T.TorusGeometry(.22,.009,6,22),metal);fin.position.set(-10.5,.38,-17.2+i*.075);root.add(fin);}
    for(const x of [-10.66,-10.34])box(x,.225,-16.94,.07,.13,.57,metal);box(-10.5,.172,-16.94,.5,.024,.8,paint);
    box(-10.5,.38,-17.42,.22,.22,.3,paint);roundPipe(root,[-10.5,0,-17.52],[-10.5,.52,-17.52],.07,rust);roundPipe(root,[-10.5,.38,-17.42],[-11.31,.38,-17.42],.055,rust);roundPipe(root,[-11.31,0,-17.42],[-11.31,2.7,-17.42],.055,rust);
    box(-10.5,1.08,-16.839,.26,.11,.018,dark);for(const [x,m] of [[-10.57,red],[-10.43,paint]] as const)box(x,1.08,-16.824,.045,.045,.017,m);
    const plate=box(-10.5,.085,-16.442,.83,.11,.013,paint);label('양측 급수 차단 후 가동',plate.position.x,.085,-16.433,0,.8,.095);
    for(const y of [.42,2.35]){roundPipe(root,[-11.31,y,-17.42],[-11.9,y,-17.42],.012,metal);box(-11.9,y,-17.42,.025,.14,.14,metal);}
    solids.push({x:-11.2,z:-17.42,w:1.4,d:.16,y:.275,h:.55},{x:-11.31,z:-17.42,w:.11,d:.11,y:1.35,h:2.7});
    roundPipe(root,[-10.5,1.36,-17],[-10.5,2.7,-17],.015,metal);
    // Flush channel drains follow the outer service aisles.
    for(const x of [-11.65,11.65])for(const z of [-12,0,12]){box(x,.001,z,.24,.002,2.6,metal);for(let dz=-1.2;dz<=1.2;dz+=.1)box(x,.0025,z+dz,.19,.001,.025,dark);}
    const extinguisher=new T.Mesh(new T.CylinderGeometry(.10,.10,.43,20),red);extinguisher.position.set(-11.25,.32,16.05);root.add(extinguisher);box(-11.25,.08,16.05,.26,.16,.26,metal);roundPipe(root,[-11.25,.54,16.05],[-11.25,.62,16.05],.024,metal);roundPipe(root,[-11.25,.59,16.05],[-11.37,.32,16.05],.012,dark);
    box(0,.025,-21.69,1.05,.05,.24,metal);const jam=box(.07,.06,-21.45,.79,.09,.16,wood);jam.rotation.y=.12;
    const flood=puddle(0,-19,2.3,2.6);flood.name='parking-flood';updateStory=(stage,time,_reduced,story,occupants)=>{if(parkingAlarmActive(story??{stage,notes:[]}))setAlarm(true);const drained=parkingDrained(story??{notes:[]})||['parking_alarm','parking_run','car_departure'].includes(stage);flood.scale.y=drained?.35:2.6;carDeparture!.inspect(stage,time,story,occupants);const target=targets.find(t=>t.id==='car_search');if(target)target.label=parkingDrained(story??{notes:[]})?'조수석 가방 · 차 열쇠':'조수석 가방 · 설비 열쇠';};
    for(const x of [-2.2,2.2])for(const z of [-18,-6,6,18])fixture(x,z,z!==6);
    for(const z of [-12,6])label('보행자 출구 →',-11.9095,1.9,z,Math.PI/2,1.2,.3);
    figure.position.set(-7.8,0,-18);figure.visible=true;
  }
  return {solids,targets,lamps,shoes,figure,phoneGlow,radioLight,bounds,spawn,heading,heightAt,liftDoors,setDisplay,fallingFigure,updateStory,reset,carDeparture};
}
