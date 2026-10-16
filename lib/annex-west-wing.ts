import * as T from 'three';
import {surface,boxUV,softBox,upholstery} from './materials.ts';
import {roundPipe} from './props.ts';
import {laundryMachine,dryingRail} from './facility-props.ts';
import {batchStaticGeometry} from './static-geometry.ts';
import type {Solid} from './world.ts';

// The two original clue desks stay in place; the service aisle joins both rooms.
export function buildAnnexWestWing(root:T.Group,solids:Solid[]){
 const wing=new T.Group();wing.name='annex-west-wing';root.add(wing);
 const plaster=surface('decayWall','#b4b39f'),steel=surface('paintedMetal','#7a8177'),edge=surface('steel','#858d83',{roughness:.54,metalness:.55}),dark=new T.MeshStandardMaterial({color:'#202b29',roughness:.84}),pale=upholstery('#c1beb0');
 // Keep physical wear in the normal/roughness maps without turning every
 // enamel face into the source's heavily rusted exposed steel.
 steel.map?.dispose();steel.map=null;steel.metalnessMap=null;steel.metalness=.22;steel.normalScale.setScalar(.24);
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,parent:T.Group=wing,solid=false)=>{const p=new T.Mesh(boxUV(softBox(w,h,d,Math.min(.005,w/4,h/4,d/4)),x,y,z),m);p.position.set(x,y,z);p.castShadow=p.receiveShadow=true;parent.add(p);if(solid)solids.push({x,y,z,w,h,d});return p;};
 function sign(text:string,x:number,y:number,z:number,w:number,h:number,ry:number){const c=document.createElement('canvas');c.width=768;c.height=Math.round(768*h/w);const ctx=c.getContext('2d')!;ctx.fillStyle='#b9b59f';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#2b3a31';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${c.height*.55}px sans-serif`;ctx.fillText(text,384,c.height/2);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.9}));mesh.position.set(x,y,z);mesh.rotation.y=ry;wing.add(mesh);return mesh;}
 const partitions=new T.Group();partitions.name='annex-west-room-partitions';wing.add(partitions);
 box(-11.705,1.4,23.2,10.41,2.8,.14,plaster,partitions,true);
 for(const [a,b] of [[17,20],[21.4,23.2],[-9,-1.5],[1.5,8]])box(-6.5,1.4,(a+b)/2,.14,2.8,b-a,plaster,partitions,true);
 box(-6.5,2.58,20.7,.14,.44,1.4,plaster,partitions);box(-6.5,2.58,0,.14,.44,3,plaster,partitions);
 for(const [a,b] of [[17,20],[21.4,23.2],[-9,-1.5],[1.5,8]]){box(-6.421,.39,(a+b)/2,.018,.78,b-a,steel,partitions);box(-6.579,.39,(a+b)/2,.018,.78,b-a,steel,partitions);}
 for(const z of [20,21.4,-1.5,1.5])box(-6.5,1.18,z,.19,2.36,.045,edge,partitions);
 sign('우편실 · 반송 우편 접수',-6.4295,2.55,20.7,1.28,.18,Math.PI/2);sign('공동세탁실 · 정비대',-6.4295,2.55,0,2.25,.21,Math.PI/2);
 sign('← 우편 접수',-6.4295,1.55,17.8,1,.18,Math.PI/2);sign('← 세탁실 · 정비대',-6.4295,1.55,-5.5,1.4,.18,Math.PI/2);
 // Shallow real compartments: 28 floors × four homes, eight doors per row.
 const bank=new T.Group();bank.name='annex-mailbox-bank';bank.position.set(-11,0,22.99);wing.add(bank);
 solids.push({x:-11,y:1.05,z:22.99,w:3.02,h:2.1,d:.28});
 box(0,.31,0,3.02,.62,.28,steel,bank);box(0,1.36,.13,3.02,1.48,.02,steel,bank);box(0,.645,0,3.02,.05,.28,edge,bank);box(0,2.09,0,3.02,.02,.28,edge,bank);
 for(const x of [-1.5,1.5])box(x,1.36,0,.02,1.48,.28,edge,bank);
 const c=document.createElement('canvas');c.width=2048;c.height=1400;const ctx=c.getContext('2d')!,units:number[]=[];ctx.fillStyle='#c4c6b4';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='29px sans-serif';
 for(let row=0;row<14;row++)for(let col=0;col<8;col++){const x=(col-3.5)*.36,y=.72+row*.1,unit=(row*2+1+Math.floor(col/4))*100+col%4+1;units.push(unit);box(x,y,-.12,.345,.09,.014,steel,bank);box(x,y+.022,-.128,.24,.007,.003,dark,bank);box(x+.14,y-.015,-.13,.009,.013,.006,edge,bank);ctx.fillText(String(unit),(7-col+.5)*256,(13-row+.64)*100);}
 const addresses=new T.CanvasTexture(c);addresses.colorSpace=T.SRGBColorSpace;const sheet=new T.Mesh(new T.PlaneGeometry(2.88,1.4),new T.MeshStandardMaterial({map:addresses,alphaTest:.5,roughness:.9}));sheet.name='mailbox-addresses';sheet.userData.units=units;sheet.rotation.y=Math.PI;sheet.position.set(0,1.37,-.1275);bank.add(sheet);
 sign('백로아파트 · 101동 우편함',-11,2.22,23.1295,2.4,.16,Math.PI);
 // Utility backs give the machines real water/service connections and wet tile.
 const tile=[0,1,2].map(i=>surface('ceramic',['#9da99b','#a6afa0','#b0b6a5'][i],{roughness:.42})),grout=new T.MeshStandardMaterial({color:'#52635b',roughness:.95});
 for(const z of [-3.7,2.3]){box(-11.5,.63,z,7.2,1.26,.16,grout,wing,true);for(let row=0;row<4;row++)for(let col=0;col<24;col++)box(-14.95+col*.3,.17+row*.3,z+.0835,.294,.294,.007,tile[(row+col*7)%3]);box(-11.5,1.267,z,7.23,.014,.19,edge);}
 const enamel=surface('paintedMetal','#c4c4b4',{roughness:.66,metalness:.15}),glass=new T.MeshPhysicalMaterial({color:'#8e9f92',roughness:.16,transparent:true,opacity:.16,depthWrite:false}),cloth=pale.clone();cloth.side=T.DoubleSide;
 enamel.map?.dispose();enamel.map=null;enamel.metalnessMap=null;enamel.metalness=.12;enamel.normalScale.setScalar(.2);enamel.roughness=.5;
 let index=0;
 for(const x of [-13.7,-9.3])for(const z of [-3,3]){
  const m=laundryMachine(enamel,edge,dark,glass);m.name='annex-washer-'+index++;m.position.set(x,0,z);wing.add(m);solids.push({x,z:z-.05,w:.9,d:1.02,y:.52,h:1.04});
  const g=new T.SphereGeometry(1,40,24),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)*.225,py=p.getY(i),z=.265+p.getZ(i)*.115,fold=.16+.022*Math.sin(x*66+z*23)+.012*Math.cos(z*91-x*15);p.setXYZ(i,x,.515-Math.sqrt(.278*.278-x*x)+.002+fold*(py+1)/2,z);}g.computeVertexNormals();const laundry=new T.Mesh(g,cloth);laundry.name='laundry-in-drum';laundry.castShadow=laundry.receiveShadow=true;m.add(laundry);
  const marks=new T.Group();marks.name='inside-glass-scratches';m.add(marks);const scratch=new T.MeshStandardMaterial({color:'#8c9b8e',roughness:.86});for(let i=0;i<4;i++){const points=[new T.Vector3(-.1+i*.028,.42,.4475),new T.Vector3(-.08+i*.025,.48,.4475),new T.Vector3(-.055+i*.025,.555+i*.006,.4475)];const line=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),10,.00065,3,false),scratch);marks.add(line);}
  // Drain collar and rising supply connect the existing hoses to the building.
  const collar=new T.Mesh(new T.TorusGeometry(.031,.005,6,20),edge);collar.rotation.x=Math.PI/2;collar.position.set(x+.4,.006,z-.52);wing.add(collar);
  roundPipe(wing,[x-.25,0,z-.6],[x-.25,.92,z-.6],.015,edge);roundPipe(wing,[x-.25,.9,z-.6],[x-.25,.9,z-.52],.015,edge);box(x-.25,.88,z-.6,.075,.015,.06,dark);
 }
 const rail=dryingRail(edge,upholstery('#727b6e'),pale);rail.position.set(-11,0,-6);wing.add(rail);for(let i=0;i<5;i++)solids.push({x:-13+i*.85,z:-6,w:.78,d:.065,y:1.60,h:.94});
 // A fixed service legend meets the tiled backing above the machines.
 sign('급수 밸브 · 사용 후 잠금',-11.5,1.08,-3.6125,1.2,.16,0);
 batchStaticGeometry(bank,[sheet]);batchStaticGeometry(partitions,[]);batchStaticGeometry(wing,[]);
 return wing;
}
