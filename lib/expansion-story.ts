import type {Action,Story,Stage} from './story.ts';

export const expansionObjectives={
 office_departure:'열린 관리용 승강기에 걸어 들어가세요',
 service_ride:'관리용 승강기가 1층으로 내려가고 있다',service_open:'문이 열렸다. 1층 공동시설로 걸어 나가세요',
 annex_arrival:'1층 안내판에서 바깥으로 나갈 길을 확인하세요',
 annex_fuse:'서측 세탁실의 정비함에서 통신용 퓨즈를 찾으세요',
 annex_restore:'동측 통신실의 인터폰 전원함에 퓨즈를 연결하세요',
 annex_search:'공동시설에 남은 발신 기록을 조사하세요',
 annex_unlock:'중앙 경비실 교환기에서 사흘 전 마지막 호출의 수신 세대를 선택하세요',
 annex_exit_ready:'북쪽 방화문을 열고 외부 중정으로 나가세요',annex_departure:'열린 방화문을 지나 중정으로 나가세요',
 court_arrival:'중정 반대편 정문 셔터에서 밖으로 나갈 방법을 찾으세요',court_search:'경비일지·비상전화·사고 흔적을 대조해 지하 통로의 비밀번호를 찾으세요',court_code:'동측 경비초소 금고 · 기록에서 찾은 네 자리 번호를 맞추고 확인하세요',court_unlocked:'금고에서 챙긴 열쇠로 북쪽 지하 기록보관실 문을 여세요',court_departure:'열린 계단을 따라 기록보관실로 내려가세요',
 archive_arrival:'기록보관실 입구의 인계 대장을 읽으세요',archive_search:'세 곳의 보관실에서 사고 당일 기록을 회수하세요',
 archive_edit:'편집실에서 각 기록의 사건과 시각을 대조해 실제 순서로 연결하세요',
 archive_playback:'복원된 영상에서 지워진 아홉 초를 확인하세요',
 archive_reveal:'연결된 기록을 편집실 모니터에서 재생하세요',
 archive_escape:'문밖에서 손톱 소리가 들린다. 북쪽 기계실 연결문으로 빠져나가세요',archive_departure:'열린 연결문을 지나 기계실로 이동하세요',
 plant_arrival:'침수된 통로 옆의 배관 계통도를 확인하세요',plant_isolate:'서측과 동측 급수 밸브를 모두 잠그세요',
 plant_power:'배관 계통도와 침수 주의사항에 맞춰 회로를 구성하고 펌프를 가동하세요',
 plant_drain:'배수가 진행 중이다. 기계실을 돌며 접근하는 소리를 피하세요',
 plant_exit_ready:'물이 빠졌다. 북쪽 주차장 연결문을 여세요',plant_departure:'열린 문을 지나 주차장으로 나가세요',
} as const;
export type ExpansionStage=keyof typeof expansionObjectives;
export type ExpansionArea='annex'|'courtyard'|'archive'|'plant';
export const expansionJournal={
 court_gate:{title:'중정 · 문 너머의 도로',text:'정문 너머에는 신호등과 차들이 있다. 누군가 지나가는 것 같은데, 소리쳐도 아무도 돌아보지 않는다. 차들이 지나갈 때마다 같은 경적이 들린다.\n\n공사 셔터의 손잡이는 부러져 있다. 안내문에는 「지하 기록보관실 → 배수 기계실 → 주차장 차량 출구」. 북쪽 지하문 열쇠는 동측 경비초소의 금고에 있다.\n\n금고 비밀번호 지침: 사고 차량의 입차 분 두 자리, 당직 내선 두 자리. 서측 경비일지와 동측 비상전화의 안내를 확인할 것.'},
 court_log:{title:'서측 초소 · 돌아온 차량',text:'입차 기록 03:26. 앞범퍼 파손. 운전자 2803호.\n\n당직 대체 근무자가 남긴 메모. 「차를 세우고 물어보려 했으나 운전자가 창문을 열지 않음. 검은 물이 차량 우측 문 아래로 흐름.」\n\n낙서처럼 덧붙은 숫자: 26. 금고의 앞 두 자리는 시가 아니라 입차한 분이다. 그날도, 오늘도 내 차가 이 건물 안으로 들어온다.'},
 court_phone:{title:'비상전화 · 돌아오는 대답',text:'수화기를 들었다. 「사람이 죽었어요. 여기서 나가게 해 주세요.」\n\n잠시 뒤 전화 너머에서 내 목소리가 들렸다. 「잘못 거셨어요.」 내가 말을 멈춰도 그 목소리는 세 번 더 반복됐다.\n\n전화기 안쪽의 오래된 안내판: 야간 당직 내선 17. 한서연. 금고의 뒤 두 자리다. 그녀가 마지막으로 받으려 했던 전화는 지금 내가 걸고 있는 전화와 같았다.'},
 court_evidence:{title:'놀이터 옆 · 주운 반사판',text:'놀이기구 아래에 내 차의 깨진 전조등 조각이 있다. 빗물로 씻어도 홈 사이의 어두운 자국은 지워지지 않는다.\n\n곁에 떨어진 당직 수첩. 「아이들 등교 전에 정문 횡단보도 전등 점검. 우천 시 비상벨 확인.」\n\n그녀는 그날도 누군가 다치지 않도록 길을 확인하러 나갔다. 나는 휴대전화를 보느라 그 사람을 보지 않았다.'},
 court_confirm:{title:'경비초소 · 지하문 열쇠',text:'26, 17. 금고 안에 지하 기록보관실 열쇠가 있다. 열쇠에는 마른 흙과 검은 머리카락이 감겨 있다.\n\n함께 놓인 인계 쪽지. 「사고 신고 녹음은 원본 보존. 수신자가 녹음 삭제를 요청했으나 거절함.」\n\n나는 다음 날에도 전화를 했다. 신고하려고 한 것이 아니었다. 그것까지 지우려고 했던 것이다. 중정 건너편에서 몸을 끄는 소리가 난다.'},
 annex_map:{title:'1층 · 나갈 수 없는 로비',text:'유리문 너머에 도로가 보인다. 출입문은 방범 셔터에 막혀 있고, 비상 해제 장치에는 물이 차 있다.\n\n안내도: 서측 세탁실·우편실 / 동측 경비 휴게실·통신실 / 중앙 경비실. 북쪽 방화문은 외부 중정으로 통한다. 정문 공사 중에는 중정의 지하 계단에서 기록보관실과 기계실을 거쳐 주차장으로 갈 수 있다.\n\n방화문 전자 잠금장치가 마지막 호출을 붙잡고 있다. 우선 세탁실 정비함의 퓨즈로 통신실 전원을 살려야 한다.'},
 annex_fuse:{title:'세탁실 · 마르지 않는 소매',text:'회전이 멈춘 세탁기 안에 흰 천이 뭉쳐 있다. 문에는 안쪽에서 긁은 자국이 있다.\n\n정비함에서 통신용 퓨즈를 꺼냈다. 한서연이 붙인 점검표에는 「침수 시 외부조명 차단. 배수와 환기 전원은 유지」라고 쓰여 있다. 이 건물의 어두운 곳마다 그녀가 다녀간 흔적이 남아 있다.'},
 annex_badge:{title:'경비 휴게실 · 마지막 당직',text:'사물함 안에는 한서연의 명찰과 반쯤 먹은 빵이 있다. 당직표에 적힌 퇴근 시각은 03:10. 여백에 「오늘은 정문으로. 지하 통로 누수」.\n\n그녀가 그 시각 횡단보도를 건넌 이유가 있었다. 휴게실 사진에는 주민들의 화분을 옮기는 모습이 남아 있다. 나는 얼굴도 모르는 사람을 죽였다고 생각했다. 매일 보던 사람이었다.'},
 annex_notice:{title:'우편실 · 반송된 안내문',text:'2803호 앞유리 파손 차량 확인 요청. 입주민께서는 관리실로 연락 바랍니다.\n\n수령란에는 내 서명이 있다. 사흘 전 오후. 「주차 중 파손」이라고 내가 적었다. 기억이 없는 것이 아니었다. 기억할 때마다 다른 말로 덮어 놓았던 것이다.\n\n뒷면의 교환기 점검 기록: 마지막 발신은 정문 비상벨, 수신은 사고 차량 소유자의 세대.'},
 annex_call:{title:'통신실 · 받지 않은 호출',text:'03:20 / 정문 비상벨 → 2803 등록 휴대전화 / 수신 거절.\n\n짧은 녹음 속에서 경비원이 말한다. 「차량 번호가 확인됐습니다. 내려와 주세요. 아직 현장에…」\n\n딸깍. 통화는 상대의 대답 없이 끊긴다. 세대가 응답하지 않으면 등록된 휴대전화로 연결된다. 나는 차 안에서 그 전화를 받았다. 마지막 호출을 받은 집은 피해자의 집이 아니다. 내가 돌아간 2803호다.'},
 annex_line_home:{title:'교환기 · 2803호',text:'2803을 누르자 로비 위쪽에서 내가 사는 집의 벨소리가 들렸다.\n「받았네. 이번에는.」\n\n방화문 잠금이 풀렸다. 바닥의 젖은 자국은 계단 아래로 이어진다. 관리실 CCTV에는 없었던 비상 호출 원본이 지하 기록보관실에 남아 있다.'},
 archive_ledger:{title:'B1 · 보관 인계 대장',text:'서측 A실: 정문 도로 카메라 원본. 동측 B실: 비상벨 통화 기록. 서측 C실: 지하 입차 카메라. 중앙 북쪽 편집실에서 세 기록을 연결한다.\n\n정전으로 파일 시간이 뒤섞였다. 표지의 시각만 믿지 말고 각 기록의 사건을 확인할 것. 현장 영상과 통화 내용, 차량 동선을 서로 대조하면 순서를 복원할 수 있다.\n\n사흘 전 기록 봉투에는 폐기 도장이 찍혀 있다. 도장 옆에서 물방울이 떨어진다. 여기는 비가 들어올 수 없는 곳이다.'},
 archive_road:{title:'A실 · 도로 영상 / 03:17',text:'녹색 보행 신호. 우산을 쓰지 않은 여자가 횡단보도를 건넌다. 화면 오른쪽에서 검은 승용차가 들어온다.\n\n브레이크등은 충돌 뒤에 켜졌다. 운전석의 고개는 조수석 아래를 향해 있었다. 핸드폰을 내려다본 내 모습이 너무 선명하다.\n\n프레임 끝에서 그녀의 신발 한 짝이 멈춘다.'},
 archive_call:{title:'B실 · 비상 호출 / 03:20',text:'사고를 목격한 경비원이 차 번호로 세대에 연락했다. 2803호. 등록된 내 휴대전화로 연결된 호출은 수신자 쪽에서 끊겼다.\n\n녹음 속 내 목소리. 「잘못 거셨어요.」\n\n나는 사고만 외면한 것이 아니었다. 다시 돌아갈 기회가 생겼을 때도, 나를 찾는 사람에게 문을 닫았다.'},
 archive_gate:{title:'C실 · 지하 입차 / 03:26',text:'앞부분이 찌그러진 차량이 차단기를 통과한다. 운전석에서 내가 내린다. 아홉 초 뒤, 빈 조수석의 손잡이가 움직인다.\n\n영상 시간이 잠시 03:17로 돌아간다. 확대된 화면 속 그녀의 손이 운전석 의자 등받이를 움켜쥐고 있다. 집까지 따라온 것이 아니었다. 도로에서부터 함께 타고 있었다.'},
 archive_play:{title:'복원된 기록 · 아홉 초',text:'세 장면이 이어졌다. 충돌. 수신 거절. 입차.\n\n내가 주차장에서 멈춰 있던 아홉 초 동안 차 안에서 목소리가 들렸다. 「문 좀 열어 주세요.」 나는 소리를 듣고도 문을 잠갔다.\n\n재생이 끝났는데 모니터의 시간이 현재 03:17로 바뀐다. 「기록 작성 중」. 내가 아무것도 누르지 않았는데 글자가 늘어난다. 마지막 문장. 「네 뒤에 있어」. 곧바로 문밖에서 손톱이 바닥을 긁는다.'},
 plant_diagram:{title:'B1 · 배수 계통도',text:'차량 출구가 침수되어 있다. 기록보관실 북쪽의 기계실을 통해 배수 장치를 복구해야 한다.\n\n① 서측 저장탱크와 동측 급수관을 차단한다.\n② 전기실에서 배수 펌프와 환기 회로를 켠다. 침수된 외부조명 회로는 끈다.\n③ 기동 버튼을 누르고 수위가 내려가면 북쪽 주차장 연결문으로 나간다.\n\n한서연의 점검 서명 아래에 다른 글씨가 겹쳐 있다. 「나도 이 길로 돌아가고 싶었어.」'},
 plant_valve_west:{title:'기계실 · 서측 차단',text:'저장탱크 쪽 급수관을 잠갔다. 녹슨 손잡이 아래에서 검은 물이 흘렀다. 탱크 안쪽에서 세 번 두드리는 소리가 났다. 동측 급수관까지 잠가야 한다.'},
 plant_valve_east:{title:'기계실 · 동측 차단',text:'동측 급수관을 잠갔다. 배관 진동이 멎자 벽 너머의 손톱 소리가 들렸다. 전기실 계통도대로 전원을 연결해야 한다.'},
 plant_start:{title:'기계실 · 물이 내려간다',text:'배수 펌프와 환기 장치가 돌아간다. 수면 아래에 있던 주차장 방향 표지가 드러났다.\n\n펌프의 울림 사이로 젖은 손이 콘크리트를 치는 소리가 섞인다. 북쪽 방화문까지 우회할 길을 기억해 둬야 한다. 멈춰 있으면 금방 따라잡힌다.'},
 plant_drained:{title:'주차장으로 · 다시 차에 탄다',text:'차량 진입로의 물이 빠졌다. 보행자 출구는 공사 셔터 때문에 여전히 막혀 있다.\n\n내 차는 사고 다음 날부터 같은 자리에 세워 두었다. 열쇠를 조수석 가방에 넣었던 기억이 난다. 경보로 그것을 다른 쪽에 유인하면 운전석까지 갈 수 있다.\n\n밖으로 나가기만 하면 끝날 거라고, 또 그렇게 생각했다.'},
} as const;
export type ExpansionAction=keyof typeof expansionJournal|'archive_finish'|'service_board'|'service_arrive'|'annex_enter'|'annex_restore'|'annex_line_victim'|'annex_line_office'|'annex_exit'|'court_enter'|'court_digit_0'|'court_digit_1'|'court_digit_2'|'court_digit_3'|'court_exit'|'archive_enter'|'archive_sequence_road'|'archive_sequence_call'|'archive_sequence_gate'|'archive_exit'|'plant_enter'|'plant_circuit_pump'|'plant_circuit_air'|'plant_circuit_lights'|'plant_exit'|'parking_enter';
export const annexEvidence:Action[]=['annex_badge','annex_notice','annex_call'];
export const archiveEvidence:Action[]=['archive_road','archive_call','archive_gate'];
export const courtEvidence:Action[]=['court_log','court_phone','court_evidence'];
export const expansionStages=Object.keys(expansionObjectives) as ExpansionStage[];
export const isExpansion=(stage:Stage)=>stage.startsWith('annex_')||stage.startsWith('court_')||stage.startsWith('archive_')||stage.startsWith('plant_');
const steps:Partial<Record<Stage,[Action,Stage]>>={
 office_departure:['service_board','service_ride'],service_ride:['service_arrive','service_open'],service_open:['annex_enter','annex_arrival'],
 annex_arrival:['annex_map','annex_fuse'],annex_fuse:['annex_fuse','annex_restore'],annex_restore:['annex_restore','annex_search'],
 annex_unlock:['annex_line_home','annex_exit_ready'],annex_exit_ready:['annex_exit','annex_departure'],annex_departure:['court_enter','court_arrival'],
 court_arrival:['court_gate','court_search'],court_unlocked:['court_exit','court_departure'],court_departure:['archive_enter','archive_arrival'],
 archive_arrival:['archive_ledger','archive_search'],archive_reveal:['archive_play','archive_playback'],archive_playback:['archive_finish','archive_escape'],archive_escape:['archive_exit','archive_departure'],archive_departure:['plant_enter','plant_arrival'],
 plant_arrival:['plant_diagram','plant_isolate'],plant_drain:['plant_drained','plant_exit_ready'],plant_exit_ready:['plant_exit','plant_departure'],plant_departure:['parking_enter','parking_gate'],
};
function noted(s:Story,action:Action,stage:Stage=s.stage):Story{return {...s,stage,notes:[...new Set([...s.notes,action])]};}
export function expansionTransition(s:Story,action:Action):Story|undefined{
 const collection=s.stage==='annex_search'?annexEvidence:s.stage==='court_search'?courtEvidence:s.stage==='archive_search'?archiveEvidence:s.stage==='plant_isolate'?['plant_valve_west','plant_valve_east'] as Action[]:undefined;
 if(collection?.includes(action)){
  if(s.notes.includes(action))return s;const next=noted(s,action);
  if(collection.every(a=>next.notes.includes(a)))next.stage=s.stage==='annex_search'?'annex_unlock':s.stage==='court_search'?'court_code':s.stage==='archive_search'?'archive_edit':'plant_power';
  return next;
 }
 if(s.stage==='court_code'){
  if(action.startsWith('court_digit_')){const index=Number(action.at(-1)),digits=(s.code??'0000').split('');digits[index]=String((Number(digits[index])+1)%10);return {...s,code:digits.join('')};}
  if(action==='court_confirm'&&s.code==='2617')return noted(s,action,'court_unlocked');
 }
 if(s.stage==='archive_edit'&&action.startsWith('archive_sequence_')){
  const order=['archive_sequence_road','archive_sequence_call','archive_sequence_gate'];
  const circuit=action===order[s.circuit.length]?[...s.circuit,action]:[];
  return {...s,circuit,stage:circuit.length===3?'archive_reveal':s.stage};
 }
 if(s.stage==='plant_power'){
  if(action.startsWith('plant_circuit_'))return {...s,circuit:s.circuit.includes(action)?s.circuit.filter(a=>a!==action):[...s.circuit,action]};
  if(action==='plant_start'&&s.circuit.includes('plant_circuit_pump')&&s.circuit.includes('plant_circuit_air')&&!s.circuit.includes('plant_circuit_lights'))return noted(s,action,'plant_drain');
 }
 const step=steps[s.stage];if(step?.[0]!==action)return undefined;
 const next=action in expansionJournal?noted(s,action,step[1]):{...s,stage:step[1]};
 if(s.stage==='archive_departure'||s.stage==='annex_departure')next.circuit=[];
 return next;
}
export function expansionObjective(s:Story){
 if(s.stage==='court_search')return `중정 조사 ${courtEvidence.filter(a=>s.notes.includes(a)).length}/3 · 서측 경비일지 / 동측 비상전화 / 놀이터 사고 흔적`;
 if(s.stage==='court_code')return `경비초소 금고 ${s.code??'0000'} · 입차한 분 두 자리 + 야간 당직 내선 두 자리`;
 const ids=s.stage==='annex_search'?annexEvidence:s.stage==='archive_search'?archiveEvidence:undefined;
 if(ids){const missing=ids.filter(a=>!s.notes.includes(a));const places:Partial<Record<Action,string>>={annex_badge:'동측 경비 휴게실 · 사물함',annex_notice:'서측 우편실 · 반송함',annex_call:'동측 통신실 · 녹음기',archive_road:'서측 A실 · 도로 기록',archive_call:'동측 B실 · 통화 기록',archive_gate:'서측 C실 · 입차 기록'};return `기록 ${ids.length-missing.length}/${ids.length} · ${missing.map(a=>places[a]).join(' / ')}`;}
 if(s.stage==='archive_edit')return `${expansionObjectives.archive_edit} (${s.circuit.length}/3)`;
 if(s.stage==='plant_isolate')return `${expansionObjectives.plant_isolate} (${['plant_valve_west','plant_valve_east'].filter(a=>s.notes.includes(a)).length}/2)`;
 if(s.stage==='plant_power')return `배수 ${s.circuit.includes('plant_circuit_pump')?'ON':'OFF'} · 환기 ${s.circuit.includes('plant_circuit_air')?'ON':'OFF'} · 외부조명 ${s.circuit.includes('plant_circuit_lights')?'ON':'OFF'} / 배관 계통도와 대조하세요`;
 return expansionObjectives[s.stage as ExpansionStage];
}
export function expansionTargetActive(s:Story,id:Action){
 if(id.startsWith('court_digit_')||id==='court_confirm')return s.stage==='court_code';
 if(id==='court_exit')return s.stage==='court_unlocked';
 if(id.startsWith('annex_line_'))return s.stage==='annex_unlock';
 if(id.startsWith('archive_sequence_'))return s.stage==='archive_edit';
 if(id.startsWith('plant_circuit_')||id==='plant_start')return s.stage==='plant_power';
 if(id==='annex_exit')return s.stage==='annex_exit_ready';
 if(id==='archive_exit')return s.stage==='archive_escape';
 if(id==='plant_exit')return s.stage==='plant_exit_ready';
 return true;
}

