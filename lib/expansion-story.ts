import type {Action,Story,Stage} from './story.ts';
import {annexCanCall} from './annex-call.ts';
import {archiveReviewing} from './archive-review.ts';

export const expansionObjectives={
 office_departure:'승강기 문이 열렸다. 바닥에서 진동이 올라온다.',
 service_ride:'관리용 승강기가 1층으로 내려가고 있다',service_open:'1층. 문 너머 공기가 차갑다.',
 annex_arrival:'정문까지 왔다. 밖은 보이는데 셔터는 내려가 있다.',
 annex_fuse:'교환기는 켜져 있다. 우편실에 마지막 호출의 수신자가 남아 있다.',
 annex_restore:'교환기는 켜져 있다. 마지막 호출을 받은 세대로 다시 걸어야 한다.',
 annex_search:'마지막 호출. 그녀는 누구에게 돌아간다고 말했을까.',
 annex_unlock:'우편물과 통화 기록. 같은 수신자가 남아 있을 것이다.',
 annex_exit_ready:'잠금이 풀리는 소리. 정문 너머에서 무언가 달려온다.',annex_departure:'밖이다. 문턱에서 멈출 수 없다.',
 court_arrival:'정문은 막혔다. 오래된 우회 통로 표지가 남아 있다.',court_search:'서측 인계판. 지하문 열쇠를 넘긴 흔적이 남아 있다.',court_code:'인계판에서 챙긴 작은 열쇠. 동측 초소의 보관함에 맞을 것이다.',court_safe_open:'금고가 열렸다. 안쪽 고리에서 금속이 흔들린다.',court_unlocked:'기록보관실 열쇠. 아래에는 내가 지우려 했던 것이 남아 있다.',court_departure:'계단 아래에서 냉기가 올라온다. 등 뒤가 가까워졌다.',
 archive_arrival:'인계 대장. 사흘 전의 원본은 아직 이곳에 있다.',archive_search:'영상과 통화와 입차 기록. 내가 기억하는 밤과 맞지 않는다.',
 archive_edit:'편집된 자리에는 흔적이 남는다. 실제 영상과 소리를 믿어야 한다.',
 archive_playback:'복원된 아홉 초를 확인하세요 · 재생 중에도 주변을 살피며 움직일 수 있습니다',
 archive_reveal:'아홉 초가 돌아왔다. 이번에는 끝까지 봐야 한다.',
 archive_escape:'문밖의 손톱 소리. 아홉 초를 되찾자 더 가까워졌다.',archive_departure:'연결문 너머에서 펌프 소리가 들린다.',
 plant_arrival:'물이 출구까지 찼다. 벽의 배관도에 수선 자국이 남아 있다.',plant_isolate:'유입이 멎지 않는다. 배관은 양쪽에서 들어온다.',
 plant_power:'전력은 한정돼 있다. 펌프와 배관이 어디로 이어지는지 살펴야 한다.',
 plant_drain:'수위가 내려간다. 펌프 소리 사이로 비명이 섞인다.',
 plant_exit_ready:'물이 빠졌다. 주차장 쪽 문 아래로 바람이 들어온다.',plant_departure:'문이 열렸다. 젖은 손바닥 소리가 더 빨라진다.',
} as const;
export type ExpansionStage=keyof typeof expansionObjectives;
export type ExpansionArea='annex'|'courtyard'|'archive'|'plant';
export const expansionJournal={
 court_gate:{title:'중정 입구 · 우회 통로',text:'정문 셔터는 내려와 있다. 안내판의 우회로는 지하 기록보관실 → 배수 기계실 → 주차장이다. 북쪽 계단 문은 잠겨 있다.\n\n「지하문 열쇠: 동측 초소 보관함. 인계서와 보관함 열쇠: 서측 초소 인계판.」 중앙 공사 울타리를 돌아 양쪽 초소로 갈 수 있다.'},
 court_log:{title:'서측 초소 · 넘겨받지 않은 기록',text:'인계판 뒤 봉투에 작은 보관함 열쇠가 붙어 있다. 함께 챙겼다. 「지하문 열쇠와 보존 통지서는 동측 초소 철제 보관함에 인계.」\n\n03:26 / 2803호 파손 차량 입차.\n사고 다음 날 / 차량 소유자 방문. 영상 일부 삭제 요청. 접수 거절.\n\n나는 그 다음 날에도 이곳에 왔다. 신고하러 온 것이 아니었다. 동측 보관함에 남은 요청서를 확인해야 한다.'},
 court_phone:{title:'비상전화 · 돌아오는 대답',text:'비상통화 버튼을 눌렀다. 「여보세요. 누구 없어요?」\n\n연결음이 끊기자 스피커에서 내 목소리가 들렸다. 「잘못 거셨어요.」 나는 입을 다물고 있었는데, 같은 말이 세 번 반복됐다.\n\n단말의 안내와 통화 기록: 야간 당직 내선 17. 한서연. 내 목소리는 지금의 질문에 대답하고 있는 게 아니었다. 지하 통화 원본에 그때 누가 전화를 받았는지 남아 있을 것이다.'},
 court_evidence:{title:'놀이터 옆 · 주운 반사판',text:'놀이터 옆 점검대 위에 내 차의 깨진 전조등 조각이 있다. 빗물로 씻어도 홈 사이의 어두운 자국은 지워지지 않는다.\n\n곁에 떨어진 당직 수첩. 「아이들 등교 전에 정문 횡단보도 전등 점검. 우천 시 비상벨 확인.」\n\n그녀는 그날도 누군가 다치지 않도록 길을 확인하러 나갔다. 나는 휴대전화를 보느라 그 사람을 보지 않았다.'},
 court_confirm:{title:'동측 초소 · 보존된 요청서',text:'인계판에서 챙긴 열쇠를 꽂고 손잡이를 돌렸다. 안쪽 고리에 지하문 열쇠가 걸려 있다.\n\n뒤판에 붙은 종이. 「입차 직후 9초 지워 주세요.」 2803호 차량 소유자의 서명. 아래에는 「삭제 접수 거절 · 원본 보존」이라는 도장이 찍혀 있다.\n\n내가 쓴 문장이다. 무엇이 찍혔는지 모른 채 삭제해 달라고 한 것이 아니었다.'},
 court_key:{title:'동측 초소 · 지하문 열쇠',text:'보관함 고리에서 기록보관실 열쇠를 뺐다. 내 삭제 요청서도 그대로 남아 있다.\n\n나를 기다리던 것은 암호가 아니었다. 내가 남긴 서명이었다. 북쪽 지하 계단 아래에 지우지 못한 원본이 있다.'},
 annex_map:{title:'1층 · 켜져 있는 교환기',text:'동측 정문 너머로 도로가 보인다. 셔터 제어함에는 「누전 · 작동 금지. 북측 중정으로 우회」라는 쪽지가 붙어 있다. 중정의 지하 계단에서 기록보관실과 기계실을 거쳐 주차장으로 나갈 수 있다.\n\n중앙 교환기는 축전지로 켜져 있다. 북쪽 방화문의 수신등만 깜박인다. 책상 안내에는 「세대 4자리 / 당직 내선 17」. 우편실 반송 안내문과 동측 통신실의 녹음에 마지막 호출을 받은 세대가 남아 있다.'},
 annex_front_exit:{title:'1층 정문 · 길은 보이는데',text:'손잡이를 당겼지만 잠긴 유리문은 움직이지 않았다. 두 손잡이에 쇠사슬이 감겨 있다. 바깥 셔터의 격자 사이로 젖은 도로와 가로등이 보인다. 바로 저기까지 가면 되는데.\n\n제어함은 젖어 있고, 전원 표시등은 꺼져 있다. 「누전 · 작동 금지. 북측 중정으로 우회.」 안내문이 남아 있다.\n\n안내판에 적힌 지하 통로를 찾아야 한다. 이 문을 억지로 열다 발소리를 놓칠 수는 없다.'},
 annex_fuse:{title:'세탁실 · 남아 있는 점검표',text:'세탁실 정비표. 한서연의 글씨로 「침수 시 외부조명 차단. 비상통신은 축전지 공급 유지」라고 적혀 있다.\n\n이 건물의 어두운 곳마다 그녀가 다녀간 흔적이 남아 있다. 중앙 교환기는 지금도 켜져 있다.'},
 annex_badge:{title:'경비 휴게실 · 마지막 당직',text:'사물함 앞 책상에 한서연의 명찰과 당직표가 놓여 있다. 퇴근 시각은 03:10. 여백에 「오늘은 정문으로. 지하 통로 누수」.\n\n그녀가 그 시각 횡단보도를 건넌 이유가 있었다. 휴게실 사진에는 주민들의 화분을 옮기는 모습이 남아 있다. 나는 얼굴도 모르는 사람을 죽였다고 생각했다. 매일 보던 사람이었다.'},
 annex_notice:{title:'우편실 · 반송된 안내문',text:'2803호 앞유리 파손 차량 확인 요청. 입주민께서는 관리실로 연락 바랍니다.\n\n수령란에는 내 서명이 있다. 사흘 전 오후. 「주차 중 파손」이라고 내가 적었다. 기억이 없는 것이 아니었다. 기억할 때마다 다른 말로 덮어 놓았던 것이다.\n\n뒷면의 교환기 점검 기록: 마지막 발신은 정문 비상벨, 수신은 사고 차량 소유자의 세대.'},
 annex_call:{title:'통신실 · 발신측 보조 녹음',text:'03:20 / 정문 비상벨 → 수신 표시 훼손 / 통화 종료.\n\n경비원 쪽 마이크만 남은 보조 녹음이다. 「차량 번호가 확인됐습니다. 내려와 주세요. 아직 현장에…」\n\n잠깐의 침묵 뒤에 연결이 끊긴다. 수신자 쪽 소리는 이 장치에 저장되지 않는다. 세대에서 받지 않으면 등록된 휴대전화로 넘어가는 회선. 나는 차 안에서 그 전화를 받았다. 통화 목록의 수신란은 번져 있다. 우편실 반송 안내문의 차량 소유 세대를 대조하면 마지막 호출을 다시 걸 수 있다.'},
 annex_line_home:{title:'교환기 · 2803호',text:'내 세대 번호를 입력하고 전화를 걸었다. 수화기에서 들리던 신호음이 끊겼다. 아무도 없어야 할 우리 집에서 전화를 받았다.\n「나오렴…」\n\n응답이 끝나자 북쪽 문에서 잠금쇠가 풀리는 소리가 났다. 이 교환기에는 그 문을 여는 버튼이 없는데. 바닥의 젖은 자국은 중정으로 이어진다. 통신실에 없는 수신자 쪽 목소리는 지하 기록보관실의 통화 원본에 남아 있다.'},
 annex_line_victim:{title:'교환기 · 돌아올 수 없는 1704호',text:'1704호로 전화를 걸었다. 빈집에서 신호음이 끊기고, 말을 알아들을 수 없는 여자의 울음이 들렸다. 응답이 없었던 것이 아니다. 누군가 받았다.\n\n그날 경비원의 호출을 받은 곳은 그녀의 집이 아니었다. 통신실의 보조 녹음에는 발신자 쪽 말이, 우편실의 반송 안내문에는 호출을 받았던 차량 소유 세대가 남아 있다.'},
 annex_line_office:{title:'교환기 · 당직 내선 17의 녹음',text:'당직 내선은 17. 사람이 받는 대신 「03:20 / 비상벨 발신측 보조 녹음」이라는 표시와 함께 녹음이 재생됐다.\n「차량 번호가 확인됐습니다. 내려와 주세요. 아직 현장에…」\n\n녹음은 발신자 쪽 말뿐이다. 전화를 받았던 세대에서 내려오지 않았다. 나는 그 호출을 차 안에서 받았고, 세대의 부재중 전화를 휴대전화로 넘기도록 등록해 뒀다. 이 단말에서는 세대와 당직 내선만 호출할 수 있다. 그날 전화를 받은 내 집에 다시 걸어야 한다.'},
 archive_ledger:{title:'B1 · 보관 인계 대장',text:'서측 A실: 도로 카메라. 동측 B실: 양방향 비상 통화. 서측 C실: 지하 입차 원본. 찾은 실물 테이프부터 북동쪽 편집실에서 검토할 수 있다. 회수와 검토 순서는 상관없다.\n\n편집 장치: 1·2·3으로 원본 선택. 정지/재생과 ±1초로 대조한 뒤 「증거 표시」. 장면을 놓쳤어도 원본이 끝난 뒤 표시할 수 있다. 화면에 제시된 두 진술 중 영상·소리로 확인한 사실을 4·5번 대조 키로 기록한다. 원본만 멈추며 보관실의 시간은 계속 흐른다. 편집실 문을 닫으면 잠깐 거리를 벌릴 수 있다. 잠금장치는 없고, 따라온 것은 문을 밀고 들어온다. 창 너머 발소리를 살피며 재생을 중단하거나 빠져나갈 길을 남겨 둘 것.\n\n세 기록을 확인하면 관리실 열람본에서 지워졌던 아홉 초를 이어 볼 수 있다. 봉투 겉면에 내 이름으로 쓴 폐기 요청서가 붙어 있다.'},
 archive_road:{title:'A실 · 도로 원본 회수',text:'CAM-01 / 03:17 / 정문 횡단보도. 봉인된 원본 VHS를 챙겼다.\n\n인계표에는 「보행 신호와 차량 후면이 한 화면에 들어옴」이라고 적혀 있다. 편집실에서 제동등이 언제 켜지는지 확인해야 한다. 내가 기억하는 것처럼 갑자기 뛰어든 사람이었을까.'},
 archive_call:{title:'B실 · 양방향 통화 회수',text:'AUDIO-17 / 03:20 / 정문 비상벨 → 2803 등록 휴대전화. 양쪽 목소리를 보존한 원본 테이프다.\n\n통신실 장치에는 발신측만 남아 있었다. 이 테이프라면 그때 내가 무슨 말을 했는지, 누가 먼저 끊었는지 확인할 수 있다. 라벨의 수신자 이름을 손가락으로 가렸다.'},
 archive_gate:{title:'C실 · 입차 원본 회수',text:'CAM-04 / 03:26 / 지하 차량 출입구. 봉투에는 「누락 구간 9초 · 영상·소리 동시 보존」이라고 적혀 있다.\n\n아직 재생하지 않았다. 차를 세운 다음 무슨 일이 있었는지는 이 라벨만으로 알 수 없다. 편집실에서 조수석 창문과 동시 녹음을 대조해야 한다.'},
 archive_sequence_road:{title:'대조 A · 늦게 켜진 제동등',text:'03:17. 녹색 보행 신호에 여자가 횡단보도를 건넌다. 내 차의 제동등은 충돌 직전에야 켜진다.\n\n갑자기 뛰어든 것이 아니었다. 내가 멈추지 않았다. 이 영상은 충돌을 보여 준다. 그 자리에서 즉사했다는 내 생각까지 증명해 주지는 않는다.'},
 archive_sequence_call:{title:'대조 B · 내가 끝낸 통화',text:'03:20. 「현장에 사람이 아직 있어요. 돌아와 주세요.」 경비원의 말 뒤에 내 목소리가 이어진다. 「잘못 거셨어요.」 수신자 쪽 종료 표시가 켜진다.\n\n차량 번호를 잘못 안 것이 아니었다. 내가 모르는 척하고 먼저 끊었다. 이 통화만으로 그때 그녀의 상태를 단정할 수는 없다.'},
 archive_sequence_gate:{title:'대조 C · 아직 살아 있던 목소리',text:'03:26. 차는 지하 출입구에 멈춰 있다. 조수석 창밖에 여자가 몸을 낮추고 있다. 「문 좀 열어 주세요.」 잠금음이 나고, 운전석 문은 열리지 않는다.\n\n도로 영상 속 당직복과 젖은 머리. 나는 사고 때 즉사했다고 생각했다. 그런데 충돌 아홉 분 뒤에도 한서연은 도움을 청하고 있었다. 나는 들었고, 문을 잠갔다.\n\n지워 달라고 했던 것은 충돌 장면이 아니었다. 내가 두 번째로 그 사람을 버린 아홉 초였다.'},
 archive_play:{title:'복원된 기록 · 세 번의 외면',text:'녹색 신호에 진입한 차. 돌아와 달라는 전화를 끊은 목소리. 살아 있는 사람을 밖에 두고 잠근 문. 세 원본이 같은 밤으로 이어진다.\n\n「입차 직후 9초 지워 주세요.」 내 요청서에 없애고 싶었던 이유까지 적혀 있는 것 같다.\n\n복원된 구간 뒤에 지금의 편집실이 비친다. 여기서도 나는 화면만 보고 있었다. 창 너머에서 젖은 손이 바닥을 짚는다.'},
 plant_diagram:{title:'B1 · 배수 계통도',text:'주차장 경사로 아래까지 물이 차 있다. 유입을 막지 않으면 배수를 해도 수위가 다시 오른다. 서측 저장탱크와 동측 급수관의 차단 위치가 표시돼 있다.\n\n서측 펌프실: 집수정 → 흡입망 → 펌프 → 토출 선택기. 평소에는 물을 집수정으로 되돌린다. 외부 우수관은 서쪽 벽을 통해 나간다.\n\n동측 전기실: 모터와 환기 연동. 현장 압력과 흡입망을 확인한 뒤 기동할 것. 한서연의 점검란에 「천 조각 유입 반복. 원인 미확인」이라고 적혀 있다.'},
 plant_valve_west:{title:'기계실 · 서측 차단',text:'저장탱크 쪽 급수관을 잠갔다. 녹슨 손잡이 아래에서 검은 물이 흘렀다. 탱크 안쪽에서 세 번 두드리는 소리가 났다. 동측 급수관까지 잠가야 한다.'},
 plant_valve_east:{title:'기계실 · 동측 차단',text:'동측 급수관을 잠갔다. 배관 진동이 멎자 벽 너머의 손톱 소리가 들렸다. 서측 펌프실의 흡입망과 토출 선택기를 확인해야 한다.'},
 plant_filter:{title:'펌프실 · 흡입망에 걸린 천',text:'흡입망을 덮은 젖은 천을 걷어냈다. 검은 머리카락이 철망 사이까지 감겨 있었다. 천 끝에는 야간 당직 명찰의 끊어진 고리가 붙어 있다.\n\n물이 빨려 들어가는 틈이 드러났다. 토출 배관을 따라가니 한쪽은 집수정으로 돌아오고, 다른 쪽은 서쪽 벽의 외부 우수관으로 이어진다. 나는 이 사람의 흔적을 또 치우고 있다.'},
 plant_start:{title:'기계실 · 물이 내려간다',text:'배수 펌프와 환기 장치가 돌아간다. 수면 아래에 있던 주차장 방향 표지가 드러났다.\n\n펌프의 울림 사이로 젖은 손이 콘크리트를 치는 소리가 섞인다. 북쪽 방화문까지 우회할 길을 기억해 둬야 한다. 멈춰 있으면 금방 따라잡힌다.'},
 plant_drained:{title:'주차장으로 · 다시 차에 탄다',text:'차량 진입로의 물이 빠졌다. 보행자 출구는 공사 셔터 때문에 여전히 막혀 있다.\n\n내 차는 사고 다음 날부터 같은 자리에 세워 두었다. 열쇠를 조수석 가방에 넣었던 기억이 난다. 차체와 기둥 사이로 운전석까지 갈 수 있다. 입구 쪽 붉은 경보기는 길이 막히면 다른 쪽에서 소리를 낼 방법이 될 것이다.\n\n밖으로 나가기만 하면 끝날 거라고, 또 그렇게 생각했다.'},
} as const;
export type ExpansionAction=keyof typeof expansionJournal|'archive_booth_door'|'archive_booth_close'|'archive_booth_open_in'|'archive_booth_open_out'|'archive_preview_road'|'archive_preview_call'|'archive_preview_gate'|'archive_record_pause'|'archive_record_back'|'archive_record_forward'|'archive_record_mark'|'archive_record_choice_0'|'archive_record_choice_1'|'archive_finish'|'service_board'|'service_arrive'|'annex_enter'|'annex_restore'|'annex_line_victim'|'annex_line_office'|`annex_digit_${0|1|2|3|4|5|6|7|8|9}`|'annex_clear'|'annex_dial'|'annex_exit'|'court_enter'|'court_hangup'|'court_digit_0'|'court_digit_1'|'court_digit_2'|'court_digit_3'|'court_exit'|'archive_enter'|'archive_sequence_road'|'archive_sequence_call'|'archive_sequence_gate'|'archive_exit'|'plant_enter'|'plant_circuit_pump'|'plant_circuit_air'|'plant_circuit_lights'|'plant_route'|'plant_route_closed'|'plant_route_drain'|'plant_exit'|'parking_enter';
export const annexEvidence:Action[]=['annex_badge','annex_notice','annex_call'];
export const archiveEvidence:Action[]=['archive_road','archive_call','archive_gate'];
export const archiveFindings:Action[]=['archive_sequence_road','archive_sequence_call','archive_sequence_gate'];
export const courtCallTimes=[2.8,5.4,8] as const;
export const courtCallDuration=10.6;
export const courtEvidence:Action[]=['court_log','court_phone'];
export const expansionStages=Object.keys(expansionObjectives) as ExpansionStage[];
export const isExpansion=(stage:Stage)=>stage.startsWith('annex_')||stage.startsWith('court_')||stage.startsWith('archive_')||stage.startsWith('plant_');
const steps:Partial<Record<Stage,[Action,Stage]>>={
 office_departure:['service_board','service_ride'],service_ride:['service_arrive','service_open'],service_open:['annex_enter','annex_arrival'],
 annex_arrival:['annex_map','annex_unlock'],
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
 if(s.stage.startsWith('archive_')&&['archive_booth_close','archive_booth_open_in','archive_booth_open_out'].includes(action)){
  const state=action==='archive_booth_open_in'?undefined:action;if(state?s.circuit.includes(state):!s.circuit.some(a=>a==='archive_booth_close'||a==='archive_booth_open_out'))return s;
  const circuit:Action[]=s.circuit.filter(a=>a!=='archive_booth_close'&&a!=='archive_booth_open_out');if(state)circuit.push(state);return {...s,circuit};
 }
 if(s.stage.startsWith('annex_')&&action==='annex_front_exit')return s.notes.includes(action)?s:noted(s,action);
 if(s.stage.startsWith('annex_')&&annexEvidence.includes(action)){
  if(s.notes.includes(action))return s;const next=noted(s,action);
  return next;
 }
 if(annexCanCall(s.stage)&&['annex_line_victim','annex_line_office'].includes(action))return s.notes.includes(action)?s:noted(s,action);
 if(['annex_fuse','annex_restore','annex_search'].includes(s.stage)&&action==='annex_line_home')return noted(s,action,'annex_exit_ready');
 if(action==='annex_fuse'||action==='annex_restore')return s;
 if(['court_search','court_code','court_safe_open','court_unlocked','court_departure'].includes(s.stage)&&(courtEvidence.includes(action)||action==='court_evidence')){
  if(s.notes.includes(action))return s;const next=noted(s,action);
  return next;
 }
 if(archiveReviewing(s.stage)&&action==='archive_ledger')return s.notes.includes(action)?s:noted(s,action,s.stage==='archive_arrival'?'archive_search':s.stage);
 const collection=archiveReviewing(s.stage)?archiveEvidence:s.stage==='plant_isolate'?['plant_valve_west','plant_valve_east'] as Action[]:undefined;
 if(collection?.includes(action)){
  if(s.notes.includes(action))return s;const next=noted(s,action);
  if(collection===archiveEvidence)next.stage=collection.every(a=>next.notes.includes(a))?'archive_edit':'archive_search';
  else if(collection.every(a=>next.notes.includes(a)))next.stage='plant_power';
  return next;
 }
 if((s.stage==='court_search'||s.stage==='court_code')&&action==='court_confirm'&&s.notes.some(id=>['court_log','court_confirm','court_key'].includes(id)))return noted(s,action,'court_safe_open');
 if(archiveReviewing(s.stage)&&action.startsWith('archive_sequence_')){
  if(!archiveFindings.includes(action)||s.circuit.includes(action)||!s.notes.includes(action.replace('archive_sequence_','archive_')))return s;
  const circuit=[...s.circuit,action];
  return noted({...s,circuit},action,archiveFindings.every(a=>circuit.includes(a))?'archive_reveal':s.stage);
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
 if(s.stage==='archive_departure'||s.stage==='annex_departure')next.circuit=[];
 return next;
}
export function expansionObjective(s:Story){
 if(s.stage==='court_search')return s.notes.includes('court_log')?'인계판 뒤 열쇠를 챙겼다. 동측 초소 보관함으로.':expansionObjectives.court_search;
 if(s.stage==='court_code')return s.notes.some(id=>['court_log','court_confirm'].includes(id))?expansionObjectives.court_code:expansionObjectives.court_search;
 if(s.stage==='archive_search')return expansionObjectives.archive_search;
 if(s.stage==='archive_edit')return archiveFindings.every(a=>s.circuit.includes(a))?'기록이 이어진다. 빠진 장면은 무엇이었나.':expansionObjectives.archive_edit;
 if(s.stage==='plant_isolate')return expansionObjectives.plant_isolate;
 if(s.stage==='plant_power')return `흡입망 ${plantFilterCleared(s)?'확인':'막힘'} · 토출 ${plantRoute(s)==='drain'?'외부배수':plantRoute(s)==='closed'?'차단':'집수정 환수'}. 계기의 반응을 살핀다.`;
 return expansionObjectives[s.stage as ExpansionStage];
}
export function expansionTargetActive(s:Story,id:Action){
 if(id==='annex_front_exit')return s.stage.startsWith('annex_');
 if(id==='annex_fuse'||id==='annex_restore'||id.startsWith('court_digit_'))return false;
 if(['annex_badge',...archiveEvidence].includes(id)&&s.notes.includes(id))return false;
 if(id==='archive_play')return s.stage==='archive_reveal';
 if(id.startsWith('archive_preview_')||id.startsWith('archive_record_'))return archiveReviewing(s.stage);
 if(id==='court_confirm')return s.stage==='court_search'||s.stage==='court_code';
 if(id==='court_key')return s.stage==='court_safe_open';
 if(id==='court_exit')return s.stage==='court_unlocked';
 if(id==='court_hangup')return ['court_search','court_code','court_safe_open','court_unlocked','court_departure'].includes(s.stage);
 if(id.startsWith('annex_line_'))return false;
 if(id.startsWith('annex_digit_')||id==='annex_clear'||id==='annex_dial')return annexCanCall(s.stage);
 if(id.startsWith('archive_sequence_'))return archiveReviewing(s.stage);
 if(id==='plant_filter')return s.stage==='plant_power'&&!plantFilterCleared(s);
 if(id==='plant_route'||id.startsWith('plant_circuit_')||id==='plant_start')return s.stage==='plant_power';
 if(id==='annex_exit')return s.stage==='annex_exit_ready';
 if(id==='archive_exit')return s.stage==='archive_escape';
 if(id==='plant_exit')return s.stage==='plant_exit_ready';
 return true;
}

export const archiveReplayDuration=19;
export const archiveReplay=[
 {at:0,screen:'03:26 / 누락된 9초\n동시 녹음 복원',text:'충돌 아홉 분 뒤. 창밖에서 도움을 청한다.\n그녀는 아직 살아 있었다.'},
 {at:5.8,screen:'03:26 / 잠금음\n운전석 미하차',text:'딸깍. 도움을 청하는 사람을 밖에 두고 잠갔다.\n내가 지워 달라고 했던 아홉 초다.'},
 {at:9,screen:'현재 03:17 / 편집실\n기록 작성 중',text:'영상이 끝났는데 화면이 꺼지지 않는다.\n저 책상… 내가 지금 서 있는 방이다.'},
 {at:15,screen:'현재 03:17 / 편집실\n네 뒤에 있어',text:'「네 뒤에 있어」\n창 너머에서 손톱이 바닥을 긁는다. 연결문으로 가야 한다.'},
] as const;

// A continued investigation restarts the same entry approach as a carried pursuit.
export function courtyardPursuitActive(s:Story,carried:boolean){
 return carried||s.notes.some(id=>['court_gate','court_log','court_evidence','court_phone','court_confirm'].includes(id));
}

export const annexTapeDuration=7.706122;
export const annexCallbackDuration=4.5;
