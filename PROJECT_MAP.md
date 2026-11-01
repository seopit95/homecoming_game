# 귀가 · 프로젝트 지도

필요한 영역의 진입점부터 읽는다. 이 문서는 전체 파일 목록이나 작업 일지가 아니다.

| 작업 영역 | 첫 진입점 / 연결 파일 |
| --- | --- |
| 플레이 화면·설정·모바일 조작 | `app/page.tsx`, `app/globals.css`; 키·설정·저장: `lib/preferences.ts` V128 공통 먹색/회백색/탁한 적색은 마지막에 불러오는 app/game-theme.css에서 관리. 메뉴/설정/HUD/수첩/체력/터치/오류를 공유하며 맵 광량은 바꾸지 않음. |
| 스마트폰 전화·플래시 | V123 `lib/smartphone.ts` 공통 기기 → `world.ts` 침대 협탁 픽업, `viewmodel.ts` 후면 LED 광원/실사 손(`smartphone-hand-v1.webp`), `observed-player.ts` CCTV 속 기기, `chapters.ts` 한서연 음성메시지/사고 현장 폰. 공용 비상전화·인터폰은 유지. 새 도입: 스위치→폰 픽업→손 안의 전화 받기→차단기→신발. `game.findTarget`의 phone은 들고 있는 대상이며 협탁을 다시 조준하지 않는다. `preferences.ts`의 phone/shoes 체크포인트와 `smartphone` 노트가 새/기존 저장 흐름을 구별. 내부 torch/flashlight 액션·저장 이름은 호환성 때문에 유지. `audio.ts`의 mobile 루프는 건물 전화벨과 구분되며 들고 이동/통화 종료/장면 변경에 맞춰 갱신 |
| 사고 여성·귀신 공통 의상 | V123 `lib/victim-outfit.ts`의 단색 회색 공통 재질(젖은 정도만 구분), `pedestrian-art.ts`의 기존 소매 바인딩, `pedestrian.ts`의 긴 치마. 치마는 hip/knee/ankle을 따라 곡선 길이 기준으로 분할해 허리 링의 겹침/버킷 모양을 방지. 귀신은 기존 gown/관절/상처 유지. `tests/victim-outfit.test.mjs`와 `pedestrian-clothing.test.mjs`; 실제 사고 접지는 `opening-staging.test.mjs` |
| 달리기·회복·호흡 | V135 `lib/stamina.ts`: 연속 달리기6.5→9.2초. 회복 대기1.5초/완전 회복9초/소진 후25% 해제는 기존 정책. `stepBreathing`은 남은 비율에 따라 자동으로 더 늦게 거칠어지며 신규/변경된 체력·호흡 경계 검사만 수행. |
| 조사 수첩·획득한 증거 해석 | `app/investigation-notebook.tsx`, `lib/investigation.ts` |
| 게임 루프·입력·상호작용·장면 이동 | `lib/game.ts`; 진행용 문은 `doorActions`/`findTarget`에서 실제 문짝을 raycast한다. 틈은 기존 점 판정으로 보완하고, 실제 표면은 `world.hasLineOfSight`의 끝 여유 .04로 가림 검사(일반 기본 .15 유지). 통과 판정: `lib/passage.ts`; 걸음 거리·발 착지·시점 반동: `lib/player-gait.ts` → 손/손전등 위상 `lib/viewmodel.ts`. 새 설정의 bob 기본 켬, 기존 명시적 끔/화면 흔들림 줄이기는 존중 |
| 시작 화면 로딩·그래픽 준비 | `app/title-screen.tsx`·`app/title-screen.css`의 SSR 제목 `귀가 (歸家)`/실제 복도 8KB WebP. V125 배경 전등의 CSS 밝기 변화를 로딩·메뉴에서 공유하고 UI 글자는 유지, OS/게임 모션 줄이기에서는 정지. 별도 자산/JS 타이머/로딩 대기 없음 → `app/page.tsx`의 실제 import/질감/공간 준비 단계 → 준비 후 새 게임·이어하기·설정. 초기 실패는 닫는 대신 재로드 안내. UI 상태 계약: `tests/title-screen.test.mjs`. `app/layout.tsx`의 첫 CSS와 `lib/visual-preloads.json`의 작은 힌트1개(현재66KB)·동적 게임 import·`prepareVisuals`·`Game.ready` 유지. 2026-10-29 로컬 로딩 개선: `game.ts`의 셰이더 진단 GPU 읽기는 운영 빌드에서만 끄고 개발에서는 유지한다. 실측/한계는 `docs/quality/2026-10-29-first-load.md`. URL 변경 시에만 `tests/visual-hints.test.mjs` 재검증. 배포용 HTTP200·JS 실행 전 제목 포함 여부 확인. 가짜 진행률·최소 대기·스플래시 때문에 기다리는 자산 없음. 2026-10-29 실제 게임은 `prepareVisuals('game')`로 현재 동선의 이미지만 준비하며 기본 호출은 제작 도구용 전체 준비를 유지한다. 큰 힌트/실패 전송 재시도와 실측 한계는 `docs/quality/2026-10-29-startup-final.md` |
| 미션·단서·체크포인트 | V133 `lib/apartment-route.ts`가 새 주 동선을 우선한다. 28F1호기→24F 반 층 정지/손 짚고 탈출→같은 복도→실제24→20F 네 층 하강→20F2호기→1F 공동현관/경비실 열쇠→관리사무소 미수령 우편3통/CCTV→B1 계단→주차장. `residential-route.ts`가 층/거리/시간을 공유. `preferences.ts`는 transfer_gallery/panel/exit 저장과 옛 계단 저장을 보정. 계단에서 벌어진 남은 실제 경로 거리는20F 접근 시간과 저장/이어하기에 반영. |
| V127 안전 구간·추격·음성 | V133 집 장롱 진입 전 목격 여부를 `home-search.ts`에 기록. 봤으면 문 앞에서 멈춰 듣고 옆으로 물러서 다른 방으로 이동, 못 봤으면 마지막 단서/방을 확인한 뒤 이동. 실제 도착/퇴각 이후에만 탈출 기회; 닫힌 장롱은 안전. 외부 캐비닛/숨 참기 UI 없음. 공동현관·기록 조사도 안전. 계단의 짧은 lookahead 소진 시 즉시 재계획하며20F와 계단의 직접 추격도 기존 chase 음악을 구동. |
| 집 내부·배치·충돌 | `lib/world.ts`, `lib/apartment-layout.ts` |
| 복도·승강기·계단·관리실·주차장 | V133 `building.ts` 분기→`residential-gallery.ts`(28/24/20F 동일44m 외부 복도·승강기2대/실제 호출/걷기 탑승), `lift-climb.ts`(실제 손/팔·반 층 문턱), `residential-stairs.ts`(24→20F 실제8개 반층 계단·높이 기준 충돌/추적). 중간층 문 확인 임무 없음;20F만 살짝 열린 문·찬빛/문 소리. building의 stair preview와 stairs의 gallery preview는 문 양쪽 동일 공간을 보여 주며 preview=true로 재귀/중복 귀신을 막는다. 문 이동은 x/yaw를 보존하고 z±24.71,20F y+11.2를 적용. 기존 주차장/출차는 유지. |
| 1F 공동현관·관리실 서고·B1 계단 | V133 `ground-support.ts`의 작은 공동현관(8.4×11m)/유리 경비실과 관리사무소(6.4×9m). 1F2호기 실제 열린 입구, 벽에 붙는 표찰/도면, 책상 위 열쇠·한 보관대의 미수령 우편3통·CRT. `archive-review.ts` CCTV 시점과 game 오디오 위치도 새 책상 위치를 따른다. B1은 기존 `apartment-escape.ts` 계단을 재사용; `escape-layout.ts`와 공통 `passage.ts`의 가려진 꺾임으로 연결. 1F 도착의 옛 검은 시간 점프 오버레이는 제거. |
| 도입 사고·차량·마지막 탈출 | `lib/story.ts.phoneCallback`의 첫 전화/차량 잠금음 회수 → `game.ts`의 시뮬레이션 시간별 1회 재생. `lib/prologue.ts` → 핸들·손목 공통 그립/손가락 감기 `lib/driving-hands.ts`, `lib/road-street.ts`, `lib/car-departure.ts`, `lib/sedan.ts`  V135 조수석은 동일 모델의 몸통을 운전석 쪽으로 기울이고, figure-local driverGaze로 얼굴을 운전자에게 향하게 한다(얼굴 비율 확대 없음). finaleTiming은 앞보기.60초/충돌.78초·트럭32m/s. vehicle-wreck.ts는 실제 hero의 복제한 메쉬를 전면 접힘/유리기둥·지붕 눌림으로 변형하고 원상복구/폐기한다. prologue는 drivingCar.pose 뒤에 적용하며 엔딩을 운전석 앞쪽 사선 구도로 보여 준다. 원래 유리 균열 선은 차체가 완전히 접히면 숨겨 공중에 남지 않는다. |
| 귀신 외형·관절·걷기·기기 | V132 승인된 V131 실제 모델을 `lib/ghost.ts`/`ghost-face.ts`/`ghost-dress.ts`/`ghost-tears.ts`에 통합. 원본 성인 여성 머리 비율, 어깨 경계 보간 절단, 회색 옷감/피부와 어두운 피눈물. 추격·조수석·포획은 동일 createGhost를 사용하며 옆좌석 머리를 운전석 쪽으로 회전. `ghost-hair.ts`/`assets/ghost-strands.json`: 굵은 심 없는3,408개 닫힌 3D 가닥(평균 직경 약0.26mm, 최대0.52mm), `scripts/author-ghost-strands.mjs`로 재생성. 안전한 pose는 최대50ms 재사용하며 머리 뿌리는 parent를 따라간다. 바닥/지지 함수·입·좌석 길이/빠른 회전 변화는 즉시 갱신. 삼각형당 반복 행렬 연산을 ring당 연산으로 바꿨다. 움직이는 계단 접촉은 갱신이 잦아 CPU 비용이 남으며 모든 기기 FPS/실사 품질을 보장하지 않는다. |
| 28층 승강기 도주 | V118: 문 오른쪽 실제 호출 버튼을 눌러야 `lift_wait` 시작 → 이미 28층인 승강기의 .65초 문 해제 → 실제 문 열림/걷기 탑승/닫힘. `building.ts`의 버튼과 호출등 피드백. 자동 호출/보관함 없음. `pursuit.ts`의 landing 속도는 체력 회복 가능한 선형 도주용  V135 정상 객실에는 단차/받는 복도를 숨기고 충돌도 제외. pry/lift_exit/lift_climb에만.95m 어긋난 층을 표시한다. 공통 gallery-lift-lobby의 바닥·천장은 문 경계 z=-22.75에서 끝나므로 객실 안까지 튀어나오지 않는다. 생성/reset도 이 정상 상태를 기준으로 한다. |
| 옛 야간관리실 준비·탈출(주 동선 제외) | V126에서 새 진행/옛 저장은 1F로 보정. 아래는 V124 당시 계약: V124 `game.ts`는 퓨즈/회로/CCTV/열쇠 준비 중에는 귀신을 비활성화한다. 저장된 과거 pursuit 플래그도 준비를 건너뛰지 않는다. 준비 후 `service_exit` 한 번으로 추격 시작 → 실제 걷기 탑승 → `office_boarding` 동안 같은 관리실에서 철문 닫힘 → 귀신이 문 앞까지 급가속해 충돌 → `sealed` 후 승강기 공간으로 연결. `building.ts`의 serviceHinge는 닫힘/충돌 진동/재시도 충돌 reset을 담당. 탑승 지점은 문짝 회전 범위보다 안쪽이며 이후 재이탈은 차단. CCTV는 기존처럼 선택 사항. 체력/일반 추격/맵 크기는 유지 |
| 비상계단 재시작·모퉁이 출현 | V133 새 물리적24→20F 계단으로 교체. 재시도 귀신은 문 밖 받는 복도에서 실제로 걸어 들어온다. GROUND 높이를 `heightAt`/`navigationSolids`/`chaseTarget`에 넘겨 겹친 층을 구별. `remainingToExit`는 층별 순서를 보존한3D 경로 거리이며20F 이동 때 접근 대기와 저장을 계산한다. V122/V129의 가짜 반복층·17F 윗문/남은 하강 시간 계약은 폐기. |
| 추적·시야·소리·문 충돌 | `lib/navigation.ts`의 `movePursuer`(몸의 방향·전체 이동 구간 검사), `game.ts.followEnemy`(막힌 경로 재계획)·`hunt`(마지막 목격 위치 도착 후 조사), `lib/perception.ts`, `lib/collision.ts`; 단계별 속도·가속: `lib/pursuit.ts`; 자료실 문: `lib/archive-door.ts` |
| 숨 참기 레거시 | V127에서 실제 입력/표시를 비활성화(game.ts·app/page.tsx). 장롱 보호 및 외부 은신처 삭제 뒤 의미 없는 조작이므로 Ctrl/터치/설정 항목을 노출하지 않는다. 옛 저장 키·순수 함수·컴포넌트 파일은 호환성 자료로 남김. 이동/체력 호흡과 거리별 심장은 유지 |
| 은신 범위 | V119: 집 밖 은신용 캐비닛17개 삭제. world.ts는 빈 hidingPlaces를 반환. 집 장롱의 story.hidden은 유지하며 V126부터 닫힌 장롱은 안전, V127부터 숨 참기는 비활성. 중정 열쇠 보관함은 은신처가 아닌 레거시 미션 소품 |
| 퍼즐·전화·원본 대조 | `lib/annex-call.ts`, `lib/surveillance.ts`, `lib/archive-review.ts`, `lib/plant-*.ts` |
| 붙잡힘·얼굴 전체화면 돌진 | V127 captureDuration1.25초, lib/capture-scene.ts가 같은 귀신의 피부·입·치아·머리카락을 공유해 어두운 근접 포획. 포획 진입은 기존 여성 voice(scream) 비명을 재생한다(2026-10-23 수정). 비명 없는 V127 capture 충격음 대신 기존 비명 gain 0.768 경로를 사용하며 slam 충돌음·1.25초 후 정지는 유지. game.ts의 dying/skipDeath/공유 진행률과 일치. 재시도 때 일반 시점 복귀 |
| V129 동일 3D 그래픽의 충돌 뒤 후일담 | app/ending-screen.tsx: crashed 엔딩에만 2초 암전→사고 기록→빈 조수석→블랙박스 단서→21초 제목/크레딧. 숨은 탭에서는 진행 중지, 건너뛰기/다시 보기. caught는 기존 즉시 체크포인트 재시도. app/page.tsx에서만 연결, 실제 운전/충돌/저장 엔진은 유지. V129 생성 사진은 삭제. lib/prologue.ts의 aftermathPose가 기존 실제 차량/덤프트럭/도로를 외부 시점에서 멈춰 보여준다. 2초 이후 후일담 배경을 투명하게 전환해 같은 게임 캔버스를 노출하며 추가 이미지 요청 없음. 각 문장 교체는 고정 aria-live 안쪽에서만 수행 |
| 주차장·차문·마지막 충돌 | V132 `game.ts`: 열쇠고리 금속음(30m/2.5초 소음) 뒤 차 조수석의 실제 접근점으로 조사, 선택 경보5초 유인 유지→종료 비명/4.40 추격. 경보 재시도 초기화/실제 운전석 문 표면/반대편 탑승 방지/.2초 입력과 탑승 보호 유지. `car-departure.ts`와 `story.ts`: 승차·시동0–8초 유지, 경사로26m는8–12초에 가속해10m/s로 도로에 연결. `prologue.ts`는10→14m/s로 연속 가속하고 변경 거리로 트럭 접촉을 계산. 마지막 조수석도 같은 귀신 모델/표면, 남성 비명·전방 회전·정면 충돌·후일담은 기존 동작 유지. |
| V127 교체 음원 | smartphone-audio.ts는 Apple 녹음 없이 별도 제작한 마림바 루프. 기존 V126 추격 비명을 유지해 음량20% 상승, 포획은 별도 충격음. public/audio/ghost-v127/sources.json에 금속 긁기/남성 비명 CC0 출처 및 합성 대사 한계 기록. 승강기 실제 긁기10.6/13.2초, 마지막 대사는 합성 근사치이며 실제 배우 녹음 아님  V135 passenger-line 재생 호출과 archiveCues의 archive-plea를 제거, 두 파일은 초기 다운로드에서도 제외. 해당 대사 자막/기록과 차량 잠금음·남성 비명·충돌음은 유지. |
| 음원·배경음·믹싱 | `lib/audio.ts`, `public/audio/`; 주인공 재질 판정 `lib/footsteps.ts`, PCM 영역 `lib/footstep-bank.json`, 점진 호흡 `lib/stamina.ts`의 `stepBreathing`. 귀신 발소리는 procedural 분기 유지. 거리 심장 박동·머리 회전에 따른 HRTF 발/숨/끌림 음향은 `lib/ghost-sound.ts` → `lib/audio.ts.setGhostPosition`; `game.ts.danger`가 실제 위치/문 차폐/활성 여부를 제공. 추격 비명·가속 전환은 `lib/game.ts`의 `chaseSpeed`  V134 `escape-atmosphere.ts`의 계단 이후 유한한 환경음 큐를 game의 areaTime으로 재생. 가까운 실제 등 위치에서 스테레오 방향/거리 감쇠, CCTV 대사/주차장 경보 중 큐는 소비하고 넘긴다. `audio.sound`의 pipe-groan/ballast는 effects bus와 짧은 feedback echo를 사용하며3.3/2.05초 뒤 노드 정리. ghost HRTF/추격 비명은 기존 것을 유지. |
| 어둠·손전등·환경광 | V134 `escape-atmosphere.ts`의 escapeMood/escapeLamp → `game.renderWorld`. 비상계단·20F·2호기·1F·관리사무소·B1·주차장에 낮은 환경광/어두운 안개/LED34와 등별 느린 전압 강하. 고정 seed로 공유 preview/본 공간의 등을 동기화하고 reduced motion은 일정하게 유지.20F 출구 exitCue는 항상.4배로 보호. 계단의 실제 적색 비상등/오팔관과 ground-support의 형광관은 실제 광량에 맞춰 발광. 첫 집/28F/첫 승강기·밝기 설정은 기존 정책. 공통 문 표찰은 `apartment-signage.ts` V134의 마모된 먹색 금속/회백색 문자이며 geometry/벽 부착 위치는 유지. |
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

