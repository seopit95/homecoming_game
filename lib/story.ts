export type Stage = 'tv'|'phone'|'power'|'shoes'|'radio'|'listen'|'hide'|'wait'|'escape'|'lift_call'|'lift_wait'|'lift_enter'|'lift_button'|'descent'|'pry'|'lift_exit'|'corridor_run'|'stairs_loop'|'stairs_clue'|'stairs_reverse'|'office_record'|'office_fuse'|'office_power'|'office_tape'|'office_leave'|'parking_gate'|'parking_alarm'|'parking_run'|'dying'|'ended';
export type Area = 'apartment'|'landing'|'lift'|'corridor'|'stairs'|'office'|'parking';
export type Action = 'blackout'|'phone'|'breaker'|'shoes'|'radio'|'heard'|'closet'|'survived'|'door'|'caught'|'call'|'arrived'|'enter'|'panel'|'stopped'|'pry'|'leave_lift'|'stairs'|'down'|'stair_note'|'up'|'record'|'fuse'|'security_power'|'monitor'|'service_exit'|'exit'|'alarm'|'dead';
export type Story = {stage:Stage;hidden:boolean;ending:'escaped'|'caught'|null;resume:Stage;notes:string[]};
export const chaseStages:Stage[]=['hide','escape','lift_call','lift_wait','lift_enter','corridor_run','stairs_loop','stairs_clue','stairs_reverse','office_record','office_fuse','office_power','office_tape','office_leave','parking_gate','parking_alarm','parking_run'];
export function initialStory():Story{return {stage:'tv',hidden:false,ending:null,resume:'radio',notes:[]};}
export function checkpoint(state?:Story):Story{
  let stage:Stage=state?.resume||'radio';
  if(state?.stage==='corridor_run')stage='lift_exit';
  if(state?.stage==='parking_run')stage='parking_alarm';
  return {...initialStory(),stage,resume:stage,notes:[...(state?.notes||[])]};
}
const steps:Partial<Record<Stage,[Action,Stage]>>={
  tv:['blackout','power'],power:['breaker','phone'],phone:['phone','shoes'],shoes:['shoes','radio'],radio:['radio','listen'],listen:['heard','hide'],
  escape:['door','lift_call'],lift_call:['call','lift_wait'],lift_wait:['arrived','lift_enter'],lift_enter:['enter','lift_button'],lift_button:['panel','descent'],descent:['stopped','pry'],pry:['pry','lift_exit'],lift_exit:['leave_lift','corridor_run'],corridor_run:['stairs','stairs_loop'],
  stairs_loop:['down','stairs_clue'],stairs_clue:['stair_note','stairs_reverse'],stairs_reverse:['up','office_record'],
  office_record:['record','office_fuse'],office_fuse:['fuse','office_power'],office_power:['security_power','office_tape'],office_tape:['monitor','office_leave'],office_leave:['service_exit','parking_gate'],parking_gate:['exit','parking_alarm'],parking_alarm:['alarm','parking_run'],parking_run:['exit','ended'],
};
export function transition(state:Story,action:Action):Story{
  if(state.stage==='ended')return state;
  if(state.stage==='dying')return action==='dead'?{...state,stage:'ended'}:state;
  if(action==='caught'&&chaseStages.includes(state.stage)&&!state.hidden){
    const resume=state.stage==='corridor_run'?'lift_exit':state.stage==='parking_run'?'parking_alarm':state.stage.startsWith('parking')?'parking_gate':state.stage.startsWith('office')?'office_record':state.stage.startsWith('stairs')?'stairs_loop':state.stage.startsWith('lift')?'lift_call':'radio';
    return {...state,stage:'dying',ending:'caught',resume};
  }
  if(action==='closet'){
    if(state.stage==='hide')return {...state,stage:'wait',hidden:true};
    if(state.stage==='wait')return {...state,stage:'hide',hidden:false};
    if(state.stage==='escape')return {...state,hidden:!state.hidden,stage:state.hidden?'escape':'wait'};
  }
  if(state.stage==='wait'&&state.hidden&&action==='survived')return {...state,stage:'escape'};
  if(state.hidden)return state;
  if(action==='door'&&['power','phone','shoes','radio','listen','hide','escape'].includes(state.stage))return {...state,stage:'lift_call'};
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
  return 'apartment';
}
export const chapters:Record<Area,{number:string;title:string;floor:string}>={
  apartment:{number:'01',title:'먼저 와 있는 사람',floor:'28F · 2803호'},landing:{number:'02',title:'하강',floor:'28F'},lift:{number:'02',title:'하강',floor:'엘리베이터'},corridor:{number:'03',title:'닫히지 않는 문',floor:'24F'},stairs:{number:'03',title:'같은 층',floor:'23F'},office:{number:'04',title:'없는 층의 관리실',floor:'17F'},parking:{number:'05',title:'마지막 경보',floor:'B1'},
};
export const objectives:Record<Stage,string>={
  tv:'소파에서 심야 방송을 보고 있다',phone:'거실 탁자에서 울리는 휴대전화를 확인하세요',power:'정전이다. 손전등을 들고 다용도실의 차단기를 확인하세요',shoes:'현관에서 들린 소리를 확인하세요',radio:'침실에서 혼자 켜진 라디오를 끄세요',listen:'라디오는 꺼졌다. 그런데 복도에서 무슨 소리가…',hide:'침실 장롱에 숨으세요 · Shift 달리기',wait:'발소리가 다른 방으로 이동할 때까지 기다리세요',escape:'귀신이 욕실을 살피는 사이, 열린 현관으로 빠져나가세요',
  lift_call:'뒤따라온다! 긴 홀 끝의 엘리베이터를 호출하세요',lift_wait:'기둥을 돌며 버티세요. 엘리베이터가 오고 있습니다',lift_enter:'문이 열렸다! 엘리베이터로 뛰어드세요',lift_button:'오른쪽 조작반에서 1층을 누르세요',descent:'1층으로 내려가는 중',pry:'문 가까이에서 E를 길게 눌러 문을 벌리세요',lift_exit:'벌어진 문으로 탈출하세요',corridor_run:'좌우 복도로 우회하세요! 반대편 녹색 비상계단으로!',
  stairs_loop:'비상계단을 따라 아래층으로 내려가세요',stairs_clue:'또 23층이다. 벽에 붙은 점검 메모를 읽으세요',stairs_reverse:'메모를 따라 위쪽 계단으로 올라가세요',office_record:'관리실 책상의 야간 근무일지를 확인하세요',office_fuse:'서고의 선반에서 예비 퓨즈를 찾으세요',office_power:'오른쪽 전기실에 퓨즈를 꽂아 CCTV 전원을 복구하세요',office_tape:'관리실 CCTV 화면을 확인하고 비상 열쇠를 챙기세요',office_leave:'복도 끝 비상문을 열고 지하로 내려가세요',
  parking_gate:'주차장 반대편의 보행자 출구를 확인하세요',parking_alarm:'입구 쪽 붉은 화재경보기를 울려 출구에서 귀신을 유인하세요',parking_run:'경보 소리를 따라가는 동안, 보행자 출구로 달리세요!',dying:'',ended:'',
};
export const journal:Partial<Record<Action,{title:string;text:string}>>={
  phone:{title:'28층 · 정전 뒤의 전화',text:'TV를 보던 중 불이 꺼졌다. 차단기를 올려도 불은 돌아오지 않았다. 그때 휴대전화가 울렸다.\n「2803호 맞죠? 불은 켜지지 않을 거예요. 현관문, 아까부터 열려 있었죠? 신발은 건드리지 마세요. 당신 것 말고, 다른 한 켤레요.」\n\n이사한 지 사흘째다. 아직 누구에게도 호수를 말하지 않았다.'},
  stair_note:{title:'23층 · 설비 점검 메모',text:'같은 층이 두 번 보이면 더 내려가지 마세요.\n당신보다 먼저 내려가는 발소리를 따라가지 마세요.\n한 층 올라가면 관리실로 연결됩니다.\n\n추신: 이 건물 도면에는 17층 관리실이 없습니다.'},
  record:{title:'17층 · 마지막 야간 근무',text:'시라사기 하이츠 야간 근무일지\n2012. 11. 17. 03:17\n2803호에서 여성이 살해된 뒤, 아이가 사라졌다. 아이는 장롱 안에 있었다고 했다. 목과 한쪽 팔이 꺾인 형체가 복도에 나타났다. 어머니는 죽었는데, 아이는 매일 그녀가 돌아왔다고 말했다.\n\n순찰자는 경보 소리를 따라 움직였다. 출구를 열려면 CCTV 옆 비상 열쇠가 필요하다.\n전기가 끊기면 서고 선반의 퓨즈를 사용한다.'},
  monitor:{title:'CCTV · 현재 시각 03:17',text:'화면 속 2803호. 장롱 문이 열렸다.\n안에서 나온 것은 나였다. 지금 내가 입은 옷, 같은 얼굴.\n\n그것이 카메라를 올려다보자 화면 아래 글자가 바뀌었다.\n「귀가 확인 / 아직 한 명 남음」\n\n비상 열쇠를 챙겼다. 지하의 경보를 울리고 보행자 출구로 나가야 한다.'},
  exit:{title:'B1 · 보행자 출구',text:'비상 열쇠로 자물쇠를 풀었다. 문 너머에서 문을 붙잡고 있다.\n\n경보를 울리면 그것은 소리를 확인하러 간다. 오래 속지는 않을 것이다.\n입구 왼쪽 기둥에 화재경보기가 있었다.'},
};
