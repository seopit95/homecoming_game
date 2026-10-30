import {apartmentRouteTransition,apartmentRouteObjective,normalizeApartmentRoute} from './apartment-route.ts';
import {expansionObjectives,expansionJournal,expansionTransition,expansionObjective,isExpansion,type ExpansionStage,type ExpansionAction,type ExpansionArea} from './expansion-story.ts';
export type Stage = ExpansionStage|'lift_climb'|'transfer_gallery'|'transfer_wait'|'transfer_enter'|'transfer_boarding'|'transfer_panel'|'transfer_ride'|'transfer_exit'|'stairs_ground'|'stairs_descent'|'corridor_departure'|'stairs_passage'|'resident_arrival'|'resident_departure'|'car_departure'|'car_escape'|'car_voice'|'car_crash'|'drive'|'impact'|'flee'|'sleep'|'tv'|'wake_ring'|'light_switch'|'find_torch'|'phone'|'power'|'shoes'|'radio'|'listen'|'hide'|'wait'|'escape'|'lift_call'|'lift_wait'|'lift_enter'|'lift_boarding'|'lift_button'|'descent'|'pry'|'lift_exit'|'corridor_run'|'stairs_loop'|'stairs_clue'|'stairs_reverse'|'office_record'|'office_fuse'|'office_power'|'office_tape'|'office_playback'|'office_key'|'office_leave'|'parking_gate'|'parking_key'|'parking_pump'|'parking_alarm'|'parking_run'|'resident_entry'|'resident_memory'|'resident_return'|'road_exit'|'road_evidence'|'road_call'|'road_wait'|'dying'|'ended';
export type Area = ExpansionArea|'transfer'|'apartment'|'landing'|'lift'|'corridor'|'stairs'|'office'|'parking'|'resident'|'aftermath';
export type Action = ExpansionAction|'climbed'|'ground_arrived'|'shelter'|'home_repair'|'annex_radio'|'gallery_notice'|'core_notice'|'office_install'|'car_passenger'|'stair_loop'|'stair_enter'|'stair_exit'|'resident_open'|'office_entry'|'car_departed'|'car_board'|'passenger'|'wreck'|'fatal'|'collision'|'fled'|'home'|'wake'|'skip_memory'|'blackout'|'awake'|'switch'|'flashlight'|'circuit_a'|'circuit_b'|'circuit_c'|'tape_next'|'car_search'|'valve_a'|'valve_b'|'pump'|'phone'|'breaker'|'shoes'|'radio'|'heard'|'closet'|'survived'|'door'|'caught'|'call'|'arrived'|'enter'|'sealed'|'panel'|'stopped'|'pry'|'leave_lift'|'stairs'|'down'|'stair_note'|'up'|'record'|'fuse'|'security_power'|'monitor'|'office_finish'|'service_key'|'service_exit'|'exit'|'alarm'|'dead'|'belongings'|'portrait'|'answerphone'|'resident_leave'|'car_door'|'road_bag'|'road_phone'|'stay'|'lure'|'resident_drawer'|'resident_key'|'resident_shift';
export type Story = {stage:Stage;hidden:boolean;ending:'crashed'|'caught'|null;resume:Stage;notes:string[];circuit:Action[];officeSupply:boolean;tapeIndex:number;code?:string};
export const chaseStages:Stage[]=['transfer_gallery','transfer_wait','transfer_enter','court_search','court_code','court_safe_open','court_unlocked','court_departure','office_departure','annex_arrival','annex_fuse','annex_restore','annex_search','annex_unlock','annex_exit_ready','annex_departure','archive_search','archive_edit','archive_reveal','archive_playback','archive_escape','archive_departure','plant_isolate','plant_power','plant_drain','plant_exit_ready','plant_departure','hide','escape','lift_call','lift_wait','lift_enter','corridor_run','corridor_departure','stairs_loop','stairs_descent','stairs_clue','stairs_reverse','stairs_passage','office_record','office_fuse','office_power','office_tape','office_playback','office_key','office_leave','parking_gate','parking_key','parking_pump','parking_alarm','parking_run','resident_arrival','resident_entry','resident_memory','resident_return','resident_departure'];
export const opening:Partial<Record<Stage,{duration:number;action:Action;label:string;text:string;cues?:{at:number;text:string}[]}>>={
  drive:{duration:20,action:'collision',label:'사흘 전 · 새벽 03:17',text:'사업이 무너진 뒤 술을 놓지 못했다.\n그날도 술을 마셨다.',cues:[
    {at:2.4,text:'「하… 취한다.」'},
    {at:4,text:'술을 마시고 운전하는 일도 반복됐다.\n집까지 세 블록, 괜찮다고 우겼다.'},
    {at:8.5,text:'백로아파트. 매일 다니던 길이었다.'},
    {at:12,text:'아내는 술 마신 날에는 운전하지 말라고 했다.\n나는 또 병째 한 모금을 삼켰다.'},
    {at:15.9,text:'휴대전화가 진동했다.'},
    {at:18.6,text:''},
  ]},
  impact:{duration:23.5,action:'fled',label:'03:17 · 백로아파트 앞 횡단보도',text:'',cues:[
    {at:2.2,text:'…사람이었다.'},
    {at:5.9,text:'차에서 내렸다.\n비가 얼굴에 쏟아졌다.'},
    {at:10.5,text:'쓰러진 몸 옆에 가방이 떨어져 있었다.\n움직임이 없었다. 즉사했다고 생각했다.'},
    {at:12.7,text:'신고해야 했다.'},
    {at:15.2,text:'그런데 나는 차로 돌아갔다.'},
    {at:22.7,text:'문을 잠갔다.'},
  ]},
  flee:{duration:8,action:'home',label:'03:17 · 현장을 떠났다',text:'브레이크에서 발을 뗐다.',cues:[
    {at:2.6,text:'백미러 속 횡단보도가 멀어졌다.'},
    {at:5.4,text:'뒤를 다시 보지 않았다.'},
  ]},
  sleep:{duration:8,action:'wake',label:'그날 새벽 · 28층 2803호',text:'집에 돌아와 젖은 신발을 벗었다.\n아이는 외할머니 댁에 있었다.',cues:[
    {at:3,text:'아이의 「아빠」라는 목소리만 떠올랐다.\n신고하지 않았다. 아무에게도 말하지 않았다.'},
    {at:6,text:''},
  ]},
};
// These beats also drive the camera, phone props and sound; they share simulation time.
export const openingTiming={phoneBuzz:15.9,lookUp:17.6,brake:19.1,doorOpen:2.8,exit:3.6,outside:5.8,doorShut:6.5,walk:6.8,inspect:10.5,return:14.8,atDoor:18.5,reopen:18.7,board:19.4,seated:21.6,close:21.8,lock:22.7} as const;
export function hasFlashlight(s:Pick<Story,'stage'>){return !['drive','impact','flee','sleep','tv','wake_ring','light_switch','find_torch'].includes(s.stage);}
export const carDepartureDuration=12;
export const carExitSpeed=10;
export const finale:Partial<Record<Stage,{duration:number;action:Action;label:string;text:string;cues?:{at:number;text:string}[]}>>={
  car_departure:{duration:carDepartureDuration,action:'car_departed',label:'B1 · 운전석',text:'문을 연다.',cues:[{at:5.5,text:'문이 잠겼다.'},{at:6,text:'시동이 걸렸다. 차량 셔터가 올라간다.'},{at:8.4,text:'앞만 보고 액셀을 밟았다.'},{at:11.7,text:''}]},
  car_escape:{duration:10,action:'passenger',label:'제 11장 · 동승자',text:'경사로 끝. 도로가 보인다.',cues:[{at:3,text:'경사로가 뒤로 멀어졌다.'},{at:6,text:'이제… 빠져나왔다.'},{at:6.4,text:'딸깍. 처음 전화에서 들었던 잠금음.\n수화기 속 빗소리와 와이퍼… 이 차 안의 소리였다.'},{at:8.5,text:'처음부터 나를 밖으로 부른 것이 아니었다.\n다시 이 자리에 앉히고 있었다.'}]},
  car_voice:{duration:3,action:'wreck',label:'03:17 · 조수석의 아내',text:'「이번에도… 혼자 가려고?」',cues:[{at:4.1,text:''}]},
  car_crash:{duration:5.5,action:'fatal',label:'03:17',text:'',cues:[{at:3,text:'브레이크를 밟기에는 늦었다.'}]},
};
// Reuse the same bank clip at the first phone and after the final escape.
export const phoneCallback={clip:'archive-lock',finalStage:'car_escape',at:6.4} as const;
export const finaleTiming={turn:.25,reveal:1.45,forwardStart:.02,forwardEnd:.60,impact:.78,truckSpeed:32} as const;
export function isFinale(stage:Stage){return finale[stage]!==undefined;}
export function isCinematic(stage:Stage){return isMemory(stage)||isFinale(stage)||stage==='lift_climb';}
export const residentEvidence=['belongings','answerphone','portrait','resident_shift'] as const;
export function officePowerLoad(s:Pick<Story,'circuit'>){return s.circuit.reduce((n,a)=>n+(a==='circuit_a'?4:a==='circuit_b'?2:a==='circuit_c'?4:0),0);}
export function officePowerProblem(s:Pick<Story,'notes'|'circuit'>){
  if(!s.notes.includes('office_install'))return 'fuse';
  if(officePowerLoad(s)>6)return 'overload';
  if(!officePowerLoad(s))return 'empty';
  return null;
}
export function officeCanWatch(s:Pick<Story,'notes'|'circuit'|'officeSupply'>){return s.officeSupply&&!officePowerProblem(s)&&s.circuit.includes('circuit_b');}
export function officeCanLeave(s:Pick<Story,'notes'|'circuit'|'officeSupply'>){return s.officeSupply&&!officePowerProblem(s)&&s.circuit.includes('circuit_c')&&s.notes.includes('service_key');}
function officePhase(s:Story):Stage{
  if(s.stage==='office_departure'||s.stage==='office_playback'&&officeCanWatch(s))return s.stage;
  if(officeCanLeave(s))return 'office_leave';
  if(officeCanWatch(s)&&!s.notes.includes('monitor'))return 'office_tape';
  if(officeCanWatch(s)&&!s.notes.includes('service_key'))return 'office_key';
  return s.notes.includes('fuse')||s.notes.includes('office_install')?'office_power':s.notes.includes('record')?'office_fuse':'office_record';
}
export function objectiveFor(story:Story){
  const route=apartmentRouteObjective(story);if(route)return route;
  if(story.stage.startsWith('office')&&!['office_departure','office_boarding','office_playback'].includes(story.stage)){
    if(officeCanLeave(story))return '관리용 승강기에서 모터 소리가 돌아온다. 오래 기다릴 수는 없다.';
    if(officeCanWatch(story)&&!story.notes.includes('monitor'))return 'CCTV 화면이 켜졌다. 내 차가 돌아왔던 시간은 기억한다.';
    if(!story.notes.includes('fuse'))return '관리실은 비상전원을 쓰고 있다. 인계 기록에 남은 고장 흔적.';
    if(!story.notes.includes('office_install'))return '예비 퓨즈를 챙겼다. 타 버린 홀더가 있던 곳으로.';
    return `비상전원 ${officePowerLoad(story)}/6A · ${story.officeSupply?'공급 중':'차단됨'}. 모든 회로를 함께 살릴 수는 없다.`;
  }
  if(story.stage==='parking_key')return story.notes.includes('car_passenger')?'벌어진 가방에서 열쇠를 집는다.\n젖은 금속이 보인다.':'내 차 오른쪽 조수석 문을 연다.\n떠날 때 두었던 가방이 그대로다.';
  if(parkingCanBoard(story.stage)&&parkingAlarmActive(story))return objectives.parking_run;
  const expanded=expansionObjective(story);if(expanded)return expanded;
  if(['resident_entry','resident_memory','resident_return'].includes(story.stage)){
    if(story.notes.includes('resident_key'))return '1703. 열쇠의 숫자는 옆집과 같다. 현관 쪽에서 다시 소리가 난다.';
    if(story.notes.includes('resident_drawer'))return '서랍 안에서 작은 금속이 번뜩인다. 전화벨은 멎었다.';
    if(story.notes.includes('resident_shift'))return '퇴근 후 연결문을 잠근다는 기록. 여벌 열쇠도 이 집에 있다.';
    if(story.notes.includes('belongings'))return '연결문은 잠겼다. 누군가는 이 집에 열쇠를 두었을 것이다.';
    return '돌아오지 못한 사람의 집. 불은 꺼졌는데 생활의 흔적이 남아 있다.';
  }return objectives[story.stage];
}
export const officeReplay=[{at:0,text:'앞부분이 찌그러진 내 차다. 사흘 전, 돌아왔던 시간.'},{at:3,text:'…시간이 아홉 초를 건너뛰었다.\n차 문은 닫혀 있고, 나는 혼자 걸어간다.'},{at:7,text:'조수석 유리에 흰 소매. 귀가자 두 명?\n함께 내린 사람은 없는데.'}] as const;
export const officeReplayDuration=11;
export const tapeTimes=['03:17 · 진입로','03:26 · 지하 입차','03:31 · 승강기'];
export function isMemory(stage:Stage){return opening[stage]!==undefined;}
export function initialStory():Story{return {stage:'drive',hidden:false,ending:null,resume:'radio',notes:[],circuit:[],officeSupply:false,tapeIndex:0,code:'0000'};}
export function parkingDrained(state:Pick<Story,'notes'>){return state.notes.includes('basement_route')||state.notes.includes('plant_drained')||state.notes.includes('pump');}
function parkingAfterKey(state:Pick<Story,'notes'>){return parkingDrained(state)?'parking_alarm':'parking_pump';}
export const parkingBoardDuration=.2;
export function parkingCanBoard(stage:Stage){return stage==='parking_alarm'||stage==='parking_run';}
export function parkingAlarmActive(s:Pick<Story,'stage'|'notes'>){return s.notes.includes('alarm')||s.stage==='parking_run';}
export function retryStage(stage:Stage):Stage{
  if(['annex_fuse','annex_restore','annex_search'].includes(stage))return 'annex_unlock';
  if(stage==='stairs_ground')return 'transfer_gallery';
  if(stage==='lift_climb')return 'lift_exit';
  if(stage.startsWith('transfer_'))return ['transfer_panel','transfer_ride','transfer_exit'].includes(stage)?'transfer_panel':'transfer_gallery';
  if(stage==='car_departure')return stage;
  if(stage==='parking_alarm')return stage;
  if(stage==='archive_playback')return 'archive_reveal';
  if(isExpansion(stage))return stage.endsWith('departure')?(stage.startsWith('annex')?'annex_exit_ready':stage.startsWith('archive')?'archive_escape':stage.startsWith('court')?'court_unlocked':'plant_exit_ready'):stage;
  if(stage==='service_ride'||stage==='service_open')return 'service_ride';
  if(stage==='lift_exit'||stage==='corridor_run'||stage==='corridor_departure')return 'lift_exit';
  if(['lift_boarding','lift_button','descent','pry'].includes(stage))return 'lift_button';
  if(stage==='resident_arrival')return stage;
  if(stage.startsWith('resident'))return 'resident_entry';
  if(stage.startsWith('road')||isFinale(stage))return 'car_escape';
  return stage==='parking_run'?'parking_alarm':stage.startsWith('parking')?'parking_gate':stage.startsWith('office')?'office_record':stage.startsWith('stairs')?'stairs_loop':stage.startsWith('lift')?'lift_call':'radio';
}
export function checkpoint(state?:Story):Story{
  const current=state?.stage;
  let stage:Stage=current&&current!=='ended'&&current!=='dying'?retryStage(current):state?.resume||'radio';
  if(state?.stage==='corridor_run')stage='lift_exit';
  if(state?.stage==='parking_run')stage='parking_alarm';
  if(stage==='parking_gate'&&state?.notes.includes('car_search'))stage=parkingAfterKey(state);
  else if(stage==='parking_gate'&&state?.notes.includes('car_passenger'))stage='parking_key';
  if(['court_search','court_code','court_safe_open'].includes(stage)&&state?.notes.includes('court_key'))stage='court_unlocked';
  else if(['court_search','court_code'].includes(stage)&&state?.notes.includes('court_confirm'))stage='court_safe_open';
  if(stage==='resident_entry'&&state?.notes.includes('resident_key'))stage='resident_return';
  if(stage==='office_record'&&state)stage=officePhase({...state,stage});
  return normalizeApartmentRoute({...initialStory(),stage,resume:stage,notes:[...(state?.notes||[])],circuit:isExpansion(stage)||stage.startsWith('office')?[...(state?.circuit||[])]:[],officeSupply:state?.officeSupply??false,code:state?.code??'0000'});
}
const steps:Partial<Record<Stage,[Action,Stage]>>={
  drive:['collision','impact'],impact:['fled','flee'],flee:['home','sleep'],sleep:['wake','wake_ring'],
  tv:['blackout','wake_ring'],wake_ring:['awake','light_switch'],light_switch:['switch','find_torch'],find_torch:['flashlight','phone'],power:['breaker','phone'],phone:['phone','shoes'],shoes:['shoes','radio'],radio:['radio','listen'],listen:['heard','hide'],
  escape:['door','lift_call'],lift_call:['call','lift_wait'],lift_wait:['arrived','lift_enter'],lift_enter:['enter','lift_boarding'],lift_boarding:['sealed','lift_button'],lift_button:['panel','descent'],descent:['stopped','pry'],pry:['pry','lift_exit'],lift_exit:['leave_lift','corridor_run'],corridor_run:['stairs','corridor_departure'],corridor_departure:['stair_enter','stairs_loop'],
  stairs_loop:['down','stairs_descent'],stairs_descent:['stair_loop','stairs_reverse'],stairs_clue:['up','stairs_passage'],stairs_reverse:['up','stairs_passage'],stairs_passage:['stair_exit','resident_arrival'],resident_arrival:['resident_open','resident_entry'],
  parking_alarm:['alarm','parking_run'],car_departure:['car_departed','car_escape'],car_escape:['passenger','car_voice'],car_voice:['wreck','car_crash'],car_crash:['fatal','ended'],resident_departure:['office_entry','office_record'],
};
export function transition(state:Story,action:Action):Story{
  if(state.stage==='ended')return state;
  if(action==='skip_memory'&&isMemory(state.stage))return {...state,stage:'wake_ring',notes:state.notes.includes('wake')?state.notes:[...state.notes,'wake']};
  if(state.stage==='dying')return action==='dead'?{...state,stage:'ended'}:state;
  if(action==='caught'&&chaseStages.includes(state.stage)&&!state.hidden){
    const resume=retryStage(state.stage);
    return {...state,stage:'dying',ending:'caught',resume};
  }
  const routed=apartmentRouteTransition(state,action);if(routed)return routed;
  if(action==='closet'){
    if(state.stage==='hide')return {...state,stage:'wait',hidden:true};
    if(state.stage==='wait')return {...state,stage:'escape',hidden:false};
    if(state.stage==='escape')return {...state,hidden:!state.hidden,stage:state.hidden?'escape':'wait'};
  }
  if(state.stage==='wait'&&state.hidden&&action==='survived')return {...state,stage:'escape'};
  if(state.hidden)return state;
  if(action==='home_repair'&&areaFor(state)==='apartment'&&hasFlashlight(state))return state.notes.includes(action)?state:{...state,notes:[...state.notes,action]};
  if(action==='gallery_notice'&&['lift_call','lift_wait','lift_enter'].includes(state.stage)||action==='core_notice'&&['corridor_run','corridor_departure'].includes(state.stage))return state.notes.includes(action)?state:{...state,notes:[...state.notes,action]};
  if(action==='door'&&['hide','escape'].includes(state.stage))return {...state,stage:'lift_call'};
  if(['resident_entry','resident_memory','resident_return'].includes(state.stage)){
    if(action==='resident_leave')return state.notes.includes('resident_key')?{...state,stage:'resident_departure'}:state;
    if(action==='resident_key'){
      if(!state.notes.includes('resident_drawer')||state.notes.includes(action))return state;
      return {...state,notes:[...state.notes,action],stage:'resident_return'};
    }
    if(action==='resident_drawer'||residentEvidence.includes(action as typeof residentEvidence[number])){
      if(state.notes.includes(action))return state;
      return {...state,notes:[...state.notes,action],stage:state.notes.includes('resident_key')?'resident_return':'resident_memory'};
    }
  }
  if(state.stage.startsWith('office')&&!['office_departure','office_boarding'].includes(state.stage)){
    let next:Story|undefined;
    if(['record','fuse','service_key'].includes(action)){
      if(state.notes.includes(action))return state;
      next={...state,notes:[...state.notes,action]};
    }else if(action==='office_install'){
      if(!state.notes.includes('fuse')||state.notes.includes(action))return state;
      next={...state,notes:[...state.notes,action]};
    }else if(['circuit_a','circuit_b','circuit_c'].includes(action)){
      next={...state,officeSupply:false,circuit:state.circuit.includes(action)?state.circuit.filter(a=>a!==action):[...state.circuit,action]};
    }else if(action==='security_power'){
      const problem=officePowerProblem(state);
      if(problem==='overload')next={...state,officeSupply:false,circuit:[]};
      else if(problem||state.officeSupply)return state;
      else next={...state,officeSupply:true,notes:[...new Set([...state.notes,action])]};
    }else if(action==='tape_next')return officeCanWatch(state)&&state.stage!=='office_playback'?{...state,tapeIndex:(state.tapeIndex+1)%3}:state;
    else if(action==='monitor')return officeCanWatch(state)&&!state.notes.includes('monitor')&&state.stage!=='office_playback'&&state.tapeIndex===1?{...state,stage:'office_playback'}:state;
    else if(action==='office_finish'){
      if(state.stage!=='office_playback'||!officeCanWatch(state))return state;
      next={...state,stage:'office_power',notes:[...new Set([...state.notes,'monitor'])]};
    }else if(action==='service_exit')return officeCanLeave(state)?{...state,stage:'office_departure'}:state;
    if(next)return {...next,stage:officePhase(next)};
  }
  if(state.stage.startsWith('parking')){
    if(action==='exit')return state.notes.includes(action)?state:{...state,stage:state.stage==='parking_gate'?(state.notes.includes('car_search')?parkingAfterKey(state):'parking_key'):state.stage,notes:[...state.notes,action]};
    if(action==='car_passenger'&&['parking_gate','parking_key'].includes(state.stage))return state.notes.includes(action)?state:{...state,stage:'parking_key',notes:[...state.notes,action]};
    if(action==='car_board'&&parkingCanBoard(state.stage))return {...state,stage:'car_departure'};
  }
  if(state.stage==='parking_key'){
    if(action==='car_search'&&!state.notes.includes('car_passenger'))return state;
  }
  if(state.stage==='parking_pump'){
    if(action==='valve_a'||action==='valve_b')return state.notes.includes(action)?state:{...state,notes:[...state.notes,action]};
    if(action==='pump'&&['valve_a','valve_b'].every(n=>state.notes.includes(n)))return {...state,stage:'parking_alarm',notes:[...new Set([...state.notes,'pump'])]};
  }
  const expanded=expansionTransition(state,action);if(expanded)return expanded;
  if(state.stage==='parking_key'&&action==='car_search')return {...state,stage:parkingAfterKey(state),notes:[...new Set([...state.notes,action])]};
  const next=steps[state.stage];if(next?.[0]!==action)return state;
  const notes=journal[action]&&!state.notes.includes(action)?[...state.notes,action]:state.notes;
  if(action==='flashlight')return {...state,stage:'phone',notes:[...new Set([...notes,'smartphone'])]};
  if(action==='phone'&&state.notes.includes('smartphone'))return {...state,stage:'power',notes};
  if(action==='breaker'&&state.notes.includes('phone'))return {...state,stage:'shoes',notes};
  return {...state,stage:next[1],notes,ending:next[1]==='ended'?'crashed':null};
}
export function areaFor(story:Story):Area{
  const s=story.stage==='ended'?story.resume:story.stage;
  if(['lift_call','lift_wait','lift_enter','lift_boarding'].includes(s))return 'landing';
  if(['lift_button','descent','pry','lift_exit','lift_climb','transfer_panel','transfer_ride','transfer_exit'].includes(s))return 'lift';
  if(s==='corridor_run'||s==='corridor_departure')return 'corridor';
  if(s.startsWith('transfer_'))return 'transfer';
  if(s.startsWith('stairs'))return 'stairs';
  if(s.startsWith('service_'))return 'lift';
  if(s.startsWith('court_'))return 'courtyard';
  if(s.startsWith('annex_'))return 'annex';
  if(s.startsWith('archive_'))return 'archive';
  if(s.startsWith('plant_'))return 'plant';
  if(s.startsWith('office'))return 'office';
  if(s==='car_departure'||s.startsWith('parking'))return 'parking';
  if(s.startsWith('resident'))return 'resident';
  if(s.startsWith('road')||isFinale(s))return 'aftermath';
  return 'apartment';
}
export const chapters:Record<Area,{number:string;title:string;floor:string}>={
  courtyard:{number:'07',title:'문 너머의 도로',floor:'1F · 외부 중정'},
  annex:{number:'05',title:'불 꺼진 공동현관',floor:'1F'},archive:{number:'06',title:'지워 달라고 했던 기록',floor:'1F · 관리실 서고'},plant:{number:'07',title:'마지막 방화문',floor:'1F → B1'},
  transfer:{number:'04',title:'다른 문',floor:'20F'},apartment:{number:'01',title:'먼저 와 있는 사람',floor:'28F · 2803호'},landing:{number:'02',title:'하강',floor:'28F'},lift:{number:'02',title:'하강',floor:'엘리베이터'},corridor:{number:'03',title:'닫히지 않는 문',floor:'24F'},stairs:{number:'03',title:'아래의 문',floor:'24F → 20F'},office:{number:'05',title:'없는 층의 관리실',floor:'17F'},parking:{number:'10',title:'다시 운전석',floor:'B1'},resident:{number:'04',title:'돌아오지 못한 사람',floor:'17F · 1704호'},aftermath:{number:'11',title:'동승자',floor:'03:17 · 귀갓길'},
};
export const objectives:Record<Stage,string>={lift_climb:'문턱을 짚고 올라간다.',transfer_gallery:"20층 2호기 호출 버튼을 누른다.\n빈 승강기여야 한다.",transfer_wait:'2호기 호출등이 켜졌다. 문이 열리고 있다.',transfer_enter:"열린 2호기 안으로 들어간다.\n등 뒤를 돌아보지 마.",transfer_boarding:'탔다. 문이 닫히고 있다.',transfer_panel:"승강기 1층 버튼을 누른다.\n이번에는 아래까지.",transfer_ride:'1층으로 내려가는 중.',transfer_exit:"문을 지나 1층 공동현관으로 나간다.\n문밖도 조용하기만 하다.",stairs_ground:'비상계단을 따라 1층까지 계속 내려간다.',
  ...expansionObjectives,
  drive:'사흘 전의 기억',impact:'사람이었다',flee:'나는 도망쳤다',sleep:'집으로 돌아와 잠들었다',tv:'사흘 뒤',wake_ring:'전화벨에 잠이 깬다',light_switch:"침실 입구의 전등 스위치를 켠다.\n내 방인데, 어둠이 낯설다.",find_torch:"침대 옆 스마트폰을 집는다.\n꺼진 방에서 화면만 눈을 뜬다.",phone:"스마트폰 전화를 받는다.\n발신자 표시 제한. 이 시간에 누가.",power:"다용도실 배전반을 확인한다.\n타는 냄새가 난다. 우리 집만 어둡다.",shoes:"현관의 젖은 신발을 살핀다.\n문은 잠겨 있었는데.",radio:"침실 라디오를 끈다.\n분명, 내가 꺼 두었는데.",listen:"복도에서 들리는 소리에 귀를 기울인다.\n라디오는 꺼졌는데, 소리는 멎지 않는다.",hide:"침실 장롱에 몸을 숨긴다.\n발소리가 멈추지 않는다.",wait:"장롱 안에서 조용히 기다린다.\n발소리가 멀어질 때까지.",escape:"지금 현관문으로 나간다.\n뒤를 확인할 시간은 없다.",
  lift_call:"복도 끝 승강기의 호출 버튼을 누른다.\n발소리가 복도까지 따라온다.",lift_wait:"승강기 문이 열리기를 기다린다.\n올라오는 것은 맞겠지.",lift_enter:"열린 승강기 안으로 들어간다.\n복도에 더 머물 수 없다.",lift_boarding:'탑승했다. 문이 닫히고 있다',lift_button:"승강기 1층 버튼을 누른다.\n이번에는 멈추지 마.",descent:'1층으로 내려가는 중',pry:"문 앞에서 E를 길게 눌러 벌린다.\n문틈 너머에서 찬 공기가 샌다.",lift_exit:"벌어진 문틈으로 나간다.\n아래에 발 디딜 바닥이 보인다.",corridor_run:"반대편 비상계단으로 달린다.\n또 같은 복도다.",
  corridor_departure:'방화문 너머 계단. 문을 닫을 시간은 없다.',stairs_loop:"비상계단을 따라 아래로 내려간다.\n위에서 발을 끄는 소리가 난다.",stairs_descent:'아래로. 발소리가 바로 위 계단에서 들린다.',stairs_clue:'아래쪽은 막혔다. 위쪽 방화문 너머로 내려갈 길이 보인다.',stairs_reverse:'17층. 위쪽 방화문을 통해 1층으로 내려간다.',stairs_passage:'열린 문을 지나 복도로 나간다.',office_record:'관리실 책상의 야간 근무일지를 확인하세요',office_fuse:'서고의 예비 부품대에서 퓨즈를 찾으세요',office_power:'전기실 배전반에 퓨즈를 설치하고 6A 한도 안에서 필요한 회로를 선택하세요',office_tape:'CCTV 시간 선택 버튼으로 내 차가 입차한 기록을 찾아 재생하세요',office_playback:'재생 중 · 지하 입차 기록의 누락 구간을 확인하세요',office_key:'CCTV 오른쪽 책상에 놓인 관리용 승강기 열쇠를 챙기세요',office_leave:'복도 끝 관리용 승강기를 열어 1층으로 내려가세요',
  parking_gate:'주차장. 내 차만 그대로 서 있다. 출구 쪽에는 물이 차 있다.',parking_key:'내 차 오른쪽 조수석 문을 열고 가방에서 설비 열쇠를 찾으세요',parking_pump:'물이 계속 밀려든다. 펌프보다 먼저 유입을 멈춰야 한다.',parking_alarm:"운전석 문 앞에서 E를 눌러 탄다.\n다시 혼자 나갈 수 있을까.",parking_run:"기둥과 차체 뒤로 피해 운전석에 탄다.\n경보가 멎으면 나를 향해 온다.",resident_arrival:'1704호. 전화벨과 명패의 이름이 겹친다. 한서연.',resident_departure:'연결문이 열렸다. 뒤에서는 더 이상 발소리가 나지 않는다.',resident_entry:'1704호. 현관에 그 신발 한 짝이 남아 있다',resident_memory:'서재의 수첩과 서랍을 살펴 연결문 열쇠를 찾으세요',resident_return:'연결문 열쇠를 챙겼다. 뒤쪽 1703호로 피하세요',road_exit:'03:17. 이번에는 차 문을 연다',road_evidence:'횡단보도 위에 떨어진 가방을 확인한다',road_call:'가방 곁의 금 간 전화기를 든다. 이번에는 신고한다',road_wait:'도망치지 않고, 구조를 기다린다',car_departure:'',car_escape:'',car_voice:'',car_crash:'',dying:'',ended:'',
};
export const journal:Partial<Record<Action,{title:string;text:string}>>={
  home_repair:{title:'2803호 · 신고보다 먼저',text:'식탁 위 차량 수리 견적. 앞범퍼와 우측 헤드램프. 내일 오전 입고 예약. 아래에 「고객 요청: 보험 접수 없이」라고 적혀 있다.\n\n사업이 무너지고 빚이 쌓인 뒤 술로 밤을 넘겼다. 기억이 듬성듬성 비는 날이 있었지만, 이것은 내가 날짜까지 정해 예약한 일이었다.\n\n사고 다음 날, 사진을 보내고 견적을 받았다. 어디에 부딪혔느냐는 물음에 주차장 기둥이라고 답했다. 신고 전화 대신 수리점을 찾아봤다. 내가 사흘 동안 아무것도 하지 않은 것은 아니었다.'},
  gallery_notice:{title:'28층 · 열어 주지 않은 문',text:'101동 시설 점검 안내. 17층 외벽 공사로 관리실을 1703호로 옮겼다고 적혀 있다. 야간 당직 내선은 17. 아래에는 새 종이 한 장이 덧붙어 있다. 「2803호 방문 / 부재. 비상벨 통화 확인 요청.」\n\n나는 사흘 동안 집에 있었다. 초인종이 울려도 아무 소리도 내지 않았다. 집에 없는 척하면 그날도 지나갈 줄 알았다. 저 문이 내 문인데, 지금은 돌아갈 수가 없다.'},
  core_notice:{title:'24층 · 익숙한 안내판',text:'승강기 반대편에 비상계단이 있다. 관리실은 17층 공사 때문에 1703호로 옮겼고, 인접 세대와 이어진 연결문은 야간 통행 후 잠그라는 내용이다. 손때가 묻은 공용부 점검표. 평소에는 읽지도 않고 지나쳤다.\n\n층수는 24. 네 세대의 번호와 비상계단 위치까지 내가 알던 아파트 그대로다. 그런데 문 안에서는 아무 소리도 들리지 않는다. 집집마다 나처럼 숨을 죽이고 있는 것 같았다.'},

  ...expansionJournal,
  security_power:{title:'17층 · 선택한 비상전원',text:'공급 한도 6A. A 구역 조명은 4A, B CCTV는 2A, C 승강기 제어는 4A다. 승강기만 복구할 수도, 조명을 포기하고 기록장치와 함께 연결할 수도 있다.\n\n회로를 바꾸면 주 공급이 끊긴다. 부하를 확인한 뒤 전원을 다시 투입해야 한다. 배전반의 확인등이 실제로 공급 중인 회로를 보여 준다.'},
  service_key:{title:'17층 · 관리용 승강기 열쇠',text:'CCTV 오른쪽 책상에서 관리용 승강기 열쇠를 챙겼다. 이 열쇠만으로는 승강기를 움직일 수 없다. 전기실의 C 제어 회로에 비상전원이 필요하다. B CCTV 회로는 기록을 확인하고 싶을 때 연결할 수 있다.'},
  fuse:{title:'17층 · 예비 퓨즈',text:'서고의 예비 부품대에서 퓨즈를 챙겼다. 전기실 배전반의 빈 홀더에 설치해야 비상전원 선택기를 사용할 수 있다.'},
  office_install:{title:'17층 · 제한된 비상전원',text:'빈 홀더에 예비 퓨즈를 설치했다. 비상 공급 한도는 6A. A는 구역 조명 4A, B는 CCTV 기록장치 2A, C는 관리용 승강기 제어 4A다.\n\n모두 켜면 보호계전기가 전원을 끊는다. 승강기 제어만 복구하면 나갈 수 있지만, CCTV에는 내 차의 기록이 남아 있다. 필요한 부하를 선택해 공급하고, 바꿀 때는 주 전원을 다시 투입해야 한다.'},
  flashlight:{title:'28층 · 꺼진 조명',text:'스위치를 눌러도 불이 들어오지 않는다. 협탁 위 스마트폰을 집었다. 화면에 발신자 표시 제한이 떠 있다. 플래시는 아직 작동한다.'},
  alarm:{title:'B1 · 다섯 초의 경보',text:'경보가 다섯 초 울리다 끊긴다. 소리가 멎으면 더 빠른 발소리가 다가온다. 벨이 울리는 동안 차체와 기둥 뒤로 거리를 벌리고 운전석으로 돌아가야 한다.'},
  car_passenger:{title:'B1 · 잠그지 않은 문',text:'손잡이를 당기자 조수석 문이 열렸다. 사흘 전 차에서 내릴 때는 문조차 잠그지 않았다. 잠금 버튼을 누른 것은 그보다 앞, 누군가 창문을 두드렸을 때였다.\n\n조수석 뒤 발밑에 내 가방이 벌어진 채 놓여 있다. 안쪽에 열쇠가 보인다. 빗물을 맞을 수 없었던 안전벨트까지 젖어 있다.'},
  car_search:{title:'B1 · 조수석에 놓인 열쇠',text:'조수석 가방에서 배수 설비 열쇠를 찾았다. 꼬리표 뒷면에는 「양측 급수 차단 후 펌프 가동」이 적혀 있다. 젖은 좌석 위에는 손자국 하나가 남아 있다.'},
  valve_a:{title:'B1 · 서측 급수 밸브',text:'서측 급수관을 차단했다. 동측 밸브도 잠가야 펌프를 돌릴 수 있다.'},
  valve_b:{title:'B1 · 동측 급수 밸브',text:'동측 급수관을 차단했다. 두 급수관이 닫히면 서측 펌프를 가동한다.'},
  pump:{title:'B1 · 열린 퇴로',text:'차량 출구의 물이 빠졌다. 운전석으로 돌아가 경사로로 빠져나갈 수 있다. 차체와 기둥 뒤로 시야를 끊자. 필요하면 입구 경보로 반대쪽에서 소리를 낼 수 있다.'},
  resident_drawer:{title:"아내의 메모 · 서랍",text:"서연의 수첩에 적힌 서랍 위치. 작은 금속 열쇠가 들어 있었다. 열쇠를 찾는 나보다 먼저, 누군가는 이 길을 함께 나갈 생각을 했다."},
  resident_key:{title:"공용부 · 연결문 열쇠",text:"관리용 연결문에 쓰던 닳은 열쇠. 한서연이 맡긴 물건에 여벌 열쇠의 위치가 함께 적혀 있었다. 지금의 관리사무소와 B1 주차장 동선은 1층 안내판에서 다시 확인해야 한다."},
  resident_shift:{title:"아내의 수첩 · 다음 약속",text:"아내가 일하던 시간과 상담 예약이 같은 수첩에 적혀 있다. 「내일 오후 두 시. 이번에는 같이 갈 것.」 빚을 정리할 방법을 찾는 일도, 내 손을 놓지 않는 일도 혼자 애쓰고 있었다."},
  belongings:{title:"가족의 보관물 · 한서연",text:"접힌 우산과 검은 신발, 한서연이 맡긴 보관 봉투. 실제 등록 주소는 2803호. 서연은 내 아내였다. 한때는 우리 셋이 돌아올 집이었다. 장을 보고 돌아오던 아내를 그날의 도로에 남겨 두었다."},
  portrait:{title:"냉장고의 사진 · 함께 살던 날",text:"신혼집 앞에서 찍은 사진과 아이가 태어난 날의 사진. 뒷면에 「다음에는 맑은 날에. 우리 셋이.」라고 적혀 있다. 사고 기록의 한 사람이 아니라, 나와 내일을 약속하던 아내였다."},
  answerphone:{title:"03:16 · 남겨진 음성메시지",text:"「비가 너무 오네. 거의 다 왔어.」 서연의 목소리 뒤로 횡단보도 신호음과 타이어 소리가 이어진다. 장을 보고 돌아오던 길이었다. 신고해야 한다는 걸 알면서도 나는 차로 돌아가 문을 잠갔다."},
  wake:{title:'사흘 전 · 내가 외면한 밤',text:'술을 마시고도 차를 모는 일이 반복됐다. 그날은 운전 중에도 소주를 병째 마셨다. 아내가 운전하지 말라고 했지만 듣지 않았다. 백로아파트 앞 횡단보도에서 여성을 치었다. 새벽 03:17.\n\n차에서 내려 쓰러진 여자를 확인했다. 신고해야 했다. 그런데 나는 다시 차에 탔다. 문을 잠그고 현장을 떠나 2803호로 돌아왔다. 그 자리에서 죽었다고 생각했다. 숨을 확인하지도 않았으면서. 아무에게도 말하지 않았다.\n\n사흘이 지났다. 매일 그 시각에 눈이 떠진다. 오늘은 전화벨에 잠이 깼다. 스위치를 눌러도 불이 들어오지 않는다.'},
  phone:{title:'28층 · 정전 뒤의 전화',text:'스마트폰에서 빗소리와 와이퍼 소리, 차 문이 잠기는 소리가 들렸다.\n「문 잠가도… 소용없어.」\n\n현관에는 젖은 검은 신발이 놓여 있었다. 그날 차 앞에 떨어졌던 신발. 분명 도로에 두고 왔다.'},
  record:{title:'17층 · 사흘 전의 사고 기록',text:'백로아파트 임시 관리실 / 사고 다음 날 06:40\n인계 작성: 박정호. 전임 야간 당직: 한서연.\n17층 외벽 공사로 옮겨 쓰던 1703호는 이 인계를 끝으로 폐쇄됐다.\n03:17. 건물 앞 횡단보도에서 보행자 사망 사고. 검은 승용차가 현장을 이탈.\n03:26. 파손 차량 입차. 관리실 열람 영상에서 정차 직후 아홉 초가 누락됨. 다음 장면에는 문이 이미 닫혀 있고 운전자가 혼자 걸어감.\n\n아홉 초. 숫자를 보는 순간 손끝이 차가워졌다. 그 사이에 내가 무엇을 했는지 떠올리고 싶지 않다.\n\n시설 인계: 「관리용 승강기 열쇠는 CCTV 오른쪽 책상에 보관. 전원이 끊기면 서고의 예비 퓨즈를 사용할 것. 비상전원은 6A까지만 공급한다. 구역 조명 4A / 기록장치 2A / 승강기 제어 4A. 서고의 퓨즈를 배전반 빈 홀더에 설치하고 필요한 부하만 선택해 전원을 투입할 것. 탈출에는 승강기 제어 전원이 필요하다. CCTV를 열람한다면 입차 시각을 선택할 것. 누락 구간은 지하 기록보관실 원본과 대조 필요.」'},
  monitor:{title:'CCTV · 빠진 아홉 초',text:'사흘 전 03:26. 앞부분이 찌그러진 내 차가 멈춘다. 시간이 아홉 초를 건너뛴다. 다음 장면에서 차 문은 이미 닫혀 있고, 나는 혼자 걸어간다.\n\n조수석 유리에 흰 소매 같은 것이 비친다. 화면이 깨져 얼굴은 보이지 않는다. 아래쪽 숫자만 선명하다.\n「귀가자 2명 / 2803호」\n\n함께 내린 사람은 보이지 않는데 왜 둘이라고 적혀 있을까. CCTV 옆에 관리용 승강기 열쇠가 있다. 우선 1층으로 내려가야 한다.'},
  exit:{title:'B1 · 다시 마주한 차',text:'출구 옆에 내 차가 있다. 앞유리의 금, 구겨진 보닛. 조수석 시트만 흠뻑 젖어 있다.\n\n침수된 문 아래에 잔해가 끼어 있다. 배수 설비 안내에는 양측 급수 차단 후 펌프 가동이라고 적혀 있다. 조수석 가방에서 금속이 부딪치는 소리가 났다. 열쇠가 있는지 확인해야 한다. 물을 빼야 차량 출구를 열 수 있다. 보행자 출구는 바깥에서 봉쇄되어 있다. 차로 나가야 한다. 나를 따라오는 발소리는 경보로 유인할 수 있을 것이다.\n문 너머에서 들리는 것은 빗소리다. 그날 밤과 똑같은.'},
};
export function journalEntry(id:Action,story:Pick<Story,'notes'>){
  if(id==='archive_play'&&!['archive_sequence_road','archive_sequence_call','archive_sequence_gate'].every(note=>story.notes.includes(note)))return {title:'관리사무소 · 원본 재생 시작',text:'우편의 영상보존 통지서에 적힌 원본을 불러왔다. 도로 영상, 양방향 통화, 입차 기록이 시간순으로 이어진다. 화면과 소리를 끝까지 확인해야 한다.'};
  if(id==='exit')return {title:'B1 · 막힌 보행자 출구',text:'보행자 출구는 바깥의 공사 셔터에 막혀 있다. 차량 경사로로 나가야 한다. '+(parkingDrained(story)?'차량 통로는 열려 있다. 차에 타면 차량 출구로 나갈 수 있다. ':'차량 출구에 물이 고여 있다. 양측 급수를 잠근 뒤 펌프를 가동해야 한다. ')+(story.notes.includes('car_search')?'열쇠는 이미 챙겼다. ':'조수석 가방에서 열쇠를 찾아야 한다. ')+'차체와 기둥 뒤로 돌아갈 수 있고, 필요하면 입구 경보기로 반대쪽에서 소리를 낼 수도 있다.'};
  if(parkingDrained(story)){
    if(id==='car_search')return {title:'B1 · 내 차 열쇠',text:'젖은 조수석 가방에서 차 열쇠를 꺼냈다. 그날 운전대를 잡았던 손이 다시 떨린다. 차량 출구까지 통행할 수 있다. 차체와 기둥 뒤로 돌아 운전석에 갈 수 있다. 입구 쪽에는 붉은 경보기가 있다. 너무 가까이 따라오면 반대쪽에서 큰 소리를 낼 방법이 될 것이다.'};
  }
  return journal[id];
}
export const endings={
  crashed:'차는 아파트 앞 도로에서 마주 오던 덤프트럭과 정면으로 충돌했다.\n운전자는 현장에서 사망했다.\n\n차량에서 발견된 탑승자는 한 명.\n블랙박스에는 충돌 직전, 여자의 목소리가 남아 있었다.\n\n「이번에도… 혼자 가려고?」\n\n경찰은 조수석 다시방에서 아내 한서연이 사고 전에 써 둔 편지를 발견했다. 남편과 함께 상담받으러 가고, 아이와 다시 저녁을 먹고 싶다는 말이 남아 있었다. 사랑한다는 마지막 문장 아래에 서연의 이름이 있었다.',
  caught:'숨을 죽였다.\n발소리도 멎었다.\n\n바로 뒤에서 젖은 숨이 들렸다.',
};

// Original memory.wav length at its native playback rate; captions work if audio is unavailable.
export const residentMessageDuration=5.362448979591837;
