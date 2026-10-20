import * as T from 'three';
import {crtScreenGeometry} from './crt-monitor.ts';
import {createSedan} from './sedan.ts';
import {createPedestrian} from './pedestrian.ts';
import {extremity} from './ghost-anatomy.ts';
import {surface,boxUV} from './materials.ts';
import {disposeWorld} from './world.ts';
import {officeReplayDuration,type Stage} from './story.ts';
import {archiveCamera,archiveClips,archiveReviewing,type ArchiveFrame} from './archive-review.ts';
import {createObservedPlayer,type ObservedPlayer} from './observed-player.ts';

// The small monitor has its own 10 fps recording, then switches to the real room.
export function createSurveillance(kind:'archive'|'office'='archive'){
  const root=new T.Group();root.name='surveillance-screen';
  const target=new T.WebGLRenderTarget(640,480),recording=new T.Scene();recording.name='surveillance-recording';
  const observed=kind==='archive'?createObservedPlayer():undefined;
  if(observed){observed.resources.visible=false;recording.add(observed.resources);}
  recording.background=new T.Color('#11191a');recording.fog=new T.FogExp2('#172021',.023);
  recording.add(new T.HemisphereLight('#c5dbd7','#26312d',1.2));
  const key=new T.DirectionalLight('#bed0ce',2.4);key.position.set(2,8,5);recording.add(key);
  const fill=new T.PointLight('#b5c4ae',15,30,2);fill.position.set(-2,4,-2);recording.add(fill);
  const camera=new T.PerspectiveCamera(49,4/3,.1,60),liveCamera=new T.PerspectiveCamera(50,4/3,.1,65);
  liveCamera.position.set(...archiveCamera.position);
  liveCamera.position.addScaledVector(new T.Vector3(...archiveCamera.lookAt).sub(liveCamera.position).normalize(),.19);liveCamera.lookAt(...archiveCamera.lookAt);
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
  box(road,-3.9,1.4,2.6,.065,2.8,.065,dark);box(road,-3.9,2.55,2.6,.30,.60,.18,dark);
  const lampCanvas=document.createElement('canvas');lampCanvas.width=lampCanvas.height=128;const lampInk=lampCanvas.getContext('2d')!;lampInk.fillStyle='#131b17';lampInk.fillRect(0,0,128,128);lampInk.fillStyle='#83d994';for(const [x,y,w,h] of [[56,15,15,15],[53,35,20,33],[37,44,21,10],[70,42,21,10],[28,49,15,10],[86,33,10,16],[47,66,13,22],[35,84,18,13],[29,95,14,10],[65,66,13,22],[74,84,13,21],[84,99,12,9]])lampInk.fillRect(x,y,w,h);const lampMap=new T.CanvasTexture(lampCanvas);lampMap.colorSpace=T.SRGBColorSpace;
  const signal=new T.Mesh(new T.PlaneGeometry(.24,.24),new T.MeshBasicMaterial({map:lampMap,toneMapped:false}));signal.name='cctv-walk-signal';signal.position.set(-3.9,2.42,2.698);road.add(signal);
  const stopped=new T.Mesh(new T.CircleGeometry(.10,24),new T.MeshStandardMaterial({color:'#252c25',roughness:.8}));stopped.position.set(-3.9,2.70,2.698);road.add(stopped);
  box(garage,0,-.06,-3,11,.12,23,concrete);box(garage,0,2.77,-3,11,.16,23,concrete);
  box(garage,-5.4,1.35,-3,.15,2.7,23,concrete);box(garage,0,1.35,-14,11,2.7,.15,concrete);
  for(const x of [-4.5,3.5])for(const z of [-9,-1,7]){box(garage,x,1.35,z,.42,2.7,.42,concrete);box(garage,x,.5,z,.425,.4,.425,dark);}
  for(const x of [-2.3,2.3])box(garage,x,.006,-.7,.075,.012,6,white);
  for(const z of [-9,-1,7]){box(garage,0,2.62,z,1.1,.06,.14,dark);box(garage,0,2.582,z,.9,.013,.08,white);}
  const car=createSedan('#242f31',true);car.name='cctv-car';recording.add(car);
  const intactCar=createSedan('#242f31');intactCar.name='cctv-intact-car';recording.add(intactCar);
  const intactBrake=(intactCar.children as T.Mesh[]).map(mesh=>mesh.material as T.MeshPhysicalMaterial).find(material=>material.name==='sedan-tail-lamps')!;intactBrake.emissive.set('#d53522');
  const brake=(car.children as T.Mesh[]).map(mesh=>mesh.material as T.MeshPhysicalMaterial).find(material=>material.name==='sedan-tail-lamps')!;
  brake.emissive.set('#d53522');brake.emissiveIntensity=0;
  const driver=createPedestrian(garage,'driver');driver.root.name='cctv-driver';driver.root.visible=false;
  const survivor=createPedestrian(garage);survivor.root.name='cctv-surviving-victim';survivor.root.visible=false;
  const feet=[driver.root.getObjectByName('memory-shoe')!,driver.root.getObjectByName('memory-other-shoe')!],footBox=new T.Box3();
  const victim=createPedestrian(road);victim.root.position.set(2.25,-.65,1);victim.root.rotation.y=Math.PI/2;victim.pose(0,2);
  victim.root.updateMatrixWorld(true);const floor=new T.Box3().setFromObject(victim.root,true);victim.root.position.y-=floor.min.y-.012;
  const hand=extremity('hand',1,new T.MeshStandardMaterial({color:'#c3c6b7',roughness:.76}),false);hand.name='cctv-passenger-hand';hand.rotation.set(0,Math.PI/2,Math.PI);hand.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),Math.atan(.149/.48)));hand.position.set(.80,1.04,.20);hand.updateMatrix();hand.geometry.applyMatrix4(hand.matrix);
  // The earlier edited copy retains only a hand behind the passenger pane.
  const palm=hand.geometry.getAttribute('position');let protrusion=-Infinity;for(let i=0;i<palm.count;i++)protrusion=Math.max(protrusion,palm.getX(i)-(.814-(palm.getY(i)-.923)*(.149/.48)));
  hand.geometry.translate(-protrusion-.008,0,0);hand.position.set(0,0,0);hand.rotation.set(0,0,0);car.add(hand);
  const image=new T.Mesh(crtScreenGeometry(.72,.54),new T.MeshBasicMaterial({map:target.texture,color:'#a2b3a8'}));root.add(image);
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d')!;
  const overlayMap=new T.CanvasTexture(canvas);overlayMap.colorSpace=T.SRGBColorSpace;
  const overlay=new T.Mesh(crtScreenGeometry(.72,.54),new T.MeshBasicMaterial({map:overlayMap,transparent:true,toneMapped:false,depthWrite:false}));overlay.position.z=.0006;root.add(overlay);
  let mode='idle',lastKey='',pending=true,clock=0,disposed=false;
  function update(stage:Stage,time:number,text:string,review?:ArchiveFrame){
    const office=kind==='office',warning=stage==='archive_escape'||stage==='archive_departure';
    const preview=!office&&archiveReviewing(stage)&&!!review?.source;
    const active=office?['office_playback','office_key','office_leave','office_departure'].includes(stage):preview||stage==='archive_playback'||warning;
    clock=office?Math.min(officeReplayDuration,Math.max(0,time)):preview?(review!.source==='road'?review!.time:review!.source==='call'?5+review!.time:12+review!.time):stage==='archive_playback'||warning?12+Math.max(0,time):Math.max(0,time);
    mode=!active?'idle':office?'office':preview?review!.source!:warning?'live':clock<5?'road':clock<12?'call':clock<21?'gate':'live';
    // The current-room camera raises gain in low light; recording exposure stays intact.
    if(mode==='live')image.material.color.setRGB(1.05,1.2,1.05);else image.material.color.set('#a2b3a8');
    image.visible=active&&mode!=='call';
    const frame=Math.floor(clock*10),next=`${mode}:${active?frame:text}:${preview?review!.playing:''}:${review?.question??false}`;if(next===lastKey)return;lastKey=next;pending=true;
    road.visible=!office&&(mode==='road'||mode==='idle');garage.visible=mode==='gate'||mode==='office';car.visible=active&&mode!=='call'&&mode!=='live';
    intactCar.visible=false;
    hand.visible=mode==='office'&&clock>=3;
    driver.root.visible=mode==='office'&&clock>=3;
    survivor.root.visible=mode==='gate'&&clock>=14;
    if(survivor.root.visible){survivor.root.position.set(1.15,0,-.13);survivor.root.rotation.y=-Math.PI/2;survivor.pose(0,null,0,{crouched:true,pitch:-.18,leanX:.08+Math.sin(clock*2)*.012});survivor.root.updateMatrixWorld(true);survivor.root.position.y-=new T.Box3().setFromObject(survivor.root,true).min.y;}
    if(mode==='gate'||mode==='office'){
      car.rotation.y=0;
      car.position.set(0,0,office?-2+1.6*T.MathUtils.smoothstep(clock,0,2):-.4);
      if(office){camera.position.set(4.4,2.42,5.4);camera.lookAt(0,.9,.7);}else{camera.position.set(3.2,2,2.1);camera.lookAt(.95,.88,-.1);}brake.emissiveIntensity=.8;
      if(driver.root.visible){
        const walking=Math.min(4,clock-3);driver.root.position.set(-1.27,0,.7+walking*.4);driver.root.rotation.y=0;driver.pose(walking,null,.4);driver.root.updateMatrixWorld(true);
        let bottom=Infinity;for(const foot of feet)bottom=Math.min(bottom,footBox.setFromObject(foot).min.y);driver.root.position.y-=bottom;
      }
    }else if(mode==='road'){
      const t=review?.source==='road'?review.time:clock*6/5,hit=Math.max(0,t-4.2),wrap=T.MathUtils.smoothstep(hit,0,.44),slide=T.MathUtils.smoothstep(hit,.45,1.55),coast=Math.min(hit,.8);
      const z=t<4.2?11.44-2.6*t:.52-.9*coast+.5625*coast*coast;
      car.position.set(1.65,0,z);car.rotation.y=Math.PI;intactCar.position.copy(car.position);intactCar.rotation.copy(car.rotation);intactCar.visible=t<4.2;car.visible=t>=4.2;
      intactBrake.emissiveIntensity=t>=3.8?.8:0;brake.emissiveIntensity=.8;
      if(t<4.2){victim.root.position.set(-3.604+1.37*t,0,-1.85);victim.root.rotation.y=Math.PI/2;victim.pose(t,null);}
      else{victim.root.position.set(2.15+.14*wrap+1.05*slide,-.12*wrap-.6*slide,-1.85-1.4*wrap-.55*slide);victim.root.rotation.y=Math.PI/2-.18*slide;victim.pose(4.2,hit);victim.root.updateMatrixWorld(true);victim.root.position.y+=Math.max(0,.002-new T.Box3().setFromObject(victim.root,true).min.y);}
      camera.position.set(4.4,3.8,6.8);camera.lookAt(0,.8,-.6);
    }
    const fov=mode==='road'?56:mode==='gate'?48:49;if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    ctx.globalCompositeOperation='copy';ctx.fillStyle=image.visible?'rgba(0,0,0,0)':'#0b1512';ctx.fillRect(0,0,640,480);ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='rgba(4,14,10,.72)';ctx.fillRect(0,0,640,48);ctx.fillRect(0,398,640,82);
    ctx.fillStyle='#c0d2bd';ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='21px monospace';
    const timecode=mode==='office'?`03:26:${String(Math.floor(clock)+(clock>=3?9:0)).padStart(2,'0')}`:mode==='road'?`03:17:${String(12+Math.floor(clock)).padStart(2,'0')}`:mode==='call'?`03:20:${String(Math.floor(clock-5)).padStart(2,'0')}`:mode==='gate'?`03:26:${String(Math.floor(clock-12)+3).padStart(2,'0')}`:`03:17:${String(Math.floor(Math.max(0,clock-21))%60).padStart(2,'0')}`;
    ctx.fillText(mode==='live'?`LIVE  CAM-08  편집실  ${timecode}`:mode==='idle'?'BAEKRO / 감시 기록 장치':`${office?'저장':'원본'}  ${mode==='road'?'CAM-01':mode==='gate'||mode==='office'?'CAM-04':'AUDIO-17'}  ${timecode}`,20,25);
    if(mode==='call'){
      ctx.font='26px sans-serif';ctx.fillText('정문 비상벨 → 2803 등록 휴대전화',36,132);
      for(let i=0;i<116;i++){const x=32+i*5,level=clock<14.5?(9+Math.abs(Math.sin(i*1.31+frame*.7)*Math.sin(i*.19-frame*.12))*54):2;ctx.fillRect(x,240-level,2,level*2);}
      ctx.font='23px sans-serif';ctx.fillText(preview&&review!.time>=9.5?'수신자 통화 종료':'양방향 통화 원본',36,337);
    }
    if(mode==='office'&&clock>=3&&clock<3.4){ctx.fillStyle='rgba(95,113,103,.4)';for(let y=75;y<380;y+=26)ctx.fillRect(0,y,640,9);}
    ctx.fillStyle='#c0d2bd';ctx.font='24px sans-serif';ctx.textAlign='center';
    const caption=preview?(mode==='road'?(review!.time<3.8?'녹색 보행 신호 / CAM-01':review!.time<4.2?'제동등 점등 / 충돌 직전':'충돌 후 / 제동 유지'):mode==='call'?(review!.time<8?'「현장에 사람이 아직 있어요. 돌아와 주세요.」':review!.time<9.5?'「잘못 거셨어요.」':'수신자 통화 종료'):review!.time<5.8?'03:26 · 「문 좀 열어 주세요.」':'잠금음 / 운전석 미하차'):
     mode==='idle'||mode==='road'?text:mode==='office'?(clock<3?'2803 등록 차량 · 입차':clock<7?'03:26:03–11 / 기록 9초 누락':'귀가자 2명 / 2803호'):mode==='call'?'「잘못 거셨어요.」':mode==='gate'?clock<17.8?'03:26 · 「문 좀 열어 주세요.」':'잠금음 / 운전석 미하차' :clock<27?'현재 영상 · 기록 작성 중':'네 뒤에 있어';
    const lines=caption.split('\n');lines.forEach((line,i)=>ctx.fillText(line,320,(mode==='idle'?220:425)+i*29));
    if(preview){ctx.textAlign='right';ctx.font='17px monospace';ctx.fillText(`${review!.playing?'▶':'Ⅱ'} ${review!.time.toFixed(1)}s`,621,70);}
    if(preview&&review?.question&&review.source){
      const clip=archiveClips[review.source];ctx.fillStyle='rgba(5,13,10,.94)';ctx.fillRect(14,102,612,279);ctx.fillStyle='#d5d9c5';ctx.textAlign='center';ctx.font='25px sans-serif';ctx.fillText(clip.question,320,143);
      ctx.font='24px sans-serif';clip.choices.forEach((choice,i)=>ctx.fillText(`${i+4} · ${choice}`,320,207+i*56));ctx.fillStyle='#9faf9c';ctx.font='19px sans-serif';ctx.fillText('4·5 사실 대조 / ←·→ 원본 다시 보기',320,337);
    }
    ctx.fillStyle='rgba(0,8,4,.14)';for(let y=51;y<398;y+=4)ctx.fillRect(0,y,640,1);
    overlayMap.needsUpdate=true;
  }
  function render(renderer:T.WebGLRenderer,liveScene:T.Scene,force=false,observer?:ObservedPlayer){
    if(disposed||!force&&(!pending||!image.visible))return;
    const previous=renderer.getRenderTarget(),shadows=renderer.shadowMap.autoUpdate,visible=root.visible;
    recording.environment=liveScene.environment;recording.environmentIntensity=.3;root.visible=false;renderer.shadowMap.autoUpdate=false;
    try{if(mode==='live'&&observed){if(observer)observed.update(observer);liveScene.add(observed.root);}renderer.setRenderTarget(target);renderer.render(mode==='live'?liveScene:recording,mode==='live'?liveCamera:camera);pending=false;}
    finally{if(observed)observed.resources.add(observed.root);renderer.setRenderTarget(previous);renderer.shadowMap.autoUpdate=shadows;root.visible=visible;}
  }
  const feed:Surveillance={update,render,async prepare(renderer:T.WebGLRenderer,liveScene:T.Scene){
    const survivorVisible=survivor.root.visible,a=road.visible,b=garage.visible,c=car.visible,h=hand.visible,d=driver.root.visible,intact=intactCar.visible,saved=mode;
    road.visible=garage.visible=car.visible=hand.visible=driver.root.visible=intactCar.visible=survivor.root.visible=true;recording.environment=liveScene.environment;
    try{await renderer.compileAsync?.(recording,camera);render(renderer,liveScene,true);if(observed){mode='live';liveScene.add(observed.root);await renderer.compileAsync?.(liveScene,liveCamera);render(renderer,liveScene,true);}}
    finally{if(observed)observed.resources.add(observed.root);road.visible=a;garage.visible=b;car.visible=c;hand.visible=h;driver.root.visible=d;survivor.root.visible=survivorVisible;intactCar.visible=intact;mode=saved;pending=true;}
  },dispose(){if(disposed)return;disposed=true;target.dispose();disposeWorld(recording);}};
  root.userData.surveillance=feed;update(kind==='office'?'office_record':'archive_reveal',0,kind==='office'?'신호 없음':'회수한 원본부터 검토하세요\n장면 표시 → 4·5 사실 대조');return root;
}
export type Surveillance={update:(stage:Stage,time:number,text:string,review?:ArchiveFrame)=>void;render:(renderer:T.WebGLRenderer,scene:T.Scene,force?:boolean,observer?:ObservedPlayer)=>void;prepare:(renderer:T.WebGLRenderer,scene:T.Scene)=>Promise<void>;dispose:()=>void};
