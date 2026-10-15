import * as T from 'three';
import {connectionPassage,setDoorAngle} from './passage.ts';
import type {Occupant} from './collision.ts';
import {courtyardLayout} from './courtyard.ts';
import {surface,boxUV,softBox,upholstery} from './materials.ts';
import {createGhost} from './ghost.ts';
import {roundPipe,doorHardware} from './props.ts';
import {wetTexture,createLeatherShoe} from './entry-props.ts';
import type {Solid,Target} from './world.ts';
import type {Action,Stage,Story} from './story.ts';
import {archiveReplay,type ExpansionArea} from './expansion-story.ts';
import {storageMaterials,storageShelf} from './storage.ts';
import {createSurveillance,type Surveillance} from './surveillance.ts';
import {facilityTable,facilityChair,laundryMachine,dryingRail,waterTank,pumpSkid,cartridgeFuse,videoCassette} from './facility-props.ts';
import {facilityModel} from './facility-models.ts';

export const expansionLayout={
 courtyard:courtyardLayout,
 annex:{x:17,z:34,name:'1F · 공동시설',exit:'1F 외부 중정',rooms:['우편실','세탁실','경비 휴게실','통신실'],patrol:[{x:0,z:26},{x:-14,z:18},{x:-14,z:-18},{x:0,z:-27},{x:14,z:-18},{x:14,z:18}]},
 archive:{x:15,z:32,name:'B1 · 기록보관실',exit:'기계실 연결통로',rooms:['A · 도로 영상','C · 입차 영상','B · 비상 통화','편집실'],patrol:[{x:0,z:25},{x:-12,z:18},{x:-12,z:-18},{x:0,z:-27},{x:12,z:-18},{x:12,z:18}]},
 plant:{x:17,z:36,name:'B1 · 배수 기계실',exit:'B1 주차장',rooms:['서측 저장탱크','배수 펌프','동측 급수관','전기실'],patrol:[{x:0,z:26},{x:-14,z:18},{x:-14,z:-18},{x:0,z:-29},{x:14,z:-18},{x:14,z:18}]},
} as const;

