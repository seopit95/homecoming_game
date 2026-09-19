import * as T from 'three';
import {surface,boxUV,softBox,upholstery} from './materials.ts';
import {basin,sinkCounter,cabinet,roundPipe} from './props.ts';
import {createGhost} from './ghost.ts';
import {nightWindow} from './japan.ts';
import {createLeatherShoe,wetTexture} from './entry-props.ts';
import type {Solid,Target} from './world.ts';
import type {Action,Stage} from './story.ts';

// The remembered sedan stays in the same lane and keeps its left-hand driving position.
export const accidentCar={x:1.65,z:8,driverX:1.3,doorX:.6,exitX:.05,exitZ:8.6} as const;

// Two authored spaces share the existing collision, interaction and lighting contracts.
export function buildStoryRoom(root:T.Group,area:'resident'|'aftermath'){
  const resident=area==='resident',bounds=resident?{x:4.6,z:11.7}:{x:6.8,z:25.8};
  const solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[];
  const wood=surface('wood','#81715d'),wall=surface('wall','#c0b8a4'),metal=surface('steel','#52605f',{metalness:.5,roughness:.35});
  const dark=new T.MeshStandardMaterial({color:'#16191a',roughness:.8}),paper=new T.MeshStandardMaterial({color:'#c4b99a',roughness:.95});
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false,parent:T.Object3D=root){const o=new T.Mesh(boxUV(softBox(w,h,d),x,y,z),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);if(solid)solids.push({x,z,w,d,y,h});return o;}
  function label(text:string,x:number,y:number,z:number,w=1,h=.3,ry=0,bg='#b6ac90',fg='#29322d'){
    const c=document.createElement('canvas');c.width=768;c.height=Math.round(768*h/w);const ctx=c.getContext('2d')!,lines=text.split('\n'),font=Math.min(c.height/(lines.length*1.65),700/Math.max(...lines.map(l=>[...l].length),1));
    ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=fg;ctx.font=`${font}px "Apple SD Gothic Neo",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    lines.forEach((line,i)=>ctx.fillText(line,c.width/2,c.height/2+(i-(lines.length-1)/2)*font*1.35));
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.92}));o.position.set(x,y,z);o.rotation.y=ry;root.add(o);return o;
  }
  function target(id:Action,text:string,mesh:T.Object3D,x:number,y:number,z:number){targets.push({id,label:text,mesh,point:new T.Vector3(x,y,z)});}
  function light(x:number,y:number,z:number,color:string,power:number,radius=8){const l=new T.PointLight(color,power,radius,2);l.position.set(x,y,z);l.userData.base=power;root.add(l);lamps.push(l);return l;}
  function rod(a:T.Vector3,b:T.Vector3,r:number,m:T.Material=metal){const o=new T.Mesh(new T.CylinderGeometry(r,r,a.distanceTo(b),10),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());root.add(o);return o;}
  const figure=createGhost(root);figure.visible=false;
  const shoes=new T.Group(),phoneGlow=new T.PointLight(),radioLight=new T.PointLight();
  let frontDoor:T.Group|undefined,rearDoor:T.Group|undefined,frontBlock:Solid|undefined,rearBlock:Solid|undefined,frontAt=-1,rearAt=-1;
  let spawn=new T.Vector3(0,1.65,4.9),heading=0,door:T.Group|undefined,rain:T.LineSegments|undefined,carSolid:Solid|undefined;
  const wet=new T.MeshStandardMaterial({color:'#263637',roughness:.08,transparent:true,opacity:.4});
  if(resident){
    root.name='resident-1704';
    box(0,-.12,0,9.4,.24,12,surface('woodFloor','#b8b3a5',{roughness:.65}));box(0,2.85,0,9.4,.15,12,surface('wall','#72766d'));
    for(const x of [-4.75,4.75])box(x,1.4,0,.2,2.8,12,wall,true);
    for(const z of [-5.95]){for(const x of [-2.7,2.7])box(x,1.4,z,4.1,2.8,.2,wall,true);box(0,2.6,z,1.3,.4,.2,wall);}
    // The stair door leads to a real gallery outside 1704, not to its living room.
    const gallery=buildResidentGallery(root);solids.push(...gallery.solids);lamps.push(...gallery.lamps);
    const plaster=surface('decayWall','#9da598'),galleryFloor=surface('oldTile','#9a9e91',{roughness:.65});
    box(0,-.1,-7.15,1.5,.2,2.5,galleryFloor);box(0,2.87,-7.15,1.5,.14,2.5,plaster);
    for(const x of [-.75,.75])box(x,1.4,-7.15,.14,2.8,2.5,plaster,true);box(0,1.4,-8.45,1.5,2.8,.14,plaster,true);
    label('1703 · 임시 관리실',0,1.9,-8.36,1.15,.28);light(0,2.3,-7.25,'#83998d',2,4);
    function roomDoor(name:string,z:number){
      const hinge=new T.Group();hinge.name=name;hinge.position.set(-.59,0,z);root.add(hinge);
      box(.59,1.15,0,1.16,2.3,.09,metal,false,hinge);box(1.03,1.05,.085,.17,.04,.12,dark,false,hinge);
      box(.59,1.63,.051,.85,.55,.014,wood,false,hinge);
      for(const x of [-.65,.65])box(x,1.19,z,.09,2.38,.17,metal);box(0,2.36,z,1.39,.09,.17,metal);
      const block={x:0,z,w:1.2,d:.1,y:1.15,h:2.3};solids.push(block);return {hinge,block};
    }
    const front=gallery.front,rear=roomDoor('resident-service-door',-5.95);
    frontDoor=front.hinge;rearDoor=rear.hinge;frontBlock=front.block;rearBlock=rear.block;
    target('resident_open','1704호 문 열기',frontDoor,0,1.25,6.12);
    // A central hall connects two rooms, with separate front and rear openings.
    for(const x of [-.9,.9]){box(x,1.4,0,.13,2.8,3.6,wall,true);box(x,.09,0,.15,.18,3.6,wood);}
    for(const x of [-2.85,2.85])box(x,1.4,.3,3.5,2.8,.13,wall,true);
    box(0,.008,4.8,1.6,.02,1.8,surface('tile','#a5aaa2'));
    const shoe=createLeatherShoe('#302b27',false);shoe.name='resident-leather-shoe';shoe.position.set(1.6,.003,4.8);shoe.rotation.y=.45;root.add(shoe);target('belongings','가죽 신발과 관리비 봉투 확인',shoe,1.6,.15,4.8);
    box(2.4,.52,5.45,1.25,1.04,.62,wood,true);box(2.4,1.045,5.45,.4,.01,.24,paper);const envelope=label('1704 · 한서연',2.4,1.052,5.45,.38,.22);envelope.rotation.x=-Math.PI/2;target('belongings','1704호 한서연 · 관리비 봉투',envelope,2.4,1.06,5.3);
    for(const x of [2.09,2.71]){box(x,.54,5.129,.59,.93,.025,wood);box(x,.68,5.105,.03,.18,.027,metal);}box(2.4,1.057,5.45,.25,.001,.001,dark);
    label('야간 당직 · 내선 17\n퇴근 후에는 연결문을 잠가 주세요',0,2.15,5.843,1.1,.4,Math.PI);
    const umbrella=new T.Group();umbrella.name='resident-folded-umbrella';umbrella.position.set(4.01,.08,5.2);root.add(umbrella);
    const canopy=new T.Mesh(new T.CylinderGeometry(.032,.07,.76,9),upholstery('#333f46'));canopy.position.y=.44;umbrella.add(canopy);
    const stem=new T.Mesh(new T.CylinderGeometry(.008,.008,1.08,10),metal);stem.position.y=.54;umbrella.add(stem);
    const grip=new T.Mesh(new T.TorusGeometry(.055,.013,8,18,Math.PI),dark);grip.position.set(.055,1.08,0);umbrella.add(grip);
    const umbrellaStand=new T.Mesh(new T.CylinderGeometry(.22,.2,.5,14),metal);umbrellaStand.position.set(4.01,.25,5.2);root.add(umbrellaStand);
    // Low table, a cushion, untouched tea and an answering machine.
    box(-2.8,.035,2.4,2.8,.05,2.5,upholstery('#88846a'));
    box(-2.6,.39,2.2,1.45,.12,.85,wood,true);for(const x of [-3.2,-2])for(const z of [1.9,2.5])box(x,.17,z,.07,.34,.07,wood);
    box(-2.6,.1,3.3,.75,.16,.6,upholstery('#536264'));
    const machine=box(-3.8,.78,3.6,.52,.16,.38,metal);machine.name='resident-answering-machine';box(-3.8,.35,3.6,.8,.7,.62,wood,true);
    box(-3.8,.87,3.68,.4,.055,.09,dark);for(const x of [-3.97,-3.63])box(x,.875,3.65,.1,.075,.15,dark);
    for(let i=0;i<9;i++){const button=new T.Mesh(new T.CylinderGeometry(.018,.018,.012,12),i===8?paper:dark);button.position.set(-3.85+(i%3)*.05,.867,3.47+Math.floor(i/3)*.045);root.add(button);}
    const display=label('MSG 01',-3.965,.87,3.53,.12,.09,0,'#1b2926','#bcbe91');display.rotation.x=-Math.PI/2;
    const cord=Array.from({length:81},(_,i)=>new T.Vector3(-4.025+Math.cos(i*.9)*.018,.76-i*.003,3.65+Math.sin(i*.9)*.018));root.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(cord),80,.004,5,false),dark));const led=light(-3.8,.92,3.55,'#be6951',.24,1.3);led.name='answering-machine-led';
    target('answerphone','자동응답기 · 녹음 재생',machine,-3.8,.94,3.3);
    box(-2.75,.457,2.16,.3,.014,.21,paper);label('9월 16일',-2.75,.465,2.16,.24,.13).rotation.x=-Math.PI/2;
    const cup=new T.Group();cup.name='resident-teacup';cup.position.set(-2.35,.452,2.3);root.add(cup);
    const ceramic=new T.MeshStandardMaterial({color:'#c9c0a9',roughness:.23});
    const profile=[[.02,0],[.044,.008],[.05,.08],[.048,.095],[.043,.095],[.044,.081],[.039,.015],[.02,.012]].map(([x,y])=>new T.Vector2(x,y));
    cup.add(new T.Mesh(new T.LatheGeometry(profile,28),ceramic));const cupHandle=new T.Mesh(new T.TorusGeometry(.03,.007,8,20),ceramic);cupHandle.position.set(.056,.053,0);cup.add(cupHandle);
    const tea=new T.Mesh(new T.CircleGeometry(.043,24),new T.MeshStandardMaterial({color:'#3b2920',roughness:.09}));tea.rotation.x=-Math.PI/2;tea.position.y=.071;cup.add(tea);
    const saucer=new T.Mesh(new T.CylinderGeometry(.078,.069,.009,28),ceramic);saucer.position.y=.0045;cup.add(saucer);
    const kitchen=cabinet(1.8,1,1.6,wood);kitchen.rotation.y=-Math.PI/2;kitchen.position.set(3.6,0,1.65);root.add(kitchen);solids.push({x:3.6,z:1.65,w:1.6,d:1.8,y:.5,h:1});const top=sinkCounter(1.65,1.85,0,.72,.51,-.49);top.position.set(3.6,1.07,1.65);root.add(top);
    for(const z of [1.85,2.27]){const ring=new T.Mesh(new T.TorusGeometry(.15,.02,8,20),dark);ring.position.set(3.6,1.1,z);ring.rotation.x=Math.PI/2;root.add(ring);}
    box(3.8,1.02,4.4,.75,2.04,.85,paper,true);
    box(3.8,1.03,3.969,.69,1.94,.015,paper);box(4.07,1.35,3.935,.025,.33,.028,metal);
    const note=label('다음에는 맑은 날에.\n내일 오후 두 시',3.8,1.5,3.96,.48,.42,Math.PI);target('portrait','냉장고 쪽지 · 다음에는 맑은 날에',note,3.8,1.5,3.94);box(3.94,1.715,3.944,.07,.033,.016,dark);
    box(-2.9,.15,-3.4,2,.3,3.1,wood,true);box(-2.9,.38,-3.4,1.9,.25,3,upholstery('#b0a68c'));box(-2.9,.55,-4.4,1.25,.18,.48,upholstery('#c3bba7'));
    for(const z of [-4.79,-3.01])box(-4.45,1,z,.3,2,.055,wood);box(-4.59,1,-3.9,.035,2,1.8,wood);
    for(const y of [.03,.5,.96,1.42,1.96])box(-4.45,y,-3.9,.3,.035,1.8,wood);
    for(const z of [-4.5,-4.25,-4,-3.75])box(-4.42,.68,z,.22,.325,.18,paper);
    box(3,.75,-4.65,2,.12,.65,wood,true);for(const x of [2.18,3.82])for(const z of [-4.87,-4.43])box(x,.345,z,.075,.69,.075,wood);box(3,.61,-4.88,1.73,.16,.055,wood);
    box(3,.86,-4.65,.42,.1,.26,paper);
    const window=new T.Mesh(new T.PlaneGeometry(2.4,1.5),nightWindow());window.position.set(2.7,1.85,-5.83);root.add(window);
    for(const x of [1.45,2.7,3.95])box(x,1.85,-5.8,.04,1.6,.06,metal);box(2.7,1.85,-5.79,2.55,.04,.08,metal);
    label('1703호 · 임시 관리실',0,2.6,-5.74,1.25,.25);target('resident_leave','1703호 연결문 열기',rearDoor!,0,1.25,-5.65);
    light(2.7,2,-4.9,'#6a899e',4.5,10);light(-4,2.25,4.6,'#aa936c',1.9,7);light(0,2.4,-5.2,'#84a49b',1.7,6);
    for(let i=0;i<8;i++){const print=new T.Mesh(new T.PlaneGeometry(.14,.3),new T.MeshPhysicalMaterial({map:wetTexture(true,17+i),color:'#25352e',transparent:true,opacity:.4,roughness:.06,depthWrite:false}));print.rotation.x=-Math.PI/2;print.rotation.z=i%2?.12:-.12;print.position.set((i%2?.16:-.16),.012,4.2-i*.56);print.name='return-footprint';print.visible=false;root.add(print);}
    figure.position.set(0,0,10.9);
  }else{
    root.name='accident-aftermath';spawn.set(accidentCar.driverX,1.13,9.2);
    box(0,-.12,0,14,.24,53,surface('concrete','#353e41',{roughness:.2}));for(const x of [-6.1,6.1])box(x,.08,0,1.4,.16,53,surface('concrete','#696f69'));
    for(let z=-23;z<26;z+=5)box(0,.012,z,.12,.02,2.4,paper);
    for(let x=-4.5;x<4.5;x+=1.2)box(x,.018,-3,.7,.03,3,paper);
    for(const x of [-7,7])for(let z=-22;z<=22;z+=8){box(x,4,z,1,8,6,surface('concrete','#4c5956'));box(x*.95,2.8,z,.08,1.3,2,dark);}
    for(const x of [-5.3,5.3]){rod(new T.Vector3(x,0,-3),new T.Vector3(x,5,-3),.05);box(x*.88,4.95,-3,1.2,.12,.3,metal);light(x*.88,4.8,-3,'#b1c4c8',18,18);}
    const paint=new T.MeshStandardMaterial({color:'#20292e',roughness:.28,metalness:.5});
    const carStart=root.children.length;
    box(-2,.56,8,2,.5,4.5,paint);box(-2,.36,8,1.95,.4,4.5,dark);box(-2,.97,6.6,1.88,.1,1.3,paint);
    box(-2,.54,8.8,1.8,.14,1.8,dark);box(-2,.8,7.75,1.8,.14,.5,dark);box(-2,1.05,9.4,1.85,.8,.18,paint);
    for(const x of [-3,-1])for(const z of [6.65,9.5]){const wheel=new T.Mesh(new T.CylinderGeometry(.32,.32,.2,16),dark);wheel.position.set(x,.32,z);wheel.rotation.z=Math.PI/2;root.add(wheel);}
    box(-2,1.68,8.75,1.9,.11,1.7,paint);for(const x of [-2.94,-1.06])box(x,1.2,7.9,.07,1,.07,paint);
    const wheel=new T.Mesh(new T.TorusGeometry(.24,.029,8,28),dark);wheel.position.set(-1.65,.88,8.55);wheel.rotation.x=-.25;root.add(wheel);
    box(-1.65,.88,8.55,.44,.035,.035,dark);box(-1.65,.86,8.54,.09,.13,.055,dark);
    rod(new T.Vector3(-1.65,.88,8.55),new T.Vector3(-1.65,.8,7.84),.045,dark);
    box(-1.65,.86,7.98,.4,.1,.02,new T.MeshStandardMaterial({color:'#617666',emissive:'#345044',emissiveIntensity:.5}));
    const cracks:number[]=[];for(let i=0;i<9;i++){const a=i*2.4;cracks.push(-2.2,1.15,7.91,-2.2+Math.cos(a)*(.16+i*.04),1.15+Math.sin(a)*(.12+i*.025),7.91);}
    root.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(cracks,3)),new T.LineBasicMaterial({color:'#bbc6c5',transparent:true,opacity:.48})));
    carSolid={x:accidentCar.x,z:accidentCar.z,w:2,d:4.5,y:.55,h:1};
    door=new T.Group();door.position.set(-1,0,7.75);root.add(door);box(0,.8,.72,.1,.8,1.45,paint,false,door);box(0,1.42,.72,.06,.06,1.45,metal,false,door);box(.07,.91,1.1,.03,.05,.2,metal,false,door);
    target('car_door','차 문을 열고 내리기',door,accidentCar.doorX,1,8.8);
    for(const x of [-2.65,-1.35]){const l=new T.SpotLight('#d6dbbd',65,35,Math.PI/6,.8,1.5);l.position.set(x,.65,5.75);l.target.position.set(x,0,-15);root.add(l,l.target);}
    const car=new T.Group();car.name='accident-car';for(const part of root.children.slice(carStart))car.add(part);car.position.x=-.35;car.scale.x=-1;root.add(car);
    const bag=box(.8,.15,-3.5,.48,.3,.38,dark);bag.rotation.y=.4;target('road_bag','횡단보도에 떨어진 가방',bag,.8,.3,-3.5);
    const phone=box(.15,.032,-3.2,.16,.06,.3,metal);target('road_phone','금 간 전화기로 신고하기',phone,.15,.12,-3.2);
    const screen=label('긴급 통화',.15,.064,-3.2,.13,.25,0,'#193132','#a0c0b9');screen.rotation.x=-Math.PI/2;
    label('1704',1.1,.03,-3.15,.2,.1).rotation.x=-Math.PI/2;
    target('stay','전화기를 놓지 않고 기다리기',phone,.15,.12,-3.2);
    const lamp=light(.15,.35,-3.2,'#b4d4da',1.4,2);lamp.name='emergency-phone-light';
    figure.position.set(1,0,-15);figure.rotation.y=0;figure.visible=true;
    const points:number[]=[];for(let i=0;i<300;i++){const x=Math.sin(i*7.31)*6,y=(i*.371)%6,z=-25+(i*7.3)%50;points.push(x,y,z,x-.04,y-.25,z);}
    rain=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points,3)),new T.LineBasicMaterial({color:'#a6bcc6',transparent:true,opacity:.28}));root.add(rain);
    for(const x of [-5.5,5.5]){const l=light(x,1,-23,x<0?'#bf443f':'#617fc6',0,16);l.name='rescue-light';}
  }
  function updateStory(stage:Stage,time:number,reducedMotion=false){
    if(resident){
      const frontOpen=stage!=='resident_arrival',rearOpen=stage==='resident_departure';
      if(frontOpen&&frontAt<0)frontAt=time;
      if(rearOpen&&rearAt<0)rearAt=time;
      if(frontAt>=0)frontDoor!.rotation.y=-1.54*T.MathUtils.smoothstep(time-frontAt,0,.85);
      if(rearAt>=0)rearDoor!.rotation.y=-1.54*T.MathUtils.smoothstep(time-rearAt,0,.85);
      for(const [hinge,block] of [[frontDoor,frontBlock],[rearDoor,rearBlock]] as const)if(Math.abs(hinge!.rotation.y)>1.2){const i=solids.indexOf(block!);if(i>=0)solids.splice(i,1);}
      root.children.forEach(o=>{if(o.name==='return-footprint')o.visible=stage==='resident_return'||stage==='resident_departure';});const led=root.getObjectByName('answering-machine-led') as T.PointLight;led.intensity=.16+(Math.sin(time*2)>0?.1:0);}
    else{if(door)door.rotation.y=stage==='road_exit'?0:1.25;if(rain)rain.position.y=-(time*2)%4;
      if(carSolid){const i=solids.indexOf(carSolid);if(stage!=='road_exit'&&i<0)solids.push(carSolid);else if(stage==='road_exit'&&i>=0)solids.splice(i,1);}
      root.children.forEach(o=>{if(o.name==='rescue-light'&&o instanceof T.PointLight)o.intensity=stage==='road_wait'?(reducedMotion?3:Math.max(0,Math.sin(time*3+o.position.x))*14):0;});}
  }
  return {bounds,solids,targets,lamps,figure,shoes,phoneGlow,radioLight,spawn,heading,heightAt:(_x:number,_z:number)=>0,liftDoors:undefined,setDisplay:undefined,fallingFigure:undefined,updateStory};
}

// Both sides of the stair threshold render this exact gallery before the world changes.
export function buildResidentGallery(root:T.Group,closedStairs=true){
  const solids:Solid[]=[],lamps:T.PointLight[]=[];
  const wood=surface('wood','#81715d'),wall=surface('wall','#c0b8a4'),metal=surface('steel','#52605f',{metalness:.5,roughness:.35});
  const dark=new T.MeshStandardMaterial({color:'#16191a',roughness:.8});
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false,parent:T.Object3D=root){const o=new T.Mesh(boxUV(softBox(w,h,d),x,y,z),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);if(solid)solids.push({x,z,w,d,y,h});return o;}
  function label(text:string,x:number,y:number,z:number,w=1,h=.3,ry=0,bg='#b6ac90',fg='#29322d'){
    const c=document.createElement('canvas');c.width=768;c.height=Math.round(768*h/w);const ctx=c.getContext('2d')!,lines=text.split('\n'),font=Math.min(c.height/(lines.length*1.65),700/Math.max(...lines.map(l=>[...l].length),1));
    ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=fg;ctx.font=`${font}px "Apple SD Gothic Neo",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    lines.forEach((line,i)=>ctx.fillText(line,c.width/2,c.height/2+(i-(lines.length-1)/2)*font*1.35));
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.92}));o.position.set(x,y,z);o.rotation.y=ry;root.add(o);return o;
  }
  function light(x:number,y:number,z:number,color:string,power:number,radius=8){const l=new T.PointLight(color,power,radius,2);l.position.set(x,y,z);l.userData.base=power;root.add(l);lamps.push(l);return l;}
    const plaster=surface('decayWall','#9da598'),galleryFloor=surface('oldTile','#9a9e91',{roughness:.65});
    box(0,-.1,8.85,2.6,.2,5.8,galleryFloor);box(0,2.88,8.85,2.6,.16,5.8,plaster);
    for(const x of [-1.3,1.3]){box(x,1.4,8.85,.15,2.8,5.8,plaster,true);box(x,0.43,8.85,.16,.85,5.8,surface('wall','#4f6256'));}
    if(closedStairs){box(0,1.4,11.85,2.6,2.8,.15,plaster,true);box(0,1.1,11.76,1.04,2.2,.08,metal);label('17F · 비상계단',0,2.45,11.7,1.2,.25,Math.PI);}
    box(1.21,1.1,9.25,.06,2.2,.94,metal);label('1705',1.166,2.08,9.25,.34,.14,-Math.PI/2);
    for(const z of [7.4,10.4]){box(0,2.73,z,.17,.09,.78,metal);light(0,2.6,z,'#83998d',2.5,5);}

    for(const x of [-2.7,2.7])box(x,1.4,5.95,4.1,2.8,.2,wall,true);box(0,2.6,5.95,1.3,.4,.2,wall);
    function roomDoor(name:string,z:number){
      const hinge=new T.Group();hinge.name=name;hinge.position.set(-.59,0,z);root.add(hinge);
      box(.59,1.15,0,1.16,2.3,.09,metal,false,hinge);box(1.03,1.05,.085,.17,.04,.12,dark,false,hinge);
      box(.59,1.63,.051,.85,.55,.014,wood,false,hinge);
      for(const x of [-.65,.65])box(x,1.19,z,.09,2.38,.17,metal);box(0,2.36,z,1.39,.09,.17,metal);
      const block={x:0,z,w:1.2,d:.1,y:1.15,h:2.3};solids.push(block);return {hinge,block};
    }

    const front=roomDoor('resident-front-door',5.95);
    label('1704',0,2.55,6.075,.47,.18);label('한서연',.82,1.55,6.065,.32,.12);
    return {solids,lamps,front};
}
