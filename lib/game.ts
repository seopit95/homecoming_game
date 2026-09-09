import * as T from 'three';
import { buildWorld, canStandAt, type Target } from './world';
import { HorrorAudio } from './audio';
import { initialStory, checkpoint, transition, objectives, type Story, type Action } from './story';

export type GameView = { started:boolean; paused:boolean; story:Story; prompt:string; message:string; objective:string; location:string; flashlight:boolean; threat:number; elapsed:number };
export type Settings = {volume:number;brightness:number;sensitivity:number;bob:boolean};

export function createGame(canvas:HTMLCanvasElement,onChange:(view:GameView)=>void,onError:(error:string)=>void){
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const scene=new T.Scene();scene.background=new T.Color('#080e0d');scene.fog=new T.FogExp2('#101916',.023);
  scene.add(new T.HemisphereLight('#a8b7b5','#292b1c',.55));
  const camera=new T.PerspectiveCamera(68,1,.06,55);camera.rotation.order='YXZ';camera.position.set(0,1.65,7.6);
  const world=buildWorld(scene),audio=new HorrorAudio();
  const flashlight=new T.SpotLight('#e6e5cf',32,18,Math.PI/6,.72,1.6);flashlight.castShadow=true;flashlight.shadow.mapSize.set(1024,1024);flashlight.shadow.bias=-.0002;
  scene.add(flashlight,flashlight.target);const fill=new T.PointLight('#bfd0be',.7,3);scene.add(fill);
  let story=initialStory(),started=false,paused=false,disposed=false,torch=true,elapsed=0,yaw=0,pitch=0,frameId=0;
  let message='',messageUntil=0,lastFrame=0,lastEmit=0,lastStep=0,threatTime=0,hiddenTime=0,lastEnemyStep=0,scareTime=0;
  let hover:Target|undefined,oldPrompt='',dragging=false,previousX=0,previousY=0;
  const hiddenPosition=new T.Vector3();
  let settings:Settings={volume:.42,brightness:1.1,sensitivity:1,bob:false};
  const keys=new Set<string>(),direction=new T.Vector3();
  let lastLocation='복 도';
  const getLocation=()=>camera.position.x< -1.6?(camera.position.z<0?'다용도실':'거 실'):camera.position.x>1.6?(camera.position.z<0?'욕 실':'침 실'):'복 도';
  function snapshot():GameView{return {started,paused,story:{...story},prompt:story.hidden?'옷장에서 나오기':hover?.label||'',message,objective:objectives[story.stage],location:getLocation(),flashlight:torch,threat:story.stage==='hide'?Math.min(1,threatTime/20):0,elapsed};}
  function emit(){onChange(snapshot());}
  function say(text:string,seconds=6){message=text;messageUntil=elapsed+seconds;emit();}
  function free(x:number,z:number,r=.23){return canStandAt(x,z,world.solids,r);}
  function move(dx:number,dz:number){if(free(camera.position.x+dx,camera.position.z))camera.position.x+=dx;if(free(camera.position.x,camera.position.z+dz))camera.position.z+=dz;}
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function lock(){
    if(window.matchMedia('(pointer:coarse)').matches)return;
    try{const promise=canvas.requestPointerLock?.();if(promise)promise.catch(()=>{say('화면을 드래그하거나 ← → 키로 둘러볼 수 있습니다.',7);});}catch{say('화면을 드래그해서 둘러보세요.',5);}
  }
  function pause(value=true){
    if(!started||story.stage==='ended')return;paused=value;keys.clear();dragging=false;
    if(value){audio.pause();if(document.pointerLockElement===canvas)document.exitPointerLock();}else{audio.resume();lock();}
    emit();
  }
  function start(retry=false){
    try{audio.start();audio.setVolume(settings.volume);}catch{onError('오디오를 시작하지 못했습니다. 소리 없이도 플레이할 수 있습니다.');}
    started=true;paused=false;story=retry?checkpoint():initialStory();torch=true;elapsed=0;threatTime=0;hiddenTime=0;scareTime=0;message='';hover=undefined;keys.clear();lastStep=0;lastEnemyStep=0;
    camera.position.set(retry?2.1:0,1.65,retry?5:7.6);yaw=retry?-.3:0;pitch=0;world.figure.visible=false;world.figure.position.set(0,0,-3);
    say(retry?'라디오가 다시 켜져 있다. 옷장 위치를 기억하자.':'03:17. 집에 도착하자마자 전기가 나갔다. 거실에서 휴대전화가 울린다.',8);lock();emit();
  }
  function finish(){keys.clear();world.figure.visible=false;if(document.pointerLockElement===canvas)document.exitPointerLock();audio.sound('dread');emit();}
  function interact(){
    if(!started||paused||story.stage==='ended')return;
    const action:Action|undefined=story.hidden?'closet':hover?.id;if(!action)return;
    const before=story;story=transition(story,action);
    audio.sound('click');
    if(story===before){
      const text:Partial<Record<Action,string>>={phone:'발신자 표시 제한. 메시지는 더 이상 오지 않는다.',breaker:'차단기는 올라가 있다.',shoes:'내 신발이 아니다. 물은 아직 마르지 않았다.',radio:'전원선이 빠져 있다.',closet:'사람 하나가 들어갈 만한 옷장이다.',door:'문은 잠겨 있다. 먼저 집 안을 확인하자.'};say(text[action]||'',4);return;
    }
    if(action==='phone')say('발신자 표시 제한\n「차단기를 올려. 그리고 현관문이 잠겼는지 확인해.」',9);
    if(action==='breaker'){audio.sound('dread',-.7);say('불이 돌아왔다.\n현관에서 무언가 떨어지는 소리가 났다.',7);scareTime=elapsed+2;}
    if(action==='shoes'){audio.sound('knock',.7);say('젖은 신발. 내 것이 아니다.\n침실에서 라디오 소리가 들린다.',8);}
    if(action==='radio'){
      torch=true;threatTime=0;world.figure.position.set(0,0,-3);world.figure.visible=true;audio.sound('dread');
      say('「혼자 온 줄 알았어?」\n복도에서 발소리가 다가온다. 침실 옷장에 숨어야 한다.',7);
    }
    if(action==='closet'){
      if(story.hidden){hiddenPosition.copy(camera.position);camera.position.set(5.78,1.48,2.15);yaw=Math.PI/2;pitch=0;hiddenTime=0;say('숨을 죽인다. 아직 문을 열면 안 된다.',4);}
      else{camera.position.copy(hiddenPosition);camera.position.y=1.65;say(story.stage==='escape'?'지금이다. 현관으로 나가자.':'아직 가까이에 있다!',4);}
    }
    if(story.stage==='ended')finish();emit();
  }
  function keydown(e:KeyboardEvent){
    if(!started)return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyF','Escape','KeyP'].includes(e.code))e.preventDefault();
    if(e.code==='Escape'||e.code==='KeyP'){if(!e.repeat)pause(!paused);return;}
    if(paused||story.stage==='ended')return;
    keys.add(e.code);if(e.repeat)return;if(e.code==='KeyE'||e.code==='Space')interact();if(e.code==='KeyF'){torch=!torch;audio.sound('click');emit();}
  }
  function keyup(e:KeyboardEvent){keys.delete(e.code);}
  function pointerdown(e:PointerEvent){if(!started||paused||story.stage==='ended')return;dragging=true;previousX=e.clientX;previousY=e.clientY;if(e.pointerType==='touch')canvas.setPointerCapture(e.pointerId);else if(document.pointerLockElement!==canvas)lock();}
  function pointermove(e:PointerEvent){
    if(!started||paused||story.hidden||story.stage==='ended')return;
    let dx=0,dy=0;
    if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY;}else if(dragging){dx=e.clientX-previousX;dy=e.clientY-previousY;previousX=e.clientX;previousY=e.clientY;}else return;
    yaw-=dx*.0021*settings.sensitivity;pitch=T.MathUtils.clamp(pitch-dy*.0021*settings.sensitivity,-1.25,1.25);
  }
  function pointerup(){dragging=false;}
  function lockchange(){if(document.pointerLockElement!==canvas&&started&&!paused&&story.stage!=='ended')pause(true);}
  function hidden(){if(document.hidden)pause(true);}
  function blur(){keys.clear();if(started&&!paused)pause(true);}
  document.addEventListener('keydown',keydown);document.addEventListener('keyup',keyup);document.addEventListener('pointermove',pointermove);document.addEventListener('pointerup',pointerup);document.addEventListener('pointerlockchange',lockchange);document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',blur);canvas.addEventListener('pointerdown',pointerdown);
  function findTarget(){
    hover=undefined;if(story.hidden)return;
    camera.getWorldDirection(direction);
    for(const t of world.targets){
      if(t.id==='shoes'&&!world.shoes.visible)continue;
      const delta=t.point.clone().sub(camera.position),distance=delta.length();
      if(distance>2.25||delta.normalize().dot(direction)<.83)continue;
      // A wall must not allow interaction with the room on its other side.
      let blocked=false;for(let s=.2;s<distance-.32;s+=.16){const p=camera.position.clone().addScaledVector(delta,s);if(world.solids.some(b=>Math.abs(p.x-b.x)<b.w/2&&Math.abs(p.z-b.z)<b.d/2)&&p.y>1.1){blocked=true;break;}}
      if(!blocked){hover=t;break;}
    }
  }
  // The figure first follows the hallway into the bedroom, then closes in.
  let enemyWaypoint=0;
  function danger(dt:number){
    if(story.stage==='hide'){
      threatTime+=dt;const p=world.figure.position;const waypoints=[new T.Vector3(0,0,4.85),new T.Vector3(2.35,0,4.85)];
      if(threatTime<.1)enemyWaypoint=0;
      let target=waypoints[enemyWaypoint]??new T.Vector3(camera.position.x,0,camera.position.z);
      if(p.distanceTo(target)<.3&&enemyWaypoint<2){enemyWaypoint++;target=waypoints[enemyWaypoint]??new T.Vector3(camera.position.x,0,camera.position.z);}
      const d=target.clone().sub(p).normalize().multiplyScalar(dt*(threatTime<4?.72:1.0));
      if(free(p.x+d.x,p.z,.17))p.x+=d.x;if(free(p.x,p.z+d.z,.17))p.z+=d.z;
      world.figure.lookAt(camera.position.x,1,camera.position.z);
      if(elapsed-lastEnemyStep>.68){audio.sound('step',T.MathUtils.clamp((p.x-camera.position.x)*.25,-1,1));lastEnemyStep=elapsed;}
      if(threatTime>4&&p.distanceTo(new T.Vector3(camera.position.x,0,camera.position.z))<.68){story=transition(story,'caught');finish();}
    }else if(story.stage==='wait'){
      hiddenTime+=dt;world.figure.visible=hiddenTime<8;world.figure.position.set(5.28,0,2.15);world.figure.rotation.y=Math.PI/2;
      if(elapsed-lastEnemyStep>(hiddenTime>6?1.15:.8)){audio.sound(hiddenTime>3&&hiddenTime<5?'knock':'step',hiddenTime>6?-.8:.3);lastEnemyStep=elapsed;}
      if(hiddenTime>11){story=transition(story,'survived');world.figure.visible=false;say('발소리가 멎었다.\n옷장에서 나와 현관으로 가자.',7);emit();}
    }
  }
  function frame(ms:number){
    if(disposed)return;frameId=requestAnimationFrame(frame);const dt=Math.min((ms-lastFrame)/1000||0,.05);lastFrame=ms;
    if(!started){camera.position.set(.1,1.63,7.8);yaw=.1+Math.sin(ms*.0001)*.04;pitch=-.015;}
    else if(!paused&&story.stage!=='ended'){
      elapsed+=dt;
      if(!story.hidden){
        if(keys.has('ArrowLeft'))yaw+=dt*1.35;if(keys.has('ArrowRight'))yaw-=dt*1.35;
        const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
        const side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));const norm=Math.hypot(forward,side)||1;
        const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?2.65:1.8)*dt/norm;
        const px=camera.position.x,pz=camera.position.z;
        move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);
        const moving=Math.hypot(camera.position.x-px,camera.position.z-pz)>.001;
        camera.position.y=1.65+(settings.bob&&moving?Math.sin(elapsed*9)*.018:0);
        if(moving&&elapsed-lastStep>.48){audio.sound('step',Math.sin(elapsed*3)*.2);lastStep=elapsed;}
      }
      if(message&&elapsed>messageUntil){message='';emit();}
      if(scareTime&&elapsed>scareTime){audio.sound('knock',-.6);scareTime=0;}
      if(story.stage==='phone'&&Math.floor(elapsed)%9===0&&elapsed-lastEnemyStep>1){audio.sound('phone',-.65);lastEnemyStep=elapsed;}
      if(story.stage==='radio'&&elapsed-lastEnemyStep>2.1){audio.sound('phone',.7);lastEnemyStep=elapsed;}
      danger(dt);
    }
    camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();
    flashlight.position.copy(camera.position).add(new T.Vector3(.11,-.13,0).applyQuaternion(camera.quaternion));
    camera.getWorldDirection(direction);flashlight.target.position.copy(camera.position).addScaledVector(direction,6);flashlight.intensity=torch&&!story.hidden?32:0;fill.position.copy(camera.position);fill.intensity=story.hidden?.18:.65;
    const powered=['shoes','radio'].includes(story.stage);world.shoes.visible=!['phone','power'].includes(story.stage);
    for(let i=0;i<world.lamps.length;i++)world.lamps[i].intensity=(powered?5:.75)*(i===1?.75+Math.sin(ms*.012)*.15:1);
    world.radioLight.intensity=story.stage==='radio'?1.5:.16;world.phoneGlow.intensity=story.stage==='phone'?.8:.1;
    if(started&&!paused&&story.stage!=='ended')findTarget();
    const prompt=hover?.label||'',loc=getLocation();
    if(prompt!==oldPrompt||loc!==lastLocation||(started&&!paused&&elapsed-lastEmit>.2)){oldPrompt=prompt;lastLocation=loc;lastEmit=elapsed;emit();}
    renderer.render(scene,camera);
  }
  frameId=requestAnimationFrame(frame);emit();
  function configure(next:Partial<Settings>){settings={...settings,...next};audio.setVolume(settings.volume);renderer.toneMappingExposure=settings.brightness;}
  return {start,pause,interact,snapshot,configure,torch(){torch=!torch;emit();},key(code:string,down:boolean){if(down)keys.add(code);else keys.delete(code);},dispose(){
    disposed=true;cancelAnimationFrame(frameId);observer.disconnect();audio.dispose();if(document.pointerLockElement===canvas)document.exitPointerLock();
    document.removeEventListener('keydown',keydown);document.removeEventListener('keyup',keyup);document.removeEventListener('pointermove',pointermove);document.removeEventListener('pointerup',pointerup);document.removeEventListener('pointerlockchange',lockchange);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',blur);canvas.removeEventListener('pointerdown',pointerdown);
    const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
    scene.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material])){materials.add(m);for(const v of Object.values(m))if(v instanceof T.Texture)textures.add(v);}}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();
  }};
}
export type Game = ReturnType<typeof createGame>;
