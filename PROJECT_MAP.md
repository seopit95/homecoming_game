# 귀가 · 프로젝트 지도

필요한 영역의 진입점부터 읽는다. 이 문서는 전체 파일 목록이나 작업 일지가 아니다.

| 작업 영역 | 첫 진입점 / 연결 파일 |
| --- | --- |
| 플레이 화면·설정·모바일 조작 | `app/page.tsx`, `app/globals.css`; 키·설정·저장: `lib/preferences.ts` |
| 조사 수첩·획득한 증거 해석 | `app/investigation-notebook.tsx`, `lib/investigation.ts` |
| 게임 루프·입력·상호작용·장면 이동 | `lib/game.ts`; 통과 판정: `lib/passage.ts` |
| 미션·단서·체크포인트 | `lib/story.ts`, `lib/expansion-story.ts`; 장 정보: `lib/chapters.ts` |
| 집 내부·배치·충돌 | `lib/world.ts`, `lib/apartment-layout.ts` |
| 복도·승강기·계단·관리실·주차장 | `lib/building.ts`에서 해당 공간 제작 함수 확인 |
| 중정·별관·지하 | `lib/courtyard.ts`, `lib/annex-lobby.ts`, `lib/annex-west-wing.ts`, `lib/expansion-world.ts` |
| 도입 사고·차량·마지막 탈출 | `lib/prologue.ts`, `lib/road-street.ts`, `lib/car-departure.ts`, `lib/sedan.ts` |
| 귀신 외형·관절·걷기·기기 | `lib/ghost.ts`에서 `ghost-arms`, `ghost-legs`, `ghost-dress`, `ghost-face`, `ghost-hair` 등 필요한 부위로 이동 |
| 추적·시야·소리·문 충돌 | `lib/navigation.ts`, `lib/perception.ts`, `lib/collision.ts`; 자료실 문: `lib/archive-door.ts` |
| 퍼즐·전화·원본 대조 | `lib/annex-call.ts`, `lib/surveillance.ts`, `lib/archive-review.ts`, `lib/plant-*.ts` |
| 음원·배경음·믹싱 | `lib/audio.ts`, `public/audio/` |
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

자동 goal 없이 일반 요청으로 개발한다. V101까지의 수정은 재사용했다. V102는 플레이를 가리는 상시 키 설명·체력 표시와 일시정지 조작 안내를 정리한 범위다. 이후 우선순위는 공간 전체의 일관된 미술, 단서의 의미와 선택, 처음 하는 사람의 길 찾기·긴장·난이도다. 새 아이템이나 대기 시간을 늘리는 것만으로 플레이 길이를 맞추지 않는다.

참고한 방식: [프로젝트 지도 경험담](https://www.reddit.com/r/KoreanGameDev/comments/1wn1wuq/), [플레이어 피드백·UI 논의](https://www.reddit.com/r/KoreanGameDev/comments/1wvj3iz/), [결정·근거를 짧게 남기는 개발 워크플로](https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex). 토큰 절감률을 측정한 자료는 아니다.
