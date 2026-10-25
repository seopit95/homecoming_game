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

/** The foyer and attached management office use the same existing story stations.
 * Preview omits the duplicate pursuer when this is shown beyond the moving lift. */
export function buildGroundSupport(root:T.Group,area:'annex'|'archive',preview=false):ReturnType<typeof buildExpansion>{
 const L=apartmentEscapeLayout[area],bx=L.x,bz=L.z,solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[];root.name=`${area}-chapter`;
 const plaster=surface('decayWall','#b9b5a4'),lower=surface('wall','#788073'),tile=surface('oldTile','#aaa795'),steel=surface('paintedMetal','#777e74',{metalness:.3,roughness:.64}),wood=surface('wood','#786c58');
 const dark=new T.MeshStandardMaterial({color:'#30372f',roughness:.9}),paper=new T.MeshStandardMaterial({color:'#c7bea5',roughness:.94}),glass=new T.MeshPhysicalMaterial({color:'#a5b5ac',roughness:.16,transparent:true,opacity:.20,depthWrite:false,side:T.DoubleSide});
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false,parent:T.Object3D=root){const mesh=new T.Mesh(boxUV(softBox(w,h,d,Math.min(.007,w/3,h/3,d/3)),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=!m.transparent;mesh.receiveShadow=true;parent.add(mesh);if(solid)solids.push({x,z,w,d,y,h});return mesh;}
 function wall(x:number,z:number,w:number,d:number){box(x,1.4,z,w,2.8,d,plaster,true);box(x,.43,z,w+.01,.86,d+.01,lower);box(x,.045,z,w+.018,.09,d+.018,dark);}
 function print(text:string,x:number,y:number,z:number,w:number,h:number,ry=0,parent:T.Object3D=root){
  const c=document.createElement('canvas');c.width=1024;c.height=Math.max(96,Math.round(1024*h/w));const ink=c.getContext('2d')!,lines=text.split('\n'),size=Math.min(c.height/(lines.length*1.6),950/Math.max(1,...lines.map(l=>l.length)));
  ink.fillStyle='#c6c0ae';ink.fillRect(0,0,c.width,c.height);ink.fillStyle='#293a30';ink.font=`${size}px "Apple SD Gothic Neo",sans-serif`;ink.textAlign='center';ink.textBaseline='middle';lines.forEach((line,i)=>ink.fillText(line,c.width/2,c.height/2+(i-(lines.length-1)/2)*size*1.4));
  const map=sharePrintedTexture(new T.CanvasTexture(c),['ground-support-v133',text]);map.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.92}));mesh.position.set(x,y,z);mesh.rotation.y=ry;mesh.userData.text=text;parent.add(mesh);return mesh;
 }
 function target(id:Action,label:string,mesh:T.Object3D,point:[number,number,number],approach:[number,number]){mesh.userData.approach={x:approach[0],z:approach[1]};targets.push({id,label,mesh,point:new T.Vector3(...point)});}
 function fixture(x:number,z:number){box(x,2.745,z,.18,.1,.76,steel);const tube=new T.MeshStandardMaterial({color:'#b2b2ad',emissive:'#b4b5c0',emissiveIntensity:.18});box(x,2.687,z,.13,.014,.66,tube);const light=new T.PointLight('#aeb3c2',2.4,7,2);light.position.set(x,2.5,z);light.userData.base=2.4;light.userData.bulb=tube;light.userData.moodSeed=(area==='annex'?300:500)+Math.abs(Math.round(x*11+z*17));root.add(light);lamps.push(light);}
 function table(name:string,x:number,z:number,w=1.8,d=.8){const group=facilityTable(w,d,wood,steel);group.name=name;group.position.set(x,0,z);root.add(group);solids.push({x,z,w,d,y:.41,h:.82});return group;}
 function folder(name:string,title:string,x:number,z:number,desk:T.Group){const group=new T.Group();group.name=name;group.position.set(x,.8205,z);group.userData.support=desk.name;root.add(group);box(0,.006,0,.39,.012,.28,paper,false,group);box(-.185,.008,0,.016,.016,.28,steel,false,group);print(title,0,.0125,0,.35,.24,0,group).rotation.x=-Math.PI/2;return group;}
 function chair(x:number,z:number){const group=facilityChair(wood,steel);group.position.set(x,0,z);root.add(group);solids.push({x,z,w:.5,d:.5,y:.44,h:.88});}
 box(0,-.1,0,bx*2,.2,bz*2,tile);box(0,2.91,0,bx*2,.22,bz*2,plaster);wall(-bx,0,.18,bz*2);
 if(area==='annex'){
  wall(bx,(-bz-1.1)/2,.18,bz-1.1);wall(bx,(2.1+bz)/2,.18,bz-2.1);
  box(bx,.11,.5,.18,.22,3.2,steel);box(bx,2.6,.5,.18,.4,3.2,plaster);
 }else wall(bx,0,.18,bz*2);
 // The front room door receives the exact shared blind-turn connector.
 for(const side of [-1,1])wall(side*(bx+.75)/2,-bz,bx-.75,.18);
 box(0,2.61,-bz,1.5,.38,.18,plaster);
 const outgoing=connectionPassage(root,solids,lamps,0,-bz,0);outgoing.userData.destination=area==='annex'?'관리사무소':'B1 비상계단';
 if(area==='archive'){
  for(const side of [-1,1])wall(side*(bx+.75)/2,bz,bx-.75,.18);box(0,2.61,bz,1.5,.38,.18,plaster);
  const incoming=connectionPassage(root,solids,lamps,-3,bz+6,0,.9);incoming.getObjectByName('connection-fire-door')!.name='entry-connection-door';
  createApartmentPlaque(root,{name:'archive-entry-plaque',text:'관리사무소',code:'1F',width:1.2,height:.22,position:[0,2.55,bz-.0895],rotationY:Math.PI});
 }else{
  // Two separate 1F landings: A is closed; B is the real open arrival aperture.
  for(const [lo,hi]of[[-bx,-2.85],[-1.55,-.65],[.65,bx]])wall((lo+hi)/2,bz,hi-lo,.18);
  for(const [name,cx,open]of[['A',-2.2,false],['B',0,true]] as const){
   const bank=new T.Group();bank.name=`ground-lift-${name}`;bank.position.set(cx,0,bz);root.add(bank);
   for(const side of[-1,1]){box(side*.72,1.2,-.005,.14,2.4,.22,steel,false,bank);box(side*(open?.95:.32),1.17,-.035,.63,2.34,.045,steel,false,bank);}
   box(cx,2.61,bz,1.5,.38,.18,plaster);
   box(0,.009,-.015,1.3,.018,.24,steel,false,bank);
   createApartmentPlaque(bank,{name:`ground-lift-${name}-plaque`,text:open?'2호기':'1호기 · 운행 중지',code:'1F',width:1.25,height:.20,position:[0,2.55,-.0895],rotationY:Math.PI});
   if(!open){solids.push({x:cx,z:bz-.035,w:1.3,d:.1,y:1.17,h:2.34});print('점검 중\n사용 금지',0,1.38,-.061,.44,.3,Math.PI,bank);}
   else{box(1.39,1.3,-.115,.18,.48,.05,steel,false,bank);print('1F\n2–28F',1.39,1.33,-.141,.145,.3,Math.PI,bank);}
  }
  const cab=new T.Group();cab.name='ground-lift-cab-B';cab.position.set(0,0,bz+1.35);root.add(cab);
  box(0,-.06,0,1.8,.12,2.7,tile,false,cab);box(0,2.64,0,1.9,.12,2.7,steel,false,cab);
  for(const side of[-1,1]){box(side*.95,1.3,0,.1,2.6,2.7,steel,false,cab);solids.push({x:side*.95,z:bz+1.35,w:.1,d:2.7,y:1.3,h:2.6});roundPipe(cab,[side*.86,.92,-1.1],[side*.86,.92,1.2],.022,steel);}
  box(0,1.3,1.35,1.9,2.6,.1,steel,false,cab);solids.push({x:0,z:bz+2.7,w:1.9,d:.1,y:1.3,h:2.6});roundPipe(cab,[-.85,.92,1.24],[.85,.92,1.24],.022,steel);
  print('2호기 · 1층',0,1.8,1.294,1,.23,Math.PI,cab);box(0,2.565,-.25,.72,.018,.45,new T.MeshStandardMaterial({color:'#c4cab9',emissive:'#b1b9a1',emissiveIntensity:.2}),false,cab);
 }
 const doorZ=-bz+.025,hinge=new T.Group();hinge.name='expansion-exit-door';hinge.position.set(-.7,0,doorZ);root.add(hinge);
 for(const side of[-1,1]){const jamb=box(side*.725,1.2,-bz,.12,2.4,.22,steel);jamb.name=side<0?'apartment-exit-frame-left':'apartment-exit-frame-right';}
 box(0,2.37,-bz,1.57,.12,.22,steel);box(0,.012,-bz,1.5,.024,.23,steel);
 const leaf=box(.7,1.17,0,1.37,2.34,.08,steel,false,hinge);doorHardware(leaf,1.37);const doorBlock:Solid={x:0,z:doorZ,w:1.4,d:.12,y:1.17,h:2.34};solids.push(doorBlock);
 target(`${area}_exit` as Action,L.exit,leaf,[0,1.2,doorZ+.12],[0,doorZ+1.175]);
 createApartmentPlaque(root,{name:`${area}-exit-plaque`,text:area==='annex'?'관리사무소':'B1 비상계단',code:'1F',width:1.3,height:.22,position:[0,2.56,-bz+.0895]});
 fixture(.35,bz-2);fixture(.35,-bz+2.5);
 let key:T.Group|undefined,surveillance:Surveillance|undefined;
 if(area==='annex'){
  // A2.6×3.8m glazed guard station; the 1.3m side doorway is genuinely open.
  wall(-2.9,-2,2.6,.14);wall(-2.9,1.8,2.6,.14);wall(-1.6,1.725,.14,.15);
  box(-1.6,.43,-.825,.14,.86,2.35,lower,true);box(-1.6,2.6,-.825,.14,.4,2.35,plaster);box(-1.6,2.6,1,.14,.4,1.3,plaster);
  box(-1.6,1.61,-.825,.014,1.4,2.22,glass);solids.push({x:-1.6,z:-.825,w:.035,d:2.35,y:1.61,h:1.4,seeThrough:true});
  for(const z of[-1.95,-.825,.30])box(-1.6,1.61,z,.16,1.46,.045,steel);for(const y of[.92,2.32])box(-1.6,y,-.825,.16,.045,2.35,steel);
  createApartmentPlaque(root,{name:'annex-guard-plaque',text:'경비실',width:.9,height:.2,position:[-1.5305,2.6,1],rotationY:Math.PI/2});
  const desk=table('annex-guard-desk',-2.95,-.8),ledger=folder('annex-duty-ledger','야간 근무일지\n관리사무소 · 비상계단 열쇠',-3.32,-.8,desk);ledger.rotation.y=.08;chair(-2.95,-1.57);
  key=new T.Group();key.name='annex-management-key';key.position.set(-2.45,.8205,-.75);key.userData.support=desk.name;root.add(key);
  const brass=new T.MeshStandardMaterial({color:'#a69962',metalness:.65,roughness:.48}),ring=new T.Mesh(new T.TorusGeometry(.036,.004,8,28),brass);ring.rotation.x=-Math.PI/2;ring.position.y=.004;key.add(ring);
  box(0,.002,.072,.014,.004,.087,brass,false,key);for(const z of[.078,.099])box(.009,.002,z,.016,.004,.009,brass,false,key);box(.14,.0025,0,.18,.005,.075,paper,false,key);print('관리용',.14,.0055,0,.17,.064,0,key).rotation.x=-Math.PI/2;
  target('annex_badge','관리사무소 연결문 열쇠',key,[-2.45,.84,-.70],[-2.5,.35]);
  const backing=box(bx-.125,1.5,3.4,.07,1.30,1.73,steel);backing.name='annex-route-board-backing';
  const map=new T.Mesh(new T.PlaneGeometry(1.65,1.2375),new T.MeshStandardMaterial({map:apartmentEvacuationTexture(),roughness:.9}));map.name='annex-floor-plan';map.position.set(bx-.1605,1.5,3.4);map.rotation.y=-Math.PI/2;map.userData.text='1층 피난안내도';root.add(map);target('annex_map','1층 안내도와 주차장 우회로',map,[bx-.18,1.5,3.4],[2.85,3.4]);
  const mail=box(-bx+.23,1.1,3.35,.28,1.2,1.6,steel,true);mail.name='annex-mailboxes';for(let row=0;row<4;row++)for(let col=0;col<3;col++){const z=2.82+col*.52,y=.66+row*.29;box(-bx+.374,y,z,.014,.27,.49,steel);print(`${row+1}0${col+1}`,-bx+.383,y,z,.23,.08,Math.PI/2);}
  const glazing=box(bx,1.42,.5,.016,2.36,3.12,glass);glazing.name='annex-exterior-glazing';solids.push({x:bx,z:.5,w:.18,d:3.2,y:1.4,h:2.8,seeThrough:true});for(const z of[-1.1,.5,2.1])box(bx,1.4,z,.14,2.6,.07,steel);
  print('정문 통행 불가\n관리사무소 · B1 계단으로',bx-.011,1.48,.5,1.1,.38,-Math.PI/2);
  const street=new T.Group();street.name='annex-street-vista';root.add(street);box(bx+1.4,-.1,.5,2.8,.2,5.5,tile,false,street);box(bx+3.3,-.14,.5,1.2,.12,7,surface('asphalt','#484f48'),false,street);
  const barrier=new T.Group();barrier.name='annex-fallen-work-barrier';street.add(barrier);const warning=surface('paintedMetal','#b39d58');for(const z of[-.8,1.8]){box(bx+.95,.04,z,.65,.08,.14,steel,false,barrier);roundPipe(barrier,[bx+1.16,.08,z],[bx+.72,.72,z],.025,steel);roundPipe(barrier,[bx+.72,.72,z],[bx+.55,0,z],.025,steel);}for(const y of[.31,.67])box(bx+.72,y,.5,.06,.09,2.8,warning,false,barrier);print('보수 공사 · 통행 금지',bx+.68,.5,.5,1.7,.22,-Math.PI/2,barrier);box(bx+.53,.06,.15,.55,.12,.8,plaster,false,street);box(bx+1.05,.04,1.1,.7,.08,.4,lower,false,street);
 }else{
  const board=box(-bx+.12,1.48,3.2,.06,.75,1.3,steel);board.name='archive-usage-board';const ledger=print('관리사무소 · 기록 확인\n세 기록을 읽고 CCTV 재생\n출구: B1 비상계단',-bx+.1505,1.48,3.2,1.2,.65,Math.PI/2);target('archive_ledger','관리사무소 기록 이용 안내',ledger,[-bx+.17,1.48,3.2],[-1.95,3.2]);
  for(const [id,name,title,x,z,az]of[['archive_road','road','1 사고기록\n03:17 횡단보도',-1.85,1.7,2.75],['archive_call','call','2 통화기록\n03:20 비상벨',-1.85,-.7,.45],['archive_gate','gate','3 입차기록\n03:26 B1 주차장',1.85,1.7,2.75]] as const){const desk=table(`archive-${name}-desk`,x,z),record=folder(`archive-record-${name}`,title,x,z,desk);target(id,title.replace('\n',' · '),record,[x,.85,z+.04],[x,az]);}
  chair(-1.85,-1.6);const shelf=storageShelf(1.5,.45,steel,storageMaterials(),13);shelf.name='archive-office-files';shelf.position.set(-2.86,0,-2.8);shelf.rotation.y=Math.PI/2;root.add(shelf);solids.push({x:-2.86,z:-2.8,w:.45,d:1.5,y:1.03,h:2.06});
  const desk=table('archive-cctv-desk',1.85,-1.65,1.8,.85),crt=createCRT();crt.root.name='archive-cctv-monitor';crt.root.position.set(1.85,.8205,-1.55);crt.root.userData.support=desk.name;root.add(crt.root);chair(1.85,-2.65);
  const screen=createSurveillance('archive');crt.screenMount.add(screen);surveillance=screen.userData.surveillance;target('archive_play','CCTV 누락 영상 재생',crt.root,[1.85,1.1575,-1.52],[1.85,-.45]);
  const socket=createCrtSocket();socket.root.position.set(bx-.0905,.27,-1.9);socket.root.rotation.y=-Math.PI/2;root.add(socket.root);root.updateMatrixWorld(true);const power=crt.powerPort.clone().applyMatrix4(crt.root.matrixWorld),lead=socket.lead.clone().applyMatrix4(socket.root.matrixWorld);crtCable(root,[power,new T.Vector3(power.x,.85,-2.18),new T.Vector3(power.x,.0035,-2.18),new T.Vector3(lead.x,.0035,lead.z),lead]);
  box(-1.95,1.65,-bz+.13,1.8,.55,.08,steel);const instruction=print('1 사고기록 · 2 통화기록 · 3 입차기록\n세 기록 확인 후 CCTV 재생',-1.95,1.65,-bz+.171,1.7,.46);instruction.name='archive-reading-instructions';
  box(2.85,2.57,-3.85,.25,.11,.22,steel);roundPipe(root,[2.85,2.58,-3.85],[2.85,2.79,-3.85],.018,steel);const lens=new T.Mesh(new T.CylinderGeometry(.035,.04,.08,16),dark);lens.rotation.x=Math.PI/2+.12;lens.rotation.z=.55;lens.position.set(2.80,2.52,-3.75);lens.name='archive-room-cctv-lens';root.add(lens);
 }
 const figure=preview?new T.Group():createGhost(root);if(preview){figure.name='ground-preview-no-actor';root.add(figure);}figure.position.set(area==='annex'?-.5:-3,0,area==='annex'?4.4:bz+6.3);figure.rotation.y=Math.PI;figure.visible=false;
 const heightAt=(_x:number,_z:number)=>0,arrival:Stage=area==='annex'?'annex_arrival':'archive_arrival',idle='1 사고기록 · 2 통화기록 · 3 입차기록\n세 기록 확인 후 CCTV 재생';let opened=-1,replayAt=-1,currentStage:Stage=arrival,currentClock=0;
 function setDisplay(text:string){surveillance?.update(currentStage,currentClock,text);}
 function updateStory(stage:Stage,time:number,reduced=false,story?:Story,occupants:Occupant[]=[]){
  if(stage===`${area}_departure`&&opened<0)opened=time;if(opened>=0)setDoorAngle(hinge,doorBlock,1.5*T.MathUtils.smoothstep(time-opened,0,reduced?.2:.9),.7,0,occupants);if(key)key.visible=!story?.notes.includes('annex_badge');
  if(stage==='archive_playback'&&replayAt<0)replayAt=time;currentStage=stage;currentClock=replayAt<0?0:Math.max(0,time-replayAt);const cue=archiveReplay.findLast(c=>currentClock>=c.at)??archiveReplay[0];
  const text=stage==='archive_playback'?cue.screen.replaceAll('편집실','관리사무소').replaceAll('관리문서 보관실','관리사무소'):['archive_escape','archive_departure'].includes(stage)?'1F 관리사무소\nB1 비상계단으로 이동':idle;surveillance?.update(stage,currentClock,text);
 }
 surveillance?.update(arrival,0,idle);
 return {solids,targets,lamps,figure,shoes:new T.Group(),phoneGlow:new T.PointLight(),radioLight:new T.PointLight(),bounds:{x:Math.max(bx-.15,4.4),z:bz+6.8},spawn:new T.Vector3(0,1.65,bz-(area==='annex'?.3:.8)),heading:0,heightAt,liftDoors:undefined,setDisplay,fallingFigure:undefined,archiveReview:undefined,archiveDoor:undefined,intercom:undefined,lureRadio:undefined,updateIntercom:undefined,plantAttempt:undefined,updateStory,reset(){opened=-1;replayAt=-1;currentStage=arrival;currentClock=0;setDoorAngle(hinge,doorBlock,0,.7);if(key)key.visible=true;figure.visible=false;surveillance?.update(arrival,0,idle);}};
}
