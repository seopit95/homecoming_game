# 공포게임 복원 안내

`main`은 2026-11-09 한국시간 기준 최신 개발 소스입니다. itch.io 공개 배포와 별개이며 추격 속도 +15% 등 아직 공개 업로드되지 않은 변경도 포함합니다.

```sh
git clone https://github.com/seopit95/homecoming_game.git
cd homecoming_game
npm ci
npm run dev
```

Node.js 22.13 이상이 필요합니다. HTML5 패키지는 `npm run build:itch`로 재생성합니다.

## 보존 범위
- 기존 main의 개발 이력과 작업별 최신 커밋.
- `archive/uninvited-*` 브랜치: 이전 작업 폴더별 소스·에셋 스냅샷.
- `history/*` 브랜치: 원래 로컬 Git 브랜치 이력.
- dependencies, 빌드 결과, 로컬 인증정보, 실행 로그는 공개 Git에 포함하지 않습니다.
- 공유 worktree 경로 없이 독립적인 저장소로 복원 가능합니다.

## 이번 확인
최신 작업본 타입 검사와 언어·차키·호흡·추격 핵심 41개 검사 통과. 전체 캠페인·모든 기기 검증을 의미하지 않습니다. 기존 검증 범위는 VERIFICATION.md를 참고하세요.
