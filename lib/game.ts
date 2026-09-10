import * as T from 'three';
import {buildWorld,canStandAt,hasLineOfSight,disposeWorld,type Target} from './world.ts';
import {animateGhost} from './ghost.ts';
export {prepareVisuals} from './materials.ts';
import {HorrorAudio,type GhostLine} from './audio.ts';
import {initialStory,checkpoint,transition,objectives,areaFor,chapters,chaseStages,type Story,type Action,type Area} from './story.ts';
import {findPath,type Point} from './navigation.ts';

export type GameView={started:boolean;paused:boolean;crouched:boolean;whisper:string;story:Story;prompt:string;message:string;objective:string;location:string;floor:string;chapter:string;chapterNumber:string;chapterCard:boolean;flashlight:boolean;threat:number;elapsed:number;holdProgress:number;holding:boolean;liftFloor:number;checkpointLabel:string};
export type Settings={volume:number;brightness:number;sensitivity:number;bob:boolean};

export function createGame(canvas:HTMLCanvasElement,onChange:(view:GameView)=>void,onError:(error:string)=>void){
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const scene=new T.Scene();scene.background=new T.Color('#080b10');scene.fog=new T.FogExp2('#14191d',.016);
  const ambient=new T.HemisphereLight('#a8b4c4','#302925',.7);scene.add(ambient);
  const camera=new T.PerspectiveCamera(68,1,.06,85);camera.rotation.order='YXZ';
  let area:Area='apartment',world=buildWorld(scene);const audio=new HorrorAudio();
  const flashlight=new T.SpotLight('#f0e9d9',42,24,Math.PI/7,.83,1.7);flashlight.castShadow=true;flashlight.shadow.mapSize.set(window.matchMedia('(pointer:coarse)').matches?1024:2048,window.matchMedia('(pointer:coarse)').matches?1024:2048);flashlight.shadow.bias=-.0002;
  scene.add(flashlight,flashlight.target);const fill=new T.PointLight('#dadde0',.6,3.5);scene.add(fill);
  let story=initialStory(),started=false,paused=false,disposed=false,torch=true,elapsed=0,yaw=0,pitch=0,frameId=0;
  let message='',messageUntil=0,lastFrame=0,lastEmit=0,lastStep=0,stageTime=0,areaTime=0,lastSound=0,lastBreath=0,lastDrip=0,chapterUntil=0;
  let crouched=false,runningNoise=false,walkPhase=0,whisper='',whisperUntil=0,lastVoice=-20,voiceBeat=0,tracking=false,seenAt=0,patrol=0;
  let lastSeen:Point|null=null;
  let hover:Target|undefined,dragging=false,previousX=0,previousY=0,holdProgress=0,holding=false,doorOpen=0,lastDisplay='',threat=0;
  let enemyPath:Point[]=[],repathAt=0,scriptBeat=0;
  const hiddenPosition=new T.Vector3(),direction=new T.Vector3(),delta=new T.Vector3();
  let settings:Settings={volume:.42,brightness:1.25,sensitivity:1,bob:false};
  const keys=new Set<string>();const lastGhostPosition=new T.Vector3();let ghostMotion=0;const reducedMotion=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const getLiftFloor=()=>story.stage==='descent'?Math.max(24,28-Math.floor(stageTime/4)):['pry','lift_exit'].includes(story.stage)?24:28;
  function location(){
    if(area==='apartment')return camera.position.x< -1.6?(camera.position.z<0?'다용도실':'거실'):camera.position.x>1.6?(camera.position.z<0?'욕실':'침실'):'집 안 복도';
    if(area==='office')return camera.position.x< -1.6?(camera.position.z< -1.5?'문서 보관실':'야간 관리실'):camera.position.x>1.6?'전기실':'관리실 복도';
    return {landing:'엘리베이터 홀',lift:'엘리베이터',corridor:'정전된 복도',stairs:'비상계단',parking:'지하 주차장'}[area];
  }
  function snapshot():GameView{
    const chapter=chapters[area];
    const retryLabels:Partial<Record<typeof story.stage,string>>={lift_call:'28층 엘리베이터 홀부터 다시',lift_exit:'24층 엘리베이터부터 다시',stairs_loop:'23층 비상계단부터 다시',office_record:'17층 관리실부터 다시',parking_gate:'지하 주차장 입구부터 다시',parking_alarm:'주차장 경보기부터 다시'};
    return {started,paused,crouched,whisper,story:{...story,notes:[...story.notes]},prompt:story.hidden?'장롱에서 나오기':hover?.label||'',message,objective:objectives[story.stage],location:location(),floor:area==='lift'?`${getLiftFloor()}F`:chapter.floor,chapter:chapter.title,chapterNumber:chapter.number,chapterCard:started&&elapsed<chapterUntil,flashlight:torch,threat,elapsed,holdProgress,holding:holding||keys.has('KeyE'),liftFloor:getLiftFloor(),checkpointLabel:retryLabels[story.resume]||'28층 라디오 장면부터 다시'};
  }
  const emit=()=>onChange(snapshot());
  function say(text:string,seconds=7){message=text;messageUntil=elapsed+seconds;emit();}
  function ghostVoice(line:GhostLine,force=false){
    if(!force&&elapsed-lastVoice<7)return;
    const dx=world.figure.position.x-camera.position.x,dz=world.figure.position.z-camera.position.z,distance=Math.hypot(dx,dz),pan=T.MathUtils.clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,distance),-1,1);
    audio.voice(line,pan,Math.max(.4,Math.min(1,6/Math.max(1,distance))));lastVoice=elapsed;
    whisper={where:'「어디 있지…?」',here:'「여기 있었는데…」',found:'「찾았다. 놓치지 않을 거야.」',come:'「나오렴…」',cry:'어둠 속에서 여자가 흐느낀다.'}[line];whisperUntil=elapsed+(line==='cry'?5:3.5);emit();
  }
  const free=(x:number,z:number,r=.23)=>canStandAt(x,z,world.solids,r,world.bounds);
  function move(dx:number,dz:number){if(free(camera.position.x+dx,camera.position.z))camera.position.x+=dx;if(free(camera.position.x,camera.position.z+dz))camera.position.z+=dz;}
  function resize(){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function lock(){
    if(window.matchMedia('(pointer:coarse)').matches)return;
    try{const promise=canvas.requestPointerLock?.();if(promise)promise.catch(()=>say('화면 드래그 또는 ← → 키로 둘러보세요.',5));}catch{say('화면을 드래그해서 둘러보세요.',5);}
  }
  function pause(value=true){
    if(!started||story.stage==='ended')return;paused=value;keys.clear();dragging=false;holding=false;holdProgress=0;
    if(value){audio.pause();if(document.pointerLockElement===canvas)document.exitPointerLock();}else{audio.resume();lock();}emit();
  }
  function loadArea(next:Area){
    disposeWorld(world.root);area=next;world=buildWorld(scene,area);camera.position.copy(world.spawn);yaw=world.heading;pitch=0;
    hover=undefined;holdProgress=0;holding=false;doorOpen=0;lastDisplay='';enemyPath=[];repathAt=0;scriptBeat=0;threat=0;lastSound=elapsed;lastBreath=elapsed;lastDrip=elapsed;
    areaTime=0;crouched=false;walkPhase=0;lastSeen=null;tracking=false;seenAt=elapsed;patrol=0;voiceBeat=0;whisper='';lastVoice=elapsed-8;audio.stopVoices();
    chapterUntil=elapsed+4.5;ambient.intensity=area==='parking'?.52:.7;lastGhostPosition.copy(world.figure.position);ghostMotion=0;
    (scene.fog as T.FogExp2).density=area==='corridor'?.026:area==='parking'?.021:.016;
    if(['landing','corridor','stairs','office'].includes(area)){world.figure.visible=true;const z=area==='landing'?19:area==='corridor'?36.4:area==='stairs'?8.1:15.2;world.figure.position.set(area==='corridor'?.95:0,0,z);world.figure.lookAt(camera.position.x,0,camera.position.z);chapterUntil=elapsed+1.7;}
    lastGhostPosition.copy(world.figure.position);
  }
  function advance(action:Action){
    const next=transition(story,action);if(next===story)return false;
    story=next;stageTime=0;scriptBeat=0;voiceBeat=0;holdProgress=0;enemyPath=[];repathAt=0;
    if(story.stage==='ended'){keys.clear();holding=false;hover=undefined;threat=0;audio.stopVoices();whisper='';if(document.pointerLockElement===canvas)document.exitPointerLock();audio.sound('dread');emit();return true;}
    const nextArea=areaFor(story);if(nextArea!==area)loadArea(nextArea);
    emit();return true;
  }
  function start(retry=false){
    try{audio.start();audio.setVolume(settings.volume);}catch{onError('소리를 시작하지 못했습니다. 소리 없이도 플레이할 수 있습니다.');}
    story=retry?checkpoint(story):initialStory();elapsed=retry?elapsed:0;started=true;paused=false;stageTime=0;torch=true;message='';keys.clear();dragging=false;
    lastStep=elapsed;lastEmit=elapsed-1;loadArea(areaFor(story));
    audio.setTV(story.stage==='tv');
    if(story.stage==='tv'){camera.position.set(-5.96,1.15,5.25);yaw=-.34;pitch=.05;torch=false;chapterUntil=0;}
    if(retry&&story.stage==='radio'){camera.position.set(2.1,1.65,5);yaw=-.3;}
    if(retry&&story.stage==='lift_exit')doorOpen=1;
    if(retry&&story.stage==='parking_alarm'){camera.position.set(-22.1,1.65,32);yaw=.4;}
    say(retry?objectives[story.stage]+'\nShift 달리기 · C 몸 낮추기. 엄폐물 뒤에서는 손전등을 끄자.':'새벽 03:17. 이사 온 지 사흘째.\n잠이 오지 않아 소파에서 심야 방송을 보고 있었다.',6);lock();emit();
  }
  const dialogue:Partial<Record<Action,string>>={
    phone:'발신자 표시 제한\n「불은 켜지지 않을 거예요. 현관문, 아까부터 열려 있었죠? 다른 한 켤레는 건드리지 마세요.」\n전화가 끊기자 현관에서 젖은 무언가가 떨어졌다.',
    breaker:'차단기를 올려도 불은 돌아오지 않는다. 건물 전체가 정전된 모양이다.\n어둠 속 거실에서 휴대전화가 울린다.',
    shoes:'젖은 신발. 내 것이 아니다.\n발자국은 집 안으로만 나 있다. 침실에서 라디오가 켜졌다.',
    radio:'라디오를 껐다.\n잡음이 뚝 끊겼다. …이제 조용하다.',
    door:'열린 현관으로 빠져나왔다.\n집 안의 발소리가 복도까지 따라온다. 홀 끝 엘리베이터로!',
    call:'28 … 27 …\n아직 멀었다. 기둥을 돌며 시간을 벌어야 한다!',
    enter:'문이 닫힌다.\n오른쪽 조작반에서 1층을 누르자.',
    panel:'1층. 제발, 멈추지 마.\n천장에서 내 것보다 한 박자 늦은 숨소리가 들린다.',
    pry:'문이 벌어졌다. 24층 복도가 보인다.\n밖으로 나갈 수 있다.',
    leave_lift:'바로 옆에 있다.\n중앙 설비실을 피해 좌우 복도로 돌아! 반대편 녹색 비상계단으로!',
    stairs:'비상문을 닫자, 손톱 긁는 소리가 따라 내려온다.\n아래층으로 가야 한다.',
    down:'한 층을 내려왔다.\n그런데 벽에는 다시 「23F」라고 쓰여 있다.',
    stair_note:'「같은 층이 두 번 보이면 더 내려가지 마세요.\n한 층 올라가면 관리실로 연결됩니다.」',
    up:'위로 올라왔는데, 17층이다. 넓은 기록 보관실.\n발소리가 계속 따라온다. C로 몸을 낮추고 캐비닛 뒤에 숨자. 왼쪽 책상에 기록이 있다.',
    record:'2012년, 03:17. 2803호의 여성이 살해되고 아이가 사라졌다.\n「그것은 경보를 따라 움직인다. 열쇠는 CCTV 옆에.」\nCCTV부터 켜야 한다. 서고에 예비 퓨즈가 있다.',
    fuse:'예비 퓨즈를 챙겼다.\n오른쪽 전기실에 꽂으면 CCTV가 켜질 것이다.',
    security_power:'CCTV 전원이 돌아왔다.\n모니터에서 2803호가 잡힌다. 장롱 문이 열리고 있다.',
    monitor:'장롱에서 나온 것은 … 나였다.\n화면에 「귀가 확인 / 아직 한 명 남음」이 떴다.\n비상 열쇠를 챙겼다. 지하로 내려가자.',
    service_exit:'계단 끝에서 차가운 바람이 불었다. 지하 1층.\n주차장 건너편 녹색 보행자 출구가 보인다.',
    exit:'자물쇠는 풀렸다. 그런데 누군가 반대편에서 문을 붙잡고 있다.\n입구 쪽 붉은 경보기를 울려 그것을 유인하자.',
    alarm:'경보가 울린다. 그것이 고개를 돌렸다.\n지금이야. 차들 사이로 빠져나가 출구까지 달려!',
  };
  function interact(){
    if(!started||paused||story.stage==='ended'||story.stage==='tv')return;
    findTarget();const action:Action|undefined=story.hidden?'closet':hover?.id;if(!action)return;
    if(action==='pry'){say('문을 바라본 채 E 또는 화면의 문 벌리기 버튼을 길게 누르세요.',4);return;}
    const wasHidden=story.hidden;
    if(area==='stairs'&&action==='down'&&story.stage!=='stairs_loop'){
      camera.position.copy(world.spawn);yaw=Math.PI;pitch=0;audio.sound('dread');say('또 23층이다.\n아래로 내려가는 발소리는, 내 발소리가 아니었다.',7);return;
    }
    if(!advance(action)){
      const responses:Partial<Record<Action,string>>={door:'현관은 열려 있다. 밖에서 차가운 바람이 들어온다.',closet:'장롱 안에 몸을 숨길 수 있다.',up:'문이 움직이지 않는다. 먼저 아래쪽 계단을 확인하자.',fuse:'먼저 관리실 책상의 근무일지를 살펴보자.',security_power:'퓨즈가 빠져 있다. 서고의 예비 부품을 찾아야 한다.',monitor:'화면이 꺼져 있다. 기록과 전원을 확인해야 한다.',service_exit:'비상 열쇠가 필요하다. CCTV 옆 열쇠함이 보인다.'};
      say(responses[action]||'이미 확인했다. 다음 단서를 찾아야 한다.',4);return;
    }
    audio.sound(action==='door'||action==='stairs'||action==='service_exit'?'slam':'click');
    if(action==='closet'){
      if(!wasHidden){hiddenPosition.copy(camera.position);camera.position.set(5.78,1.48,2.15);yaw=Math.PI/2;pitch=0;say('숨을 죽인다. 발소리가 다른 방으로 갈 때까지 기다려야 한다.',6);}
      else{camera.position.copy(hiddenPosition);camera.position.y=1.65;say(story.stage==='escape'?'귀신이 욕실로 갔다. 지금 현관으로 달리자.':'아직 장롱 앞에 있다!',5);}
    }else if(dialogue[action]&&story.ending===null)say(dialogue[action]!,['record','monitor','phone'].includes(action)?12:8);
    if(action==='breaker'){audio.sound('click');audio.sound('phone',-.65);lastSound=elapsed;}
    if(action==='leave_lift'){audio.sound('slam',-.8);audio.sound('dread',-.8);}
    if(action==='down'){camera.position.copy(world.spawn);yaw=Math.PI;pitch=0;world.figure.position.set(3.5,-2.8,-6.8);lastSeen=null;tracking=false;audio.sound('dread');}
    if(action==='fuse'&&hover)hover.mesh.visible=false;
    if(action==='security_power'){audio.sound('slam',.8);ghostVoice('cry',true);}
    if(action==='monitor'){world.setDisplay?.('帰宅確認 / 残り一名');ghostVoice('found',true);}
    if(action==='alarm'){audio.sound('alarm',-.8);chapterUntil=0;}
    emit();
  }
  function keydown(e:KeyboardEvent){
    if(!started)return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyF','KeyC','Escape','KeyP','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
    if(e.code==='Escape'||e.code==='KeyP'){if(!e.repeat)pause(!paused);return;}
    if(paused||story.stage==='ended')return;keys.add(e.code);if(e.repeat)return;
    if(e.code==='KeyE'||e.code==='Space'){if(story.stage!=='pry')interact();}
    if(e.code==='KeyF'&&story.stage!=='tv'){torch=!torch;audio.sound('click');emit();}
    if(e.code==='KeyC')crouch();
  }
  const keyup=(e:KeyboardEvent)=>keys.delete(e.code);
  function pointerdown(e:PointerEvent){if(!started||paused||story.stage==='ended')return;dragging=true;previousX=e.clientX;previousY=e.clientY;if(e.pointerType==='touch')canvas.setPointerCapture(e.pointerId);else if(document.pointerLockElement!==canvas)lock();}
  function pointermove(e:PointerEvent){
    if(!started||paused||story.hidden||story.stage==='ended')return;let dx=0,dy=0;
    if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY;}else if(dragging){dx=e.clientX-previousX;dy=e.clientY-previousY;previousX=e.clientX;previousY=e.clientY;}else return;
    yaw-=dx*.0021*settings.sensitivity;pitch=T.MathUtils.clamp(pitch-dy*.0021*settings.sensitivity,-1.25,1.25);
  }
  const pointerup=()=>{dragging=false;holding=false;};
  function lockchange(){if(document.pointerLockElement!==canvas)blur();}
  function hidden(){blur();if(document.hidden)audio.pause();else if(started&&!paused)audio.resume();}
  function blur(){keys.clear();holding=false;dragging=false;}
  document.addEventListener('keydown',keydown);document.addEventListener('keyup',keyup);document.addEventListener('pointermove',pointermove);document.addEventListener('pointerup',pointerup);document.addEventListener('pointerlockchange',lockchange);document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',blur);canvas.addEventListener('pointerdown',pointerdown);
  function findTarget(){
    hover=undefined;if(story.hidden||story.stage==='tv')return;camera.getWorldDirection(direction);
    for(const t of world.targets){
      if(t.id==='shoes'&&!world.shoes.visible)continue;
      if(t.id==='fuse'&&['office_power','office_tape','office_leave'].includes(story.stage))continue;
      if(area==='landing'&&t.id!==(story.stage==='lift_call'?'call':story.stage==='lift_enter'&&doorOpen>.75?'enter':'none'))continue;
      if(area==='lift'&&t.id!==(story.stage==='lift_button'?'panel':story.stage==='pry'?'pry':story.stage==='lift_exit'&&doorOpen>.75?'leave_lift':'none'))continue;
      if(t.id==='alarm'&&story.stage!=='parking_alarm')continue;
      delta.copy(t.point).sub(camera.position);const distance=delta.length();if(distance>2.3||delta.normalize().dot(direction)<.81)continue;
      if(hasLineOfSight(camera.position,t.point,world.solids)){hover=t;break;}
    }
  }
  function followEnemy(target:Point,speed:number,dt:number){
    const p=world.figure.position;
    if(elapsed>=repathAt){enemyPath=findPath(p,target,world.solids,world.bounds);repathAt=elapsed+.55;}
    while(enemyPath.length&&Math.hypot(p.x-enemyPath[0].x,p.z-enemyPath[0].z)<.12)enemyPath.shift();
    const next=enemyPath[0];if(!next)return;
    const dx=next.x-p.x,dz=next.z-p.z,distance=Math.hypot(dx,dz),step=Math.min(speed*dt,distance);
    if(free(p.x+dx/distance*step,p.z,.18))p.x+=dx/distance*step;if(free(p.x,p.z+dz/distance*step,.18))p.z+=dz/distance*step;
    p.y=world.heightAt(p.x,p.z);
    const turn=T.MathUtils.euclideanModulo(Math.atan2(dx,dz)-world.figure.rotation.y+Math.PI,Math.PI*2)-Math.PI;
    world.figure.rotation.y+=turn*Math.min(1,dt*10);
  }
  function hunt(speed:number,dt:number){
    const p=world.figure.position,distance=Math.hypot(p.x-camera.position.x,p.z-camera.position.z);
    const visible=distance<(torch?25:crouched?7:15)&&hasLineOfSight({x:p.x,y:p.y+1.55,z:p.z},camera.position,world.solids);
    const heard=runningNoise&&distance<22;
    if(visible||heard){lastSeen={x:camera.position.x,z:camera.position.z};seenAt=elapsed;if(!tracking)ghostVoice('found');tracking=true;}
    else if(tracking&&elapsed-seenAt>2){tracking=false;ghostVoice('here');}
    const reached=lastSeen&&Math.hypot(p.x-lastSeen.x,p.z-lastSeen.z)<.6;
    if(lastSeen&&(!reached||elapsed-seenAt<2))followEnemy(lastSeen,speed,dt);
    else{
      const points=area==='office'?[{x:0,z:0},{x:0,z:-12},{x:8,z:8},{x:-8,z:8}]:area==='landing'?[{x:0,z:-18},{x:8,z:0},{x:0,z:15}]:area==='stairs'?[{x:3.5,z:-7},{x:0,z:6},{x:-3.5,z:-7}]:area==='parking'?[{x:11,z:-36},{x:-22,z:30},{x:22,z:30}]:[{x:-10,z:-32},{x:10,z:0},{x:-10,z:32}];
      const target=points[patrol%points.length];if(Math.hypot(p.x-target.x,p.z-target.z)<.8)patrol++;followEnemy(target,speed*.68,dt);if(elapsed-lastVoice>14)ghostVoice(patrol%2?'where':'cry');
    }
    threat=Math.max(threat,tracking?T.MathUtils.clamp(1-distance/24,.18,.9):.12);
  }
  function danger(dt:number){
    threat=0;
    if(story.stage==='wait'){
      world.figure.visible=true;
      if(stageTime<7){world.figure.position.set(5.28,0,2.15);world.figure.lookAt(camera.position.x,0,camera.position.z);}
      else followEnemy({x:4,z:-5.5},1.3,dt);
      if(stageTime>1.2&&voiceBeat===0){voiceBeat=1;ghostVoice('where',true);}
      if(stageTime>4.5&&voiceBeat===1){voiceBeat=2;audio.sound('knock',.8,.6);ghostVoice('come',true);}
      if(stageTime>9&&voiceBeat===2){voiceBeat=3;ghostVoice('here',true);}
      if(stageTime>7&&scriptBeat===0){scriptBeat=1;say('발소리가 멀어진다. 아직 기다려. 욕실 문이 열리는 소리가 난다.',6);}
      if(stageTime>16&&Math.hypot(world.figure.position.x-4,world.figure.position.z+5.5)<.5){advance('survived');say('욕실에서 수도꼭지가 돌아갔다.\n지금이다. 장롱에서 나와 열린 현관으로!',8);}
    }else if(story.stage==='escape'){
      world.figure.visible=true;
      if(stageTime<12)followEnemy({x:4,z:-5.5},1.4,dt);
      else{hunt(2.65,dt);if(scriptBeat===0){scriptBeat=1;say('수돗물이 멎었다. 그것이 다시 나오고 있다!',5);audio.sound('slam');ghostVoice('found',true);}}
    }else if(story.stage==='hide'){world.figure.visible=true;followEnemy(camera.position,stageTime<4?1.2:1.8,dt);threat=Math.min(.8,stageTime/15);}
    else if(area==='landing'){if(areaTime>4.5)hunt(2.5,dt);}
    else if(story.stage==='corridor_run'){world.figure.visible=true;if(stageTime>3.2)hunt(3.15,dt);threat=Math.max(.25,threat);}
    else if(area==='stairs'){if(areaTime>5)hunt(1.65,dt);}
    else if(area==='office'){if(areaTime>6)hunt(1.8,dt);}
    else if(story.stage==='parking_run'){
      world.figure.visible=true;
      if(stageTime<32)followEnemy({x:-22.5,z:30},2.8,dt);else hunt(3.05,dt);
      threat=Math.max(threat,stageTime<32?.18:.35);
      if(stageTime>32&&scriptBeat===0){scriptBeat=1;say('경보 소리가 끊겼다.\n그것이 다시 나를 찾고 있다!',5);ghostVoice('where',true);}
    }else if(area==='parking')hunt(2.65,dt);
    if(chaseStages.includes(story.stage)&&!story.hidden){
      const p=world.figure.position,distance=Math.hypot(p.x-camera.position.x,p.z-camera.position.z);
      const safe=story.stage==='hide'?stageTime<2.5:story.stage==='escape'?stageTime<12:area==='landing'?areaTime<4.5:area==='corridor'?stageTime<3.2:area==='stairs'?areaTime<5:area==='office'?areaTime<6:areaTime<3;
      if(!safe&&distance<.67&&Math.abs(p.y+1.25-camera.position.y)<1.2&&hasLineOfSight(camera.position,{x:p.x,y:p.y+1.4,z:p.z},world.solids))advance('caught');
    }
    if(world.figure.visible){
      const p=world.figure.position,distance=Math.hypot(p.x-camera.position.x,p.z-camera.position.z),travel=Math.hypot(p.x-lastGhostPosition.x,p.z-lastGhostPosition.z);
      const before=Math.floor(walkPhase/Math.PI);walkPhase+=Math.min(travel,.3)*Math.PI*2/1.7;ghostMotion=T.MathUtils.clamp(travel/Math.max(dt,.001)/2.5,0,1);lastGhostPosition.copy(p);
      const pan=T.MathUtils.clamp(((p.x-camera.position.x)*Math.cos(yaw)-(p.z-camera.position.z)*Math.sin(yaw))/Math.max(1,distance),-1,1),level=Math.min(1,4/Math.max(1,distance));
      if(Math.floor(walkPhase/Math.PI)!==before){audio.sound('step',pan,level*1.2);if(before%2===0)audio.sound('drag',pan,level*.6);}
      if(distance<8&&elapsed-lastBreath>4.1){audio.sound('breath',pan,level);lastBreath=elapsed;}
    }
  }
  function scripted(dt:number){
    if(story.stage==='tv'&&stageTime>=7){
      advance('blackout');audio.setTV(false);audio.sound('slam',0,.55);torch=true;keys.clear();camera.position.set(-5.05,1.65,7.35);yaw=-.2;pitch=0;chapterUntil=elapsed+3;
      say('툭. TV와 조명이 동시에 꺼졌다.\n손전등을 집어 들었다. 다용도실 차단기를 확인하자.',9);
    }
    if(story.stage==='listen'){
      if(stageTime>1.2&&scriptBeat===0){scriptBeat=1;audio.sound('drag',-.7);ghostVoice('cry',true);}
      if(stageTime>=2.8){advance('heard');world.figure.position.set(0,0,-3);world.figure.visible=true;audio.sound('dread',-.7);say('라디오는 꺼져 있다. 소리는 복도에서 난다.\n무언가 바닥을 끌며 다가온다. 침실 장롱에 숨어!',8);}
    }
    if(area!=='lift'&&elapsed-lastDrip>7.8){audio.sound('drip',Math.sin(elapsed*.37)*.8,area==='stairs'||area==='parking'?.8:.35);lastDrip=elapsed;}
    if(story.stage==='lift_wait'){
      if(stageTime>2.5&&scriptBeat===0){scriptBeat=1;audio.sound('knock',.9);say('뒤에서 문이 열리는 소리.\n엘리베이터는 아직 오지 않았다.',4);}
      if(stageTime>6){advance('arrived');audio.sound('chime');say('문이 열렸다. 바로 들어가자.',5);}
    }
    if(story.stage==='descent'){
      if(elapsed-lastSound>1.8){audio.sound('motor');lastSound=elapsed;}
      if(stageTime>10&&scriptBeat===0){scriptBeat=1;say('27 … 26 … 25 …\n문틈으로 누군가의 손가락이 지나갔다.',6);}
      if(stageTime>=16){advance('stopped');audio.sound('slam');audio.sound('dread');say('24층. 엘리베이터가 멈췄다. 호출 버튼도 먹통이다.\n문 가까이에서 E를 길게 눌러 벌려야 한다.',10);}
    }
    if(story.stage==='pry'){
      const pressed=holding||keys.has('KeyE')||keys.has('Space');
      if(pressed&&hover?.id==='pry'){
        holdProgress=Math.min(1,holdProgress+dt/3);
        if(elapsed-lastSound>.4){audio.sound('metal');lastSound=elapsed;}
        if(holdProgress>=1){advance('pry');holding=false;keys.delete('KeyE');keys.delete('Space');audio.sound('slam');say(dialogue.pry!,7);}
      }else holdProgress=Math.max(0,holdProgress-dt*.7);
    }
    if(story.stage==='office_tape'){
      const display=Math.floor(stageTime)%4<2?'2803号室 · LIVE 03:17':'押入れ / 動体検知';if(display!==lastDisplay){world.setDisplay?.(display);lastDisplay=display;}
    }
    if(story.stage==='parking_run'&&stageTime<32&&elapsed-lastSound>1.4){audio.sound('alarm',-.6);lastSound=elapsed;}
    if((story.stage==='phone'||story.stage==='radio')&&elapsed-lastSound>(story.stage==='phone'?8:2.5)){audio.sound('phone',story.stage==='phone'?-.65:.7);lastSound=elapsed;}
    if(story.stage==='shoes'&&stageTime>2&&scriptBeat===0){scriptBeat=1;audio.sound('knock',-.6);}
  }
  function renderWorld(dt:number){
    const time=started?elapsed:performance.now()/1000;
    if(world.figure.visible)animateGhost(world.figure,time,ghostMotion,threat,reducedMotion,walkPhase);
    camera.rotation.set(pitch,yaw,story.stage==='pry'&&stageTime<.7?Math.sin(stageTime*48)*.022:0,'YXZ');camera.updateMatrixWorld();
    flashlight.position.copy(camera.position).add(new T.Vector3(.11,-.13,0).applyQuaternion(camera.quaternion));camera.getWorldDirection(direction);flashlight.target.position.copy(camera.position).addScaledVector(direction,6);flashlight.intensity=torch&&!story.hidden?42:0;fill.position.copy(camera.position);fill.intensity=story.hidden?.2:.65;
    const powered=story.stage==='tv';world.shoes.visible=area==='apartment'&&!['tv','phone','power'].includes(story.stage);
    if(area==='apartment'){ambient.intensity=powered?.7:.2;world.setTV?.(started&&story.stage==='tv',time);}
    for(let i=0;i<world.lamps.length;i++){
      const base=area==='apartment'?(powered?6:0):area==='lift'&&['pry','lift_exit'].includes(story.stage)?1:area==='corridor'?4.2:7;
      world.lamps[i].intensity=base*(i%3===1?.76+Math.sin(time*11)*.16:1);
      const bulb=world.lamps[i].userData.bulb as T.MeshStandardMaterial|undefined;if(bulb)bulb.emissiveIntensity=powered?.35:0;
      if(area==='parking'&&story.stage==='parking_run'&&stageTime<32&&i%3===0){world.lamps[i].color.set('#e64a29');world.lamps[i].intensity=3+Math.sin(time*7)*2;}
    }
    world.radioLight.intensity=story.stage==='radio'?1.5:0;world.phoneGlow.intensity=story.stage==='phone'?.8:0;
    if(world.liftDoors){
      const desired=['lift_enter','lift_exit'].includes(story.stage)?1:story.stage==='pry'?holdProgress*.28:0;
      if(!paused)doorOpen=T.MathUtils.damp(doorOpen,desired,2.6,dt);
      world.liftDoors.left.position.x=-.48-doorOpen*.88;world.liftDoors.right.position.x=.48+doorOpen*.88;
      const display=story.stage==='lift_wait'?String(Math.min(28,24+Math.floor(stageTime))):`${getLiftFloor()}${story.stage==='descent'?' ↓':story.stage==='pry'?' —':''}`;
      if(display!==lastDisplay){world.setDisplay?.(display);lastDisplay=display;}
    }
  }
  function frame(ms:number){
    if(disposed)return;frameId=requestAnimationFrame(frame);const dt=Math.min((ms-lastFrame)/1000||0,.05);lastFrame=ms;
    if(!started){camera.position.set(.1,1.63,7.8);yaw=.1+Math.sin(ms*.0001)*.04;pitch=-.015;}
    else if(!paused&&!document.hidden&&story.stage!=='ended'){
      elapsed+=dt;stageTime+=dt;areaTime+=dt;runningNoise=false;
      if(!story.hidden&&story.stage!=='tv'){
        if(keys.has('ArrowLeft'))yaw+=dt*1.55;if(keys.has('ArrowRight'))yaw-=dt*1.55;
        const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
        const running=!crouched&&(keys.has('ShiftLeft')||keys.has('ShiftRight')),speed=(crouched?1.25:running?3.5:2)*dt/(Math.hypot(forward,side)||1);
        const px=camera.position.x,pz=camera.position.z;
        move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);
        const moving=Math.hypot(camera.position.x-px,camera.position.z-pz)>.001;
        runningNoise=moving&&running;
        camera.position.y=world.heightAt(camera.position.x,camera.position.z)+(crouched?1:1.65)+(settings.bob&&moving?Math.sin(elapsed*(running?13:9))*.018:0);
        if(moving&&elapsed-lastStep>(running?.32:.48)){audio.sound('step',Math.sin(elapsed*3)*.2);lastStep=elapsed;}
      }
      camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();findTarget();scripted(dt);danger(dt);
      if(message&&elapsed>messageUntil)message='';if(whisper&&elapsed>whisperUntil)whisper='';
    }
    renderWorld(dt);
    if(started&&!paused&&story.stage!=='ended')findTarget();
    if(started&&!paused&&elapsed-lastEmit>.09){lastEmit=elapsed;emit();}
    renderer.render(scene,camera);
  }
  frameId=requestAnimationFrame(frame);emit();
  function crouch(){if(!started||paused||story.hidden||story.stage==='tv'||story.stage==='ended')return;crouched=!crouched;emit();}
  function configure(next:Partial<Settings>){settings={...settings,...next};audio.setVolume(settings.volume);renderer.toneMappingExposure=settings.brightness;}
  return {start,pause,interact,snapshot,configure,crouch,hold(active:boolean){if(!paused)holding=active;},torch(){if(paused||story.stage==='ended'||story.stage==='tv')return;torch=!torch;emit();},key(code:string,down:boolean){if(paused||story.stage==='ended')return;if(down)keys.add(code);else keys.delete(code);},dispose(){
    disposed=true;cancelAnimationFrame(frameId);observer.disconnect();audio.dispose();if(document.pointerLockElement===canvas)document.exitPointerLock();
    document.removeEventListener('keydown',keydown);document.removeEventListener('keyup',keyup);document.removeEventListener('pointermove',pointermove);document.removeEventListener('pointerup',pointerup);document.removeEventListener('pointerlockchange',lockchange);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',blur);canvas.removeEventListener('pointerdown',pointerdown);
    disposeWorld(world.root);flashlight.shadow.map?.dispose();renderer.dispose();
  }};
}
export type Game=ReturnType<typeof createGame>;
