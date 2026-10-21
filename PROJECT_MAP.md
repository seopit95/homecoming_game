# 귀가 · 프로젝트 지도

필요한 영역의 진입점부터 읽는다. 이 문서는 전체 파일 목록이나 작업 일지가 아니다.

| 작업 영역 | 첫 진입점 / 연결 파일 |
| --- | --- |
| 플레이 화면·설정·모바일 조작 | `app/page.tsx`, `app/globals.css`; 키·설정·저장: `lib/preferences.ts` |
| 조사 수첩·획득한 증거 해석 | `app/investigation-notebook.tsx`, `lib/investigation.ts` |
| 게임 루프·입력·상호작용·장면 이동 | `lib/game.ts`; 통과 판정: `lib/passage.ts`; 걸음 거리·발 착지·시점 반동: `lib/player-gait.ts` → 손/손전등 위상 `lib/viewmodel.ts`. 새 설정의 bob 기본 켬, 기존 명시적 끔/화면 흔들림 줄이기는 존중 |
| 시작 화면 로딩·그래픽 준비 | `app/layout.tsx`의 첫 CSS와 `lib/visual-preloads.json`의 제한된3개 다운로드 힌트 → `app/page.tsx`의 동적 게임 import → `lib/materials.ts`의 `prepareVisuals` → `lib/game.ts`의 `ready`. URL 변경은 `tests/visual-hints.test.mjs`로 확인. 모든 맵 업로드·렌더 준비 유지. SSR 경로 변경은 개발 모드 대신 배포용 빌드에서 HTTP200·실제 시작을 확인 |
| 미션·단서·체크포인트 | `lib/story.ts`, `lib/expansion-story.ts`; 1층 재차 퓨즈 운반 없음, 중정은 인계 열쇠→실제 보관함→지하문 열쇠. 레거시 확장 단계는 `preferences.readProgress`→`checkpoint`에서 보정. 장 정보: `lib/chapters.ts` |
| 집 내부·배치·충돌 | `lib/world.ts`, `lib/apartment-layout.ts` |
| 복도·승강기·계단·관리실·주차장 | `lib/building.ts`에서 해당 공간 제작 함수 확인 |
| 중정·별관·지하 | `lib/courtyard.ts`, `lib/annex-lobby.ts`, `lib/annex-west-wing.ts`, `lib/expansion-world.ts` |
| 도입 사고·차량·마지막 탈출 | `lib/story.ts.phoneCallback`의 첫 전화/차량 잠금음 회수 → `game.ts`의 시뮬레이션 시간별 1회 재생. `lib/prologue.ts` → 핸들·손목 공통 그립/손가락 감기 `lib/driving-hands.ts`, `lib/road-street.ts`, `lib/car-departure.ts`, `lib/sedan.ts` |
| 귀신 외형·관절·걷기·기기 | `lib/ghost.ts`의 비대칭 어깨 당김·지연된 머리 회전(거리 위상), 접지 시 팔꿈치 방향 보존. 추가 뒤틀림은 좁은 공간/모션 줄이기에서 완화. `ghost-arms`, `ghost-legs`, `ghost-dress`, `ghost-face`, `ghost-hair` 등 필요한 부위로 이동 |
| 28층 승강기 도주 | `game.ts.scripted`의 이미 호출된 승강기(입장 후 .25초 자동 대기 시작) → 4.8초 도착 → 실제 문 열림/걷기 탑승/닫힘. 보관함 없음. `pursuit.ts`의 landing 속도는 체력 회복 가능한 선형 도주용 |
| 추적·시야·소리·문 충돌 | `lib/navigation.ts`의 `movePursuer`(몸의 방향·전체 이동 구간 검사), `game.ts.followEnemy`(막힌 경로 재계획)·`hunt`(마지막 목격 위치 도착 후 조사), `lib/perception.ts`, `lib/collision.ts`; 단계별 속도·가속: `lib/pursuit.ts`; 자료실 문: `lib/archive-door.ts` |
| 은신 중 숨 참기·호흡 발각 | `lib/held-breath.ts`의 공기/회복/청취 누적 → `game.ts.hearsHiddenBreath`·`searchShelter` 및 집 장롱 검사. 기본 Ctrl(재지정 가능), `app/breath-control.tsx` 표시/터치 해제. 입력 해제는 잠금·은신 종료·컴포넌트 제거 때 보장. `stepBreathStrain` → 게임 화면만 `breathBlur`, 공유 심장 음량 `setBreathStrain`, 불 꺼진 손의 한계 떨림 `viewmodel.update.strain`; 모션 줄이기는 떨림 제거/흐림 완화 |
| 집 밖 은신처·문틈 관찰·수색 후 지나가기 | `lib/hiding-places.ts`의 17개 배치(일직선 28층 복도는 제외)·접이문 `setOpen`·문틈 수색 경로 → `lib/world.ts`에서 등록/닫힌 상태 복원 → `lib/game.ts`의 `updateShelterMotion`(시뮬레이션 시간 출입), `protectedInShelter`, `searchShelter`, `leaveShelter`. 수색 경로·정지/재방문 선택은 `lib/shelter-search.ts`에서 한 번 결정한다. 집 장롱의 스토리 hidden과 집 밖의 로컬 은신 상태를 분리해 자동 미션 시간이 계속 흐름 |
| 퍼즐·전화·원본 대조 | `lib/annex-call.ts`, `lib/surveillance.ts`, `lib/archive-review.ts`, `lib/plant-*.ts` |
| 붙잡힘·얼굴 전체화면 돌진 | `lib/game.ts`의 dying 분기 → `lib/capture-scene.ts`가 같은 귀신의 피부·입·치아·머리카락을 공유해 근접 촬영. 재시도 때 일반 시점 복귀. 암전은 `app/page.tsx` |
| 음원·배경음·믹싱 | `lib/audio.ts`, `public/audio/`; 주인공 재질 판정 `lib/footsteps.ts`, PCM 영역 `lib/footstep-bank.json`, 점진 호흡 `lib/stamina.ts`의 `stepBreathing`. 귀신 발소리는 procedural 분기 유지. 거리 심장 박동·머리 회전에 따른 HRTF 발/숨/끌림 음향은 `lib/ghost-sound.ts` → `lib/audio.ts.setGhostPosition`; `game.ts.danger`가 실제 위치/문 차폐/활성 여부를 제공. 추격 비명·가속 전환은 `lib/game.ts`의 `chaseSpeed` |
| 어둠·손전등·환경광 | `lib/game.ts`의 구역별 ambient/fill/lamps, `lib/lighting.ts`의 반사광; 사용자 밝기는 `lib/preferences.ts` |
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
