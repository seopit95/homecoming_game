import type {Action,Story,Stage} from './story.ts';
import {annexCanCall} from './annex-call.ts';

export const expansionObjectives={
 office_departure:'열린 관리용 승강기에 걸어 들어가세요',
 service_ride:'관리용 승강기가 1층으로 내려가고 있다',service_open:'문이 열렸다. 1층 공동시설로 걸어 나가세요',
 annex_arrival:'1층 정문과 안내판에서 바깥으로 나갈 길을 확인하세요',
 annex_fuse:'서측 세탁실의 정비대에서 통신용 퓨즈를 찾으세요',
 annex_restore:'동측 통신실의 인터폰 전원함에 퓨즈를 연결하세요',
 annex_search:'중앙 교환기로 마지막 호출의 수신 세대에 다시 전화하세요 · 번호를 안다면 바로 호출할 수 있습니다',
 annex_unlock:'중앙 교환기로 마지막 호출의 수신 세대에 다시 전화하세요 · 단서가 필요하면 우편실과 통신실을 조사하세요',
 annex_exit_ready:'북쪽 방화문을 열고 외부 중정으로 나가세요',annex_departure:'열린 방화문을 지나 중정으로 나가세요',
 court_arrival:'입구 왼쪽 안내판에서 지하 우회 통로를 확인하세요',court_search:'경비일지와 비상전화 안내에서 금고 번호를 찾으세요 · 번호를 알면 바로 입력할 수 있습니다',court_code:'동측 경비초소 금고 · 기록에서 찾은 네 자리 번호를 맞추고 확인하세요',court_safe_open:'열린 금고 안에 걸린 지하문 열쇠를 챙기세요',court_unlocked:'금고에서 챙긴 열쇠로 북쪽 지하 기록보관실 문을 여세요',court_departure:'열린 계단을 따라 기록보관실로 내려가세요',
 archive_arrival:'기록보관실 입구의 인계 대장을 읽으세요',archive_search:'세 곳의 보관실에서 사고 당일 기록을 회수하세요',
 archive_edit:'북동쪽 편집실에서 원본을 재생하고 결정적인 순간에 증거 표시를 남기세요',
 archive_playback:'복원된 영상에서 지워진 아홉 초를 확인하세요',
 archive_reveal:'북동쪽 편집실 모니터에서 원본의 아홉 초를 재생하세요',
 archive_escape:'문밖에서 손톱 소리가 들린다. 북쪽 기계실 연결문으로 빠져나가세요',archive_departure:'열린 연결문을 지나 기계실로 이동하세요',
 plant_arrival:'침수된 통로 옆의 배관 계통도를 확인하세요',plant_isolate:'서측과 동측 급수 밸브를 모두 잠그세요',
 plant_power:'서측 펌프실의 흡입망과 토출 방향을 확인하고 전기실에서 배수를 시험하세요',
 plant_drain:'배수가 진행 중이다. 기계실을 돌며 접근하는 소리를 피하세요',
 plant_exit_ready:'물이 빠졌다. 북쪽 주차장 연결문을 여세요',plant_departure:'열린 문을 지나 주차장으로 나가세요',
} as const;
export type ExpansionStage=keyof typeof expansionObjectives;
export type ExpansionArea='annex'|'courtyard'|'archive'|'plant';
export const expansionJournal={
 court_gate:{title:'중정 입구 · 우회 통로 안내',text:'입구 안내판: 정문 폐쇄. 지하 기록보관실 → 배수 기계실 → 주차장 차량 출구. 북쪽 지하문 열쇠는 동측 경비초소의 금고에 있다.\n\n금고 비밀번호 지침: 사고 차량의 입차 분 두 자리, 야간 당직 내선 두 자리. 서측 경비일지와 동측 비상전화의 안내를 확인할 것.\n\n중정 너머 정문에는 셔터가 내려와 있다. 그 뒤로 차가 지날 때마다 같은 경적이 들린다.'},
 court_log:{title:'서측 초소 · 돌아온 차량',text:'입차 기록 03:26. 앞범퍼 파손. 운전자 2803호.\n\n당직 대체 근무자가 남긴 메모. 「차를 세우고 물어보려 했으나 운전자가 창문을 열지 않음. 검은 물이 차량 우측 문 아래로 흐름.」\n\n그날도, 오늘도 내 차가 이 건물 안으로 들어온다.'},
 court_phone:{title:'비상전화 · 돌아오는 대답',text:'비상통화 버튼을 눌렀다. 「여보세요. 누구 없어요?」\n\n연결음이 끊기자 스피커에서 내 목소리가 들렸다. 「잘못 거셨어요.」 나는 입을 다물고 있었는데, 같은 말이 세 번 반복됐다.\n\n단말의 안내와 통화 기록: 야간 당직 내선 17. 한서연. 내 목소리는 지금의 질문에 대답하고 있는 게 아니었다. 지하 통화 원본에 그때 누가 전화를 받았는지 남아 있을 것이다.'},
 court_evidence:{title:'놀이터 옆 · 주운 반사판',text:'놀이터 옆 점검대 위에 내 차의 깨진 전조등 조각이 있다. 빗물로 씻어도 홈 사이의 어두운 자국은 지워지지 않는다.\n\n곁에 떨어진 당직 수첩. 「아이들 등교 전에 정문 횡단보도 전등 점검. 우천 시 비상벨 확인.」\n\n그녀는 그날도 누군가 다치지 않도록 길을 확인하러 나갔다. 나는 휴대전화를 보느라 그 사람을 보지 않았다.'},
 court_confirm:{title:'경비초소 · 열린 금고',text:'번호를 맞추고 손잡이를 돌렸다. 무거운 철문이 열린다. 안쪽 고리에 지하문 열쇠가 걸려 있다.\n\n뒤판의 인계 쪽지. 「사고 신고 녹음 원본 보존. 차량 소유자 삭제 요청. 접수 거절.」'},
 court_key:{title:'경비초소 · 지하문 열쇠',text:'고리에서 지하 기록보관실 열쇠를 뺐다. 차가운 금속이 손가락에 닿았다.\n\n나는 다음 날에도 전화를 했다. 신고하려고 한 것이 아니었다. 그것까지 지우려고 했던 것이다. 쪽지에 적힌 차량 소유자가 나라는 것을 알고 있다.\n\n중정 건너편에서 몸을 끄는 소리가 난다. 북쪽 지하 계단으로 가야 한다.'},
 annex_map:{title:'1층 · 나갈 수 없는 로비',text:'동측 로비의 유리 정문 너머로 도로가 보인다. 문 뒤의 방범 셔터는 내려와 있다. 젖은 제어함에 「누전 · 작동 금지」라는 쪽지가 붙어 있다.\n\n안내도: 서측 세탁실·우편실 / 동측 경비 휴게실·통신실 / 중앙 경비실. 북쪽 방화문은 외부 중정으로 통한다. 정문 고장 시에는 중정의 지하 계단에서 기록보관실과 기계실을 거쳐 주차장으로 우회할 수 있다.\n\n북쪽 문은 손잡이를 당겨도 열리지 않는다. 문 안의 잠금쇠가 움직일 때마다 중앙 교환기에서 수신 표시가 깜박인다. 우선 세탁실 정비대의 퓨즈로 통신실 전원을 살려야 한다.'},
 annex_front_exit:{title:'1층 정문 · 길은 보이는데',text:'손잡이를 당겼지만 잠긴 유리문은 움직이지 않았다. 두 손잡이에 쇠사슬이 감겨 있다. 바깥 셔터의 격자 사이로 젖은 도로와 가로등이 보인다. 바로 저기까지 가면 되는데.\n\n제어함은 젖어 있고, 전원 표시등은 꺼져 있다. 「누전 · 작동 금지. 북측 중정으로 우회.」 안내문이 남아 있다.\n\n안내판에 적힌 지하 통로를 찾아야 한다. 이 문을 억지로 열다 발소리를 놓칠 수는 없다.'},
 annex_fuse:{title:'세탁실 · 마르지 않는 소매',text:'회전이 멈춘 세탁기 안에 흰 천이 뭉쳐 있다. 문에는 안쪽에서 긁은 자국이 있다.\n\n정비대에 놓인 예비 퓨즈를 챙겼다. 한서연이 붙인 점검표에는 「침수 시 외부조명 차단. 배수와 환기 전원은 유지」라고 쓰여 있다. 이 건물의 어두운 곳마다 그녀가 다녀간 흔적이 남아 있다.'},
 annex_badge:{title:'경비 휴게실 · 마지막 당직',text:'사물함 앞 책상에 한서연의 명찰과 당직표가 놓여 있다. 퇴근 시각은 03:10. 여백에 「오늘은 정문으로. 지하 통로 누수」.\n\n그녀가 그 시각 횡단보도를 건넌 이유가 있었다. 휴게실 사진에는 주민들의 화분을 옮기는 모습이 남아 있다. 나는 얼굴도 모르는 사람을 죽였다고 생각했다. 매일 보던 사람이었다.'},
 annex_notice:{title:'우편실 · 반송된 안내문',text:'2803호 앞유리 파손 차량 확인 요청. 입주민께서는 관리실로 연락 바랍니다.\n\n수령란에는 내 서명이 있다. 사흘 전 오후. 「주차 중 파손」이라고 내가 적었다. 기억이 없는 것이 아니었다. 기억할 때마다 다른 말로 덮어 놓았던 것이다.\n\n뒷면의 교환기 점검 기록: 마지막 발신은 정문 비상벨, 수신은 사고 차량 소유자의 세대.'},
 annex_call:{title:'통신실 · 발신측 보조 녹음',text:'03:20 / 정문 비상벨 → 수신 표시 훼손 / 통화 종료.\n\n경비원 쪽 마이크만 남은 보조 녹음이다. 「차량 번호가 확인됐습니다. 내려와 주세요. 아직 현장에…」\n\n잠깐의 침묵 뒤에 연결이 끊긴다. 수신자 쪽 소리는 이 장치에 저장되지 않는다. 세대에서 받지 않으면 등록된 휴대전화로 넘어가는 회선. 나는 차 안에서 그 전화를 받았다. 통화 목록의 수신란은 번져 있다. 우편실 반송 안내문의 차량 소유 세대를 대조하면 마지막 호출을 다시 걸 수 있다.'},
 annex_line_home:{title:'교환기 · 2803호',text:'내 세대 번호를 입력하고 전화를 걸었다. 수화기에서 들리던 신호음이 끊겼다. 아무도 없어야 할 우리 집에서 전화를 받았다.\n「나오렴…」\n\n응답이 끝나자 북쪽 문에서 잠금쇠가 풀리는 소리가 났다. 이 교환기에는 그 문을 여는 버튼이 없는데. 바닥의 젖은 자국은 중정으로 이어진다. 통신실에 없는 수신자 쪽 목소리는 지하 기록보관실의 통화 원본에 남아 있다.'},
 annex_line_victim:{title:'교환기 · 돌아올 수 없는 1704호',text:'1704호로 전화를 걸었다. 빈집에서 신호음이 끊기고, 말을 알아들을 수 없는 여자의 울음이 들렸다. 응답이 없었던 것이 아니다. 누군가 받았다.\n\n그날 경비원의 호출을 받은 곳은 그녀의 집이 아니었다. 통신실의 보조 녹음에는 발신자 쪽 말이, 우편실의 반송 안내문에는 호출을 받았던 차량 소유 세대가 남아 있다.'},
 annex_line_office:{title:'교환기 · 당직 내선 17의 녹음',text:'당직 내선은 17. 사람이 받는 대신 「03:20 / 비상벨 발신측 보조 녹음」이라는 표시와 함께 녹음이 재생됐다.\n「차량 번호가 확인됐습니다. 내려와 주세요. 아직 현장에…」\n\n녹음은 발신자 쪽 말뿐이다. 전화를 받았던 세대에서 내려오지 않았다. 나는 그 호출을 차 안에서 받았고, 세대의 부재중 전화를 휴대전화로 넘기도록 등록해 뒀다. 이 단말에서는 세대와 당직 내선만 호출할 수 있다. 그날 전화를 받은 내 집에 다시 걸어야 한다.'},
 archive_ledger:{title:'B1 · 보관 인계 대장',text:'서측 A실: 도로 카메라. 동측 B실: 양방향 비상 통화. 서측 C실: 지하 입차 원본. 실물 테이프를 북동쪽 편집실로 가져갈 것.\n\n편집 장치: A·B·C를 눌러 원본 선택. 정지/재생, ±1초 버튼으로 대조한 뒤 중요한 순간에 「증거 표시」. 검토 순서는 상관없다. 녹화를 멈춰도 보관실은 계속 움직인다.\n\n열람본의 누락 구간은 세 원본의 내용이 확인되어야 복원할 수 있다. 봉투 겉면에 내 이름으로 쓴 폐기 요청서가 붙어 있다.'},
 archive_road:{title:'A실 · 도로 원본 회수',text:'CAM-01 / 03:17 / 정문 횡단보도. 봉인된 원본 VHS를 챙겼다.\n\n인계표에는 「보행 신호와 차량 후면이 한 화면에 들어옴」이라고 적혀 있다. 편집실에서 제동등이 언제 켜지는지 확인해야 한다. 내가 기억하는 것처럼 갑자기 뛰어든 사람이었을까.'},
 archive_call:{title:'B실 · 양방향 통화 회수',text:'AUDIO-17 / 03:20 / 정문 비상벨 → 2803 등록 휴대전화. 양쪽 목소리를 보존한 원본 테이프다.\n\n통신실 장치에는 발신측만 남아 있었다. 이 테이프라면 그때 내가 무슨 말을 했는지, 누가 먼저 끊었는지 확인할 수 있다. 라벨의 수신자 이름을 손가락으로 가렸다.'},
 archive_gate:{title:'C실 · 입차 원본 회수',text:'CAM-04 / 03:26 / 지하 차량 출입구. 관리실 열람본에서 빠졌던 구간에 「영상·소리 동시 보존」 스티커가 붙어 있다.\n\n차를 세운 다음 아홉 초. 원본에는 차량 안에서 난 소리까지 남아 있다. 편집실에서 조수석을 잘 봐야 한다.'},
 archive_sequence_road:{title:'대조 A · 늦게 켜진 제동등',text:'03:17. 보행 신호는 녹색이다. 여자는 횡단보도를 건너고 있었다. 내 차의 제동등은 충돌 직전에야 켜진다.\n\n갑자기 뛰어들었다고 생각했다. 그런데 내가 화면을 보고도 그 말을 할 수는 없다. 휴대전화를 내려놓은 것은 너무 늦었다.'},
 archive_sequence_call:{title:'대조 B · 내가 끝낸 통화',text:'03:20. 현장으로 돌아와 달라는 경비원의 말을 들었다. 「잘못 거셨어요.」 수신자 쪽 말이 끝나고 내가 먼저 통화를 끊었다.\n\n그때 돌아갔더라면 달라졌을까. 이 기록만으로는 알 수 없다. 다만 돌아가 달라는 말을 못 들었다고 할 수는 없다.'},
 archive_sequence_gate:{title:'대조 C · 잠가 버린 문',text:'03:26. 차를 세웠다. 조수석 창문에 손이 닿고, 문을 열어 달라는 말 뒤로 잠금음이 난다. 운전석에서 내리는 사람은 없다.\n\n나는 그 소리를 들었다. 아홉 초를 지워 달라고 했던 이유도 이제 안다. 사고 뒤에도 내가 선택한 일이 있었다.'},
 archive_play:{title:'복원된 기록 · 누락 구간',text:'세 원본에 증거 표시를 남겼다. 보행 신호, 내가 끝낸 통화, 잠겨 있던 문.\n\n입차 뒤 지워졌던 아홉 초를 다시 연결했다. 창문을 두드리는 소리와 내가 누른 잠금음이 끊김 없이 재생된다. 모니터에 익숙한 방이 비치기 시작한다. 편집실이다. 방금까지는 사흘 전 영상이었는데.'},
 plant_diagram:{title:'B1 · 배수 계통도',text:'주차장 경사로 아래까지 물이 차 있다. 유입을 막지 않으면 배수를 해도 수위가 다시 오른다. 서측 저장탱크와 동측 급수관의 차단 위치가 표시돼 있다.\n\n서측 펌프실: 집수정 → 흡입망 → 펌프 → 토출 선택기. 평소에는 물을 집수정으로 되돌린다. 외부 우수관은 서쪽 벽을 통해 나간다.\n\n동측 전기실: 모터와 환기 연동. 현장 압력과 흡입망을 확인한 뒤 기동할 것. 한서연의 점검란에 「천 조각 유입 반복. 원인 미확인」이라고 적혀 있다.'},
 plant_valve_west:{title:'기계실 · 서측 차단',text:'저장탱크 쪽 급수관을 잠갔다. 녹슨 손잡이 아래에서 검은 물이 흘렀다. 탱크 안쪽에서 세 번 두드리는 소리가 났다. 동측 급수관까지 잠가야 한다.'},
 plant_valve_east:{title:'기계실 · 동측 차단',text:'동측 급수관을 잠갔다. 배관 진동이 멎자 벽 너머의 손톱 소리가 들렸다. 서측 펌프실의 흡입망과 토출 선택기를 확인해야 한다.'},
 plant_filter:{title:'펌프실 · 흡입망에 걸린 천',text:'흡입망을 덮은 젖은 천을 걷어냈다. 검은 머리카락이 철망 사이까지 감겨 있었다. 천 끝에는 야간 당직 명찰의 끊어진 고리가 붙어 있다.\n\n물이 빨려 들어가는 틈이 드러났다. 토출 배관을 따라가니 한쪽은 집수정으로 돌아오고, 다른 쪽은 서쪽 벽의 외부 우수관으로 이어진다. 나는 이 사람의 흔적을 또 치우고 있다.'},
 plant_start:{title:'기계실 · 물이 내려간다',text:'배수 펌프와 환기 장치가 돌아간다. 수면 아래에 있던 주차장 방향 표지가 드러났다.\n\n펌프의 울림 사이로 젖은 손이 콘크리트를 치는 소리가 섞인다. 북쪽 방화문까지 우회할 길을 기억해 둬야 한다. 멈춰 있으면 금방 따라잡힌다.'},
 plant_drained:{title:'주차장으로 · 다시 차에 탄다',text:'차량 진입로의 물이 빠졌다. 보행자 출구는 공사 셔터 때문에 여전히 막혀 있다.\n\n내 차는 사고 다음 날부터 같은 자리에 세워 두었다. 열쇠를 조수석 가방에 넣었던 기억이 난다. 경보로 그것을 다른 쪽에 유인하면 운전석까지 갈 수 있다.\n\n밖으로 나가기만 하면 끝날 거라고, 또 그렇게 생각했다.'},
} as const;
export type ExpansionAction=keyof typeof expansionJournal|'archive_preview_road'|'archive_preview_call'|'archive_preview_gate'|'archive_record_pause'|'archive_record_back'|'archive_record_forward'|'archive_record_mark'|'archive_finish'|'service_board'|'service_arrive'|'annex_enter'|'annex_restore'|'annex_line_victim'|'annex_line_office'|`annex_digit_${0|1|2|3|4|5|6|7|8|9}`|'annex_clear'|'annex_dial'|'annex_exit'|'court_enter'|'court_hangup'|'court_digit_0'|'court_digit_1'|'court_digit_2'|'court_digit_3'|'court_exit'|'archive_enter'|'archive_sequence_road'|'archive_sequence_call'|'archive_sequence_gate'|'archive_exit'|'plant_enter'|'plant_circuit_pump'|'plant_circuit_air'|'plant_circuit_lights'|'plant_route'|'plant_route_closed'|'plant_route_drain'|'plant_exit'|'parking_enter';
export const annexEvidence:Action[]=['annex_badge','annex_notice','annex_call'];
export const archiveEvidence:Action[]=['archive_road','archive_call','archive_gate'];
export const courtCallTimes=[2.8,5.4,8] as const;
export const courtCallDuration=10.6;
export const courtEvidence:Action[]=['court_log','court_phone'];
export const expansionStages=Object.keys(expansionObjectives) as ExpansionStage[];
export const isExpansion=(stage:Stage)=>stage.startsWith('annex_')||stage.startsWith('court_')||stage.startsWith('archive_')||stage.startsWith('plant_');
const steps:Partial<Record<Stage,[Action,Stage]>>={
 office_departure:['service_board','service_ride'],service_ride:['service_arrive','service_open'],service_open:['annex_enter','annex_arrival'],
 annex_arrival:['annex_map','annex_fuse'],annex_fuse:['annex_fuse','annex_restore'],annex_restore:['annex_restore','annex_unlock'],
 annex_unlock:['annex_line_home','annex_exit_ready'],annex_exit_ready:['annex_exit','annex_departure'],annex_departure:['court_enter','court_arrival'],
 court_arrival:['court_gate','court_search'],court_safe_open:['court_key','court_unlocked'],court_unlocked:['court_exit','court_departure'],court_departure:['archive_enter','archive_arrival'],
 archive_arrival:['archive_ledger','archive_search'],archive_reveal:['archive_play','archive_playback'],archive_playback:['archive_finish','archive_escape'],archive_escape:['archive_exit','archive_departure'],archive_departure:['plant_enter','plant_arrival'],
 plant_arrival:['plant_diagram','plant_isolate'],plant_drain:['plant_drained','plant_exit_ready'],plant_exit_ready:['plant_exit','plant_departure'],plant_departure:['parking_enter','parking_gate'],
};
type PlantState=Pick<Story,'stage'|'notes'|'circuit'>;
const draining=(s:PlantState)=>['plant_drain','plant_exit_ready','plant_departure'].includes(s.stage);
export function plantRoute(s:PlantState){return draining(s)||s.circuit.includes('plant_route_drain')?'drain':s.circuit.includes('plant_route_closed')?'closed':'return';}
export function plantFilterCleared(s:PlantState){return draining(s)||s.notes.includes('plant_filter');}
export function plantProblem(s:PlantState){
 if(!['plant_valve_west','plant_valve_east'].every(a=>s.notes.includes(a as Action)))return 'isolation';
 if(s.circuit.includes('plant_circuit_pump')&&s.circuit.includes('plant_circuit_lights'))return 'electrical';
 if(!s.circuit.includes('plant_circuit_pump'))return 'pump';
 if(!s.circuit.includes('plant_circuit_air'))return 'air';
 if(!plantFilterCleared(s))return 'filter';
 if(plantRoute(s)!=='drain')return 'route';
 return null;
}
function noted(s:Story,action:Action,stage:Stage=s.stage):Story{return {...s,stage,notes:[...new Set([...s.notes,action])]};}
export function expansionTransition(s:Story,action:Action):Story|undefined{
 if(s.stage.startsWith('annex_')&&action==='annex_front_exit')return s.notes.includes(action)?s:noted(s,action);
 if(s.stage.startsWith('annex_')&&annexEvidence.includes(action)){
  if(s.notes.includes(action))return s;const next=noted(s,action);
  return next;
 }
 if(annexCanCall(s.stage)&&['annex_line_victim','annex_line_office'].includes(action))return s.notes.includes(action)?s:noted(s,action);
 if(s.stage==='annex_search'&&action==='annex_line_home')return noted(s,action,'annex_exit_ready');
 if(s.stage==='annex_arrival'&&action==='annex_fuse')return s.notes.includes(action)?s:noted(s,action);
 if(['court_search','court_code','court_safe_open','court_unlocked','court_departure'].includes(s.stage)&&(courtEvidence.includes(action)||action==='court_evidence')){
  if(s.notes.includes(action))return s;const next=noted(s,action);
  if(s.stage==='court_search'&&courtEvidence.every(a=>next.notes.includes(a)))next.stage='court_code';
  return next;
 }
 const collection=s.stage==='archive_search'?archiveEvidence:s.stage==='plant_isolate'?['plant_valve_west','plant_valve_east'] as Action[]:undefined;
 if(collection?.includes(action)){
  if(s.notes.includes(action))return s;const next=noted(s,action);
  if(collection.every(a=>next.notes.includes(a)))next.stage=s.stage==='archive_search'?'archive_edit':'plant_power';
  return next;
 }
 if(s.stage==='court_search'||s.stage==='court_code'){
  if(action.startsWith('court_digit_')){const index=Number(action.at(-1)),digits=(s.code??'0000').split('');digits[index]=String((Number(digits[index])+1)%10);return {...s,stage:'court_code',code:digits.join('')};}
  if(action==='court_confirm'&&s.code==='2617')return noted(s,action,'court_safe_open');
 }
 if(s.stage==='archive_edit'&&action.startsWith('archive_sequence_')){
  const order=['archive_sequence_road','archive_sequence_call','archive_sequence_gate'];if(!order.includes(action)||s.circuit.includes(action))return s;
  const circuit=[...s.circuit,action];
  return noted({...s,circuit},action,circuit.length===3?'archive_reveal':s.stage);
 }
 if(s.stage==='plant_power'){
  if(action==='plant_filter')return s.notes.includes(action)?s:noted(s,action);
  if(action==='plant_route'){
   const circuit:Action[]=s.circuit.filter(a=>a!=='plant_route_closed'&&a!=='plant_route_drain');const route=plantRoute(s);
   if(route!=='drain')circuit.push(route==='return'?'plant_route_closed':'plant_route_drain');
   return {...s,circuit};
  }
  if(action.startsWith('plant_circuit_'))return {...s,circuit:s.circuit.includes(action)?s.circuit.filter(a=>a!==action):[...s.circuit,action]};
  if(action==='plant_start'){
   if(plantProblem(s)==='electrical')return {...s,circuit:s.circuit.filter(a=>a!=='plant_circuit_pump'&&a!=='plant_circuit_lights')};
   if(!plantProblem(s))return noted(s,action,'plant_drain');
  }
 }
 const step=steps[s.stage];if(step?.[0]!==action)return undefined;
 const next=action in expansionJournal?noted(s,action,step[1]):{...s,stage:step[1]};
 if(s.stage==='annex_arrival'&&s.notes.includes('annex_fuse'))next.stage='annex_restore';
 if(s.stage==='archive_departure'||s.stage==='annex_departure')next.circuit=[];
 return next;
}
export function expansionObjective(s:Story){
 if(s.stage==='court_search')return `금고 단서 ${courtEvidence.filter(a=>s.notes.includes(a)).length}/2 · 서측 경비일지 / 동측 비상전화 · 번호를 알면 금고에 입력하세요`;
 if(s.stage==='court_code')return `경비초소 금고 ${s.code??'0000'} · 입차한 분 두 자리 + 야간 당직 내선 두 자리`;
 const ids=s.stage==='archive_search'?archiveEvidence:undefined;
 if(ids){const missing=ids.filter(a=>!s.notes.includes(a));const places:Partial<Record<Action,string>>={annex_badge:'동측 경비 휴게실 · 당직 책상',annex_notice:'서측 우편실 · 반송 접수대',annex_call:'동측 통신실 · 녹음기',archive_road:'서측 A실 · 도로 기록',archive_call:'동측 B실 · 통화 기록',archive_gate:'서측 C실 · 입차 기록'};return `기록 ${ids.length-missing.length}/${ids.length} · ${missing.map(a=>places[a]).join(' / ')}`;}
 if(s.stage==='archive_edit')return `${expansionObjectives.archive_edit} (${s.circuit.length}/3)`;
 if(s.stage==='plant_isolate')return `${expansionObjectives.plant_isolate} (${['plant_valve_west','plant_valve_east'].filter(a=>s.notes.includes(a)).length}/2)`;
 if(s.stage==='plant_power')return `흡입망 ${plantFilterCleared(s)?'확인':'막힘'} · 토출 ${plantRoute(s)==='drain'?'외부배수':plantRoute(s)==='closed'?'차단':'집수정 환수'} · 서측 설비 확인 후 동측 전기실에서 기동하세요`;
 return expansionObjectives[s.stage as ExpansionStage];
}
export function expansionTargetActive(s:Story,id:Action){
 if(id==='annex_front_exit')return s.stage.startsWith('annex_');
 if(['annex_fuse','annex_badge',...archiveEvidence].includes(id)&&s.notes.includes(id))return false;
 if(id==='annex_restore')return s.stage==='annex_restore';
 if(id==='archive_play')return s.stage==='archive_reveal';
 if(id.startsWith('archive_preview_')||id.startsWith('archive_record_'))return s.stage==='archive_edit';
 if(id.startsWith('court_digit_')||id==='court_confirm')return s.stage==='court_search'||s.stage==='court_code';
 if(id==='court_key')return s.stage==='court_safe_open';
 if(id==='court_exit')return s.stage==='court_unlocked';
 if(id==='court_hangup')return ['court_search','court_code','court_safe_open','court_unlocked','court_departure'].includes(s.stage);
 if(id.startsWith('annex_line_'))return false;
 if(id.startsWith('annex_digit_')||id==='annex_clear'||id==='annex_dial')return annexCanCall(s.stage);
 if(id.startsWith('archive_sequence_'))return s.stage==='archive_edit';
 if(id==='plant_filter')return s.stage==='plant_power'&&!plantFilterCleared(s);
 if(id==='plant_route'||id.startsWith('plant_circuit_')||id==='plant_start')return s.stage==='plant_power';
 if(id==='annex_exit')return s.stage==='annex_exit_ready';
 if(id==='archive_exit')return s.stage==='archive_escape';
 if(id==='plant_exit')return s.stage==='plant_exit_ready';
 return true;
}

export const archiveReplayDuration=19;
export const archiveReplay=[
 {at:0,screen:'03:26 / 누락된 9초\n동시 녹음 복원',text:'차를 세운 뒤에도 나는 운전석에 남아 있었다.\n조수석 창문에 손이 닿는다.'},
 {at:5.8,screen:'03:26 / 잠금음\n운전석 미하차',text:'딸깍. 내가 문을 잠갔다.\n그 목소리를 들었는데도.'},
 {at:9,screen:'현재 03:17 / 편집실\n기록 작성 중',text:'영상이 끝났는데 화면이 꺼지지 않는다.\n저 책상… 내가 지금 서 있는 방이다.'},
 {at:15,screen:'현재 03:17 / 편집실\n네 뒤에 있어',text:'「네 뒤에 있어」\n창 너머에서 손톱이 바닥을 긁는다. 연결문으로 가야 한다.'},
] as const;

// A continued investigation restarts the same entry approach as a carried pursuit.
export function courtyardPursuitActive(s:Story,carried:boolean){
 return carried||s.notes.some(id=>['court_gate','court_log','court_evidence','court_phone','court_confirm'].includes(id));
}

export const annexTapeDuration=7.706122;
export const annexCallbackDuration=4.5;
