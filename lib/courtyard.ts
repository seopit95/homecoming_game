import * as T from 'three';
import {connectionPassage,setDoorAngle} from './passage.ts';
import type {Occupant} from './collision.ts';
import {surface,boxUV,softBox} from './materials.ts';
import {roundPipe,createSedan} from './props.ts';
import {wetTexture} from './entry-props.ts';
import {createGhost} from './ghost.ts';
import type {Solid,Target} from './world.ts';
import type {Action,Stage,Story} from './story.ts';

export const courtyardLayout={x:32,z:48,name:'1F · 외부 중정',exit:'B1 기록보관실',rooms:['서측 경비초소','놀이터','금고 보관 초소','비상전화'],patrol:[{x:-25,z:34},{x:-25,z:-34},{x:25,z:-34},{x:25,z:34}]};
export function buildCourtyard(root:T.Group){
 const solids:Solid[]=[],targets:Target[]=[],lamps:T.PointLight[]=[];
 const concrete=surface('garage','#818b82'),wall=surface('decayWall','#9ca491'),steel=surface('steel','#6f7a72',{metalness:.5,roughness:.54}),wood=surface('wood','#76654d');
 const dark=new T.MeshStandardMaterial({color:'#182322',roughness:.82}),white=new T.MeshStandardMaterial({color:'#b8b6a1',roughness:.9}),rust=new T.MeshStandardMaterial({color:'#795744',roughness:.9});
 root.name='courtyard-chapter';
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false,parent:T.Object3D=root){const mesh=new T.Mesh(boxUV(softBox(w,h,d,.018),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);if(solid)solids.push({x,z,w,d,y,h});return mesh;}
 function sign(text:string,x:number,y:number,z:number,w=1.5,h=.5,ry=0):T.Mesh{const c=document.createElement('canvas');c.width=768;c.height=Math.round(768*h/w);const ctx=c.getContext('2d')!,lines=text.split('\n'),font=Math.min(c.height/(lines.length*1.6),680/Math.max(...lines.map(l=>l.length),1));ctx.fillStyle='#aab099';ctx.fillRect(0,0,768,c.height);ctx.fillStyle='#223a31';ctx.font=`${font}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((l,i)=>ctx.fillText(l,384,c.height/2+(i-(lines.length-1)/2)*font*1.4));const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.8}));mesh.position.set(x,y,z);mesh.rotation.y=ry;root.add(mesh);return mesh;}
 function target(id:Action,label:string,mesh:T.Object3D,p:[number,number,number],at:[number,number]){mesh.userData.approach={x:at[0],z:at[1]};targets.push({id,label,mesh,point:new T.Vector3(...p)});}
 function light(x:number,z:number,power=9){const l=new T.PointLight('#b0baa1',power,17,2);l.position.set(x,3.3,z);l.userData.base=power;lamps.push(l);root.add(l);roundPipe(root,[x,0,z],[x,3.5,z],.05,steel);box(x,3.5,z,.55,.09,.32,steel);return l;}
 box(0,-.13,2,64,.26,92,concrete);for(const [x,w] of [[-9.75,44.5],[23.75,16.5]])box(x,-.13,-46,w,.26,4,concrete);for(const x of [-32,32])box(x,2.7,0,.22,5.4,96,wall,true);
 for(const x of [-16.36,16.36])box(x,2.7,48,31.28,5.4,.22,wall,true);box(0,3.98,48,1.44,2.84,.22,wall);connectionPassage(root,solids,lamps,-3,54);for(const [x,w] of [[-18,28],[8.25,8.5],[23.75,16.5]])box(x,2.7,-48,w,5.4,.22,wall,true);
 // Closed perimeter, visible towers, and sheeted construction enclose a believable service yard.
 const windowGlass=new T.MeshStandardMaterial({color:'#182a30',metalness:.35,roughness:.25}),windowLit=new T.MeshStandardMaterial({color:'#9c9a75',emissive:'#746d43',emissiveIntensity:.22,roughness:.5});
 for(const side of [-1,1]){
  box(side*35,18,0,5,36,98,wall);
  for(let level=0;level<10;level++){
   const y=5+level*2.9;box(side*32.28,y-1.18,0,.28,.17,96,concrete);
   for(let z=-44;z<=44;z+=5.5){
    const x=side*32.38;box(x,y,z,.17,1.75,2.4,steel);box(x-side*.095,y,z,.027,1.55,2.18,(Math.round(z/5.5)+level)%9===0?windowLit:windowGlass);
    box(x-side*.13,y,z,.06,1.58,.047,steel);box(x-side*.13,y-.35,z,.06,.04,2.2,steel);box(x-side*.2,y-.92,z,.4,.12,2.55,concrete);
    if(level<3){box(x-side*.33,y-.85,z,.55,.08,2.58,steel);for(const dz of [-1.2,0,1.2])box(x-side*.58,y-.5,z+dz,.035,.7,.035,steel);box(x-side*.58,y-.16,z,.045,.035,2.6,steel);}
   }
  }
  for(let z=-44;z<=44;z+=11)roundPipe(root,[side*31.7,0,z],[side*31.7,35,z],.055,steel);
 }
 // A closed connecting door remains visible behind the arriving player.
 for(const x of [-.77,.77])box(x,1.22,47.86,.08,2.44,.18,steel);sign('공동시설',0,2.68,47.735,1.3,.26,Math.PI);
 // A fenced construction pit forces distinct east and west routes, with crossovers at both ends.
 box(0,.27,0,36,.54,46,dark,true);
 for(const x of [-18,18]){box(x,.74,0,.12,1.48,46,steel);for(let z=-22;z<=22;z+=2.5)roundPipe(root,[x,.2,z],[x,1.6,z],.025,rust);}
 for(const z of [-23,23])box(0,.74,z,36,1.48,.1,steel);
 for(let i=0;i<24;i++){const x=Math.sin(i*1.97)*15,z=Math.cos(i*2.47)*19;box(x,.65+(i%3)*.13,z,1.3+(i%4)*.3,.3+(i%3)*.26,.7,concrete);}
 for(const x of [-16,16])for(const z of [-20,20]){box(x,.57,z,.8,.07,.8,dark);const cone=new T.Mesh(new T.ConeGeometry(.2,.65,16),rust);cone.position.set(x,.93,z);root.add(cone);}
 for(const side of [-1,1])for(const z of [-18,18]){box(side*29,.25,z,1.5,.5,3.3,concrete,true);box(side*29,.515,z,1.25,.03,3,dark);for(let i=0;i<5;i++){const branch=new T.Mesh(new T.ConeGeometry(.27,.83,7),dark);branch.position.set(side*29,.92,z-1.2+i*.6);root.add(branch);}}
 sign('외벽 보수공사 · 중앙 진입 금지',0,1.04,23.065,4,.48);sign('← 서측 초소       동측 비상전화 →',0,1.36,23.067,5,.28);
 for(const x of [-25,25])for(const z of [-38,0,37])light(x,z);
 for(let z=-42;z<=42;z+=7)for(const x of [-21.5,21.5])box(x,.01,z,.12,.018,1.8,white);
 for(const x of [-27,27])for(const z of [-8,8]){
  const bench=new T.Group();bench.position.set(x,0,z);bench.name='grounded-courtyard-bench';bench.userData.floorProp=true;root.add(bench);
  for(const dx of [-.85,.85])for(const dz of [-.21,.21])box(dx,.22,dz,.065,.44,.065,steel,false,bench);
  for(const dz of [-.22,0,.22])box(0,.46,dz,2.2,.065,.17,wood,false,bench);for(const y of [.7,.95])box(0,y,-.26,2.2,.12,.045,wood,false,bench);for(const dx of [-.85,.85])box(dx,.7,-.26,.04,.5,.06,steel,false,bench);
  solids.push({x,z,w:2.2,d:.6,y:.5,h:1});
 }
 function booth(x:number,z:number,title:string){
  box(x,-.025,z,6,.05,6,concrete);box(x,2.45,z,6.2,.18,6.2,steel);
  for(const dx of [-3,3])box(x+dx,1.2,z,.12,2.4,6,wall,true);box(x,1.2,z-3,6,2.4,.12,wall,true);
  for(const dx of [-2,2])box(x+dx,1.2,z+3,2,2.4,.12,wall,true);box(x,2.25,z+3,2,.3,.12,wall);
  sign(title,x,2.3,z+3.07,2.8,.27);box(x,.75,z,2.4,.12,.9,wood,true);for(const dx of [-1,1])for(const dz of [-.3,.3])box(x+dx,.345,z+dz,.06,.69,.06,steel);
 }
 booth(-25,30,'서측 경비초소');booth(25,30,'동측 열쇠 보관 초소');
 const log=sign('03:26 / 2803 입차\n금고: 입차 분 + 당직 내선',-25,.82,30,.65,.38);log.rotation.x=-Math.PI/2;target('court_log','사흘 전 경비일지',log,[-25,.84,30.2],[-25,31.2]);
 box(25,1.22,30,.92,.82,.55,steel);box(25,1.22,30.292,.84,.73,.035,dark);
 const dials:T.Mesh[]=[];
 for(let i=0;i<4;i++){const x=24.72+i*.185,dial=sign('0',x,1.27,30.322,.14,.2);dial.material=new T.MeshBasicMaterial({map:(dial.material as T.MeshStandardMaterial).map,toneMapped:false});dials.push(dial);for(const dx of [-.079,.079])box(x+dx,1.27,30.34,.018,.235,.02,steel);for(const y of [1.155,1.385])box(x,y,30.34,.175,.02,.02,steel);target(`court_digit_${i}` as Action,`${i+1}번째 숫자 올리기`,dial,[x,1.27,30.35],[x,31.25]);}
 for(const y of [1,1.45])box(24.58,y,30.304,.058,.13,.065,steel);box(25.34,1.09,30.34,.035,.15,.045,steel);
 const confirm=box(25,1.01,30.342,.32,.07,.04,rust);target('court_confirm','금고 번호 확인',confirm,[25,1.01,30.38],[25,31.25]);const confirmLabel=sign('확인',25,1.01,30.365,.26,.052);confirmLabel.material=new T.MeshBasicMaterial({map:(confirmLabel.material as T.MeshStandardMaterial).map,toneMapped:false});
 // Emergency telephone booth, with a supported handset and directory beside it.
 box(25,1.24,-32,1.5,2.48,.14,steel,true);box(25,2.52,-31.3,1.7,.12,1.6,steel);
 for(const x of [24.2,25.8])box(x,1.24,-31.3,.07,2.48,1.6,steel,true);
 const phone=box(25,1.35,-31.805,.54,.64,.25,dark);box(24.85,1.35,-31.61,.12,.42,.09,steel);roundPipe(root,[24.85,1.12,-31.57],[24.9,.83,-31.57],.009,dark);
 sign('비상전화 · 야간 당직 17',25,2.17,-31.916,1.24,.22);target('court_phone','비상전화 걸기',phone,[25,1.35,-31.55],[25,-30.4]);
 // Disused playground and recovered headlamp shards on a supported inspection bench.
 for(const x of [-29,-22])for(const dz of [-1.1,1.1])roundPipe(root,[x,0,-31+dz],[x,2.7,-31],.038,rust);roundPipe(root,[-29,2.7,-31],[-22,2.7,-31],.043,rust);
 const swing=new T.Group();swing.name='courtyard-swing';swing.position.set(-25.5,2.7,-31);root.add(swing);
 for(const x of [-.27,.27])roundPipe(swing,[x,0,0],[x,-2.2,0],.008,steel);box(0,-2.2,0,.7,.07,.3,dark,false,swing);
 box(-25,.42,-27,2.1,.12,.8,wood,true);for(const x of [-25.9,-24.1])for(const z of [-27.28,-26.72])box(x,.18,z,.07,.36,.07,steel);
 const notebook=sign('야간 점검\n정문 횡단보도 · 비상벨',-25,.487,-27,.5,.35);notebook.rotation.x=-Math.PI/2;target('court_evidence','전조등 조각과 당직 수첩',notebook,[-25,.5,-26.9],[-25,-25.8]);
 for(let i=0;i<7;i++){const shard=new T.Mesh(new T.TetrahedronGeometry(.045+i*.003),steel);shard.position.set(-25.6+i*.16,.535,-27.1+Math.sin(i)*.1);root.add(shard);}
 const car=createSedan('#58655c');car.position.set(-25,0,-15);root.add(car);solids.push({x:-25,z:-15,w:1.82,d:4.35,y:.8,h:1.6});
 for(const [x,z] of [[-22,38],[26,5],[-26,-40],[8,-40]]){const film=new T.Mesh(new T.PlaneGeometry(5,7),new T.MeshPhysicalMaterial({map:wetTexture(false,Math.round(x+z)),color:'#1a302b',transparent:true,opacity:.35,roughness:.07,depthWrite:false}));film.rotation.x=-Math.PI/2;film.position.set(x,.011,z);root.add(film);}
 // Main gate stays closed; the separate basement doorway becomes the actual exit.
 box(0,1.8,-47.8,8,3.6,.16,steel,true);for(let y=.2;y<3.6;y+=.16)box(0,y,-47.7,7.9,.025,.03,dark);
 const notice=sign('정문 셔터 고장\n지하문 열쇠: 동측 경비초소\n금고: 입차 분 + 당직 내선',0,1.5,-47.58,1.8,.9);target('court_gate','정문 공사 안내 확인',notice,[0,1.5,-47.5],[0,-46.3]);
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
 let opened=-1,lastCode='';
 function updateStory(stage:Stage,time:number,reduced=false,story?:Story,occupants:Occupant[]=[]){
  if(stage==='court_departure'&&opened<0)opened=time;if(opened>=0)setDoorAngle(hinge,block,1.5*T.MathUtils.smoothstep(time-opened,0,.9),.7,0,occupants);
  swing.rotation.x=reduced?0:Math.sin(time*.7)*.055;
  const code=story?.code??'0000';if(code!==lastCode){lastCode=code;dials.forEach((dial,i)=>{const m=dial.material as T.MeshStandardMaterial,c=m.map!.image as HTMLCanvasElement,ctx=c.getContext('2d')!;ctx.fillStyle='#aab099';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#223a31';ctx.font='620px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(code[i],c.width/2,c.height/2);m.map!.needsUpdate=true;});}
 }
 return {solids,targets,lamps,figure,shoes:new T.Group(),phoneGlow:new T.PointLight(),radioLight:new T.PointLight(),bounds:{x:31.8,z:58},spawn:new T.Vector3(0,1.65,44.5),heading:0,heightAt:(x:number,z:number)=>z<=-51&&x>doorX-1.2&&x<doorX+4.3?-2.8:Math.abs(x-doorX)<1.4&&z<doorZ? -Math.min(2.8,Math.max(0,(-z+doorZ-.2)/.34)*.14):0,liftDoors:undefined,setDisplay:undefined,fallingFigure:undefined,updateStory,reset(){opened=-1;lastCode='';}};
}
