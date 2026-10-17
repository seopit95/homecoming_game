import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {boxUV,softBox,surface} from './materials.ts';
import {roundPipe} from './props.ts';
import {facilityModel} from './facility-models.ts';

// Local static assemblies share caller-owned finishes; the world disposes the result.
function assembly(name:string){
 const group=new T.Group();group.name=name;
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>{const mesh=new T.Mesh(boxUV(softBox(w,h,d,Math.min(.006,h/4)),x,y,z),m);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 const mesh=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number)=>{const part=new T.Mesh(g,m);part.position.set(x,y,z);group.add(part);return part;};
 const pipe=(a:[number,number,number],b:[number,number,number],r:number,m:T.Material)=>roundPipe(group,a,b,r,m);
 function finish(floor=true){
  group.userData.floorProp=floor;const parts=new Map<T.Material,T.BufferGeometry[]>();
  for(const object of [...group.children])if(object instanceof T.Mesh){object.updateMatrix();const g=object.geometry.clone().applyMatrix4(object.matrix),flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose();const material=object.material as T.Material;const list=parts.get(material)??[];list.push(flat);parts.set(material,list);object.geometry.dispose();group.remove(object);}
  for(const [material,geometries] of parts){const g=mergeGeometries(geometries)!;geometries.forEach(p=>p.dispose());const part=new T.Mesh(g,material);part.castShadow=part.receiveShadow=true;group.add(part);}return group;
 }
 return {group,box,mesh,pipe,finish};
}

