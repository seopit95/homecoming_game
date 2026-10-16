import * as T from 'three';
import {connectionPassage,setDoorAngle} from './passage.ts';
import type {Occupant} from './collision.ts';
import {courtyardLayout} from './courtyard.ts';
import {sharePrintedTexture,surface,boxUV,softBox,upholstery} from './materials.ts';
import {createGhost} from './ghost.ts';
import {roundPipe,doorHardware} from './props.ts';
import {wetTexture,createLeatherShoe} from './entry-props.ts';
import type {Solid,Target} from './world.ts';
import type {Action,Stage,Story} from './story.ts';
import {archiveReplay,plantRoute,plantFilterCleared,plantProblem,type ExpansionArea} from './expansion-story.ts';
import {storageMaterials,storageShelf} from './storage.ts';
import {createCRT,crtScreenGeometry,crtCable,createCrtSocket} from './crt-monitor.ts';
import {createSurveillance,type Surveillance} from './surveillance.ts';
import {facilityTable,facilityChair,waterTank,pumpSkid,cartridgeFuse,videoCassette} from './facility-props.ts';
import {createAnsweringMachine} from './resident-props.ts';
import {facilityModel} from './facility-models.ts';
import {createArchiveReview,archiveClips,archiveCamera} from './archive-review.ts';
import {createArchiveDeck} from './archive-deck.ts';
import {buildAnnexLobby} from './annex-lobby.ts';
import {buildAnnexWestWing} from './annex-west-wing.ts';

export const expansionLayout={
 courtyard:courtyardLayout,
 annex:{x:17,z:34,name:'1F · 공동시설',exit:'1F 외부 중정',rooms:['우편실','세탁실','경비 휴게실','통신실'],patrol:[{x:0,z:26},{x:-14,z:18},{x:-14,z:-18},{x:0,z:-27},{x:14,z:-18},{x:14,z:18}]},
 archive:{x:15,z:32,name:'B1 · 기록보관실',exit:'기계실 연결통로',rooms:['A · 도로 영상','C · 입차 영상','B · 비상 통화','편집실'],patrol:[{x:0,z:25},{x:-12,z:18},{x:-12,z:-18},{x:0,z:-27},{x:12,z:-18},{x:12,z:18}]},
 plant:{x:17,z:36,name:'B1 · 배수 기계실',exit:'B1 주차장',rooms:['서측 저장탱크','배수 펌프','동측 급수관','전기실'],patrol:[{x:0,z:26},{x:-14,z:18},{x:-14,z:-18},{x:0,z:-29},{x:14,z:-18},{x:14,z:18}]},
} as const;

