import {localizedContext,localizedTexture} from './localized-canvas.ts';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {boxUV,softBox,surface,cottonUpholstery,sharePrintedTexture} from './materials.ts';
import {roundPipe,sinkCounter} from './props.ts';
import type {Solid} from './world.ts';

// All dimensions are metres. A kitchen's rear is z=-.45, against the room wall;
// its local +z is the working aisle. Mesh and collision share that installation.
function group(parent:T.Object3D,name:string){const g=new T.Group();g.name=name;parent.add(g);return g;}
function box(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,r=.003){
 const mesh=new T.Mesh(boxUV(softBox(w,h,d,r),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function cylinder(parent:T.Object3D,x:number,y:number,z:number,r:number,h:number,m:T.Material){const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,28),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
// Each semantic assembly is merged by material, retaining real geometry and
// stable group identity without a draw call for every screw or rack wire.
function batch(root:T.Object3D){
 for(const child of [...root.children])if(child instanceof T.Group)batch(child);
 const groups=new Map<T.Material,T.Mesh[]>();
 for(const o of root.children)if(o instanceof T.Mesh&&!Array.isArray(o.material)&&!o.material.transparent){const list=groups.get(o.material)??[];list.push(o);groups.set(o.material,list);}
 for(const [material,meshes] of groups){if(meshes.length<2)continue;const copies=meshes.map(m=>{m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();return g.applyMatrix4(m.matrix);}),g=mergeGeometries(copies)!;
  for(const m of meshes){root.remove(m);m.geometry.dispose();}copies.forEach(g=>g.dispose());const mesh=new T.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
 }
}
function printed(text:string,w:number,h:number){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*h/w);const ctx=localizedContext(canvas)!,lines=text.split('\n'),font=Math.min(canvas.height/(lines.length*1.7),940/Math.max(...lines.map(l=>[...l].length)));
 ctx.fillStyle='#d4cbb5';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#303a36';ctx.font=`${font}px "Apple SD Gothic Neo",sans-serif`;lines.forEach((line,i)=>ctx.fillText(line,512,canvas.height/2+(i-(lines.length-1)/2)*font*1.5));
 const map=sharePrintedTexture(localizedTexture(new T.CanvasTexture(canvas)),['domestic-paper',text]);map.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map,roughness:.94});
}
export function createDomesticKitchen(width:number,home=false){
 const root=new T.Group();root.name='installed-domestic-kitchen';
 const enamel=new T.MeshStandardMaterial({color:home?'#b8b8aa':'#b7b7a4',roughness:.54}),wood=surface('wood',home?'#a99b83':'#93836c'),edge=new T.MeshStandardMaterial({color:'#777c70',roughness:.73}),chrome=new T.MeshStandardMaterial({color:'#a0aba8',metalness:.83,roughness:.27}),dark=new T.MeshStandardMaterial({color:'#202623',roughness:.57}),tile=new T.MeshStandardMaterial({color:'#bdc0b3',roughness:.24}),grout=new T.MeshStandardMaterial({color:'#85897d',roughness:.95});
 const base=group(root,'kitchen-base-units'),back=group(root,'kitchen-backsplash'),upper=group(root,'kitchen-upper-units'),sinkX=-width*.19;
 box(base,0,.075,-.05,width-.05,.15,.74,edge);box(base,0,.167,0,width-.025,.024,.85,wood);
 const count=Math.ceil(width/.6),unit=width/count;
 for(let i=0;i<=count;i++){const x=-width/2+i*unit,underSink=Math.abs(x-sinkX)<.39;box(base,x,underSink?.429:.549,-.01,.018,underSink?.50:.74,.86,wood);}
 box(base,0,.55,-.435,width,.75,.03,wood);box(base,0,.326,-.015,width-.035,.018,.82,wood);
 for(let i=0;i<count;i++){
  const x=-width/2+(i+.5)*unit;box(base,x,.548,.438,unit-.007,.737,.026,enamel);
  roundPipe(base,[x+.15,.79,.46],[x+.15,.79,.495],.008,chrome);roundPipe(base,[x+.15,.63,.46],[x+.15,.63,.495],.008,chrome);roundPipe(base,[x+.15,.63,.495],[x+.15,.79,.495],.008,chrome);
 }
 const worktop=sinkCounter(width+.025,.9,sinkX,.71,.49);worktop.position.y=.93;root.add(worktop);
 worktop.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshStandardMaterial&&o.material.color.getHexString()==='222b2b'){o.material.dispose();o.material=dark;}});
 // A 6mm backing actually touches the wall; tile and grout remain in front of it.
 box(back,0,1.232,-.447,width,.604,.006,grout);
 const columns=Math.ceil(width/.15),tw=width/columns;
 for(let x=0;x<columns;x++)for(let y=0;y<4;y++)box(back,-width/2+(x+.5)*tw,1.005+y*.15,-.440,tw-.003,.147,.008,tile,.001);
 for(let i=0;i<count;i++){
  const x=-width/2+(i+.5)*unit;box(upper,x,1.91,-.435,unit,.74,.03,wood);box(upper,x,1.545,-.285,unit,.02,.33,wood);box(upper,x,2.275,-.285,unit,.02,.33,wood);
  for(const side of [-1,1])box(upper,x+side*(unit/2-.009),1.91,-.285,.018,.74,.33,wood);
  box(upper,x,1.91,-.105,unit-.008,.728,.025,enamel);roundPipe(upper,[x+.15,1.60,-.079],[x+.15,1.72,-.079],.008,chrome);
  for(const y of [1.60,1.72])roundPipe(upper,[x+.15,y,-.092],[x+.15,y,-.079],.008,chrome);
 }
 const cooker=group(root,'kitchen-cooker'),stoveX=width*.27;
 box(cooker,stoveX,.943,.035,.67,.026,.51,dark,.009);box(cooker,stoveX,1.49,-.225,.72,.09,.45,enamel,.012);
 for(let i=0;i<10;i++)box(cooker,stoveX-.25+i*.055,1.443,-.2,.02,.004,.24,chrome,.001);
 for(const dx of [-.16,.16])for(const z of [-.09,.15]){
  const x=stoveX+dx;const ring=new T.Mesh(new T.TorusGeometry(.074,.007,8,28),chrome);ring.rotation.x=-Math.PI/2;ring.position.set(x,.963,z);cooker.add(ring);cylinder(cooker,x,.962,z,.05,.012,dark);
  for(const angle of [0,Math.PI/2]){const rail=box(cooker,x,.979,z,.192,.014,.012,dark);rail.rotation.y=angle;}
 }
 for(const dx of [-.13,.13]){const knob=cylinder(cooker,stoveX+dx,.956,.28,.025,.019,chrome);knob.rotation.x=Math.PI/2;}
 const gas=cooker;roundPipe(gas,[stoveX,1.24,-.417],[stoveX,.998,-.417],.012,chrome);roundPipe(gas,[stoveX,.998,-.417],[stoveX,.962,-.225],.012,dark);box(gas,stoveX,1.26,-.425,.06,.11,.022,enamel);roundPipe(gas,[stoveX-.035,1.26,-.402],[stoveX+.035,1.26,-.402],.008,dark);
 const socket=cooker;box(socket,0,1.22,-.426,.085,.085,.02,enamel);
 for(const x of [-.019,.019]){const hole=cylinder(socket,x,1.22,-.414,.005,.004,dark);hole.rotation.x=Math.PI/2;}
 // The kettle rests on a cold trivet; no flame, steam or unexplained electricity.
 const kettle=group(root,'kitchen-kettle');kettle.position.set(stoveX+.16,.986,.15);
 const profile=[[0,0],[.075,0],[.105,.025],[.12,.09],[.11,.145],[.07,.17],[0,.17]].map(([r,y])=>new T.Vector2(r,y));const shell=new T.Mesh(new T.LatheGeometry(profile,32),chrome);kettle.add(shell);
 cylinder(kettle,0,.174,0,.072,.009,chrome);cylinder(kettle,0,.187,0,.022,.02,dark);
 const handle=new T.Mesh(new T.TorusGeometry(.112,.012,10,32,Math.PI),dark);handle.position.y=.15;kettle.add(handle);roundPipe(kettle,[-.075,.06,0],[-.15,.13,0],.027,chrome);
 const rack=group(root,'kitchen-draining-rack');rack.position.set(-width/2+.265,.93,.025);
 for(const x of [-.18,.18])for(const z of [-.18,.18]){cylinder(rack,x,.008,z,.012,.016,dark);roundPipe(rack,[x,.016,z],[x,.11,z],.0035,chrome);}
 for(const y of [.023,.105])for(const x of [-.18,.18])roundPipe(rack,[x,y,-.18],[x,y,.18],.0035,chrome);
 for(let i=0;i<9;i++)roundPipe(rack,[-.18,.023,-.18+i*.045],[.18,.023,-.18+i*.045],.0035,chrome);
 for(const z of [-.18,.18])roundPipe(rack,[-.18,.105,z],[.18,.105,z],.0035,chrome);
 for(const z of [-.10,0,.10]){const plate=cylinder(rack,0,.129,z,.103,.011,tile);plate.rotation.x=Math.PI/2;}
 batch(root);return root;
}