export function portableRadio(){
 const a=assembly('annex-lure-radio'),enamel=surface('paintedMetal','#6f7566',{roughness:.69,metalness:.16}),edge=surface('steel','#9da69a',{roughness:.43,metalness:.68}),dark=new T.MeshStandardMaterial({color:'#181f1b',roughness:.88});
 for(const x of [-.126,.126])for(const z of [-.038,.038])a.box(x,.004,z,.026,.008,.024,dark);
 a.box(0,.115,0,.33,.214,.118,enamel);a.box(0,.115,.06,.318,.199,.006,dark);
 // Fine perforations and printed scale share a single front decal.
 const c=document.createElement('canvas');c.width=1024;c.height=640;const ctx=c.getContext('2d')!;ctx.fillStyle='#454f42';ctx.fillRect(0,0,1024,640);
 ctx.fillStyle='#131d16';for(let y=72;y<546;y+=14)for(let x=35;x<615;x+=14){ctx.beginPath();ctx.arc(x+(y%28?0:7),y,3,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#b5b79a';ctx.font='25px sans-serif';ctx.fillText('FM / AM',670,88);ctx.fillText('BATTERY',680,585);ctx.font='19px sans-serif';
 ctx.fillStyle='#303c30';ctx.fillRect(657,115,320,78);ctx.fillStyle='#c2c5a0';ctx.fillText('88  92  96  100  108',672,138);for(let i=0;i<33;i++)ctx.fillRect(672+i*9,151,1,i%4?14:25);ctx.fillStyle='#c68c58';ctx.fillRect(812,146,3,38);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const face=new T.Mesh(new T.PlaneGeometry(.31,.194),new T.MeshStandardMaterial({map,roughness:.82}));face.position.set(0,.115,.0632);a.group.add(face);
 for(const [x,y,r] of [[.108,.09,.023],[.108,.147,.014]]){const knob=a.mesh(new T.CylinderGeometry(r,r,.015,32),dark,x,y,.077);knob.rotation.x=Math.PI/2;const mark=a.box(x,y+r*.5,.086,.002,r*.5,.0015,edge);mark.rotation.z=-.4;}
 for(const x of [-.118,.118])a.box(x,.229,-.007,.021,.022,.034,dark);
 a.pipe([-.118,.24,-.007],[-.118,.27,-.007],.007,dark);a.pipe([.118,.24,-.007],[.118,.27,-.007],.007,dark);a.pipe([-.118,.27,-.007],[.118,.27,-.007],.008,dark);
 a.pipe([-.135,.216,-.035],[-.195,.48,-.035],.0022,edge);
 const body=a.finish(false),ledMaterial=new T.MeshStandardMaterial({color:'#283726',emissive:'#b2a35f',emissiveIntensity:0,roughness:.48});
 const led=new T.Mesh(new T.SphereGeometry(.0035,10,6),ledMaterial);led.name='radio-power-indicator';led.position.set(.147,.193,.066);body.add(led);
 return {root:body,setActive(active:boolean){ledMaterial.emissiveIntensity=active?1.6:0;}};
}

export function carSeatBag(){
 const leather=surface('bagLeather','#d5c8b7',{roughness:.76}),lining=surface('fabric','#292b29'),metal=surface('steel','#aeb6b2',{roughness:.28,metalness:.8}),thread=new T.MeshStandardMaterial({color:'#8b7960',roughness:1});
 const a=assembly('garage-seat-bag');a.box(0,.012,0,.30,.024,.25,leather);a.box(0,.026,0,.27,.006,.22,lining);
 a.box(-.143,.09,0,.016,.17,.25,leather);a.box(.143,.043,0,.016,.075,.25,leather);
 const lip=(x:number)=>.17-.065*T.MathUtils.smoothstep(x,-.04,.15)+.008*Math.cos(x*19);
 for(const z of [-.12,.12]){
  const g=softBox(.3,.16,.018,.006),p=g.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i),v=(p.getY(i)+.08)/.16;p.setY(i,.008+v*(lip(x)-.008));p.setZ(i,p.getZ(i)+Math.sin(x*25)*.004*v);}g.computeVertexNormals();a.mesh(boxUV(g,0,0,z),leather,0,0,z);
  const curve=new T.CatmullRomCurve3([new T.Vector3(-.105,lip(-.105),z),new T.Vector3(-.08,.28,z),new T.Vector3(.07,.28,z),new T.Vector3(.105,lip(.105),z)]);a.mesh(boxUV(new T.TubeGeometry(curve,20,.005,6,false)),leather,0,0,0);
  for(let i=0;i<22;i++){const x=-.13+i*.0124;a.box(x,lip(x)+.002,z,.003,.002,.009,metal);}
  const seam=Array.from({length:19},(_,i)=>{const x=-.133+i*.0148;return new T.Vector3(x,lip(x)-.012,z+Math.sign(z)*.011);});a.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(seam),22,.0008,4,false),thread,0,0,0);
 }
 const flap=a.box(.18,.068,0,.082,.012,.23,leather);flap.rotation.z=-.42;
 const bag=a.finish(false),key=new T.Group();key.name='garage-car-key';key.position.set(.035,.029,0);key.rotation.y=.38;bag.add(key);
 const keyHead=new T.Mesh(softBox(.025,.007,.031,.004),new T.MeshStandardMaterial({color:'#202522',roughness:.58}));keyHead.position.y=.0035;key.add(keyHead);
 const blade=new T.Mesh(new T.BoxGeometry(.009,.003,.045),metal);blade.position.set(0,.002,.034);key.add(blade);
 for(let i=0;i<4;i++){const tooth=new T.Mesh(new T.BoxGeometry(.004,.003,.004),metal);tooth.position.set(.005,.002,.022+i*.008);key.add(tooth);}
 const ring=new T.Mesh(new T.TorusGeometry(.012,.0015,6,24),metal);ring.rotation.x=-Math.PI/2;ring.position.set(0,.002,-.026);key.add(ring);
 return {bag,key};
}

