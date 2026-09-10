import * as T from 'three';
import type { Action, Area } from './story';
import {buildBuilding,makeFigure} from './building.ts';
import {surface,boxUV,softBox} from './materials.ts';
import {dressApartment} from './japan.ts';

export type Bounds={x:number;z:number};
export type Solid = { x: number; z: number; w: number; d: number; y?:number; h?:number };
export function canStandAt(x:number,z:number,solids:Solid[],r=.23,bounds:Bounds={x:6.78,z:8.75}){return Math.abs(x)<bounds.x&&Math.abs(z)<bounds.z&&!solids.some(s=>Math.abs(x-s.x)<s.w/2+r&&Math.abs(z-s.z)<s.d/2+r);}
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
  const content=area==='apartment'?{...buildApartment(root),bounds:{x:6.78,z:8.75},spawn:new T.Vector3(0,1.65,7.6),heading:0,heightAt:(_x:number,_z:number)=>0,liftDoors:undefined,setDisplay:undefined}:{...buildBuilding(root,area),setTV:undefined};
  return {...content,root};
}
export function disposeWorld(root:T.Object3D){
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
  root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material])){materials.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)textures.add(v);}}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();
}
function buildApartment(scene:T.Group) {
  const solids: Solid[] = [], targets: Target[] = [];
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
  // One continuous apartment; the gaps in the internal walls are actual walkable doorways.
  box(0,-.12,0,14,.24,18,floorMat);box(0,3.07,0,14,.14,18,surface('wall','#7e827e'));
  wall(0,-9,14,.2);wall(0,9,14,.2);wall(-7,0,.2,18);wall(7,0,.2,18);
  for(const x of [-1.45,1.45]) {
    wall(x,-8,.17,2);wall(x,-2.5,.17,4);wall(x,1.5,.17,3);wall(x,7.75,.17,2.5);
    box(x,2.75,-5.5,.2,.5,3,wood);box(x,2.75,4.75,.2,.5,3.5,wood);
    for(const z of [-7,-4,3,6.5])box(x,1.25,z,.25,2.5,.12,wood);
  }
  wall(-4.2,-.5,5.5,.18);wall(4.2,-.5,5.5,.18);
  sign('洗面所',-1.32,2.52,-5.4,Math.PI/2,.85,.18);
  sign('和 室',1.33,2.52,4.8,-Math.PI/2,.7,.18);
  // Entrance door, chain and frosted transom.
  const door=box(0,1.22,-8.86,1.45,2.44,.13,mat('#33413b'));
  box(0,2.53,-8.73,1.65,.11,.18,wood);box(-.81,1.25,-8.73,.12,2.6,.18,wood);box(.81,1.25,-8.73,.12,2.6,.18,wood);
  box(0,1.2,-8.77,1.2,1.7,.045,mat('#394740'));box(.49,1.02,-8.63,.18,.055,.15,metal);
  sign('2803',0,1.98,-8.68,0,.32,.12);cyl(0,1.63,-8.65,.025,.03,metal).rotation.x=Math.PI/2;
  targets.push({id:'door',point:new T.Vector3(0,1.2,-8.6),label:'현관문',mesh:door});
  box(0,.012,-7.75,1.5,.025,.8,mat('#2d332d'));
  box(.99,.64,-8.1,.55,1.28,1.2,wood,true);
  const shoes=new T.Group();scene.add(shoes);shoes.visible=false;
  for(const x of [-.22,.16]){const shoe=box(x,.11,-7.35,.2,.16,.52,mat('#1c2322',.26),false,shoes);shoe.rotation.y=.3;
    box(x,.2,-7.53,.19,.17,.16,dark,false,shoes);}
  const wet=mat('#283e39',.06,{transparent:true,opacity:.7});
  for(let i=0;i<9;i++) { const p=new T.Mesh(new T.CircleGeometry(.13+rand()*.15,12),wet);p.rotation.x=-Math.PI/2;p.position.set((rand()-.5)*.6,.016,-7.2+i*.63);p.scale.y=.47;shoes.add(p); }
  targets.push({id:'shoes',point:new T.Vector3(0,.2,-7.3),label:'젖은 신발',mesh:shoes});
  // Hallway details: electrical conduit, framed print, radiator and clock.
  box(1.23,2.82,0,.04,.04,17,metal);
  box(-1.31,1.72,.1,.035,.76,.58,wood);box(-1.28,1.72,.1,.015,.64,.46,mat('#88816f'));
  for(let z=-.07;z<.29;z+=.08)box(-1.26,1.63,z,.015,.43,.02,mat('#4c5647'));
  box(1.15,.55,-1.8,.18,.76,1.6,metal);
  for(let z=-2.5;z<-1;z+=.13)box(1.03,.55,z,.09,.77,.025,cream);
  const clock=sign('03:17',0,2.65,8.87,Math.PI,.75,.25);
  clock.material.map=print('03:17','#c07052','#151914',55);clock.material.emissive.set('#c07052');clock.material.emissiveMap=clock.material.map;clock.material.emissiveIntensity=.8;
  // Living room: couch, rug, coffee table, phone, bookshelf, television.
  box(-4.15,.018,5.2,4.6,.035,4.3,mat('#81795c'));
  for(let z=3.15;z<7.3;z+=.1)box(-4.15,.04,z,4.4,.005,.017,mat('#645f47'));
  box(-6.06,.35,5,1.38,.5,3.5,wood,true);box(-6.48,.89,5,.38,1,3.6,fabric);
  for(const z of [3.5,6.5])box(-6,.69,z,1.5,.5,.35,fabric);
  for(const z of [4.1,5,5.9])box(-5.96,.65,z,1.16,.23,.82,fabric);
  box(-4.05,.47,5.12,1.35,.13,1.65,wood,true);
  for(const x of [-4.58,-3.52])for(const z of [4.48,5.76])box(x,.22,z,.075,.45,.075,wood);
  const phone=box(-3.82,.562,5.02,.19,.035,.37,dark);
  const ps=new T.Mesh(new T.PlaneGeometry(.16,.32),new T.MeshBasicMaterial({map:print('03:17','#c3d9c8','#24483e',45,256,512)}));ps.position.set(-3.82,.583,5.02);ps.rotation.x=-Math.PI/2;scene.add(ps);
  targets.push({id:'phone',point:new T.Vector3(-3.82,.58,5.02),label:'휴대전화 확인',mesh:phone});
  const phoneGlow=new T.PointLight('#8cbf9f',.6,2);phoneGlow.position.set(-3.8,.8,5);scene.add(phoneGlow);
  cyl(-4.3,.64,5.55,.11,.21,cream);cyl(-4.3,.751,5.55,.087,.004,mat('#201a13'));
  box(-3.9,.563,4.72,.45,.025,.33,cream);
  box(-4.2,.43,.13,3.2,.86,.68,wood,true);box(-4.2,1.43,.13,2,.99,.13,dark);
  const tvCanvas=document.createElement('canvas');tvCanvas.width=640;tvCanvas.height=320;
  const tvContext=tvCanvas.getContext('2d')!,tvTexture=new T.CanvasTexture(tvCanvas);tvTexture.colorSpace=T.SRGBColorSpace;
  const tvMaterial=new T.MeshBasicMaterial({map:tvTexture,color:0x000000});
  const tvScreen=new T.Mesh(new T.PlaneGeometry(1.85,.83),tvMaterial);tvScreen.position.set(-4.2,1.43,.229);tvScreen.name='apartment-tv-screen';scene.add(tvScreen);box(-4.2,.93,.23,.07,.22,.1,metal);
  const tvLight=new T.PointLight('#a5bcdb',0,6);tvLight.position.set(-4.2,1.5,.65);tvLight.name='apartment-tv-light';scene.add(tvLight);
  let tvFrame=-1;
  function setTV(on:boolean,time:number){
    tvMaterial.color.setHex(on?0xffffff:0x000000);tvLight.intensity=on?3.3+Math.sin(time*2)*.25:0;
    if(!on||tvFrame===Math.floor(time*4))return;tvFrame=Math.floor(time*4);
    const ctx=tvContext;ctx.fillStyle='#172b48';ctx.fillRect(0,0,640,320);
    // Original late-night weather broadcast, with moving rain over a city skyline.
    for(let i=0;i<18;i++){const h=35+(i*37)%100;ctx.fillStyle=i%2?'#263c56':'#0c1a2b';ctx.fillRect(i*37,260-h,32,h);ctx.fillStyle='#a9bfc5';for(let j=0;j<5;j++)ctx.fillRect(i*37+8,260-h+12+j*19,4,5);}
    ctx.fillStyle='#6f8eac';for(let i=0;i<60;i++)ctx.fillRect((i*79)%640,(i*47+time*80)%260,1,13);
    ctx.fillStyle='#e1e8eb';ctx.font='22px serif';ctx.fillText('深夜の天気予報',28,40);ctx.font='16px sans-serif';ctx.fillText('03:17   関東地方 / 雨',28,70);
    ctx.fillStyle='#dde2df';ctx.fillRect(0,267,640,53);ctx.fillStyle='#192636';ctx.font='19px sans-serif';ctx.fillText('明け方まで強い雨  ·  外出はお控えください',24,300);
    ctx.fillStyle='#152034';for(let y=0;y<260;y+=5)ctx.fillRect(0,y,640,1);tvTexture.needsUpdate=true;
  }
  box(-6.49,1.02,1.26,.8,2.04,.7,wood,true);
  for(const y of [.1,.66,1.25,1.91])box(-6.47,y,1.26,.86,.07,.76,wood);
  for(let i=0;i<18;i++)box(-6.75+(i%6)*.11,.35+Math.floor(i/6)*.6,1.46,.08,.25+rand()*.22,.25,mat(['#4e4238','#515747','#655347'][i%3]));
  // Bedroom: bed, radio, a usable wardrobe, curtains.
  box(4.3,.25,7.25,2.4,.5,2.95,wood,true);box(4.3,.6,7.23,2.3,.23,2.85,cream);
  box(4.3,.76,6.66,2.28,.13,1.64,mat('#556361'));box(4.3,1.02,8.68,2.5,1.2,.13,wood);
  for(const x of [3.72,4.86])box(x,.8,8.23,.9,.2,.47,mat('#a4a293'));
  box(2.62,.47,7.77,.61,.94,.7,wood,true);
  const radio=box(2.62,1.07,7.77,.48,.28,.26,mat('#4d4638'));
  for(let i=0;i<8;i++)box(2.44+i*.035,1.07,7.917,.012,.19,.014,dark);
  const radioLight=new T.PointLight('#c87445',.25,2);radioLight.position.set(2.7,1.23,7.8);scene.add(radioLight);
  targets.push({id:'radio',point:new T.Vector3(2.62,1.1,7.8),label:'라디오 끄기',mesh:radio});
  const closet=box(6.45,1.2,2.15,.92,2.4,2.5,wood,true);
  box(5.97,1.22,2.15,.045,2.26,2.3,mat('#544333'));
  for(const z of [1.03,2.15,3.28])box(5.92,1.22,z,.07,2.26,.027,trim);
  for(const z of [2,2.28])box(5.9,1.17,z,.1,.24,.025,metal);
  targets.push({id:'closet',point:new T.Vector3(5.82,1.25,2.15),label:'장롱에 숨기',mesh:closet});
  // Utility room and bathroom.
  box(-5.8,.54,-7.9,1.45,1.08,1.4,cream,true);const drum=cyl(-5.8,.57,-7.16,.39,.04,metal);drum.rotation.x=Math.PI/2;
  const breaker=box(-6.82,1.55,-5.35,.18,.87,.61,metal);
  for(let i=0;i<3;i++)box(-6.7,1.42+i*.16,-5.35,.08,.1,.3,trim);
  sign('分電盤',-6.7,2.12,-5.35,Math.PI/2,.7,.2);
  targets.push({id:'breaker',point:new T.Vector3(-6.6,1.6,-5.35),label:'차단기 올리기',mesh:breaker});
  box(-4.1,1.17,-8.56,2.4,2.35,.48,wood,true);
  for(let y=.4;y<2.3;y+=.5)box(-4.1,y,-8.25,2.3,.08,.7,wood);
  for(let i=0;i<7;i++)box(-4.95+(i%4)*.5,.66+Math.floor(i/4)*.52,-8.2,.36,.44,.38,mat('#706b55'));
  box(6.1,.5,-7.65,1.5,1,1.9,cream,true);box(6.1,1.02,-7.65,1.55,.12,1.95,mat('#7b918a',.15));
  box(6.86,1.94,-7.4,.02,1.4,1.45,metal);box(6.83,1.94,-7.4,.015,1.25,1.29,mat('#283a38',.1,{metalness:.8}));
  // Windows and curtains. Their cool spill helps orientation even during the outage.
  for(const [x,z,ry] of [[-6.86,7.8,Math.PI/2],[6.86,5.15,-Math.PI/2]]) {
    const windowMesh=new T.Mesh(new T.PlaneGeometry(1.5,1.6),new T.MeshBasicMaterial({color:'#283e46'}));windowMesh.position.set(x,1.9,z);windowMesh.rotation.y=ry;scene.add(windowMesh);
    box(x,1.9,z,.07,1.7,.05,trim);box(x,1.9,z,.07,.06,1.6,trim);
    for(const zz of [z-.87,z+.87])box(x*.985,1.83,zz,.1,2.1,.27,mat('#5c665c'));
    for(let i=0;i<28;i++)box(x*.995,1.1+rand()*1.55,z-.73+rand()*1.46,.015,.02+rand()*.19,.005,mat('#708989'));
    const l=new T.PointLight('#80a9b9',7,8,2);l.position.set(x*.89,2,z);scene.add(l);
  }
  const lamps:T.PointLight[]=[];
  for(const z of [-6,-1,4,8]){
    cyl(0,2.91,z,.22,.12,metal);const shade=new T.Mesh(new T.ConeGeometry(.3,.22,20,1,true),mat('#454a3d',.8,{side:T.DoubleSide}));shade.rotation.x=Math.PI;shade.position.set(0,2.78,z);scene.add(shade);
    const glow=mat('#dec69d',.5,{emissive:'#f1bf70',emissiveIntensity:.35});cyl(0,2.77,z,.12,.035,glow);
    const l=new T.PointLight('#ffd69a',5,7,2);l.userData.bulb=glow;l.position.set(0,2.56,z);scene.add(l);lamps.push(l);
  }
  const roomLight=new T.PointLight('#d7bc87',5,7);roomLight.position.set(-4,2.65,4.5);scene.add(roomLight);lamps.push(roomLight);
  const bedLight=new T.PointLight('#bcb991',3,6);bedLight.position.set(4,2.6,5);scene.add(bedLight);lamps.push(bedLight);
  dressApartment(scene,'apartment');
  const figure=makeFigure(scene);figure.position.set(0,0,-3);
  lamps.forEach((lamp,i)=>{lamp.name=`apartment-lamp-${i}`;});
  return {solids,targets,lamps,shoes,figure,phoneGlow,radioLight,setTV};
}
