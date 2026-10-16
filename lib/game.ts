import * as T from 'three';
import {expansionJournal,expansionTargetActive,isExpansion,archiveReplay,archiveReplayDuration,courtyardPursuitActive,plantProblem,plantRoute,annexTapeDuration,annexCallbackDuration,courtCallTimes,courtCallDuration} from './expansion-story.ts';
import {expansionLayout} from './expansion-world.ts';
import {buildWorld,canStandAt,hasLineOfSight,disposeWorld,clampLightOrigin,type Target} from './world.ts';
import {animateGhost,animateGhostAttack,animateGhostEmergence,ghostStrideLength} from './ghost.ts';
export {prepareVisuals} from './materials.ts';
import {clearPrintedSources} from './materials.ts';
import {HorrorAudio,type GhostLine} from './audio.ts';
import {initialStory,checkpoint,transition,objectiveFor,officePowerLoad,officePowerProblem,residentEvidence,residentMessageDuration,areaFor,chapters,chaseStages,opening,openingTiming as beats,finale,finaleTiming as endingBeats,isMemory,isFinale,isCinematic,hasFlashlight,tapeTimes,officeReplay,officeReplayDuration,type Story,type Action,type Area} from './story.ts';
import {findPath,findPursuitPath,pursuerRadius,clearPath,type Point} from './navigation.ts';
import {setConnectionDoor} from './passage.ts';
import {apartment as home,apartmentScale as S} from './apartment-layout.ts';
import {buildRoad} from './prologue.ts';
import {departureFrame} from './car-departure.ts';
import {accidentCar} from './chapters.ts';
import {landing,buildingLayout as layout} from './building.ts';
import {freshStamina,stepStamina,canSprint} from './stamina.ts';
import {perceives} from './perception.ts';
import {roomReflections,configureShadow} from './lighting.ts';
import {createViewmodel} from './viewmodel.ts';
import {defaultSettings,normalizeSettings,readSettings,readProgress,writeProgress,writeSettings,PROGRESS_KEY,keyLabel,type Settings} from './preferences.ts';
export type {Settings} from './preferences.ts';

export type GameView={stamina:number;exhausted:boolean;hasFlashlight:boolean;started:boolean;memoryFade:number;memoryLabel:string;memoryText:string;deathProgress:number;paused:boolean;crouched:boolean;whisper:string;story:Story;prompt:string;message:string;objective:string;location:string;floor:string;chapter:string;chapterNumber:string;chapterCard:boolean;flashlight:boolean;threat:number;elapsed:number;holdProgress:number;holding:boolean;liftFloor:number;checkpointLabel:string;canContinue:boolean;savedLocation:string;saveNotice:string;interactKey:string;clock:string;noise:number};


