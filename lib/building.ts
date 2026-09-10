import * as T from 'three';
import type {Area,Action} from './story';
import type {Bounds,Solid,Target} from './world';
import {surface,boxUV,softBox} from './materials.ts';
import {dressApartment} from './japan.ts';

export {createGhost as makeFigure} from './ghost.ts';
import {createGhost as makeFigure} from './ghost.ts';
export function buildBuilding(root:T.Group,area:Exclude<Area,'apartment'>){
  const solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[];
  const bounds:Bounds=area==='corridor'?{x:3.8,z:26.8}:area==='parking'?{x:14.8,z:24.8}:area==='lift'?{x:1.8,z:2.8}:{x:6.8,z:8.8};
  const mat=(color:string,extra:object={})=>new T.MeshStandardMaterial({color,roughness:.84,...extra});
  const wallMat=surface(area==='parking'||area==='stairs'?'concrete':'wall',area==='parking'?'#b3babd':'#bbbcb2'),floorMat=surface(area==='parking'||area==='stairs'?'concrete':'tile','#acaea6',{roughness:area==='parking'?.6:.44}),metal=mat('#4e5d60',{metalness:.65,roughness:.4}),dark=mat('#101a19'),wood=surface('wood','#aaa297'),stripe=mat('#a1a792');
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false){
    const mesh=new T.Mesh(boxUV(softBox(w,h,d),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);if(solid)solids.push({x,z,w,d,y,h});return mesh;
  }
  function wall(x:number,z:number,w:number,d:number,y=1.6,h=3.2){box(x,y,z,w,h,d,wallMat,true);box(x,y-h/2+.5,z,w+.025,.95,d+.025,surface(area==='parking'||area==='stairs'?'concrete':'tile','#838b87'));}
  function label(text:string,x:number,y:number,z:number,ry=0,w=1.4,h=.34,color='#d5ddbd',background='#172c27'){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;const ctx=canvas.getContext('2d')!;
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture}));mesh.position.set(x,y,z);mesh.rotation.y=ry;root.add(mesh);
    const update=(text:string)=>{ctx.fillStyle=background;ctx.fillRect(0,0,768,192);ctx.fillStyle=color;ctx.font='58px "Apple SD Gothic Neo",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,96);texture.needsUpdate=true;};update(text);
    return {mesh,update};
  }
  function light(x:number,y:number,z:number,color='#9cb9b1',intensity=7){const l=new T.PointLight(color,intensity,11,2);l.position.set(x,y,z);root.add(l);lamps.push(l);return l;}
  function fixture(x:number,z:number,color='#b0c6bb'){box(x,3.02,z,.2,.08,1.25,mat('#bbbfa6',{emissive:color,emissiveIntensity:.75}));light(x,2.75,z,color);}
  function target(id:Action,label:string,mesh:T.Object3D,x:number,y:number,z:number){targets.push({id,label,mesh,point:new T.Vector3(x,y,z)});}
  function door(id:Action,text:string,x:number,z:number,y=0){const mesh=box(x,y+1.22,z,1.65,2.44,.13,metal);box(x+.56,y+1.05,z+.16,.2,.07,.1,stripe);label(({stairs:'非常階段',up:'上階  ↑',down:'下階  ↓',service_exit:'地下 避難通路',exit:'非常口  EXIT'} as Partial<Record<Action,string>>)[id]||text,x,y+2.7,z+.11,0,1.7,.3);target(id,text,mesh,x,y+1.25,z+.3);return mesh;}
  function cable(x:number,z:number,length:number){box(x,2.86,z,.075,.075,length,mat('#642f28'));}
  const spawn=new T.Vector3(0,1.65,7);let heading=0,heightAt:((x:number,z:number)=>number)=()=>0;
  let liftDoors:{left:T.Mesh;right:T.Mesh}|undefined;
  let setDisplay:((text:string)=>void)|undefined;
  const figure=makeFigure(root),shoes=new T.Group(),phoneGlow=new T.PointLight(),radioLight=new T.PointLight();
  const bx=bounds.x+.2,bz=bounds.z+.2;
  if(area!=='stairs'){
    box(0,-.12,0,bx*2,.24,bz*2,floorMat);box(0,3.25,0,bx*2,.15,bz*2,mat('#394643'));
    wall(-bx,0,.2,bz*2);wall(bx,0,.2,bz*2);wall(0,-bz,bx*2,.2);wall(0,bz,bx*2,.2);
  }
  if(area==='landing'||area==='lift'){
    const dz=area==='landing'?-8.75:-2.75;
    const left=box(-.48,1.3,dz,.94,2.6,.11,metal),right=box(.48,1.3,dz,.94,2.6,.11,metal);liftDoors={left,right};
    box(-1.1,1.4,dz,.14,2.8,.18,dark);box(1.1,1.4,dz,.14,2.8,.18,dark);box(0,2.81,dz,2.3,.17,.18,dark);
    const display=label('28',0,2.46,dz+.16,0,.55,.25,'#e29a69','#08110f');setDisplay=display.update;
    if(area==='landing'){
      label('28F',-4,1.8,-8.8,0,1.7,.75);label('2803  ←    エレベーター  ↑',0,2.7,4.5,0,3,.3);
      const call=box(1.48,1.3,dz+.1,.25,.44,.16,metal);label('▽',1.48,1.35,dz+.2,0,.17,.2,'#d19369');target('call','엘리베이터 호출',call,1.48,1.35,dz+.35);target('enter','엘리베이터에 타기',left,0,1.3,dz+.4);
      for(const z of [-4,3])fixture(0,z);for(const x of [-5,5]){box(x,1.25,8.83,1.55,2.5,.12,wood);label(x<0?'2803':'2804',x,2,8.7,Math.PI,.5,.18);}
      for(const z of [-5,0,5])box(-6.85,1.8,z,.03,1.65,1.8,mat('#1b3340',{emissive:'#142c40',emissiveIntensity:.5}));
      box(5,.65,-6,1.3,1.3,1.1,wood,true);box(5,1.45,-6,.4,.6,.4,mat('#3d4936'));
    }else{
      spawn.set(0,1.65,1.5);heading=0;fixture(0,.2,'#d4d3ac');
      for(const x of [-1.7,1.7])box(x,1.02,0,.055,.07,4.4,metal);
      const panel=box(1.75,1.5,-1.2,.08,.85,.55,metal);label('1F  ↓',1.67,1.65,-1.2,-Math.PI/2,.4,.2,'#daa969');
      target('panel','1층 누르기',panel,1.5,1.5,-1.2);target('pry','길게 눌러 문 벌리기',left,0,1.4,dz+.3);target('leave_lift','벌어진 문으로 나가기',right,0,1.3,dz+.4);
      label('定員 13名',0,2.2,2.85,Math.PI,1.1,.23);label('ドアに手を触れないで下さい',0,1.8,2.85,Math.PI,1.3,.22);
      for(let y=.25;y<2.5;y+=.35)box(1.76,y,0,.03,.015,5.2,stripe);
    }
  }
  if(area==='corridor'){
    spawn.set(0,1.65,24);heading=0;door('stairs','비상계단  EXIT',0,-26.78);
    label('24F',-2,1.8,26.85,Math.PI,1.3,.65,'#aa947a');
    for(let z=-21;z<25;z+=6){fixture(0,z,z%3===0?'#829d94':'#c29772');for(const x of [-3.83,3.83]){box(x,1.2,z,.1,2.4,1.4,wood);label(String(2400+Math.round((z+27)/6)+(x>0?10:0)),x*.991,2,z,x<0?Math.PI/2:-Math.PI/2,.5,.17);}}
    for(const [x,z] of [[-2.4,13],[2.4,2],[-2.4,-9]]){box(x,.58,z,2,1.16,1.4,mat('#685b45'),true);box(x,.08,z,2.2,.15,1.6,dark);}
    for(let z=-25;z<25;z+=2){box(-3.4,.014,z,.08,.025,1.2,mat('#acc09a',{emissive:'#8aae6d',emissiveIntensity:.6}));box(3.4,.014,z,.08,.025,1.2,stripe);}
    cable(-2.7,0,52);light(0,2.4,-24,'#67b28f',10);
    box(0,1.2,26.87,1.9,2.4,.1,metal);
  }
  if(area==='stairs'){
    // Two separate flights meet on the central landing; continuous collision height follows each flight.
    heightAt=(x,z)=>z>=0?0:(x<0?1:-1)*Math.min(2.8,-z*2.8/6);
    box(0,-.15,4.5,14,.3,9,floorMat);box(-3.5,2.65,-7.5,7,.3,3,floorMat);box(3.5,-2.95,-7.5,7,.3,3,floorMat);
    wall(-7,0,.2,18,1.5,10);wall(7,0,.2,18,1.5,10);wall(0,-9,14,.2,1.5,10);wall(0,9,14,.2,1.5,10);wall(0,-4.6,.22,9,1.5,10);
    box(0,6.3,0,14,.15,18,mat('#293b37'));
    for(let i=0;i<18;i++)for(const side of [-1,1]){
      const z=-(i+.5)/3,y=-side*(i+.5)*2.8/18;
      box(side*3.5,y-.09,z,6.7,.18,1/3,floorMat);box(side*3.5,y+.006,z-.13,6.4,.015,.04,stripe);
      box(side*.4,y+.48,z,.045,.96,.045,metal);
    }
    door('up','위층  ↑',-3.5,-8.8,2.8);door('down','아래층  ↓',3.5,-8.8,-2.8);
    const note=label('点検記録',0,1.7,8.78,Math.PI,1.5,.5,'#1e2720','#c8bd98');target('stair_note','계단 점검 메모 읽기',note.mesh,0,1.65,8.55);
    label('23F',-6.85,2,4,Math.PI/2,2,1);label('↓ 下り階段',3.5,1,0,0,2,.32);label('↑ 上り階段',-3.5,3.7,-7,0,2,.32);
    light(0,4.5,4,'#9aad90',12);light(-3.5,5.5,-6,'#b3a17b',9);light(3.5,-.3,-6,'#7b9c8b',9);
    spawn.set(0,1.65,5.5);
  }
  if(area==='office'){
    for(const x of [-1.35,1.35]){wall(x,-5.5,.16,6.5);wall(x,1,.16,2);wall(x,7.7,.16,2.5);}
    wall(-4.2,-1.5,5.5,.17);wall(4.2,-1.5,5.5,.17);
    // Gaps at z=-1.5..-2.25 and z=2..6.45 keep all rooms connected.
    for(const z of [-6,1,6])fixture(0,z,'#8da293');
    const desk=box(-4.3,.7,4.5,2.8,1.4,1.1,wood,true);box(-4.8,1.435,4.58,.5,.03,.4,mat('#c3b38c'));target('record','야간 근무일지 읽기',desk,-4.8,1.5,4.7);
    const monitor=box(-3.65,1.79,4.4,.88,.65,.2,dark);const screen=label('신호 없음',-3.65,1.8,4.52,0,.77,.48,'#81ae8f','#0a1711');setDisplay=screen.update;target('monitor','CCTV 확인 · 비상 열쇠 챙기기',monitor,-3.65,1.8,4.7);
    box(-3,1.44,4.6,.18,.04,.12,mat('#b8ac75',{metalness:.7}));
    box(-5.5,.5,7,1,.7,.9,wood,true);label('夜間管理室',-4.3,2.5,-1.38,0,2,.35);
    for(const x of [-6.2,-4.4]){box(x,1.1,-6,.7,2.2,3.3,wood,true);for(let z=-7.2;z<-4.5;z+=.4)for(const y of [.5,1.2,1.9])box(x+.38,y,z,.08,.43,.26,mat('#8c8169'));}
    const fuse=box(-2.5,1.38,-7.8,.24,.34,.18,mat('#c9c5a1'));box(-2.5,.6,-7.8,1.1,1.2,.6,wood,true);target('fuse','예비 퓨즈 챙기기',fuse,-2.5,1.4,-7.4);label('予備ヒューズ',-2.5,1.7,-8.7,0,1.3,.25);
    const power=box(6.78,1.5,-5,.19,1.2,.9,metal);target('security_power','퓨즈 장착 · CCTV 전원 복구',power,6.52,1.5,-5);label('監視カメラ 電源',6.65,2.3,-5,-Math.PI/2,1.3,.26);
    // The rear archive rooms open from the corridor near z=-2.
    light(-4.5,2.7,-5,'#a29578',5);light(4,2.7,-5,'#7c9f9d',5);light(-4.4,2.7,5,'#bfa16f',6);
    door('service_exit','B1 비상 연결계단',0,-8.8);label('17F  管理室',0,2.7,8.7,Math.PI,2.1,.34);
    for(let z=1;z<7;z+=1.4)box(6.85,1.75,z,.035,1.6,.8,mat('#122824',{emissive:'#132e27',emissiveIntensity:.4}));
  }
  if(area==='parking'){
    spawn.set(0,1.65,22.5);door('exit','보행자 출구  EXIT',0,-24.78);
    light(0,2.5,-23,'#8ad9ab',12);label('B1',0,2.6,24.8,Math.PI,2,.8,'#b5bba3');
    for(const x of [-9,9])for(const z of [-15,-3,9]){box(x,1.6,z,.9,3.2,.9,wallMat,true);for(let y=.2;y<1.4;y+=.3)box(x,y,z,.94,.12,.94,mat('#c1a345'));label('B1',x,2,z+.48,0,.7,.3);}
    for(const x of [-5,5])for(const z of [-17,-7,3,13]){
      const paint=mat(x<0?'#405c61':'#655853',{metalness:.4});box(x,.65,z,2,1.1,4.2,paint,true);box(x,1.35,z-.2,1.8,.65,2,dark);
      for(const dx of [-1.03,1.03])for(const dz of [-1.3,1.3])box(x+dx,.36,z+dz,.16,.54,.54,dark);
      for(const dx of [-.65,.65])box(x+dx,.7,z+2.12,.35,.18,.03,mat('#b5c9be',{emissive:'#4a6662',emissiveIntensity:.35}));
      box(x,1.16,z+1.18,1.8,.08,.7,paint);for(const xx of [x-1.4,x+1.4])box(xx,.006,z,.07,.015,4.7,stripe);
    }
    for(const z of [-19,-7,5,17])for(const x of [-11,0,11])fixture(x,z,'#869f9b');
    for(const x of [-12,-1,12])cable(x,0,48);
    const alarm=box(-13.5,1.4,16,.5,.65,.3,mat('#962f25',{emissive:'#681a10',emissiveIntensity:.5}));target('alarm','화재경보기 작동',alarm,-13.3,1.4,16.3);label('火災報知器',-13.5,2.1,16.18,0,1.3,.3,'#e2c6a1','#651b13');
    light(-13,2.6,16,'#d15338',5);box(0,2.2,-24.7,2.1,.05,.06,stripe);
    for(let z=-22;z<22;z+=3)box(0,.012,z,.06,.02,1.4,mat('#b1ac80'));
    figure.position.set(.8,0,-22.9);figure.visible=true;
  }
  dressApartment(root,area);
  return {solids,targets,lamps,shoes,figure,phoneGlow,radioLight,bounds,spawn,heading,heightAt,liftDoors,setDisplay};
}
