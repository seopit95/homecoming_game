import {journalEntry,type Action,type Story} from './story.ts';

// This is a reading of earned notes, never a second quest state. In particular,
// recovered tapes are not proof until the player has compared their contents.
export function investigation(story:Pick<Story,'notes'>){
 const notes=new Set(story.notes),has=(...ids:string[])=>ids.some(id=>notes.has(id));
 const groups=[['memory','사흘 전의 기억'],['home','28층과 비상계단'],['resident','1704호 · 남겨진 생활'],['office','임시 관리실'],['annex','1층 · 비상 호출'],['court','중정 · 인계 기록'],['archive','지하 · 원본 대조'],['plant','기계실'],['parking','주차장'],['other','그 밖의 기록']] as const;
 const sectionFor=(id:string)=>id==='wake'?'memory':id==='phone'||id.startsWith('home_')||id==='gallery_notice'||id==='core_notice'||id==='stair_note'?'home':id==='belongings'||id==='portrait'||id==='answerphone'||id.startsWith('resident_')?'resident':id.startsWith('annex_')?'annex':id.startsWith('court_')?'court':id.startsWith('archive_')?'archive':id.startsWith('plant_')?'plant':id==='exit'||id==='car_search'?'parking':['record','monitor','fuse','office_install','security_power','service_key'].includes(id)?'office':'other';
 const records=[...notes].flatMap(id=>{const entry=journalEntry(id as Action,story);return typeof entry?.title==='string'&&typeof entry?.text==='string'?[{id,title:entry.title,text:entry.text}]:[];});
 const sections=groups.map(([id,title])=>({id,title,records:records.filter(r=>sectionFor(r.id)===id)})).filter(s=>s.records.length);
 const timeline:{id:string;time:string;title:string;text:string;confirmed:boolean;source:string}[]=[];
 if(has('answerphone'))timeline.push({id:'voice',time:'03:16',title:'돌아오겠다는 말',text:'「거의 다 왔어. 먼저 자. 내일 전화할게.」 집에 돌아와 지킬 약속이 있었다.',confirmed:true,source:'1704호 · 직접 들은 메시지'});
 if(has('wake','archive_road','archive_sequence_road')){
  const confirmed=has('archive_sequence_road');timeline.push({id:'road',time:'03:17',title:confirmed?'늦게 켜진 제동등':'횡단보도의 충돌',text:confirmed?'보행 신호는 녹색이었다. 제동등은 충돌 직전에야 켜졌다. 갑자기 뛰어들었다는 내 기억과 다르다.':has('archive_road')?'술을 마시고 운전했다. 사람을 친 뒤 현장을 떠났다. 충돌 직전의 상황은 원본과 대조하지 않았다.':'술을 마시고 운전했다. 사람을 친 뒤 현장을 떠났다. 나는 그 사람이 갑자기 뛰어들었다고 생각했다.',confirmed,source:confirmed?'도로 원본 · 대조 완료':has('archive_road')?'도로 원본 확보 · 아직 미대조':'그날의 내 기억'});
 }
 if(has('annex_call','annex_line_office','archive_call','archive_sequence_call')){
  const confirmed=has('archive_sequence_call');timeline.push({id:'call',time:'03:20',title:confirmed?'내가 끊은 통화':has('annex_call','annex_line_office')?'현장으로 돌아와 달라는 호출':'양방향 통화 원본',text:confirmed?'「잘못 거셨어요.」 내 대답 뒤, 수신자 쪽에서 통화가 끊겼다. 돌아와 달라는 말을 못 들은 것이 아니었다.':has('annex_call','annex_line_office')?'경비원은 차량 번호를 확인하고 현장으로 돌아와 달라고 했다. 통신실의 보조 녹음에는 수신자 쪽 대답이 없다.':'정문 비상벨에서 등록 휴대전화로 연결된 양방향 원본이다. 아직 양쪽의 말과 통화 종료음을 대조하지 않았다.',confirmed,source:confirmed?'양방향 통화 원본 · 대조 완료':has('archive_call')?'양방향 원본 확보 · 아직 미대조':'발신측 보조 녹음'});
 }
 if(has('record','monitor','court_log','archive_gate','archive_sequence_gate')){
  const confirmed=has('archive_sequence_gate'),missing=has('record','monitor');timeline.push({id:'gate',time:'03:26',title:confirmed?'아직 살아 있던 목소리':'지하 입차',text:confirmed?'충돌 아홉 분 뒤, 한서연은 창밖에서 문을 열어 달라고 했다. 아직 살아 있었다. 나는 운전석에 남아 문을 잠갔다.':missing?'내 차가 돌아왔다. 열람본에서 정차 뒤 아홉 초가 빠져 있다. 다음 화면에는 문이 이미 닫혀 있다.':has('archive_gate')?'CAM-04 / 03:26. 누락된 아홉 초의 영상과 소리를 함께 보존한 원본이다. 아직 내용을 대조하지 않았다.':'2803호 등록 차량의 입차 기록이 남아 있다. 현장을 떠나 이 건물로 돌아왔던 시각이다.',confirmed,source:confirmed?'입차 원본 · 대조 완료':has('archive_gate')?'입차 원본 확보 · 아직 미대조':'관리실 · 인계 기록'});
 }
 const name=has('belongings','annex_badge')?'한서연':null;
 const person={name,text:has('portrait')?'「다음에는 맑은 날에. 내일 오후 두 시.」 냉장고에는 끝내 지키지 못한 약속이 남아 있다.':has('answerphone')?'일상이 계속될 거라고 믿었던 목소리다.':name?'내가 살던 건물의 야간 당직이었다. 얼굴도 모르는 사람이 아니었다.':null};
 const questions:string[]=[];
 if(has('archive_road')&&!has('archive_sequence_road'))questions.push('충돌 직전의 보행 신호와 제동등은 언제 바뀌었을까? 도로 원본을 대조해야 한다.');
 if(has('annex_call','annex_line_office','archive_call')&&!has('archive_sequence_call'))questions.push('03:20, 수신자 쪽에서는 무슨 말을 했을까? 발신측 녹음만으로는 알 수 없다.');
 if(has('record','monitor','archive_gate')&&!has('archive_sequence_gate'))questions.push('입차 뒤 빠진 아홉 초에는 무슨 일이 있었을까? 열람본의 빈 구간만으로 단정할 수 없다.');
 const pattern=has('archive_sequence_road')&&has('archive_sequence_call')&&has('archive_sequence_gate')?'충돌 뒤 현장을 떠났다. 돌아와 달라는 전화를 끊었다. 살아 있는 사람의 구조 요청을 듣고도 문을 잠갔다. 충돌 장면이 아니라 그 뒤의 아홉 초를 삭제해 달라고 했다. 기록에서 반복되는 것은 내가 외면한 순간들이다.':null;
 return {count:records.length,sections,timeline,person,questions,pattern};
}