export function createDomesticFridge(){
 const root=new T.Group(),feet=group(root,'refrigerator-feet'),body=group(root,'refrigerator-body');
 const enamel=new T.MeshStandardMaterial({color:'#bdbeb0',roughness:.43}),trim=new T.MeshStandardMaterial({color:'#5e6863',roughness:.6}),metal=new T.MeshStandardMaterial({color:'#9ba5a0',metalness:.7,roughness:.33});
 for(const x of [-.29,.29])for(const z of [-.26,.26])cylinder(feet,x,.03,z,.033,.06,trim);
 box(body,0,.97,0,.76,1.82,.70,enamel,.015);box(body,0,1.556,.363,.718,.591,.037,enamel,.012);box(body,0,.663,.363,.718,1.178,.037,enamel,.012);
 box(body,0,1.255,.365,.72,.01,.035,trim);for(const y of [1.39,1.07]){for(const yy of [y-.085,y+.085])roundPipe(body,[.27,yy,.389],[.27,yy,.424],.009,metal);roundPipe(body,[.27,y-.085,.424],[.27,y+.085,.424],.012,metal);}
 for(let x=-.29;x<.30;x+=.036)box(body,x,.107,.386,.019,.05,.005,trim,.001);
 const badge=new T.Mesh(new T.PlaneGeometry(.16,.023),printed('냉장 · 냉동',.16,.023));badge.position.set(-.16,1.73,.383);body.add(badge);batch(root);return root;
}

