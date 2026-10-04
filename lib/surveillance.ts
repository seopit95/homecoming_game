import * as T from 'three';
import {createSedan} from './sedan.ts';
import {createPedestrian} from './pedestrian.ts';
import {extremity} from './ghost-anatomy.ts';
import {surface,boxUV} from './materials.ts';
import {disposeWorld} from './world.ts';
import type {Stage} from './story.ts';

// The small monitor has its own 10 fps recording, then switches to the real room.
export function createSurveillance(){
  const root=new T.Group();root.name='surveillance-screen';
  const target=new T.WebGLRenderTarget(640,480),recording=new T.Scene();recording.name='surveillance-recording';
  recording.background=new T.Color('#11191a');recording.fog=new T.FogExp2('#172021',.023);
  recording.add(new T.HemisphereLight('#c5dbd7','#26312d',1.2));
  const key=new T.DirectionalLight('#bed0ce',2.4);key.position.set(2,8,5);recording.add(key);
  const fill=new T.PointLight('#b5c4ae',15,30,2);fill.position.set(-2,4,-2);recording.add(fill);
  const camera=new T.PerspectiveCamera(49,4/3,.1,60),liveCamera=new T.PerspectiveCamera(50,4/3,.1,65);
  liveCamera.position.set(14.48,2.52,-28.95);liveCamera.lookAt(2.5,1.1,-25.5);
  const road=new T.Group(),garage=new T.Group();recording.add(road,garage);
  const concrete=surface('concrete','#777e75'),asphalt=surface('concrete','#525e5b',{roughness:.66});
  const white=new T.MeshStandardMaterial({color:'#c2c2a9',roughness:.84}),dark=new T.MeshStandardMaterial({color:'#333e3c',roughness:.85});
  function box(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,material:T.Material){const mesh=new T.Mesh(boxUV(new T.BoxGeometry(w,h,d),x,y,z),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
  box(road,0,-.06,-3,8,.12,35,asphalt);
  for(const side of [-1,1]){
    box(road,side*5,.08,-3,2,.16,35,concrete);box(road,side*4.02,.08,-3,.12,.16,35,white);
    for(let z=-14;z<9;z+=2.4){box(road,side*5.5,.65,z,.045,1.3,.045,dark);box(road,side*5.5,1.28,z,.045,.04,2.4,dark);}
  }
  for(let z=-1.9;z<2;z+=.7)box(road,0,.004,z,7.6,.008,.35,white);
  box(road,-3.9,1.4,2.6,.065,2.8,.065,dark);box(road,-3.9,2.55,2.6,.26,.46,.18,dark);
  const signal=new T.Mesh(new T.CircleGeometry(.065,16),new T.MeshBasicMaterial({color:'#70bd82'}));signal.position.set(-3.9,2.49,2.698);road.add(signal);
  box(garage,0,-.06,-3,11,.12,23,concrete);box(garage,0,2.77,-3,11,.16,23,concrete);
  box(garage,-5.4,1.35,-3,.15,2.7,23,concrete);box(garage,0,1.35,-14,11,2.7,.15,concrete);
  for(const x of [-4.5,3.5])for(const z of [-9,-1,7]){box(garage,x,1.35,z,.42,2.7,.42,concrete);box(garage,x,.5,z,.425,.4,.425,dark);}
  for(const x of [-2.3,2.3])box(garage,x,.006,-.7,.075,.012,6,white);
  for(const z of [-9,-1,7]){box(garage,0,2.62,z,1.1,.06,.14,dark);box(garage,0,2.582,z,.9,.013,.08,white);}
  const car=createSedan('#242f31',true);car.name='cctv-car';recording.add(car);
  const brake=(car.children as T.Mesh[]).map(mesh=>mesh.material as T.MeshPhysicalMaterial).find(material=>material.name==='sedan-tail-lamps')!;
  brake.emissive.set('#d53522');brake.emissiveIntensity=0;
  const victim=createPedestrian(road);victim.root.position.set(2.25,-.65,1);victim.root.rotation.y=Math.PI/2;victim.pose(0,2);
  victim.root.updateMatrixWorld(true);const floor=new T.Box3().setFromObject(victim.root,true);victim.root.position.y-=floor.min.y-.012;
  const hand=extremity('hand',1,new T.MeshStandardMaterial({color:'#c3c6b7',roughness:.76}),false);hand.name='cctv-passenger-hand';hand.rotation.set(0,Math.PI/2,Math.PI);hand.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),Math.atan(.149/.48)));hand.position.set(.80,1.04,.20);hand.updateMatrix();hand.geometry.applyMatrix4(hand.matrix);
  // Move the intact hand behind the sloped pane; do not flatten anatomical surfaces.
  const palm=hand.geometry.getAttribute('position');let protrusion=-Infinity;for(let i=0;i<palm.count;i++)protrusion=Math.max(protrusion,palm.getX(i)-(.814-(palm.getY(i)-.923)*(.149/.48)));
  hand.geometry.translate(-protrusion-.008,0,0);hand.position.set(0,0,0);hand.rotation.set(0,0,0);car.add(hand);
  const image=new T.Mesh(new T.PlaneGeometry(.72,.54),new T.MeshBasicMaterial({map:target.texture,color:'#a2b3a8'}));root.add(image);
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d')!;
  const overlayMap=new T.CanvasTexture(canvas);overlayMap.colorSpace=T.SRGBColorSpace;
  const overlay=new T.Mesh(new T.PlaneGeometry(.72,.54),new T.MeshBasicMaterial({map:overlayMap,transparent:true,toneMapped:false,depthWrite:false}));overlay.position.z=.0006;root.add(overlay);
  let mode='idle',lastKey='',pending=true,clock=0,disposed=false;
  function update(stage:Stage,time:number,text:string){
    const warning=stage==='archive_escape'||stage==='archive_departure',active=stage==='archive_playback'||warning;clock=Math.max(warning?27:0,time);
    mode=!active?'idle':clock<5?'road':clock<12?'call':clock<21?'gate':'live';
    image.visible=active&&mode!=='call';
    const frame=Math.floor(clock*10),next=`${mode}:${active?frame:text}`;if(next===lastKey)return;lastKey=next;pending=true;
    road.visible=mode==='road'||mode==='idle';garage.visible=mode==='gate';car.visible=mode==='road'||mode==='gate'||mode==='idle';hand.visible=mode==='gate'&&clock>=14;
    if(mode==='gate'){
      car.position.set(0,0,-2+1.6*T.MathUtils.smoothstep(clock-12,0,2));camera.position.set(3.5,2.2,3.5);camera.lookAt(0,.95,.1);brake.emissiveIntensity=.8;
    }else{car.position.set(0,0,-3+2.1*T.MathUtils.smoothstep(clock,0,2));camera.position.set(6,4.7,-8);camera.lookAt(0,.45,0);brake.emissiveIntensity=clock>.75?.8:0;}
    ctx.globalCompositeOperation='copy';ctx.fillStyle=image.visible?'rgba(0,0,0,0)':'#0b1512';ctx.fillRect(0,0,640,480);ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='rgba(4,14,10,.72)';ctx.fillRect(0,0,640,48);ctx.fillRect(0,398,640,82);
    ctx.fillStyle='#c0d2bd';ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='21px monospace';
    const timecode=mode==='road'?`03:17:${String(12+Math.floor(clock)).padStart(2,'0')}`:mode==='call'?`03:20:${String(Math.floor(clock-5)).padStart(2,'0')}`:mode==='gate'?`03:26:${String(Math.floor(clock-12)).padStart(2,'0')}`:'03:17:00';
    ctx.fillText(mode==='live'?`LIVE  CAM-08  편집실  ${timecode}`:mode==='idle'?'BAEKRO / 기록 복원 장치':`원본  ${mode==='road'?'CAM-01':mode==='gate'?'CAM-04':'AUDIO-17'}  ${timecode}`,20,25);
    if(mode==='call'){
      ctx.font='26px sans-serif';ctx.fillText('정문 비상벨 → 2803 등록 휴대전화',36,132);
      for(let i=0;i<116;i++){const x=32+i*5,level=clock<10.8?(9+Math.abs(Math.sin(i*1.31+frame*.7)*Math.sin(i*.19-frame*.12))*54):2;ctx.fillRect(x,240-level,2,level*2);}
      ctx.font='23px sans-serif';ctx.fillText(clock<10.8?'양방향 통화 원본 / 재생 중':'수신자 통화 종료',36,337);
    }
    ctx.font='24px sans-serif';ctx.textAlign='center';
    const caption=mode==='idle'?text:mode==='road'?'사고 직후 · 뒤늦게 켜지는 제동등':mode==='call'?'「잘못 거셨어요.」':mode==='gate'?`복원 구간 ${Math.min(9,Math.floor(clock-12)+1)} / 9초 · 동시 녹음` :clock<27?'현재 영상 · 기록 작성 중':'네 뒤에 있어';
    const lines=caption.split('\n');lines.forEach((line,i)=>ctx.fillText(line,320,(mode==='idle'?220:425)+i*29));
    ctx.fillStyle='rgba(0,8,4,.14)';for(let y=51;y<398;y+=4)ctx.fillRect(0,y,640,1);
    overlayMap.needsUpdate=true;
  }
  function render(renderer:T.WebGLRenderer,liveScene:T.Scene,force=false){
    if(disposed||!force&&(!pending||!image.visible))return;
    const previous=renderer.getRenderTarget(),shadows=renderer.shadowMap.autoUpdate,visible=root.visible;
    recording.environment=liveScene.environment;recording.environmentIntensity=.3;root.visible=false;renderer.shadowMap.autoUpdate=false;
    try{renderer.setRenderTarget(target);renderer.render(mode==='live'?liveScene:recording,mode==='live'?liveCamera:camera);pending=false;}
    finally{renderer.setRenderTarget(previous);renderer.shadowMap.autoUpdate=shadows;root.visible=visible;}
  }
  const feed:Surveillance={update,render,async prepare(renderer:T.WebGLRenderer,liveScene:T.Scene){
    const a=road.visible,b=garage.visible,c=car.visible,h=hand.visible,saved=mode;
    road.visible=garage.visible=car.visible=hand.visible=true;recording.environment=liveScene.environment;
    try{await renderer.compileAsync?.(recording,camera);render(renderer,liveScene,true);mode='live';await renderer.compileAsync?.(liveScene,liveCamera);render(renderer,liveScene,true);}
    finally{road.visible=a;garage.visible=b;car.visible=c;hand.visible=h;mode=saved;pending=true;}
  },dispose(){if(disposed)return;disposed=true;target.dispose();disposeWorld(recording);}};
  root.userData.surveillance=feed;update('archive_reveal',0,'복원 대기\n원본 기록 3개가 필요합니다');return root;
}
export type Surveillance={update:(stage:Stage,time:number,text:string)=>void;render:(renderer:T.WebGLRenderer,scene:T.Scene,force?:boolean)=>void;prepare:(renderer:T.WebGLRenderer,scene:T.Scene)=>Promise<void>;dispose:()=>void};
