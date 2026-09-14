import * as T from 'three';
import {apartment as home,apartmentScale as S,spaceFurniture} from './apartment-layout.ts';
import type { Action, Area } from './story';
import {buildBuilding,makeFigure} from './building.ts';
import {surface,boxUV,softBox} from './materials.ts';
import {dressApartment} from './japan.ts';

export type Bounds={x:number;z:number};
export type Solid = { x: number; z: number; w: number; d: number; y?:number; h?:number };
export function canStandAt(x:number,z:number,solids:Solid[],r=.23,bounds:Bounds=home.bounds){return Math.abs(x)<bounds.x&&Math.abs(z)<bounds.z&&!solids.some(s=>Math.abs(x-s.x)<s.w/2+r&&Math.abs(z-s.z)<s.d/2+r);}
export function hasLineOfSight(from:{x:number;y:number;z:number},to:{x:number;y:number;z:number},solids:Solid[]){
  const distance=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z);
  for(let s=.1;s<distance-.15;s+=.1){const t=s/distance,x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t,z=from.z+(to.z-from.z)*t;
    if(solids.some(b=>Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2&&y>(b.y??1.5)-(b.h??3)/2&&y<(b.y??1.5)+(b.h??3)/2))return false;
  }
  return true;
}
export type Target = { id: Action; point: T.Vector3; label: string; mesh: T.Object3D };
export function buildWorld(scene:T.Scene,area:Area='apartment'){
  const root=new T.Group();scene.add(root);
  const content=area==='apartment'?{...buildApartment(root),bounds:home.bounds,spawn:new T.Vector3(...home.stand),heading:0,heightAt:(_x:number,_z:number)=>0,liftDoors:undefined,setDisplay:undefined,fallingFigure:undefined}:{...buildBuilding(root,area),setTV:undefined};
  return {updateStory:undefined,...content,root};
}
export function disposeWorld(root:T.Object3D){
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
  root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material])){materials.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)textures.add(v);}}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();
}
function buildApartment(scene:T.Group) {
  const solids: Solid[] = [], targets: Target[] = [];
  const {at,finish}=spaceFurniture(scene,solids);
  let seed = 47;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const mat=(color:string, roughness=.86,extra:object={})=>new T.MeshStandardMaterial({color,roughness,...extra});
  const wallMat=surface('wall','#c3c0b4'), lowerMat=surface('wall','#aca99a');
  const floorMat=surface('wood','#b3a994',{roughness:.54}), wood=surface('wood','#aaa18d'), dark=mat('#111816'), trim=mat('#252b25');
  const fabric=mat('#656856'), cream=mat('#a7a398'), metal=mat('#373e3c',.45,{metalness:.5});
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false,parent:T.Object3D=scene){
    const mesh=new T.Mesh(boxUV(softBox(w,h,d),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    if(solid)solids.push({x,z,w,d,y,h});return mesh;
  }
  function cyl(x:number,y:number,z:number,r:number,h:number,m:T.Material,parent:T.Object3D=scene){
    const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,16),m);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  function wall(x:number,z:number,w:number,d:number){
    x*=S;z*=S;if(w>.3)w*=S;if(d>.3)d*=S;
    box(x,1.5,z,w,3,d,wallMat,true);box(x,.48,z,w+.02,.95,d+.02,lowerMat);box(x,1,z,w+.035,.045,d+.035,trim);box(x,.07,z,w+.05,.14,d+.05,trim);
  }
  function print(text:string,fg='#c6c6b5',bg='#232b27',size=35,w=512,h=128){
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d')!;
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle=fg;ctx.font=`${size}px "Apple SD Gothic Neo",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,w/2,h/2);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
  }
  function sign(text:string,x:number,y:number,z:number,ry=0,w=.75,h=.19){
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:print(text),roughness:.85}));mesh.position.set(x,y,z);mesh.rotation.y=ry;scene.add(mesh);return mesh;
  }
  // Open living, dining and kitchen; two wide openings connect the private rooms.
  box(0,-.12,0,home.width,.24,home.depth,floorMat).name='apartment-floor';box(0,3.07,0,home.width,.14,home.depth,surface('wall','#7e827e'));
  wall(-(6.6+.75/S)/2,-6.25,6.6-.75/S,.2);wall((6.6+.75/S)/2,-6.25,6.6-.75/S,.2);wall(0,6.25,13.2,.2);wall(-6.6,0,.2,12.5);wall(6.6,0,.2,12.5);
  wall(1.8,-4.3,.17,3.9);wall(1.8,0,.17,1);wall(1.8,5.1,.17,2.3);
  wall(4.2,-.5,4.8,.18);wall(4,-4.3,.17,3.9);
  wall(-4.65,-2.4,3.9,.18);wall(-2.7,-5.35,.17,1.8);
  box(1.8*S,2.83,2.23*S,.2,.34,3.45*S,wood);box(1.8*S,2.83,-1.43*S,.2,.34,1.85*S,wood);
  sign('洗面所',4.12*S,2.48,-1.5*S,Math.PI/2,.7,.18);sign('和 室',1.67*S,2.52,2.2*S,-Math.PI/2,.7,.18);
  at(0,-6.25);
  const door=new T.Group();door.name='open-front-door';door.position.set(-.75,0,-6.11);door.rotation.y=1.18;scene.add(door);
  box(.725,1.22,0,1.45,2.44,.13,mat('#33413b'),false,door);box(.725,1.2,.08,1.2,1.7,.045,mat('#394740'),false,door);box(1.22,1.02,.17,.18,.055,.15,metal,false,door);
  box(0,2.53,-5.98,1.65,.11,.18,wood);for(const x of [-.81,.81])box(x,1.25,-5.98,.12,2.6,.18,wood);sign('2803',-.94,1.98,-5.93,0,.32,.12);
  box(0,-.11,-7.7,4,.2,3,floorMat);box(0,1.5,-9.2,4,3,.15,wallMat);for(const x of [-2,2])box(x,1.5,-7.7,.15,3,3,wallMat);
  targets.push({id:'door',point:new T.Vector3(...home.door),label:'열린 현관으로 나가기',mesh:door});
  at(1.18,-5.3);
  box(1.18,.64,-5.3,.55,1.28,1.2,wood,true);
  at(0,-4.65);
  const shoes=new T.Group();scene.add(shoes);shoes.visible=false;
  for(const x of [-.22,.16]){const shoe=box(x,.11,-4.65,.2,.16,.52,mat('#1c2322',.26),false,shoes);shoe.rotation.y=.3;box(x,.2,-4.83,.19,.17,.16,dark,false,shoes);}
  const wet=mat('#283e39',.06,{transparent:true,opacity:.7});
  for(let i=0;i<7;i++){const p=new T.Mesh(new T.CircleGeometry(.13+rand()*.15,12),wet);p.rotation.x=-Math.PI/2;p.position.set((rand()-.5)*.6,.016,-4.5+i*.63);p.scale.y=.47;shoes.add(p);}
  targets.push({id:'shoes',point:new T.Vector3(...home.shoes),label:'젖은 신발',mesh:shoes});
  at(0,6.25);
  const clock=sign('03:17',0,2.65,6.13,Math.PI,.75,.25);clock.material.map=print('03:17','#c07052','#151914',55);clock.material.emissive.set('#c07052');clock.material.emissiveMap=clock.material.map;clock.material.emissiveIntensity=.8;
  // A broad lounge looks across to the television, with circulation on both sides.
  at(-3.2,2.4);
  box(-3.2,.018,2.4,5.2,.035,3.7,mat('#81795c'));
  for(let z=.6;z<4.2;z+=.1)box(-3.2,.04,z,5,.005,.017,mat('#645f47'));
  at(-1.2,2.5);
  box(-1.2,.35,2.5,1.1,.5,3.2,wood,true);box(-.78,.89,2.5,.26,1,3.2,fabric);
  for(const z of [1,4])box(-1.2,.69,z,1.1,.5,.25,fabric);for(const z of [1.55,2.5,3.45])box(-1.28,.65,z,.85,.23,.85,fabric);
  at(-3.15,2.4);
  box(-3.15,.47,2.4,1.2,.13,1.8,wood,true);for(const x of [-3.62,-2.68])for(const z of [1.65,3.15])box(x,.22,z,.075,.45,.075,wood);
  const phone=box(-3.15,.562,2.4,.19,.035,.37,dark);
  const ps=new T.Mesh(new T.PlaneGeometry(.16,.32),new T.MeshBasicMaterial({map:print('03:17','#c3d9c8','#24483e',45,256,512)}));ps.position.set(-3.15,.583,2.4);ps.rotation.x=-Math.PI/2;scene.add(ps);
  targets.push({id:'phone',point:new T.Vector3(...home.phone),label:'휴대전화 확인',mesh:phone});const phoneGlow=new T.PointLight('#8cbf9f',.6,2);phoneGlow.position.set(-3.15,.8,2.4);scene.add(phoneGlow);
  cyl(-3.35,.64,2.98,.11,.21,cream);cyl(-3.35,.751,2.98,.087,.004,mat('#201a13'));box(-3.1,.563,1.91,.45,.025,.33,cream);
  at(-6.12,2.4);
  box(-6.12,.43,2.4,.62,.86,2.8,wood,true);box(-6.39,1.43,2.4,.13,1.13,2.3,dark);
  const tvCanvas=document.createElement('canvas');tvCanvas.width=640;tvCanvas.height=320;
  const tvContext=tvCanvas.getContext('2d')!,tvTexture=new T.CanvasTexture(tvCanvas);tvTexture.colorSpace=T.SRGBColorSpace;
  const tvMaterial=new T.MeshBasicMaterial({map:tvTexture,color:0x000000});
  const tvScreen=new T.Mesh(new T.PlaneGeometry(2.15,.97),tvMaterial);tvScreen.position.set(-6.31,1.43,2.4);tvScreen.rotation.y=Math.PI/2;tvScreen.name='apartment-tv-screen';scene.add(tvScreen);box(-6.31,.93,2.4,.1,.22,.07,metal);
  const tvLight=new T.PointLight('#a5bcdb',0,6);tvLight.position.set(-5.95,1.5,2.4);tvLight.name='apartment-tv-light';scene.add(tvLight);
  let tvFrame=-1;
  function setTV(on:boolean,time:number){
    tvMaterial.color.setHex(on?0xffffff:0x000000);tvLight.intensity=on?3.3+Math.sin(time*2)*.25:0;
    if(!on||tvFrame===Math.floor(time*4))return;tvFrame=Math.floor(time*4);
    const ctx=tvContext;ctx.fillStyle='#172b48';ctx.fillRect(0,0,640,320);
    // Original late-night news broadcast, with moving rain over a city skyline.
    for(let i=0;i<18;i++){const h=35+(i*37)%100;ctx.fillStyle=i%2?'#263c56':'#0c1a2b';ctx.fillRect(i*37,260-h,32,h);ctx.fillStyle='#a9bfc5';for(let j=0;j<5;j++)ctx.fillRect(i*37+8,260-h+12+j*19,4,5);}
    ctx.fillStyle='#6f8eac';for(let i=0;i<60;i++)ctx.fillRect((i*79)%640,(i*47+time*80)%260,1,13);
    ctx.fillStyle='#e1e8eb';ctx.font='22px serif';ctx.fillText('深夜ニュース',28,40);ctx.font='16px sans-serif';ctx.fillText('03:17   関東地方 / 雨',28,70);
    ctx.fillStyle='#dde2df';ctx.fillRect(0,267,640,53);ctx.fillStyle='#192636';ctx.font='19px sans-serif';ctx.fillText('三日前の死亡ひき逃げ事件  ·  情報提供を',24,300);
    ctx.fillStyle='#152034';for(let y=0;y<260;y+=5)ctx.fillRect(0,y,640,1);tvTexture.needsUpdate=true;
  }
  // Full kitchen, dining area and a separate study give the home a lived-in scale.
  at(-4.5,-1.7);
  box(-4.5,.46,-1.7,3.5,.92,.9,wood,true);box(-4.5,.95,-1.7,3.55,.06,.94,cream);
  box(-5.3,.986,-1.7,.72,.018,.58,metal);cyl(-5.3,1.08,-1.97,.027,.2,metal);
  for(const x of [-4.1,-3.72])for(const z of [-1.52,-1.87])cyl(x,.99,z,.12,.015,dark);
  at(-6.04,-.65);
  box(-6.04,1,-.65,.78,2,.83,cream,true);box(-5.64,1,-.65,.03,.05,.77,metal);
  at(-4.5,-1.7);
  for(const x of [-5.5,-4.5,-3.5])box(x,2.1,-2.14,.9,.8,.32,wood);
  at(-4.2,5.15);
  box(-4.2,.76,5.15,2.05,.12,.95,wood,true);for(const x of [-4.95,-3.45])for(const z of [4.9,5.4])box(x,.38,z,.07,.75,.07,wood);
  for(const x of [-4.85,-3.55])for(const z of [4.42,5.84]){box(x,.42,z,.48,.08,.44,wood,true);box(x,.68,z+(z>5?.19:-.19),.48,.52,.07,wood);}
  at(-4.2,5.15);
  const timer=cyl(-4.2,.9,5.15,.105,.16,cream);targets.push({id:'lure',point:new T.Vector3(-4.2*S,.94,5.15*S),label:'주방 타이머 울리기',mesh:timer});
  at(-5.3,-5.6);
  box(-5.3,.74,-5.6,2.1,.12,.8,wood,true);at(-6.12,-3.4);
  box(-6.12,1.15,-3.4,.65,2.3,1.4,wood,true);
  for(let i=0;i<15;i++)box(-5.75,.4+Math.floor(i/5)*.65,-3.94+(i%5)*.23,.15,.4,.16,mat(['#4e4238','#515747','#655347'][i%3]));
  at(-5.3,-5.6);
  box(-5.3,.82,-5.6,.6,.04,.4,cream);sign('白鷺ハイツ',-4.8,1.9,-6.12,0,.9,.3);
  // Bedroom wardrobe faces a generous clear floor, away from the bed.
  at(4.8,4.6);
  box(4.8,.25,4.6,2.3,.5,2.5,wood,true);box(4.8,.6,4.6,2.2,.23,2.4,cream);box(4.8,.76,4.25,2.18,.13,1.55,mat('#556361'));box(4.8,1.02,5.91,2.4,1.2,.13,wood);
  for(const x of [4.25,5.35])box(x,.8,5.43,.85,.2,.44,cream);
  at(2.75,5.15);
  box(2.75,.47,5.15,.61,.94,.7,wood,true);const radio=box(2.75,1.07,5.15,.48,.28,.26,mat('#4d4638'));
  for(let i=0;i<8;i++)box(2.57+i*.035,1.07,5.007,.012,.19,.014,dark);
  const radioLight=new T.PointLight('#c87445',.25,2);radioLight.position.set(2.75,1.23,5.15);scene.add(radioLight);targets.push({id:'radio',point:new T.Vector3(...home.radio),label:'라디오 끄기',mesh:radio});
  at(6.08,1.55);
  const closet=box(6.08,1.2,1.55,.95,2.4,2.1,wood,true);box(5.59,1.22,1.55,.045,2.26,2,mat('#544333'));targets.push({id:'closet',point:new T.Vector3(...home.closet),label:'장롱에 숨기',mesh:closet});
  at(2.9,-5.5);
  box(2.9,.54,-5.5,1.3,1.08,1.1,cream,true);const drum=cyl(2.9,.57,-4.93,.35,.04,metal);drum.rotation.x=Math.PI/2;
  at(2.05,-4.75);
  const breaker=box(1.94,1.55,-4.75,.18,.87,.61,metal);for(let i=0;i<3;i++)box(2.05,1.42+i*.16,-4.75,.08,.1,.3,trim);sign('分電盤',2.06,2.12,-4.75,Math.PI/2,.7,.2);targets.push({id:'breaker',point:new T.Vector3(...home.breaker),label:'차단기 확인',mesh:breaker});
  at(5.4,-5.35);
  box(5.4,.42,-5.35,1.65,.84,1.4,cream,true);box(5.4,.85,-5.35,1.45,.05,1.2,mat('#526d68',.15));at(6.08,-1.5);
  box(6.08,.52,-1.5,.65,1.04,1.1,cream,true);
  at(6.6,-1.5);
  box(6.46,1.9,-1.5,.02,1.25,1.1,mat('#283a38',.1,{metalness:.8}));
  for(const [x,z,ry] of [[-6.46,4.8,Math.PI/2],[6.46,3.2,-Math.PI/2]]){
    at(x,z);
    const pane=new T.Mesh(new T.PlaneGeometry(1.5,1.6),new T.MeshBasicMaterial({color:'#283e46'}));pane.position.set(x,1.9,z);pane.rotation.y=ry;scene.add(pane);
    for(const zz of [z-.87,z+.87])box(x*.985,1.83,zz,.1,2.1,.27,mat('#5c665c'));
    const light=new T.PointLight('#80a9b9',5,7,2);light.position.set(x*.89,2,z);scene.add(light);
  }
  const lamps:T.PointLight[]=[];
  for(const [x,z] of [[0,-4],[0,0],[-3.5,2.5],[-4,5],[4,2],[3,-3]]){
    at(x,z);
    cyl(x,2.91,z,.3,.12,metal);const glow=mat('#dec69d',.5,{emissive:'#f1bf70',emissiveIntensity:.35});cyl(x,2.83,z,.24,.035,glow);
    const light=new T.PointLight('#ffd69a',5,7,2);light.userData.bulb=glow;light.position.set(x,2.56,z);scene.add(light);lamps.push(light);
  }
  finish();
  const doorwayGlow=new T.SpotLight('#98b2bf',12,13,.56,.8,1.7);doorwayGlow.position.set(0,2.3,home.door[2]-.6);doorwayGlow.target.position.set(0,.1,home.door[2]+5);scene.add(doorwayGlow,doorwayGlow.target);
  dressApartment(scene,'apartment');const figure=makeFigure(scene);figure.position.set(...home.haunt);lamps.forEach((lamp,i)=>{lamp.name=`apartment-lamp-${i}`;});
  return {solids,targets,lamps,shoes,figure,phoneGlow,radioLight,setTV};
}
