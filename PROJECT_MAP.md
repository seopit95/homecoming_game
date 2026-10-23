# 귀가 · 프로젝트 지도

필요한 영역의 진입점부터 읽는다. 이 문서는 전체 파일 목록이나 작업 일지가 아니다.

| 작업 영역 | 첫 진입점 / 연결 파일 |
| --- | --- |
| 플레이 화면·설정·모바일 조작 | `app/page.tsx`, `app/globals.css`; 키·설정·저장: `lib/preferences.ts` V128 공통 먹색/회백색/탁한 적색은 마지막에 불러오는 app/game-theme.css에서 관리. 메뉴/설정/HUD/수첩/체력/터치/오류를 공유하며 맵 광량은 바꾸지 않음. |
| 스마트폰 전화·플래시 | V123 `lib/smartphone.ts` 공통 기기 → `world.ts` 침대 협탁 픽업, `viewmodel.ts` 후면 LED 광원/실사 손(`smartphone-hand-v1.webp`), `observed-player.ts` CCTV 속 기기, `chapters.ts` 한서연 음성메시지/사고 현장 폰. 공용 비상전화·인터폰은 유지. 새 도입: 스위치→폰 픽업→손 안의 전화 받기→차단기→신발. `game.findTarget`의 phone은 들고 있는 대상이며 협탁을 다시 조준하지 않는다. `preferences.ts`의 phone/shoes 체크포인트와 `smartphone` 노트가 새/기존 저장 흐름을 구별. 내부 torch/flashlight 액션·저장 이름은 호환성 때문에 유지. `audio.ts`의 mobile 루프는 건물 전화벨과 구분되며 들고 이동/통화 종료/장면 변경에 맞춰 갱신 |
| 사고 여성·귀신 공통 의상 | V123 `lib/victim-outfit.ts`의 단색 회색 공통 재질(젖은 정도만 구분), `pedestrian-art.ts`의 기존 소매 바인딩, `pedestrian.ts`의 긴 치마. 치마는 hip/knee/ankle을 따라 곡선 길이 기준으로 분할해 허리 링의 겹침/버킷 모양을 방지. 귀신은 기존 gown/관절/상처 유지. `tests/victim-outfit.test.mjs`와 `pedestrian-clothing.test.mjs`; 실제 사고 접지는 `opening-staging.test.mjs` |
| 조사 수첩·획득한 증거 해석 | `app/investigation-notebook.tsx`, `lib/investigation.ts` |
| 게임 루프·입력·상호작용·장면 이동 | `lib/game.ts`; 진행용 문은 `doorActions`/`findTarget`에서 실제 문짝을 raycast한다. 틈은 기존 점 판정으로 보완하고, 실제 표면은 `world.hasLineOfSight`의 끝 여유 .04로 가림 검사(일반 기본 .15 유지). 통과 판정: `lib/passage.ts`; 걸음 거리·발 착지·시점 반동: `lib/player-gait.ts` → 손/손전등 위상 `lib/viewmodel.ts`. 새 설정의 bob 기본 켬, 기존 명시적 끔/화면 흔들림 줄이기는 존중 |
| 시작 화면 로딩·그래픽 준비 | `app/title-screen.tsx`·`app/title-screen.css`의 SSR 제목 `귀가 (歸家)`/실제 복도 8KB WebP. V125 배경 전등의 CSS 밝기 변화를 로딩·메뉴에서 공유하고 UI 글자는 유지, OS/게임 모션 줄이기에서는 정지. 별도 자산/JS 타이머/로딩 대기 없음 → `app/page.tsx`의 실제 import/질감/공간 준비 단계 → 준비 후 새 게임·이어하기·설정. 초기 실패는 닫는 대신 재로드 안내. UI 상태 계약: `tests/title-screen.test.mjs`. `app/layout.tsx`의 첫 CSS와 `lib/visual-preloads.json`의 기존3개 힌트·동적 게임 import·`prepareVisuals`·`Game.ready` 유지. URL 변경 시에만 `tests/visual-hints.test.mjs` 재검증. 배포용 HTTP200·JS 실행 전 제목 포함 여부 확인. 가짜 진행률·최소 대기·스플래시 때문에 기다리는 자산 없음 |
| 미션·단서·체크포인트 | V126 `lib/apartment-route.ts`가 `story.transition/objectiveFor/checkpoint`에 우선 적용된다. 계단→남은 하강 6초(층수·수동 정지)→1F 공동현관 안내도/경비실 열쇠→인접 서고의 세 기록→CCTV→지하계단→B1. `preferences.readProgress`가 옛 거주부/17F 관리실/중정/기계실 저장을 새 단계로 보정한다. 옛 전화번호/편집 퀴즈/펌프 퍼즐은 주 동선에서 제외 |
| V127 안전 구간·추격·음성 | 집 장롱은 닫혀 있는 동안 안전하며 나와서 접촉하면 포획. 외부 은신처 삭제에 맞춰 숨 참기 UI/입력도 비활성화; 달리기 호흡은 유지. 공동현관·세 기록·CCTV·영상 후 확인 시간도 안전. archive_exit의 부자연스러운 거부 대사는 제거하고 3초 경고 후 실제 통로로 접근한다. 28F 추격은 pursuit.ts 기본3.40+돌진.45, 실제 호출 버튼→전력 도주를 확인. 승강기 이후는 중앙 설비 코어에 가려진 위치까지 진행해야 뒤에서 비명/추격을 시작. 새 맵의 편집 단축키 차단 유지 |
| 집 내부·배치·충돌 | `lib/world.ts`, `lib/apartment-layout.ts` |
| 복도·승강기·계단·관리실·주차장 | `lib/building.ts`에서 해당 공간 제작 함수 확인. 계단의 첫 윗층/반복층 아래쪽은 받는 공간이 없는 폐쇄문으로 표식, V129 실제 진행은 첫 아래문→17F 도착→윗층 연결문. 벽 메모/읽기 조건은 삭제. 층수·방향·연결문은 벽에 붙는 공통 표찰(lib/apartment-signage.ts)로 표시. 폐쇄 표식은 복제 뒤에 추가해 실제 통로에 섞이지 않음 |
| 1F 공동현관·관리실 서고·B1 계단 | V126 `lib/apartment-escape.ts`가 세 작은 맵을 제작하고 `building.ts`에서 선택한다. 순환 의존 없는 `escape-layout.ts`의 크기/경로를 `expansion-world.ts`도 공유. V129 공동현관 안내도는 방 배치/현재 위치/B1 동선을 그린 도면이고 문 표찰은 장소 이름만 표시. 공통 createApartmentPlaque의 position은 뒤쪽 벽 접촉면이며 프레임·나사·무광 법랑 표면을 공유. 실제 받침 있는 책상·열쇠·문서·CRT, 막힌 계단 샤프트/난간, 두 경사 구간의 `heightAt` 0→−2.8m. 공통 `passage.ts`와 게임 좌표 변환을 맞추고 주차장 진입 때 높이를 정규화. 옛 중정/거대 기계실 제작 파일은 레거시 자료로 남고 초기 준비 목록에서 제외 |
| 도입 사고·차량·마지막 탈출 | `lib/story.ts.phoneCallback`의 첫 전화/차량 잠금음 회수 → `game.ts`의 시뮬레이션 시간별 1회 재생. `lib/prologue.ts` → 핸들·손목 공통 그립/손가락 감기 `lib/driving-hands.ts`, `lib/road-street.ts`, `lib/car-departure.ts`, `lib/sedan.ts` |
| 귀신 외형·관절·걷기·기기 | `lib/ghost.ts`의 비대칭 어깨 당김·지연된 머리 회전(거리 위상), 접지 시 팔꿈치 방향 보존. `animateGhost` 마지막 pursuit 입력은 기는 추격자의 상체/목/턱을 점진 변형한다. V130 열린 추격 공간에서는 상체를 낮추고 손·발 간격과 팔꿈치/무릎의 옆 굽힘을 더 넓힌 네 지지점 거미형 자세로 기어온다. 관절 길이와 접지는 유지하며 더 넓어진 시각 범위로 문/벽 여유를 미리 읽는다. 추격 얼굴은 작은 벌림, 포획은 기존 큰 벌림을 사용. 손바닥·뒤 발 접지를 유지하며 문/벽/계단에서는 기존 좁힌 자세로 복귀. root/머리 확대나 추가 팔다리는 없음. lib/ghost-tears.ts의 두 젖은 피눈물 필름은 실제 얼굴 삼각형을 따라 걷기/기기/착석/포획 변형에 맞춘다. 유체 시뮬레이션은 아님. V130 `ghost-hair.ts`는 `assets/ghost-strands.json`의 실제 둥근/삼각 단면 튜브 가닥을 한 배치로 그리며 작은 입체 두피와 분리한다. `scripts/author-ghost-strands.mjs`가 기존 두개골에 맞춰 재생성. 사진/알파 판 교체 없음. `ghost-arms`, `ghost-legs`, `ghost-dress`, `ghost-face` 등 필요한 부위로 이동 |
| 28층 승강기 도주 | V118: 문 오른쪽 실제 호출 버튼을 눌러야 `lift_wait` 시작 → 이미 28층인 승강기의 .65초 문 해제 → 실제 문 열림/걷기 탑승/닫힘. `building.ts`의 버튼과 호출등 피드백. 자동 호출/보관함 없음. `pursuit.ts`의 landing 속도는 체력 회복 가능한 선형 도주용 |
| 옛 야간관리실 준비·탈출(주 동선 제외) | V126에서 새 진행/옛 저장은 1F로 보정. 아래는 V124 당시 계약: V124 `game.ts`는 퓨즈/회로/CCTV/열쇠 준비 중에는 귀신을 비활성화한다. 저장된 과거 pursuit 플래그도 준비를 건너뛰지 않는다. 준비 후 `service_exit` 한 번으로 추격 시작 → 실제 걷기 탑승 → `office_boarding` 동안 같은 관리실에서 철문 닫힘 → 귀신이 문 앞까지 급가속해 충돌 → `sealed` 후 승강기 공간으로 연결. `building.ts`의 serviceHinge는 닫힘/충돌 진동/재시도 충돌 reset을 담당. 탑승 지점은 문짝 회전 범위보다 안쪽이며 이후 재이탈은 차단. CCTV는 기존처럼 선택 사항. 체력/일반 추격/맵 크기는 유지 |
| 비상계단 재시작·모퉁이 출현 | V122 `game.ts.loadArea`는 기존 두 번 꺾인 진입 통로에서 귀신을 시작한다. 보이는 자리에서5초 기다리지 않고 실제 벽을 돌아 접근. `danger`의 stairs 분기는 열린 아래층/상부문 방향으로 조사하며 인식한 플레이어·마지막 목격 지점이 우선. `followEnemy`는 모퉁이 waypoint가 가까워도 다음 구간이 충돌 없이 열려야 생략한다. 연속 진입의 `entranceDelay`는 유지 |
| 추적·시야·소리·문 충돌 | `lib/navigation.ts`의 `movePursuer`(몸의 방향·전체 이동 구간 검사), `game.ts.followEnemy`(막힌 경로 재계획)·`hunt`(마지막 목격 위치 도착 후 조사), `lib/perception.ts`, `lib/collision.ts`; 단계별 속도·가속: `lib/pursuit.ts`; 자료실 문: `lib/archive-door.ts` |
| 숨 참기 레거시 | V127에서 실제 입력/표시를 비활성화(game.ts·app/page.tsx). 장롱 보호 및 외부 은신처 삭제 뒤 의미 없는 조작이므로 Ctrl/터치/설정 항목을 노출하지 않는다. 옛 저장 키·순수 함수·컴포넌트 파일은 호환성 자료로 남김. 이동/체력 호흡과 거리별 심장은 유지 |
| 은신 범위 | V119: 집 밖 은신용 캐비닛17개 삭제. world.ts는 빈 hidingPlaces를 반환. 집 장롱의 story.hidden은 유지하며 V126부터 닫힌 장롱은 안전, V127부터 숨 참기는 비활성. 중정 열쇠 보관함은 은신처가 아닌 레거시 미션 소품 |
| 퍼즐·전화·원본 대조 | `lib/annex-call.ts`, `lib/surveillance.ts`, `lib/archive-review.ts`, `lib/plant-*.ts` |
| 붙잡힘·얼굴 전체화면 돌진 | V127 captureDuration1.25초, lib/capture-scene.ts가 같은 귀신의 피부·입·치아·머리카락을 공유해 어두운 근접 포획. 포획 진입은 기존 여성 voice(scream) 비명을 재생한다(2026-10-23 수정). 비명 없는 V127 capture 충격음 대신 기존 비명 gain 0.768 경로를 사용하며 slam 충돌음·1.25초 후 정지는 유지. game.ts의 dying/skipDeath/공유 진행률과 일치. 재시도 때 일반 시점 복귀 |
| V129 동일 3D 그래픽의 충돌 뒤 후일담 | app/ending-screen.tsx: crashed 엔딩에만 2초 암전→사고 기록→빈 조수석→블랙박스 단서→21초 제목/크레딧. 숨은 탭에서는 진행 중지, 건너뛰기/다시 보기. caught는 기존 즉시 체크포인트 재시도. app/page.tsx에서만 연결, 실제 운전/충돌/저장 엔진은 유지. V129 생성 사진은 삭제. lib/prologue.ts의 aftermathPose가 기존 실제 차량/덤프트럭/도로를 외부 시점에서 멈춰 보여준다. 2초 이후 후일담 배경을 투명하게 전환해 같은 게임 캔버스를 노출하며 추가 이미지 요청 없음. 각 문장 교체는 고정 aria-live 안쪽에서만 수행 |
| 주차장·차문·마지막 충돌 | V127 game.ts: 경보5초 동안 소리 쪽 유도→종료 비명/4.30 추격. parking_alarm 재시도·이어하기는 경보 노트를 초기화해 재사용 가능. building.ts의 실제 운전석 문짝을 조준, 차체 자체 충돌만 시선 검사에서 제외하고 반대편 탑승 차단. story.ts의 탑승 입력.2초 후 기존 문 열기/탑승/경사로 연출. driving-car.ts의 문 안감/손잡이/실/경첩은 실제 문에 연결. prologue.ts의 조수석 대사3초→남성 비명/전방 회전→dump-truck.ts 덤프트럭 정면 접촉1.35초. 귀신 타격 없음. V130 조수석도 돌아다니는 createGhost의 동일 3D 머리/몸체/입체 가닥 머리카락/피눈물과 같은 표면 재질을 사용. 옆좌석 전용 광택 재질 복제를 제거했고 같은 모델을 좌석 자세로 변형한다. passenger-portrait.ts·해당 사진·준비 요청은 제거 |
| V127 교체 음원 | smartphone-audio.ts는 Apple 녹음 없이 별도 제작한 마림바 루프. 기존 V126 추격 비명을 유지해 음량20% 상승, 포획은 별도 충격음. public/audio/ghost-v127/sources.json에 금속 긁기/남성 비명 CC0 출처 및 합성 대사 한계 기록. 승강기 실제 긁기10.6/13.2초, 마지막 대사는 합성 근사치이며 실제 배우 녹음 아님 |
| 음원·배경음·믹싱 | `lib/audio.ts`, `public/audio/`; 주인공 재질 판정 `lib/footsteps.ts`, PCM 영역 `lib/footstep-bank.json`, 점진 호흡 `lib/stamina.ts`의 `stepBreathing`. 귀신 발소리는 procedural 분기 유지. 거리 심장 박동·머리 회전에 따른 HRTF 발/숨/끌림 음향은 `lib/ghost-sound.ts` → `lib/audio.ts.setGhostPosition`; `game.ts.danger`가 실제 위치/문 차폐/활성 여부를 제공. 추격 비명·가속 전환은 `lib/game.ts`의 `chaseSpeed` |
| 어둠·손전등·환경광 | V120 `lib/game.ts`의 구역별 ambient/fill/lamps 및 `scene.environmentIntensity`를 낮춤. 일반 등 배수 .4, 반사광 .028, 손전등42는 유지. TV/시네마틱 반사광 .055와 사용자 밝기 설정 유지. `lib/lighting.ts`의 반사광 원본; 사용자 밝기는 `lib/preferences.ts` |
| 재질·텍스처·정적 메쉬 성능 | `lib/materials.ts`, `lib/texture-loader.ts`, `lib/static-geometry.ts` |
| 에셋·출처 | `public/models/`, `public/textures/`, `docs/assets.md`; 생성 도구: `scripts/author-*.mjs` |
| 검증 | `tests/<관련 기능>.test.mjs`; 게임 통합 fixture: `tests/game.test.mjs`; 합격 범위: `VERIFICATION.md` |
| 실행·배포 | `package.json`, `.openai/hosting.json`; Vinext + React + Three.js, Sites 호스팅 |