export function createGame(canvas:HTMLCanvasElement,onChange:(view:GameView)=>void,onError:(error:string)=>void){
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const scene=new T.Scene();scene.background=new T.Color('#080b10');scene.fog=new T.FogExp2('#14191d',.016);
  const reflections=roomReflections(renderer,scene);
  const ambient=new T.HemisphereLight('#a8b4c4','#302925',.7);scene.add(ambient);
  const camera=new T.PerspectiveCamera(68,1,.06,85);camera.rotation.order='YXZ';const hands=createViewmodel();
  let road:ReturnType<typeof buildRoad>|null=null;
  let area:Area='apartment',world=buildWorld(scene);const audio=new HorrorAudio();
  const worlds=new Map<Area,ReturnType<typeof buildWorld>>([['apartment',world]]);
  const roads=new Map<boolean,ReturnType<typeof buildRoad>>();let preparing=false;
  function preparedWorld(next:Area){let value=worlds.get(next);if(!value){value=buildWorld(scene,next);worlds.set(next,value);}return value;}
  function preparedRoad(final:boolean){let value=roads.get(final);if(!value){value=buildRoad(scene,final);roads.set(final,value);}return value;}
  const flashlight=new T.SpotLight('#f0e9d9',42,24,Math.PI/7,.83,1.7);configureShadow(flashlight);flashlight.shadow.mapSize.set(window.matchMedia('(pointer:coarse)').matches?1024:2048,window.matchMedia('(pointer:coarse)').matches?1024:2048);
  flashlight.shadow.camera.near=.02;flashlight.shadow.camera.updateProjectionMatrix();
  scene.add(flashlight,flashlight.target);const fill=new T.PointLight('#dadde0',.6,3.5);scene.add(fill);
  let stamina=freshStamina(),breathRecovery=false;
  let story=initialStory(),started=false,paused=false,disposed=false,torch=false,elapsed=0,yaw=0,pitch=0,frameId=0;
  let message='',messageUntil=0,lastFrame=0,lastEmit=0,lastStep=0,stageTime=0,areaTime=0,lastSound=0,lastBreath=0,lastDrip=0,chapterUntil=0;
  let crouched=false,walkPhase=0,playerMoving=false,playerRunning=false,whisper='',whisperUntil=0,lastVoice=-20,voiceBeat=0,tracking=false,seenAt=0,patrol=0;
  let lastSeen:Point|null=null;
  let recordingAt=-1,recordingSpoken=false,recordingClue:'answerphone'|'annex_call'='answerphone';
  let annexNumber='',annexCallAt=-1,annexCallTo='',annexCallBeat=0,annexCallResult='',annexPressed='',annexPressedUntil=0,annexHeardCall=-1;
  let courtCallAt=-1,courtCallBeat=0,courtPressed='',courtPressedUntil=0,courtHeardCall=-1;
  let evidenceReaction=false,evidenceYaw=0,evidencePitch=0;
  let hover:Target|undefined,dragging=false,previousX=0,previousY=0,holdProgress=0,holding=false,doorOpen=0,lastDisplay='',threat=0;
  let enemyPath:Point[]=[],repathAt=0,scriptBeat=0,searchTime=-1;
  const pathGoal={x:Infinity,z:Infinity},departureOutside={x:2,z:-16};
  let entranceDelay=0,arrivalPursuit=false;let arrivalDoor:T.Object3D|undefined,arrivalDoorRelease=-1;let lureUsed=false;let noiseRadius=0,saveUntil=0,noiseUntil=0;let saveNotice='';
  let storage:Storage|undefined;try{storage=window.localStorage;}catch{}
  let saved=storage?readProgress(storage):null;
  const deathOrigin=new T.Vector3(),deathGhostOrigin=new T.Vector3(),deathWanted=new T.Vector3(),deathDirection=new T.Vector3(),deathFace=new T.Vector3();let deathFloor=0,deathEye=1.65;
  const interactionRay=new T.Raycaster();
  const hiddenPosition=new T.Vector3(),direction=new T.Vector3(),delta=new T.Vector3();
  let settings:Settings=storage?readSettings(storage):normalizeSettings(defaultSettings);renderer.toneMappingExposure=settings.brightness;camera.fov=settings.fov;camera.updateProjectionMatrix();
  const keys=new Set<string>();const lastGhostPosition=new T.Vector3();let ghostMotion=0;const systemReduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;let reducedMotion=systemReduced||settings.reducedMotion;
  const getLiftFloor=()=>story.stage==='service_ride'?Math.max(1,17-Math.floor(stageTime*1.6)):story.stage==='service_open'?1:story.stage==='descent'?Math.max(24,28-Math.floor(stageTime/4)):['pry','lift_exit'].includes(story.stage)?24:28;
  const crawling=()=>area!=='apartment';
  function location(){
    if(story.stage==='car_departure')return '지하 주차장 · 운전석';
    if(isFinale(story.stage))return '아파트 밖 · 운전석';
    if(isMemory(story.stage))return story.stage==='sleep'?'사흘 전 · 침실':'사흘 전 · 귀갓길';
    if(area==='apartment')return camera.position.x/S>1.9?(camera.position.z/S>-.5?'침실':camera.position.x/S>4?'욕실':'다용도실'):camera.position.x/S< -2.7&&camera.position.z/S< -2.4?'서재':camera.position.x/S< -2&&camera.position.z/S<0?'주방':camera.position.z/S< -3?'현관':'거실 · 다이닝';
    if(area==='resident')return story.stage==='resident_arrival'?'17층 복도 · 1704호 앞':'한서연의 집';if(area==='aftermath')return '사흘 전의 횡단보도';
    if(area==='courtyard')return Math.abs(camera.position.x)<18?'외부 중정 · 공사 구역':camera.position.x<0?'외부 중정 · 서측 통로':'외부 중정 · 동측 통로';
    if(area==='annex'&&camera.position.x>2&&camera.position.z>24.8)return '1층 · 정문 로비';
    if(area==='annex'||area==='archive'||area==='plant'){const L=expansionLayout[area];return Math.abs(camera.position.x)<2?L.name+' · 연결 복도':L.rooms[(camera.position.x<0?0:2)+(camera.position.z<10?1:0)];}
    if(area==='office')return camera.position.x< -1.6?(camera.position.z< -1.5?'문서 보관실':'야간 관리실'):camera.position.x>1.6?'전기실':'관리실 복도';
    return {landing:'28층 · 외부 복도',lift:'엘리베이터',corridor:'정전된 복도',stairs:'비상계단',parking:'지하 주차장'}[area];
  }
  function snapshot():GameView{
    const chapter=story.stage.startsWith('service_')?{...chapters.lift,number:'05',title:'관리용 승강기'}:chapters[area];
    const retryLabels:Partial<Record<typeof story.stage,string>>={annex_arrival:'1층 공동시설부터 다시',archive_arrival:'지하 기록보관실부터 다시',plant_arrival:'기계실 입구부터 다시',service_ride:'관리용 승강기부터 다시',lift_call:'28층 외부 복도부터 다시',lift_exit:'24층 엘리베이터부터 다시',lift_button:'엘리베이터 안에서 다시',stairs_loop:'23층 비상계단부터 다시',resident_entry:'1704호 입구부터 다시',car_departure:'주차장 차량 탑승부터 다시',car_escape:'차량 탈출부터 다시',office_record:'17층 관리실부터 다시',parking_gate:'지하 주차장 입구부터 다시',parking_alarm:'주차장 경보기부터 다시'};
    return {stamina:stamina.value,exhausted:stamina.exhausted,hasFlashlight:hasFlashlight(story),canContinue:!!saved,savedLocation:saved?chapters[areaFor({...initialStory(),stage:saved.stage})].floor:'',saveNotice:elapsed<saveUntil?saveNotice:'',interactKey:keyLabel(settings.bindings.interact),clock:'03:17',noise:noiseRadius/22,started,memoryFade:story.stage==='car_crash'?T.MathUtils.smoothstep(stageTime,2.5,5):story.stage==='sleep'?T.MathUtils.smoothstep(stageTime,2.8,5.7):story.stage==='flee'?T.MathUtils.smoothstep(stageTime,5.5,7):story.stage==='wake_ring'?1-T.MathUtils.smoothstep(stageTime,.4,3.6):0,memoryLabel:(opening[story.stage]??finale[story.stage])?.label||(story.stage==='wake_ring'?'사흘 뒤 · 새벽 03:17':''),memoryText:(opening[story.stage]??finale[story.stage])?.cues?.findLast(cue=>stageTime>=cue.at)?.text??(opening[story.stage]??finale[story.stage])?.text??'',deathProgress:story.stage==='dying'?Math.min(1,stageTime/3.2):0,paused,crouched,whisper,story:{...story,notes:[...story.notes]},prompt:evidenceReaction?'':story.hidden?'장롱에서 나오기':hover?(area==='resident'&&story.notes.includes(hover.id)?'확인 완료 · ':'')+hover.label:'',message:controlText(message),objective:evidenceReaction?'':settings.hints?controlText(recordingAt>=0?(recordingClue==='answerphone'?'자동응답기':'통신실 녹음')+' 재생 중 · 주변을 계속 살펴볼 수 있습니다':annexCallAt>=0?annexCallTo+'호 호출 중 · 주변의 발소리를 살피세요':courtCallAt>=0?'비상전화 연결 중 · 움직이거나 옆의 종료 버튼으로 끊을 수 있습니다':objectiveFor(story)):'',location:location(),floor:area==='lift'?`${getLiftFloor()}F`:area==='stairs'&&['stairs_reverse','stairs_passage'].includes(story.stage)?'17F':chapter.floor,chapter:chapter.title,chapterNumber:chapter.number,chapterCard:started&&elapsed<chapterUntil,flashlight:torch,threat,elapsed,holdProgress,holding:holding||keys.has('KeyE'),liftFloor:getLiftFloor(),checkpointLabel:retryLabels[story.resume]||(isExpansion(story.resume)?chapters[areaFor({...story,stage:story.resume})].floor+' · 조사 이어하기':'28층 라디오 장면부터 다시')};
  }
  const emit=()=>onChange(snapshot());
  function controlText(text:string){return text.replace(/\b(?:E|Shift)\b/g,key=>keyLabel(settings.bindings[key==='E'?'interact':'run']));}
  function say(text:string,seconds=7){message=text;messageUntil=elapsed+seconds;emit();}
  function playRecording(clue:'answerphone'|'annex_call'='answerphone'){
    if(recordingAt>=0)return;
    if(annexCallAt>=0){say('교환기의 CLEAR로 먼저 통화를 종료하자.',4);return;}
    recordingAt=elapsed;recordingClue=clue;recordingSpoken=false;audio.setDevice('phone',0);audio.recording(clue==='annex_call'?'archive-guard':'memory');lastVoice=elapsed;audio.sound('click',0,.25);say(clue==='annex_call'?'03:20 · 발신측 보조 녹음이 재생된다.':'03:16 · 남겨진 메시지가 재생된다.',2);
  }
  function stopRecording(){recordingAt=-1;audio.stopRecording();world.answeringMachine?.setPlayback(null);}
  function stopAnnexCall(){if(annexCallAt>=0)audio.stopRecording();annexCallAt=-1;annexCallBeat=0;audio.setDevice('ringback',0);audio.setDevice('busy',0);}
  function stopCourtCall(){if(courtCallAt>=0){audio.stopRecording();audio.setDevice('ringback',0);}courtCallAt=-1;courtCallBeat=0;}
  function operateCourtPhone(action:Action){
    courtPressed=action;courtPressedUntil=elapsed+.16;audio.sound('click',0,.25);
    if(action==='court_hangup'){stopCourtCall();say('통화를 끊었다. 다시 통화 버튼을 누를 수 있다.',4);return;}
    if(courtCallAt>=0){say('연결 중이다. 옆의 종료 버튼으로 끊을 수 있다.',3);return;}
    courtCallAt=elapsed;courtCallBeat=0;lastVoice=elapsed;say('비상통화 버튼을 눌렀다.\n「여보세요. 누구 없어요?」',3);
  }
  function operateIntercom(action:Action){
    const key=hover?.id===action?hover.mesh:action==='annex_dial'?world.intercom?.playButton:action==='annex_clear'?world.intercom?.stopButton:world.intercom?.keys.find(k=>k.label===action.at(-1))?.mesh;
    annexPressed=key?.uuid??'';annexPressedUntil=elapsed+.16;audio.sound('click',0,.2);
    if(action==='annex_clear'){stopAnnexCall();annexNumber='';annexCallResult='';say('번호를 지웠다. 세대 네 자리 → CALL.',3);return;}
    if(annexCallAt>=0){say('호출 중이다. CLEAR로 통화를 끊을 수 있다.',3);return;}
    annexCallResult='';
    if(action.startsWith('annex_digit_')){if(annexNumber.length<4)annexNumber+=action.at(-1);else say('네 자리를 입력했다. CALL 또는 CLEAR.',3);emit();return;}
    if(annexNumber.length!==4){say('우편실과 통신실 기록에서 수신 세대 네 자리를 확인하자.',5);return;}
    annexCallTo=annexNumber;annexCallAt=elapsed;annexCallBeat=0;lastVoice=elapsed;say(annexCallTo+'호로 전화를 건다. 교환기에서 호출음이 울린다.',4);
  }
  function ghostVoice(line:GhostLine,force=false){
    if(!force&&elapsed-lastVoice<12)return;
    const dx=world.figure.position.x-camera.position.x,dz=world.figure.position.z-camera.position.z,distance=Math.hypot(dx,dz),pan=T.MathUtils.clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,distance),-1,1);
    const blocked=!hasLineOfSight(camera.position,{x:world.figure.position.x,y:world.figure.position.y+(crawling()?.7:1.4),z:world.figure.position.z},world.solids);audio.voice(line,pan,line==='no'?Math.max(.65,Math.min(1,9/Math.max(1,distance))):Math.max(.08,Math.min(1,5/Math.max(1,distance)))*(blocked?.4:1),line==='no'?false:blocked);lastVoice=elapsed;
    whisper={where:'「어디 있지…?」',here:'「여기 있었는데…」',found:'「찾았다. 놓치지 않을 거야.」',come:'「나오렴…」',cry:'어둠 속에서 여자가 흐느낀다.',scream:'끄아아아아아악!!!',memory:'「거의 다 왔어. 내일 전화할게.」',no:'「안 돼… 안 돼!!!!!」'}[line];whisperUntil=elapsed+(line==='cry'?5:3.5);emit();
  }
  const free=(x:number,z:number,r=.23)=>canStandAt(x,z,world.solids,r,world.bounds);
  function move(dx:number,dz:number){if(story.stage==='lift_boarding')dz=Math.min(dz,landing.boardZ-camera.position.z);if(free(camera.position.x+dx,camera.position.z))camera.position.x+=dx;if(free(camera.position.x,camera.position.z+dz))camera.position.z+=dz;}
  function resize(){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function lock(){
    if(isCinematic(story.stage)||window.matchMedia('(pointer:coarse)').matches)return;
    try{const promise=canvas.requestPointerLock?.();if(promise)promise.catch(()=>say('화면 드래그 또는 ← → 키로 둘러보세요.',5));}catch{say('화면을 드래그해서 둘러보세요.',5);}
  }
  function pause(value=true){
    if(!started||story.stage==='ended')return;paused=value;keys.clear();dragging=false;holding=false;holdProgress=0;
    if(value){audio.pause();if(document.pointerLockElement===canvas)document.exitPointerLock();}else{audio.resume();lock();}emit();
  }
  function loadArea(next:Area){
    stopRecording();stopAnnexCall();stopCourtCall();annexNumber='';annexCallResult='';annexPressed='';annexHeardCall=-1;courtHeardCall=-1;courtPressed='';evidenceReaction=false;audio.setDrive(null);audio.setDevice('phone',0);audio.setDevice('radio',0);audio.setDevice('alarm',0);
    if(road){road.root.removeFromParent();road=null;}for(const r of roads.values())r.root.removeFromParent();
    world.root.removeFromParent();area=next;world=preparedWorld(area);world.reset();scene.add(world.root);camera.position.copy(world.spawn);if(story.stage==='resident_arrival')camera.position.set(0,1.65,11.2);yaw=world.heading;pitch=0;
    hover=undefined;holdProgress=0;holding=false;doorOpen=0;lastDisplay='';enemyPath=[];repathAt=0;scriptBeat=0;threat=0;lastSound=elapsed;lastBreath=elapsed;lastDrip=elapsed;
    areaTime=0;entranceDelay=0;arrivalPursuit=false;arrivalDoor=undefined;arrivalDoorRelease=-1;lureUsed=false;crouched=false;walkPhase=0;lastSeen=null;tracking=false;seenAt=elapsed;patrol=0;voiceBeat=0;noiseRadius=0;noiseUntil=0;whisper='';lastVoice=elapsed-8;audio.stopVoices();
    chapterUntil=elapsed+4.5;ambient.intensity=area==='parking'?.42:area==='resident'?.16:area==='aftermath'?.24:.5;lastGhostPosition.copy(world.figure.position);ghostMotion=0;
    (scene.fog as T.FogExp2).density=area==='corridor'?.026:area==='parking'?.021:.016;
    if(['landing','corridor','stairs'].includes(area)){world.figure.visible=true;const z=area==='landing'?landing.homeZ:area==='corridor'?19.2:area==='stairs'?5.25:7.1;world.figure.position.set(area==='landing'?3.7:area==='corridor'?.95:0,0,z);world.figure.lookAt(camera.position.x,0,camera.position.z);chapterUntil=elapsed+1.7;}
    if(area==='corridor'){world.figure.position.set(0,2.35,20.8);world.figure.rotation.y=Math.PI;}
    if(area==='office'){world.figure.position.set(-2.95,0,13.35);world.figure.rotation.y=Math.PI;world.figure.visible=true;arrivalDoor=world.root.getObjectByName('connection-fire-door');}
    if(area==='annex'||area==='courtyard'||area==='archive'||area==='plant'){ambient.intensity=area==='annex'?.26:.22;(scene.fog as T.FogExp2).density=.019;}
    if(area==='courtyard'){world.figure.position.set(-2.95,0,53.55);world.figure.rotation.y=Math.PI;world.figure.visible=false;arrivalDoor=world.root.children.find(o=>o.name==='continuous-connection'&&o.position.z===54)?.getObjectByName('connection-fire-door');}
    if(area==='parking'){world.figure.position.set(0,0,21.3);world.figure.rotation.y=Math.PI;world.figure.visible=true;}
    lastGhostPosition.copy(world.figure.position);
  }
  function persist(){
    if(!storage||isMemory(story.stage)||story.stage==='tv'||story.stage==='wake_ring')return;
    const ok=writeProgress(storage,story,elapsed,arrivalPursuit,Math.max(0,entranceDelay-areaTime));if(ok)saved=readProgress(storage);
    saveNotice=ok?'이 기기에 진행 상황 저장됨':'저장 공간을 사용할 수 없습니다';saveUntil=elapsed+3;
  }
  function advance(action:Action){
    const next=transition(story,action);if(next===story)return false;
    if(next.stage==='wait'&&story.stage!=='wait'){searchTime=-1;lastSeen=null;tracking=false;}
    const keepInvestigationPhase=(area==='resident'||area==='office')&&next.stage===story.stage;
    story=next;if(!keepInvestigationPhase){stageTime=0;scriptBeat=0;voiceBeat=0;enemyPath=[];repathAt=0;}holdProgress=0;
    if(story.stage==='ended'){stopRecording();stopAnnexCall();stopCourtCall();if(story.ending==='crashed'){try{storage?.removeItem(PROGRESS_KEY);}catch{}saved=null;}keys.clear();holding=false;hover=undefined;threat=0;audio.stopVoices();audio.setDrive(null);whisper='';if(document.pointerLockElement===canvas)document.exitPointerLock();audio.sound('dread');emit();return true;}
    if(story.stage==='dying'){
      stopRecording();stopAnnexCall();stopCourtCall();keys.clear();holding=false;dragging=false;hover=undefined;message='';whisper='';threat=1;deathOrigin.copy(camera.position);deathFloor=world.heightAt(camera.position.x,camera.position.z);deathEye=camera.position.y-deathFloor;
      deathDirection.copy(world.figure.position).sub(camera.position);deathDirection.y=0;if(deathDirection.lengthSq()<.001)deathDirection.set(-Math.sin(yaw),0,-Math.cos(yaw));deathDirection.normalize();
      deathGhostOrigin.copy(world.figure.position);
      world.figure.visible=true;audio.stopVoices();audio.voice('scream',0,1);audio.sound('slam',0,.8);emit();return true;
    }
    const nextArea=areaFor(story);if(nextArea!==area){const wasCrouched=crouched;loadArea(nextArea);crouched=wasCrouched;}
    if(isCinematic(story.stage)||story.stage==='tv'||story.stage==='wake_ring')openingScene();
    if(action==='awake'){camera.position.set(...home.wakeStand);yaw=2.045;pitch=-.137;keys.clear();say('전화벨에 잠이 깼다. 방이 너무 어둡다. 침실 입구 스위치를 눌러 보자.',7);}
    if(action==='flashlight'){torch=true;audio.sound('click');}
    if(story.stage==='road_evidence'){camera.position.set(accidentCar.exitX,1.65,accidentCar.exitZ);yaw=0;pitch=0;}
    persist();emit();return true;
  }
  function openingScene(){
    keys.clear();holding=false;dragging=false;hover=undefined;torch=false;chapterUntil=0;message='';
    if(isCinematic(story.stage)&&document.pointerLockElement===canvas)document.exitPointerLock();
    if(story.stage==='car_departure'){world.carDeparture!.pose(0,camera,reducedMotion);for(const o of world.root.children)if(o.userData.departureRoadSurface)o.visible=false;const r=preparedRoad(true);r.setDepartureFrame(world.carDeparture!.roadFrame);scene.add(r.root);r.root.visible=true;r.root.getObjectByName('memory-car')!.visible=false;audio.sound('click',-.5,.5);}
    if(story.stage==='drive'||story.stage==='car_escape'){road=preparedRoad(story.stage==='car_escape');if(story.stage==='car_escape'){road.setDepartureFrame(departureFrame);road.root.getObjectByName('memory-car')!.visible=true;}scene.add(road.root);road.root.visible=true;world.root.visible=false;if(story.stage==='car_escape'){chapterUntil=0;}}
    if(story.stage==='sleep'||story.stage==='tv'||story.stage==='wake_ring')audio.setDrive(null);
    if(story.stage==='sleep'||story.stage==='tv'||story.stage==='wake_ring'){
      if(road){road.root.removeFromParent();road=null;}world.root.visible=true;
    }
    if(story.stage==='tv'){camera.position.set(...home.seat);yaw=Math.PI/2;pitch=.05;audio.setTV(true);say('사고 후 사흘이 지났다. 그날 이후 밤마다 03:17에 눈이 떠진다.\nTV에서는 사흘 전 뺑소니 사고를 보도하고 있었다.',7);}
    if(story.stage==='impact'){audio.recorded('collision-impact',1);audio.sound('crash',0,.35);audio.sound('glass',-.2,.35);}
    if(story.stage==='wake_ring'){camera.position.set(...home.sleep);yaw=.45;pitch=.85;audio.setDevice('phone',.7);}
    if(story.stage==='sleep'){audio.sound('slam',0,.22);camera.position.set(...home.sleep);yaw=0;pitch=.85;}
  }
  function start(retry:boolean|'continue'=false){
    if(preparing){void ready.then(()=>{if(!disposed)start(retry);});return;}
    try{audio.start();audio.setVolume(settings.volume);audio.mix(settings);}catch{onError('소리를 시작하지 못했습니다. 소리 없이도 플레이할 수 있습니다.');}
    const resumePursuit=retry?(retry==='continue'?saved?.pursuit:arrivalPursuit):false;
    const resumeWait=retry==='continue'?saved?.pursuitWait??0:Math.max(0,entranceDelay-areaTime);
    if(retry==='continue'&&saved){story={...initialStory(),stage:saved.stage,resume:saved.stage,notes:[...saved.notes],circuit:[...saved.circuit],code:saved.code};elapsed=saved.elapsed;}else{story=retry?checkpoint(story):initialStory();elapsed=retry?elapsed:0;}if(story.stage==='resident_entry'&&story.notes.includes('resident_key'))story.stage='resident_return';started=true;paused=false;stageTime=0;stamina=freshStamina();breathRecovery=false;audio.setExertion(0);torch=hasFlashlight(story);message='';keys.clear();dragging=false;
    lastStep=elapsed;lastEmit=elapsed-1;loadArea(areaFor(story));
    if(resumePursuit&&(area==='annex'||area==='courtyard'||area==='archive'||area==='plant'||area==='parking')){carryPursuit(5.2,true,area==='parking'?layout.parking.z:expansionLayout[area].z);entranceDelay=Math.max(entranceDelay,resumeWait);persist();}
    audio.setTV(story.stage==='tv');
    if(isCinematic(story.stage)||story.stage==='tv'||story.stage==='wake_ring')openingScene();
    if(retry&&story.stage==='light_switch'){camera.position.set(...home.wakeStand);yaw=2.045;pitch=-.137;}
    if(retry&&story.stage==='power'){camera.position.set(...home.stand);yaw=0;}
    if(retry&&story.stage==='radio'){camera.position.set(...home.radioStart);yaw=Math.PI;}
    if(retry&&story.stage==='lift_exit')doorOpen=1;
    if(retry&&story.stage==='service_ride'){yaw=Math.PI;camera.position.z=-.7;}
    if(retry&&story.stage==='car_departure'){world.carDeparture!.reset();camera.position.set(3.2,1.65,-17.8);camera.rotation.set(-.12,-Math.PI/2,0,'YXZ');world.carDeparture!.pose(0,camera,reducedMotion);}
    if(retry&&story.stage==='parking_alarm'){camera.position.set(-9.6,1.65,17.1);yaw=.4;}
    if(retry)say('기억이 이어진다. '+chapters[area].floor,3);lock();emit();
  }
  const dialogue:Partial<Record<Action,string>>={
    ...Object.fromEntries(Object.entries(expansionJournal).map(([id,n])=>[id,n.text.split('\n\n')[0]+'\nJ키로 전체 기록을 다시 읽을 수 있다.'])),
    annex_restore:'통신 전원을 연결했다.\n명찰·반송 안내문·비상벨 기록으로 마지막 호출의 수신처를 확인하자.',
    annex_exit:'방화문 너머로 빗소리가 들린다. 중정 정문으로 나가 보자.',
    court_exit:'지하 계단 문이 열렸다. 기록보관실로 내려가자.',
    archive_exit:'북쪽 기계실 연결문이 열렸다. 좁은 통로로 빠져나가자.',
    plant_exit:'주차장 연결문이 열렸다. 이제 내 차로 갈 수 있다.',
    switch:'딸깍. 아무 반응이 없다.\n침대 옆 협탁 위에 손전등을 둔 기억이 난다.',
    flashlight:'손전등을 찾았다.\n다용도실 차단기를 확인하자. 전화벨은 계속 울린다.',
    car_search:'조수석 가방에서 배수 설비 열쇠를 찾았다.\n꼬리표에 적힌 대로 양쪽 급수 밸브를 잠근 뒤 서측 펌프로 가야 한다.',
    valve_a:'서측 급수관을 잠갔다. 금속 마찰음이 주차장에 울렸다.',
    valve_b:'동측 급수관을 잠갔다. 금속 마찰음이 주차장에 울렸다.',
    pump:'차량 출구의 물이 빠졌다. 차로 빠져나갈 수 있다.\n경보로 시선을 돌린 뒤, 내 차의 운전석으로 달려가자.',

    phone:'발신자 표시 제한. 수화기에서 빗소리와 와이퍼 소리가 들린다.\n「문 잠가도… 소용없어.」\n현관 안쪽에서 젖은 무언가가 타일에 떨어졌다.',
    breaker:'차단기를 올려도 불은 돌아오지 않는다. 건물 전체가 정전된 모양이다.\n어둠 속 거실에서 전화벨이 끊이지 않는다.',
    radio:'와이퍼 같은 소리가 나던 라디오를 껐다.\n…창밖의 빗소리만 남았다.',
    door:'낡은 외부 복도로 나왔다. 난간 너머로 빗소리가 쏟아진다.\n난간을 때리는 비가 발소리를 삼킨다. 끝에 엘리베이터 불빛이 보인다.',
    call:'24 … 25 …\n아직 멀었다. 뒤를 살피며 거리를 벌려야 한다!',
    enter:'문이 닫힌다.\n오른쪽 조작반에서 1층을 누르자.',
    panel:'1층. 제발, 멈추지 마.\n천장에서 내 것보다 한 박자 늦은 숨소리가 들린다.',
    pry:'문이 벌어졌다. 24층 복도가 보인다.\n밖으로 나갈 수 있다.',
    leave_lift:'바로 옆에 있다.\n중앙 설비실을 피해 좌우 복도로 돌아! 반대편 녹색 비상계단으로!',
    stairs:'비상문을 닫자, 손톱 긁는 소리가 따라 내려온다.\n아래층으로 가야 한다.',
    down:'아래층 방화문이 열렸다.\n연결 통로를 지나 내려가 보자.',
    stair_note:'점검 메모 아래에 내 차 번호가 적혀 있다. 「1704호, 한서연.」\n다시 본 계단 표지는 23이 아니라 17이다. 문 너머에서 그날의 전화벨이 들린다.',
    up:'방화문이 열렸다. 문 너머로 낡은 복도가 이어진다.\n전화는 복도 끝 1704호 안에서 울리고 있다.',
    resident_open:'잠겨 있지 않다. 전화벨은 거실에서 울린다.\n현관의 신발… 도로에 떨어져 있던 것과 같은 신발이다.',
    belongings:'검은 신발 한 짝. 봉투에는 「1704호 한서연」.\n야간 당직 안내에는 관리실 내선 17이 적혀 있다.',
    portrait:'「다음에는 맑은 날에.」\n내일도 살아 있을 거라 믿고 적은 약속이다.',
    answerphone:'03:16. 「거의 다 왔어. 먼저 자. 내일 전화할게.」\n테이프가 끝난 뒤에도, 젖은 발소리는 계속된다.',
    resident_leave:'연결문이 열렸다. 1703호, 외벽 공사 중 임시로 옮긴 관리실.\n봉투에 적힌 한서연의 근무 기록이 저 안에 있다.',
    resident_drawer:'서랍을 당긴다. 안에서 작은 금속이 부딪쳤다.\n앞을 막고 있다면 한 걸음 물러서자.',
    resident_shift:'한서연의 당직 수첩. 「여벌 연결문 열쇠는 책상 가운데 서랍.」\n업무 기록 아래에는 「내일 오후 두 시. 이번에는 꼭 갈 것.」이라고 적혀 있다.',
    resident_key:'1703호 연결문 열쇠다.\n현관 쪽에서… 다시 발소리가 들린다. 뒤쪽 연결문으로 가자.',
    car_door:'문을 열었다. 차가운 비가 손등을 때린다.\n그날은 이 문을 열고도 다시 차로 돌아갔다. 이번에는 떠나지 않겠다.',
    road_bag:'1704호 열쇠. 가방 곁의 전화기는 화면에 금이 갔지만 아직 켜져 있다.\n「도착하면 연락할게.」',
    road_phone:'「제가 사람을 치었습니다. 술을 마셨고, 도망쳤습니다.」\n「이번에는 여기 있겠습니다.」',
    record:'03:26. 내 차가 멈춘 직후, 열람 영상에서 아홉 초가 빠져 있다.\n서고의 퓨즈를 배전반에 설치해야 한다. 비상전원은 6A, CCTV와 승강기 제어 전원이 필요하다.\nCCTV에서 내 차가 입차한 03:26 기록을 확인하자.',
    fuse:'예비 퓨즈를 챙겼다.\n오른쪽 전기실 배전반의 빈 홀더에 먼저 설치하자.',
    security_power:'CCTV가 켜졌다. 사흘 전 주차장 기록이다.\n찌그러진 내 차가 들어오고 있다.',
    monitor:officeReplay[0].text,service_key:'관리용 승강기 열쇠를 챙겼다. 복도 끝 승강기로 가자.',
    service_exit:'관리용 승강기 문이 열렸다. 비상 전원으로 1층까지 내려갈 수 있다.\n승강기 안으로 들어가자.',
    exit:'보행자 출구는 바깥에서 봉쇄됐다. 내 차로 나가야 한다.\n차량 출구도 침수됐다. 조수석의 배수 설비 열쇠를 찾아 물부터 빼자.',
    alarm:'벨이 울린다. 차체와 기둥으로 몸을 가려야 한다.\n나를 보지 못하면 소리 쪽으로 갈 것이다. 운전석으로 돌아가자.',
  };
  function reviewArchive(action:Action){
    if(contact())return;
    const result=world.archiveReview!.operate(action,elapsed);audio.sound('click',0,.3);
    if(!result.mark)say(result.message,6);
    else if(story.circuit.includes(result.mark))say('이미 기록한 장면이다. 다른 원본을 대조하자.',4);
    else if(advance(result.mark)){audio.sound('metal',0,.25);say(result.message+(story.stage==='archive_reveal'?'\n\n사고, 통화, 입차. 세 기록이 이어졌다. 모니터에서 누락된 아홉 초를 재생하자.':''),10);}
    emit();
  }
  function interact(){
    if(!started||paused||evidenceReaction||isCinematic(story.stage)||story.stage==='ended'||story.stage==='dying'||story.stage==='tv'||story.stage==='wake_ring')return;
    if(contact())return;
    findTarget();let action:Action|undefined=story.hidden?'closet':hover?.id;if(!action)return;
    if(story.stage==='archive_edit'&&(action.startsWith('archive_preview_')||action.startsWith('archive_record_'))){
      reviewArchive(action);return;
    }
    if(action==='answerphone'&&area==='resident'){playRecording();return;}
    if(action==='annex_call'&&area==='annex'){playRecording('annex_call');return;}
    if(story.stage==='annex_unlock'&&(action.startsWith('annex_digit_')||action==='annex_dial'||action==='annex_clear')){operateIntercom(action);return;}
    if(area==='courtyard'&&(action==='court_hangup'||action==='court_phone'&&!story.notes.includes('court_phone')&&['court_search','court_code','court_safe_open','court_unlocked','court_departure'].includes(story.stage))){operateCourtPhone(action);return;}
    if(action==='pry'){say('문을 바라본 채 E 또는 화면의 문 벌리기 버튼을 길게 누르세요.',4);return;}
    if(action==='lure'){
      if(lureUsed){say('태엽이 다 풀렸다.',2);return;}lureUsed=true;const point=hover!.point;lastSeen={x:point.x,z:point.z};seenAt=elapsed;tracking=true;noiseRadius=0;audio.sound('alarm',-.65,.45);say('태엽 소리가 울린다. 멀리서 발소리가 방향을 바꿨다.',4);return;
    }
    if((action.startsWith('annex_')||action.startsWith('court_')||action.startsWith('archive_')||action.startsWith('plant_'))&&story.notes.includes(action)&&action in expansionJournal&&!(action==='archive_play'&&story.stage==='archive_reveal')){say(expansionJournal[action as keyof typeof expansionJournal].text.split('\n\n')[0],10);return;}
    const wasHidden=story.hidden,plantFault=action==='plant_start'?plantProblem(story):null,officeFault=action==='security_power'&&area==='office'?officePowerProblem(story):null;
    if(action==='stay'){say(stageTime<12?'전화 너머에서 주소를 확인한다. 사이렌이 가까워진다.':'통화를 유지한 채 잠시 기다리자.',5);return;}
    if(!advance(action)){
      if(action==='security_power'&&area==='office'){audio.sound('click',.5,.3);const faults={fuse:'빈 퓨즈 홀더에 예비 퓨즈를 먼저 설치하자.',monitor:'CCTV 기록장치 전원이 선택되지 않았다. B 회로를 확인하자.',lift:'승강기 제어 전원이 빠졌다. 필요한 회로와 6A 공급 한도를 살펴보자.',overload:'선택한 부하가 6A를 넘는다.'};say(officeFault?faults[officeFault]:'이미 전원을 연결했다.',6);return;}
      if(action==='office_install'){say('서고에서 예비 퓨즈를 먼저 챙겨야 한다.',5);return;}
      if(action==='court_confirm'){audio.sound('slam',0,.4);noiseRadius=24;noiseUntil=elapsed+4;say('금고가 열리지 않는다. 경비일지의 입차 분과 비상전화의 당직 내선을 대조하자.',6);return;}
      if(action==='plant_start'){
        const powered=story.circuit.includes('plant_circuit_pump')&&story.circuit.includes('plant_circuit_air');
        if(powered){world.plantAttempt?.(elapsed,story);noiseRadius=18;noiseUntil=elapsed+3;}
        audio.sound(powered?'motor':'click',0,powered?.5:.3);
        const faults={isolation:'유입이 계속된다. 양쪽 급수 차단 밸브부터 잠가야 한다.',filter:'모터가 짧게 울다 멎었다. 서측 펌프실로 돌아가 흡입망과 계기의 노란 시험 바늘을 확인하자.',route:plantRoute(story)==='closed'?'모터 보호 장치가 시험 운전을 멈췄다. 서측 토출 계기의 노란 시험 바늘과 선택기를 확인하자.':'펌프가 시험 회전했지만 수위가 그대로다. 서측 토출 선택기와 외부 배관을 따라가 보자.',pump:'모터 전원이 꺼져 있다. 바로 옆 배수 회로를 확인하자.',air:'환기 연동이 잠겨 있다. 환기 회로를 연결해야 기동할 수 있다.',electrical:'침수된 조명 회로에 누전이 있다.'};
        say(plantFault?faults[plantFault]:objectiveFor(story),7);return;
      }
      if(action.startsWith('annex_')||action.startsWith('court_')||action.startsWith('archive_')||action.startsWith('plant_')){say(objectiveFor(story),6);return;}

      const responses:Partial<Record<Action,string>>={exit:'보행자 출구는 바깥에서 막혔다. 내 차를 타고 차량 출구로 나가야 한다.',resident_leave:'연결문이 잠겼다. 열쇠가 필요하다. 현관 관리비 봉투나 서재의 수첩을 살펴보자.',resident_drawer:'서랍이 걸려 있다면 앞에서 한 걸음 물러서자. 안의 1703호 열쇠를 챙겨야 한다.',door:'문이 꿈쩍하지 않는다. 안쪽 잠금쇠는 풀려 있는데…',closet:'장롱 안에 몸을 숨길 수 있다.',up:'문이 움직이지 않는다. 먼저 아래쪽 계단을 확인하자.',fuse:'먼저 관리실 책상의 근무일지를 살펴보자.',security_power:'퓨즈가 빠져 있다. 서고의 예비 부품을 찾아야 한다.',monitor:story.stage==='office_tape'?'이 시각에는 내 차가 없다. 근무일지의 입차 시각을 다시 확인하자.':'화면이 꺼져 있다. 기록과 전원을 확인해야 한다.',service_exit:'비상 열쇠가 필요하다. CCTV 옆 열쇠함이 보인다.'};
      if(action==='monitor'&&story.stage==='office_tape'){audio.sound('alarm',0,.25);noiseRadius=22;noiseUntil=elapsed+3;}
      if(action==='pump'&&story.stage==='parking_pump'){say(story.notes.includes('valve_a')?'동측 급수관이 아직 열려 있다. 물부터 차단해야 한다.':story.notes.includes('valve_b')?'서측 급수관이 아직 열려 있다. 물부터 차단해야 한다.':'압력계가 흔들린다. 양쪽 급수 밸브를 먼저 잠가야 한다.',5);return;}
      if(action==='phone'&&!story.notes.includes('phone')){say(hasFlashlight(story)?'전화벨이 끊이지 않는다. 먼저 다용도실 차단기를 확인하자.':'어둡다. 침실의 스위치를 확인하고 손전등부터 찾아야 한다.',5);return;}
      if(story.notes.includes(action)&&['belongings','portrait','resident_shift'].includes(action)){say(dialogue[action]!,6);return;}
      say(responses[action]||'이미 확인했다. 다음 단서를 찾아야 한다.',4);return;
    }
    if(isExpansion(story.stage)){
      if(action==='annex_front_exit'){audio.sound('metal',.3,.55);noiseRadius=10;noiseUntil=elapsed+2;say('잠긴 문손잡이에서 쇠사슬이 울린다. 바깥 셔터도 내려와 있다.\n젖은 제어함에 북측 중정으로 우회하라는 안내가 붙어 있다.',9);return;}
      if(action==='plant_start'&&plantFault==='electrical'){audio.sound('metal',0,.6);noiseRadius=18;noiseUntil=elapsed+3;say('누전 보호기가 떨어졌다. 배수와 외부조명 스위치가 내려갔다. 침수된 외부조명은 끄고 배수 전원만 다시 연결하자.',8);return;}
      if(action==='plant_valve_west'||action==='plant_valve_east'||action==='plant_start'){audio.sound(action==='plant_start'?'motor':'metal',.4,.6);noiseRadius=18;noiseUntil=elapsed+2;}
      if(action==='plant_route'){audio.sound('metal',-.3,.4);noiseRadius=12;noiseUntil=elapsed+1.5;say(plantRoute(story)==='drain'?'토출 → 외부 우수관. 배관이 서쪽 벽으로 이어진다.':plantRoute(story)==='closed'?'토출 → 차단. 이 위치에서는 물이 나갈 수 없다.':'토출 → 집수정 환수. 물이 다시 이 방으로 돌아온다.',5);return;}
      if(action==='annex_exit'){world.figure.visible=true;tracking=true;lastSeen={x:camera.position.x,z:camera.position.z};seenAt=elapsed;ghostVoice('no',true);audio.sound('dread',0,.65);}
      if(action==='archive_play'){audio.sound('dread');say(archiveReplay[0].text,5);scriptBeat=1;return;}
      if(action.startsWith('court_digit_')){audio.sound('click',0,.3);return;}
      if(action==='court_confirm'){audio.sound('metal',0,.6);say('잠금쇠가 풀렸다. 문이 열릴 수 있도록 한 걸음 물러서자.\n금고 안쪽에 열쇠와 인계 쪽지가 보인다.',6);return;}
      if(action==='court_key'){audio.sound('metal',0,.3);say(expansionJournal.court_key.text,12);return;}
      if(action==='court_evidence'&&!story.notes.includes('court_phone')){whisper='수첩을 펴자, 건너편 비상전화가 울리기 시작한다.';whisperUntil=elapsed+7;}
      if(action.startsWith('archive_sequence_')){audio.sound('metal',0,.25);if(story.stage==='archive_reveal')say('사고, 통화, 입차. 세 기록이 이어졌다.\n모니터에서 지워진 아홉 초를 재생하자.',7);return;}
      if(action.startsWith('plant_circuit_')){audio.sound('click');say(objectiveFor(story),4);return;}
    }
    if(action==='shoes'){
      evidenceReaction=true;evidenceYaw=yaw;evidencePitch=pitch;keys.clear();holding=false;dragging=false;hover=undefined;torch=true;
      message='';audio.sound('drip',0,.55);emit();return;
    }
    audio.sound(action==='door'||action==='stairs'||action==='service_exit'?'slam':'click');
    if(action==='resident_drawer')audio.sound('door-creak',.2,.35);
    if(action==='resident_key'){audio.sound('metal',0,.25);audio.sound('knock',.3,.55);audio.sound('dread',0,.3);world.figure.visible=true;}
    if(action==='closet'){
      if(!wasHidden){hiddenPosition.copy(camera.position);camera.position.set(...home.hidden);yaw=Math.PI/2;pitch=0;say('장롱 문틈으로 복도가 보인다. 숨을 죽였다.',4);}
      else{camera.position.copy(hiddenPosition);camera.position.y=1.65;say('문을 조금 밀고 밖으로 나왔다.',2);noiseUntil=elapsed+.3;noiseRadius=2;}
    }
    else if(dialogue[action]&&story.ending===null&&!isFinale(story.stage))say(dialogue[action]!,['record','monitor','phone'].includes(action)?12:8);
    if(action==='exit'&&story.notes.includes('plant_drained'))say('물은 빠졌지만 출구는 공사 셔터에 막혀 있다.\n차량 경사로만 열려 있다. 내 차 조수석 가방에서 열쇠를 찾자.',9);
    else if(action==='car_search'&&story.notes.includes('plant_drained'))say('젖은 조수석 가방에서 차 열쇠를 찾았다. 배수는 끝났다.\n입구 쪽 경보로 그것을 유인한 뒤 운전석으로 가자.',9);
    if(action==='breaker')audio.sound('click');
    if(action==='phone'){
      audio.setDevice('phone',0);
      const dx=home.shoes[0]-camera.position.x,dz=home.shoes[2]-camera.position.z;
      audio.sound('wet-drop',T.MathUtils.clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.hypot(dx,dz),-1,1),1);
    }
    if(action==='radio'){
      audio.setDevice('radio',0);
      // The utility-room wall conceals the figure; the reveal is an actual walk around its doorway.
      world.figure.visible=true;world.figure.rotation.y=0;lastGhostPosition.copy(world.figure.position);
    }
    if(action==='leave_lift'){audio.sound('slam',-.8);audio.sound('dread',-.8);}
    if(action==='down')audio.sound('door-creak',0,.6);
    if(action==='fuse'&&hover)hover.mesh.visible=false;
    if(action.startsWith('circuit_')){audio.sound('click',.5,.3);say(`회로 ${story.circuit.includes(action)?'켜짐':'꺼짐'} · 선택 부하 ${officePowerLoad(story)}/6A. 필요한 회로를 고른 뒤 전원 투입 버튼을 누르자.`,5);}
    if(action==='office_install'){audio.sound('metal',.5,.3);say('퓨즈를 홀더에 끼웠다. CCTV와 승강기 제어에 필요한 부하를 고르자. 비상 공급은 6A다.',7);}
    if(action==='tape_next'){world.setDisplay?.(tapeTimes[story.tapeIndex]);say(`선택된 기록: ${tapeTimes[story.tapeIndex]}. 화면을 확인해 재생한다.`,3);}
    if(action==='valve_a'||action==='valve_b'){audio.sound('metal');noiseRadius=12;noiseUntil=elapsed+2;say(['valve_a','valve_b'].every(n=>story.notes.includes(n))?'두 급수관을 모두 잠갔다. 서측 펌프를 가동하자.':action==='valve_a'?'서측 급수관을 잠갔다. 동측 밸브가 아직 남아 있다.':'동측 급수관을 잠갔다. 서측 밸브가 아직 남아 있다.',5);}
    if(action==='pump'){audio.sound('motor');noiseRadius=22;noiseUntil=elapsed+3;}
    if(action==='security_power'){noiseRadius=officeFault==='overload'?22:10;noiseUntil=elapsed+3;audio.sound(officeFault==='overload'?'slam':'motor',.5,.4);say(officeFault==='overload'?'부하 초과. 보호계전기가 떨어져 선택 회로가 해제됐다. 퓨즈는 그대로다. 필요한 회로만 골라 다시 투입하자.':'CCTV와 승강기 제어 전원이 들어왔다. 근무일지의 입차 시각으로 CCTV를 확인하자.',7);}
    if(action==='monitor')scriptBeat=1;
    if(residentEvidence.includes(action as typeof residentEvidence[number]))say(dialogue[action]+'\n\n'+objectiveFor(story),12);
    if(action==='road_phone'){audio.sound('phone');}
    if(action==='alarm')chapterUntil=0;
    if(action==='car_passenger'){audio.sound('door-creak',.4,.3);say('문은 잠겨 있지 않았다. 조수석 뒤 발밑의 내 가방이 벌어져 있다. 열쇠가 보인다.',6);}
    if(contact())return;emit();
  }
  function keydown(e:KeyboardEvent){
    if(!started)return;
    const mapping=Object.entries(settings.bindings).find(([,code])=>code===e.code)?.[0] as keyof typeof settings.bindings|undefined;
    const code=mapping?defaultSettings.bindings[mapping]:['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Escape','KeyP'].includes(e.code)?e.code:'';
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyF','KeyC','Escape','KeyP','ShiftLeft','ShiftRight'].includes(code))e.preventDefault();
    if(code==='Escape'||code==='KeyP'){if(!e.repeat)pause(!paused);return;}
    if(!paused&&!mapping&&!e.repeat&&story.stage==='annex_unlock'&&hover&&(hover.id.startsWith('annex_digit_')||hover.id==='annex_dial'||hover.id==='annex_clear')){
      const digit=/^(?:Digit|Numpad)([0-9])$/.exec(e.code)?.[1],action=digit?`annex_digit_${digit}`:e.code==='Enter'?'annex_dial':e.code==='Backspace'?'annex_clear':null;
      if(action){e.preventDefault();operateIntercom(action as Action);return;}
    }
    if(!paused&&!mapping&&!e.repeat&&story.stage==='archive_edit'&&hover&&(hover.id.startsWith('archive_preview_')||hover.id.startsWith('archive_record_'))){
      const digit=/^(?:Digit|Numpad)([123])$/.exec(e.code)?.[1],source=digit?(['road','call','gate'] as const)[Number(digit)-1]:undefined;
      const action=source?`archive_preview_${source}`:e.code==='ArrowLeft'?'archive_record_back':e.code==='ArrowRight'?'archive_record_forward':e.code==='Space'?'archive_record_pause':e.code==='Enter'?'archive_record_mark':null;
      if(action){e.preventDefault();reviewArchive(action as Action);return;}
    }
    if(paused||evidenceReaction||isCinematic(story.stage)||story.stage==='ended'||story.stage==='dying')return;keys.add(code);if(e.repeat)return;
    if(code==='KeyE'||code==='Space'){if(story.stage!=='pry')interact();}
    if(code==='KeyF'&&hasFlashlight(story)){torch=!torch;audio.sound('click');emit();}
    if(code==='KeyC')crouch();
  }
  const keyup=(e:KeyboardEvent)=>{const mapping=Object.entries(settings.bindings).find(([,code])=>code===e.code)?.[0] as keyof typeof settings.bindings|undefined;keys.delete(mapping?defaultSettings.bindings[mapping]:e.code);};
  function pointerdown(e:PointerEvent){if(!started||paused||evidenceReaction||isCinematic(story.stage)||story.stage==='ended'||story.stage==='dying')return;dragging=true;previousX=e.clientX;previousY=e.clientY;if(e.pointerType==='touch')canvas.setPointerCapture(e.pointerId);else if(document.pointerLockElement!==canvas)lock();}
  function pointermove(e:PointerEvent){
    if(!started||paused||evidenceReaction||story.hidden||isCinematic(story.stage)||story.stage==='ended'||story.stage==='dying')return;let dx=0,dy=0;
    if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY;}else if(dragging){dx=e.clientX-previousX;dy=e.clientY-previousY;previousX=e.clientX;previousY=e.clientY;}else return;
    yaw-=dx*.0021*settings.sensitivity;pitch=T.MathUtils.clamp(pitch-dy*.0021*settings.sensitivity,-1.25,1.25);
  }
  const pointerup=()=>{dragging=false;holding=false;};
  function lockchange(){if(document.pointerLockElement!==canvas)blur();}
  function hidden(){blur();if(document.hidden)audio.pause();else if(started&&!paused)audio.resume();}
  function blur(){keys.clear();holding=false;dragging=false;}
  document.addEventListener('keydown',keydown);document.addEventListener('keyup',keyup);document.addEventListener('pointermove',pointermove);document.addEventListener('pointerup',pointerup);document.addEventListener('pointerlockchange',lockchange);document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',blur);canvas.addEventListener('pointerdown',pointerdown);
  function findTarget(){
    hover=undefined;if(evidenceReaction||story.hidden||isCinematic(story.stage)||story.stage==='tv'||story.stage==='dying'||story.stage==='ended')return;camera.getWorldDirection(direction);
    let best=Infinity;
    for(const t of world.targets){
      if(!expansionTargetActive(story,t.id))continue;
      if(t.id==='resident_key'&&(story.notes.includes('resident_key')||!world.residentStudy?.keyVisibleFrom(camera.position)))continue;
      if(t.id==='court_hangup'&&courtCallAt<0)continue;
      if(t.id==='court_key'&&((world.courtSafe?.hinge.rotation.y??0)>-1.1||!world.courtSafe?.keyVisibleFrom(camera.position)))continue;
      if(t.id==='service_exit'&&story.stage==='office_departure')continue;
      if(t.id==='service_key'&&story.stage!=='office_key')continue;
      if(t.id==='office_install'&&(story.stage!=='office_power'||story.notes.includes('office_install')))continue;
      if(t.id==='security_power'&&story.stage!=='office_power')continue;
      if(t.id==='door'&&['hide','wait','escape'].includes(story.stage))continue;
      if(t.id==='switch'&&story.stage!=='light_switch')continue;
      if(t.id==='flashlight'&&story.stage!=='find_torch')continue;
      if(t.id.startsWith('circuit_')&&story.stage!=='office_power')continue;
      if((t.id==='tape_next'||t.id==='monitor')&&story.stage!=='office_tape')continue;
      if(t.id==='car_passenger'&&(story.stage!=='parking_key'||story.notes.includes('car_passenger')))continue;
      if(t.id==='car_search'&&(story.stage!=='parking_key'||!story.notes.includes('car_passenger')||(world.carDeparture?.passengerDoor.rotation.y??0)<1))continue;
      if(t.id==='car_board'&&story.stage!=='parking_run')continue;
      if(['valve_a','valve_b','pump'].includes(t.id)&&(story.stage!=='parking_pump'||story.notes.includes(t.id)))continue;
      if(t.id==='shoes'&&!world.shoes.visible)continue;
      if(t.id==='fuse'&&(story.stage!=='office_fuse'||story.notes.includes('fuse')))continue;
      if(area==='resident'&&story.stage==='resident_arrival'&&t.id!=='resident_open')continue;
      if(t.id==='resident_open'&&story.stage!=='resident_arrival')continue;
      if(t.id==='resident_leave'&&story.stage==='resident_departure')continue;
      if(t.id==='up'&&story.stage==='stairs_passage')continue;
      if(t.id==='down'&&story.stage!=='stairs_loop')continue;
      if(area==='landing'&&t.id!==(story.stage==='lift_call'?'call':'none'))continue;
      if(area==='lift'&&t.id!==(story.stage==='lift_button'?'panel':story.stage==='pry'?'pry':'none'))continue;
      if(t.id==='lure'&&(!['hide','escape'].includes(story.stage)||lureUsed))continue;
      if(t.id==='alarm'&&story.stage!=='parking_alarm')continue;
      if(area==='aftermath'&&t.id!==({road_exit:'car_door',road_evidence:'road_bag',road_call:'road_phone',road_wait:'stay'} as Partial<Record<typeof story.stage,Action>>)[story.stage])continue;
      delta.copy(t.point).sub(camera.position);const distance=delta.length();if(distance>2.3||delta.normalize().dot(direction)<.81)continue;
      if(t.precise){t.mesh.updateWorldMatrix(true,false);interactionRay.set(camera.position,direction);if(!interactionRay.intersectObject(t.mesh,false).length)continue;}
      const score=t.precise?distance*.00001:1-delta.dot(direction)+distance*.005;
      if(score<best&&hasLineOfSight(camera.position,t.point,world.solids)){hover=t;best=score;}
    }
  }
  function followEnemy(target:Point,speed:number,dt:number){
    const p=world.figure.position;
    const changed=Math.hypot(target.x-pathGoal.x,target.z-pathGoal.z)>.45;
    if(repathAt===0||(elapsed>=repathAt&&(changed||!enemyPath.length))){
      enemyPath=findPursuitPath(p,target,world.solids,world.bounds);pathGoal.x=target.x;pathGoal.z=target.z;repathAt=elapsed+.55;
    }
    while(enemyPath.length&&Math.hypot(p.x-enemyPath[0].x,p.z-enemyPath[0].z)<.12)enemyPath.shift();
    if(enemyPath.length>1&&clearPath(p,enemyPath[1],world.solids,world.bounds,pursuerRadius))enemyPath.shift();
    const next=enemyPath[0];if(!next)return;
    const dx=next.x-p.x,dz=next.z-p.z,distance=Math.hypot(dx,dz),stride=ghostStrideLength(world.figure,world.solids,crawling()),step=Math.min(Math.min(speed*.85,stride*3)*dt,distance);
    if(free(p.x+dx/distance*step,p.z,pursuerRadius))p.x+=dx/distance*step;if(free(p.x,p.z+dz/distance*step,pursuerRadius))p.z+=dz/distance*step;
    p.y=world.heightAt(p.x,p.z);
    const turn=T.MathUtils.euclideanModulo(Math.atan2(dx,dz)-world.figure.rotation.y+Math.PI,Math.PI*2)-Math.PI;
    world.figure.rotation.y+=T.MathUtils.clamp(turn,-dt*2.4,dt*2.4);
  }
  function contact(){
    if(story.hidden||area==='corridor'&&areaTime<4.2||!world.figure.visible||!chaseStages.includes(story.stage))return false;
    const p=world.figure.position;
    return Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<.67&&Math.abs(p.y+(crawling()?.65:1.25)-camera.position.y)<1.2&&hasLineOfSight(camera.position,{x:p.x,y:p.y+(crawling()?.7:1.4),z:p.z},world.solids)?advance('caught'):false;
  }
  function detectsPlayer(){
    if(story.hidden)return false;
    const p=world.figure.position;
    return perceives({ghost:p,player:camera.position,heading:world.figure.rotation.y,lineOfSight:hasLineOfSight({x:p.x,y:p.y+(crawling()?.7:1.55),z:p.z},camera.position,world.solids),torch,crouched,noise:story.stage==='parking_run'?Math.min(noiseRadius,3):noiseRadius});
  }
  function hunt(speed:number,dt:number,distraction?:Point){
    const p=world.figure.position,distance=Math.hypot(p.x-camera.position.x,p.z-camera.position.z);
    if(detectsPlayer()){lastSeen={x:camera.position.x,z:camera.position.z};seenAt=elapsed;if(!tracking){repathAt=0;ghostVoice('found');}tracking=true;}
    else if(tracking&&elapsed-seenAt>4){tracking=false;ghostVoice('here');}
    const reached=lastSeen&&Math.hypot(p.x-lastSeen.x,p.z-lastSeen.z)<.6;
    if(reached&&elapsed-seenAt>=2){lastSeen=null;repathAt=0;}
    if(lastSeen&&(!reached||elapsed-seenAt<2))followEnemy(lastSeen,speed,dt);
    else if(distraction)followEnemy(distraction,speed,dt);
    else{
      const points=area==='annex'||area==='courtyard'||area==='archive'||area==='plant'?expansionLayout[area].patrol:area==='resident'?[{x:0,z:2.8},{x:0,z:-3.8},{x:2.7,z:-3.8},{x:0,z:-3.8},{x:0,z:3.8},{x:-2.5,z:3.8}]:area==='apartment'?[home.bath,{x:0,z:-3*S},{x:0,z:3*S},{x:3.5*S,z:2*S}]:area==='office'?[{x:0,z:0},{x:0,z:-6},{x:3,z:5.6},{x:-3,z:4}]:area==='landing'?[{x:0,z:landing.liftZ+2},{x:1,z:0},{x:0,z:landing.spawnZ}]:area==='stairs'?[{x:1,z:-5},{x:0,z:4},{x:-1,z:-5}]:area==='parking'?[{x:8,z:-18},{x:-8,z:17},{x:8,z:17}]:[{x:-2.6,z:-17},{x:2.6,z:0},{x:-2.6,z:17}];
      const target=points[patrol%points.length];if(Math.hypot(p.x-target.x,p.z-target.z)<.8)patrol++;followEnemy(target,speed*.68,dt);if(elapsed-lastVoice>23)ghostVoice(patrol%2?'where':'cry');
    }
    threat=Math.max(threat,tracking?T.MathUtils.clamp(1-distance/24,.18,.9):.12);
  }
  function danger(dt:number){
    threat=0;if(contact())return;
    if(story.stage==='listen'){
      if(stageTime>1.2)followEnemy({x:0,z:-1.4*S},1.05,dt);
    }else if(story.stage==='wait'){
      world.figure.visible=true;
      if(searchTime<0){
        followEnemy({x:home.search[0],z:home.search[2]},1.3,dt);
        if(world.figure.position.distanceTo(new T.Vector3(...home.search))<.25){searchTime=0;enemyPath=[];repathAt=0;ghostMotion=0;}
      }else{
        searchTime+=dt;
        if(searchTime<5){const turn=T.MathUtils.euclideanModulo(Math.atan2(camera.position.x-world.figure.position.x,camera.position.z-world.figure.position.z)-world.figure.rotation.y+Math.PI,Math.PI*2)-Math.PI;world.figure.rotation.y+=T.MathUtils.clamp(turn,-dt*1.5,dt*1.5);ghostMotion=0;}
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
    else if(area==='landing'){
      world.figure.visible=areaTime>=entranceDelay;
      if(world.figure.visible){
        const target=story.stage==='lift_boarding'?{x:0,z:landing.liftZ+.65}:camera.position;
        const scramble=Math.max(0,areaTime-entranceDelay);
        followEnemy(target,scramble<.5?1.3:scramble%1.2<.22?3.8:1.55,dt);
        // Once boarding succeeds the pursuer remains outside the closing leaves.
        world.figure.position.z=Math.max(world.figure.position.z,landing.liftZ+.48);
        threat=T.MathUtils.clamp(1-world.figure.position.distanceTo(camera.position)/24,.12,.95);
      }
    }
    else if(area==='corridor'){
      world.figure.visible=true;
      if(areaTime<4.2){const release=T.MathUtils.smoothstep(areaTime,1.2,4.2);world.figure.position.set(0,2.35*(1-release),20.8-2*T.MathUtils.smoothstep(areaTime,0,4.2));world.figure.rotation.y=Math.PI;}
      else hunt(2.7,dt);threat=Math.max(.25,threat);
    }
    else if(area==='stairs'){world.figure.visible=areaTime>=entranceDelay;if(areaTime>Math.max(5,entranceDelay))hunt(1.65,dt);}
    else if(area==='resident'){if(arrivalPursuit||story.stage==='resident_departure'||story.stage==='resident_return'&&stageTime>4){world.figure.visible=true;hunt(1.4,dt);}}
    else if(area==='office'){if(world.figure.visible&&['office_key','office_leave','office_departure'].includes(story.stage)){if(arrivalDoorRelease<0)arrivalDoorRelease=areaTime;hunt(1.8,dt);}}
    else if(area==='annex'||area==='courtyard'||area==='archive'||area==='plant'){
      const active=arrivalPursuit|| (area==='annex'?story.notes.includes('annex_badge')&&story.notes.includes('annex_notice'):area==='courtyard'?courtyardPursuitActive(story,arrivalPursuit):area==='archive'?['archive_escape','archive_departure'].includes(story.stage):story.notes.includes('plant_valve_west')||story.notes.includes('plant_valve_east'));
      if(active&&arrivalDoor&&arrivalDoorRelease<0){arrivalDoorRelease=areaTime;if(area==='courtyard'&&!arrivalPursuit)entranceDelay=areaTime+3;audio.sound('door-creak',0,.5);}
      if(active&&areaTime>(arrivalPursuit||area==='courtyard'?entranceDelay:10)){world.figure.visible=true;if(area==='annex'&&annexCallAt>=0&&annexHeardCall!==annexCallAt&&!tracking&&!lastSeen&&Math.hypot(world.figure.position.x-.7,world.figure.position.z+19.7)<16){annexHeardCall=annexCallAt;lastSeen={x:.7,z:-19.7};seenAt=elapsed;repathAt=0;}if(area==='courtyard'&&courtCallAt>=0&&courtHeardCall!==courtCallAt&&!tracking&&!lastSeen){const p=world.targets.find(t=>t.id==='court_phone')!.point;if(Math.hypot(world.figure.position.x-p.x,world.figure.position.z-p.z)<16){courtHeardCall=courtCallAt;lastSeen={x:p.x,z:p.z};seenAt=elapsed;repathAt=0;}}hunt(story.stage==='annex_departure'?3.65:area==='plant'&&story.stage==='plant_drain'?2.35:area==='archive'?2.15:1.85,dt);}
    }
    else if(area==='parking'&&areaTime>Math.max(2.8,entranceDelay)){
      world.figure.visible=true;hunt(story.stage==='parking_run'?2.7:2.2,dt,story.stage==='parking_run'?layout.parking.alarmApproach:undefined);
    }
    if(contact())return;
    if(world.figure.visible&&story.stage!=='dying'){
      const p=world.figure.position,distance=Math.hypot(p.x-camera.position.x,p.z-camera.position.z),travel=Math.hypot(p.x-lastGhostPosition.x,p.z-lastGhostPosition.z);
      const before=Math.floor(walkPhase/Math.PI);walkPhase+=Math.min(travel,.3)*Math.PI*2/ghostStrideLength(world.figure,world.solids,crawling());ghostMotion=T.MathUtils.clamp(travel/Math.max(dt,.001)/2.5,0,1);lastGhostPosition.copy(p);
      const pan=T.MathUtils.clamp(((p.x-camera.position.x)*Math.cos(yaw)-(p.z-camera.position.z)*Math.sin(yaw))/Math.max(1,distance),-1,1),level=Math.min(1,4/Math.max(1,distance));
      if(Math.floor(walkPhase/Math.PI)!==before){audio.footstep(crawling()?'wet':'wood',pan,level*.85);if(before%2===0)audio.sound('drag',pan,level*.6);}
      if(distance<8&&elapsed-lastBreath>4.1){audio.sound('breath',pan,level);lastBreath=elapsed;}
    }
  }
  function scripted(dt:number){
    if(recordingAt>=0){
      const t=elapsed-recordingAt,annex=recordingClue==='annex_call';
      if(t>=.8&&!recordingSpoken){recordingSpoken=true;say(annex?'통신실 보조 녹음 · 「차량 번호가 확인됐습니다. 내려와 주세요. 아직 현장에…」':'자동응답기 · 「거의 다 왔어. 먼저 자. 내일 전화할게.」',annex?7:4.6);}
      if(t>=(annex?annexTapeDuration:residentMessageDuration)){
        const clue=recordingClue;stopRecording();const collected=advance(clue);audio.sound('click',0,.2);
        if(collected)say((annex?expansionJournal.annex_call.text:dialogue.answerphone)+'\n\n'+objectiveFor(story),annex?14:9);
      }
    }
    if(annexCallAt>=0){
      const t=elapsed-annexCallAt,special=annexCallTo==='2803'||annexCallTo==='1704';
      if(special&&t>=2.8&&annexCallBeat===0){annexCallBeat=1;audio.setDevice('ringback',0);audio.recording(annexCallTo==='2803'?'come':'cry');lastVoice=elapsed;say(annexCallTo==='2803'?'호출음이 끊겼다. 아무도 없어야 할 우리 집에서… 「나오렴…」':'1704호. 수화기 너머에서 여자가 흐느낀다.',4);}
      if(t>=(annexCallTo==='2803'?annexCallbackDuration:annexCallTo==='1704'?8:2)){
        const homeLine=annexCallTo==='2803';stopAnnexCall();annexCallResult=homeLine?'2803 · 응답 종료\n북쪽 문에서 잠금 해제음':'응답 없음 · CLEAR로 지우기\n기록의 수신 세대를 다시 확인';
        if(homeLine){advance('annex_line_home');audio.sound('metal',0,.4);say(expansionJournal.annex_line_home.text,12);}else say('통화가 끊겼다. 문은 그대로 잠겨 있다. 마지막 호출의 수신 세대를 다시 확인하자.',6);
      }
    }
    if(courtCallAt>=0){
      const t=elapsed-courtCallAt;
      if(courtCallBeat<courtCallTimes.length&&t>=courtCallTimes[courtCallBeat]){courtCallBeat++;audio.setDevice('ringback',0);audio.recording('archive-denial');lastVoice=elapsed;say(courtCallBeat===1?'스피커에서 내 목소리가 들린다.\n「잘못 거셨어요.」':'나는 입을 다물고 있는데…\n「잘못 거셨어요.」',2.6);}
      if(t>=courtCallDuration){stopCourtCall();advance('court_phone');audio.sound('click',0,.2);say(expansionJournal.court_phone.text,12);}
    }
    if(story.stage==='archive_playback'){
      if(scriptBeat<archiveReplay.length&&stageTime>=archiveReplay[scriptBeat].at){say(archiveReplay[scriptBeat].text,9);audio.sound(scriptBeat===archiveReplay.length-1?'drag':'dread',.4,.6);scriptBeat++;}
      if(stageTime>=archiveReplayDuration){advance('archive_finish');world.figure.visible=true;ghostVoice('found',true);}
    }
    if(story.stage==='service_ride'){
      if(elapsed-lastSound>1.8){audio.sound('motor',0,.45);lastSound=elapsed;}
      if(stageTime>3&&scriptBeat===0){scriptBeat=1;say('17… 12… 8… 층수가 내려간다.\n1704호 관리비 봉투의 이름이 떠오른다. 한서연. 방금 읽은 당직일지에도 같은 이름이 있었다.',7);}
      if(stageTime>=11){advance('service_arrive');audio.sound('chime');say('1층. 정문으로 나갈 수 있을까. 문이 열리고 있다.',5);}
    }
    if(story.stage==='plant_drain'){
      if(elapsed-lastSound>1.6){audio.sound('motor',-.4,.5);lastSound=elapsed;}
      if(stageTime>=12){advance('plant_drained');audio.sound('chime',0,.4);say('수위가 내려갔다. 북쪽 주차장 연결문으로!',5);}
    }

    if(evidenceReaction){
      if(stageTime>=.55&&scriptBeat===0){scriptBeat=1;say('「뭐야, 이게…?」',2.45);}
      if(stageTime>=3&&scriptBeat===1){scriptBeat=2;say('이 신발… 도로에 두고 왔는데.\n물자국이 집 안쪽으로 이어져 있다.',3.2);}
      if(stageTime>=5.8){evidenceReaction=false;keys.clear();say('침실에서 라디오가 혼자 켜졌다.',4);}
    }
    const ending=finale[story.stage];
    if(ending){
      if(story.stage==='car_departure'){if(world.figure.visible&&stageTime<8){const p=world.figure.position,x=p.x,z=p.z;followEnemy(departureOutside,2.7,dt);const travel=Math.hypot(p.x-x,p.z-z);walkPhase+=travel*Math.PI*2/ghostStrideLength(world.figure,world.solids,true);ghostMotion=T.MathUtils.clamp(travel/Math.max(dt,.001)/2.5,0,1);}else ghostMotion=0;if(stageTime>=5.5&&scriptBeat===0){scriptBeat=1;audio.sound('slam',-.5,.45);}if(stageTime>=6&&scriptBeat===1){scriptBeat=2;audio.sound('motor',0,.5);}if(stageTime>=6&&Math.floor((stageTime-6)/.85)!==Math.floor((stageTime-dt-6)/.85))audio.sound('wiper',-.12,.8);}
      else if(Math.floor(stageTime/.85)!==Math.floor((stageTime-dt)/.85)&&story.stage!=='car_crash')audio.sound('wiper',-.12,.8);
      if(story.stage==='car_voice'&&stageTime>=.15&&scriptBeat===0){scriptBeat=1;audio.recorded('passenger-line',1,.85);}
      if(story.stage==='car_crash'){
        if(scriptBeat===0){scriptBeat=1;audio.recorded('male-surprise',1);audio.voice('scream',.75,.8);audio.sound('brake',0,.8);}
        if(stageTime>=endingBeats.impact&&scriptBeat===1){scriptBeat=2;audio.recorded('collision-impact',1.2);audio.sound('crash',0,.7);audio.sound('glass',0,.55);audio.sound('slam',0,.65);}
      }
      if(stageTime>=ending.duration)advance(ending.action);return;
    }
    const memory=opening[story.stage];if(memory){
      if(road){
        const roadClock=story.stage==='drive'?stageTime:opening.drive!.duration+(story.stage==='impact'?stageTime:opening.impact!.duration+stageTime);
        if(Math.floor(roadClock/.85)!==Math.floor((roadClock-dt)/.85))audio.sound('wiper',-.12,.8);
        if(story.stage==='drive'&&stageTime>=beats.phoneBuzz&&scriptBeat===0){scriptBeat=1;audio.sound('vibrate',.7,.8);}
        if(story.stage==='drive'&&stageTime>=memory.duration-.65&&scriptBeat===1){scriptBeat=2;audio.recorded('male-surprise',1);audio.sound('brake',0,.65);}
        if(story.stage==='drive'&&stageTime>=memory.duration-.2&&scriptBeat===2){scriptBeat=3;audio.recorded('female-collision-scream',.9,.35);}
        if(story.stage==='impact'){
          if(stageTime>2.2&&scriptBeat===0){scriptBeat=1;audio.sound('breath',0,.55);}
          for(const [at,kind,pan,level] of [[beats.doorOpen,'click',-.7,.6],[beats.doorShut,'slam',.5,.28],[beats.reopen,'click',.5,.6],[beats.lock-.2,'slam',-.7,.3]] as const)if(stageTime>=at&&stageTime-dt<at)audio.sound(kind,pan,level);
          for(const [from,to] of [[beats.walk,beats.inspect],[beats.return,beats.atDoor]])for(let at=from+.2,n=0;at<to;at+=.5,n++)if(stageTime>=at&&stageTime-dt<at)audio.footstep('wet',n%2?.12:-.12,.55);
          if(stageTime>=beats.lock&&scriptBeat===1){scriptBeat=2;audio.sound('click',-.7,.45);}
        }
      }
      if(stageTime>=memory.duration)advance(memory.action);return;
    }
    if(story.stage==='wake_ring'&&stageTime>=4.8)advance('awake');
    if(story.stage==='tv'&&stageTime>=7){
      advance('blackout');audio.setTV(false);audio.sound('slam',0,.55);torch=true;keys.clear();camera.position.set(...home.stand);yaw=0;pitch=0;chapterUntil=elapsed+3;
      say('툭. TV와 조명이 동시에 꺼졌다.\n손전등을 집어 들었다. 다용도실 차단기를 확인하자.',9);
    }
    if(story.stage==='listen'){
      if(stageTime>1.2&&scriptBeat===0){scriptBeat=1;audio.sound('drag',-.7);ghostVoice('cry',true);}
      if(stageTime>=2.8){advance('heard');say('현관은 닫혀 있다. 소리는 다용도실 안에서 난다.\n이미 집 안에 있었다. 장롱에 숨어야 한다.',7);}
    }
    if(area!=='lift'&&elapsed-lastDrip>7.8){audio.sound('drip',Math.sin(elapsed*.37)*.8,area==='stairs'||area==='parking'?.8:.35);lastDrip=elapsed;}
    if(story.stage==='lift_wait'){
      if(stageTime>2.5&&scriptBeat===0){scriptBeat=1;audio.sound('knock',.9);say('젖은 손이 바닥을 짚는 소리가 가까워진다.\n엘리베이터는 아직 오지 않았다.',4);}
      if(stageTime>4.8){advance('arrived');audio.sound('chime');say('문이 열렸다. 바로 들어가자.',5);}
    }
    if(story.stage==='lift_boarding'&&stageTime>1.4&&doorOpen<.035){
      const old=camera.position.clone(),oldYaw=yaw,oldPitch=pitch,oldCrouched=crouched;
      advance('sealed');
      crouched=oldCrouched;camera.position.set(-old.x,old.y,T.MathUtils.clamp(-1.35-(old.z-landing.liftZ),-.82,1.02));yaw=oldYaw+Math.PI;pitch=oldPitch;
      chapterUntil=0;audio.sound('slam',0,.3);say('문이 닫혔다. 오른쪽 조작반에서 1층을 누르자.',5);
    }
    if(story.stage==='descent'){
      if(elapsed-lastSound>1.8){audio.sound('motor');lastSound=elapsed;}
      if(stageTime>10.6&&scriptBeat===0){scriptBeat=1;audio.sound('drag',0,.45);say('27 … 26 … 25 …\n천장 위에서 무언가 천천히 긁고 있다.',6);}
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
      if(stageTime>5&&scriptBeat===0){scriptBeat=1;audio.sound('knock',.2,.45);say('현관 밖에서 손톱 긁는 소리가 들린다. 뒤쪽 연결문으로 빠져나가야 한다.',5);}
      if(stageTime>10&&scriptBeat===1){scriptBeat=2;audio.sound('drag',-.2,.5);}
    }
    if(story.stage==='road_wait'){
      if(stageTime>4&&scriptBeat===0){scriptBeat=1;say('「주소 확인했습니다. 그 자리에 계세요.」',6);audio.sound('siren',-.4,.4);}
      if(stageTime>10){world.figure.visible=false;}
      if(stageTime>15)advance('stay');
    }
    if(story.stage==='office_playback'){
      const cue=officeReplay[scriptBeat];if(cue&&stageTime>=cue.at){scriptBeat++;say(cue.text,4);if(cue.at===3)audio.sound('click',0,.35);}
      if(stageTime>=officeReplayDuration){advance('office_finish');arrivalDoorRelease=areaTime;lastSeen={x:camera.position.x,z:camera.position.z};seenAt=elapsed;tracking=true;audio.sound('drag',.3,.6);ghostVoice('here',true);say('뒤쪽 연결문에서 긁는 소리가 난다.\nCCTV 오른쪽의 승강기 열쇠를 챙겨야 한다.',8);}
    }
    if(story.stage==='shoes'&&stageTime>1.4&&scriptBeat===0){scriptBeat=1;audio.sound('drip',-.6,.9);}
  }
  function placeInsideRoom(out:T.Vector3,from:T.Vector3,to:T.Vector3,radius:number){
    let lo=0,hi=1;out.copy(to);
    if(clearPath(from,to,world.solids,world.bounds,radius))return;
    for(let i=0;i<12;i++){const t=(lo+hi)/2;out.copy(from).lerp(to,t);if(clearPath(from,out,world.solids,world.bounds,radius))lo=t;else hi=t;}
    out.copy(from).lerp(to,lo);
  }
  function deathPose(){
    const t=Math.min(stageTime,3.2),fall=T.MathUtils.smoothstep(t,1.05,2.55),lunge=T.MathUtils.smoothstep(t,0,.32);
    deathWanted.copy(deathOrigin).addScaledVector(deathDirection,T.MathUtils.lerp(1.03,.85,lunge));
    placeInsideRoom(world.figure.position,deathGhostOrigin,deathWanted,pursuerRadius);world.figure.position.y=world.heightAt(world.figure.position.x,world.figure.position.z);
    world.figure.rotation.set(0,Math.atan2(-deathDirection.x,-deathDirection.z),0,'YXZ');
    animateGhostAttack(world.figure,t,reducedMotion,deathEye,world.solids);
    deathWanted.copy(deathOrigin).addScaledVector(deathDirection,-fall*.2);placeInsideRoom(camera.position,deathOrigin,deathWanted,.23);camera.position.y=T.MathUtils.lerp(deathOrigin.y,deathFloor+.27,fall);
    world.figure.updateMatrixWorld(true);world.figure.getObjectByName('ghost-head')!.localToWorld(deathFace.set(0,-.055,.18));
    const dx=deathFace.x-camera.position.x,dy=deathFace.y-camera.position.y,dz=deathFace.z-camera.position.z;
    yaw=Math.atan2(-dx,-dz);pitch=Math.atan2(dy,Math.hypot(dx,dz));
    return fall*(reducedMotion?.12:.86)+(reducedMotion?0:Math.sin(t*37)*.016*(1-fall));
  }
  function fireAlarmSound(){
    if(story.stage==='dying')return;
    const active=started&&area==='parking'&&(story.stage==='parking_run'||story.stage==='car_departure');
    if(!active){audio.setDevice('alarm',0);return;}
    delta.set(layout.parking.alarm.x,1.92,layout.parking.alarm.z+.14).sub(camera.position);
    const distance=delta.length(),sealed=story.stage==='car_departure'&&stageTime>=5.5;
    direction.set(1,0,0).applyQuaternion(camera.quaternion);
    audio.setDevice('alarm',Math.min(1,7/Math.max(1,distance))*(sealed?.18:1),delta.normalize().dot(direction));
  }
  function renderWorld(dt:number){
    const time=started?elapsed:performance.now()/1000;
    const handPose={time:elapsed,moving:playerMoving,running:playerRunning,crouched,torch,visible:started&&hasFlashlight(story)&&!story.hidden&&!isCinematic(story.stage)&&!['tv','dying','ended','road_exit'].includes(story.stage),reducedMotion,aspect:camera.aspect,fov:camera.fov};hands.update(handPose);
    const doorOccupants=[{x:camera.position.x,z:camera.position.z,r:.23}];
    if(world.figure.visible)doorOccupants.push({x:world.figure.position.x,z:world.figure.position.z,r:pursuerRadius});
    if(story.stage==='car_departure'){
      world.updateStory?.(story.stage,time,reducedMotion,story,doorOccupants);
      const r=preparedRoad(true);r.pose('car_escape',0,camera,reducedMotion);r.root.getObjectByName('memory-car')!.visible=false;
      const speed=world.carDeparture!.pose(stageTime,camera,reducedMotion);ambient.intensity=.32;flashlight.intensity=0;fill.intensity=0;(scene.fog as T.FogExp2).density=.025;audio.setDrive(stageTime>=6?speed:null);audio.setDevice('phone',0);fireAlarmSound();
      // Boarding is protected. The pursuer crawls to the exterior of the bay,
      // then holds there instead of hunting an unreachable seated camera.
      if(world.figure.visible)animateGhost(world.figure,time,ghostMotion,0,reducedMotion,walkPhase,1,undefined,world.solids);return;
    }
    if(road){audio.setDevice('alarm',0);ambient.intensity=.32;flashlight.intensity=0;fill.intensity=0;(scene.fog as T.FogExp2).density=.025;const speed=road.pose(story.stage==='ended'?'car_crash':story.stage,story.stage==='ended'?finale.car_crash!.duration:stageTime,camera,reducedMotion);audio.setDrive(story.stage==='ended'?null:speed);audio.setDevice('phone',0);camera.updateMatrixWorld();return;}
    if(story.stage==='wake_ring'){camera.position.set(...home.sleep);pitch=.85*(1-T.MathUtils.smoothstep(stageTime,1,4.8));yaw=.45;}
    if(story.stage==='sleep'){camera.position.set(...home.sleep);pitch=.85+T.MathUtils.smoothstep(stageTime,0,5)*.15;yaw=0;}
    if(area==='apartment')(scene.fog as T.FogExp2).density=.016;
    if(area==='stairs')ambient.intensity=T.MathUtils.lerp(.5,.16,T.MathUtils.smoothstep(-camera.position.z,4.8,6.2));
    if(world.figure.visible&&story.stage!=='dying'&&story.stage!=='ended')animateGhost(world.figure,time,ghostMotion,threat,reducedMotion,walkPhase,crawling()?(area==='landing'?T.MathUtils.smoothstep(areaTime-entranceDelay,0,.5):1):0,area==='stairs'||area==='courtyard'||area==='resident'&&arrivalPursuit?world.heightAt:undefined,world.solids);
    if(area==='corridor'&&areaTime<4.2&&world.figure.visible)animateGhostEmergence(world.figure,areaTime,reducedMotion);
    if(evidenceReaction&&!reducedMotion){
      // Remain at the evidence: follow the leather toe, then the first wet print.
      world.shoes.localToWorld(delta.set(0,.07,T.MathUtils.lerp(.02,.7,T.MathUtils.smoothstep(stageTime,3,4.8))));
      delta.sub(camera.position);const targetYaw=Math.atan2(-delta.x,-delta.z),blend=T.MathUtils.smoothstep(stageTime,0,1.25);
      yaw=evidenceYaw+(T.MathUtils.euclideanModulo(targetYaw-evidenceYaw+Math.PI,Math.PI*2)-Math.PI)*blend;
      pitch=T.MathUtils.lerp(evidencePitch,T.MathUtils.clamp(Math.atan2(delta.y,Math.hypot(delta.x,delta.z)),-1.25,1.25),blend);
    }
    const deathRoll=story.stage==='dying'?deathPose():0;
    camera.rotation.set(pitch,yaw,story.stage==='dying'?deathRoll:story.stage==='pry'&&stageTime<.7?Math.sin(stageTime*48)*.022:0,'YXZ');camera.updateMatrixWorld();
    fireAlarmSound();
    flashlight.position.copy(hands.beamOrigin).applyQuaternion(camera.quaternion).add(camera.position);
    if(clampLightOrigin(camera.position,flashlight.position,world.solids)){hands.update({...handPose,obstructed:true});flashlight.position.copy(hands.beamOrigin).applyQuaternion(camera.quaternion).add(camera.position);clampLightOrigin(camera.position,flashlight.position,world.solids);}
    camera.getWorldDirection(direction);flashlight.target.position.copy(camera.position).addScaledVector(direction,6);flashlight.intensity=torch&&!story.hidden&&story.stage!=='road_exit'?42:0;fill.position.copy(camera.position);fill.intensity=story.stage==='dying'?1.1:story.hidden||story.stage==='road_exit'?.2:.35;
    const powered=story.stage==='tv';world.shoes.visible=area==='apartment'&&!['drive','impact','flee','sleep','tv','wake_ring','light_switch','find_torch','phone','power'].includes(story.stage);
    if(area==='apartment'){ambient.intensity=powered?.7:.2;world.setTV?.(started&&story.stage==='tv',time);}
    for(let i=0;i<world.lamps.length;i++){
      const base=typeof world.lamps[i].userData.base==='number'?world.lamps[i].userData.base:area==='apartment'?(powered?6:0):area==='lift'&&['pry','lift_exit'].includes(story.stage)?1:area==='landing'?(i%4===2?.35:4.3):area==='corridor'?4.2:7;
      world.lamps[i].intensity=base*(!reducedMotion&&i%3===1?.86+Math.sin(time*7)*.08:1);
      const bulb=world.lamps[i].userData.bulb as T.MeshStandardMaterial|undefined;if(bulb)bulb.emissiveIntensity=powered?.35:0;
    }
    world.radioLight.intensity=story.stage==='radio'&&!evidenceReaction?1.5:0;world.phoneGlow.intensity=['wake_ring','light_switch','find_torch','power','phone'].includes(story.stage)?.8:0;
    const courtPhone=area==='courtyard'&&courtCallAt<0&&story.notes.includes('court_evidence')&&!story.notes.includes('court_phone')?world.targets.find(t=>t.id==='court_phone')?.point:undefined;
    for(const device of ['phone','radio'] as const){const residentRing=area==='resident'&&['resident_arrival','resident_entry','resident_memory'].includes(story.stage)&&recordingAt<0&&!story.notes.includes('answerphone'),stairRing=area==='stairs'&&['stairs_reverse','stairs_passage'].includes(story.stage);const active=started&&(area==='apartment'&&(device==='phone'?['wake_ring','light_switch','find_torch','power','phone'].includes(story.stage):story.stage==='radio'&&!evidenceReaction)||device==='phone'&&(residentRing||stairRing||!!courtPhone));const p=device==='phone'&&residentRing?[-3.8,.9,3.6]:device==='phone'&&stairRing?[-.8,.9,-31.9]:home[device],dx=(device==='phone'&&courtPhone?courtPhone.x:p[0])-camera.position.x,dz=(device==='phone'&&courtPhone?courtPhone.z:p[2])-camera.position.z,dist=Math.hypot(dx,dz);audio.setDevice(device,active?Math.min(1,3/Math.max(1,dist)):0,T.MathUtils.clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,dist),-1,1));}
    if(area==='apartment'&&!story.hidden&&['hide','escape'].includes(story.stage)&&Math.hypot(camera.position.x,camera.position.z-home.doorZ)<1.85){
      const door=world.root.getObjectByName('front-door')!;
      if(!door.userData.openRequested){door.userData.openRequested=true;audio.sound('click',0,.9);audio.sound('door-creak',0,.85);say('잠금쇠를 풀고 문을 밀었다. 복도로 나가야 한다!',3);}
    }
    world.updateStory?.(story.stage,time,reducedMotion,story,doorOccupants);
    if(arrivalDoor){
      const landing=arrivalDoor.parent!.position,playerInDoorway=camera.position.x-landing.x<1.85&&camera.position.z>landing.z-3.5;
      const desired=arrivalDoorRelease>=0||playerInDoorway?1:0;
      if(!paused&&!document.hidden)setConnectionDoor(arrivalDoor,T.MathUtils.damp(-arrivalDoor.rotation.y/(Math.PI/2),desired,4,dt),doorOccupants);
    }
    if(world.liftDoors){
      const desired=['lift_enter','lift_exit','service_open'].includes(story.stage)?1:story.stage==='pry'?holdProgress*.28:0;
      if(!paused&&!document.hidden)doorOpen=T.MathUtils.damp(doorOpen,desired,2.6,dt);
      if(area==='lift'&&doorOpen>.05){const shaft=world.root.getObjectByName('lift-shaft-darkness');if(shaft)shaft.visible=false;}
      world.liftDoors.left.position.x=-.315-doorOpen*.64;world.liftDoors.right.position.x=.315+doorOpen*.64;
      world.liftDoors.blocks[0].x=world.liftDoors.left.position.x;world.liftDoors.blocks[1].x=world.liftDoors.right.position.x;
      const display=story.stage==='lift_wait'?String(Math.min(28,24+Math.floor(stageTime/1.2))):`${getLiftFloor()}${story.stage==='descent'?' ↓':story.stage==='pry'?' —':''}`;
      if(display!==lastDisplay){world.setDisplay?.(display);lastDisplay=display;}
    }
  }
  function carryPursuit(distance:number,pursuing:boolean,newZ:number,speed=2.15,pendingWait=0){
    arrivalPursuit=pursuing;
    if(area!=='parking')arrivalDoor=world.root.children.find(o=>o.name==='continuous-connection'&&o.position.z===newZ+6)?.getObjectByName('connection-fire-door');
    entranceDelay=pendingWait+Math.max(0,(distance-1.6)/(speed*.85));
    // Wait behind the fire-door sweep; standing on the landing traps both
    // the opening leaf and the pursuer against one another.
    if(area==='annex'){
      // This lobby has an enclosed lift, not an incoming connection passage.
      // Resume behind the east room wall, with a real route through its doorway.
      world.figure.position.set(3.5,0,26.5);world.figure.rotation.y=Math.PI/2;
    }else{world.figure.position.set(-2.95,0,newZ+5.55);world.figure.rotation.y=Math.PI;}
    world.figure.visible=pursuing&&entranceDelay===0;lastGhostPosition.copy(world.figure.position);
  }
  function crossThresholds(){
    if(story.hidden)return;
    if(story.stage==='stairs_descent'&&camera.position.z<-12.05&&Math.abs(camera.position.x-4)<.5){
      advance('stair_loop');audio.sound('dread',0,.5);say('한 층을 내려왔는데… 다시 23층이다.\n바닥의 같은 얼룩. 벽의 점검 메모도 그대로다.',8);
    }
    if(story.stage==='lift_exit'&&doorOpen>.75&&camera.position.z<-1.62&&Math.abs(camera.position.x)<.48){
      const p=camera.position.clone(),ry=yaw,rx=pitch;advance('leave_lift');
      camera.position.set(p.x,p.y,20+p.z+1.35);yaw=ry;pitch=rx;chapterUntil=0;
      audio.sound('metal',0,.8);say('등 뒤, 엘리베이터 천장이 뜯어지는 소리. 비상계단으로 가야 한다!',5);return;
    }
    if(story.stage==='corridor_departure'&&camera.position.x>1.5&&camera.position.z<-21&&camera.position.z>-23){
      const p=camera.position.clone(),ry=yaw,rx=pitch,distance=world.figure.position.distanceTo(p);advance('stair_enter');camera.position.set(p.x-3,p.y,p.z+32);yaw=ry;pitch=rx;chapterUntil=0;entranceDelay=Math.max(0,(distance-1.6)/(2.7*.85));world.figure.position.set(-2.95,0,10);world.figure.rotation.y=Math.PI/2;world.figure.visible=entranceDelay===0;lastGhostPosition.copy(world.figure.position);return;
    }
    if(story.stage==='office_departure'&&camera.position.z<-layout.office.z-.65&&Math.abs(camera.position.x)<.48){
      const p=camera.position.clone(),ry=yaw,rx=pitch;advance('service_board');camera.position.set(-p.x,p.y,-(p.z+layout.office.z)-1.35);yaw=ry+Math.PI;pitch=rx;doorOpen=1;chapterUntil=0;audio.sound('slam',0,.4);return;
    }
    if(story.stage==='service_open'&&doorOpen>.75&&camera.position.z<-1.6&&Math.abs(camera.position.x)<.48){const p=camera.position.clone(),ry=yaw,rx=pitch;advance('annex_enter');camera.position.set(p.x,p.y,expansionLayout.annex.z+p.z+1.35);yaw=ry;pitch=rx;chapterUntil=0;say('1층. 오른쪽 창 너머에 로비 정문이 보인다.\n왼쪽 안내판에서 나갈 길을 확인하자.',8);return;}
    if(area==='courtyard'&&story.stage==='court_departure'&&camera.position.x>15.5&&camera.position.z<-52&&camera.position.z>-54){
      const p=camera.position.clone(),ry=yaw,rx=pitch,distance=world.figure.position.distanceTo(p),pursuing=world.figure.visible||arrivalPursuit,pendingWait=world.figure.visible?0:Math.max(0,entranceDelay-areaTime);advance('archive_enter');camera.position.set(p.x-17,p.y+2.8,expansionLayout.archive.z+6+p.z+51);yaw=ry;pitch=rx;chapterUntil=0;carryPursuit(distance,pursuing,expansionLayout.archive.z,2.15,pendingWait);persist();say(objectiveFor(story),7);return;
    }
    if((area==='annex'||area==='archive'||area==='plant')&&story.stage===`${area}_departure`&&camera.position.x>1.5&&camera.position.z<-expansionLayout[area].z-1&&camera.position.z>-expansionLayout[area].z-3){
      const p=camera.position.clone(),ry=yaw,rx=pitch,bz=expansionLayout[area].z,distance=world.figure.position.distanceTo(p),pursuing=world.figure.visible||arrivalPursuit,pendingWait=world.figure.visible?0:Math.max(0,entranceDelay-areaTime),oldSpeed=area==='annex'?3.65:2.15;
      const next=area==='annex'?'court_enter':area==='archive'?'plant_enter':'parking_enter',nextZ=area==='annex'?48:area==='archive'?expansionLayout.plant.z:layout.parking.z;
      advance(next);camera.position.set(p.x-3,p.y,nextZ+6+p.z+bz);yaw=ry;pitch=rx;chapterUntil=0;carryPursuit(distance,pursuing,nextZ,oldSpeed,pendingWait);persist();say(objectiveFor(story),7);return;
    }
    if(story.stage==='stairs_passage'&&camera.position.z< -25.35&&Math.abs(camera.position.x-3)<1.1&&Math.abs(world.root.getObjectByName('stairs-passage-door')!.rotation.y)<.015){
      const old=camera.position.clone(),oldYaw=yaw,oldPitch=pitch,ghost=world.figure;
      const carried=ghost.visible&&ghost.position.z<-23.7?{position:ghost.position.clone(),yaw:ghost.rotation.y,phase:walkPhase,motion:ghostMotion,tracking,seen:lastSeen?{...lastSeen}:null,seenAt}:null;
      advance('stair_exit');
      camera.position.set(old.x-3,old.y,11.65+old.z+23.85);yaw=oldYaw;pitch=oldPitch;chapterUntil=0;
      if(carried){world.figure.position.set(carried.position.x-3,carried.position.y,carried.position.z+35.5);world.figure.rotation.y=carried.yaw;world.figure.visible=true;lastGhostPosition.copy(world.figure.position);walkPhase=carried.phase;ghostMotion=carried.motion;arrivalPursuit=true;tracking=carried.tracking;seenAt=carried.seenAt;lastSeen=carried.seen?{x:carried.seen.x-3,z:carried.seen.z+35.5}:null;}
      audio.sound('slam',0,.3);
      say('17층 복도. 전화벨은 1704호에서 들린다.\n문 옆 명패에도 한서연… 메모에 적힌 이름이다.',8);
    }else if(story.stage==='resident_departure'&&camera.position.x>1.5&&camera.position.z< -6.95&&camera.position.z> -8.95&&Math.abs(world.root.getObjectByName('resident-service-door')!.rotation.y)>1.2){
      const old=camera.position.clone(),oldYaw=yaw,oldPitch=pitch;advance('office_entry');
      camera.position.set(old.x-3,old.y,old.z+19.75);arrivalDoor=world.root.children.find(o=>o.name==='continuous-connection'&&o.position.z===13.8)?.getObjectByName('connection-fire-door');yaw=oldYaw;pitch=oldPitch;chapterUntil=0;audio.sound('slam',0,.3);
      say('연결문을 닫았다. 임시 관리실이다.\n야간 근무일지에서 그녀의 이름을 찾아보자.',7);
    }else if(area==='apartment'&&['hide','escape'].includes(story.stage)&&camera.position.z<home.doorZ-.19&&Math.abs(camera.position.x)<.55){
      if(contact())return;
      const old=camera.position.clone(),oldYaw=yaw,oldPitch=pitch,oldCrouched=crouched;
      const path=findPath(world.figure.position,{x:0,z:home.doorZ+.3},world.solids,world.bounds);
      let distance=0,previous:Point=world.figure.position;
      for(const p of path){distance+=Math.hypot(p.x-previous.x,p.z-previous.z);previous=p;}
      if(!path.length)distance=Math.hypot(world.figure.position.x,world.figure.position.z-home.doorZ);
      advance('door');
      crouched=oldCrouched;camera.position.set(landing.homeX+old.z-home.doorZ,old.y,landing.homeZ-old.x);yaw=oldYaw+Math.PI/2;pitch=oldPitch;
      const visibleDistance=Math.min(2.4,Math.max(.75,distance));entranceDelay=Math.max(0,(distance-visibleDistance)/(2.65*.85));
      world.figure.position.set(landing.homeX+visibleDistance,0,landing.homeZ);world.figure.rotation.y=-Math.PI/2;world.figure.visible=entranceDelay===0;lastGhostPosition.copy(world.figure.position);
      chapterUntil=0;audio.sound('metal',.4,.25);say('문을 닫을 틈이 없다. 복도 끝 엘리베이터로!',4);
    }else if(story.stage==='lift_enter'&&doorOpen>.75&&camera.position.z<=landing.boardZ&&Math.abs(camera.position.x)<.48){
      advance('enter');chapterUntil=0;audio.sound('metal',0,.5);say('탔다. 문이 닫히고 있다.',3);
    }
  }
  function frame(ms:number){
    if(disposed)return;frameId=requestAnimationFrame(frame);const dt=Math.min((ms-lastFrame)/1000||0,.05);lastFrame=ms;
    if(preparing)return;
    if(!started){camera.position.set(...home.title);yaw=.1+Math.sin(ms*.0001)*.04;pitch=-.015;}
    else if(!paused&&!document.hidden&&story.stage==='dying'){elapsed+=dt;stageTime+=dt;if(stageTime>=3.2)advance('dead');}
    else if(!paused&&!document.hidden&&story.stage!=='ended'){
      elapsed+=dt;stageTime+=dt;areaTime+=dt;playerMoving=false;playerRunning=false;
      if(!evidenceReaction&&!story.hidden&&!isCinematic(story.stage)&&story.stage!=='tv'&&story.stage!=='wake_ring'){if(keys.has('ArrowLeft'))yaw+=dt*1.55;if(keys.has('ArrowRight'))yaw-=dt*1.55;}
      if(!evidenceReaction&&!story.hidden&&!isCinematic(story.stage)&&story.stage!=='tv'&&story.stage!=='wake_ring'&&story.stage!=='road_exit'){
        const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
        const running=area!=='aftermath'&&!crouched&&canSprint(stamina)&&(keys.has('ShiftLeft')||keys.has('ShiftRight')),speed=(crouched?1.25:running?3.5:2)*dt/(Math.hypot(forward,side)||1);
        const px=camera.position.x,pz=camera.position.z;
        move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed);
        const moving=Math.hypot(camera.position.x-px,camera.position.z-pz)>.001;
        stamina=stepStamina(stamina,dt,running,moving);
        const floor=area==='stairs'?(camera.position.z< -6?'tile':'metal'):area==='resident'?(camera.position.z>5.95?'tile':'wood'):area==='apartment'?'wood':area==='landing'&&camera.position.x<-.9?'wet':'tile';
        playerMoving=moving;playerRunning=moving&&running;
        if(elapsed>noiseUntil)noiseRadius=moving?(crouched?0:running?(floor==='wet'?10:22):floor==='metal'?7:3):0;
        camera.position.y=world.heightAt(camera.position.x,camera.position.z)+(crouched?1:1.65)+(settings.bob&&!reducedMotion&&moving?Math.sin(elapsed*(running?13:9))*.018:0);
        if(moving&&elapsed-lastStep>(running?.32:.48)){audio.footstep(floor,Math.sin(elapsed*3)*.2,crouched?.15:running?.65:.35);lastStep=elapsed;}
      }
      if(story.hidden)stamina=stepStamina(stamina,dt,false,false);
      camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();crossThresholds();findTarget();scripted(dt);if(!isCinematic(story.stage))danger(dt);
      if(message&&elapsed>messageUntil)message='';if(whisper&&elapsed>whisperUntil)whisper='';
    }
    if(stamina.exhausted)breathRecovery=true;else if(stamina.value>.9)breathRecovery=false;
    const archiveFrame=started&&story.stage==='archive_edit'?world.archiveReview?.read(elapsed):started&&story.stage==='archive_playback'&&stageTime<9?{source:'gate' as const,time:stageTime,playing:true}:null;
    const recordDx=9-camera.position.x,recordDz=-20-camera.position.z,recordDistance=Math.hypot(recordDx,recordDz);
    audio.setArchiveRecord(archiveFrame??null,recordDistance<14?Math.min(1,2.5/Math.max(1,recordDistance)):0,T.MathUtils.clamp((recordDx*Math.cos(yaw)-recordDz*Math.sin(yaw))/Math.max(1,recordDistance),-1,1));
    audio.setExertion(started&&!isCinematic(story.stage)&&!['ended','dying'].includes(story.stage)&&breathRecovery?Math.min(1,(1-stamina.value)/.75):0);
    audio.setHaunt(started&&!isCinematic(story.stage)&&story.stage!=='ended'&&area!=='aftermath'?(tracking?Math.min(.9,.2+threat*.7):story.stage==='hide'?.65:world.figure.visible?.1+threat*.22:0):0);
    const chasing=started&&!story.hidden&&world.figure.visible&&chaseStages.includes(story.stage)&&(tracking||story.stage==='hide'||area==='landing');
    audio.setChase(chasing?T.MathUtils.clamp(.4+threat*.6,0,1):0);
    world.answeringMachine?.setPlayback(recordingAt<0?null:elapsed-recordingAt);
    if(area==='annex'){
      const callDx=.7-camera.position.x,callDz=-20.86-camera.position.z,callDistance=Math.hypot(callDx,callDz),callPan=T.MathUtils.clamp((callDx*Math.cos(yaw)-callDz*Math.sin(yaw))/Math.max(1,callDistance),-1,1),callBlocked=area==='annex'&&!hasLineOfSight(camera.position,{x:.7,y:1,z:-20.86},world.solids),callLevel=Math.min(1,2.5/Math.max(1,callDistance))*(callBlocked?.4:1);
      audio.setDevice('ringback',annexCallAt>=0&&annexCallBeat===0&&['2803','1704'].includes(annexCallTo)?callLevel:0,callPan);audio.setDevice('busy',annexCallAt>=0&&!['2803','1704'].includes(annexCallTo)?callLevel:0,callPan);
      if(annexCallAt>=0&&annexCallBeat>0)audio.setRecordingPosition(callLevel,callPan);
      world.updateIntercom?.(annexNumber,annexCallAt>=0?annexCallTo+'호 호출 중\n'+(annexCallBeat?'연결됨 · CLEAR로 통화 종료':'수신 응답 대기'):annexCallResult||(['annex_exit_ready','annex_departure'].includes(story.stage)?'2803 · 응답 종료\n북쪽 문 잠금 해제':'수신 세대 네 자리 → CALL\nCLEAR · 지우기 / 종료'),elapsed<annexPressedUntil?annexPressed:null);
    }
    if(area==='courtyard'){
      const point=world.targets.find(t=>t.id==='court_phone')!.point,dx=point.x-camera.position.x,dz=point.z-camera.position.z,distance=Math.hypot(dx,dz),blocked=!hasLineOfSight(camera.position,point,world.solids),level=Math.min(1,3/Math.max(1,distance))*(blocked?.35:1),pan=T.MathUtils.clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,distance),-1,1);
      audio.setDevice('ringback',courtCallAt>=0&&courtCallBeat===0?level:0,pan);if(courtCallAt>=0&&courtCallBeat>0)audio.setRecordingPosition(level,pan);
      world.courtPhone?.setState(courtCallAt>=0?(courtCallBeat?'connected':'ringing'):story.notes.includes('court_phone')?'complete':'idle',elapsed<courtPressedUntil?courtPressed:'');
    }
    if(recordingAt>=0){const source=recordingClue==='annex_call'?{x:11.57,y:.86,z:-5}:{x:-3.8,y:.84,z:3.6},dx=source.x-camera.position.x,dz=source.z-camera.position.z,distance=Math.hypot(dx,dz);const blocked=!hasLineOfSight(camera.position,source,world.solids);audio.setRecordingPosition(Math.min(1,2/Math.max(1,distance))*(blocked?.4:1),T.MathUtils.clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,distance),-1,1));}
    renderWorld(dt);
    if(started&&!paused&&story.stage!=='ended')findTarget();
    if(started&&!paused&&elapsed-lastEmit>.09){lastEmit=elapsed;emit();}
    if(road)road.renderMirror(renderer);
    world.surveillance?.render(renderer,scene);
    renderer.render(scene,camera);
    if(hands.root.visible){renderer.autoClear=false;renderer.clearDepth();renderer.render(hands.scene,hands.camera);renderer.autoClear=true;}
  }
  // Compile the hidden apparition and mouth materials on the loading screen too.
  // Otherwise their first visible frame can synchronously compile a new shader.
  const compilation=[renderer.compileAsync?.(scene,camera),renderer.compileAsync?.(hands.scene,hands.camera)];
  const ready=Promise.all(compilation).then(async()=>{
    if(disposed||started)return;preparing=true;world.root.removeFromParent();
    try{audio.prepare();}catch{audio.dispose();} // Retry from the start gesture on restricted devices.
    const oldTarget=renderer.getRenderTarget(),viewport=new T.Vector4();renderer.getViewport?.(viewport);
    const oldVisibility=canvas.style?.visibility;if(canvas.style)canvas.style.visibility='hidden';
    const savedCamera=camera.position.clone(),oldRotation=camera.quaternion.clone();
    async function warm(root:T.Group,spawn:T.Vector3,extraPass?:()=>void|Promise<void>){
      scene.add(root);camera.position.copy(spawn);camera.rotation.set(0,0,0);camera.updateMatrixWorld();
      const flags:{o:T.Object3D;visible:boolean;frustum:boolean}[]=[];
      root.traverse(o=>{flags.push({o,visible:o.visible,frustum:o.frustumCulled});if(!(o instanceof T.Light))o.visible=true;o.frustumCulled=false;});
      try{
        // The default framebuffer uses different tone-mapping/color shaders than a render target.
        renderer.setRenderTarget(null);renderer.setViewport?.(0,0,128,128);
        await renderer.compileAsync?.(scene,camera);
        if(!disposed){renderer.render(scene,camera);await extraPass?.();}
      }finally{for(const f of flags){f.o.visible=f.visible;f.o.frustumCulled=f.frustum;}root.removeFromParent();}
      await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
    try{
      for(const next of Object.keys(chapters) as Area[]){if(disposed)break;const w=preparedWorld(next);await warm(w.root,w.spawn,()=>w.surveillance?.prepare(renderer,scene));if(next==='parking'&&w.carDeparture){for(const t of [3,7,24]){camera.position.set(3.2,1.65,-17.8);w.carDeparture.pose(t,camera,false);await warm(w.root,camera.position.clone());}w.reset();}if(next==='lift'){w.updateStory?.('service_open',0,false);await warm(w.root,w.spawn);w.reset();}}
      // The mirror uses a linear render target and hides the car's lights. Its
      // material programs differ from the main camera, even for the same mesh.
      for(const ending of [false,true]){if(disposed)break;const r=preparedRoad(ending);await warm(r.root,new T.Vector3(1.8,1.4,4),()=>r.renderMirror(renderer));}
      const garage=preparedWorld('parking'),exitRoad=preparedRoad(true);exitRoad.setDepartureFrame(departureFrame);exitRoad.pose('car_escape',0,camera,reducedMotion);exitRoad.root.getObjectByName('memory-car')!.visible=false;scene.add(exitRoad.root);
      try{for(const o of garage.root.children)if(o.userData.departureRoadSurface)o.visible=false;for(const t of [3,7,24]){camera.position.set(3.2,1.65,-17.8);garage.carDeparture!.pose(t,camera,false);await warm(garage.root,camera.position.clone());}}finally{garage.reset();exitRoad.root.removeFromParent();exitRoad.root.getObjectByName('memory-car')!.visible=true;}
    }finally{renderer.setRenderTarget(oldTarget);renderer.setViewport?.(viewport);if(!disposed)resize();camera.position.copy(savedCamera);camera.quaternion.copy(oldRotation);scene.add(world.root);preparing=false;if(canvas.style)canvas.style.visibility=oldVisibility??'';}
  });
  frameId=requestAnimationFrame(frame);emit();
  function crouch(){if(!started||paused||evidenceReaction||story.hidden||isCinematic(story.stage)||story.stage==='tv'||story.stage==='ended'||story.stage==='dying')return;crouched=!crouched;emit();}
  function configure(next:Partial<Settings>){settings=normalizeSettings({...settings,...next});reducedMotion=systemReduced||settings.reducedMotion;audio.setVolume(settings.volume);audio.mix(settings);renderer.toneMappingExposure=settings.brightness;camera.fov=settings.fov;camera.updateProjectionMatrix();keys.clear();if(storage)writeSettings(storage,settings);emit();}
  return {ready,start,pause,skipDeath(){if(story.stage==='dying'&&stageTime>1.2)advance('dead');},getSettings:()=>({...settings,bindings:{...settings.bindings}}),continueGame(){if(saved)start('continue');},skipMemory(){if(started&&!paused&&isMemory(story.stage)){advance('skip_memory');lock();}},interact,snapshot,configure,crouch,hold(active:boolean){if(!paused&&!evidenceReaction&&!isCinematic(story.stage)&&story.stage!=='dying'&&story.stage!=='ended')holding=active;},torch(){if(!hasFlashlight(story)||paused||evidenceReaction||isCinematic(story.stage)||story.stage==='ended'||story.stage==='dying'||story.stage==='tv'||story.stage==='wake_ring')return;torch=!torch;emit();},key(code:string,down:boolean){if(paused||evidenceReaction||isCinematic(story.stage)||story.stage==='ended'||story.stage==='dying')return;if(down)keys.add(code);else keys.delete(code);},dispose(){
    if(disposed)return;
    disposed=true;cancelAnimationFrame(frameId);observer.disconnect();audio.dispose();if(document.pointerLockElement===canvas)document.exitPointerLock();
    document.removeEventListener('keydown',keydown);document.removeEventListener('keyup',keyup);document.removeEventListener('pointermove',pointermove);document.removeEventListener('pointerup',pointerup);document.removeEventListener('pointerlockchange',lockchange);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',blur);canvas.removeEventListener('pointerdown',pointerdown);
    // Three's asynchronous compiler still reads material programs while polling.
    // Stop gameplay immediately, but keep GPU resources alive until it settles.
    const releaseGraphics=()=>{for(const r of roads.values()){r.dispose();disposeWorld(r.root);}for(const w of worlds.values())disposeWorld(w.root);disposeWorld(hands.scene);flashlight.shadow.map?.dispose();reflections.dispose();renderer.dispose();clearPrintedSources();};
    void ready.catch(()=>{}).then(releaseGraphics);
  }};
}
export type Game=ReturnType<typeof createGame>;
