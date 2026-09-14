export type Stage = 'drive'|'impact'|'flee'|'sleep'|'tv'|'phone'|'power'|'shoes'|'radio'|'listen'|'hide'|'wait'|'escape'|'lift_call'|'lift_wait'|'lift_enter'|'lift_button'|'descent'|'pry'|'lift_exit'|'corridor_run'|'stairs_loop'|'stairs_clue'|'stairs_reverse'|'office_record'|'office_fuse'|'office_power'|'office_tape'|'office_leave'|'parking_gate'|'parking_alarm'|'parking_run'|'resident_entry'|'resident_memory'|'resident_return'|'road_exit'|'road_evidence'|'road_call'|'road_wait'|'dying'|'ended';
export type Area = 'apartment'|'landing'|'lift'|'corridor'|'stairs'|'office'|'parking'|'resident'|'aftermath';
export type Action = 'collision'|'fled'|'home'|'wake'|'skip_memory'|'blackout'|'phone'|'breaker'|'shoes'|'radio'|'heard'|'closet'|'survived'|'door'|'caught'|'call'|'arrived'|'enter'|'panel'|'stopped'|'pry'|'leave_lift'|'stairs'|'down'|'stair_note'|'up'|'record'|'fuse'|'security_power'|'monitor'|'service_exit'|'exit'|'alarm'|'dead'|'belongings'|'portrait'|'answerphone'|'resident_leave'|'car_door'|'road_bag'|'road_phone'|'stay'|'lure';
export type Story = {stage:Stage;hidden:boolean;ending:'escaped'|'caught'|null;resume:Stage;notes:string[]};
export const chaseStages:Stage[]=['hide','escape','lift_call','lift_wait','lift_enter','corridor_run','stairs_loop','stairs_clue','stairs_reverse','office_record','office_fuse','office_power','office_tape','office_leave','parking_gate','parking_alarm','parking_run','resident_return'];
export const opening:Partial<Record<Stage,{duration:number;action:Action;label:string;text:string}>>={
  drive:{duration:8,action:'collision',label:'사흘 전 · 새벽 03:17',text:'술을 마셨다. 운전하면 안 된다는 걸 알면서도 핸들을 잡았다.\n빗소리 때문에, 사람이 다가오는 줄도 몰랐다.'},
  impact:{duration:2.5,action:'fled',label:'03:17',text:'사람이었다.'},
  flee:{duration:6,action:'home',label:'그날 밤 · 돌아보지 않았다',text:'나는 사람을 치어 죽였다. 차에서 내리지도, 신고하지도 않았다.\n그대로 액셀을 밟고 달아났다.'},
  sleep:{duration:6,action:'wake',label:'그날 새벽 · 28층 2803호',text:'집으로 도망와 젖은 옷 그대로 침대에 누웠다.\n아무 일도 없었던 것처럼, 잠들었다.'},
};
export function isMemory(stage:Stage){return opening[stage]!==undefined;}
export function initialStory():Story{return {stage:'drive',hidden:false,ending:null,resume:'radio',notes:[]};}
export function retryStage(stage:Stage):Stage{
  if(stage==='lift_exit'||stage==='corridor_run')return 'lift_exit';
  if(['lift_button','descent','pry'].includes(stage))return 'lift_button';
  if(stage.startsWith('resident'))return 'resident_entry';
  if(stage.startsWith('road'))return 'road_exit';
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
  drive:['collision','impact'],impact:['fled','flee'],flee:['home','sleep'],sleep:['wake','tv'],
  tv:['blackout','power'],power:['breaker','phone'],phone:['phone','shoes'],shoes:['shoes','radio'],radio:['radio','listen'],listen:['heard','hide'],
  escape:['door','lift_call'],lift_call:['call','lift_wait'],lift_wait:['arrived','lift_enter'],lift_enter:['enter','lift_button'],lift_button:['panel','descent'],descent:['stopped','pry'],pry:['pry','lift_exit'],lift_exit:['leave_lift','corridor_run'],corridor_run:['stairs','stairs_loop'],
  stairs_loop:['down','stairs_clue'],stairs_clue:['stair_note','stairs_reverse'],stairs_reverse:['up','resident_entry'],
  office_record:['record','office_fuse'],office_fuse:['fuse','office_power'],office_power:['security_power','office_tape'],office_tape:['monitor','office_leave'],office_leave:['service_exit','parking_gate'],parking_gate:['exit','parking_alarm'],parking_alarm:['alarm','parking_run'],parking_run:['exit','road_exit'],resident_return:['resident_leave','office_record'],road_exit:['car_door','road_evidence'],road_evidence:['road_bag','road_call'],road_call:['road_phone','road_wait'],road_wait:['stay','ended'],
};
export function transition(state:Story,action:Action):Story{
  if(state.stage==='ended')return state;
  if(action==='skip_memory'&&isMemory(state.stage))return {...state,stage:'tv',notes:state.notes.includes('wake')?state.notes:[...state.notes,'wake']};
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
  if(action==='door'&&['power','phone','shoes','radio','listen','hide','escape'].includes(state.stage))return {...state,stage:'lift_call'};
  if(state.stage.startsWith('resident')&&['belongings','answerphone','portrait'].includes(action)){
    const notes=state.notes.includes(action)?state.notes:[...state.notes,action];
    return {...state,notes,stage:notes.includes('belongings')&&notes.includes('answerphone')?'resident_return':'resident_memory'};
  }
  const next=steps[state.stage];if(next?.[0]!==action)return state;
  const notes=journal[action]&&!state.notes.includes(action)?[...state.notes,action]:state.notes;
  return {...state,stage:next[1],notes,ending:next[1]==='ended'?'escaped':null};
}
export function areaFor(story:Story):Area{
  const s=story.stage==='ended'?story.resume:story.stage;
  if(['lift_call','lift_wait','lift_enter'].includes(s))return 'landing';
  if(['lift_button','descent','pry','lift_exit'].includes(s))return 'lift';
  if(s==='corridor_run')return 'corridor';
  if(s.startsWith('stairs'))return 'stairs';
  if(s.startsWith('office'))return 'office';
  if(s.startsWith('parking'))return 'parking';
  if(s.startsWith('resident'))return 'resident';
  if(s.startsWith('road'))return 'aftermath';
  return 'apartment';
}
export const chapters:Record<Area,{number:string;title:string;floor:string}>={
  apartment:{number:'01',title:'먼저 와 있는 사람',floor:'28F · 2803호'},landing:{number:'02',title:'하강',floor:'28F'},lift:{number:'02',title:'하강',floor:'엘리베이터'},corridor:{number:'03',title:'닫히지 않는 문',floor:'24F'},stairs:{number:'03',title:'같은 층',floor:'23F'},office:{number:'05',title:'없는 층의 관리실',floor:'17F'},parking:{number:'06',title:'마지막 경보',floor:'B1'},resident:{number:'04',title:'돌아오지 못한 사람',floor:'17F · 1704호'},aftermath:{number:'07',title:'이번에는 멈춘다',floor:'03:17 · 횡단보도'},
};
export const objectives:Record<Stage,string>={
  drive:'사흘 전의 기억',impact:'사람이었다',flee:'나는 도망쳤다',sleep:'집으로 돌아와 잠들었다',tv:'사흘 뒤, 잠들지 못한 채 심야 방송을 보고 있다',phone:'거실 탁자에서 울리는 휴대전화를 확인하세요',power:'정전이다. 손전등을 들고 다용도실의 차단기를 확인하세요',shoes:'현관에서 들린 소리를 확인하세요',radio:'침실에서 혼자 켜진 라디오를 끄세요',listen:'라디오는 꺼졌다. 그런데 복도에서 무슨 소리가…',hide:'침실 장롱에 숨으세요 · Shift 달리기',wait:'어둠 속의 움직임에 귀를 기울인다',escape:'열린 현관까지 빠져나갈 길을 찾는다',
  lift_call:'뒤따라온다! 외부 복도 끝의 엘리베이터를 호출하세요',lift_wait:'뒤를 살피며 거리를 벌리세요. 엘리베이터가 오고 있습니다',lift_enter:'문이 열렸다! 엘리베이터로 뛰어드세요',lift_button:'오른쪽 조작반에서 1층을 누르세요',descent:'1층으로 내려가는 중',pry:'문 가까이에서 E를 길게 눌러 문을 벌리세요',lift_exit:'벌어진 문으로 탈출하세요',corridor_run:'좌우 복도로 우회하세요! 반대편 녹색 비상계단으로!',
  stairs_loop:'비상계단을 따라 아래층으로 내려가세요',stairs_clue:'또 23층이다. 벽에 붙은 점검 메모를 읽으세요',stairs_reverse:'아래층에서 들리는 발소리를 피해 다른 길을 찾는다',office_record:'관리실 책상의 야간 근무일지를 확인하세요',office_fuse:'서고의 선반에서 예비 퓨즈를 찾으세요',office_power:'오른쪽 전기실에 퓨즈를 꽂아 CCTV 전원을 복구하세요',office_tape:'관리실 CCTV 화면을 확인하고 비상 열쇠를 챙기세요',office_leave:'복도 끝 비상문을 열고 지하로 내려가세요',
  parking_gate:'주차장 반대편의 보행자 출구를 확인하세요',parking_alarm:'입구 쪽 붉은 화재경보기를 울려 출구에서 귀신을 유인하세요',parking_run:'경보 소리를 따라가는 동안, 보행자 출구로 달리세요!',resident_entry:'1704호. 현관에 그 신발 한 짝이 남아 있다',resident_memory:'이 집에 돌아오지 못한 사람의 흔적을 확인한다',resident_return:'벽 너머로 관리실 안내 방송이 들린다',road_exit:'03:17. 이번에는 차 문을 연다',road_evidence:'횡단보도 위에 떨어진 가방을 확인한다',road_call:'전화기를 꺼낸다. 이번에는 신고한다',road_wait:'도망치지 않고, 구조를 기다린다',dying:'',ended:'',
};
export const journal:Partial<Record<Action,{title:string;text:string}>>={
  belongings:{title:'1704호 · 젖지 않은 신발 한 짝',text:'현관에는 검은 신발 한 짝과 접힌 우산이 있다. 장바구니에는 이틀 전에 유통기한이 지난 우유.\n\n신발장 위의 관리비 봉투. 1704호 / 미즈노 사에. 매일 이 문으로 돌아오던 사람이었다.\n\n벽에는 쪽지가 붙어 있다. 「전화가 오면 관리실 내선 17로 돌려주세요. 뒤쪽 연결문은 열어 두었습니다.」'},
  portrait:{title:'1704호 · 냉장고의 약속',text:'냉장고 문에 손으로 쓴 쪽지가 붙어 있다. 「다음에는 맑은 날에. 내일 오후 두 시.」\n\n누군가와 만나기로 한 약속. 사흘 전 그 사람에게는, 돌아와서 기다릴 내일이 있었다.'},
  answerphone:{title:'1704호 · 마지막 음성메시지',text:'03:16. 「비가 너무 오네. 거의 다 왔어. 문 열어두지 말고 먼저 자. 내일 전화할게.」\n\n메시지는 끝났지만 테이프는 계속 돌아간다. 횡단보도 신호음. 급하게 밟는 브레이크. 그리고 차 문 손잡이를 당기는 소리.\n\n나는 충격 뒤에도 소리를 들었다. 돌아보지 않은 것이다.'},
  road_bag:{title:'03:17 · 외면했던 것',text:'가방 안에서 부서진 휴대전화와 1704호 열쇠가 나왔다. 화면에는 전송되지 않은 메시지가 남아 있다. 「도착하면 연락할게.」\n\n나는 그 사람의 이름을 안다. 이제 모르는 사람인 척할 수 없다.'},
  road_phone:{title:'03:18 · 남겨진 신고',text:'「시라사기 하이츠 앞 횡단보도입니다. 제가 차로 사람을 치었습니다. 술을 마셨고, 도망쳤습니다. 이번에는 여기 있겠습니다.」\n\n전화 너머에서 주소를 다시 확인한다. 처음으로 시계가 03:18로 넘어간다.'},
  wake:{title:'사흘 전 · 내가 외면한 밤',text:'술을 마신 채 차를 몰았다. 시라사기 하이츠 앞 횡단보도에서 여성을 치었다. 새벽 03:17.\n\n나는 사람을 죽이고도 차에서 내리지 않았다. 신고하지 않았다. 그대로 도망쳐 2803호로 돌아와 잠들었다.\n\n사흘이 지났다. 매일 그 시각에 눈이 떠진다. 오늘은 잠들지 못해 TV를 켰다.'},
  phone:{title:'28층 · 정전 뒤의 전화',text:'차단기는 올라갔지만 불은 돌아오지 않았다. 휴대전화에서 빗소리와 와이퍼 소리가 들렸다.\n「그날은 안 멈췄잖아. 오늘은 문을 열어.」\n\n현관에는 젖은 검은 신발이 놓여 있었다. 그날 차 앞에 떨어졌던 신발. 분명 도로에 두고 왔다.'},
  stair_note:{title:'23층 · 지워지지 않는 시각',text:'같은 층이 두 번 보이면 더 내려가지 마세요.\n당신보다 먼저 내려가는 발소리를 따라가지 마세요.\n위층 문 너머에서 전화벨이 들립니다.\n\n종이 뒷면에 내 차 번호와 03:17이 반복해서 적혀 있다. 마지막 문장만 다른 필체다.\n「그때 멈췄어야지.」'},
  record:{title:'17층 · 사흘 전의 사고 기록',text:'시라사기 하이츠 야간 근무일지 / 사흘 전\n03:17. 건물 앞 횡단보도에서 보행자 사망 사고. 검은 승용차가 현장을 이탈.\n03:26. 파손 차량 입차. 2803호 운전자가 내렸다. 조수석 쪽에서 손잡이 소리가 났다.\n운전자는 9초 동안 멈춰 서 있었다. 뒤돌아보지 않고 엘리베이터로 갔다.\n\n나는 소리를 들었다. 그래서 멈췄었다. 그 사실까지 잊은 척했던 것이다.\n\n여백에 덧쓴 글: 「그녀는 차의 경적 같은 소리를 따라간다. 출구 열쇠는 CCTV 옆. 전원이 끊기면 서고의 예비 퓨즈를 사용할 것.」'},
  monitor:{title:'CCTV · 귀가한 사람은 둘',text:'사흘 전 03:26. 앞부분이 찌그러진 내 차가 들어온다. 내가 내려 혼자 엘리베이터로 간다.\n\n빈 조수석 문이 열린다. 흰 소매의 여자가 몸을 꺾으며 내린다. 도로에 두고 온 그 여자다. 화면 속 여자는 내가 아니라, 지금 모니터를 보고 있는 나를 쳐다본다.\n「귀가자 2명 / 2803호」\n\n그날부터 집 안에 있었다. CCTV 옆 비상 열쇠를 챙겼다. 경보를 울리고 지하 보행자 출구로 나가야 한다.'},
  exit:{title:'B1 · 다시 마주한 차',text:'출구 옆에 내 차가 있다. 앞유리의 금, 구겨진 보닛. 조수석 시트만 흠뻑 젖어 있다.\n\n비상 열쇠로 자물쇠를 풀었지만 누군가 문을 붙잡고 있다. 입구 왼쪽 경보를 울리면 소리를 따라 움직일 것이다.\n문 너머에서 들리는 것은 빗소리다. 그날 밤과 똑같은.'},
};
export const endings={
  escaped:'전화는 끊지 않았다.\n횡단보도 앞에서, 처음으로 발을 멈췄다.\n\n멀리서 사이렌이 들린다. 휴대전화는 03:18을 가리킨다.\n그녀는 더 이상 나를 쫓지 않았다.\n\n아침이 와도 내가 한 일은 사라지지 않는다.\n나는 내 이름을 말하고, 그곳에 남았다.',
  caught:'그날 도로에 두고 왔다고 생각했다.\n그녀는 처음부터 나와 함께 귀가했다.',
};
