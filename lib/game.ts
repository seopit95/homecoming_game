import * as T from 'three';
import {buildWorld,canStandAt,hasLineOfSight,disposeWorld,type Target} from './world.ts';
import {animateGhost,animateGhostAttack} from './ghost.ts';
export {prepareVisuals} from './materials.ts';
import {HorrorAudio,type GhostLine} from './audio.ts';
import {initialStory,checkpoint,transition,objectives,areaFor,chapters,chaseStages,opening,isMemory,type Story,type Action,type Area} from './story.ts';
import {findPath,type Point} from './navigation.ts';
import {apartment as home,apartmentScale as S} from './apartment-layout.ts';
import {buildRoad} from './prologue.ts';
import {landing} from './building.ts';
import {perceives} from './perception.ts';
import {defaultSettings,normalizeSettings,readSettings,readProgress,writeProgress,writeSettings,PROGRESS_KEY,keyLabel,type Settings} from './preferences.ts';
export type {Settings} from './preferences.ts';

export type GameView={started:boolean;memoryFade:number;memoryLabel:string;memoryText:string;deathProgress:number;paused:boolean;crouched:boolean;whisper:string;story:Story;prompt:string;message:string;objective:string;location:string;floor:string;chapter:string;chapterNumber:string;chapterCard:boolean;flashlight:boolean;threat:number;elapsed:number;holdProgress:number;holding:boolean;liftFloor:number;checkpointLabel:string;canContinue:boolean;savedLocation:string;saveNotice:string;interactKey:string;clock:string;noise:number};