## 좁게 확인하는 방법

1. 관련 파일과 이름으로 `rg`를 사용한다. 모델 데이터 JSON 전체를 출력하지 않는다.
2. `VERIFICATION.md`의 기존 증거와 재검증 조건을 확인한다.
3. 동작을 바꿨다면 영향을 받는 테스트 이름만 실행한다. 문서 수정만으로 게임 전체를 재플레이하지 않는다.
4. 새 결과는 외부 증거 폴더에 자세히 남기고 이 저장소에는 범위·경로·한계만 기록한다.

## 현재 작업 방향

자동 goal 없이 일반 요청으로 개발한다. V101까지의 수정은 재사용했다. V102는 HUD·일시정지 안내, V103은 그래픽 준비와 무손실 압축이다. V104의 과도한 초기 힌트·정적 게임 진입은 공개 시작 실패로 철회했다. V105는 기존 동적 진입을 복원하고 초기 힌트를3개로 제한하며 CSS 요청 단계를 줄였다. 이후 미술·스토리 작업에서도 이미 합격한 입력은 재검증하지 않는다.

참고한 방식: [프로젝트 지도 경험담](https://www.reddit.com/r/KoreanGameDev/comments/1wn1wuq/), [플레이어 피드백·UI 논의](https://www.reddit.com/r/KoreanGameDev/comments/1wvj3iz/), [결정·근거를 짧게 남기는 개발 워크플로](https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex). 토큰 절감률을 측정한 자료는 아니다.