export function facilityTable(w:number,d:number,wood:T.Material,metal:T.Material){
 if(w<=2.5){const group=new T.Group();group.name='grounded-worktable';group.userData.floorProp=true;group.rotation.y=Math.PI;const desk=facilityModel('metal_office_desk'),bounds=new T.Box3().setFromObject(desk,true),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());desk.scale.set(w/size.x,.82/size.y,d/size.z);desk.position.set(-center.x*desk.scale.x,-bounds.min.y*desk.scale.y,-center.z*desk.scale.z);group.add(desk);return group;}
 const a=assembly('grounded-worktable');a.box(0,.7975,0,w,.045,d,wood);
 for(const x of [-w/2+.075,w/2-.075])for(const z of [-d/2+.075,d/2-.075]){a.box(x,.391,z,.038,.758,.038,metal);a.box(x,.006,z,.05,.012,.05,metal);}
 for(const z of [-d/2+.065,d/2-.065])a.box(0,.742,z,w-.11,.065,.025,metal);
 for(const x of [-w/2+.065,w/2-.065]){a.box(x,.742,0,.025,.065,d-.11,metal);a.box(x,.19,0,.025,.025,d-.11,metal);}
 a.box(0,.19,-d/2+.065,w-.11,.025,.025,metal);a.box(0,.49,-d/2+.055,w-.17,.37,.018,wood);return a.finish();
}

export function cartridgeFuse(metal:T.Material){
 const group=new T.Group(),glass=new T.MeshPhysicalMaterial({color:'#d9e0d9',roughness:.14,transparent:true,opacity:.38,depthWrite:false});
 const tube=new T.Mesh(new T.CylinderGeometry(.0035,.0035,.026,16),glass);tube.rotation.z=Math.PI/2;group.add(tube);
 for(const x of [-.015,.015]){const cap=new T.Mesh(new T.CylinderGeometry(.0038,.0038,.006,16),metal);cap.rotation.z=Math.PI/2;cap.position.x=x;group.add(cap);}
 roundPipe(group,[-.012,0,0],[.012,0,0],.00025,metal);return group;
}

