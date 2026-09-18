export type Stage = 'car_escape'|'car_voice'|'car_crash'|'drive'|'impact'|'flee'|'sleep'|'tv'|'wake_ring'|'light_switch'|'find_torch'|'phone'|'power'|'shoes'|'radio'|'listen'|'hide'|'wait'|'escape'|'lift_call'|'lift_wait'|'lift_enter'|'lift_boarding'|'lift_button'|'descent'|'pry'|'lift_exit'|'corridor_run'|'stairs_loop'|'stairs_clue'|'stairs_reverse'|'office_record'|'office_fuse'|'office_power'|'office_tape'|'office_leave'|'parking_gate'|'parking_key'|'parking_pump'|'parking_alarm'|'parking_run'|'resident_entry'|'resident_memory'|'resident_return'|'road_exit'|'road_evidence'|'road_call'|'road_wait'|'dying'|'ended';
export type Area = 'apartment'|'landing'|'lift'|'corridor'|'stairs'|'office'|'parking'|'resident'|'aftermath';
export type Action = 'car_board'|'passenger'|'wreck'|'fatal'|'collision'|'fled'|'home'|'wake'|'skip_memory'|'blackout'|'awake'|'switch'|'flashlight'|'circuit_a'|'circuit_b'|'circuit_c'|'tape_next'|'car_search'|'valve_a'|'valve_b'|'pump'|'phone'|'breaker'|'shoes'|'radio'|'heard'|'closet'|'survived'|'door'|'caught'|'call'|'arrived'|'enter'|'sealed'|'panel'|'stopped'|'pry'|'leave_lift'|'stairs'|'down'|'stair_note'|'up'|'record'|'fuse'|'security_power'|'monitor'|'service_exit'|'exit'|'alarm'|'dead'|'belongings'|'portrait'|'answerphone'|'resident_leave'|'car_door'|'road_bag'|'road_phone'|'stay'|'lure';
export type Story = {stage:Stage;hidden:boolean;ending:'crashed'|'caught'|null;resume:Stage;notes:string[];circuit:Action[];tapeIndex:number};
export const chaseStages:Stage[]=['hide','escape','lift_call','lift_wait','lift_enter','corridor_run','stairs_loop','stairs_clue','stairs_reverse','office_record','office_fuse','office_power','office_tape','office_leave','parking_gate','parking_key','parking_pump','parking_alarm','parking_run','resident_return'];
export const opening:Partial<Record<Stage,{duration:number;action:Action;label:string;text:string;cues?:{at:number;text:string}[]}>>={
  drive:{duration:20,action:'collision',label:'사흘 전 · 새벽 03:17',text:'술을 마셨다.\n대리운전은 두 번 취소됐다.',cues:[
    {at:4,text:'집까지 세 블록.\n그 정도는 괜찮다고 생각했다.'},
    {at:8.5,text:'백로아파트. 매일 다니던 길이었다.'},
    {at:12,text:''},
    {at:15.9,text:'휴대전화가 진동했다.'},
    {at:18.6,text:''},
  ]},
  impact:{duration:13,action:'fled',label:'03:17 · 백로아파트 앞 횡단보도',text:'',cues:[
    {at:2.2,text:'…사람이었다.'},
    {at:4.7,text:'차 밖에서 전화가 울렸다.\n내 전화는 아니었다.'},
    {at:8,text:'내려야 했다. 신고해야 했다.'},
    {at:10.8,text:'그런데 나는 문을 잠갔다.'},
  ]},
  flee:{duration:8,action:'home',label:'03:17 · 현장을 떠났다',text:'브레이크에서 발을 뗐다.',cues:[
    {at:2.6,text:'백미러 속 횡단보도가 멀어졌다.'},
    {at:5.4,text:'전화벨이 더는 들리지 않았다.'},
  ]},
  sleep:{duration:8,action:'wake',label:'그날 새벽 · 28층 2803호',text:'집에 돌아와 젖은 신발을 벗었다.',cues:[
    {at:3,text:'신고하지 않았다.\n아무에게도 말하지 않았다.'},
    {at:6,text:''},
  ]},
};
// These beats also drive the camera, phone props and sound; they share simulation time.
export const openingTiming={phoneBuzz:15.9,lookUp:17.6,brake:19.1,victimCall:4.4,lock:10.8} as const;
export function hasFlashlight(s:Pick<Story,'stage'>){return !['drive','impact','flee','sleep','tv','wake_ring','light_switch','find_torch'].includes(s.stage);}
export const finale:Partial<Record<Stage,{duration:number;action:Action;label:string;text:string;cues?:{at:number;text:string}[]}>>={
  car_escape:{duration:10,action:'passenger',label:'제 7장 · 동승자',text:'시동이 걸렸다. 문을 잠갔다.',cues:[{at:3,text:'백미러에서 아파트가 멀어졌다.'},{at:6,text:'이제… 빠져나왔다.'},{at:8.5,text:''}]},
  car_voice:{duration:5,action:'wreck',label:'03:17 · 조수석',text:'「이번에도… 혼자 가려고?」',cues:[{at:4.1,text:''}]},
  car_crash:{duration:5.5,action:'fatal',label:'03:17',text:'',cues:[{at:3,text:'브레이크를 밟기에는 늦었다.'}]},
};
export const finaleTiming={turn:1.2,reveal:3.2,impact:.55} as const;
export function isFinale(stage:Stage){return finale[stage]!==undefined;}
export function isCinematic(stage:Stage){return isMemory(stage)||isFinale(stage);}
export const tapeTimes=['03:17 · 진입로','03:26 · 지하 입차','03:31 · 승강기'];
export function isMemory(stage:Stage){return opening[stage]!==undefined;}
export function initialStory():Story{return {stage:'drive',hidden:false,ending:null,resume:'radio',notes:[],circuit:[],tapeIndex:0};}
export function retryStage(stage:Stage):Stage{
  if(stage==='lift_exit'||stage==='corridor_run')return 'lift_exit';
  if(['lift_boarding','lift_button','descent','pry'].includes(stage))return 'lift_button';
  if(stage.startsWith('resident'))return 'resident_entry';
  if(stage.startsWith('road')||isFinale(stage))return 'car_escape';
  return stage==='parking_run'?'parking_alarm':stage.startsWith('parking')?'parking_gate':stage.startsWith('office')?'office_record':stage.startsWith('stairs')?'stairs_loop':stage.startsWith('lift')?'lift_call':'radio';
}
export function checkpoint(state?:Story):Story{
  const current=state?.stage;
  let stage:Stage=current&&current!=='ended'&&current!=='dying'?retryStage(current):state?.resume||'radio';
  if(state?.stage==='corridor_run')stage='lift_exit';
  if(state?.stage==='parking_run')stage='parking_alarm';
  return {...initialStory(),stage,resume:stage,notes:[...(state?.notes||[])]};
}
const steps:Partial<Record<Stage,[Action,Stage]>>={
  drive:['collision','impact'],impact:['fled','flee'],flee:['home','sleep'],sleep:['wake','wake_ring'],
  tv:['blackout','wake_ring'],wake_ring:['awake','light_switch'],light_switch:['switch','find_torch'],find_torch:['flashlight','power'],power:['breaker','phone'],phone:['phone','shoes'],shoes:['shoes','radio'],radio:['radio','listen'],listen:['heard','hide'],
  escape:['door','lift_call'],lift_call:['call','lift_wait'],lift_wait:['arrived','lift_enter'],lift_enter:['enter','lift_boarding'],lift_boarding:['sealed','lift_button'],lift_button:['panel','descent'],descent:['stopped','pry'],pry:['pry','lift_exit'],lift_exit:['leave_lift','corridor_run'],corridor_run:['stairs','stairs_loop'],
  stairs_loop:['down','stairs_clue'],stairs_clue:['stair_note','stairs_reverse'],stairs_reverse:['up','resident_entry'],
  office_record:['record','office_fuse'],office_fuse:['fuse','office_power'],office_leave:['service_exit','parking_gate'],parking_gate:['exit','parking_key'],parking_key:['car_search','parking_pump'],parking_alarm:['alarm','parking_run'],parking_run:['car_board','car_escape'],car_escape:['passenger','car_voice'],car_voice:['wreck','car_crash'],car_crash:['fatal','ended'],resident_return:['resident_leave','office_record'],
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
  if(action==='door'&&['hide','escape'].includes(state.stage))return {...state,stage:'lift_call'};
  if(state.stage.startsWith('resident')&&['belongings','answerphone','portrait'].includes(action)){
    if(state.notes.includes(action)&&state.stage==='resident_return')return state;
    const notes=state.notes.includes(action)?state.notes:[...state.notes,action];
    return {...state,notes,stage:['belongings','answerphone','portrait'].every(n=>notes.includes(n))?'resident_return':'resident_memory'};
  }
  if(state.stage==='office_power'&&['circuit_a','circuit_b','circuit_c'].includes(action)){
    const sequence:Action[]=['circuit_b','circuit_a','circuit_c'];
    const circuit=action===sequence[state.circuit.length]?[...state.circuit,action]:[];
    return {...state,circuit,stage:circuit.length===3?'office_tape':'office_power'};
  }
  if(state.stage==='office_tape'){
    if(action==='tape_next')return {...state,tapeIndex:(state.tapeIndex+1)%3};
    if(action==='monitor'&&state.tapeIndex===1)return {...state,stage:'office_leave',notes:[...new Set([...state.notes,'monitor'])]};
  }
  if(state.stage==='parking_pump'){
    if(action==='valve_a'||action==='valve_b')return state.notes.includes(action)?state:{...state,notes:[...state.notes,action]};
    if(action==='pump'&&['valve_a','valve_b'].every(n=>state.notes.includes(n)))return {...state,stage:'parking_alarm',notes:[...new Set([...state.notes,'pump'])]};
  }
  const next=steps[state.stage];if(next?.[0]!==action)return state;
  const notes=journal[action]&&!state.notes.includes(action)?[...state.notes,action]:state.notes;
  return {...state,stage:next[1],notes,ending:next[1]==='ended'?'crashed':null};
}
export function areaFor(story:Story):Area{
  const s=story.stage==='ended'?story.resume:story.stage;
  if(['lift_call','lift_wait','lift_enter','lift_boarding'].includes(s))return 'landing';
  if(['lift_button','descent','pry','lift_exit'].includes(s))return 'lift';
  if(s==='corridor_run')return 'corridor';
  if(s.startsWith('stairs'))return 'stairs';
  if(s.startsWith('office'))return 'office';
  if(s.startsWith('parking'))return 'parking';
  if(s.startsWith('resident'))return 'resident';
  if(s.startsWith('road')||isFinale(s))return 'aftermath';
  return 'apartment';
}
export const chapters:Record<Area,{number:string;title:string;floor:string}>={
  apartment:{number:'01',title:'먼저 와 있는 사람',floor:'28F · 2803호'},landing:{number:'02',title:'하강',floor:'28F'},lift:{number:'02',title:'하강',floor:'엘리베이터'},corridor:{number:'03',title:'닫히지 않는 문',floor:'24F'},stairs:{number:'03',title:'같은 층',floor:'23F'},office:{number:'05',title:'없는 층의 관리실',floor:'17F'},parking:{number:'06',title:'마지막 경보',floor:'B1'},resident:{number:'04',title:'돌아오지 못한 사람',floor:'17F · 1704호'},aftermath:{number:'07',title:'동승자',floor:'03:17 · 귀갓길'},
};
export const objectives:Record<Stage,string>={
  drive:'사흘 전의 기억',impact:'사람이었다',flee:'나는 도망쳤다',sleep:'집으로 돌아와 잠들었다',tv:'사흘 뒤',wake_ring:'전화벨에 잠이 깬다',light_switch:'침실 입구의 전등 스위치를 켜세요',find_torch:'불이 들어오지 않는다. 침실 서랍장 위에서 손전등을 찾으세요',phone:'거실 탁자에서 울리는 전화기를 확인하세요',power:'정전이다. 손전등을 들고 다용도실의 차단기를 확인하세요',shoes:'현관에서 들린 소리를 확인하세요',radio:'침실에서 혼자 켜진 라디오를 끄세요',listen:'라디오는 꺼졌다. 그런데 복도에서 무슨 소리가…',hide:'침실 장롱에 숨으세요 · Shift 달리기',wait:'어둠 속의 움직임에 귀를 기울인다',escape:'열린 현관까지 빠져나갈 길을 찾는다',
  lift_call:'뒤따라온다! 외부 복도 끝의 엘리베이터를 호출하세요',lift_wait:'뒤를 살피며 거리를 벌리세요. 엘리베이터가 오고 있습니다',lift_enter:'문이 열렸다! 엘리베이터로 뛰어드세요',lift_boarding:'탑승했다. 문이 닫히고 있다',lift_button:'오른쪽 조작반에서 1층을 누르세요',descent:'1층으로 내려가는 중',pry:'문 가까이에서 E를 길게 눌러 문을 벌리세요',lift_exit:'벌어진 문으로 탈출하세요',corridor_run:'좌우 복도로 우회하세요! 반대편 녹색 비상계단으로!',
  stairs_loop:'비상계단을 따라 아래층으로 내려가세요',stairs_clue:'또 23층이다. 벽에 붙은 점검 메모를 읽으세요',stairs_reverse:'아래층에서 들리는 발소리를 피해 다른 길을 찾는다',office_record:'관리실 책상의 야간 근무일지를 확인하세요',office_fuse:'서고의 예비 부품대에서 퓨즈를 찾으세요',office_power:'전기실 배전반 · 근무일지의 순서대로 세 회로를 연결하세요',office_tape:'CCTV 시간 선택 버튼으로 내 차가 입차한 기록을 찾아 재생하세요',office_leave:'복도 끝 비상문을 열고 지하로 내려가세요',
  parking_gate:'주차장 반대편의 보행자 출구를 확인하세요',parking_key:'내 차의 조수석을 조사해 배수 설비 열쇠를 찾으세요',parking_pump:'급수 밸브 두 곳을 잠근 뒤 배수 펌프를 가동하세요',parking_alarm:'입구 쪽 붉은 화재경보기를 울려 귀신을 유인하세요',parking_run:'경보가 울리는 동안 내 차의 운전석으로 달려가 탑승하세요!',resident_entry:'1704호. 현관에 그 신발 한 짝이 남아 있다',resident_memory:'이 집에 돌아오지 못한 사람의 흔적을 확인한다',resident_return:'문 너머의 발소리가 멀어진다. 뒤쪽 연결문으로 나간다',road_exit:'03:17. 이번에는 차 문을 연다',road_evidence:'횡단보도 위에 떨어진 가방을 확인한다',road_call:'가방 곁의 금 간 전화기를 든다. 이번에는 신고한다',road_wait:'도망치지 않고, 구조를 기다린다',car_escape:'',car_voice:'',car_crash:'',dying:'',ended:'',
};
export const journal:Partial<Record<Action,{title:string;text:string}>>={
  flashlight:{title:'28층 · 꺼진 조명',text:'스위치를 눌러도 불이 들어오지 않는다. 침실 서랍장 위에서 손전등을 찾았다. 전화벨은 아직도 울린다.'},
  car_search:{title:'B1 · 조수석에 놓인 열쇠',text:'CCTV 속 그녀가 조수석에 내려놓은 열쇠. 꼬리표에는 「배수 설비」, 뒷면에는 「양측 급수 차단 후 펌프 가동」이 적혀 있다. 젖은 좌석 위에는 손자국 하나가 남아 있다.'},
  valve_a:{title:'B1 · 서측 급수 밸브',text:'서측 급수관을 차단했다. 동측 밸브도 잠가야 펌프를 돌릴 수 있다.'},
  valve_b:{title:'B1 · 동측 급수 밸브',text:'동측 급수관을 차단했다. 두 급수관이 닫히면 서측 펌프를 가동한다.'},
  pump:{title:'B1 · 열린 퇴로',text:'물이 빠지자 출구 밑에 걸린 부러진 문턱이 드러났다. 이제 출구에서 잔해를 걷어낼 수 있을 것 같다. 나를 따라오는 발소리가 멎지 않는다. 입구 경보로 시선을 돌리자.'},
  belongings:{title:'1704호 · 젖지 않은 신발 한 짝',text:'현관에는 검은 신발 한 짝과 접힌 우산이 있다. 찻잔은 식었고, 자동응답기의 녹음 표시만 깜박인다.\n\n신발장 위의 관리비 봉투. 1704호 / 한서연. 매일 이 문으로 돌아오던 사람이었다.\n\n벽에는 쪽지가 붙어 있다. 「야간 당직 한서연 / 내선 17. 외벽 공사 중 1703호를 임시 관리실로 사용합니다. 퇴근 후 연결문을 잠가 주세요.」'},
  portrait:{title:'1704호 · 냉장고의 약속',text:'냉장고 문에 손으로 쓴 쪽지가 붙어 있다. 「다음에는 맑은 날에. 내일 오후 두 시.」\n\n누군가와 만나기로 한 약속. 사흘 전 그 사람에게는, 돌아와서 기다릴 내일이 있었다.'},
  answerphone:{title:'1704호 · 마지막 음성메시지',text:'03:16. 「비가 너무 오네. 거의 다 왔어. 문 열어두지 말고 먼저 자. 내일 전화할게.」\n\n메시지는 끝났지만 테이프는 계속 돌아간다. 횡단보도 신호음. 급하게 밟는 브레이크. 그리고 받지 못한 전화벨.\n\n나는 그 전화벨을 들었다. 멈추고도, 차에서 내리지 않은 것이다.'},
  wake:{title:'사흘 전 · 내가 외면한 밤',text:'술을 마신 채 차를 몰았다. 백로아파트 앞 횡단보도에서 여성을 치었다. 새벽 03:17.\n\n나는 사람을 죽이고도 차에서 내리지 않았다. 신고하지 않았다. 그대로 도망쳐 2803호로 돌아와 잠들었다.\n\n사흘이 지났다. 매일 그 시각에 눈이 떠진다. 오늘은 전화벨에 잠이 깼다. 스위치를 눌러도 불이 들어오지 않는다.'},
  phone:{title:'28층 · 정전 뒤의 전화',text:'차단기는 올라갔지만 불은 돌아오지 않았다. 전화기에서 빗소리와 와이퍼 소리가 들렸다.\n「그날은 안 멈췄잖아. 오늘은 문을 열어.」\n\n현관에는 젖은 검은 신발이 놓여 있었다. 그날 차 앞에 떨어졌던 신발. 분명 도로에 두고 왔다.'},
  stair_note:{title:'23층 · 지워지지 않는 시각',text:'같은 층이 두 번 보이면 더 내려가지 마세요.\n당신보다 먼저 내려가는 발소리를 따라가지 마세요.\n위층 문 너머에서 전화벨이 들립니다.\n\n종이 뒷면에 내 차 번호와 03:17이 반복해서 적혀 있다. 마지막 문장만 다른 필체다.\n「그때 멈췄어야지.」'},
  record:{title:'17층 · 사흘 전의 사고 기록',text:'백로아파트 임시 관리실 / 사흘 전\n당직: 한서연. 17층 외벽 공사로 사용하던 임시 사무실은 사고 다음 날 폐쇄됐다.\n03:17. 건물 앞 횡단보도에서 보행자 사망 사고. 검은 승용차가 현장을 이탈.\n03:26. 파손 차량 입차. 2803호 운전자가 내렸다. 조수석 쪽에서 손잡이 소리가 났다.\n운전자는 9초 동안 멈춰 서 있었다. 뒤돌아보지 않고 엘리베이터로 갔다.\n\n나는 소리를 들었다. 그래서 멈췄었다. 그 사실까지 잊은 척했던 것이다.\n\n여백에 덧쓴 글: 「야간 점검: 화재경보기에서 경적 같은 소음 발생. 출구 열쇠는 CCTV 옆 열쇠 고리에 보관. 전원이 끊기면 서고의 예비 퓨즈를 사용할 것. 회로 복구 순서: B 접지 → A 입력 → C 감시. 녹화 시간은 입차 기록과 대조할 것.」'},
  monitor:{title:'CCTV · 귀가한 사람은 둘',text:'사흘 전 03:26. 앞부분이 찌그러진 내 차가 들어온다. 내가 내려 혼자 엘리베이터로 간다.\n\n빈 조수석 문이 열린다. 흰 소매의 여자가 몸을 꺾으며 내린다. 도로에 두고 온 그 여자다. 그녀가 좌석에 무엇인가 놓고 돌아선다. 확대된 꼬리표에 「배수 설비」. 화면 속 여자는 내가 아니라, 지금 모니터를 보고 있는 나를 쳐다본다.\n「귀가자 2명 / 2803호」\n\n그날부터 집 안에 있었다. CCTV 옆 비상 열쇠를 챙겼다. 보행자 출구는 막혔다. 경보로 유인한 뒤 내 차에 타야 한다.'},
  exit:{title:'B1 · 다시 마주한 차',text:'출구 옆에 내 차가 있다. 앞유리의 금, 구겨진 보닛. 조수석 시트만 흠뻑 젖어 있다.\n\n비상 열쇠는 맞는다. 하지만 침수된 문 아래에 잔해가 끼어 있다. 배수 설비 안내에는 양측 급수 차단 후 펌프 가동이라고 적혀 있다. CCTV에서 그녀가 조수석에 남긴 열쇠를 떠올렸다. 물을 빼야 차량 출구를 열 수 있다. 보행자 출구는 바깥에서 봉쇄되어 있다. 차로 나가야 한다. 나를 따라오는 발소리는 경보로 유인할 수 있을 것이다.\n문 너머에서 들리는 것은 빗소리다. 그날 밤과 똑같은.'},
};
export const endings={
  crashed:'차는 아파트 앞 도로의 콘크리트 방호벽을 들이받았다.\n운전자는 현장에서 사망했다.\n\n차량에서 발견된 탑승자는 한 명.\n블랙박스에는 충돌 직전, 여자의 목소리가 남아 있었다.\n\n「이번에도… 혼자 가려고?」',
  caught:'그날 도로에 두고 왔다고 생각했다.\n그녀는 처음부터 나와 함께 귀가했다.',
};
