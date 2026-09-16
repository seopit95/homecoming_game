import * as T from 'three';
import {surface,boxUV,softBox,upholstery} from './materials.ts';
import {createGhost} from './ghost.ts';
import {nightWindow} from './japan.ts';
import type {Solid,Target} from './world.ts';
import type {Action,Stage} from './story.ts';

// Two authored spaces share the existing collision, interaction and lighting contracts.
export function buildStoryRoom(root:T.Group,area:'resident'|'aftermath'){
  const resident=area==='resident',bounds=resident?{x:4.6,z:5.8}:{x:6.8,z:25.8};
  const solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[];
  const wood=surface('wood','#81715d'),wall=surface('wall','#c0b8a4'),metal=surface('concrete','#52605f',{metalness:.5,roughness:.35});
  const dark=new T.MeshStandardMaterial({color:'#16191a',roughness:.8}),paper=new T.MeshStandardMaterial({color:'#c4b99a',roughness:.95});
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false,parent:T.Object3D=root){const o=new T.Mesh(boxUV(softBox(w,h,d),x,y,z),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);if(solid)solids.push({x,z,w,d,y,h});return o;}
  function label(text:string,x:number,y:number,z:number,w=1,h=.3,ry=0,bg='#b6ac90',fg='#29322d'){
    const c=document.createElement('canvas');c.width=768;c.height=256;const ctx=c.getContext('2d')!;
    ctx.fillStyle=bg;ctx.fillRect(0,0,768,256);ctx.fillStyle=fg;ctx.font='48px "Yu Mincho",serif';ctx.textAlign='center';ctx.textBaseline='middle';
    const lines=text.split('\n');lines.forEach((line,i)=>ctx.fillText(line,384,128+(i-(lines.length-1)/2)*68));
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.92}));o.position.set(x,y,z);o.rotation.y=ry;root.add(o);return o;
  }
  function target(id:Action,text:string,mesh:T.Object3D,x:number,y:number,z:number){targets.push({id,label:text,mesh,point:new T.Vector3(x,y,z)});}
  function light(x:number,y:number,z:number,color:string,power:number,radius=8){const l=new T.PointLight(color,power,radius,2);l.position.set(x,y,z);l.userData.base=power;root.add(l);lamps.push(l);return l;}
  function rod(a:T.Vector3,b:T.Vector3,r:number,m:T.Material=metal){const o=new T.Mesh(new T.CylinderGeometry(r,r,a.distanceTo(b),10),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());root.add(o);return o;}
  const figure=createGhost(root);figure.visible=false;
  const shoes=new T.Group(),phoneGlow=new T.PointLight(),radioLight=new T.PointLight();
  let spawn=new T.Vector3(0,1.65,4.9),heading=0,door:T.Group|undefined,rain:T.LineSegments|undefined,carSolid:Solid|undefined;
  const wet=new T.MeshStandardMaterial({color:'#263637',roughness:.08,transparent:true,opacity:.4});
  if(resident){
    root.name='resident-1704';
    box(0,-.12,0,9.4,.24,12,surface('wood','#9f927a',{roughness:.65}));box(0,2.85,0,9.4,.15,12,surface('wall','#72766d'));
    for(const x of [-4.75,4.75])box(x,1.4,0,.2,2.8,12,wall,true);
    for(const z of [-5.95,5.95])box(0,1.4,z,9.4,2.8,.2,wall,true);
    // A central hall connects two rooms, with separate front and rear openings.
    for(const x of [-.9,.9]){box(x,1.4,0,.13,2.8,3.6,wall,true);box(x,.09,0,.15,.18,3.6,wood);}
    for(const x of [-2.85,2.85])box(x,1.4,.3,3.5,2.8,.13,wall,true);
    box(0,.008,4.8,1.6,.02,1.8,surface('tile','#a5aaa2'));
    const shoe=box(1.6,.1,4.8,.2,.16,.48,dark);shoe.rotation.y=.45;target('belongings','신발과 이름이 적힌 봉투',shoe,1.6,.3,4.8);
    box(2.4,.52,5.45,1.25,1.04,.62,wood,true);label('1704 · 한서연',2.4,1.1,5.15,.9,.23,Math.PI);
    label('관리실은 뒤쪽 연결문으로',0,2.3,5.82,1.45,.22,Math.PI);
    for(let i=0;i<3;i++)rod(new T.Vector3(3.9+i*.11,.1,5.2),new T.Vector3(3.85+i*.11,1.05,5.22),.025,dark);
    // Low table, a cushion, untouched tea and an answering machine.
    box(-2.8,.035,2.4,2.8,.05,2.5,upholstery('#88846a'));
    box(-2.6,.39,2.2,1.45,.12,.85,wood,true);for(const x of [-3.2,-2])for(const z of [1.9,2.5])box(x,.17,z,.07,.34,.07,wood);
    box(-2.6,.1,3.3,.75,.16,.6,upholstery('#536264'));
    const machine=box(-3.8,.77,3.6,.5,.18,.38,metal);box(-3.8,.35,3.6,.8,.7,.62,wood,true);
    box(-3.8,.88,3.6,.31,.04,.15,dark);const led=light(-3.8,.92,3.55,'#be6951',.24,1.3);led.name='answering-machine-led';
    target('answerphone','자동응답기 · 녹음 재생',machine,-3.8,.94,3.3);
    box(-2.7,.49,2.2,.25,.09,.22,paper);box(-2.35,.49,2.3,.12,.09,.12,metal);
    box(3.6,.5,2.5,1.6,1,2.6,wood,true);box(3.6,1.03,2.5,1.65,.08,2.65,paper);
    box(3.6,1.08,1.65,.65,.025,.6,metal);for(const z of [2.6,3.1]){const ring=new T.Mesh(new T.TorusGeometry(.15,.02,8,20),dark);ring.position.set(3.6,1.1,z);ring.rotation.x=Math.PI/2;root.add(ring);}
    box(3.8,1.02,4.4,.75,2.04,.85,paper,true);
    const note=label('다음에는 맑은 날에.\n내일 오후 두 시',3.8,1.5,3.96,.48,.42,Math.PI);target('portrait','냉장고에 남겨진 약속',note,3.8,1.5,3.95);
    box(-2.9,.15,-3.4,2,.3,3.1,wood,true);box(-2.9,.38,-3.4,1.9,.25,3,upholstery('#b0a68c'));box(-2.9,.55,-4.4,1.25,.18,.48,upholstery('#c3bba7'));
    for(let i=0;i<5;i++)box(-4.45,.5+i*.38,-3.9,.3,.3,1.8,wood);
    box(3,.75,-4.65,2,.12,.65,wood,true);box(3,.86,-4.65,.42,.1,.26,paper);label('한서연',3,1.35,-5.82,.7,.3);
    const window=new T.Mesh(new T.PlaneGeometry(2.4,1.5),nightWindow());window.position.set(2.7,1.85,-5.83);root.add(window);
    for(const x of [1.45,2.7,3.95])box(x,1.85,-5.8,.04,1.6,.06,metal);box(2.7,1.85,-5.79,2.55,.04,.08,metal);
    const passage=box(0,1.2,-5.83,1.55,2.4,.12,metal);label('관리실 →',0,2.6,-5.74,1.25,.25);target('resident_leave','뒤쪽 연결문으로 나가기',passage,0,1.25,-5.65);
    light(2.7,2,-4.9,'#6a899e',4.5,10);light(-4,2.25,4.6,'#aa936c',1.9,7);light(0,2.4,-5.2,'#84a49b',1.7,6);
    for(let i=0;i<8;i++){const print=new T.Mesh(new T.CircleGeometry(.1,12),wet);print.rotation.x=-Math.PI/2;print.scale.y=1.8;print.position.set((i%2?.16:-.16),.012,4.2-i*.56);print.name='return-footprint';print.visible=false;root.add(print);}
    figure.position.set(0,0,5.2);
  }else{
    root.name='accident-aftermath';spawn.set(-1.65,1.13,9.2);
    box(0,-.12,0,14,.24,53,surface('concrete','#353e41',{roughness:.2}));for(const x of [-6.1,6.1])box(x,.08,0,1.4,.16,53,surface('concrete','#696f69'));
    for(let z=-23;z<26;z+=5)box(0,.012,z,.12,.02,2.4,paper);
    for(let x=-4.5;x<4.5;x+=1.2)box(x,.018,-3,.7,.03,3,paper);
    for(const x of [-7,7])for(let z=-22;z<=22;z+=8){box(x,4,z,1,8,6,surface('concrete','#4c5956'));box(x*.95,2.8,z,.08,1.3,2,dark);}
    for(const x of [-5.3,5.3]){rod(new T.Vector3(x,0,-3),new T.Vector3(x,5,-3),.05);box(x*.88,4.95,-3,1.2,.12,.3,metal);light(x*.88,4.8,-3,'#b1c4c8',18,18);}
    const paint=new T.MeshStandardMaterial({color:'#20292e',roughness:.28,metalness:.5});
    box(-2,.56,8,2,.5,4.5,paint);box(-2,.36,8,1.95,.4,4.5,dark);box(-2,.97,6.6,1.88,.1,1.3,paint);
    box(-2,.54,8.8,1.8,.14,1.8,dark);box(-2,.8,7.75,1.8,.14,.5,dark);box(-2,1.05,9.4,1.85,.8,.18,paint);
    for(const x of [-3,-1])for(const z of [6.65,9.5]){const wheel=new T.Mesh(new T.CylinderGeometry(.32,.32,.2,16),dark);wheel.position.set(x,.35,z);wheel.rotation.z=Math.PI/2;root.add(wheel);}
    box(-2,1.68,8.75,1.9,.11,1.7,paint);for(const x of [-2.94,-1.06])box(x,1.2,7.9,.07,1,.07,paint);
    const wheel=new T.Mesh(new T.TorusGeometry(.24,.029,8,28),dark);wheel.position.set(-1.65,.88,8.55);wheel.rotation.x=-.25;root.add(wheel);
    box(-1.65,.88,8.55,.44,.035,.035,dark);box(-1.65,.86,8.54,.09,.13,.055,dark);
    box(-1.65,.86,7.98,.4,.1,.02,new T.MeshStandardMaterial({color:'#617666',emissive:'#345044',emissiveIntensity:.5}));
    const cracks:number[]=[];for(let i=0;i<9;i++){const a=i*2.4;cracks.push(-2.2,1.15,7.91,-2.2+Math.cos(a)*(.16+i*.04),1.15+Math.sin(a)*(.12+i*.025),7.91);}
    root.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(cracks,3)),new T.LineBasicMaterial({color:'#bbc6c5',transparent:true,opacity:.48})));
    carSolid={x:-2,z:8,w:2,d:4.5,y:.55,h:1};
    door=new T.Group();door.position.set(-1,0,7.75);root.add(door);box(0,.8,.72,.1,.8,1.45,paint,false,door);box(0,1.42,.72,.06,.06,1.45,metal,false,door);box(.07,.91,1.1,.03,.05,.2,metal,false,door);
    target('car_door','차 문을 열고 내리기',door,-.95,1,8.8);
    for(const x of [-2.65,-1.35]){const l=new T.SpotLight('#d6dbbd',65,35,Math.PI/6,.8,1.5);l.position.set(x,.65,5.75);l.target.position.set(x,0,-15);root.add(l,l.target);}
    const bag=box(.8,.16,-3.5,.48,.3,.38,dark);bag.rotation.y=.4;target('road_bag','횡단보도에 떨어진 가방',bag,.8,.3,-3.5);
    const phone=box(.15,.06,-3.2,.16,.06,.3,metal);target('road_phone','전화기를 들고 신고하기',phone,.15,.12,-3.2);
    label('1704',1.1,.03,-3.15,.2,.1).rotation.x=-Math.PI/2;
    target('stay','전화기를 놓지 않고 기다리기',phone,.15,.12,-3.2);
    const lamp=light(.15,.35,-3.2,'#b4d4da',1.4,2);lamp.name='emergency-phone-light';
    figure.position.set(1,0,-15);figure.rotation.y=0;figure.visible=true;
    const points:number[]=[];for(let i=0;i<300;i++){const x=Math.sin(i*7.31)*6,y=(i*.371)%6,z=-25+(i*7.3)%50;points.push(x,y,z,x-.04,y-.25,z);}
    rain=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points,3)),new T.LineBasicMaterial({color:'#a6bcc6',transparent:true,opacity:.28}));root.add(rain);
    for(const x of [-5.5,5.5]){const l=light(x,1,-23,x<0?'#bf443f':'#617fc6',0,16);l.name='rescue-light';}
  }
  function updateStory(stage:Stage,time:number,reducedMotion=false){
    if(resident){root.children.forEach(o=>{if(o.name==='return-footprint')o.visible=stage==='resident_return';});const led=root.getObjectByName('answering-machine-led') as T.PointLight;led.intensity=.16+(Math.sin(time*2)>0?.1:0);}
    else{if(door)door.rotation.y=stage==='road_exit'?0:1.25;if(rain)rain.position.y=-(time*2)%4;
      if(carSolid){const i=solids.indexOf(carSolid);if(stage!=='road_exit'&&i<0)solids.push(carSolid);else if(stage==='road_exit'&&i>=0)solids.splice(i,1);}
      root.children.forEach(o=>{if(o.name==='rescue-light'&&o instanceof T.PointLight)o.intensity=stage==='road_wait'?(reducedMotion?3:Math.max(0,Math.sin(time*3+o.position.x))*14):0;});}
  }
  return {bounds,solids,targets,lamps,figure,shoes,phoneGlow,radioLight,spawn,heading,heightAt:(_x:number,_z:number)=>0,liftDoors:undefined,setDisplay:undefined,fallingFigure:undefined,updateStory};
}