V132 속도 위치: `lib/pursuit.ts`의 구간별 고정 pace. 집/한서연의 집은 직전 대비 각각 약3.4%/4.9% 상향, 보관실·지하계단은 기본3.05. `game.ts`의 이동 계수/보폭/문 회전 제한을 그대로 거치며 순간이동·추가 보관함·필수 아이템은 추가하지 않는다.

2026-10-29 아내·가족 이야기: `lib/family-story.ts`의 관리실 미수령 우편/사고 전 편지 → `expansion-story.ts`·`ground-support.ts`·`game.ts`의 기존 archive ID/라벨/상호작용, `investigation.ts`의 획득 범위, `app/ending-screen.tsx`의 경찰 다시방 조사와 전문. 기존 동선/저장 형식 유지. 검증은 `docs/quality/2026-10-29-family-story.md`. 여성 성우 울음 녹음은 `public/audio/ghost-v136/`(CC BY3.0), `lib/audio.ts`의 cry 경로와 자연 속도, 후일담 크레딧. 범위/직접 청취 제한은 `docs/quality/2026-10-29-female-sob.md`.

itch.io HTML5 빌드: `npm run build:itch` → `scripts/build-itch.mjs`, `vite.itch.config.ts`, `itch/main.tsx`와 기존 Home. `dist/itch/`의 정적 파일과 `outputs/homecoming-0317-html5.zip`/JSON 생성. 미지의 하위 경로는 `lib/asset-url.ts`에서 처리하며 기존 Sites `/`는 유지한다. 검증·게시 상태는 `docs/quality/2026-10-30-itch-html5.md`.

