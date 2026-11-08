import {localizedContext,localizedTexture} from './localized-canvas.ts';
import * as T from 'three';
import {boxUV,softBox,sharePrintedTexture,surface} from './materials.ts';
import {connectionPassage,setDoorAngle} from './passage.ts';
import {roundPipe,doorHardware} from './props.ts';
import {facilityTable,facilityChair} from './facility-props.ts';
import {storageMaterials,storageShelf} from './storage.ts';
import {createCRT,createCrtSocket,crtCable} from './crt-monitor.ts';
import {createSurveillance,type Surveillance} from './surveillance.ts';
import {createGhost} from './ghost.ts';
import {archiveReplay} from './expansion-story.ts';
import {apartmentEscapeLayout} from './escape-layout.ts';
import {createApartmentPlaque,apartmentEvacuationTexture} from './apartment-signage.ts';
import type {Action,Stage,Story} from './story.ts';
import type {buildExpansion} from './expansion-world.ts';
import type {Solid,Target} from './world.ts';
import type {Occupant} from './collision.ts';

// A fictional old apartment's ground-floor support rooms, followed by its B1 stair.
export {apartmentEscapeLayout} from './escape-layout.ts';
type ApartmentEscapeArea=keyof typeof apartmentEscapeLayout;

export function buildApartmentEscape(root:T.Group,area:ApartmentEscapeArea):ReturnType<typeof buildExpansion>{
 const L=apartmentEscapeLayout[area],bx=L.x,bz=L.z,solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[];
 root.name=`${area}-chapter`;
 const wall=surface('decayWall','#b2b1a0'),lower=surface('wall','#66756a'),floor=surface(area==='plant'?'wornConcrete':'oldTile',area==='plant'?'#858c80':'#aaa997');
 const steel=surface('paintedMetal','#737c72',{metalness:.35,roughness:.62}),wood=surface('wood','#796b55'),dark=new T.MeshStandardMaterial({color:'#29332d',roughness:.85}),paper=new T.MeshStandardMaterial({color:'#c7bea5',roughness:.93});
 const glass=new T.MeshPhysicalMaterial({color:'#a1b0a0',roughness:.17,transparent:true,opacity:.17,depthWrite:false,side:T.DoubleSide});
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false,parent:T.Object3D=root){
  const mesh=new T.Mesh(boxUV(softBox(w,h,d,Math.min(.008,h/3,d/3,w/3)),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=!m.transparent;mesh.receiveShadow=true;parent.add(mesh);
  if(solid)solids.push({x,z,w,d,y,h});return mesh;
 }
 function wallAt(x:number,z:number,w:number,d:number,ground=0){
  box(x,ground+1.4,z,w,2.8,d,wall,true);box(x,ground+.44,z,w+.012,.88,d+.012,lower);box(x,ground+.045,z,w+.02,.09,d+.02,dark);
 }
 function print(text:string,x:number,y:number,z:number,w:number,h:number,ry=0,parent:T.Object3D=root,lit=false){
  const c=document.createElement('canvas');c.width=1024;c.height=Math.max(96,Math.round(1024*h/w));const ink=localizedContext(c)!,lines=text.replaceAll(' / ','\n').split('\n');
  const size=Math.min(c.height/(lines.length*1.55),950/Math.max(1,...lines.map(line=>line.length)));
  ink.fillStyle=lit?'#253a2d':'#bcb69f';ink.fillRect(0,0,c.width,c.height);ink.fillStyle=lit?'#c2d1ae':'#2b3930';ink.font=`${size}px "Apple SD Gothic Neo",sans-serif`;ink.textAlign='center';ink.textBaseline='middle';
  lines.forEach((line,i)=>ink.fillText(line,c.width/2,c.height/2+(i-(lines.length-1)/2)*size*1.35));
  const map=sharePrintedTexture(localizedTexture(new T.CanvasTexture(c)),['apartment-escape-v126',text,lit]);map.colorSpace=T.SRGBColorSpace;
  const mesh=new T.Mesh(new T.PlaneGeometry(w,h),lit?new T.MeshBasicMaterial({map}):new T.MeshStandardMaterial({map,roughness:.92}));mesh.position.set(x,y,z);mesh.rotation.y=ry;mesh.userData.text=text;parent.add(mesh);return mesh;
 }
 function target(id:Action,caption:string,mesh:T.Object3D,point:[number,number,number],approach:[number,number]){
  mesh.userData.approach={x:approach[0],z:approach[1]};targets.push({id,label:caption,mesh,point:new T.Vector3(...point)});
 }
 function fixture(x:number,z:number){
  box(x,2.745,z,.16,.11,.8,steel);box(x,2.684,z,.11,.012,.72,new T.MeshStandardMaterial({color:'#bcc7ac',emissive:'#a5b391',emissiveIntensity:.35}));
  const light=new T.PointLight('#b2bea6',2.8,8,2);light.position.set(x,2.5,z);light.userData.base=2.8;root.add(light);lamps.push(light);
 }
 function table(name:string,x:number,z:number,w=2.2,d=.9){
  const desk=facilityTable(w,d,wood,steel);desk.name=name;desk.position.set(x,0,z);root.add(desk);solids.push({x,z,w,d,y:.41,h:.82});return desk;
 }
 function folder(name:string,title:string,x:number,z:number,desk:T.Group){
  const group=new T.Group();group.name=name;group.position.set(x,.8205,z);group.userData.support=desk.name;root.add(group);
  box(0,.006,0,.4,.012,.29,paper,false,group);box(-.19,.008,0,.016,.016,.29,steel,false,group);
  const face=print(title,0,.0125,0,.36,.25,0,group);face.rotation.x=-Math.PI/2;return group;
 }
 const heightAt=area==='plant'?(x:number,z:number)=>{
  if(z>=4)return 0;
  if(z>0&&x<0)return -1.4*(4-z)/4;
  if(z>=-2)return -1.4;
  if(z>-6&&x>0)return -1.4-1.4*(-z-2)/4;
  return -2.8;
 }:(_x:number,_z:number)=>0;
 const bottom=area==='plant'?-2.8:0;
 if(area!=='plant'){
  box(0,-.1,0,bx*2,.2,bz*2,floor);
  wallAt(-bx,0,.18,bz*2);
  if(area==='annex'){
   wallAt(bx,(-bz+1.1)/2,.18,bz+1.1);wallAt(bx,(4.9+bz)/2,.18,bz-4.9);
   box(bx,.1,3,.18,.2,3.8,steel);box(bx,2.66,3,.18,.28,3.8,wall);
  }else wallAt(bx,0,.18,bz*2);
 }else{
  // Seal the full well below the flights and both unused end-wall bands.
  // Route rails still prevent entering these non-walkable parts of the shaft.
  box(0,-3.01,0,bx*2,.22,bz*2,wall).name='plant-shaft-base';
  box(0,-1.51,bz,bx*2,3.02,.18,wall).name='plant-entry-lower-wall';
  box(0,1.4,-bz,bx*2,2.8,.18,wall).name='plant-exit-upper-wall';
  // The two flights occupy different rectangles; heightAt never needs a floor index.
  box(0,-.1,6,6,.2,4,floor);box(0,-1.5,-1,6,.2,2,floor);box(0,-2.9,-7,6,.2,2,floor);
  for(const x of [-bx,bx]){box(x,-.11,0,.18,5.82,16,wall,true);box(x,-2.36,0,.192,.88,16,lower);}
  function flight(name:string,x:number,startZ:number,startY:number){
   const group=new T.Group();group.name=name;root.add(group);
   for(let i=0;i<10;i++)box(x,startY-(i+.5)*.14-.075,startZ-(i+.5)*.4,2.55,.15,.4,floor,false,group);
   // A continuous concrete soffit joins every tread and bears into both landings.
   const slab=box(x,startY-.7-.20,startZ-2,2.55,.18,Math.hypot(4,1.4),wall,false,group);slab.rotation.x=-Math.atan(1.4/4);
   for(const side of [-1,1]){
    const rx=x+side*1.27;
    for(let i=0;i<=10;i+=2){const z=startZ-i*.4,y=startY-i*.14;roundPipe(group,[rx,y,z],[rx,y+.94,z],.018,steel);box(rx,y+.015,z,.11,.03,.11,steel,false,group);}
    roundPipe(group,[rx,startY+.94,startZ],[rx,startY-.46,startZ-4],.024,steel);
    solids.push({x:rx,z:startZ-2,w:.075,d:4,y:startY-.2,h:2.4,seeThrough:true});
   }
  }
  flight('plant-stair-flight-upper',-1.35,4,0);flight('plant-stair-flight-lower',1.35,-2,-1.4);
  function landingRail(x:number,z:number,y:number,w:number){
   for(const dx of [-w/2+.04,0,w/2-.04]){roundPipe(root,[x+dx,y,z],[x+dx,y+.94,z],.018,steel);box(x+dx,y+.015,z,.11,.03,.11,steel);}
   roundPipe(root,[x-w/2,y+.94,z],[x+w/2,y+.94,z],.024,steel);solids.push({x,z,w,d:.075,y:y+.5,h:1,seeThrough:true});
  }
  landingRail(1.5,4,0,2.85);landingRail(1.5,0,-1.4,2.85);landingRail(-1.5,-2,-1.4,2.85);landingRail(-1.5,-6,-2.8,2.85);
  for(const [x,y,z,text] of [[-2.8645,-.1,-1,'주차장 →'],[2.9095,-1.3,-6.7,'← 주차장']] as const){
   // The midlanding plate is on the maintenance door face, not buried
   // behind it; both plates follow their landing's ground height.
   createApartmentPlaque(root,{name:x<0?'plant-midlanding-direction':'plant-lower-direction',text,code:'B1',width:x<0?.86:1.24,height:.24,position:[x,y,z],rotationY:x<0?Math.PI/2:-Math.PI/2,lit:true});
   const light=new T.PointLight('#a6baa0',1.8,5.5,2);light.position.set(x+(x<0?.2:-.2),y+.35,z);light.userData.base=1.8;root.add(light);lamps.push(light);
  }
  const maintenance=new T.Group();maintenance.name='plant-closed-maintenance-door';maintenance.position.set(-2.89,-1.4,-1);maintenance.rotation.y=Math.PI/2;root.add(maintenance);
  const panel=box(0,1.12,0,.94,2.24,.05,steel,false,maintenance);doorHardware(panel,.94);print('보수 창고\n관계자 외 출입금지',0,1.7,.0255,.72,.3,0,maintenance);
 }
 box(0,2.91,0,bx*2,.22,bz*2,wall);
 for(const side of [-1,1]){
  wallAt(side*(bx+.75)/2,bz,bx-.75,.18);
  wallAt(side*(bx+.75)/2,-bz,bx-.75,.18,bottom);
 }
 box(0,2.61,bz,1.5,.38,.18,wall);box(0,bottom+2.61,-bz,1.5,.38,.18,wall);
 // Exact shared geometry and x/z origins preserve the existing chapter handoff.
 connectionPassage(root,solids,lamps,-3,bz+6,0,.9);
 connectionPassage(root,solids,lamps,0,-bz,bottom);
 const doorZ=-bz+.025,hinge=new T.Group();hinge.name='expansion-exit-door';hinge.position.set(-.7,bottom,doorZ);root.add(hinge);
 for(const side of [-1,1]){const jamb=box(side*.725,bottom+1.2,-bz,.12,2.4,.22,steel);jamb.name=side<0?'apartment-exit-frame-left':'apartment-exit-frame-right';}
 box(0,bottom+2.37,-bz,1.57,.12,.22,steel);box(0,bottom+.012,-bz,1.5,.024,.23,steel);
 const leaf=box(.7,1.17,0,1.37,2.34,.08,steel,false,hinge);doorHardware(leaf,1.37);
 const doorBlock:Solid={x:0,z:doorZ,w:1.4,d:.12,y:bottom+1.17,h:2.34};solids.push(doorBlock);
 target(`${area}_exit` as Action,L.exit,leaf,[0,bottom+1.2,doorZ+.12],[0,doorZ+(area==='plant'?1.05:1.2)]);
 const exitPlace=area==='annex'?'관리문서 보관실':area==='archive'?'비상계단':'지하주차장';
 createApartmentPlaque(root,{name:`${area}-exit-plaque`,text:exitPlace,code:area==='plant'?'B1':'1F',width:1.38,height:.22,position:[0,bottom+2.56,-bz+.0895]});
 createApartmentPlaque(root,{name:`${area}-entry-plaque`,text:area==='annex'?'공동현관':area==='archive'?'관리문서 보관실':'비상계단',code:'1F',width:1.38,height:.22,position:[0,2.56,bz-.0895],rotationY:Math.PI});
 fixture(0,bz-2);if(area!=='plant')fixture(0,-bz+3);
 let key:T.Group|undefined,surveillance:Surveillance|undefined;
 if(area==='annex'){
  // Small glazed guard room, with an open 1.8 m doorway to the foyer.
  wallAt(-4,-4,4,.14);wallAt(-4,2.8,4,.14);wallAt(-2,1.9,.14,1.8);
  box(-2,.45,-2.45,.14,.9,3.1,lower,true);box(-2,2.61,-2.45,.14,.38,3.1,wall);
  for(const z of [-4,-2.45,-.9])box(-2,1.61,z,.18,1.42,.05,steel);
  for(const y of [.95,2.3])box(-2,y,-2.45,.18,.05,3.1,steel);
  box(-2,1.61,-2.45,.012,1.31,3.0,glass);box(-2,2.61,0,.14,.38,1.8,wall);
  createApartmentPlaque(root,{name:'annex-guard-plaque',text:'경비실',width:1.1,height:.22,position:[-1.9305,2.6,0],rotationY:Math.PI/2});
  const desk=table('annex-guard-desk',-4,-2.3,2.3,1.0),ledger=folder('annex-duty-ledger','야간 근무일지\n관리용 열쇠 · 북측 연결문',-4.45,-2.3,desk);ledger.rotation.y=.08;
  const chair=facilityChair(wood,steel);chair.position.set(-4,0,-3.35);root.add(chair);solids.push({x:-4,z:-3.35,w:.5,d:.5,y:.44,h:.88});
  key=new T.Group();key.name='annex-management-key';key.position.set(-3.5,.8205,-2.25);key.userData.support=desk.name;root.add(key);
  const brass=new T.MeshStandardMaterial({color:'#a69962',metalness:.65,roughness:.48}),ring=new T.Mesh(new T.TorusGeometry(.036,.004,8,28),brass);ring.rotation.x=-Math.PI/2;ring.position.y=.004;key.add(ring);
  box(0,.002,.072,.014,.004,.087,brass,false,key);for(const z of [.078,.099])box(.009,.002,z,.016,.004,.009,brass,false,key);
  box(.14,.0025,0,.18,.005,.075,paper,false,key);print('관리용',.14,.0055,0,.17,.064,0,key).rotation.x=-Math.PI/2;
  target('annex_badge','북측 연결문 관리용 열쇠',key,[-3.5,.84,-2.2],[-3.5,-1.05]);
  const backing=box(-5.875,1.5,5.35,.07,1.25,1.95,steel);backing.name='annex-route-board-backing';
  const map=new T.Mesh(new T.PlaneGeometry(1.84,1.14),new T.MeshStandardMaterial({map:apartmentEvacuationTexture(),roughness:.9}));map.position.set(-5.8395,1.5,5.35);map.rotation.y=Math.PI/2;map.name='annex-floor-plan';map.userData.text='1층 피난안내도';root.add(map);
  // Preserve the existing board/target footprint; add the shallow frame only around its edge.
  const frame=new T.Group();frame.name='annex-route-board-frame';frame.position.copy(map.position);frame.rotation.copy(map.rotation);root.add(frame);
  for(const [x,y,w,h] of [[0,-.5975,1.95,.035],[0,.5975,1.95,.035],[-.955,0,.035,1.2],[.955,0,.035,1.2]])box(x,y,.003,w,h,.009,steel,false,frame);
  for(const x of [-.95,.95])for(const y of [-.595,.595]){const screw=new T.Mesh(new T.CylinderGeometry(.006,.006,.004,8),dark);screw.rotation.x=Math.PI/2;screw.position.set(x,y,.009);frame.add(screw);}
  target('annex_map','1층 안내도와 주차장 우회로',map,[-5.83,1.5,5.35],[-4.6,5.35]);
  const mail=box(-5.66,1.1,3.75,.5,1.25,1.55,steel,true);mail.name='annex-mailboxes';
  for(let row=0;row<5;row++)for(let col=0;col<3;col++){
   const z=3.25+col*.5,y=.62+row*.24;box(-5.404,y,z,.012,.225,.47,steel);box(-5.397,y+.06,z,.008,.014,.27,dark);print(`${row+1}0${col+1}`,-5.3925,y-.035,z,.2,.07,Math.PI/2);
  }
  const glazing=box(6,1.34,3,.018,2.28,3.7,glass);glazing.name='annex-exterior-glazing';solids.push({x:6,z:3,w:.12,d:3.8,y:1.4,h:2.8,seeThrough:true});
  for(const z of [1.14,2.95,4.86])box(6,1.4,z,.12,2.6,.07,steel);for(const y of [.22,2.52])box(6,y,3,.14,.07,3.8,steel);
  print('정문 통행 불가\n북측 관리사무소로 우회',5.9905,1.45,3,1.05,.45,-Math.PI/2);
  const street=new T.Group();street.name='annex-street-vista';root.add(street);
  box(7.7,-.1,3,3.4,.2,7,floor,false,street);box(10.4,-.14,3,2,.12,10,surface('asphalt','#484f48'),false,street);box(11.5,3.25,3,.2,6.8,12,wall,false,street);
  for(const z of [-1,2,5,8]){box(11.39,2.5,z,.02,1.3,1.3,dark,false,street);box(11.375,2.5,z,.025,1.3,.05,steel,false,street);}
  const barrier=new T.Group();barrier.name='annex-fallen-work-barrier';street.add(barrier);const warning=surface('paintedMetal','#b29a55');
  for(const z of [1.4,4.6]){box(7.3,.04,z,.65,.08,.14,steel,false,barrier);roundPipe(barrier,[7.5,.08,z],[7.05,.65,z],.025,steel);roundPipe(barrier,[7.05,.65,z],[6.92,0,z],.025,steel);}
  for(const y of [.28,.63])box(7.05,y,3,.06,.09,3.5,warning,false,barrier);
  box(7.01,.47,3,.05,.3,1.5,warning,false,barrier);print('낙하물 · 통행 금지',6.9845,.47,3,1.4,.24,-Math.PI/2,barrier);
  box(6.65,.06,2.7,.65,.12,1.1,wall,false,street);box(7.25,.045,3.5,.8,.09,.4,lower,false,street);
  createApartmentPlaque(root,{name:'annex-north-direction',text:'관리문서 보관실',subtitle:'← 북측 연결문',code:'1F',width:1.8,height:.38,position:[5.9105,1.85,6.5],rotationY:-Math.PI/2});
 }else if(area==='archive'){
  const notice=box(-4.38,1.48,4.8,.06,.8,1.4,steel);notice.name='archive-usage-board';
  const ledger=print('관리문서 보관실 · 이용 안내\n세 기록 확인 후 CCTV 재생\n비상계단은 북측 문',-4.3495,1.48,4.8,1.3,.7,Math.PI/2);
  target('archive_ledger','기록 이용 안내',ledger,[-4.34,1.48,4.8],[-3.1,4.8]);
  for(const [id,name,title,x,z] of [
   ['archive_road','road','1 사고기록\n03:17 정문 앞 횡단보도',-2.6,2],
   ['archive_call','call','2 통화기록\n03:20 비상벨 → 2803',-2.6,-1.35],
   ['archive_gate','gate','3 입차기록\n03:26 지하주차장',2.6,2],
  ] as const){
   const desk=table(`archive-${name}-desk`,x,z),record=folder(`archive-record-${name}`,title,x,z,desk);
   target(id,title.replace('\n',' · '),record,[x,.85,z+.04],[x,z+1.15]);
  }
  const contents=storageMaterials();
  for(const [x,z,rotation] of [[-4.08,-4.8,Math.PI/2],[4.08,4.8,-Math.PI/2],[2.6,-6.55,0]] as const){
   const shelf=storageShelf(1.9,.55,steel,contents,Math.round(z*9));shelf.position.set(x,0,z);shelf.rotation.y=rotation;root.add(shelf);
   solids.push({x,z,w:rotation===0?1.9:.55,d:rotation===0?.55:1.9,y:1.03,h:2.06});
  }
  const desk=table('archive-cctv-desk',2.5,-3.65,2.3,1),crt=createCRT();crt.root.name='archive-cctv-monitor';crt.root.position.set(2.4,.8205,-3.5);crt.root.userData.support=desk.name;root.add(crt.root);
  const screen=createSurveillance('archive');crt.screenMount.add(screen);surveillance=screen.userData.surveillance;
  target('archive_play','CCTV 누락 영상 재생',crt.root,[2.4,1.13,-3.465],[2.4,-2.35]);
  const socket=createCrtSocket();socket.root.position.set(4.4095,.27,-4.05);socket.root.rotation.y=-Math.PI/2;root.add(socket.root);root.updateMatrixWorld(true);
  const power=crt.powerPort.clone().applyMatrix4(crt.root.matrixWorld),lead=socket.lead.clone().applyMatrix4(socket.root.matrixWorld);
  crtCable(root,[power,new T.Vector3(power.x,.85,-4.11),new T.Vector3(power.x,.0035,-4.25),new T.Vector3(lead.x,.0035,lead.z),lead]);
  box(-2.4,1.64,-6.87,2.9,.64,.08,steel);
  const instructions=print('1 사고기록 · 2 통화기록 · 3 입차기록 / 세 기록 확인 후 CCTV 재생',-2.4,1.64,-6.8295,2.8,.54);instructions.name='archive-reading-instructions';
 }else{
  createApartmentPlaque(root,{name:'plant-upper-floor',text:'1F',subtitle:'1층 · 공동현관',width:.55,height:.5,position:[-2.9095,1.8,6.5],rotationY:Math.PI/2});
  createApartmentPlaque(root,{name:'plant-lower-floor',text:'B1',subtitle:'지하주차장',width:.55,height:.5,position:[2.9095,-.95,-7],rotationY:-Math.PI/2});
 }
 const figure=createGhost(root);figure.position.set(-3,0,bz+6.3);figure.rotation.y=Math.PI;figure.visible=false;
 let opened=-1,replayAt=-1,currentStage:Stage=area==='archive'?'archive_arrival':area==='annex'?'annex_arrival':'plant_arrival',currentClock=0,lastDisplay='';
 function setDisplay(text:string){lastDisplay=text;surveillance?.update(currentStage,currentClock,text);}
 function updateStory(stage:Stage,time:number,reduced=false,story?:Story,occupants:Occupant[]=[]){
  if(stage===`${area}_departure`&&opened<0)opened=time;
  if(opened>=0)setDoorAngle(hinge,doorBlock,1.5*T.MathUtils.smoothstep(time-opened,0,reduced?.2:.9),.7,0,occupants);
  if(key)key.visible=!story?.notes.includes('annex_badge');
  if(stage==='archive_playback'&&replayAt<0)replayAt=time;
  currentStage=stage;currentClock=replayAt<0?0:Math.max(0,time-replayAt);
  const cue=archiveReplay.findLast(cue=>currentClock>=cue.at)??archiveReplay[0];
  const text=stage==='archive_playback'?cue.screen.replaceAll('편집실','관리문서 보관실'):['archive_escape','archive_departure'].includes(stage)?'1F 관리문서 보관실\n북측 비상계단으로 이동':'1 사고기록 · 2 통화기록 · 3 입차기록\n세 기록 확인 후 CCTV 재생';
  lastDisplay=text;surveillance?.update(stage,currentClock,lastDisplay);
 }
 return {solids,targets,lamps,figure,shoes:new T.Group(),phoneGlow:new T.PointLight(),radioLight:new T.PointLight(),bounds:{x:Math.max(bx-.15,4.4),z:bz+6.8},spawn:new T.Vector3(0,1.65,bz-3),heading:0,heightAt,liftDoors:undefined,setDisplay,fallingFigure:undefined,archiveReview:undefined,archiveDoor:undefined,intercom:undefined,lureRadio:undefined,updateIntercom:undefined,plantAttempt:undefined,updateStory,reset(){
  opened=-1;replayAt=-1;currentClock=0;lastDisplay='';setDoorAngle(hinge,doorBlock,0,.7);if(key)key.visible=true;figure.visible=false;
 }};
}