export function videoCassette(dark:T.Material,pale:T.Material,glass:T.Material){
 const a=assembly('vhs-original');a.box(0,.002,0,.188,.004,.104,dark);
 for(const x of [-.092,.092])a.box(x,.014,0,.004,.024,.104,dark);
 for(const z of [-.05,.05])a.box(0,.014,z,.18,.024,.004,dark);
 const top=new T.Shape();top.moveTo(-.094,-.052);top.lineTo(.094,-.052);top.lineTo(.094,.052);top.lineTo(-.094,.052);top.closePath();
 for(const x of [-.045,.045]){
  const opening=new T.Path();opening.absellipse(x,.006,.023,.018,0,Math.PI*2,true);top.holes.push(opening);
  const window=new T.CircleGeometry(.023,32);window.rotateX(-Math.PI/2);window.scale(1,1,.018/.023);a.mesh(window,glass,x,.0245,-.006);
  a.mesh(new T.CylinderGeometry(.019,.019,.004,32),dark,x,.0195,-.006);a.mesh(new T.CylinderGeometry(.014,.014,.003,24),pale,x,.022,-.006);a.mesh(new T.CylinderGeometry(.004,.004,.002,16),dark,x,.023,-.006);
 }
 const shell=new T.ExtrudeGeometry(top,{depth:.002,bevelEnabled:false,curveSegments:24});shell.rotateX(-Math.PI/2);a.mesh(shell,dark,0,.023,0);
 a.box(0,.0255,.029,.10,.001,.022,pale);for(const x of [-.08,.08])a.box(x,.0257,-.039,.009,.0014,.006,dark);
 return a.finish(false);
}
export function facilityChair(wood:T.Material,metal:T.Material){
 const a=assembly('grounded-desk-chair');
 for(const x of [-.21,.21])for(const z of [-.21,.21]){a.box(x,.22,z,.026,.44,.026,metal);a.box(x,.004,z,.034,.008,.034,metal);}
 a.box(0,.455,0,.48,.03,.48,wood);for(const x of [-.21,.21]){a.box(x,.64,-.21,.025,.42,.025,metal);a.box(x,.19,0,.018,.018,.42,metal);}a.box(0,.78,-.213,.47,.19,.025,wood);a.box(0,.19,-.21,.42,.018,.018,metal);return a.finish();
}
export function laundryMachine(enamel:T.Material,metal:T.Material,dark:T.Material,glass:T.Material){
 const a=assembly('grounded-laundry-machine');
 // The annular front and inset drum leave a real opening, not a glass disc over a box.
 a.box(0,.05,0,.8,.1,.74,dark);a.box(0,1.02,0,.88,.04,.84,enamel);a.box(0,.54,-.4,.86,.94,.04,enamel);
 for(const x of [-.42,.42])a.box(x,.54,0,.04,.94,.8,enamel);
 a.box(0,.885,.397,.8,.23,.046,enamel);a.box(0,.175,.397,.8,.15,.046,enamel);
 for(const x of [-.36,.36])a.box(x,.515,.397,.08,.53,.046,enamel);
 const ring=new T.RingGeometry(.30,.405,40);a.mesh(ring,enamel,0,.515,.422);a.mesh(new T.TorusGeometry(.297,.035,10,40),metal,0,.515,.443);
 const drum=new T.CylinderGeometry(.278,.278,.30,40,1,true);drum.rotateX(Math.PI/2);a.mesh(drum,metal,0,.515,.24);a.mesh(new T.CircleGeometry(.278,40),dark,0,.515,.085);a.mesh(new T.CircleGeometry(.26,40),glass,0,.515,.448);
 a.box(.29,.51,.473,.042,.13,.04,dark);a.box(-.29,.51,.446,.038,.15,.045,metal);a.box(-.15,.9,.427,.43,.09,.016,dark);
 const dial=new T.CylinderGeometry(.045,.045,.035,20);dial.rotateX(Math.PI/2);a.mesh(dial,metal,.26,.9,.443);
 for(let i=0;i<5;i++)a.box(-.08,.145+i*.014,.426,.53,.005,.01,dark);
 for(const x of [-.30,.30])a.box(x,.04,.29,.10,.08,.10,dark);
 a.pipe([.28,.75,-.42],[.28,.75,-.52],.022,metal);a.pipe([.28,.75,-.52],[.28,.12,-.52],.022,dark);a.pipe([.28,.12,-.52],[.4,.12,-.52],.022,dark);a.pipe([.4,.12,-.52],[.4,0,-.52],.028,metal);
 a.pipe([-.25,.9,-.42],[-.25,.9,-.52],.016,dark);a.pipe([-.25,.9,-.52],[-.25,.02,-.52],.016,dark);
 return a.finish();
}
export function dryingRail(metal:T.Material,cloth:T.Material,pale:T.Material){
 const a=assembly('ceiling-fixed-drying-rail');a.pipe([-3.1,2.15,0],[3.1,2.15,0],.022,metal);
 for(const x of [-2.8,2.8]){a.pipe([x,2.15,0],[x,2.79,0],.012,metal);a.box(x,2.79,0,.16,.02,.12,metal);}
 for(let i=0;i<5;i++){
  const x=-2+i*.85,m=i===2?pale:cloth;
  // Wire hooks enclose the rail; shoulder triangles physically meet the cloth top.
  const hook=new T.TorusGeometry(.034,.004,6,18,Math.PI*1.65);hook.rotateZ(-.5);a.mesh(hook,metal,x,2.15,0);
  a.pipe([x,2.12,0],[x,2.045,0],.004,metal);a.pipe([x,2.045,0],[x-.27,1.96,0],.004,metal);a.pipe([x,2.045,0],[x+.27,1.96,0],.004,metal);a.pipe([x-.27,1.96,0],[x+.27,1.96,0],.004,metal);
  const shape=new T.Shape();shape.moveTo(-.12,.40);shape.lineTo(-.29,.31);shape.lineTo(-.38,.06);shape.lineTo(-.27,0);shape.lineTo(-.23,.17);shape.lineTo(-.24,-.42);shape.lineTo(.24,-.42);shape.lineTo(.23,.17);shape.lineTo(.27,0);shape.lineTo(.38,.06);shape.lineTo(.29,.31);shape.lineTo(.12,.40);shape.lineTo(.08,.31);shape.lineTo(-.08,.31);shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1,steps:1});g.translate(0,0,-.009);const vertices=g.getAttribute('position');for(let j=0;j<vertices.count;j++){const y=vertices.getY(j),drape=T.MathUtils.clamp((.30-y)*2,0,1);vertices.setZ(j,vertices.getZ(j)+Math.sin(vertices.getX(j)*37+i)*.018*drape);vertices.setY(j,y-Math.max(0,-y)*(.05*(i%3)));}g.computeVertexNormals();a.mesh(g,m,x,1.62,0);
 }
 return a.finish(false);
}
export function waterTank(metal:T.Material,dark:T.Material,rust:T.Material){
 const a=assembly('grounded-water-tank');
 a.box(0,.055,0,2.65,.11,2.65,dark);
 for(const x of [-.85,.85])for(const z of [-.65,.65]){a.box(x,.17,z,.19,.23,.19,metal);a.box(x,.115,z,.28,.012,.28,metal);}
 a.mesh(new T.CylinderGeometry(1.28,1.28,1.92,40),metal,0,1.31,0);
 const cap=new T.SphereGeometry(1.28,40,16);cap.scale(1,.195,1);a.mesh(cap.clone(),metal,0,.35,0);a.mesh(cap,metal,0,2.27,0);
 for(const y of [.38,1.31,2.24]){const g=new T.TorusGeometry(1.285,.018,6,40);g.rotateX(Math.PI/2);a.mesh(g,rust,0,y,0);}
 a.mesh(new T.CylinderGeometry(.25,.25,.055,24),dark,0,2.525,0);a.mesh(new T.CylinderGeometry(.27,.27,.025,24),metal,0,2.565,0);
 a.pipe([0,2.57,0],[0,2.64,0],.10,rust);
 // Sight glass secured to the tank with upper/lower tees and guard rods.
 for(const y of [.65,1.95])a.pipe([-.38,y,1.21],[-.38,y,1.36],.025,metal);
 a.pipe([-.38,.65,1.36],[-.38,1.95,1.36],.018,dark);for(const x of [-.43,-.33])a.pipe([x,.64,1.36],[x,1.96,1.36],.006,metal);
 return a.finish();
}
export function pumpSkid(metal:T.Material,paint:T.Material,dark:T.Material,rust:T.Material){
 const a=assembly('grounded-pump-skid');a.box(0,.06,0,1.7,.12,1.1,dark);
 for(const x of [-.65,.65])a.box(x,.16,0,.14,.2,.84,metal);
 const motor=new T.CylinderGeometry(.24,.24,.72,24);motor.rotateZ(Math.PI/2);a.mesh(motor,paint,-.27,.45,0);
 for(let i=0;i<8;i++){const g=new T.TorusGeometry(.245,.008,6,24);g.rotateY(Math.PI/2);a.mesh(g,metal,-.59+i*.09,.45,0);}
 a.box(-.27,.17,0,.62,.10,.40,metal);a.box(-.27,.29,0,.62,.16,.36,paint);a.box(-.32,.70,0,.28,.12,.22,paint);
 const volute=new T.SphereGeometry(.30,24,16);volute.scale(.7,1,1);a.mesh(volute,paint,.4,.44,0);a.pipe([.06,.45,0],[.43,.45,0],.09,metal);
 a.pipe([.4,.44,.23],[.4,.44,.48],.085,rust);a.pipe([.4,.44,.48],[.4,0,.48],.085,rust);a.pipe([.4,.65,0],[.4,1,0],.075,rust);
 for(const y of [.73,.92])a.mesh(new T.CylinderGeometry(.12,.12,.035,20),metal,.4,y,0);
 a.box(-.32,.66,-.14,.08,.08,.06,dark);a.pipe([-.32,.66,-.17],[-.32,.13,-.5],.012,dark);
 return a.finish();
}