export function createGame(canvas:HTMLCanvasElement,onChange:(view:GameView)=>void,onError:(error:string)=>void){
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const scene=new T.Scene();scene.background=new T.Color('#080b10');scene.fog=new T.FogExp2('#14191d',.016);
  const ambient=new T.HemisphereLight('#a8b4c4','#302925',.7);scene.add(ambient);
  const camera=new T.PerspectiveCamera(68,1,.06,85);camera.rotation.order='YXZ';
  let road:ReturnType<typeof buildRoad>|null=null;
  let area:Area='apartment',world=buildWorld(scene);const audio=new HorrorAudio();
  const flashlight=new T.SpotLight('#f0e9d9',42,24,Math.PI/7,.83,1.7);flashlight.castShadow=true;flashlight.shadow.mapSize.set(window.matchMedia('(pointer:coarse)').matches?1024:2048,window.matchMedia('(pointer:coarse)').matches?1024:2048);flashlight.shadow.bias=-.0002;
  scene.add(flashlight,flashlight.target);const fill=new T.PointLight('#dadde0',.6,3.5);scene.add(fill);
  let story=initialStory(),started=false,paused=false,disposed=false,torch=true,elapsed=0,yaw=0,pitch=0,frameId=0;
  let message='',messageUntil=0,lastFrame=0,lastEmit=0,lastStep=0,stageTime=0,areaTime=0,lastSound=0,lastBreath=0,lastDrip=0,chapterUntil=0;
  let crouched=false,runningNoise=false,walkPhase=0,whisper='',whisperUntil=0,lastVoice=-20,voiceBeat=0,tracking=false,seenAt=0,patrol=0;
  let lastSeen:Point|null=null;
  let hover:Target|undefined,dragging=false,previousX=0,previousY=0,holdProgress=0,holding=false,doorOpen=0,lastDisplay='',threat=0;
  let enemyPath:Point[]=[],repathAt=0,scriptBeat=0,searchTime=-1;
  let lureUsed=false;let fallTime=-1,noiseRadius=0,saveUntil=0,noiseUntil=0;let saveNotice='';
  let storage:Storage|undefined;try{storage=window.localStorage;}catch{}
  let saved=storage?readProgress(storage):null;
  const deathOrigin=new T.Vector3(),deathDirection=new T.Vector3(),deathFace=new T.Vector3();let deathFloor=0,deathEye=1.65;
  const hiddenPosition=new T.Vector3(),direction=new T.Vector3(),delta=new T.Vector3();
  let settings:Settings=storage?readSettings(storage):normalizeSettings(defaultSettings);renderer.toneMappingExposure=settings.brightness;camera.fov=settings.fov;camera.updateProjectionMatrix();
  const keys=new Set<string>();const lastGhostPosition=new T.Vector3();let ghostMotion=0;const systemReduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;let reducedMotion=systemReduced||settings.reducedMotion;
  const getLiftFloor=()=>story.stage==='descent'?Math.max(24,28-Math.floor(stageTime/4)):['pry','lift_exit'].includes(story.stage)?24:28;
  function location(){
    if(isMemory(story.stage))return story.stage==='sleep'?'사흘 전 · 침실':'사흘 전 · 귀갓길';
    if(area==='apartment')return camera.position.x/S>1.9?(camera.position.z/S>-.5?'침실':camera.position.x/S>4?'욕실':'다용도실'):camera.position.x/S< -2.7&&camera.position.z/S< -2.4?'서재':camera.position.x/S< -2&&camera.position.z/S<0?'주방':camera.position.z/S< -3?'현관':'거실 · 다이닝';
    if(area==='resident')return '미즈노 사에의 집';if(area==='aftermath')return '사흘 전의 횡단보도';
    if(area==='office')return camera.position.x< -1.6?(camera.position.z< -1.5?'문서 보관실':'야간 관리실'):camera.position.x>1.6?'전기실':'관리실 복도';
    return {landing:'28층 · 외부 복도',lift:'엘리베이터',corridor:'정전된 복도',stairs:'비상계단',parking:'지하 주차장'}[area];
  }
  function snapshot():GameView{
    const chapter=chapters[area];
    const retryLabels:Partial<Record<typeof story.stage,string>>={lift_call:'28층 외부 복도부터 다시',lift_exit:'24층 엘리베이터부터 다시',lift_button:'엘리베이터 안에서 다시',stairs_loop:'23층 비상계단부터 다시',resident_entry:'1704호 입구부터 다시',road_exit:'사고 현장부터 다시',office_record:'17층 관리실부터 다시',parking_gate:'지하 주차장 입구부터 다시',parking_alarm:'주차장 경보기부터 다시'};
    return {canContinue:!!saved,savedLocation:saved?chapters[areaFor({...initialStory(),stage:saved.stage})].floor:'',saveNotice:elapsed<saveUntil?saveNotice:'',interactKey:keyLabel(settings.bindings.interact),clock:story.stage==='road_wait'?'03:18':'03:17',noise:noiseRadius/22,started,memoryFade:story.stage==='sleep'?T.MathUtils.smoothstep(stageTime,1.5,5):story.stage==='flee'?T.MathUtils.smoothstep(stageTime,4.5,6):story.stage==='tv'?1-T.MathUtils.smoothstep(stageTime,1.1,2.5):0,memoryLabel:opening[story.stage]?.label||(story.stage==='tv'?'사흘 뒤 · 새벽 03:17':''),memoryText:opening[story.stage]?.text||'',deathProgress:story.stage==='dying'?Math.min(1,stageTime/3.2):0,paused,crouched,whisper,story:{...story,notes:[...story.notes]},prompt:story.hidden?'장롱에서 나오기':hover?.label||'',message,objective:settings.hints?objectives[story.stage]:'',location:location(),floor:area==='lift'?`${getLiftFloor()}F`:chapter.floor,chapter:chapter.title,chapterNumber:chapter.number,chapterCard:started&&elapsed<chapterUntil,flashlight:torch,threat,elapsed,holdProgress,holding:holding||keys.has('KeyE'),liftFloor:getLiftFloor(),checkpointLabel:retryLabels[story.resume]||'28층 라디오 장면부터 다시'};
  }
  const emit=()=>onChange(snapshot());
  function say(text:string,seconds=7){message=text;messageUntil=elapsed+seconds;emit();}
  function ghostVoice(line:GhostLine,force=false){
    if(!force&&elapsed-lastVoice<12)return;
    const dx=world.figure.position.x-camera.position.x,dz=world.figure.position.z-camera.position.z,distance=Math.hypot(dx,dz),pan=T.MathUtils.clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,distance),-1,1);
    const blocked=!hasLineOfSight(camera.position,{x:world.figure.position.x,y:world.figure.position.y+1.4,z:world.figure.position.z},world.solids);audio.voice(line,pan,Math.max(.08,Math.min(1,5/Math.max(1,distance)))*(blocked?.4:1),blocked);lastVoice=elapsed;
    whisper={where:'「어디 있지…?」',here:'「여기 있었는데…」',found:'「찾았다. 놓치지 않을 거야.」',come:'「나오렴…」',cry:'어둠 속에서 여자가 흐느낀다.',scream:'끄아아아아아악!!!',memory:'「거의 다 왔어. 내일 전화할게.」'}[line];whisperUntil=elapsed+(line==='cry'?5:3.5);emit();
  }
  const free=(x:number,z:number,r=.23)=>canStandAt(x,z,world.solids,r,world.bounds);
  function move(dx:number,dz:number){if(free(camera.position.x+dx,camera.position.z))camera.position.x+=dx;if(free(camera.position.x,camera.position.z+dz))camera.position.z+=dz;}
  function resize(){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function lock(){
    if(isMemory(story.stage)||window.matchMedia('(pointer:coarse)').matches)return;
    try{const promise=canvas.requestPointerLock?.();if(promise)promise.catch(()=>say('화면 드래그 또는 ← → 키로 둘러보세요.',5));}catch{say('화면을 드래그해서 둘러보세요.',5);}
  }
  function pause(value=true){
    if(!started||story.stage==='ended')return;paused=value;keys.clear();dragging=false;holding=false;holdProgress=0;
    if(value){audio.pause();if(document.pointerLockElement===canvas)document.exitPointerLock();}else{audio.resume();lock();}emit();
  }
  function loadArea(next:Area){
    if(road){disposeWorld(road.root);road=null;}
    disposeWorld(world.root);area=next;world=buildWorld(scene,area);camera.position.copy(world.spawn);yaw=world.heading;pitch=0;
    hover=undefined;holdProgress=0;holding=false;doorOpen=0;lastDisplay='';enemyPath=[];repathAt=0;scriptBeat=0;threat=0;lastSound=elapsed;lastBreath=elapsed;lastDrip=elapsed;
    areaTime=0;fallTime=-1;lureUsed=false;crouched=false;walkPhase=0;lastSeen=null;tracking=false;seenAt=elapsed;patrol=0;voiceBeat=0;noiseRadius=0;noiseUntil=0;whisper='';lastVoice=elapsed-8;audio.stopVoices();
    chapterUntil=elapsed+4.5;ambient.intensity=area==='parking'?.42:area==='resident'?.16:area==='aftermath'?.24:.5;lastGhostPosition.copy(world.figure.position);ghostMotion=0;
    (scene.fog as T.FogExp2).density=area==='corridor'?.026:area==='parking'?.021:.016;
    if(['landing','corridor','stairs'].includes(area)){world.figure.visible=true;const z=area==='landing'?landing.spawnZ+1.5:area==='corridor'?36.4:area==='stairs'?8.1:15.2;world.figure.position.set(area==='corridor'?.95:0,0,z);world.figure.lookAt(camera.position.x,0,camera.position.z);chapterUntil=elapsed+1.7;}
    if(area==='office'){world.figure.position.set(0,0,15.2);world.figure.visible=false;}
    lastGhostPosition.copy(world.figure.position);
  }
  function persist(){
    if(!storage||isMemory(story.stage)||story.stage==='tv')return;
    const ok=writeProgress(storage,story,elapsed);if(ok)saved=readProgress(storage);
    saveNotice=ok?'이 기기에 진행 상황 저장됨':'저장 공간을 사용할 수 없습니다';saveUntil=elapsed+3;
  }
  function advance(action:Action){
    const next=transition(story,action);if(next===story)return false;
    if(next.stage==='wait'&&story.stage!=='wait'){searchTime=-1;lastSeen=null;tracking=false;}
    story=next;stageTime=0;scriptBeat=0;voiceBeat=0;holdProgress=0;enemyPath=[];repathAt=0;
    if(story.stage==='ended'){if(story.ending==='escaped'){try{storage?.removeItem(PROGRESS_KEY);}catch{}saved=null;}keys.clear();holding=false;hover=undefined;threat=0;audio.stopVoices();whisper='';if(document.pointerLockElement===canvas)document.exitPointerLock();audio.sound('dread');emit();return true;}
    if(story.stage==='dying'){
      keys.clear();holding=false;dragging=false;hover=undefined;message='';whisper='';threat=1;deathOrigin.copy(camera.position);deathFloor=world.heightAt(camera.position.x,camera.position.z);deathEye=camera.position.y-deathFloor;
      deathDirection.copy(world.figure.position).sub(camera.position);deathDirection.y=0;if(deathDirection.lengthSq()<.001)deathDirection.set(-Math.sin(yaw),0,-Math.cos(yaw));deathDirection.normalize();
      world.figure.visible=true;audio.stopVoices();audio.voice('scream',0,1);audio.sound('slam',0,.8);emit();return true;
    }
    const nextArea=areaFor(story);if(nextArea!==area)loadArea(nextArea);
    if(isMemory(story.stage)||story.stage==='tv')openingScene();
    if(story.stage==='road_evidence'){camera.position.set(-.4,1.65,8.6);yaw=0;pitch=0;}
    persist();emit();return true;
  }
  function openingScene(){
    keys.clear();holding=false;dragging=false;hover=undefined;torch=false;chapterUntil=0;message='';
    if(isMemory(story.stage)&&document.pointerLockElement===canvas)document.exitPointerLock();
    if(story.stage==='drive'){road=buildRoad(scene);world.root.visible=false;}
    if(story.stage==='sleep'||story.stage==='tv'){
      if(road){disposeWorld(road.root);road=null;}world.root.visible=true;
    }
    if(story.stage==='tv'){camera.position.set(...home.seat);yaw=Math.PI/2;pitch=.05;audio.setTV(true);say('사고 후 사흘이 지났다. 그날 이후 밤마다 03:17에 눈이 떠진다.\nTV에서는 사흘 전 뺑소니 사고를 보도하고 있었다.',7);}
    if(story.stage==='impact'){audio.sound('slam',0,.8);audio.sound('metal',0,.5);}
    if(story.stage==='flee')audio.sound('motor',0,.8);
    if(story.stage==='sleep'){audio.sound('slam',0,.22);camera.position.set(...home.sleep);yaw=0;pitch=.85;}
  }
  function start(retry:boolean|'continue'=false){
    try{audio.start();audio.setVolume(settings.volume);audio.mix(settings);}catch{onError('소리를 시작하지 못했습니다. 소리 없이도 플레이할 수 있습니다.');}
    if(retry==='continue'&&saved){story={...initialStory(),stage:saved.stage,resume:saved.stage,notes:[...saved.notes]};elapsed=saved.elapsed;}else{story=retry?checkpoint(story):initialStory();elapsed=retry?elapsed:0;}started=true;paused=false;stageTime=0;torch=true;message='';keys.clear();dragging=false;
    lastStep=elapsed;lastEmit=elapsed-1;loadArea(areaFor(story));
    audio.setTV(story.stage==='tv');
    if(isMemory(story.stage)||story.stage==='tv')openingScene();
    if(retry&&story.stage==='power'){camera.position.set(...home.stand);yaw=0;}
    if(retry&&story.stage==='radio'){camera.position.set(...home.radioStart);yaw=Math.PI;}
    if(retry&&story.stage==='lift_exit')doorOpen=1;
    if(retry&&story.stage==='parking_alarm'){camera.position.set(-22.1,1.65,32);yaw=.4;}
    if(retry)say('기억이 이어진다. '+chapters[area].floor,3);lock();emit();
  }
  const dialogue:Partial<Record<Action,string>>={
    phone:'발신자 표시 제한. 수화기에서 빗소리와 와이퍼 소리가 들린다.\n「그날은 안 멈췄잖아. 오늘은 문을 열어.」\n현관에서 젖은 무언가가 떨어졌다.',
    breaker:'차단기를 올려도 불은 돌아오지 않는다. 건물 전체가 정전된 모양이다.\n어둠 속 거실에서 휴대전화가 울린다.',
    shoes:'그날 차 앞에 떨어졌던 검은 신발이다. 도로에 두고 왔는데.\n젖은 발자국이 침실로 이어진다. 라디오가 혼자 켜졌다.',
    radio:'와이퍼 같은 소리가 나던 라디오를 껐다.\n…창밖의 빗소리만 남았다.',
    door:'낡은 외부 복도로 나왔다. 난간 너머로 빗소리가 쏟아진다.\n난간을 때리는 비가 발소리를 삼킨다. 끝에 엘리베이터 불빛이 보인다.',
    call:'28 … 27 …\n아직 멀었다. 뒤를 살피며 거리를 벌려야 한다!',
    enter:'문이 닫힌다.\n오른쪽 조작반에서 1층을 누르자.',
    panel:'1층. 제발, 멈추지 마.\n천장에서 내 것보다 한 박자 늦은 숨소리가 들린다.',
    pry:'문이 벌어졌다. 24층 복도가 보인다.\n밖으로 나갈 수 있다.',
    leave_lift:'바로 옆에 있다.\n중앙 설비실을 피해 좌우 복도로 돌아! 반대편 녹색 비상계단으로!',
    stairs:'비상문을 닫자, 손톱 긁는 소리가 따라 내려온다.\n아래층으로 가야 한다.',
    down:'한 층을 내려왔다.\n그런데 벽에는 다시 「23F」라고 쓰여 있다.',
    stair_note:'「같은 층이 두 번 보이면 더 내려가지 마세요.\n한 층 올라가면 관리실로 연결됩니다.」',
    up:'17층. 열린 문에 1704라고 적혀 있다.\n발소리가 멎었다. 안에서 전화기 불빛이 깜박인다.',
    belongings:'검은 신발 한 짝. 봉투에는 「미즈노 사에」.\n현관에 놓인 우산은 아직 마르지 않았다.',
    portrait:'「다음에는 맑은 날에.」\n내일도 살아 있을 거라 믿고 적은 약속이다.',
    answerphone:'03:16. 「거의 다 왔어. 먼저 자. 내일 전화할게.」\n테이프가 끝난 뒤에도, 젖은 발소리는 계속된다.',
    resident_leave:'벽 너머의 안내 방송이 멎었다. 관리실이다.\n그녀가 집으로 돌아오던 장면이, 여기 남아 있다.',
    car_door:'문을 열었다. 차가운 비가 손등을 때린다.\n그날 나는 이 문을 열지 않았다.',
    road_bag:'1704호 열쇠. 전송되지 않은 메시지.\n「도착하면 연락할게.」',
    road_phone:'「제가 사람을 치었습니다. 술을 마셨고, 도망쳤습니다.」\n「이번에는 여기 있겠습니다.」',
    record:'03:26. 운전자는 내린 뒤 조수석 쪽에서 난 소리에 멈춰 섰다.\n9초 동안 서 있다가 고개를 돌리고 엘리베이터로 갔다.\n기록 옆에 CCTV 전원 회로도가 있다. 서고에 예비 퓨즈가 있다.',
    fuse:'예비 퓨즈를 챙겼다.\n오른쪽 전기실에 꽂으면 CCTV가 켜질 것이다.',
    security_power:'CCTV가 켜졌다. 사흘 전 주차장 기록이다.\n찌그러진 내 차가 들어오고 있다.',
    monitor:'내가 떠난 뒤, 빈 조수석에서 그 여자가 내렸다.\n그날부터 나와 함께 집에 있었다. 화면 속 여자가 나를 쳐다본다.\n비상 열쇠를 챙겼다. 지하로 내려가자.',
    service_exit:'계단 끝에서 차가운 바람이 불었다. 지하 1층.\n주차장 건너편 녹색 보행자 출구가 보인다.',
    exit:'출구 옆에 그날의 내 차가 있다. 조수석만 젖어 있다.\n문 반대편에서 누군가 버틴다. 경보를 울려 유인하자.',
    alarm:'경보가 울린다. 그것이 고개를 돌렸다.\n지금이야. 차들 사이로 빠져나가 출구까지 달려!',
  };
  function interact(){
    if(!started||paused||isMemory(story.stage)||story.stage==='ended'||story.stage==='dying'||story.stage==='tv')return;
    if(contact())return;
    findTarget();const action:Action|undefined=story.hidden?'closet':hover?.id;if(!action)return;
    if(action==='pry'){say('문을 바라본 채 E 또는 화면의 문 벌리기 버튼을 길게 누르세요.',4);return;}
    if(action==='lure'){
      if(lureUsed){say('태엽이 다 풀렸다.',2);return;}lureUsed=true;const point=hover!.point;lastSeen={x:point.x,z:point.z};seenAt=elapsed;tracking=true;noiseRadius=0;audio.sound('alarm',-.65,.45);say('태엽 소리가 울린다. 멀리서 발소리가 방향을 바꿨다.',4);return;
    }
    const wasHidden=story.hidden;
    if(action==='stay'){say(stageTime<12?'전화 너머에서 주소를 확인한다. 사이렌이 가까워진다.':'통화를 유지한 채 잠시 기다리자.',5);return;}
    if(action==='resident_leave'&&story.stage==='resident_return'&&stageTime<9){say('테이프가 아직 돌아간다. 문 너머에서 같은 목소리가 들린다.',4);return;}
    if(area==='stairs'&&action==='down'&&story.stage!=='stairs_loop'){
      camera.position.copy(world.spawn);yaw=Math.PI;pitch=0;audio.sound('dread');say('또 23층이다.\n아래로 내려가는 발소리는, 내 발소리가 아니었다.',7);return;
    }
    if(!advance(action)){
      const responses:Partial<Record<Action,string>>={resident_leave:'뒤쪽 문 너머에서 내선 전화가 울린다. 이 집의 녹음을 먼저 확인해야겠다.',door:'현관은 열려 있다. 밖에서 차가운 바람이 들어온다.',closet:'장롱 안에 몸을 숨길 수 있다.',up:'문이 움직이지 않는다. 먼저 아래쪽 계단을 확인하자.',fuse:'먼저 관리실 책상의 근무일지를 살펴보자.',security_power:'퓨즈가 빠져 있다. 서고의 예비 부품을 찾아야 한다.',monitor:'화면이 꺼져 있다. 기록과 전원을 확인해야 한다.',service_exit:'비상 열쇠가 필요하다. CCTV 옆 열쇠함이 보인다.'};
      say(responses[action]||'이미 확인했다. 다음 단서를 찾아야 한다.',4);return;
    }
    audio.sound(action==='door'||action==='stairs'||action==='service_exit'?'slam':'click');
    if(action==='closet'){
      if(!wasHidden){hiddenPosition.copy(camera.position);camera.position.set(...home.hidden);yaw=Math.PI/2;pitch=0;say('장롱 문틈으로 복도가 보인다. 숨을 죽였다.',4);}
      else{camera.position.copy(hiddenPosition);camera.position.y=1.65;say('문을 조금 밀고 밖으로 나왔다.',2);noiseUntil=elapsed+.3;noiseRadius=2;}
    }else if(dialogue[action]&&story.ending===null)say(dialogue[action]!,['record','monitor','phone'].includes(action)?12:8);
    if(action==='breaker'){audio.sound('click');audio.sound('phone',-.65);lastSound=elapsed;}
    if(action==='leave_lift'){audio.sound('slam',-.8);audio.sound('dread',-.8);}
    if(action==='down'){camera.position.copy(world.spawn);yaw=Math.PI;pitch=0;world.figure.position.set(3.5,-2.8,-6.8);lastSeen=null;tracking=false;audio.sound('dread');}
    if(action==='fuse'&&hover)hover.mesh.visible=false;
    if(action==='security_power'){audio.sound('slam',.8);world.figure.visible=true;lastSeen={x:camera.position.x,z:camera.position.z};tracking=true;ghostVoice('cry',true);}
    if(action==='monitor'){world.setDisplay?.('帰宅者 2名 / 2803');ghostVoice('found',true);}
    if(action==='answerphone'){audio.recording();}
    if(action==='road_phone'){audio.sound('phone');}
    if(action==='alarm'){audio.sound('alarm',-.8);chapterUntil=0;}
    if(contact())return;emit();
  }
  function keydown(e:KeyboardEvent){
    if(!started)return;
    const mapping=Object.entries(settings.bindings).find(([,code])=>code===e.code)?.[0] as keyof typeof settings.bindings|undefined;
    const code=mapping?defaultSettings.bindings[mapping]:['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Escape','KeyP'].includes(e.code)?e.code:'';
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyF','KeyC','Escape','KeyP','ShiftLeft','ShiftRight'].includes(code))e.preventDefault();
    if(code==='Escape'||code==='KeyP'){if(!e.repeat)pause(!paused);return;}
    if(paused||isMemory(story.stage)||story.stage==='ended'||story.stage==='dying')return;keys.add(code);if(e.repeat)return;
    if(code==='KeyE'||code==='Space'){if(story.stage!=='pry')interact();}
    if(code==='KeyF'&&story.stage!=='tv'){torch=!torch;audio.sound('click');emit();}
    if(code==='KeyC')crouch();
  }
  const keyup=(e:KeyboardEvent)=>{const mapping=Object.entries(settings.bindings).find(([,code])=>code===e.code)?.[0] as keyof typeof settings.bindings|undefined;keys.delete(mapping?defaultSettings.bindings[mapping]:e.code);};
  function pointerdown(e:PointerEvent){if(!started||paused||isMemory(story.stage)||story.stage==='ended'||story.stage==='dying')return;dragging=true;previousX=e.clientX;previousY=e.clientY;if(e.pointerType==='touch')canvas.setPointerCapture(e.pointerId);else if(document.pointerLockElement!==canvas)lock();}
  function pointermove(e:PointerEvent){
    if(!started||paused||story.hidden||isMemory(story.stage)||story.stage==='ended'||story.stage==='dying')return;let dx=0,dy=0;
    if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY;}else if(dragging){dx=e.clientX-previousX;dy=e.clientY-previousY;previousX=e.clientX;previousY=e.clientY;}else return;
    yaw-=dx*.0021*settings.sensitivity;pitch=T.MathUtils.clamp(pitch-dy*.0021*settings.sensitivity,-1.25,1.25);
  }
  const pointerup=()=>{dragging=false;holding=false;};
  function lockchange(){if(document.pointerLockElement!==canvas)blur();}
  function hidden(){blur();if(document.hidden)audio.pause();else if(started&&!paused)audio.resume();}
  function blur(){keys.clear();holding=false;dragging=false;}
  document.addEventListener('keydown',keydown);document.addEventListener('keyup',keyup);document.addEventListener('pointermove',pointermove);document.addEventListener('pointerup',pointerup);document.addEventListener('pointerlockchange',lockchange);document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',blur);canvas.addEventListener('pointerdown',pointerdown);
  function findTarget(){
    hover=undefined;if(story.hidden||isMemory(story.stage)||story.stage==='tv'||story.stage==='dying'||story.stage==='ended')return;camera.getWorldDirection(direction);
    for(const t of world.targets){
      if(t.id==='shoes'&&!world.shoes.visible)continue;
      if(t.id==='fuse'&&['office_power','office_tape','office_leave'].includes(story.stage))continue;
      if(area==='landing'&&t.id!==(story.stage==='lift_call'?'call':story.stage==='lift_enter'&&doorOpen>.75?'enter':'none'))continue;
      if(area==='lift'&&t.id!==(story.stage==='lift_button'?'panel':story.stage==='pry'?'pry':story.stage==='lift_exit'&&doorOpen>.75?'leave_lift':'none'))continue;
      if(t.id==='lure'&&(!['hide','escape'].includes(story.stage)||lureUsed))continue;
      if(t.id==='alarm'&&story.stage!=='parking_alarm')continue;
      if(area==='aftermath'&&t.id!==({road_exit:'car_door',road_evidence:'road_bag',road_call:'road_phone',road_wait:'stay'} as Partial<Record<typeof story.stage,Action>>)[story.stage])continue;
      delta.copy(t.point).sub(camera.position);const distance=delta.length();if(distance>2.3||delta.normalize().dot(direction)<.81)continue;
      if(hasLineOfSight(camera.position,t.point,world.solids)){hover=t;break;}
    }
  }
  function followEnemy(target:Point,speed:number,dt:number){
    const p=world.figure.position;
    if(elapsed>=repathAt){enemyPath=findPath(p,target,world.solids,world.bounds);repathAt=elapsed+.55;}
    while(enemyPath.length&&Math.hypot(p.x-enemyPath[0].x,p.z-enemyPath[0].z)<.12)enemyPath.shift();
    const next=enemyPath[0];if(!next)return;
    const dx=next.x-p.x,dz=next.z-p.z,distance=Math.hypot(dx,dz),step=Math.min(speed*.85*dt,distance);
    if(free(p.x+dx/distance*step,p.z,.18))p.x+=dx/distance*step;if(free(p.x,p.z+dz/distance*step,.18))p.z+=dz/distance*step;
    p.y=world.heightAt(p.x,p.z);
    const turn=T.MathUtils.euclideanModulo(Math.atan2(dx,dz)-world.figure.rotation.y+Math.PI,Math.PI*2)-Math.PI;
    world.figure.rotation.y+=turn*Math.min(1,dt*10);
  }
  function contact(){
    if(story.hidden||!world.figure.visible||!chaseStages.includes(story.stage))return false;
    const p=world.figure.position;
    return Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<.67&&Math.abs(p.y+1.25-camera.position.y)<1.2&&hasLineOfSight(camera.position,{x:p.x,y:p.y+1.4,z:p.z},world.solids)?advance('caught'):false;
  }
  function detectsPlayer(){
    if(story.hidden)return false;
    const p=world.figure.position,distance=Math.hypot(p.x-camera.position.x,p.z-camera.position.z);
    return perceives({ghost:p,player:camera.position,heading:world.figure.rotation.y,lineOfSight:hasLineOfSight({x:p.x,y:p.y+1.55,z:p.z},camera.position,world.solids),torch,crouched,noise:noiseRadius});
  }
  function hunt(speed:number,dt:number){
    const p=world.figure.position,distance=Math.hypot(p.x-camera.position.x,p.z-camera.position.z);
    if(detectsPlayer()){lastSeen={x:camera.position.x,z:camera.position.z};seenAt=elapsed;if(!tracking)ghostVoice('found');tracking=true;}
    else if(tracking&&elapsed-seenAt>4){tracking=false;ghostVoice('here');}
    const reached=lastSeen&&Math.hypot(p.x-lastSeen.x,p.z-lastSeen.z)<.6;
    if(lastSeen&&(!reached||elapsed-seenAt<2))followEnemy(lastSeen,speed,dt);
    else{
      const points=area==='resident'?[{x:0,z:2.8},{x:0,z:-3.8},{x:2.7,z:-3.8},{x:0,z:-3.8},{x:0,z:3.8},{x:-2.5,z:3.8}]:area==='apartment'?[home.bath,{x:0,z:-3*S},{x:0,z:3*S},{x:3.5*S,z:2*S}]:area==='office'?[{x:0,z:0},{x:0,z:-12},{x:8,z:8},{x:-8,z:8}]:area==='landing'?[{x:0,z:landing.liftZ+2},{x:1,z:0},{x:0,z:landing.spawnZ}]:area==='stairs'?[{x:3.5,z:-7},{x:0,z:6},{x:-3.5,z:-7}]:area==='parking'?[{x:11,z:-36},{x:-22,z:30},{x:22,z:30}]:[{x:-10,z:-32},{x:10,z:0},{x:-10,z:32}];
      const target=points[patrol%points.length];if(Math.hypot(p.x-target.x,p.z-target.z)<.8)patrol++;followEnemy(target,speed*.68,dt);if(elapsed-lastVoice>23)ghostVoice(patrol%2?'where':'cry');
    }
    threat=Math.max(threat,tracking?T.MathUtils.clamp(1-distance/24,.18,.9):.12);
  }
  function danger(dt:number){
    threat=0;if(contact())return;
    if(story.stage==='wait'){
      world.figure.visible=true;
      if(searchTime<0){
        followEnemy({x:home.search[0],z:home.search[2]},1.3,dt);
        if(world.figure.position.distanceTo(new T.Vector3(...home.search))<.25){searchTime=0;enemyPath=[];repathAt=0;ghostMotion=0;}
      }else{
        searchTime+=dt;
        if(searchTime<5){world.figure.lookAt(camera.position.x,world.figure.position.y,camera.position.z);ghostMotion=0;}
        else followEnemy(home.bath,1.3,dt);
        if(searchTime>1&&voiceBeat===0){voiceBeat=1;ghostVoice('where',true);}
        if(searchTime>3.5&&voiceBeat===1){voiceBeat=2;audio.sound('knock',.8,.6);ghostVoice('come',true);}
        if(searchTime>8&&voiceBeat===2){voiceBeat=3;ghostVoice('here',true);}
        if(searchTime>5&&scriptBeat===0){scriptBeat=1;audio.sound('tap',.8,.45);say('문틈의 그림자가 사라졌다. 발을 끄는 소리가 오른쪽으로 멀어진다.',5);}
        if(searchTime>8&&Math.hypot(world.figure.position.x-home.bath.x,world.figure.position.z-home.bath.z)<.5){advance('survived');audio.sound('tap',.7,.7);say('오른쪽 먼 방에서 물이 흐른다.',5);}
      }
    }else if(story.stage==='escape'){
      world.figure.visible=true;
      if(searchTime>5&&stageTime<16&&!tracking&&!detectsPlayer())followEnemy(home.bath,1.1,dt);
      else{hunt(2.65,dt);if(scriptBeat===0){scriptBeat=1;say('그것이 고개를 돌렸다. 나를 찾고 있다!',5);audio.sound('slam');ghostVoice('found',true);}}
    }else if(story.stage==='hide'){world.figure.visible=true;followEnemy(camera.position,stageTime<4?1.2:1.8,dt);threat=Math.min(.8,stageTime/15);}
    else if(area==='landing'){if(areaTime>4.5)hunt(2.5,dt);}
    else if(story.stage==='corridor_run'){world.figure.visible=true;if(stageTime>3.2)hunt(3.15,dt);threat=Math.max(.25,threat);}
    else if(area==='stairs'){if(areaTime>5)hunt(1.65,dt);}
    else if(area==='resident'){if(story.stage==='resident_return'&&stageTime>12){world.figure.visible=true;hunt(1.4,dt);}}
    else if(area==='office'){if(world.figure.visible)hunt(1.8,dt);}
    else if(story.stage==='parking_run'){
      world.figure.visible=true;
      if(stageTime<32)followEnemy({x:-22.5,z:30},2.8,dt);else hunt(3.05,dt);
      threat=Math.max(threat,stageTime<32?.18:.35);
      if(stageTime>32&&scriptBeat===0){scriptBeat=1;say('경보 소리가 끊겼다.\n그것이 다시 나를 찾고 있다!',5);ghostVoice('where',true);}
    }else if(area==='parking')hunt(2.65,dt);
    if(contact())return;
    if(world.figure.visible&&story.stage!=='dying'){
      const p=world.figure.position,distance=Math.hypot(p.x-camera.position.x,p.z-camera.position.z),travel=Math.hypot(p.x-lastGhostPosition.x,p.z-lastGhostPosition.z);
      const before=Math.floor(walkPhase/Math.PI);walkPhase+=Math.min(travel,.3)*Math.PI*2/1.56;ghostMotion=T.MathUtils.clamp(travel/Math.max(dt,.001)/2.5,0,1);lastGhostPosition.copy(p);
      const pan=T.MathUtils.clamp(((p.x-camera.position.x)*Math.cos(yaw)-(p.z-camera.position.z)*Math.sin(yaw))/Math.max(1,distance),-1,1),level=Math.min(1,4/Math.max(1,distance));
      if(Math.floor(walkPhase/Math.PI)!==before){audio.footstep(area==='stairs'?'metal':area==='apartment'||area==='resident'?'wood':'tile',pan,level*.85);if(before%2===0)audio.sound('drag',pan,level*.6);}
      if(distance<8&&elapsed-lastBreath>4.1){audio.sound('breath',pan,level);lastBreath=elapsed;}
    }
  }
  function scripted(dt:number){
    const memory=opening[story.stage];if(memory){
      if(road&&elapsed-lastSound>1.8){audio.sound('motor',0,.6);audio.sound('drag',-.1,.25);lastSound=elapsed;}
      if(stageTime>=memory.duration)advance(memory.action);return;
    }
    if(story.stage==='tv'&&stageTime>=7){
      advance('blackout');audio.setTV(false);audio.sound('slam',0,.55);torch=true;keys.clear();camera.position.set(...home.stand);yaw=0;pitch=0;chapterUntil=elapsed+3;
      say('툭. TV와 조명이 동시에 꺼졌다.\n손전등을 집어 들었다. 다용도실 차단기를 확인하자.',9);
    }
    if(story.stage==='listen'){
      if(stageTime>1.2&&scriptBeat===0){scriptBeat=1;audio.sound('drag',-.7);ghostVoice('cry',true);}
      if(stageTime>=2.8){advance('heard');world.figure.position.set(...home.haunt);world.figure.visible=true;audio.sound('dread',-.7);say('복도에서 발을 끄는 소리. 장롱 안에 몸을 숨길 수 있다.',5);}
    }
    if(area!=='lift'&&elapsed-lastDrip>7.8){audio.sound('drip',Math.sin(elapsed*.37)*.8,area==='stairs'||area==='parking'?.8:.35);lastDrip=elapsed;}
    if(world.fallingFigure){
      const falling=world.fallingFigure,dx=falling.position.x-camera.position.x,dz=falling.position.z-camera.position.z;
      const pan=T.MathUtils.clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,Math.hypot(dx,dz)),-1,1);
      if(fallTime<0&&camera.position.z<landing.fallTriggerZ){fallTime=0;audio.sound('metal',pan,.9);audio.sound('drag',pan,.8);}
      if(fallTime>=0&&fallTime<4.5){
        const before=fallTime;fallTime+=dt;const t=Math.max(0,fallTime-.6);
        falling.visible=fallTime>=.6&&fallTime<4.2;falling.position.y=9-2*t-7*t*t;
        falling.rotation.set(.25+t*.35,Math.PI/2+t*.5,-.45-t*.45);
        if(before<.6&&fallTime>=.6){audio.sound('fall',pan,.85);say('난간 너머로, 흰 소매가 스쳤다.',3);}
        if(before<4.2&&fallTime>=4.2){audio.sound('slam',pan,.3);audio.sound('dread',pan,.35);}
      }
    }
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
    if(story.stage==='resident_return'){
      if(stageTime>5&&scriptBeat===0){scriptBeat=1;audio.sound('knock',.2,.45);say('녹음은 끝났다. 현관 쪽에서 같은 발소리가 들린다.',5);}
      if(stageTime>10&&scriptBeat===1){scriptBeat=2;audio.sound('drag',-.2,.5);}
    }
    if(story.stage==='road_wait'){
      if(stageTime>4&&scriptBeat===0){scriptBeat=1;say('「주소 확인했습니다. 그 자리에 계세요.」',6);audio.sound('siren',-.4,.4);}
      if(stageTime>10){world.figure.visible=false;}
      if(stageTime>15)advance('stay');
    }
    if(story.stage==='office_tape'){
      const display=Math.floor(stageTime)%4<2?'3日前 · B1 03:26':'登録車両 / 2803号室';if(display!==lastDisplay){world.setDisplay?.(display);lastDisplay=display;}
    }
    if(story.stage==='parking_run'&&stageTime<32&&elapsed-lastSound>1.4){audio.sound('alarm',-.6);lastSound=elapsed;}
    if((story.stage==='phone'||story.stage==='radio')&&elapsed-lastSound>(story.stage==='phone'?8:2.5)){audio.sound('phone',story.stage==='phone'?-.65:.7);lastSound=elapsed;}
    if(story.stage==='shoes'&&stageTime>2&&scriptBeat===0){scriptBeat=1;audio.sound('knock',-.6);}
  }
  function deathPose(){
    const t=Math.min(stageTime,3.2),fall=T.MathUtils.smoothstep(t,1.05,2.55),lunge=T.MathUtils.smoothstep(t,0,.32);
    world.figure.position.copy(deathOrigin).addScaledVector(deathDirection,T.MathUtils.lerp(1.03,.85,lunge));world.figure.position.y=deathFloor;
    world.figure.rotation.set(0,Math.atan2(-deathDirection.x,-deathDirection.z),0,'YXZ');
    animateGhostAttack(world.figure,t,reducedMotion,deathEye);
    camera.position.copy(deathOrigin).addScaledVector(deathDirection,-fall*.2);camera.position.y=T.MathUtils.lerp(deathOrigin.y,deathFloor+.27,fall);
    world.figure.updateMatrixWorld(true);world.figure.getObjectByName('ghost-head')!.localToWorld(deathFace.set(0,-.055,.18));
    const dx=deathFace.x-camera.position.x,dy=deathFace.y-camera.position.y,dz=deathFace.z-camera.position.z;
    yaw=Math.atan2(-dx,-dz);pitch=Math.atan2(dy,Math.hypot(dx,dz));
    return fall*(reducedMotion?.12:.86)+(reducedMotion?0:Math.sin(t*37)*.016*(1-fall));
  }
  function renderWorld(dt:number){
    const time=started?elapsed:performance.now()/1000;
    if(road){ambient.intensity=.2;flashlight.intensity=0;fill.intensity=0;(scene.fog as T.FogExp2).density=.025;road.pose(story.stage,stageTime,camera,reducedMotion);camera.updateMatrixWorld();return;}
    if(story.stage==='sleep'){camera.position.set(...home.sleep);pitch=.85+T.MathUtils.smoothstep(stageTime,0,5)*.15;yaw=0;}
    if(area==='apartment')(scene.fog as T.FogExp2).density=.016;
    if(world.figure.visible&&story.stage!=='dying'&&story.stage!=='ended')animateGhost(world.figure,time,ghostMotion,threat,reducedMotion,walkPhase);
    const deathRoll=story.stage==='dying'?deathPose():0;
    camera.rotation.set(pitch,yaw,story.stage==='dying'?deathRoll:story.stage==='pry'&&stageTime<.7?Math.sin(stageTime*48)*.022:0,'YXZ');camera.updateMatrixWorld();
    flashlight.position.copy(camera.position).add(new T.Vector3(.11,-.13,0).applyQuaternion(camera.quaternion));camera.getWorldDirection(direction);flashlight.target.position.copy(camera.position).addScaledVector(direction,6);flashlight.intensity=torch&&!story.hidden&&story.stage!=='road_exit'?42:0;fill.position.copy(camera.position);fill.intensity=story.stage==='dying'?1.1:story.hidden||story.stage==='road_exit'?.2:.65;
    const powered=story.stage==='tv';world.shoes.visible=area==='apartment'&&!['tv','phone','power'].includes(story.stage);
    if(area==='apartment'){ambient.intensity=powered?.7:.2;world.setTV?.(started&&story.stage==='tv',time);}
    for(let i=0;i<world.lamps.length;i++){
      const base=typeof world.lamps[i].userData.base==='number'?world.lamps[i].userData.base:area==='apartment'?(powered?6:0):area==='lift'&&['pry','lift_exit'].includes(story.stage)?1:area==='landing'?(i%4===2?.35:4.3):area==='corridor'?4.2:7;
      world.lamps[i].intensity=base*(!reducedMotion&&i%3===1?.86+Math.sin(time*7)*.08:1);
      const bulb=world.lamps[i].userData.bulb as T.MeshStandardMaterial|undefined;if(bulb)bulb.emissiveIntensity=powered?.35:0;
      if(area==='parking'&&story.stage==='parking_run'&&stageTime<32&&i%3===0){world.lamps[i].color.set('#e64a29');world.lamps[i].intensity=3+Math.sin(time*7)*2;}
    }
    world.radioLight.intensity=story.stage==='radio'?1.5:0;world.phoneGlow.intensity=story.stage==='phone'?.8:0;
    world.updateStory?.(story.stage,time,reducedMotion);
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
    if(!started){camera.position.set(...home.title);yaw=.1+Math.sin(ms*.0001)*.04;pitch=-.015;}
    else if(!paused&&!document.hidden&&story.stage==='dying'){elapsed+=dt;stageTime+=dt;if(stageTime>=3.2)advance('dead');}
    else if(!paused&&!document.hidden&&story.stage!=='ended'){
      elapsed+=dt;stageTime+=dt;areaTime+=dt;runningNoise=false;
      if(!story.hidden&&!isMemory(story.stage)&&story.stage!=='tv'){if(keys.has('ArrowLeft'))yaw+=dt*1.55;if(keys.has('ArrowRight'))yaw-=dt*1.55;}
      if(!story.hidden&&!isMemory(story.stage)&&story.stage!=='tv'&&story.stage!=='road_exit'){
        const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
        const running=area!=='aftermath'&&!crouched&&(keys.has('ShiftLeft')||keys.has('ShiftRight')),speed=(crouched?1.25:running?3.5:2)*dt/(Math.hypot(forward,side)||1);
        const px=camera.position.x,pz=camera.position.z;
        move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);
        const moving=Math.hypot(camera.position.x-px,camera.position.z-pz)>.001;
        runningNoise=moving&&running;
        const floor=area==='stairs'?'metal':area==='apartment'||area==='resident'?'wood':area==='landing'&&camera.position.x<-.9?'wet':'tile';
        if(elapsed>noiseUntil)noiseRadius=moving?(crouched?0:running?(floor==='wet'?10:22):floor==='metal'?7:3):0;
        camera.position.y=world.heightAt(camera.position.x,camera.position.z)+(crouched?1:1.65)+(settings.bob&&!reducedMotion&&moving?Math.sin(elapsed*(running?13:9))*.018:0);
        if(moving&&elapsed-lastStep>(running?.32:.48)){audio.footstep(floor,Math.sin(elapsed*3)*.2,crouched?.15:running?.65:.35);lastStep=elapsed;}
      }
      camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();findTarget();scripted(dt);if(!isMemory(story.stage))danger(dt);
      if(message&&elapsed>messageUntil)message='';if(whisper&&elapsed>whisperUntil)whisper='';
    }
    audio.setHaunt(started&&!isMemory(story.stage)&&story.stage!=='ended'&&area!=='aftermath'?(tracking?Math.min(.9,.2+threat*.7):story.stage==='hide'?.65:world.figure.visible?.1+threat*.22:0):0);
    renderWorld(dt);
    if(started&&!paused&&story.stage!=='ended')findTarget();
    if(started&&!paused&&elapsed-lastEmit>.09){lastEmit=elapsed;emit();}
    renderer.render(scene,camera);
  }
  frameId=requestAnimationFrame(frame);emit();
  function crouch(){if(!started||paused||story.hidden||isMemory(story.stage)||story.stage==='tv'||story.stage==='ended'||story.stage==='dying')return;crouched=!crouched;emit();}
  function configure(next:Partial<Settings>){settings=normalizeSettings({...settings,...next});reducedMotion=systemReduced||settings.reducedMotion;audio.setVolume(settings.volume);audio.mix(settings);renderer.toneMappingExposure=settings.brightness;camera.fov=settings.fov;camera.updateProjectionMatrix();keys.clear();if(storage)writeSettings(storage,settings);emit();}
  return {start,pause,skipDeath(){if(story.stage==='dying'&&stageTime>1.2)advance('dead');},getSettings:()=>({...settings,bindings:{...settings.bindings}}),continueGame(){if(saved)start('continue');},skipMemory(){if(started&&!paused&&isMemory(story.stage)){advance('skip_memory');lock();}},interact,snapshot,configure,crouch,hold(active:boolean){if(!paused&&!isMemory(story.stage)&&story.stage!=='dying'&&story.stage!=='ended')holding=active;},torch(){if(paused||isMemory(story.stage)||story.stage==='ended'||story.stage==='dying'||story.stage==='tv')return;torch=!torch;emit();},key(code:string,down:boolean){if(paused||isMemory(story.stage)||story.stage==='ended'||story.stage==='dying')return;if(down)keys.add(code);else keys.delete(code);},dispose(){
    disposed=true;cancelAnimationFrame(frameId);observer.disconnect();audio.dispose();if(document.pointerLockElement===canvas)document.exitPointerLock();
    document.removeEventListener('keydown',keydown);document.removeEventListener('keyup',keyup);document.removeEventListener('pointermove',pointermove);document.removeEventListener('pointerup',pointerup);document.removeEventListener('pointerlockchange',lockchange);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',blur);canvas.removeEventListener('pointerdown',pointerdown);
    if(road)disposeWorld(road.root);disposeWorld(world.root);flashlight.shadow.map?.dispose();renderer.dispose();
  }};
}
export type Game=ReturnType<typeof createGame>;
