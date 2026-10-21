import {expansionObjectives,expansionJournal,expansionTransition,expansionObjective,isExpansion,type ExpansionStage,type ExpansionAction,type ExpansionArea} from './expansion-story.ts';
export type Stage = ExpansionStage|'stairs_descent'|'corridor_departure'|'stairs_passage'|'resident_arrival'|'resident_departure'|'car_departure'|'car_escape'|'car_voice'|'car_crash'|'drive'|'impact'|'flee'|'sleep'|'tv'|'wake_ring'|'light_switch'|'find_torch'|'phone'|'power'|'shoes'|'radio'|'listen'|'hide'|'wait'|'escape'|'lift_call'|'lift_wait'|'lift_enter'|'lift_boarding'|'lift_button'|'descent'|'pry'|'lift_exit'|'corridor_run'|'stairs_loop'|'stairs_clue'|'stairs_reverse'|'office_record'|'office_fuse'|'office_power'|'office_tape'|'office_playback'|'office_key'|'office_leave'|'parking_gate'|'parking_key'|'parking_pump'|'parking_alarm'|'parking_run'|'resident_entry'|'resident_memory'|'resident_return'|'road_exit'|'road_evidence'|'road_call'|'road_wait'|'dying'|'ended';
export type Area = ExpansionArea|'apartment'|'landing'|'lift'|'corridor'|'stairs'|'office'|'parking'|'resident'|'aftermath';
export type Action = ExpansionAction|'shelter'|'home_repair'|'annex_radio'|'gallery_notice'|'core_notice'|'office_install'|'car_passenger'|'stair_loop'|'stair_enter'|'stair_exit'|'resident_open'|'office_entry'|'car_departed'|'car_board'|'passenger'|'wreck'|'fatal'|'collision'|'fled'|'home'|'wake'|'skip_memory'|'blackout'|'awake'|'switch'|'flashlight'|'circuit_a'|'circuit_b'|'circuit_c'|'tape_next'|'car_search'|'valve_a'|'valve_b'|'pump'|'phone'|'breaker'|'shoes'|'radio'|'heard'|'closet'|'survived'|'door'|'caught'|'call'|'arrived'|'enter'|'sealed'|'panel'|'stopped'|'pry'|'leave_lift'|'stairs'|'down'|'stair_note'|'up'|'record'|'fuse'|'security_power'|'monitor'|'office_finish'|'service_key'|'service_exit'|'exit'|'alarm'|'dead'|'belongings'|'portrait'|'answerphone'|'resident_leave'|'car_door'|'road_bag'|'road_phone'|'stay'|'lure'|'resident_drawer'|'resident_key'|'resident_shift';
export type Story = {stage:Stage;hidden:boolean;ending:'crashed'|'caught'|null;resume:Stage;notes:string[];circuit:Action[];officeSupply:boolean;tapeIndex:number;code?:string};
export const chaseStages:Stage[]=['court_search','court_code','court_safe_open','court_unlocked','court_departure','office_departure','annex_arrival','annex_fuse','annex_restore','annex_search','annex_unlock','annex_exit_ready','annex_departure','archive_search','archive_edit','archive_reveal','archive_playback','archive_escape','archive_departure','plant_isolate','plant_power','plant_drain','plant_exit_ready','plant_departure','hide','escape','lift_call','lift_wait','lift_enter','corridor_run','corridor_departure','stairs_loop','stairs_descent','stairs_clue','stairs_reverse','stairs_passage','office_record','office_fuse','office_power','office_tape','office_playback','office_key','office_leave','parking_gate','parking_key','parking_pump','parking_alarm','parking_run','resident_arrival','resident_entry','resident_memory','resident_return','resident_departure'];
export const opening:Partial<Record<Stage,{duration:number;action:Action;label:string;text:string;cues?:{at:number;text:string}[]}>>={
  drive:{duration:20,action:'collision',label:'사흘 전 · 새벽 03:17',text:'술을 마셨다.\n대리운전은 두 번 취소됐다.',cues:[
    {at:4,text:'집까지 세 블록.\n그 정도는 괜찮다고 생각했다.'},
    {at:8.5,text:'백로아파트. 매일 다니던 길이었다.'},
    {at:12,text:''},
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
  sleep:{duration:8,action:'wake',label:'그날 새벽 · 28층 2803호',text:'집에 돌아와 젖은 신발을 벗었다.',cues:[
    {at:3,text:'신고하지 않았다.\n아무에게도 말하지 않았다.'},
    {at:6,text:''},
  ]},
};
// These beats also drive the camera, phone props and sound; they share simulation time.
export const openingTiming={phoneBuzz:15.9,lookUp:17.6,brake:19.1,doorOpen:2.8,exit:3.6,outside:5.8,doorShut:6.5,walk:6.8,inspect:10.5,return:14.8,atDoor:18.5,reopen:18.7,board:19.4,seated:21.6,close:21.8,lock:22.7} as const;
export function hasFlashlight(s:Pick<Story,'stage'>){return !['drive','impact','flee','sleep','tv','wake_ring','light_switch','find_torch'].includes(s.stage);}
export const carDepartureDuration=24;
export const finale:Partial<Record<Stage,{duration:number;action:Action;label:string;text:string;cues?:{at:number;text:string}[]}>>={
  car_departure:{duration:carDepartureDuration,action:'car_departed',label:'B1 · 운전석',text:'문을 연다.',cues:[{at:5.5,text:'문이 잠겼다.'},{at:6,text:'시동이 걸렸다. 차량 셔터가 올라간다.'},{at:10,text:'경사로를 따라 밖으로.'},{at:20,text:''}]},
  car_escape:{duration:10,action:'passenger',label:'제 11장 · 동승자',text:'경사로 끝. 도로가 보인다.',cues:[{at:3,text:'경사로가 뒤로 멀어졌다.'},{at:6,text:'이제… 빠져나왔다.'},{at:6.4,text:'딸깍. 처음 전화에서 들었던 잠금음.\n수화기 속 빗소리와 와이퍼… 이 차 안의 소리였다.'},{at:8.5,text:'처음부터 나를 밖으로 부른 것이 아니었다.\n다시 이 자리에 앉히고 있었다.'}]},
  car_voice:{duration:5,action:'wreck',label:'03:17 · 조수석',text:'「이번에도… 혼자 가려고?」',cues:[{at:4.1,text:''}]},
  car_crash:{duration:5.5,action:'fatal',label:'03:17',text:'',cues:[{at:3,text:'브레이크를 밟기에는 늦었다.'}]},
};
// Reuse the same bank clip at the first phone and after the final escape.
export const phoneCallback={clip:'archive-lock',finalStage:'car_escape',at:6.4} as const;
export const finaleTiming={turn:1.2,reveal:3.2,impact:.55} as const;
export function isFinale(stage:Stage){return finale[stage]!==undefined;}
export function isCinematic(stage:Stage){return isMemory(stage)||isFinale(stage);}
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
  if(story.stage.startsWith('office')&&story.stage!=='office_departure'&&story.stage!=='office_playback'){
    if(officeCanLeave(story))return '관리용 승강기에서 모터 소리가 돌아온다. 오래 기다릴 수는 없다.';
    if(officeCanWatch(story)&&!story.notes.includes('monitor'))return 'CCTV 화면이 켜졌다. 내 차가 돌아왔던 시간은 기억한다.';
    if(!story.notes.includes('fuse'))return '관리실은 비상전원을 쓰고 있다. 인계 기록에 남은 고장 흔적.';
    if(!story.notes.includes('office_install'))return '예비 퓨즈를 챙겼다. 타 버린 홀더가 있던 곳으로.';
    return `비상전원 ${officePowerLoad(story)}/6A · ${story.officeSupply?'공급 중':'차단됨'}. 모든 회로를 함께 살릴 수는 없다.`;
  }
  if(story.stage==='parking_key')return story.notes.includes('car_passenger')?'벌어진 가방. 젖은 금속이 보인다.':'내 차는 그대로다. 조수석에 두었던 가방도.';
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
export function parkingDrained(state:Pick<Story,'notes'>){return state.notes.includes('plant_drained')||state.notes.includes('pump');}
function parkingAfterKey(state:Pick<Story,'notes'>){return parkingDrained(state)?'parking_alarm':'parking_pump';}
export const parkingBoardDuration=.9;
export function parkingCanBoard(stage:Stage){return stage==='parking_alarm'||stage==='parking_run';}
export function parkingAlarmActive(s:Pick<Story,'stage'|'notes'>){return s.notes.includes('alarm')||s.stage==='parking_run';}
export function retryStage(stage:Stage):Stage{
  if(['annex_fuse','annex_restore','annex_search'].includes(stage))return 'annex_unlock';
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
  return {...initialStory(),stage,resume:stage,notes:[...(state?.notes||[])],circuit:isExpansion(stage)||stage.startsWith('office')?[...(state?.circuit||[])]:[],officeSupply:state?.officeSupply??false,code:state?.code??'0000'};
}
const steps:Partial<Record<Stage,[Action,Stage]>>={
  drive:['collision','impact'],impact:['fled','flee'],flee:['home','sleep'],sleep:['wake','wake_ring'],
  tv:['blackout','wake_ring'],wake_ring:['awake','light_switch'],light_switch:['switch','find_torch'],find_torch:['flashlight','power'],power:['breaker','phone'],phone:['phone','shoes'],shoes:['shoes','radio'],radio:['radio','listen'],listen:['heard','hide'],
  escape:['door','lift_call'],lift_call:['call','lift_wait'],lift_wait:['arrived','lift_enter'],lift_enter:['enter','lift_boarding'],lift_boarding:['sealed','lift_button'],lift_button:['panel','descent'],descent:['stopped','pry'],pry:['pry','lift_exit'],lift_exit:['leave_lift','corridor_run'],corridor_run:['stairs','corridor_departure'],corridor_departure:['stair_enter','stairs_loop'],
  stairs_loop:['down','stairs_descent'],stairs_descent:['stair_loop','stairs_clue'],stairs_clue:['stair_note','stairs_reverse'],stairs_reverse:['up','stairs_passage'],stairs_passage:['stair_exit','resident_arrival'],resident_arrival:['resident_open','resident_entry'],
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
  if(state.stage.startsWith('office')&&state.stage!=='office_departure'){
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
  return {...state,stage:next[1],notes,ending:next[1]==='ended'?'crashed':null};
}
export function areaFor(story:Story):Area{
  const s=story.stage==='ended'?story.resume:story.stage;
  if(['lift_call','lift_wait','lift_enter','lift_boarding'].includes(s))return 'landing';
  if(['lift_button','descent','pry','lift_exit'].includes(s))return 'lift';
  if(s==='corridor_run'||s==='corridor_departure')return 'corridor';
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
  annex:{number:'06',title:'끊어진 호출',floor:'1F · 공동시설'},archive:{number:'08',title:'지워진 아홉 초',floor:'B1 · 기록보관실'},plant:{number:'09',title:'물 아래의 길',floor:'B1 · 기계실'},
  apartment:{number:'01',title:'먼저 와 있는 사람',floor:'28F · 2803호'},landing:{number:'02',title:'하강',floor:'28F'},lift:{number:'02',title:'하강',floor:'엘리베이터'},corridor:{number:'03',title:'닫히지 않는 문',floor:'24F'},stairs:{number:'03',title:'같은 층',floor:'23F'},office:{number:'05',title:'없는 층의 관리실',floor:'17F'},parking:{number:'10',title:'다시 운전석',floor:'B1'},resident:{number:'04',title:'돌아오지 못한 사람',floor:'17F · 1704호'},aftermath:{number:'11',title:'동승자',floor:'03:17 · 귀갓길'},
};
export const objectives:Record<Stage,string>={
  ...expansionObjectives,
  drive:'사흘 전의 기억',impact:'사람이었다',flee:'나는 도망쳤다',sleep:'집으로 돌아와 잠들었다',tv:'사흘 뒤',wake_ring:'전화벨에 잠이 깬다',light_switch:'익숙한 방. 벽의 스위치를 더듬는다.',find_torch:'불이 들어오지 않는다. 잠들기 전 협탁에 두었던 손전등.',phone:'전화벨이 거실에서 울린다. 이 시간에 누구지.',power:'우리 집만 정전인가. 다용도실 쪽에서 전기 타는 냄새가 난다.',shoes:'현관. 무언가 젖은 것이 바닥에 닿았다.',radio:'침실의 라디오. 분명 꺼 두었는데.',listen:'라디오는 꺼졌다. 그런데 복도에서 무슨 소리가…',hide:'발소리가 가까워진다. 침실 장롱이라면 몸을 감출 수 있다.',wait:'어둠 속의 움직임에 귀를 기울인다',escape:'발을 끄는 소리가 멀어진다. 지금이라면 현관까지.',
  lift_call:'복도 끝 승강기 호출등이 켜져 있다. 멈추지 말고 그쪽으로.',lift_wait:'승강기가 올라온다. 등 뒤의 소리가 빨라진다.',lift_enter:'문이 열렸다. 더 기다릴 수 없다.',lift_boarding:'탑승했다. 문이 닫히고 있다',lift_button:'1층. 제발 한 번에 내려가 줘.',descent:'1층으로 내려가는 중',pry:'문 가까이에서 E를 길게 눌러 문을 벌리세요',lift_exit:'멈춘 승강기. 문틈 너머에 바닥이 보인다.',corridor_run:'천장에서 기어 내려온다. 어둠 너머 녹색 유도등.',
  corridor_departure:'방화문 너머 계단. 문을 닫을 시간은 없다.',stairs_loop:'아래로. 내려가면 끝이 있을 것이다.',stairs_descent:'아래층 문이 열려 있다. 같은 발소리가 따라온다.',stairs_clue:'또 23층. 벽의 점검 메모만 아까와 다르다.',stairs_reverse:'17층. 방화문 너머에서 전화가 울린다.',stairs_passage:'전화벨이 이어진다. 문이 열린 쪽에서.',office_record:'관리실 책상의 야간 근무일지를 확인하세요',office_fuse:'서고의 예비 부품대에서 퓨즈를 찾으세요',office_power:'전기실 배전반에 퓨즈를 설치하고 6A 한도 안에서 필요한 회로를 선택하세요',office_tape:'CCTV 시간 선택 버튼으로 내 차가 입차한 기록을 찾아 재생하세요',office_playback:'재생 중 · 지하 입차 기록의 누락 구간을 확인하세요',office_key:'CCTV 오른쪽 책상에 놓인 관리용 승강기 열쇠를 챙기세요',office_leave:'복도 끝 관리용 승강기를 열어 1층으로 내려가세요',
  parking_gate:'주차장. 내 차만 그대로 서 있다. 출구 쪽에는 물이 차 있다.',parking_key:'내 차 오른쪽 조수석 문을 열고 가방에서 설비 열쇠를 찾으세요',parking_pump:'물이 계속 밀려든다. 펌프보다 먼저 유입을 멈춰야 한다.',parking_alarm:'물은 빠졌다. 시동만 걸면 된다. 입구에 경보기 소리가 남아 있다.',parking_run:'경보가 울린다. 차체 너머로 손톱 긁는 소리가 다가온다.',resident_arrival:'1704호. 전화벨과 명패의 이름이 겹친다. 한서연.',resident_departure:'연결문이 열렸다. 뒤에서는 더 이상 발소리가 나지 않는다.',resident_entry:'1704호. 현관에 그 신발 한 짝이 남아 있다',resident_memory:'서재의 수첩과 서랍을 살펴 연결문 열쇠를 찾으세요',resident_return:'연결문 열쇠를 챙겼다. 뒤쪽 1703호로 피하세요',road_exit:'03:17. 이번에는 차 문을 연다',road_evidence:'횡단보도 위에 떨어진 가방을 확인한다',road_call:'가방 곁의 금 간 전화기를 든다. 이번에는 신고한다',road_wait:'도망치지 않고, 구조를 기다린다',car_departure:'',car_escape:'',car_voice:'',car_crash:'',dying:'',ended:'',
};
export const journal:Partial<Record<Action,{title:string;text:string}>>={
  home_repair:{title:'2803호 · 신고보다 먼저',text:'식탁 위 차량 수리 견적. 앞범퍼와 우측 헤드램프. 내일 오전 입고 예약. 아래에 「고객 요청: 보험 접수 없이」라고 적혀 있다.\n\n사고 다음 날, 사진을 보내고 견적을 받았다. 어디에 부딪혔느냐는 물음에 주차장 기둥이라고 답했다. 신고 전화 대신 수리점을 찾아봤다. 내가 사흘 동안 아무것도 하지 않은 것은 아니었다.'},
  gallery_notice:{title:'28층 · 열어 주지 않은 문',text:'101동 시설 점검 안내. 17층 외벽 공사로 관리실을 1703호로 옮겼다고 적혀 있다. 야간 당직 내선은 17. 아래에는 새 종이 한 장이 덧붙어 있다. 「2803호 방문 / 부재. 비상벨 통화 확인 요청.」\n\n나는 사흘 동안 집에 있었다. 초인종이 울려도 아무 소리도 내지 않았다. 집에 없는 척하면 그날도 지나갈 줄 알았다. 저 문이 내 문인데, 지금은 돌아갈 수가 없다.'},
  core_notice:{title:'24층 · 익숙한 안내판',text:'승강기 반대편에 비상계단이 있다. 관리실은 17층 공사 때문에 1703호로 옮겼고, 인접 세대와 이어진 연결문은 야간 통행 후 잠그라는 내용이다. 손때가 묻은 공용부 점검표. 평소에는 읽지도 않고 지나쳤다.\n\n층수는 24. 네 세대의 번호와 비상계단 위치까지 내가 알던 아파트 그대로다. 그런데 문 안에서는 아무 소리도 들리지 않는다. 집집마다 나처럼 숨을 죽이고 있는 것 같았다.'},

  ...expansionJournal,
  security_power:{title:'17층 · 선택한 비상전원',text:'공급 한도 6A. A 구역 조명은 4A, B CCTV는 2A, C 승강기 제어는 4A다. 승강기만 복구할 수도, 조명을 포기하고 기록장치와 함께 연결할 수도 있다.\n\n회로를 바꾸면 주 공급이 끊긴다. 부하를 확인한 뒤 전원을 다시 투입해야 한다. 배전반의 확인등이 실제로 공급 중인 회로를 보여 준다.'},
  service_key:{title:'17층 · 관리용 승강기 열쇠',text:'CCTV 오른쪽 책상에서 관리용 승강기 열쇠를 챙겼다. 이 열쇠만으로는 승강기를 움직일 수 없다. 전기실의 C 제어 회로에 비상전원이 필요하다. B CCTV 회로는 기록을 확인하고 싶을 때 연결할 수 있다.'},
  fuse:{title:'17층 · 예비 퓨즈',text:'서고의 예비 부품대에서 퓨즈를 챙겼다. 전기실 배전반의 빈 홀더에 설치해야 비상전원 선택기를 사용할 수 있다.'},
  office_install:{title:'17층 · 제한된 비상전원',text:'빈 홀더에 예비 퓨즈를 설치했다. 비상 공급 한도는 6A. A는 구역 조명 4A, B는 CCTV 기록장치 2A, C는 관리용 승강기 제어 4A다.\n\n모두 켜면 보호계전기가 전원을 끊는다. 승강기 제어만 복구하면 나갈 수 있지만, CCTV에는 내 차의 기록이 남아 있다. 필요한 부하를 선택해 공급하고, 바꿀 때는 주 전원을 다시 투입해야 한다.'},
  flashlight:{title:'28층 · 꺼진 조명',text:'스위치를 눌러도 불이 들어오지 않는다. 침대 옆 협탁 위에서 손전등을 찾았다. 전화벨은 아직도 울린다.'},
  alarm:{title:'B1 · 멈추지 않는 벨',text:'버튼이 안쪽에 걸리고 빨간 확인등이 켜졌다. 경보는 계속 울리고 먼 발소리는 벨에 묻힌다. 그러나 바로 옆의 발소리나 눈앞에 보이는 나까지 놓치지는 않는다. 차체와 기둥 뒤로 시야를 끊어야 한다. 그러면 마지막으로 나를 본 곳을 뒤진 뒤, 다시 벨 쪽으로 갈 것이다.'},
  car_passenger:{title:'B1 · 잠그지 않은 문',text:'손잡이를 당기자 조수석 문이 열렸다. 사흘 전 차에서 내릴 때는 문조차 잠그지 않았다. 잠금 버튼을 누른 것은 그보다 앞, 누군가 창문을 두드렸을 때였다.\n\n조수석 뒤 발밑에 내 가방이 벌어진 채 놓여 있다. 안쪽에 열쇠가 보인다. 빗물을 맞을 수 없었던 안전벨트까지 젖어 있다.'},
  car_search:{title:'B1 · 조수석에 놓인 열쇠',text:'조수석 가방에서 배수 설비 열쇠를 찾았다. 꼬리표 뒷면에는 「양측 급수 차단 후 펌프 가동」이 적혀 있다. 젖은 좌석 위에는 손자국 하나가 남아 있다.'},
  valve_a:{title:'B1 · 서측 급수 밸브',text:'서측 급수관을 차단했다. 동측 밸브도 잠가야 펌프를 돌릴 수 있다.'},
  valve_b:{title:'B1 · 동측 급수 밸브',text:'동측 급수관을 차단했다. 두 급수관이 닫히면 서측 펌프를 가동한다.'},
  pump:{title:'B1 · 열린 퇴로',text:'차량 출구의 물이 빠졌다. 운전석으로 돌아가 경사로로 빠져나갈 수 있다. 차체와 기둥 뒤로 시야를 끊자. 필요하면 입구 경보로 반대쪽에서 소리를 낼 수 있다.'},
  resident_drawer:{title:'1704호 · 서재의 서랍',text:'서재 책상의 가운데 서랍을 당겼다. 안에서 작은 금속이 나무에 부딪치는 소리가 난다. 서랍 앞을 막고 있다면 한 걸음 물러서야 한다.'},
  resident_key:{title:'1704호 · 연결문 열쇠',text:'서랍 안의 닳은 열쇠. 작은 꼬리표에는 1703이라고 적혀 있다. 한서연이 집과 임시 관리실을 오가며 쓰던 연결문 열쇠다.\n\n열쇠를 집자 현관 쪽에서 젖은 발소리가 다시 들린다. 뒤쪽 연결문으로 나가야 한다.'},
  resident_shift:{title:'1704호 · 끝내 지키지 못한 약속',text:'야간 당직 수첩 / 한서연.\n외벽 공사로 1703호를 임시 관리실로 사용한다. 퇴근 후 연결문은 잠글 것. 여벌 열쇠는 서재 책상 가운데 서랍에 보관.\n\n업무 기록 아래에 필체가 달라진다. 「내일 오후 두 시. 이번에는 꼭 갈 것.」 냉장고의 약속과 같은 시각이다. 사고 기록에는 사망자 한 명이라고 적힐 사람이, 여기에는 내일의 약속을 남겼다.'},
  belongings:{title:'1704호 · 젖지 않은 신발 한 짝',text:'현관에는 검은 신발 한 짝과 접힌 우산이 있다. 찻잔은 식었고, 자동응답기의 녹음 표시만 깜박인다.\n\n신발장 위의 관리비 봉투. 1704호 / 한서연. 매일 이 문으로 돌아오던 사람이었다.\n\n벽에는 쪽지가 붙어 있다. 「야간 당직 한서연 / 내선 17. 외벽 공사 중 1703호를 임시 관리실로 사용합니다. 퇴근 후 연결문을 잠가 주세요. 여벌 열쇠 위치는 서재의 당직 수첩에 적어 두었습니다.」'},
  portrait:{title:'1704호 · 냉장고의 약속',text:'비가 갠 강변에서 두 사람이 등을 보인 사진. 냉장고 문에 사진과 손으로 쓴 쪽지가 나란히 붙어 있다. 「다음에는 맑은 날에. 내일 오후 두 시.」\n\n누군가와 만나기로 한 약속. 사흘 전 그 사람에게는, 돌아와서 기다릴 내일이 있었다.'},
  answerphone:{title:'1704호 · 마지막 음성메시지',text:'03:16. 「비가 너무 오네. 거의 다 왔어. 문 열어두지 말고 먼저 자. 내일 전화할게.」\n\n메시지는 끝났지만 테이프는 계속 돌아간다. 횡단보도 신호음. 타이어가 미끄러지는 소리.\n\n그 소리를 듣자 그날이 떠올랐다. 차에서 내려 쓰러진 사람을 봤다. 신고해야 한다는 걸 알면서도 다시 차로 돌아갔다. 문을 잠그고, 그 사람을 도로에 남겨 두었다.'},
  wake:{title:'사흘 전 · 내가 외면한 밤',text:'술을 마신 채 차를 몰았다. 백로아파트 앞 횡단보도에서 여성을 치었다. 새벽 03:17.\n\n차에서 내려 쓰러진 여자를 확인했다. 신고해야 했다. 그런데 나는 다시 차에 탔다. 문을 잠그고 현장을 떠나 2803호로 돌아왔다. 그 자리에서 죽었다고 생각했다. 숨을 확인하지도 않았으면서. 아무에게도 말하지 않았다.\n\n사흘이 지났다. 매일 그 시각에 눈이 떠진다. 오늘은 전화벨에 잠이 깼다. 스위치를 눌러도 불이 들어오지 않는다.'},
  phone:{title:'28층 · 정전 뒤의 전화',text:'차단기는 올라갔지만 불은 돌아오지 않았다. 전화기에서 빗소리와 와이퍼 소리, 문이 잠기는 소리가 들렸다.\n「문 잠가도… 소용없어.」\n\n현관에는 젖은 검은 신발이 놓여 있었다. 그날 차 앞에 떨어졌던 신발. 분명 도로에 두고 왔다.'},
  stair_note:{title:'23층 · 지워지지 않는 시각',text:'같은 층으로 돌아왔다면 계단 표지 아래를 보세요.\n23 위에 덧칠된 숫자가 벗겨진다. 그 아래에는 17.\n방화문 너머에서 사고 현장의 전화벨이 들린다.\n1704호 문 옆 명패에는 한서연이라고 적혀 있다.\n\n종이 아래쪽에 내 차 번호와 03:17이 반복해서 적혀 있다.\n「그때 멈췄어야지.」'},
  record:{title:'17층 · 사흘 전의 사고 기록',text:'백로아파트 임시 관리실 / 사고 다음 날 06:40\n인계 작성: 박정호. 전임 야간 당직: 한서연.\n17층 외벽 공사로 옮겨 쓰던 1703호는 이 인계를 끝으로 폐쇄됐다.\n03:17. 건물 앞 횡단보도에서 보행자 사망 사고. 검은 승용차가 현장을 이탈.\n03:26. 파손 차량 입차. 관리실 열람 영상에서 정차 직후 아홉 초가 누락됨. 다음 장면에는 문이 이미 닫혀 있고 운전자가 혼자 걸어감.\n\n아홉 초. 숫자를 보는 순간 손끝이 차가워졌다. 그 사이에 내가 무엇을 했는지 떠올리고 싶지 않다.\n\n시설 인계: 「관리용 승강기 열쇠는 CCTV 오른쪽 책상에 보관. 전원이 끊기면 서고의 예비 퓨즈를 사용할 것. 비상전원은 6A까지만 공급한다. 구역 조명 4A / 기록장치 2A / 승강기 제어 4A. 서고의 퓨즈를 배전반 빈 홀더에 설치하고 필요한 부하만 선택해 전원을 투입할 것. 탈출에는 승강기 제어 전원이 필요하다. CCTV를 열람한다면 입차 시각을 선택할 것. 누락 구간은 지하 기록보관실 원본과 대조 필요.」'},
  monitor:{title:'CCTV · 빠진 아홉 초',text:'사흘 전 03:26. 앞부분이 찌그러진 내 차가 멈춘다. 시간이 아홉 초를 건너뛴다. 다음 장면에서 차 문은 이미 닫혀 있고, 나는 혼자 걸어간다.\n\n조수석 유리에 흰 소매 같은 것이 비친다. 화면이 깨져 얼굴은 보이지 않는다. 아래쪽 숫자만 선명하다.\n「귀가자 2명 / 2803호」\n\n함께 내린 사람은 보이지 않는데 왜 둘이라고 적혀 있을까. CCTV 옆에 관리용 승강기 열쇠가 있다. 우선 1층으로 내려가야 한다.'},
  exit:{title:'B1 · 다시 마주한 차',text:'출구 옆에 내 차가 있다. 앞유리의 금, 구겨진 보닛. 조수석 시트만 흠뻑 젖어 있다.\n\n침수된 문 아래에 잔해가 끼어 있다. 배수 설비 안내에는 양측 급수 차단 후 펌프 가동이라고 적혀 있다. 조수석 가방에서 금속이 부딪치는 소리가 났다. 열쇠가 있는지 확인해야 한다. 물을 빼야 차량 출구를 열 수 있다. 보행자 출구는 바깥에서 봉쇄되어 있다. 차로 나가야 한다. 나를 따라오는 발소리는 경보로 유인할 수 있을 것이다.\n문 너머에서 들리는 것은 빗소리다. 그날 밤과 똑같은.'},
};
export function journalEntry(id:Action,story:Pick<Story,'notes'>){
  if(id==='exit')return {title:'B1 · 막힌 보행자 출구',text:'보행자 출구는 바깥의 공사 셔터에 막혀 있다. 차량 경사로로 나가야 한다. '+(parkingDrained(story)?'배수는 이미 끝났다. 차에 타면 차량 셔터를 열 수 있다. ':'차량 출구에 물이 고여 있다. 양측 급수를 잠근 뒤 펌프를 가동해야 한다. ')+(story.notes.includes('car_search')?'열쇠는 이미 챙겼다. ':'조수석 가방에서 열쇠를 찾아야 한다. ')+'차체와 기둥 뒤로 돌아갈 수 있고, 필요하면 입구 경보기로 반대쪽에서 소리를 낼 수도 있다.'};
  if(parkingDrained(story)){
    if(id==='car_search')return {title:'B1 · 내 차 열쇠',text:'젖은 조수석 가방에서 차 열쇠를 꺼냈다. 그날 운전대를 잡았던 손이 다시 떨린다. 배수는 이미 끝났다. 차체와 기둥 뒤로 돌아 운전석에 갈 수 있다. 입구 쪽에는 붉은 경보기가 있다. 너무 가까이 따라오면 반대쪽에서 큰 소리를 낼 방법이 될 것이다.'};
  }
  return journal[id];
}
export const endings={
  crashed:'차는 아파트 앞 도로의 콘크리트 방호벽을 들이받았다.\n운전자는 현장에서 사망했다.\n\n차량에서 발견된 탑승자는 한 명.\n블랙박스에는 충돌 직전, 여자의 목소리가 남아 있었다.\n\n「이번에도… 혼자 가려고?」',
  caught:'숨을 죽였다.\n발소리도 멎었다.\n\n바로 뒤에서 젖은 숨이 들렸다.',
};

// Original memory.wav length at its native playback rate; captions work if audio is unavailable.
export const residentMessageDuration=5.362448979591837;