export function placeDomestic(root:T.Object3D,assembly:T.Group,solids:Solid[],x:number,z:number,yaw:number,w:number,d:number,h:number){
 assembly.position.set(x,0,z);assembly.rotation.y=yaw;root.add(assembly);solids.push({x,z,w,d,y:h/2,h,yaw});
}

export function createDiningSet(){
 const root=new T.Group();root.name='home-dining-set';const wood=surface('wood','#9d8b70'),seat=cottonUpholstery('#777f72'),table=group(root,'dining-table');
 box(table,0,.79,0,2.05,.06,.95,wood,.018);for(const x of [-.83,.83])for(const z of [-.33,.33])box(table,x,.365,z,.068,.73,.068,wood);
 for(const z of [-.33,.33])box(table,0,.709,z,1.73,.102,.04,wood);for(const x of [-.83,.83])box(table,x,.709,0,.04,.102,.70,wood);
 for(const x of [-.65,.65])for(const z of [-.73,.69]){
  const chair=group(root,'dining-chair');chair.position.set(x,0,z);chair.rotation.y=z>0?Math.PI:0;
  for(const xx of [-.17,.17])for(const zz of [-.16,.16]){const g=new T.CylinderGeometry(.026,.019,.42,4);g.rotateY(Math.PI/4);const leg=new T.Mesh(boxUV(g),wood);leg.position.set(xx,.21,zz);chair.add(leg);}
  box(chair,0,.419,0,.48,.038,.44,wood,.012);box(chair,0,.452,.003,.452,.03,.414,seat,.014);
  for(const xx of [-.17,.17])roundPipe(chair,[xx,.43,-.16],[xx,.855,-.21],.019,wood);
  const g=new T.BoxGeometry(.44,.265,.024,16,4,1),p=g.getAttribute('position');for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+.045*(p.getX(i)/.22)**2-p.getY(i)*.12);g.computeVertexNormals();
  const back=new T.Mesh(boxUV(g),wood);back.position.set(0,.72,-.195);chair.add(back);
 }
 const dishes=group(root,'dining-place-setting'),ceramic=new T.MeshStandardMaterial({color:'#bfc1af',roughness:.25});cylinder(dishes,.57,.826,.06,.14,.012,ceramic);
 const profile=[[0,0],[.035,0],[.04,.085],[.043,.11],[.037,.11],[.034,.012],[0,.012]].map(([r,y])=>new T.Vector2(r,y));const mug=new T.Mesh(new T.LatheGeometry(profile,28),ceramic);mug.position.set(.59,.82,.30);dishes.add(mug);
 const handle=new T.Mesh(new T.TorusGeometry(.027,.006,8,24),ceramic);handle.position.set(.638,.875,.30);dishes.add(handle);
 batch(root);return root;
}

