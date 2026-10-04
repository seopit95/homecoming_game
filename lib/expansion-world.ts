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
  box(x,2.69,z,.19,.1,1.12,metal);box(x,2.635,z,.1,.013,.95,new T.MeshStandardMaterial({color:'#c5ccb9',emissive:'#a1ae93',emissiveIntensity:.45}));
  const light=new T.PointLight(color,power,9,2);light.position.set(x,2.52,z);light.userData.base=power;root.add(light);lamps.push(light);
 }
 function table(x:number,z:number,w=1.8,d=.8){
  const group=new T.Group();group.position.set(x,0,z);group.name='grounded-worktable';group.userData.floorProp=true;root.add(group);
  box(0,.77,0,w,.1,d,wood,false,group);for(const dx of [-w/2+.09,w/2-.09])for(const dz of [-d/2+.09,d/2-.09])box(dx,.36,dz,.065,.72,.065,metal,false,group);
  box(0,.42,-d/2+.06,w-.14,.28,.04,wood,false,group);solids.push({x,z,w,d,y:.4,h:.8});return group;
 }
 function evidenceDesk(id:Action,title:string,x:number,z:number){table(x,z);
  const chair=new T.Group();chair.name='grounded-desk-chair';chair.userData.floorProp=true;chair.position.set(x+.45,0,z-1);root.add(chair);
  for(const dx of [-.21,.21])for(const dz of [-.21,.21])box(dx,.22,dz,.035,.44,.035,metal,false,chair);
  box(0,.47,0,.49,.06,.49,wood,false,chair);for(const dx of [-.21,.21])box(dx,.71,-.21,.035,.48,.035,metal,false,chair);box(0,.82,-.22,.48,.23,.04,wood,false,chair);
  solids.push({x:x+.45,z:z-1,w:.5,d:.5,y:.46,h:.92});const note=label(title,x,.826,z,.48,.32);note.rotation.x=-Math.PI/2;return target(id,title,note,[x,.84,z+.1],[x,z+1]);}
 function rack(x:number,z:number,w=2.4,d=.62,folders=true){
  const group=new T.Group();group.name='grounded-shelving';group.position.set(x,0,z);group.userData.floorProp=true;root.add(group);
  for(const dx of [-w/2+.025,w/2-.025])for(const dz of [-d/2+.025,d/2-.025])box(dx,1.03,dz,.05,2.06,.05,metal,false,group);
  for(const y of [.15,.75,1.35,2.03]){box(0,y,0,w,.04,d,metal,false,group);if(folders&&y<1.9)for(let dx=-w/2+.18;dx<w/2-.15;dx+=.25)box(dx,y+.23,0,.19,.42,d*.73,dx<0?paper:blue,false,group);}
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
  for(let z=-bz+4;z<bz-2;z+=6)roundPipe(root,[side*(bx-.25),2.5,z],[side*(bx-.25),2.5,z+5.9],.036,rust);
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
 const faceText=(text:string)=>{if(!display)return;const map=(display.material as T.MeshStandardMaterial).map! as T.CanvasTexture;const c=map.image as HTMLCanvasElement,ctx=c.getContext('2d')!;ctx.fillStyle='#101d18';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#b7cdae';ctx.font=`${Math.min(c.height*.26,650/Math.max(1,...text.split('\n').map(l=>l.length)))}px sans-serif`;ctx.textAlign='center';text.split('\n').forEach((l,i)=>ctx.fillText(l,c.width/2,c.height*(.34+i*.3)));map.needsUpdate=true;};
 const X=bx-6;
 let water:T.Mesh|undefined;
 if(area==='annex'){
  box(0,-.1,bz+1.35,2.2,.2,2.7,floor);box(0,2.83,bz+1.35,2.2,.12,2.7,metal);
  for(const x of [-1.1,1.1])box(x,1.4,bz+1.35,.12,2.8,2.7,metal,true);box(0,1.4,bz+2.7,2.2,2.8,.12,metal,true);
  for(const x of [-.7,.7])box(x,1.18,bz,.12,2.36,.16,dark);box(0,.012,bz,1.35,.023,.22,metal);

  const map=label('정문 셔터 침수 · 통행 불가\n세탁실 ←  통신실 →\n정문: 북쪽 방화문 → 중정',1.91,1.52,29,2,.9,-Math.PI/2);target('annex_map','공동시설 안내도',map,[1.89,1.52,29],[.8,29]);
  // Mail slots, laundry machines, employee lockers and the abandoned switchboard.
  box(-X-.275,.195,23,4.65,.39,.4,metal);box(-X-.275,.95,22.81,4.65,1.9,.08,metal);
  for(let row=0;row<3;row++)for(let col=0;col<8;col++){const x=-X-2.2+col*.55,z=23;box(x,.55+row*.39,z,.51,.34,.3,metal);box(x,.61+row*.39,z+.16,.28,.015,.013,dark);if(row===2)label(String(2701+col),x,.43+row*.39,z+.165,.26,.065);}
  evidenceDesk('annex_notice','2803호 · 반송 안내문',-X,20);
  evidenceDesk('annex_fuse','통신용 퓨즈 · 정비표',-X,0);
  for(const x of [-X-2.7,-X+1.7])for(const z of [-3,3]){
   box(x,.52,z,.88,1.04,.84,surface('steel','#b4b7ad',{roughness:.64,metalness:.15}),true);const drum=new T.Mesh(new T.TorusGeometry(.29,.045,12,32),metal);drum.position.set(x,.52,z+.43);root.add(drum);const pane=new T.Mesh(new T.CircleGeometry(.26,32),glass);pane.position.copy(drum.position).z+=.008;root.add(pane);box(x,.92,z+.425,.68,.12,.025,dark);
   const cavity=new T.Mesh(new T.CircleGeometry(.255,32),dark);cavity.position.set(x,.52,z+.421);root.add(cavity);
   const dial=new T.Mesh(new T.CylinderGeometry(.047,.047,.028,18),metal);dial.rotation.x=Math.PI/2;dial.position.set(x+.25,.92,z+.453);root.add(dial);
   label('세탁 / 탈수',x-.1,.92,z+.443,.32,.045,0,true);for(const dx of [-.25,-.13,-.01])box(x+dx,.87,z+.443,.06,.022,.015,metal);
   for(let i=0;i<6;i++)box(x,.105+i*.018,z+.428,.6,.007,.015,dark);box(x+.26,.54,z+.474,.043,.11,.035,metal);
   for(const dx of [-.29,.29])box(x+dx,.035,z+.34,.12,.07,.08,dark);
   roundPipe(root,[x+.33,.6,z-.43],[x+.33,.1,z-.7],.025,dark);roundPipe(root,[x+.33,.1,z-.7],[x+.55,.1,z-.7],.025,dark);
   const towel=box(x-.13,1.083,z,.44,.086,.42,upholstery('#aaa599'));towel.rotation.y=.07;
   box(x,1.018,z,.82,.018,.78,metal);

  }
  roundPipe(root,[-X-3.1,2.15,-6],[-X+3.1,2.15,-6],.022,metal);for(let i=0;i<5;i++)box(-X-2+i*.85,1.68,-6,.65,.92,.022,upholstery(i===2?'#c5c0af':'#727b6e'));
  for(let i=0;i<5;i++){const x=X-2.4+i*.9;box(x,1.04,23,.82,2.08,.58,metal,true);box(x,1.06,23.305,.75,1.96,.027,blue);box(x+.23,1.14,23.338,.028,.16,.034,dark);label(i===2?'한서연':'당직',x,1.77,23.325,.42,.18);}
  evidenceDesk('annex_badge','한서연 · 야간 당직 명찰',X,20);const shoe=createLeatherShoe('#242a27',false);shoe.position.set(X+1.3,.003,23.5);root.add(shoe);
  box(X,.58,-2,.78,1.16,.36,metal,true);const restore=box(X,1.38,-2,.75,.94,.24,metal);target('annex_restore','통신 전원함 · 퓨즈 연결',restore,[X,1.38,-1.84],[X,-.8]);label('통신 설비\n퓨즈 6A',X,1.42,-1.866,.55,.55);
  evidenceDesk('annex_call','03:20 · 비상벨 녹음기',X,-5);box(X,.925,-5,.53,.19,.34,dark);box(X,.977,-4.822,.3,.045,.017,metal);
  for(const dx of [-.15,.15]){const r=new T.Mesh(new T.TorusGeometry(.051,.008,6,16),metal);r.position.set(X+dx,.93,-4.826);root.add(r);}
  table(0,-21,2.4,1);box(0,1.22,-21.2,1.42,.8,.14,dark);display=label('마지막 호출 수신처\n연결 회선을 선택하세요',0,1.25,-21.119,1.3,.6,0,true);
  for(const [i,id,title] of [[0,'annex_line_victim','1704'],[1,'annex_line_home','2803'],[2,'annex_line_office','관리실']] as const){const x=(i-1)*.73;const button=box(x,.89,-20.75,.5,.12,.25,metal);target(id,title+' 회선 연결',button,[x,.97,-20.65],[x,-19.7]);label(title,x,.956,-20.75,.43,.18).rotation.x=-Math.PI/2;}
  rack(-X,-18,4,.65);table(X,-18,2.5);for(const x of [X-1,X+.2])box(x,.87,-18,.75,.1,.45,paper);
  puddle(-X,4,3,4);puddle(0,9,1.5,6);label('정문 셔터 침수\n지하 차량 출구 이용',-1.921,1.5,29,2,.7,Math.PI/2);
 }else if(area==='archive'){
  evidenceDesk('archive_ledger','기록 인계 대장',.2,27);
  evidenceDesk('archive_road','A / 정문 도로 영상',-X,20);evidenceDesk('archive_call','B / 비상 호출 기록',X,20);evidenceDesk('archive_gate','C / 지하 입차 영상',-X,-3);
  for(const side of [-1,1])for(const z of [16,23,-2,-7,-18])for(const dx of [-2.4,1.6])rack(side*X+dx,z,2.2,.64);
  for(const [x,z,title] of [[-X,23,'A · 정문 도로'],[X,23,'B · 통화 기록'],[-X,-7,'C · 지하 입차']] as const){
   // The plate overlaps the upper shelf edge, not the aisle between two racks.
   box(x+1.6,1.93,z+.317,1.34,.26,.018,metal);label(title,x+1.6,1.93,z+.328,1.3,.24);
  }
  table(X,-20,3.6,1);const monitor=box(X,1.15,-20.15,1.1,.64,.45,dark);display=label('복원 대기\n원본 기록 3개가 필요합니다',X,1.17,-19.911,.97,.52,0,true);target('archive_play','복원된 기록 재생',monitor,[X,1.17,-19.82],[X,-18.9]);
  for(const [i,id,title] of [[0,'archive_sequence_road','도로'],[1,'archive_sequence_call','호출'],[2,'archive_sequence_gate','입차']] as const){const x=X+(i-1)*.88;const control=box(x,.867,-19.67,.6,.09,.27,metal);target(id,title+' 기록 연결',control,[x,.93,-19.58],[x,-18.6]);label(title,x,.917,-19.67,.5,.19).rotation.x=-Math.PI/2;}
  for(const [x,z] of [[-X,20],[X,20],[-X,-3]])for(const dx of [-.45,.45]){box(x+dx,.857,z,.29,.065,.19,dark);for(const ox of [-.07,.07]){const reel=new T.Mesh(new T.TorusGeometry(.027,.007,6,16),paper);reel.rotation.x=-Math.PI/2;reel.position.set(x+dx+ox,.894,z);root.add(reel);}}
  for(const x of [-X-.8,-X+.8])box(x,.12,-22,.95,.24,.7,wood,true);puddle(-X,-19,4,7);label('임의 폐기 금지\n사고 관련 원본 보존',0,2.1,7,2,.55,0);box(0,2.1,6.97,2.08,.62,.04,metal);for(const x of [-.8,.8])roundPipe(root,[x,2.41,7],[x,2.8,7],.009,metal);
 }else{
  const diagram=label('급수: 서측·동측 모두 차단\n배수 ON / 환기 ON / 외부조명 OFF\n수위 저하 후 주차장 진입',1.91,1.5,29,2,.85,-Math.PI/2);target('plant_diagram','배수 계통도 확인',diagram,[1.89,1.5,29],[.8,29]);
  for(const side of [-1,1])for(const z of [21,-3,-23]){
   const x=side*X,tank=new T.Group();tank.position.set(x,0,z);tank.name='grounded-water-tank';tank.userData.floorProp=true;root.add(tank);
   const body=new T.Mesh(new T.CylinderGeometry(1.35,1.35,2.32,32),metal);body.position.y=1.31;tank.add(body);for(const dx of [-.85,.85])for(const dz of [-.65,.65])box(dx,.08,dz,.2,.16,.2,dark,false,tank);solids.push({x,z,w:2.8,d:2.8,y:1.2,h:2.4});
   for(const y of [.5,1.5,2.1]){const band=new T.Mesh(new T.TorusGeometry(1.36,.017,6,36),rust);band.rotation.x=Math.PI/2;band.position.y=y;tank.add(band);}
   roundPipe(root,[x,2.49,z],[side*(bx-.3),2.49,z],.1,rust);
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
  rack(-X,2,2.5,.7,false);for(const x of [-X-.7,-X+.6])box(x,.35,2,.42,.35,.35,blue);
  for(const z of [24,0,-24])roundPipe(root,[-bx+.3,2.6,z],[bx-.3,2.6,z],.07,rust);
 }
 // Wall-attached radiators, storage and seating give the perimeter a maintenance-room scale.
 for(const side of [-1,1])for(const z of [8,-10]){
  const x=side*(bx-.52);box(x,.43,z,.38,.72,2.2,metal);for(let k=0;k<12;k++)box(x-side*.22,.43,z-.98+k*.178,.08,.65,.1,metal);
  for(const dz of [-.8,.8])box(x,.07,z+dz,.26,.14,.09,metal);roundPipe(root,[x,0,z+1.3],[x,.62,z+1.3],.018,rust);
 }
 for(const side of [-1,1]){
  const x=side*(bx-2),z=-29;table(x,z,2.2,.65);
  for(let i=0;i<3;i++){box(x-.68+i*.63,.99,z,.53,.34,.52,paper);label('보관',x-.68+i*.63,1,z+.269,.32,.12);}
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
 }
 return {solids,targets,lamps,figure,shoes:new T.Group(),phoneGlow:new T.PointLight(),radioLight:new T.PointLight(),bounds:{x:bx-.15,z:bz+6.8},spawn:new T.Vector3(0,1.65,bz-3),heading:0,heightAt,liftDoors:undefined,setDisplay:faceText,fallingFigure:undefined,updateStory,reset(){opened=-1;drainAt=-1;replayAt=-1;lastDisplay='';}};
}
