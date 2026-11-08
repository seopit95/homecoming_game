import {localizedContext,localizedTexture} from './localized-canvas.ts';
import * as T from 'three';
import {boxUV,softBox,surface,sharePrintedTexture} from './materials.ts';
import {roundPipe} from './props.ts';
import {wetTexture} from './entry-props.ts';
import {batchStaticGeometry} from './static-geometry.ts';

function box(root:T.Group,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){
 const mesh=new T.Mesh(boxUV(softBox(w,h,d,Math.min(.007,w/4,h/4,d/4)),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;
}
function print(root:T.Group,text:string,x:number,y:number,z:number,w:number,h:number,bg='#c8c3ae',fg='#293630'){
 const c=document.createElement('canvas');c.width=768;c.height=Math.round(768*h/w);const ctx=localizedContext(c)!,lines=text.split('\n'),size=Math.min(c.height/(lines.length*1.6),690/Math.max(...lines.map(s=>[...s].length)));
 ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#786f5520';for(let i=0;i<350;i++)ctx.fillRect(i*179%c.width,i*137%c.height,1+i%3,1);
 ctx.fillStyle=fg;ctx.font=`${size}px "Apple SD Gothic Neo",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((line,i)=>ctx.fillText(line,384,c.height/2+(i-(lines.length-1)/2)*size*1.4));
 const map=sharePrintedTexture(localizedTexture(new T.CanvasTexture(c)),['common-gallery-v1',text,bg,fg]);map.colorSpace=T.SRGBColorSpace;
 const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.83}));mesh.position.set(x,y,z);root.add(mesh);return mesh;
}

// Door-local +Z is into the aisle. Every assembly meets the existing wall plane.
export function galleryPaint(){
 const material=surface('paintedMetal','#788174',{roughness:.72,metalness:.18,normalScale:new T.Vector2(.18,.18)});
 // Intact paint covers the photographed oxidised substrate. Wear is confined
 // to the leaf edges; an occupied building does not have bare rust on every door.
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vDoorPoint;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDoorPoint=position;');
  shader.fragmentShader='varying vec3 vDoorPoint;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment+'\nfloat edgeDistance=min(.47-abs(vDoorPoint.x),1.07-abs(vDoorPoint.y));float wornEdge=1.0-smoothstep(.0,.032,edgeDistance);diffuseColor.rgb=mix(diffuseColor.rgb,diffuse,.91-wornEdge*.67);');
 };
 material.customProgramCacheKey=()=> 'gallery-coated-steel-v1';return material;
}
export function galleryDoor(root:T.Group,x:number,z:number,number:string,paint:T.Material,steel:T.Material,dark:T.Material){
 const door=new T.Group();door.name='gallery-unit-'+number;door.userData.unitNumber=number;door.position.set(x,0,z);door.rotation.y=x>0?-Math.PI/2:Math.PI/2;root.add(door);
 box(door,0,1.095,.012,.94,2.14,.055,paint).name='gallery-door-leaf';
 for(const dx of [-.51,.51])box(door,dx,1.11,.036,.065,2.22,.085,steel);box(door,0,2.215,.036,1.085,.065,.085,steel);
 for(const dx of [-.473,.473])box(door,dx,1.09,.041,.008,2.13,.009,dark);box(door,0,2.159,.041,.94,.008,.009,dark);
 box(door,0,.009,.075,1.1,.018,.21,steel).name='gallery-door-threshold';
 for(const dx of [-.36,.36])box(door,dx,1.10,.043,.014,1.66,.007,steel);for(const y of [.27,1.93])box(door,0,y,.043,.73,.014,.007,steel);
 const eye=new T.Mesh(new T.CylinderGeometry(.012,.012,.008,20),steel);eye.rotation.x=Math.PI/2;eye.position.set(0,1.52,.048);eye.name='gallery-door-peephole';door.add(eye);
 const lens=new T.Mesh(new T.CircleGeometry(.0065,16),dark);lens.position.set(0,1.52,.0525);door.add(lens);
 for(const y of [.28,1.11,1.94])roundPipe(door,[-.478,y-.045,.047],[-.478,y+.045,.047],.011,steel);
 const lock=box(door,.31,1.045,.060,.095,.25,.035,dark);lock.name='gallery-door-lock';box(door,.31,1.10,.079,.077,.11,.005,steel);
 for(let row=0;row<4;row++)for(let col=0;col<3;col++)box(door,.287+col*.023,1.135-row*.022,.083,.012,.011,.004,dark);
 roundPipe(door,[.31,.996,.076],[.31,.996,.113],.009,steel);roundPipe(door,[.31,.996,.113],[.19,.996,.113],.010,steel);
 box(door,0,2.31,.022,.31,.11,.032,steel);print(door,number,0,2.31,.039,.27,.075,'#b2b6a2');
 box(door,.64,1.33,.018,.105,.19,.036,dark);print(door,'호출',.64,1.37,.037,.08,.045,'#b3b5a3');const button=new T.Mesh(new T.CylinderGeometry(.014,.014,.009,16),steel);button.rotation.x=Math.PI/2;button.position.set(.64,1.29,.041);door.add(button);
 // Local batched fittings retain the identifiable leaf, sill and input hardware.
 batchStaticGeometry(door,[]);return door;
}

export function dressCommonGallery(root:T.Group,area:'landing'|'corridor',bx:number,bz:number){
 const group=new T.Group();group.name='common-gallery-dressing';root.add(group);
 const steel=surface('steel','#899187',{roughness:.64,metalness:.48}),stone=surface('wornConcrete','#929383'),paint=surface('paintedMetal','#5d6b61'),dark=new T.MeshStandardMaterial({color:'#202825',roughness:.88});
 for(const side of area==='landing'?[1]:[-1,1]){
  const wallX=side*(bx-.091),trim=box(group,wallX,.055,0,.025,.11,bz*2-.22,stone);trim.receiveShadow=true;
  box(group,side*(bx-.102),2.49,0,.026,.075,bz*2-.3,paint);
  for(let z=-bz+2;z<bz;z+=5.5){box(group,side*(bx-.116),2.49,z,.03,.1,.085,steel);roundPipe(group,[side*(bx-.13),2.48,z],[side*(bx-.13),2.62,z],.008,steel);}
 }
 // Rust and damp follow real piers and pipe drops, leaving most plaster intact.
 for(const [x,z,yaw] of area==='landing'?[[bx-.091,2,-Math.PI/2],[bx-.091,-14,-Math.PI/2]]:[[-bx+.091,-8,Math.PI/2],[bx-.091,8,-Math.PI/2]]){
  const stain=new T.Mesh(new T.PlaneGeometry(.62,1.6),new T.MeshStandardMaterial({map:wetTexture(false,Math.round(z*31)),color:'#4c5040',transparent:true,opacity:.22,roughness:.9,depthWrite:false}));stain.position.set(x,1.64,z);stain.rotation.y=yaw;group.add(stain);
 }
 // The backing and retaining clips carry the paper; no floating UI in the room.
 const board=new T.Group();board.name=area==='landing'?'gallery-service-notice':'core-service-notice';board.position.set(area==='landing'?bx-.091:1.901,1.52,area==='landing'?-19.8:11.2);board.rotation.y=area==='landing'?-Math.PI/2:Math.PI/2;group.add(board);
 box(board,0,0,-.018,.55,.73,.036,paint);box(board,0,0,.001,.49,.67,.004,dark);
 const text=area==='landing'?'101동 · 시설 점검 안내\n\n17층 외벽 공사 중\n임시 관리실 1703호\n야간 당직 내선 17\n\n2803호  방문 / 부재\n비상벨 통화 확인 요청':'24층 · 설비 점검표\n\n승강기 반대편 비상계단\n17층 관리실 공사 중\n임시 관리실 1703호\n\n인접 세대 연결문\n야간 통행 후 잠금 확인';
 const notice=print(board,text,0,0,.004,.455,.63);notice.name=area==='landing'?'gallery-notice-paper':'core-notice-paper';for(const x of [-.18,.18])box(board,x,.302,.01,.035,.028,.016,steel);
 root.updateMatrixWorld(true);const point=notice.getWorldPosition(new T.Vector3()),approach=area==='landing'?{x:.15,z:-19.8}:{x:2.7,z:11.2};notice.userData.approach=approach;
 // A mounted extinguisher belongs against a wall, with its bracket and hose.
 const fire=new T.Group();fire.name='gallery-extinguisher';fire.position.set(area==='landing'?bx-.09:bx-.09,.7,area==='landing'?-9:1);fire.rotation.y=-Math.PI/2;group.add(fire);
 box(fire,0,0,.025,.12,.40,.05,dark);const red=new T.MeshStandardMaterial({color:'#7e342a',roughness:.65}),can=new T.Mesh(new T.CylinderGeometry(.063,.065,.34,24),red);can.position.set(0,-.035,.096);can.castShadow=can.receiveShadow=true;fire.add(can);const dome=new T.Mesh(new T.SphereGeometry(.063,24,12,0,Math.PI*2,0,Math.PI/2),red);dome.position.set(0,.135,.096);fire.add(dome);box(fire,0,.205,.095,.115,.025,.032,steel);roundPipe(fire,[.04,.18,.1],[.075,.08,.12],.008,dark);roundPipe(fire,[.075,.08,.12],[.067,-.15,.12],.008,dark);print(fire,'소화기',0,-.025,.162,.07,.11,'#bdb89f','#722d26');
 if(area==='landing')oppositeFacade(group);
 batchStaticGeometry(board,[notice]);batchStaticGeometry(fire,[]);batchStaticGeometry(group,[]);return {notice,point,approach};
}

function oppositeFacade(root:T.Group){
 const facade=new T.Group();facade.name='opposite-apartment-facade';root.add(facade);const wall=surface('decayWall','#9d9f91'),slab=surface('castConcrete','#8b9488'),frame=surface('steel','#606e69',{roughness:.74});
 box(facade,-15,-31,0,.3,80,52,wall).castShadow=false;
 for(let floor=-24;floor<=2;floor++){const y=floor*2.8;box(facade,-14.78,y-.1,0,.5,.16,52,slab).castShadow=false;}
 const dark=new T.MeshStandardMaterial({color:'#1b2c2c',roughness:.39,metalness:.2}),warm=new T.MeshStandardMaterial({color:'#797755',emissive:'#a79765',emissiveIntensity:.14,roughness:.59});
 const windows=new T.InstancedMesh(new T.BoxGeometry(.018,1.27,1.64),dark,270),lit=new T.InstancedMesh(new T.BoxGeometry(.018,1.27,1.64),warm,270),frames=new T.InstancedMesh(new T.BoxGeometry(1,1,1),frame,1080),compressors=new T.InstancedMesh(new T.BoxGeometry(1,1,1),slab,270),supports=new T.InstancedMesh(new T.BoxGeometry(1,1,1),frame,540),vents=new T.InstancedMesh(new T.BoxGeometry(1,1,1),dark,1620),matrix=new T.Matrix4();let a=0,b=0,n=0,units=0;
 for(let floor=-24;floor<=2;floor++)for(let column=0;column<10;column++){
  const y=floor*2.8+1.25,z=-22.5+column*5;matrix.makeTranslation(-14.838,y,z);if((floor*13+column*17)%19===0)lit.setMatrixAt(b++,matrix);else windows.setMatrixAt(a++,matrix);
  for(const side of [-1,1]){matrix.makeScale(.08,1.35,.045).setPosition(-14.80,y,z+side*.83);frames.setMatrixAt(n++,matrix);matrix.makeScale(.08,.045,1.69).setPosition(-14.80,y+side*.66,z);frames.setMatrixAt(n++,matrix);}
  if((floor*7+column*11)%4===0){
   matrix.makeScale(.5,.4,.7).setPosition(-14.60,floor*2.8+.44,z+1.3);compressors.setMatrixAt(units,matrix);
   for(const side of [-1,1]){matrix.makeScale(.52,.045,.04).setPosition(-14.60,floor*2.8+.2175,z+1.3+side*.28);supports.setMatrixAt(units*2+(side+1)/2,matrix);}
   for(let slot=0;slot<6;slot++){matrix.makeScale(.008,.013,.48).setPosition(-14.345,floor*2.8+.315+slot*.045,z+1.3);vents.setMatrixAt(units*6+slot,matrix);}units++;
  }
 }
 windows.count=a;lit.count=b;frames.count=n;compressors.count=units;supports.count=units*2;vents.count=units*6;facade.add(windows,lit,frames,compressors,supports,vents);batchStaticGeometry(facade,[]);
}