export const archiveReplayDuration=32;
export const archiveReplay=[
 {at:0,screen:'03:17 / 정문 도로\n충돌 이후 브레이크등',text:'충돌 뒤에야 브레이크등이 켜진다.\n운전석의 나는 그 순간에도 휴대전화를 보고 있었다.'},
 {at:5,screen:'03:20 / 2803 수신 거절\n「잘못 거셨어요.」',text:'경비원의 호출. 「아직 현장에 사람이…」\n녹음 속 내 목소리가 대답한다. 「잘못 거셨어요.」'},
 {at:12,screen:'03:26 / 입차 후 9초\n문 좀 열어 주세요.',text:'주차한 차 안에서 여자의 목소리가 들렸다. 「문 좀 열어 주세요.」\n나는 그 소리를 듣고도 문을 잠갔다.'},
 {at:20,screen:'현재 03:17 / 편집실\n기록 작성 중',text:'재생이 끝났는데 모니터의 시간이 지금으로 바뀐다.\n아무것도 누르지 않았는데 새 기록이 써지고 있다.'},
 {at:27,screen:'현재 03:17 / 편집실\n네 뒤에 있어',text:'「네 뒤에 있어」\n문밖에서 손톱이 바닥을 긁는다. 여기를 나가야 한다.'},
] as const;