export function createRepairEstimate(){
 const root=new T.Group();root.name='home-repair-estimate';const paper=new T.MeshStandardMaterial({color:'#c4bca7',roughness:.94});box(root,0,.001,0,.32,.002,.225,paper,.0007);
 const page=new T.Mesh(new T.PlaneGeometry(.314,.219),printed('차량 외관 수리 견적\n앞범퍼 / 우측 헤드램프\n입고: 내일 오전\n고객 요청: 보험 접수 없이',.314,.219));page.rotation.x=-Math.PI/2;page.position.y=.0021;page.receiveShadow=true;root.add(page);return {root,page};
}

export function createKitchenTimer(){
 const root=new T.Group();root.name='home-mechanical-timer';const cream=new T.MeshStandardMaterial({color:'#c4c2ac',roughness:.45}),dark=new T.MeshStandardMaterial({color:'#414b43',roughness:.7});
 const profile=[[0,0],[.044,0],[.062,.012],[.068,.044],[.061,.09],[.037,.12],[0,.13]].map(([r,y])=>new T.Vector2(r,y));const shell=new T.Mesh(new T.LatheGeometry(profile,32),cream);shell.castShadow=shell.receiveShadow=true;root.add(shell);
 const bezel=cylinder(root,0,.065,-.058,.052,.018,dark);bezel.rotation.x=Math.PI/2;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=localizedContext(canvas)!;c.fillStyle='#c9c6ad';c.fillRect(0,0,512,512);c.fillStyle='#303d34';c.strokeStyle='#303d34';c.lineWidth=4;c.textAlign='center';c.textBaseline='middle';c.font='39px sans-serif';
 for(let i=0;i<60;i++){const a=i/60*Math.PI*2-Math.PI/2,r=i%5?207:195;c.beginPath();c.moveTo(256+Math.cos(a)*r,256+Math.sin(a)*r);c.lineTo(256+Math.cos(a)*220,256+Math.sin(a)*220);c.stroke();if(i%10===0)c.fillText(String(i),256+Math.cos(a)*160,256+Math.sin(a)*160);}
 c.lineWidth=12;c.beginPath();c.moveTo(256,274);c.lineTo(256,106);c.stroke();const map=localizedTexture(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;
 const face=new T.Mesh(new T.CircleGeometry(.047,48),new T.MeshStandardMaterial({map,roughness:.63}));face.position.set(0,.065,-.0673);face.rotation.y=Math.PI;root.add(face);batch(root);return root;
}