2026-10-30 마지막 경적·충돌·후일담 음악: `audio.ts.prepareFinale/setEndingMusic`, `scripts/author-finale-audio.mjs`, `app/ending-screen.tsx`; 근거 `docs/quality/2026-10-30-finale-audio.md`. 초기 메뉴에서는 새 음원 미요청.

2026-10-30 도입 음주운전·소주병: `lib/driving-bottles.ts`(원본 두 병/오른손 마시기) → `prologue.ts`(휴대폰 시선)·`story.ts`(독백 자막/반복 운전·수첩). `docs/quality/2026-10-30-drunk-driving-opening.md`.

V139 시스템 UI: `app/game-hud.tsx`·`game-hud.css`(목표/하단 중앙 체력/자동 하단 배치), `app/pause-menu.tsx`·`pause-menu.css`(native dialog/포커스/설정·수첩 분리). `page.tsx`의 기존 게임 콜백과 `game.ts.keydown`의 메뉴 기본 키/상호작용 Space 구분. 두 CSS는 기존 테마 뒤, Sites와 itch에 같은 순서로 적용. `docs/quality/2026-10-30-ui-redesign.md`.

V140 목표 발견성: `game-hud.tsx`의 게임 시간 기반 중앙 안내와 왼쪽 위 현재 목표. `GameView.mission`은 임시 통화/재생 상태와 분리한 파생 미션이며 `PauseMenu` 양쪽 화면에서 다시 확인. `page.tsx`의 왼쪽 아래 메뉴와 메뉴 내 전체 화면. `docs/quality/2026-10-30-objective-notice.md`.

