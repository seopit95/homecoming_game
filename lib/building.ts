import * as T from 'three';
import type {Area,Action,Stage} from './story';
import type {Bounds,Solid,Target} from './world';
import {surface,boxUV,softBox} from './materials.ts';
import {nightWindow} from './japan.ts';
import {buildStoryRoom} from './chapters.ts';
export {createGhost as makeFigure} from './ghost.ts';
import {createGhost as makeFigure} from './ghost.ts';

export const landing={halfWidth:1.3,halfLength:23,spawnZ:20.5,liftZ:-22.75,fallTriggerZ:8,fallZ:1} as const;
export const buildingLayout={corridor:{x:3.5,z:20,spawnZ:18},lift:{x:1.1,z:1.45,spawnZ:.7},stairs:{x:2,z:6,flightX:1,run:4,spawnZ:3.8},office:{x:5.8,z:7.8,spawnZ:6.5},parking:{x:12,z:22,spawnZ:20,alarm:{x:-10.8,z:16},car:{x:5,z:-18}}} as const;
export function buildBuilding(root:T.Group,area:Exclude<Area,'apartment'>){
  if(area==='resident'||area==='aftermath')return buildStoryRoom(root,area);
  const solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[];
  const size=area==='landing'?{x:landing.halfWidth,z:landing.halfLength}:buildingLayout[area];
  const bx=size.x,bz=size.z,bounds:Bounds={x:bx-.13,z:bz-.13},ceiling=area==='parking'?2.7:2.8;
  const mat=(color:string,extra:object={})=>new T.MeshStandardMaterial({color,roughness:.85,...extra});
  const plaster=surface('decayWall','#b5b6a6'),concrete=surface('garage','#a2a9a3'),floorMat=surface(area==='parking'?'garage':'oldTile','#b0b1a4',{roughness:.62}),metal=surface('steel','#878d8b',{metalness:.55,roughness:.48}),dark=mat('#141b1c'),rust=mat('#523b29'),wood=surface('wood','#807668'),paint=mat('#616d5d'),white=mat('#a7ab94'),red=mat('#802b20'),wallMat=area==='parking'?concrete:area==='lift'?metal:plaster;
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false){const mesh=new T.Mesh(boxUV(softBox(w,h,d),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);if(solid)solids.push({x,z,w,d,y,h});return mesh;}
  function wall(x:number,z:number,w:number,d:number,y=ceiling/2,h=ceiling){const mesh=box(x,y,z,w,h,d,wallMat,true);box(x,y-h/2+.46,z,w+.012,.9,d+.012,area==='lift'?metal:paint);return mesh;}
  function label(text:string,x:number,y:number,z:number,ry=0,w=1.1,h=.26,color='#c9ceaf',background='#25372f'){
    const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d')!,texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture}));mesh.position.set(x,y,z);mesh.rotation.y=ry;root.add(mesh);
    const update=(text:string)=>{ctx.fillStyle=background;ctx.fillRect(0,0,768,192);ctx.fillStyle=color;ctx.font='52px "Apple SD Gothic Neo",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,96);texture.needsUpdate=true;};update(text);return {mesh,update};
  }
  function light(x:number,y:number,z:number,color='#a4b7a7',intensity=4,range=8){const l=new T.PointLight(color,intensity,range,2);l.position.set(x,y,z);l.userData.base=intensity;root.add(l);lamps.push(l);return l;}
  function fixture(x:number,z:number,on=true,y=ceiling-.16){box(x,y,z,.22,.08,1.1,metal);box(x,y-.048,z,.09,.018,.92,mat('#bec5b0',{emissive:'#a0b09d',emissiveIntensity:on?.6:0}));if(on)light(x,y-.12,z);}
  function target(id:Action,text:string,mesh:T.Object3D,x:number,y:number,z:number){targets.push({id,label:text,mesh,point:new T.Vector3(x,y,z)});}
  function door(id:Action,text:string,x:number,z:number,y=0,w=1.05){const mesh=box(x,y+1.1,z,w,2.2,.09,paint);box(x+w*.35,y+1.03,z+.07,.14,.045,.07,metal);box(x-w/2-.055,y+1.13,z,.09,2.26,.18,metal);box(x+w/2+.055,y+1.13,z,.09,2.26,.18,metal);label(text,x,y+2.4,z+.09,0,1.1,.2);target(id,text,mesh,x,y+1.25,z+.2);return mesh;}
  function pipe(x:number,y:number,z:number,length:number,along:'x'|'z'='z',m:T.Material=rust){box(x,y,z,along==='x'?length:.065,.065,along==='z'?length:.065,m);for(let n=-length/2+.5;n<length/2;n+=2.5)box(x+(along==='x'?n:0),y,z+(along==='z'?n:0),.12,.13,.12,metal);}
  function puddle(x:number,z:number,sx:number,sz:number){const m=new T.Mesh(new T.CircleGeometry(1,28),mat('#5b6868',{roughness:.09,metalness:.3,transparent:true,opacity:.4}));m.rotation.x=-Math.PI/2;m.scale.set(sx,sz,1);m.position.set(x,.018,z);root.add(m);return m;}
  function unit(x:number,z:number,no:string){box(x,1.1,z,.08,2.2,.95,paint);box(x-Math.sign(x)*.055,1.04,z+.3,.06,.045,.12,metal);label(no,x-Math.sign(x)*.06,2.34,z,-Math.sign(x)*Math.PI/2,.4,.14);box(x-Math.sign(x)*.12,.01,z,.36,.02,.75,dark);box(x-Math.sign(x)*.07,1.48,z+.65,.11,.21,.14,metal);}
  // Openings use separate piers and lintels. No wall is left behind the sliding leaves.
  function portal(z:number,half=.66){const w=bx-half;wall(-(bx+half)/2,z,w,.18);wall((bx+half)/2,z,w,.18);box(0,2.56,z,half*2,.48,.18,wallMat);}
  const spawn=new T.Vector3(0,1.65,('spawnZ' in size?size.spawnZ:landing.spawnZ));let heading=0,heightAt:((x:number,z:number)=>number)=()=>0;
  let liftDoors:{left:T.Mesh;right:T.Mesh}|undefined,setDisplay:((text:string)=>void)|undefined,fallingFigure:T.Group|undefined;
  let updateStory:((stage:Stage,time:number,reduced:boolean)=>void)|undefined;
  const figure=makeFigure(root),shoes=new T.Group(),phoneGlow=new T.PointLight(),radioLight=new T.PointLight();
  if(area!=='stairs'){
    box(0,-.1,0,bx*2,.2,bz*2,floorMat);box(0,ceiling+.08,0,bx*2,.16,bz*2,concrete);
    if(area!=='landing')wall(-bx,0,.18,bz*2);wall(bx,0,.18,bz*2);wall(0,bz,bx*2,.18);
    if(area==='lift'||area==='landing')portal(-bz);else wall(0,-bz,bx*2,.18);
    for(let z=-bz+2;z<bz;z+=5){box(0,ceiling-.08,z,bx*2,.15,.25,concrete);pipe(bx-.21,ceiling-.18,z,4.9);}
  }
  if(area==='landing'||area==='lift'){
    const dz=area==='landing'?landing.liftZ:-1.35;
    const left=box(-.315,1.14,dz,.62,2.28,.06,metal),right=box(.315,1.14,dz,.62,2.28,.06,metal);liftDoors={left,right};
    for(const x of [-.7,.7])box(x,1.18,dz,.12,2.36,.16,dark);box(0,2.38,dz,1.52,.12,.16,metal);
    const display=label('28',0,2.54,dz+.12,0,.36,.15,'#cb6f3e','#111510');setDisplay=display.update;
    box(0,.012,dz,1.35,.023,.22,metal);
    for(const x of [-.3,-.1,.1,.3])box(x,.026,dz,.012,.006,.22,dark);
    if(area==='landing'){
      target('enter','엘리베이터에 타기',left,0,1.25,dz+.25);
      const call=box(.95,1.25,dz+.07,.13,.28,.07,metal);label('▽',.95,1.25,dz+.12,0,.09,.12,'#d6985c');target('call','엘리베이터 호출',call,.95,1.25,dz+.2);
      label('28층',-.98,1.9,dz+.05,0,.35,.19);
      // A complete cab behind the threshold is visible while the doors open.
      box(0,-.09,dz-1.45,2.18,.18,2.7,floorMat);box(0,2.8,dz-1.45,2.2,.1,2.7,metal);
      box(0,1.4,dz-2.8,2.2,2.8,.12,metal);for(const x of [-1.1,1.1])box(x,1.4,dz-1.45,.12,2.8,2.7,metal);
      box(0,1.02,dz-2.65,1.8,.05,.06,metal);light(0,2.5,dz-1.4,'#b4b6a0',4,4);
      box(-bx,.44,0,.13,.88,bz*2,concrete,true).name='landing-parapet';
      for(const y of [.93,1.13])box(-bx,y,0,.04,.04,bz*2,rust);
      for(let z=-bz+.1;z<bz;z+=.75)box(-bx,1.02,z,.025,.22,.025,rust);
      box(-bx+.12,.005,0,.15,.015,bz*2,dark);
      for(let z=-20;z<=21;z+=5.5){unit(bx-.12,z,z>18?'2803':String(2804+Math.round((21-z)/5.5)));box(-bx,1.4,z,.17,2.8,.22,concrete,true);fixture(.25,z,z!==2);}
      for(const z of [-14,2,13])puddle(-.85,z,.3,1.6);
      for(let y=-3;y>-83;y-=3){box(0,y-.1,0,bx*2,.2,bz*2,concrete);box(-bx,y+.44,0,.13,.88,bz*2,concrete);}
      for(const y of [3,6]){box(0,y+2.8,0,bx*2,.16,bz*2,concrete);box(-bx,y+.44,0,.13,.88,bz*2,concrete);}
      const skyline=new T.Mesh(new T.PlaneGeometry(100,90),nightWindow());skyline.position.set(-28,-26,-2);skyline.rotation.y=Math.PI/2;root.add(skyline);
      fallingFigure=makeFigure(root);fallingFigure.name='falling-apparition';fallingFigure.position.set(-2.2,9,landing.fallZ);fallingFigure.visible=false;const fl=new T.PointLight('#bfccd6',4,4);fl.position.set(-1,1,1);fallingFigure.add(fl);
      label('백로아파트 · 1993',0,2.5,bz-.11,Math.PI,1.45,.2);
    }else{
      fixture(0,.1,true);for(const x of [-.98,.98])box(x,1,0,.035,.05,2.2,metal);
      const panel=box(.99,1.35,-.45,.035,.85,.24,metal);label('1',.966,1.3,-.45,-Math.PI/2,.15,.12,'#d7ad65');target('panel','1층 누르기',panel,.92,1.3,-.45);
      for(let i=0;i<6;i++)box(.966,1.45+i*.065,-.42,.025,.035,.04,white);
      target('pry','길게 눌러 문 벌리기',left,0,1.3,dz+.22);target('leave_lift','벌어진 문으로 나가기',right,0,1.3,dz+.25);
      label('정원 9명 · 600kg',0,2,bz-.11,Math.PI,.85,.17);label('승강기 검사 유효기간 경과',0,1.75,bz-.11,Math.PI,.95,.14,'#877954','#c2b790');
      // Connected 24F cross passage and its two turns, not a blank wall at the doorway.
      box(0,-.1,dz-2,7,.2,4,floorMat);box(0,2.88,dz-2,7,.16,4,concrete);
      box(0,1.4,dz-4,3.8,2.8,.18,plaster);for(const x of [-3.5,3.5])box(x,1.4,dz-7,.18,2.8,14,plaster);
      for(const x of [-2.65,2.65])box(x,-.1,dz-7,1.7,.2,14,floorMat);
      label('24층  ← 비상계단 →',0,2.15,dz-3.88,0,2,.25);light(0,2.5,dz-2,'#708b7d',2.5);puddle(.3,dz-1,.6,1);
    }
  }
  if(area==='corridor'){
    door('stairs','비상계단',0,-bz+.12);label('24층 · 연결 복도',0,2.35,bz-.11,Math.PI,1.5,.22);
    for(const z of [-8,8]){box(0,1.4,z,3.8,2.8,12,plaster,true);for(const x of [-1.94,1.94])label(z<0?'공동 배관실':'전기 설비실',x,1.9,z,x<0?-Math.PI/2:Math.PI/2,.85,.18);}
    for(const x of [-bx+.12,bx-.12])for(let z=-16;z<18;z+=5.2)unit(x,z,String(2401+Math.round((z+16)/5.2)+(x>0?8:0)));
    for(const x of [-2.65,2.65])for(const z of [-16,-5,5,16])fixture(x,z,z!==5);
    for(const z of [-17,0,17]){label('← 비상계단 →',0,2.4,z,0,1.5,.2);light(0,2.5,z,'#738877',3);}
    for(const x of [-2.65,2.65])for(let z=-18;z<19;z+=3)box(x,.015,z,.06,.02,.55,mat('#92a68a',{emissive:'#455c3d',emissiveIntensity:.2}));
    box(-3.17,.38,2,.42,.76,.62,wood,true);box(3.18,.5,-3,.35,1,.6,metal,true);puddle(-2.6,-8,.3,2);
    box(0,1.1,bz-.12,1.3,2.2,.07,metal);
  }
  if(area==='stairs'){
    heightAt=(x,z)=>z>=0?0:(x<0?1:-1)*Math.min(2.8,-z*2.8/4);
    box(0,-.15,3,4,.3,6,floorMat);box(-1,2.65,-5,2,.3,2,floorMat);box(1,-2.95,-5,2,.3,2,floorMat);
    wall(-2,0,.18,12,1.4,9);wall(2,0,.18,12,1.4,9);wall(0,-6,4,.18,1.4,9);wall(0,6,4,.18,1.4,9);wall(0,-3,.12,6,1.4,9);
    box(0,6,0,4,.2,12,concrete);
    for(let i=0;i<17;i++)for(const side of [-1,1]){const z=-(i+.5)*4/17,y=-side*(i+.5)*2.8/17;box(side,y-.082,z,1.82,.164,4/17,floorMat);box(side,y+.005,z-.09,1.72,.01,.025,metal);box(side*.16,y+.45,z,.025,.9,.025,rust);}
    // Continuous sloped handrails over the open newel side.
    for(const side of [-1,1]){const rail=box(side*.16,-side*1.4+.92,-2,.045,.045,Math.hypot(4,2.8),rust);rail.rotation.x=-side*Math.atan2(2.8,4);}
    door('up','위층 ↑',-1,-5.85,2.8,.85);door('down','아래층 ↓',1,-5.85,-2.8,.85);
    const note=label('시설 점검 메모',0,1.65,5.89,Math.PI,.8,.35,'#34392e','#b8ae8c');target('stair_note','계단 점검 메모 읽기',note.mesh,0,1.65,5.7);
    label('23층',-1.89,2,3,Math.PI/2,.9,.55);label('↓ 아래층',1,1.2,.08,0,.65,.2);
    light(0,3.2,3,'#8f9c83',5);light(-1,5.3,-4.8,'#b0a17b',3);light(1,-.3,-4.8,'#769789',3);
  }
  if(area==='office'){
    for(const x of [-.95,.95]){wall(x,-4.9,.13,5.5);wall(x,3.8,.13,1.8);}
    wall(-4,-1.6,3.4,.13);wall(4,-1.6,3.4,.13);
    const desk=box(-3,.7,1.5,2.5,1.4,.95,wood,true);box(-3.7,1.42,1.58,.42,.018,.31,white);target('record','야간 근무일지 읽기',desk,-3.7,1.5,1.8);
    const monitor=box(-2.65,1.73,1.45,.65,.51,.29,dark);const display=label('신호 없음',-2.65,1.75,1.61,0,.56,.38,'#8dba96','#0e1914');setDisplay=display.update;target('monitor','선택한 CCTV 기록 재생',monitor,-2.65,1.75,1.76);
    const dial=box(-1.95,1.44,1.68,.2,.075,.18,metal);target('tape_next','CCTV 시간 선택',dial,-1.95,1.48,1.8);label('시간 선택',-1.95,1.55,1.65,0,.32,.08);
    const fuse=box(-2.1,1.26,-5.7,.15,.3,.12,white);box(-2.1,.58,-5.7,.8,1.16,.5,wood,true);target('fuse','예비 퓨즈 챙기기',fuse,-2.1,1.32,-5.37);
    for(const x of [-4.8,-3.6]){box(x,1.1,-4.4,.6,2.2,3,metal,true);for(const y of [.45,1.1,1.8]){box(x,y,-4.4,.64,.035,3.1,wood);for(let z=-5.6;z<-3.1;z+=.3)box(x+.32,y+.2,z,.08,.34,.23,mat('#867854'));}}
    label('예비 퓨즈',-2.1,1.78,-6.05,0,.8,.17,'#473e2d','#b2ab8b');
    box(4.9,1.4,-4,.2,1.55,1.8,metal);label('감시 설비 / 복구 순서 확인',4.78,2.3,-4,-Math.PI/2,1.4,.18);
    for(const [i,id] of (['circuit_a','circuit_b','circuit_c'] as const).entries()){const z=-4.55+i*.55,m=box(4.76,1.45,z,.07,.3,.17,dark);box(4.7,1.45,z,.045,.14,.09,red);label(['A 입력','B 접지','C 감시'][i],4.77,1.8,z,-Math.PI/2,.38,.14);target(id,['A 입력 회로','B 접지 회로','C 감시 회로'][i],m,4.63,1.45,z);}
    label('서고',-3,2.3,-1.5,0,.65,.2);label('배전반',3,2.3,-1.5,0,.8,.2);
    box(3.8,.66,3.8,2.1,1.32,1.25,wood,true);for(let z=2.7;z<6;z+=.7)box(5.4,1.15,z,.45,2.3,.55,metal,true);
    fixture(0,4);fixture(0,-4,false);light(-3,2.5,1,'#b49f7d',4);light(-3,2.5,-4,'#8b9b85',3);light(3.5,2.5,-4,'#839c96',3);
    door('service_exit','지하 연결계단',0,-bz+.12);label('17층 · 구 관리사무소',0,2.3,bz-.1,Math.PI,1.65,.2);puddle(2.6,5,.45,1);
    updateStory=(stage)=>{fuse.visible=['office_record','office_fuse'].includes(stage);};
  }
  if(area==='parking'){
    const L=buildingLayout.parking;
    door('exit','보행자 출구',0,-bz+.12);label('백로아파트  B1',0,2.25,bz-.11,Math.PI,2,.4);light(0,2.4,-21,'#74af8b',4);
    for(const x of [-9,0,9])for(const z of [-12,0,12]){box(x,1.35,z,.55,2.7,.55,concrete,true);box(x,.66,z,.58,.85,.58,mat('#aa8f3f'));for(const y of [.35,.65,.95])box(x,y,z,.59,.11,.59,dark);label('B1',x,1.75,z+.294,0,.4,.18);box(x,2.42,z,.9,.22,.9,concrete);}
    function car(x:number,z:number,color:string,own=false){
      const body=mat(color,{metalness:.5,roughness:.37}),glass=mat('#26363a',{metalness:.3,roughness:.16});
      const chassis=box(x,.59,z,1.82,.67,4.35,body,true);if(own)chassis.name='hit-and-run-car';box(x,1.02,z-.18,1.63,.61,2.02,glass);box(x,1.35,z-.26,1.55,.065,1.46,body);
      for(const dx of [-.815,.815]){box(x+dx,1.03,z-.18,.045,.6,.065,body);box(x+dx,1.02,z-.98,.045,.53,.065,body);box(x+dx,.79,z+.05,.055,.065,1.6,body);}
      const hood=box(x,.92,z+1.36,1.72,.055,1.25,body);if(own){hood.rotation.z=-.075;hood.rotation.x=.1;}
      box(x,.48,z+2.17,1.75,.13,.09,dark);box(x,.48,z-2.17,1.75,.13,.09,dark);
      for(const dx of [-.66,.66]){box(x+dx,.74,z+2.18,.4,.16,.035,white);box(x+dx,.76,z-2.18,.35,.14,.035,red);}
      for(const dx of [-.91,.91])for(const dz of [-1.35,1.35]){const tire=new T.Mesh(new T.CylinderGeometry(.31,.31,.18,16),dark);tire.rotation.z=Math.PI/2;tire.position.set(x+dx,.33,z+dz);root.add(tire);const hub=new T.Mesh(new T.CylinderGeometry(.18,.18,.19,12),metal);hub.rotation.z=Math.PI/2;hub.position.copy(tire.position);root.add(hub);}
      label(own?'28 가 0317':`${37+Math.round(x)} 나 ${4200+Math.round(z*13)}`,x,.54,z+2.225,0,.47,.11,'#2b3027','#a6ad9a');
      for(const dx of [-1.27,1.27])box(x+dx,.008,z,.055,.016,4.85,white);box(x,.008,z-2.45,2.59,.016,.055,white);for(const dx of [-.55,.55])box(x+dx,.07,z-1.7,.55,.14,.13,dark);
      return chassis;
    }
    for(const x of [-5.2,5.2])for(const z of [-10,-3,4,11])car(x,z,(Math.round(z)%3===0?'#8b8e87':x<0?'#354044':'#6c655d'));
    const own=car(L.car.x,L.car.z,'#222c31',true);target('car_search','조수석 조사 · 배수 설비 열쇠',own,6.02,1.1,-17.8);
    const cracks:number[]=[];for(let i=0;i<8;i++){const a=i*2.4;cracks.push(5.2,1.14,-17.15,5.2+Math.cos(a)*.5,1.14+Math.sin(a)*.17,-17.14);}root.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(cracks,3)),new T.LineBasicMaterial({color:'#b8c5c2',transparent:true,opacity:.7})));
    const alarm=box(L.alarm.x,1.4,L.alarm.z,.3,.43,.17,red);target('alarm','화재경보기 작동',alarm,L.alarm.x,1.4,L.alarm.z+.18);label('발신기',L.alarm.x,1.92,L.alarm.z+.1,0,.65,.18,'#d6bca4','#61281e');light(L.alarm.x,2.4,L.alarm.z,'#a5523b',2);
    for(const [x,z,id] of [[-10.8,1,'valve_a'],[10.8,-8,'valve_b']] as const){box(x,1.35,z,.085,2.7,.085,rust);const wheel=new T.Mesh(new T.TorusGeometry(.19,.025,6,16),red);wheel.position.set(x,1.2,z+.14);root.add(wheel);box(x,1.2,z+.14,.36,.025,.025,red);target(id,id==='valve_a'?'서측 급수 밸브 잠그기':'동측 급수 밸브 잠그기',wheel,x,1.2,z+.2);label(id==='valve_a'?'서측 급수':'동측 급수',x,1.85,z+.05,0,.6,.16);}
    const pump=box(-10.5,.46,-17,.9,.92,1.1,paint,true);box(-10.5,1.16,-17,.45,.4,.3,metal);target('pump','배수 펌프 가동',pump,-10.5,1.3,-16.65);label('배수 설비 · 양측 밸브 차단',-10.5,1.9,-17.2,0,1.1,.18);
    const flood=puddle(0,-19,2.3,2.6);updateStory=(stage)=>{flood.scale.y=['parking_alarm','parking_run'].includes(stage)?.35:2.6;};
    for(const x of [-2.2,2.2])for(const z of [-18,-6,6,18])fixture(x,z,z!==6);for(const x of [-8,8])pipe(x,2.47,0,43);for(const z of [-12,0,12])pipe(0,2.35,z,23,'x');
    for(let z=-18;z<20;z+=4){box(0,.014,z,.07,.025,1.5,white);}for(const z of [-12,6])label('출구 ↑',-11.89,1.9,z,Math.PI/2,1.2,.3);
    figure.position.set(-7.8,0,-18);figure.visible=true;
  }
  return {solids,targets,lamps,shoes,figure,phoneGlow,radioLight,bounds,spawn,heading,heightAt,liftDoors,setDisplay,fallingFigure,updateStory};
}
