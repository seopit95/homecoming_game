import * as T from 'three';
import {buildWorld,canStandAt,hasLineOfSight,disposeWorld,type Target} from './world.ts';
import {HorrorAudio} from './audio.ts';
import {initialStory,checkpoint,transition,objectives,areaFor,chapters,chaseStages,type Story,type Action,type Area} from './story.ts';
import {findPath,type Point} from './navigation.ts';

export type GameView={started:boolean;paused:boolean;story:Story;prompt:string;message:string;objective:string;location:string;floor:string;chapter:string;chapterNumber:string;chapterCard:boolean;flashlight:boolean;threat:number;elapsed:number;holdProgress:number;holding:boolean;liftFloor:number;checkpointLabel:string};
export type Settings={volume:number;brightness:number;sensitivity:number;bob:boolean};

export function createGame(canvas:HTMLCanvasElement,onChange:(view:GameView)=>void,onError:(error:string)=>void){
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const scene=new T.Scene();scene.background=new T.Color('#080e0d');scene.fog=new T.FogExp2('#101916',.025);
  const ambient=new T.HemisphereLight('#a8b7b5','#292b1c',.55);scene.add(ambient);
  const camera=new T.PerspectiveCamera(68,1,.06,85);camera.rotation.order='YXZ';
  let area:Area='apartment',world=buildWorld(scene);const audio=new HorrorAudio();
  const flashlight=new T.SpotLight('#e6e5cf',36,23,Math.PI/6,.72,1.6);flashlight.castShadow=true;flashlight.shadow.mapSize.set(1024,1024);flashlight.shadow.bias=-.0002;
  scene.add(flashlight,flashlight.target);const fill=new T.PointLight('#bfd0be',.7,3.5);scene.add(fill);
  let story=initialStory(),started=false,paused=false,disposed=false,torch=true,elapsed=0,yaw=0,pitch=0,frameId=0;
  let message='',messageUntil=0,lastFrame=0,lastEmit=0,lastStep=0,stageTime=0,lastEnemyStep=0,lastSound=0,chapterUntil=0;
  let hover:Target|undefined,dragging=false,previousX=0,previousY=0,holdProgress=0,holding=false,doorOpen=0,lastDisplay='',threat=0;
  let enemyPath:Point[]=[],repathAt=0,scriptBeat=0;
  const hiddenPosition=new T.Vector3(),direction=new T.Vector3(),delta=new T.Vector3();
  let settings:Settings={volume:.42,brightness:1.1,sensitivity:1,bob:false};
  const keys=new Set<string>();
  const getLiftFloor=()=>story.stage==='descent'?Math.max(24,28-Math.floor(stageTime/4)):['pry','lift_exit'].includes(story.stage)?24:28;
  function location(){
    if(area==='apartment')return camera.position.x< -1.6?(camera.position.z<0?'다용도실':'거실'):camera.position.x>1.6?(camera.position.z<0?'욕실':'침실'):'집 안 복도';
    if(area==='office')return camera.position.x< -1.6?(camera.position.z< -1.5?'문서 보관실':'야간 관리실'):camera.position.x>1.6?'전기실':'관리실 복도';
    return {landing:'엘리베이터 홀',lift:'엘리베이터',corridor:'정전된 복도',stairs:'비상계단',parking:'지하 주차장'}[area];
  }
  function snapshot():GameView{
    const chapter=chapters[area];
    return {started,paused,story:{...story,notes:[...story.notes]},prompt:story.hidden?'장롱에서 나오기':hover?.label||'',message,objective:objectives[story.stage],location:location(),floor:area==='lift'?`${getLiftFloor()}F`:chapter.floor,chapter:chapter.title,chapterNumber:chapter.number,chapterCard:started&&elapsed<chapterUntil,flashlight:torch,threat,elapsed,holdProgress,holding:holding||keys.has('KeyE'),liftFloor:getLiftFloor(),checkpointLabel:story.resume==='lift_exit'?'24층 엘리베이터부터 다시':story.resume==='parking_alarm'?'주차장 경보기부터 다시':'28층 라디오 장면부터 다시'};
  }
  const emit=()=>onChange(snapshot());
  function say(text:string,seconds=7){message=text;messageUntil=elapsed+seconds;emit();}
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
    hover=undefined;holdProgress=0;holding=false;doorOpen=0;lastDisplay='';enemyPath=[];repathAt=0;scriptBeat=0;threat=0;lastEnemyStep=elapsed;lastSound=elapsed;
    chapterUntil=elapsed+4.5;ambient.intensity=area==='parking'?.42:.55;
    (scene.fog as T.FogExp2).density=area==='corridor'?.04:area==='parking'?.032:.025;
    if(area==='corridor'){world.figure.visible=true;world.figure.position.set(-.85,0,22.7);world.figure.lookAt(camera.position.x,1,camera.position.z);chapterUntil=elapsed+1.7;}
  }
  function advance(action:Action){
    const next=transition(story,action);if(next===story)return false;
    story=next;stageTime=0;scriptBeat=0;holdProgress=0;enemyPath=[];repathAt=0;
    if(story.stage==='ended'){keys.clear();holding=false;hover=undefined;threat=0;if(document.pointerLockElement===canvas)document.exitPointerLock();audio.sound('dread');emit();return true;}
    const nextArea=areaFor(story);if(nextArea!==area)loadArea(nextArea);
    emit();return true;
  }
  function start(retry=false){
    try{audio.start();audio.setVolume(settings.volume);}catch{onError('소리를 시작하지 못했습니다. 소리 없이도 플레이할 수 있습니다.');}
    story=retry?checkpoint(story):initialStory();elapsed=retry?elapsed:0;started=true;paused=false;stageTime=0;torch=true;message='';keys.clear();dragging=false;
    lastStep=elapsed;lastEmit=elapsed-1;loadArea(areaFor(story));
    if(retry&&story.stage==='radio'){camera.position.set(2.1,1.65,5);yaw=-.3;}
    if(retry&&story.stage==='lift_exit')doorOpen=1;
    if(retry&&story.stage==='parking_alarm'){camera.position.set(-11.8,1.65,19);yaw=.4;}
    say(retry?story.stage==='lift_exit'?'문은 열려 있다. 밖으로 나가면 곧바로 달려야 한다.':story.stage==='parking_alarm'?'열쇠는 챙겼다. 붉은 경보기를 울리고 출구로 달리자.':'28층. 라디오가 다시 켜져 있다. 장롱 위치를 기억하자.':'새벽 03:17. 이사 온 지 사흘째, 28층 집의 전기가 나갔다.\n거실에서 휴대전화가 울린다.',9);lock();emit();
  }
  const dialogue:Partial<Record<Action,string>>={
    phone:'발신자 표시 제한\n「2803호 맞죠? 차단기를 올려요. 현관 신발은 건드리지 말고.」',
    breaker:'불이 돌아왔다.\n현관에서 젖은 무언가가 바닥에 떨어졌다.',
    shoes:'젖은 신발. 내 것이 아니다.\n발자국은 집 안으로만 나 있다. 침실에서 라디오가 켜졌다.',
    radio:'「엄마, 이 사람도 장롱에 숨을 거야?」\n복도에서 발소리가 다가온다. 침실 장롱으로!',
    door:'문을 닫았다. 안쪽에서 손잡이를 잡는 소리가 났다.\n여긴 28층이다. 엘리베이터부터 타자.',
    call:'28 … 27 …\n등 뒤의 2803호 문이 조금씩 열리고 있다.',
    enter:'문이 닫힌다.\n오른쪽 조작반에서 1층을 누르자.',
    panel:'1층. 제발, 멈추지 마.\n천장에서 내 것보다 한 박자 늦은 숨소리가 들린다.',
    pry:'문이 벌어졌다. 24층 복도가 보인다.\n밖으로 나갈 수 있다.',
    leave_lift:'바로 옆에 있다.\n뛰어! 복도 끝 녹색 비상계단 문으로!',
    stairs:'비상문을 닫자, 손톱 긁는 소리가 따라 내려온다.\n아래층으로 가야 한다.',
    down:'한 층을 내려왔다.\n그런데 벽에는 다시 「23F」라고 쓰여 있다.',
    stair_note:'「같은 층이 두 번 보이면 더 내려가지 마세요.\n한 층 올라가면 관리실로 연결됩니다.」',
    up:'위로 한 층 올라왔는데, 17층이다.\n도면에는 없던 관리실. 책상 위에 누군가의 기록이 있다.',
    record:'2012년, 03:17. 2803호에서 아이가 사라졌다.\n「그것은 경보를 따라 움직인다. 열쇠는 CCTV 옆에.」\nCCTV부터 켜야 한다. 서고에 예비 퓨즈가 있다.',
    fuse:'예비 퓨즈를 챙겼다.\n오른쪽 전기실에 꽂으면 CCTV가 켜질 것이다.',
    security_power:'CCTV 전원이 돌아왔다.\n모니터에서 2803호가 잡힌다. 장롱 문이 열리고 있다.',
    monitor:'장롱에서 나온 것은 … 나였다.\n화면에 「귀가 확인 / 아직 한 명 남음」이 떴다.\n비상 열쇠를 챙겼다. 지하로 내려가자.',
    service_exit:'계단 끝에서 차가운 바람이 불었다. 지하 1층.\n주차장 건너편 녹색 보행자 출구가 보인다.',
    exit:'자물쇠는 풀렸다. 그런데 누군가 반대편에서 문을 붙잡고 있다.\n입구 쪽 붉은 경보기를 울려 그것을 유인하자.',
    alarm:'경보가 울린다. 그것이 고개를 돌렸다.\n지금이야. 차들 사이로 빠져나가 출구까지 달려!',
  };
  function interact(){
    if(!started||paused||story.stage==='ended')return;
    findTarget();const action:Action|undefined=story.hidden?'closet':hover?.id;if(!action)return;
    if(action==='pry'){say('문을 바라본 채 E 또는 화면의 문 벌리기 버튼을 길게 누르세요.',4);return;}
    const wasHidden=story.hidden;
    if(area==='stairs'&&action==='down'&&story.stage!=='stairs_loop'){
      camera.position.copy(world.spawn);yaw=Math.PI;pitch=0;audio.sound('dread');say('또 23층이다.\n아래로 내려가는 발소리는, 내 발소리가 아니었다.',7);return;
    }
    if(!advance(action)){
      const responses:Partial<Record<Action,string>>={door:'문이 안쪽에서 잠겼다. 먼저 집 안에서 울리는 소리를 확인하자.',closet:'장롱 안에 몸을 숨길 수 있다.',up:'문이 움직이지 않는다. 먼저 아래쪽 계단을 확인하자.',fuse:'먼저 관리실 책상의 근무일지를 살펴보자.',security_power:'퓨즈가 빠져 있다. 서고의 예비 부품을 찾아야 한다.',monitor:'화면이 꺼져 있다. 기록과 전원을 확인해야 한다.',service_exit:'비상 열쇠가 필요하다. CCTV 옆 열쇠함이 보인다.'};
      say(responses[action]||'이미 확인했다. 다음 단서를 찾아야 한다.',4);return;
    }
    audio.sound(action==='door'||action==='stairs'||action==='service_exit'?'slam':'click');
    if(action==='closet'){
      if(!wasHidden){hiddenPosition.copy(camera.position);camera.position.set(5.78,1.48,2.15);yaw=Math.PI/2;pitch=0;say('숨을 죽인다. 발소리가 다른 방으로 갈 때까지 기다려야 한다.',6);}
      else{camera.position.copy(hiddenPosition);camera.position.y=1.65;say(story.stage==='escape'?'귀신이 욕실로 갔다. 지금 현관으로 달리자.':'아직 장롱 앞에 있다!',5);}
    }else if(dialogue[action]&&story.ending===null)say(dialogue[action]!,['record','monitor','phone'].includes(action)?12:8);
    if(action==='radio'){world.figure.position.set(0,0,-3);world.figure.visible=true;audio.sound('dread');}
    if(action==='leave_lift'){audio.sound('slam',-.8);audio.sound('dread',-.8);}
    if(action==='down'){camera.position.copy(world.spawn);yaw=Math.PI;pitch=0;audio.sound('dread');}
    if(action==='fuse'&&hover)hover.mesh.visible=false;
    if(action==='security_power'){audio.sound('slam',.8);world.figure.position.set(0,0,5);world.figure.visible=true;}
    if(action==='monitor'){world.figure.visible=false;world.setDisplay?.('귀가 확인 / 1명 남음');}
    if(action==='alarm'){audio.sound('alarm',-.8);chapterUntil=0;}
    emit();
  }
  function keydown(e:KeyboardEvent){
    if(!started)return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyF','Escape','KeyP','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
    if(e.code==='Escape'||e.code==='KeyP'){if(!e.repeat)pause(!paused);return;}
    if(paused||story.stage==='ended')return;keys.add(e.code);if(e.repeat)return;
    if(e.code==='KeyE'||e.code==='Space'){if(story.stage!=='pry')interact();}
    if(e.code==='KeyF'){torch=!torch;audio.sound('click');emit();}
  }
  const keyup=(e:KeyboardEvent)=>keys.delete(e.code);
  function pointerdown(e:PointerEvent){if(!started||paused||story.stage==='ended')return;dragging=true;previousX=e.clientX;previousY=e.clientY;if(e.pointerType==='touch')canvas.setPointerCapture(e.pointerId);else if(document.pointerLockElement!==canvas)lock();}
  function pointermove(e:PointerEvent){
    if(!started||paused||story.hidden||story.stage==='ended')return;let dx=0,dy=0;
    if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY;}else if(dragging){dx=e.clientX-previousX;dy=e.clientY-previousY;previousX=e.clientX;previousY=e.clientY;}else return;
    yaw-=dx*.0021*settings.sensitivity;pitch=T.MathUtils.clamp(pitch-dy*.0021*settings.sensitivity,-1.25,1.25);
  }
  const pointerup=()=>{dragging=false;holding=false;};
  function lockchange(){if(document.pointerLockElement!==canvas&&started&&!paused&&story.stage!=='ended')pause(true);}
  function hidden(){if(document.hidden)pause(true);}
  function blur(){keys.clear();holding=false;if(started&&!paused)pause(true);}
  document.addEventListener('keydown',keydown);document.addEventListener('keyup',keyup);document.addEventListener('pointermove',pointermove);document.addEventListener('pointerup',pointerup);document.addEventListener('pointerlockchange',lockchange);document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',blur);canvas.addEventListener('pointerdown',pointerdown);
  function findTarget(){
    hover=undefined;if(story.hidden)return;camera.getWorldDirection(direction);
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
    world.figure.lookAt(target.x,1,target.z);
  }
  function danger(dt:number){
    threat=0;
    if(story.stage==='wait'){
      world.figure.visible=true;
      if(stageTime<7){world.figure.position.set(5.28,0,2.15);world.figure.lookAt(camera.position.x,1,camera.position.z);}
      else followEnemy({x:4,z:-5.5},1.3,dt);
      if(stageTime>7&&scriptBeat===0){scriptBeat=1;say('발소리가 멀어진다. 아직 기다려. 욕실 문이 열리는 소리가 난다.',6);}
      if(stageTime>16&&Math.hypot(world.figure.position.x-4,world.figure.position.z+5.5)<.5){advance('survived');say('욕실에서 수도꼭지가 돌아갔다.\n지금이다. 장롱에서 나와 현관으로 달리자.',8);}
    }else if(story.stage==='escape'){
      world.figure.visible=true;
      if(stageTime<22)followEnemy({x:4,z:-5.5},1.4,dt);
      else{followEnemy(camera.position,2.1,dt);if(scriptBeat===0){scriptBeat=1;say('수돗물이 멎었다. 그것이 다시 나오고 있다!',5);audio.sound('slam');}}
      if(stageTime>22)threat=.45;
    }else if(story.stage==='hide'){world.figure.visible=true;followEnemy(camera.position,stageTime<4?1:1.5,dt);threat=Math.min(.8,stageTime/15);}
    else if(story.stage==='corridor_run'){world.figure.visible=true;if(stageTime>3.2)followEnemy(camera.position,2.65,dt);threat=.45;}
    else if(story.stage==='parking_run'){
      world.figure.visible=true;followEnemy(stageTime<20?{x:-12.5,z:16}:camera.position,stageTime<20?2.8:2.9,dt);threat=stageTime<20?.22:.55;
      if(stageTime>20&&scriptBeat===0){scriptBeat=1;say('경보 소리가 끊겼다.\n그것이 다시 나를 보고 있다!',5);audio.sound('dread');}
    }
    if(['hide','wait','escape','corridor_run','parking_run'].includes(story.stage)){
      const distance=Math.hypot(world.figure.position.x-camera.position.x,world.figure.position.z-camera.position.z);
      if(elapsed-lastEnemyStep>(story.stage==='wait'?.9:.58)){audio.sound(story.stage==='wait'&&stageTime>3&&stageTime<5?'knock':'step',T.MathUtils.clamp((world.figure.position.x-camera.position.x)*.2,-1,1),Math.min(1,3/Math.max(1,distance)));lastEnemyStep=elapsed;}
      const grace=story.stage==='corridor_run'?3.2:story.stage==='hide'?2.5:story.stage==='escape'?22:2;
      if(chaseStages.includes(story.stage)&&!story.hidden&&stageTime>grace){threat=Math.max(threat,T.MathUtils.clamp(1-distance/8,0,1));if(distance<.67&&hasLineOfSight(camera.position,{x:world.figure.position.x,y:1.65,z:world.figure.position.z},world.solids))advance('caught');}
    }
  }
  function scripted(dt:number){
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
      if(stageTime>3)world.figure.visible=false;
      const display=Math.floor(stageTime)%4<2?'2803호 · LIVE 03:17':'장롱 안 / 움직임 감지';if(display!==lastDisplay){world.setDisplay?.(display);lastDisplay=display;}
    }
    if(story.stage==='parking_run'&&stageTime<20&&elapsed-lastSound>1.4){audio.sound('alarm',-.6);lastSound=elapsed;}
    if((story.stage==='phone'||story.stage==='radio')&&elapsed-lastSound>(story.stage==='phone'?8:2.5)){audio.sound('phone',story.stage==='phone'?-.65:.7);lastSound=elapsed;}
    if(story.stage==='shoes'&&stageTime>2&&scriptBeat===0){scriptBeat=1;audio.sound('knock',-.6);}
  }
  function renderWorld(dt:number){
    const time=started?elapsed:performance.now()/1000;
    camera.rotation.set(pitch,yaw,story.stage==='pry'&&stageTime<.7?Math.sin(stageTime*48)*.022:0,'YXZ');camera.updateMatrixWorld();
    flashlight.position.copy(camera.position).add(new T.Vector3(.11,-.13,0).applyQuaternion(camera.quaternion));camera.getWorldDirection(direction);flashlight.target.position.copy(camera.position).addScaledVector(direction,6);flashlight.intensity=torch&&!story.hidden?36:0;fill.position.copy(camera.position);fill.intensity=story.hidden?.18:.8;
    const powered=['shoes','radio'].includes(story.stage);world.shoes.visible=area==='apartment'&&!['phone','power'].includes(story.stage);
    for(let i=0;i<world.lamps.length;i++){
      const base=area==='apartment'?(powered?5:.8):area==='lift'&&['pry','lift_exit'].includes(story.stage)?1:area==='corridor'?3.5:6;
      world.lamps[i].intensity=base*(i%3===1?.76+Math.sin(time*11)*.16:1);
      if(area==='parking'&&story.stage==='parking_run'&&stageTime<20&&i%3===0){world.lamps[i].color.set('#e64a29');world.lamps[i].intensity=3+Math.sin(time*7)*2;}
    }
    world.radioLight.intensity=story.stage==='radio'?1.5:.16;world.phoneGlow.intensity=story.stage==='phone'?.8:.1;
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
    else if(!paused&&story.stage!=='ended'){
      elapsed+=dt;stageTime+=dt;
      if(!story.hidden){
        if(keys.has('ArrowLeft'))yaw+=dt*1.55;if(keys.has('ArrowRight'))yaw-=dt*1.55;
        const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
        const running=keys.has('ShiftLeft')||keys.has('ShiftRight'),speed=(running?3.5:2)*dt/(Math.hypot(forward,side)||1);
        const px=camera.position.x,pz=camera.position.z;
        move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);
        const moving=Math.hypot(camera.position.x-px,camera.position.z-pz)>.001;
        camera.position.y=world.heightAt(camera.position.x,camera.position.z)+1.65+(settings.bob&&moving?Math.sin(elapsed*(running?13:9))*.018:0);
        if(moving&&elapsed-lastStep>(running?.32:.48)){audio.sound('step',Math.sin(elapsed*3)*.2);lastStep=elapsed;}
      }
      camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();findTarget();scripted(dt);danger(dt);
      if(message&&elapsed>messageUntil)message='';
    }
    renderWorld(dt);
    if(started&&!paused&&story.stage!=='ended')findTarget();
    if(started&&!paused&&elapsed-lastEmit>.09){lastEmit=elapsed;emit();}
    renderer.render(scene,camera);
  }
  frameId=requestAnimationFrame(frame);emit();
  function configure(next:Partial<Settings>){settings={...settings,...next};audio.setVolume(settings.volume);renderer.toneMappingExposure=settings.brightness;}
  return {start,pause,interact,snapshot,configure,hold(active:boolean){if(!paused)holding=active;},torch(){if(paused||story.stage==='ended')return;torch=!torch;emit();},key(code:string,down:boolean){if(paused||story.stage==='ended')return;if(down)keys.add(code);else keys.delete(code);},dispose(){
    disposed=true;cancelAnimationFrame(frameId);observer.disconnect();audio.dispose();if(document.pointerLockElement===canvas)document.exitPointerLock();
    document.removeEventListener('keydown',keydown);document.removeEventListener('keyup',keyup);document.removeEventListener('pointermove',pointermove);document.removeEventListener('pointerup',pointerup);document.removeEventListener('pointerlockchange',lockchange);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',blur);canvas.removeEventListener('pointerdown',pointerdown);
    disposeWorld(world.root);flashlight.shadow.map?.dispose();renderer.dispose();
  }};
}
export type Game=ReturnType<typeof createGame>;