export function buildExpansion(root:T.Group,area:Exclude<ExpansionArea,'courtyard'>){
 const L=expansionLayout[area],bx=L.x,bz=L.z,solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[];
 root.name=`${area}-chapter`;
 const wall=surface(area==='plant'?'castConcrete':'decayWall',area==='annex'?'#b2b09b':'#86968c'),floor=surface(area==='annex'?'oldTile':'wornConcrete',area==='annex'?'#aaa897':'#858e86',{roughness:.63});
 const lower=surface('wall','#4b6054'),metal=surface('steel','#757c73',{roughness:.5,metalness:.48}),wood=surface('wood','#736553');
 const dark=new T.MeshStandardMaterial({color:'#161e1c',roughness:.78}),paper=new T.MeshStandardMaterial({color:'#c7bda3',roughness:.91}),rust=new T.MeshStandardMaterial({color:'#664b35',roughness:.83}),red=new T.MeshStandardMaterial({color:'#7e302b',roughness:.68});
 const blue=new T.MeshStandardMaterial({color:'#374e53',roughness:.67}),glass=new T.MeshPhysicalMaterial({color:'#637770',roughness:.24,transparent:true,opacity:.35});
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false,parent:T.Object3D=root){
  const mesh=new T.Mesh(boxUV(softBox(w,h,d,.012),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);if(solid)solids.push({x,z,w,d,y,h});return mesh;
 }
 function wallAt(x:number,z:number,w:number,d:number){box(x,1.4,z,w,2.8,d,wall,true);box(x,.43,z,w+.015,.86,d+.015,lower);box(x,.045,z,w+.025,.09,d+.025,dark);}
 function label(text:string,x:number,y:number,z:number,w=1.3,h=.4,ry=0,lit=false,dynamic=false){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.max(64,Math.round(768*h/w));const ctx=canvas.getContext('2d')!,lines=text.split('\n'),size=Math.min(canvas.height/(lines.length*1.5),700/Math.max(...lines.map(l=>l.length),1));
  ctx.fillStyle=lit?'#182d24':'#b6b098';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=lit?'#b6d1af':'#28372f';ctx.font=`${size}px "Apple SD Gothic Neo",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((line,i)=>ctx.fillText(line,384,canvas.height/2+(i-(lines.length-1)/2)*size*1.3));
  const map=new T.CanvasTexture(canvas);if(!dynamic)sharePrintedTexture(map,['expansion-label-v1',text,lit]);map.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(w,h),lit?new T.MeshBasicMaterial({map}):new T.MeshStandardMaterial({map,roughness:.91}));mesh.position.set(x,y,z);mesh.rotation.y=ry;root.add(mesh);return mesh;
 }
 function target(id:Action,caption:string,mesh:T.Object3D,p:[number,number,number],approach:[number,number]){mesh.userData.approach={x:approach[0],z:approach[1]};targets.push({id,label:caption,mesh,point:new T.Vector3(...p)});return mesh;}
 function fixture(x:number,z:number,power=3.2,color='#a4b6a3'){
  box(x,2.77,z,.13,.06,.92,metal);box(x,2.69,z,.19,.1,1.12,metal);box(x,2.635,z,.1,.013,.95,new T.MeshStandardMaterial({color:'#c5ccb9',emissive:'#a1ae93',emissiveIntensity:.45}));
  const light=new T.PointLight(color,power,9,2);light.position.set(x,2.52,z);light.userData.base=power;root.add(light);lamps.push(light);
 }
 function table(x:number,z:number,w=1.8,d=.8){
  const group=facilityTable(w,d,wood,metal);group.position.set(x,0,z);root.add(group);solids.push({x,z,w,d,y:.41,h:.82});return group;
 }
 function evidenceDesk(id:Action,title:string,x:number,z:number){table(x,z);
  const chair=facilityChair(wood,metal);chair.position.set(x,0,z-1);root.add(chair);
  solids.push({x,z:z-1,w:.5,d:.5,y:.46,h:.92});
  box(x,.8204,z,.32,.0008,.23,paper);const note=label(title,x,.8209,z,.32,.23);note.rotation.x=-Math.PI/2;return target(id,title,note,[x,.84,z+.1],[x,z+1]);}
 let storage:ReturnType<typeof storageMaterials>|undefined;
 function rack(x:number,z:number,w=2.4,d=.62,folders=true){
  const group=storageShelf(w,d,metal,storage??=storageMaterials(),Math.abs(Math.round(x*11+z*7)),!folders);group.position.set(x,0,z);root.add(group);
  solids.push({x,z,w,d,y:1.03,h:2.06});return group;
 }
 function valve(id:Action,title:string,x:number,z:number){
  roundPipe(root,[x,0,z],[x,2.6,z],.07,rust);box(x,.045,z,.24,.09,.24,metal);box(x,1.92,z+.055,1.03,.29,.06,metal);roundPipe(root,[x,1.22,z],[x,1.22,z+.27],.045,metal);
  const wheel=new T.Mesh(new T.TorusGeometry(.22,.022,8,28),red);wheel.position.set(x,1.22,z+.29);wheel.name=id;root.add(wheel);
  for(let i=0;i<3;i++){const spoke=new T.Mesh(new T.BoxGeometry(.38,.016,.018),red);spoke.rotation.z=i*Math.PI/3;wheel.add(spoke);}
  label(title,x,1.92,z+.1,1,.26);target(id,title,wheel,[x,1.22,z+.32],[x,z+1.1]);return wheel;
 }
 function puddle(x:number,z:number,w:number,d:number,opacity=.28){const mesh=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshPhysicalMaterial({map:wetTexture(false,Math.round(x*7+z*13)),color:'#233630',roughness:.06,transparent:true,opacity,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.009,z);root.add(mesh);return mesh;}
 // Broad footprint, human-scale 4 m spine and outer loop aisles around real rooms.
 box(0,-.12,0,bx*2,.24,bz*2,floor);box(0,2.91,0,bx*2,.22,bz*2,area==='annex'?wall:surface('castConcrete','#929c94'));
 for(const x of [-bx,bx]){
  if(area==='annex'&&x===bx){wallAt(x,(-bz+27.6)/2,.18,bz+27.6);wallAt(x,(31.4+bz)/2,.18,bz-31.4);box(x,2.625,29.5,.18,.35,3.8,wall,true);}
  else wallAt(x,0,.18,bz*2);
 }
 for(const side of [-1,1])wallAt(side*(bx+.72)/2,bz,bx-.72,.18);box(0,2.6,bz,1.44,.4,.18,wall);
 if(area!=='annex')connectionPassage(root,solids,lamps,-3,bz+6,0,.9);
 for(const side of [-1,1]){
  const segments=[[-bz,-27],[-24,-7],[-4,14],[17,25],[28,bz]];
  for(const [a,b] of segments){if(area==='annex'&&side===1&&a===28){wallAt(2,28.6,.15,1.2);wallAt(2,32.9,.15,2.2);}else wallAt(side*2,(a+b)/2,.15,b-a);}
  for(const z of [10,-11])wallAt(side*(bx/2-.5),z,bx-5,.15);
  for(const z of [15.5,-5.5,-25.5]){box(side*2,2.56,z,.2,.48,3,wall);for(const dz of [-1.5,1.5])box(side*2,1.2,z+dz,.21,2.4,.065,wood);}
  for(const z of [21,-19])fixture(side*(bx-4),z,area==='plant'?2.5:3.4,side<0?'#b9a789':'#92b1aa');
  roundPipe(root,[side*(bx-.25),2.5,-bz+.2],[side*(bx-.25),2.5,bz-.2],.036,rust);
  for(let z=-bz+4;z<bz-2;z+=6){box(side*(bx-.25),2.5,z,.11,.1,.09,metal);roundPipe(root,[side*(bx-.25),2.5,z],[side*(bx-.1),2.5,z],.014,metal);}
 }
 for(const z of [-28,-14,2,18,30])fixture(0,z,2.8);
 for(const x of [-.77,.77])box(x,1.2,bz-.12,.08,2.4,.18,metal);label(area==='annex'?'관리용 승강기 · 1F':area==='archive'?'중정 계단':'기록보관실',0,2.59,bz-.094,1.8,.24,Math.PI,true);
 for(const side of [-1,1])for(const [i,z] of [[0,15.5],[1,-5.5]] as const)label(L.rooms[(side<0?0:2)+i],side*2.104,2.54,z,1.6,.28,side<0?-Math.PI/2:Math.PI/2);
 for(const z of [26,-23]){label(`← ${L.rooms[0]}   ${L.rooms[2]} →`,0,2.49,z,3.1,.25,0,true);label(`↓ ${L.exit}`,0,2.2,z,2.5,.24,0,true);box(0,2.36,z-.035,3.2,.57,.05,metal);for(const x of [-1.2,1.2])roundPipe(root,[x,2.64,z],[x,2.8,z],.009,metal);}
 // Exit leaf, real opening, and an enclosed onward passage.
 const doorZ=-bz+.35;
 for(const side of [-1,1])wallAt(side*(bx+.75)/2,-bz,bx-.75,.18);
 box(0,2.61,-bz,1.5,.38,.18,wall);
 const hinge=new T.Group();hinge.name='expansion-exit-door';hinge.position.set(-.7,0,doorZ);root.add(hinge);
 const leaf=box(.7,1.17,0,1.37,2.34,.08,metal,false,hinge);doorHardware(leaf,1.37);
 const doorBlock={x:0,z:doorZ,w:1.4,d:.12,y:1.17,h:2.34};solids.push(doorBlock);
 target(`${area}_exit` as Action,L.exit,leaf,[0,1.2,doorZ+.12],[0,doorZ+1.2]);
 label(L.exit,0,2.55,-bz+.094,1.6,.25,0,true);
 connectionPassage(root,solids,lamps,0,-bz);
 const heightAt=(_x:number,_z:number)=>0;
 let display:T.Mesh|undefined;let intercom:ReturnType<typeof createAnsweringMachine>|undefined,intercomStatus='';
 let surveillance:Surveillance|undefined;
 const archiveReview=area==='archive'?createArchiveReview():undefined;
 const faceText=(text:string)=>{if(!display)return;const map=(display.material as T.MeshStandardMaterial).map! as T.CanvasTexture;const c=map.image as HTMLCanvasElement,ctx=c.getContext('2d')!;ctx.fillStyle='#101d18';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#b7cdae';ctx.font=`${Math.min(c.height*.26,650/Math.max(1,...text.split('\n').map(l=>l.length)))}px sans-serif`;ctx.textAlign='center';text.split('\n').forEach((l,i)=>ctx.fillText(l,c.width/2,c.height*(.34+i*.3)));map.needsUpdate=true;};
 const X=bx-6;
 let water:T.Mesh|undefined;
 let filterCloth:T.Group|undefined,routeHandle:T.Group|undefined,fan:T.Group|undefined,pumpMotor:T.Group|undefined;
 let suctionNeedle:T.Group|undefined,pressureNeedle:T.Group|undefined,suctionLast:T.Group|undefined,pressureLast:T.Group|undefined;
 let looseFuse:T.Group|undefined,installedFuse:T.Group|undefined,badge:T.Group|undefined;
 const recordings:{id:Action;mesh:T.Group}[]=[];
 if(area==='annex'){
  box(0,-.1,bz+1.35,2.2,.2,2.7,floor);box(0,2.83,bz+1.35,2.2,.12,2.7,metal);
  for(const x of [-1.1,1.1])box(x,1.4,bz+1.35,.12,2.8,2.7,metal,true);box(0,1.4,bz+2.7,2.2,2.8,.12,metal,true);
  for(const x of [-.7,.7])box(x,1.18,bz,.12,2.36,.16,dark);box(0,.012,bz,1.35,.023,.22,metal);

  const lobby=buildAnnexLobby(root,solids,lamps);fixture(10.5,30,2.2,'#9eaf9f');
  target('annex_map','공동시설 안내도',lobby.map,[-1.89,1.52,29],[-.8,29]);
  target('annex_front_exit','정문 손잡이 확인',lobby.door,lobby.frontPoint.toArray(),[15.8,29.64]);
  // Mail slots, laundry machines, employee lockers and the abandoned switchboard.
  buildAnnexWestWing(root,solids);
  evidenceDesk('annex_notice','2803호 · 반송 안내문',-X,20);
  evidenceDesk('annex_fuse','통신용 퓨즈 · 정비표',-X,0);
  box(-X+.49,.8205,0,.12,.001,.075,paper);
  looseFuse=cartridgeFuse(metal);looseFuse.name='annex-fuse-pickup';looseFuse.position.set(-X+.49,.8248,0);root.add(looseFuse);
  const fuseTarget=targets.find(t=>t.id==='annex_fuse')!;fuseTarget.mesh=looseFuse;fuseTarget.point.set(-X+.49,.83,0);looseFuse.userData.approach={x:-X+.49,z:1};
  const fuseLabel=label('6A · 통신 예비',-X+.49,.8211,-.025,.1,.018);fuseLabel.rotation.x=-Math.PI/2;
  for(let i=0;i<5;i++){const x=X-2.4+i*.9;box(x,1.04,23,.82,2.08,.58,metal,true);box(x,1.06,23.305,.75,1.96,.027,blue);box(x+.23,1.14,23.338,.028,.16,.034,dark);for(const y of [.32,.36,.40,1.89,1.93])box(x,y,23.324,.46,.012,.016,dark);for(const y of [.40,1.65])box(x-.36,y,23.328,.026,.11,.025,metal);box(x,.08,23,.86,.16,.62,dark);label(i===2?'한서연':'당직',x,1.77,23.325,.42,.18);}
  evidenceDesk('annex_badge','한서연 · 야간 당직 명찰',X,20);const shoe=createLeatherShoe('#242a27',false);shoe.position.set(X+1.3,0,23.5);root.add(shoe);
  badge=new T.Group();badge.name='annex-badge-pickup';badge.position.set(X+.49,.821,20);root.add(badge);
  box(0,.0015,0,.095,.003,.065,glass,false,badge);box(0,.0016,0,.086,.001,.054,paper,false,badge);
  const badgeFace=label('백로아파트 시설관리\n한서연\n야간 당직 · 0917',X+.49,.8243,20,.082,.05);badgeFace.rotation.x=-Math.PI/2;badge.attach(badgeFace);
  for(const [a,b] of [[[0,.002,-.032],[.018,.002,-.057]],[[.018,.002,-.057],[.10,.002,-.09]],[[.10,.002,-.09],[.13,.002,-.07]],[[.13,.002,-.07],[.055,.002,-.043]],[[.055,.002,-.043],[0,.002,-.032]]] as [[number,number,number],[number,number,number]][])roundPipe(badge,a,b,.0017,dark);
  const badgeTarget=targets.find(t=>t.id==='annex_badge')!;badgeTarget.mesh=badge;badgeTarget.point.set(X+.49,.84,20);badge.userData.approach={x:X+.49,z:21};
  // The open source cabinet meets the actual corridor wall; the door and body
  // have separate collision volumes so the open cavity remains usable.
  const restore=facilityModel('power_box_01');restore.name='annex-power-cabinet';restore.scale.setScalar(1.868);restore.rotation.y=Math.PI/2;restore.position.set(2.165,1.42,-2);root.add(restore);
  target('annex_restore','통신 전원함 · 퓨즈 연결',restore,[2.265,1.08,-1.82],[3.6,-2]);restore.userData.approach={x:3.6,z:-2};
  solids.push({x:2.165,z:-2.004,w:.177,d:.646,y:1.42,h:.94},{x:2.531,z:-1.583,w:.583,d:.236,y:1.42,h:.92});
  box(2.2075,1.08,-1.82,.033,.075,.045,dark);for(const y of [1.064,1.096])box(2.226,y,-1.82,.01,.008,.017,metal);
  installedFuse=cartridgeFuse(metal);installedFuse.name='annex-fuse-installed';installedFuse.position.set(2.234,1.08,-1.82);installedFuse.rotation.z=Math.PI/2;root.add(installedFuse);
  label('통신 / 6A',2.245,1.015,-1.82,.075,.02,Math.PI/2);
  evidenceDesk('annex_call','03:20 · 비상벨 녹음기',X,-5);
  const recorder=facilityModel('cassette_player');recorder.name='annex-call-recorder';recorder.rotation.x=-Math.PI/2;recorder.position.set(X+.57,.8205,-5);root.add(recorder);
  const callTarget=targets.find(t=>t.id==='annex_call')!;callTarget.mesh=recorder;callTarget.point.set(X+.57,.86,-5);recorder.userData.approach={x:X+.57,z:-4};
  roundPipe(root,[X+.629,.854,-5.08],[X+.8,.854,-5.08],.0025,dark);roundPipe(root,[X+.8,.854,-5.08],[X+.8,.824,-5.36],.0025,dark);
  table(0,-21,2.4,1);const crt=createCRT();crt.root.name='annex-crt-monitor';crt.root.position.set(-.35,.82,-20.9);root.add(crt.root);
  display=label('통화 기록 확인',0,0,0,.72,.54,0,true,true);display.geometry.dispose();display.geometry=crtScreenGeometry(.72,.54);display.name='annex-crt-status';crt.screenMount.add(display);
  intercom=createAnsweringMachine('intercom');intercom.root.position.set(.7,.82,-20.86);intercom.root.rotation.y=Math.PI;intercom.root.scale.setScalar(1.35);root.add(intercom.root);
  function dialTarget(id:Action,title:string,mesh:T.Mesh){const p=mesh.getWorldPosition(new T.Vector3());target(id,title,mesh,[p.x,p.y,p.z],[.7,-19.7]);targets.at(-1)!.precise=true;}
  for(const {mesh,label:key} of intercom.keys)dialTarget(key==='*'?'annex_clear':key==='#'?'annex_dial':`annex_digit_${key}` as Action,key==='*'?'지우기 / 통화 종료':key==='#'?'세대 / 내선 호출':key+' 입력',mesh);
  dialTarget('annex_dial','CALL · 세대 / 내선 호출',intercom.playButton);dialTarget('annex_clear','CLEAR · 지우기 / 종료',intercom.stopButton);
  label('구내 전용 · 외부 발신 불가\n세대 4자리 / 당직 내선 17\n숫자·Enter 호출 / CLEAR 종료',-.65,.821,-20.75,.58,.28).rotation.x=-Math.PI/2;
  const socket=createCrtSocket();socket.root.position.set(1.925,.27,-21.8);socket.root.rotation.y=-Math.PI/2;root.add(socket.root);root.updateMatrixWorld(true);const power=crt.powerPort.clone().applyMatrix4(crt.root.matrixWorld),lead=socket.lead.clone().applyMatrix4(socket.root.matrixWorld);
  crtCable(root,[power,new T.Vector3(power.x,.87,-21.55),new T.Vector3(power.x,.0035,-21.65),new T.Vector3(lead.x,.0035,lead.z),lead]);
  roundPipe(root,[2.12,1.89,-2],[2.12,2.8,-2],.019,metal);
  const restChair=facilityChair(wood,metal);restChair.position.set(X+2,0,20);restChair.rotation.y=-.4;root.add(restChair);solids.push({x:X+2,z:20,w:.65,d:.65,y:.44,h:.88});
  rack(-X,-18,4,.65);table(X,-18,2.5);for(const x of [X-1,X+.2])box(x,.87,-18,.75,.1,.45,paper);
  puddle(-X,4,3,4);puddle(0,9,1.5,6);
 }else if(area==='archive'){
  evidenceDesk('archive_ledger','기록 인계 대장',.2,27);
  evidenceDesk('archive_road','A / 정문 도로 영상',-X,20);evidenceDesk('archive_call','B / 비상 호출 기록',X,20);evidenceDesk('archive_gate','C / 지하 입차 영상',-X,-3);
  for(const side of [-1,1])for(const z of [16,23,-2,-7,-18])for(const dx of [-2.4,1.6]){if(side===1&&z===-18)continue;rack(side*X+dx,z===-18?-16.8:z,2.2,.64);}
  for(const [x,z,title] of [[-X,23,'A · 정문 도로'],[X,23,'B · 통화 기록'],[-X,-7,'C · 지하 입차']] as const){
   // The plate overlaps the upper shelf edge, not the aisle between two racks.
   box(x+1.6,1.93,z+.317,1.34,.26,.018,metal);label(title,x+1.6,1.93,z+.328,1.3,.24);
  }
  // A real maintenance editing booth, with one open doorway and a service window.
  // The low sill blocks bodies but leaves a genuine eye-level view of the aisle.
  wallAt(9.5,-24,7.55,.14);wallAt(9.5,-16,7.55,.14);wallAt(13.2,-20,.14,8);
  wallAt(5.8,-22.95,.14,2.1);wallAt(5.8,-18.05,.14,.3);wallAt(5.8,-16.25,.14,.5);
  box(5.8,.45,-20.05,.14,.9,3.7,lower,true);box(5.8,2.57,-20.05,.14,.46,3.7,wall,true);
  for(const z of [-21.9,-18.2])box(5.8,1.62,z,.19,1.44,.055,metal,true);
  for(const y of [.92,2.33])box(5.8,y,-20.05,.24,.055,3.75,metal);
  box(5.8,2.58,-17.2,.14,.44,1.4,wall);for(const z of [-17.9,-16.5])box(5.8,1.16,z,.2,2.32,.045,metal);
  label('기록 편집실',5.706,2.52,-17.2,1.1,.2,-Math.PI/2);
  fixture(9.8,-22,2.1,'#a4b1a1');
  // Wall trunking and drops terminate on the equipment, rather than hanging in air.
  roundPipe(root,[12.98,2.49,-23.7],[12.98,2.49,-20.6],.012,metal);
  roundPipe(root,[12.98,2.49,-20.6],[12.98,.08,-20.6],.012,metal);
  roundPipe(root,[12.98,.08,-20.6],[12.98,.0035,-20.6],.004,dark);
  table(X,-20,3.6,1);
  const crt=createCRT(true);crt.root.name='archive-crt-monitor';crt.root.position.set(X,.82,-19.93);root.add(crt.root);target('archive_play','복원된 기록 재생',crt.root,[X,1.157,-19.88],[X,-18.9]);
  const screen=createSurveillance();crt.screenMount.add(screen);surveillance=screen.userData.surveillance;root.updateMatrixWorld(true);
  const power=crt.powerPort.clone().applyMatrix4(crt.root.matrixWorld),video=crt.videoPort.clone().applyMatrix4(crt.root.matrixWorld);
  crtCable(root,[power,new T.Vector3(power.x,.88,-20.57),new T.Vector3(power.x,.0035,-20.6),new T.Vector3(12.98,.0035,-20.6)]);
  crtCable(root,[video,new T.Vector3(video.x,.98,-20.34),new T.Vector3(X-1.2,.98,-20.34),new T.Vector3(X-1.2,.90,-20.199)]);
  for(const dx of [-1.2,1.2]){box(X+dx,.89,-20,.55,.14,.4,metal);box(X+dx,.89,-19.793,.48,.09,.018,dark);for(const ox of [-.14,.14])box(X+dx+ox,.89,-19.778,.045,.045,.025,metal);}
  crtCable(root,[new T.Vector3(X+1.3,.85,-20.199),new T.Vector3(X+1.3,.0035,-20.57),new T.Vector3(12.98,.0035,-20.6)]);
  box(12.95,2.71,-23.65,.035,.18,.035,metal);const cameraCase=new T.Group();cameraCase.name='archive-cctv-camera';cameraCase.position.set(...archiveCamera.position);cameraCase.lookAt(...archiveCamera.lookAt);root.add(cameraCase);
  box(0,0,0,.18,.12,.32,metal,false,cameraCase);const lens=new T.Mesh(new T.CylinderGeometry(.041,.041,.02,20),dark);lens.rotation.x=Math.PI/2;lens.position.z=.169;cameraCase.add(lens);
  const deck=createArchiveDeck();deck.root.position.set(X,.82,-19.7);root.add(deck.root);root.updateMatrixWorld(true);
  for(const {id,label:title,mesh} of deck.controls){const p=mesh.getWorldPosition(new T.Vector3());p.y+=.007;target(id,title,mesh,[p.x,p.y,p.z],[X,-19.12]);targets.at(-1)!.precise=true;}
  const deckPower=deck.power.clone().applyMatrix4(deck.root.matrixWorld),deckLink=deck.link.clone().applyMatrix4(deck.root.matrixWorld);
  crtCable(root,[deckPower,new T.Vector3(deckPower.x,.885,-20.42),new T.Vector3(deckPower.x,.0035,-20.6),new T.Vector3(12.98,.0035,-20.6)]);
  crtCable(root,[deckLink,new T.Vector3(X+.44,.885,deckLink.z),new T.Vector3(X+.44,.885,-20.42),new T.Vector3(X-1.2,.885,-20.42),new T.Vector3(X-1.2,.90,-20.199)]);
  for(const [id,x,z,title] of [['archive_road',-X,20,'A · 03:17 / 도로'],['archive_call',X,20,'B · 03:20 / 통화'],['archive_gate',-X,-3,'C · 03:26 / 입차']] as const){
   const recording=id==='archive_call'?facilityModel('cassette_tape'):videoCassette(dark,paper,glass);
   if(id==='archive_call'){recording.rotation.x=-Math.PI/2;recording.position.y=-.039985;}
   const prop=new T.Group();prop.name=id+'-original';prop.userData.recording=true;prop.add(recording);prop.position.set(x+.48,.8205,z);root.add(prop);recordings.push({id,mesh:prop});
   if(id!=='archive_call'){const tag=label(title,x+.48,.84655,z+.029,.095,.018);tag.rotation.x=-Math.PI/2;prop.attach(tag);}
   const t=targets.find(t=>t.id===id)!;t.mesh=prop;t.point.set(x+.48,.86,z);prop.userData.approach={x:id==='archive_gate'?x:x+.48,z:z+1};
  }
  for(const x of [-X-.8,-X+.8])box(x,.12,-22,.95,.24,.7,wood,true);puddle(-X,-19,4,7);label('임의 폐기 금지\n사고 관련 원본 보존',0,2.1,7,2,.55,0);box(0,2.1,6.97,2.08,.62,.04,metal);for(const x of [-.8,.8])roundPipe(root,[x,2.41,7],[x,2.8,7],.009,metal);
 }else{
  const paint=surface('paintedMetal','#c1c8c4');
  const diagram=label('서측 저장탱크 / 동측 급수관\n↓ 集水井 · 집수정 ↓\n흡입망 → 펌프 → 토출 선택기\n환수 / 차단 / 외부 우수관\n서측: 배관 점검 · 동측: 전기실',1.91,1.5,29,2,1.15,-Math.PI/2);target('plant_diagram','배수 계통도 확인',diagram,[1.89,1.5,29],[.8,29]);
  for(const side of [-1,1])for(const z of [21,-3,-23]){
   const x=side*X,tank=waterTank(paint,dark,rust);tank.position.set(x,0,z);root.add(tank);solids.push({x,z,w:2.8,d:2.8,y:1.3,h:2.6});
   roundPipe(root,[x,2.64,z],[side*(bx-.25),2.64,z],.1,rust);roundPipe(root,[side*(bx-.25),2.64,z],[side*(bx-.25),2.5,z],.1,rust);
   for(const px of [x,side*(bx-2)]){roundPipe(root,[px,2.64,z],[px,2.8,z],.012,metal);box(px,2.79,z,.18,.02,.14,metal);}

  }
  roundPipe(root,[-X+3,2.6,19],[-X,2.6,19],.07,rust);roundPipe(root,[-X,2.6,19],[-X,2.49,21],.07,rust);roundPipe(root,[X+3,2.6,-3],[X,2.49,-3],.07,rust);
  valve('plant_valve_west','서측 급수 차단',-X+3,19);valve('plant_valve_east','동측 급수 차단',X+3,-3);
  for(const [i,id,title] of [[0,'plant_circuit_pump','배수'],[1,'plant_circuit_air','환기'],[2,'plant_circuit_lights','외부조명']] as const){const x=X+(i-1)*.75;box(x,1.05,-18,.67,2.1,.21,metal,true);const lever=box(x,1.32,-17.84,.12,.26,.12,red);lever.name=id;target(id,title+' 회로 전환',lever,[x,1.35,-17.73],[x,-16.8]);label(title,x,1.8,-17.882,.55,.18);}
  box(X-2.4,.61,-18,.12,1.22,.12,metal);box(X-2.4,.025,-18,.4,.05,.4,metal);const start=box(X-2.4,1.26,-18,.43,.47,.24,paint);target('plant_start','배수 펌프 기동',start,[X-2.4,1.26,-17.86],[X-2.4,-16.8]);label('배수 기동',X-2.4,1.41,-17.878,.3,.07);
  for(const [radius,depth,z,m] of [[.045,.018,-17.871,metal],[.031,.027,-17.857,new T.MeshStandardMaterial({color:'#286748',roughness:.45})]] as const){const button=new T.Mesh(new T.CylinderGeometry(radius,radius,depth,24),m);button.rotation.x=Math.PI/2;button.position.set(X-2.4,1.23,z);root.add(button);}
  for(const x of [-.17,.17])for(const y of [-.19,.19]){const screw=new T.Mesh(new T.CylinderGeometry(.006,.006,.008,8),metal);screw.rotation.x=Math.PI/2;screw.position.set(X-2.4+x,1.26+y,-17.877);root.add(screw);}
  roundPipe(root,[X-2.4,1.02,-18],[X-2.4,.08,-18],.012,dark);
  box(X,2.31,-18,2.3,.4,.06,metal);label('환기 연동 · 모터 보호\n외부조명 누전: 사용 금지',X,2.31,-17.964,2.22,.34);
  // Ventilation is mechanically readable before the pump is started.
  const fanCase=new T.Group();fanCase.name='plant-ventilator';fanCase.position.set(X+2,2.42,-18);root.add(fanCase);
  for(const x of [-.19,.19])box(x,-.16,0,.04,.32,.1,metal,false,fanCase);
  box(X+2,1.12,-18,.55,2.24,.14,paint,true);
  const housing=new T.Mesh(new T.CylinderGeometry(.27,.27,.14,32),dark);housing.rotation.x=Math.PI/2;fanCase.add(housing);
  fan=new T.Group();fan.name='plant-fan-rotor';fan.position.z=.08;fanCase.add(fan);
  for(let i=0;i<5;i++){const blade=box(0,.12,0,.075,.22,.012,metal,false,fan);blade.rotation.z=i*Math.PI*2/5;blade.position.set(-Math.sin(blade.rotation.z)*.12,Math.cos(blade.rotation.z)*.12,0);}
  const guard=new T.Mesh(new T.TorusGeometry(.265,.012,6,32),metal);guard.position.z=.11;fanCase.add(guard);
  for(let i=0;i<4;i++){const bar=box(0,0,.12,.51,.008,.009,metal,false,fanCase);bar.rotation.z=i*Math.PI/4;}
  display=label('수위 HIGH\n급수 차단 후 전원 연결',0,1.65,-26,1.4,.55,0,false,true);box(0,1.62,-26.1,1.6,.75,.16,metal);for(const x of [-.6,.6])box(x,.63,-26.1,.07,1.26,.07,metal);
  // Flood stays below the dry raised perimeter; a visible grille blocks the central shortcut.
  water=puddle(0,-20,3.5,19,.68);water.position.y=.075;
  box(0,.24,-15,3.5,.48,.16,metal,true);for(let x=-1.5;x<=1.5;x+=.25)box(x,.59,-15,.019,.7,.03,metal);
  box(0,.75,-14.982,2.08,.32,.025,metal);label('침수 · 좌우 통로로 우회',0,.75,-14.9675,2,.28);
  rack(-X,2,2.5,.7,false);
  for(const z of [-3,-6]){const x=-X+4.8,pump=pumpSkid(metal,paint,dark,rust);pump.position.set(x,0,z);root.add(pump);if(z===-3)pumpMotor=pump;solids.push({x,z,w:1.7,d:1.1,y:.5,h:1});
   roundPipe(root,[x+.4,1,z],[x+.4,1.1,z],.075,paint);roundPipe(root,[x+.4,1.1,z],[-3.75,1.1,z],.075,paint);solids.push({x:(x+.4-3.75)/2,z,w:2.2,d:.2,y:.6,h:1.2});
  }
  // Both pump outlets join a supported selector; branches remain above the walking aisles.
  roundPipe(root,[-3.75,1.1,-6],[-3.75,1.1,-3],.075,paint);solids.push({x:-3.75,z:-4.5,w:.23,d:3.25,y:.6,h:1.2});
  for(const z of [-6,-3]){box(-3.75,.025,z,.36,.05,.36,metal);roundPipe(root,[-3.75,.05,z],[-3.75,1.1,z],.022,metal);}
  box(-3.75,1.1,-3,.27,.27,.27,paint,true);
  roundPipe(root,[-3.75,1.1,-3],[-3.75,1.1,-3.8],.075,paint);roundPipe(root,[-3.75,1.1,-3.8],[-3.75,0,-3.8],.075,paint);
  roundPipe(root,[-3.75,1.1,-3],[-3.75,2.5,-3],.075,paint);roundPipe(root,[-3.75,2.5,-3],[-3.75,2.5,-9.8],.075,paint);roundPipe(root,[-3.75,2.5,-9.8],[-bx+.08,2.5,-9.8],.075,paint);
  for(const x of [-4.2,-8,-13,-bx+.15]){roundPipe(root,[x,2.5,-9.8],[x,2.8,-9.8],.013,metal);box(x,2.79,-9.8,.2,.02,.2,metal);}
  for(const z of [-4,-8]){roundPipe(root,[-3.75,2.5,z],[-3.75,2.8,z],.013,metal);box(-3.75,2.79,z,.2,.02,.2,metal);}
  const flange=new T.Mesh(new T.CylinderGeometry(.16,.16,.05,24),metal);flange.rotation.z=Math.PI/2;flange.position.set(-bx+.1,2.5,-9.8);root.add(flange);
  label('외부 우수관 ←',-5,2.29,-9.69,1.45,.24);roundPipe(root,[-5,2.41,-9.8],[-5,2.5,-9.8],.009,metal);
  label('집수정 환수 ↓',-3.75,.75,-3.69,1.1,.23);box(-3.75,.75,-3.73,1.15,.27,.07,metal);
  box(-3.75,1.26,-2.89,.8,.47,.07,metal);label('차단',-3.75,1.43,-2.852,.17,.065);label('환수',-4.02,1.3,-2.852,.17,.065);label('외부배수',-3.48,1.3,-2.852,.24,.065);
  routeHandle=new T.Group();routeHandle.name='plant-route-handle';routeHandle.position.set(-3.75,1.1,-2.82);root.add(routeHandle);
  roundPipe(routeHandle,[0,0,-.18],[0,0,0],.025,metal);box(0,.11,.01,.045,.24,.045,red,false,routeHandle);
  target('plant_route','토출 선택기 돌리기',routeHandle,[-3.75,1.17,-2.78],[-3.75,-1.8]);
  // The cloth is supported on a real basket grate, not suspended over the pump.
  box(-5.8,.05,-1.9,.75,.1,.75,dark,true);const basketMaterial=paint.clone();basketMaterial.side=T.DoubleSide;const basket=new T.Mesh(new T.CylinderGeometry(.27,.3,.31,24,1,true),basketMaterial);basket.position.set(-5.8,.255,-1.9);root.add(basket);
  solids.push({x:-5.8,z:-1.9,w:.75,d:.75,y:.24,h:.48});
  const rim=new T.Mesh(new T.TorusGeometry(.27,.018,8,32),metal);rim.rotation.x=Math.PI/2;rim.position.set(-5.8,.425,-1.9);root.add(rim);
  for(let x=-.2;x<=.2;x+=.05)box(-5.8+x,.432,-1.9,.012,.008,Math.sqrt(.26*.26-x*x)*2,metal);
  roundPipe(root,[-5.8,.2,-2.13],[-5.8,.2,-2.52],.085,paint);roundPipe(root,[-5.8,.2,-2.52],[-5.8,0,-2.52],.085,paint);
  filterCloth=new T.Group();filterCloth.name='plant-blocked-filter';root.add(filterCloth);
  const clothHeight=(x:number,z:number)=>.001+.016*(.5+.5*Math.cos(x*42))*(.5+.5*Math.sin(z*35))-Math.max(0,Math.hypot(x,z)-.265)*1.6;
  const clothGeo=new T.PlaneGeometry(.48,.44,24,22);clothGeo.rotateX(-Math.PI/2);const clothPos=clothGeo.getAttribute('position');for(let i=0;i<clothPos.count;i++)clothPos.setY(i,clothHeight(clothPos.getX(i),clothPos.getZ(i)));clothGeo.computeVertexNormals();
  const cloth=new T.Mesh(clothGeo,upholstery('#bdb59e'));cloth.material.side=T.DoubleSide;cloth.position.set(-5.8,.436,-1.9);cloth.castShadow=true;cloth.receiveShadow=true;filterCloth.add(cloth);
  for(let i=0;i<4;i++){const points=Array.from({length:13},(_,k)=>{const x=-.17+k*.026,z=-.09+i*.053+Math.sin(k*.45+i)*.018;return new T.Vector3(-5.8+x,.438+clothHeight(x,z),-1.9+z);});const strand=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.0014,4,false),dark);filterCloth.add(strand);}
  const ring=new T.Mesh(new T.TorusGeometry(.017,.0025,6,20),metal);ring.rotation.x=-Math.PI/2;ring.position.set(-5.65,.4385+clothHeight(.15,.1),-1.8);filterCloth.add(ring);
  target('plant_filter','흡입망에 걸린 천 걷어내기',filterCloth,[-5.8,.45,-1.9],[-5.8,-.5]);
  box(-5.8,.69,-2.168,.74,.15,.032,metal);label('01 흡입망 · 이물 확인',-5.8,.69,-2.15,.7,.11);roundPipe(root,[-5.8,.41,-2.19],[-5.8,.69,-2.18],.012,metal);
  function gauge(name:string,x:number,y:number,z:number,caption:string){
   roundPipe(root,[x,1.1,z-.08],[x,y-.12,z-.08],.018,metal);
   const group=new T.Group();group.name=name;group.position.set(x,y,z);root.add(group);
   const casing=new T.Mesh(new T.CylinderGeometry(.145,.145,.06,32),metal);casing.rotation.x=Math.PI/2;group.add(casing);
   const face=new T.Mesh(new T.CircleGeometry(.129,32),paper);face.position.z=.031;group.add(face);
   for(let i=0;i<=10;i++){const a=2.4-i*.48,tick=box(-Math.sin(a)*.108,Math.cos(a)*.108,.034,.008,.02,.003,i>=8?red:dark,false,group);tick.rotation.z=a;}
   const last=new T.Group();last.name=name+'-last-test';last.position.z=.037;last.visible=false;group.add(last);box(0,.038,0,.009,.08,.003,new T.MeshStandardMaterial({color:'#e3a43e',roughness:.65}),false,last);
   const needle=new T.Group();needle.name=name+'-needle';needle.position.z=.038;group.add(needle);box(0,.046,0,.007,.103,.003,red,false,needle);
   box(x,y+.26,z+.015,.65,.19,.026,metal);label(caption+'\n노랑=직전시험 / 빨강=현재',x,y+.26,z+.03,.61,.15);roundPipe(root,[x,y+.13,z],[x,y+.26,z],.006,metal);return {needle,last};
  }
  const pressure=gauge('plant-pressure',-4.4,1.52,-2.92,'토출 MPa');pressureNeedle=pressure.needle;pressureLast=pressure.last;
  roundPipe(root,[-5.8,.2,-2.4],[-5.8,1.1,-2.4],.018,metal);const suction=gauge('plant-suction',-5.8,1.3,-2.32,'흡입 · 막힘 →');suctionNeedle=suction.needle;suctionLast=suction.last;
  for(const x of [X-.75,X,X+.75]){box(x,.06,-18,.7,.12,.36,dark);for(const y of [.42,.47,.52])box(x,y,-17.887,.4,.016,.018,dark);for(const y of [.45,1.7])box(x-.29,y,-17.88,.03,.12,.025,metal);roundPipe(root,[x,2.1,-18],[x,2.79,-18],.022,metal);}
  roundPipe(root,[X-1.1,2.72,-18],[X+1.1,2.72,-18],.04,metal);
  for(const z of [24,0,-24])roundPipe(root,[-bx+.3,2.6,z],[bx-.3,2.6,z],.07,rust);
 }
 // Perimeter fixtures follow each room's use, with real wall returns and feet.
 if(area==='annex')for(const side of [-1,1])for(const z of [8,-10]){
  const x=side*(bx-.52);box(x,.43,z,.38,.72,2.2,metal);for(let k=0;k<12;k++)box(x-side*.22,.43,z-.98+k*.178,.08,.65,.1,metal);
  for(const dz of [-.8,.8]){box(x,.07,z+dz,.26,.14,.09,metal);roundPipe(root,[x,.55,z+dz],[side*(bx-.1),.55,z+dz],.018,rust);}solids.push({x,z,w:.58,d:2.2,y:.4,h:.8});
 }
 for(const side of [-1,1]){
  const x=side*(bx-2),z=-29;
  if(area==='plant'){rack(x,z,2.2,.65,false);}
  else {table(x,z,2.2,.65);for(let i=0;i<3;i++){box(x-.68+i*.63,.99,z,.53,.34,.52,paper);label(area==='archive'?'원본 보존':'설비 부품',x-.68+i*.63,1,z+.269,.32,.12);}}
 }
 // Surface wear, supported extinguishers, floor drains and room numbers are shared details.
 for(const side of [-1,1])for(const z of [26,-25]){box(side*1.86,.18,z,.13,.36,.2,red);roundPipe(root,[side*1.86,.18,z],[side*1.86,.43,z],.016,metal);box(side*1.93,.2,z,.025,.4,.28,metal);}
 for(const z of [-27,-3,21]){box(-1.45,.009,z,.3,.012,1.1,metal);for(let dz=-.45;dz<.5;dz+=.07)box(-1.45,.017,z+dz,.25,.008,.016,dark);}
 const figure=createGhost(root);figure.position.set(0,0,bz-2);figure.rotation.y=Math.PI;figure.visible=false;
 let opened=-1,drainAt=-1,replayAt=-1,lastDisplay='',plantAttemptAt=-10;
 function recordPlantTrial(story:Story){
  if(suctionLast){suctionLast.visible=true;suctionLast.rotation.z=2.4-(plantFilterCleared(story)?1.2:4.6);}
  if(pressureLast){pressureLast.visible=true;pressureLast.rotation.z=2.4-(plantRoute(story)==='closed'?4.6:plantRoute(story)==='drain'?2.5:.6);}
 }
 function updateStory(stage:Stage,time:number,reduced=false,story?:Story,occupants:Occupant[]=[]){
  const leaving=stage===`${area}_departure`;if(leaving&&opened<0)opened=time;
  if(opened>=0)setDoorAngle(hinge,doorBlock,1.5*T.MathUtils.smoothstep(time-opened,0,reduced?.2:.9),.7,0,occupants);
  const notes=story?.notes??[];
  if(looseFuse)looseFuse.visible=!notes.includes('annex_fuse');if(installedFuse)installedFuse.visible=notes.includes('annex_fuse')&&!['annex_arrival','annex_fuse','annex_restore'].includes(stage);if(badge)badge.visible=!notes.includes('annex_badge');
  for(const {id,mesh} of recordings)mesh.visible=!notes.includes(id);
  for(const id of ['plant_valve_west','plant_valve_east']){const wheel=root.getObjectByName(id);if(wheel&&notes.includes(id))wheel.rotation.z=-Math.PI*.6;}
  for(const id of ['plant_circuit_pump','plant_circuit_air','plant_circuit_lights']){const lever=root.getObjectByName(id);if(lever)lever.rotation.x=story?.circuit.includes(id as Action)?-.5:.5;}
  if(stage==='plant_drain'&&drainAt<0){drainAt=time;if(story)recordPlantTrial(story);}
  const drained=['plant_exit_ready','plant_departure'].includes(stage),drain=drained?1:drainAt>=0?T.MathUtils.clamp((time-drainAt)/12,0,1):0;
  if(water){water.position.y=.075-drain*.067;(water.material as T.MeshPhysicalMaterial).opacity=.68-drain*.42;}
  if(area==='plant'&&story){
   const running=stage==='plant_drain',pulse=T.MathUtils.clamp((time-plantAttemptAt)/1.4,0,1),trial=pulse>0&&pulse<1?Math.sin(Math.PI*pulse):0,power=running?1:trial,route=plantRoute(story);
   if(filterCloth)filterCloth.visible=!plantFilterCleared(story);
   if(routeHandle)routeHandle.rotation.z=route==='drain'?-.85:route==='closed'?0:.85;
   if(fan)fan.rotation.z=running||story.circuit.includes('plant_circuit_air')?time*(reduced?.8:11):0;
   if(pumpMotor)pumpMotor.position.x=-X+4.8+(reduced?0:Math.sin(time*59)*.0015*power);
   if(suctionNeedle)suctionNeedle.rotation.z=2.4-power*(plantFilterCleared(story)?1.2:4.6);
   if(pressureNeedle)pressureNeedle.rotation.z=2.4-power*(route==='closed'?4.6:route==='drain'?2.5:.6);
  }
  if(stage==='archive_playback'&&replayAt<0)replayAt=time;
  const replayTime=time-replayAt;
  const replayText=archiveReplay.findLast(cue=>replayTime>=cue.at)?.screen??archiveReplay[0].screen;
  const text=area==='archive'?(stage==='archive_playback'?replayText:(stage==='archive_edit'?`증거 표시 ${story?.circuit.length??0}/3\n원본 선택 · 정지 · ±1초 · 표시`:stage==='archive_reveal'?'기록 연결 완료\n재생 버튼을 누르세요':['archive_escape','archive_departure'].includes(stage)?'현재 03:17 / 편집실\n네 뒤에 있어':'원본 기록 3개를 회수하세요')):
   area==='annex'?intercomStatus||(['annex_exit_ready','annex_departure'].includes(stage)?'2803 연결됨\n북쪽 방화문 잠금 해제':'통화 기록 · 수신 세대 확인\n네 자리 입력 → CALL'):drained?'수위 LOW\n주차장 통행 가능':drainAt>=0?'배수 가동 중\n젖은 통로에 접근 금지':story&&stage==='plant_power'?`수위 HIGH / 토출 ${plantRoute(story)==='drain'?'외부':plantRoute(story)==='closed'?'차단':'환수'}\n${plantProblem(story)?'현장 확인 후 시험 기동':'배수 준비 완료'}`:'수위 HIGH\n유입 · 펌프실 점검';
  if(text!==lastDisplay){lastDisplay=text;faceText(text);}
  const review=stage==='archive_edit'?archiveReview?.read(time):undefined;
  const reviewText=review?.source?`${archiveClips[review.source].title}\n${review.playing?'재생':'정지'} ${review.time.toFixed(1)}초 / ${archiveClips[review.source].duration}초`:text;
  surveillance?.update(stage,review?.source?review.time:replayTime,reviewText,review);
 }
 return {solids,targets,lamps,figure,shoes:new T.Group(),phoneGlow:new T.PointLight(),radioLight:new T.PointLight(),bounds:{x:bx-.15,z:bz+6.8},spawn:new T.Vector3(0,1.65,bz-3),heading:0,heightAt,liftDoors:undefined,setDisplay:faceText,fallingFigure:undefined,archiveReview,intercom,updateIntercom:area==='annex'?(digits:string,status:string,pressed:string|null)=>{intercomStatus=status;intercom!.setScreen(digits||'____');for(const {mesh} of intercom!.keys)mesh.position.y=pressed===mesh.uuid?.082:.085;intercom!.playButton.position.y=pressed===intercom!.playButton.uuid?.082:.085;intercom!.stopButton.position.y=pressed===intercom!.stopButton.uuid?.082:.085;}:undefined,plantAttempt:area==='plant'?(time:number,story:Story)=>{plantAttemptAt=time;recordPlantTrial(story);}:undefined,updateStory,reset(){intercomStatus='';opened=-1;drainAt=-1;replayAt=-1;plantAttemptAt=-10;lastDisplay='';archiveReview?.reset();}};
}