V141 미션 분위기: `GameHud.MissionCopy`가 첫 행동 줄과 나머지 분위기 문장을 구분해 HUD/일시정지·수첩에 공유한다. 문구 원본은 `story.ts`/`apartment-route.ts`, 배경만 거칠게 처리하는 CSS는 game-hud.css. `docs/quality/2026-10-30-eerie-missions.md`.

V142 관리실 우편: `family-story.ts`의 각 발송처/2803호 수신인·`mailLedger` → `ground-support.ts`의 한 보관대와 실제 봉투3통. 기존 archive ID/저장/3통→CCTV→B1 유지. `archive-review.ts.archivePlaybackFrame`을 화면·음향이 공유해 도로6초/통화12초/입차9초/현재10초를 실제 재생한다. `investigation.ts`는 우편과 확인한 원본을 구별하고 `story.ts`는 재생 완료 전 결론을 보류한다. `docs/quality/2026-10-30-mail-story.md`.

2026-11-01 전송용 질감: `runtime-textures.json` → `texture-loader.ts`에서 assetUrl 처리 전 선택/실패 시 원본 복구. 원본과 해상도를 보존하고 `scripts/author-runtime-textures.py`가 파생 WebP/해시/오차를 생성한다. 전체 공간 준비는 유지하며20Mbps와 무제한 실측/한계는 `docs/quality/2026-11-01-loading.md`. 초기 로컬 검증이며 후속 합본 배포 영수증은 task/loading-20261101 참조.

2026-11-01 추격 고조: `audio.ts.setChase`가 `chase-v143/pursuit.wav`의 속도/필터/음량을 같은 source에서 조절한다. 직접 작곡144BPM·26.667초, 시작/종료 페이드/음악 믹서/정지·재개·해제. `docs/quality/2026-11-01-chase-music.md`.

2026-11-01 마지막 엔딩: `ending-screen.tsx/css`의 남겨진 편지/미전달 보존 기록2열→모바일1열, 감사 문구 제거. 서사/타이머/기록/다시 보기·재시작은 유지. `docs/quality/2026-11-01-ending.md`.