export function buildExpansion(root:T.Group,area:Exclude<ExpansionArea,'courtyard'>){
 const L=expansionLayout[area],bx=L.x,bz=L.z,solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[];
 root.name=`${area}-chapter`;
 const wall=surface('decayWall',area==='annex'?'#b2b09b':'#86968c'),floor=surface(area==='annex'?'oldTile':'garage',area==='annex'?'#aaa897':'#858e86',{roughness:.63});
 const lower=surface('wall','#4b6054'),metal=surface('steel','#757c73',{roughness:.5,metalness:.48}),wood=surface('wood','#736553');
 const dark=new T.MeshStandardMaterial({color:'#161e1c',roughness:.78}),paper=new T.MeshStandardMaterial({color:'#c7bda3',roughness:.91}),rust=new T.MeshStandardMaterial({color:'#664b35',roughness:.83}),red=new T.MeshStandardMaterial({color:'#7e302b',roughness:.68});
 const blue=new T.MeshStandardMaterial({color:'#374e53',roughness:.67}),glass=new T.MeshPhysicalMaterial({color:'#637770',roughness:.24,transparent:true,opacity:.35});
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false,parent:T.Object3D=root){
  const mesh=new T.Mesh(boxUV(softBox(w,h,d,.012),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);if(solid)solids.push({x,z,w,d,y,h});return mesh;
 }
 function wallAt(x:number,z:number,w:number,d:number){box(x,1.4,z,w,2.8,d,wall,true);box(x,.43,z,w+.015,.86,d+.015,lower);box(x,.045,z,w+.025,.09,d+.025,dark);}
 function label(text:string,x:number,y:number,z:number,w=1.3,h=.4,ry=0,lit=false){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.max(64,Math.round(768*h/w));const ctx=canvas.getContext('2d')!,lines=text.split('\n'),size=Math.min(canvas.height/(lines.length*1.5),700/Math.max(...lines.map(l=>l.length),1));
  ctx.fillStyle=lit?'#182d24':'#b6b098';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=lit?'#b6d1af':'#28372f';ctx.font=`${size}px "Apple SD Gothic Neo",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((line,i)=>ctx.fillText(line,384,canvas.height/2+(i-(lines.length-1)/2)*size*1.3));
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(w,h),lit?new T.MeshBasicMaterial({map}):new T.MeshStandardMaterial({map,roughness:.91}));mesh.position.set(x,y,z);mesh.rotation.y=ry;root.add(mesh);return mesh;
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
 box(0,-.12,0,bx*2,.24,bz*2,floor);box(0,2.91,0,bx*2,.22,bz*2,wall);
 for(const x of [-bx,bx])wallAt(x,0,.18,bz*2);for(const side of [-1,1])wallAt(side*(bx+.72)/2,bz,bx-.72,.18);box(0,2.6,bz,1.44,.4,.18,wall);
 if(area!=='annex')connectionPassage(root,solids,lamps,-3,bz+6,0,.9);
 for(const side of [-1,1]){
  const segments=[[-bz,-27],[-24,-7],[-4,14],[17,25],[28,bz]];
  for(const [a,b] of segments)wallAt(side*2,(a+b)/2,.15,b-a);
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
 let display:T.Mesh|undefined;
 let surveillance:Surveillance|undefined;
 const faceText=(text:string)=>{if(!display)return;const map=(display.material as T.MeshStandardMaterial).map! as T.CanvasTexture;const c=map.image as HTMLCanvasElement,ctx=c.getContext('2d')!;ctx.fillStyle='#101d18';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#b7cdae';ctx.font=`${Math.min(c.height*.26,650/Math.max(1,...text.split('\n').map(l=>l.length)))}px sans-serif`;ctx.textAlign='center';text.split('\n').forEach((l,i)=>ctx.fillText(l,c.width/2,c.height*(.34+i*.3)));map.needsUpdate=true;};
 const X=bx-6;
 let water:T.Mesh|undefined;
 let looseFuse:T.Group|undefined,installedFuse:T.Group|undefined,badge:T.Group|undefined;
 const recordings:{id:Action;mesh:T.Group}[]=[];
 if(area==='annex'){
  box(0,-.1,bz+1.35,2.2,.2,2.7,floor);box(0,2.83,bz+1.35,2.2,.12,2.7,metal);
  for(const x of [-1.1,1.1])box(x,1.4,bz+1.35,.12,2.8,2.7,metal,true);box(0,1.4,bz+2.7,2.2,2.8,.12,metal,true);
  for(const x of [-.7,.7])box(x,1.18,bz,.12,2.36,.16,dark);box(0,.012,bz,1.35,.023,.22,metal);

  const map=label('정문 셔터 침수 · 통행 불가\n세탁실 ←  통신실 →\n정문: 북쪽 방화문 → 중정',1.91,1.52,29,2,.9,-Math.PI/2);target('annex_map','공동시설 안내도',map,[1.89,1.52,29],[.8,29]);
  // Mail slots, laundry machines, employee lockers and the abandoned switchboard.
  box(-X-.275,.195,23,4.65,.39,.4,metal);box(-X-.275,.78,22.81,4.65,1.56,.08,metal);
  for(let row=0;row<3;row++)for(let col=0;col<8;col++){const x=-X-2.2+col*.55,z=23;box(x,.55+row*.39,z,.51,.34,.3,metal);box(x,.55+row*.39,z+.158,.48,.31,.015,blue);box(x,.61+row*.39,z+.17,.28,.015,.013,dark);box(x+.18,.50+row*.39,z+.173,.027,.035,.015,metal);box(x-.22,.55+row*.39,z+.173,.012,.14,.012,metal);if(row===2)label(String(2701+col),x,.43+row*.39,z+.167,.26,.065);}
  solids.push({x:-X-.275,z:23,w:4.65,d:.4,y:.95,h:1.9});
  evidenceDesk('annex_notice','2803호 · 반송 안내문',-X,20);
  evidenceDesk('annex_fuse','통신용 퓨즈 · 정비표',-X,0);
  box(-X+.49,.8205,0,.12,.001,.075,paper);
  looseFuse=cartridgeFuse(metal);looseFuse.name='annex-fuse-pickup';looseFuse.position.set(-X+.49,.8248,0);root.add(looseFuse);
  const fuseTarget=targets.find(t=>t.id==='annex_fuse')!;fuseTarget.mesh=looseFuse;fuseTarget.point.set(-X+.49,.83,0);looseFuse.userData.approach={x:-X+.49,z:1};
  const fuseLabel=label('6A · 통신 예비',-X+.49,.8211,-.025,.1,.018);fuseLabel.rotation.x=-Math.PI/2;
  const enamel=surface('steel','#b4b7ad',{roughness:.64,metalness:.15}),cloth=upholstery('#727b6e'),paleCloth=upholstery('#c5c0af');
  for(const x of [-X-2.7,-X+1.7])for(const z of [-3,3]){
   const washer=laundryMachine(enamel,metal,dark,glass);washer.position.set(x,0,z);root.add(washer);solids.push({x,z:z-.05,w:.9,d:1.02,y:.52,h:1.04});
   label('세탁 / 탈수',x-.15,.9,z+.437,.32,.045,0,true);
   box(x-.13,1.083,z,.44,.086,.42,paleCloth);
  }
  const rail=dryingRail(metal,cloth,paleCloth);rail.position.set(-X,0,-6);root.add(rail);
  for(let i=0;i<5;i++)solids.push({x:-X-2+i*.85,z:-6,w:.78,d:.065,y:1.60,h:.94});
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
  table(0,-21,2.4,1);box(0,1.22,-21.2,1.42,.8,.14,dark);display=label('마지막 호출 수신처\n연결 회선을 선택하세요',0,1.25,-21.119,1.3,.6,0,true);
  for(const [i,id,title] of [[0,'annex_line_victim','1704'],[1,'annex_line_home','2803'],[2,'annex_line_office','관리실']] as const){const x=(i-1)*.73;const button=box(x,.88,-20.75,.5,.12,.25,metal);target(id,title+' 회선 연결',button,[x,.97,-20.65],[x,-19.7]);label(title,x,.9402,-20.75,.43,.18).rotation.x=-Math.PI/2;}
  for(const x of [-.48,.48])roundPipe(root,[x,1,-21.28],[x,.82,-21.4],.012,dark);
  roundPipe(root,[2.12,1.89,-2],[2.12,2.8,-2],.019,metal);
  const restChair=facilityChair(wood,metal);restChair.position.set(X+2,0,20);restChair.rotation.y=-.4;root.add(restChair);solids.push({x:X+2,z:20,w:.65,d:.65,y:.44,h:.88});
  rack(-X,-18,4,.65);table(X,-18,2.5);for(const x of [X-1,X+.2])box(x,.87,-18,.75,.1,.45,paper);
  puddle(-X,4,3,4);puddle(0,9,1.5,6);label('정문 셔터 침수\n지하 차량 출구 이용',-1.921,1.5,29,2,.7,Math.PI/2);
 }else if(area==='archive'){
  evidenceDesk('archive_ledger','기록 인계 대장',.2,27);
  evidenceDesk('archive_road','A / 정문 도로 영상',-X,20);evidenceDesk('archive_call','B / 비상 호출 기록',X,20);evidenceDesk('archive_gate','C / 지하 입차 영상',-X,-3);
  for(const side of [-1,1])for(const z of [16,23,-2,-7,-18])for(const dx of [-2.4,1.6])rack(side*X+dx,z===-18?-16.8:z,2.2,.64);
  for(const [x,z,title] of [[-X,23,'A · 정문 도로'],[X,23,'B · 통화 기록'],[-X,-7,'C · 지하 입차']] as const){
   // The plate overlaps the upper shelf edge, not the aisle between two racks.
   box(x+1.6,1.93,z+.317,1.34,.26,.018,metal);label(title,x+1.6,1.93,z+.328,1.3,.24);
  }
  table(X,-20,3.6,1);box(X,.835,-20.15,.5,.03,.36,dark);box(X,.905,-20.15,.16,.11,.17,metal);
  const monitor=box(X,1.30,-20.15,.88,.68,.57,dark);target('archive_play','복원된 기록 재생',monitor,[X,1.31,-19.84],[X,-18.9]);
  const screen=createSurveillance();screen.position.set(X,1.31,-19.864);root.add(screen);surveillance=screen.userData.surveillance;
  for(const y of [1.015,1.605])box(X,y,-19.849,.8,.035,.03,metal);
  for(const x of [X-.383,X+.383])box(x,1.31,-19.849,.035,.56,.03,metal);
  for(let i=0;i<4;i++)box(X-.19+i*.08,.99,-19.855,.035,.014,.026,metal);
  roundPipe(root,[X,.99,-20.43],[X,.86,-20.52],.006,dark);roundPipe(root,[X,.86,-20.52],[X,.07,-20.52],.006,dark);
  for(const dx of [-1.2,1.2]){box(X+dx,.89,-20,.55,.14,.4,metal);box(X+dx,.89,-19.793,.48,.09,.018,dark);for(const ox of [-.14,.14])box(X+dx+ox,.89,-19.778,.045,.045,.025,metal);}
  roundPipe(root,[X,.07,-20.52],[X+1.3,.07,-20.52],.006,dark);roundPipe(root,[X+1.3,.07,-20.52],[X+1.3,.85,-20.18],.006,dark);
  box(14.65,2.70,-29,.035,.20,.035,metal);const cameraCase=new T.Group();cameraCase.name='archive-cctv-camera';cameraCase.position.set(14.65,2.54,-29);cameraCase.rotation.set(.11,-1.29,0,'YXZ');root.add(cameraCase);
  box(0,0,0,.18,.12,.32,metal,false,cameraCase);const lens=new T.Mesh(new T.CylinderGeometry(.041,.041,.02,20),dark);lens.rotation.x=Math.PI/2;lens.position.z=.169;cameraCase.add(lens);
  for(const [i,id,title] of [[0,'archive_sequence_road','도로'],[1,'archive_sequence_call','호출'],[2,'archive_sequence_gate','입차']] as const){const x=X+(i-1)*.88;box(x,.821,-19.67,.6,.002,.27,dark);const control=box(x,.867,-19.67,.6,.09,.27,metal);target(id,title+' 기록 연결',control,[x,.93,-19.58],[x,-18.6]);label(title,x,.9122,-19.67,.5,.19).rotation.x=-Math.PI/2;}
  for(const [id,x,z,title] of [['archive_road',-X,20,'A · 03:17 / 도로'],['archive_call',X,20,'B · 03:20 / 통화'],['archive_gate',-X,-3,'C · 03:26 / 입차']] as const){
   const recording=id==='archive_call'?facilityModel('cassette_tape'):videoCassette(dark,paper,glass);
   if(id==='archive_call'){recording.rotation.x=-Math.PI/2;recording.position.y=-.039985;}
   const prop=new T.Group();prop.name=id+'-original';prop.userData.recording=true;prop.add(recording);prop.position.set(x+.48,.8205,z);root.add(prop);recordings.push({id,mesh:prop});
   if(id!=='archive_call'){const tag=label(title,x+.48,.84655,z+.029,.095,.018);tag.rotation.x=-Math.PI/2;prop.attach(tag);}
   const t=targets.find(t=>t.id===id)!;t.mesh=prop;t.point.set(x+.48,.86,z);prop.userData.approach={x:id==='archive_gate'?x:x+.48,z:z+1};
  }
  for(const x of [-X-.8,-X+.8])box(x,.12,-22,.95,.24,.7,wood,true);puddle(-X,-19,4,7);label('임의 폐기 금지\n사고 관련 원본 보존',0,2.1,7,2,.55,0);box(0,2.1,6.97,2.08,.62,.04,metal);for(const x of [-.8,.8])roundPipe(root,[x,2.41,7],[x,2.8,7],.009,metal);
 }else{
  const diagram=label('급수: 서측·동측 모두 차단\n배수 ON / 환기 ON / 외부조명 OFF\n수위 저하 후 주차장 진입',1.91,1.5,29,2,.85,-Math.PI/2);target('plant_diagram','배수 계통도 확인',diagram,[1.89,1.5,29],[.8,29]);
  for(const side of [-1,1])for(const z of [21,-3,-23]){
   const x=side*X,tank=waterTank(metal,dark,rust);tank.position.set(x,0,z);root.add(tank);solids.push({x,z,w:2.8,d:2.8,y:1.3,h:2.6});
   roundPipe(root,[x,2.64,z],[side*(bx-.25),2.64,z],.1,rust);roundPipe(root,[side*(bx-.25),2.64,z],[side*(bx-.25),2.5,z],.1,rust);
   for(const px of [x,side*(bx-2)]){roundPipe(root,[px,2.64,z],[px,2.8,z],.012,metal);box(px,2.79,z,.18,.02,.14,metal);}

  }
  roundPipe(root,[-X+3,2.6,19],[-X,2.6,19],.07,rust);roundPipe(root,[-X,2.6,19],[-X,2.49,21],.07,rust);roundPipe(root,[X+3,2.6,-3],[X,2.49,-3],.07,rust);
  valve('plant_valve_west','서측 급수 차단',-X+3,19);valve('plant_valve_east','동측 급수 차단',X+3,-3);
  for(const [i,id,title] of [[0,'plant_circuit_pump','배수'],[1,'plant_circuit_air','환기'],[2,'plant_circuit_lights','외부조명']] as const){const x=X+(i-1)*.75;box(x,1.05,-18,.67,2.1,.21,metal,true);const lever=box(x,1.32,-17.84,.12,.26,.12,red);lever.name=id;target(id,title+' 회로 전환',lever,[x,1.35,-17.73],[x,-16.8]);label(title,x,1.8,-17.882,.55,.18);}
  box(X-2.4,.61,-18,.12,1.22,.12,metal);box(X-2.4,.025,-18,.4,.05,.4,metal);const start=box(X-2.4,1.26,-18,.43,.47,.24,blue);target('plant_start','배수 펌프 기동',start,[X-2.4,1.26,-17.86],[X-2.4,-16.8]);label('기동',X-2.4,1.32,-17.868,.3,.18);
  display=label('수위 HIGH\n급수 차단 후 전원 연결',0,1.65,-26,1.4,.55);box(0,1.62,-26.1,1.6,.75,.16,metal);for(const x of [-.6,.6])box(x,.63,-26.1,.07,1.26,.07,metal);
  // Flood stays below the dry raised perimeter; a visible grille blocks the central shortcut.
  water=puddle(0,-20,3.5,19,.68);water.position.y=.075;
  box(0,.24,-15,3.5,.48,.16,metal,true);for(let x=-1.5;x<=1.5;x+=.25)box(x,.59,-15,.019,.7,.03,metal);
  box(0,.75,-14.982,2.08,.32,.025,metal);label('침수 · 좌우 통로로 우회',0,.75,-14.9675,2,.28);
  rack(-X,2,2.5,.7,false);
  for(const z of [-3,-6]){const x=-X+4.8,pump=pumpSkid(metal,blue,dark,rust);pump.position.set(x,0,z);root.add(pump);solids.push({x,z,w:1.7,d:1.1,y:.5,h:1});roundPipe(root,[x+.4,1,z],[x+2,1,z],.075,rust);roundPipe(root,[x+2,1,z],[x+2,0,z],.075,rust);solids.push({x:x+1.2,z,w:1.75,d:.2,y:.5,h:1});}
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
 let opened=-1,drainAt=-1,replayAt=-1,lastDisplay='';
 function updateStory(stage:Stage,time:number,reduced=false,story?:Story,occupants:Occupant[]=[]){
  const leaving=stage===`${area}_departure`;if(leaving&&opened<0)opened=time;
  if(opened>=0)setDoorAngle(hinge,doorBlock,1.5*T.MathUtils.smoothstep(time-opened,0,reduced?.2:.9),.7,0,occupants);
  const notes=story?.notes??[];
  if(looseFuse)looseFuse.visible=!notes.includes('annex_fuse');if(installedFuse)installedFuse.visible=notes.includes('annex_fuse')&&!['annex_arrival','annex_fuse','annex_restore'].includes(stage);if(badge)badge.visible=!notes.includes('annex_badge');
  for(const {id,mesh} of recordings)mesh.visible=!notes.includes(id);
  for(const id of ['plant_valve_west','plant_valve_east']){const wheel=root.getObjectByName(id);if(wheel&&notes.includes(id))wheel.rotation.z=-Math.PI*.6;}
  for(const id of ['plant_circuit_pump','plant_circuit_air','plant_circuit_lights']){const lever=root.getObjectByName(id);if(lever)lever.rotation.x=story?.circuit.includes(id as Action)?-.5:.5;}
  if(stage==='plant_drain'&&drainAt<0)drainAt=time;
  const drained=['plant_exit_ready','plant_departure'].includes(stage),drain=drained?1:drainAt>=0?T.MathUtils.clamp((time-drainAt)/12,0,1):0;
  if(water){water.scale.y=1-drain*.82;(water.material as T.MeshPhysicalMaterial).opacity=.68-drain*.42;}
  if(stage==='archive_playback'&&replayAt<0)replayAt=time;
  const replayTime=time-replayAt;
  const replayText=archiveReplay.findLast(cue=>replayTime>=cue.at)?.screen??archiveReplay[0].screen;
  const text=area==='archive'?(stage==='archive_playback'?replayText:(stage==='archive_edit'?`원본 연결 ${story?.circuit.length??0}/3\n각 기록의 시각을 대조하세요`:stage==='archive_reveal'?'기록 연결 완료\n재생 버튼을 누르세요':['archive_escape','archive_departure'].includes(stage)?'03:20 / 2803 통화 원본\n「잘못 거셨어요.」':'원본 기록 3개를 회수하세요')):
   area==='annex'?['annex_exit_ready','annex_departure'].includes(stage)?'2803 연결됨\n북쪽 방화문 잠금 해제':'마지막 호출 수신처\n1704 / 2803 / 관리실':drained?'수위 LOW\n주차장 통행 가능':drainAt>=0?'배수 가동 중\n젖은 통로에 접근 금지':'수위 HIGH\n급수 차단 후 전원 연결';
  if(text!==lastDisplay){lastDisplay=text;faceText(text);}
  surveillance?.update(stage,replayTime,text);
 }
 return {solids,targets,lamps,figure,shoes:new T.Group(),phoneGlow:new T.PointLight(),radioLight:new T.PointLight(),bounds:{x:bx-.15,z:bz+6.8},spawn:new T.Vector3(0,1.65,bz-3),heading:0,heightAt,liftDoors:undefined,setDisplay:faceText,fallingFigure:undefined,updateStory,reset(){opened=-1;drainAt=-1;replayAt=-1;lastDisplay='';}};
}
