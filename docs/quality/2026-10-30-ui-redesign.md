# 플레이 HUD와 일시정지 UI 개선 — 2026-10-30

범위: 하단 중앙 체력, 간결한 목표/상호작용·메뉴, 읽기 쉬운 공포게임 시스템 UI. 이번 변경의 웹 배포와 원격 푸시는 별도 승인 전 보류, itch HTML5 ZIP은 갱신한다. 플레이 엔진/저장 스키마/체력 수치는 수정하지 않는다.

## 첫 기능: 플레이 HUD

`GameHud`와 `StaminaMeter`는 기존 콜백/실제 GameView를 렌더링한다. 체력은 사용·회복 중에만 하단 중앙에 나타나며, 이름과 값이 있는 native progress를 제공한다. 현재 목표는 비어 있으면 생성하지 않는다. 미션, 상호작용, 자막과 체력의 영역을 나누고 장식 글로우·둥근 카드 대신 얇은 선과 어두운 글자 배경을 사용한다. 키보드 포커스와44px 버튼, 모션 줄이기, safe-area 및 좁은/가로 화면 규칙을 보존한다.

새 TSX 실제 렌더 검사 RED→GREEN2/2 및 타입 검사 합격. 로컬 실제 게임 새 게임/기억 건너뛰기/Shift+W로 체력 표시. 1280×720에서 x545,width190,중앙 오차0px,하단 간격29px. 근거: `/Users/kds_mac/Documents/Codex/2026-10-29/task-2/ui-redesign-evidence/`.

## 참고한 공식 자료

- The Last of Us Part II 접근성: HUD 크기·배경, 가독성·선택형 보조 표시 원칙. https://www.playstation.com/en-ca/games/the-last-of-us-part-ii/accessibility/
- Dead Space 접근성: 대비·자막·선택형 중앙 점·모션 조정. https://www.ea.com/technology/news/accessibility-and-player-choice-in-dead-space
- Alan Wake 2 공식 PlayStation 소개: 조사 자료와 이야기 정리 맥락. https://blog.playstation.com/?p=384760
- 사용자가 제공한 Resident Evil Village 공식 매뉴얼은 웹 도구에서403으로 본문 확인이 안 됐다. https://game.capcom.com/manual/village/en/ps5/page/14/10

외부 게임의 이미지/폰트/UI 그래픽을 가져오거나 특정 레이아웃을 복제하지 않았다. 접근성 원칙을 현재 게임의 기능과 한국어 글자 체계에 적용했다.
