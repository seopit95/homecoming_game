import {localizedContext,localizedTexture} from './localized-canvas.ts';
import * as T from 'three';
import {batchStaticGeometry} from './static-geometry.ts';
import {connectionPassage,setDoorAngle} from './passage.ts';
import type {Occupant} from './collision.ts';
import {surface,boxUV,softBox} from './materials.ts';
import {roundPipe,createSedan,sedanSolids} from './props.ts';
import {wetTexture} from './entry-props.ts';
import {createGhost} from './ghost.ts';
import {buildCourtyardGround} from './courtyard-ground.ts';
import {createCourtyardSafe} from './courtyard-safe.ts';
import {createEmergencyPhone} from './emergency-phone.ts';
import {courtyardPlanting} from './courtyard-landscape.ts';
import type {Solid,Target} from './world.ts';
import type {Action,Stage,Story} from './story.ts';

export const courtyardLayout={x:32,z:48,name:'1F · 외부 중정',exit:'B1 기록보관실',rooms:['서측 경비초소','놀이터','금고 보관 초소','비상전화'],patrol:[{x:-25,z:34},{x:-25,z:-34},{x:25,z:-34},{x:25,z:34}]};
export function buildCourtyard(root:T.Group){
 const solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[];
 const concrete=surface('castConcrete','#818b82'),wall=surface('decayWall','#a9a69c'),steel=surface('steel','#929a89',{metalness:.28,roughness:.68}),wood=surface('wood','#76654d');
 const plinth=surface('castConcrete','#707978'),soil=surface('soil','#b0a99b',{roughness:.96});
 const dark=new T.MeshStandardMaterial({color:'#182322',roughness:.82}),white=new T.MeshStandardMaterial({color:'#b8b6a1',roughness:.9}),rust=new T.MeshStandardMaterial({color:'#795744',roughness:.9});
 root.name='courtyard-chapter';
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false,parent:T.Object3D=root){const mesh=new T.Mesh(boxUV(m===wood&&h<.2?softBox(w,h,d,.018):new T.BoxGeometry(w,h,d),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=!m.transparent;mesh.receiveShadow=true;parent.add(mesh);if(solid)solids.push({x,z,w,d,y,h});return mesh;}
 function sign(text:string,x:number,y:number,z:number,w=1.5,h=.5,ry=0,ink='#223a31'):T.Mesh{const c=document.createElement('canvas');c.width=768;c.height=Math.round(768*h/w);const ctx=localizedContext(c)!,lines=text.split('\n'),font=Math.min(c.height/(lines.length*1.6),680/Math.max(...lines.map(l=>l.length),1));ctx.fillStyle='#aab099';ctx.fillRect(0,0,768,c.height);ctx.fillStyle=ink;ctx.font=`${font}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((l,i)=>ctx.fillText(l,384,c.height/2+(i-(lines.length-1)/2)*font*1.4));const map=localizedTexture(new T.CanvasTexture(c));map.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.8}));mesh.position.set(x,y,z);mesh.rotation.y=ry;root.add(mesh);return mesh;}
 function target(id:Action,label:string,mesh:T.Object3D,p:[number,number,number],at:[number,number]){mesh.userData.approach={x:at[0],z:at[1]};targets.push({id,label,mesh,point:new T.Vector3(...p)});}
 function light(x:number,z:number,power=9){const l=new T.PointLight('#b0baa1',power,17,2);l.position.set(x,3.3,z);l.userData.base=power;lamps.push(l);root.add(l);roundPipe(root,[x,0,z],[x,3.5,z],.05,steel);box(x,3.5,z,.55,.09,.32,steel);box(x,3.445,z,.43,.02,.24,white);box(x,.04,z,.24,.08,.24,steel,true);return l;}
 buildCourtyardGround(root);for(const x of [-32,32]){box(x,1.45,0,.22,2.9,96,plinth,true);box(x-Math.sign(x)*.08,.27,0,.28,.54,96,concrete);box(x-Math.sign(x)*.1,2.9,0,.32,.12,96,concrete);}
 for(const x of [-16.36,16.36])box(x,2.7,48,31.28,5.4,.22,wall,true);box(0,3.98,48,1.44,2.84,.22,wall);connectionPassage(root,solids,lamps,-3,54,0,.9);for(const [x,w] of [[-18,28],[8.25,8.5],[23.75,16.5]])box(x,2.7,-48,w,5.4,.22,wall,true);
 // Closed perimeter, visible towers, and sheeted construction enclose a believable service yard.
 const windowGlass=new T.MeshPhysicalMaterial({color:'#889b9f',roughness:.22,transparent:true,opacity:.3,depthWrite:false,side:T.DoubleSide}),windowLit=new T.MeshStandardMaterial({color:'#9c9a75',emissive:'#746d43',emissiveIntensity:.22,roughness:.5});
 const interior=new T.MeshStandardMaterial({color:'#111817',roughness:1}),curtainMaterials=['#92958a','#b6ad9b','#777d78'].map(color=>new T.MeshStandardMaterial({color,roughness:1,side:T.DoubleSide}));
 const curtainGeometry=new T.PlaneGeometry(2.5,1.66,24,1);const folds=curtainGeometry.getAttribute('position');for(let i=0;i<folds.count;i++)folds.setZ(i,.012*Math.cos(folds.getX(i)*Math.PI*8));curtainGeometry.computeVertexNormals();
 // Recessed glazing sits behind thick jambs; spandrels and piers carry the bays.
 for(const side of [-1,1]){
  // Ground-floor facilities plus27 residential levels match the 28F home.
  box(side*39.5,40.8,0,14,81.6,98,wall);box(side*32.15,3.05,0,.7,.3,96,concrete);
  for(let level=0;level<27;level++){
   const y=4.6+level*2.9;
   box(side*32.15,y-1.18,0,.7,.54,96,concrete);box(side*32.15,y+1.2,0,.7,.5,96,wall);
   for(let bay=0;bay<17;bay++){
    const z=-44+bay*5.5,x=side*32.05;
    box(x,y,z-2.03,.7,2.9,1.44,wall);
    box(x,y,z+2.03,.7,2.9,1.44,wall);
    box(side*32.35,y,z,.06,1.82,2.68,(bay+level*3)%17===0?windowLit:windowGlass);
    if((bay+level*3)%17!==0){
     box(side*32.46,y,z,.02,1.82,2.68,interior);
     if((bay*7+level*3)%5<2){const curtain=new T.Mesh(curtainGeometry,curtainMaterials[(bay+level)%3]);curtain.rotation.y=-side*Math.PI/2;curtain.position.set(side*32.41,y,z);curtain.castShadow=curtain.receiveShadow=true;root.add(curtain);}
    }
    for(const dz of [-1.37,0,1.37])box(side*32.12,y,z+dz,.41,1.9,.07,steel);
    for(const dy of [-.94,.94])box(side*32.12,y+dy,z,.41,.08,2.8,steel);
    box(side*31.97,y-.99,z,.88,.12,2.95,concrete);
    // A few air conditioners, louvered shutters and clothes rails belong to
    // particular homes; they are mounted to the wall on actual brackets.
    if(level<5&&(bay+level*2)%7===2){
     const az=z+2.03;
     for(const dz of [-.45,.45]){box(side*31.64,y-.295,az+dz,.65,.07,.07,steel);box(side*31.91,y-.12,az+dz,.07,.42,.07,steel);}
     box(side*31.42,y+.04,az,.48,.6,1.08,white);
     for(let i=0;i<7;i++)box(side*31.17,y-.19+i*.075,az,.025,.024,.88,steel);
     roundPipe(root,[side*31.64,y+.15,az+.5],[side*31.91,y+.15,az+.5],.025,steel);
    }else if(level<4&&(bay+level)%9===4){
     for(const dz of [-1.48,1.48])roundPipe(root,[side*31.9,y-.65,z+dz],[side*31.45,y-.65,z+dz],.022,steel);
     roundPipe(root,[side*31.45,y-.65,z-1.48],[side*31.45,y-.65,z+1.48],.022,steel);
    }
   }
  }
  for(let z=-46.75;z<=44;z+=11){
   roundPipe(root,[side*31.65,.15,z],[side*31.65,81.5,z],.07,steel);
   for(let y=.7;y<81.5;y+=5.8)box(side*31.78,y,z,.27,.09,.22,steel);
   roundPipe(root,[side*31.65,.15,z],[side*31.35,.15,z],.07,steel);
  }
  sign(side<0?'백로아파트\n101동':'백로아파트\n102동',side*31.89,3.8,35,2.6,1,-side*Math.PI/2);
  // Service cabinets and drain grilles remain against the structural plinth.
  for(const z of [-10,12,39]){
   box(side*31.69,.9,z,.4,1.2,.72,steel,true);
   box(side*31.48,.9,z,.035,1.08,.62,dark);
   for(let i=0;i<5;i++)box(side*31.455,.6+i*.08,z,.025,.028,.48,steel);
  }
 }
 // A closed connecting door remains visible behind the arriving player.
 for(const x of [-.77,.77])box(x,1.22,47.86,.08,2.44,.18,steel);sign('공동시설',0,2.68,47.886,1.3,.26,Math.PI);
 // An enclosed, on-grade facade-repair compound. The existing yard slab
 // continues inside; no false excavation or invisible filled-volume collider.
 function fence(x:number,z:number,length:number,alongZ:boolean){
  const panels=Math.ceil(length/2.4),span=length/panels;
  const part=(u:number,y:number,w:number,h:number,d:number,m:T.Material,solid=false)=>box(x+(alongZ?0:u),y,z+(alongZ?u:0),alongZ?d:w,h,alongZ?w:d,m,solid);
  part(0,.07,length,.14,.2,concrete,true);
  for(let i=0;i<panels;i++){
   const u=-length/2+(i+.5)*span;
   part(u,.72,span-.015,1.16,.055,steel,true);
   for(let rib=-span/2+.12;rib<span/2;rib+=.24)part(u+rib,.72,.035,1.16,.09,steel);
  }
  for(const y of [.3,1.24,1.32])part(0,y,length,.065,.14,steel);
  for(let i=0;i<=panels;i++){
   const u=-length/2+i*span;
   part(u,.73,.075,1.46,.12,steel);
   part(u,.08,.42,.16,.55,concrete,true);
   if(i%3===0){
    const px=x+(alongZ?-.5*Math.sign(x):u),pz=z+(alongZ?u:-.5*Math.sign(z));
    roundPipe(root,[x+(alongZ?0:u),1.24,z+(alongZ?u:0)],[px,.16,pz],.027,steel);
    box(px,.08,pz,.35,.16,.35,concrete);
   }
  }
 }
 for(const x of [-18,18])fence(x,0,46,true);
 for(const z of [-23,23])fence(0,z,36,false);
 // Palletized replacement sills, sorted masonry and a braced work rack.
 for(const [x,z] of [[-13,18],[12,17],[-12,-17]]){
  for(const dz of [-.7,.7])box(x,.09,z+dz,3.2,.18,.16,wood);
  for(let i=0;i<8;i++)box(x-1.4+i*.4,.22,z,.32,.08,1.8,wood);
  for(let layer=0;layer<4;layer++)for(let j=0;j<3;j++)box(x,.34+layer*.16,z-.5+j*.5,2.7,.16,.42,concrete);
 }
 for(let i=0;i<9;i++){
  const h=.14+(i%3)*.06,piece=new T.Mesh(new T.CylinderGeometry(.1+(i%2)*.04,.24,h,5),concrete);
  piece.position.set(-9.2+(i%3)*.48,h/2,17.4+Math.floor(i/3)*.44);piece.rotation.y=i*.8;piece.castShadow=true;piece.receiveShadow=true;root.add(piece);
 }
 for(const x of [-7,-3.5,0,3.5,7]){
  box(x,.1,-16,.65,.2,.65,concrete);
  roundPipe(root,[x,.2,-16],[x,3.4,-16],.05,steel);
  roundPipe(root,[x,.2,-18],[x,2.3,-16],.04,steel);
  box(x,.1,-18,.65,.2,.65,concrete);
 }
 for(const y of [1.1,2.6,3.4])roundPipe(root,[-7,y,-16],[7,y,-16],.045,steel);
 roundPipe(root,[-7,.2,-16],[7,3.4,-16],.027,steel);
 for(let i=0;i<9;i++)box(-5.6+i*1.4,.24,-17,1.25,.48,.65,concrete);
 for(const x of [-16,16])for(const z of [-20,20]){box(x,.035,z,.48,.07,.48,dark);const cone=new T.Mesh(new T.ConeGeometry(.18,.6,12),rust);cone.position.set(x,.37,z);root.add(cone);}
 for(const side of [-1,1])for(const z of [-18,18]){
  box(side*29,.25,z,1.5,.5,3.3,concrete,true);box(side*29,.505,z,1.25,.01,3,soil);
  for(const dx of [-.7,.7])box(side*29+dx,.53,z,.12,.12,3.4,concrete);
  for(const dz of [-1.65,1.65])box(side*29,.53,z+dz,1.5,.12,.12,concrete);
 }
 courtyardPlanting(root);
 box(0,1.04,23.055,4,.48,.05,white);box(0,1.36,23.055,5,.28,.05,white);
 sign('외벽 보수공사 · 중앙 진입 금지',0,1.04,23.081,4,.48);sign('← 서측 초소       동측 비상전화 →',0,1.36,23.081,5,.28);
 for(const x of [-25,25])for(const z of [-38,0,37])light(x,z);
 for(const x of [-27,27])for(const z of [-8,8]){
  const bench=new T.Group();bench.position.set(x,0,z);bench.name='grounded-courtyard-bench';bench.userData.floorProp=true;root.add(bench);
  for(const dx of [-.85,.85])for(const dz of [-.21,.21])box(dx,.22,dz,.065,.44,.065,steel,false,bench);
  for(const dz of [-.22,0,.22])box(0,.46,dz,2.2,.065,.17,wood,false,bench);for(const y of [.7,.95])box(0,y,-.26,2.2,.12,.045,wood,false,bench);for(const dx of [-.85,.85])box(dx,.7,-.26,.04,.5,.06,steel,false,bench);
  for(const dx of [-.96,.96]){box(dx,.7,0,.055,.055,.6,steel,false,bench);box(dx,.58,.22,.055,.24,.055,steel,false,bench);}
  // Keep this compact assembly in one existing 8 m batching cell.
  for(const part of bench.children){part.position.x+=2;part.position.z+=2;}
  bench.position.x-=2;bench.position.z-=2;batchStaticGeometry(bench,[]);
  solids.push({x,z,w:2.2,d:.6,y:.5,h:1});
 }
 function booth(x:number,z:number,title:string){
  box(x,-.025,z,6,.05,6,concrete);
  box(x,2.5,z,6.5,.16,6.6,steel);
  for(const dx of [-3.16,3.16])box(x+dx,2.43,z,.12,.22,6.7,steel);
  for(const dz of [-3.25,3.25])box(x,2.43,z+dz,6.5,.22,.12,steel);
  box(x,1.2,z-3,6,2.4,.18,wall,true);
  // Thick side-window reveals, lower panels and mullions meet at their edges.
  for(const side of [-1,1]){
   const xx=x+side*3;
   box(xx,.51,z,.18,1.02,6,wall,true);box(xx,2.21,z,.18,.38,6,wall,true);
   for(const dz of [-2.2,2.2])box(xx,1.52,z+dz,.18,1,1.6,wall,true);
   box(xx,1.52,z,.04,1,2.8,windowGlass,true);solids.at(-1)!.seeThrough=true;
   for(const dz of [-1.43,0,1.43])box(xx,1.52,z+dz,.22,1.12,.065,steel);
   for(const y of [1,2.04])box(xx,y,z,.3,.09,3,steel);
   box(xx-side*.06,.92,z,.44,.08,3.08,concrete);
  }
  for(const dx of [-2,2]){
   box(x+dx,.5,z+3,2,1,.18,wall,true);
   box(x+dx,1.52,z+3,1.72,1.04,.04,windowGlass,true);solids.at(-1)!.seeThrough=true;
   for(const jamb of [-.95,.95])box(x+dx+jamb,1.52,z+3,.1,1.04,.2,steel);
   for(const y of [1,2.04])box(x+dx,y,z+3,2,.08,.25,steel);
  }
  box(x,2.23,z+3,6,.38,.18,steel);
  for(const dx of [-1,1])box(x+dx,1.08,z+3,.08,2.16,.24,steel);
  sign(title,x,2.225,z+3.101,2.8,.22);
  // Canopy has wall anchors, knee braces and a weather lip above the doorway.
  box(x,2.39,z+3.48,2.6,.08,1.05,steel);
  for(const dx of [-1.12,1.12])roundPipe(root,[x+dx,1.95,z+3.1],[x+dx,2.35,z+3.87],.023,steel);
  box(x,2.32,z+3.97,2.6,.15,.06,steel);
  box(x,.75,z,2.4,.12,.9,wood,true);
  for(const dx of [-1,1])for(const dz of [-.3,.3])box(x+dx,.345,z+dz,.06,.69,.06,steel);
  box(x,.58,z-.32,2.05,.18,.06,wood);
  // Chair behind the desk, wall key cabinet and fitted noticeboard.
  for(const dx of [-.25,.25])for(const dz of [-.25,.25])box(x+dx,.22,z-1.3+dz,.045,.44,.045,steel);
  box(x,.46,z-1.3,.62,.06,.6,wood,true);
  for(const dx of [-.25,.25])box(x+dx,.7,z-1.56,.045,.5,.045,steel);
  box(x,.79,z-1.56,.6,.25,.06,wood);
  box(x+1.9,1.45,z-2.84,.9,.95,.16,wood);
  box(x+1.9,1.45,z-2.748,.77,.82,.025,dark);
  for(const dx of [-.24,0,.24])roundPipe(root,[x+1.9+dx,1.52,z-2.73],[x+1.9+dx,1.52,z-2.65],.012,steel);
  box(x-1.6,1.5,z-2.86,1.35,.94,.1,wood);
  box(x-1.6,1.5,z-2.802,1.21,.8,.015,white);
  const board=sign(x<0?'인계: 원본 폐기 요청 접수 거절\n동측 보관함 열쇠: 이 판 뒤\n03:26 / 2803호 입차':'야간 근무표\n순찰 · 열쇠 반납',x-1.6,1.5,z-2.794,1.15,.72,0,'#020202');
  box(x,2.38,z,.8,.08,.22,white);
  return board;
 }
 const log=booth(-25,30,'서측 경비초소');booth(25,30,'동측 열쇠 보관 초소');
 target('court_log','인계서와 보관함 열쇠 챙기기',log,[-26.6,1.5,27.206],[-26.6,28.4]);
 const handoverKey=new T.Group();handoverKey.name='courtyard-handover-key';handoverKey.position.set(-26.6,1.19,27.23);root.add(handoverKey);
 const handoverRing=new T.Mesh(new T.TorusGeometry(.032,.005,8,20),steel);handoverKey.add(handoverRing);for(const [x,y,w,h] of [[0,-.07,.012,.09],[.02,-.10,.04,.012]]){const part=new T.Mesh(new T.BoxGeometry(w,h,.012),steel);part.position.set(x,y,0);handoverKey.add(part);}
 const logMaterial=log.material as T.MeshStandardMaterial;log.material=new T.MeshLambertMaterial({map:logMaterial.map});logMaterial.dispose();
 const courtSafe=createCourtyardSafe();root.add(courtSafe.root);solids.push(courtSafe.block);root.updateMatrixWorld(true);
 const handle=courtSafe.handle.getWorldPosition(new T.Vector3());target('court_confirm','인계 열쇠로 보관함 열기',courtSafe.handle,[handle.x,handle.y,handle.z+.02],[25,31.65]);
 const keyPoint=courtSafe.key.getWorldPosition(new T.Vector3());target('court_key','금고 안 지하문 열쇠 집기',courtSafe.key,[keyPoint.x,keyPoint.y,keyPoint.z],[25,31.65]);
 // Weather-protected hands-free emergency station, mounted to its steel backing.
 box(25,1.24,-32,1.5,2.48,.14,steel,true);box(25,2.52,-31.3,1.7,.12,1.6,steel);
 for(const x of [24.2,25.8])box(x,1.24,-31.3,.07,2.48,1.6,steel,true);
 const courtPhone=createEmergencyPhone();courtPhone.root.position.set(25,1.35,-31.93);root.add(courtPhone.root);
 roundPipe(root,[25,0,-31.91],[25,1.05,-31.91],.012,steel);for(const y of [.25,.75])box(25,y,-31.9,.06,.035,.035,steel);
 sign('비상전화 · 야간 당직 17',25,2.17,-31.916,1.24,.22);
 for(const [id,label,button] of [['court_phone','비상전화 통화',courtPhone.call],['court_hangup','비상전화 종료',courtPhone.stop]] as const){root.updateMatrixWorld(true);const p=button.getWorldPosition(new T.Vector3());p.z+=.005;target(id,label,button,[p.x,p.y,p.z],[25,-30.4]);targets.at(-1)!.precise=true;}
 // Disused playground and recovered headlamp shards on a supported inspection bench.
 for(const x of [-29,-22])for(const dz of [-1.1,1.1]){roundPipe(root,[x,0,-31+dz],[x,2.7,-31],.038,rust);box(x,.025,-31+dz,.3,.05,.3,concrete,true);}roundPipe(root,[-29,2.7,-31],[-22,2.7,-31],.043,rust);
 const swing=new T.Group();swing.name='courtyard-swing';swing.position.set(-25.5,2.7,-31);root.add(swing);
 for(const x of [-.27,.27])roundPipe(swing,[x,0,0],[x,-2.2,0],.008,steel);box(0,-2.2,0,.7,.07,.3,dark,false,swing);
 box(-25,.42,-27,2.1,.12,.8,wood,true);for(const x of [-25.9,-24.1])for(const z of [-27.28,-26.72])box(x,.18,z,.07,.36,.07,steel);
 box(-25,.481,-27,.54,.002,.39,dark);box(-25,.4845,-27,.51,.005,.36,white);box(-25.263,.484,-27,.014,.008,.39,steel);
 const notebook=sign('야간 점검\n정문 횡단보도 · 비상벨',-25,.4875,-27,.5,.35);notebook.rotation.x=-Math.PI/2;target('court_evidence','전조등 조각과 당직 수첩',notebook,[-25,.5,-26.9],[-25,-25.8]);
 // Flat fractured lens pieces rest on the inspection surface. Their thin
 // triangular sections replace the old hovering solid tetrahedra.
 const fragments:number[]=[];
 const pieces=[[-.83,-.12,.12,.085,.2],[-.6,-.1,.09,.11,-.55],[-.4,-.08,.13,.07,.6],[-.8,.09,.1,.08,-.3],[-.59,.1,.12,.1,1.1],[-.39,.13,.08,.065,-.8],[-.91,.23,.06,.07,.7]];
 for(let i=0;i<pieces.length;i++){
  const [dx,dz,w,d,angle]=pieces[i],h=.003+(i%2)*.001;
  const shape=i%2?[[0,0],[w,.015],[w*.74,d],[w*.12,d*.8]]:[[0,0],[w,d*.2],[w*.27,d]];
  const bottom=shape.map(([u,v])=>[-25+dx+u*Math.cos(angle)-v*Math.sin(angle),.48,-27+dz+u*Math.sin(angle)+v*Math.cos(angle)]);
  const top=bottom.map(([x,y,z])=>[x,y+h,z]);
  for(let j=1;j<shape.length-1;j++)fragments.push(...bottom[0],...bottom[j],...bottom[j+1],...top[0],...top[j+1],...top[j]);
  for(let j=0;j<shape.length;j++){const k=(j+1)%shape.length;fragments.push(...bottom[j],...top[j],...top[k],...bottom[j],...top[k],...bottom[k]);}
 }
 const lensGeometry=new T.BufferGeometry();lensGeometry.setAttribute('position',new T.Float32BufferAttribute(fragments,3));lensGeometry.computeVertexNormals();
 const lens=new T.Mesh(lensGeometry,new T.MeshStandardMaterial({color:'#a7bab5',metalness:.12,roughness:.12,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false}));lens.name='recovered-headlamp-pieces';lens.castShadow=true;lens.receiveShadow=true;root.add(lens);
 const car=createSedan('#58655c');car.position.set(-25,0,-15);root.add(car);solids.push(...sedanSolids(-25,-15));
 for(const [x,z] of [[-22,38],[26,5],[-26,-40],[8,-40]]){const film=new T.Mesh(new T.PlaneGeometry(5,7),new T.MeshPhysicalMaterial({map:wetTexture(false,Math.round(x+z)),color:'#1a302b',transparent:true,opacity:.35,roughness:.07,depthWrite:false}));film.rotation.x=-Math.PI/2;film.position.set(x,.011,z);root.add(film);}
 // Main gate stays closed; the separate basement doorway becomes the actual exit.
 box(0,1.8,-47.8,8,3.6,.16,steel,true);for(let y=.2;y<3.6;y+=.16)box(0,y,-47.7,7.9,.025,.03,dark);
 box(0,1.5,-47.684,1.86,.96,.012,steel);
 sign('정문 폐쇄\n지하 통로 이용',0,1.5,-47.674,1.8,.9);
 // Arrival instructions stand on weighted feet beside the entry, clear of its route.
 for(const x of [-5.05,-2.95]){box(x,.04,42.5,.42,.08,.5,steel,true);box(x,1.03,42.5,.07,1.98,.07,steel,true);}
 box(-4,1.65,42.5,2.6,1.2,.12,steel,true);
 for(const x of [-5.23,-2.77])for(const y of [1.12,2.18])box(x,y,42.568,.045,.045,.02,dark);
 const notice=sign('정문 폐쇄 · 지하 우회 통로\n기록보관실 → 배수 기계실 → 주차장\n지하문 열쇠: 동측 초소 금고\n열쇠 인계 기록: 서측 경비초소',-4,1.65,42.562,2.4,1.04,0,'#020202');
 // Matte paper has no glossy highlight that washes out its close-range print.
 const noticeMaterial=notice.material as T.MeshStandardMaterial;
 notice.material=new T.MeshLambertMaterial({map:noticeMaterial.map});noticeMaterial.dispose();
 target('court_gate','입구의 우회 통로 안내 확인',notice,[-4,1.65,42.57],[-4,44]);
 const doorZ=-44,doorX=14;
 for(const x of [doorX-1.5,doorX+1.5])box(x,-.2,-48,.18,6.4,8.4,wall,true);box(doorX,2.9,-48,3.1,.2,8.4,wall);
 for(const x of [doorX-1.15,doorX+1.15])box(x,1.4,doorZ,.7,2.8,.18,wall,true);box(doorX,2.6,doorZ,1.6,.4,.18,wall);
 const hinge=new T.Group();hinge.name='expansion-exit-door';hinge.position.set(doorX-.7,0,doorZ);root.add(hinge);const leaf=box(.7,1.17,0,1.37,2.34,.08,steel,false,hinge);
 const block={x:doorX,z:doorZ,w:1.4,d:.12,y:1.17,h:2.34};solids.push(block);target('court_exit','기록보관실 계단 문 열기',leaf,[doorX,1.2,doorZ+.13],[doorX,doorZ+1.2]);
 sign('B1 기록보관실',doorX,2.54,doorZ+.1,1.6,.28);
 for(let i=0;i<21;i++)box(doorX,-i*.14-.09,doorZ-.2-i*.34,2.8,.18,.35,concrete);
 connectionPassage(root,solids,lamps,doorX,-51,-2.8);for(const side of [-1,1])roundPipe(root,[doorX+side*1.22,.9,doorZ],[doorX+side*1.22,-1.9,-50.8],.023,steel);
 const stairLight=new T.PointLight('#869e90',3,10);stairLight.position.set(doorX,1.7,doorZ-.8);stairLight.userData.base=3;lamps.push(stairLight);root.add(stairLight);
 const figure=createGhost(root);figure.position.set(0,0,45);figure.visible=false;figure.rotation.y=Math.PI;
 let opened=-1;
 function updateStory(stage:Stage,time:number,reduced=false,story?:Story,occupants:Occupant[]=[]){
  if(stage==='court_departure'&&opened<0)opened=time;if(opened>=0)setDoorAngle(hinge,block,1.5*T.MathUtils.smoothstep(time-opened,0,.9),.7,0,occupants);
  swing.rotation.x=reduced?0:Math.sin(time*.7)*.055;
  if(story){courtSafe.update(stage,time,story,occupants);handoverKey.visible=!story.notes.includes('court_log');}
 }
 return {solids,targets,lamps,figure,shoes:new T.Group(),phoneGlow:new T.PointLight(),radioLight:new T.PointLight(),bounds:{x:31.8,z:58},spawn:new T.Vector3(0,1.65,44.5),heading:0,heightAt:(x:number,z:number)=>z<=-51&&x>doorX-1.2&&x<doorX+4.3?-2.8:Math.abs(x-doorX)<1.4&&z<doorZ? -Math.min(2.8,Math.max(0,(-z+doorZ-.2)/.34)*.14):0,liftDoors:undefined,setDisplay:undefined,fallingFigure:undefined,courtPhone,courtSafe,updateStory,reset(){opened=-1;handoverKey.visible=true;courtSafe.reset();courtPhone.setState('idle');}};
}
