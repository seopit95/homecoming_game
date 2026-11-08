import {localizedContext,localizedTexture} from './localized-canvas.ts';
import * as T from 'three';
import {boxUV,sharePrintedTexture,surface} from './materials.ts';
import {batchStaticGeometry} from './static-geometry.ts';

// The opening and the escape use one neighbourhood. All dressing stays outside
// the existing carriageway; the cinematic paths keep their accepted coordinates.
export function buildRoadStreet(parent:T.Group,ending:boolean){
 const root=new T.Group();root.name='road-neighbourhood';parent.add(root);
 const plaster=['#c6c1ad','#aaa897','#b1aaa0','#9eada7'].map(c=>surface('wall',c));
 const concrete=surface('wornConcrete','#adb2aa'),paving=surface('paving','#b2b5ab',{roughness:.67});
 const metal=surface('paintedMetal','#88948d',{roughness:.75}),dark=new T.MeshStandardMaterial({color:'#192126',roughness:.92});
 const glass=new T.MeshPhysicalMaterial({color:'#25353c',roughness:.28,metalness:.22});
 const lit=new T.MeshStandardMaterial({color:'#b2ab91',emissive:'#b6a272',emissiveIntensity:.34,roughness:.8});
 const rusty=surface('paintedMetal','#6a5749'),trim=surface('concrete','#717b79');
 const mesh=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number,owner:T.Group=root)=>{
  const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;owner.add(o);return o;
 };
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,owner:T.Group=root)=>mesh(boxUV(new T.BoxGeometry(w,h,d),x,y,z),m,x,y,z,owner);
 const pipe=(a:T.Vector3,b:T.Vector3,r:number,m:T.Material,owner:T.Group=root)=>{
  const o=mesh(new T.CylinderGeometry(r,r,a.distanceTo(b),8),m,...a.clone().add(b).multiplyScalar(.5).toArray() as [number,number,number],owner);
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return o;
 };
 const signMaterials=new Map<string,T.MeshStandardMaterial>();
 function sign(text:string,w:number,h:number,x:number,y:number,z:number,side=0,bg='#343e3a',ink='#bfbba8',owner:T.Group=root){
  const key=JSON.stringify([text,bg,ink]);let material=signMaterials.get(key);
  if(!material){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=localizedContext(c)!;ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=ink;ctx.font='46px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,67);
  const map=sharePrintedTexture(localizedTexture(new T.CanvasTexture(c)),['street-v95',text,bg,ink]);map.colorSpace=T.SRGBColorSpace;
  material=new T.MeshStandardMaterial({map,roughness:.85});signMaterials.set(key,material);}
  const p=mesh(new T.PlaneGeometry(w,h),material,x,y,z,owner);p.rotation.y=-side*Math.PI/2;p.castShadow=false;
 }
 // Paving meets the existing raised kerb. Grating is inset into the gutter,
 // rather than represented by a black slab hovering above the traffic lane.
 for(const side of [-1,1]){
  box(side*17.925,-.025,ending?-6.5:18,24.15,.05,ending?311:360,concrete);
  box(side*5.21,.115,ending?-6.5:18,1.26,.03,ending?311:360,paving);
  for(let z=-138;z<(ending?145:188);z+=18){
   box(side*4.36,.0005,z,.27,.001,1.05,dark);
   for(let i=0;i<9;i++)box(side*4.36,.002,z-.48+i*.12,.27,.003,.025,metal);
  }
 }
 const shopNames=['한빛 세탁소','부동산 · 상가','백로 전기철물','동네 슈퍼','수선 · 열쇠'];
 let index=0;
 for(let z=-135;z<(ending?119:188);z+=18)for(const side of [-1,1]){
  const n=index++;
  if(side===1&&z>=-63&&z<=-9)continue; // The apartment forecourt occupies this plot.
  const floors=2+n%3,height=floors*2.9,wall=plaster[n%plaster.length];
  box(side*9.15,height/2,z,5.5,height,14,wall); // Back wall, recessed behind all openings.
  box(side*6.05,.07,z,.5,.14,14,concrete);
  for(let floor=1;floor<floors;floor++){
   const base=floor*2.9;
   box(side*6.05,base+.52,z,.3,1.04,14,wall);box(side*6.05,base+2.55,z,.3,.7,14,wall);
   for(const [offset,length] of [[-6.3,1.4],[-2.25,2.3],[2.25,2.3],[6.3,1.4]])box(side*6.05,base+1.62,z+offset,.3,1.16,length,wall);
   for(let bay=0;bay<3;bay++){
    const zz=z-4.5+bay*4.5,yy=base+1.62;
    box(side*6.24,yy,zz,.055,1.16,2.2,(n+floor*3+bay)%7===0?lit:glass);
    for(const edge of [-1.1,0,1.1])box(side*6.19,yy,zz+edge,.05,1.2,.035,metal);
    for(const edge of [-.6,.6])box(side*6.18,yy+edge,zz,.07,.04,2.25,metal);
    box(side*5.99,yy-.65,zz,.45,.07,2.38,concrete);
   }
  }
  // Ground-floor openings have a supported threshold, jambs and lintel. Upper
  // windows are recessed into real gaps in the street-facing wall panels.
  for(const offset of [-6.86,-2.3,2.3,6.86])box(side*6.02,1.45,z+offset,.38,2.9,.28,concrete);
  box(side*6.02,2.77,z,.38,.26,14,concrete);
  for(let bay=0;bay<3;bay++){
   const zz=z-4.6+bay*4.6,closed=(n+bay)%3!==0;
   box(side*6.21,1.35,zz,.08,2.4,4.15,closed?metal:glass);
   if(closed)for(let rib=0;rib<15;rib++)box(side*6.14,.21+rib*.16,zz,.035,.023,4.1,trim);
   else{
    for(const edge of [-2.02,0,2.02])box(side*6.12,1.35,zz+edge,.065,2.44,.045,metal);
    box(side*6.1,.15,zz,.08,.06,4.15,metal);box(side*6.08,1.42,zz+.12,.12,.26,.026,metal);
   }
   sign(shopNames[(n*3+bay)%shopNames.length],3.95,.32,side*5.817,2.72,zz,side,n%2?'#33423e':'#4a4037');
  }
  if(n%2===0){const awning=box(side*5.58,2.46,z,.86,.065,4.12,metal);awning.rotation.z=side*.1;}
  box(side*9.15,height+.075,z,5.72,.15,14.2,concrete);
  for(const offset of [-6.9,6.9])box(side*9.15,height+.31,z+offset,5.7,.48,.15,wall);
  const downpipe=side*5.78;
  pipe(new T.Vector3(downpipe,.14,z+6.62),new T.Vector3(downpipe,height+.3,z+6.62),.035,rusty);
  for(const y of [1.1,height-.5])box(side*5.85,y,z+6.62,.12,.045,.16,metal);
  // Electricity meters are bracketed to the facade, with conduits into the wall.
  box(side*5.79,1.5,z+2.63,.2,.48,.34,metal);box(side*5.68,1.57,z+2.63,.012,.13,.2,glass);
  pipe(new T.Vector3(side*5.8,.42,z+2.63),new T.Vector3(side*5.8,1.27,z+2.63),.014,metal);
 }
 // Old low-rise frontage gives way to the actual high-rise estate in the story.
 const tower=new T.Group();tower.name='road-apartment';root.add(tower);
 const front=10,cz=-51,height=81.6,wall=plaster[0];
 box(18,.9,cz,16,1.8,36,concrete,tower);box(18.21,height/2,cz,15.58,height,36,wall,tower);
 for(let gap=0;gap<=9;gap++){
  const a=gap===0?-18:-14.4+(gap-1)*3.6+1.1,b=gap===9?18:-14.4+gap*3.6-1.1;
  box(front+.15,41.7,cz+(a+b)/2,.3,79.8,b-a,wall,tower);
 }
 for(let floor=0;floor<28;floor++){
  const base=1.8+floor*2.85;
  box(front+.15,base+.4,cz,.3,.8,36,wall,tower);box(front+.15,base+2.45,cz,.3,.8,36,wall,tower);
  for(let bay=0;bay<9;bay++){
   const z=cz-14.4+bay*3.6,y=base+1.425;
   box(front+.37,y,z,.04,1.25,2.2,(floor*13+bay*7)%19===0?lit:glass,tower);
   for(const edge of [-1.1,0,1.1])box(front+.31,y,z+edge,.045,1.28,.032,metal,tower);
   box(front+.08,base+.76,z,.46,.08,2.32,concrete,tower);
  }
 }
 box(18,81.68,cz,16.35,.16,36.35,concrete,tower);box(18,82.4,cz+14,6,1.28,5,wall,tower);
 sign('101',3.5,1.25,9.994,9,cz,1,'#8b8b7f','#424e4c',tower);
 sign('백로 101',5.5,1.4,18,12,-32.994,0,'#8b8b7f','#424e4c',tower);
 box(7.85,.06,-37,4.3,.14,70,paving); // Forecourt meets the sidewalk at 13cm.
 for(const z of [-72,-2]){box(7.85,.65,z,4.3,1.3,.35,concrete);box(7.85,1.34,z,4.45,.08,.46,trim);}
 box(6.32,1.35,-29.2,.65,2.7,.65,concrete);sign('백로아파트',1.92,.4,6.3,2.37,-28.868);sign('101동',1.92,.3,6.3,1.87,-28.868);
 // A narrow estate service gate and repair notice make the final road closure
 // belong to this location, rather than an unexplained box in a featureless road.
 sign('외벽 보수 공사',2.2,.4,7.85,1.05,-29.815);
 for(let z=-135;z<(ending?118:188);z+=36){
  pipe(new T.Vector3(-5.32,.13,z),new T.Vector3(-5.32,7,z),.09,concrete);
  pipe(new T.Vector3(-5.72,6.5,z),new T.Vector3(-4.92,6.5,z),.035,metal);
  if(z+36<(ending?118:188))for(const offset of [-.17,.17]){
   const curve=new T.CatmullRomCurve3([new T.Vector3(-5.32+offset,6.55,z),new T.Vector3(-5.32+offset,5.85,z+18),new T.Vector3(-5.32+offset,6.55,z+36)]);
   mesh(new T.TubeGeometry(curve,16,.009,4,false),dark,0,0,0);
  }
 }
 batchStaticGeometry(tower,[]);return root;
}
