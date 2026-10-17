import * as T from 'three';
import {configureShadow} from './lighting.ts';
import {apartment as home,apartmentScale as S,spaceFurniture} from './apartment-layout.ts';
import type { Action, Area } from './story';
import {buildBuilding,makeFigure} from './building.ts';
import {surface,boxUV,softBox,upholstery,cottonUpholstery} from './materials.ts';
import {createEntryEvidence} from './entry-props.ts';
import {basin,bathtub,roundPipe,sofa,drawerUnit,writingTable,bed,bookcase} from './props.ts';
import {dressApartment} from './japan.ts';
import {dressLivingSpace} from './room-dressing.ts';
import {createDomesticKitchen,createDomesticFridge,createDiningSet,createRepairEstimate,createKitchenTimer,placeDomestic} from './domestic-kitchen.ts';
import {batchStaticGeometry} from './static-geometry.ts';
import {solidContainsPoint,type Occupant} from './collision.ts';
import {setDoorAngle} from './passage.ts';
import type {Surveillance} from './surveillance.ts';

export type Bounds={x:number;z:number;minX?:number};
export type Solid = { x: number; z: number; w: number; d: number; y?:number; h?:number; yaw?:number; seeThrough?:boolean };
const lightRay=new T.Ray(),lightBox=new T.Box3(),lightHit=new T.Vector3(),lightDirection=new T.Vector3();
export function clampLightOrigin(eye:T.Vector3,lens:T.Vector3,solids:Solid[]){
  const distance=eye.distanceTo(lens);if(distance<.001)return false;
  lightDirection.copy(lens).sub(eye).normalize();let nearest=distance;
  for(const s of solids){const y=s.y??1.5,h=s.h??3,c=Math.cos(s.yaw??0),n=Math.sin(s.yaw??0),dx=eye.x-s.x,dz=eye.z-s.z;
    lightBox.min.set(-s.w/2,y-h/2,-s.d/2);lightBox.max.set(s.w/2,y+h/2,s.d/2);
    lightRay.origin.set(dx*c-dz*n,eye.y,dx*n+dz*c);lightRay.direction.set(lightDirection.x*c-lightDirection.z*n,lightDirection.y,lightDirection.x*n+lightDirection.z*c);
    if(lightBox.containsPoint(lightRay.origin))continue;
    if(lightRay.intersectBox(lightBox,lightHit))nearest=Math.min(nearest,lightRay.origin.distanceTo(lightHit));
  }
  if(nearest>=distance)return false;
  lens.copy(eye).addScaledVector(lightDirection,Math.max(0,nearest-.06));return true;
}
export function canStandAt(x:number,z:number,solids:Solid[],r=.23,bounds:Bounds=home.bounds){return x>(bounds.minX??-bounds.x)&&x<bounds.x&&Math.abs(z)<bounds.z&&!solids.some(s=>solidContainsPoint(s,x,z,r));}
const sightRay=new T.Ray(),sightBox=new T.Box3(),sightHit=new T.Vector3();
export function hasLineOfSight(from:{x:number;y:number;z:number},to:{x:number;y:number;z:number},solids:Solid[],throughGlass=false){
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,distance=Math.hypot(dx,dy,dz);if(distance<=.25)return true;
  const nx=dx/distance,ny=dy/distance,nz=dz/distance,limitSq=(distance-.25)**2,epsilon=1e-7;
  for(const b of solids){
    const h=b.h??3;if(throughGlass&&b.seeThrough||b.w<=2*epsilon||b.d<=2*epsilon||h<=2*epsilon)continue;
    const y=b.y??1.5,c=Math.cos(b.yaw??0),n=Math.sin(b.yaw??0),x=from.x+nx*.1-b.x,z=from.z+nz*.1-b.z;
    // Preserve the existing eye/target margins and open faces, but test every
    // intervening surface continuously, including thin rotated door leaves.
    sightBox.min.set(-b.w/2+epsilon,y-h/2+epsilon,-b.d/2+epsilon);sightBox.max.set(b.w/2-epsilon,y+h/2-epsilon,b.d/2-epsilon);
    sightRay.origin.set(x*c-z*n,from.y+ny*.1,x*n+z*c);sightRay.direction.set(nx*c-nz*n,ny,nx*n+nz*c);
    if(sightBox.containsPoint(sightRay.origin)||sightRay.intersectBox(sightBox,sightHit)&&sightRay.origin.distanceToSquared(sightHit)<limitSq)return false;
  }
  return true;
}
export type Target = { precise?:boolean; id: Action; point: T.Vector3; label: string; mesh: T.Object3D };
export function buildWorld(scene:T.Scene,area:Area='apartment'){
  const root=new T.Group();scene.add(root);
  const content=area==='apartment'?{...buildApartment(root),bounds:{...home.bounds,z:home.bounds.z+1.1},spawn:new T.Vector3(...home.stand),heading:0,heightAt:(_x:number,_z:number)=>0,liftDoors:undefined,setDisplay:undefined,fallingFigure:undefined,carDeparture:undefined}:{...buildBuilding(root,area),setTV:undefined};
  batchStaticGeometry(root,content.targets.map(t=>t.mesh));
  const updateStory:((stage:import('./story').Stage,time:number,reduced:boolean,story?:import('./story').Story,occupants?:Occupant[])=>void)|undefined=content.updateStory;
  const lightColors=content.lamps.map(light=>({light,color:light.color.clone()}));
  const originalSolids=content.solids.map(s=>({solid:s,value:{...s}})),bounds={...content.bounds};
  const poses:{object:T.Object3D;position:T.Vector3;quaternion:T.Quaternion;scale:T.Vector3;visible:boolean}[]=[];
  root.traverse(object=>poses.push({object,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone(),visible:object.visible}));
  function reset(){
    content.reset?.();Object.assign(content.bounds,bounds);for(const {light,color} of lightColors)light.color.copy(color);
    content.solids.splice(0,content.solids.length,...originalSolids.map(({solid,value})=>{delete solid.yaw;return Object.assign(solid,value);}));
    for(const p of poses){p.object.position.copy(p.position);p.object.quaternion.copy(p.quaternion);p.object.scale.copy(p.scale);p.object.visible=p.visible;delete p.object.userData.openRequested;}
  }
  const surveillance=root.getObjectByName('surveillance-screen')?.userData.surveillance as Surveillance|undefined;
  const archiveReview='archiveReview' in content?content.archiveReview:undefined;
  const archiveDoor='archiveDoor' in content?content.archiveDoor:undefined;
  const plantAttempt='plantAttempt' in content?content.plantAttempt:undefined;
  const answeringMachine='answeringMachine' in content?content.answeringMachine:undefined;
  const intercom='intercom' in content?content.intercom:undefined,updateIntercom='updateIntercom' in content?content.updateIntercom:undefined;
  const courtPhone='courtPhone' in content?content.courtPhone:undefined,courtSafe='courtSafe' in content?content.courtSafe:undefined;
  const lureRadio='lureRadio' in content?content.lureRadio:undefined;
  const residentStudy='residentStudy' in content?content.residentStudy:undefined;
  return {...content,root,updateStory,reset,surveillance,archiveReview,archiveDoor,plantAttempt,answeringMachine,intercom,updateIntercom,courtPhone,courtSafe,residentStudy,lureRadio};
}
export function disposeWorld(root:T.Object3D){
  root.traverse(o=>o.userData.surveillance?.dispose());
  root.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();});
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
  root.traverse(o=>{if(o instanceof T.SpotLight||o instanceof T.PointLight||o instanceof T.DirectionalLight)o.shadow.map?.dispose();});
  root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material])){materials.add(m);for(const v of Object.values(m))if(v instanceof T.Texture&&!v.isRenderTargetTexture)textures.add(v);}}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();
}
function buildApartment(scene:T.Group) {
  const solids: Solid[] = [], targets: Target[] = [];
  const {at,finish}=spaceFurniture(scene,solids);
  const mat=(color:string, roughness=.86,extra:object={})=>new T.MeshStandardMaterial({color,roughness,...extra});
  const wallMat=surface('decayWall','#c6c4b6');
  const floorMat=surface('woodFloor','#cdc6b6',{roughness:.43}), wood=surface('wood','#b8ac98'), dark=mat('#111816'), trim=mat('#6d6051');
  const fabric=cottonUpholstery('#676c62'), cream=surface('ceramic','#c4c3b8'), metal=mat('#66716d',.32,{metalness:.72});
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false,parent:T.Object3D=scene){
    const mesh=new T.Mesh(boxUV(softBox(w,h,d),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    if(solid)solids.push({x,z,w,d,y,h});return mesh;
  }
  function cyl(x:number,y:number,z:number,r:number,h:number,m:T.Material,parent:T.Object3D=scene){
    const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,16),m);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  function wall(x:number,z:number,w:number,d:number){
    x*=S;z*=S;if(w>.3)w*=S;if(d>.3)d*=S;
    box(x,1.5,z,w,3,d,wallMat,true);box(x,.055,z,w+.035,.11,d+.035,trim);box(x,2.94,z,w+.045,.1,d+.045,cream);
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
  at(0,-6.25);
  const door=new T.Group();door.name='front-door';door.position.set(-.75,0,-6.11);door.rotation.y=0;scene.add(door);
  box(.725,1.22,0,1.45,2.44,.13,mat('#33413b'),false,door);box(.725,1.2,.08,1.2,1.7,.045,mat('#394740'),false,door);box(1.22,1.02,.17,.18,.055,.15,metal,false,door);
  box(0,2.53,-5.98,1.65,.11,.18,wood);for(const x of [-.81,.81])box(x,1.25,-5.98,.12,2.6,.18,wood);sign('2803',-.94,1.98,-6.354,Math.PI,.32,.12);
  // The home opens onto an exposed gallery: low parapet, railing and open night beyond.
  box(0,-.11,-7.55,14,.2,2.65,surface('oldTile','#9ca797'));box(0,2.9,-7.55,14,.18,2.7,surface('garage','#7b857e'));
  box(0,.43,-8.84,14,.86,.15,surface('decayWall','#7a897f'));
  for(const y of [.94,1.15])box(0,y,-8.84,14,.035,.04,metal);
  for(let x=-7;x<=7;x+=.8)box(x,1.05,-8.84,.025,.22,.025,metal);
  for(const x of [-5,5])box(x,1.45,-8.8,.22,2.9,.23,surface('garage','#828c84'));
  sign('28층 · 바깥 복도 승강기',-2.2,2.47,-6.354,Math.PI,1.2,.2);

  targets.push({id:'door',point:new T.Vector3(...home.door),label:'현관문 확인',mesh:door});
  at(1.18,-5.3);
  box(1.18,.64,-5.3,.55,1.28,1.2,wood,true);
  at(0,-4.65);
  const shoes=createEntryEvidence();scene.add(shoes);shoes.visible=false;
  targets.push({id:'shoes',point:new T.Vector3(...home.shoes),label:'젖은 신발',mesh:shoes});
  at(0,6.25);
  const clock=sign('03:17',0,2.65,6.13,Math.PI,.75,.25);clock.material.map=print('03:17','#c07052','#151914',55);clock.material.emissive.set('#c07052');clock.material.emissiveMap=clock.material.map;clock.material.emissiveIntensity=.8;
  // A broad lounge looks across to the television, with circulation on both sides.
  at(-3.2,2.4);
  box(-3.2,.018,2.4,5.2,.035,3.7,upholstery('#7b7967'));
  at(-1.2,2.5);
  const couch=sofa(3.2,1.1,wood,fabric);couch.name='home-sofa';couch.rotation.y=-Math.PI/2;couch.position.set(-1.2,0,2.5);scene.add(couch);solids.push({x:-1.2,z:2.5,w:1.1,d:3.2,y:.53,h:1.06});
  at(-3.15,2.4);
  const phoneTable=writingTable(1.2,.535,1.8,wood);phoneTable.name='home-phone-table';phoneTable.position.set(-3.15,0,2.4);scene.add(phoneTable);solids.push({x:-3.15,z:2.4,w:1.2,d:1.8,y:.2675,h:.535});
  const phone=box(-3.15,.595,2.4,.37,.12,.42,cream);
  box(-3.15,.705,2.23,.4,.085,.1,dark);for(const x of [-3.3,-3])box(x,.675,2.25,.12,.12,.16,dark);
  for(let i=0;i<9;i++)box(-3.23+(i%3)*.07,.663,2.4+Math.floor(i/3)*.05,.045,.014,.03,dark);
  const cord=[];for(let i=0;i<80;i++)cord.push(new T.Vector3(-3.39+Math.sin(i*.7)*.018,.615-i*.003,2.27+i*.009));
  scene.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(cord),80,.007,5,false),dark));
  const ps=new T.Mesh(new T.PlaneGeometry(.15,.07),new T.MeshBasicMaterial({map:print('03:17','#c3d9c8','#24483e',45,256,512)}));ps.position.set(-3.15,.662,2.32);ps.rotation.x=-Math.PI/2;scene.add(ps);
  targets.push({id:'phone',point:new T.Vector3(...home.phone),label:'전화 받기',mesh:phone});const phoneGlow=new T.PointLight('#8cbf9f',.6,2);phoneGlow.position.set(-3.15,.795,2.4);scene.add(phoneGlow);
  box(-3.1,.545,1.91,.45,.02,.33,cream);
  at(-6.12,2.4);
  const tvCabinet=drawerUnit(2.8,.86,.62,wood);tvCabinet.name='home-tv-cabinet';tvCabinet.rotation.y=Math.PI/2;tvCabinet.position.set(-6.12,0,2.4);scene.add(tvCabinet);solids.push({x:-6.12,z:2.4,w:.62,d:2.8,y:.43,h:.86});box(-6.39,1.43,2.4,.13,1.13,2.3,dark);
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
    ctx.fillStyle='#e1e8eb';ctx.font='22px serif';ctx.fillText('심야 뉴스',28,40);ctx.font='16px sans-serif';ctx.fillText('03:17   서울 / 비',28,70);
    ctx.fillStyle='#dde2df';ctx.fillRect(0,267,640,53);ctx.fillStyle='#192636';ctx.font='19px sans-serif';ctx.fillText('사흘 전 뺑소니 사망 사고 · 제보를 기다립니다',24,300);
    ctx.fillStyle='#152034';for(let y=0;y<260;y+=5)ctx.fillRect(0,y,640,1);tvTexture.needsUpdate=true;
  }
  // Full kitchen, dining area and a separate study give the home a lived-in scale.
  at(-4.5,-1.7,0,-.45);
  const kitchen=createDomesticKitchen(3.5,true);kitchen.name='apartment-kitchen';placeDomestic(scene,kitchen,solids,-4.5,-1.7,0,3.525,1.02,.93);
  const fridge=createDomesticFridge();fridge.name='apartment-refrigerator';placeDomestic(scene,fridge,solids,-6.70,-1.79,0,.76,.88,1.88);
  at(-4.2,5.15);
  const dining=createDiningSet();placeDomestic(scene,dining,solids,-4.2,5.15,0,2.05,.95,.82);
  for(const x of [-4.85,-3.55])for(const z of [4.42,5.84])solids.push({x,z,w:.5,d:.50,y:.43,h:.86});
  const estimate=createRepairEstimate();estimate.root.position.set(-4.68,.82,5.09);estimate.root.rotation.y=-.08;scene.add(estimate.root);
  targets.push({id:'home_repair',point:new T.Vector3(-4.2*S-.48,.8221,5.15*S-.06),label:'식탁 위 차량 수리 견적 확인',mesh:estimate.page});
  at(-4.2,5.15);
  const timer=createKitchenTimer();timer.position.set(-4.2,.82,5.15);scene.add(timer);targets.push({id:'lure',point:new T.Vector3(-4.2*S,.89,5.15*S-.06),label:'주방 타이머 울리기',mesh:timer});
  at(-5.3,-5.6);
  const study=writingTable(2.1,.8,.8,wood);study.name='home-study-desk';study.position.set(-5.3,0,-5.6);scene.add(study);solids.push({x:-5.3,z:-5.6,w:2.1,d:.8,y:.4,h:.8});
  at(-6.12,-3.4);
  const shelf=bookcase(1.4,2.3,.65,wood);shelf.name='home-bookcase';shelf.rotation.y=Math.PI/2;shelf.position.set(-6.12,0,-3.4);scene.add(shelf);solids.push({x:-6.12,z:-3.4,w:.65,d:1.4,y:1.15,h:2.3});
  at(-5.3,-5.6);
  box(-5.3,.82,-5.6,.6,.04,.4,cream);
  at(-4.8,-6.25);sign('백로아파트',-4.8,1.9,-6.146,0,.9,.3);
  // Bedroom wardrobe faces a generous clear floor, away from the bed.
  at(4.8,4.6);
  const sleepingBed=bed(2.3,2.5,.715,wood,cottonUpholstery('#cac5b6'),cottonUpholstery('#596966'));sleepingBed.name='home-bed';sleepingBed.position.set(4.8,0,4.6);scene.add(sleepingBed);solids.push({x:4.8,z:4.6,w:2.3,d:2.5,y:.3575,h:.715},{x:4.8,z:5.91,w:2.4,d:.12,y:.72,h:1.2});
  at(2.75,5.15);
  box(2.75,.47,5.15,.61,.94,.7,wood,true);const radio=box(2.75,1.07,5.15,.48,.28,.26,mat('#4d4638'));
  for(let i=0;i<8;i++)box(2.57+i*.035,1.07,5.007,.012,.19,.014,dark);
  const radioLight=new T.PointLight('#c87445',.25,2);radioLight.position.set(2.75,1.23,5.15);scene.add(radioLight);targets.push({id:'radio',point:new T.Vector3(...home.radio),label:'라디오 끄기',mesh:radio});
  at(1.8,4.2);
  const lightSwitch=box(1.915,1.35,4.2,.06,.15,.1,cream);box(1.953,1.35,4.2,.025,.09,.065,metal);
  box(1.967,1.39,4.2,.009,.012,.025,new T.MeshBasicMaterial({color:'#778667'}));
  targets.push({id:'switch',point:new T.Vector3(...home.switch),label:'전등 스위치 켜기',mesh:lightSwitch});
  at(3.75,5.43);
  const bedside=drawerUnit(.55,.68,.62,wood);bedside.name='home-nightstand';bedside.rotation.y=Math.PI;bedside.position.set(3.75,0,5.43);scene.add(bedside);solids.push({x:3.75,z:5.43,w:.55,d:.62,y:.34,h:.68});
  const torchPickup=new T.Group();torchPickup.name='flashlight-pickup';scene.add(torchPickup);
  const torchBody=cyl(3.75,.730,5.43,.035,.24,dark,torchPickup);torchBody.rotation.x=Math.PI/2;
  const torchHead=cyl(3.75,.730,5.30,.05,.065,metal,torchPickup);torchHead.rotation.x=Math.PI/2;
  const torchCap=cyl(3.75,.730,5.54,.05,.025,dark,torchPickup);torchCap.rotation.x=Math.PI/2;
  targets.push({id:'flashlight',point:new T.Vector3(...home.flashlight),label:'손전등 집어 들기',mesh:torchPickup});
  at(6.08,1.55);
  const closet=box(6.08,1.2,1.55,.95,2.4,2.1,wood,true);box(5.59,1.22,1.55,.045,2.26,2,mat('#544333'));targets.push({id:'closet',point:new T.Vector3(...home.closet),label:'장롱에 숨기',mesh:closet});
  at(2.9,-5.5);
  box(2.9,.54,-5.5,1.3,1.08,1.1,cream,true);const drum=cyl(2.9,.57,-4.93,.35,.04,metal);drum.rotation.x=Math.PI/2;
  at(1.8,-4.75);
  const breaker=box(1.975,1.55,-4.75,.18,.87,.61,metal);for(let i=0;i<3;i++)box(2.08,1.42+i*.16,-4.75,.08,.1,.3,trim);sign('분전반',1.891,2.12,-4.75,Math.PI/2,.7,.2);targets.push({id:'breaker',point:new T.Vector3(...home.breaker),label:'차단기 확인',mesh:breaker});
  at(5.4,-5.35);
  const tub=bathtub();tub.position.set(5.4,.67,-6.025);scene.add(tub);box(5.4,.015,-6.025,1.66,.03,.90,cream);solids.push({x:5.4,z:-6.025,w:1.72,d:.94,y:.335,h:.67});
  roundPipe(scene,[6.02,.8,-6.49],[6.02,2.12,-6.49],.015,metal);for(const y of [.9,1.85])roundPipe(scene,[6.02,y,-6.526],[6.02,y,-6.49],.012,metal);
  roundPipe(scene,[6.02,2.12,-6.49],[6.02,2.15,-6.30],.015,metal);const shower=cyl(6.02,2.13,-6.30,.105,.025,metal);shower.rotation.x=.35;
  at(6.08,-1.5);const wash=basin(.68,.88);wash.position.set(6.08,1.04,-1.5);wash.rotation.y=-Math.PI/2;scene.add(wash);cyl(6.08,.415,-1.5,.14,.83,cream);solids.push({x:6.08,z:-1.5,w:.65,d:1.1,y:.52,h:1.04});
  at(6.6,-1.5);
  box(6.46,1.9,-1.5,.02,1.25,1.1,mat('#283a38',.1,{metalness:.8}));
  for(const [x,z,ry] of [[-6.46,4.8,Math.PI/2],[6.46,3.2,-Math.PI/2]]){
    at(x,z);
    const pane=new T.Mesh(new T.PlaneGeometry(1.5,1.6),new T.MeshBasicMaterial({color:'#283e46'}));pane.position.set(x,1.9,z);pane.rotation.y=ry;scene.add(pane);
    for(const zz of [z-.87,z+.87])box(x*.985,1.83,zz,.1,2.1,.27,mat('#5c665c'));
    const light=new T.SpotLight('#93aebe',14,11,.92,.65,2);light.position.set(x*.89,2.6,z);light.target.position.set(x*.48,.3,z-1);configureShadow(light);light.shadow.mapSize.set(1024,1024);scene.add(light,light.target);
  }
  const lamps:T.PointLight[]=[];
  for(const [x,z] of [[0,-4],[0,0],[-3.5,2.5],[-4,5],[4,2],[3,-3]]){
    at(x,z);
    cyl(x,2.95,z,.3,.1,metal);const glow=mat('#dec69d',.5,{emissive:'#f1bf70',emissiveIntensity:.35});cyl(x,2.891,z,.24,.02,glow);
    const light=new T.PointLight('#ffd69a',5,7,2);light.userData.bulb=glow;light.position.set(x,2.56,z);scene.add(light);lamps.push(light);
  }
  finish();
  const bathTile=surface('oldTile','#c9ccbf',{roughness:.43});box(5.3*S,.006,-3.375*S,2.6*S-.22,.008,5.75*S-.2,bathTile);box(5.3*S,.72,-6.25*S+.106,2.6*S-.19,1.44,.012,bathTile);box(6.6*S-.106,.72,-3.375*S,.012,1.44,5.75*S-.2,bathTile);
  const doorwayGlow=new T.SpotLight('#98b2bf',0,13,.56,.8,1.7);doorwayGlow.position.set(0,2.3,home.door[2]-.6);doorwayGlow.target.position.set(0,.1,home.door[2]+5);scene.add(doorwayGlow,doorwayGlow.target);
  dressApartment(scene,'apartment');dressLivingSpace(scene,solids,'apartment');const figure=makeFigure(scene);figure.position.set(...home.haunt);lamps.forEach((lamp,i)=>{lamp.name=`apartment-lamp-${i}`;});
  const doorSolid={x:0,z:door.position.z,w:1.45,d:.13,y:1.22,h:2.44};solids.push(doorSolid);
  let openedAt=-1;
  function updateStory(stage:import('./story').Stage,time:number,reduced:boolean,_story?:import('./story').Story,occupants:Occupant[]=[]){
    const open=!!door.userData.openRequested;
    if(open&&openedAt<0)openedAt=time;
    setDoorAngle(door,doorSolid,open?1.42*T.MathUtils.smoothstep(time-openedAt,0,reduced?.2:1.1):0,.725,0,occupants);
    doorwayGlow.intensity=door.rotation.y/1.42*7;
    torchPickup.visible=['drive','impact','flee','sleep','tv','wake_ring','light_switch','find_torch'].includes(stage);
  }
  return {solids,targets,lamps,shoes,figure,phoneGlow,radioLight,setTV,updateStory,reset(){openedAt=-1;}};
}
